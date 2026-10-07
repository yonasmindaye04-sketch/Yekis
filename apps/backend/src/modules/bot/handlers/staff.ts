import { Bot, CallbackQueryContext, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { prisma } from "../../../lib/prisma.js";
import { env } from "../../../config/env.js";
import { startScene } from "../middleware/sceneTimeout.middleware.js";

// Ensures we do not rely on cached sessions for staff privileges (C4)
async function verifyStaffAccess(ctx: BotContext): Promise<boolean> {
  if (!ctx.session.userId) {
    await ctx.reply("Unauthorized.");
    return false;
  }
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.userId },
    select: { role: true, staffRole: true }
  });
  // Staff authority lives in `staffRole`, NOT in `role` — there is no STAFF
  // value in the UserRole enum, so comparing `role` to "STAFF" was both a type
  // error and a logic hole: it could never be true, meaning the guard below it
  // was unreachable. Every staff action re-reads the row so a demotion takes
  // effect on the very next command rather than when the session expires.
  if (!user?.staffRole) {
    await ctx.reply("Unauthorized.");
    return false;
  }
  return true;
}

export function registerStaffHandlers(bot: Bot<BotContext>) {
  bot.callbackQuery("menu:staff", async (ctx) => {
    if (!(await verifyStaffAccess(ctx))) return;
    await showStaffDashboard(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.command("staff", async (ctx) => {
    if (!(await verifyStaffAccess(ctx))) return;
    await showStaffDashboard(ctx);
  });

  bot.callbackQuery("staff:user_lookup", async (ctx) => {
    if (!(await verifyStaffAccess(ctx))) return;
    startScene(ctx, "staff_user_lookup");
    await ctx.editMessageText("Enter UCID or Telegram ID to lookup:");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("staff:broadcast", async (ctx) => {
    if (!(await verifyStaffAccess(ctx))) return;
    startScene(ctx, "staff_broadcast", { step: "message" });
    await ctx.editMessageText("Enter broadcast message (MarkdownV2 supported):");
    await ctx.answerCallbackQuery();
  });
}

async function showStaffDashboard(ctx: CallbackQueryContext<BotContext> | BotContext) {
  const [kycCount, topupCount, disputeCount, tmsCount] = await Promise.all([
    prisma.kycRecord.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.walletTopUp.count({ where: { status: "PENDING" } }),
    prisma.dispute.count({
      where: {
        stage: {
          in: ["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"],
        },
      },
    }),
    prisma.transactionFlag.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  // C4: the console link is built from STAFF_CONSOLE_URL, which config/env.ts
  // REQUIRES in production. There is deliberately no fallback domain: the old
  // `https://staff.yekis.local` was a hardcoded string, so a deployment with no
  // console configured sent every staff member to a host nobody controls —
  // either dead, or, if that name were ever registered, somebody else's.
  //
  // The buttons below are links only. No KYC image, document or user detail is
  // rendered here, and no approve/reject action is taken from Telegram.
  const webConsoleUrl = (env.STAFF_CONSOLE_URL ?? "").replace(/\/+$/, "");

  const kb = new InlineKeyboard();
  const panels: [string, string][] = [
    [`KYC (${kycCount})`, "/kyc"],
    [`TopUps (${topupCount})`, "/topups"],
    [`Disputes (${disputeCount})`, "/disputes"],
    [`TMS (${tmsCount})`, "/tms"],
  ];

  if (webConsoleUrl) {
    // Two per row, matching the previous layout.
    for (let i = 0; i < panels.length; i += 2) {
      const row = panels.slice(i, i + 2);
      if (row.length === 1) {
        kb.url(row[0]![0], `${webConsoleUrl}${row[0]![1]}`);
      } else {
        kb.url(row[0]![0], `${webConsoleUrl}${row[0]![1]}`).url(
          row[1]![0],
          `${webConsoleUrl}${row[1]![1]}`,
        );
      }
    }
  }
  kb.text("Broadcast", "staff:broadcast")
    .text("User Lookup", "staff:user_lookup");

  const message =
    `<b>Staff Ops Console</b>\n\n` +
    `<i>For security, all sensitive reviews and financial approvals ` +
    `must be performed in the Web Console with MFA enabled.</i>\n\n` +
    `<b>KYC Queue:</b> ${kycCount}\n` +
    `<b>TopUp Queue:</b> ${topupCount}\n` +
    `<b>Disputes:</b> ${disputeCount}\n` +
    `<b>TMS Flags:</b> ${tmsCount}` +
    (webConsoleUrl
      ? ""
      : `\n\n<i>STAFF_CONSOLE_URL is not configured, so console links are ` +
        `omitted. Set it and restart.</i>`);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, { reply_markup: kb, parse_mode: "HTML" });
  } else {
    await ctx.reply(message, { reply_markup: kb, parse_mode: "HTML" });
  }
}
