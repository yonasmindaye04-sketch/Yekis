// === IMPORTS ===
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import multer from "multer";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import {
  uploadChatAttachment,
  getChatAttachmentStream,
} from "../../lib/objectStore.js";
import {
  ConversationAccessError,
  ConversationNotFoundError,
  InvalidMessageError,
  createConversation,
  createGuestConversation,
  createDirectConversation,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  listStaffConversations,
  setConversationStatus,
  assignConversationToStaff,
  generateSmartReplies,
  summarizeConversation,
  extractDealTerms,
  authorizeAttachmentAccess,
} from "./chat.service.js";
import { issueGuestSupportToken } from "./guestSupportToken.js";
import { requireGuestChatAccess, requireAuthAllowingGuest } from "../../middleware/auth.js";

export const chatRouter = Router();

// === RATE LIMITS ===
//
// The guest intake endpoint is unauthenticated and creates a User, a
// Conversation and message rows on every call, so without its own budget it is a
// trivial write amplifier. The global /api limit (2000 / 15min in production) is
// shared across every route and IP-agnostic in aggregate, which is far too loose
// for anonymous writes.
const guestIntakeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_SUPPORT_REQUESTS",
    message:
      "You have reached the support request limit for this hour. Please try again later.",
  },
});

const attachmentUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_UPLOADS",
    message: "Too many file uploads. Please wait a moment before trying again.",
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

const ConversationInput = z.object({ subject: z.string().min(3).max(160) });
const SupportRequestInput = z.object({ subject: z.string().min(3).max(160) });
const DirectConversationInput = z.object({
  recipientId: z.string().min(1),
  subject: z.string().min(2).max(160),
});
const MessageInput = z.object({
  body: z.string().min(1).max(5000),
  attachmentUrl: z.string().optional(),
});
const GuestInput = z.object({
  email: z.string().email(),
  body: z.string().min(1).max(5000),
});

// === MAIN FUNCTIONS ===
function handleError(err: unknown, res: import("express").Response) {
  if (err instanceof ConversationNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (err instanceof ConversationAccessError) {
    res.status(403).json({ error: "FORBIDDEN" });
    return true;
  }
  if (err instanceof InvalidMessageError) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: err.message });
    return true;
  }
  return false;
}

