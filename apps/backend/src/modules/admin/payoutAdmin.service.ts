// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notificationQueue } from "../../queue/queues.js";
import { logger } from "../../lib/logger.js";
import { recordWithdrawalDisbursementLedger } from "../finance/ledger.service.js";

/**
 * Manual payout settlement — the operational bridge until a live B2C
 * disbursement API exists (see COMPLIANCE_BLOCKERS.md §payout provider).
 *
 * Finance/Operations executes the bank/Telebirr transfer out-of-band, then
 * records the outcome here. State machine:
 *   PENDING / PROCESSING → CONFIRMED  (with provider reference)
 *   PENDING / PROCESSING → FAILED     (wallet is re-credited — the debit at
 *                                      withdrawal time is reversed so the
 *                                      freelancer's balance is restored)
 *
 * Every settlement writes an audit event with amounts and both state
 * snapshots; CONFIRMED also posts the double-entry disbursement journal.
 */

export class PayoutNotFoundError extends Error {}
export class InvalidPayoutStateError extends Error {}

export async function settlePayout(params: {
  staffUserId: string;
  payoutId: string;
  decision: "CONFIRMED" | "FAILED";
  providerPayoutId?: string;
  failureReason?: string;
}) {
  const payout = await prisma.payoutTransaction.findUnique({
    where: { id: params.payoutId },
  });
  if (!payout) throw new PayoutNotFoundError();
  if (!["PENDING", "PROCESSING"].includes(payout.status)) {
    throw new InvalidPayoutStateError(
      `Cannot settle a payout in state ${payout.status}.`,
    );
  }

  if (params.decision === "CONFIRMED") {
    await prisma.payoutTransaction.update({
      where: { id: payout.id },
      data: {
        status: "CONFIRMED",
        providerPayoutId: params.providerPayoutId ?? payout.providerPayoutId,
        settledAt: new Date(),
      },
    });

    // Double-entry: user wallet (liability) debit → settlement asset credit
    // (+ disbursement fee revenue when a fee applied).
    try {
      await prisma.$transaction(async (tx) => {
        await recordWithdrawalDisbursementLedger(tx, {
          userId: payout.userId,
          payoutId: payout.id,
          grossAmountMinor: payout.amountMinor,
          feeMinor: payout.feeMinor,
          netAmountMinor: payout.netAmountMinor,
          provider: payout.provider,
        });
      });
    } catch (err) {
      logger.error(
        { err, payoutId: payout.id },
        "Payout settlement journal posting failed — payout stays CONFIRMED; ledger needs reconciliation",
      );
    }

    await recordAuditEvent({
      userId: params.staffUserId,
      eventType: "PAYOUT_SETTLED",
      entityType: "PayoutTransaction",
      entityId: payout.id,
      amountMinor: payout.netAmountMinor,
      previousState: { status: payout.status },
      newState: { status: "CONFIRMED", providerPayoutId: params.providerPayoutId ?? null },
      metadata: { provider: payout.provider },
    });

    await notificationQueue.add("payout-completed", {
      userId: payout.userId,
      payoutId: payout.id,
      message: "Your withdrawal has been sent to your payout account.",
    });
  } else {
    // FAILED — reverse the wallet debit so the freelancer's money is restored.
    await prisma.$transaction([
      prisma.payoutTransaction.update({
        where: { id: payout.id },
        data: {
          status: "FAILED",
          errorMessage: params.failureReason ?? "Payout failed during settlement",
        },
      }),
      prisma.wallet.update({
        where: { userId: payout.userId },
        data: { balanceMinor: { increment: payout.amountMinor } },
      }),
    ]);

    await recordAuditEvent({
      userId: params.staffUserId,
      eventType: "PAYOUT_FAILED",
      entityType: "PayoutTransaction",
      entityId: payout.id,
      amountMinor: payout.amountMinor,
      previousState: { status: payout.status },
      newState: { status: "FAILED", walletReversedMinor: payout.amountMinor },
      metadata: { failureReason: params.failureReason ?? null },
    });

    await notificationQueue.add("payout-failed", {
      userId: payout.userId,
      payoutId: payout.id,
      message:
        "Your withdrawal could not be completed. The amount has been returned to your wallet.",
    });
  }

  return prisma.payoutTransaction.findUniqueOrThrow({
    where: { id: payout.id },
  });
}
