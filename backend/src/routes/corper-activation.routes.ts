import { Router } from "express";
import { requestOtp, verifyOtp } from "../controllers/corper-activation.controller";
import { rateLimit } from "../middleware/security.middleware";

const corperActivationRouter = Router();

corperActivationRouter.post(
  "/request-otp",
  rateLimit({
    keyPrefix: "corper-activation-request-otp",
    windowMs: 60_000,
    max: 5,
    keySuffix: (req) => `${req.ip ?? "unknown"}:${String(req.body?.callUpNumber ?? "").toUpperCase()}`,
  }),
  requestOtp,
);

corperActivationRouter.post(
  "/verify-otp",
  rateLimit({
    keyPrefix: "corper-activation-verify-otp",
    windowMs: 60_000,
    max: 10,
    keySuffix: (req) => `${req.ip ?? "unknown"}:${String(req.body?.callUpNumber ?? "").toUpperCase()}`,
  }),
  verifyOtp,
);

export default corperActivationRouter;
