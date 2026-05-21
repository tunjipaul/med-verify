"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const admin_routes_1 = __importDefault(require("./admin.routes"));
const audit_routes_1 = __importDefault(require("./audit.routes"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const decisions_routes_1 = __importDefault(require("./decisions.routes"));
const mct_cases_routes_1 = __importDefault(require("./mct-cases.routes"));
const verification_codes_routes_1 = __importDefault(require("./verification-codes.routes"));
const corper_activation_routes_1 = __importDefault(require("./corper-activation.routes"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../lib/redis");
const router = (0, express_1.Router)();
router.use("/auth", auth_routes_1.default);
router.use("/admin", admin_routes_1.default);
router.use("/audit", audit_routes_1.default);
router.use("/decisions", decisions_routes_1.default);
router.use("/mct-cases", mct_cases_routes_1.default);
router.use("/verification-codes", verification_codes_routes_1.default);
router.use("/corper/activation", corper_activation_routes_1.default);
router.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "MedVerify backend is running",
        timestamp: new Date().toISOString(),
    });
});
router.get("/ready", async (_req, res, next) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        await redis_1.redis.get("__ready__");
        res.status(200).json({
            success: true,
            message: "Dependencies are ready",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/me", auth_middleware_1.authenticate, (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user,
    });
});
router.get("/admin-only", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRoles)(client_1.Role.ABUJA_ADMIN, client_1.Role.DG), (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Authorized admin endpoint",
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map