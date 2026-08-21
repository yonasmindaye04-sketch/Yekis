// === IMPORTS ===
import type { DisputeCategory, DisputeResolutionOutcome } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import { releaseMilestoneFunds, refundMilestoneToClient } from "../escrow/escrow.service.js";
import { checkAndUpdateContractCompletion } from "../contracts/contracts.service.js";
import { uploadEvidenceBundle } from "../../lib/objectStore.js";
import { logger } from "../../lib/logger.js";


// === MAIN FUNCTIONS ===
export class DisputeNotFoundError extends Error {}
export class NotDisputePartyError extends Error {}
export class InvalidDisputeStageError extends Error {}
export class MilestoneNotFoundError extends Error {}
export class InvalidEscrowStateForDisputeError extends Error {}
export class MutualWithdrawalOutcomeMismatchError extends Error {}
export class DisputeAlreadyClaimedError extends Error {}

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
    throw new InvalidEscrowStateForDisputeError("Milestone does not belong to the supplied contract.");
  }

  const isParty =
    milestone.contract.clientId === params.raisedByUserId ||
    milestone.contract.freelancerId === params.raisedByUserId;
  if (!isParty) throw new NotDisputePartyError();

  if (!["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW"].includes(milestone.escrowState)) {
    throw new InvalidEscrowStateForDisputeError(
      `Cannot raise a dispute on a milestone in state ${milestone.escrowState}.`
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
    prisma.milestone.update({ where: { id: params.milestoneId }, data: { escrowState: "DISPUTED" } }),
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

  return dispute;
}

/**
 * Stage 1 → 2. Either party may escalate once the negotiation window has
 * passed without resolution. (A "both parties agree to resolve directly"
 * path would close the dispute entirely rather than escalate it — that's
 * the withdrawDispute action below.)
 */
export async function escalateToEvidence(params: { userId: string; disputeId: string }) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (dispute.stage !== "STAGE_1_NEGOTIATION") {
    throw new InvalidDisputeStageError(`Cannot escalate from stage ${dispute.stage}.`);
  }
  if (dispute.negotiationDeadlineAt && dispute.negotiationDeadlineAt > new Date()) {
    throw new InvalidDisputeStageError("Negotiation window has not yet elapsed.");
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
export async function submitEvidence(params: { userId: string; disputeId: string; statement: string }) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (dispute.stage !== "STAGE_2_EVIDENCE" && dispute.stage !== "STAGE_1_NEGOTIATION") {
    throw new InvalidDisputeStageError(`Cannot submit evidence at stage ${dispute.stage}.`);
  }

  await prisma.disputeEvidence.create({
    data: { disputeId: dispute.id, submittedByUserId: params.userId, statement: params.statement },
  });

  const mediationDeadline = daysFromNow(MEDIATION_WINDOW_DAYS);

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: { stage: "STAGE_3_MEDIATION", mediationDeadlineAt: mediationDeadline },
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
    logger.error({ err, disputeId: dispute.id }, "Evidence bundle compilation failed — mediator will see raw statements only")
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

  const milestone = dispute.contract.milestones.find((m) => m.id === dispute.milestoneId);

  // Pull direct message thread if one exists for this job+parties combination.
  // DirectThread is scoped to (jobId, clientId, freelancerId) — exactly what we need.
  const messageThread = await prisma.directThread.findFirst({
    where: {
      jobId: dispute.contract.jobId,
      clientId: dispute.contract.clientId,
      freelancerId: dispute.contract.freelancerId,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" }, select: { senderId: true, body: true, createdAt: true } },
    },
  });

  const bundle = {
    compiledAt: new Date().toISOString(),
    disputeId: dispute.id,
    contractId: dispute.contractId,
    milestoneId: dispute.milestoneId,
    milestone: milestone
      ? { title: milestone.title, amountMinor: milestone.amountMinor, escrowState: milestone.escrowState }
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
export async function getMediationQueue(params?: { page?: number; limit?: number; search?: string; status?: string }) {
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
        { client: { email: { contains: params.search, mode: 'insensitive' } } },
        { freelancer: { email: { contains: params.search, mode: 'insensitive' } } }
      ]
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
    })
  ]);

  return { items, total, page, pageSize: limit };
}

