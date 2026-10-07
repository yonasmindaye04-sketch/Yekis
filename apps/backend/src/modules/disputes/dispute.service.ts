// === IMPORTS ===
import type {
  DisputeCategory,
  DisputeResolutionOutcome,
} from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import {
  releaseMilestoneFunds,
  refundMilestoneToClient,
} from "../escrow/escrow.service.js";
import { checkAndUpdateContractCompletion } from "../contracts/contracts.service.js";
import { uploadEvidenceBundle } from "../../lib/objectStore.js";
import { logger } from "../../lib/logger.js";
import { createHash } from "node:crypto";

// === MAIN FUNCTIONS ===
export class DisputeNotFoundError extends Error {}
export class NotDisputePartyError extends Error {}
export class InvalidDisputeStageError extends Error {}
export class MilestoneNotFoundError extends Error {}
export class InvalidEscrowStateForDisputeError extends Error {}
export class MutualWithdrawalOutcomeMismatchError extends Error {}
export class DisputeAlreadyClaimedError extends Error {}
/**
 * F-04 — the dispute was already resolved by someone else, either a concurrent
 * resolution or an earlier one. Thrown BEFORE any money moves, so a losing
 * caller cannot pay a party twice.
 */
export class DisputeAlreadyResolvedError extends Error {}
/**
 * F-04 — the milestone backing this dispute is not in a state that can still be
 * settled (e.g. already RELEASED or REFUNDED). Without this guard a
 * REFUND_TO_CLIENT award could credit a wallet for money that has already been
 * released to the other party.
 */
export class MilestoneNotSettleableError extends Error {}

/**
 * F-04 — escrow states from which a dispute resolution can still move money.
 * Deliberately excludes RELEASED and REFUNDED: those mean the money already
 * went somewhere, and a second movement would duplicate it.
 */
const SETTLEABLE_ESCROW_STATES = [
  "DISPUTED",
  "SUBMITTED_FOR_REVIEW",
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
] as const;

const NEGOTIATION_WINDOW_DAYS = 7; // Stage 1 — matches the roadmap's dispute-flow design
const MEDIATION_WINDOW_DAYS = 5; // Stage 3 target SLA (3-5 business days)

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Stage 0 → 1. Either party can raise a dispute against a milestone that's
 * actively in flight (funded, being worked on, or submitted for review).
 * Critically: this cancels the scheduled auto-release jobs — a milestone
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
  if (!isParty) throw new NotDisputePartyError();

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

  // Defense in depth — see function docstring. Safe to call even if the
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
 * Stage 1 → 2. Either party may escalate once the negotiation window has
 * passed without resolution. (A "both parties agree to resolve directly"
 * path would close the dispute entirely rather than escalate it — that's
 * the withdrawDispute action below.)
 */
export async function escalateToEvidence(params: {
  userId: string;
  disputeId: string;
}) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (dispute.stage !== "STAGE_1_NEGOTIATION") {
    throw new InvalidDisputeStageError(
      `Cannot escalate from stage ${dispute.stage}.`,
    );
  }
  if (
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
  });

  return updated;
}

/**
 * Stage 2. Either party attaches a written statement. Submitting evidence
 * auto-advances to Stage 3 and compiles the evidence bundle (contract terms,
 * all statements, message log if available).
 */
