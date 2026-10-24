// === IMPORTS ===
import type { PaymentProvider } from "../../schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import {
  uploadTopUpReceipt,
  getSignedObjectUrl,
} from "../../lib/objectStore.js";
import { notificationQueue } from "../../queue/queues.js";
import { recordWalletTopUpLedger } from "../finance/ledger.service.js";
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
 * Compliance/ops queue â€” includes each user's prior top-up track record
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

/** Powers the EvidenceViewer for the receipt photo â€” same short-lived-URL pattern as KYC documents. */
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

  // Staff manual approval credits from an attached receipt rather than a
  // provider callback, so a mock id is legitimate for a locally-created row
  // outside production. In production the guard still applies: an approval must
  // not mint money out of a simulated transaction.
  assertTopUpIsCreditable({ providerTransactionId: topUp.providerTransactionId });

  // Claim-then-credit, not an unconditional write: two staff members clicking
  // approve at the same time must not both credit the wallet. The status
  // predicate makes exactly one of them the winner. Callback form (rather than
  // the array form) because the journal must be in the SAME transaction as the
  // balance â€” posted separately it can fail after the money is already spent.
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.walletTopUp.updateMany({
      where: { id: topUp.id, status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewedByStaffId: params.staffUserId,
        reviewedAt: new Date(),
      },
    });
    if (claim.count === 0) return false;

    await tx.wallet.update({
      where: { id: topUp.walletId },
      data: { balanceMinor: { increment: topUp.amountMinor } },
    });

    await recordWalletTopUpLedger(tx, {
      userId: topUp.userId,
      topUpId: topUp.id,
      amountMinor: topUp.amountMinor,
      provider: topUp.provider,
    });

    return true;
  });
  if (!claimed) throw new TopUpAlreadyResolvedError();

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
 * Distinct from a plain rejection â€” this is for a receipt that looks like
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
    "Top-up flagged as suspicious â€” routed to compliance queue",
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

/**
 * Payment rails that automated checkout is wired up for.
 *
 * CBE Birr and M-Pesa have no approved merchant API, so their clients always
 * throw PaymentProviderUnavailableError. Accepting them at the route and
 * answering 503 described a misconfiguration; it is a product decision that
 * the rail does not exist yet. Each rail can be enabled explicitly via its
 * own env flag once an integration is genuinely live.
 */
export const ENABLED_CHECKOUT_PROVIDERS: ReadonlySet<PaymentProvider> = new Set(
  [
    "TELEBIRR",
    ...(env.CBE_BIRR_CHECKOUT_ENABLED === true ? (["CBE_BIRR"] as const) : []),
    ...(env.MPESA_CHECKOUT_ENABLED === true ? (["M_PESA"] as const) : []),
  ] as PaymentProvider[],
);

/** True when this rail may start an automated checkout. */
export function isCheckoutProviderEnabled(provider: string): boolean {
  return ENABLED_CHECKOUT_PROVIDERS.has(provider as PaymentProvider);
}

/**
 * A provider transaction id that this service invented rather than received
 * from a payment provider.
 *
 * Only the unconfigured-provider path mints one: `mock-telebirr-<uuid>` from
 * telebirr.client's hasCredentials()===false branch. Such an id proves nothing
 * about money movement and must never credit a wallet in production.
 */
export function isSimulatedProviderTransactionId(
  providerTransactionId: string | null | undefined,
): boolean {
  if (!providerTransactionId) return false;
  return /^mock[-_]/i.test(providerTransactionId.trim());
}

export class SimulatedProviderTransactionError extends Error {}

/**
 * Single gate every top-up crediting path must call before crediting.
 *
 * In production a simulated transaction id is refused outright: there is no
 * verified payment behind it. Outside production it is allowed, because the
 * whole point of the mock path is local development.
 */
export function assertTopUpIsCreditable(params: {
  providerTransactionId: string | null | undefined;
  nodeEnv?: string;
}): void {
  const nodeEnv = params.nodeEnv ?? env.NODE_ENV;
  if (nodeEnv !== "production") return;
  if (isSimulatedProviderTransactionId(params.providerTransactionId)) {
    throw new SimulatedProviderTransactionError(
      "Refusing to credit a wallet from a simulated provider transaction in production. " +
        "A mock-* transaction id is minted locally and is not evidence of a payment.",
    );
  }
}

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
  // live hosted checkout (mock/sandbox mode â€” null redirectUrl), the top-up
  // MUST stay CHECKOUT_PENDING until money movement is verified, either by
  //   (a) a signature-verified provider webhook, or
  //   (b) the user attaching a receipt and staff approving it in the manual
  //       review queue (attachReceiptToTopUp below).
  // CBE Birr and M-Pesa currently have NO live verification path, so their
  // top-ups always follow that verified-only manual path â€” auto-approving
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
        "No live checkout for provider â€” top-up stays CHECKOUT_PENDING until a verified webhook or manual receipt review confirms payment.",
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
      "Top-up webhook received for unknown transaction â€” ignoring.",
    );
    return;
  }

  if (topUp.status !== "CHECKOUT_PENDING") {
    logger.info(
      { topUpId: topUp.id, status: topUp.status },
      "Top-up webhook for already-settled top-up â€” ignoring.",
    );
    return;
  }

  if (params.status === "PENDING") {
    logger.info({ topUpId: topUp.id }, "Top-up still pending â€” no action.");
    return;
  }

  if (params.status === "FAILED") {
    const rejected = await prisma.walletTopUp.updateMany({
      where: { id: topUp.id, status: "CHECKOUT_PENDING" },
      data: { status: "REJECTED", rejectionReason: "Payment failed at provider" },
    });
    if (rejected.count === 0) return;

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

  // A simulated transaction id is minted locally by the unconfigured-provider
  // path and is not evidence that money moved. Refuse it before any credit.
  // This is the single gate for every auto-credit path: the Telebirr webhook,
  // the CBE webhook, and the reconciliation sweep all reach this function.
  assertTopUpIsCreditable({ providerTransactionId: params.providerTransactionId });

  // SUCCESS â€” atomically claim the pending top-up and credit exactly once.
  // Duplicate callbacks can arrive concurrently; the status predicate makes
  // only one delivery the winner.
  const credited = await prisma.$transaction(async (tx) => {
    const claim = await tx.walletTopUp.updateMany({
      where: { id: topUp.id, status: "CHECKOUT_PENDING" },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    if (claim.count === 0) return false;
    await tx.wallet.update({
      where: { id: topUp.walletId },
      data: { balanceMinor: { increment: topUp.amountMinor } },
    });
    // Without this journal the cash arrives into the settlement account with
    // no matching credit to the user's liability, so the settlement asset
    // balance only ever falls (payouts) and the DB CHECK that forbids a
    // negative asset aborts the first disbursement. auditLedgerIntegrity()
    // still reported "balanced" because it only compares total debits to
    // total credits â€” a whole missing flow is invisible to it.
    await recordWalletTopUpLedger(tx, {
      userId: topUp.userId,
      topUpId: topUp.id,
      amountMinor: topUp.amountMinor,
      provider: topUp.provider,
    });
    return true;
  });
  if (!credited) return;

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
    "Telebirr checkout top-up auto-approved â€” wallet credited.",
  );
}
