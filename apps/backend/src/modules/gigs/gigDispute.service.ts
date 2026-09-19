// === IMPORTS ===
import type { DisputeCategory, DisputeResolutionOutcome } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notificationQueue, gigAutoReleaseQueue } from "../../queue/queues.js";
import { calculateFees } from "../escrow/fees.js";
import { recordGigPlatformEarnings } from "../gigs/gig.service.js";
import { logger } from "../../lib/logger.js";

/**
 * Gig-order disputes — the polymorphic Dispute refactor (migration
 * 20260829233000). Mirrors the milestone dispute semantics from
 * dispute.service.ts, but the escrow subject is a GigOrder and parties are
 * the order's client and the gig's freelancer.
 *
 * Stages are reused (negotiation → evidence → mediation → arbitration →
 * resolved); the resolution actions move money through the same wallet and
 * platform-fee ledger as acceptGigOrder.
 */

// === ERRORS ===
export class GigDisputeNotFoundError extends Error {}
export class NotGigDisputePartyError extends Error {}
export class InvalidGigDisputeStateError extends Error {}

const NEGOTIATION_WINDOW_DAYS = 7;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Stage 0 → 1 for a gig order in flight (funded, working, or submitted). */
export async function raiseGigDispute(params: {
  raisedByUserId: string;
  gigOrderId: string;
  category: DisputeCategory;
  description: string;
}) {
  const order = await prisma.gigOrder.findUnique({
    where: { id: params.gigOrderId },
    include: { gig: true, package: true },
  });
  if (!order) throw new GigDisputeNotFoundError("Gig order not found.");

  const isParty =
    order.clientId === params.raisedByUserId ||
    order.gig.freelancerId === params.raisedByUserId;
  if (!isParty) throw new NotGigDisputePartyError();

  if (
    !["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW"].includes(
      order.escrowState,
    )
  ) {
    throw new InvalidGigDisputeStateError(
      `Cannot dispute a gig order in state ${order.escrowState}.`,
    );
  }

  const existing = await prisma.dispute.findUnique({
    where: { gigOrderId: order.id },
    select: { id: true },
  });
  if (existing && existing.id !== params.gigOrderId) {
    // unique constraint already guards this; kept for a clean 409
    throw new InvalidGigDisputeStateError(
      "This gig order already has a dispute.",
    );
  }

  const [dispute] = await prisma.$transaction([
    prisma.dispute.create({
      data: {
        gigOrderId: order.id,
        category: params.category,
        description: params.description,
        raisedByUserId: params.raisedByUserId,
        stage: "STAGE_1_NEGOTIATION",
        negotiationDeadlineAt: daysFromNow(NEGOTIATION_WINDOW_DAYS),
      },
    }),
    prisma.gigOrder.update({
      where: { id: order.id },
      data: { escrowState: "DISPUTED", status: "DISPUTED" },
    }),
  ]);

  // A disputed gig order must never auto-release out from under the process.
  try {
    await gigAutoReleaseQueue.remove(`release-${order.id}`);
  } catch {
    // BullMQ no-ops on unknown jobId; ignore cleanup failures.
  }

  await recordAuditEvent({
    userId: params.raisedByUserId,
    eventType: "GIG_DISPUTE_RAISED",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { gigOrderId: order.id, category: params.category },
  });

  const otherPartyId =
    order.clientId === params.raisedByUserId
      ? order.gig.freelancerId
      : order.clientId;

  await notificationQueue.add("dispute-raised", {
    userId: otherPartyId,
    disputeId: dispute.id,
    message: "A dispute has been raised on your gig order.",
  });

  return dispute;
}

/** Party evidence submission — advances negotiation → evidence on first post. */
export async function submitGigDisputeEvidence(params: {
  userId: string;
  disputeId: string;
  statement: string;
}) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: { gigOrder: { include: { gig: true } } },
  });
  if (!dispute || !dispute.gigOrderId || !dispute.gigOrder) {
    throw new GigDisputeNotFoundError();
  }

  const isParty =
    dispute.gigOrder.clientId === params.userId ||
    dispute.gigOrder.gig.freelancerId === params.userId;
  if (!isParty) throw new NotGigDisputePartyError();

  if (dispute.stage === "RESOLVED") {
    throw new InvalidGigDisputeStateError(
      "This dispute is already resolved.",
    );
  }

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      submittedByUserId: params.userId,
      statement: params.statement,
    },
  });

  if (dispute.stage === "STAGE_1_NEGOTIATION") {
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: { stage: "STAGE_2_EVIDENCE" },
    });
  }

  return evidence;
}

/**
 * Staff resolution — mirrors resolveDispute's financial semantics:
 *  - RELEASE_TO_FREELANCER: fees/withholding-aware wallet credit + platform ledger
 *  - REFUND_TO_CLIENT: full order charge back to the client wallet
 *  - PARTIAL_SPLIT: bounded split of the package price
 */
