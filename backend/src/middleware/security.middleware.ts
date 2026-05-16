import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { redis } from "../lib/redis";
import { AppError } from "../utils/app-error";

type RateLimitState = {
  count: number;
  resetAt: number;
};

function getIp(req: Request): string {
  // Do not trust caller-controlled forwarding headers here.
  // If trusted proxies are configured, Express populates req.ip safely.
  return req.ip ?? "unknown";
}

export function attachRequestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"];
  req.requestId = typeof requestId === "string" && requestId.length > 0 ? requestId : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}

export function rateLimit(options: {
  keyPrefix: string;
  windowMs: number;
  max: number;
  keySuffix?: (req: Request) => string | null;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const now = Date.now();
    const identity = options.keySuffix?.(req) ?? getIp(req);
    const key = `${options.keyPrefix}:${identity}`;
    const raw = await redis.get(key);
    const current = raw ? (JSON.parse(raw) as RateLimitState) : null;
    const validCurrent = current && current.resetAt > now ? current : null;
    const resetAt = validCurrent ? validCurrent.resetAt : now + options.windowMs;
    const count = validCurrent ? validCurrent.count + 1 : 1;
    const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

    await redis.set(key, JSON.stringify({ count, resetAt }), "EX", ttlSeconds);
    res.setHeader("x-ratelimit-limit", String(options.max));
    res.setHeader("x-ratelimit-remaining", String(Math.max(0, options.max - count)));
    res.setHeader("x-ratelimit-reset", String(Math.ceil(resetAt / 1000)));

    if (count > options.max) {
      return next(new AppError("Too many requests", 429, "VALIDATION_ERROR"));
    }
    next();
  };
}
