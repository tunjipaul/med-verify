"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachRequestId = attachRequestId;
exports.rateLimit = rateLimit;
const crypto_1 = require("crypto");
const redis_1 = require("../lib/redis");
const app_error_1 = require("../utils/app-error");
function getIp(req) {
    // Do not trust caller-controlled forwarding headers here.
    // If trusted proxies are configured, Express populates req.ip safely.
    return req.ip ?? "unknown";
}
function attachRequestId(req, res, next) {
    const requestId = req.headers["x-request-id"];
    req.requestId = typeof requestId === "string" && requestId.length > 0 ? requestId : (0, crypto_1.randomUUID)();
    res.setHeader("x-request-id", req.requestId);
    next();
}
function rateLimit(options) {
    return async (req, res, next) => {
        const now = Date.now();
        const identity = options.keySuffix?.(req) ?? getIp(req);
        const key = `${options.keyPrefix}:${identity}`;
        const raw = await redis_1.redis.get(key);
        const current = raw ? JSON.parse(raw) : null;
        const validCurrent = current && current.resetAt > now ? current : null;
        const resetAt = validCurrent ? validCurrent.resetAt : now + options.windowMs;
        const count = validCurrent ? validCurrent.count + 1 : 1;
        const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
        await redis_1.redis.set(key, JSON.stringify({ count, resetAt }), "EX", ttlSeconds);
        res.setHeader("x-ratelimit-limit", String(options.max));
        res.setHeader("x-ratelimit-remaining", String(Math.max(0, options.max - count)));
        res.setHeader("x-ratelimit-reset", String(Math.ceil(resetAt / 1000)));
        if (count > options.max) {
            return next(new app_error_1.AppError("Too many requests", 429, "VALIDATION_ERROR"));
        }
        next();
    };
}
//# sourceMappingURL=security.middleware.js.map