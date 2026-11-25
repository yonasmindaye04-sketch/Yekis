import { createHash } from "node:crypto";
import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import { mainMenuKeyboard } from "../keyboards/mainMenu.js";
import { languageKeyboard } from "../keyboards/language.js";
import {
  walletActionsKeyboard,
  kycActionsKeyboard,
  jobFiltersKeyboard,
  settingsKeyboard,
  notificationSettingsKeyboard,
} from "../keyboards/actions.js";
import {
  webAppRoutes,
  botUsername,
  webAuthRoute,
  buildPublicWebAppUrl,
  canLinkToWeb,
  safeWebUrl,
  safeUrlKeyboard,
} from "../utils/deepLink.js";
import {
  approveWebLogin,
  denyWebLogin,
  issueTelegramLoginCode,
  TELEGRAM_CODE_TTL_SECONDS,
} from "../../auth/telegram-code.service.js";
import { prisma } from "../../../lib/prisma.js";

/** Guards against a member spamming /login and orphaning codes. */
const CODE_ISSUE_COOLDOWN_SECONDS = 30;

export function registerCommands(bot: Bot<BotContext>) {
  // ── /start — THE LOGIN ENTRY POINT ──────────────────────────────────────
  // Reaching this bot IS the sign-in. Telegram has already authenticated
  // `from.id` by delivering the update to us, and authMiddleware has resolved
  // or provisioned the matching Yekis account, so by this point ctx.session
  // .userId is authoritative. We also mint a one-time code the member can use
  // to sign in on the web, because the browser cannot present this proof.
  bot.command("start", async (ctx) => {
    const payload = ctx.match?.[0]?.trim();
    const name = ctx.from?.first_name || ctx.t("start_greeting_fallback");

    // When a member arrives via the web's "Continue with Telegram" button
    // (?start=web_auth), they came explicitly to get a code. Reply immediately
    // with the code rather than the general welcome so they can get back to the
    // browser faster. Fall through to the standard welcome if we cannot mint one.
    if (payload === "web_auth" && ctx.session.userId && ctx.session.telegramUserId) {
      try {
        const { code: authCode } = await issueTelegramLoginCode({
          userId: ctx.session.userId,
          telegramUserId: ctx.session.telegramUserId,
        });
        const link = webAuthRoute(authCode);
        const kb = new InlineKeyboard();
        if (canLinkToWeb()) {
          kb.url(ctx.t("start_sign_in_web_btn"), link).row();
        }
        const minutes = Math.round(TELEGRAM_CODE_TTL_SECONDS / 60);
        await ctx.reply(
          `<b>${ctx.t("start_web_code_title")}</b> <code>${authCode}</code>\n\n` +
            (canLinkToWeb()
              ? ctx.t("start_tap_web_signin")
              : ctx.t("start_open_browser_code", { url: env.FRONTEND_URL })) +
            `\n\n<i>${ctx.t("start_code_expiry", { minutes })}</i>`,
          { reply_markup: kb, parse_mode: "HTML" },
        );
        return;
      } catch (err) {
        logger.warn({ err }, "Failed to mint web_auth code, falling through to standard welcome");
        // Fall through to standard /start welcome below
      }
    }

    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    const kb = new InlineKeyboard();

    // One-tap path into the web app, carrying a single-use sign-in code so the
    // browser lands already authenticated.
    //
    // The button is only offered when Telegram will accept the URL. With a
    // loopback/LAN/http FRONTEND_URL it will not, and because a rejected button
    // URL fails the ENTIRE sendMessage call, adding it anyway means the member
    // receives no welcome message at all — which is exactly the bug that made
    // the bot look dead.
    const signIn = await mintWebSignIn(ctx);
    if (signIn && canLinkToWeb()) {
      kb.url(ctx.t("start_sign_in_web_btn"), signIn.link).row();
    }

    // A Mini App button is only valid on a public HTTPS origin. Skip it rather
    // than pointing members at a URL Telegram would reject — or worse, one
    // that resolves nowhere.
    const miniAppUrl = buildPublicWebAppUrl("/");
    if (miniAppUrl) {
      kb.webApp(ctx.t("open_yekis_jobs_btn"), miniAppUrl).row();
    }

    kb.text(ctx.t("menu_jobs"), "menu:jobs")
      .text(ctx.t("menu_contracts"), "menu:contracts")
      .row()
      .text(ctx.t("menu_wallet"), "menu:wallet")
      .text(ctx.t("menu_kyc"), "menu:kyc")
      .row()
      .text(ctx.t("menu_settings"), "menu:settings")
      .text(ctx.t("menu_help"), "menu:help");

    const webHint = canLinkToWeb()
      ? ctx.t("start_web_hint_link")
      : ctx.t("start_web_hint_manual");
    const welcomeMsg = ctx.t("start_welcome_html", { name, webHint });

    await ctx.reply(welcomeMsg, {
      reply_markup: kb,
      parse_mode: "HTML",
    });

    // The code is also surfaced as text so a member can type it into the
    // browser by hand. In local development that is the ONLY route, because
    // Telegram refuses buttons pointing at localhost over http.
    if (signIn) {
      const reachable = canLinkToWeb();
      const minutes = Math.round(TELEGRAM_CODE_TTL_SECONDS / 60);
      await ctx.reply(
        `${ctx.t("start_one_time_code_intro", { code: signIn.code })}\n\n` +
          (reachable
            ? ctx.t("start_one_time_code_tap")
            : ctx.t("start_open_browser_code", { url: env.FRONTEND_URL }) +
              `\n\n<i>${ctx.t("start_one_time_code_dev_hint")}</i>`) +
          `\n\n<i>${ctx.t("start_code_expiry", { minutes })}</i>`,
        { parse_mode: "HTML" },
      );
    }
  });

  // ── /login — mint a fresh web sign-in code ──────────────────────────────
  bot.command("login", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    // telegramUserId is stored as 0 until authMiddleware populates it.
    // Guard against that so BigInt(0) doesn't produce a bogus code record.
    if (!ctx.session.telegramUserId) {
      await ctx.reply(ctx.t("login_no_telegram_id"));
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const last = ctx.session.codeIssuedAt ?? 0;
    if (now - last < CODE_ISSUE_COOLDOWN_SECONDS) {
      await ctx.reply(
        ctx.t("login_cooldown", { seconds: CODE_ISSUE_COOLDOWN_SECONDS - (now - last) }),
      );
      return;
    }

    const { code } = await issueTelegramLoginCode({
      userId: ctx.session.userId,
      telegramUserId: ctx.session.telegramUserId,
    });
    ctx.session.codeIssuedAt = now;

    const kb = new InlineKeyboard();
    const link = webAuthRoute(code);
    // Only offer the button when Telegram will accept the URL — a rejected
    // button URL fails the whole sendMessage and the member gets nothing.
    if (canLinkToWeb()) {
      kb.url(ctx.t("login_open_yekis_btn"), link).row();
      kb.text(ctx.t("login_new_code_btn"), "auth:new_code");
    }

    const minutes = Math.round(TELEGRAM_CODE_TTL_SECONDS / 60);
    await ctx.reply(
      `<b>${ctx.t("login_code_title")}:</b> <code>${code}</code>\n\n` +
        (canLinkToWeb()
          ? ctx.t("login_code_body_link")
          : ctx.t("start_open_browser_code", { url: env.FRONTEND_URL })) +
        `\n\n<i>${ctx.t("start_code_expiry", { minutes })}</i>`,
      { reply_markup: kb, parse_mode: "HTML" },
    );
  });

  // ── /account — what am I signed in as? ──────────────────────────────────
  bot.command("account", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: {
        ucid: true,
        role: true,
        staffRole: true,
        email: true,
        telegramUserId: true,
        telegramChatId: true,
        kyc: { select: { tier: true, status: true } },
      },
    });
    if (!user) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(
      `<b>${ctx.t("account_title")}</b>\n\n` +
        `${ctx.t("account_customer_id")}: <code>${user.ucid}</code>\n` +
        `${ctx.t("account_role")}: ${user.staffRole ?? user.role}\n` +
        `${ctx.t("account_email")}: ${user.email}\n` +
        `${ctx.t("account_telegram_linked")}: ${user.telegramUserId ? ctx.t("confirm_yes") : ctx.t("confirm_no")}\n` +
        `${ctx.t("account_push_notifications")}: ${user.telegramChatId ? ctx.t("account_push_active") : ctx.t("account_push_paused")}\n` +
        `${ctx.t("account_kyc")}: ${user.kyc?.tier ?? "TIER_1"} / ${user.kyc?.status ?? "PENDING"}`,
      { parse_mode: "HTML" },
    );
  });

  // ── /link ───────────────────────────────────────────────────────────────
  // During local dev the public origin is a Cloudflare Tunnel whose hostname
  // changes on every run, so "what is the Mini App URL right now?" has to be
  // answerable without opening BotFather. This always reports the CURRENT
  // FRONTEND_URL — the exact same value the chat menu button and every
  // /start Mini App button were built from on this boot.
  bot.command("link", async (ctx) => {
    const miniAppUrl = buildPublicWebAppUrl("/");
    if (!miniAppUrl) {
      await ctx.reply(ctx.t("link_none"), { parse_mode: "HTML" });
      return;
    }
    await ctx.reply(ctx.t("link_current", { url: miniAppUrl }), {
      parse_mode: "HTML",
    });
  });

  // ── /menu ───────────────────────────────────────────────────────────────
  bot.command("menu", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(ctx.t("main_menu"), {
      reply_markup: mainMenuKeyboard(ctx),
    });
  });

  // ── /help ───────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(ctx.t("help_commands"), {
      parse_mode: "Markdown",
    });
  });

  // ── /language ───────────────────────────────────────────────────────────
  bot.command("language", async (ctx) => {
    await ctx.reply(ctx.t("choose_language"), {
      reply_markup: languageKeyboard(),
    });
  });

  // ── /jobs ───────────────────────────────────────────────────────────────
  bot.command("jobs", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(ctx.t("jobs_title"), {
      reply_markup: jobFiltersKeyboard(ctx, 0, {}),
    });
  });

  // ── /wallet ─────────────────────────────────────────────────────────────
  bot.command("wallet", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: ctx.session.userId },
      select: { balanceMinor: true },
    });
    const balance = ((wallet?.balanceMinor ?? 0) / 100).toFixed(2);

    await ctx.reply(
      ctx.t("wallet_balance", {
        balance,
        // Escrow holds live in the escrow ledger, not the wallet balance; the
        // bot has no cheap per-user aggregate for it, so report the settled
        // figure rather than inventing a pending number.
        pending: "—",
        available: balance,
      }),
      {
        reply_markup: walletActionsKeyboard(ctx),
      },
    );
  });

  // ── /kyc ────────────────────────────────────────────────────────────────
  bot.command("kyc", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    const tier = ctx.session.kycTier || "TIER_1";
    const status = ctx.session.kycStatus || "PENDING";

    await ctx.reply(ctx.t("kyc_title"), {
      reply_markup: kycActionsKeyboard(ctx, tier, status),
    });
  });

  // ── /contracts ──────────────────────────────────────────────────────────
  bot.command("contracts", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(ctx.t("contract_list_prompt", { id: "" }), {
      reply_markup: safeUrlKeyboard([
        { text: ctx.t("contracts_view_btn"), url: webAppRoutes.contract("") },
      ]),
    });
  });

  // ── /disputes ───────────────────────────────────────────────────────────
  bot.command("disputes", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(`${ctx.t("disputes_title")}:`, {
      reply_markup: safeUrlKeyboard([
        { text: ctx.t("disputes_view_btn"), url: webAppRoutes.disputes() },
      ]),
    });
  });

  // ── /proposals ──────────────────────────────────────────────────────────
  bot.command("proposals", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(`${ctx.t("my_proposals_title")}:`, {
      reply_markup: safeUrlKeyboard([
        { text: ctx.t("proposals_view_btn"), url: webAppRoutes.proposals() },
      ]),
    });
  });

  // ── /notifications ──────────────────────────────────────────────────────
  bot.command("notifications", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply(ctx.t("notifications_title"), {
      reply_markup: notificationSettingsKeyboard(ctx),
    });
  });

  // ── /settings ───────────────────────────────────────────────────────────
  bot.command("settings", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
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

    await ctx.reply(ctx.t("broadcast_coming_soon"));
  });

  // Callback for "give me a fresh code" without retyping /login.
  bot.callbackQuery("auth:new_code", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }
    if (!ctx.session.telegramUserId) {
      await ctx.reply(ctx.t("login_no_telegram_id"));
      return;
    }

    const { code } = await issueTelegramLoginCode({
      userId: ctx.session.userId,
      telegramUserId: ctx.session.telegramUserId,
    });

    const link = safeWebUrl(webAuthRoute(code));
    await ctx.reply(
      link
        ? `<b>${ctx.t("auth_new_code_title")}</b> <code>${code}</code>\n\n${ctx.t("auth_new_code_tap")}`
        : `<b>${ctx.t("auth_new_code_title")}</b> <code>${code}</code>\n\n` +
            ctx.t("auth_new_code_manual", { url: env.FRONTEND_URL }),
      link
        ? {
            reply_markup: new InlineKeyboard().url(ctx.t("login_open_yekis_btn"), link),
            parse_mode: "HTML",
          }
        : { parse_mode: "HTML" },
    );
  });
}