export async function resolveGigDispute(params: {
  staffUserId: string;
  disputeId: string;
  outcome: DisputeResolutionOutcome;
  recommendation: string;
  freelancerShareMinor?: number;
}) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: { gigOrder: { include: { gig: true, package: true } } },
  });
  if (!dispute || !dispute.gigOrderId || !dispute.gigOrder) {
    throw new GigDisputeNotFoundError();
  }
  if (dispute.stage === "RESOLVED") {
    throw new InvalidGigDisputeStateError("Dispute is already resolved.");
  }

  const order = dispute.gigOrder;
  const grossMinor = order.package.priceMinor;

  if (params.outcome === "PARTIAL_SPLIT") {
    const share = params.freelancerShareMinor ?? -1;
    if (share < 0 || share > grossMinor) {
      throw new InvalidGigDisputeStateError(
        "Freelancer share must be between 0 and the package price.",
      );
    }
  }

  if (params.outcome === "RELEASE_TO_FREELANCER") {
    const freelancerKyc = await prisma.kycRecord.findUnique({
      where: { userId: order.gig.freelancerId },
    });
    const fees = calculateFees({
      milestoneAmountMinor: grossMinor,
      freelancerHasTin: !!freelancerKyc?.tin,
    });

    const claim = await prisma.gigOrder.updateMany({
      where: { id: order.id, escrowState: "DISPUTED" },
      data: { escrowState: "RELEASED", status: "COMPLETED", releasedAt: new Date() },
    });
    if (claim.count === 0) {
      throw new InvalidGigDisputeStateError(
        "Another path already settled this gig order.",
      );
    }

    await prisma.wallet.update({
      where: { userId: order.gig.freelancerId },
      data: { balanceMinor: { increment: fees.freelancerNetMinor } },
    });
    await prisma.user.update({
      where: { id: order.gig.freelancerId },
      data: { totalEarnedNetMinor: { increment: fees.freelancerNetMinor } },
    });
    await recordGigPlatformEarnings(fees, order.id);
  } else if (params.outcome === "REFUND_TO_CLIENT") {
    const claim = await prisma.gigOrder.updateMany({
      where: { id: order.id, escrowState: "DISPUTED" },
      data: { escrowState: "REFUNDED", status: "CANCELLED" },
    });
    if (claim.count === 0) {
      throw new InvalidGigDisputeStateError(
        "Another path already settled this gig order.",
      );
    }
    await prisma.wallet.update({
      where: { userId: order.clientId },
      data: { balanceMinor: { increment: order.totalChargeMinor } },
    });
  } else {
    // PARTIAL_SPLIT
    const freelancerShare = params.freelancerShareMinor!;
    const clientShare = grossMinor - freelancerShare;

    const claim = await prisma.gigOrder.updateMany({
      where: { id: order.id, escrowState: "DISPUTED" },
      data: { escrowState: "PARTIAL_REFUND", status: "CANCELLED" },
    });
    if (claim.count === 0) {
      throw new InvalidGigDisputeStateError(
        "Another path already settled this gig order.",
      );
    }

    if (freelancerShare > 0) {
      const freelancerKyc = await prisma.kycRecord.findUnique({
        where: { userId: order.gig.freelancerId },
      });
      const fees = calculateFees({
        milestoneAmountMinor: freelancerShare,
        freelancerHasTin: !!freelancerKyc?.tin,
      });
      await prisma.wallet.update({
        where: { userId: order.gig.freelancerId },
        data: { balanceMinor: { increment: fees.freelancerNetMinor } },
      });
      await recordGigPlatformEarnings(fees, order.id);
    }
    if (clientShare > 0) {
      await prisma.wallet.update({
        where: { userId: order.clientId },
        data: { balanceMinor: { increment: clientShare } },
      });
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
    eventType: "GIG_DISPUTE_RESOLVED",
    entityType: "Dispute",
    entityId: dispute.id,
    amountMinor: grossMinor,
    previousState: { stage: dispute.stage, escrowState: "DISPUTED" },
    newState: { stage: "RESOLVED", outcome: params.outcome },
    metadata: { gigOrderId: order.id },
  });

  await notificationQueue.add("dispute-resolved", {
    userId: order.clientId,
    disputeId: dispute.id,
    message: "Your gig order dispute has been resolved.",
  });
  await notificationQueue.add("dispute-resolved", {
    userId: order.gig.freelancerId,
    disputeId: dispute.id,
    message: "Your gig order dispute has been resolved.",
  });

  logger.info(
    { disputeId: dispute.id, outcome: params.outcome, gigOrderId: order.id },
    "Gig dispute resolved",
  );

  return resolved;
}
