import { HospitalTier, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";

function assertAdminRole(role: Role) {
  if (role !== Role.ABUJA_ADMIN && role !== Role.DG) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
}

export async function listHospitals(role: Role) {
  assertAdminRole(role);
  return prisma.hospital.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createHospital(
  role: Role,
  payload: { name: string; state: string; tier: HospitalTier; approvedRegistryId: string },
) {
  assertAdminRole(role);
  return prisma.hospital.create({ data: payload });
}

export async function updateHospital(
  role: Role,
  hospitalId: string,
  payload: Partial<{ name: string; state: string; tier: HospitalTier; isActive: boolean }>,
) {
  assertAdminRole(role);
  const existing = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!existing || existing.deletedAt) {
    throw new AppError("Hospital not found", 404, "NOT_FOUND");
  }
  return prisma.hospital.update({
    where: { id: hospitalId },
    data: payload,
  });
}

export async function listDoctors(role: Role) {
  assertAdminRole(role);
  return prisma.doctor.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      hospital: { select: { id: true, name: true, state: true, tier: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDoctor(
  role: Role,
  payload: { userId: string; hospitalId: string; mdcnNumber: string; specialization?: string },
) {
  assertAdminRole(role);
  const targetUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!targetUser || !targetUser.isActive) {
    throw new AppError("User not found or inactive", 404, "NOT_FOUND");
  }
  if (targetUser.role !== Role.DOCTOR) {
    throw new AppError("Selected user must have DOCTOR role", 400, "VALIDATION_ERROR");
  }
  return prisma.doctor.create({
    data: payload,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      hospital: { select: { id: true, name: true, state: true, tier: true } },
    },
  });
}

export async function updateDoctor(
  role: Role,
  doctorId: string,
  payload: Partial<{ hospitalId: string; specialization: string; isActive: boolean }>,
) {
  assertAdminRole(role);
  const existing = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!existing || existing.deletedAt) {
    throw new AppError("Doctor not found", 404, "NOT_FOUND");
  }

  return prisma.doctor.update({
    where: { id: doctorId },
    data: payload,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      hospital: { select: { id: true, name: true, state: true, tier: true } },
    },
  });
}
