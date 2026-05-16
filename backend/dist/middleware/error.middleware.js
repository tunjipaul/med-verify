"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
const logger_1 = require("../utils/logger");
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
}
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors: err.issues,
        });
        return;
    }
    const legacyError = err;
    const statusCode = (0, app_error_1.isAppError)(err) ? err.statusCode : legacyError.statusCode ?? 500;
    const rawMessage = err instanceof Error ? err.message : legacyError.message ?? "Internal Server Error";
    const code = (0, app_error_1.isAppError)(err)
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
    logger_1.logger.error({
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
//# sourceMappingURL=error.middleware.js.map