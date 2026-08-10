// === IMPORTS ===
import { Router } from "express";
import { RaiseDisputeInput, SubmitEvidenceInput, MediatorResolutionInput } from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import {
  raiseDispute,
  escalateToEvidence,
  submitEvidence,
  getMediationQueue,
  resolveDispute,
  escalateToArbitration,
  getDispute,
  getDisputesForUser,
  DisputeNotFoundError,
  NotDisputePartyError,
  InvalidDisputeStageError,
  MilestoneNotFoundError,
  InvalidEscrowStateForDisputeError,
} from "./dispute.service.js";

export const disputesRouter = Router();


// === MAIN FUNCTIONS ===
function handleKnownErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof NotDisputePartyError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (err instanceof DisputeNotFoundError || err instanceof MilestoneNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (err instanceof InvalidDisputeStageError || err instanceof InvalidEscrowStateForDisputeError) {
    res.status(409).json({ error: "INVALID_STATE", message: err.message });
    return true;
  }
  return false;
}

// ---------- Party-facing routes ----------

disputesRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const disputes = await getDisputesForUser(req.user!.id);
  return res.json(disputes);
});

disputesRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = RaiseDisputeInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const dispute = await raiseDispute({ raisedByUserId: req.user!.id, ...parsed.data });
    return res.status(201).json(dispute);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to raise dispute");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

disputesRouter.get("/:disputeId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const dispute = await getDispute(req.user!.id, req.params.disputeId as string);
    return res.json(dispute);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to fetch dispute");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

disputesRouter.post("/:disputeId/escalate", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const dispute = await escalateToEvidence({ userId: req.user!.id, disputeId: req.params.disputeId as string });
    return res.json(dispute);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to escalate dispute");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

disputesRouter.post("/:disputeId/evidence", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = SubmitEvidenceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const dispute = await submitEvidence({
      userId: req.user!.id,
      disputeId: req.params.disputeId as string,
      statement: parsed.data.statement,
    });
    return res.json(dispute);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to submit evidence");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

disputesRouter.post("/:disputeId/arbitration", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const dispute = await escalateToArbitration({
      userId: req.user!.id,
      disputeId: req.params.disputeId as string,
    });
    return res.json(dispute);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to escalate to arbitration");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Compliance Officer / mediator routes ----------

disputesRouter.get(
  "/staff/queue",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const queue = await getMediationQueue({ page, limit, search, status });
    return res.json(queue);
  }
);

disputesRouter.post(
  "/:disputeId/resolve",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = MediatorResolutionInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await resolveDispute({
        staffUserId: req.user!.id,
        disputeId: req.params.disputeId as string,
        outcome: parsed.data.outcome,
        recommendation: parsed.data.recommendation,
        freelancerShareMinor: parsed.data.freelancerShareMinor,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to resolve dispute");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);
