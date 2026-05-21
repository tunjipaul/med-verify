import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { EventType } from "@prisma/client";
import bcrypt from "bcrypt";

type AuthSession = {
  token: string;
};

async function login(email: string, password = "Password123!"): Promise<AuthSession> {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  return { token: response.body.data.token as string };
}

describe("MCT cases integration", () => {
  let corperAuth: AuthSession;
  let doctorAuth: AuthSession;
  let adminAuth: AuthSession;
  let hospitalId: string;
  let doctorId: string;
  let foreignCaseId: string;
  let assignedCaseId: string;
  let suiteCorperEmail: string;

  beforeAll(async () => {
    suiteCorperEmail = `mct-suite-corper-${Date.now()}@medverify.local`;
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const suiteUser = await prisma.user.create({
      data: {
        email: suiteCorperEmail,
        passwordHash,
        role: "CORPER",
        firstName: "Mct",
        lastName: "SuiteCorper",
      },
    });
    const suiteNinSuffix = String(Date.now()).padStart(10, "0").slice(-10);
    await prisma.corper.create({
      data: {
        userId: suiteUser.id,
        callUpNumber: `NYSC-MCT-${Date.now()}`,
        nin: `9${suiteNinSuffix}`,
        postedState: "FCT",
        currentState: "FCT",
        isMobilized: true,
      },
    });

    corperAuth = await login(suiteCorperEmail);
    doctorAuth = await login("doctor@medverify.local");
    adminAuth = await login("admin@medverify.local");

    const hospital = await prisma.hospital.findFirst({
      where: { approvedRegistryId: "NYSC-HOSP-0001" },
      select: { id: true },
    });
    const doctor = await prisma.doctor.findFirst({
      where: { user: { email: "doctor@medverify.local" } },
      select: { id: true },
    });

    if (!hospital || !doctor) {
      throw new Error("Seeded doctor/hospital records not found");
    }

    hospitalId = hospital.id;
    doctorId = doctor.id;

    const foreignEmail = `other-corper-${Date.now()}@medverify.local`;
    const foreignPasswordHash = await bcrypt.hash("Password123!", 10);
    const foreignUser = await prisma.user.create({
      data: {
        email: foreignEmail,
        passwordHash: foreignPasswordHash,
        role: "CORPER",
        firstName: "Other",
        lastName: "Corper",
      },
    });
    const foreignNinSuffix = String(Date.now() + 1).padStart(10, "0").slice(-10);
    const foreignCorper = await prisma.corper.create({
      data: {
        userId: foreignUser.id,
        callUpNumber: `NYSC-OTHER-${Date.now()}`,
        nin: `9${foreignNinSuffix}`,
        postedState: "Lagos",
        currentState: "Lagos",
        isMobilized: true,
      },
    });
    const foreignCase = await prisma.mctCase.create({
      data: {
        corperId: foreignCorper.id,
        identityMatch: `foreign-case-${Date.now()}`,
        status: "CREATED",
      },
    });
    foreignCaseId = foreignCase.id;
  });

  it("allows CORPER to create doctor-assigned MCT case", async () => {
    const response = await request(app)
      .post("/api/v1/mct-cases")
      .set("Authorization", `Bearer ${corperAuth.token}`)
      .send({
        hospitalId,
        doctorId,
        identityMatch: `corper-case-${Date.now()}`,
        referralTag: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("CREATED");
    assignedCaseId = response.body.data.id as string;
    expect(typeof assignedCaseId).toBe("string");
    expect(assignedCaseId.length).toBeGreaterThan(0);
  });

  it("blocks non-CORPER from creating MCT case", async () => {
    const response = await request(app)
      .post("/api/v1/mct-cases")
      .set("Authorization", `Bearer ${adminAuth.token}`)
      .send({
        identityMatch: "admin-should-not-create",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("rejects second active case for same corper", async () => {
    const response = await request(app)
      .post("/api/v1/mct-cases")
      .set("Authorization", `Bearer ${corperAuth.token}`)
      .send({
        hospitalId,
        doctorId,
        identityMatch: `duplicate-active-case-${Date.now()}`,
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("returns only doctor-assigned cases for DOCTOR list", async () => {
    const response = await request(app)
      .get("/api/v1/mct-cases")
      .set("Authorization", `Bearer ${doctorAuth.token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const ids = (response.body.data.items as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(assignedCaseId);
    expect(ids).not.toContain(foreignCaseId);
  });

  it("returns assigned and foreign cases for admin list", async () => {
    const response = await request(app)
      .get("/api/v1/mct-cases")
      .set("Authorization", `Bearer ${adminAuth.token}`);

    expect(response.status).toBe(200);
    const ids = (response.body.data.items as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(assignedCaseId);
    expect(ids).toContain(foreignCaseId);
  });

  it("enforces get-by-id access control", async () => {
    const doctorDenied = await request(app)
      .get(`/api/v1/mct-cases/${foreignCaseId}`)
      .set("Authorization", `Bearer ${doctorAuth.token}`);
    expect(doctorDenied.status).toBe(403);

    const doctorAllowed = await request(app)
      .get(`/api/v1/mct-cases/${assignedCaseId}`)
      .set("Authorization", `Bearer ${doctorAuth.token}`);
    expect(doctorAllowed.status).toBe(200);
    expect(doctorAllowed.body.data.id).toBe(assignedCaseId);
  });

  it("allows assigned DOCTOR to transition CREATED -> UNDER_REVIEW and writes audit logs", async () => {
    const response = await request(app)
      .patch(`/api/v1/mct-cases/${assignedCaseId}/status`)
      .set("Authorization", `Bearer ${doctorAuth.token}`)
      .send({ nextStatus: "UNDER_REVIEW" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("UNDER_REVIEW");

    const successLogs = await prisma.auditLog.findMany({
      where: {
        mctCaseId: assignedCaseId,
        eventType: EventType.MCT_TRANSITION_SUCCESS,
      },
    });
    expect(successLogs.length).toBeGreaterThan(0);
  });

  it("blocks CORPER from transition and records failed audit", async () => {
    const response = await request(app)
      .patch(`/api/v1/mct-cases/${assignedCaseId}/status`)
      .set("Authorization", `Bearer ${corperAuth.token}`)
      .send({ nextStatus: "REVIEW_REQUIRED" });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);

    const failedLogs = await prisma.auditLog.findMany({
      where: {
        mctCaseId: assignedCaseId,
        eventType: EventType.MCT_TRANSITION_FAILED,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(failedLogs.length).toBeGreaterThan(0);
  });

  it("rejects invalid status jump with 400", async () => {
    const response = await request(app)
      .patch(`/api/v1/mct-cases/${assignedCaseId}/status`)
      .set("Authorization", `Bearer ${doctorAuth.token}`)
      .send({ nextStatus: "CLOSED" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("supports status filter + pagination metadata", async () => {
    const response = await request(app)
      .get("/api/v1/mct-cases?status=UNDER_REVIEW&page=1&limit=1")
      .set("Authorization", `Bearer ${adminAuth.token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.meta.page).toBe(1);
    expect(response.body.data.meta.limit).toBe(1);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items.length).toBeLessThanOrEqual(1);
    if (response.body.data.items.length > 0) {
      expect(response.body.data.items[0].status).toBe("UNDER_REVIEW");
    }
  });
});
