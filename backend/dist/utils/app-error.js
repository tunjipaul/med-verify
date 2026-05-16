"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.isAppError = isAppError;
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.AppError = AppError;
function isAppError(err) {
    return err instanceof AppError;
}
//# sourceMappingURL=app-error.js.map