/**
 * Explains why the member is not signed in and exactly how to fix it, instead
 * of the generic "you don't have permission" dead end.
 */
async function replyLoginBlocked(ctx: BotContext) {
  await ctx.reply(
    ctx.session.loginBlocked ?? ctx.t("login_blocked_fallback"),
  );
}

/**
 * Mints a one-time web sign-in code for this member and returns both the code
 * (to display) and the deep link (for the button).
 *
 * Returns null when the bot has no FRONTEND_URL configured, or when minting
 * failed — the member can still use every in-bot command either way, so a
 * failure here must never block the rest of the reply.
 */
async function mintWebSignIn(
  ctx: BotContext,
): Promise<{ code: string; link: string } | null> {
  if (!env.FRONTEND_URL) return null;
  // telegramUserId is stored as 0 until authMiddleware populates it.
  if (!ctx.session.userId || !ctx.session.telegramUserId) return null;
  try {
    const { code } = await issueTelegramLoginCode({
      userId: ctx.session.userId!,
      telegramUserId: ctx.session.telegramUserId,
    });
    return { code, link: webAuthRoute(code) };
  } catch (err) {
    logger.error({ err }, "Failed to issue Telegram web sign-in code");
    return null;
  }
}

async function showStaffDashboard(ctx: BotContext) {
  const kb = new InlineKeyboard()
    .text(ctx.t("staff_kyc_queue", { count: 0 }), "staff:kyc_queue:0")
    .text(ctx.t("staff_topup_queue", { count: 0 }), "staff:topup_queue:0")
    .row()
    .text(ctx.t("staff_dispute_queue", { count: 0 }), "staff:dispute_queue:0")
    .text(ctx.t("staff_tms_queue", { count: 0 }), "staff:tms_queue:0")
    .row()
    .text(ctx.t("staff_analytics"), "staff:analytics")
    .text(ctx.t("staff_broadcast"), "staff:broadcast")
    .row()
    .text(ctx.t("staff_user_lookup"), "staff:user_lookup");

  await ctx.reply(ctx.t("staff_dashboard_title"), { reply_markup: kb });
}