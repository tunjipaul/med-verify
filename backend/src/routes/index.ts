import { Router } from "express";
import { Role } from "@prisma/client";
import adminRouter from "./admin.routes";
import auditRouter from "./audit.routes";
import authRouter from "./auth.routes";
import decisionsRouter from "./decisions.routes";
import mctCasesRouter from "./mct-cases.routes";
import verificationCodesRouter from "./verification-codes.routes";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";

const router = Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/audit", auditRouter);
router.use("/decisions", decisionsRouter);
router.use("/mct-cases", mctCasesRouter);
router.use("/verification-codes", verificationCodesRouter);

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MedVerify backend is running",
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.get("__ready__");
    res.status(200).json({
      success: true,
      message: "Dependencies are ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

router.get("/admin-only", authenticate, requireRoles(Role.ABUJA_ADMIN, Role.DG), (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Authorized admin endpoint",
  });
});

export default router;
