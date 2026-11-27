// === IMPORTS ===
import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, requireFreshAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requirePermission } from "../admin/permissions.js";
import { logger } from "../../lib/logger.js";
import { BROADCAST_AUDIENCES } from "./broadcast.message.js";
import {
  BroadcastAudienceEmptyError,
  BroadcastBotUnavailableError,
  BroadcastNotFoundError,
  BroadcastNotEditableError,
  BroadcastNotSendableError,
  BroadcastQueueUnavailableError,
  BroadcastRecipientNotLinkedError,
  BroadcastValidationError,
  cancelBroadcast,
  createBroadcast,
  deleteBroadcast,
  duplicateBroadcast,
  getBroadcast,
  listAudiences,
  listBroadcasts,
  queueBroadcast,
  sendBroadcastTest,
  updateBroadcast,
} from "./broadcast.service.js";

export const broadcastRouter = Router();

// === VALIDATION ===
const contentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  heading: z.string().trim().max(200).nullish(),
  body: z.string().trim().min(1).max(4096),
  imageUrl: z.string().trim().url().max(500).nullish(),
  linkUrl: z.string().trim().url().max(500).nullish(),
  linkLabel: z.string().trim().max(60).nullish(),
  audience: z.enum(BROADCAST_AUDIENCES),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "SENDING", "SENT", "PARTIAL", "FAILED", "CANCELLED"]).optional(),
  q: z.string().trim().max(120).optional(),
});

// === ERRORS ===
function handleError(res: Response, error: unknown, context: string, fallback: string) {
  if (error instanceof BroadcastNotFoundError) {
    return res.status(404).json({ error: "BROADCAST_NOT_FOUND", message: error.message });
  }
  if (error instanceof BroadcastValidationError) {
    return res.status(400).json({ error: "BROADCAST_INVALID", message: error.message });
  }
  if (error instanceof BroadcastAudienceEmptyError) {
    return res.status(400).json({ error: "BROADCAST_AUDIENCE_EMPTY", message: error.message });
  }
  if (error instanceof BroadcastRecipientNotLinkedError) {
    return res.status(400).json({ error: "TEST_RECIPIENT_NOT_LINKED", message: error.message });
  }
  if (error instanceof BroadcastNotEditableError) {
    return res.status(409).json({ error: "BROADCAST_NOT_EDITABLE", message: error.message });
  }
  if (error instanceof BroadcastNotSendableError) {
    return res.status(409).json({ error: "BROADCAST_NOT_SENDABLE", message: error.message });
  }
  if (error instanceof BroadcastBotUnavailableError) {
    return res.status(503).json({ error: "BOT_UNAVAILABLE", message: error.message });
  }
  if (error instanceof BroadcastQueueUnavailableError) {
    return res.status(503).json({ error: "QUEUE_UNAVAILABLE", message: error.message });
  }
  logger.error({ err: error }, context);
  return res.status(500).json({ error: fallback });
}

function parseContent(req: AuthedRequest, res: Response) {
  const parsed = contentSchema.safeParse(req.body);
  if (parsed.success) return parsed.data;
  res.status(400).json({
    error: "VALIDATION_ERROR",
    message: parsed.error.issues[0]?.message ?? "Invalid broadcast content.",
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
  return null;
}

// === ROUTES ===
// The audience list is registered before /:id, or Express would match it as an id.
broadcastRouter.get(
  "/audiences",
  requireAuth,
  requirePermission("bot.manage"),
  async (_req: AuthedRequest, res: Response) => {
    try {
      return res.json({ audiences: await listAudiences() });
    } catch (error) {
      return handleError(res, error, "GET /broadcasts/audiences failed", "Failed to count audiences");
    }
  },
);

broadcastRouter.get("/", requireAuth, requirePermission("bot.manage"), async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  try {
    return res.json(await listBroadcasts(parsed.data));
  } catch (error) {
    return handleError(res, error, "GET /broadcasts failed", "Failed to list broadcasts");
  }
});

broadcastRouter.post("/", requireAuth, requirePermission("bot.manage"), async (req: AuthedRequest, res) => {
  const input = parseContent(req, res);
  if (!input) return;
  try {
    return res.status(201).json(await createBroadcast(req.user!.id, input));
  } catch (error) {
    return handleError(res, error, "POST /broadcasts failed", "Failed to create broadcast");
  }
});

broadcastRouter.get("/:id", requireAuth, requirePermission("bot.manage"), async (req, res) => {
  try {
    return res.json(await getBroadcast(req.params.id as string));
  } catch (error) {
    return handleError(res, error, "GET /broadcasts/:id failed", "Failed to load broadcast");
  }
});

broadcastRouter.patch("/:id", requireAuth, requirePermission("bot.manage"), async (req: AuthedRequest, res) => {
  const input = parseContent(req, res);
  if (!input) return;
  try {
    return res.json(await updateBroadcast(req.user!.id, req.params.id as string, input));
  } catch (error) {
    return handleError(res, error, "PATCH /broadcasts/:id failed", "Failed to update broadcast");
  }
});

broadcastRouter.delete("/:id", requireAuth, requirePermission("bot.manage"), async (req: AuthedRequest, res) => {
  try {
    return res.json(await deleteBroadcast(req.user!.id, req.params.id as string));
  } catch (error) {
    return handleError(res, error, "DELETE /broadcasts/:id failed", "Failed to delete broadcast");
  }
});

broadcastRouter.post(
  "/:id/duplicate",
  requireAuth,
  requirePermission("bot.manage"),
  async (req: AuthedRequest, res) => {
    try {
      return res.status(201).json(await duplicateBroadcast(req.user!.id, req.params.id as string));
    } catch (error) {
      return handleError(res, error, "POST /broadcasts/:id/duplicate failed", "Failed to duplicate broadcast");
    }
  },
);

broadcastRouter.post(
  "/:id/test",
  requireAuth,
  requirePermission("bot.manage"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(await sendBroadcastTest(req.user!.id, req.params.id as string));
    } catch (error) {
      return handleError(res, error, "POST /broadcasts/:id/test failed", "Failed to send test message");
    }
  },
);

broadcastRouter.post(
  "/:id/send",
  requireAuth,
  // Step-up: queuing cannot be undone. A hijacked admin session must not be able
  // to message the whole user base with its own copy.
  requireFreshAuth(600),
  requirePermission("bot.manage"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(await queueBroadcast(req.user!.id, req.params.id as string));
    } catch (error) {
      return handleError(res, error, "POST /broadcasts/:id/send failed", "Failed to queue broadcast");
    }
  },
);

broadcastRouter.post(
  "/:id/cancel",
  requireAuth,
  requireFreshAuth(600),
  requirePermission("bot.manage"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(await cancelBroadcast(req.user!.id, req.params.id as string));
    } catch (error) {
      return handleError(res, error, "POST /broadcasts/:id/cancel failed", "Failed to cancel broadcast");
    }
  },
);
