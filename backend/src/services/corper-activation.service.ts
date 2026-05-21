import { EventType, Role } from "@prisma/client";
import { createHmac, randomInt } from "crypto";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { issueAuthSessionForUser } from "./auth.service";
import { AppError } from "../utils/app-error";
import { isValidCallUpFormat, isValidNin, normalizeCallUpNumber, normalizeNin } from "../utils/call-up-number";

const OTP_TTL_SECONDS = 10 * 60;
const MAX_OTP_ATTEMPTS = 3;
const OTP_KEY_PREFIX = "corper:activation:otp:";

const GENERIC_ACTIVATION_ERROR = "Unable to process activation request. Check your details and try again.";

type OtpRecord = {
  hash: string;
  attempts: number;
  userId: string;
};

function otpRedisKey(normalizedCallUp: string): string {
  return `${OTP_KEY_PREFIX}${normalizedCallUp}`;
}

function hashOtp(otp: string): string {
  return createHmac("sha256", env.VERIFICATION_CODE_SECRET).update(`activation:${otp}`).digest("hex");
}

function canExposeDevOtp(): boolean {
  return env.ALLOW_DEV_OTP_PLAINTEXT && env.NODE_ENV !== "production";
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

async function logActivationEvent(input: {
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

async function findActivatableCorper(normalizedCallUp: string) {
  return prisma.corper.findUnique({
    where: { callUpNumber: normalizedCallUp },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });
}

function assertCorperEligible(
  corper: Awaited<ReturnType<typeof findActivatableCorper>>,
  normalizedNin: string,
): { userId: string; phone: string } {
  if (!corper || corper.deletedAt || !corper.user || corper.user.deletedAt) {
    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_NOT_ELIGIBLE");
  }

  if (!corper.user.isActive || corper.user.role !== Role.CORPER) {
    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_NOT_ELIGIBLE");
  }

  if (!corper.isMobilized) {
    throw new AppError("Mobilization is required before portal activation.", 403, "NOT_MOBILIZED");
  }

  if (!corper.phone) {
    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_PHONE_MISSING");
  }

  if (corper.nin !== normalizedNin) {
    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_IDENTITY_MISMATCH");
  }

  return { userId: corper.user.id, phone: corper.phone };
}

export async function requestCorperActivationOtp(input: { callUpNumber: string; nin: string }) {
  const normalizedCallUp = normalizeCallUpNumber(input.callUpNumber);
  const normalizedNin = normalizeNin(input.nin);

  if (!isValidCallUpFormat(normalizedCallUp)) {
    throw new AppError("Invalid call-up number format.", 400, "VALIDATION_ERROR");
  }

  if (!isValidNin(normalizedNin)) {
    throw new AppError("NIN must be exactly 11 digits.", 400, "VALIDATION_ERROR");
  }

  let eligible: { userId: string; phone: string };
  try {
    const corper = await findActivatableCorper(normalizedCallUp);
    eligible = assertCorperEligible(corper, normalizedNin);
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "ACTIVATION_IDENTITY_MISMATCH" || error.code === "ACTIVATION_NOT_ELIGIBLE") {
        await logActivationEvent({
          eventType: EventType.LOGIN_FAILED,
          payloadSummary: { channel: "corper_activation", reason: error.code },
        });
      }
      throw error;
    }
    throw error;
  }

  const plainOtp = String(randomInt(100_000, 1_000_000));
  const record: OtpRecord = {
    hash: hashOtp(plainOtp),
    attempts: 0,
    userId: eligible.userId,
  };

  await redis.set(otpRedisKey(normalizedCallUp), JSON.stringify(record), "EX", OTP_TTL_SECONDS);

  await logActivationEvent({
    eventType: EventType.LOGIN_SUCCESS,
    actorId: eligible.userId,
    actorRole: Role.CORPER,
    payloadSummary: { channel: "corper_activation", action: "OTP_REQUESTED" },
  });

  if (canExposeDevOtp()) {
    console.info(`[dev] Corper activation OTP for ${normalizedCallUp}: ${plainOtp}`);
  }

  return {
    message: "If your details are correct, a one-time password has been sent to your registered phone.",
    expiresInSeconds: OTP_TTL_SECONDS,
    maskedPhone: maskPhone(eligible.phone),
    ...(canExposeDevOtp() ? { devOtp: plainOtp } : {}),
  };
}

export async function verifyCorperActivationOtp(input: { callUpNumber: string; otp: string }) {
  const normalizedCallUp = normalizeCallUpNumber(input.callUpNumber);
  const otp = input.otp.replace(/\D/g, "");

  if (!isValidCallUpFormat(normalizedCallUp)) {
    throw new AppError("Invalid call-up number format.", 400, "VALIDATION_ERROR");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new AppError("OTP must be exactly 6 digits.", 400, "VALIDATION_ERROR");
  }

  const raw = await redis.get(otpRedisKey(normalizedCallUp));
  if (!raw) {
    await logActivationEvent({
      eventType: EventType.LOGIN_FAILED,
      payloadSummary: { channel: "corper_activation", reason: "OTP_EXPIRED_OR_MISSING" },
    });
    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_OTP_INVALID");
  }

  const record = JSON.parse(raw) as OtpRecord;
  const nextAttempts = record.attempts + 1;

  if (record.hash !== hashOtp(otp)) {
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(otpRedisKey(normalizedCallUp));
    } else {
      await redis.set(
        otpRedisKey(normalizedCallUp),
        JSON.stringify({ ...record, attempts: nextAttempts }),
        "EX",
        OTP_TTL_SECONDS,
      );
    }

    await logActivationEvent({
      eventType: EventType.LOGIN_FAILED,
      actorId: record.userId,
      actorRole: Role.CORPER,
      payloadSummary: { channel: "corper_activation", reason: "OTP_INVALID" },
    });

    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_OTP_INVALID");
  }

  await redis.del(otpRedisKey(normalizedCallUp));

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
  });

  if (!user || !user.isActive || user.role !== Role.CORPER) {
    throw new AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_NOT_ELIGIBLE");
  }

  const session = await issueAuthSessionForUser(user, {
    channel: "corper_activation",
  });

  return {
    message: "Activation successful",
    ...session,
  };
}