export async function submitEvidence(params: {
  userId: string;
  disputeId: string;
  statement: string;
}) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (
    dispute.stage !== "STAGE_2_EVIDENCE" &&
    dispute.stage !== "STAGE_1_NEGOTIATION"
  ) {
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

  const mediationDeadline = daysFromNow(MEDIATION_WINDOW_DAYS);

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
  });

  // T2-G: Compile evidence bundle asynchronously — do not block the evidence
  // submission response if the object-store upload fails. The mediator queue
  // shows cases even without a compiled bundle; bundle just enriches the view.
  compileEvidenceBundle(dispute.id).catch((err) =>
    logger.error(
      { err, disputeId: dispute.id },
      "Evidence bundle compilation failed — mediator will see raw statements only",
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
  // DirectThread is scoped to (jobId, clientId, freelancerId) — exactly what we need.
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

  return { items, total, page, pageSize: limit };
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
}) {
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

  const milestone = await prisma.milestone.findUniqueOrThrow({
    where: { id: dispute.milestoneId },
  });

  // F-04 — claim the dispute BEFORE any money moves. This is the same pattern
  // releaseMilestoneFunds uses for the milestone: a conditional updateMany
  // inside a transaction, so exactly one caller can flip the dispute to RESOLVED
  // and the loser gets count=0 and throws before crediting anybody. Previously
  // two concurrent resolutions both passed the stage check and both paid.
  const claim = await prisma.dispute.updateMany({
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
      freelancerShareMinor: params.freelancerShareMinor ?? null,
      resolvedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    throw new DisputeAlreadyResolvedError(
      "This dispute has already been resolved.",
    );
  }

  // F-04 — and the milestone must still hold the money. A dispute can reach a
  // resolver while the milestone has already been released (auto-release, or a
  // competing settlement), and paying out again duplicates funds.
  if (!(SETTLEABLE_ESCROW_STATES as readonly string[]).includes(milestone.escrowState)) {
    // Roll the claim back: nothing was paid, so the dispute must stay open.
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        stage: "STAGE_3_MEDIATION",
        resolvedByStaffId: null,
        resolutionOutcome: null,
        mediatorRecommendation: null,
        freelancerShareMinor: null,
        resolvedAt: null,
      },
    });
    throw new MilestoneNotSettleableError(
      `Cannot settle a dispute: the milestone is already in state ${milestone.escrowState}.`,
    );
  }

  if (params.outcome === "RELEASE_TO_FREELANCER") {
    await releaseMilestoneFunds(
      milestone.id,
      dispute.contract.freelancerId,
      milestone.amountMinor,
    );
  } else if (params.outcome === "REFUND_TO_CLIENT") {
    await refundMilestoneToClient(
      milestone.id,
      dispute.contract.clientId,
      milestone.amountMinor,
    );
  } else {
    const freelancerShare = params.freelancerShareMinor!;
    if (freelancerShare > milestone.amountMinor) {
      throw new InvalidDisputeStageError(
        "Freelancer share cannot exceed the milestone amount.",
      );
    }
    const clientShare = milestone.amountMinor - freelancerShare;
    if (freelancerShare > 0) {
      await releaseMilestoneFunds(
        milestone.id,
        dispute.contract.freelancerId,
        freelancerShare,
      );
    }
    if (clientShare > 0) {
      await prisma.wallet.update({
        where: { userId: dispute.contract.clientId },
        data: { balanceMinor: { increment: clientShare } },
      });
    }
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: { escrowState: "PARTIAL_REFUND" },
    });
    try {
      await checkAndUpdateContractCompletion(milestone.id);
    } catch (err) {
      logger.error(
        { err, milestoneId: milestone.id },
        "Contract completion check failed after PARTIAL_SPLIT",
      );
    }
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
    userId: dispute.contract.clientId,
    disputeId: dispute.id,
    message: "Your dispute has been resolved.",
  });
  await notificationQueue.add("dispute-resolved", {
    userId: dispute.contract.freelancerId,
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
 * Stage 3 → 4.
 */
export async function escalateToArbitration(params: {
  userId: string;
  disputeId: string;
}) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);
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
    },
  });

  logger.warn(
    { disputeId: dispute.id },
    "Dispute escalated to arbitration — a human must now actually file with AACCSA; this is not automated.",
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
  // F-04 — refuse an award on an already-resolved dispute before the stage
  // rewind below can put it back in play.
  if (dispute.resolvedAt || dispute.resolutionOutcome) {
    throw new DisputeAlreadyResolvedError(
      "This dispute has already been resolved; an award cannot be applied on top of it.",
    );
  }

  // F-04 — the rewind is conditional, so a concurrent resolution that lands
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
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

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
      "You already proposed withdrawal — waiting for the other party to confirm.",
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
      "Mutual settlement agreed by both parties — no staff mediation required.",
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

async function getDisputeForParty(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { contract: true, gigOrder: { include: { gig: true } } },
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

  if (!isContractParty && !isGigParty) {
    throw new NotDisputePartyError();
  }
  return dispute;
}

export async function getDispute(userId: string, disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      evidence: true,
      contract: true,
      gigOrder: { include: { gig: true } },
    },
  });
  if (!dispute) throw new DisputeNotFoundError();

  const isContractParty =
    dispute.contract &&
    (dispute.contract.clientId === userId ||
      dispute.contract.freelancerId === userId);
  const isGigParty =
    dispute.gigOrder &&
    (dispute.gigOrder.clientId === userId ||
      dispute.gigOrder.gig.freelancerId === userId);

  if (!isContractParty && !isGigParty) {
    throw new NotDisputePartyError();
  }
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
