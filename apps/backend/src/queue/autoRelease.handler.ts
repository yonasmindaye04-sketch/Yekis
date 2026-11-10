// === IMPORTS ===
import type { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/audit.js";
import { notificationQueue } from "./queues.js";
import { logger } from "../lib/logger.js";
import { releaseMilestoneFunds } from "../modules/escrow/escrow.service.js";

/**
 * The auto-release job body, split out of the BullMQ worker so it can be
 * exercised directly by the test suite.
 *
 * The worker itself constructs a live Redis consumer on import, so a test
 * that imported it would start consuming the real "auto-release" queue and
 * race every other suite for jobs. Keeping the handler in its own module
 * means a test can call it without a consumer running.
 */
export async function handleAutoReleaseJob(job: {
  data: { milestoneId: string; kind: "warn" | "release" };
}) {
  const { milestoneId, kind } = job.data;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { contract: true },
  });
  if (!milestone) {
    logger.warn(
      { milestoneId },
      "Auto-release job fired for missing milestone - skipping",
    );
    return;
  }

  // Only act if the milestone is still awaiting review - if the client
  // already accepted or a dispute was raised, this job is stale.
  if (milestone.escrowState !== "SUBMITTED_FOR_REVIEW") {
    logger.info(
      { milestoneId, currentState: milestone.escrowState },
      "Auto-release job fired but milestone has moved on - skipping",
    );
    return;
  }

  // T2-E: 7-day cooling-off guard - Electronic Transactions Proclamation No. 1205/2020.
  // If the auto-release job fires while the cooling-off window is still open, skip it -
  // the client's cancellation right takes legal precedence over the auto-release timer.
  if (
    milestone.contract.cancellableUntil &&
    milestone.contract.cancellableUntil > new Date()
  ) {
    logger.warn(
      { milestoneId, cancellableUntil: milestone.contract.cancellableUntil },
      "Auto-release skipped: contract is still within the 7-day cooling-off window (ECA Proclamation 1205/2020)",
    );
    return;
  }

  if (kind === "warn") {
    await notificationQueue.add("auto-release-warning", {
      userId: milestone.contract.clientId,
      milestoneId,
      message:
        "A milestone will auto-release to the freelancer in 24 hours unless you act.",
    });
    return;
  }

  // kind === "release"
  // Uses the same fee/withholding-aware release path as an explicit
  // client acceptance (escrow.service.ts's acceptMilestone) - auto-release
  // must not silently skip the platform fee and withholding tax that the
  // explicit-accept path applies.
  await releaseMilestoneFunds(
    milestoneId,
    milestone.contract.freelancerId,
    milestone.amountMinor,
  );

  await recordAuditEvent({
    eventType: "ESCROW_AUTO_RELEASED",
    entityType: "Milestone",
    entityId: milestoneId,
    metadata: { reason: "No client action within auto-release window" },
  });

  await notificationQueue.add("escrow-released", {
    userId: milestone.contract.freelancerId,
    milestoneId,
    message: "Funds have been released to your wallet.",
  });

  logger.info({ milestoneId }, "Escrow auto-released");
}
