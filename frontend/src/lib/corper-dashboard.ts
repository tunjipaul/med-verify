import type { MctCaseSummary, MctStatus } from "./mct";

export type WorkflowStepId = "identity" | "hospital" | "verification" | "review";

export type WorkflowStepState = "completed" | "active" | "pending";

export type WorkflowStep = {
  id: WorkflowStepId;
  order: number;
  title: string;
  subtitle: string;
  state: WorkflowStepState;
};

const STATUS_LABELS: Record<MctStatus, string> = {
  CREATED: "Case opened",
  UNDER_REVIEW: "Under review",
  REVIEW_REQUIRED: "Review required",
  ESCALATED: "Escalated to NYSC HQ",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

const STATUS_TONE: Record<MctStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  CREATED: "neutral",
  UNDER_REVIEW: "info",
  REVIEW_REQUIRED: "warning",
  ESCALATED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CLOSED: "neutral",
};

export function getStatusLabel(status: MctStatus): string {
  return STATUS_LABELS[status];
}

export function getStatusTone(status: MctStatus): (typeof STATUS_TONE)[MctStatus] {
  return STATUS_TONE[status];
}

export function buildWorkflowSteps(activeCase: MctCaseSummary | null): WorkflowStep[] {
  const hasCase = Boolean(activeCase);
  const hasHospital = Boolean(activeCase?.hospitalId);
  const pastCreated =
    activeCase != null &&
    (activeCase.status !== "CREATED" || Boolean(activeCase.submittedAt));

  const verificationDone =
    activeCase != null &&
    ["UNDER_REVIEW", "REVIEW_REQUIRED", "ESCALATED", "APPROVED", "REJECTED", "CLOSED"].includes(
      activeCase.status,
    );

  const reviewActive =
    activeCase != null &&
    ["UNDER_REVIEW", "REVIEW_REQUIRED", "ESCALATED", "APPROVED", "REJECTED"].includes(activeCase.status);

  const reviewDone = activeCase?.status === "APPROVED" || activeCase?.status === "REJECTED" || activeCase?.status === "CLOSED";

  function hospitalState(): WorkflowStepState {
    if (!hasCase) return "pending";
    if (hasHospital || pastCreated) return "completed";
    return "active";
  }

  function verificationState(): WorkflowStepState {
    if (!hasCase) return "pending";
    if (verificationDone) return "completed";
    if (hasHospital || activeCase?.status === "CREATED") return "active";
    return "pending";
  }

  function reviewState(): WorkflowStepState {
    if (!hasCase) return "pending";
    if (reviewDone) return "completed";
    if (reviewActive) return "active";
    return "pending";
  }

  return [
    {
      id: "identity",
      order: 1,
      title: "Identity Verification",
      subtitle: "Completed",
      state: "completed",
    },
    {
      id: "hospital",
      order: 2,
      title: "Approved Hospital",
      subtitle: hasHospital ? "Hospital linked" : hasCase ? "Select a facility" : "Pending",
      state: hospitalState(),
    },
    {
      id: "verification",
      order: 3,
      title: "Verification Code",
      subtitle: verificationDone ? "Code validated" : "Enter MV- code from doctor",
      state: verificationState(),
    },
    {
      id: "review",
      order: 4,
      title: "Case Decision",
      subtitle: activeCase ? getStatusLabel(activeCase.status) : "Awaiting submission",
      state: reviewState(),
    },
  ];
}

export function formatCaseRef(caseId: string): string {
  return caseId.slice(0, 8).toUpperCase();
}

export function displayCorperName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  const local = user.email.split("@")[0]?.replace(/\./g, " ");
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : "Corper";
}
