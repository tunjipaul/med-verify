import { bool, cleanEnv, num, str } from "envalid";

const validatedEnv = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  PORT: num({ default: 5000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  REFRESH_JWT_SECRET: str(),
  ACCESS_TOKEN_EXPIRES_IN: str({ default: "15m" }),
  REFRESH_TOKEN_EXPIRES_IN: str({ default: "7d" }),
  REDIS_URL: str(),
  ALLOWED_ORIGINS: str({ default: "http://localhost:3000,http://localhost:5173" }),
  VERIFICATION_CODE_SECRET: str(),
  ALLOW_TEST_CODE_PLAINTEXT: bool({ default: false }),
});

if (validatedEnv.NODE_ENV === "production") {
  if (validatedEnv.JWT_SECRET.length < 24) {
    throw new Error("JWT_SECRET is too short for production. Use at least 24 characters.");
  }
  if (validatedEnv.REFRESH_JWT_SECRET.length < 24) {
    throw new Error("REFRESH_JWT_SECRET is too short for production. Use at least 24 characters.");
  }
  if (validatedEnv.REFRESH_JWT_SECRET === validatedEnv.JWT_SECRET) {
    throw new Error("REFRESH_JWT_SECRET must be different from JWT_SECRET in production.");
  }

  const origins = validatedEnv.ALLOWED_ORIGINS.split(",").map((v) => v.trim());
  if (origins.some((origin) => origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    throw new Error("ALLOWED_ORIGINS contains localhost values in production.");
  }
}

if (validatedEnv.REFRESH_JWT_SECRET === validatedEnv.JWT_SECRET) {
  throw new Error("REFRESH_JWT_SECRET must be different from JWT_SECRET.");
}

export const env = validatedEnv;
