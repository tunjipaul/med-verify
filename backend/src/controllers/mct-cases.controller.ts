import { MctStatus, Role } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { createMctCase, getMctCaseById, listMctCases, transitionMctCaseStatus } from "../services/mct-cases.service";
import { AppError } from "../utils/app-error";

const createCaseSchema = z.object({
  hospitalId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  referralTag: z.boolean().optional(),
  identityMatch: z.string().max(120).optional(),
});

const caseIdSchema = z.object({
  id: z.string().uuid(),
});

const transitionSchema = z.object({
  nextStatus: z.nativeEnum(MctStatus),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(MctStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function createCase(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (req.user.role !== Role.CORPER) {
    throw new AppError("Only corpers can create MCT cases", 403, "FORBIDDEN");
  }

  const payload = createCaseSchema.parse(req.body);
  const created = await createMctCase({
    corperUserId: req.user.id,
    ...payload,
  });

  res.status(201).json({
    success: true,
    message: "MCT case created",
    data: created,
  });
}

export async function listCases(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const query = listQuerySchema.parse(req.query);
  const result = await listMctCases({
    role: req.user.role,
    userId: req.user.id,
    status: query.status,
    page: query.page,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data: {
      items: result.items,
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      },
    },
  });
}

export async function getCaseById(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = caseIdSchema.parse(req.params);
  const item = await getMctCaseById(id, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    data: item,
  });
}

export async function transitionCaseStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = caseIdSchema.parse(req.params);
  const { nextStatus } = transitionSchema.parse(req.body);
  const updated = await transitionMctCaseStatus({
    caseId: id,
    nextStatus,
    actor: {
      userId: req.user.id,
      role: req.user.role,
    },
  });

  res.status(200).json({
    success: true,
    message: "MCT case status updated",
    data: updated,
  });
}
