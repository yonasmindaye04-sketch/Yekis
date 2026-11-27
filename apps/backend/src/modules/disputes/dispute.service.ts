// === IMPORTS ===
import type {
  DisputeCategory,
  DisputeResolutionOutcome,
} from "../../schemas";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import {
  releaseMilestoneFunds,
  refundMilestoneToClient,
} from "../escrow/escrow.service.js";
import { calculateFees, getEscrowFeeConfig } from "../escrow/fees.js";
import { env } from "../../config/env.js";
import { checkAndUpdateContractCompletion } from "../contracts/contracts.service.js";
import { recordDisputeRefundLedger } from "../finance/ledger.service.js";
import { uploadEvidenceBundle } from "../../lib/objectStore.js";
import { logger } from "../../lib/logger.js";
import { createHash } from "node:crypto";
import { disputeSla } from "../sla/sla.service.js";
import { hasPermission } from "../admin/permissions.js";

// === MAIN FUNCTIONS ===
export class DisputeNotFoundError extends Error {
  constructor(message = "Dispute not found.") {
    super(message);
    this.name = "DisputeNotFoundError";
  }
}
export class NotDisputePartyError extends Error {
  constructor(
    message = "Only dispute parties or authorized mediation staff can perform this action.",
  ) {
    super(message);
    this.name = "NotDisputePartyError";
  }
}
export class InvalidDisputeStageError extends Error {}
export class MilestoneNotFoundError extends Error {
  constructor(message = "Milestone not found.") {
    super(message);
    this.name = "MilestoneNotFoundError";
  }
}
export class InvalidEscrowStateForDisputeError extends Error {}
export class MutualWithdrawalOutcomeMismatchError extends Error {}
export class DisputeAlreadyClaimedError extends Error {
  constructor(message = "Dispute has already been claimed.") {
    super(message);
    this.name = "DisputeAlreadyClaimedError";
  }
}
/**
 * F-04 â€” the dispute was already resolved by someone else, either a concurrent
 * resolution or an earlier one. Thrown BEFORE any money moves, so a losing
 * caller cannot pay a party twice.
 */
export class DisputeAlreadyResolvedError extends Error {}
/**
 * F-04 â€” the milestone backing this dispute is not in a state that can still be
 * settled (e.g. already RELEASED or REFUNDED). Without this guard a
 * REFUND_TO_CLIENT award could credit a wallet for money that has already been
 * released to the other party.
 */
export class MilestoneNotSettleableError extends Error {}
/** Partial-split dispute resolution is gated behind PARTIAL_SPLIT_ENABLED. */
export class PartialSplitDisabledError extends Error {}

export interface ComputedDisputeSplit {
  disputedAmountMinor: number;
  outcome: DisputeResolutionOutcome;
  freelancerSharePct: number | null;
  freelancerGrossMinor: number;
  clientRefundMinor: number;
  platformFeeMinor: number;
  providerFeeMinor: number;
  totalFeeMinor: number;
  withholdingTaxMinor: number;
  freelancerNetMinor: number;
  freelancerFeeRate: number;
  providerFeeRate: number;
}

/**
 * Single authoritative dispute split & fee calculator shared by
 * `previewDisputeSplit` and `resolveDispute`. Computes integer minor units
 * from the disputed milestone amount and applies fee rounding once.
 */
