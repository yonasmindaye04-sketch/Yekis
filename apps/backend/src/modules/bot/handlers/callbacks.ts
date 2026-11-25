import { approveWebLogin, denyWebLogin } from "../../auth/telegram-code.service.js";
import { Bot, CallbackQueryContext, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { env } from "../../../config/env.js";
import {
  mainMenuKeyboard,
  languageKeyboard,
  settingsKeyboard,
  confirmKeyboard,
  paginationKeyboard,
} from "../keyboards/mainMenu.js";
import { jobFiltersKeyboard } from "../keyboards/jobFilters.js";
import {
  proposalActionsKeyboard,
  contractActionsKeyboard,
  walletActionsKeyboard,
  kycActionsKeyboard,
  disputeActionsKeyboard,
  notificationSettingsKeyboard,
} from "../keyboards/actions.js";
import { startScene } from "../middleware/sceneTimeout.middleware.js";
import {
  formatJobCard,
  formatProposalCard,
  formatContractCard,
  formatWalletCard,
} from "../formatters/index.js";
import { prisma } from "../../../lib/prisma.js";
import { LaunchCategory } from "@prisma/client";
import {
  webAppRoutes,
  safeUrlKeyboard,
  isEmptyKeyboard,
} from "../utils/deepLink.js";
import { registerStaffHandlers } from "./staff.js";
import { toIntlLocale } from "../utils/markdown.js";

const money = (minor: number, locale?: string) =>
  (minor / 100).toLocaleString(toIntlLocale(locale), { minimumFractionDigits: 2 });

function jobSummary(job: any, locale?: string): string {
  return `${job.title}\n${money(job.budgetMinMinor, locale)}–${money(job.budgetMaxMinor, locale)} ETB · ${job.status}`;
}

async function getWalletSummary(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balanceMinor: true } });
  const [topups, payouts] = await Promise.all([
    prisma.walletTopUp.aggregate({ where: { userId, status: { in: ["PENDING", "CHECKOUT_PENDING"] } }, _sum: { amountMinor: true } }),
    prisma.payoutTransaction.aggregate({ where: { userId, status: { in: ["PENDING", "PROCESSING"] } }, _sum: { amountMinor: true } }),
  ]);
  const pendingMinor = (topups._sum.amountMinor ?? 0) + (payouts._sum.amountMinor ?? 0);
  return { balanceMinor: wallet?.balanceMinor ?? 0, pendingMinor, availableMinor: Math.max(0, (wallet?.balanceMinor ?? 0) - (payouts._sum.amountMinor ?? 0)) };
}

async function renderJobs(ctx: BotContext, page: number, filters: Record<string, string>) {
  const where: any = { status: "OPEN" };
  // filters.category arrives verbatim from callback_data, which is user-supplied
  // input: anyone can craft an update with jobs:filter:category:<anything>.
  // Passing that straight into the query made Prisma throw
  // PrismaClientValidationError ("Expected LaunchCategory") and the handler
  // errored out for the whole session. Check it against the enum instead, and
  // fall back to the unfiltered list when it does not match.
  if (filters.category && (Object.values(LaunchCategory) as string[]).includes(filters.category)) {
    where.category = filters.category;
  }
  if (filters.budget && filters.budget !== "any") {
    const [min = 0, max] = filters.budget.split("_").map(Number);
    if (Number.isFinite(min) && min > 0) where.budgetMaxMinor = { gte: min * 100 };
    if (typeof max === "number" && Number.isFinite(max)) where.budgetMinMinor = { lte: max * 100 };
  }
  const orderBy = filters.sort === "budget_asc"
    ? { budgetMinMinor: "asc" as const }
    : filters.sort === "budget_desc"
      ? { budgetMaxMinor: "desc" as const }
      : filters.sort === "deadline"
        ? { deadline: "asc" as const }
        : { createdAt: "desc" as const };
  const jobs = await prisma.job.findMany({ where, orderBy, skip: page * 5, take: 6 });
  const hasNext = jobs.length > 5;
  const visible = jobs.slice(0, 5);
  await ctx.editMessageText(
    visible.length
      ? `${ctx.t("jobs_title")}\n\n${visible.map((j) => jobSummary(j, ctx.i18n.locale)).join("\n\n")}`
      : ctx.t("jobs_no_results"),
    { reply_markup: jobFiltersKeyboard(ctx, page, filters) },
  );
  return hasNext;
}

