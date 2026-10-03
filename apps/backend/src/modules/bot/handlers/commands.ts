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
  isPublicFrontendUrl,
} from "../utils/deepLink.js";
import {
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
    const name = ctx.from?.first_name || "there";

    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    const kb = new InlineKeyboard();

    // One-tap path into the web app, carrying a single-use sign-in code so the
    // browser lands already authenticated.
    const signIn = await mintWebSignIn(ctx);
    if (signIn) {
      kb.url("🌐 Sign in on the web", signIn.link).row();
    }

    // A Mini App button is only valid on a public HTTPS origin. Skip it rather
    // than pointing members at a URL Telegram would reject — or worse, one
    // that resolves nowhere.
    const miniAppUrl = buildPublicWebAppUrl("/");
    if (miniAppUrl) {
      kb.webApp("Open Yekis Jobs", miniAppUrl).row();
    }

    kb.text("Browse Jobs", "menu:jobs")
      .text("My Contracts", "menu:contracts")
      .row()
      .text("Wallet", "menu:wallet")
      .text("KYC Verification", "menu:kyc")
      .row()
      .text("Settings", "menu:settings")
      .text("Help", "menu:help");

    const welcomeMsg =
      `**Welcome to Yekis Jobs, ${name}!**\n\n` +
      `You are signed in with Telegram${payload ? ` (via \`${payload}\`)` : ""}.\n\n` +
      `**What you can do:**\n` +
      `• **Clients:** Post jobs, review proposals, and fund secure escrow.\n` +
      `• **Freelancers:** Browse jobs, submit proposals, and get guaranteed payouts.\n\n` +
      `Tap **"Sign in on the web"** to open Yekis in your browser — it signs you in automatically.`;

    await ctx.reply(welcomeMsg, {
      reply_markup: kb,
      parse_mode: "Markdown",
    });

// The code is also surfaced as text so a member on desktop can type it
    // into the browser by hand when the button does not open for them.
    if (signIn) {
      // A loopback or LAN FRONTEND_URL resolves to the member's own phone, so
      // the button will not work for them. Say so instead of letting them hit a
      // connection error and conclude the bot is broken.
      const reachable = isPublicFrontendUrl();
      await ctx.reply(
        `Your one-time web sign-in code is \`${signIn.code}\`.\n\n` +
          (reachable
            ? `Tap **"Sign in on the web"** above, or type the code on the ` +
              `Yekis sign-in page.`
            : `Open Yekis in your browser and enter this code under ` +
              `"Continue with Telegram".\n\n` +
              `_Heads up: this bot is configured with ` +
              `FRONTEND_URL=${env.FRONTEND_URL}, which is only reachable on ` +
              `the machine running it. Set FRONTEND_URL to your public ` +
              `https:// origin for the button to work from a phone._`) +
          `\n\nIt works once and expires in ${Math.round(TELEGRAM_CODE_TTL_SECONDS / 60)} minutes.`,
        { parse_mode: "Markdown" },
      );
    }
  });

  // ── /login — mint a fresh web sign-in code ──────────────────────────────
  bot.command("login", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const last = ctx.session.codeIssuedAt ?? 0;
    if (now - last < CODE_ISSUE_COOLDOWN_SECONDS) {
      await ctx.reply(
        `Please wait ${CODE_ISSUE_COOLDOWN_SECONDS - (now - last)}s before requesting another code.`,
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
    kb.url("🌐 Open Yekis & sign in", link).row();
    kb.text("New code", "auth:new_code");

    await ctx.reply(
      `**Your Yekis web sign-in code:** \`${code}\`\n\n` +
        `Tap the button to sign in automatically, or type the code on the ` +
        `Yekis sign-in page. It works once and expires in ` +
        `${Math.round(TELEGRAM_CODE_TTL_SECONDS / 60)} minutes.`,
      { reply_markup: kb, parse_mode: "Markdown" },
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
      `**Your Yekis account**\n\n` +
        `Customer ID: \`${user.ucid}\`\n` +
        `Role: ${user.staffRole ?? user.role}\n` +
        `Email: ${user.email}\n` +
        `Telegram linked: ${user.telegramUserId ? "yes" : "no"}\n` +
        `Push notifications: ${user.telegramChatId ? "active" : "paused"}\n` +
        `KYC: ${user.kyc?.tier ?? "TIER_1"} / ${user.kyc?.status ?? "PENDING"}`,
      { parse_mode: "Markdown" },
    );
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
      reply_markup: new InlineKeyboard().url(
        "📄 View Contracts",
        webAppRoutes.contract(""),
      ),
    });
  });

  // ── /disputes ───────────────────────────────────────────────────────────
  bot.command("disputes", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply("Your disputes:", {
      reply_markup: new InlineKeyboard().url(
        "⚖️ View Disputes",
        webAppRoutes.disputes(),
      ),
    });
  });

  // ── /proposals ──────────────────────────────────────────────────────────
  bot.command("proposals", async (ctx) => {
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    await ctx.reply("Your proposals:", {
      reply_markup: new InlineKeyboard().url(
        "📝 View Proposals",
        webAppRoutes.proposals(),
      ),
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

    await ctx.reply("Broadcast feature coming soon. Use the Staff Dashboard.");
  });

  // Callback for "give me a fresh code" without retyping /login.
  bot.callbackQuery("auth:new_code", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.session.userId) {
      await replyLoginBlocked(ctx);
      return;
    }

    const { code } = await issueTelegramLoginCode({
      userId: ctx.session.userId,
      telegramUserId: ctx.session.telegramUserId,
    });

    await ctx.reply(
      `**New code:** \`${code}\`\n\nTap to sign in on the web:`,
      {
        reply_markup: new InlineKeyboard().url(
          "🌐 Open Yekis & sign in",
          webAuthRoute(code),
        ),
        parse_mode: "Markdown",
      },
    );
  });
}

/**
 * Explains why the member is not signed in and exactly how to fix it, instead
 * of the generic "you don't have permission" dead end.
 */
async function replyLoginBlocked(ctx: BotContext) {
  await ctx.reply(
    ctx.session.loginBlocked ??
      "I could not sign you in automatically.\n\n" +
        "Please try /start again, or sign in on the web with Google, Apple, or your email and password.",
    { parse_mode: "Markdown" },
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