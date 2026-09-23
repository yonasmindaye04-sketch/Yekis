// === IMPORTS ===
import type { PaymentProvider } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import {
  uploadTopUpReceipt,
  getSignedObjectUrl,
} from "../../lib/objectStore.js";
import { notificationQueue } from "../../queue/queues.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { telebirrClient } from "../escrow/providers/telebirr.client.js";
import { cbeClient } from "../escrow/providers/cbe.client.js";
import { mpesaClient } from "../escrow/providers/mpesa.client.js";
import type { PaymentProviderClient } from "../escrow/providers/paymentProvider.interface.js";

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
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId: params.userId },
  });

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

  await notifyStaffOfEvent({
    eventType: "topup-pending-review",
    message: `New wallet top-up request awaiting receipt verification (${params.provider}).`,
    metadata: { topUpId: topUp.id, targetUserId: params.userId },
  });

  return topUp;
}

/**
 * Compliance/ops queue — includes each user's prior top-up track record
 * (count and total approved) directly on every row, so a reviewer can see
 * at a glance whether this is a first-time submission or an established
 * pattern, without a separate lookup per item.
 */
export async function getTopUpQueue(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.pageSize || 20));

  const where: any = {};
  if (params?.status) {
    if (params.status === "PENDING_REVIEW") {
      where.status = "PENDING";
    } else {
      where.status = params.status;
    }
  } else {
    where.status = "PENDING";
  }

  if (params?.search) {
    where.user = {
      OR: [
        { email: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search } },
      ],
    };
  }

  const [total, pending] = await Promise.all([
    prisma.walletTopUp.count({ where }),
    prisma.walletTopUp.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, phone: true, ucid: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const withHistory = await Promise.all(
    pending.map(async (topUp) => {
      const [approvedCount, approvedTotal, rejectedCount] = await Promise.all([
        prisma.walletTopUp.count({
          where: { userId: topUp.userId, status: "APPROVED" },
        }),
        prisma.walletTopUp.aggregate({
          where: { userId: topUp.userId, status: "APPROVED" },
          _sum: { amountMinor: true },
        }),
        prisma.walletTopUp.count({
          where: { userId: topUp.userId, status: "REJECTED" },
        }),
      ]);
      return {
        ...topUp,
        userHistory: {
          approvedCount,
          approvedTotalMinor: approvedTotal._sum.amountMinor ?? 0,
          rejectedCount,
        },
      };
    }),
  );

  return { items: withHistory, total, page, pageSize: limit };
}

/** Powers the EvidenceViewer for the receipt photo — same short-lived-URL pattern as KYC documents. */
export async function getReceiptViewUrl(topUpId: string) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp) throw new TopUpNotFoundError();

  // Automatic Telebirr checkout top-ups (providerTransactionId set) have no
  // manual receipt photo, so there is nothing to sign a URL for.
  if (!topUp.receiptImagePath) {
    throw new TopUpNotFoundError(
      "This top-up has no receipt image (automatic checkout).",
    );
  }

  const url = await getSignedObjectUrl(topUp.receiptImagePath);
  return { url, expiresInSeconds: 300 };
}

export async function approveTopUp(params: {
  staffUserId: string;
  topUpId: string;
}) {
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: params.topUpId },
  });
  if (!topUp) throw new TopUpNotFoundError();
  if (topUp.status !== "PENDING") throw new TopUpAlreadyResolvedError();

  await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: {
        status: "APPROVED",
        reviewedByStaffId: params.staffUserId,
        reviewedAt: new Date(),
      },
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

