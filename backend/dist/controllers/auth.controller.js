"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refreshToken = refreshToken;
exports.logout = logout;
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const auth_service_1 = require("../services/auth.service");
const app_error_1 = require("../utils/app-error");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).optional(),
});
const REFRESH_COOKIE_NAME = "refreshToken";
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";
function getCookieValue(req, cookieName) {
    const cookieHeader = req.headers.cookie ?? "";
    const cookieToken = cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${cookieName}=`))
        ?.slice(`${cookieName}=`.length);
    return cookieToken ? decodeURIComponent(cookieToken) : null;
}
function getRefreshTokenFromRequest(req) {
    const cookieToken = getCookieValue(req, REFRESH_COOKIE_NAME);
    return cookieToken ?? (typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null);
}
function setAuthCookies(res, refreshToken) {
    const csrfToken = (0, crypto_1.randomUUID)();
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return csrfToken;
}
function requireCsrf(req) {
    const csrfFromCookie = getCookieValue(req, CSRF_COOKIE_NAME);
    const csrfFromHeader = req.headers[CSRF_HEADER_NAME];
    if (!csrfFromCookie || !csrfFromHeader || csrfFromCookie !== csrfFromHeader) {
        throw new app_error_1.AppError("Invalid CSRF token", 403, "FORBIDDEN");
    }
}
async function login(req, res) {
    const payload = loginSchema.parse(req.body);
    const result = await (0, auth_service_1.loginUser)(payload, req.ip ?? "unknown");
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
async function refreshToken(req, res) {
    refreshTokenSchema.parse(req.body ?? {});
    requireCsrf(req);
    const token = getRefreshTokenFromRequest(req);
    if (!token) {
        throw new app_error_1.AppError("Missing refresh token", 400, "AUTH_REFRESH_TOKEN_MISSING");
    }
    const result = await (0, auth_service_1.refreshAccessToken)({ refreshToken: token });
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
async function logout(req, res) {
    requireCsrf(req);
    const token = getRefreshTokenFromRequest(req);
    if (token) {
        await (0, auth_service_1.logoutUser)(token);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
    });
    res.status(200).json({
        success: true,
        message: "Logged out",
    });
}
//# sourceMappingURL=auth.controller.js.map