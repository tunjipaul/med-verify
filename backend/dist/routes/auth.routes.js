"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const security_middleware_1 = require("../middleware/security.middleware");
const authRouter = (0, express_1.Router)();
authRouter.post("/login", (0, security_middleware_1.rateLimit)({
    keyPrefix: "auth-login",
    windowMs: 60000,
    max: 5,
    keySuffix: (req) => `${req.ip ?? "unknown"}:${String(req.body?.email ?? "").toLowerCase()}`,
}), auth_controller_1.login);
authRouter.post("/refresh", (0, security_middleware_1.rateLimit)({ keyPrefix: "auth-refresh", windowMs: 60000, max: 15 }), auth_controller_1.refreshToken);
authRouter.post("/logout", (0, security_middleware_1.rateLimit)({ keyPrefix: "auth-logout", windowMs: 60000, max: 20 }), auth_controller_1.logout);
exports.default = authRouter;
//# sourceMappingURL=auth.routes.js.map