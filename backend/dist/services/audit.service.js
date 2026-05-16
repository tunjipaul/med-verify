"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
exports.getAuditLogById = getAuditLogById;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const app_error_1 = require("../utils/app-error");
async function listAuditLogs(input) {
    const skip = (input.page - 1) * input.limit;
    if (input.actorRole === client_1.Role.COORDINATOR && !input.state) {
        throw new app_error_1.AppError("Coordinator audit access requires state filter", 400, "VALIDATION_ERROR");
    }
    const where = input.actorRole === client_1.Role.COORDINATOR
        ? {
            mctCase: {
                hospital: {
                    state: input.state,
                },
            },
        }
        : {};
    const [items, total] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.auditLog.findMany({
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
        prisma_1.prisma.auditLog.count({ where }),
    ]);
    return { items, total };
}
async function getAuditLogById(id, actorRole, state) {
    const item = await prisma_1.prisma.auditLog.findUnique({
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
        throw new app_error_1.AppError("Audit log not found", 404, "NOT_FOUND");
    }
    if (actorRole === client_1.Role.COORDINATOR) {
        if (!state) {
            throw new app_error_1.AppError("Coordinator audit access requires state filter", 400, "VALIDATION_ERROR");
        }
        const itemState = item.mctCase?.hospital?.state;
        if (!itemState || itemState !== state) {
            throw new app_error_1.AppError("Forbidden", 403, "FORBIDDEN");
        }
    }
    return item;
}
//# sourceMappingURL=audit.service.js.map