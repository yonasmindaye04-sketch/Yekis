// === IMPORTS ===
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import {
  createTopUpRequest,
  getTopUpRequests,
  getTopUpRequestById,
  reviewTopUpRequest,
  getPendingTopUpQueue,
  TopUpNotFoundError,
  TopUpAlreadyProcessedError,
  type TopUpRail,
} from "./topup.service.js";

export const topupRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const TopUpInput = z.object({
  amountEtb: z.coerce.number().positive(),
  rail: z.enum(["TELEBIRR", "CBE_BIRR"]),
  senderName: z.string().min(2).max(100),
  senderReference: z.string().min(3).max(100),
});

topupRouter.post(
  "/manual",
  requireAuth,
  upload.single("receipt"),
  async (req: AuthedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "MISSING_FILE" });
    }

    const parsed = TopUpInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await createTopUpRequest({
        userId: req.user!.id,
        amountMinor: Math.round(parsed.data.amountEtb * 100),
        rail: parsed.data.rail,
        senderName: parsed.data.senderName,
        senderReference: parsed.data.senderReference,
        receiptBuffer: req.file.buffer,
        receiptContentType: req.file.mimetype,
        receiptFileName: req.file.originalname,
      });
      return res.status(201).json(result);
    } catch (err) {
      logger.error({ err }, "Top-up request creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

topupRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const requests = await getTopUpRequests(req.user!.id);
    return res.json(requests);
  } catch (err) {
    logger.error({ err }, "Failed to fetch top-up requests");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Keep the staff collection route before /:topUpId so "admin" is not
// interpreted as a top-up identifier.
topupRouter.get(
  "/admin/queue",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const minAmount = req.query.minAmount ? parseInt(req.query.minAmount as string) : undefined;
      const maxAmount = req.query.maxAmount ? parseInt(req.query.maxAmount as string) : undefined;

      const queue = await getPendingTopUpQueue({ page, limit, search, status, minAmount, maxAmount });
      return res.json(queue);
    } catch (err) {
      logger.error({ err }, "Failed to fetch top-up review queue");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

topupRouter.get("/:topUpId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const topUpId = req.params.topUpId;
    if (!topUpId) return res.status(400).json({ error: "MISSING_TOPUP_ID" });
    
    const topUp = await getTopUpRequestById(topUpId);
    if (!topUp) return res.status(404).json({ error: "NOT_FOUND" });
    if (topUp.userId !== req.user!.id) return res.status(403).json({ error: "FORBIDDEN" });
    return res.json(topUp);
  } catch (err) {
    logger.error({ err }, "Failed to fetch top-up request");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

const ReviewTopUpInput = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().min(5).max(500).optional(),
}).refine((data) => data.decision !== "REJECTED" || !!data.rejectionReason, {
  message: "rejectionReason is required when rejecting.",
});



topupRouter.post(
  "/admin/:topUpId/review",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const topUpId = req.params.topUpId;
    if (!topUpId) return res.status(400).json({ error: "MISSING_TOPUP_ID" });
    
    const parsed = ReviewTopUpInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await reviewTopUpRequest({
        staffUserId: req.user!.id,
        topUpId,
        decision: parsed.data.decision,
        rejectionReason: parsed.data.rejectionReason,
      });
      return res.json(result);
    } catch (err) {
      if (err instanceof TopUpNotFoundError) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }
      if (err instanceof TopUpAlreadyProcessedError) {
        return res.status(409).json({ error: "ALREADY_PROCESSED", message: err.message });
      }
      logger.error({ err }, "Top-up review failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);
