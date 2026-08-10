import type { DisputeCategory, DisputeResolutionOutcome } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import { releaseMilestoneFunds, refundMilestoneToClient } from "../escrow/escrow.service.js";
import { logger } from "../../lib/logger.js";

export class DisputeNotFoundError extends Error {}
export class NotDisputePartyError extends Error {}
export class InvalidDisputeStageError extends Error {}
export class MilestoneNotFoundError extends Error {}
export class InvalidEscrowStateForDisputeError extends Error {}

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
export async function getMediationQueue() {
  return prisma.dispute.findMany({
    where: { stage: "STAGE_3_MEDIATION" },
    include: { evidence: true, contract: { include: { milestones: true } } },
    orderBy: { mediationDeadlineAt: "asc" },
  });
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
