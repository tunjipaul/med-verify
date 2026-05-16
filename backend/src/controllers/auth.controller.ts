import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { env } from "../config/env";
import { loginUser, logoutUser, refreshAccessToken } from "../services/auth.service";
import { AppError } from "../utils/app-error";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const REFRESH_COOKIE_NAME = "refreshToken";
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";

function getCookieValue(req: Request, cookieName: string): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const cookieToken = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`))
    ?.slice(`${cookieName}=`.length);

  return cookieToken ? decodeURIComponent(cookieToken) : null;
}

function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieToken = getCookieValue(req, REFRESH_COOKIE_NAME);
  return cookieToken ?? (typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null);
}

function setAuthCookies(res: Response, refreshToken: string): string {
  const csrfToken = randomUUID();
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
}

function requireCsrf(req: Request): void {
  const csrfFromCookie = getCookieValue(req, CSRF_COOKIE_NAME);
  const csrfFromHeader = req.headers[CSRF_HEADER_NAME] as string | undefined;
  if (!csrfFromCookie || !csrfFromHeader || csrfFromCookie !== csrfFromHeader) {
    throw new AppError("Invalid CSRF token", 403, "FORBIDDEN");
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const payload = loginSchema.parse(req.body);
  const result = await loginUser(payload, req.ip ?? "unknown");
  const csrfToken = setAuthCookies(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token: result.token,
      csrfToken,
      user: result.user,
    },
  });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  refreshTokenSchema.parse(req.body ?? {});
  requireCsrf(req);
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    throw new AppError("Missing refresh token", 400, "AUTH_REFRESH_TOKEN_MISSING");
  }
  const result = await refreshAccessToken({ refreshToken: token });
  const csrfToken = setAuthCookies(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: {
      token: result.token,
      csrfToken,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  requireCsrf(req);
  const token = getRefreshTokenFromRequest(req);
  if (token) {
    await logoutUser(token);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  });

  res.status(200).json({
    success: true,
    message: "Logged out",
  });
}
