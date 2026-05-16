import { Role } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { getAuditLogById, listAuditLogs } from "../services/audit.service";
import { AppError } from "../utils/app-error";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.string().min(2).max(100).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function requireAuditReader(req: Request) {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }
  if (
    req.user.role !== Role.ABUJA_ADMIN &&
    req.user.role !== Role.DG &&
    req.user.role !== Role.COORDINATOR
  ) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  return req.user;
}

export async function listAudit(req: Request, res: Response): Promise<void> {
  const user = requireAuditReader(req);
  const query = listQuerySchema.parse(req.query);

  const result = await listAuditLogs({
    actorRole: user.role,
    actorId: user.id,
    page: query.page,
    limit: query.limit,
    state: query.state,
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

export async function getAuditById(req: Request, res: Response): Promise<void> {
  const user = requireAuditReader(req);
  const { id } = idParamSchema.parse(req.params);
  const query = listQuerySchema.pick({ state: true }).parse(req.query);
  const item = await getAuditLogById(id, user.role, query.state);

  res.status(200).json({
    success: true,
    data: item,
  });
}