export function computeDisputeSplit(params: {
  disputedAmountMinor: number;
  outcome: DisputeResolutionOutcome;
  freelancerSharePct?: number;
  freelancerShareMinor?: number;
  freelancerHasTin?: boolean;
}): ComputedDisputeSplit {
  const total = params.disputedAmountMinor;
  if (!Number.isInteger(total) || total < 0) {
    throw new InvalidDisputeStageError("Invalid disputed milestone amount.");
  }

  let freelancerGrossMinor = 0;
  let clientRefundMinor = 0;
  let resolvedPct: number | null = null;

  if (params.outcome === "RELEASE_TO_FREELANCER") {
    freelancerGrossMinor = total;
    clientRefundMinor = 0;
    resolvedPct = 100;
  } else if (params.outcome === "REFUND_TO_CLIENT") {
    freelancerGrossMinor = 0;
    clientRefundMinor = total;
    resolvedPct = 0;
  } else {
    const hasPct = params.freelancerSharePct !== undefined;
    const hasMinor = params.freelancerShareMinor !== undefined;
    if (hasPct === hasMinor) {
      throw new InvalidDisputeStageError(
        "A PARTIAL_SPLIT requires exactly one of freelancerSharePct or freelancerShareMinor.",
      );
    }

    if (hasPct) {
      const pct = params.freelancerSharePct!;
      if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
        throw new InvalidDisputeStageError(
          "freelancerSharePct must be an integer between 0 and 100.",
        );
      }
      resolvedPct = pct;
      freelancerGrossMinor = Math.round((total * pct) / 100);
    } else {
      const share = params.freelancerShareMinor!;
      if (!Number.isInteger(share) || share < 0) {
        throw new InvalidDisputeStageError(
          "A PARTIAL_SPLIT resolution requires a non-negative integer freelancerShareMinor.",
        );
      }
      if (share > total) {
        throw new InvalidDisputeStageError(
          "Freelancer share cannot exceed the milestone amount.",
        );
      }
      freelancerGrossMinor = share;
      resolvedPct = total > 0 ? Math.round((share / total) * 100) : 0;
    }

    clientRefundMinor = total - freelancerGrossMinor;
    if (
      freelancerGrossMinor < 0 ||
      clientRefundMinor < 0 ||
      freelancerGrossMinor + clientRefundMinor !== total
    ) {
      throw new InvalidDisputeStageError(
        "Freelancer and client split amounts must sum to the disputed milestone amount.",
      );
    }
  }

  const fees = calculateFees({
    milestoneAmountMinor: freelancerGrossMinor,
    freelancerHasTin: params.freelancerHasTin,
  });
  const totalFeeMinor =
    fees.platformFeeFromFreelancerMinor +
    fees.paymentProviderFeeMinor +
    fees.withholdingTaxMinor;
  const cfg = getEscrowFeeConfig();

  return {
    disputedAmountMinor: total,
    outcome: params.outcome,
    freelancerSharePct: resolvedPct,
    freelancerGrossMinor,
    clientRefundMinor,
    platformFeeMinor: fees.platformFeeFromFreelancerMinor,
    providerFeeMinor: fees.paymentProviderFeeMinor,
    totalFeeMinor,
    withholdingTaxMinor: fees.withholdingTaxMinor,
    freelancerNetMinor: fees.freelancerNetMinor,
    freelancerFeeRate: cfg.freelancerPlatformFeeRate,
    providerFeeRate: cfg.paymentProviderFeeRate,
  };
}

/**
 * F-04 â€” escrow states from which a dispute resolution can still move money.
 * Deliberately excludes RELEASED and REFUNDED: those mean the money already
 * went somewhere, and a second movement would duplicate it.
 */
const SETTLEABLE_ESCROW_STATES = [
  "DISPUTED",
  "SUBMITTED_FOR_REVIEW",
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
] as const;

const NEGOTIATION_WINDOW_DAYS = 7; // Stage 1 â€” matches the roadmap's dispute-flow design
const MEDIATION_WINDOW_DAYS = 5; // Stage 3 target SLA (3-5 business days)

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Stage 0 â†’ 1. Either party can raise a dispute against a milestone that's
 * actively in flight (funded, being worked on, or submitted for review).
 * Critically: this cancels the scheduled auto-release jobs â€” a milestone
 * under dispute must never auto-release out from under the process, even
 * as a defense-in-depth on top of the auto-release worker's own state check.
 */
export async function raiseDispute(params: {
  raisedByUserId: string;
  contractId: string;
  milestoneId: string;
  category: DisputeCategory;
  description: string;
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contractId !== params.contractId) {
    throw new InvalidEscrowStateForDisputeError(
      "Milestone does not belong to the supplied contract.",
    );
  }

  const isParty =
    milestone.contract.clientId === params.raisedByUserId ||
    milestone.contract.freelancerId === params.raisedByUserId;
  if (!isParty) {
    throw new NotDisputePartyError("Only contract parties can raise a dispute.");
  }

  if (
    !["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW"].includes(
      milestone.escrowState,
    )
  ) {
    throw new InvalidEscrowStateForDisputeError(
      `Cannot raise a dispute on a milestone in state ${milestone.escrowState}.`,
    );
  }

  const negotiationDeadline = daysFromNow(NEGOTIATION_WINDOW_DAYS);

  const [dispute] = await prisma.$transaction([
    prisma.dispute.create({
      data: {
        contractId: params.contractId,
        milestoneId: params.milestoneId,
        category: params.category,
        description: params.description,
        raisedByUserId: params.raisedByUserId,
        stage: "STAGE_1_NEGOTIATION",
        negotiationDeadlineAt: negotiationDeadline,
      },
    }),
    prisma.milestone.update({
      where: { id: params.milestoneId },
      data: { escrowState: "DISPUTED" },
    }),
  ]);

  // Defense in depth â€” see function docstring. Safe to call even if the
  // jobs already fired or don't exist; BullMQ no-ops on an unknown jobId.
  await autoReleaseQueue.remove(`warn-${params.milestoneId}`);
  await autoReleaseQueue.remove(`release-${params.milestoneId}`);

  await recordAuditEvent({
    userId: params.raisedByUserId,
    eventType: "DISPUTE_RAISED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { milestoneId: params.milestoneId, category: params.category },
  });

  const otherPartyId =
    milestone.contract.clientId === params.raisedByUserId
      ? milestone.contract.freelancerId
      : milestone.contract.clientId;

  await notificationQueue.add("dispute-raised", {
    userId: otherPartyId,
    disputeId: dispute.id,
    message: "A dispute has been raised on one of your milestones.",
  });

  await notifyStaffOfEvent({
    eventType: "dispute-raised-staff",
    message: `New dispute ${dispute.id} raised on milestone ${milestone.id}. Mediation queue updated.`,
    metadata: { disputeId: dispute.id, milestoneId: milestone.id },
  });

  return dispute;
}

