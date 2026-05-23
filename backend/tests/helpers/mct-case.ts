import { MctStatus } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
import { createMctCase } from "../../src/services/mct-cases.service";

/** Provisions an MCT case the way SYSTEM would (not via public HTTP). */
export async function provisionTestMctCase(input: {
  corperUserId: string;
  hospitalId?: string;
  doctorId?: string;
  referralTag?: boolean;
  identityMatch?: string;
}) {
  return createMctCase({
    corperUserId: input.corperUserId,
    hospitalId: input.hospitalId,
    doctorId: input.doctorId,
    referralTag: input.referralTag,
    identityMatch: input.identityMatch,
  });
}

export async function closeActiveMctCasesForCorperUser(corperUserId: string) {
  const corper = await prisma.corper.findUnique({
    where: { userId: corperUserId },
    select: { id: true },
  });
  if (!corper) return;

  await prisma.mctCase.updateMany({
    where: {
      corperId: corper.id,
      deletedAt: null,
      status: { notIn: [MctStatus.APPROVED, MctStatus.REJECTED, MctStatus.CLOSED] },
    },
    data: { status: MctStatus.CLOSED, closedAt: new Date() },
  });
}

export async function getCorperUserIdByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new Error(`User not found: ${email}`);
  return user.id;
}
