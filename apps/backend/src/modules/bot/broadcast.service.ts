// === IMPORTS ===
import { InlineKeyboard } from "grammy";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { getBot } from "./bot.service.js";
import type { BotContext } from "./types.js";
import type { Bot } from "grammy";
import { isPublishableWebUrl } from "./utils/deepLink.js";
import { telegramBroadcastQueue } from "../../queue/queues.js";
import {
  AUDIENCE_COPY,
  audienceWhere,
  composeBroadcastHtml,
  describeSendError,
  fitsTelegramLimits,
  retryAfterSeconds,
  type BroadcastAudience,
  type BroadcastContent,
} from "./broadcast.message.js";

// === TYPES ===
/** How many recipients one round of sends covers before a pause. */
const SEND_BATCH_SIZE = 20;
/** Pause between rounds. Telegram accepts roughly 30 messages/second. */
const SEND_BATCH_DELAY_MS = 1_000;
/** Bounded so a permanently blocked chat cannot stall a run forever. */
const MAX_RETRIES_PER_RECIPIENT = 1;

export interface BroadcastInput {
  name: string;
  heading?: string | null;
  body: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  audience: BroadcastAudience;
}

// === ERRORS ===
export class BroadcastNotFoundError extends Error {}
export class BroadcastNotEditableError extends Error {}
export class BroadcastNotSendableError extends Error {}
export class BroadcastValidationError extends Error {}
export class BroadcastAudienceEmptyError extends Error {}
export class BroadcastBotUnavailableError extends Error {}
export class BroadcastQueueUnavailableError extends Error {}
export class BroadcastRecipientNotLinkedError extends Error {}

// === CONTENT ===
function normalise(input: BroadcastInput) {
  const name = input.name.trim();
  const body = input.body.trim();
  const heading = input.heading?.trim() || null;
  const imageUrl = input.imageUrl?.trim() || null;
  const linkUrl = input.linkUrl?.trim() || null;
  const linkLabel = linkUrl ? input.linkLabel?.trim() || "Open" : null;

  if (!name) throw new BroadcastValidationError("Give the broadcast an internal name.");
  if (!body) throw new BroadcastValidationError("The message body cannot be empty.");
  if (linkUrl && !isPublishableWebUrl(linkUrl)) {
    throw new BroadcastValidationError(
      "The button URL must be a public https address. Telegram rejects anything else and refuses the whole message with it.",
    );
  }
  if (imageUrl && !isPublishableWebUrl(imageUrl)) {
    throw new BroadcastValidationError(
      "The image URL must be a public https address Telegram can download.",
    );
  }

  const limits = fitsTelegramLimits({ heading, body, imageUrl });
  if (!limits.ok) throw new BroadcastValidationError(limits.reason ?? "Message is too long.");

  return { name, body, heading, imageUrl, linkUrl, linkLabel };
}

function contentOf(broadcast: BroadcastContent): BroadcastContent {
  return { heading: broadcast.heading, body: broadcast.body };
}

/** The inline button, or nothing when the stored URL cannot be published. */
function replyMarkup(broadcast: {
  linkUrl: string | null;
  linkLabel: string | null;
}): InlineKeyboard | undefined {
  if (!broadcast.linkUrl || !isPublishableWebUrl(broadcast.linkUrl)) return undefined;
  return new InlineKeyboard().url(broadcast.linkLabel?.trim() || "Open", broadcast.linkUrl);
}

// === AUDIENCE ===
export interface AudienceOption {
  audience: BroadcastAudience;
  label: string;
  description: string;
  recipients: number;
}

/** Recipient counts for every audience, so the composer shows real reach. */
export async function listAudiences(): Promise<AudienceOption[]> {
  const audiences = Object.keys(AUDIENCE_COPY) as BroadcastAudience[];
  const counts = await Promise.all(
    audiences.map((audience) => prisma.user.count({ where: audienceWhere(audience) })),
  );
  return audiences.map((audience, i) => ({
    audience,
    label: AUDIENCE_COPY[audience].label,
    description: AUDIENCE_COPY[audience].description,
    recipients: counts[i] ?? 0,
  }));
}