/**
 * Stage 1 â†’ 2. Either party may escalate once the negotiation window has
 * passed without resolution. (A "both parties agree to resolve directly"
 * path would close the dispute entirely rather than escalate it â€” that's
 * the withdrawDispute action below.)
 */
export async function escalateToEvidence(params: {
  userId: string;
  disputeId: string;
}) {
  const { dispute, isParty, isAuthorizedStaff } = await getDisputeForActor(
    params.disputeId,
    params.userId,
    "disputes.mediate",
  );

  if (dispute.stage !== "STAGE_1_NEGOTIATION") {
    throw new InvalidDisputeStageError(
      `Cannot escalate from stage ${dispute.stage}.`,
    );
  }
  if (
    isParty &&
    !isAuthorizedStaff &&
    dispute.negotiationDeadlineAt &&
    dispute.negotiationDeadlineAt > new Date()
  ) {
    throw new InvalidDisputeStageError(
      "Negotiation window has not yet elapsed.",
    );
  }

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: { stage: "STAGE_2_EVIDENCE" },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "DISPUTE_ESCALATED_TO_EVIDENCE",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { viaStaffMediation: isAuthorizedStaff && !isParty },
  });

  return updated;
}

/**
 * Stage 2 (or Stage 3 for authorized mediation staff). Either party attaches a
 * written statement to advance into Stage 3, while staff with `disputes.mediate`
 * may also append mediator evidence statements in Stage 3 without getting
 * rejected as non-party.
 */
export async function submitEvidence(params: {
  userId: string;
  disputeId: string;
  statement: string;
}) {
  const { dispute, isParty, isAuthorizedStaff } = await getDisputeForActor(
    params.disputeId,
    params.userId,
    "disputes.mediate",
  );

  const allowedStages = isAuthorizedStaff
    ? ["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"]
    : ["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE"];

  if (!allowedStages.includes(dispute.stage)) {
    throw new InvalidDisputeStageError(
      `Cannot submit evidence at stage ${dispute.stage}.`,
    );
  }

  await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      submittedByUserId: params.userId,
      statement: params.statement,
    },
  });

  const alreadyMediation = dispute.stage === "STAGE_3_MEDIATION";
  const mediationDeadline = alreadyMediation
    ? dispute.mediationDeadlineAt ?? daysFromNow(MEDIATION_WINDOW_DAYS)
    : daysFromNow(MEDIATION_WINDOW_DAYS);

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      stage: "STAGE_3_MEDIATION",
      mediationDeadlineAt: mediationDeadline,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "DISPUTE_EVIDENCE_SUBMITTED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: {
      staffMediationNote: isAuthorizedStaff && !isParty,
      stage: updated.stage,
    },
  });

  // T2-G: Compile evidence bundle asynchronously â€” do not block the evidence
  // submission response if the object-store upload fails. The mediator queue
  // shows cases even without a compiled bundle; bundle just enriches the view.
  compileEvidenceBundle(dispute.id).catch((err) =>
    logger.error(
      { err, disputeId: dispute.id },
      "Evidence bundle compilation failed â€” mediator will see raw statements only",
    ),
  );

  return updated;
}

/**
 * T2-G: Pulls contract terms, all DisputeEvidence statements, milestone detail,
 * and the direct message thread (if it exists for this job) into a single JSON
 * document, uploads it to the object store, and sets evidenceBundlePath.
 * Called from submitEvidence(); also safe to call standalone for recompilation.
 */
export async function compileEvidenceBundle(disputeId: string): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      evidence: { orderBy: { createdAt: "asc" } },
      contract: {
        include: {
          job: true,
          client: { select: { id: true, email: true, ucid: true } },
          freelancer: { select: { id: true, email: true, ucid: true } },
          milestones: true,
        },
      },
    },
  });
  if (!dispute) throw new DisputeNotFoundError();
  // Polymorphic guard: evidence-bundle compilation is contract-scoped; gig
  // disputes compile their own context (gigDispute.service.ts).
  if (!dispute.contract) {
    throw new InvalidDisputeStageError(
      "Evidence bundle compilation requires a contract-backed dispute.",
    );
  }

  const milestone = dispute.contract.milestones.find(
    (m) => m.id === dispute.milestoneId,
  );

  // Pull direct message thread if one exists for this job+parties combination.
  // DirectThread is scoped to (jobId, clientId, freelancerId) â€” exactly what we need.
  const messageThread = await prisma.directThread.findFirst({
    where: {
      jobId: dispute.contract.jobId,
      clientId: dispute.contract.clientId,
      freelancerId: dispute.contract.freelancerId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { senderId: true, body: true, createdAt: true },
      },
    },
  });

  const bundle = {
    compiledAt: new Date().toISOString(),
    disputeId: dispute.id,
    contractId: dispute.contractId,
    milestoneId: dispute.milestoneId,
    milestone: milestone
      ? {
          title: milestone.title,
          amountMinor: milestone.amountMinor,
          escrowState: milestone.escrowState,
        }
      : null,
    parties: {
      client: dispute.contract.client,
      freelancer: dispute.contract.freelancer,
    },
    job: { id: dispute.contract.job.id, title: dispute.contract.job.title },
    disputeDetails: {
      category: dispute.category,
      description: dispute.description,
      raisedByUserId: dispute.raisedByUserId,
      raisedAt: dispute.createdAt,
    },
    evidenceStatements: dispute.evidence.map((e) => ({
      submittedByUserId: e.submittedByUserId,
      statement: e.statement,
      submittedAt: e.createdAt,
    })),
    messageLog: messageThread?.messages ?? [],
  };

  const bundleBuffer = Buffer.from(JSON.stringify(bundle, null, 2), "utf8");
  const storageKey = await uploadEvidenceBundle({
    disputeId: dispute.id,
    fileBuffer: bundleBuffer,
  });

  await prisma.dispute.update({
    where: { id: disputeId },
    data: { evidenceBundlePath: storageKey },
  });

  logger.info({ disputeId, storageKey }, "Evidence bundle compiled and stored");
}

