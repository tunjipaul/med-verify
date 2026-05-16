"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listHospitals = listHospitals;
exports.createHospital = createHospital;
exports.updateHospital = updateHospital;
exports.listDoctors = listDoctors;
exports.createDoctor = createDoctor;
exports.updateDoctor = updateDoctor;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const app_error_1 = require("../utils/app-error");
function assertAdminRole(role) {
    if (role !== client_1.Role.ABUJA_ADMIN && role !== client_1.Role.DG) {
        throw new app_error_1.AppError("Forbidden", 403, "FORBIDDEN");
    }
}
async function listHospitals(role) {
    assertAdminRole(role);
    return prisma_1.prisma.hospital.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
    });
}
async function createHospital(role, payload) {
    assertAdminRole(role);
    return prisma_1.prisma.hospital.create({ data: payload });
}
async function updateHospital(role, hospitalId, payload) {
    assertAdminRole(role);
    const existing = await prisma_1.prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!existing || existing.deletedAt) {
        throw new app_error_1.AppError("Hospital not found", 404, "NOT_FOUND");
    }
    return prisma_1.prisma.hospital.update({
        where: { id: hospitalId },
        data: payload,
    });
}
async function listDoctors(role) {
    assertAdminRole(role);
    return prisma_1.prisma.doctor.findMany({
        where: { deletedAt: null },
        include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            hospital: { select: { id: true, name: true, state: true, tier: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}
async function createDoctor(role, payload) {
    assertAdminRole(role);
    const targetUser = await prisma_1.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, isActive: true },
    });
    if (!targetUser || !targetUser.isActive) {
        throw new app_error_1.AppError("User not found or inactive", 404, "NOT_FOUND");
    }
    if (targetUser.role !== client_1.Role.DOCTOR) {
        throw new app_error_1.AppError("Selected user must have DOCTOR role", 400, "VALIDATION_ERROR");
    }
    return prisma_1.prisma.doctor.create({
        data: payload,
        include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            hospital: { select: { id: true, name: true, state: true, tier: true } },
        },
    });
}
async function updateDoctor(role, doctorId, payload) {
    assertAdminRole(role);
    const existing = await prisma_1.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!existing || existing.deletedAt) {
        throw new app_error_1.AppError("Doctor not found", 404, "NOT_FOUND");
    }
    return prisma_1.prisma.doctor.update({
        where: { id: doctorId },
        data: payload,
        include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            hospital: { select: { id: true, name: true, state: true, tier: true } },
        },
    });
}
//# sourceMappingURL=admin.service.js.map