export function countAudience(audience: BroadcastAudience): Promise<number> {
  return prisma.user.count({ where: audienceWhere(audience) });
}

// === CONTENT LIBRARY ===
const AUTHOR_SELECT = { id: true, email: true, displayName: true } as const;

export interface BroadcastListParams {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}

export async function listBroadcasts(params: BroadcastListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const where: Prisma.TelegramBroadcastWhereInput = {};
  if (params.status) where.status = params.status as Prisma.TelegramBroadcastWhereInput["status"];
  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.telegramBroadcast.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: AUTHOR_SELECT },
        sentBy: { select: AUTHOR_SELECT },
      },
    }),
    prisma.telegramBroadcast.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getBroadcast(id: string) {
  const broadcast = await prisma.telegramBroadcast.findUnique({
    where: { id },
    include: {
      createdBy: { select: AUTHOR_SELECT },
      sentBy: { select: AUTHOR_SELECT },
      deliveries: {
        orderBy: { createdAt: "asc" },
        take: 100,
        include: { user: { select: { id: true, email: true, displayName: true } } },
      },
    },
  });
  if (!broadcast) throw new BroadcastNotFoundError("Broadcast not found.");

  const failures = await prisma.telegramBroadcastDelivery.count({
    where: { broadcastId: id, status: "FAILED" },
  });

  return { ...broadcast, failureCount: failures };
}

export async function createBroadcast(actorId: string, input: BroadcastInput) {
  const data = normalise(input);
  const broadcast = await prisma.telegramBroadcast.create({
    data: { ...data, audience: input.audience, createdById: actorId },
  });
  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.created",
    entityType: "TelegramBroadcast",
    entityId: broadcast.id,
    metadata: { name: broadcast.name, audience: broadcast.audience },
  });
  return getBroadcast(broadcast.id);
}

export async function updateBroadcast(actorId: string, id: string, input: BroadcastInput) {
  const existing = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!existing) throw new BroadcastNotFoundError("Broadcast not found.");
  if (existing.status !== "DRAFT") {
    throw new BroadcastNotEditableError(
      "Only a draft can be edited. Duplicate this broadcast to prepare a new version.",
    );
  }

  const data = normalise(input);
  await prisma.telegramBroadcast.update({
    where: { id },
    data: { ...data, audience: input.audience },
  });
  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.updated",
    entityType: "TelegramBroadcast",
    entityId: id,
    previousState: { name: existing.name, audience: existing.audience },
    newState: { name: data.name, audience: input.audience },
  });
  return getBroadcast(id);
}

export async function duplicateBroadcast(actorId: string, id: string) {
  const source = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!source) throw new BroadcastNotFoundError("Broadcast not found.");

  const copy = await prisma.telegramBroadcast.create({
    data: {
      name: `${source.name} (copy)`.slice(0, 120),
      heading: source.heading,
      body: source.body,
      imageUrl: source.imageUrl,
      linkUrl: source.linkUrl,
      linkLabel: source.linkLabel,
      audience: source.audience,
      createdById: actorId,
    },
  });
  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.duplicated",
    entityType: "TelegramBroadcast",
    entityId: copy.id,
    metadata: { sourceId: id },
  });
  return getBroadcast(copy.id);
}

export async function deleteBroadcast(actorId: string, id: string) {
  const existing = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!existing) throw new BroadcastNotFoundError("Broadcast not found.");
  if (existing.status === "SENDING") {
    throw new BroadcastNotEditableError("Cancel the broadcast before deleting it.");
  }
  if (existing.status === "SENT" || existing.status === "PARTIAL") {
    throw new BroadcastNotEditableError(
      "A delivered broadcast is kept as delivery evidence. Cancel and duplicate it instead of deleting.",
    );
  }

  await prisma.telegramBroadcast.delete({ where: { id } });
  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.deleted",
    entityType: "TelegramBroadcast",
    entityId: id,
    metadata: { name: existing.name, status: existing.status },
  });
  return { deleted: true };
}

