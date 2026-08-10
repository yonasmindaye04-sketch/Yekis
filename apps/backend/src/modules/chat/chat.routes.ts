// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import {
  ConversationAccessError,
  ConversationNotFoundError,
  InvalidMessageError,
  createConversation,
  createGuestConversation,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  listStaffConversations,
  setConversationStatus,
  assignConversationToStaff,
} from "./chat.service.js";

export const chatRouter = Router();
const ConversationInput = z.object({ subject: z.string().min(3).max(160) });
const MessageInput = z.object({ body: z.string().min(1).max(5000), attachmentUrl: z.string().url().optional() });
const GuestInput = z.object({ email: z.string().email(), body: z.string().min(1).max(5000) });


// === MAIN FUNCTIONS ===
function handleError(err: unknown, res: import("express").Response) {
  if (err instanceof ConversationNotFoundError) { res.status(404).json({ error: "NOT_FOUND" }); return true; }
  if (err instanceof ConversationAccessError) { res.status(403).json({ error: "FORBIDDEN" }); return true; }
  if (err instanceof InvalidMessageError) { res.status(400).json({ error: "VALIDATION_ERROR", message: err.message }); return true; }
  return false;
}

// ── Guest support (no auth required) ──────────────────────────────────────────
chatRouter.post("/guest", async (req, res) => {
  const parsed = GuestInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try { return res.status(201).json(await createGuestConversation(parsed.data)); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to create guest support conversation"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// ── Authenticated user routes ──────────────────────────────────────────────────
chatRouter.get("/conversations", requireAuth, async (req: AuthedRequest, res) => {
  try { return res.json(await listConversations(req.user!.id)); }
  catch (err) { logger.error({ err }, "Failed to list chat conversations"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

chatRouter.post("/conversations", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = ConversationInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try { return res.status(201).json(await createConversation({ userId: req.user!.id, subject: parsed.data.subject })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to create chat conversation"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

chatRouter.get("/conversations/:conversationId/messages", requireAuth, async (req: AuthedRequest, res) => {
  try { return res.json(await listMessages({ conversationId: req.params.conversationId as string, userId: req.user!.id })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to list chat messages"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

chatRouter.post("/conversations/:conversationId/messages", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = MessageInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try { return res.status(201).json(await sendMessage({ conversationId: req.params.conversationId as string, userId: req.user!.id, body: parsed.data.body, attachmentUrl: parsed.data.attachmentUrl })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to send chat message"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

chatRouter.post("/conversations/:conversationId/read", requireAuth, async (req: AuthedRequest, res) => {
  try { return res.json(await markConversationRead({ conversationId: req.params.conversationId as string, userId: req.user!.id })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to mark chat read"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// ── Staff/Admin routes ─────────────────────────────────────────────────────────
chatRouter.get("/admin/conversations", requireAuth, requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"), async (req: AuthedRequest, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    // COMPLIANCE_OFFICERs only see their own; ADMINs can filter or see all
    const isAdmin = req.user!.staffRole === "ADMIN";
    const staffId = isAdmin ? (req.query.staffId as string | undefined) : req.user!.id;
    return res.json(await listStaffConversations({ page, limit, search, status, staffId }));
  }
  catch (err) { logger.error({ err }, "Failed to list staff chat queue"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

chatRouter.patch("/admin/conversations/:conversationId/status", requireAuth, requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"), async (req, res) => {
  const parsed = z.object({ status: z.enum(["OPEN", "CLOSED"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try { return res.json(await setConversationStatus({ conversationId: req.params.conversationId as string, status: parsed.data.status })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to update conversation status"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// Assign a conversation to a staff member (Admin only)
chatRouter.patch("/admin/conversations/:conversationId/assign", requireAuth, requireStaffRole("ADMIN"), async (req: AuthedRequest, res) => {
  const parsed = z.object({ staffId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try { return res.json(await assignConversationToStaff({ conversationId: req.params.conversationId as string, staffId: parsed.data.staffId })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to assign conversation to staff"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// Staff member claims an unassigned conversation for themselves
chatRouter.post("/admin/conversations/:conversationId/claim", requireAuth, requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"), async (req: AuthedRequest, res) => {
  try { return res.json(await assignConversationToStaff({ conversationId: req.params.conversationId as string, staffId: req.user!.id })); }
  catch (err) { if (handleError(err, res)) return; logger.error({ err }, "Failed to claim conversation"); return res.status(500).json({ error: "INTERNAL_ERROR" }); }
});