/**
 * OPS-02: Compute disputed milestone metadata & amount from the milestone(s)
 * actually under dispute — never summing unrelated RELEASED or WIP milestones
 * on the contract.
 */
export function extractDisputedMilestoneContext<
  M extends {
    id: string;
    title: string;
    amountMinor: number;
    escrowState: string;
    deliverableUrl: string | null;
  },
>(dispute: { milestoneId: string | null; contract: { milestones: M[] } | null }) {
  const milestones = dispute.contract?.milestones ?? [];
  const linked = dispute.milestoneId
    ? milestones.find((m) => m.id === dispute.milestoneId) ?? null
    : null;
  const disputedSet = linked
    ? [linked]
    : milestones.filter((m) => m.escrowState === "DISPUTED");
  const disputedAmountMinor = disputedSet.reduce(
    (sum, m) => sum + m.amountMinor,
    0,
  );
  const disputedMilestone = linked
    ? {
        id: linked.id,
        title: linked.title,
        amountMinor: linked.amountMinor,
        escrowState: linked.escrowState,
        deliverableUrl: linked.deliverableUrl,
      }
    : disputedSet[0]
      ? {
          id: disputedSet[0].id,
          title: disputedSet[0].title,
          amountMinor: disputedSet[0].amountMinor,
          escrowState: disputedSet[0].escrowState,
          deliverableUrl: disputedSet[0].deliverableUrl,
        }
      : null;
  return { disputedAmountMinor, disputedMilestone };
}

/** Compliance Officer / mediator dashboard — everything awaiting a decision. */
export async function getMediationQueue(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));

  const where: any = {};

  if (params?.status) {
    where.stage = params.status;
  } else {
    // Default to STAGE_3_MEDIATION if no specific stage requested
    where.stage = "STAGE_3_MEDIATION";
  }

  if (params?.search) {
    where.contract = {
      OR: [
        { client: { email: { contains: params.search, mode: "insensitive" } } },
        {
          freelancer: {
            email: { contains: params.search, mode: "insensitive" },
          },
        },
      ],
    };
  }

  const [total, items] = await Promise.all([
    prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      include: {
        evidence: true,
        contract: {
          include: {
            job: true,
            client: { select: { id: true, email: true } },
            freelancer: { select: { id: true, email: true } },
            milestones: true,
          },
        },
      },
      orderBy: { mediationDeadlineAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map((d) => ({
      ...d,
      ...extractDisputedMilestoneContext(d),
      // SLA is computed and attached server-side, so the console does not
      // have to redraw the clock and a breach is the same fact everywhere.
      sla: disputeSla(d),
    })),
    total,
    page,
    pageSize: limit,
    partialSplitEnabled: env.PARTIAL_SPLIT_ENABLED,
  };
}

/**
 * Authoritative financial preview for resolving or splitting a dispute.
 * Uses the exact same `computeDisputeSplit()` calculation as `resolveDispute()`.
 */
export async function previewDisputeSplit(params: {
  disputeId: string;
  outcome: DisputeResolutionOutcome;
  freelancerSharePct?: number;
  freelancerShareMinor?: number;
}): Promise<ComputedDisputeSplit> {
  if (params.outcome === "PARTIAL_SPLIT" && !env.PARTIAL_SPLIT_ENABLED) {
    throw new PartialSplitDisabledError(
      "Partial split dispute settlement is currently disabled.",
    );
  }
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: { contract: true },
  });
  if (!dispute) throw new DisputeNotFoundError();
  if (!dispute.contract || !dispute.milestoneId) {
    throw new InvalidDisputeStageError(
      "Split preview requires a milestone-backed contract dispute.",
    );
  }
  const [milestone, freelancerKyc] = await Promise.all([
    prisma.milestone.findUnique({ where: { id: dispute.milestoneId } }),
    prisma.kycRecord.findUnique({
      where: { userId: dispute.contract.freelancerId },
      select: { tin: true },
    }),
  ]);
  if (!milestone) throw new MilestoneNotFoundError();

  return computeDisputeSplit({
    disputedAmountMinor: milestone.amountMinor,
    outcome: params.outcome,
    freelancerSharePct: params.freelancerSharePct,
    freelancerShareMinor: params.freelancerShareMinor,
    freelancerHasTin: Boolean(freelancerKyc?.tin),
  });
}

