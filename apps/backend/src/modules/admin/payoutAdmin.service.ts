// === IMPORTS ===
import { PayoutStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notificationQueue } from "../../queue/queues.js";
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

  // Settleable states, for the cheap pre-check and the claim predicate below.
  const SETTLEABLE: PayoutStatus[] = ["PENDING", "PROCESSING"];

  // Cheap pre-check so an already-settled payout never takes a pooled
  // connection. Correctness rests on the conditional claim inside the
  // transaction below; this only saves a round trip.
  if (!SETTLEABLE.includes(payout.status)) {
    throw new InvalidPayoutStateError(
      `Cannot settle a payout in state ${payout.status}.`,
    );
  }

  if (params.decision === "CONFIRMED") {
    // The claim, the journal and the state change are ONE transaction, and the
    // state change is a CONDITIONAL claim rather than a blind write.
    //
    // Two defects were here at once.
    //
    // The journal was in its own transaction with the failure swallowed into a
    // log line. A payout could therefore be CONFIRMED — money transferred out
    // of the platform — with no ledger entry at all, and auditLedgerIntegrity
    // would not notice, because it only compares total debits to total credits
    // and a missing journal is perfectly balanced. The gap was permanent and
    // silent. It now rolls back: no CONFIRMED without a journal.
    //
    // And the status check above was a read followed by an unconditional
    // update, so two staff acting at once both passed it. A CONFIRMED and a
    // FAILED both "succeeded", and the FAILED branch re-credited a wallet for
    // money that had already been disbursed.
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutTransaction.updateMany({
        where: { id: payout.id, status: { in: [...SETTLEABLE] } },
        data: {
          status: "CONFIRMED",
          providerPayoutId: params.providerPayoutId ?? payout.providerPayoutId,
          settledAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        // Throwing rolls the whole transaction back, so the loser of a race
        // never leaves a journal behind. The caller sees the same domain error
        // type the pre-check produces.
        throw new InvalidPayoutStateError(
          `Cannot settle a payout in state ${payout.status}.`,
        );
      }

      // Double-entry: user wallet (liability) debit -> settlement asset credit
      // (+ disbursement fee revenue when a fee applied).
      await recordWithdrawalDisbursementLedger(tx, {
        userId: payout.userId,
        payoutId: payout.id,
        grossAmountMinor: payout.amountMinor,
        feeMinor: payout.feeMinor,
        netAmountMinor: payout.netAmountMinor,
        provider: payout.provider,
      });
    });

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
    // Same conditional claim: a FAILED must not be able to follow a CONFIRMED
    // that committed a moment earlier, or the wallet is credited for a
    // disbursement that actually went out.
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutTransaction.updateMany({
        where: { id: payout.id, status: { in: [...SETTLEABLE] } },
        data: {
          status: "FAILED",
          errorMessage: params.failureReason ?? "Payout failed during settlement",
        },
      });
      if (claimed.count === 0) {
        throw new InvalidPayoutStateError(
          `Cannot settle a payout in state ${payout.status}.`,
        );
      }

      await tx.wallet.update({
        where: { userId: payout.userId },
        data: { balanceMinor: { increment: payout.amountMinor } },
      });
    });

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
