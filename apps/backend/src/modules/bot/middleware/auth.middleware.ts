import { BotContext } from "../types.js";
import { prisma } from "../../../lib/prisma.js";

export async function authMiddleware(
  ctx: BotContext,
  next: () => Promise<void>,
) {
  const from = ctx.from;
  const chat = ctx.chat;

  if (!from || !chat) {
    return next();
  }

  // Primary lookup: try to find user by telegramChatId stored in a custom field
  // Since the schema doesn't have telegramUserId/telegramChatId yet, we'll use email pattern
  // TODO: Add telegramUserId and telegramChatId to User model in Prisma schema
  const telegramEmail = `telegram+${from.id}@yekis.local`;

  const user = await prisma.user.findUnique({
    where: { email: telegramEmail },
    select: {
      id: true,
      role: true,
      staffRole: true,
      languagePreference: true,
      kyc: { select: { tier: true, status: true } },
    },
  });

  if (user) {
    ctx.session.userId = user.id;
    ctx.session.role = user.staffRole ? "STAFF" : user.role;
    ctx.session.kycTier = user.kyc?.tier;
    ctx.session.kycStatus = user.kyc?.status;
    ctx.session.staffRole = user.staffRole ?? undefined;
    ctx.session.language = user.languagePreference === "am" ? "am" : "en";
  } else {
    // New user - detect language from Telegram client
    ctx.session.language = from.language_code === "am" ? "am" : "en";
  }

  // Store Telegram IDs in session for later use
  ctx.session.telegramUserId = from.id;
  ctx.session.telegramChatId = chat.id;

  await next();
}
