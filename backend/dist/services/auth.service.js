"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
exports.issueAuthSessionForUser = issueAuthSessionForUser;
exports.refreshAccessToken = refreshAccessToken;
exports.logoutUser = logoutUser;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../lib/redis");
const app_error_1 = require("../utils/app-error");
const REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";
const LOGIN_FAIL_KEY_PREFIX = "auth:login-fail:";
const LOGIN_FAIL_MAX = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 10 * 60;
async function logAuthEvent(input) {
    await prisma_1.prisma.auditLog.create({
        data: {
            eventType: input.eventType,
            actorId: input.actorId,
            actorRole: input.actorRole,
            payloadSummary: input.payloadSummary,
        },
    });
}
function signAccessToken(user) {
    const expiresIn = env_1.env.ACCESS_TOKEN_EXPIRES_IN;
    return jsonwebtoken_1.default.sign({
        role: user.role,
        email: user.email,
        type: "access",
    }, env_1.env.JWT_SECRET, {
        subject: user.id,
        expiresIn,
    });
}
function signRefreshToken(user) {
    const expiresIn = env_1.env.REFRESH_TOKEN_EXPIRES_IN;
    const jti = (0, crypto_1.randomUUID)();
    const token = jsonwebtoken_1.default.sign({
        role: user.role,
        email: user.email,
        jti,
        type: "refresh",
    }, env_1.env.REFRESH_JWT_SECRET, {
        subject: user.id,
        expiresIn,
    });
    return token;
}
function getRefreshTokenKey(jti) {
    return `${REFRESH_TOKEN_KEY_PREFIX}${jti}`;
}
function getLoginFailKey(email, ip) {
    return `${LOGIN_FAIL_KEY_PREFIX}${email}:${ip}`;
}
async function getLoginFailCount(email, ip) {
    const raw = await redis_1.redis.get(getLoginFailKey(email, ip));
    return raw ? Number(raw) || 0 : 0;
}
async function incrementLoginFailCount(email, ip) {
    const next = (await getLoginFailCount(email, ip)) + 1;
    await redis_1.redis.set(getLoginFailKey(email, ip), String(next), "EX", LOGIN_FAIL_WINDOW_SECONDS);
}
async function clearLoginFailCount(email, ip) {
    await redis_1.redis.del(getLoginFailKey(email, ip));
}
async function persistRefreshToken(jti, userId) {
    const key = getRefreshTokenKey(jti);
    await redis_1.redis.set(key, userId, "EX", 7 * 24 * 60 * 60);
}
async function revokeRefreshToken(jti) {
    await redis_1.redis.del(getRefreshTokenKey(jti));
}
async function loginUser(input, ip) {
    const normalizedEmail = input.email.toLowerCase();
    const failCount = await getLoginFailCount(normalizedEmail, ip);
    if (failCount >= LOGIN_FAIL_MAX) {
        throw new app_error_1.AppError("Too many failed login attempts. Try again later.", 429, "AUTH_LOGIN_LOCKED");
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (!user || !user.isActive) {
        await logAuthEvent({
            eventType: client_1.EventType.LOGIN_FAILED,
            payloadSummary: { email: normalizedEmail, reason: "USER_NOT_FOUND_OR_INACTIVE" },
        });
        await incrementLoginFailCount(normalizedEmail, ip);
        throw new app_error_1.AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
    }
    const isValidPassword = await bcrypt_1.default.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
        await logAuthEvent({
            eventType: client_1.EventType.LOGIN_FAILED,
            actorId: user.id,
            actorRole: user.role,
            payloadSummary: { email: normalizedEmail, reason: "INVALID_PASSWORD" },
        });
        await incrementLoginFailCount(normalizedEmail, ip);
        throw new app_error_1.AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
    }
    await clearLoginFailCount(normalizedEmail, ip);
    return issueAuthSessionForUser(user);
}
async function issueAuthSessionForUser(user, audit) {
    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const decoded = jsonwebtoken_1.default.decode(refreshToken);
    if (!decoded?.jti) {
        throw new app_error_1.AppError("Failed to issue refresh token", 500, "INTERNAL_ERROR");
    }
    await persistRefreshToken(decoded.jti, user.id);
    await logAuthEvent({
        eventType: client_1.EventType.LOGIN_SUCCESS,
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
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        },
    };
}
async function refreshAccessToken(input) {
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(input.refreshToken, env_1.env.REFRESH_JWT_SECRET);
    }
    catch {
        throw new app_error_1.AppError("Invalid or expired refresh token", 401, "AUTH_REFRESH_TOKEN_INVALID");
    }
    if (decoded.type !== "refresh") {
        throw new app_error_1.AppError("Invalid refresh token", 401, "AUTH_REFRESH_TOKEN_INVALID");
    }
    const storedUserId = await redis_1.redis.get(getRefreshTokenKey(decoded.jti));
    if (!storedUserId || storedUserId !== decoded.sub) {
        throw new app_error_1.AppError("Refresh token revoked or invalid", 401, "AUTH_REFRESH_TOKEN_REVOKED");
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: decoded.sub },
    });
    if (!user || !user.isActive) {
        throw new app_error_1.AppError("User not found or inactive", 401, "UNAUTHORIZED");
    }
    const nextRefreshToken = signRefreshToken(user);
    const nextDecoded = jsonwebtoken_1.default.decode(nextRefreshToken);
    if (!nextDecoded?.jti) {
        throw new app_error_1.AppError("Failed to rotate refresh token", 500, "INTERNAL_ERROR");
    }
    await revokeRefreshToken(decoded.jti);
    await persistRefreshToken(nextDecoded.jti, user.id);
    return {
        token: signAccessToken(user),
        refreshToken: nextRefreshToken,
    };
}
async function logoutUser(refreshToken) {
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.REFRESH_JWT_SECRET);
        await revokeRefreshToken(decoded.jti);
    }
    catch {
        // Keep logout idempotent.
    }
}
//# sourceMappingURL=auth.service.js.map