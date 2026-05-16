import { DecisionOutcome } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { finalizeDecision, generateDecisionDraft, overrideDecision } from "../services/decisions.service";
import { AppError } from "../utils/app-error";

const caseIdSchema = z.object({ id: z.string().uuid() });
const decisionIdSchema = z.object({ decisionId: z.string().uuid() });
const overrideSchema = z.object({
  outcome: z.nativeEnum(DecisionOutcome),
  reasonText: z.string().min(5).max(500),
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }
  return req.user;
}

export async function generateDraft(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { id } = caseIdSchema.parse(req.params);
  const decision = await generateDecisionDraft(id, { userId: user.id, role: user.role });
  res.status(201).json({ success: true, message: "Decision draft generated", data: decision });
}

export async function override(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { decisionId } = decisionIdSchema.parse(req.params);
  const payload = overrideSchema.parse(req.body);
  const decision = await overrideDecision(decisionId, payload, { userId: user.id, role: user.role });
  res.status(200).json({ success: true, message: "Decision overridden", data: decision });
}

export async function finalize(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { decisionId } = decisionIdSchema.parse(req.params);
  const result = await finalizeDecision(decisionId, { userId: user.id, role: user.role });
  res.status(200).json({ success: true, message: "Decision finalized", data: result });
}
