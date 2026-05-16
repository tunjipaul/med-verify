import { EventType, Prisma, Role } from "@prisma/client";
import { createHmac, randomInt } from "crypto";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";

const CODE_TTL_MINUTES = 12 * 60;
const MAX_FAILED_ATTEMPTS = 3;
const MAX_EXTENSION_COUNT = 1;
const EXTENSION_MINUTES = 6 * 60;

type Actor = {
  userId: string;
  role: Role;
};

function forbidden(message: string): never {
  throw new AppError(message, 403, "FORBIDDEN");
}

function badRequest(message: string): never {
  throw new AppError(message, 400, "VALIDATION_ERROR");
}

function generateCodeValue(): string {
  const code = randomInt(10_000_000, 100_000_000);
  return `MV-${code}`;
}

function hashCodeValue(codeValue: string): string {
  return createHmac("sha256", env.VERIFICATION_CODE_SECRET).update(codeValue).digest("hex");
}

async function writeAudit(input: {
  eventType: EventType;
  actorId?: string;
  actorRole?: Role;
  mctCaseId?: string;
  targetId?: string;
  payloadSummary?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      eventType: input.eventType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      mctCaseId: input.mctCaseId,
      targetId: input.targetId,
      payloadSummary: input.payloadSummary,
    },
  });
}

export async function generateVerificationCode(caseId: string, actor: Actor) {
  const mctCase = await prisma.mctCase.findUnique({
    where: { id: caseId },
    include: {
      doctor: { select: { userId: true, id: true } },
      corper: { select: { id: true } },
      hospital: { select: { id: true } },
    },
  });

  if (!mctCase || mctCase.deletedAt) {
    throw new AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
  }

  const actorCanGenerate =
    actor.role === Role.SYSTEM || (actor.role === Role.DOCTOR && mctCase.doctor?.userId === actor.userId);

  if (!actorCanGenerate) {
    forbidden("Role is not permitted to generate verification code for this case");
  }

  if (!mctCase.doctorId || !mctCase.hospitalId) {
    badRequest("Case must have assigned doctor and hospital before code generation");
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  const plainCodeValue = generateCodeValue();
  const codeValue = hashCodeValue(plainCodeValue);

  const code = await prisma.verificationCode.create({
    data: {
      mctCaseId: mctCase.id,
      corperId: mctCase.corperId,
      hospitalId: mctCase.hospitalId,
      doctorId: mctCase.doctorId,
      codeValue,
      expiresAt,
    },
  });

  await writeAudit({
    eventType: EventType.VERIFICATION_CODE_GENERATED,
    actorId: actor.userId,
    actorRole: actor.role,
    mctCaseId: mctCase.id,
    targetId: code.id,
    payloadSummary: { expiresAt: expiresAt.toISOString() },
  });

  return {
    ...code,
    plainCodeValue,
  };
}

export async function validateVerificationCode(codeValue: string, actor: Actor) {
  const hashedCodeValue = hashCodeValue(codeValue);
  const code = await prisma.verificationCode.findUnique({
    where: { codeValue: hashedCodeValue },
  });

  if (!code || code.deletedAt) {
    await writeAudit({
      eventType: EventType.VERIFICATION_CODE_FAILED,
      actorId: actor.userId,
      actorRole: actor.role,
      payloadSummary: { reason: "NOT_FOUND" },
    });
    throw new AppError("Invalid verification code", 400, "VALIDATION_ERROR");
  }

  if (actor.role !== Role.CORPER) {
    forbidden("Only corpers can validate verification codes");
  }

  const corper = await prisma.corper.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });

  if (!corper || code.corperId !== corper.id) {
    forbidden("Verification code does not belong to this corper");
  }

  if (code.usedAt) {
    await writeAudit({
      eventType: EventType.VERIFICATION_CODE_FAILED,
      actorId: actor.userId,
      actorRole: actor.role,
      mctCaseId: code.mctCaseId,
      targetId: code.id,
      payloadSummary: { reason: "ALREADY_USED" },
    });
    throw new AppError("Verification code already used", 400, "VALIDATION_ERROR");
  }

  if (code.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    await writeAudit({
      eventType: EventType.VERIFICATION_CODE_FAILED,
      actorId: actor.userId,
      actorRole: actor.role,
      mctCaseId: code.mctCaseId,
      targetId: code.id,
      payloadSummary: { reason: "MAX_ATTEMPTS_REACHED" },
    });
    throw new AppError("Verification code locked due to too many failed attempts", 400, "VALIDATION_ERROR");
  }

  if (code.expiresAt.getTime() < Date.now()) {
    await prisma.verificationCode.update({
      where: { id: code.id },
      data: { failedAttempts: { increment: 1 } },
    });
    await writeAudit({
      eventType: EventType.VERIFICATION_CODE_FAILED,
      actorId: actor.userId,
      actorRole: actor.role,
      mctCaseId: code.mctCaseId,
      targetId: code.id,
      payloadSummary: { reason: "EXPIRED" },
    });
    throw new AppError("Verification code expired", 400, "VALIDATION_ERROR");
  }

  const updated = await prisma.verificationCode.update({
    where: { id: code.id },
    data: { usedAt: new Date() },
  });

  await writeAudit({
    eventType: EventType.VERIFICATION_CODE_VALIDATED,
    actorId: actor.userId,
    actorRole: actor.role,
    mctCaseId: code.mctCaseId,
    targetId: code.id,
  });

  return updated;
}

export async function extendVerificationCode(
  verificationCodeId: string,
  actor: Actor,
  extensionReason: string,
) {
  const code = await prisma.verificationCode.findUnique({
    where: { id: verificationCodeId },
    include: {
      mctCase: {
        include: {
          doctor: { select: { userId: true } },
        },
      },
    },
  });

  if (!code || code.deletedAt) {
    throw new AppError("Verification code not found", 404, "NOT_FOUND");
  }

  const actorCanExtend =
    actor.role === Role.SYSTEM || actor.role === Role.COORDINATOR || actor.role === Role.ABUJA_ADMIN;

  if (!actorCanExtend) {
    forbidden("Role is not permitted to extend this verification code");
  }

  if (code.usedAt) {
    throw new AppError("Cannot extend a used verification code", 400, "VALIDATION_ERROR");
  }

  if (code.extensionCount >= MAX_EXTENSION_COUNT) {
    throw new AppError("Maximum verification code extensions reached", 400, "VALIDATION_ERROR");
  }

  const nextExpiresAt = new Date(Math.max(code.expiresAt.getTime(), Date.now()) + EXTENSION_MINUTES * 60 * 1000);
  const updated = await prisma.verificationCode.update({
    where: { id: code.id },
    data: {
      expiresAt: nextExpiresAt,
      extensionCount: { increment: 1 },
      extendedById: actor.userId,
      extensionReason,
    },
  });

  await writeAudit({
    eventType: EventType.VERIFICATION_CODE_EXTENDED,
    actorId: actor.userId,
    actorRole: actor.role,
    mctCaseId: code.mctCaseId,
    targetId: code.id,
    payloadSummary: { extensionReason, nextExpiresAt: nextExpiresAt.toISOString() },
  });

  return updated;
}
