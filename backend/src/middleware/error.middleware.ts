import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isAppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: err.issues,
    });
    return;
  }

  const legacyError = err as { statusCode?: number; code?: string; message?: string; stack?: string };
  const statusCode = isAppError(err) ? err.statusCode : legacyError.statusCode ?? 500;
  const rawMessage = err instanceof Error ? err.message : legacyError.message ?? "Internal Server Error";
  const code = isAppError(err)
    ? err.code
    : typeof legacyError.code === "string"
      ? legacyError.code
      : statusCode >= 500
        ? "INTERNAL_ERROR"
        : statusCode === 401
          ? "UNAUTHORIZED"
          : statusCode === 403
            ? "FORBIDDEN"
            : statusCode === 404
              ? "NOT_FOUND"
              : "VALIDATION_ERROR";
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error({
    code,
    message: rawMessage,
    statusCode,
    stack,
  });

  res.status(statusCode).json({
    success: false,
    code,
    message: statusCode >= 500 ? "Internal Server Error" : rawMessage,
  });
}
