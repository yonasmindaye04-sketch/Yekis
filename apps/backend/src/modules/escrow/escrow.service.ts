import type { PaymentProvider } from "../../schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { autoReleaseQueue, notificationQueue } from "../../queue/queues.js";
import { createHash } from "node:crypto";
import { calculateFees, type FeeBreakdown } from "./fees.js";
import type { Prisma } from "@prisma/client";
import { telebirrClient } from "./providers/telebirr.client.js";
import { cbeClient } from "./providers/cbe.client.js";
import { mpesaClient } from "./providers/mpesa.client.js";
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
import {
  assertWithdrawalApproved,
  consumeWithdrawalApproval,
  verifyWithdrawalOtp,
  WithdrawalOtpRequiredError,
} from "./withdrawalOtp.service.js";
import {
  recordEscrowFundingLedger,
  recordMilestoneReleaseLedger,
  recordDisputeRefundLedger,
  recordWithdrawalDisbursementLedger,
  getUserAccountCode,
} from "../finance/ledger.service.js";

export class MilestoneNotFoundError extends Error {}
export class NotContractPartyError extends Error {}
export class InvalidEscrowStateError extends Error {}
export class ContractNotFullyExecutedError extends Error {}
export class InsufficientBalanceError extends Error {}
export class ActiveContractWithdrawalBlockedError extends Error {}
export class EscrowAdminHoldError extends Error {}
/** The payout destination (user.phone) has never been proven by SMS. */
export class PhoneNotVerifiedError extends Error {}
/** Thrown when a concurrent release path (explicit accept / auto-release /
 * dispute resolution) already claimed the milestone. Treated as a benign no-op. */
export class MilestoneReleaseClaimLostError extends Error {
  constructor(public milestoneId: string) {
    super(
      `Milestone ${milestoneId} was already settled by another release path`,
    );
  }
}

const PROVIDER_CLIENTS: Record<PaymentProvider, PaymentProviderClient> = {
  TELEBIRR: telebirrClient,
  CBE_BIRR: cbeClient,
  M_PESA: mpesaClient,
};

/**
 * The auto-release deadline: AUTO_RELEASE_WINDOW_DAYS calendar days from
 * `from` (Service Agreement Clause 2.2(b) - "seven calendar days").
 *
 * Takes the base instant as an argument so the whole submission can be
 * anchored to ONE clock read. See submitMilestone for why that matters.
 */
function autoReleaseDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + env.AUTO_RELEASE_WINDOW_DAYS);
  return d;
}

/**
 * The 24-hour warning point: exactly 24 hours before the release deadline.
 *
 * Absolute-time subtraction rather than `setHours(getHours() - 24)` on local
 * wall-clock fields, so the warning stays exactly 24 hours ahead of the
 * release even on a host that observes daylight saving. (The release
 * deadline itself is deliberately calendar-day arithmetic, because the
 * Service Agreement says "seven calendar days".)
 */
function warnDate(releaseAt: Date): Date {
  return new Date(releaseAt.getTime() - 24 * 60 * 60 * 1000);
}

export async function assertEscrowNotHeld(milestoneId: string): Promise<void> {
  const hold = await prisma.escrowHold.findFirst({
    where: { milestoneId, active: true },
    select: { reason: true },
    orderBy: { createdAt: "desc" },
  });
  if (hold) throw new EscrowAdminHoldError(`Escrow is on administrative hold: ${hold.reason}`);
}

/**
 * The single place where a funded milestone becomes ESCROW_HELD.
 *
 * Funding source must never change the lifecycle. A milestone funded from the
 * client's in-platform wallet and a milestone funded through a payment
 * provider end in exactly the same state, with the same client-side spend
 * accounting, and differ only in where the money was debited from. This
 * helper is that shared step, so the two paths cannot drift apart again.
 *
 * Runs inside the caller's transaction. The claim is a conditional
 * `updateMany` on `PAYMENT_PENDING`, so exactly one concurrent funding can
 * win and the losers roll their whole transaction back.
 *
 * Returns false when the milestone is not in a fundable state (already
 * funded, or on a contract that is no longer ACTIVE). The caller decides what
 * that means: a provider webhook flags the payment for staff to return, a
 * direct wallet debit fails the request because the money has already left
 * the wallet.
 */
async function placeEscrowHold(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    milestoneId: string;
    totalChargedMinor: number;
  },
): Promise<boolean> {
  const claimed = await tx.milestone.updateMany({
    where: {
      id: params.milestoneId,
      escrowState: "PAYMENT_PENDING",
      // Only a live contract can hold funds. A cooling-off cancellation marks
      // the contract CANCELLED and leaves the milestone in PAYMENT_PENDING,
      // so the contract predicate is what stops that case.
      contract: { status: "ACTIVE" },
    },
    data: { escrowState: "ESCROW_HELD" },
  });

  if (claimed.count !== 1) return false;

  await tx.user.update({
    where: { id: params.clientId },
    data: { totalSpentGrossMinor: { increment: params.totalChargedMinor } },
  });

  return true;
}

