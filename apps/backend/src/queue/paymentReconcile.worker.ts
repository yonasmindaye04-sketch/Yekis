// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { paymentReconcileQueue } from "./queues.js";
import { getProviderClient, handlePaymentWebhook } from "../modules/escrow/escrow.service.js";
import { env } from "../config/env.js";

/**
 * Payment reconciliation sweep — the webhook safety net.
 *
 * Money movement must never depend on a provider webhook arriving: they can
 * be delayed, dropped during provider incidents, or lost while our own
 * server is down. This job runs on a short interval and directly queries the
 * provider's transaction-status API for every escrow funding transaction
 * still PENDING past the stale threshold. The authoritative result is fed
 * through the same handlePaymentWebhook path as a real webhook (which is
 * idempotent), so whichever arrives second is a no-op.
 *
 * Currently only Telebirr implements queryPaymentStatus. Chapa/CBE are
 * skipped until their clients add the method (interface marks it optional).
 *
 * ⚠️ Blocked on sandbox access: the queryOrder endpoint's exact response
 * shape must be confirmed against real Telebirr docs/sandbox before
 * production. The status vocabulary here mirrors webhooks.routes.ts's
 * mapTelebirrStatus — keep both in sync when confirming field names.
 */
export const paymentReconcileWorker = new Worker(
  "payment-reconcile",
  async () => {
    const staleBefore = new Date(Date.now() - env.PAYMENT_RECONCILE_STALE_MINUTES * 60_000);
    // Don't chase transactions older than the checkout expiry window + slack —
    // TELEBIRR_TIMEOUT_EXPRESS defaults to "120m"; beyond that Telebirr itself
    // closes the order and we treat silence as FAILED rather than querying forever.
    const giveUpBefore = new Date(Date.now() - env.PAYMENT_RECONCILE_GIVE_UP_HOURS * 3_600_000);

    const stale = await prisma.paymentTransaction.findMany({
      where: {
        provider: "TELEBIRR",
        status: "PENDING",
        createdAt: { lte: staleBefore, gte: giveUpBefore },
      },
      take: env.PAYMENT_RECONCILE_BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    let resolved = 0;
    let unknown = 0;

    for (const txn of stale) {
      const client = getProviderClient("TELEBIRR");

      if (!client.queryPaymentStatus) {
        // Defensive: interface change removed the method — bail loudly.
        throw new Error("Telebirr client no longer implements queryPaymentStatus");
      }

      try {
        const result = await client.queryPaymentStatus({
          providerTransactionId: txn.providerTransactionId,
        });

        if (!result) {
          // Provider has no record — user never completed checkout. Still
          // PENDING from our side; it ages out via giveUpBefore eventually.
          unknown++;
          continue;
        }

        if (result.status === "PENDING") continue;

        // Authoritative result — route through the same idempotent path as a
        // live webhook so state transitions, notifications, TMS checks and
        // audit events all behave identically regardless of which arrives.
        await handlePaymentWebhook({
          provider: "TELEBIRR",
          providerTransactionId: txn.providerTransactionId,
          status: result.status,
          rawPayload: {
            source: "reconciliation-sweep",
            queriedAt: new Date().toISOString(),
          },
        });
        resolved++;

        await recordAuditEvent({
          eventType: "PAYMENT_RECONCILED_VIA_QUERY",
          entityType: "PaymentTransaction",
          entityId: txn.id,
          metadata: {
            provider: txn.provider,
            providerTransactionId: txn.providerTransactionId,
            resolvedStatus: result.status,
          },
        });
      } catch (err) {
        // Per-transaction errors shouldn't kill the whole sweep; log and
        // move on — next run retries naturally since status stays PENDING.
        logger.error(
          { err, transactionId: txn.id, providerTransactionId: txn.providerTransactionId },
          "Reconciliation query failed for transaction",
        );
      }
    }

    if (stale.length > 0) {
      logger.info(
        { swept: stale.length, resolved, unknown },
        "Payment reconciliation sweep complete",
      );
    }
  },
  { connection: redis }
);

/** Call once at startup — BullMQ deduplicates by jobId, safe on every boot. */
export async function schedulePaymentReconcileJob() {
  await paymentReconcileQueue.add(
    "reconcile-sweep",
    {},
    { repeat: { pattern: env.PAYMENT_RECONCILE_CRON }, jobId: "payment-reconcile-sweep" }
  );
}
