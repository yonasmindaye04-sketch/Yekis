import type { PaymentProvider } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import { calculateFees, type FeeBreakdown } from "./fees.js";
import type { Prisma } from "@prisma/client";
import { telebirrClient } from "./providers/telebirr.client.js";
import { chapaClient } from "./providers/chapa.client.js";
import { cbeClient } from "./providers/cbe.client.js";
import type { PaymentProviderClient } from "./providers/paymentProvider.interface.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { sendInvoiceReceiptEmail } from "../../lib/email/email.service.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import {
  runPostFundingChecks,
  runVelocityCheck,
  runPassThroughCheck,
  checkWalletMismatch,
  WithdrawalHeldForReviewError,
} from "../tms/tms.service.js";
import { checkAndUpdateContractCompletion } from "../contracts/contracts.service.js";

export class MilestoneNotFoundError extends Error {}
export class NotContractPartyError extends Error {}
export class InvalidEscrowStateError extends Error {}
export class ContractNotFullyExecutedError extends Error {}
export class InsufficientBalanceError extends Error {}
export class ActiveContractWithdrawalBlockedError extends Error {}
/** Thrown when a concurrent release path (explicit accept / auto-release /
 * dispute resolution) already claimed the milestone. Treated as a benign no-op. */
export class MilestoneReleaseClaimLostError extends Error {
  constructor(public milestoneId: string) {
    super(`Milestone ${milestoneId} was already settled by another release path`);
  }
}

const PROVIDER_CLIENTS: Record<PaymentProvider, PaymentProviderClient> = {
  TELEBIRR: telebirrClient,
  CHAPA: chapaClient,
  CBE_BIRR: cbeClient,
};

function autoReleaseDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.AUTO_RELEASE_WINDOW_DAYS);
  return d;
}

function warnDate(releaseAt: Date): Date {
  const d = new Date(releaseAt);
  d.setHours(d.getHours() - 24);
  return d;
}

/**
 * Client funds a milestone. Requires the contract to be fully executed
 * (both parties digitally accepted — see contracts.service.ts) before any
 * money moves, per the trust-loop sequencing.
 */
export async function fundMilestone(params: {
  clientId: string;
  milestoneId: string;
  provider: PaymentProvider;
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contract.clientId !== params.clientId) throw new NotContractPartyError();

  if (!milestone.contract.clientAcceptedAt || !milestone.contract.freelancerAcceptedAt) {
    throw new ContractNotFullyExecutedError("Both parties must accept the contract before funding escrow.");
  }
  if (milestone.escrowState !== "PAYMENT_PENDING") {
    throw new InvalidEscrowStateError(`Cannot fund a milestone in state ${milestone.escrowState}.`);
  }

  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: milestone.contract.freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: milestone.amountMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  const client = PROVIDER_CLIENTS[params.provider];
  const initiated = await client.initiatePayment({
    amountMinor: fees.clientTotalChargeMinor,
    currency: "ETB",
    reference: milestone.id,
  });

  await prisma.paymentTransaction.create({
    data: {
      milestoneId: milestone.id,
      provider: params.provider,
      providerTransactionId: initiated.providerTransactionId,
      amountMinor: fees.clientTotalChargeMinor,
      status: "PENDING",
      withholdingTaxMinor: fees.withholdingTaxMinor,
    },
  });

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "ESCROW_FUNDING_INITIATED",
    entityType: "Milestone",
    entityId: milestone.id,
    metadata: { provider: params.provider, amountMinor: fees.clientTotalChargeMinor },
  });

  return { redirectUrl: initiated.redirectUrl, providerTransactionId: initiated.providerTransactionId };
}

/**
 * T1-E: Direct wallet funding — debits client wallet balance immediately.
 */