/**
 * Client funds a milestone. Requires the contract to be fully executed
 * (both parties digitally accepted â€” see contracts.service.ts) before any
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
  if (milestone.contract.clientId !== params.clientId)
    throw new NotContractPartyError();
  await assertEscrowNotHeld(milestone.id);

  if (
    !milestone.contract.clientAcceptedAt ||
    !milestone.contract.freelancerAcceptedAt
  ) {
    throw new ContractNotFullyExecutedError(
      "Both parties must accept the contract before funding escrow.",
    );
  }
  if (milestone.escrowState !== "PAYMENT_PENDING") {
    throw new InvalidEscrowStateError(
      `Cannot fund a milestone in state ${milestone.escrowState}.`,
    );
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
    metadata: {
      provider: params.provider,
      amountMinor: fees.clientTotalChargeMinor,
    },
  });

  return {
    redirectUrl: initiated.redirectUrl,
    providerTransactionId: initiated.providerTransactionId,
  };
}

/**
 * T1-E: Direct wallet funding â€” debits client wallet balance immediately.
 *
 * The wallet is only the funding SOURCE. It changes where the money comes
 * from, not what happens to it: the milestone still goes into escrow, the
 * freelancer still has to deliver, and the client still has to accept (or
 * wait out the 7-day deemed-acceptance window) before the freelancer is
 * credited. Master Design section 3A.13.6 and Service Agreement Clause 2.2 apply
 * to every funding method.
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
  if (milestone.contract.clientId !== params.clientId)
    throw new NotContractPartyError();
  await assertEscrowNotHeld(milestone.id);

  if (
    !milestone.contract.clientAcceptedAt ||
    !milestone.contract.freelancerAcceptedAt
  ) {
    throw new ContractNotFullyExecutedError(
      "Both parties must accept the contract before funding escrow.",
    );
  }
  if (milestone.escrowState !== "PAYMENT_PENDING") {
    throw new InvalidEscrowStateError(
      `Cannot fund a milestone in state ${milestone.escrowState}.`,
    );
  }

  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: milestone.contract.freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: milestone.amountMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  const wallet = await prisma.wallet.findUnique({
    where: { userId: params.clientId },
  });
  if (!wallet || wallet.balanceMinor < fees.clientTotalChargeMinor) {
    throw new InsufficientBalanceError(
      `Insufficient wallet balance. Required: ${fees.clientTotalChargeMinor} minor units, available: ${wallet?.balanceMinor ?? 0}.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    /**
     * The balance check above is only a fast-fail for a good error message. It
     * is a bare read outside this transaction, so two concurrent fundings both
     * observe the same balance, both pass, and both decrement -- charging the
     * client twice for one milestone and driving the wallet negative, since
     * Wallet.balanceMinor has no CHECK constraint to stop it.
     *
     * The debit is therefore conditional on the balance still being sufficient,
     * evaluated by the same UPDATE that performs it. Exactly one concurrent
     * request can win; the losers get count 0 and the whole transaction rolls
     * back, so no partial escrow is created.
     */
    const debited = await tx.wallet.updateMany({
      where: {
        userId: params.clientId,
        balanceMinor: { gte: fees.clientTotalChargeMinor },
      },
      data: { balanceMinor: { decrement: fees.clientTotalChargeMinor } },
    });
    if (debited.count !== 1) {
      throw new InsufficientBalanceError(
        `Insufficient wallet balance. Required: ${fees.clientTotalChargeMinor} minor units.`,
      );
    }

    // Shared escrow-hold step. Identical to the provider-webhook path: claim
    // PAYMENT_PENDING -> ESCROW_HELD and account the client's spend. The
    // freelancer is NOT credited here -- that happens in releaseMilestoneFunds,
    // after delivery and client acceptance (or the 7-day deemed-acceptance
    // window). The wallet is only where the money came from.
    const held = await placeEscrowHold(tx, {
      clientId: params.clientId,
      milestoneId: milestone.id,
      totalChargedMinor: fees.clientTotalChargeMinor,
    });
    if (!held) {
      throw new InvalidEscrowStateError(
        "This milestone is no longer awaiting payment.",
      );
    }

    // Double-entry general ledger posting: client wallet -> escrow pool.
    // The matching release journal (escrow pool -> freelancer wallet) is
    // posted by releaseMilestoneFunds, not here.
    await recordEscrowFundingLedger(tx, {
      clientId: params.clientId,
      milestoneId: milestone.id,
      totalChargedMinor: fees.clientTotalChargeMinor,
      milestoneGrossMinor: fees.grossAmountMinor,
      platformFeeFromClientMinor: fees.platformFeeFromClientMinor,
    });
  });

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
    message:
      "Escrow has been funded from the client's wallet - you can begin work.",
  });

  await notificationQueue.add("payment-debited", {
    userId: params.clientId,
    milestoneId: milestone.id,
    message:
      "Payment of ETB " +
      (fees.clientTotalChargeMinor / 100).toLocaleString() +
      " for '" +
      milestone.title +
      "' was deducted from your wallet and held in escrow.",
  });

  // Dispatch formal order invoice receipt email to the client
  try {
    const clientUser = await prisma.user.findUnique({
      where: { id: params.clientId },
    });
    const freelancerUser = await prisma.user.findUnique({
      where: { id: milestone.contract.freelancerId },
    });
    if (
      clientUser &&
      clientUser.email &&
      !clientUser.email.endsWith("@yekis.local")
    ) {
      sendInvoiceReceiptEmail({
        email: clientUser.email,
        recipientName:
          clientUser.displayName || clientUser.firstName || undefined,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}-${milestone.id.slice(-4).toUpperCase()}`,
        milestoneTitle: milestone.title || "Project Milestone",
        amountEtb: fees.clientTotalChargeMinor / 100,
        payerName:
          clientUser.displayName || clientUser.firstName || clientUser.email,
        payeeName:
          freelancerUser?.displayName ||
          freelancerUser?.firstName ||
          "Freelancer",
      }).catch((err) =>
        logger.error({ err }, "Failed to dispatch invoice receipt email"),
      );
    }
  } catch (err) {
    logger.warn({ err }, "Failed to prepare invoice receipt email");
  }

  try {
    await runPostFundingChecks(params.clientId);
  } catch (err) {
    logger.error(
      { err, milestoneId: milestone.id },
      "TMS post-funding check failed",
    );
  }

  return await prisma.milestone.findUniqueOrThrow({
    where: { id: milestone.id },
  });
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
      "Webhook received for unknown transaction â€” ignoring.",
    );
    return;
  }

  if (transaction.provider !== params.provider) {
    logger.error(
      { transactionId: transaction.id, expectedProvider: transaction.provider, receivedProvider: params.provider },
      "Payment callback provider does not match the stored transaction â€” rejecting.",
    );
    throw new Error("PAYMENT_PROVIDER_MISMATCH");
  }

  if (transaction.status !== "PENDING") {
    logger.info(
      { transactionId: transaction.id },
      "Webhook for already-settled transaction - ignoring.",
    );
    return;
  }

  // Atomic settlement claim: concurrent webhook + reconciliation sweep both
  // funnel through here; exactly one wins the PENDING -> settled flip. The
  // loser gets count=0 and returns before any milestone state changes or
  // duplicate notifications/increments occur.
  const outcome = await prisma.$transaction(async (tx) => {
    const claim = await tx.paymentTransaction.updateMany({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: params.status,
        rawWebhookPayload: params.rawPayload as never,
      },
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

    // The money DID arrive - the provider says so and the transaction row now
    // records that. But it must not be parked in escrow on a milestone that is
    // no longer fundable.
    //
    // This write used to be unconditional, so a late SUCCESS callback could
    // move a milestone to ESCROW_HELD whatever state it was in. The concrete
    // case: a client cancels during the cooling-off window, which marks the
    // contract CANCELLED and deliberately leaves the milestone in
    // PAYMENT_PENDING - the payment they had already started then succeeds. The
    // old code locked it in escrow on a cancelled contract, where no accept,
    // dispute or refund path can ever reach it. The client's money, held, with
    // no route out.
    //
    // placeEscrowHold owns that decision now (claim + spend accounting), so
    // this path and the direct-wallet path cannot disagree about what
    // "funded" means.
    const funded = await placeEscrowHold(tx, {
      clientId: transaction.milestone.contract.clientId,
      milestoneId: transaction.milestoneId,
      totalChargedMinor: transaction.amountMinor,
    });

    if (!funded) {
      // The money is real and recorded on the transaction; the milestone is not
      // in a state to hold it. Refusing silently would leave a known payment
      // that nobody has been told about, so it is raised for a human to return.
      // NOT auto-refunded: the platform should not move money on a webhook
      // whose destination is in doubt, and this is the path a duplicate or
      // out-of-order delivery would take.
      await recordAuditEvent({
        userId: transaction.milestone.contract.clientId,
        eventType: "ESCROW_FUNDING_ORPHANED",
        entityType: "Milestone",
        entityId: transaction.milestoneId,
        amountMinor: transaction.amountMinor,
        metadata: {
          transactionId: transaction.id,
          provider: params.provider,
          observedEscrowState: transaction.milestone.escrowState,
          contractStatus: transaction.milestone.contract.status,
        },
      });

      await tx.transactionFlag.create({
        data: {
          userId: transaction.milestone.contract.clientId,
          type: "STAFF_FLAGGED",
          status: "PENDING_REVIEW",
          details: {
            transactionId: transaction.id,
            milestoneId: transaction.milestoneId,
            amountMinor: transaction.amountMinor,
            observedEscrowState: transaction.milestone.escrowState,
            contractStatus: transaction.milestone.contract.status,
          },
          relatedEntityId: transaction.id,
        },
      });

      return "ORPHANED" as const;
    }

    return "FUNDED" as const;
  });

  if (outcome === "ALREADY_SETTLED") {
    logger.info(
      { transactionId: transaction.id },
      "Settlement claim lost - a concurrent webhook/reconciliation already resolved this transaction.",
    );
    return;
  }

  if (outcome === "FAILED") {
    return;
  }

  if (outcome === "ORPHANED") {
    // Money received, not placed, not notified as funded. The transaction row
    // says SUCCESS and the flag says a human must return it; do NOT also send
    // the freelancer a "your milestone is funded" notification, because no
    // escrow exists for them to be paid from.
    logger.error(
      { transactionId: params.providerTransactionId, amountMinor: transaction.amountMinor },
      "Payment succeeded for a milestone that is not in a fundable state - flagged for staff, funds NOT placed in escrow.",
    );
    await notifyStaffOfEvent({
      eventType: "PAYMENT_RECEIVED_FOR_UNFUNDABLE_MILESTONE",
      message:
        `A payment of ${transaction.amountMinor} minor units succeeded ` +
        `(${params.provider}) for milestone ${transaction.milestoneId}, which is in state ` +
        `${transaction.milestone.escrowState} on a ${transaction.milestone.contract.status} contract. ` +
        "The funds were received but NOT placed in escrow and must be returned manually.",
      metadata: {
        transactionId: transaction.id,
        milestoneId: transaction.milestoneId,
        amountMinor: transaction.amountMinor,
        provider: params.provider,
      },
    });
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
    message: "Escrow has been funded â€” you can begin work.",
  });

  try {
    await runPostFundingChecks(transaction.milestone.contract.clientId);
  } catch (err) {
    logger.error(
      { err, milestoneId: transaction.milestoneId },
      "TMS post-funding check failed",
    );
  }
}

/** Freelancer marks work as delivered for a funded milestone. */
export async function submitMilestone(params: {
  freelancerId: string;
  milestoneId: string;
  deliverableUrl?: string;
  fileBuffer?: Buffer;
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contract.freelancerId !== params.freelancerId)
    throw new NotContractPartyError();
  if (
    milestone.escrowState !== "ESCROW_HELD" &&
    milestone.escrowState !== "WORK_IN_PROGRESS"
  ) {
    throw new InvalidEscrowStateError(
      `Cannot submit a milestone in state ${milestone.escrowState}.`,
    );
  }

  // ONE clock read for the whole submission.
  //
  // The warn job and the release job must be scheduled from the SAME
  // instant. Reading Date.now() separately for each of them let the
  // milliseconds elapsed between the two queue.add() calls (a Redis
  // round-trip) bleed into the gap between the two delays, so
  // "releaseDelay - warnDelay" came out as DAY minus that elapsed time
  // instead of exactly DAY. Under parallel test load that gap was
  // occasionally a millisecond or two, which made the exact-equality
  // assertion in escrow-wallet-funding-semantics.test.ts flaky.
  const now = new Date();
  const releaseAt = autoReleaseDate(now);
  const nowMs = now.getTime();

  const updated = await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      escrowState: "SUBMITTED_FOR_REVIEW",
      submittedAt: now,
      autoReleaseAt: releaseAt,
      deliverableUrl: params.deliverableUrl,
      deliverableHash: params.fileBuffer
        ? createHash("sha256").update(params.fileBuffer).digest("hex")
        : undefined,
    },
  });

  await autoReleaseQueue.add(
    "warn",
    { milestoneId: milestone.id, kind: "warn" },
    {
      jobId: `warn-${milestone.id}`,
      delay: warnDate(releaseAt).getTime() - nowMs,
    },
  );
  await autoReleaseQueue.add(
    "release",
    { milestoneId: milestone.id, kind: "release" },
    {
      jobId: `release-${milestone.id}`,
      delay: releaseAt.getTime() - nowMs,
    },
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

/** Client explicitly accepts and releases funds â€” the non-auto path. */
export async function acceptMilestone(params: {
  clientId: string;
  milestoneId: string;
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: params.milestoneId },
    include: { contract: true },
  });
  if (!milestone) throw new MilestoneNotFoundError();
  if (milestone.contract.clientId !== params.clientId)
    throw new NotContractPartyError();
  if (milestone.escrowState !== "SUBMITTED_FOR_REVIEW") {
    throw new InvalidEscrowStateError(
      `Cannot accept a milestone in state ${milestone.escrowState}.`,
    );
  }

  await releaseMilestoneFunds(
    milestone.id,
    milestone.contract.freelancerId,
    milestone.amountMinor,
  );

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
    "VAT threshold alert raised",
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
export async function releaseMilestoneFunds(
  milestoneId: string,
  freelancerId: string,
  amountMinor: number,
  /**
   * F-04 â€” compose into a caller's transaction.
   *
   * When `tx` is supplied the claim and the credits run inside that
   * transaction, and a lost claim THROWS instead of being swallowed. Callers
   * that must settle money and their own bookkeeping together (dispute
   * resolution) depend on that: if the claim is lost the whole transaction
   * rolls back, so the dispute cannot end up marked RESOLVED with no payout.
   *
   * Without `tx` the historical standalone behaviour is preserved: own
   * transaction, log-and-return on a lost claim, then best-effort post-steps.
   */
  opts: { tx?: Prisma.TransactionClient } = {},
) {
  const outerTx = opts.tx;

  if (!outerTx) {
    await assertEscrowNotHeld(milestoneId);
  }
  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: amountMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  const settle = async (tx: Prisma.TransactionClient) => {
    // Atomic claim: exactly ONE concurrent caller (manual accept vs auto-
    // release job firing simultaneously) can flip the milestone into
    // RELEASED. Two entry states are legal here:
    //   SUBMITTED_FOR_REVIEW - normal accept / auto-release timeout
    //   DISPUTED             - staff resolution or arbitration award
    // The loser gets count=0 and throws BEFORE any wallet credit,
    // eliminating the historical double-payout race.
    //
    // ESCROW_HELD and WORK_IN_PROGRESS are deliberately NOT legal entry
    // states. Releasing from them would let a milestone pay out without the
    // freelancer ever delivering and without the client ever accepting --
    // the escrow guarantee (Master Design 3A.13.6, Service Agreement Clause
    // 2.2) would be bypassed on the delivery step itself.
    const claim = await tx.milestone.updateMany({
      where: {
        id: milestoneId,
        escrowState: { in: ["SUBMITTED_FOR_REVIEW", "DISPUTED"] },
        escrowHolds: { none: { active: true } },
      },
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

    // Platform-side ledger entries â€” without these, platform revenue and
    // withholding remittance reports would permanently read zero.
    await recordPlatformEarnings(tx, fees, milestoneId);

    // Double-entry general ledger posting
    await recordMilestoneReleaseLedger(tx, {
      freelancerId,
      milestoneId,
      milestoneGrossMinor: amountMinor,
      freelancerNetMinor: fees.freelancerNetMinor,
      platformFeeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
      paymentProviderFeeMinor: fees.paymentProviderFeeMinor,
      withholdingTaxMinor: fees.withholdingTaxMinor,
    });
  };

  // Composed call: stay inside the caller's transaction, let a lost claim
  // propagate so the caller rolls back, and skip the post-steps (the caller
  // owns the surrounding lifecycle).
  if (outerTx) {
    await settle(outerTx);
    return;
  }

  await prisma.$transaction(settle).catch((err) => {
    if (err instanceof MilestoneReleaseClaimLostError) {
      logger.info(
        { milestoneId, freelancerId },
        "Release claim lost â€” another path (explicit accept / auto-release / dispute) settled this milestone first.",
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
 *
 * `otpCode` is the SMS approval code for THIS payout. It is optional in the
 * type so that a caller who forgets it gets a clear error rather than a
 * crash; it is not optional in practice, because the code is verified below
 * before any money moves.
 */
export async function withdrawFromWallet(params: {
  userId: string;
  amountMinor: number;
  provider: PaymentProvider;
  payoutAccountIdentifier: string;
  otpCode?: string;
}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
  });

  // The payout destination is `user.phone`. Sending bank money to a number the
  // platform never proved the account holder controls means sending it to
  // whoever that number belongs to â€” and the SMS OTP flow that would have
  // caught that existed but wrote its result nowhere.
  //
  // Placed before every balance and contract check: an unverified destination
  // invalidates the withdrawal itself, so there is nothing to weigh it against.
  // Tier-2 KYC is not a substitute. KYC proves an identity document belongs to
  // a person; it says nothing about whether that person's phone is their phone.
  if (!user.phoneVerifiedAt) {
    throw new PhoneNotVerifiedError(
      "Verify your phone number before withdrawing. We send payouts to the number on your account, so we have to confirm it is yours.",
    );
  }

// F-22: the "you are holding money for someone else" check must not be gated
  // on the role STRING â€” a BOTH account can hire, so `user.role === "CLIENT"`
  // let it skip the check entirely. It is instead gated on the FACT that
  // matters: being the paying party on a contract that holds funded money.
  //
  // Why client-side only. The payer is the party whose balance the escrow is
  // earmarked from; that money is committed and must not be withdrawn while the
  // work is in flight. The freelancer's balance is their earned money from
  // OTHER, already-completed work, and blocking them would trap earnings they
  // are entitled to. A `BOTH` user is therefore blocked exactly when they are
  // the client on an in-flight contract, and free to withdraw otherwise.
  //
  // PAYMENT_PENDING is deliberately EXCLUDED. That state is pre-funding: no
  // money has been taken from anyone, so nothing is at risk. A client can cancel
  // such a contract outright under the cooling-off right. Including it would
  // block a withdrawal over money the user never actually paid.
  const fundedEscrowStates = [
    "ESCROW_HELD",
    "WORK_IN_PROGRESS",
    "SUBMITTED_FOR_REVIEW",
  ] as const;

  const inFlightFundedContract = await prisma.milestone.findFirst({
    where: {
      escrowState: { in: [...fundedEscrowStates] },
      contract: { clientId: params.userId },
    },
    select: { id: true },
  });
  if (inFlightFundedContract) {
    throw new ActiveContractWithdrawalBlockedError(
      "You cannot withdraw while a contract you are paying for still holds funds in escrow. Wait for all milestones to complete or be refunded.",
    );
  }

  // An open dispute likewise blocks only the party holding the escrowed funds
  // (the client). The outcome decides whose money it is, so the payer cannot
  // take it out while it is undecided. The freelancer's unrelated available
  // balance is unaffected by someone else's dispute.
  const openDisputeAsClient = await prisma.dispute.findFirst({
    where: {
      stage: { not: "RESOLVED" },
      contract: { clientId: params.userId },
    },
    select: { id: true },
  });
  if (openDisputeAsClient) {
    throw new ActiveContractWithdrawalBlockedError(
      "You cannot withdraw while you have an open dispute. Wait for the dispute to be resolved.",
    );
  }

  if (user.isComplianceHeld) {
    throw new Error(
      "Your account is under compliance review. Withdrawals are temporarily restricted.",
    );
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: params.userId },
  });
  if (!wallet || wallet.balanceMinor < params.amountMinor) {
    throw new InsufficientBalanceError(
      "Requested amount exceeds wallet balance.",
    );
  }

  const identityMatches = await checkWalletMismatch({
    userId: params.userId,
    payoutAccountIdentifier: params.payoutAccountIdentifier,
  });
  if (!identityMatches) {
    throw new WithdrawalHeldForReviewError(
      "Withdrawal destination does not match the identity on file â€” held for compliance review.",
    );
  }

  try {
    await runPassThroughCheck({
      userId: params.userId,
      withdrawalAmountMinor: params.amountMinor,
    });
  } catch (err) {
    logger.error(
      { err, userId: params.userId },
      "TMS pass-through check failed",
    );
  }

  // Two-factor approval for the payout itself.
  //
  // A recent re-authentication is NOT a substitute: it proves the session is
  // fresh, not that the person in front of the screen approved THIS payout.
  // The Roadmap calls for 2FA to be mandatory for withdrawals, and this is a
  // bank transfer to a phone number — the exact action an attacker with a
  // stolen session wants to make.
  //
  // The check sits HERE, after the business rules and immediately before the
  // money moves, for two reasons:
  //
  //   1. It is the last gate before the debit, so no path into the money can
  //      skip it. The service owns it, not just the route.
  //   2. A user whose contract blocks the withdrawal is told that, without
  //      being sent an SMS they would then have to enter for a payout that
  //      was never going to happen.
  if (!params.otpCode) {
    throw new WithdrawalOtpRequiredError(
      "Confirm the withdrawal code we sent you by SMS before withdrawing.",
    );
  }
  await verifyWithdrawalOtp({
    userId: params.userId,
    code: params.otpCode,
  });
  // Defence in depth: confirm the approval that the verification just
  // recorded is live, rather than trusting the call above implicitly.
  await assertWithdrawalApproved(params.userId);

  // The payment/disbursement provider fee is no longer taken here.
  //
  // It used to be a hardcoded 0.5% literal on this line, deducted from the
  // payout amount and charged identically for every provider — neither
  // configurable nor routed by the fee engine
  // (docs/hardening/AUDIT_FINANCE_WORKERS.md finding L-3). It is now the
  // second component of the fee engine: computed on the transaction gross at
  // release and routed to REVENUE-DISBURSEMENT-FEES there, so the platform's
  // overall take on a transaction is a single 7.5% (7% commission + 0.5%
  // provider fee) rather than 7% now and a surprise deduction at cash-out.
  //
  // Charging it in both places would make the take 8%, so the payout
  // disburses the full wallet amount.
  const feeMinor = 0;
  const netAmountMinor = params.amountMinor;

  // The debit, the audit event and the payout row are ONE transaction.
  //
  // They were three separate auto-commit statements. A crash â€” or a throw from
  // anything between them â€” left the money debited with no PayoutTransaction
  // row at all: no provider reference, no status, nothing to reconcile against,
  // and no way for finance to discover that the balance is wrong. The user
  // sees a smaller wallet and no withdrawal.
  //
  // The provider call deliberately stays OUTSIDE. It is an external system
  // that cannot participate in a database transaction, and calling it inside
  // would hold a pooled connection open across a network round trip. What goes
  // wrong if the process dies between the commit and the provider call is
  // bounded: a PROCESSING payout with a provider reference exists, which is
  // exactly the state the reconciliation sweep and staff settlement exist for.
  const payout = await prisma.$transaction(async (tx) => {
    // Atomic conditional decrement: two concurrent withdrawals both pass the
    // pre-check above, but only decrements that still leave balance >= 0
    // succeed. A loser gets count=0 -> InsufficientBalanceError, so the wallet
    // can never go negative under concurrency.
    const debited = await tx.wallet.updateMany({
      where: { userId: params.userId, balanceMinor: { gte: params.amountMinor } },
      data: { balanceMinor: { decrement: params.amountMinor } },
    });

    if (debited.count === 0) {
      throw new InsufficientBalanceError(
        "Requested amount exceeds wallet balance.",
      );
    }

    await recordAuditEvent({
      userId: params.userId,
      eventType: "WALLET_WITHDRAWAL_INITIATED",
      entityType: "Wallet",
      entityId: wallet.id,
      metadata: { amountMinor: params.amountMinor, provider: params.provider },
      tx,
    });

    return tx.payoutTransaction.create({
      data: {
        userId: params.userId,
        walletId: wallet.id,
        amountMinor: params.amountMinor,
        feeMinor,
        netAmountMinor,
        provider: params.provider,
        payoutAccountIdentifier: params.payoutAccountIdentifier,
        status: "PROCESSING",
      },
    });
  });

  const providerClient = getProviderClient(params.provider);
  if (!providerClient.initiateDisbursement) {
    // Provider does not support automated disbursements â€” roll back wallet
    await prisma.wallet.update({
      where: { userId: params.userId },
      data: { balanceMinor: { increment: params.amountMinor } },
    });
    await prisma.payoutTransaction.update({
      where: { id: payout.id },
      data: {
        status: "FAILED",
        errorMessage: `Provider ${params.provider} does not support automated disbursements.`,
      },
    });
    throw new Error(
      `Provider ${params.provider} does not support automated disbursements.`,
    );
  }

  let disbursementResult;
  try {
    disbursementResult = await providerClient.initiateDisbursement({
      amountMinor: netAmountMinor,
      currency: "ETB",
      recipientPhone: params.payoutAccountIdentifier,
      referenceId: payout.id,
    });
  } catch (err) {
    logger.error(
      { err, payoutId: payout.id },
      "Disbursement request threw unhandled error",
    );
    disbursementResult = {
      providerPayoutId: payout.id,
      status: "PROCESSING" as const,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  if (disbursementResult.status === "FAILED") {
    // Roll back the wallet debit immediately on provider rejection
    await prisma.wallet.update({
      where: { userId: params.userId },
      data: { balanceMinor: { increment: params.amountMinor } },
    });
    await prisma.payoutTransaction.update({
      where: { id: payout.id },
      data: {
        status: "FAILED",
        errorMessage:
          disbursementResult.errorMessage || "Provider rejected disbursement",
      },
    });
    await recordAuditEvent({
      userId: params.userId,
      eventType: "WALLET_WITHDRAWAL_FAILED",
      entityType: "PayoutTransaction",
      entityId: payout.id,
      metadata: { reason: disbursementResult.errorMessage },
    });
    throw new Error(
      `Withdrawal failed: ${disbursementResult.errorMessage || "Provider rejected disbursement"}`,
    );
  }

  if (disbursementResult.status === "CONFIRMED") {
    // The CONFIRMED state change and the disbursement journal are one
    // transaction.
    //
    // They were sequential and the journal was NOT wrapped in a try/catch. A
    // journal failure therefore propagated with the payout already marked
    // CONFIRMED and the money already gone: the route returned 500, the user
    // retried, and a SECOND disbursement went out while the first had landed.
    // Now either both happen or the payout stays PROCESSING, which is a state
    // staff and the reconciliation sweep can actually act on.
    await prisma.$transaction(async (tx) => {
      await tx.payoutTransaction.update({
        where: { id: payout.id },
        data: {
          status: "CONFIRMED",
          providerPayoutId: disbursementResult.providerPayoutId,
          settledAt: new Date(),
        },
      });

      await recordWithdrawalDisbursementLedger(tx, {
        userId: params.userId,
        payoutId: payout.id,
        grossAmountMinor: params.amountMinor,
        feeMinor,
        netAmountMinor,
        provider: params.provider,
      });
    });

    await recordAuditEvent({
      userId: params.userId,
      eventType: "WALLET_WITHDRAWAL_CONFIRMED",
      entityType: "PayoutTransaction",
      entityId: payout.id,
      metadata: {
        amountMinor: params.amountMinor,
        netAmountMinor,
        feeMinor,
        providerPayoutId: disbursementResult.providerPayoutId,
      },
    });
  } else {
    // PROCESSING: awaiting webhook or reconciliation worker sweep
    await prisma.payoutTransaction.update({
      where: { id: payout.id },
      data: {
        status: "PROCESSING",
        providerPayoutId: disbursementResult.providerPayoutId,
      },
    });
  }

  const updatedWallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId: params.userId },
  });

  // The approval has been spent. Deleting it means a code approved for one
  // payout cannot be replayed for a second one inside the approval window.
  await consumeWithdrawalApproval(params.userId);

  return {
    payoutId: payout.id,
    status: disbursementResult.status,
    amountMinor: params.amountMinor,
    netAmountMinor,
    feeMinor,
    balanceMinor: updatedWallet.balanceMinor,
  };
}

/**
 * Refund path for a disputed milestone.
 */
export async function refundMilestoneToClient(
  milestoneId: string,
  clientId: string,
  amountMinor: number,
  /** F-04 â€” compose into a caller's transaction; see releaseMilestoneFunds. */
  opts: { tx?: Prisma.TransactionClient } = {},
) {
  const outerTx = opts.tx;

  const refund = async (tx: Prisma.TransactionClient) => {
    // F-04 â€” the state change is a CONDITIONAL claim, taken before the wallet
    // is credited and inside the same transaction. Previously this was an
    // unconditional update, so a refund could be issued for a milestone that
    // had already been RELEASED, paying the client for money the freelancer
    // had already received. A count of 0 means someone else settled it.
    const claim = await tx.milestone.updateMany({
      where: {
        id: milestoneId,
        escrowState: {
          in: ["DISPUTED", "SUBMITTED_FOR_REVIEW", "ESCROW_HELD", "WORK_IN_PROGRESS"],
        },
      },
      data: { escrowState: "REFUNDED" },
    });
    if (claim.count === 0) {
      throw new InvalidEscrowStateError(
        "Cannot refund: the milestone is no longer in a refundable state.",
      );
    }

    await tx.wallet.update({
      where: { userId: clientId },
      data: { balanceMinor: { increment: amountMinor } },
    });
    await recordDisputeRefundLedger(tx, {
      clientId,
      milestoneId,
      amountMinor,
    });
  };

  // Composed call: the caller owns the transaction and the lifecycle.
  if (outerTx) {
    await refund(outerTx);
    return;
  }

  await prisma.$transaction(refund);

  try {
    await checkAndUpdateContractCompletion(milestoneId);
  } catch (err) {
    logger.error({ err, milestoneId }, "Contract completion check failed");
  }
}


export function getProviderClient(
  provider: PaymentProvider,
): PaymentProviderClient {
  return PROVIDER_CLIENTS[provider];
}

export interface UserTransactionMovement {
  id: string;
  journalId?: string;
  date: string;
  title: string;
  description: string;
  category: "TOP_UP" | "PAYOUT" | "ESCROW_LOCK" | "MILESTONE_RELEASE" | "REFUND" | "OTHER";
  direction: "IN" | "OUT";
  amountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  currency: string;
  status: "COMPLETED" | "PENDING" | "PROCESSING" | "FAILED" | "REJECTED";
  paymentRail?: "TELEBIRR" | "CBE_BIRR" | "M_PESA" | "INTERNAL_WALLET" | null;
  reference?: string;
  accountIdentifier?: string;
  contractId?: string;
  contractTitle?: string;
  counterpartyName?: string;
  counterpartyRole?: "CLIENT" | "FREELANCER" | "SYSTEM";
  milestoneId?: string;
  milestoneTitle?: string;
  receiptUrl?: string;
}

export async function getUserTransactionMovements(
  userId: string,
): Promise<UserTransactionMovement[]> {
  const userAccountCode = getUserAccountCode(userId);

  const [userAccount, topUps, payouts, userMilestones] = await Promise.all([
    prisma.ledgerAccount.findUnique({
      where: { code: userAccountCode },
      select: { id: true },
    }),
    prisma.walletTopUp.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.payoutTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.milestone.findMany({
      where: {
        contract: {
          OR: [{ clientId: userId }, { freelancerId: userId }],
        },
      },
      include: {
        contract: {
          select: {
            id: true,
            clientId: true,
            freelancerId: true,
            job: { select: { title: true } },
            client: { select: { id: true, displayName: true, email: true, firstName: true, lastName: true } },
            freelancer: { select: { id: true, displayName: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
      take: 100,
    }),
  ]);

  const ledgerEntries = userAccount
    ? await prisma.ledgerEntry.findMany({
        where: { accountId: userAccount.id },
        include: {
          journal: true,
        },
        orderBy: { postedAt: "desc" },
        take: 100,
      })
    : [];

  const movements: UserTransactionMovement[] = [];
  const processedJournalKeys = new Set<string>();
  const processedMilestones = new Set<string>();
  const processedPayouts = new Set<string>();
  const processedTopUps = new Set<string>();

  // 1. Process double-entry general ledger postings
  for (const entry of ledgerEntries) {
    const j = entry.journal;
    processedJournalKeys.add(j.idempotencyKey);
    const isCredit = entry.creditMinor > 0;
    const amountMinor = isCredit ? entry.creditMinor : entry.debitMinor;

    let category: UserTransactionMovement["category"] = "OTHER";
    let title = j.description;
    let description = j.description;
    let counterpartyName: string | undefined = undefined;
    let counterpartyRole: UserTransactionMovement["counterpartyRole"] = undefined;
    let contractId: string | undefined = undefined;
    let contractTitle: string | undefined = undefined;
    let milestoneId: string | undefined = undefined;
    let milestoneTitle: string | undefined = undefined;
    let paymentRail: UserTransactionMovement["paymentRail"] = null;
    let accountIdentifier: string | undefined = undefined;
    let feeMinor = 0;
    let netAmountMinor = amountMinor;

    if (j.referenceType === "WALLET_TOPUP") {
      category = "TOP_UP";
      const matchedTopUp = topUps.find((t) => t.id === j.referenceId);
      if (matchedTopUp) {
        processedTopUps.add(matchedTopUp.id);
        paymentRail = matchedTopUp.provider as any;
        accountIdentifier = matchedTopUp.referenceNumber || matchedTopUp.providerTransactionId || undefined;
      }
      title = "Wallet Top-Up · " + (paymentRail || "Direct");
      description = "Approved top-up credited to wallet balance";
    } else if (j.referenceType === "ESCROW_FUND") {
      category = "ESCROW_LOCK";
      milestoneId = j.referenceId || undefined;
      const matchedM = userMilestones.find((m) => m.id === milestoneId);
      if (matchedM) {
        processedMilestones.add(matchedM.id);
        contractId = matchedM.contractId;
        contractTitle = matchedM.contract.job?.title;
        milestoneTitle = matchedM.title;
        counterpartyName =
          matchedM.contract.freelancer?.displayName ||
          matchedM.contract.freelancer?.firstName ||
          matchedM.contract.freelancer?.email;
        counterpartyRole = "FREELANCER";
        title = "Escrow Lock · " + (matchedM.title || "Milestone");
        description = 'Funds locked into escrow for "' + (contractTitle || "Contract") + '"';
      } else {
        title = "Milestone Escrow Funding";
        description = "Funds transferred to escrow pool";
      }
    } else if (j.referenceType === "MILESTONE_RELEASE") {
      category = "MILESTONE_RELEASE";
      milestoneId = j.referenceId || undefined;
      const matchedM = userMilestones.find((m) => m.id === milestoneId);
      if (matchedM) {
        processedMilestones.add(matchedM.id);
        contractId = matchedM.contractId;
        contractTitle = matchedM.contract.job?.title;
        milestoneTitle = matchedM.title;
        counterpartyName =
          matchedM.contract.client?.displayName ||
          matchedM.contract.client?.firstName ||
          matchedM.contract.client?.email;
        counterpartyRole = "CLIENT";
        title = "Milestone Earnings · " + (matchedM.title || "Milestone");
        description = 'Approved delivery release for "' + (contractTitle || "Contract") + '"';
        if (matchedM.amountMinor > amountMinor) {
          feeMinor = matchedM.amountMinor - amountMinor;
        }
      } else {
        title = "Milestone Release Earnings";
        description = "Funds released to wallet";
      }
    } else if (j.referenceType === "WITHDRAWAL_PAYOUT") {
      category = "PAYOUT";
      const matchedP = payouts.find((p) => p.id === j.referenceId);
      if (matchedP) {
        processedPayouts.add(matchedP.id);
        paymentRail = matchedP.provider as any;
        accountIdentifier = matchedP.payoutAccountIdentifier;
        feeMinor = matchedP.feeMinor;
        netAmountMinor = matchedP.netAmountMinor;
      }
      title = "Withdrawal Payout · " + (paymentRail || "Direct");
      description = "Disbursement to account " + (accountIdentifier || "");
    } else if (j.referenceType === "DISPUTE_REFUND") {
      category = "REFUND";
      milestoneId = j.referenceId || undefined;
      const matchedM = userMilestones.find((m) => m.id === milestoneId);
      if (matchedM) {
        processedMilestones.add(matchedM.id);
        contractId = matchedM.contractId;
        contractTitle = matchedM.contract.job?.title;
        milestoneTitle = matchedM.title;
      }
      title = "Dispute Refund · " + (milestoneTitle || "Milestone");
      description = "Refund from escrow dispute resolution";
    }

    movements.push({
      id: "ledger-" + entry.id,
      journalId: j.id,
      date: entry.postedAt.toISOString(),
      title,
      description,
      category,
      direction: isCredit ? "IN" : "OUT",
      amountMinor,
      feeMinor,
      netAmountMinor,
      currency: "ETB",
      status: "COMPLETED",
      paymentRail,
      reference: j.idempotencyKey,
      accountIdentifier,
      contractId,
      contractTitle,
      counterpartyName,
      counterpartyRole,
      milestoneId,
      milestoneTitle,
    });
  }

  // 2. Add unjournaled top-ups (pending, checkout pending, rejected, or unjournaled approved)
  for (const t of topUps) {
    const journalKey = "topup-" + t.id;
    if (!processedJournalKeys.has(journalKey) && !processedTopUps.has(t.id)) {
      const isApproved = t.status === "APPROVED";
      movements.push({
        id: "topup-" + t.id,
        date: t.createdAt.toISOString(),
        title: "Wallet Top-Up · " + t.provider,
        description:
          t.status === "CHECKOUT_PENDING"
            ? "Automated gateway checkout initiated"
            : t.status === "PENDING"
            ? "Receipt submitted, pending staff verification"
            : t.status === "REJECTED"
            ? "Top-up verification rejected by staff"
            : "Top-up completed",
        category: "TOP_UP",
        direction: "IN",
        amountMinor: t.amountMinor,
        feeMinor: 0,
        netAmountMinor: t.amountMinor,
        currency: "ETB",
        status: isApproved ? "COMPLETED" : t.status === "REJECTED" ? "REJECTED" : "PENDING",
        paymentRail: t.provider as any,
        reference: t.referenceNumber || t.providerTransactionId || t.id,
        accountIdentifier: t.referenceNumber || t.providerTransactionId || undefined,
        receiptUrl: t.receiptImagePath ? "/api/v1/wallet/topups/" + t.id + "/receipt-url" : undefined,
      });
    }
  }

  // 3. Add unjournaled payouts (pending, processing, failed, reversed, or unjournaled confirmed)
  for (const p of payouts) {
    const journalKey = "payout-" + p.id;
    if (!processedJournalKeys.has(journalKey) && !processedPayouts.has(p.id)) {
      const isConfirmed = p.status === "CONFIRMED";
      movements.push({
        id: "payout-" + p.id,
        date: p.createdAt.toISOString(),
        title: "Withdrawal Payout · " + p.provider,
        description:
          p.status === "PROCESSING"
            ? "Disbursement processing to " + p.payoutAccountIdentifier
            : p.status === "PENDING"
            ? "Withdrawal requested to " + p.payoutAccountIdentifier
            : p.status === "FAILED"
            ? "Disbursement failed: " + (p.errorMessage || "Provider error")
            : "Disbursement completed to " + p.payoutAccountIdentifier,
        category: "PAYOUT",
        direction: "OUT",
        amountMinor: p.amountMinor,
        feeMinor: p.feeMinor,
        netAmountMinor: p.netAmountMinor,
        currency: "ETB",
        status: isConfirmed
          ? "COMPLETED"
          : p.status === "FAILED"
          ? "FAILED"
          : p.status === "REVERSED"
          ? "REJECTED"
          : p.status === "PROCESSING"
          ? "PROCESSING"
          : "PENDING",
        paymentRail: p.provider as any,
        reference: p.providerPayoutId || p.id,
        accountIdentifier: p.payoutAccountIdentifier,
      });
    }
  }

  // 4. Fallback for historical milestones funded or released before ledger logging
  for (const m of userMilestones) {
    if (m.contract.clientId === userId && m.escrowState !== "PAYMENT_PENDING") {
      const fundKey = "escrow-fund-" + m.id;
      if (!processedJournalKeys.has(fundKey) && !processedMilestones.has(m.id)) {
        const freelancerName =
          m.contract.freelancer?.displayName ||
          m.contract.freelancer?.firstName ||
          m.contract.freelancer?.email;
        movements.push({
          id: "escrow-fund-" + m.id,
          date: m.createdAt.toISOString(),
          title: "Escrow Lock · " + (m.title || "Milestone"),
          description: 'Funds held in escrow for "' + (m.contract.job?.title || "Contract") + '"',
          category: "ESCROW_LOCK",
          direction: "OUT",
          amountMinor: m.amountMinor,
          feeMinor: 0,
          netAmountMinor: m.amountMinor,
          currency: "ETB",
          status: "COMPLETED",
          paymentRail: "INTERNAL_WALLET",
          reference: "milestone-" + m.id.slice(-6).toUpperCase(),
          contractId: m.contractId,
          contractTitle: m.contract.job?.title,
          counterpartyName: freelancerName,
          counterpartyRole: "FREELANCER",
          milestoneId: m.id,
          milestoneTitle: m.title,
        });
      }
    }

    if (m.contract.freelancerId === userId && m.escrowState === "RELEASED") {
      const releaseKey = "escrow-release-" + m.id;
      if (!processedJournalKeys.has(releaseKey) && !processedMilestones.has(m.id)) {
        const clientName =
          m.contract.client?.displayName ||
          m.contract.client?.firstName ||
          m.contract.client?.email;
        // Derived from the fee engine rather than a hard-coded rate: the
        // platform's take is the commission plus the provider fee, and a
        // literal here silently rots whenever a rate changes.
        const releaseFees = calculateFees({
          milestoneAmountMinor: m.amountMinor,
        });
        const feeEst = m.amountMinor - releaseFees.freelancerNetMinor;
        const netEst = releaseFees.freelancerNetMinor;
        movements.push({
          id: "escrow-release-" + m.id,
          date: (m.releasedAt || m.submittedAt || m.createdAt).toISOString(),
          title: "Milestone Earnings · " + (m.title || "Milestone"),
          description: 'Delivery approved for "' + (m.contract.job?.title || "Contract") + '"',
          category: "MILESTONE_RELEASE",
          direction: "IN",
          amountMinor: m.amountMinor,
          feeMinor: feeEst,
          netAmountMinor: netEst,
          currency: "ETB",
          status: "COMPLETED",
          paymentRail: "INTERNAL_WALLET",
          reference: "milestone-" + m.id.slice(-6).toUpperCase(),
          contractId: m.contractId,
          contractTitle: m.contract.job?.title,
          counterpartyName: clientName,
          counterpartyRole: "CLIENT",
          milestoneId: m.id,
          milestoneTitle: m.title,
        });
      }
    }
  }

  // Sort chronologically descending (newest first)
  movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return movements;
}
