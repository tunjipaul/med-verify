"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVerificationCode = generateVerificationCode;
exports.validateVerificationCode = validateVerificationCode;
exports.extendVerificationCode = extendVerificationCode;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const app_error_1 = require("../utils/app-error");
const CODE_TTL_MINUTES = 12 * 60;
const MAX_FAILED_ATTEMPTS = 3;
const MAX_EXTENSION_COUNT = 1;
const EXTENSION_MINUTES = 6 * 60;
function forbidden(message) {
    throw new app_error_1.AppError(message, 403, "FORBIDDEN");
}
function badRequest(message) {
    throw new app_error_1.AppError(message, 400, "VALIDATION_ERROR");
}
function generateCodeValue() {
    const code = (0, crypto_1.randomInt)(10000000, 100000000);
    return `MV-${code}`;
}
function hashCodeValue(codeValue) {
    return (0, crypto_1.createHmac)("sha256", env_1.env.VERIFICATION_CODE_SECRET).update(codeValue).digest("hex");
}
async function writeAudit(input) {
    await prisma_1.prisma.auditLog.create({
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
async function generateVerificationCode(caseId, actor) {
    const mctCase = await prisma_1.prisma.mctCase.findUnique({
        where: { id: caseId },
        include: {
            doctor: { select: { userId: true, id: true } },
            corper: { select: { id: true } },
            hospital: { select: { id: true } },
        },
    });
    if (!mctCase || mctCase.deletedAt) {
        throw new app_error_1.AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
    }
    const actorCanGenerate = actor.role === client_1.Role.SYSTEM || (actor.role === client_1.Role.DOCTOR && mctCase.doctor?.userId === actor.userId);
    if (!actorCanGenerate) {
        forbidden("Role is not permitted to generate verification code for this case");
    }
    if (!mctCase.doctorId || !mctCase.hospitalId) {
        badRequest("Case must have assigned doctor and hospital before code generation");
    }
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    const plainCodeValue = generateCodeValue();
    const codeValue = hashCodeValue(plainCodeValue);
    const code = await prisma_1.prisma.verificationCode.create({
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
        eventType: client_1.EventType.VERIFICATION_CODE_GENERATED,
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
async function validateVerificationCode(codeValue, actor) {
    const hashedCodeValue = hashCodeValue(codeValue);
    const code = await prisma_1.prisma.verificationCode.findUnique({
        where: { codeValue: hashedCodeValue },
    });
    if (!code || code.deletedAt) {
        await writeAudit({
            eventType: client_1.EventType.VERIFICATION_CODE_FAILED,
            actorId: actor.userId,
            actorRole: actor.role,
            payloadSummary: { reason: "NOT_FOUND" },
        });
        throw new app_error_1.AppError("Invalid verification code", 400, "VALIDATION_ERROR");
    }
    if (actor.role !== client_1.Role.CORPER) {
        forbidden("Only corpers can validate verification codes");
    }
    const corper = await prisma_1.prisma.corper.findUnique({
        where: { userId: actor.userId },
        select: { id: true },
    });
    if (!corper || code.corperId !== corper.id) {
        forbidden("Verification code does not belong to this corper");
    }
    if (code.usedAt) {
        await writeAudit({
            eventType: client_1.EventType.VERIFICATION_CODE_FAILED,
            actorId: actor.userId,
            actorRole: actor.role,
            mctCaseId: code.mctCaseId,
            targetId: code.id,
            payloadSummary: { reason: "ALREADY_USED" },
        });
        throw new app_error_1.AppError("Verification code already used", 400, "VALIDATION_ERROR");
    }
    if (code.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        await writeAudit({
            eventType: client_1.EventType.VERIFICATION_CODE_FAILED,
            actorId: actor.userId,
            actorRole: actor.role,
            mctCaseId: code.mctCaseId,
            targetId: code.id,
            payloadSummary: { reason: "MAX_ATTEMPTS_REACHED" },
        });
        throw new app_error_1.AppError("Verification code locked due to too many failed attempts", 400, "VALIDATION_ERROR");
    }
    if (code.expiresAt.getTime() < Date.now()) {
        await prisma_1.prisma.verificationCode.update({
            where: { id: code.id },
            data: { failedAttempts: { increment: 1 } },
        });
        await writeAudit({
            eventType: client_1.EventType.VERIFICATION_CODE_FAILED,
            actorId: actor.userId,
            actorRole: actor.role,
            mctCaseId: code.mctCaseId,
            targetId: code.id,
            payloadSummary: { reason: "EXPIRED" },
        });
        throw new app_error_1.AppError("Verification code expired", 400, "VALIDATION_ERROR");
    }
    const updated = await prisma_1.prisma.verificationCode.update({
        where: { id: code.id },
        data: { usedAt: new Date() },
    });
    await writeAudit({
        eventType: client_1.EventType.VERIFICATION_CODE_VALIDATED,
        actorId: actor.userId,
        actorRole: actor.role,
        mctCaseId: code.mctCaseId,
        targetId: code.id,
    });
    return updated;
}
async function extendVerificationCode(verificationCodeId, actor, extensionReason) {
    const code = await prisma_1.prisma.verificationCode.findUnique({
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
        throw new app_error_1.AppError("Verification code not found", 404, "NOT_FOUND");
    }
    const actorCanExtend = actor.role === client_1.Role.SYSTEM || actor.role === client_1.Role.COORDINATOR || actor.role === client_1.Role.ABUJA_ADMIN;
    if (!actorCanExtend) {
        forbidden("Role is not permitted to extend this verification code");
    }
    if (code.usedAt) {
        throw new app_error_1.AppError("Cannot extend a used verification code", 400, "VALIDATION_ERROR");
    }
    if (code.extensionCount >= MAX_EXTENSION_COUNT) {
        throw new app_error_1.AppError("Maximum verification code extensions reached", 400, "VALIDATION_ERROR");
    }
    const nextExpiresAt = new Date(Math.max(code.expiresAt.getTime(), Date.now()) + EXTENSION_MINUTES * 60 * 1000);
    const updated = await prisma_1.prisma.verificationCode.update({
        where: { id: code.id },
        data: {
            expiresAt: nextExpiresAt,
            extensionCount: { increment: 1 },
            extendedById: actor.userId,
            extensionReason,
        },
    });
    await writeAudit({
        eventType: client_1.EventType.VERIFICATION_CODE_EXTENDED,
        actorId: actor.userId,
        actorRole: actor.role,
        mctCaseId: code.mctCaseId,
        targetId: code.id,
        payloadSummary: { extensionReason, nextExpiresAt: nextExpiresAt.toISOString() },
    });
    return updated;
}
//# sourceMappingURL=verification-codes.service.js.map