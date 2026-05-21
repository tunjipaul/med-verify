import { randomUUID } from "crypto";
import type { Response } from "express";
import { env } from "../config/env";

export const REFRESH_COOKIE_NAME = "refreshToken";
export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function setAuthCookies(res: Response, refreshToken: string): string {
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
