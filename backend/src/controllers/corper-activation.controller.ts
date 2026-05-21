import type { Request, Response } from "express";
import { z } from "zod";
import {
  requestCorperActivationOtp,
  verifyCorperActivationOtp,
} from "../services/corper-activation.service";
import { setAuthCookies } from "../utils/auth-cookies";

const requestOtpSchema = z.object({
  callUpNumber: z.string().min(8).max(64),
  nin: z.string().min(11).max(11),
});

const verifyOtpSchema = z.object({
  callUpNumber: z.string().min(8).max(64),
  otp: z.string().min(6).max(6),
});

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const payload = requestOtpSchema.parse(req.body);
  const result = await requestCorperActivationOtp(payload);

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

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const payload = verifyOtpSchema.parse(req.body);
  const result = await verifyCorperActivationOtp(payload);
  const csrfToken = setAuthCookies(res, result.refreshToken);

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
