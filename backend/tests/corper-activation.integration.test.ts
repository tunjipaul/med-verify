import request from "supertest";
import bcrypt from "bcrypt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("Corper activation integration", () => {
  const callUpNumber = `NYSC-LAG-2026-999901`;
  const nin = "29999999901";
  const phone = "08089999901";
  let userEmail: string;

  beforeAll(async () => {
    userEmail = `activation-test-${Date.now()}@medverify.local`;
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        role: "CORPER",
        firstName: "Activation",
        lastName: "Test",
      },
    });

    await prisma.corper.upsert({
      where: { callUpNumber },
      update: {
        userId: user.id,
        nin,
        phone,
        postedState: "Lagos",
        currentState: "Lagos",
        isMobilized: true,
        deletedAt: null,
      },
      create: {
        userId: user.id,
        callUpNumber,
        nin,
        phone,
        postedState: "Lagos",
        currentState: "Lagos",
        isMobilized: true,
      },
    });
  });

  afterAll(async () => {
    await redis.del(`corper:activation:otp:${callUpNumber}`);
    await prisma.corper.deleteMany({ where: { callUpNumber } });
    await prisma.user.deleteMany({ where: { email: userEmail } });
  });

  it("requests OTP with slash-form call-up and returns devOtp in test mode", async () => {
    const response = await request(app).post("/api/v1/corper/activation/request-otp").send({
      callUpNumber: "NYSC/LAG/2026/999901",
      nin,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.devOtp).toMatch(/^\d{6}$/);
    expect(response.body.data?.maskedPhone).toBe("***9901");
  });

  it("rejects wrong NIN", async () => {
    const response = await request(app).post("/api/v1/corper/activation/request-otp").send({
      callUpNumber,
      nin: "11111111111",
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("ACTIVATION_IDENTITY_MISMATCH");
  });

  it("verifies OTP and returns access token", async () => {
    const requestOtp = await request(app).post("/api/v1/corper/activation/request-otp").send({
      callUpNumber,
      nin,
    });
    const devOtp = requestOtp.body.data.devOtp as string;

    const verify = await request(app).post("/api/v1/corper/activation/verify-otp").send({
      callUpNumber,
      otp: devOtp,
    });

    expect(verify.status).toBe(200);
    expect(verify.body.data?.token).toBeTypeOf("string");
    expect(verify.body.data?.user?.role).toBe("CORPER");

    const me = await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${verify.body.data.token as string}`);

    expect(me.status).toBe(200);
    expect(me.body.data?.email).toBe(userEmail);
  });
});
