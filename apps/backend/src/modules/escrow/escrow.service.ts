import type { PaymentProvider } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import { calculateFees } from "./fees.js";
import { telebirrClient } from "./providers/telebirr.client.js";
import { chapaClient } from "./providers/chapa.client.js";
import { cbeClient } from "./providers/cbe.client.js";
import type { PaymentProviderClient } from "./providers/paymentProvider.interface.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
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

  const existingPending = await prisma.paymentTransaction.findFirst({
    where: { milestoneId: milestone.id, status: "PENDING" },
  });
  if (existingPending) {
    await prisma.paymentTransaction.update({
      where: { id: existingPending.id },
      data: { status: "FAILED", rawWebhookPayload: { reason: "Superseded by new funding attempt" } },
    });
  }

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

  if (initiated.providerTransactionId.startsWith("mock-")) {
    setTimeout(() => {
      handlePaymentWebhook({
        provider: params.provider,
        providerTransactionId: initiated.providerTransactionId,
        status: "SUCCESS",
        rawPayload: { status: "success", transaction_id: initiated.providerTransactionId },
      }).catch(err => logger.error({ err }, "Mock webhook failed"));
    }, 2000);
  }

  return { redirectUrl: initiated.redirectUrl, providerTransactionId: initiated.providerTransactionId };
}

/**
 * Client funds a milestone directly from their in-platform wallet balance.
 * This is the primary escrow-funding path — the client's wallet must have
 * sufficient balance before this is called. The external-provider path
 * (fundMilestone) is retained for reference but no longer called from the UI.
 *
 * Atomic: wallet debit and milestone state transition happen in a single
 * Prisma transaction so a server crash mid-way cannot leave the milestone
 * stuck in PAYMENT_PENDING with money already gone from the wallet.
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
    throw new ContractNotFullyExecutedError(
      "Both parties must sign the contract before escrow can be funded."
    );
  }
  if (milestone.escrowState !== "PAYMENT_PENDING") {
    throw new InvalidEscrowStateError(
      `Cannot fund a milestone in state ${milestone.escrowState}.`
    );
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
      `Insufficient wallet balance. Required: ETB ${
        (fees.clientTotalChargeMinor / 100).toFixed(2)
      }, available: ETB ${
        ((wallet?.balanceMinor ?? 0) / 100).toFixed(2)
      }. Please top up your wallet first.`
    );
  }

  // Atomic: debit wallet + lock escrow in one transaction.
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

  // TMS check same as external-provider path — must not break the success
  // response if it fails, so it runs outside the transaction.
  try {
    await runPostFundingChecks(params.clientId);
  } catch (err) {
    logger.error({ err, milestoneId: milestone.id }, "TMS post-funding check failed");
  }

  return await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
}

/**
 * Webhook entry point. The route layer is responsible for verifying the
 * signature via the matching provider client BEFORE calling this — this
 * function assumes the payload is already trusted, so it must never be
 * reachable except through that verified path.
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

  // Idempotency: a provider may retry the same webhook; don't double-process.
  if (transaction.status !== "PENDING") {
    logger.info({ transactionId: transaction.id }, "Webhook for already-settled transaction — ignoring.");
    return;
  }

  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: { status: params.status, rawWebhookPayload: params.rawPayload as never },
  });

  if (params.status !== "SUCCESS") {
    await recordAuditEvent({
      eventType: "ESCROW_FUNDING_FAILED",
      entityType: "Milestone",
      entityId: transaction.milestoneId,
      metadata: { provider: params.provider, status: params.status },
    });
    return;
  }

  await prisma.milestone.update({
    where: { id: transaction.milestoneId },
    data: { escrowState: "ESCROW_HELD" },
  });

  // Gross figure (matches transaction.amountMinor, which already includes
  // the client-side fee add-on) — deliberately not net of anything, since
  // this represents what the client actually paid out, distinct from the
  // freelancer's net-of-fees earnings figure tracked in releaseMilestoneFunds.
  await prisma.user.update({
    where: { id: transaction.milestone.contract.clientId },
    data: { totalSpentGrossMinor: { increment: transaction.amountMinor } },
  });

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

  // TMS check runs after the webhook's own state transition is committed
  // and must never break the webhook's success response — a failed AML
  // check is a logged problem to investigate, not a reason to make a
  // payment provider retry a webhook it already delivered successfully.
  try {
    await runPostFundingChecks(transaction.milestone.contract.clientId);
  } catch (err) {
    logger.error({ err, milestoneId: transaction.milestoneId }, "TMS post-funding check failed");
  }
}

/** Freelancer marks work as delivered for a funded milestone. */
export async function submitMilestone(params: { freelancerId: string; milestoneId: string }) {
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
    data: { escrowState: "SUBMITTED_FOR_REVIEW", submittedAt: new Date(), autoReleaseAt: releaseAt },
  });

  // Schedule the warn + release jobs the already-built auto-release worker
  // expects — jobId is deterministic so it can be cancelled by id if the
  // client acts before either fires (see acceptMilestone/raiseDispute).
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

  // Cancel the now-unnecessary scheduled jobs — best-effort; if they already
  // fired, the worker's own state check (still SUBMITTED_FOR_REVIEW?) is
  // the real safety net, this is just to avoid noise.
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