// â”€â”€ Guest support (no auth required) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
chatRouter.post("/guest", guestIntakeLimiter, async (req, res) => {
  const parsed = GuestInput.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try {
    const conversation = await createGuestConversation(parsed.data);

    // Hand the guest a token scoped to this one thread. Without it they could
    // create a ticket but never read a reply or send a follow-up, because both
    // routes require authentication and a visitor has no session.
    const accessToken = await issueGuestSupportToken({
      userId: conversation.creatorUserId,
      conversationId: conversation.id,
    });

    return res.status(201).json({ ...conversation, accessToken });
  } catch (err) {
    if (handleError(err, res)) return;
    logger.error({ err }, "Failed to create guest support conversation");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// â”€â”€ Authenticated user routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
chatRouter.get(
  "/conversations",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      return res.json(await listConversations(req.user!.id));
    } catch (err) {
      logger.error({ err }, "Failed to list chat conversations");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.post(
  "/conversations",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = ConversationInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      return res.status(201).json(
        await createConversation({
          userId: req.user!.id,
          subject: parsed.data.subject,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to create chat conversation");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.get(
  "/conversations/:conversationId/messages",
  requireGuestChatAccess,
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await listMessages({
          conversationId: req.params.conversationId as string,
          userId: req.user!.id,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to list chat messages");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.post(
  "/conversations/:conversationId/messages",
  requireGuestChatAccess,
  async (req: AuthedRequest, res) => {
    const parsed = MessageInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      return res.status(201).json(
        await sendMessage({
          conversationId: req.params.conversationId as string,
          userId: req.user!.id,
          body: parsed.data.body,
          attachmentUrl: parsed.data.attachmentUrl,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to send chat message");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.post(
  "/upload",
  requireAuthAllowingGuest,
  attachmentUploadLimiter,
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "MISSING_FILE" });
      }

      const key = await uploadChatAttachment({
        userId: req.user!.id,
        fileName: req.file.originalname || "attachment",
        fileBuffer: req.file.buffer,
        contentType: req.file.mimetype || "application/octet-stream",
      });

      return res.json({
        url: `/api/v1/chat/attachments/${encodeURIComponent(key)}`,
        key,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err) {
      logger.error({ err }, "Failed to upload chat attachment");
      return res.status(500).json({ error: "UPLOAD_FAILED" });
    }
  },
);

chatRouter.get("/attachments/:key(*)", requireAuthAllowingGuest, async (req: AuthedRequest, res) => {
  const rawKey = req.params.key as string;
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return res.status(400).json({ error: "INVALID_KEY" });
  }

  // Authorize before touching storage. The key is opaque and unguessable, but
  // serving on the strength of the key alone would make any leaked URL a
  // permanent, unauthenticated grant.
  const conversationId = await authorizeAttachmentAccess({
    storageKey: key,
    userId: req.user!.id,
  });
  if (!conversationId) {
    // 404 rather than 403: distinguishing them would let a stranger probe which
    // attachment keys exist.
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  try {
    const { stream, contentType, contentLength } =
      await getChatAttachmentStream(key);

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    // Attachments are personal data (screenshots of statements, IDs). `private`
    // forbids shared-proxy/CDN reuse; `no-store` also keeps them out of browser
    // caches after sign-out.
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    stream.pipe(res);
  } catch (err) {
    logger.warn({ err, key }, "Chat attachment not found");
    return res.status(404).json({ error: "NOT_FOUND" });
  }
});

chatRouter.post(
  "/conversations/:conversationId/read",
  requireGuestChatAccess,
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await markConversationRead({
          conversationId: req.params.conversationId as string,
          userId: req.user!.id,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to mark chat read");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.post(
  "/direct",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = DirectConversationInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      return res.status(201).json(
        await createDirectConversation({
          userId: req.user!.id,
          recipientId: parsed.data.recipientId,
          subject: parsed.data.subject,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to create direct conversation");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// â”€â”€ Mini-Me AI Co-Pilot / Assistant Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
chatRouter.post(
  "/conversations/:conversationId/assistant/suggest-replies",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const suggestions = await generateSmartReplies({
        conversationId: req.params.conversationId as string,
        userId: req.user!.id,
      });
      return res.json({ suggestions });
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to generate smart replies");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.post(
  "/conversations/:conversationId/assistant/summarize",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const summary = await summarizeConversation({
        conversationId: req.params.conversationId as string,
        userId: req.user!.id,
      });
      return res.json(summary);
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to summarize chat conversation");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.post(
  "/conversations/:conversationId/assistant/extract-deal",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const dealTerms = await extractDealTerms({
        conversationId: req.params.conversationId as string,
        userId: req.user!.id,
      });
      return res.json(dealTerms);
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to extract deal terms");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// â”€â”€ Staff/Admin routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
chatRouter.get(
  "/admin/conversations",
  requireAuth,
  requireStaffRole(
    "COMPLIANCE_OFFICER",
    "ADMIN",
    "SUPPORT",
    "SUPER_ADMIN",
    "OPERATIONS_ADMIN",
    "COMPLIANCE_ADMIN",
  ),
  async (req: AuthedRequest, res) => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string)
        : undefined;
      const limit = req.query.pageSize
        ? parseInt(req.query.pageSize as string)
        : undefined;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      // Full staff can see all queues or filter; others see their own assigned
      const isFullStaff = [
        "ADMIN",
        "SUPER_ADMIN",
        "OPERATIONS_ADMIN",
        "SUPPORT",
      ].includes(req.user!.staffRole || "");
      const staffId = isFullStaff
        ? (req.query.staffId as string | undefined)
        : req.user!.id;
      return res.json(
        await listStaffConversations({ page, limit, search, status, staffId }),
      );
    } catch (err) {
      logger.error({ err }, "Failed to list staff chat queue");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

chatRouter.patch(
  "/admin/conversations/:conversationId/status",
  requireAuth,
  requireStaffRole(
    "COMPLIANCE_OFFICER",
    "ADMIN",
    "SUPPORT",
    "SUPER_ADMIN",
    "OPERATIONS_ADMIN",
    "COMPLIANCE_ADMIN",
  ),
  async (req, res) => {
    const parsed = z
      .object({ status: z.enum(["OPEN", "CLOSED"]) })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      return res.json(
        await setConversationStatus({
          conversationId: req.params.conversationId as string,
          status: parsed.data.status,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to update conversation status");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Assign a conversation to a staff member (Admin / Super Admin only)
chatRouter.patch(
  "/admin/conversations/:conversationId/assign",
  requireAuth,
  requireStaffRole("ADMIN", "SUPER_ADMIN", "OPERATIONS_ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = z.object({ staffId: z.string() }).safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      return res.json(
        await assignConversationToStaff({
          conversationId: req.params.conversationId as string,
          staffId: parsed.data.staffId,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to assign conversation to staff");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Staff member claims an unassigned conversation for themselves
chatRouter.post(
  "/admin/conversations/:conversationId/claim",
  requireAuth,
  requireStaffRole(
    "COMPLIANCE_OFFICER",
    "ADMIN",
    "SUPPORT",
    "SUPER_ADMIN",
    "OPERATIONS_ADMIN",
    "COMPLIANCE_ADMIN",
  ),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await assignConversationToStaff({
          conversationId: req.params.conversationId as string,
          staffId: req.user!.id,
        }),
      );
    } catch (err) {
      if (handleError(err, res)) return;
      logger.error({ err }, "Failed to claim conversation");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