/**
 * Stage 3 decision.
 */
export async function resolveDispute(params: {
  staffUserId: string;
  disputeId: string;
  outcome: DisputeResolutionOutcome;
  recommendation: string;
  freelancerShareMinor?: number;
  freelancerSharePct?: number;
}) {
  if (params.outcome === "PARTIAL_SPLIT" && !env.PARTIAL_SPLIT_ENABLED) {
    throw new PartialSplitDisabledError(
      "Partial split dispute settlement is currently disabled.",
    );
  }
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: { contract: true },
  });
  if (!dispute) throw new DisputeNotFoundError();
  // Polymorphic guard: milestone disputes resolve here; gig disputes use
  // resolveGigDispute (gigDispute.service.ts).
  if (!dispute.contract || !dispute.milestoneId) {
    throw new InvalidDisputeStageError(
      "This dispute is not milestone-backed; use the gig resolution path.",
    );
  }
  if (dispute.stage !== "STAGE_3_MEDIATION") {
    throw new InvalidDisputeStageError(
      `Cannot resolve a dispute at stage ${dispute.stage}.`,
    );
  }

  const [milestone, freelancerKyc] = await Promise.all([
    prisma.milestone.findUniqueOrThrow({
      where: { id: dispute.milestoneId },
    }),
    prisma.kycRecord.findUnique({
      where: { userId: dispute.contract.freelancerId },
      select: { tin: true },
    }),
  ]);

  // F-05 — derive and validate the split BEFORE the claim, so a malformed
  // or ambiguous award is rejected while the dispute is still open.
  const split = computeDisputeSplit({
    disputedAmountMinor: milestone.amountMinor,
    outcome: params.outcome,
    freelancerSharePct: params.freelancerSharePct,
    freelancerShareMinor: params.freelancerShareMinor,
    freelancerHasTin: Boolean(freelancerKyc?.tin),
  });
  const validatedFreelancerShare =
    params.outcome === "PARTIAL_SPLIT" ? split.freelancerGrossMinor : undefined;

  // Captured into a local so the non-null narrowing survives the transaction
  // callback below, which is a fresh closure scope.
  const contract = dispute.contract;

  // F-04 â€” the claim, the settleability check and EVERY money movement share a
  // single transaction.
  //
  // Previously the claim was its own auto-committed statement and the payout
  // helpers opened their own transactions, so the two could not both fail
  // together: a dispute could be marked RESOLVED and then fail to pay (or the
  // process could die in between), which is what the hand-rolled compensating
  // `dispute.update` below used to paper over. A crash mid-settlement left a
  // RESOLVED dispute with no money moved.
  //
  // Now one failure rolls all of it back: the dispute stays unresolved and no
  // balance moves. The helpers receive `tx`, which also makes them propagate a
  // lost claim instead of swallowing it.
  // Cheap pre-check so an already-resolved dispute never has to take a pooled
// connection for a transaction it cannot use. The stage is already narrowed to
// STAGE_3_MEDIATION by the guard above, so `resolvedAt` is the signal here.
// Correctness still rests on the conditional claim inside the transaction
// below; this only avoids wasting a connection under contention (P2028).
if (dispute.resolvedAt !== null) {
  throw new DisputeAlreadyResolvedError(
    "This dispute has already been resolved.",
  );
}

