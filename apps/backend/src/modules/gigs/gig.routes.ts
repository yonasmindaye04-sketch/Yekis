// === IMPORTS ===
import { Router } from "express";
import {
  CreateGigInput,
  UpdateGigInput,
  GigSearchQuery,
  CreateGigOrderInput,
  SubmitGigDeliveryInput,
  RequestGigRevisionInput,
  CreateGigReviewInput,
} from "../../schemas";
import {
  requireAuth,
  requireFreshAuth,
  optionalAuth,
  type AuthedRequest,
} from "../../middleware/auth.js";
import { requireKycVerified } from "../../middleware/hardBlock.js";
import { requirePermission } from "../admin/permissions.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  createGig,
  searchGigs,
  getGigById,
  updateGig,
  setGigStatus,
  moderateGigStatus,
  listMyGigs,
  createGigOrder,
  fundGigOrderFromWallet,
  submitGigDelivery,
  requestGigRevision,
  acceptGigOrder,
  createGigReview,
  GigForbiddenError,
  GigNotFoundError,
  GigPackageNotFoundError,
  GigOrderNotFoundError,
  GigInvalidStateError,
  GigNotPartyError,
  GigInsufficientBalanceError,
} from "./gig.service.js";
import {
  raiseGigDispute,
  submitGigDisputeEvidence,
  resolveGigDispute,
  GigDisputeNotFoundError,
  NotGigDisputePartyError,
  InvalidGigDisputeStateError,
} from "./gigDispute.service.js";
import { z } from "zod";

export const gigsRouter = Router();

async function currentUserRole(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });
  return user.role;
}

function handleKnownErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof GigForbiddenError || err instanceof GigNotPartyError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (
    err instanceof GigNotFoundError ||
    err instanceof GigPackageNotFoundError ||
    err instanceof GigOrderNotFoundError
  ) {
    res.status(404).json({ error: "NOT_FOUND", message: err.message });
    return true;
  }
  if (err instanceof GigInvalidStateError) {
    res.status(409).json({ error: "CONFLICT", message: err.message });
    return true;
  }
  if (err instanceof GigInsufficientBalanceError) {
    res.status(422).json({ error: "INSUFFICIENT_BALANCE", message: err.message });
    return true;
  }
  return false;
}

