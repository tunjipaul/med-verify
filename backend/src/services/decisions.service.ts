import { DecisionOutcome, EventType, MctStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";

type Actor = { userId: string; role: Role };

function forbidden(message: string): never {
  throw new AppError(message, 403, "FORBIDDEN");
}

async function writeAudit(input: {
  eventType: EventType;
  actorId: string;
  actorRole: Role;
  mctCaseId?: string;
  targetId?: string;
  payloadSummary?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
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

function deriveDraftOutcome(mctCase: { referralTag: boolean; riskScore: number }): DecisionOutcome {
  if (mctCase.riskScore >= 15) return DecisionOutcome.AUTO_REJECT;
  if (mctCase.riskScore >= 10) return DecisionOutcome.ESCALATE;
  if (mctCase.riskScore >= 5 || mctCase.referralTag) return DecisionOutcome.REVIEW_REQUIRED;
  return DecisionOutcome.AUTO_APPROVE;
}

export async function generateDecisionDraft(caseId: string, actor: Actor) {
  const mctCase = await prisma.mctCase.findUnique({
    where: { id: caseId },
    include: { doctor: { select: { userId: true } } },
  });

  if (!mctCase || mctCase.deletedAt) {
    throw new AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
  }

  const allowed =
    actor.role === Role.SYSTEM ||
    actor.role === Role.COORDINATOR ||
    actor.role === Role.ABUJA_ADMIN ||
    actor.role === Role.DG;
  if (!allowed) forbidden("Role is not permitted to generate decision draft");

  const outcome = deriveDraftOutcome({ referralTag: mctCase.referralTag, riskScore: mctCase.riskScore });
  const decision = await prisma.caseDecision.create({
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
    eventType: EventType.DECISION_GENERATED,
    actorId: actor.userId,
    actorRole: actor.role,
    mctCaseId: mctCase.id,
    targetId: decision.id,
    payloadSummary: { outcome },
  });

  return decision;
}

export async function overrideDecision(
  decisionId: string,
  payload: { outcome: DecisionOutcome; reasonText: string },
  actor: Actor,
) {
  const decision = await prisma.caseDecision.findUnique({ where: { id: decisionId } });
  if (!decision) {
    throw new AppError("Decision not found", 404, "NOT_FOUND");
  }

  const allowed =
    actor.role === Role.SYSTEM || actor.role === Role.COORDINATOR || actor.role === Role.ABUJA_ADMIN || actor.role === Role.DG;
  if (!allowed) forbidden("Role is not permitted to override decision");

  const updated = await prisma.caseDecision.update({
    where: { id: decision.id },
    data: {
      outcome: payload.outcome,
      reasonText: payload.reasonText,
      decidedById: actor.userId,
      isOverride: true,
    },
  });

  await writeAudit({
    eventType: EventType.DECISION_OVERRIDDEN,
    actorId: actor.userId,
    actorRole: actor.role,
    mctCaseId: decision.mctCaseId,
    targetId: decision.id,
    payloadSummary: { outcome: payload.outcome },
  });

  return updated;
}

export async function finalizeDecision(decisionId: string, actor: Actor) {
  const decision = await prisma.caseDecision.findUnique({
    where: { id: decisionId },
    include: { mctCase: { select: { status: true } } },
  });
  if (!decision) {
    throw new AppError("Decision not found", 404, "NOT_FOUND");
  }

  const allowed = actor.role === Role.SYSTEM || actor.role === Role.ABUJA_ADMIN || actor.role === Role.DG;
  if (!allowed) forbidden("Role is not permitted to finalize decision");

  if (
    (decision.mctCase.status === MctStatus.ESCALATED || decision.outcome === DecisionOutcome.ESCALATE) &&
    actor.role !== Role.DG &&
    actor.role !== Role.SYSTEM
  ) {
    forbidden("Only DG can finalize escalated cases");
  }

  let nextStatus: MctStatus | null = null;
  if (decision.outcome === DecisionOutcome.APPROVED || decision.outcome === DecisionOutcome.AUTO_APPROVE) {
    nextStatus = MctStatus.APPROVED;
  } else if (decision.outcome === DecisionOutcome.REJECTED || decision.outcome === DecisionOutcome.AUTO_REJECT) {
    nextStatus = MctStatus.REJECTED;
  } else if (decision.outcome === DecisionOutcome.REVIEW_REQUIRED) {
    nextStatus = MctStatus.REVIEW_REQUIRED;
  } else if (decision.outcome === DecisionOutcome.ESCALATE) {
    nextStatus = MctStatus.ESCALATED;
  }

  if (nextStatus) {
    await prisma.mctCase.update({
      where: { id: decision.mctCaseId },
      data: { status: nextStatus, reviewedAt: new Date() },
    });
  }

  await writeAudit({
    eventType: EventType.DECISION_FINALIZED,
    actorId: actor.userId,
    actorRole: actor.role,
    mctCaseId: decision.mctCaseId,
    targetId: decision.id,
    payloadSummary: { outcome: decision.outcome, nextStatus },
  });

  return { decision, nextStatus };
}