try {
    await prisma.$transaction(
      async (tx) => {
        // Claim the dispute BEFORE any money moves. A conditional updateMany, so
        // exactly one caller can flip it to RESOLVED; the loser gets count=0 and
        // throws before crediting anybody.
        const claim = await tx.dispute.updateMany({
          where: {
            id: dispute.id,
            stage: { not: "RESOLVED" },
            resolvedAt: null,
          },
          data: {
            stage: "RESOLVED",
            resolvedByStaffId: params.staffUserId,
            resolutionOutcome: params.outcome,
            mediatorRecommendation: params.recommendation,
            freelancerShareMinor: validatedFreelancerShare ?? null,
            resolvedAt: new Date(),
            // The recommendation IS the mediator's answer. If the dispute was
            // never claimed, recording the recommendation is still the first
            // response -- write it, once.
            firstRespondedAt: dispute.firstRespondedAt ?? new Date(),
          },
        });
        if (claim.count === 0) {
          throw new DisputeAlreadyResolvedError(
            "This dispute has already been resolved.",
          );
        }

        // The milestone must still hold the money. A dispute can reach a
        // resolver while the milestone has already been released (auto-release,
        // or a competing settlement), and paying out again duplicates funds.
        // Throwing here rolls the claim back with it â€” no compensating write.
        if (
          !(SETTLEABLE_ESCROW_STATES as readonly string[]).includes(
            milestone.escrowState,
          )
        ) {
          throw new MilestoneNotSettleableError(
            `Cannot settle a dispute: the milestone is already in state ${milestone.escrowState}.`,
          );
        }

        if (params.outcome === "RELEASE_TO_FREELANCER") {
          await releaseMilestoneFunds(
            milestone.id,
            contract.freelancerId,
            milestone.amountMinor,
            { tx },
          );
        } else if (params.outcome === "REFUND_TO_CLIENT") {
          await refundMilestoneToClient(
            milestone.id,
            contract.clientId,
            milestone.amountMinor,
            { tx },
          );
        } else {
          // F-05 â€” the share is validated above, BEFORE the claim and before any
          // movement. `params.freelancerShareMinor!` used to be trusted, and a
          // missing value produced `amountMinor - undefined` = NaN, so neither
          // branch ran and the escrow was silently marked PARTIAL_REFUND with
          // nobody paid.
          const freelancerShare = validatedFreelancerShare!;
          const clientShare = milestone.amountMinor - freelancerShare;
          if (freelancerShare > 0) {
            await releaseMilestoneFunds(
              milestone.id,
              contract.freelancerId,
              freelancerShare,
              { tx },
            );
          }
          if (clientShare > 0) {
            await tx.wallet.update({
              where: { userId: contract.clientId },
              data: { balanceMinor: { increment: clientShare } },
            });

            // The freelancer's share went out through releaseMilestoneFunds,
            // which posts a journal debiting the escrow pool. This branch used
            // to credit the wallet and stop: the pool was debited for the
            // freelancer's portion only, so the client's portion of the
            // escrowed money was never relieved and 2000-LIABILITY-ESCROW kept
            // carrying a liability that had been paid out. The books said the
            // platform still owed every client their disputed money, forever.
            //
            // Together the two journals debit the pool by exactly
            // freelancerShare + clientShare = milestone.amountMinor, matching
            // the funding journal, so the milestone nets to zero.
            await recordDisputeRefundLedger(tx, {
              clientId: contract.clientId,
              milestoneId: milestone.id,
              amountMinor: clientShare,
            });
          }
          await tx.milestone.update({
            where: { id: milestone.id },
            data: { escrowState: "PARTIAL_REFUND" },
          });
        }
      },
      // Default READ COMMITTED isolation, deliberately. Under SERIALIZABLE the two
      // racing transactions abort each other, so whichever one had already
      // moved money could still lose and retry â€” then both callers would fail
      // and nobody would be told they were the second resolver. Under READ
      // COMMITTED the loser's conditional `updateMany` simply blocks on the
      // row lock, re-evaluates its WHERE after the winner commits, matches 0
      // rows, and throws the domain error. Exactly one caller moves money.
      // maxWait/timeout are explicit because an interactive transaction holds a
      // pooled connection for its whole duration, and the default 2s maxWait
      // was not enough for the loser to acquire one under load.
      { maxWait: 15_000, timeout: 20_000 },
    );
  } catch (err) {
    // P2034 = serialization/write conflict, P2002 = unique violation on the
    // concurrent update. Both mean another transaction settled this dispute
    // first, which is exactly what DisputeAlreadyResolvedError describes.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2034" || err.code === "P2002")
    ) {
      throw new DisputeAlreadyResolvedError(
        "This dispute has already been resolved.",
      );
    }
    throw err;
  }

  try {
    await checkAndUpdateContractCompletion(milestone.id);
  } catch (err) {
    logger.error(
      { err, milestoneId: milestone.id },
      "Contract completion check failed after dispute settlement",
    );
  }

  // The claim above already wrote the resolution fields; re-read for the return
  // value so callers get the persisted row.
  const resolved = await prisma.dispute.findUniqueOrThrow({
    where: { id: dispute.id },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "DISPUTE_RESOLVED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { outcome: params.outcome },
  });

  await notificationQueue.add("dispute-resolved", {
    userId: contract.clientId,
    disputeId: dispute.id,
    message: "Your dispute has been resolved.",
  });
  await notificationQueue.add("dispute-resolved", {
    userId: contract.freelancerId,
    disputeId: dispute.id,
    message: "Your dispute has been resolved.",
  });

  logger.info(
    { disputeId: dispute.id, outcome: params.outcome },
    "Dispute resolved",
  );

  return resolved;
}

/**
 * Stage 3 â†’ 4.
 */