export async function rejectTopUp(params: {
  staffUserId: string;
  topUpId: string;
  rejectionReason: string;
}) {
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: params.topUpId },
  });
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
export async function flagTopUpSuspicious(params: {
  staffUserId: string;
  topUpId: string;
  reason: string;
}) {
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: params.topUpId },
  });
  if (!topUp) throw new TopUpNotFoundError();
  if (topUp.status !== "PENDING") throw new TopUpAlreadyResolvedError();

  const [updated] = await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: {
        status: "FLAGGED",
        reviewedByStaffId: params.staffUserId,
        reviewedAt: new Date(),
      },
    }),
    prisma.transactionFlag.create({
      data: {
        userId: topUp.userId,
        type: "STAFF_FLAGGED",
        details: {
          source: "wallet_topup",
          topUpId: topUp.id,
          reason: params.reason,
        },
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

  logger.warn(
    { topUpId: topUp.id },
    "Top-up flagged as suspicious — routed to compliance queue",
  );

  return updated;
}

export async function getUserTopUps(userId: string) {
  return await prisma.walletTopUp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// ---------- Automatic & Manual Multi-Provider Checkout Top-Up ----------

export class TopUpCheckoutError extends Error {}

const CHECKOUT_CLIENTS: Record<PaymentProvider, PaymentProviderClient> = {
  TELEBIRR: telebirrClient,
  CBE_BIRR: cbeClient,
  M_PESA: mpesaClient,
};

/**
 * Initiates an automatic Web / Mobile Checkout for a wallet top-up using Telebirr, CBE Birr, or M-Pesa.
 * Returns a redirect URL that the frontend should send the user to.
 */
export async function initiateCheckoutTopUp(params: {
  userId: string;
  amountMinor: number;
  provider: PaymentProvider;
}) {
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId: params.userId },
  });

  const client = CHECKOUT_CLIENTS[params.provider];
  if (!client) {
    throw new TopUpCheckoutError(
      `Provider ${params.provider} is not supported for checkout`,
    );
  }

  // Use the corresponding payment engine (Telebirr, CBE, or M-Pesa)
  const initiated = await client.initiatePayment({
    amountMinor: params.amountMinor,
    currency: "ETB",
    reference: `Wallet Top-up ${params.provider}`,
  });

  // Create a WalletTopUp record to track this checkout
  const topUp = await prisma.walletTopUp.create({
    data: {
      userId: params.userId,
      walletId: wallet.id,
      provider: params.provider,
      amountMinor: params.amountMinor,
      providerTransactionId: initiated.providerTransactionId,
      status: "CHECKOUT_PENDING",
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "TOPUP_CHECKOUT_INITIATED",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: {
      provider: params.provider,
      amountMinor: params.amountMinor,
      providerTransactionId: initiated.providerTransactionId,
    },
  });

  logger.info(
    { topUpId: topUp.id, providerTransactionId: initiated.providerTransactionId, provider: params.provider },
    `${params.provider} checkout top-up initiated`,
  );

  // SECURITY: never fabricate a successful payment. When the provider has no
  // live hosted checkout (mock/sandbox mode — null redirectUrl), the top-up
  // MUST stay CHECKOUT_PENDING until money movement is verified, either by
  //   (a) a signature-verified provider webhook, or
  //   (b) the user attaching a receipt and staff approving it in the manual
  //       review queue (attachReceiptToTopUp below).
  // CBE Birr and M-Pesa currently have NO live verification path, so their
  // top-ups always follow that verified-only manual path — auto-approving
  // them would credit unbacked money to the wallet.
  //
  // The ONLY exception is the local Telebirr dev sandbox, and only when the
  // operator explicitly opted in (ALLOW_MOCK_PAYMENT_AUTO_APPROVAL=true) AND
  // the process is not running in production mode.
  if (!initiated.redirectUrl) {
    const mockAutoApproveAllowed =
      params.provider === "TELEBIRR" &&
      env.NODE_ENV !== "production" &&
      env.ALLOW_MOCK_PAYMENT_AUTO_APPROVAL;

    if (mockAutoApproveAllowed) {
      setTimeout(async () => {
        try {
          await handleTopUpWebhook({
            providerTransactionId: initiated.providerTransactionId,
            status: "SUCCESS",
            rawPayload: { mock: true, provider: params.provider },
          });
        } catch (mockErr) {
          logger.error({ err: mockErr }, "Mock top-up auto-approval failed");
        }
      }, 1200);
    } else {
      logger.info(
        { topUpId: topUp.id, provider: params.provider },
        "No live checkout for provider — top-up stays CHECKOUT_PENDING until a verified webhook or manual receipt review confirms payment.",
      );
    }
  }

  return {
    topUpId: topUp.id,
    redirectUrl: initiated.redirectUrl,
    providerTransactionId: initiated.providerTransactionId,
  };
}

/**
 * Manual verification fallback: when an automated checkout API fails, or if a user
 * initiated a top-up but the payment gateway failed to confirm via webhook, the user
 * can attach a receipt photo and reference number to transition the top-up into PENDING
 * manual staff review.
 */
export async function attachReceiptToTopUp(params: {
  userId: string;
  topUpId: string;
  referenceNumber: string;
  fileBuffer: Buffer;
  contentType: string;
}) {
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: params.topUpId },
  });
  if (!topUp || topUp.userId !== params.userId) {
    throw new TopUpNotFoundError();
  }
  if (topUp.status !== "CHECKOUT_PENDING" && topUp.status !== "PENDING") {
    throw new TopUpAlreadyResolvedError();
  }

  const receiptPath = await uploadTopUpReceipt({
    userId: params.userId,
    fileBuffer: params.fileBuffer,
    contentType: params.contentType,
  });

  const updated = await prisma.walletTopUp.update({
    where: { id: topUp.id },
    data: {
      receiptImagePath: receiptPath,
      referenceNumber: params.referenceNumber,
      status: "PENDING",
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "TOPUP_RECEIPT_ATTACHED",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: { referenceNumber: params.referenceNumber, provider: topUp.provider },
  });

  await notifyStaffOfEvent({
    eventType: "topup-pending-review",
    message: `Top-up converted to manual receipt review (${updated.provider} - ETB ${(updated.amountMinor / 100).toLocaleString()}).`,
    metadata: { topUpId: topUp.id, targetUserId: params.userId },
  });

  logger.info(
    { topUpId: topUp.id, provider: topUp.provider },
    "Top-up converted to manual receipt review via fallback",
  );

  return updated;
}

