"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtp = requestOtp;
exports.verifyOtp = verifyOtp;
const zod_1 = require("zod");
const corper_activation_service_1 = require("../services/corper-activation.service");
const auth_cookies_1 = require("../utils/auth-cookies");
const requestOtpSchema = zod_1.z.object({
    callUpNumber: zod_1.z.string().min(8).max(64),
    nin: zod_1.z.string().min(11).max(11),
});
const verifyOtpSchema = zod_1.z.object({
    callUpNumber: zod_1.z.string().min(8).max(64),
    otp: zod_1.z.string().min(6).max(6),
});
async function requestOtp(req, res) {
    const payload = requestOtpSchema.parse(req.body);
    const result = await (0, corper_activation_service_1.requestCorperActivationOtp)(payload);
    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            expiresInSeconds: result.expiresInSeconds,
            maskedPhone: result.maskedPhone,
            ...(result.devOtp ? { devOtp: result.devOtp } : {}),
        },
    });
}
async function verifyOtp(req, res) {
    const payload = verifyOtpSchema.parse(req.body);
    const result = await (0, corper_activation_service_1.verifyCorperActivationOtp)(payload);
    const csrfToken = (0, auth_cookies_1.setAuthCookies)(res, result.refreshToken);
    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            token: result.token,
            csrfToken,
            user: result.user,
        },
    });
}
//# sourceMappingURL=corper-activation.controller.js.map