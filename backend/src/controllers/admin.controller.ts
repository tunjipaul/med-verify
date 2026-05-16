import { HospitalTier } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  createDoctor,
  createHospital,
  listDoctors,
  listHospitals,
  updateDoctor,
  updateHospital,
} from "../services/admin.service";
import { AppError } from "../utils/app-error";

const createHospitalSchema = z.object({
  name: z.string().min(2).max(200),
  state: z.string().min(2).max(100),
  tier: z.nativeEnum(HospitalTier),
  approvedRegistryId: z.string().min(3).max(100),
});

const updateHospitalSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  state: z.string().min(2).max(100).optional(),
  tier: z.nativeEnum(HospitalTier).optional(),
  isActive: z.boolean().optional(),
});

const createDoctorSchema = z.object({
  userId: z.string().uuid(),
  hospitalId: z.string().uuid(),
  mdcnNumber: z.string().min(3).max(100),
  specialization: z.string().min(2).max(120).optional(),
});

const updateDoctorSchema = z.object({
  hospitalId: z.string().uuid().optional(),
  specialization: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }
  return req.user;
}

export async function getHospitals(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const data = await listHospitals(user.role);
  res.status(200).json({ success: true, data });
}

export async function postHospital(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const payload = createHospitalSchema.parse(req.body);
  const data = await createHospital(user.role, payload);
  res.status(201).json({ success: true, message: "Hospital created", data });
}

export async function patchHospital(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  const payload = updateHospitalSchema.parse(req.body);
  const data = await updateHospital(user.role, id, payload);
  res.status(200).json({ success: true, message: "Hospital updated", data });
}

export async function getDoctors(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const data = await listDoctors(user.role);
  res.status(200).json({ success: true, data });
}

export async function postDoctor(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const payload = createDoctorSchema.parse(req.body);
  const data = await createDoctor(user.role, payload);
  res.status(201).json({ success: true, message: "Doctor created", data });
}

export async function patchDoctor(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  const payload = updateDoctorSchema.parse(req.body);
  const data = await updateDoctor(user.role, id, payload);
  res.status(200).json({ success: true, message: "Doctor updated", data });
}
