import { Bot, CallbackQueryContext, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import { startScene } from "../middleware/sceneTimeout.middleware.js";
import { env } from "../../../config/env.js";
import { webAppRoutes, safeUrlKeyboard } from "../utils/deepLink.js";
import {
  formatKycQueueItem,
  formatTopupQueueItem,
  formatDisputeQueueItem,
} from "../formatters/index.js";

const PAGE_SIZE = 10;

export function registerStaffHandlers(bot: Bot<BotContext>) {
  // Staff dashboard
  bot.callbackQuery("menu:staff", async (ctx) => {
    await showStaffDashboard(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.command("staff", async (ctx) => {
    if (!isStaff(ctx)) return;
    await showStaffDashboard(ctx);
  });

  // KYC Queue
  bot.callbackQuery(/^staff:kyc_queue:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]!, 10);
    await showKycQueue(ctx, page);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^staff:kyc:approve:(\w+)$/, async (ctx) => {
    const kycId = ctx.match[1]!;
    await handleKycAction(ctx, kycId, "VERIFIED", "KYC approved");
    await ctx.answerCallbackQuery({ text: " Approved" });
  });

  bot.callbackQuery(/^staff:kyc:reject:(\w+)$/, async (ctx) => {
    const kycId = ctx.match[1]!;
    startScene(ctx, "staff_kyc_reject", { kycId });
    await ctx.editMessageText("Enter rejection reason:");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^staff:kyc:flag:(\w+)$/, async (ctx) => {
    const kycId = ctx.match[1]!;
    await handleKycAction(ctx, kycId, "UNDER_REVIEW", "KYC flagged for review");
    await ctx.answerCallbackQuery({ text: " Flagged" });
  });

  // TopUp Queue
  bot.callbackQuery(/^staff:topup_queue:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]!, 10);
    await showTopupQueue(ctx, page);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^staff:topup:approve:(\w+)$/, async (ctx) => {
    const topupId = ctx.match[1]!;
    await handleTopupAction(ctx, topupId, "APPROVED");
    await ctx.answerCallbackQuery({ text: " Approved & credited" });
  });

  bot.callbackQuery(/^staff:topup:reject:(\w+)$/, async (ctx) => {
    const topupId = ctx.match[1]!;
    startScene(ctx, "staff_topup_reject", { topupId });
    await ctx.editMessageText("Enter rejection reason:");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^staff:topup:flag:(\w+)$/, async (ctx) => {
    const topupId = ctx.match[1]!;
    await handleTopupAction(ctx, topupId, "FLAGGED");
    await ctx.answerCallbackQuery({ text: " Flagged" });
  });

  // Dispute Queue
  bot.callbackQuery(/^staff:dispute_queue:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]!, 10);
    await showDisputeQueue(ctx, page);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^staff:dispute:mediate:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1]!;
    startScene(ctx, "staff_mediation", { disputeId });
    await showMediationView(ctx, disputeId);
    await ctx.answerCallbackQuery();
  });

  // TMS Queue
  bot.callbackQuery(/^staff:tms_queue:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]!, 10);
    await showTmsQueue(ctx, page);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^staff:tms:dismiss:(\w+)$/, async (ctx) => {
    const flagId = ctx.match[1]!;
    await handleTmsAction(ctx, flagId, "DISMISSED");
    await ctx.answerCallbackQuery({ text: " Dismissed" });
  });

  bot.callbackQuery(/^staff:tms:str:(\w+)$/, async (ctx) => {
    const flagId = ctx.match[1]!;
    startScene(ctx, "staff_tms_str", { flagId });
    await ctx.editMessageText("Enter STR reference number:");
    await ctx.answerCallbackQuery();
  });

  // User lookup
  bot.callbackQuery("staff:user_lookup", async (ctx) => {
    startScene(ctx, "staff_user_lookup");
    await ctx.editMessageText("Enter UCID or Telegram ID to lookup:");
    await ctx.answerCallbackQuery();
  });

  // Broadcast
  bot.callbackQuery("staff:broadcast", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: " Admin only", show_alert: true });
      return;
    }
    startScene(ctx, "staff_broadcast", { step: "message" });
    await ctx.editMessageText(
      "Enter broadcast message (MarkdownV2 supported):",
    );
    await ctx.answerCallbackQuery();
  });

  // Analytics
  bot.callbackQuery("staff:analytics", async (ctx) => {
    await showAnalytics(ctx);
    await ctx.answerCallbackQuery();
  });
}

