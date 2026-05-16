"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const mct_cases_controller_1 = require("../controllers/mct-cases.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const verification_codes_controller_1 = require("../controllers/verification-codes.controller");
const mctCasesRouter = (0, express_1.Router)();
mctCasesRouter.use(auth_middleware_1.authenticate);
mctCasesRouter.post("/", mct_cases_controller_1.createCase);
mctCasesRouter.get("/", mct_cases_controller_1.listCases);
mctCasesRouter.get("/:id", mct_cases_controller_1.getCaseById);
mctCasesRouter.patch("/:id/status", mct_cases_controller_1.transitionCaseStatus);
mctCasesRouter.post("/:id/verification-codes", (0, auth_middleware_1.requireRoles)(client_1.Role.DOCTOR), verification_codes_controller_1.generateCodeForCase);
exports.default = mctCasesRouter;
//# sourceMappingURL=mct-cases.routes.js.map