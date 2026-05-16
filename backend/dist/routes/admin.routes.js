"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const adminRouter = (0, express_1.Router)();
adminRouter.use(auth_middleware_1.authenticate);
adminRouter.use((0, auth_middleware_1.requireRoles)(client_1.Role.ABUJA_ADMIN, client_1.Role.DG));
adminRouter.get("/hospitals", admin_controller_1.getHospitals);
adminRouter.post("/hospitals", admin_controller_1.postHospital);
adminRouter.patch("/hospitals/:id", admin_controller_1.patchHospital);
adminRouter.get("/doctors", admin_controller_1.getDoctors);
adminRouter.post("/doctors", admin_controller_1.postDoctor);
adminRouter.patch("/doctors/:id", admin_controller_1.patchDoctor);
exports.default = adminRouter;
//# sourceMappingURL=admin.routes.js.map