/**
 * Stage 3 decision. This is the money-moving step: RELEASE and REFUND both
 * go through the same fee/withholding-aware or refund paths the Escrow
 * module already exposes, so a dispute resolution is never a special,
 * inconsistent code path for how funds actually move.
 *
 * T1-A FIX: PARTIAL_SPLIT now unconditionally calls checkAndUpdateContractCompletion
 * at the end of the branch — previously it was only called via releaseMilestoneFunds
 * (which only fires when freelancerShare > 0), so a 0/100 split never completed
 * the contract.
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
  if (dispute.stage !== "STAGE_3_MEDIATION") {
    throw new InvalidDisputeStageError(`Cannot resolve a dispute at stage ${dispute.stage}.`);
  }

  const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: dispute.milestoneId } });

  if (params.outcome === "RELEASE_TO_FREELANCER") {
    await releaseMilestoneFunds(milestone.id, dispute.contract.freelancerId, milestone.amountMinor);
  } else if (params.outcome === "REFUND_TO_CLIENT") {
    await refundMilestoneToClient(milestone.id, dispute.contract.clientId, milestone.amountMinor);
  } else {
    // PARTIAL_SPLIT — freelancerShareMinor is guaranteed present by the
    // MediatorResolutionInput schema's refine() at the route layer.
    const freelancerShare = params.freelancerShareMinor!;
    if (freelancerShare > milestone.amountMinor) {
      throw new InvalidDisputeStageError("Freelancer share cannot exceed the milestone amount.");
    }
    const clientShare = milestone.amountMinor - freelancerShare;
    if (freelancerShare > 0) {
      await releaseMilestoneFunds(milestone.id, dispute.contract.freelancerId, freelancerShare);
    }
    if (clientShare > 0) {
      // Credit client's share back to their wallet. Note: refundMilestoneToClient()
      // is NOT used here because it would also update escrowState (to REFUNDED) and
      // call checkAndUpdateContractCompletion, both of which happen unconditionally
      // below for the split case — doing them twice would be incorrect.
      await prisma.wallet.update({
        where: { userId: dispute.contract.clientId },
        data: { balanceMinor: { increment: clientShare } },
      });
    }
    // T1-A FIX: explicitly set the split final state and run completion check.
    // Previously only releaseMilestoneFunds (above) called checkAndUpdateContractCompletion,
    // so when freelancerShare was 0 the call never happened and the contract
    // could never reach COMPLETED.
    await prisma.milestone.update({ where: { id: milestone.id }, data: { escrowState: "PARTIAL_REFUND" } });
    try {
      await checkAndUpdateContractCompletion(milestone.id);
    } catch (err) {
      logger.error({ err, milestoneId: milestone.id }, "Contract completion check failed after PARTIAL_SPLIT");
    }
  }

  const resolved = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      stage: "RESOLVED",
      resolvedByStaffId: params.staffUserId,
      resolutionOutcome: params.outcome,
      mediatorRecommendation: params.recommendation,
      freelancerShareMinor: params.freelancerShareMinor,
      resolvedAt: new Date(),
    },
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

  logger.info({ disputeId: dispute.id, outcome: params.outcome }, "Dispute resolved");

  return resolved;
}

/**
 * Stage 3 → 4. Either party may reject the mediator's recommendation and
 * escalate to real AACCSA arbitration. This does NOT move money — it
 * hands off the compiled evidence as a package, and flags the case for a
 * human to actually file. The milestone stays in DISPUTED state until an
 * arbitration award comes back and a staff member applies it via
 * applyArbitrationAward() below.
 */
export async function escalateToArbitration(params: { userId: string; disputeId: string }) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);
  if (dispute.stage !== "STAGE_3_MEDIATION" && dispute.stage !== "RESOLVED") {
    throw new InvalidDisputeStageError(`Cannot escalate to arbitration from stage ${dispute.stage}.`);
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
    metadata: { note: "AACCSA filing is a manual, human step — not automated by this platform." },
  });

  logger.warn(
    { disputeId: dispute.id },
    "Dispute escalated to arbitration — a human must now actually file with AACCSA; this is not automated."
  );

  return updated;
}