async function showWalletActivity(ctx: BotContext, mode: "recent" | "all") {
  const userId = ctx.session.userId!;
  const intlLocale = toIntlLocale(ctx.i18n.locale);
  const [topups, payouts] = await Promise.all([
    prisma.walletTopUp.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: mode === "recent" ? 5 : 10 }),
    prisma.payoutTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: mode === "recent" ? 5 : 10 }),
  ]);
  const activity = [
    ...topups.map((x) => ({ at: x.createdAt, text: `${ctx.t("wallet_activity_topup")} · ${money(x.amountMinor, ctx.i18n.locale)} ETB · ${x.status}` })),
    ...payouts.map((x) => ({ at: x.createdAt, text: `${ctx.t("wallet_activity_withdrawal")} · ${money(x.amountMinor, ctx.i18n.locale)} ETB · ${x.status}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
  await ctx.editMessageText(
    activity.length
      ? `${ctx.t("wallet_activity_title")}\n\n${activity.map((x) => `${x.text}\n${x.at.toLocaleDateString(intlLocale)}`).join("\n\n")}`
      : ctx.t("wallet_activity_empty"),
    { reply_markup: walletActionsKeyboard(ctx) },
  );
}

async function openMiniAppRoute(
  ctx: BotContext,
  text: string,
  url: string,
): Promise<void> {
  const keyboard = safeUrlKeyboard([{ text: ctx.t("miniapp_open_btn"), url }]);
  if (isEmptyKeyboard(keyboard)) {
    await ctx.answerCallbackQuery({
      text: ctx.t("miniapp_unavailable"),
      show_alert: true,
    });
    return;
  }
  await ctx.editMessageText(text, { reply_markup: keyboard });
  await ctx.answerCallbackQuery();
}

export function registerCallbacks(bot: Bot<BotContext>) {
  // Register staff handlers
  registerStaffHandlers(bot);

  // Language selection
  bot.callbackQuery(/^lang:(en|am|om|ti)$/, async (ctx) => {
    const lang = ctx.match[1] as "en" | "am" | "om" | "ti";
    ctx.session.language = lang;
    await ctx.i18n.setLocale(lang);
    if (ctx.session.userId) {
      await prisma.user.update({
        where: { id: ctx.session.userId },
        data: { languagePreference: lang },
      }).catch(() => {});
    }

    const confirmKey = lang === "en" ? "language_set" : `language_set_${lang}`;
    await ctx.editMessageText(
      ctx.t(confirmKey),
      { reply_markup: mainMenuKeyboard(ctx) },
    );
    await ctx.answerCallbackQuery();
  });

  // Main menu navigation
  bot.callbackQuery("menu:main", async (ctx) => {
    await ctx.editMessageText(ctx.t("main_menu"), {
      reply_markup: mainMenuKeyboard(ctx),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:jobs", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }

    await ctx.editMessageText(ctx.t("jobs_title"), {
      reply_markup: jobFiltersKeyboard(ctx, 0, {}),
    });
    await ctx.answerCallbackQuery();
  });

  // Job filters and pagination
  bot.callbackQuery(/^jobs:filter:category:(.+)$/, async (ctx) => {
    const category = ctx.match[1] ?? "";
    ctx.session.pagination = { type: "jobs", page: 0, filters: { category } };
    await renderJobs(ctx, 0, { category });
    await ctx.answerCallbackQuery({ text: ctx.t("jobs_filter_applied", { category }) });
  });

  bot.callbackQuery(/^jobs:filter:budget:(.+)$/, async (ctx) => {
    const budget = ctx.match[1] ?? "";
    const filters = { ...(ctx.session.pagination?.filters || {}), budget };
    ctx.session.pagination = { type: "jobs", page: 0, filters };
    await renderJobs(ctx, 0, filters);
    await ctx.answerCallbackQuery({ text: ctx.t("jobs_budget_applied", { budget }) });
  });

  bot.callbackQuery(/^jobs:filter:sort:(.+)$/, async (ctx) => {
    const sort = ctx.match[1] ?? "";
    const filters = { ...(ctx.session.pagination?.filters || {}), sort };
    ctx.session.pagination = { type: "jobs", page: 0, filters };
    await renderJobs(ctx, 0, filters);
    await ctx.answerCallbackQuery({ text: ctx.t("jobs_sort_applied", { sort }) });
  });

  bot.callbackQuery("jobs:filter:clear", async (ctx) => {
    await ctx.editMessageText(ctx.t("jobs_title"), {
      reply_markup: jobFiltersKeyboard(ctx, 0, {}),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^jobs:page:(\d+)$/, async (ctx) => {
    const page = Math.max(0, parseInt(ctx.match[1]!, 10));
    const filters = ctx.session.pagination?.filters || {};
    await renderJobs(ctx, page, filters);
    await ctx.answerCallbackQuery({ text: ctx.t("jobs_page_label", { page: page + 1 }) });
  });

  bot.callbackQuery("menu:my_jobs", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }
    const jobs = await prisma.job.findMany({ where: { clientId: ctx.session.userId }, orderBy: { createdAt: "desc" }, take: 5 });
    await ctx.editMessageText(
      jobs.length
        ? `${ctx.t("menu_my_jobs")}\n\n${jobs.map((j) => jobSummary(j, ctx.i18n.locale)).join("\n\n")}`
        : ctx.t("my_jobs_empty"),
      {
        reply_markup: mainMenuKeyboard(ctx),
      },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:proposals", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }
    const proposals = await prisma.proposal.findMany({ where: { freelancerId: ctx.session.userId }, include: { job: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 8 });
    await ctx.editMessageText(
      proposals.length
        ? `${ctx.t("my_proposals_title")}\n\n${proposals.map((p) => `${p.job.title}\n${money(p.quotedAmountMinor, ctx.i18n.locale)} ETB · ${p.status}`).join("\n\n")}`
        : ctx.t("my_proposals_empty"),
      {
        reply_markup: mainMenuKeyboard(ctx),
      },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:contracts", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }
    const intlLocale = toIntlLocale(ctx.i18n.locale);
    const contracts = await prisma.contract.findMany({
      where: { OR: [{ clientId: ctx.session.userId }, { freelancerId: ctx.session.userId }] },
      include: { job: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    await ctx.editMessageText(
      contracts.length
        ? `${ctx.t("menu_contracts")}\n\n${contracts.map((c) => `${c.job.title}\n${c.status} · ${ctx.t("contract_created_label")} ${c.createdAt.toLocaleDateString(intlLocale)}`).join("\n\n")}`
        : ctx.t("contracts_empty"),
      { reply_markup: mainMenuKeyboard(ctx) },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:wallet", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }
    const wallet = await getWalletSummary(ctx.session.userId);
    await ctx.editMessageText(
      ctx.t("wallet_balance", {
        balance: money(wallet.balanceMinor, ctx.i18n.locale),
        pending: money(wallet.pendingMinor, ctx.i18n.locale),
        available: money(wallet.availableMinor, ctx.i18n.locale),
      }),
      {
        reply_markup: walletActionsKeyboard(ctx),
      },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:kyc", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }
    const tier = ctx.session.kycTier || "TIER_1";
    const status = ctx.session.kycStatus || "PENDING";
    await ctx.editMessageText(ctx.t("kyc_title"), {
      reply_markup: kycActionsKeyboard(ctx, tier, status),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:disputes", async (ctx) => {
    if (!ctx.session.userId) {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_kyc_required"),
        show_alert: true,
      });
      return;
    }
    const intlLocale = toIntlLocale(ctx.i18n.locale);
    const disputes = await prisma.dispute.findMany({
      where: { raisedByUserId: ctx.session.userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
    await ctx.editMessageText(
      disputes.length
        ? `${ctx.t("disputes_title")}\n\n${disputes.map((d) => `${d.category}\n${d.stage} · ${ctx.t("dispute_updated_label")} ${d.updatedAt.toLocaleDateString(intlLocale)}`).join("\n\n")}`
        : ctx.t("disputes_empty"),
      { reply_markup: mainMenuKeyboard(ctx) },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:notifications", async (ctx) => {
    const notifications = ctx.session.userId
      ? await prisma.notification.findMany({ where: { userId: ctx.session.userId }, orderBy: { createdAt: "desc" }, take: 8 })
      : [];
    await ctx.editMessageText(
      notifications.length
        ? `${ctx.t("notifications_title")}\n\n${notifications.map((n) => `${n.isRead ? "" : "• "}${n.message}`).join("\n")}`
        : ctx.t("notifications_empty"),
      {
      reply_markup: mainMenuKeyboard(ctx),
      },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:settings", async (ctx) => {
    await ctx.editMessageText(ctx.t("settings_title"), {
      reply_markup: settingsKeyboard(ctx),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:help", async (ctx) => {
    await ctx.editMessageText(ctx.t("help_commands"), {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(ctx),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:staff", async (ctx) => {
    if (ctx.session.role !== "STAFF") {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_unauthorized"),
        show_alert: true,
      });
      return;
    }
    // Handled by staff.ts
    await ctx.answerCallbackQuery();
  });

  // Settings callbacks
  bot.callbackQuery(/^settings:lang:(en|am|om|ti)$/, async (ctx) => {
    const lang = ctx.match[1] as "en" | "am" | "om" | "ti";
    await ctx.i18n.setLocale(lang);
    ctx.session.language = lang;
    if (ctx.session.userId) {
      await prisma.user.update({
        where: { id: ctx.session.userId },
        data: { languagePreference: lang },
      });
    }
    await ctx.editMessageText(ctx.t("settings_language_updated"), {
      reply_markup: settingsKeyboard(ctx),
    });
    await ctx.answerCallbackQuery({
      text: ctx.t("settings_language_updated"),
    });
  });

  bot.callbackQuery("settings:language", async (ctx) => {
    await ctx.editMessageText(ctx.t("settings_choose_language"), {
      reply_markup: languageKeyboard("settings:lang"),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("settings:notifications", async (ctx) => {
    await ctx.editMessageText(ctx.t("settings_notifications"), {
      reply_markup: notificationSettingsKeyboard(ctx),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^settings:notif:(\w+):(on|off)$/, async (ctx) => {
    const key = ctx.match[1] as keyof NonNullable<
      typeof ctx.session.notificationSettings
    >;
    const value = ctx.match[2] === "on";
    const current = ctx.session.notificationSettings || {
      jobs: true,
      proposals: true,
      escrow: true,
      disputes: true,
      wallet: true,
      kyc: true,
    };
    ctx.session.notificationSettings = {
      ...current,
      [key]: value,
    };
    await ctx.editMessageText(ctx.t("settings_notifications"), {
      reply_markup: notificationSettingsKeyboard(ctx),
    });
    await ctx.answerCallbackQuery({ text: value ? ctx.t("notif_enabled") : ctx.t("notif_disabled") });
  });

  bot.callbackQuery("settings:privacy", async (ctx) => {
    await ctx.editMessageText(ctx.t("privacy_summary"), {
      reply_markup: settingsKeyboard(ctx),
    });
    await ctx.answerCallbackQuery();
  });

  // Wallet callbacks
  bot.callbackQuery("wallet:withdraw", async (ctx) => {
    if (ctx.session.kycTier !== "TIER_2" && ctx.session.kycTier !== "TIER_3") {
      await ctx.answerCallbackQuery({
        text: ctx.t("errors_tier2_required"),
        show_alert: true,
      });
      return;
    }
    startScene(ctx, "withdraw");
    await ctx.editMessageText(ctx.t("wallet_withdraw_amount"), {
      reply_markup: confirmKeyboard(ctx, "withdraw:confirm", "menu:wallet"),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("wallet:topup", async (ctx) => {
    startScene(ctx, "topup");
    await ctx.editMessageText(
      ctx.t("wallet_topup_instructions", {
        amount: "1000",
        phone: "+2519...",
        reference: "TOPUP-123",
      }),
      {
        reply_markup: confirmKeyboard(ctx, "topup:upload", "menu:wallet"),
      },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("wallet:transactions", async (ctx) => {
    await showWalletActivity(ctx, "recent");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("wallet:history", async (ctx) => {
    await showWalletActivity(ctx, "all");
    await ctx.answerCallbackQuery();
  });

  // KYC callbacks
  bot.callbackQuery(/^kyc:upload:(id|selfie|tin|business)$/, async (ctx) => {
    const docType = ctx.match[1]!;
    startScene(ctx, `kyc_upload_${docType}`);
    const prompts: Record<string, string> = {
      id: ctx.t("kyc_upload_id"),
      selfie: ctx.t("kyc_upload_selfie"),
      tin: ctx.t("kyc_upload_tin"),
      business: ctx.t("kyc_upload_business_reg"),
    };
    await ctx.editMessageText(prompts[docType]!, {
      reply_markup: confirmKeyboard(ctx, "kyc:confirm_upload", "menu:kyc"),
    });
    await ctx.answerCallbackQuery();
  });

  // Proposal callbacks
  bot.callbackQuery(/^proposal:shortlist:(\w+)$/, async (ctx) => {
    await openMiniAppRoute(ctx, ctx.t("miniapp_proposal_shortlist"), webAppRoutes.proposals());
  });

  bot.callbackQuery(/^proposal:accept:(\w+)$/, async (ctx) => {
    await openMiniAppRoute(ctx, ctx.t("miniapp_proposal_accept"), webAppRoutes.proposals());
  });

  bot.callbackQuery(/^proposal:reject:(\w+)$/, async (ctx) => {
    await openMiniAppRoute(ctx, ctx.t("miniapp_proposal_reject"), webAppRoutes.proposals());
  });

  bot.callbackQuery(/^proposal:view:(\w+)$/, async (ctx) => {
    await openMiniAppRoute(ctx, ctx.t("miniapp_proposal_view"), webAppRoutes.proposals());
  });

  bot.callbackQuery(/^proposal:withdraw:(\w+)$/, async (ctx) => {
    await openMiniAppRoute(ctx, ctx.t("miniapp_proposal_withdraw"), webAppRoutes.proposals());
  });

  // Contract callbacks
  bot.callbackQuery(/^contract:sign:(\w+)$/, async (ctx) => {
    const contractId = ctx.match[1]!;
    await openMiniAppRoute(ctx, ctx.t("miniapp_contract_sign"), webAppRoutes.contract(contractId));
  });

  bot.callbackQuery(/^contract:view:(\w+)$/, async (ctx) => {
    const contractId = ctx.match[1]!;
    await openMiniAppRoute(ctx, ctx.t("miniapp_contract_view"), webAppRoutes.contract(contractId));
  });

  bot.callbackQuery(/^contract:fund:(\w+)$/, async (ctx) => {
    const contractId = ctx.match[1]!;
    await openMiniAppRoute(ctx, ctx.t("miniapp_contract_fund"), webAppRoutes.contract(contractId));
  });

  bot.callbackQuery(/^contract:deliver:(\w+)$/, async (ctx) => {
    const contractId = ctx.match[1];
    startScene(ctx, "deliver", { contractId });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^contract:dispute:(\w+)$/, async (ctx) => {
    const contractId = ctx.match[1];
    startScene(ctx, "dispute_raise", { contractId });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^contract:mediate:(\w+)$/, async (ctx) => {
    const contractId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  // Milestone callbacks
  bot.callbackQuery(/^milestone:fund:(\w+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    await openMiniAppRoute(ctx, ctx.t("miniapp_milestone_fund"), webAppRoutes.contract(""));
  });

  bot.callbackQuery(/^milestone:deliver:(\w+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    startScene(ctx, "deliver", { milestoneId });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^milestone:accept:(\w+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    await openMiniAppRoute(ctx, ctx.t("miniapp_milestone_accept"), webAppRoutes.contract(""));
  });

  bot.callbackQuery(/^milestone:dispute:(\w+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    startScene(ctx, "dispute_raise", { milestoneId });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^milestone:dispute:view:(\w+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^milestone:view:(\w+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  // Dispute callbacks
  bot.callbackQuery(/^dispute:evidence:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    startScene(ctx, "dispute_raise", { disputeId });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dispute:negotiate:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dispute:escalate:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dispute:evidence:view:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dispute:accept:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    await ctx.answerCallbackQuery({ text: ctx.t("dispute_proposal_accepted") });
  });

  bot.callbackQuery(/^dispute:arbitrate:(\w+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dispute:cat:(\w+)$/, async (ctx) => {
    const category = ctx.match[1];
    // This is handled in the scene
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dispute:confirm:(yes|no)$/, async (ctx) => {
    // Handled by conversation
    await ctx.answerCallbackQuery();
  });

  // Withdraw callbacks
  bot.callbackQuery(/^withdraw:dest:(\w+)$/, async (ctx) => {
    const dest = ctx.match[1];
    if (dest === "menu") return;
    // Scene handles this
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^withdraw:confirm:(yes|no)$/, async (ctx) => {
    // Handled by conversation
    await ctx.answerCallbackQuery();
  });

  // Topup callbacks
  bot.callbackQuery(/^topup:upload$/, async (ctx) => {
    // Scene handles this
    await ctx.answerCallbackQuery();
  });

  // Propose callbacks
  bot.callbackQuery(/^propose:confirm:(yes|no)$/, async (ctx) => {
    // Handled by conversation
    await ctx.answerCallbackQuery();
  });

  // Generic back/close
  bot.callbackQuery("noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });
}