/**
 * Handles the Telebirr webhook callback for a wallet top-up.
 * Atomically credits the wallet on success.
 */
export async function handleTopUpWebhook(params: {
  providerTransactionId: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  rawPayload: unknown;
}) {
  const topUp = await prisma.walletTopUp.findFirst({
    where: { providerTransactionId: params.providerTransactionId },
  });

  if (!topUp) {
    logger.warn(
      { providerTransactionId: params.providerTransactionId },
      "Top-up webhook received for unknown transaction — ignoring.",
    );
    return;
  }

  if (topUp.status !== "CHECKOUT_PENDING") {
    logger.info(
      { topUpId: topUp.id, status: topUp.status },
      "Top-up webhook for already-settled top-up — ignoring.",
    );
    return;
  }

  if (params.status === "PENDING") {
    logger.info({ topUpId: topUp.id }, "Top-up still pending — no action.");
    return;
  }

  if (params.status === "FAILED") {
    await prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { status: "REJECTED", rejectionReason: "Payment failed at provider" },
    });

    await recordAuditEvent({
      userId: topUp.userId,
      eventType: "TOPUP_CHECKOUT_FAILED",
      entityType: "WalletTopUp",
      entityId: topUp.id,
      metadata: { providerTransactionId: params.providerTransactionId },
    });

    await notificationQueue.add("topup-failed", {
      userId: topUp.userId,
      message: `Your wallet top-up of ETB ${(topUp.amountMinor / 100).toFixed(2)} was not successful. Please try again.`,
    });

    return;
  }

  // SUCCESS — atomically credit the wallet
  await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    prisma.wallet.update({
      where: { id: topUp.walletId },
      data: { balanceMinor: { increment: topUp.amountMinor } },
    }),
  ]);

  await recordAuditEvent({
    userId: topUp.userId,
    eventType: "TOPUP_AUTO_APPROVED",
    entityType: "WalletTopUp",
    entityId: topUp.id,
    metadata: {
      amountMinor: topUp.amountMinor,
      providerTransactionId: params.providerTransactionId,
    },
  });

  await notificationQueue.add("topup-success", {
    userId: topUp.userId,
    message: `Your wallet has been credited with ETB ${(topUp.amountMinor / 100).toFixed(2)}. Funds are ready to use!`,
  });

  logger.info(
    { topUpId: topUp.id, amountMinor: topUp.amountMinor },
    "Telebirr checkout top-up auto-approved — wallet credited.",
  );
}