// === DELIVERY ===
interface DeliveryOutcome {
  userId: string;
  chatId: string;
  status: "SENT" | "FAILED";
  error: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends one message, retrying once when Telegram asks us to slow down.
 *
 * A photo message that Telegram cannot fetch falls back to the text: the
 * announcement matters more than the picture, and a broken image URL must not
 * silently cost every member the message.
 */
async function deliverOne(
  bot: Bot<BotContext>,
  broadcast: {
    heading: string | null;
    body: string;
    imageUrl: string | null;
    linkUrl: string | null;
    linkLabel: string | null;
  },
  recipient: { userId: string; chatId: string },
): Promise<DeliveryOutcome> {
  const text = composeBroadcastHtml(contentOf(broadcast));
  const keyboard = replyMarkup(broadcast);
  const base = { userId: recipient.userId, chatId: recipient.chatId };

  const attempt = async (): Promise<void> => {
    if (broadcast.imageUrl) {
      try {
        await bot.api.sendPhoto(recipient.chatId, broadcast.imageUrl, {
          caption: text,
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        return;
      } catch (error) {
        const retry = retryAfterSeconds(error);
        if (retry !== null) throw error;
        logger.warn(
          { chatId: recipient.chatId, err: describeSendError(error) },
          "Broadcast photo failed; falling back to a text message",
        );
      }
    }
    await bot.api.sendMessage(recipient.chatId, text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  };

  for (let tries = 0; ; tries += 1) {
    try {
      await attempt();
      return { ...base, status: "SENT", error: null };
    } catch (error) {
      const retry = retryAfterSeconds(error);
      if (retry !== null && tries < MAX_RETRIES_PER_RECIPIENT) {
        await sleep(retry * 1_000);
        continue;
      }
      return { ...base, status: "FAILED", error: describeSendError(error) };
    }
  }
}

/**
 * Runs a queued broadcast to completion.
 *
 * Called by the queue worker. Deliberately tolerant: a broadcast that cannot
 * finish is marked FAILED/PARTIAL and recorded, because an exception here would
 * only retry the same failing run and leave the row stuck in SENDING.
 */
export async function runBroadcast(broadcastId: string): Promise<void> {
  const broadcast = await prisma.telegramBroadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast) {
    logger.warn({ broadcastId }, "Queued broadcast no longer exists");
    return;
  }
  if (broadcast.status !== "SENDING") {
    logger.info(
      { broadcastId, status: broadcast.status },
      "Broadcast is no longer queued for sending; skipping",
    );
    return;
  }

  const bot = getBot();
  if (!bot) {
    await finishBroadcast(broadcastId, 0, 0, "Telegram bot is not running, so nothing was sent.");
    return;
  }

  const recipients = await prisma.user.findMany({
    where: audienceWhere(broadcast.audience),
    select: { id: true, telegramChatId: true },
  });
  const reachable = recipients.flatMap((user) =>
    user.telegramChatId ? [{ userId: user.id, chatId: user.telegramChatId }] : [],
  );

  await prisma.telegramBroadcast.update({
    where: { id: broadcastId },
    data: { recipientCount: reachable.length, startedAt: new Date() },
  });

  if (reachable.length === 0) {
    await finishBroadcast(
      broadcastId,
      0,
      0,
      "Nobody in this audience has a linked Telegram chat any more, so nothing was sent.",
    );
    return;
  }

  let delivered = 0;
  let failed = 0;
  let cancelled = false;

  for (let offset = 0; offset < reachable.length; offset += SEND_BATCH_SIZE) {
    // Cancellation is checked between rounds, which is the finest granularity
    // that does not put a database read in front of every single message.
    const current = await prisma.telegramBroadcast.findUnique({
      where: { id: broadcastId },
      select: { status: true },
    });
    if (!current || current.status !== "SENDING") {
      cancelled = true;
      break;
    }

    const batch = reachable.slice(offset, offset + SEND_BATCH_SIZE);
    const outcomes = await Promise.all(batch.map((recipient) => deliverOne(bot, broadcast, recipient)));

    for (const outcome of outcomes) {
      if (outcome.status === "SENT") delivered += 1;
      else failed += 1;
    }

    await prisma.telegramBroadcastDelivery.createMany({
      data: outcomes.map((outcome) => ({
        broadcastId,
        userId: outcome.userId,
        chatId: outcome.chatId,
        status: outcome.status,
        error: outcome.error,
        sentAt: outcome.status === "SENT" ? new Date() : null,
      })),
      skipDuplicates: true,
    });

    await prisma.telegramBroadcast.update({
      where: { id: broadcastId },
      data: { deliveredCount: delivered, failedCount: failed },
    });

    if (offset + SEND_BATCH_SIZE < reachable.length) {
      await sleep(SEND_BATCH_DELAY_MS);
    }
  }

  if (cancelled) {
    logger.info({ broadcastId, delivered, failed }, "Broadcast cancelled mid-run");
    await recordAuditEvent({
      userId: broadcast.sentById ?? broadcast.createdById,
      eventType: "broadcast.cancelled",
      entityType: "TelegramBroadcast",
      entityId: broadcastId,
      metadata: { delivered, failed, recipients: reachable.length },
    });
    return;
  }

  await finishBroadcast(broadcastId, delivered, failed);
}

/** Writes the terminal state and the closing audit row. */
async function finishBroadcast(
  broadcastId: string,
  delivered: number,
  failed: number,
  error?: string,
): Promise<void> {
  const total = delivered + failed;
  const status = error || total === 0
    ? "FAILED"
    : failed === 0
      ? "SENT"
      : delivered === 0
        ? "FAILED"
        : "PARTIAL";
  const reason = error ?? (failed > 0 && delivered === 0
    ? "Telegram refused every message in this broadcast."
    : failed > 0
      ? `${failed} of ${total} deliveries failed. See the per-recipient log.`
      : null);

  await prisma.telegramBroadcast.update({
    where: { id: broadcastId },
    data: {
      status,
      sentAt: new Date(),
      deliveredCount: delivered,
      failedCount: failed,
      lastError: reason,
    },
  });

  const row = await prisma.telegramBroadcast.findUnique({
    where: { id: broadcastId },
    select: { name: true, audience: true, sentById: true, createdById: true },
  });

  await recordAuditEvent({
    userId: row?.sentById ?? row?.createdById,
    eventType: status === "SENT" ? "broadcast.completed" : "broadcast.failed",
    entityType: "TelegramBroadcast",
    entityId: broadcastId,
    metadata: {
      name: row?.name,
      audience: row?.audience,
      status,
      delivered,
      failed,
      error: reason,
    },
  });

  logger.info({ broadcastId, status, delivered, failed }, "Broadcast finished");
}

/** Marks a broadcast FAILED when its worker job dies outside runBroadcast. */
export async function markBroadcastFailure(broadcastId: string, error: unknown): Promise<void> {
  const message = describeSendError(error);
  const existing = await prisma.telegramBroadcast.findUnique({
    where: { id: broadcastId },
    select: { status: true },
  });
  if (!existing || existing.status !== "SENDING") return;

  // The job may have died after recording some deliveries. Count what is on
  // disk so the run is not reported as "0 delivered" while the log shows rows.
  const [delivered, failed] = await Promise.all([
    prisma.telegramBroadcastDelivery.count({ where: { broadcastId, status: "SENT" } }),
    prisma.telegramBroadcastDelivery.count({ where: { broadcastId, status: "FAILED" } }),
  ]);
  await finishBroadcast(broadcastId, delivered, failed, message);
}

// === DISPATCH ===
export async function queueBroadcast(actorId: string, id: string) {
  const broadcast = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!broadcast) throw new BroadcastNotFoundError("Broadcast not found.");
  if (broadcast.status !== "DRAFT") {
    throw new BroadcastNotSendableError(
      `Only a draft can be sent. This broadcast is ${broadcast.status}.`
    );
  }
  const limits = fitsTelegramLimits({
    heading: broadcast.heading,
    body: broadcast.body,
    imageUrl: broadcast.imageUrl,
  });
  if (!limits.ok) throw new BroadcastValidationError(limits.reason ?? "Message is too long.");
  if (!getBot()) {
    throw new BroadcastBotUnavailableError(
      "The Telegram bot is not running, so a broadcast cannot be delivered. Check the bot status on this page and TELEGRAM_BOT_TOKEN.",
    );
  }

  const recipients = await countAudience(broadcast.audience);
  if (recipients === 0) {
    throw new BroadcastAudienceEmptyError(
      "Nobody matches this audience right now, so there is nothing to send.",
    );
  }

  // Conditional claim: two admins pressing Send at once must produce one run.
  const claimed = await prisma.telegramBroadcast.updateMany({
    where: { id, status: "DRAFT" },
    data: {
      status: "SENDING",
      sentById: actorId,
      queuedAt: new Date(),
      recipientCount: recipients,
      deliveredCount: 0,
      failedCount: 0,
      lastError: null,
    },
  });
  if (claimed.count === 0) {
    throw new BroadcastNotSendableError("This broadcast was already queued by another action.");
  }

  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.queued",
    entityType: "TelegramBroadcast",
    entityId: id,
    metadata: { name: broadcast.name, audience: broadcast.audience, recipients },
  });

