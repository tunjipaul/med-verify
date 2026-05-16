import { Router } from "express";
import { login, logout, refreshToken } from "../controllers/auth.controller";
import { rateLimit } from "../middleware/security.middleware";

const authRouter = Router();

authRouter.post(
  "/login",
  rateLimit({
    keyPrefix: "auth-login",
    windowMs: 60_000,
    max: 5,
    keySuffix: (req) => `${req.ip ?? "unknown"}:${String(req.body?.email ?? "").toLowerCase()}`,
  }),
  login,
);
authRouter.post("/refresh", rateLimit({ keyPrefix: "auth-refresh", windowMs: 60_000, max: 15 }), refreshToken);
authRouter.post("/logout", rateLimit({ keyPrefix: "auth-logout", windowMs: 60_000, max: 20 }), logout);

export default authRouter;
