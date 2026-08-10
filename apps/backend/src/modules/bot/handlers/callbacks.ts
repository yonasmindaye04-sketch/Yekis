import { Bot, CallbackQueryContext, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { env } from "../../../config/env.js";
import { mainMenuKeyboard, languageKeyboard, settingsKeyboard, confirmKeyboard, paginationKeyboard } from "../keyboards/mainMenu.js";
import { jobFiltersKeyboard } from "../keyboards/jobFilters.js";
import { proposalActionsKeyboard, contractActionsKeyboard, walletActionsKeyboard, kycActionsKeyboard, disputeActionsKeyboard, notificationSettingsKeyboard } from "../keyboards/actions.js";
import { startScene } from "../middleware/sceneTimeout.middleware.js";
import { formatJobCard, formatProposalCard, formatContractCard, formatWalletCard } from "../formatters/index.js";
import { prisma } from "../../../lib/prisma.js";
import { webAppRoutes } from "../utils/deepLink.js";
import { registerStaffHandlers } from "./staff.js";

export function registerCallbacks(bot: Bot<BotContext>) {
 // Register staff handlers
 registerStaffHandlers(bot);

 // Language selection
 bot.callbackQuery(/^lang:(en|am)$/, async (ctx) => {
 const lang = ctx.match[1] as "en" | "am";
 ctx.session.language = lang;
 await ctx.i18n.setLocale(lang);

 
 await ctx.editMessageText(
 lang === "en" ? ctx.t("language_set") : ctx.t("language_set_am"),
 { reply_markup: mainMenuKeyboard(ctx) }
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
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
 return;
 }

 await ctx.editMessageText(ctx.t("jobs_title"), {
 reply_markup: jobFiltersKeyboard(ctx, 0, {}),
 });
 await ctx.answerCallbackQuery();
 });

 // Job filters and pagination
 bot.callbackQuery(/^jobs:filter:category:(.+)$/, async (ctx) => {
 const category = ctx.match[1];
 await ctx.answerCallbackQuery({ text: `Filter: ${category}` });
 // TODO: Implement filtered job list
 });

 bot.callbackQuery(/^jobs:filter:budget:(.+)$/, async (ctx) => {
 const budget = ctx.match[1];
 await ctx.answerCallbackQuery({ text: `Budget: ${budget}` });
 });

 bot.callbackQuery(/^jobs:filter:sort:(.+)$/, async (ctx) => {
 const sort = ctx.match[1];
 await ctx.answerCallbackQuery({ text: `Sort: ${sort}` });
 });

 bot.callbackQuery("jobs:filter:clear", async (ctx) => {
 await ctx.editMessageText(ctx.t("jobs_title"), {
 reply_markup: jobFiltersKeyboard(ctx, 0, {}),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery(/^jobs:page:(\d+)$/, async (ctx) => {
 const page = parseInt(ctx.match[1], 10);
 // TODO: Fetch and display jobs for this page
 await ctx.answerCallbackQuery({ text: `Page ${page + 1}` });
 });

 bot.callbackQuery("menu:my_jobs", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
 return;
 }
 // TODO: Fetch user's jobs
 await ctx.editMessageText("My Jobs - Coming soon", {
 reply_markup: mainMenuKeyboard(ctx),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("menu:proposals", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
 return;
 }
 // TODO: Fetch user's proposals
 await ctx.editMessageText("My Proposals - Coming soon", {
 reply_markup: mainMenuKeyboard(ctx),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("menu:contracts", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
 return;
 }
 // TODO: Fetch user's contracts
 await ctx.editMessageText("Your Contracts", {
 reply_markup: new InlineKeyboard()
 .url(" View Contracts", webAppRoutes.contract(""))
 .text(ctx.t("back"), "menu:main"),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("menu:wallet", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
 return;
 }
 // TODO: Fetch actual wallet data
 await ctx.editMessageText(ctx.t("wallet_balance", { balance: "0.00", pending: "0.00", available: "0.00" }), {
 reply_markup: walletActionsKeyboard(ctx),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("menu:kyc", async (ctx) => {
 if (!ctx.session.userId) {
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
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
 await ctx.answerCallbackQuery({ text: ctx.t("errors_kyc_required"), show_alert: true });
 return;
 }
 await ctx.editMessageText("Your Disputes", {
 reply_markup: new InlineKeyboard()
 .url(" View Disputes", webAppRoutes.disputes())
 .text(ctx.t("back"), "menu:main"),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("menu:notifications", async (ctx) => {
 await ctx.editMessageText(ctx.t("notifications_empty"), {
 reply_markup: mainMenuKeyboard(ctx),
 });
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
 await ctx.answerCallbackQuery({ text: ctx.t("errors_unauthorized"), show_alert: true });
 return;
 }
 // Handled by staff.ts
 await ctx.answerCallbackQuery();
 });

 // Settings callbacks
 bot.callbackQuery("settings:language", async (ctx) => {
 await ctx.editMessageText(ctx.t("choose_language"), {
 reply_markup: languageKeyboard(),
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
 const key = ctx.match[1];
 const value = ctx.match[2] === "on";
 ctx.session.notificationSettings = {
 ...ctx.session.notificationSettings,
 [key]: value,
 };
 await ctx.editMessageText(ctx.t("settings_notifications"), {
 reply_markup: notificationSettingsKeyboard(ctx),
 });
 await ctx.answerCallbackQuery({ text: value ? "Enabled" : "Disabled" });
 });

 bot.callbackQuery("settings:privacy", async (ctx) => {
 await ctx.editMessageText("Privacy settings - Coming soon", {
 reply_markup: settingsKeyboard(ctx),
 });
 await ctx.answerCallbackQuery();
 });

 // Wallet callbacks
 bot.callbackQuery("wallet:withdraw", async (ctx) => {
 if (ctx.session.kycTier !== "TIER_2" && ctx.session.kycTier !== "TIER_3") {
 await ctx.answerCallbackQuery({ text: ctx.t("errors_tier2_required"), show_alert: true });
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
 await ctx.editMessageText(ctx.t("wallet_topup_instructions", { amount: "1000", phone: "+2519...", reference: "TOPUP-123" }), {
 reply_markup: confirmKeyboard(ctx, "topup:upload", "menu:wallet"),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("wallet:transactions", async (ctx) => {
 await ctx.editMessageText("Transaction history - Coming soon", {
 reply_markup: mainMenuKeyboard(ctx),
 });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery("wallet:history", async (ctx) => {
 await ctx.editMessageText("Transaction history - Coming soon", {
 reply_markup: mainMenuKeyboard(ctx),
 });
 await ctx.answerCallbackQuery();
 });

 // KYC callbacks
 bot.callbackQuery(/^kyc:upload:(id|selfie|tin|business)$/, async (ctx) => {
 const docType = ctx.match[1];
 startScene(ctx, `kyc_upload_${docType}`);
 const prompts: Record<string, string> = {
 id: ctx.t("kyc_upload_id"),
 selfie: ctx.t("kyc_upload_selfie"),
 tin: ctx.t("kyc_upload_tin"),
 business: ctx.t("kyc_upload_business_reg"),
 };
 await ctx.editMessageText(prompts[docType], {
 reply_markup: confirmKeyboard(ctx, "kyc:confirm_upload", "menu:kyc"),
 });
 await ctx.answerCallbackQuery();
 });

 // Proposal callbacks
 bot.callbackQuery(/^proposal:shortlist:(\w+)$/, async (ctx) => {
 const proposalId = ctx.match[1];
 // TODO: Call API to shortlist
 await ctx.answerCallbackQuery({ text: "Shortlisted" });
 });

 bot.callbackQuery(/^proposal:accept:(\w+)$/, async (ctx) => {
 const proposalId = ctx.match[1];
 // TODO: Call API to accept
 await ctx.answerCallbackQuery({ text: "Accepted" });
 });

 bot.callbackQuery(/^proposal:reject:(\w+)$/, async (ctx) => {
 const proposalId = ctx.match[1];
 // TODO: Call API to reject
 await ctx.answerCallbackQuery({ text: "Rejected" });
 });

 bot.callbackQuery(/^proposal:view:(\w+)$/, async (ctx) => {
 const proposalId = ctx.match[1];
 // TODO: Show proposal details
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery(/^proposal:withdraw:(\w+)$/, async (ctx) => {
 const proposalId = ctx.match[1];
 // TODO: Call API to withdraw
 await ctx.answerCallbackQuery({ text: "Withdrawn" });
 });

 // Contract callbacks
 bot.callbackQuery(/^contract:sign:(\w+)$/, async (ctx) => {
 const contractId = ctx.match[1];
 await ctx.answerCallbackQuery({ text: "Opening signature...", show_alert: false });
 // Opens Mini App for signing
 });

 bot.callbackQuery(/^contract:view:(\w+)$/, async (ctx) => {
 const contractId = ctx.match[1];
 await ctx.answerCallbackQuery({ text: "Opening contract...", show_alert: false });
 });

 bot.callbackQuery(/^contract:fund:(\w+)$/, async (ctx) => {
 const contractId = ctx.match[1];
 // TODO: Show funding options
 await ctx.answerCallbackQuery();
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
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery(/^milestone:deliver:(\w+)$/, async (ctx) => {
 const milestoneId = ctx.match[1];
 startScene(ctx, "deliver", { milestoneId });
 await ctx.answerCallbackQuery();
 });

 bot.callbackQuery(/^milestone:accept:(\w+)$/, async (ctx) => {
 const milestoneId = ctx.match[1];
 // TODO: Call API to accept
 await ctx.answerCallbackQuery({ text: "Accepted" });
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
 await ctx.answerCallbackQuery({ text: "Proposal accepted" });
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
