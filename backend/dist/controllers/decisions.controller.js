"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDraft = generateDraft;
exports.override = override;
exports.finalize = finalize;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const decisions_service_1 = require("../services/decisions.service");
const app_error_1 = require("../utils/app-error");
const caseIdSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
const decisionIdSchema = zod_1.z.object({ decisionId: zod_1.z.string().uuid() });
const overrideSchema = zod_1.z.object({
    outcome: zod_1.z.nativeEnum(client_1.DecisionOutcome),
    reasonText: zod_1.z.string().min(5).max(500),
});
function requireUser(req) {
    if (!req.user) {
        throw new app_error_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    return req.user;
}
async function generateDraft(req, res) {
    const user = requireUser(req);
    const { id } = caseIdSchema.parse(req.params);
    const decision = await (0, decisions_service_1.generateDecisionDraft)(id, { userId: user.id, role: user.role });
    res.status(201).json({ success: true, message: "Decision draft generated", data: decision });
}
async function override(req, res) {
    const user = requireUser(req);
    const { decisionId } = decisionIdSchema.parse(req.params);
    const payload = overrideSchema.parse(req.body);
    const decision = await (0, decisions_service_1.overrideDecision)(decisionId, payload, { userId: user.id, role: user.role });
    res.status(200).json({ success: true, message: "Decision overridden", data: decision });
}
async function finalize(req, res) {
    const user = requireUser(req);
    const { decisionId } = decisionIdSchema.parse(req.params);
    const result = await (0, decisions_service_1.finalizeDecision)(decisionId, { userId: user.id, role: user.role });
    res.status(200).json({ success: true, message: "Decision finalized", data: result });
}
//# sourceMappingURL=decisions.controller.js.map