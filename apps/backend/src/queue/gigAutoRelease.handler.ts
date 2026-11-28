// === IMPORTS ===
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/audit.js";
import { notificationQueue } from "./queues.js";
import { logger } from "../lib/logger.js";
import { calculateFees } from "../modules/escrow/fees.js";
import { recordGigPlatformEarnings } from "../modules/gigs/gig.service.js";
import {
  recordMilestoneReleaseLedger,
  resolveClientFeeAtRelease,
} from "../modules/finance/ledger.service.js";

/**
 * The gig auto-release job body, extracted from `gigAutoRelease.worker.ts` so
 * tests can invoke the timeout path without instantiating a live Redis worker.
 */
export async function handleGigAutoReleaseJob(job: {
  data: { gigOrderId: string };
}) {
  const { gigOrderId } = job.data;

  const order = await prisma.gigOrder.findUnique({
    where: { id: gigOrderId },
    include: { gig: true, package: true },
  });
  if (!order) {
    logger.warn({ gigOrderId }, "Auto-release fired for missing order — skipping");
    return;
  }
  if (order.escrowState !== "SUBMITTED_FOR_REVIEW") {
    logger.info(
      { gigOrderId, state: order.escrowState },
      "Gig auto-release fired but order has moved on — skipping",
    );
    return;
  }

  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: order.gig.freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: order.package.priceMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.gigOrder.updateMany({
      where: { id: order.id, escrowState: "SUBMITTED_FOR_REVIEW" },
      data: { escrowState: "RELEASED", status: "COMPLETED", releasedAt: new Date() },
    });
    if (claim.count !== 1) return false;

    await tx.wallet.update({
      where: { userId: order.gig.freelancerId },
      data: { balanceMinor: { increment: fees.freelancerNetMinor } },
    });
    await tx.user.update({
      where: { id: order.gig.freelancerId },
      data: { totalEarnedNetMinor: { increment: fees.freelancerNetMinor } },
    });

    const effectiveClientFeeMinor = await resolveClientFeeAtRelease(
      tx,
      order.id,
      fees.platformFeeFromClientMinor,
      "handleGigAutoReleaseJob",
    );
    await recordGigPlatformEarnings(
      tx,
      { ...fees, platformFeeFromClientMinor: effectiveClientFeeMinor },
      order.id,
    );
    await recordMilestoneReleaseLedger(tx, {
      freelancerId: order.gig.freelancerId,
      milestoneId: order.id,
      idempotencyKey: `escrow-release-gig-${order.id}`,
      description: `Gig order auto-release to freelancer wallet`,
      milestoneGrossMinor: order.package.priceMinor,
      freelancerNetMinor: fees.freelancerNetMinor,
      platformFeeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
      paymentProviderFeeMinor: fees.paymentProviderFeeMinor,
      withholdingTaxMinor: fees.withholdingTaxMinor,
    });
    return true;
  });

  if (!claimed) return;

  await recordAuditEvent({
    eventType: "GIG_ORDER_AUTO_RELEASED",
    entityType: "GigOrder",
    entityId: order.id,
    metadata: { reason: "No client action within auto-release window" },
  });

  await notificationQueue.add("gig-order-completed", {
    userId: order.gig.freelancerId,
    gigOrderId: order.id,
    message: "A gig order was auto-released to your wallet.",
  });

  logger.info({ gigOrderId }, "Gig order auto-released");
}
