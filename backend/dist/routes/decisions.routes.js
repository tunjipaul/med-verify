"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const decisions_controller_1 = require("../controllers/decisions.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const decisionsRouter = (0, express_1.Router)();
decisionsRouter.use(auth_middleware_1.authenticate);
decisionsRouter.post("/mct-cases/:id/generate", decisions_controller_1.generateDraft);
decisionsRouter.patch("/:decisionId/override", (0, auth_middleware_1.requireRoles)(client_1.Role.COORDINATOR, client_1.Role.ABUJA_ADMIN, client_1.Role.DG), decisions_controller_1.override);
decisionsRouter.post("/:decisionId/finalize", (0, auth_middleware_1.requireRoles)(client_1.Role.ABUJA_ADMIN, client_1.Role.DG), decisions_controller_1.finalize);
exports.default = decisionsRouter;
//# sourceMappingURL=decisions.routes.js.map