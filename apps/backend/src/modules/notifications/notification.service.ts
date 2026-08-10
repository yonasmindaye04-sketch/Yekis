// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { sendSms } from "./sms.client.js";
import { sendTelegramPush } from "./telegram.client.js";
import { logger } from "../../lib/logger.js";


// === MAIN FUNCTIONS ===
export class NotificationNotFoundError extends Error {}
export class NotNotificationOwnerError extends Error {}

/**
 * Event types considered critical enough to also push via SMS, per the
 * roadmap ("SMS for critical events: escrow funded, dispute raised, payout
 * sent"). Everything else is in-app (and Telegram, once the bot exists)
 * only. Keep this list in sync with the job names actually used across
 * notificationQueue.add(...) call sites — see notification.worker.ts's
 * comment for the current full list.
 */
const CRITICAL_NOTIFICATION_TYPES = new Set([
  "escrow-funded",
  "escrow-released",
  "dispute-raised",
  "dispute-resolved",
  "auto-release-warning",
]);

/**
 * The single entry point the BullMQ worker calls for every job on the
 * "notifications" queue — persists the in-app record, then fans out to
 * SMS (if critical) and Telegram (always attempted; currently a no-op stub)
 * without letting either delivery channel's failure block the other or
 * the in-app record itself.
 */
export async function processNotification(params: {
  userId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    logger.warn({ userId: params.userId }, "Notification for unknown user — dropping.");
    return;
  }

  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: params.message,
      metadata: params.metadata as never,
    },
  });

  const isCritical = CRITICAL_NOTIFICATION_TYPES.has(params.type);

  const results = await Promise.allSettled([
    isCritical ? sendSms({ phone: user.phone, message: params.message }) : Promise.resolve({ sent: false }),
    sendTelegramPush({ userId: params.userId, message: params.message }),
  ]);

  if (isCritical && results[0].status === "fulfilled" && results[0].value.sent) {
    await prisma.notification.update({ where: { id: notification.id }, data: { smsSentAt: new Date() } });
  }

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error({ reason: result.reason, notificationId: notification.id }, "Notification delivery channel failed");
    }
  }

  return notification;
}

export async function listNotifications(userId: string, opts: { unreadOnly?: boolean } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotificationNotFoundError();
  if (notification.userId !== userId) throw new NotNotificationOwnerError();

  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
