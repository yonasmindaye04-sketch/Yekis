// === IMPORTS ===
import type { PaymentProvider } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { uploadTopUpReceipt, getSignedObjectUrl } from "../../lib/objectStore.js";
import { notificationQueue } from "../../queue/queues.js";
import { logger } from "../../lib/logger.js";


// === MAIN FUNCTIONS ===
export class TopUpNotFoundError extends Error {}
export class TopUpAlreadyResolvedError extends Error {}

export async function submitTopUp(params: {
  userId: string;
  provider: PaymentProvider;
  amountMinor: number;
  referenceNumber: string;
  fileBuffer: Buffer;
  contentType: string;
}) {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: params.userId } });

  const receiptPath = await uploadTopUpReceipt({
    userId: params.userId,
    fileBuffer: params.fileBuffer,
    contentType: params.contentType,
  });

  const topUp = await prisma.walletTopUp.create({
    data: {
      userId: params.userId,
      walletId: wallet.id,
      provider: params.provider,
      amountMinor: params.amountMinor,
      referenceNumber: params.referenceNumber,
      receiptImagePath: receiptPath,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "TOPUP_SUBMITTED",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: { provider: params.provider, amountMinor: params.amountMinor },
  });

  return topUp;
}

/**
 * Compliance/ops queue — includes each user's prior top-up track record
 * (count and total approved) directly on every row, so a reviewer can see
 * at a glance whether this is a first-time submission or an established
 * pattern, without a separate lookup per item.
 */
export async function getTopUpQueue() {
  const pending = await prisma.walletTopUp.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, email: true, phone: true, ucid: true } } },
    orderBy: { createdAt: "asc" },
  });

  const withHistory = await Promise.all(
    pending.map(async (topUp) => {
      const [approvedCount, approvedTotal, rejectedCount] = await Promise.all([
        prisma.walletTopUp.count({ where: { userId: topUp.userId, status: "APPROVED" } }),
        prisma.walletTopUp.aggregate({
          where: { userId: topUp.userId, status: "APPROVED" },
          _sum: { amountMinor: true },
        }),
        prisma.walletTopUp.count({ where: { userId: topUp.userId, status: "REJECTED" } }),
      ]);
      return {
        ...topUp,
        userHistory: {
          approvedCount,
          approvedTotalMinor: approvedTotal._sum.amountMinor ?? 0,
          rejectedCount,
        },
      };
    })
  );

  return withHistory;
}

/** Powers the EvidenceViewer for the receipt photo — same short-lived-URL pattern as KYC documents. */
export async function getReceiptViewUrl(topUpId: string) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp) throw new TopUpNotFoundError();

  const url = await getSignedObjectUrl(topUp.receiptImagePath);
  return { url, expiresInSeconds: 300 };
}

export async function approveTopUp(params: { staffUserId: string; topUpId: string }) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: params.topUpId } });
  if (!topUp) throw new TopUpNotFoundError();
  if (topUp.status !== "PENDING") throw new TopUpAlreadyResolvedError();

  await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { status: "APPROVED", reviewedByStaffId: params.staffUserId, reviewedAt: new Date() },
    }),
    prisma.wallet.update({
      where: { id: topUp.walletId },
      data: { balanceMinor: { increment: topUp.amountMinor } },
    }),
  ]);

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "TOPUP_APPROVED",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: { amountMinor: topUp.amountMinor, creditedTo: topUp.userId },
  });

  await notificationQueue.add("topup-approved", {
    userId: topUp.userId,
    topUpId: topUp.id,
    message: "Your top-up has been approved and credited to your wallet.",
  });

  logger.info({ topUpId: topUp.id }, "Top-up approved and wallet credited");

  return prisma.walletTopUp.findUniqueOrThrow({ where: { id: topUp.id } });
}

export async function rejectTopUp(params: { staffUserId: string; topUpId: string; rejectionReason: string }) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: params.topUpId } });
  if (!topUp) throw new TopUpNotFoundError();
  if (topUp.status !== "PENDING") throw new TopUpAlreadyResolvedError();

  const updated = await prisma.walletTopUp.update({
    where: { id: topUp.id },
    data: {
      status: "REJECTED",
      reviewedByStaffId: params.staffUserId,
      reviewedAt: new Date(),
      rejectionReason: params.rejectionReason,
    },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "TOPUP_REJECTED",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: { reason: params.rejectionReason },
  });

  await notificationQueue.add("topup-rejected", {
    userId: topUp.userId,
    topUpId: topUp.id,
    message: `Your top-up could not be verified: ${params.rejectionReason}`,
  });

  return updated;
}

/**
 * Distinct from a plain rejection — this is for a receipt that looks like
 * it might be fraudulent or manipulated, not just unclear/mismatched. Marks
 * the top-up FLAGGED (not APPROVED or REJECTED, so it doesn't silently
 * disappear from view as merely "handled") and creates a TransactionFlag
 * so it enters the same TMS compliance queue as automated AML rules.
 */
export async function flagTopUpSuspicious(params: { staffUserId: string; topUpId: string; reason: string }) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: params.topUpId } });
  if (!topUp) throw new TopUpNotFoundError();
  if (topUp.status !== "PENDING") throw new TopUpAlreadyResolvedError();

  const [updated] = await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { status: "FLAGGED", reviewedByStaffId: params.staffUserId, reviewedAt: new Date() },
    }),
    prisma.transactionFlag.create({
      data: {
        userId: topUp.userId,
        type: "STAFF_FLAGGED",
        details: { source: "wallet_topup", topUpId: topUp.id, reason: params.reason },
        relatedEntityId: topUp.id,
      },
    }),
  ]);

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "TOPUP_FLAGGED_SUSPICIOUS",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: { reason: params.reason },
  });

  logger.warn({ topUpId: topUp.id }, "Top-up flagged as suspicious — routed to compliance queue");

  return updated;
}


export async function getUserTopUps(userId: string) { return await prisma.walletTopUp.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }); }
