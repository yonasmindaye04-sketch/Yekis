import { Router, Request, Response, NextFunction, json } from "express";
import { timingSafeEqual } from "node:crypto";
import { getBot, webhookHandler, startBot, stopBot, withApiTimeout } from "./bot.service.js";
import { env } from "../../config/env.js";
import { requireAuth, requireFreshAuth } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import { isPublishableWebUrl } from "./utils/deepLink.js";

const router = Router();

/**
 * Length-safe constant-time compare. `timingSafeEqual` throws on a length
 * mismatch, so lengths are compared first and the result folded into a boolean
 * without an early return. Same shape as the comparison in
 * telegram-code.service.ts.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** scheme://host[:port] of a URL, or null when it cannot be parsed. */
function webhookOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin.toLowerCase();
  } catch {
    return null;
  }
}

// Webhook endpoint - must be before body parser for raw body access
router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
try {
      // Authentication comes FIRST, before getBot() and before any body
      // handling. An unauthenticated caller must not be able to make the process
      // do work, and the two failure modes must stay distinguishable so a
      // misconfiguration is not mistaken for an attack.
      //
      // Telegram sends the configured secret in this header, and it is the only
      // thing distinguishing a genuine update from anybody who found the URL.
      // Without it this endpoint is an open door: it runs commands on behalf of
      // whoever posts to it, and Mini App initData payloads are bearer
      // credentials.
      //
      // The check used to be skipped entirely when the secret was unset
      // (`if (env.TELEGRAM_WEBHOOK_SECRET && ...)`). Production is protected by
      // assertProductionSafety refusing to boot without one, so the gap was dev
      // and staging — the environments most likely to be reachable and least
      // likely to be watched. An unset secret is now a hard failure: fail closed,
      // and say why.
      const configuredSecret = env.TELEGRAM_WEBHOOK_SECRET;
      if (!configuredSecret) {
        logger.error(
          {},
          "TELEGRAM_WEBHOOK_SECRET is not set - refusing webhook updates rather than accepting unauthenticated ones",
        );
        return res.status(503).json({
          error: "WEBHOOK_NOT_CONFIGURED",
          message: "Webhook secret is not configured; updates are refused.",
        });
      }

      const secretToken = req.headers["x-telegram-bot-api-secret-token"];
      if (
        typeof secretToken !== "string" ||
        !timingSafeEqualStrings(secretToken, configuredSecret)
      ) {
        logger.warn(
          { secretProvided: typeof secretToken === "string" },
          "Invalid webhook secret token",
        );
        return res.status(401).json({ error: "Invalid secret token" });
      }

      const bot = getBot();
      if (!bot) {
        return res.status(503).json({ error: "Bot not initialized" });
      }

      // Use Grammy's webhook handler
      await webhookHandler(bot)(req, res);
    } catch (error) {
      logger.error({ error }, "Webhook processing failed");
      next(error);
    }
  },
);

