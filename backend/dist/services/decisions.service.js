"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDecisionDraft = generateDecisionDraft;
exports.overrideDecision = overrideDecision;
exports.finalizeDecision = finalizeDecision;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const app_error_1 = require("../utils/app-error");
function forbidden(message) {
    throw new app_error_1.AppError(message, 403, "FORBIDDEN");
}
async function writeAudit(input) {
    await prisma_1.prisma.auditLog.create({
        data: {
            eventType: input.eventType,
            actorId: input.actorId,
            actorRole: input.actorRole,
            mctCaseId: input.mctCaseId,
            targetId: input.targetId,
            payloadSummary: input.payloadSummary,
        },
    });
}
function deriveDraftOutcome(mctCase) {
    if (mctCase.riskScore >= 15)
        return client_1.DecisionOutcome.AUTO_REJECT;
    if (mctCase.riskScore >= 10)
        return client_1.DecisionOutcome.ESCALATE;
    if (mctCase.riskScore >= 5 || mctCase.referralTag)
        return client_1.DecisionOutcome.REVIEW_REQUIRED;
    return client_1.DecisionOutcome.AUTO_APPROVE;
}
async function generateDecisionDraft(caseId, actor) {
    const mctCase = await prisma_1.prisma.mctCase.findUnique({
        where: { id: caseId },
        include: { doctor: { select: { userId: true } } },
    });
    if (!mctCase || mctCase.deletedAt) {
        throw new app_error_1.AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
    }
    const allowed = actor.role === client_1.Role.SYSTEM ||
        actor.role === client_1.Role.COORDINATOR ||
        actor.role === client_1.Role.ABUJA_ADMIN ||
        actor.role === client_1.Role.DG;
    if (!allowed)
        forbidden("Role is not permitted to generate decision draft");
    const outcome = deriveDraftOutcome({ referralTag: mctCase.referralTag, riskScore: mctCase.riskScore });
    const decision = await prisma_1.prisma.caseDecision.create({
        data: {
            mctCaseId: mctCase.id,
            outcome,
            riskScore: mctCase.riskScore,
            riskBreakdown: mctCase.riskBreakdown ?? undefined,
            reasonText: "Auto-generated draft decision",
            decidedById: actor.userId,
            isOverride: false,
        },
    });
    await writeAudit({
        eventType: client_1.EventType.DECISION_GENERATED,
        actorId: actor.userId,
        actorRole: actor.role,
        mctCaseId: mctCase.id,
        targetId: decision.id,
        payloadSummary: { outcome },
    });
    return decision;
}
async function overrideDecision(decisionId, payload, actor) {
    const decision = await prisma_1.prisma.caseDecision.findUnique({ where: { id: decisionId } });
    if (!decision) {
        throw new app_error_1.AppError("Decision not found", 404, "NOT_FOUND");
    }
    const allowed = actor.role === client_1.Role.SYSTEM || actor.role === client_1.Role.COORDINATOR || actor.role === client_1.Role.ABUJA_ADMIN || actor.role === client_1.Role.DG;
    if (!allowed)
        forbidden("Role is not permitted to override decision");
    const updated = await prisma_1.prisma.caseDecision.update({
        where: { id: decision.id },
        data: {
            outcome: payload.outcome,
            reasonText: payload.reasonText,
            decidedById: actor.userId,
            isOverride: true,
        },
    });
    await writeAudit({
        eventType: client_1.EventType.DECISION_OVERRIDDEN,
        actorId: actor.userId,
        actorRole: actor.role,
        mctCaseId: decision.mctCaseId,
        targetId: decision.id,
        payloadSummary: { outcome: payload.outcome },
    });
    return updated;
}
async function finalizeDecision(decisionId, actor) {
    const decision = await prisma_1.prisma.caseDecision.findUnique({
        where: { id: decisionId },
        include: { mctCase: { select: { status: true } } },
    });
    if (!decision) {
        throw new app_error_1.AppError("Decision not found", 404, "NOT_FOUND");
    }
    const allowed = actor.role === client_1.Role.SYSTEM || actor.role === client_1.Role.ABUJA_ADMIN || actor.role === client_1.Role.DG;
    if (!allowed)
        forbidden("Role is not permitted to finalize decision");
    if ((decision.mctCase.status === client_1.MctStatus.ESCALATED || decision.outcome === client_1.DecisionOutcome.ESCALATE) &&
        actor.role !== client_1.Role.DG &&
        actor.role !== client_1.Role.SYSTEM) {
        forbidden("Only DG can finalize escalated cases");
    }
    let nextStatus = null;
    if (decision.outcome === client_1.DecisionOutcome.APPROVED || decision.outcome === client_1.DecisionOutcome.AUTO_APPROVE) {
        nextStatus = client_1.MctStatus.APPROVED;
    }
    else if (decision.outcome === client_1.DecisionOutcome.REJECTED || decision.outcome === client_1.DecisionOutcome.AUTO_REJECT) {
        nextStatus = client_1.MctStatus.REJECTED;
    }
    else if (decision.outcome === client_1.DecisionOutcome.REVIEW_REQUIRED) {
        nextStatus = client_1.MctStatus.REVIEW_REQUIRED;
    }
    else if (decision.outcome === client_1.DecisionOutcome.ESCALATE) {
        nextStatus = client_1.MctStatus.ESCALATED;
    }
    if (nextStatus) {
        await prisma_1.prisma.mctCase.update({
            where: { id: decision.mctCaseId },
            data: { status: nextStatus, reviewedAt: new Date() },
        });
    }
    await writeAudit({
        eventType: client_1.EventType.DECISION_FINALIZED,
        actorId: actor.userId,
        actorRole: actor.role,
        mctCaseId: decision.mctCaseId,
        targetId: decision.id,
        payloadSummary: { outcome: decision.outcome, nextStatus },
    });
    return { decision, nextStatus };
}
//# sourceMappingURL=decisions.service.js.map