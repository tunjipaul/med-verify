import { EventType, MctStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";

type CreateMctCaseInput = {
  corperUserId: string;
  hospitalId?: string;
  doctorId?: string;
  referralTag?: boolean;
  identityMatch?: string;
};

type ListMctCasesInput = {
  role: Role;
  userId: string;
  status?: MctStatus;
  page: number;
  limit: number;
};

type TransitionInput = {
  caseId: string;
  nextStatus: MctStatus;
  actor: {
    userId: string;
    role: Role;
  };
};

/** Corper-facing MCT payload — no risk, referral, or internal identity-match signals. */
export function toCorperMctCaseView<T extends Record<string, unknown>>(caseRow: T): Omit<T, "riskScore" | "referralTag" | "identityMatch"> {
  const { riskScore: _riskScore, referralTag: _referralTag, identityMatch: _identityMatch, ...safe } = caseRow;
  return safe;
}

function isPrivilegedRole(role: Role): boolean {
  return (
    role === Role.COORDINATOR ||
    role === Role.ABUJA_ADMIN ||
    role === Role.DG ||
    role === Role.SYSTEM
  );
}

function unauthorized(message: string): never {
  throw new AppError(message, 403, "FORBIDDEN");
}

const allowedTransitions: Record<MctStatus, MctStatus[]> = {
  [MctStatus.CREATED]: [MctStatus.UNDER_REVIEW],
  [MctStatus.UNDER_REVIEW]: [MctStatus.REVIEW_REQUIRED, MctStatus.ESCALATED, MctStatus.APPROVED, MctStatus.REJECTED],
  [MctStatus.REVIEW_REQUIRED]: [MctStatus.ESCALATED, MctStatus.APPROVED, MctStatus.REJECTED],
  [MctStatus.ESCALATED]: [MctStatus.APPROVED, MctStatus.REJECTED],
  [MctStatus.APPROVED]: [MctStatus.CLOSED],
  [MctStatus.REJECTED]: [MctStatus.CLOSED],
  [MctStatus.CLOSED]: [],
};

function canRoleTransition(role: Role, from: MctStatus, to: MctStatus): boolean {
  if (role === Role.SYSTEM) {
    return true;
  }

  if (role === Role.DOCTOR) {
    return from === MctStatus.CREATED && to === MctStatus.UNDER_REVIEW;
  }

  if (role === Role.COORDINATOR) {
    return (
      from === MctStatus.REVIEW_REQUIRED &&
      (to === MctStatus.ESCALATED || to === MctStatus.APPROVED || to === MctStatus.REJECTED)
    );
  }

  if (role === Role.ABUJA_ADMIN) {
    return (
      (from === MctStatus.UNDER_REVIEW &&
        (to === MctStatus.REVIEW_REQUIRED || to === MctStatus.ESCALATED || to === MctStatus.APPROVED || to === MctStatus.REJECTED)) ||
      (from === MctStatus.REVIEW_REQUIRED &&
        (to === MctStatus.ESCALATED || to === MctStatus.APPROVED || to === MctStatus.REJECTED))
    );
  }

  if (role === Role.DG) {
    return from === MctStatus.ESCALATED && (to === MctStatus.APPROVED || to === MctStatus.REJECTED);
  }

  return false;
}

async function logTransitionEvent(input: {
  eventType: EventType;
  actorId: string;
  actorRole: Role;
  mctCaseId?: string;
  payloadSummary?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      eventType: input.eventType,
      actorId: input.actorId,
      actorRole: input.actorRole,
      mctCaseId: input.mctCaseId,
      payloadSummary: input.payloadSummary,
    },
  });
}