/**
 * T2-H: Apply a real arbitration award that came back from AACCSA or another
 * arbitration body. Staff-only. Reuses the same fund-movement functions as
 * Stage 3 resolution — no new money-movement logic here. Sets the
 * awardReferenceNumber for the compliance record.
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
      `Can only apply an award when stage is STAGE_4_ARBITRATION, current stage: ${dispute.stage}.`
    );
  }

  // Temporarily set stage to STAGE_3_MEDIATION so resolveDispute's stage check passes,
  // then let resolveDispute handle all fund movement and the RESOLVED transition.
  // This reuses the exact same code path rather than duplicating fund-movement logic.
  await prisma.dispute.update({ where: { id: dispute.id }, data: { stage: "STAGE_3_MEDIATION" } });

  const resolved = await resolveDispute({
    staffUserId: params.staffUserId,
    disputeId: params.disputeId,
    outcome: params.outcome,
    recommendation: params.recommendation,
    freelancerShareMinor: params.freelancerShareMinor,
  });

  // Stamp the award reference number on the now-resolved dispute.
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { awardReferenceNumber: params.awardReferenceNumber },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "ARBITRATION_AWARD_APPLIED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { awardReferenceNumber: params.awardReferenceNumber, outcome: params.outcome },
  });

  logger.info({ disputeId: dispute.id, awardReferenceNumber: params.awardReferenceNumber }, "Arbitration award applied");

  return resolved;
}

/**
 * T2-I: Staff claims a dispute from the mediation queue. Atomic — if two
 * staff members call this simultaneously, only one succeeds. The other gets
 * DisputeAlreadyClaimedError (mapped to HTTP 409 at the route layer).
 */
export async function claimDisputeAsMediator(params: { staffUserId: string; disputeId: string }) {
  const dispute = await prisma.dispute.findUnique({ where: { id: params.disputeId } });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.stage !== "STAGE_3_MEDIATION") {
    throw new InvalidDisputeStageError(`Can only claim disputes in STAGE_3_MEDIATION, current: ${dispute.stage}.`);
  }

  // Optimistic atomic claim: only update if assignedMediatorStaffId is still null.
  const result = await prisma.dispute.updateMany({
    where: { id: params.disputeId, assignedMediatorStaffId: null },
    data: { assignedMediatorStaffId: params.staffUserId, assignedAt: new Date() },
  });

  if (result.count === 0) {
    // Either already claimed by someone else or no longer in correct state.
    const fresh = await prisma.dispute.findUniqueOrThrow({ where: { id: params.disputeId } });
    if (fresh.assignedMediatorStaffId && fresh.assignedMediatorStaffId !== params.staffUserId) {
      throw new DisputeAlreadyClaimedError(
        `Dispute already claimed by staff user ${fresh.assignedMediatorStaffId}.`
      );
    }
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
 * T2-F: Mutual withdrawal / direct settlement. Either party proposes an
 * outcome; the other party confirms with a matching outcome. On confirmation,
 * funds move via the same release/refund paths — no staff mediation required.
 *
 * Design decision: the proposing party sets the outcome; the confirming party
 * must supply an exactly matching outcome. This prevents the second party from
 * silently accepting a different split than what was proposed.
 */
export async function withdrawDisputeMutually(params: {
  userId: string;
  disputeId: string;
  proposedOutcome: DisputeResolutionOutcome;
  proposedFreelancerShareMinor?: number;
}) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (!["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"].includes(dispute.stage)) {
    throw new InvalidDisputeStageError(`Cannot mutually withdraw at stage ${dispute.stage}.`);
  }

  // First call: record the proposal.
  if (!dispute.withdrawalRequestedByUserId) {
    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        withdrawalRequestedByUserId: params.userId,
        withdrawalProposedOutcome: params.proposedOutcome,
        withdrawalProposedFreelancerShareMinor: params.proposedFreelancerShareMinor ?? null,
      },
    });

    await recordAuditEvent({
      userId: params.userId,
      eventType: "DISPUTE_MUTUAL_WITHDRAWAL_PROPOSED",
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: { proposedOutcome: params.proposedOutcome, proposedFreelancerShareMinor: params.proposedFreelancerShareMinor },
    });

    // Notify the other party.
    const otherPartyId =
      dispute.contract.clientId === params.userId
        ? dispute.contract.freelancerId
        : dispute.contract.clientId;
    await notificationQueue.add("dispute-mutual-withdrawal-proposed", {
      userId: otherPartyId,
      disputeId: dispute.id,
      message: "The other party has proposed a mutual settlement. Review and confirm to close the dispute.",
    });

    return updated;
  }

  // Second call (confirmation): must be the OTHER party.
  if (dispute.withdrawalRequestedByUserId === params.userId) {
    throw new InvalidDisputeStageError("You already proposed withdrawal — waiting for the other party to confirm.");
  }

  // Outcomes must match exactly to prevent silent acceptance of a different deal.
  const outcomeMatches = dispute.withdrawalProposedOutcome === params.proposedOutcome;
  const shareMatches =
    params.proposedOutcome !== "PARTIAL_SPLIT" ||
    dispute.withdrawalProposedFreelancerShareMinor === (params.proposedFreelancerShareMinor ?? null);

  if (!outcomeMatches || !shareMatches) {
    throw new MutualWithdrawalOutcomeMismatchError(
      "Proposed outcome does not match the first party's proposal. Both parties must agree on the same outcome and split."
    );
  }

  // Outcomes match — apply fund movement via the same Stage 3 path.
  // Temporarily move to STAGE_3_MEDIATION so resolveDispute accepts it.
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { stage: "STAGE_3_MEDIATION", withdrawalConfirmedAt: new Date() },
  });

  const resolved = await resolveDispute({
    staffUserId: params.userId, // the confirming user acts as the "resolver" in this path
    disputeId: dispute.id,
    outcome: params.proposedOutcome,
    recommendation: "Mutual settlement agreed by both parties — no staff mediation required.",
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
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { contract: true } });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.contract.clientId !== userId && dispute.contract.freelancerId !== userId) {
    throw new NotDisputePartyError();
  }
  return dispute;
}