// ---------- Gig discovery (public) ----------
gigsRouter.get("/search", async (req, res) => {
  const parsed = GigSearchQuery.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try {
    return res.json(await searchGigs(parsed.data));
  } catch (err) {
    logger.error({ err }, "Gig search failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

gigsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  return res.json(await listMyGigs(req.user!.id));
});

// optionalAuth rather than bare: a non-ACTIVE gig is readable by its owner so
// the seller can preview a draft, but 404s for anonymous callers and strangers.
gigsRouter.get("/:gigId", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    return res.json(
      await getGigById(req.params.gigId as string, {
        userId: req.user?.id ?? null,
        staffRole: req.user?.staffRole ?? null,
      }),
    );
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Gig fetch failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Gig CRUD (freelancer) ----------
gigsRouter.post(
  "/",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateGigInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const role = await currentUserRole(req.user!.id);
      const gig = await createGig({
        freelancerId: req.user!.id,
        freelancerRole: role,
        input: parsed.data,
      });
      return res.status(201).json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.patch(
  "/:gigId",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = UpdateGigInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const gig = await updateGig({
        ownerId: req.user!.id,
        gigId: req.params.gigId as string,
        input: parsed.data,
      });
      return res.json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig update failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Owner-driven: PAUSED and ARCHIVED only. ACTIVE/REJECTED are refused with a
// 400 rather than a 403 â€” this is a contract detail, not a permissions problem,
// and the allowed set is part of the published API.
gigsRouter.post(
  "/:gigId/status",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const status = req.body?.status;
    if (status !== "PAUSED" && status !== "ARCHIVED") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        allowed: ["PAUSED", "ARCHIVED"],
        message:
          "Publishing and rejection are staff decisions. Use the staff moderation endpoint.",
      });
    }
    try {
      const gig = await setGigStatus({
        ownerId: req.user!.id,
        gigId: req.params.gigId as string,
        status,
      });
      return res.json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig status change failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Staff moderation â€” the only route to ACTIVE.
gigsRouter.post(
  "/:gigId/moderation",
  requireAuth,
  // This is the only route to ACTIVE, and the role list granted it to
  // COMPLIANCE_OFFICER, COMPLIANCE_ADMIN and OPERATIONS_ADMIN â€” none of which
  // hold gigs.moderate in the matrix. A canonical copy exists at
  // POST /api/v1/admin/gigs/:gigId/moderation, guarded by
  // requireFreshAuth(300) + requirePermission("gigs.moderate"), which REFUSES
  // exactly those roles. So the weaker guard was the one that worked, and this
  // duplicate also had no step-up at all.
  requireFreshAuth(300),
  requirePermission("gigs.moderate"),
  async (req: AuthedRequest, res) => {
    const status = req.body?.status;
    if (status !== "ACTIVE" && status !== "REJECTED") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        allowed: ["ACTIVE", "REJECTED"],
      });
    }
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
    if (status === "REJECTED" && (!reason || reason.trim().length < 10)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "A rejection needs a reason of at least 10 characters.",
      });
    }
    try {
      const gig = await moderateGigStatus({
        staffUserId: req.user!.id,
        gigId: req.params.gigId as string,
        status,
        reason,
      });
      return res.json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig moderation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Gig orders ----------
gigsRouter.post(
  "/orders",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateGigOrderInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const order = await createGigOrder({
        clientId: req.user!.id,
        input: parsed.data,
      });
      return res.status(201).json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig order creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/fund",
  requireAuth,
  // Debits the client's wallet into escrow. The milestone equivalent,
  // POST /api/v1/escrow/fund-from-wallet-adjacent routes, and the milestone
  // accept path both carry a step-up; without one here a session obtained
  // purely from a stolen Telegram initData (weak `amr`, never a fresh
  // credential) could move gig escrow.
  requireFreshAuth(300),
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    try {
      const order = await fundGigOrderFromWallet({
        clientId: req.user!.id,
        orderId: req.params.orderId as string,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig order funding failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/submit",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = SubmitGigDeliveryInput.safeParse(req.body ?? {});
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const order = await submitGigDelivery({
        freelancerId: req.user!.id,
        orderId: req.params.orderId as string,
        deliverableUrl: parsed.data.deliverableUrl,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig delivery submission failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/revision",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = RequestGigRevisionInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const order = await requestGigRevision({
        clientId: req.user!.id,
        orderId: req.params.orderId as string,
        note: parsed.data.note,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig revision request failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/accept",
  requireAuth,
  // Releases escrowed gig money to the freelancer. Same reasoning as /fund, and
  // the milestone equivalent POST /api/v1/escrow/milestones/:id/accept already
  // requires a step-up.
  requireFreshAuth(300),
  async (req: AuthedRequest, res) => {
    try {
      const order = await acceptGigOrder({
        clientId: req.user!.id,
        orderId: req.params.orderId as string,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig order accept failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/review",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = CreateGigReviewInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const review = await createGigReview({
        authorId: req.user!.id,
        orderId: req.params.orderId as string,
        input: parsed.data,
      });
      return res.status(201).json(review);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig review creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.get(
  "/orders/:orderId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const order = await prisma.gigOrder.findUnique({
        where: { id: req.params.orderId as string },
        include: { gig: { include: { packages: true } }, package: true },
      });
      if (!order) return res.status(404).json({ error: "NOT_FOUND" });
      const isParty =
        order.clientId === req.user!.id || order.gig.freelancerId === req.user!.id;
      if (!isParty) return res.status(403).json({ error: "FORBIDDEN" });
      return res.json(order);
    } catch (err) {
      logger.error({ err }, "Gig order fetch failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Gig order disputes (polymorphic Dispute machine) ----------

const RaiseGigDisputeInput = z.object({
  category: z.enum([
    "NON_DELIVERY",
    "LATE_DELIVERY",
    "QUALITY_ISSUE",
    "SCOPE_CREEP",
    "NON_PAYMENT",
    "COMMUNICATION_BREAKDOWN",
  ]),
  description: z.string().min(20).max(3000),
});

gigsRouter.post(
  "/orders/:orderId/dispute",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = RaiseGigDisputeInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    try {
      const dispute = await raiseGigDispute({
        raisedByUserId: req.user!.id,
        gigOrderId: String(req.params.orderId),
        category: parsed.data.category,
        description: parsed.data.description,
      });
      return res.status(201).json(dispute);
    } catch (err) {
      if (err instanceof NotGigDisputePartyError) {
        return res.status(403).json({ error: "FORBIDDEN", message: err.message });
      }
      if (err instanceof GigDisputeNotFoundError) {
        return res.status(404).json({ error: "NOT_FOUND", message: err.message });
      }
      if (err instanceof InvalidGigDisputeStateError) {
        return res.status(409).json({ error: "CONFLICT", message: err.message });
      }
      logger.error({ err }, "Gig dispute raise failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/disputes/:disputeId/evidence",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({ statement: z.string().min(10).max(5000) })
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    try {
      const evidence = await submitGigDisputeEvidence({
        userId: req.user!.id,
        disputeId: String(req.params.disputeId),
        statement: parsed.data.statement,
      });
      return res.status(201).json(evidence);
    } catch (err) {
      if (err instanceof NotGigDisputePartyError) {
        return res.status(403).json({ error: "FORBIDDEN", message: err.message });
      }
      if (err instanceof GigDisputeNotFoundError) {
        return res.status(404).json({ error: "NOT_FOUND", message: err.message });
      }
      if (err instanceof InvalidGigDisputeStateError) {
        return res.status(409).json({ error: "CONFLICT", message: err.message });
      }
      logger.error({ err }, "Gig dispute evidence failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/disputes/:disputeId/resolve",
  requireAuth,
  // Settles a gig dispute, which moves escrowed money to one party or the
  // other. The role list granted it to COMPLIANCE_OFFICER and COMPLIANCE_ADMIN,
  // who hold disputes.mediate but not disputes.resolve â€” they can review and
  // mediate gig disputes but should not decide who gets the money.
  requirePermission("disputes.resolve"),
  requireFreshAuth(300),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        outcome: z.enum([
          "RELEASE_TO_FREELANCER",
          "REFUND_TO_CLIENT",
          "PARTIAL_SPLIT",
        ]),
        recommendation: z.string().min(10).max(2000),
        freelancerShareMinor: z.number().int().nonnegative().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    try {
      const resolved = await resolveGigDispute({
        staffUserId: req.user!.id,
        disputeId: String(req.params.disputeId),
        outcome: parsed.data.outcome,
        recommendation: parsed.data.recommendation,
        freelancerShareMinor: parsed.data.freelancerShareMinor,
      });
      return res.json(resolved);
    } catch (err) {
      if (err instanceof GigDisputeNotFoundError) {
        return res.status(404).json({ error: "NOT_FOUND", message: err.message });
      }
      if (err instanceof InvalidGigDisputeStateError) {
        return res.status(409).json({ error: "CONFLICT", message: err.message });
      }
      logger.error({ err }, "Gig dispute resolution failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

export default gigsRouter;