import { BotContext } from "../types.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import type { StaffRole } from "@prisma/client";
import { resolveOrProvisionTelegramUser } from "../../auth/telegram.service.js";
import { AccountLinkRequiredError } from "../../auth/identity.js";

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

  const telegramId = from.id;
  const chatId = String(chat.id);

  let user: ResolvedUser | null = await prisma.user.findUnique({
    where: { telegramUserId: BigInt(telegramId) },
    select: userSelect,
  });

  if (!user) {
    // No account bound to this Telegram identity yet. Provision one (this
    // also backfills the column for accounts that only had the synthetic
    // email, and adopts nothing it should not).
    try {
      const provisioned = await resolveOrProvisionTelegramUser(
        {
          id: telegramId,
          first_name: from.first_name,
          last_name: from.last_name,
          username: from.username,
          language_code: from.language_code,
        },
        { chatId },
      );

      user = {
        id: provisioned.id,
        role: provisioned.role,
        staffRole: provisioned.staffRole ?? null,
        languagePreference: provisioned.languagePreference,
        telegramUserId: provisioned.telegramUserId,
        telegramChatId: provisioned.telegramChatId,
        kyc: provisioned.kyc
          ? {
              tier: provisioned.kyc.tier as string | null,
              status: provisioned.kyc.status as string | null,
            }
          : null,
      };

      logger.info(
        { telegramId, userId: provisioned.id },
        "Provisioned Yekis account from Telegram update",
      );
    } catch (err) {
      if (err instanceof AccountLinkRequiredError) {
        // A password-owned account owns this synthetic address. Surface it on
        // the session so /start can tell the member how to proceed instead of
        // silently treating them as anonymous.
        ctx.session.loginBlocked = err.message;
        ctx.session.language = from.language_code === "am" ? "am" : "en";
        ctx.session.telegramUserId = telegramId;
        ctx.session.telegramChatId = chat.id;
        return next();
      }
      logger.error({ err, telegramId }, "Telegram identity resolution failed");
      ctx.session.loginBlocked =
        "We could not complete your sign-in right now. Please try again shortly.";
      ctx.session.language = from.language_code === "am" ? "am" : "en";
      ctx.session.telegramUserId = telegramId;
      ctx.session.telegramChatId = chat.id;
      return next();
    }
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
  ctx.session.telegramChatId = chat.id;

  await next();
}