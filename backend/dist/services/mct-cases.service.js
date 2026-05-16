"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMctCase = createMctCase;
exports.listMctCases = listMctCases;
exports.getMctCaseById = getMctCaseById;
exports.transitionMctCaseStatus = transitionMctCaseStatus;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const app_error_1 = require("../utils/app-error");
function isPrivilegedRole(role) {
    return (role === client_1.Role.COORDINATOR ||
        role === client_1.Role.ABUJA_ADMIN ||
        role === client_1.Role.DG ||
        role === client_1.Role.SYSTEM);
}
function unauthorized(message) {
    throw new app_error_1.AppError(message, 403, "FORBIDDEN");
}
const allowedTransitions = {
    [client_1.MctStatus.CREATED]: [client_1.MctStatus.UNDER_REVIEW],
    [client_1.MctStatus.UNDER_REVIEW]: [client_1.MctStatus.REVIEW_REQUIRED, client_1.MctStatus.ESCALATED, client_1.MctStatus.APPROVED, client_1.MctStatus.REJECTED],
    [client_1.MctStatus.REVIEW_REQUIRED]: [client_1.MctStatus.ESCALATED, client_1.MctStatus.APPROVED, client_1.MctStatus.REJECTED],
    [client_1.MctStatus.ESCALATED]: [client_1.MctStatus.APPROVED, client_1.MctStatus.REJECTED],
    [client_1.MctStatus.APPROVED]: [client_1.MctStatus.CLOSED],
    [client_1.MctStatus.REJECTED]: [client_1.MctStatus.CLOSED],
    [client_1.MctStatus.CLOSED]: [],
};
function canRoleTransition(role, from, to) {
    if (role === client_1.Role.SYSTEM) {
        return true;
    }
    if (role === client_1.Role.DOCTOR) {
        return from === client_1.MctStatus.CREATED && to === client_1.MctStatus.UNDER_REVIEW;
    }
    if (role === client_1.Role.COORDINATOR) {
        return (from === client_1.MctStatus.REVIEW_REQUIRED &&
            (to === client_1.MctStatus.ESCALATED || to === client_1.MctStatus.APPROVED || to === client_1.MctStatus.REJECTED));
    }
    if (role === client_1.Role.ABUJA_ADMIN) {
        return ((from === client_1.MctStatus.UNDER_REVIEW &&
            (to === client_1.MctStatus.REVIEW_REQUIRED || to === client_1.MctStatus.ESCALATED || to === client_1.MctStatus.APPROVED || to === client_1.MctStatus.REJECTED)) ||
            (from === client_1.MctStatus.REVIEW_REQUIRED &&
                (to === client_1.MctStatus.ESCALATED || to === client_1.MctStatus.APPROVED || to === client_1.MctStatus.REJECTED)));
    }
    if (role === client_1.Role.DG) {
        return from === client_1.MctStatus.ESCALATED && (to === client_1.MctStatus.APPROVED || to === client_1.MctStatus.REJECTED);
    }
    return false;
}
async function logTransitionEvent(input) {
    await prisma_1.prisma.auditLog.create({
        data: {
            eventType: input.eventType,
            actorId: input.actorId,
            actorRole: input.actorRole,
            mctCaseId: input.mctCaseId,
            payloadSummary: input.payloadSummary,
        },
    });
}
async function createMctCase(input) {
    const corper = await prisma_1.prisma.corper.findUnique({
        where: { userId: input.corperUserId },
    });
    if (!corper) {
        throw new app_error_1.AppError("Corper profile not found", 404, "MCT_CORPER_PROFILE_NOT_FOUND");
    }
    let created;
    try {
        created = await prisma_1.prisma.mctCase.create({
            data: {
                corperId: corper.id,
                hospitalId: input.hospitalId,
                doctorId: input.doctorId,
                referralTag: input.referralTag ?? false,
                identityMatch: input.identityMatch,
                status: client_1.MctStatus.CREATED,
                submittedAt: new Date(),
            },
            include: {
                corper: {
                    select: {
                        id: true,
                        callUpNumber: true,
                        user: {
                            select: { id: true, email: true, firstName: true, lastName: true },
                        },
                    },
                },
                hospital: {
                    select: { id: true, name: true, state: true, tier: true },
                },
                doctor: {
                    select: { id: true, mdcnNumber: true, specialization: true },
                },
            },
        });
    }
    catch (error) {
        const prismaError = error;
        if (prismaError.code === "P2002") {
            throw new app_error_1.AppError("Corper already has an active MCT case", 409, "MCT_ACTIVE_CASE_EXISTS");
        }
        throw error;
    }
    await prisma_1.prisma.auditLog.create({
        data: {
            eventType: client_1.EventType.MCT_CREATED,
            actorId: input.corperUserId,
            actorRole: client_1.Role.CORPER,
            mctCaseId: created.id,
            payloadSummary: {
                hospitalId: input.hospitalId ?? null,
                doctorId: input.doctorId ?? null,
                referralTag: input.referralTag ?? false,
            },
        },
    });
    return created;
}
async function listMctCases(input) {
    const skip = (input.page - 1) * input.limit;
    const pagination = {
        skip,
        take: input.limit,
        orderBy: { createdAt: "desc" },
    };
    if (input.role === client_1.Role.CORPER) {
        const corper = await prisma_1.prisma.corper.findUnique({ where: { userId: input.userId } });
        if (!corper) {
            throw new app_error_1.AppError("Corper profile not found", 404, "MCT_CORPER_PROFILE_NOT_FOUND");
        }
        const where = { corperId: corper.id, deletedAt: null, status: input.status };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.mctCase.findMany({ where, ...pagination }),
            prisma_1.prisma.mctCase.count({ where }),
        ]);
        return { items, total };
    }
    if (input.role === client_1.Role.DOCTOR) {
        const doctor = await prisma_1.prisma.doctor.findUnique({ where: { userId: input.userId } });
        if (!doctor) {
            throw new app_error_1.AppError("Doctor profile not found", 404, "MCT_DOCTOR_PROFILE_NOT_FOUND");
        }
        const where = { doctorId: doctor.id, deletedAt: null, status: input.status };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.mctCase.findMany({ where, ...pagination }),
            prisma_1.prisma.mctCase.count({ where }),
        ]);
        return { items, total };
    }
    if (isPrivilegedRole(input.role)) {
        const where = { deletedAt: null, status: input.status };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.mctCase.findMany({ where, ...pagination }),
            prisma_1.prisma.mctCase.count({ where }),
        ]);
        return { items, total };
    }
    unauthorized("Role is not permitted to view MCT cases");
}
async function getMctCaseById(caseId, role, userId) {
    const mctCase = await prisma_1.prisma.mctCase.findUnique({
        where: { id: caseId },
        include: {
            corper: {
                select: {
                    id: true,
                    userId: true,
                    callUpNumber: true,
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
            },
            hospital: true,
            doctor: {
                select: {
                    id: true,
                    userId: true,
                    mdcnNumber: true,
                    specialization: true,
                },
            },
        },
    });
    if (!mctCase || mctCase.deletedAt) {
        throw new app_error_1.AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
    }
    if (isPrivilegedRole(role)) {
        return mctCase;
    }
    if (role === client_1.Role.CORPER && mctCase.corper.userId === userId) {
        return mctCase;
    }
    if (role === client_1.Role.DOCTOR && mctCase.doctor?.userId === userId) {
        return mctCase;
    }
    unauthorized("You do not have access to this MCT case");
}
async function transitionMctCaseStatus(input) {
    await logTransitionEvent({
        eventType: client_1.EventType.MCT_TRANSITION_ATTEMPT,
        actorId: input.actor.userId,
        actorRole: input.actor.role,
        mctCaseId: input.caseId,
        payloadSummary: { nextStatus: input.nextStatus },
    });
    const mctCase = await prisma_1.prisma.mctCase.findUnique({
        where: { id: input.caseId },
        include: {
            corper: { select: { userId: true } },
            doctor: { select: { userId: true } },
        },
    });
    if (!mctCase || mctCase.deletedAt) {
        await logTransitionEvent({
            eventType: client_1.EventType.MCT_TRANSITION_FAILED,
            actorId: input.actor.userId,
            actorRole: input.actor.role,
            mctCaseId: input.caseId,
            payloadSummary: { reason: "CASE_NOT_FOUND", nextStatus: input.nextStatus },
        });
        throw new app_error_1.AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
    }
    const fromStatus = mctCase.status;
    const validNext = allowedTransitions[fromStatus];
    if (!validNext.includes(input.nextStatus)) {
        await logTransitionEvent({
            eventType: client_1.EventType.MCT_TRANSITION_FAILED,
            actorId: input.actor.userId,
            actorRole: input.actor.role,
            mctCaseId: input.caseId,
            payloadSummary: { reason: "INVALID_TRANSITION", fromStatus, nextStatus: input.nextStatus },
        });
        throw new app_error_1.AppError(`Invalid transition from ${fromStatus} to ${input.nextStatus}`, 400, "MCT_TRANSITION_INVALID");
    }
    if (input.actor.role === client_1.Role.DOCTOR && mctCase.doctor?.userId !== input.actor.userId) {
        await logTransitionEvent({
            eventType: client_1.EventType.MCT_TRANSITION_FAILED,
            actorId: input.actor.userId,
            actorRole: input.actor.role,
            mctCaseId: input.caseId,
            payloadSummary: { reason: "DOCTOR_NOT_ASSIGNED", fromStatus, nextStatus: input.nextStatus },
        });
        unauthorized("Doctor is not assigned to this case");
    }
    if (!canRoleTransition(input.actor.role, fromStatus, input.nextStatus)) {
        await logTransitionEvent({
            eventType: client_1.EventType.MCT_TRANSITION_FAILED,
            actorId: input.actor.userId,
            actorRole: input.actor.role,
            mctCaseId: input.caseId,
            payloadSummary: { reason: "ROLE_NOT_ALLOWED", fromStatus, nextStatus: input.nextStatus },
        });
        unauthorized("Role is not permitted for this transition");
    }
    const updated = await prisma_1.prisma.mctCase.update({
        where: { id: input.caseId },
        data: {
            status: input.nextStatus,
            reviewedAt: input.nextStatus === client_1.MctStatus.UNDER_REVIEW ||
                input.nextStatus === client_1.MctStatus.APPROVED ||
                input.nextStatus === client_1.MctStatus.REJECTED
                ? new Date()
                : undefined,
            closedAt: input.nextStatus === client_1.MctStatus.CLOSED ? new Date() : undefined,
        },
    });
    await logTransitionEvent({
        eventType: client_1.EventType.MCT_TRANSITION_SUCCESS,
        actorId: input.actor.userId,
        actorRole: input.actor.role,
        mctCaseId: input.caseId,
        payloadSummary: { fromStatus, nextStatus: input.nextStatus },
    });
    return updated;
}
//# sourceMappingURL=mct-cases.service.js.map