// === IMPORTS ===
import { Router } from "express";
import {
  RaiseDisputeInput,
  SubmitEvidenceInput,
  MediatorResolutionInput,
  ArbitrationAwardInput,
} from "../../schemas";
import { requireAuth, requireFreshAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requirePermission } from "../admin/permissions.js";
import { logger } from "../../lib/logger.js";
import {
  raiseDispute,
  escalateToEvidence,
  submitEvidence,
  getMediationQueue,
  resolveDispute,
  escalateToArbitration,
  applyArbitrationAward,
  claimDisputeAsMediator,
  withdrawDisputeMutually,
  getDispute,
  getDisputesForUser,
  DisputeNotFoundError,
  NotDisputePartyError,
  InvalidDisputeStageError,
  MilestoneNotFoundError,
  InvalidEscrowStateForDisputeError,
  DisputeAlreadyClaimedError,
  DisputeAlreadyResolvedError,
  MilestoneNotSettleableError,
} from "./dispute.service.js";
import { z } from "zod";

export const disputesRouter = Router();

// === MAIN FUNCTIONS ===
function handleKnownErrors(
  err: unknown,
  res: import("express").Response,
): boolean {
  if (err instanceof NotDisputePartyError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (
    err instanceof DisputeNotFoundError ||
    err instanceof MilestoneNotFoundError
  ) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (
    err instanceof InvalidDisputeStageError ||
    err instanceof InvalidEscrowStateForDisputeError ||
    err instanceof MilestoneNotSettleableError
  ) {
    res.status(409).json({ error: "INVALID_STATE", message: err.message });
    return true;
  }
  // F-04: already settled by someone else. A distinct code so the UI can say
  // "this dispute is closed" rather than "try again".
  if (err instanceof DisputeAlreadyResolvedError) {
    res
      .status(409)
      .json({ error: "DISPUTE_ALREADY_RESOLVED", message: err.message });
    return true;
  }
  if (err instanceof DisputeAlreadyClaimedError) {
    res
      .status(409)
      .json({ error: "DISPUTE_ALREADY_CLAIMED", message: err.message });
    return true;
  }
  return false;
}

// ---------- Compliance Officer / mediator routes ----------
// NOTE: Staff routes (/staff/*) MUST be registered before the /:disputeId
// param route, otherwise Express matches "staff" as a disputeId â†’ 500.

disputesRouter.get(
  "/staff/queue",
  requireAuth,
  // Was requireStaffRole("COMPLIANCE_OFFICER", "COMPLIANCE_ADMIN", "ADMIN",
  // "SUPER_ADMIN", "DISPUTE_MEDIATOR"). Behaviour is identical â€” every one of
  // those roles holds disputes.view â€” but the matrix is now the single source
  // of truth, so adding a role cannot silently widen or narrow this surface.
  requirePermission("disputes.view"),
  async (req: AuthedRequest, res) => {
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : undefined;
    const limit = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    try {
      const queue = await getMediationQueue({ page, limit, search, status });
      return res.json(queue);
    } catch (err) {
      logger.error({ err }, "Failed to fetch mediation queue");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Party-facing routes ----------

disputesRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const disputes = await getDisputesForUser(req.user!.id);
  return res.json(disputes);
});

disputesRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = RaiseDisputeInput.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const dispute = await raiseDispute({
      raisedByUserId: req.user!.id,
      ...parsed.data,
    });
    return res.status(201).json(dispute);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to raise dispute");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

disputesRouter.get(
  "/:disputeId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const dispute = await getDispute(
        req.user!.id,
        req.params.disputeId as string,
      );
      return res.json(dispute);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to fetch dispute");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

disputesRouter.post(
  "/:disputeId/escalate",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const dispute = await escalateToEvidence({
        userId: req.user!.id,
        disputeId: req.params.disputeId as string,
      });
      return res.json(dispute);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to escalate dispute");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

disputesRouter.post(
  "/:disputeId/evidence",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = SubmitEvidenceInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

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
  },
);

disputesRouter.post(
  "/:disputeId/arbitration",
  requireAuth,
  async (req: AuthedRequest, res) => {
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
  },
);

disputesRouter.post(
  "/:disputeId/resolve",
  requireAuth,
  // Releases escrow or refunds the client. The role list here included
  // COMPLIANCE_OFFICER and COMPLIANCE_ADMIN, who the matrix deliberately does
  // NOT give disputes.resolve â€” compliance staff can review and mediate, not
  // decide who gets the money. A permission key is used so the matrix, not
  // this route, defines the boundary.
  requirePermission("disputes.resolve"),
  // Step-up: this moves money out of escrow on one request. Without it a
  // session obtained purely from a stolen Telegram initData â€” which carries a
  // weak `amr` and never counts as a fresh credential â€” could settle a dispute
  // and pay out.
  requireFreshAuth(300),
  async (req: AuthedRequest, res) => {
    const parsed = MediatorResolutionInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
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
  },
);

// ---------- Mediator assignment ----------

// T2-I: a staff member claims a Stage-3 dispute so two mediators never work
// the same case simultaneously. First claim wins; second gets 409.
disputesRouter.post(
  "/:disputeId/claim",
  requireAuth,
  // Mediator assignment, not settlement. disputes.mediate is held by exactly
  // the roles the old list allowed, so this is behaviour-preserving.
  requirePermission("disputes.mediate"),
  async (req: AuthedRequest, res) => {
    try {
      const result = await claimDisputeAsMediator({
        staffUserId: req.user!.id,
        disputeId: req.params.disputeId as string,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to claim dispute as mediator");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// T2-H: apply an external arbitration award (AACCSA reference required).
// Staff-only; moves funds per the arbitrator's outcome.
//
// F-05: the shape and the PARTIAL_SPLIT refine now come from
// @marketplace/schemas, the same definition /resolve uses. The local copy here
// lacked the refine, so this route accepted PARTIAL_SPLIT with no share.

disputesRouter.post(
  "/:disputeId/arbitration-award",
  requireAuth,
  // Moves escrow exactly like /resolve, so it is gated identically. It was the
  // same role list, which granted the power to roles the matrix gives
  // disputes.mediate but not disputes.resolve â€” and it rewinds
  // STAGE_4_ARBITRATION back to STAGE_3 before settling, so it was the
  // higher-risk of the two.
  requirePermission("disputes.resolve"),
  requireFreshAuth(300),
  async (req: AuthedRequest, res) => {
    const parsed = ArbitrationAwardInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await applyArbitrationAward({
        staffUserId: req.user!.id,
        disputeId: req.params.disputeId as string,
        ...parsed.data,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to apply arbitration award");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// T2-F: party-facing mutual withdrawal. First call proposes; second call
// (other party) must match outcome + share to confirm.
disputesRouter.post(
  "/:disputeId/withdraw",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        proposedOutcome: z.enum([
          "RELEASE_TO_FREELANCER",
          "REFUND_TO_CLIENT",
          "PARTIAL_SPLIT",
        ]),
        proposedFreelancerShareMinor: z.coerce
          .number()
          .int()
          .nonnegative()
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await withdrawDisputeMutually({
        userId: req.user!.id,
        disputeId: req.params.disputeId as string,
        ...parsed.data,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to mutually withdraw dispute");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
