import { EventType } from "@prisma/client";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

async function login(email: string): Promise<string> {
  const response = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "Password123!",
  });
  expect(response.status).toBe(200);
  return response.body.data.token as string;
}

describe("Decisions integration", () => {
  let corperToken: string;
  let doctorToken: string;
  let adminToken: string;
  let dgToken: string;
  let caseId: string;
  let decisionId: string;

  beforeAll(async () => {
    corperToken = await login("corper@medverify.local");
    doctorToken = await login("doctor@medverify.local");
    adminToken = await login("admin@medverify.local");
    dgToken = await login("dg@medverify.local");

    const hospital = await prisma.hospital.findFirst({
      where: { approvedRegistryId: "NYSC-HOSP-0001" },
      select: { id: true },
    });
    const doctor = await prisma.doctor.findFirst({
      where: { user: { email: "doctor@medverify.local" } },
      select: { id: true },
    });
    if (!hospital || !doctor) throw new Error("Seeded hospital/doctor not found");

    const seededCorper = await prisma.corper.findFirst({
      where: { user: { email: "corper@medverify.local" } },
      select: { id: true },
    });
    if (seededCorper) {
      await prisma.mctCase.updateMany({
        where: {
          corperId: seededCorper.id,
          deletedAt: null,
          status: { notIn: ["APPROVED", "REJECTED", "CLOSED"] },
        },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }

    const created = await request(app)
      .post("/api/v1/mct-cases")
      .set("Authorization", `Bearer ${corperToken}`)
      .send({
        hospitalId: hospital.id,
        doctorId: doctor.id,
        identityMatch: `decision-case-${Date.now()}`,
        referralTag: true,
      });
    expect(created.status).toBe(201);
    caseId = created.body.data.id as string;
  });

  it("blocks doctor from generating draft decision", async () => {
    const response = await request(app)
      .post(`/api/v1/decisions/mct-cases/${caseId}/generate`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("generates draft decision as admin", async () => {
    const response = await request(app)
      .post(`/api/v1/decisions/mct-cases/${caseId}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    decisionId = response.body.data.id as string;
  });

  it("blocks corper from overriding decision", async () => {
    const response = await request(app)
      .patch(`/api/v1/decisions/${decisionId}/override`)
      .set("Authorization", `Bearer ${corperToken}`)
      .send({ outcome: "APPROVED", reasonText: "not allowed" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("allows admin override but blocks admin finalize for escalated decision", async () => {
    const override = await request(app)
      .patch(`/api/v1/decisions/${decisionId}/override`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ outcome: "ESCALATE", reasonText: "Escalating for DG final decision" });

    expect(override.status).toBe(200);
    expect(override.body.data.isOverride).toBe(true);

    const finalize = await request(app)
      .post(`/api/v1/decisions/${decisionId}/finalize`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(finalize.status).toBe(403);
    expect(finalize.body.code).toBe("FORBIDDEN");
  });

  it("allows DG to finalize escalated decision", async () => {
    const finalize = await request(app)
      .post(`/api/v1/decisions/${decisionId}/finalize`)
      .set("Authorization", `Bearer ${dgToken}`)
      .send({});

    expect(finalize.status).toBe(200);
    expect(finalize.body.success).toBe(true);
    expect(finalize.body.data.nextStatus).toBe("ESCALATED");
  });

  it("writes decision audit logs", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { mctCaseId: caseId },
      select: { eventType: true },
    });
    const events = logs.map((l) => l.eventType);
    expect(events).toContain(EventType.DECISION_GENERATED);
    expect(events).toContain(EventType.DECISION_OVERRIDDEN);
    expect(events).toContain(EventType.DECISION_FINALIZED);
  });
});
