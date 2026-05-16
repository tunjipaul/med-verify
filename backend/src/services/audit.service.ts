import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";

type ListAuditInput = {
  actorRole: Role;
  actorId: string;
  page: number;
  limit: number;
  state?: string;
};

export async function listAuditLogs(input: ListAuditInput) {
  const skip = (input.page - 1) * input.limit;

  if (input.actorRole === Role.COORDINATOR && !input.state) {
    throw new AppError("Coordinator audit access requires state filter", 400, "VALIDATION_ERROR");
  }

  const where =
    input.actorRole === Role.COORDINATOR
      ? {
          mctCase: {
            hospital: {
              state: input.state,
            },
          },
        }
      : {};

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      include: {
        mctCase: {
          select: {
            id: true,
            status: true,
            hospital: {
              select: { id: true, name: true, state: true },
            },
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}

export async function getAuditLogById(id: string, actorRole: Role, state?: string) {
  const item = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      mctCase: {
        select: {
          id: true,
          status: true,
          hospital: {
            select: { id: true, name: true, state: true },
          },
        },
      },
    },
  });

  if (!item) {
    throw new AppError("Audit log not found", 404, "NOT_FOUND");
  }

  if (actorRole === Role.COORDINATOR) {
    if (!state) {
      throw new AppError("Coordinator audit access requires state filter", 400, "VALIDATION_ERROR");
    }
    const itemState = item.mctCase?.hospital?.state;
    if (!itemState || itemState !== state) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  return item;
}