export async function createMctCase(input: CreateMctCaseInput) {
  const corper = await prisma.corper.findUnique({
    where: { userId: input.corperUserId },
  });

  if (!corper) {
    throw new AppError("Corper profile not found", 404, "MCT_CORPER_PROFILE_NOT_FOUND");
  }

  let created;
  try {
    created = await prisma.mctCase.create({
      data: {
        corperId: corper.id,
        hospitalId: input.hospitalId,
        doctorId: input.doctorId,
        referralTag: input.referralTag ?? false,
        identityMatch: input.identityMatch,
        status: MctStatus.CREATED,
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
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      throw new AppError("Corper already has an active MCT case", 409, "MCT_ACTIVE_CASE_EXISTS");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      eventType: EventType.MCT_CREATED,
      actorRole: Role.SYSTEM,
      mctCaseId: created.id,
      payloadSummary: {
        corperUserId: input.corperUserId,
        hospitalId: input.hospitalId ?? null,
        doctorId: input.doctorId ?? null,
        referralTag: input.referralTag ?? false,
      },
    },
  });

  return created;
}

export async function listMctCases(input: ListMctCasesInput) {
  const skip = (input.page - 1) * input.limit;
  const pagination = {
    skip,
    take: input.limit,
    orderBy: { createdAt: "desc" as const },
  };

  if (input.role === Role.CORPER) {
    const corper = await prisma.corper.findUnique({ where: { userId: input.userId } });
    if (!corper) {
      throw new AppError("Corper profile not found", 404, "MCT_CORPER_PROFILE_NOT_FOUND");
    }

    const where = { corperId: corper.id, deletedAt: null as null, status: input.status };
    const [items, total] = await prisma.$transaction([
      prisma.mctCase.findMany({ where, ...pagination }),
      prisma.mctCase.count({ where }),
    ]);
    return { items: items.map((row) => toCorperMctCaseView(row)), total };
  }

  if (input.role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({ where: { userId: input.userId } });
    if (!doctor) {
      throw new AppError("Doctor profile not found", 404, "MCT_DOCTOR_PROFILE_NOT_FOUND");
    }

    const where = { doctorId: doctor.id, deletedAt: null as null, status: input.status };
    const [items, total] = await prisma.$transaction([
      prisma.mctCase.findMany({ where, ...pagination }),
      prisma.mctCase.count({ where }),
    ]);
    return { items, total };
  }

  if (isPrivilegedRole(input.role)) {
    const where = { deletedAt: null as null, status: input.status };
    const [items, total] = await prisma.$transaction([
      prisma.mctCase.findMany({ where, ...pagination }),
      prisma.mctCase.count({ where }),
    ]);
    return { items, total };
  }

  unauthorized("Role is not permitted to view MCT cases");
}

export async function getMctCaseById(caseId: string, role: Role, userId: string) {
  const mctCase = await prisma.mctCase.findUnique({
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
    throw new AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
  }

  if (isPrivilegedRole(role)) {
    return mctCase;
  }

  if (role === Role.CORPER && mctCase.corper.userId === userId) {
    return toCorperMctCaseView(mctCase);
  }

  if (role === Role.DOCTOR && mctCase.doctor?.userId === userId) {
    return mctCase;
  }

  unauthorized("You do not have access to this MCT case");
}

export async function transitionMctCaseStatus(input: TransitionInput) {
  await logTransitionEvent({
    eventType: EventType.MCT_TRANSITION_ATTEMPT,
    actorId: input.actor.userId,
    actorRole: input.actor.role,
    mctCaseId: input.caseId,
    payloadSummary: { nextStatus: input.nextStatus },
  });

  const mctCase = await prisma.mctCase.findUnique({
    where: { id: input.caseId },
    include: {
      corper: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  if (!mctCase || mctCase.deletedAt) {
    await logTransitionEvent({
      eventType: EventType.MCT_TRANSITION_FAILED,
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      mctCaseId: input.caseId,
      payloadSummary: { reason: "CASE_NOT_FOUND", nextStatus: input.nextStatus },
    });
    throw new AppError("MCT case not found", 404, "MCT_CASE_NOT_FOUND");
  }

  const fromStatus = mctCase.status;
  const validNext = allowedTransitions[fromStatus];
  if (!validNext.includes(input.nextStatus)) {
    await logTransitionEvent({
      eventType: EventType.MCT_TRANSITION_FAILED,
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      mctCaseId: input.caseId,
      payloadSummary: { reason: "INVALID_TRANSITION", fromStatus, nextStatus: input.nextStatus },
    });
    throw new AppError(
      `Invalid transition from ${fromStatus} to ${input.nextStatus}`,
      400,
      "MCT_TRANSITION_INVALID",
    );
  }

  if (input.actor.role === Role.DOCTOR && mctCase.doctor?.userId !== input.actor.userId) {
    await logTransitionEvent({
      eventType: EventType.MCT_TRANSITION_FAILED,
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      mctCaseId: input.caseId,
      payloadSummary: { reason: "DOCTOR_NOT_ASSIGNED", fromStatus, nextStatus: input.nextStatus },
    });
    unauthorized("Doctor is not assigned to this case");
  }

  if (!canRoleTransition(input.actor.role, fromStatus, input.nextStatus)) {
    await logTransitionEvent({
      eventType: EventType.MCT_TRANSITION_FAILED,
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      mctCaseId: input.caseId,
      payloadSummary: { reason: "ROLE_NOT_ALLOWED", fromStatus, nextStatus: input.nextStatus },
    });
    unauthorized("Role is not permitted for this transition");
  }

  const updated = await prisma.mctCase.update({
    where: { id: input.caseId },
    data: {
      status: input.nextStatus,
      reviewedAt:
        input.nextStatus === MctStatus.UNDER_REVIEW ||
        input.nextStatus === MctStatus.APPROVED ||
        input.nextStatus === MctStatus.REJECTED
          ? new Date()
          : undefined,
      closedAt: input.nextStatus === MctStatus.CLOSED ? new Date() : undefined,
    },
  });

  await logTransitionEvent({
    eventType: EventType.MCT_TRANSITION_SUCCESS,
    actorId: input.actor.userId,
    actorRole: input.actor.role,
    mctCaseId: input.caseId,
    payloadSummary: { fromStatus, nextStatus: input.nextStatus },
  });

  return updated;
}