export async function escalateToArbitration(params: {
  userId: string;
  disputeId: string;
}) {
  const { dispute, isParty, isAuthorizedStaff } = await getDisputeForActor(
    params.disputeId,
    params.userId,
    "disputes.mediate",
  );
  // F-04 — only a dispute that is genuinely still open may be escalated. This
  // edge used to accept RESOLVED, which let a settled dispute be pushed back
  // to arbitration and then resolved (and paid) a second time.
  if (dispute.stage === "RESOLVED" || dispute.resolvedAt) {
    throw new InvalidDisputeStageError(
      "Cannot escalate a resolved dispute to arbitration.",
    );
  }
  if (dispute.stage !== "STAGE_3_MEDIATION") {
    throw new InvalidDisputeStageError(
      `Cannot escalate to arbitration from stage ${dispute.stage}.`,
    );
  }

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: { stage: "STAGE_4_ARBITRATION" },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "DISPUTE_ESCALATED_TO_ARBITRATION",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: {
      note: "AACCSA filing is a manual, human step — not automated by this platform.",
      escalatedByStaff: isAuthorizedStaff && !isParty,
    },
  });

  logger.warn(
    { disputeId: dispute.id },
    "Dispute escalated to arbitration â€” a human must now actually file with AACCSA; this is not automated.",
  );

  return updated;
}

/**
 * T2-H: Apply a real arbitration award.
 */
export async function applyArbitrationAward(params: {
  staffUserId: string;
  disputeId: string;
  awardReferenceNumber: string;
  outcome: DisputeResolutionOutcome;
  recommendation: string;
  freelancerShareMinor?: number;
  freelancerSharePct?: number;
}) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: { contract: true },
  });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.stage !== "STAGE_4_ARBITRATION") {
    throw new InvalidDisputeStageError(
      `Can only apply an award when stage is STAGE_4_ARBITRATION, current stage: ${dispute.stage}.`,
    );
  }
  // F-04 â€” refuse an award on an already-resolved dispute before the stage
  // rewind below can put it back in play.
  if (dispute.resolvedAt || dispute.resolutionOutcome) {
    throw new DisputeAlreadyResolvedError(
      "This dispute has already been resolved; an award cannot be applied on top of it.",
    );
  }

  // F-04 â€” the rewind is conditional, so a concurrent resolution that lands
  // between the stage read and this write cannot be silently undone.
  const rewind = await prisma.dispute.updateMany({
    where: {
      id: dispute.id,
      stage: "STAGE_4_ARBITRATION",
      resolvedAt: null,
    },
    data: { stage: "STAGE_3_MEDIATION" },
  });
  if (rewind.count === 0) {
    throw new DisputeAlreadyResolvedError(
      "This dispute was resolved before the award could be applied.",
    );
  }

  const resolved = await resolveDispute({
    staffUserId: params.staffUserId,
    disputeId: params.disputeId,
    outcome: params.outcome,
    recommendation: params.recommendation,
    freelancerShareMinor: params.freelancerShareMinor,
    freelancerSharePct: params.freelancerSharePct,
  });

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: { awardReferenceNumber: params.awardReferenceNumber },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "ARBITRATION_AWARD_APPLIED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: {
      awardReferenceNumber: params.awardReferenceNumber,
      outcome: params.outcome,
    },
  });

  logger.info(
    {
      disputeId: dispute.id,
      awardReferenceNumber: params.awardReferenceNumber,
    },
    "Arbitration award applied",
  );

  return updated;
}

/**
 * T2-I: Staff claims a dispute from the mediation queue.
 */
export async function claimDisputeAsMediator(params: {
  staffUserId: string;
  disputeId: string;
}) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
  });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.stage !== "STAGE_3_MEDIATION") {
    throw new InvalidDisputeStageError(
      `Can only claim disputes in STAGE_3_MEDIATION, current: ${dispute.stage}.`,
    );
  }

  await prisma.dispute.updateMany({
    where: { id: params.disputeId, assignedMediatorStaffId: null },
    data: {
      assignedMediatorStaffId: params.staffUserId,
      assignedAt: new Date(),
      // Claiming the case is the first staff response: someone is on it.
      // It stops the first-response SLA clock, and it is written once so a
      // later claim cannot un-breach a dispute that was already missed.
      firstRespondedAt: new Date(),
    },
  });

  const fresh = await prisma.dispute.findUniqueOrThrow({
    where: { id: params.disputeId },
  });
  if (
    fresh.assignedMediatorStaffId &&
    fresh.assignedMediatorStaffId !== params.staffUserId
  ) {
    throw new DisputeAlreadyClaimedError(
      `Dispute already claimed by staff user ${fresh.assignedMediatorStaffId}.`,
    );
  }

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "DISPUTE_MEDIATOR_ASSIGNED",
    entityType: "Dispute",
    entityId: params.disputeId,
    metadata: { assignedMediatorStaffId: params.staffUserId },
  });

  return prisma.dispute.findUniqueOrThrow({ where: { id: params.disputeId } });
}

/**
 * T2-F: Mutual withdrawal / direct settlement.
 */
