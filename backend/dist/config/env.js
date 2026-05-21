"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const envalid_1 = require("envalid");
const validatedEnv = (0, envalid_1.cleanEnv)(process.env, {
    NODE_ENV: (0, envalid_1.str)({ choices: ["development", "test", "production"], default: "development" }),
    PORT: (0, envalid_1.num)({ default: 5000 }),
    DATABASE_URL: (0, envalid_1.str)(),
    JWT_SECRET: (0, envalid_1.str)(),
    REFRESH_JWT_SECRET: (0, envalid_1.str)(),
    ACCESS_TOKEN_EXPIRES_IN: (0, envalid_1.str)({ default: "15m" }),
    REFRESH_TOKEN_EXPIRES_IN: (0, envalid_1.str)({ default: "7d" }),
    REDIS_URL: (0, envalid_1.str)(),
    ALLOWED_ORIGINS: (0, envalid_1.str)({ default: "http://localhost:3000,http://localhost:5173" }),
    VERIFICATION_CODE_SECRET: (0, envalid_1.str)(),
    ALLOW_TEST_CODE_PLAINTEXT: (0, envalid_1.bool)({ default: false }),
    ALLOW_DEV_OTP_PLAINTEXT: (0, envalid_1.bool)({ default: false }),
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
    if (validatedEnv.ALLOW_DEV_OTP_PLAINTEXT) {
        throw new Error("ALLOW_DEV_OTP_PLAINTEXT must be false in production.");
    }
}
if (validatedEnv.REFRESH_JWT_SECRET === validatedEnv.JWT_SECRET) {
    throw new Error("REFRESH_JWT_SECRET must be different from JWT_SECRET.");
}
exports.env = validatedEnv;
//# sourceMappingURL=env.js.map