// === IMPORTS ===
import { prisma } from "./prisma.js";
import { notificationQueue } from "../queue/queues.js";
import { logger } from "./logger.js";

/**
 * Fan-out helper: delivers an in-app (and SMS/Telegram for critical types,
 * per notification.service.ts) notification to EVERY staff user.
 *
 * Staff currently poll their dashboards blind — this closes the "how do
 * staff learn a queue has work" gap for compliance-relevant events:
 * KYC submitted, dispute raised, topup pending, TMS flag created, VAT
 * threshold crossed, payment reconciliation anomalies.
 */

// === MAIN FUNCTIONS ===

export async function notifyStaffOfEvent(params: {
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const staff = await prisma.user.findMany({
    where: { staffRole: { not: null } },
    select: { id: true },
  });

  if (staff.length === 0) {
    logger.warn(
      { eventType: params.eventType },
      "notifyStaffOfEvent: no staff users exist to notify — seed staff accounts.",
    );
    return 0;
  }

  // Per-user .add rather than addBulk: functionally identical here, and it
  // stays compatible with test doubles that stub only `.add`.
  for (const s of staff) {
    await notificationQueue.add(params.eventType, {
      userId: s.id,
      message: params.message,
      ...params.metadata,
    });
  }

  return staff.length;
}
