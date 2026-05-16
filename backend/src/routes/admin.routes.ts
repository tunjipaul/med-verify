import { Router } from "express";
import {
  getDoctors,
  getHospitals,
  patchDoctor,
  patchHospital,
  postDoctor,
  postHospital,
} from "../controllers/admin.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";

const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRoles(Role.ABUJA_ADMIN, Role.DG));

adminRouter.get("/hospitals", getHospitals);
adminRouter.post("/hospitals", postHospital);
adminRouter.patch("/hospitals/:id", patchHospital);

adminRouter.get("/doctors", getDoctors);
adminRouter.post("/doctors", postDoctor);
adminRouter.patch("/doctors/:id", patchDoctor);

export default adminRouter;
