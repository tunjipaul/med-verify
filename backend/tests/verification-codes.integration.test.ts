import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { EventType } from "@prisma/client";
import bcrypt from "bcrypt";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { provisionTestMctCase } from "./helpers/mct-case";

type AuthSession = { token: string };

async function login(email: string): Promise<AuthSession> {
  const response = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "Password123!",
  });
  expect(response.status).toBe(200);
  return { token: response.body.data.token as string };
}

describe("Verification codes integration", () => {
  let corperToken: string;
  let doctorToken: string;
  let adminToken: string;
  let caseId: string;
  let verificationCodeId: string;
  let verificationCodeValue: string;

  beforeAll(async () => {
    const suiteCorperEmail = `verify-suite-corper-${Date.now()}@medverify.local`;
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const suiteUser = await prisma.user.create({
      data: {
        email: suiteCorperEmail,
        passwordHash,
        role: "CORPER",
        firstName: "Verify",
        lastName: "SuiteCorper",
      },
    });
    const suiteNinSuffix = String(Date.now()).padStart(10, "0").slice(-10);
    await prisma.corper.create({
      data: {
        userId: suiteUser.id,
        callUpNumber: `NYSC-VERIFY-${Date.now()}`,
        nin: `9${suiteNinSuffix}`,
        postedState: "FCT",
        currentState: "FCT",
        isMobilized: true,
      },
    });

    corperToken = (await login(suiteCorperEmail)).token;
    doctorToken = (await login("doctor@medverify.local")).token;
    adminToken = (await login("admin@medverify.local")).token;

    const hospital = await prisma.hospital.findFirst({
      where: { approvedRegistryId: "NYSC-HOSP-0001" },
      select: { id: true },
    });
    const doctor = await prisma.doctor.findFirst({
      where: { user: { email: "doctor@medverify.local" } },
      select: { id: true },
    });
    if (!hospital || !doctor) throw new Error("Seeded doctor/hospital missing");

    const created = await provisionTestMctCase({
      corperUserId: suiteUser.id,
      hospitalId: hospital.id,
      doctorId: doctor.id,
      identityMatch: `verify-flow-${Date.now()}`,
    });
    caseId = created.id;
  });

  it("generates verification code for assigned doctor", async () => {
    const response = await request(app)
      .post(`/api/v1/mct-cases/${caseId}/verification-codes`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    verificationCodeId = response.body.data.id as string;
    verificationCodeValue = response.body.data.codeValue as string;
  });

  it("blocks corper from generating verification code", async () => {
    const response = await request(app)
      .post(`/api/v1/mct-cases/${caseId}/verification-codes`)
      .set("Authorization", `Bearer ${corperToken}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("extends verification code as admin", async () => {
    const response = await request(app)
      .post("/api/v1/verification-codes/extend")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        verificationCodeId,
        extensionReason: "Hospital delay",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.extensionCount).toBe(1);
  });

  it("rejects second extension (max one extension)", async () => {
    const response = await request(app)
      .post("/api/v1/verification-codes/extend")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        verificationCodeId,
        extensionReason: "Second extension should fail",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("validates generated verification code", async () => {
    const response = await request(app)
      .post("/api/v1/verification-codes/validate")
      .set("Authorization", `Bearer ${corperToken}`)
      .send({ codeValue: verificationCodeValue });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.usedAt).toBeTruthy();
  });

  it("blocks non-corper from validating code", async () => {
    const generated = await request(app)
      .post(`/api/v1/mct-cases/${caseId}/verification-codes`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({});
    expect(generated.status).toBe(201);

    const response = await request(app)
      .post("/api/v1/verification-codes/validate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ codeValue: generated.body.data.codeValue });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("rejects reuse of used verification code", async () => {
    const response = await request(app)
      .post("/api/v1/verification-codes/validate")
      .set("Authorization", `Bearer ${corperToken}`)
      .send({ codeValue: verificationCodeValue });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("writes verification audit logs", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { mctCaseId: caseId },
      select: { eventType: true },
    });
    const events = logs.map((l) => l.eventType);
    expect(events).toContain(EventType.VERIFICATION_CODE_GENERATED);
    expect(events).toContain(EventType.VERIFICATION_CODE_EXTENDED);
    expect(events).toContain(EventType.VERIFICATION_CODE_VALIDATED);
    expect(events).toContain(EventType.VERIFICATION_CODE_FAILED);
  });
});
