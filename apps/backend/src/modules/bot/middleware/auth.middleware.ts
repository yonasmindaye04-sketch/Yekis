import { BotContext } from "../types.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import type { StaffRole } from "@prisma/client";
import { toTelegramBigInt } from "../../../lib/json.js";

const userSelect = {
  id: true,
  role: true,
  staffRole: true,
  languagePreference: true,
  telegramUserId: true,
  telegramChatId: true,
  kyc: { select: { tier: true, status: true } },
} as const;

type ResolvedUser = {
  id: string;
  role: string;
  staffRole: StaffRole | null;
  languagePreference: string;
  telegramUserId: bigint | null;
  telegramChatId: string | null;
  kyc: { tier: string | null; status: string | null } | null;
};

/**
 * Resolves (and on first contact, provisions) the Yekis account behind an
 * inbound Telegram update.
 *
 * Before this, a brand-new member pressing /start got a friendly welcome
 * message and then every gated command rejected them, because nothing here
 * ever CREATED an account — it only looked one up.
 *
 * Trust anchor: Telegram delivers this update to our webhook/polling
 * connection, so `from.id` is authenticated by Telegram itself. That is the
 * same assurance as a verified Login Widget payload and involves no
 * client-supplied data, so provisioning from it is safe. `telegramUserId` is
 * the authoritative, indexed join key; the synthetic email lookup is only a
 * bridge for accounts provisioned before that column was populated.
 *
 * A password-owned account holding the synthetic address is never adopted —
 * it has to be claimed from an authenticated session on the web.
 */
export async function authMiddleware(
  ctx: BotContext,
  next: () => Promise<void>,
) {
  const from = ctx.from;
  const chat = ctx.chat;

  if (!from || !chat) {
    return next();
  }

  // Widened once, here, at the boundary. `from.id` arrives as a JS number and
  // Prisma wants a BigInt; the session keeps the decimal string so that neither
  // floating-point precision nor JSON serialisation can lose it.
  const telegramId = String(from.id);
  const chatId = String(chat.id);

  const telegramBigId = toTelegramBigInt(telegramId);
  if (telegramBigId === null) {
    // grammY types `from.id` as a number, so this should be unreachable. If it
    // ever is not, stop: falling back to 0n would resolve to a real member's
    // row and hand them this session.
    logger.error({ updateId: ctx.update.update_id }, "Malformed Telegram user id");
    return next();
  }

  let user: ResolvedUser | null = await prisma.user.findUnique({
    where: { telegramUserId: telegramBigId },
    select: userSelect,
  });

  if (!user) {
    // Check legacy email
    user = await prisma.user.findUnique({
      where: { email: `telegram+${telegramId}@yekis.local` },
      select: userSelect,
    }) as unknown as ResolvedUser | null;
  }

  // C5: Strict Onboarding - Do not auto-provision here
  if (!user) {
    ctx.session.userId = undefined;
    ctx.session.role = undefined;
    ctx.session.kycTier = undefined;
    ctx.session.kycStatus = undefined;
    ctx.session.staffRole = undefined;
    ctx.session.loginBlocked = "You are not registered. Please sign in via the web.";
    ctx.session.language = from.language_code === "am" ? "am" : "en";
    ctx.session.telegramUserId = telegramId;
    ctx.session.telegramChatId = chatId;
    return next();
  }

  ctx.session.loginBlocked = undefined;

  if (user) {
    ctx.session.userId = user.id;
    ctx.session.role = user.staffRole ? "STAFF" : (user.role as BotContext["session"]["role"]);
    ctx.session.kycTier = user.kyc?.tier as BotContext["session"]["kycTier"];
    ctx.session.kycStatus = user.kyc?.status as BotContext["session"]["kycStatus"];
    ctx.session.staffRole = user.staffRole ?? undefined;
    ctx.session.language = user.languagePreference === "am" ? "am" : "en";

    // The bot clears telegramChatId when a member blocks it. Re-assert it on
    // any inbound message so push notifications resume for returning users.
    if (user.telegramChatId !== chatId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: chatId },
      });
    }
  } else {
    ctx.session.language = from.language_code === "am" ? "am" : "en";
  }

  ctx.session.telegramUserId = telegramId;
  ctx.session.telegramChatId = chatId;

  await next();
}