function isStaff(ctx: BotContext): boolean {
  if (ctx.session.role !== "STAFF") {
    ctx.reply(ctx.t("errors_unauthorized")).catch(() => {});
    return false;
  }
  return true;
}

function isAdmin(ctx: BotContext): boolean {
  if (ctx.session.staffRole !== "ADMIN") {
    return false;
  }
  return true;
}

async function showStaffDashboard(
  ctx: CallbackQueryContext<BotContext> | BotContext,
) {
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

  const kb = new InlineKeyboard()
    .text(`${ctx.t("staff_kyc_queue")} (${kycCount})`, "staff:kyc_queue:0")
    .text(
      `${ctx.t("staff_topup_queue")} (${topupCount})`,
      "staff:topup_queue:0",
    )
    .row()
    .text(
      `${ctx.t("staff_dispute_queue")} (${disputeCount})`,
      "staff:dispute_queue:0",
    )
    .text(`${ctx.t("staff_tms_queue")} (${tmsCount})`, "staff:tms_queue:0")
    .row()
    .text(ctx.t("staff_analytics"), "staff:analytics")
    .text(ctx.t("staff_broadcast"), "staff:broadcast")
    .row()
    .text(ctx.t("staff_user_lookup"), "staff:user_lookup");

  const message =
    ctx.t("staff_dashboard_title") +
    "\n\n" +
    ` KYC: ${kycCount} | TopUps: ${topupCount}\n` +
    ` Disputes: ${disputeCount} | TMS: ${tmsCount}`;

  await ctx.editMessageText(message, { reply_markup: kb });
}

