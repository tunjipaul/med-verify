"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("../controllers/audit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const auditRouter = (0, express_1.Router)();
auditRouter.use(auth_middleware_1.authenticate);
auditRouter.use((0, auth_middleware_1.requireRoles)(client_1.Role.ABUJA_ADMIN, client_1.Role.DG));
auditRouter.get("/", audit_controller_1.listAudit);
auditRouter.get("/:id", audit_controller_1.getAuditById);
exports.default = auditRouter;
//# sourceMappingURL=audit.routes.js.map