  try {
    await telegramBroadcastQueue.add(
      "send",
      { broadcastId: id },
      { jobId: `broadcast-${id}`, removeOnComplete: 100, removeOnFail: 200, attempts: 1 },
    );
  } catch (error) {
    // Redis rejected the job: put the row back to DRAFT so the admin can retry
    // instead of leaving it stuck in SENDING with nothing processing it.
    await prisma.telegramBroadcast.update({
      where: { id },
      data: { status: "DRAFT", queuedAt: null, sentById: null, recipientCount: 0 },
    });
    logger.error({ err: describeSendError(error), broadcastId: id }, "Could not queue broadcast");
    throw new BroadcastQueueUnavailableError(
      "The delivery queue is unavailable (Redis). The broadcast was not sent; try again once Redis is reachable.",
    );
  }

  return getBroadcast(id);
}

export async function cancelBroadcast(actorId: string, id: string) {
  const broadcast = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!broadcast) throw new BroadcastNotFoundError("Broadcast not found.");
  if (broadcast.status !== "SENDING") {
    throw new BroadcastNotSendableError("Only a broadcast in progress can be cancelled.");
  }

  const cancelled = await prisma.telegramBroadcast.updateMany({
    where: { id, status: "SENDING" },
    data: { status: "CANCELLED" },
  });
  if (cancelled.count === 0) {
    throw new BroadcastNotSendableError("The broadcast had already finished.");
  }

  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.cancel_requested",
    entityType: "TelegramBroadcast",
    entityId: id,
    metadata: { name: broadcast.name },
  });
  return getBroadcast(id);
}