/** Shared by acceptMilestone (explicit) and the auto-release worker (timeout). */
export async function releaseMilestoneFunds(milestoneId: string, freelancerId: string, amountMinor: number) {
  const freelancerKyc = await prisma.kycRecord.findUnique({ where: { userId: freelancerId } });
  const fees = calculateFees({ milestoneAmountMinor: amountMinor, freelancerHasTin: !!freelancerKyc?.tin });

  // T1-B / T2-A: Credit PlatformOperatingAccount with the platform fee in the same
  // atomic transaction as the freelancer wallet credit. Previously fees.platformFeeFromFreelancerMinor
  // was calculated and then silently discarded — this closes that financial tracking gap.
  // The client-side fee (platformFeeFromClientMinor) was already collected when the client
  // funded escrow; we record it here in the PlatformFeeCredit log for reconciliation.
  const updatedPlatformAccount = await prisma.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { id: milestoneId },
      data: { escrowState: "RELEASED", releasedAt: new Date() },
    });
    await tx.wallet.update({
      where: { userId: freelancerId },
      data: { balanceMinor: { increment: fees.freelancerNetMinor } },
    });
    // Lifetime total, distinct from the wallet balance above (which
    // withdrawal decreases) — this is what a public profile's "earned"
    // figure should read from, and it's already net of fees/withholding.
    await tx.user.update({
      where: { id: freelancerId },
      data: { totalEarnedNetMinor: { increment: fees.freelancerNetMinor } },
    });
    // Upsert the singleton platform operating account row, incrementing accumulated revenue.
    const updated = await tx.platformOperatingAccount.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        accumulatedFeeMinor: fees.platformFeeFromFreelancerMinor,
        accumulatedWithholdingMinor: fees.withholdingTaxMinor,
      },
      update: {
        accumulatedFeeMinor: { increment: fees.platformFeeFromFreelancerMinor },
        accumulatedWithholdingMinor: { increment: fees.withholdingTaxMinor },
      },
    });
    // Append-only credit log for per-milestone reconciliation.
    await tx.platformFeeCredit.create({
      data: {
        milestoneId,
        feeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
        feeFromClientMinor: fees.platformFeeFromClientMinor,
        withholdingMinor: fees.withholdingTaxMinor,
      },
    });
    return updated;
  });

  // T2-D: VAT threshold monitoring — check if cumulative platform fee revenue has
  // crossed the configurable alert threshold. This does NOT register for VAT —
  // it creates a staff-visible flag so Finance has lead time before VAT applies.
  // VAT_THRESHOLD_MINOR defaults to 450,000 ETB (50,000,000 minor = 500,000 ETB threshold,
  // alert set 50,000 ETB below to give lead time). Configure in .env.
  if (updatedPlatformAccount.accumulatedFeeMinor >= env.VAT_THRESHOLD_MINOR) {
    // Check if a flag already exists for this threshold crossing to avoid spamming.
    const existingFlag = await prisma.transactionFlag.findFirst({
      where: { type: "VAT_THRESHOLD_REACHED", status: "PENDING_REVIEW" },
    });
    if (!existingFlag) {
      await prisma.transactionFlag.create({
        data: {
          userId: freelancerId, // closest user context; this is a platform-level event
          type: "VAT_THRESHOLD_REACHED",
          details: {
            accumulatedFeeMinor: updatedPlatformAccount.accumulatedFeeMinor,
            thresholdMinor: env.VAT_THRESHOLD_MINOR,
            triggeredByMilestoneId: milestoneId,
            message:
              "Platform fee revenue has crossed the VAT alert threshold. " +
              "Finance must confirm whether VAT registration is now required before the next milestone release.",
          },
        },
      });
      logger.warn(
        { accumulatedFeeMinor: updatedPlatformAccount.accumulatedFeeMinor, thresholdMinor: env.VAT_THRESHOLD_MINOR },
        "VAT threshold crossed — created compliance flag for Finance review"
      );
    }
  }

  await recordAuditEvent({
    eventType: "PLATFORM_FEE_CREDITED",
    entityType: "Milestone",
    entityId: milestoneId,
    metadata: {
      feeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
      feeFromClientMinor: fees.platformFeeFromClientMinor,
      withholdingMinor: fees.withholdingTaxMinor,
    },
  });

  // A contract is only "complete" once every one of its milestones lands
  // in a terminal state — this milestone releasing may or may not be the
  // last one, checkAndUpdateContractCompletion figures that out.
  try {
    await checkAndUpdateContractCompletion(milestoneId);
  } catch (err) {
    logger.error({ err, milestoneId }, "Contract completion check failed");
  }

  // Same non-blocking pattern as runPostFundingChecks — velocity is
  // naturally evaluated at release time (it counts completed milestones),
  // not at funding time, so it lives here rather than alongside the
  // structuring check.
  try {
    await runVelocityCheck(freelancerId);
  } catch (err) {
    logger.error({ err, milestoneId }, "TMS velocity check failed");
  }
}

