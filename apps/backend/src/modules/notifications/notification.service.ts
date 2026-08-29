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

import { sendPlatformMovementEmail } from "../../lib/email/email.service.js";

function formatNotificationTitle(type: string): string {
  switch (type) {
    case "escrow-funded":
      return "Escrow Milestone Funded";
    case "escrow-released":
      return "Payment Released to Wallet";
    case "milestone-submitted":
      return "Milestone Work Delivered";
    case "dispute-raised":
      return "Dispute Opened on Milestone";
    case "dispute-resolved":
      return "Dispute Resolution Reached";
    case "auto-release-warning":
      return "Escrow Review Window Reminder";
    case "kyc-verified":
      return "Identity Verification Approved";
    default:
      return "Account Movement Update";
  }
}

/**
 * The single entry point the BullMQ worker calls for every job on the
 * "notifications" queue — persists the in-app record, then fans out to
 * SMS (if critical), Email, and Telegram without letting any single
 * delivery channel's failure block the others or the in-app record itself.
 */
export async function processNotification(params: {
  userId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    logger.warn(
      { userId: params.userId },
      "Notification for unknown user — dropping.",
    );
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
    isCritical
      ? sendSms({ phone: user.phone, message: params.message })
      : Promise.resolve({ sent: false }),
    sendTelegramPush({ userId: params.userId, message: params.message }),
    user.email && !user.email.endsWith("@yekis.local")
      ? sendPlatformMovementEmail({
          email: user.email,
          recipientName: user.displayName || user.firstName || undefined,
          title: formatNotificationTitle(params.type),
          message: params.message,
          eventType: params.type,
        })
      : Promise.resolve({ success: true }),
  ]);

  if (
    isCritical &&
    results[0].status === "fulfilled" &&
    (results[0].value as { sent?: boolean })?.sent
  ) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { smsSentAt: new Date() },
    });
  }

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error(
        { reason: result.reason, notificationId: notification.id },
        "Notification delivery channel failed",
      );
    }
  }

  return notification;
}

export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean } = {},
) {
  return prisma.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) throw new NotificationNotFoundError();
  if (notification.userId !== userId) throw new NotNotificationOwnerError();

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
