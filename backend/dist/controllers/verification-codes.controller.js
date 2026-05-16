"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCodeForCase = generateCodeForCase;
exports.validateCode = validateCode;
exports.extendCode = extendCode;
const zod_1 = require("zod");
const env_1 = require("../config/env");
const app_error_1 = require("../utils/app-error");
const verification_codes_service_1 = require("../services/verification-codes.service");
const caseIdSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
const validateSchema = zod_1.z.object({ codeValue: zod_1.z.string().min(3).max(64) });
const extendSchema = zod_1.z.object({
    verificationCodeId: zod_1.z.string().uuid(),
    extensionReason: zod_1.z.string().min(3).max(250),
});
function requireUser(req) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    return req.user;
}
function toSafeVerificationCode(data) {
    const { codeValue: _hidden, plainCodeValue, ...safe } = data;
    if (env_1.env.NODE_ENV === "test" && env_1.env.ALLOW_TEST_CODE_PLAINTEXT && plainCodeValue) {
        return { ...safe, codeValue: plainCodeValue };
    }
    return safe;
}
async function generateCodeForCase(req, res) {
    const user = requireUser(req);
    const { id } = caseIdSchema.parse(req.params);
    const data = await (0, verification_codes_service_1.generateVerificationCode)(id, { userId: user.id, role: user.role });
    res.status(201).json({
        success: true,
        message: "Verification code generated",
        data: toSafeVerificationCode(data),
    });
}
async function validateCode(req, res) {
    const user = requireUser(req);
    const { codeValue } = validateSchema.parse(req.body);
    const data = await (0, verification_codes_service_1.validateVerificationCode)(codeValue, { userId: user.id, role: user.role });
    res.status(200).json({
        success: true,
        message: "Verification code validated",
        data: toSafeVerificationCode(data),
    });
}
async function extendCode(req, res) {
    const user = requireUser(req);
    const { verificationCodeId, extensionReason } = extendSchema.parse(req.body);
    const data = await (0, verification_codes_service_1.extendVerificationCode)(verificationCodeId, { userId: user.id, role: user.role }, extensionReason);
    res.status(200).json({
        success: true,
        message: "Verification code extended",
        data: toSafeVerificationCode(data),
    });
}
//# sourceMappingURL=verification-codes.controller.js.map