export async function fundMilestoneFromWallet(params: {
  clientId: string;
  milestoneId: string;
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contract.clientId !== params.clientId) throw new NotContractPartyError();

  if (!milestone.contract.clientAcceptedAt || !milestone.contract.freelancerAcceptedAt) {
    throw new ContractNotFullyExecutedError("Both parties must accept the contract before funding escrow.");
  }
  if (milestone.escrowState !== "PAYMENT_PENDING") {
    throw new InvalidEscrowStateError(`Cannot fund a milestone in state ${milestone.escrowState}.`);
  }

  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: milestone.contract.freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: milestone.amountMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  const wallet = await prisma.wallet.findUnique({ where: { userId: params.clientId } });
  if (!wallet || wallet.balanceMinor < fees.clientTotalChargeMinor) {
    throw new InsufficientBalanceError(
      `Insufficient wallet balance. Required: ${fees.clientTotalChargeMinor} minor units, available: ${wallet?.balanceMinor ?? 0}.`
    );
  }

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: params.clientId },
      data: { balanceMinor: { decrement: fees.clientTotalChargeMinor } },
    }),
    prisma.milestone.update({
      where: { id: milestone.id },
      data: { escrowState: "ESCROW_HELD" },
    }),
  ]);

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "ESCROW_FUNDED_FROM_WALLET",
    entityType: "Milestone",
    entityId: milestone.id,
    metadata: {
      chargedMinor: fees.clientTotalChargeMinor,
      grossMinor: fees.grossAmountMinor,
      platformFeeMinor: fees.platformFeeFromClientMinor,
    },
  });

  await notificationQueue.add("escrow-funded", {
    userId: milestone.contract.freelancerId,
    milestoneId: milestone.id,
    message: "Escrow has been funded from the client's wallet — you can begin work.",
  });

  // Dispatch formal order invoice receipt email to the client
  try {
    const clientUser = await prisma.user.findUnique({ where: { id: params.clientId } });
    const freelancerUser = await prisma.user.findUnique({ where: { id: milestone.contract.freelancerId } });
    if (clientUser && clientUser.email && !clientUser.email.endsWith("@yekis.local")) {
      sendInvoiceReceiptEmail({
        email: clientUser.email,
        recipientName: clientUser.displayName || clientUser.firstName || undefined,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}-${milestone.id.slice(-4).toUpperCase()}`,
        milestoneTitle: milestone.title || "Project Milestone",
        amountEtb: fees.clientTotalChargeMinor / 100,
        payerName: clientUser.displayName || clientUser.firstName || clientUser.email,
        payeeName: freelancerUser?.displayName || freelancerUser?.firstName || "Freelancer",
      }).catch((err) => logger.error({ err }, "Failed to dispatch invoice receipt email"));
    }
  } catch (err) {
    logger.warn({ err }, "Failed to prepare invoice receipt email");
  }

  try {
    await runPostFundingChecks(params.clientId);
  } catch (err) {
    logger.error({ err, milestoneId: milestone.id }, "TMS post-funding check failed");
  }

  return await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
}

/**
 * Webhook entry point. The route layer is responsible for verifying the
 * signature via the matching provider client BEFORE calling this.
 */
export async function handlePaymentWebhook(params: {
  provider: PaymentProvider;
  providerTransactionId: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  rawPayload: unknown;
}) {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { providerTransactionId: params.providerTransactionId },
    include: { milestone: { include: { contract: true } } },
  });

  if (!transaction) {
    logger.warn(
      { providerTransactionId: params.providerTransactionId },
      "Webhook received for unknown transaction — ignoring."
    );
    return;
  }

  if (transaction.status !== "PENDING") {
    logger.info({ transactionId: transaction.id }, "Webhook for already-settled transaction - ignoring.");
    return;
  }

  // Atomic settlement claim: concurrent webhook + reconciliation sweep both
  // funnel through here; exactly one wins the PENDING -> settled flip. The
  // loser gets count=0 and returns before any milestone state changes or
  // duplicate notifications/increments occur.
  const outcome = await prisma.$transaction(async (tx) => {
    const claim = await tx.paymentTransaction.updateMany({
      where: { id: transaction.id, status: "PENDING" },
      data: { status: params.status, rawWebhookPayload: params.rawPayload as never },
    });

    if (claim.count === 0) return "ALREADY_SETTLED" as const;

    if (params.status !== "SUCCESS") {
      await recordAuditEvent({
        eventType: "ESCROW_FUNDING_FAILED",
        entityType: "Milestone",
        entityId: transaction.milestoneId,
        metadata: { provider: params.provider, status: params.status },
      });
      return "FAILED" as const;
    }

    await tx.milestone.update({
      where: { id: transaction.milestoneId },
      data: { escrowState: "ESCROW_HELD" },
    });

    await tx.user.update({
      where: { id: transaction.milestone.contract.clientId },
      data: { totalSpentGrossMinor: { increment: transaction.amountMinor } },
    });

    return "FUNDED" as const;
  });

  if (outcome === "ALREADY_SETTLED") {
    logger.info(
      { transactionId: transaction.id },
      "Settlement claim lost - a concurrent webhook/reconciliation already resolved this transaction."
    );
    return;
  }

  if (outcome === "FAILED") {
    return;
  }

  await recordAuditEvent({
    eventType: "ESCROW_HELD",
    entityType: "Milestone",
    entityId: transaction.milestoneId,
    metadata: { provider: params.provider },
  });

  await notificationQueue.add("escrow-funded", {
    userId: transaction.milestone.contract.freelancerId,
    milestoneId: transaction.milestoneId,
    message: "Escrow has been funded — you can begin work.",
  });

  try {
    await runPostFundingChecks(transaction.milestone.contract.clientId);
  } catch (err) {
    logger.error({ err, milestoneId: transaction.milestoneId }, "TMS post-funding check failed");
  }
}

/** Freelancer marks work as delivered for a funded milestone. */
export async function submitMilestone(params: { freelancerId: string; milestoneId: string; deliverableUrl?: string }) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contract.freelancerId !== params.freelancerId) throw new NotContractPartyError();
  if (milestone.escrowState !== "ESCROW_HELD" && milestone.escrowState !== "WORK_IN_PROGRESS") {
    throw new InvalidEscrowStateError(`Cannot submit a milestone in state ${milestone.escrowState}.`);
  }

  const releaseAt = autoReleaseDate();

  const updated = await prisma.milestone.update({
    where: { id: milestone.id },
    data: { escrowState: "SUBMITTED_FOR_REVIEW", submittedAt: new Date(), autoReleaseAt: releaseAt, deliverableUrl: params.deliverableUrl },
  });

  await autoReleaseQueue.add(
    "warn",
    { milestoneId: milestone.id, kind: "warn" },
    { jobId: `warn-${milestone.id}`, delay: warnDate(releaseAt).getTime() - Date.now() }
  );
  await autoReleaseQueue.add(
    "release",
    { milestoneId: milestone.id, kind: "release" },
    { jobId: `release-${milestone.id}`, delay: releaseAt.getTime() - Date.now() }
  );

  await recordAuditEvent({
    userId: params.freelancerId,
    eventType: "MILESTONE_SUBMITTED",
    entityType: "Milestone",
    entityId: milestone.id,
    metadata: { autoReleaseAt: releaseAt },
  });

  await notificationQueue.add("milestone-submitted", {
    userId: milestone.contract.clientId,
    milestoneId: milestone.id,
    message: "A milestone has been submitted for your review.",
  });

  return updated;
}

/** Client explicitly accepts and releases funds — the non-auto path. */
export async function acceptMilestone(params: { clientId: string; milestoneId: string }) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contract.clientId !== params.clientId) throw new NotContractPartyError();
  if (milestone.escrowState !== "SUBMITTED_FOR_REVIEW") {
    throw new InvalidEscrowStateError(`Cannot accept a milestone in state ${milestone.escrowState}.`);
  }

  await releaseMilestoneFunds(milestone.id, milestone.contract.freelancerId, milestone.amountMinor);

  await autoReleaseQueue.remove(`warn-${milestone.id}`);
  await autoReleaseQueue.remove(`release-${milestone.id}`);

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "MILESTONE_ACCEPTED",
    entityType: "Milestone",
    entityId: milestone.id,
  });

  return prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
}

/**
 * T2-D: VAT registration-threshold alert. Fired (once) when cumulative
 * platform fee revenue crosses VAT_THRESHOLD_MINOR so Finance has lead time
 * to register for VAT before crossing the statutory 500,000 ETB turnover.
 */
async function checkVatThresholdAfterRelease(milestoneId: string) {
  const account = await prisma.platformOperatingAccount.findUnique({
    where: { id: "singleton" },
  });
  if (!account || account.accumulatedFeeMinor < env.VAT_THRESHOLD_MINOR) return;

  const alreadyAlerted = await prisma.transactionFlag.findFirst({
    where: { type: "VAT_THRESHOLD_REACHED" },
    select: { id: true },
  });
  if (alreadyAlerted) return;

  // Attribute to the milestone's client as queue anchor; details make clear
  // this is a platform-level revenue event, not a user AML concern.
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { contract: { select: { clientId: true } } },
  });

  await prisma.transactionFlag.create({
    data: {
      userId: milestone?.contract.clientId ?? (await requireAnyUserForFlag()),
      type: "VAT_THRESHOLD_REACHED",
      status: "PENDING_REVIEW",
      relatedEntityId: milestoneId,
      details: {
        platformLevel: true,
        accumulatedFeeMinor: account.accumulatedFeeMinor,
        vatThresholdMinor: env.VAT_THRESHOLD_MINOR,
        message:
          "Platform fee revenue crossed the VAT pre-alert threshold. Finance must confirm VAT registration status with the accountant before the statutory 500,000 ETB turnover limit is reached.",
      },
    },
  });

  await recordAuditEvent({
    eventType: "VAT_THRESHOLD_ALERT_RAISED",
    entityType: "PlatformOperatingAccount",
    entityId: "singleton",
    metadata: { accumulatedFeeMinor: account.accumulatedFeeMinor },
  });

  await notifyStaffOfEvent({
    eventType: "vat-threshold-reached",
    message:
      "COMPLIANCE: Platform fee revenue crossed the VAT pre-alert threshold. Confirm VAT registration with Finance.",
    metadata: { accumulatedFeeMinor: account.accumulatedFeeMinor },
  });

  logger.warn(
    { accumulatedFeeMinor: account.accumulatedFeeMinor },
    "VAT threshold alert raised"
  );
}

/** Last-resort flag owner if no milestone context exists. */
async function requireAnyUserForFlag(): Promise<string> {
  const anyStaff = await prisma.user.findFirst({
    where: { staffRole: { not: null } },
    select: { id: true },
  });
  if (anyStaff) return anyStaff.id;
  const anyUser = await prisma.user.findFirst({ select: { id: true } });
  if (!anyUser) throw new Error("Cannot raise VAT flag: no users exist");
  return anyUser.id;
}

/**
 * Platform-side ledger writes for a milestone release. Without these,
 * PlatformOperatingAccount stays at zero forever: finance dashboards report
 * no revenue and the VAT threshold alert can never fire.
 *
 * - accumulatedFeeMinor: TOTAL platform revenue (freelancer-side deduction +
 *   client-side add-on released from the escrow pool). This is the figure
 *   VAT_THRESHOLD_MINOR monitoring compares against.
 * - accumulatedWithholdingMinor: running total owed to ERA via the monthly
 *   remittance report (per-transaction detail lives on PaymentTransaction).
 * - One PlatformFeeCredit row per release = append-only reconciliation log.
 */
function recordPlatformEarnings(
  tx: Prisma.TransactionClient,
  fees: FeeBreakdown,
  milestoneId: string,
) {
  const totalFeeMinor =
    fees.platformFeeFromFreelancerMinor + fees.platformFeeFromClientMinor;

  return Promise.all([
    tx.platformOperatingAccount.upsert({
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
    }),
    tx.platformFeeCredit.create({
      data: {
        milestoneId,
        feeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
        feeFromClientMinor: fees.platformFeeFromClientMinor,
        withholdingMinor: fees.withholdingTaxMinor,
      },
    }),
  ]);
}

/** Shared by acceptMilestone (explicit) and the auto-release worker (timeout). */
export async function releaseMilestoneFunds(milestoneId: string, freelancerId: string, amountMinor: number) {
  const freelancerKyc = await prisma.kycRecord.findUnique({ where: { userId: freelancerId } });
  const fees = calculateFees({ milestoneAmountMinor: amountMinor, freelancerHasTin: !!freelancerKyc?.tin });

  await prisma.$transaction(async (tx) => {
    // Atomic claim: exactly ONE concurrent caller (manual accept vs auto-
    // release job firing simultaneously) can flip the milestone into
    // RELEASED. Two entry states are legal here:
    //   SUBMITTED_FOR_REVIEW - normal accept / auto-release timeout
    //   DISPUTED             - staff resolution or arbitration award
    // The loser gets count=0 and throws BEFORE any wallet credit,
    // eliminating the historical double-payout race.
    const claim = await tx.milestone.updateMany({
      where: { id: milestoneId, escrowState: { in: ["SUBMITTED_FOR_REVIEW", "DISPUTED"] } },
      data: { escrowState: "RELEASED", releasedAt: new Date() },
    });

    if (claim.count === 0) {
      throw new MilestoneReleaseClaimLostError(milestoneId);
    }

    await tx.wallet.update({
      where: { userId: freelancerId },
      data: { balanceMinor: { increment: fees.freelancerNetMinor } },
    });

    await tx.user.update({
      where: { id: freelancerId },
      data: { totalEarnedNetMinor: { increment: fees.freelancerNetMinor } },
    });

    // Platform-side ledger entries — without these, platform revenue and
    // withholding remittance reports would permanently read zero.
    await recordPlatformEarnings(tx, fees, milestoneId);
  }).catch((err) => {
    if (err instanceof MilestoneReleaseClaimLostError) {
      logger.info(
        { milestoneId, freelancerId },
        "Release claim lost — another path (explicit accept / auto-release / dispute) settled this milestone first."
      );
      return;
    }
    throw err;
  });

  try {
    await checkVatThresholdAfterRelease(milestoneId);
  } catch (err) {
    logger.error({ err, milestoneId }, "VAT threshold check failed");
  }

  try {
    await checkAndUpdateContractCompletion(milestoneId);
  } catch (err) {
    logger.error({ err, milestoneId }, "Contract completion check failed");
  }

  try {
    await runVelocityCheck(freelancerId);
  } catch (err) {
    logger.error({ err, milestoneId }, "TMS velocity check failed");
  }
}

/**
 * Freelancer withdrawal — gated by Tier 2 KYC at the route layer.
 */
export async function withdrawFromWallet(params: {
  userId: string;
  amountMinor: number;
  provider: PaymentProvider;
  payoutAccountIdentifier: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { role: true } });
  if (user?.role === "CLIENT") {
    const activeContractMilestone = await prisma.milestone.findFirst({
      where: {
        contract: { clientId: params.userId },
        escrowState: { in: ["PAYMENT_PENDING", "ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW"] },
      },
      select: { id: true },
    });
    if (activeContractMilestone) {
      throw new ActiveContractWithdrawalBlockedError(
        "You cannot withdraw while you have active contracts. Wait for all milestones to complete or be refunded."
      );
    }

    const openDispute = await prisma.dispute.findFirst({
      where: {
        contract: { clientId: params.userId },
        stage: { not: "RESOLVED" },
      },
      select: { id: true },
    });
    if (openDispute) {
      throw new ActiveContractWithdrawalBlockedError(
        "You cannot withdraw while you have an open dispute. Wait for the dispute to be resolved."
      );
    }
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet || wallet.balanceMinor < params.amountMinor) {
    throw new InsufficientBalanceError("Requested amount exceeds wallet balance.");
  }

  const identityMatches = await checkWalletMismatch({
    userId: params.userId,
    payoutAccountIdentifier: params.payoutAccountIdentifier,
  });
  if (!identityMatches) {
    throw new WithdrawalHeldForReviewError(
      "Withdrawal destination does not match the identity on file — held for compliance review."
    );
  }

  try {
    await runPassThroughCheck({ userId: params.userId, withdrawalAmountMinor: params.amountMinor });
  } catch (err) {
    logger.error({ err, userId: params.userId }, "TMS pass-through check failed");
  }

  // Atomic conditional decrement: two concurrent withdrawals both pass the
  // pre-check above, but only decrements that still leave balance >= 0
  // succeed. A loser gets count=0 -> InsufficientBalanceError, so the wallet
  // can never go negative under concurrency.
  const debited = await prisma.wallet.updateMany({
    where: { userId: params.userId, balanceMinor: { gte: params.amountMinor } },
    data: { balanceMinor: { decrement: params.amountMinor } },
  });

  if (debited.count === 0) {
    throw new InsufficientBalanceError("Requested amount exceeds wallet balance.");
  }

  await recordAuditEvent({
    userId: params.userId,
    eventType: "WALLET_WITHDRAWAL_INITIATED",
    entityType: "Wallet",
    entityId: wallet.id,
    metadata: { amountMinor: params.amountMinor, provider: params.provider },
  });

  logger.warn(
    { userId: params.userId },
    "Withdrawal payout API not yet implemented for any provider — balance debited but no funds actually sent. Do not deploy to production."
  );

  return { balanceMinor: wallet.balanceMinor - params.amountMinor };
}

/**
 * Refund path for a disputed milestone.
 */
export async function refundMilestoneToClient(milestoneId: string, clientId: string, amountMinor: number) {
  await prisma.$transaction([
    prisma.milestone.update({
      where: { id: milestoneId },
      data: { escrowState: "REFUNDED" },
    }),
    prisma.wallet.update({
      where: { userId: clientId },
      data: { balanceMinor: { increment: amountMinor } },
    }),
  ]);

  try {
    await checkAndUpdateContractCompletion(milestoneId);
  } catch (err) {
    logger.error({ err, milestoneId }, "Contract completion check failed");
  }

  logger.warn(
    { milestoneId },
    "Refund credited to in-platform wallet, not a real provider refund — no refund API is wired up yet."
  );
}

export function getProviderClient(provider: PaymentProvider): PaymentProviderClient {
  return PROVIDER_CLIENTS[provider];
}
