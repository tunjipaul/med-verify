import { Role } from "@prisma/client";
import { Router } from "express";
import { getCaseById, listCases, transitionCaseStatus } from "../controllers/mct-cases.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import { generateCodeForCase } from "../controllers/verification-codes.controller";

const mctCasesRouter = Router();

mctCasesRouter.use(authenticate);
mctCasesRouter.get("/", listCases);
mctCasesRouter.get("/:id", getCaseById);
mctCasesRouter.patch("/:id/status", transitionCaseStatus);
mctCasesRouter.post("/:id/verification-codes", requireRoles(Role.DOCTOR), generateCodeForCase);

export default mctCasesRouter;