export async function getDispute(userId: string, disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { evidence: true, contract: true },
  });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.contract.clientId !== userId && dispute.contract.freelancerId !== userId) {
    throw new NotDisputePartyError();
  }
  return dispute;
}

export async function getDisputesForUser(userId: string) {
  return prisma.dispute.findMany({
    where: { contract: { OR: [{ clientId: userId }, { freelancerId: userId }] } },
    include: {
      evidence: true,
      contract: { select: { id: true, clientId: true, freelancerId: true, job: { select: { title: true } }, milestones: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}



// === MAIN FUNCTIONS ===


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
    throw new InvalidEscrowStateForDisputeError("Milestone does not belong to the supplied contract.");
  }

  const isParty =
    milestone.contract.clientId === params.raisedByUserId ||
    milestone.contract.freelancerId === params.raisedByUserId;
  if (!isParty) throw new NotDisputePartyError();

  if (!["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW"].includes(milestone.escrowState)) {
    throw new InvalidEscrowStateForDisputeError(
      `Cannot raise a dispute on a milestone in state ${milestone.escrowState}.`
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
    prisma.milestone.update({ where: { id: params.milestoneId }, data: { escrowState: "DISPUTED" } }),
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

  return dispute;
}

/**
 * Stage 1 → 2. Either party may escalate once the negotiation window has
 * passed without resolution. (A "both parties agree to resolve directly"
 * path would close the dispute entirely rather than escalate it — that's
 * a separate withdrawDispute action, not built in this pass.)
 */
export async function escalateToEvidence(params: { userId: string; disputeId: string }) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (dispute.stage !== "STAGE_1_NEGOTIATION") {
    throw new InvalidDisputeStageError(`Cannot escalate from stage ${dispute.stage}.`);
  }
  if (dispute.negotiationDeadlineAt && dispute.negotiationDeadlineAt > new Date()) {
    throw new InvalidDisputeStageError("Negotiation window has not yet elapsed.");
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
 * Stage 2. Either party attaches a written statement. Real "compiled
 * evidence package" per the roadmap (contract terms, delivered files, full
 * message log auto-pulled) is a larger integration once the messaging/chat
 * module exists — this captures the statement piece now and leaves an
 * explicit seam (evidenceBundlePath) for that compiled package later.
 * Submitting evidence auto-advances to Stage 3 so the case becomes visible
 * in the mediator queue without requiring both sides to act first — a
 * mediator can always wait for the other side's statement before deciding.
 */
export async function submitEvidence(params: { userId: string; disputeId: string; statement: string }) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);

  if (dispute.stage !== "STAGE_2_EVIDENCE" && dispute.stage !== "STAGE_1_NEGOTIATION") {
    throw new InvalidDisputeStageError(`Cannot submit evidence at stage ${dispute.stage}.`);
  }

  await prisma.disputeEvidence.create({
    data: { disputeId: dispute.id, submittedByUserId: params.userId, statement: params.statement },
  });

  const mediationDeadline = daysFromNow(MEDIATION_WINDOW_DAYS);

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: { stage: "STAGE_3_MEDIATION", mediationDeadlineAt: mediationDeadline },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "DISPUTE_EVIDENCE_SUBMITTED",
    entityType: "Dispute",
    entityId: dispute.id,
  });

  return updated;
}

/** Compliance Officer / mediator dashboard — everything awaiting a decision. */
export async function getMediationQueue(params?: { page?: number; limit?: number; search?: string; status?: string }) {
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
        { client: { email: { contains: params.search, mode: 'insensitive' } } },
        { freelancer: { email: { contains: params.search, mode: 'insensitive' } } }
      ]
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
    })
  ]);

  return { items, total, page, pageSize: limit };
}

