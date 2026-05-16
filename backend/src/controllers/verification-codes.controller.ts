import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import {
  extendVerificationCode,
  generateVerificationCode,
  validateVerificationCode,
} from "../services/verification-codes.service";

const caseIdSchema = z.object({ id: z.string().uuid() });
const validateSchema = z.object({ codeValue: z.string().min(3).max(64) });
const extendSchema = z.object({
  verificationCodeId: z.string().uuid(),
  extensionReason: z.string().min(3).max(250),
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }
  return req.user;
}

function toSafeVerificationCode<T extends { codeValue?: string; plainCodeValue?: string; [key: string]: unknown }>(
  data: T,
): Omit<T, "codeValue" | "plainCodeValue"> & { codeValue?: string } {
  const { codeValue: _hidden, plainCodeValue, ...safe } = data;
  if (env.NODE_ENV === "test" && env.ALLOW_TEST_CODE_PLAINTEXT && plainCodeValue) {
    return { ...safe, codeValue: plainCodeValue };
  }
  return safe;
}

export async function generateCodeForCase(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { id } = caseIdSchema.parse(req.params);
  const data = await generateVerificationCode(id, { userId: user.id, role: user.role });

  res.status(201).json({
    success: true,
    message: "Verification code generated",
    data: toSafeVerificationCode(data),
  });
}

export async function validateCode(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { codeValue } = validateSchema.parse(req.body);
  const data = await validateVerificationCode(codeValue, { userId: user.id, role: user.role });

  res.status(200).json({
    success: true,
    message: "Verification code validated",
    data: toSafeVerificationCode(data),
  });
}

export async function extendCode(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { verificationCodeId, extensionReason } = extendSchema.parse(req.body);
  const data = await extendVerificationCode(verificationCodeId, { userId: user.id, role: user.role }, extensionReason);

  res.status(200).json({
    success: true,
    message: "Verification code extended",
    data: toSafeVerificationCode(data),
  });
}
