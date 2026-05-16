import { Router } from "express";
import { getAuditById, listAudit } from "../controllers/audit.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";

const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(requireRoles(Role.ABUJA_ADMIN, Role.DG));
auditRouter.get("/", listAudit);
auditRouter.get("/:id", getAuditById);

export default auditRouter;
