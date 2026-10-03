import { Router, Request, Response, NextFunction } from "express";
import { getBot, webhookHandler, startBot, stopBot } from "./bot.service.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// Webhook endpoint - must be before body parser for raw body access
router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bot = getBot();
      if (!bot) {
        return res.status(503).json({ error: "Bot not initialized" });
      }

      // Verify secret token if configured
      const secretToken = req.headers["x-telegram-bot-api-secret-token"];
      if (
        env.TELEGRAM_WEBHOOK_SECRET &&
        secretToken !== env.TELEGRAM_WEBHOOK_SECRET
      ) {
        logger.warn({ received: secretToken }, "Invalid webhook secret token");
        return res.status(401).json({ error: "Invalid secret token" });
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
  try {
    const bot = getBot();
    if (!bot) {
      return res.status(503).json({
        status: "not_initialized",
        timestamp: new Date().toISOString(),
      });
    }

    const me = await bot.api.getMe();
    const webhookInfo = await bot.api.getWebhookInfo();

    res.json({
      status: "ok",
      bot: {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
        supportsInlineQueries: me.supports_inline_queries,
      },
      webhook: {
        url: webhookInfo.url,
        hasCustomCertificate: webhookInfo.has_custom_certificate,
        pendingUpdateCount: webhookInfo.pending_update_count,
        lastErrorDate: webhookInfo.last_error_date,
        lastErrorMessage: webhookInfo.last_error_message,
        maxConnections: webhookInfo.max_connections,
        allowedUpdates: webhookInfo.allowed_updates,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "Bot health check failed");
    res.status(503).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
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
  requireStaffRole("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const bot = getBot();
      if (!bot) {
        return res.status(503).json({ error: "Bot not initialized" });
      }

      const { url, secretToken } = req.body || {};
      const webhookUrl = url || env.TELEGRAM_WEBHOOK_URL;
      const secret = secretToken || env.TELEGRAM_WEBHOOK_SECRET;

      if (!webhookUrl) {
        return res.status(400).json({ error: "Webhook URL required" });
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
