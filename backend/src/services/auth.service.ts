import { EventType, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { AppError } from "../utils/app-error";

type LoginInput = {
  email: string;
  password: string;
};

type RefreshTokenPayload = {
  sub: string;
  role: Role;
  email: string;
  jti: string;
  type: "refresh";
};

const REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";
const LOGIN_FAIL_KEY_PREFIX = "auth:login-fail:";
const LOGIN_FAIL_MAX = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 10 * 60;

async function logAuthEvent(input: {
  eventType: EventType;
  actorId?: string;
  actorRole?: Role;
  payloadSummary?: Record<string, string>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      eventType: input.eventType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      payloadSummary: input.payloadSummary,
    },
  });
}

function signAccessToken(user: { id: string; email: string; role: Role }): string {
  const expiresIn = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"];

  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      type: "access",
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn,
    },
  );
}

function signRefreshToken(user: { id: string; email: string; role: Role }): string {
  const expiresIn = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"];
  const jti = randomUUID();

  const token = jwt.sign(
    {
      role: user.role,
      email: user.email,
      jti,
      type: "refresh",
    },
    env.REFRESH_JWT_SECRET,
    {
      subject: user.id,
      expiresIn,
    },
  );

  return token;
}

function getRefreshTokenKey(jti: string): string {
  return `${REFRESH_TOKEN_KEY_PREFIX}${jti}`;
}

function getLoginFailKey(email: string, ip: string): string {
  return `${LOGIN_FAIL_KEY_PREFIX}${email}:${ip}`;
}

async function getLoginFailCount(email: string, ip: string): Promise<number> {
  const raw = await redis.get(getLoginFailKey(email, ip));
  return raw ? Number(raw) || 0 : 0;
}

async function incrementLoginFailCount(email: string, ip: string): Promise<void> {
  const next = (await getLoginFailCount(email, ip)) + 1;
  await redis.set(getLoginFailKey(email, ip), String(next), "EX", LOGIN_FAIL_WINDOW_SECONDS);
}

async function clearLoginFailCount(email: string, ip: string): Promise<void> {
  await redis.del(getLoginFailKey(email, ip));
}

async function persistRefreshToken(jti: string, userId: string): Promise<void> {
  const key = getRefreshTokenKey(jti);
  await redis.set(key, userId, "EX", 7 * 24 * 60 * 60);
}

async function revokeRefreshToken(jti: string): Promise<void> {
  await redis.del(getRefreshTokenKey(jti));
}

export async function loginUser(input: LoginInput, ip: string) {
  const normalizedEmail = input.email.toLowerCase();
  const failCount = await getLoginFailCount(normalizedEmail, ip);
  if (failCount >= LOGIN_FAIL_MAX) {
    throw new AppError("Too many failed login attempts. Try again later.", 429, "AUTH_LOGIN_LOCKED");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.isActive) {
    await logAuthEvent({
      eventType: EventType.LOGIN_FAILED,
      payloadSummary: { email: normalizedEmail, reason: "USER_NOT_FOUND_OR_INACTIVE" },
    });
    await incrementLoginFailCount(normalizedEmail, ip);
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    await logAuthEvent({
      eventType: EventType.LOGIN_FAILED,
      actorId: user.id,
      actorRole: user.role,
      payloadSummary: { email: normalizedEmail, reason: "INVALID_PASSWORD" },
    });
    await incrementLoginFailCount(normalizedEmail, ip);
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }
  await clearLoginFailCount(normalizedEmail, ip);

  return issueAuthSessionForUser(user);
}

export async function issueAuthSessionForUser(
  user: {
    id: string;
    email: string;
    role: Role;
    firstName?: string | null;
    lastName?: string | null;
  },
  audit?: { email?: string; channel?: string },
) {
  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const decoded = jwt.decode(refreshToken) as RefreshTokenPayload | null;
  if (!decoded?.jti) {
    throw new AppError("Failed to issue refresh token", 500, "INTERNAL_ERROR");
  }
  await persistRefreshToken(decoded.jti, user.id);
  await logAuthEvent({
    eventType: EventType.LOGIN_SUCCESS,
    actorId: user.id,
    actorRole: user.role,
    payloadSummary: {
      email: audit?.email ?? user.email,
      ...(audit?.channel ? { channel: audit.channel } : {}),
    },
  });

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

export async function refreshAccessToken(input: { refreshToken: string }) {
  let decoded: RefreshTokenPayload;

  try {
    decoded = jwt.verify(input.refreshToken, env.REFRESH_JWT_SECRET) as RefreshTokenPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401, "AUTH_REFRESH_TOKEN_INVALID");
  }

  if (decoded.type !== "refresh") {
    throw new AppError("Invalid refresh token", 401, "AUTH_REFRESH_TOKEN_INVALID");
  }
  const storedUserId = await redis.get(getRefreshTokenKey(decoded.jti));
  if (!storedUserId || storedUserId !== decoded.sub) {
    throw new AppError("Refresh token revoked or invalid", 401, "AUTH_REFRESH_TOKEN_REVOKED");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
  });

  if (!user || !user.isActive) {
    throw new AppError("User not found or inactive", 401, "UNAUTHORIZED");
  }

  const nextRefreshToken = signRefreshToken(user);
  const nextDecoded = jwt.decode(nextRefreshToken) as RefreshTokenPayload | null;
  if (!nextDecoded?.jti) {
    throw new AppError("Failed to rotate refresh token", 500, "INTERNAL_ERROR");
  }
  await revokeRefreshToken(decoded.jti);
  await persistRefreshToken(nextDecoded.jti, user.id);

  return {
    token: signAccessToken(user),
    refreshToken: nextRefreshToken,
  };
}

export async function logoutUser(refreshToken: string): Promise<void> {
  try {
    const decoded = jwt.verify(refreshToken, env.REFRESH_JWT_SECRET) as RefreshTokenPayload;
    await revokeRefreshToken(decoded.jti);
  } catch {
    // Keep logout idempotent.
  }
}