/**
 * Freelancer withdrawal — gated by Tier 2 KYC at the route layer
 * (requireKycVerified("TIER_2")), not here. Also gated here by the
 * wallet-mismatch check: a withdrawal destination that doesn't match the
 * identity on file is held for Compliance Officer review rather than
 * silently processed, per the roadmap's "wallet mismatch" AML rule — this
 * is the one TMS check that actually blocks a flow in real time rather
 * than just flagging after the fact, since letting a mismatched payout
 * through and catching it later defeats the point of the check.
 */
export async function withdrawFromWallet(params: {
  userId: string;
  amountMinor: number;
  provider: PaymentProvider;
  payoutAccountIdentifier: string;
}) {
  // Block clients from withdrawing if they have any active contracts
  // (milestones not yet in a terminal state) or open disputes. The funds
  // may still be needed for pending escrow obligations or dispute resolution.
  // Freelancers are not subject to this restriction — they withdraw earned funds.
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

  // Pass-through is flag-only (doesn't block), unlike wallet-mismatch above —
  // it's a weaker, pattern-based signal that's more prone to false positives
  // on a legitimate freelancer who simply finished their only active
  // contract and wants their money, so it goes to the review queue rather
  // than holding real funds on a heuristic alone.
  try {
    await runPassThroughCheck({ userId: params.userId, withdrawalAmountMinor: params.amountMinor });
  } catch (err) {
    logger.error({ err, userId: params.userId }, "TMS pass-through check failed");
  }

  // Debit immediately (optimistic) — a real payout-failure reconciliation
  // job belongs here once the provider clients' payout APIs (distinct from
  // their collection APIs used in fundMilestone) are implemented.
  await prisma.wallet.update({
    where: { userId: params.userId },
    data: { balanceMinor: { decrement: params.amountMinor } },
  });

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
 * Refund path for a disputed milestone. Credits the client's wallet rather
 * than calling a provider refund API — no provider currently has a
 * confirmed refund endpoint wired up (same "collection API stubbed,
 * payout API not implemented" situation as withdrawFromWallet). Flag this
 * for Finance/Product: crediting an in-platform wallet balance versus
 * issuing a real bank/Telebirr refund are different UX and accounting
 * decisions, and this defaults to the simpler one for MVP.
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

  // A refund is just as much a terminal state as a release — the dispute
  // module's PARTIAL_SPLIT path (which calls both this and
  // releaseMilestoneFunds) already gets this check from the release call;
  // this covers the plain REFUND_TO_CLIENT outcome, which never calls
  // releaseMilestoneFunds at all.
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
