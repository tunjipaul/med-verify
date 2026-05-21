"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSRF_HEADER_NAME = exports.CSRF_COOKIE_NAME = exports.REFRESH_COOKIE_NAME = void 0;
exports.setAuthCookies = setAuthCookies;
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
exports.REFRESH_COOKIE_NAME = "refreshToken";
exports.CSRF_COOKIE_NAME = "csrfToken";
exports.CSRF_HEADER_NAME = "x-csrf-token";
function setAuthCookies(res, refreshToken) {
    const csrfToken = (0, crypto_1.randomUUID)();
    res.cookie(exports.REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie(exports.CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return csrfToken;
}
//# sourceMappingURL=auth-cookies.js.map