// Health check endpoint
router.get("/health", async (req: Request, res: Response) => {
  const bot = getBot();
  if (!bot) {
    return res.status(503).json({
      status: "not_initialized",
      hint: "TELEGRAM_BOT_TOKEN missing, or the bot failed to start.",
      timestamp: new Date().toISOString(),
    });
  }

  // Bounded so an unreachable Bot API reports "unreachable" promptly instead
  // of holding the request open until a client-side timeout.
  try {
    const [me, webhookInfo] = await Promise.all([
      withApiTimeout("getMe", bot.api.getMe()),
      withApiTimeout("getWebhookInfo", bot.api.getWebhookInfo()),
    ]);

    // A webhook that is set but has a pending/error state means updates are not
    // being delivered. Surface it so this is diagnosable from the outside.
    const delivering = webhookInfo.url
      ? !webhookInfo.last_error_message
      : true; // polling mode

    res.status(delivering ? 200 : 503).json({
      status: delivering ? "ok" : "degraded",
      bot: {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
        supportsInlineQueries: me.supports_inline_queries,
      },
      transport: webhookInfo.url ? "webhook" : "polling",
      webhook: {
        url: webhookInfo.url || null,
        pendingUpdateCount: webhookInfo.pending_update_count,
        lastErrorDate: webhookInfo.last_error_date,
        lastErrorMessage: webhookInfo.last_error_message,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "Bot health check failed");
    res.status(503).json({
      status: "unreachable",
      error: error instanceof Error ? error.message : "Unknown error",
      hint:
        "The Bot API did not respond. The bot cannot receive updates until " +
        "outbound access to api.telegram.org works. Other platform features are unaffected.",
      timestamp: new Date().toISOString(),
    });
  }
});

// Bot info endpoint
router.get(
  "/info",
  requireAuth,
  requireStaffRole("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const bot = getBot();
      if (!bot) {
        return res.status(503).json({ error: "Bot not initialized" });
      }

      const me = await bot.api.getMe();
      res.json({
        bot: {
          id: me.id,
          username: me.username,
          firstName: me.first_name,
          isBot: true,
        },
      });
    } catch (error) {
      logger.error({ error }, "Failed to get bot info");
      res.status(500).json({ error: "Failed to get bot info" });
    }
  },
);

// Set webhook (admin only)
router.post(
  "/set-webhook",
  requireAuth,
  // Step-up: this route redirects every future bot update — including Mini App
  // initData login proofs — to a host of the caller's choosing. A hijacked
  // admin session must not be able to do that silently.
  requireFreshAuth(300),
  requireStaffRole("ADMIN"),
  // This router is mounted BEFORE express.json() (app.ts), because /webhook
  // needs the raw bytes for signature verification. That ordering means every
  // route here saw `req.body === undefined`, so the URL and secretToken this
  // handler reads were silently ignored and it always fell back to the
  // configured values. Parsing the body here makes the route do what it says,
  // now that those inputs are validated rather than trusted.
  json({ limit: "64kb" }),
  async (req: Request, res: Response) => {
    try {
      // Validate the request BEFORE touching the Bot API. getBot() can perform
      // a network round trip, and an unauthorised caller must not be able to
      // make this process do work — nor have "bot not initialised" mask a
      // rejected payload.
      const { url, secretToken } = req.body || {};
      const webhookUrl = url || env.TELEGRAM_WEBHOOK_URL;
      // The secret is server configuration, never a request parameter. Accepting
      // one from the body let a caller overwrite the secret with a value they
      // control and then receive the updates the new webhook is pointed at.
      const secret = env.TELEGRAM_WEBHOOK_SECRET;

      if (secretToken !== undefined) {
        return res.status(400).json({
          error: "secretToken is not accepted",
          message: "The webhook secret is server configuration and cannot be set per request.",
        });
      }

      if (!webhookUrl) {
        return res.status(400).json({ error: "Webhook URL required" });
      }

      // A body-supplied URL must be a public https endpoint. Without this, any
      // admin could repoint the bot at an attacker host or an internal address
      // and silently take over every subsequent update.
      if (!isPublishableWebUrl(webhookUrl)) {
        logger.warn(
          { requestedUrl: webhookUrl },
          "Refused to set a webhook to a non-public or non-https URL",
        );
        return res.status(400).json({
          error: "WEBHOOK_URL_NOT_ALLOWED",
          message: "Webhook URL must be a public https address.",
        });
      }

      // It must also point back at THIS deployment.
      //
      // isPublishableWebUrl is not sufficient here: it rejects private and
      // internal hosts, which is the right rule for a link the bot SENDS the
      // user, but it happily accepts any public https host — including one an
      // attacker controls. A webhook pointed there delivers every future update
      // to them, including Mini App initData login proofs, which are bearer
      // credentials.
      //
      // The origin is pinned to API_PUBLIC_URL, falling back to the configured
      // webhook URL's own origin when that is set.
      const expectedOrigin = webhookOrigin(env.API_PUBLIC_URL) ?? webhookOrigin(env.TELEGRAM_WEBHOOK_URL);
      if (!expectedOrigin) {
        // Fail CLOSED. Without this the comparison is skipped entirely when
        // neither variable is configured, and an arbitrary host is accepted --
        // which is the bug, reappearing through a missing setting.
        logger.error(
          { requestedUrl: webhookUrl },
          "Neither API_PUBLIC_URL nor TELEGRAM_WEBHOOK_URL is set - cannot verify the webhook points at this deployment",
        );
        return res.status(503).json({
          error: "WEBHOOK_ORIGIN_UNKNOWN",
          message: "API_PUBLIC_URL is not configured; refusing to set a webhook that cannot be verified.",
        });
      }
      if (webhookOrigin(webhookUrl) !== expectedOrigin) {
        logger.warn(
          { requestedUrl: webhookUrl, expectedOrigin },
          "Refused to set a webhook pointing at a host other than this deployment",
        );
        return res.status(400).json({
          error: "WEBHOOK_URL_NOT_ALLOWED",
          message: `Webhook URL must point at this deployment (${expectedOrigin}).`,
        });
      }

      if (!secret) {
        // setWebhook without a secret makes the endpoint above refuse every
        // update, so refuse here with an explanation rather than bricking the bot.
        return res.status(503).json({
          error: "WEBHOOK_NOT_CONFIGURED",
          message: "TELEGRAM_WEBHOOK_SECRET is not set; refusing to publish an unauthenticated webhook.",
        });
      }

      const bot = getBot();
      if (!bot) {
        return res.status(503).json({ error: "Bot not initialized" });
      }

      await bot.api.setWebhook(webhookUrl, {
        secret_token: secret,
        allowed_updates: [
          "message",
          "edited_message",
          "callback_query",
          "inline_query",
          "chosen_inline_result",
          "my_chat_member",
          "chat_member",
        ],
        drop_pending_updates: true,
      });

      logger.info({ url: webhookUrl }, "Webhook set manually");
      res.json({ success: true, url: webhookUrl });
    } catch (error) {
      logger.error({ error }, "Failed to set webhook");
      res.status(500).json({
        error: "Failed to set webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

// Delete webhook (admin only)
router.post(
  "/delete-webhook",
  requireAuth,
  requireStaffRole("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const bot = getBot();
      if (!bot) {
        return res.status(503).json({ error: "Bot not initialized" });
      }

      await bot.api.deleteWebhook({ drop_pending_updates: true });
      logger.info("Webhook deleted manually");
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Failed to delete webhook");
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  },
);

// Start bot (for polling mode in development)
router.post(
  "/start-polling",
  requireAuth,
  requireStaffRole("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      if (env.NODE_ENV === "production") {
        return res
          .status(400)
          .json({ error: "Polling not allowed in production" });
      }

      const started = await startBot();
      if (!started) {
        return res
          .status(400)
          .json({ error: "TELEGRAM_BOT_TOKEN is not configured" });
      }
      res.json({ success: true, message: "Bot started in polling mode" });
    } catch (error) {
      logger.error({ error }, "Failed to start bot polling");
      res.status(500).json({ error: "Failed to start bot" });
    }
  },
);

// Stop bot
router.post(
  "/stop",
  requireAuth,
  requireStaffRole("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      await stopBot();
      res.json({ success: true, message: "Bot stopped" });
    } catch (error) {
      logger.error({ error }, "Failed to stop bot");
      res.status(500).json({ error: "Failed to stop bot" });
    }
  },
);

export default router;