/**
 * Stage 3 decision. This is the money-moving step: RELEASE and REFUND both
 * go through the same fee/withholding-aware or refund paths the Escrow
 * module already exposes, so a dispute resolution is never a special,
 * inconsistent code path for how funds actually move.
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
  if (dispute.stage !== "STAGE_3_MEDIATION") {
    throw new InvalidDisputeStageError(`Cannot resolve a dispute at stage ${dispute.stage}.`);
  }

  const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: dispute.milestoneId } });

  if (params.outcome === "RELEASE_TO_FREELANCER") {
    await releaseMilestoneFunds(milestone.id, dispute.contract.freelancerId, milestone.amountMinor);
  } else if (params.outcome === "REFUND_TO_CLIENT") {
    await refundMilestoneToClient(milestone.id, dispute.contract.clientId, milestone.amountMinor);
  } else {
    // PARTIAL_SPLIT — freelancerShareMinor is guaranteed present by the
    // MediatorResolutionInput schema's refine() at the route layer.
    const freelancerShare = params.freelancerShareMinor!;
    if (freelancerShare > milestone.amountMinor) {
      throw new InvalidDisputeStageError("Freelancer share cannot exceed the milestone amount.");
    }
    const clientShare = milestone.amountMinor - freelancerShare;
    if (freelancerShare > 0) {
      await releaseMilestoneFunds(milestone.id, dispute.contract.freelancerId, freelancerShare);
    }
    if (clientShare > 0) {
      // milestone.escrowState was just set to RELEASED by the call above
      // (if freelancerShare > 0) — refundMilestoneToClient will overwrite
      // it to REFUNDED, which is wrong for a split. Partial-split final
      // state handling is called out explicitly below rather than silently
      // relying on whichever helper ran last.
      await prisma.wallet.update({
        where: { userId: dispute.contract.clientId },
        data: { balanceMinor: { increment: clientShare } },
      });
    }
    // Explicit final state for the split case, overriding whatever the
    // individual helper calls above set the milestone to.
    await prisma.milestone.update({ where: { id: milestone.id }, data: { escrowState: "PARTIAL_REFUND" } });
  }

  const resolved = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      stage: "RESOLVED",
      resolvedByStaffId: params.staffUserId,
      resolutionOutcome: params.outcome,
      mediatorRecommendation: params.recommendation,
      freelancerShareMinor: params.freelancerShareMinor,
      resolvedAt: new Date(),
    },
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

  logger.info({ disputeId: dispute.id, outcome: params.outcome }, "Dispute resolved");

  return resolved;
}

/**
 * Stage 3 → 4. Either party may reject the mediator's recommendation and
 * escalate to real AACCSA arbitration. This does NOT move money — it
 * hands off the compiled evidence (statements collected in Stage 2, plus
 * the mediator's non-binding recommendation) as a package, and flags the
 * case for a human (whoever owns the AACCSA relationship) to actually file.
 * The milestone stays in DISPUTED state until an arbitration award comes
 * back and a staff member applies it via resolveDispute-equivalent action —
 * a real "apply arbitration award" endpoint is a reasonable next addition
 * once the platform has been through this path once in practice.
 */
export async function escalateToArbitration(params: { userId: string; disputeId: string }) {
  const dispute = await getDisputeForParty(params.disputeId, params.userId);
  if (dispute.stage !== "STAGE_3_MEDIATION" && dispute.stage !== "RESOLVED") {
    throw new InvalidDisputeStageError(`Cannot escalate to arbitration from stage ${dispute.stage}.`);
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
    metadata: { note: "AACCSA filing is a manual, human step — not automated by this platform." },
  });

  logger.warn(
    { disputeId: dispute.id },
    "Dispute escalated to arbitration — a human must now actually file with AACCSA; this is not automated."
  );

  return updated;
}

async function getDisputeForParty(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { contract: true } });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.contract.clientId !== userId && dispute.contract.freelancerId !== userId) {
    throw new NotDisputePartyError();
  }
  return dispute;
}

export async function getDispute(userId: string, disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { evidence: true, contract: true },
  });
  if (!dispute) throw new DisputeNotFoundError();
  if (dispute.contract.clientId !== userId && dispute.contract.freelancerId !== userId) {
    throw new NotDisputePartyError();
  }
  return dispute;
}

export async function getDisputesForUser(userId: string) {
  return prisma.dispute.findMany({
    where: { contract: { OR: [{ clientId: userId }, { freelancerId: userId }] } },
    include: {
      evidence: true,
      contract: { select: { id: true, clientId: true, freelancerId: true, job: { select: { title: true } }, milestones: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
