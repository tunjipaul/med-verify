import { EventType } from "@prisma/client";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { closeActiveMctCasesForCorperUser, getCorperUserIdByEmail, provisionTestMctCase } from "./helpers/mct-case";

async function login(email: string): Promise<string> {
  const response = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "Password123!",
  });
  expect(response.status).toBe(200);
  return response.body.data.token as string;
}

describe("Audit integrity integration", () => {
  let corperToken: string;
  let doctorToken: string;
  let adminToken: string;
  let caseId: string;
  let verificationCodeId: string;
  let verificationCodeValue: string;
  let decisionId: string;

  beforeAll(async () => {
    corperToken = await login("corper@medverify.local");
    doctorToken = await login("doctor@medverify.local");
    adminToken = await login("admin@medverify.local");

    const hospital = await prisma.hospital.findFirst({
      where: { approvedRegistryId: "NYSC-HOSP-0001" },
      select: { id: true },
    });
    const doctor = await prisma.doctor.findFirst({
      where: { user: { email: "doctor@medverify.local" } },
      select: { id: true },
    });
    if (!hospital || !doctor) throw new Error("Seeded hospital/doctor missing");

    const corperUserId = await getCorperUserIdByEmail("corper@medverify.local");
    await closeActiveMctCasesForCorperUser(corperUserId);

    const created = await provisionTestMctCase({
      corperUserId,
      hospitalId: hospital.id,
      doctorId: doctor.id,
      identityMatch: `audit-integrity-${Date.now()}`,
    });
    caseId = created.id;
  });

  it("writes LOGIN_SUCCESS and LOGIN_FAILED audit events", async () => {
    const beforeSuccess = await prisma.auditLog.count({
      where: { eventType: EventType.LOGIN_SUCCESS },
    });
    const beforeFailed = await prisma.auditLog.count({
      where: { eventType: EventType.LOGIN_FAILED },
    });

    const okLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin@medverify.local",
      password: "Password123!",
    });
    expect(okLogin.status).toBe(200);

    const badLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin@medverify.local",
      password: "WrongPassword123!",
    });
    expect(badLogin.status).toBe(401);

    const afterSuccess = await prisma.auditLog.count({
      where: { eventType: EventType.LOGIN_SUCCESS },
    });
    const afterFailed = await prisma.auditLog.count({
      where: { eventType: EventType.LOGIN_FAILED },
    });

    expect(afterSuccess).toBeGreaterThan(beforeSuccess);
    expect(afterFailed).toBeGreaterThan(beforeFailed);
  });

  it("writes MCT transition attempt/success/failed events", async () => {
    const transitionOk = await request(app)
      .patch(`/api/v1/mct-cases/${caseId}/status`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ nextStatus: "UNDER_REVIEW" });
    expect(transitionOk.status).toBe(200);

    const transitionDenied = await request(app)
      .patch(`/api/v1/mct-cases/${caseId}/status`)
      .set("Authorization", `Bearer ${corperToken}`)
      .send({ nextStatus: "REVIEW_REQUIRED" });
    expect(transitionDenied.status).toBe(403);

    const events = await prisma.auditLog.findMany({
      where: { mctCaseId: caseId },
      select: { eventType: true },
    });
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain(EventType.MCT_TRANSITION_ATTEMPT);
    expect(eventTypes).toContain(EventType.MCT_TRANSITION_SUCCESS);
    expect(eventTypes).toContain(EventType.MCT_TRANSITION_FAILED);
  });

  it("writes verification and decision audit events for privileged actions", async () => {
    const generated = await request(app)
      .post(`/api/v1/mct-cases/${caseId}/verification-codes`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({});
    expect(generated.status).toBe(201);
    verificationCodeId = generated.body.data.id as string;
    verificationCodeValue = generated.body.data.codeValue as string;

    const extended = await request(app)
      .post("/api/v1/verification-codes/extend")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        verificationCodeId,
        extensionReason: "Audit integrity extension",
      });
    expect(extended.status).toBe(200);

    const validated = await request(app)
      .post("/api/v1/verification-codes/validate")
      .set("Authorization", `Bearer ${corperToken}`)
      .send({ codeValue: verificationCodeValue });
    expect(validated.status).toBe(200);

    const reused = await request(app)
      .post("/api/v1/verification-codes/validate")
      .set("Authorization", `Bearer ${corperToken}`)
      .send({ codeValue: verificationCodeValue });
    expect(reused.status).toBe(400);

    const draft = await request(app)
      .post(`/api/v1/decisions/mct-cases/${caseId}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(draft.status).toBe(201);
    decisionId = draft.body.data.id as string;

    const override = await request(app)
      .patch(`/api/v1/decisions/${decisionId}/override`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ outcome: "REVIEW_REQUIRED", reasonText: "Audit test override" });
    expect(override.status).toBe(200);

    const finalize = await request(app)
      .post(`/api/v1/decisions/${decisionId}/finalize`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(finalize.status).toBe(200);

    const events = await prisma.auditLog.findMany({
      where: { mctCaseId: caseId },
      select: { eventType: true },
    });
    const eventTypes = events.map((e) => e.eventType);

    expect(eventTypes).toContain(EventType.VERIFICATION_CODE_GENERATED);
    expect(eventTypes).toContain(EventType.VERIFICATION_CODE_EXTENDED);
    expect(eventTypes).toContain(EventType.VERIFICATION_CODE_VALIDATED);
    expect(eventTypes).toContain(EventType.VERIFICATION_CODE_FAILED);
    expect(eventTypes).toContain(EventType.DECISION_GENERATED);
    expect(eventTypes).toContain(EventType.DECISION_OVERRIDDEN);
    expect(eventTypes).toContain(EventType.DECISION_FINALIZED);
  });
});
