"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRoles = requireRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const app_error_1 = require("../utils/app-error");
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
        return next(new app_error_1.AppError("Unauthorized: Missing token", 401, "UNAUTHORIZED"));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
        return next();
    }
    catch {
        return next(new app_error_1.AppError("Unauthorized: Invalid token", 401, "UNAUTHORIZED"));
    }
}
function requireRoles(...allowed) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED"));
        }
        if (!allowed.includes(req.user.role)) {
            return next(new app_error_1.AppError("Forbidden", 403, "FORBIDDEN"));
        }
        return next();
    };
}
//# sourceMappingURL=auth.middleware.js.map