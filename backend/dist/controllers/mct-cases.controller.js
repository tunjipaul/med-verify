"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCase = createCase;
exports.listCases = listCases;
exports.getCaseById = getCaseById;
exports.transitionCaseStatus = transitionCaseStatus;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const mct_cases_service_1 = require("../services/mct-cases.service");
const app_error_1 = require("../utils/app-error");
const createCaseSchema = zod_1.z.object({
    hospitalId: zod_1.z.string().uuid().optional(),
    doctorId: zod_1.z.string().uuid().optional(),
    referralTag: zod_1.z.boolean().optional(),
    identityMatch: zod_1.z.string().max(120).optional(),
});
const caseIdSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const transitionSchema = zod_1.z.object({
    nextStatus: zod_1.z.nativeEnum(client_1.MctStatus),
});
const listQuerySchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.MctStatus).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
async function createCase(req, res) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (req.user.role !== client_1.Role.CORPER) {
        throw new app_error_1.AppError("Only corpers can create MCT cases", 403, "FORBIDDEN");
    }
    const payload = createCaseSchema.parse(req.body);
    const created = await (0, mct_cases_service_1.createMctCase)({
        corperUserId: req.user.id,
        ...payload,
    });
    res.status(201).json({
        success: true,
        message: "MCT case created",
        data: created,
    });
}
async function listCases(req, res) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const query = listQuerySchema.parse(req.query);
    const result = await (0, mct_cases_service_1.listMctCases)({
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
async function getCaseById(req, res) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const { id } = caseIdSchema.parse(req.params);
    const item = await (0, mct_cases_service_1.getMctCaseById)(id, req.user.role, req.user.id);
    res.status(200).json({
        success: true,
        data: item,
    });
}
async function transitionCaseStatus(req, res) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const { id } = caseIdSchema.parse(req.params);
    const { nextStatus } = transitionSchema.parse(req.body);
    const updated = await (0, mct_cases_service_1.transitionMctCaseStatus)({
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
//# sourceMappingURL=mct-cases.controller.js.map