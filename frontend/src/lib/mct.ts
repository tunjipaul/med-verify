import { api } from "./api";

export type MctStatus =
  | "CREATED"
  | "UNDER_REVIEW"
  | "REVIEW_REQUIRED"
  | "ESCALATED"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export type MctCaseSummary = {
  id: string;
  corperId: string;
  hospitalId: string | null;
  doctorId: string | null;
  status: MctStatus;
  riskScore: number;
  referralTag: boolean;
  identityMatch: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListMctCasesResponse = {
  success: boolean;
  data: {
    items: MctCaseSummary[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
};

type ValidateVerificationCodeResponse = {
  success: boolean;
  message: string;
  data: {
    mctCaseId: string;
    status: MctStatus;
  };
};

export async function listCorperMctCases() {
  const { data } = await api.get<ListMctCasesResponse>("/mct-cases", {
    params: { limit: 10, page: 1 },
  });
  return data.data;
}

export async function validateVerificationCode(codeValue: string) {
  const { data } = await api.post<ValidateVerificationCodeResponse>("/verification-codes/validate", {
    codeValue: codeValue.trim(),
  });
  return data;
}

export const ACTIVE_MCT_STATUSES: MctStatus[] = [
  "CREATED",
  "UNDER_REVIEW",
  "REVIEW_REQUIRED",
  "ESCALATED",
  "APPROVED",
  "REJECTED",
];

export function pickActiveCase(items: MctCaseSummary[]): MctCaseSummary | null {
  return items.find((item) => ACTIVE_MCT_STATUSES.includes(item.status)) ?? items[0] ?? null;
}