export async function withdrawDisputeMutually(params: {
  userId: string;
  disputeId: string;
  proposedOutcome: DisputeResolutionOutcome;
  proposedFreelancerShareMinor?: number;
}) {
  const { dispute, isParty } = await getDisputeForActor(
    params.disputeId,
    params.userId,
    "disputes.mediate",
  );
  if (!isParty) {
    throw new NotDisputePartyError(
      "Only contract or order parties can mutually withdraw a dispute.",
    );
  }

  if (
    !["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"].includes(
      dispute.stage,
    )
  ) {
    throw new InvalidDisputeStageError(
      `Cannot mutually withdraw at stage ${dispute.stage}.`,
    );
  }

  if (!dispute.withdrawalRequestedByUserId) {
    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        withdrawalRequestedByUserId: params.userId,
        withdrawalProposedOutcome: params.proposedOutcome,
        withdrawalProposedFreelancerShareMinor:
          params.proposedFreelancerShareMinor ?? null,
      },
    });

    await recordAuditEvent({
      userId: params.userId,
      eventType: "DISPUTE_MUTUAL_WITHDRAWAL_PROPOSED",
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: {
        proposedOutcome: params.proposedOutcome,
        proposedFreelancerShareMinor: params.proposedFreelancerShareMinor,
      },
    });

    const otherPartyId = dispute.contract
      ? dispute.contract.clientId === params.userId
        ? dispute.contract.freelancerId
        : dispute.contract.clientId
      : dispute.gigOrder!.clientId === params.userId
        ? dispute.gigOrder!.gig.freelancerId
        : dispute.gigOrder!.clientId;
    await notificationQueue.add("dispute-mutual-withdrawal-proposed", {
      userId: otherPartyId,
      disputeId: dispute.id,
      message:
        "The other party has proposed a mutual settlement. Review and confirm to close the dispute.",
    });

    return updated;
  }

  if (dispute.withdrawalRequestedByUserId === params.userId) {
    throw new InvalidDisputeStageError(
      "You already proposed withdrawal â€” waiting for the other party to confirm.",
    );
  }

  const outcomeMatches =
    dispute.withdrawalProposedOutcome === params.proposedOutcome;
  const shareMatches =
    params.proposedOutcome !== "PARTIAL_SPLIT" ||
    dispute.withdrawalProposedFreelancerShareMinor ===
      (params.proposedFreelancerShareMinor ?? null);

  if (!outcomeMatches || !shareMatches) {
    throw new MutualWithdrawalOutcomeMismatchError(
      "Proposed outcome does not match the first party's proposal. Both parties must agree on the same outcome and split.",
    );
  }

  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { stage: "STAGE_3_MEDIATION", withdrawalConfirmedAt: new Date() },
  });

  const resolved = await resolveDispute({
    staffUserId: params.userId,
    disputeId: dispute.id,
    outcome: params.proposedOutcome,
    recommendation:
      "Mutual settlement agreed by both parties â€” no staff mediation required.",
    freelancerShareMinor: params.proposedFreelancerShareMinor,
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "DISPUTE_MUTUAL_WITHDRAWAL_CONFIRMED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { outcome: params.proposedOutcome },
  });

  return resolved;
}

async function getDisputeForActor<TIncludeEvidence extends boolean = false>(
  disputeId: string,
  userId: string,
  requiredStaffPermission: "disputes.mediate" | "disputes.view" = "disputes.mediate",
  includeEvidence = false as TIncludeEvidence,
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      ...(includeEvidence ? { evidence: true } : {}),
      contract: true,
      gigOrder: { include: { gig: true } },
    },
  });
  if (!dispute) throw new DisputeNotFoundError();

  // Polymorphic party check: contract disputes carry milestone parties; gig
  // disputes carry the order's client and the gig's freelancer.
  const isContractParty =
    dispute.contract &&
    (dispute.contract.clientId === userId ||
      dispute.contract.freelancerId === userId);
  const isGigParty =
    dispute.gigOrder &&
    (dispute.gigOrder.clientId === userId ||
      dispute.gigOrder.gig.freelancerId === userId);
  const isParty = Boolean(isContractParty || isGigParty);

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffRole: true },
  });
  const isAuthorizedStaff = hasPermission(actor?.staffRole, requiredStaffPermission);

  if (!isParty && !isAuthorizedStaff) {
    throw new NotDisputePartyError(
      `Only dispute parties or staff with ${requiredStaffPermission} permission can perform this action.`,
    );
  }
  return { dispute, isParty, isAuthorizedStaff };
}

export async function getDispute(userId: string, disputeId: string) {
  const { dispute } = await getDisputeForActor(
    disputeId,
    userId,
    "disputes.view",
    true,
  );
  return dispute;
}

export async function getDisputesForUser(userId: string) {
  return prisma.dispute.findMany({
    where: {
      OR: [
        { contract: { OR: [{ clientId: userId }, { freelancerId: userId }] } },
        {
          gigOrder: {
            OR: [{ clientId: userId }, { gig: { freelancerId: userId } }],
          },
        },
      ],
    },
    include: {
      evidence: true,
      contract: {
        select: {
          id: true,
          clientId: true,
          freelancerId: true,
          job: { select: { title: true } },
          milestones: true,
        },
      },
      gigOrder: {
        select: {
          id: true,
          clientId: true,
          gig: { select: { title: true, freelancerId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
