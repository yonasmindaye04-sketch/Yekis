// === IMPORTS ===
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  NotificationNotFoundError,
  NotNotificationOwnerError,
} from "./notification.service.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const unreadOnly = req.query.unreadOnly === "true";
  const notifications = await listNotifications(req.user!.id, { unreadOnly });
  return res.json(notifications);
});

notificationsRouter.post(
  "/:notificationId/read",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const result = await markAsRead(
        req.user!.id,
        req.params.notificationId as string,
      );
      return res.json(result);
    } catch (err) {
      if (err instanceof NotificationNotFoundError)
        return res.status(404).json({ error: "NOT_FOUND" });
      if (err instanceof NotNotificationOwnerError)
        return res.status(403).json({ error: "FORBIDDEN" });
      logger.error({ err }, "Failed to mark notification as read");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

notificationsRouter.post(
  "/read-all",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const result = await markAllAsRead(req.user!.id);
    return res.json({ updatedCount: result.count });
  },
);
