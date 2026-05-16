"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAudit = listAudit;
exports.getAuditById = getAuditById;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const audit_service_1 = require("../services/audit.service");
const app_error_1 = require("../utils/app-error");
const listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    state: zod_1.z.string().min(2).max(100).optional(),
});
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
function requireAuditReader(req) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (req.user.role !== client_1.Role.ABUJA_ADMIN &&
        req.user.role !== client_1.Role.DG &&
        req.user.role !== client_1.Role.COORDINATOR) {
        throw new app_error_1.AppError("Forbidden", 403, "FORBIDDEN");
    }
    return req.user;
}
async function listAudit(req, res) {
    const user = requireAuditReader(req);
    const query = listQuerySchema.parse(req.query);
    const result = await (0, audit_service_1.listAuditLogs)({
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
async function getAuditById(req, res) {
    const user = requireAuditReader(req);
    const { id } = idParamSchema.parse(req.params);
    const query = listQuerySchema.pick({ state: true }).parse(req.query);
    const item = await (0, audit_service_1.getAuditLogById)(id, user.role, query.state);
    res.status(200).json({
        success: true,
        data: item,
    });
}
//# sourceMappingURL=audit.controller.js.map