async function showKycQueue(
  ctx: CallbackQueryContext<BotContext>,
  page: number,
) {
  const [items, total] = await Promise.all([
    prisma.kycRecord.findMany({
      where: { status: "UNDER_REVIEW" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { user: true, documents: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.kycRecord.count({ where: { status: "UNDER_REVIEW" } }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const displayItems = items.slice(0, PAGE_SIZE);

  if (displayItems.length === 0) {
    await ctx.editMessageText("No pending KYC reviews", {
      reply_markup: new InlineKeyboard().text("Back", "menu:staff"),
    });
    return;
  }

  for (const kyc of displayItems) {
    const userName = kyc.user.email?.split("@")[0] || "Unknown";
    const message =
      ` ${userName} (${kyc.user.ucid})\n` +
      `Tier: ${kyc.tier} | Docs: ${kyc.documents.length}\n` +
      `Submitted: ${new Date(kyc.createdAt).toLocaleDateString()}`;

    const kb = safeUrlKeyboard([
      { text: " View Evidence", url: webAppRoutes.staffKycReview(kyc.id) },
    ])
      .text(" Approve", `staff:kyc:approve:${kyc.id}`)
      .text(" Reject", `staff:kyc:reject:${kyc.id}`)
      .row()
      .text(" Flag", `staff:kyc:flag:${kyc.id}`)
      .text(" Back", "staff:kyc_queue:" + page);

    await ctx.reply(message, { reply_markup: kb });
  }

  // Pagination
  if (hasMore || page > 0) {
    const kb = new InlineKeyboard();
    if (page > 0) kb.text(" Prev", `staff:kyc_queue:${page - 1}`);
    if (hasMore) kb.text("Next ", `staff:kyc_queue:${page + 1}`);
    kb.row().text("Back", "menu:staff");
    await ctx.reply("Pagination", { reply_markup: kb });
  }
}

async function handleKycAction(
  ctx: CallbackQueryContext<BotContext>,
  kycId: string,
  status: "VERIFIED" | "REJECTED" | "UNDER_REVIEW",
  auditEvent: string,
) {
  await prisma.kycRecord.update({
    where: { id: kycId },
    data: { status, reviewedByStaffId: ctx.session.userId },
  });

  const kyc = await prisma.kycRecord.findUnique({
    where: { id: kycId },
    include: { user: true },
  });

  if (kyc?.user.telegramChatId) {
    // Notify user (would need bot instance)
    logger.info({ kycId, status, staffId: ctx.session.userId }, auditEvent);
  }
}

async function showTopupQueue(
  ctx: CallbackQueryContext<BotContext>,
  page: number,
) {
  const [items, total] = await Promise.all([
    prisma.walletTopUp.findMany({
      where: { status: "PENDING" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.walletTopUp.count({ where: { status: "PENDING" } }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const displayItems = items.slice(0, PAGE_SIZE);

  if (displayItems.length === 0) {
    await ctx.editMessageText("No pending topups", {
      reply_markup: new InlineKeyboard().text("Back", "menu:staff"),
    });
    return;
  }

  for (const topup of displayItems) {
    const userName = topup.user.email?.split("@")[0] || "Unknown";
    const message =
      ` TopUp ${topup.id.slice(0, 8)}\n` +
      `User: ${userName} (${topup.user.ucid})\n` +
      `Amount: ${topup.amountMinor / 100} ETB\n` +
      `Ref: ${topup.referenceNumber}`;

    const kb = safeUrlKeyboard([
      { text: " View Receipt", url: webAppRoutes.staffTopupReview(topup.id) },
    ])
      .text(" Approve", `staff:topup:approve:${topup.id}`)
      .text(" Reject", `staff:topup:reject:${topup.id}`)
      .row()
      .text(" Flag", `staff:topup:flag:${topup.id}`)
      .text(" Back", "staff:topup_queue:" + page);

    await ctx.reply(message, { reply_markup: kb });
  }

  if (hasMore || page > 0) {
    const kb = new InlineKeyboard();
    if (page > 0) kb.text(" Prev", `staff:topup_queue:${page - 1}`);
    if (hasMore) kb.text("Next ", `staff:topup_queue:${page + 1}`);
    kb.row().text("Back", "menu:staff");
    await ctx.reply("Pagination", { reply_markup: kb });
  }
}

async function handleTopupAction(
  ctx: CallbackQueryContext<BotContext>,
  topupId: string,
  status: "APPROVED" | "FLAGGED",
) {
  const topup = await prisma.walletTopUp.findUnique({
    where: { id: topupId },
    include: { wallet: true },
  });

  if (!topup) return;

  await prisma.walletTopUp.update({
    where: { id: topupId },
    data: {
      status,
      reviewedByStaffId: ctx.session.userId,
      reviewedAt: new Date(),
    },
  });

  if (status === "APPROVED" && topup.wallet) {
    await prisma.wallet.update({
      where: { id: topup.walletId },
      data: { balanceMinor: { increment: topup.amountMinor } },
    });
  }

  logger.info(
    { topupId, status, staffId: ctx.session.userId },
    "TopUp action completed",
  );
}

async function showDisputeQueue(
  ctx: CallbackQueryContext<BotContext>,
  page: number,
) {
  const [items, total] = await Promise.all([
    prisma.dispute.findMany({
      where: {
        stage: {
          in: ["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"],
        },
      },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { contract: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dispute.count({
      where: {
        stage: {
          in: ["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"],
        },
      },
    }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const displayItems = items.slice(0, PAGE_SIZE);

  if (displayItems.length === 0) {
    await ctx.editMessageText("No active disputes", {
      reply_markup: new InlineKeyboard().text("Back", "menu:staff"),
    });
    return;
  }

  for (const dispute of displayItems) {
    const subjectLabel = dispute.contractId
      ? `Contract: ${dispute.contractId.slice(0, 8)}`
      : dispute.gigOrderId
        ? `Gig order: ${dispute.gigOrderId.slice(0, 8)}`
        : "Subject: unknown";
    const message =
      ` Dispute ${dispute.id.slice(0, 8)}\n` +
      `Stage: ${dispute.stage} | ${dispute.category}\n` +
      `${subjectLabel}\n` +
      `Created: ${new Date(dispute.createdAt).toLocaleDateString()}`;

    const kb = new InlineKeyboard()
      .text(" Mediate", `staff:dispute:mediate:${dispute.id}`)
      .text(" Back", "staff:dispute_queue:" + page);

    await ctx.reply(message, { reply_markup: kb });
  }

  if (hasMore || page > 0) {
    const kb = new InlineKeyboard();
    if (page > 0) kb.text(" Prev", `staff:dispute_queue:${page - 1}`);
    if (hasMore) kb.text("Next ", `staff:dispute_queue:${page + 1}`);
    kb.row().text("Back", "menu:staff");
    await ctx.reply("Pagination", { reply_markup: kb });
  }
}

async function showMediationView(
  ctx: CallbackQueryContext<BotContext>,
  disputeId: string,
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { contract: { include: { milestones: true } }, evidence: true },
  });

  if (!dispute) {
    await ctx.editMessageText("Dispute not found", {
      reply_markup: new InlineKeyboard().text("Back", "staff:dispute_queue:0"),
    });
    return;
  }

  let message = ` Mediation: ${disputeId}\n`;
  message += `Stage: ${dispute.stage} | ${dispute.category}\n`;
  message += dispute.contractId
    ? `Contract: ${dispute.contractId.slice(0, 8)}\n`
    : `Gig order: ${dispute.gigOrderId?.slice(0, 8) ?? "unknown"}\n`;
  message += `Milestone: ${dispute.milestoneId ?? "—"}\n\n`;
  message += `Evidence: ${dispute.evidence.length} items\n`;

  const kb = safeUrlKeyboard([
    { text: " View Evidence", url: webAppRoutes.staffDisputeMediation(disputeId) },
  ])
    .text(" Propose Split", `staff:dispute:propose_split:${disputeId}`)
    .text(" Back", "staff:dispute_queue:0");

  await ctx.editMessageText(message, { reply_markup: kb });
}

async function showTmsQueue(
  ctx: CallbackQueryContext<BotContext>,
  page: number,
) {
  const [items, total] = await Promise.all([
    prisma.transactionFlag.findMany({
      where: { status: "PENDING_REVIEW" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transactionFlag.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const displayItems = items.slice(0, PAGE_SIZE);

  if (displayItems.length === 0) {
    await ctx.editMessageText("No pending TMS flags", {
      reply_markup: new InlineKeyboard().text("Back", "menu:staff"),
    });
    return;
  }

  for (const flag of displayItems) {
    const message =
      ` ${flag.type}\n` +
      `User: ${flag.user.ucid}\n` +
      `Details: ${JSON.stringify(flag.details)}\n` +
      `Created: ${new Date(flag.createdAt).toLocaleDateString()}`;

    const kb = new InlineKeyboard()
      .text(" Dismiss", `staff:tms:dismiss:${flag.id}`)
      .text(" Record STR", `staff:tms:str:${flag.id}`)
      .row()
      .text(" Back", "staff:tms_queue:" + page);

    await ctx.reply(message, { reply_markup: kb });
  }

  if (hasMore || page > 0) {
    const kb = new InlineKeyboard();
    if (page > 0) kb.text(" Prev", `staff:tms_queue:${page - 1}`);
    if (hasMore) kb.text("Next ", `staff:tms_queue:${page + 1}`);
    kb.row().text("Back", "menu:staff");
    await ctx.reply("Pagination", { reply_markup: kb });
  }
}

async function handleTmsAction(
  ctx: CallbackQueryContext<BotContext>,
  flagId: string,
  status: "DISMISSED",
) {
  await prisma.transactionFlag.update({
    where: { id: flagId },
    data: { status, reviewedByStaffId: ctx.session.userId },
  });
  logger.info(
    { flagId, status, staffId: ctx.session.userId },
    "TMS action completed",
  );
}

async function showAnalytics(ctx: CallbackQueryContext<BotContext>) {
  const [
    totalUsers,
    totalJobs,
    totalProposals,
    totalContracts,
    totalDisputes,
    totalVolume,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.proposal.count(),
    prisma.contract.count(),
    prisma.dispute.count(),
    prisma.paymentTransaction.aggregate({ _sum: { amountMinor: true } }),
  ]);

  const message =
    ` *Platform Analytics*\n\n` +
    ` Total Users: ${totalUsers}\n` +
    ` Jobs Posted: ${totalJobs}\n` +
    ` Proposals: ${totalProposals}\n` +
    ` Contracts: ${totalContracts}\n` +
    ` Disputes: ${totalDisputes}\n` +
    ` Total Volume: ${(totalVolume._sum.amountMinor || 0) / 100} ETB`;

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: new InlineKeyboard().text(" Back", "menu:staff"),
  });
}
