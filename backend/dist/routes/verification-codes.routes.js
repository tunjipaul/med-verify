"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_middleware_2 = require("../middleware/auth.middleware");
const verification_codes_controller_1 = require("../controllers/verification-codes.controller");
const security_middleware_1 = require("../middleware/security.middleware");
const verificationCodesRouter = (0, express_1.Router)();
verificationCodesRouter.use(auth_middleware_1.authenticate);
verificationCodesRouter.post("/validate", (0, auth_middleware_2.requireRoles)(client_1.Role.CORPER), (0, security_middleware_1.rateLimit)({
    keyPrefix: "verification-validate",
    windowMs: 60000,
    max: 10,
    keySuffix: (req) => `${req.user?.id ?? "unknown"}:${req.ip ?? "unknown"}`,
}), verification_codes_controller_1.validateCode);
verificationCodesRouter.post("/extend", (0, auth_middleware_2.requireRoles)(client_1.Role.COORDINATOR, client_1.Role.ABUJA_ADMIN, client_1.Role.DG), (0, security_middleware_1.rateLimit)({
    keyPrefix: "verification-extend",
    windowMs: 60000,
    max: 5,
    keySuffix: (req) => `${req.user?.id ?? "unknown"}:${req.ip ?? "unknown"}`,
}), verification_codes_controller_1.extendCode);
exports.default = verificationCodesRouter;
//# sourceMappingURL=verification-codes.routes.js.map