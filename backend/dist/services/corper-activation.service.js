"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestCorperActivationOtp = requestCorperActivationOtp;
exports.verifyCorperActivationOtp = verifyCorperActivationOtp;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../lib/redis");
const auth_service_1 = require("./auth.service");
const app_error_1 = require("../utils/app-error");
const call_up_number_1 = require("../utils/call-up-number");
const OTP_TTL_SECONDS = 10 * 60;
const MAX_OTP_ATTEMPTS = 3;
const OTP_KEY_PREFIX = "corper:activation:otp:";
const GENERIC_ACTIVATION_ERROR = "Unable to process activation request. Check your details and try again.";
function otpRedisKey(normalizedCallUp) {
    return `${OTP_KEY_PREFIX}${normalizedCallUp}`;
}
function hashOtp(otp) {
    return (0, crypto_1.createHmac)("sha256", env_1.env.VERIFICATION_CODE_SECRET).update(`activation:${otp}`).digest("hex");
}
function canExposeDevOtp() {
    return env_1.env.ALLOW_DEV_OTP_PLAINTEXT && env_1.env.NODE_ENV !== "production";
}
function maskPhone(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4)
        return "***";
    return `***${digits.slice(-4)}`;
}
async function logActivationEvent(input) {
    await prisma_1.prisma.auditLog.create({
        data: {
            eventType: input.eventType,
            actorId: input.actorId,
            actorRole: input.actorRole,
            payloadSummary: input.payloadSummary,
        },
    });
}
async function findActivatableCorper(normalizedCallUp) {
    return prisma_1.prisma.corper.findUnique({
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
function assertCorperEligible(corper, normalizedNin) {
    if (!corper || corper.deletedAt || !corper.user || corper.user.deletedAt) {
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_NOT_ELIGIBLE");
    }
    if (!corper.user.isActive || corper.user.role !== client_1.Role.CORPER) {
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_NOT_ELIGIBLE");
    }
    if (!corper.isMobilized) {
        throw new app_error_1.AppError("Mobilization is required before portal activation.", 403, "NOT_MOBILIZED");
    }
    if (!corper.phone) {
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_PHONE_MISSING");
    }
    if (corper.nin !== normalizedNin) {
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_IDENTITY_MISMATCH");
    }
    return { userId: corper.user.id, phone: corper.phone };
}
async function requestCorperActivationOtp(input) {
    const normalizedCallUp = (0, call_up_number_1.normalizeCallUpNumber)(input.callUpNumber);
    const normalizedNin = (0, call_up_number_1.normalizeNin)(input.nin);
    if (!(0, call_up_number_1.isValidCallUpFormat)(normalizedCallUp)) {
        throw new app_error_1.AppError("Invalid call-up number format.", 400, "VALIDATION_ERROR");
    }
    if (!(0, call_up_number_1.isValidNin)(normalizedNin)) {
        throw new app_error_1.AppError("NIN must be exactly 11 digits.", 400, "VALIDATION_ERROR");
    }
    let eligible;
    try {
        const corper = await findActivatableCorper(normalizedCallUp);
        eligible = assertCorperEligible(corper, normalizedNin);
    }
    catch (error) {
        if (error instanceof app_error_1.AppError) {
            if (error.code === "ACTIVATION_IDENTITY_MISMATCH" || error.code === "ACTIVATION_NOT_ELIGIBLE") {
                await logActivationEvent({
                    eventType: client_1.EventType.LOGIN_FAILED,
                    payloadSummary: { channel: "corper_activation", reason: error.code },
                });
            }
            throw error;
        }
        throw error;
    }
    const plainOtp = String((0, crypto_1.randomInt)(100000, 1000000));
    const record = {
        hash: hashOtp(plainOtp),
        attempts: 0,
        userId: eligible.userId,
    };
    await redis_1.redis.set(otpRedisKey(normalizedCallUp), JSON.stringify(record), "EX", OTP_TTL_SECONDS);
    await logActivationEvent({
        eventType: client_1.EventType.LOGIN_SUCCESS,
        actorId: eligible.userId,
        actorRole: client_1.Role.CORPER,
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
async function verifyCorperActivationOtp(input) {
    const normalizedCallUp = (0, call_up_number_1.normalizeCallUpNumber)(input.callUpNumber);
    const otp = input.otp.replace(/\D/g, "");
    if (!(0, call_up_number_1.isValidCallUpFormat)(normalizedCallUp)) {
        throw new app_error_1.AppError("Invalid call-up number format.", 400, "VALIDATION_ERROR");
    }
    if (!/^\d{6}$/.test(otp)) {
        throw new app_error_1.AppError("OTP must be exactly 6 digits.", 400, "VALIDATION_ERROR");
    }
    const raw = await redis_1.redis.get(otpRedisKey(normalizedCallUp));
    if (!raw) {
        await logActivationEvent({
            eventType: client_1.EventType.LOGIN_FAILED,
            payloadSummary: { channel: "corper_activation", reason: "OTP_EXPIRED_OR_MISSING" },
        });
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_OTP_INVALID");
    }
    const record = JSON.parse(raw);
    const nextAttempts = record.attempts + 1;
    if (record.hash !== hashOtp(otp)) {
        if (nextAttempts >= MAX_OTP_ATTEMPTS) {
            await redis_1.redis.del(otpRedisKey(normalizedCallUp));
        }
        else {
            await redis_1.redis.set(otpRedisKey(normalizedCallUp), JSON.stringify({ ...record, attempts: nextAttempts }), "EX", OTP_TTL_SECONDS);
        }
        await logActivationEvent({
            eventType: client_1.EventType.LOGIN_FAILED,
            actorId: record.userId,
            actorRole: client_1.Role.CORPER,
            payloadSummary: { channel: "corper_activation", reason: "OTP_INVALID" },
        });
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_OTP_INVALID");
    }
    await redis_1.redis.del(otpRedisKey(normalizedCallUp));
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: record.userId },
    });
    if (!user || !user.isActive || user.role !== client_1.Role.CORPER) {
        throw new app_error_1.AppError(GENERIC_ACTIVATION_ERROR, 400, "ACTIVATION_NOT_ELIGIBLE");
    }
    const session = await (0, auth_service_1.issueAuthSessionForUser)(user, {
        channel: "corper_activation",
    });
    return {
        message: "Activation successful",
        ...session,
    };
}
//# sourceMappingURL=corper-activation.service.js.map