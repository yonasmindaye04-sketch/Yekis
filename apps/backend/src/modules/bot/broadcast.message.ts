// === IMPORTS ===
import type { Prisma } from "@prisma/client";

/**
 * Pure helpers behind the Telegram broadcast center: audience selection and
 * message rendering. Kept free of Prisma/bot calls so the rules that decide
 * WHO receives a message and WHAT they receive are unit-testable without a
 * database or a network.
 */

// === LIMITS ===
/** Telegram rejects text longer than this, failing the whole message. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;
/** Telegram rejects a photo caption longer than this. */
export const TELEGRAM_CAPTION_LIMIT = 1024;

// === AUDIENCES ===
export const BROADCAST_AUDIENCES = [
  "ALL",
  "CLIENTS",
  "FREELANCERS",
  "STAFF",
  "KYC_VERIFIED",
] as const;

export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export const AUDIENCE_COPY: Record<
  BroadcastAudience,
  { label: string; description: string }
> = {
  ALL: {
    label: "Everyone with Telegram",
    description:
      "Every active member who has linked a Telegram chat with the bot. Members without a linked chat cannot be reached on Telegram.",
  },
  CLIENTS: {
    label: "Clients",
    description: "Members whose account role is CLIENT or BOTH.",
  },
  FREELANCERS: {
    label: "Freelancers",
    description: "Members whose account role is FREELANCER or BOTH.",
  },
  STAFF: {
    label: "Staff",
    description: "Staff accounts (any staff role) that have linked a Telegram chat.",
  },
  KYC_VERIFIED: {
    label: "KYC verified",
    description:
      "Members whose KYC status is VERIFIED. Useful for announcements a payment corridor or payout rule requires.",
  },
};

/**
 * The Prisma filter for an audience.
 *
 * Every audience starts from the same reachability rules: suspended accounts
 * are excluded, guest support identities are excluded (they are synthetic and
 * must never receive marketing), and an account with no telegramChatId cannot
 * be reached no matter what the audience says. Building the filter in one place
 * is what stops "ALL" from accidentally meaning "every row in User".
 */
export function audienceWhere(audience: BroadcastAudience): Prisma.UserWhereInput {
  const reachable: Prisma.UserWhereInput = {
    isSuspended: false,
    isGuestContact: false,
    telegramChatId: { not: null },
  };

  switch (audience) {
    case "CLIENTS":
      return { ...reachable, role: { in: ["CLIENT", "BOTH"] } };
    case "FREELANCERS":
      return { ...reachable, role: { in: ["FREELANCER", "BOTH"] } };
    case "STAFF":
      return { ...reachable, staffRole: { not: null } };
    case "KYC_VERIFIED":
      return { ...reachable, cachedKycStatus: "VERIFIED" };
    case "ALL":
    default:
      return reachable;
  }
}

// === MESSAGE RENDERING ===
/**
 * Escapes text for Telegram HTML parse mode.
 *
 * The message is always sent with `parse_mode: "HTML"`, so a body containing
 * `<`, `>` or `&` would otherwise make Telegram reject the whole send with
 * "can't parse entities". Escaping here means an admin can write ordinary
 * prose, prices and symbols without learning Telegram's entity grammar.
 */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface BroadcastContent {
  heading: string | null;
  body: string;
}

/**
 * Renders the delivered message. The heading is the only formatted element,
 * and it is formatted by the platform, not by whatever the admin typed.
 */
export function composeBroadcastHtml(content: BroadcastContent): string {
  const heading = (content.heading ?? "").trim();
  const body = content.body.trim();
  const escapedBody = escapeTelegramHtml(body);
  return heading ? `<b>${escapeTelegramHtml(heading)}</b>\n\n${escapedBody}` : escapedBody;
}

/**
 * True when the composed message fits Telegram's text limit and, when the
 * message is sent as a photo caption, the caption limit too.
 */
export function fitsTelegramLimits(content: BroadcastContent & { imageUrl?: string | null }): {
  ok: boolean;
  reason?: string;
} {
  // Telegram counts the characters left after entities are parsed, so the
  // platform's own <b> tags and escaped ampersands do not consume the budget.
  const heading = (content.heading ?? "").trim();
  const body = content.body.trim();
  const length = (heading ? heading.length + 2 : 0) + body.length;
  const limit = content.imageUrl ? TELEGRAM_CAPTION_LIMIT : TELEGRAM_MESSAGE_LIMIT;
  if (length <= limit) return { ok: true };
  return {
    ok: false,
    reason: content.imageUrl
      ? `A message with an image is delivered as a caption, which Telegram limits to ${TELEGRAM_CAPTION_LIMIT} characters (this one is ${length}). Remove the image or shorten the text.`
      : `Telegram messages are limited to ${TELEGRAM_MESSAGE_LIMIT} characters (this one is ${length}).`
  };
}

// === ERROR MAPPING ===
/**
 * Seconds to wait before retrying, when Telegram answered HTTP 429. Returns
 * null for every other failure, which must not be retried at the same pace.
 */
export function retryAfterSeconds(error: unknown): number | null {
  const shaped = error as {
    error_code?: number;
    parameters?: { retry_after?: number };
    error?: { error_code?: number; parameters?: { retry_after?: number } };
  } | null;
  const code = shaped?.error_code ?? shaped?.error?.error_code;
  const retry = shaped?.parameters?.retry_after ?? shaped?.error?.parameters?.retry_after;
  if (code !== 429 || typeof retry !== "number" || !Number.isFinite(retry)) return null;
  return Math.min(Math.max(Math.ceil(retry), 1), 60);
}

/** A one-line, bounded description of why one recipient did not get the message. */
export function describeSendError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const trimmed = message.replace(/\s+/g, " ").trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}
