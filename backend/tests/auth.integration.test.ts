import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("Auth flow integration", () => {
  it("rejects invalid login credentials", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "admin@medverify.local",
      password: "WrongPassword123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(response.body.message).toBe("Invalid credentials");
  });

  it("login -> me -> refresh -> logout -> refresh fails", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent.post("/api/v1/auth/login").send({
      email: "admin@medverify.local",
      password: "Password123!",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data?.token).toBeTypeOf("string");
    expect(loginResponse.body.data?.csrfToken).toBeTypeOf("string");

    const accessToken = loginResponse.body.data.token as string;
    let csrfToken = loginResponse.body.data.csrfToken as string;

    const meResponse = await agent
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data?.email).toBe("admin@medverify.local");

    const refreshResponse = await agent
      .post("/api/v1/auth/refresh")
      .set("x-csrf-token", csrfToken)
      .send({});
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data?.token).toBeTypeOf("string");
    expect(refreshResponse.body.data?.csrfToken).toBeTypeOf("string");
    csrfToken = refreshResponse.body.data.csrfToken as string;

    const logoutResponse = await agent
      .post("/api/v1/auth/logout")
      .set("x-csrf-token", csrfToken)
      .send({});
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const refreshAfterLogoutResponse = await agent.post("/api/v1/auth/refresh").send({});
    expect(refreshAfterLogoutResponse.status).toBe(403);
    expect(refreshAfterLogoutResponse.body.success).toBe(false);
    expect(refreshAfterLogoutResponse.body.code).toBe("FORBIDDEN");
  }, 20000);
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});
