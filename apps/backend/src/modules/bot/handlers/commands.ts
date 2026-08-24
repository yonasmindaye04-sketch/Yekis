import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { env } from "../../../config/env.js";
import { mainMenuKeyboard } from "../keyboards/mainMenu.js";
import { languageKeyboard } from "../keyboards/language.js";
import { walletActionsKeyboard, kycActionsKeyboard, jobFiltersKeyboard, settingsKeyboard, notificationSettingsKeyboard } from "../keyboards/actions.js";
import { webAppRoutes } from "../utils/deepLink.js";

export function registerCommands(bot: Bot<BotContext>) {
  // /start - Entry point
  bot.command("start", async (ctx) => {
    const frontendUrl = env.FRONTEND_URL || "";
    const name = ctx.from?.first_name || "there";

    const kb = new InlineKeyboard();
    if (frontendUrl && frontendUrl.startsWith("https://")) {
      kb.webApp("Open Yekis Jobs", frontendUrl).row();
    }
    kb.text("Browse Jobs", "menu:jobs")
      .text("My Contracts", "menu:contracts").row()
      .text("Wallet", "menu:wallet")
      .text("KYC Verification", "menu:kyc").row()
      .text("Settings", "menu:settings")
      .text("Help", "menu:help");

    const welcomeMsg = `**Welcome to Yekis Jobs, ${name}!**\n\nEthiopia's premier escrow-protected freelance marketplace.\n\n**What you can do:**\n• **Clients:** Post jobs, review proposals, and fund secure escrow.\n• **Freelancers:** Browse jobs, submit proposals, and get guaranteed payouts.\n\nTap **"Open Yekis Jobs"** below to launch the workspace, or choose an option below:`;

    await ctx.reply(welcomeMsg, {
      reply_markup: kb,
      parse_mode: "Markdown",
    });
  });

 // /menu - Show main menu
 bot.command("menu", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_unauthorized"));
 return;
 }

 await ctx.reply(ctx.t("main_menu"), {
 reply_markup: mainMenuKeyboard(ctx),
 });
 });

 // /help - Show help
 bot.command("help", async (ctx) => {
 await ctx.reply(ctx.t("help_commands"), {
 parse_mode: "Markdown",
 });
 });

 // /language - Change language
 bot.command("language", async (ctx) => {
 await ctx.reply(ctx.t("choose_language"), {
 reply_markup: languageKeyboard(),
 });
 });

 // /jobs - Browse jobs with filters
 bot.command("jobs", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 await ctx.reply(ctx.t("jobs_title"), {
 reply_markup: jobFiltersKeyboard(ctx, 0, {}),
 });
 });

 // /wallet - Show wallet balance
 bot.command("wallet", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 // TODO: Fetch actual balance from API
 await ctx.reply(ctx.t("wallet_balance", {
 balance: "0.00",
 pending: "0.00",
 available: "0.00",
 }), {
 reply_markup: walletActionsKeyboard(ctx),
 });
 });

 // /kyc - KYC status
 bot.command("kyc", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 const tier = ctx.session.kycTier || "TIER_1";
 const status = ctx.session.kycStatus || "PENDING";

 await ctx.reply(ctx.t("kyc_title"), {
 reply_markup: kycActionsKeyboard(ctx, tier, status),
 });
 });

 // /contracts - List contracts
 bot.command("contracts", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 await ctx.reply("Your contracts:", {
 reply_markup: new InlineKeyboard().url(" View Contracts", webAppRoutes.contract("")),
 });
 });

 // /disputes - List disputes
 bot.command("disputes", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 await ctx.reply("Your disputes:", {
 reply_markup: new InlineKeyboard().url(" View Disputes", webAppRoutes.disputes()),
 });
 });

 // /proposals - List proposals
 bot.command("proposals", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 await ctx.reply("Your proposals:", {
 reply_markup: new InlineKeyboard().url(" View Proposals", webAppRoutes.proposals()),
 });
 });

 // /notifications - Notification settings
 bot.command("notifications", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_kyc_required"));
 return;
 }

 await ctx.reply("Notification settings:", {
 reply_markup: notificationSettingsKeyboard(ctx),
 });
 });

 // /settings - Settings
 bot.command("settings", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.reply(ctx.t("errors_unauthorized"));
 return;
 }

 await ctx.reply(ctx.t("settings_title"), {
 reply_markup: settingsKeyboard(ctx),
 });
 });

 // Staff commands
 bot.command("staff", async (ctx) => {
 if (ctx.session.role !== "STAFF") {
 await ctx.reply(ctx.t("errors_unauthorized"));
 return;
 }

 await showStaffDashboard(ctx);
 });

 bot.command("broadcast", async (ctx) => {
 if (ctx.session.role !== "STAFF" || ctx.session.staffRole !== "ADMIN") {
 await ctx.reply(ctx.t("errors_unauthorized"));
 return;
 }

 await ctx.reply("Broadcast feature coming soon. Use the Staff Dashboard.");
 });
}

async function showStaffDashboard(ctx: BotContext) {
 
 const kb = new InlineKeyboard()
 .text(ctx.t("staff_kyc_queue", { count: 0 }), "staff:kyc_queue:0")
 .text(ctx.t("staff_topup_queue", { count: 0 }), "staff:topup_queue:0").row()
 .text(ctx.t("staff_dispute_queue", { count: 0 }), "staff:dispute_queue:0")
 .text(ctx.t("staff_tms_queue", { count: 0 }), "staff:tms_queue:0").row()
 .text(ctx.t("staff_analytics"), "staff:analytics")
 .text(ctx.t("staff_broadcast"), "staff:broadcast").row()
 .text(ctx.t("staff_user_lookup"), "staff:user_lookup");

 await ctx.reply(ctx.t("staff_dashboard_title"), { reply_markup: kb });
}
