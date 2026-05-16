import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/auth.middleware";
import { extendCode, validateCode } from "../controllers/verification-codes.controller";
import { rateLimit } from "../middleware/security.middleware";

const verificationCodesRouter = Router();

verificationCodesRouter.use(authenticate);
verificationCodesRouter.post(
  "/validate",
  requireRoles(Role.CORPER),
  rateLimit({
    keyPrefix: "verification-validate",
    windowMs: 60_000,
    max: 10,
    keySuffix: (req) => `${req.user?.id ?? "unknown"}:${req.ip ?? "unknown"}`,
  }),
  validateCode,
);
verificationCodesRouter.post(
  "/extend",
  requireRoles(Role.COORDINATOR, Role.ABUJA_ADMIN, Role.DG),
  rateLimit({
    keyPrefix: "verification-extend",
    windowMs: 60_000,
    max: 5,
    keySuffix: (req) => `${req.user?.id ?? "unknown"}:${req.ip ?? "unknown"}`,
  }),
  extendCode,
);

export default verificationCodesRouter;
