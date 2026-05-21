"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const corper_activation_controller_1 = require("../controllers/corper-activation.controller");
const security_middleware_1 = require("../middleware/security.middleware");
const corperActivationRouter = (0, express_1.Router)();
corperActivationRouter.post("/request-otp", (0, security_middleware_1.rateLimit)({
    keyPrefix: "corper-activation-request-otp",
    windowMs: 60000,
    max: 5,
    keySuffix: (req) => `${req.ip ?? "unknown"}:${String(req.body?.callUpNumber ?? "").toUpperCase()}`,
}), corper_activation_controller_1.requestOtp);
corperActivationRouter.post("/verify-otp", (0, security_middleware_1.rateLimit)({
    keyPrefix: "corper-activation-verify-otp",
    windowMs: 60000,
    max: 10,
    keySuffix: (req) => `${req.ip ?? "unknown"}:${String(req.body?.callUpNumber ?? "").toUpperCase()}`,
}), corper_activation_controller_1.verifyOtp);
exports.default = corperActivationRouter;
//# sourceMappingURL=corper-activation.routes.js.map