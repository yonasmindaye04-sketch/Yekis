// === IMPORTS ===
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/audit.js";
import { notificationQueue } from "./queues.js";
import { logger } from "../lib/logger.js";
import { calculateFees } from "../modules/escrow/fees.js";

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

  await prisma.$transaction(async (tx) => {
    const claim = await tx.gigOrder.updateMany({
      where: { id: order.id, escrowState: "SUBMITTED_FOR_REVIEW" },
      data: { escrowState: "RELEASED", status: "COMPLETED", releasedAt: new Date() },
    });
    if (claim.count === 0) return;

    await tx.wallet.update({
      where: { userId: order.gig.freelancerId },
      data: { balanceMinor: { increment: fees.freelancerNetMinor } },
    });
    await tx.user.update({
      where: { id: order.gig.freelancerId },
      data: { totalEarnedNetMinor: { increment: fees.freelancerNetMinor } },
    });

    const totalFeeMinor =
      fees.platformFeeFromFreelancerMinor + fees.platformFeeFromClientMinor;
    await tx.platformOperatingAccount.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        accumulatedFeeMinor: totalFeeMinor,
        accumulatedWithholdingMinor: fees.withholdingTaxMinor,
      },
      update: {
        accumulatedFeeMinor: { increment: totalFeeMinor },
        accumulatedWithholdingMinor: { increment: fees.withholdingTaxMinor },
      },
    });
    await tx.platformFeeCredit.create({
      data: {
        gigOrderId: order.id,
        feeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
        feeFromClientMinor: fees.platformFeeFromClientMinor,
        withholdingMinor: fees.withholdingTaxMinor,
      },
    });
  });

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
