import { Router } from "express";
import { Role } from "@prisma/client";
import { finalize, generateDraft, override } from "../controllers/decisions.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";

const decisionsRouter = Router();

decisionsRouter.use(authenticate);
decisionsRouter.post("/mct-cases/:id/generate", generateDraft);
decisionsRouter.patch("/:decisionId/override", requireRoles(Role.COORDINATOR, Role.ABUJA_ADMIN, Role.DG), override);
decisionsRouter.post("/:decisionId/finalize", requireRoles(Role.ABUJA_ADMIN, Role.DG), finalize);

export default decisionsRouter;