/**
 * Delivers the broadcast to the caller's own Telegram chat.
 *
 * The step between writing and sending to everybody: it proves the copy, the
 * formatting, the image and the button on a real client before thousands of
 * members see a typo.
 */
export async function sendBroadcastTest(actorId: string, id: string) {
  const broadcast = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!broadcast) throw new BroadcastNotFoundError("Broadcast not found.");

  const limits = fitsTelegramLimits({
    heading: broadcast.heading,
    body: broadcast.body,
    imageUrl: broadcast.imageUrl,
  });
  if (!limits.ok) throw new BroadcastValidationError(limits.reason ?? "Message is too long.");

  const bot = getBot();
  if (!bot) throw new BroadcastBotUnavailableError("The Telegram bot is not running.");

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { telegramChatId: true },
  });
  if (!actor?.telegramChatId) {
    throw new BroadcastRecipientNotLinkedError(
      "Your own account has no linked Telegram chat, so there is nowhere to send the test. Link Telegram from Settings, then try again.",
    );
  }

  const outcome = await deliverOne(bot, broadcast, {
    userId: actorId,
    chatId: actor.telegramChatId,
  });
  if (outcome.status === "FAILED") {
    throw new BroadcastValidationError(
      `Telegram refused the test message: ${outcome.error ?? "unknown error"}`
    );
  }

  await recordAuditEvent({
    userId: actorId,
    eventType: "broadcast.test_sent",
    entityType: "TelegramBroadcast",
    entityId: id,
    metadata: { name: broadcast.name },
  });
  return { sent: true };
}

/** Exposed for the worker: the bot used by a run (null when not started). */
export function broadcastBot(): Bot<BotContext> | null {
  return getBot();
}
