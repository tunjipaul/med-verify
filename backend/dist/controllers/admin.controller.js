"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHospitals = getHospitals;
exports.postHospital = postHospital;
exports.patchHospital = patchHospital;
exports.getDoctors = getDoctors;
exports.postDoctor = postDoctor;
exports.patchDoctor = patchDoctor;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const admin_service_1 = require("../services/admin.service");
const app_error_1 = require("../utils/app-error");
const createHospitalSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200),
    state: zod_1.z.string().min(2).max(100),
    tier: zod_1.z.nativeEnum(client_1.HospitalTier),
    approvedRegistryId: zod_1.z.string().min(3).max(100),
});
const updateHospitalSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200).optional(),
    state: zod_1.z.string().min(2).max(100).optional(),
    tier: zod_1.z.nativeEnum(client_1.HospitalTier).optional(),
    isActive: zod_1.z.boolean().optional(),
});
const createDoctorSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    hospitalId: zod_1.z.string().uuid(),
    mdcnNumber: zod_1.z.string().min(3).max(100),
    specialization: zod_1.z.string().min(2).max(120).optional(),
});
const updateDoctorSchema = zod_1.z.object({
    hospitalId: zod_1.z.string().uuid().optional(),
    specialization: zod_1.z.string().min(2).max(120).optional(),
    isActive: zod_1.z.boolean().optional(),
});
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
function requireUser(req) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    return req.user;
}
async function getHospitals(req, res) {
    const user = requireUser(req);
    const data = await (0, admin_service_1.listHospitals)(user.role);
    res.status(200).json({ success: true, data });
}
async function postHospital(req, res) {
    const user = requireUser(req);
    const payload = createHospitalSchema.parse(req.body);
    const data = await (0, admin_service_1.createHospital)(user.role, payload);
    res.status(201).json({ success: true, message: "Hospital created", data });
}
async function patchHospital(req, res) {
    const user = requireUser(req);
    const { id } = idParamSchema.parse(req.params);
    const payload = updateHospitalSchema.parse(req.body);
    const data = await (0, admin_service_1.updateHospital)(user.role, id, payload);
    res.status(200).json({ success: true, message: "Hospital updated", data });
}
async function getDoctors(req, res) {
    const user = requireUser(req);
    const data = await (0, admin_service_1.listDoctors)(user.role);
    res.status(200).json({ success: true, data });
}
async function postDoctor(req, res) {
    const user = requireUser(req);
    const payload = createDoctorSchema.parse(req.body);
    const data = await (0, admin_service_1.createDoctor)(user.role, payload);
    res.status(201).json({ success: true, message: "Doctor created", data });
}
async function patchDoctor(req, res) {
    const user = requireUser(req);
    const { id } = idParamSchema.parse(req.params);
    const payload = updateDoctorSchema.parse(req.body);
    const data = await (0, admin_service_1.updateDoctor)(user.role, id, payload);
    res.status(200).json({ success: true, message: "Doctor updated", data });
}
//# sourceMappingURL=admin.controller.js.map