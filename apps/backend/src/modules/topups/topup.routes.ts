// === IMPORTS ===
import { Router } from "express";
import multer from "multer";
import { SubmitTopUpInput, TopUpReviewDecisionInput, FlagTopUpInput } from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import {
  submitTopUp,
  getTopUpQueue,
  getReceiptViewUrl,
  approveTopUp,
  rejectTopUp,
  flagTopUpSuspicious,
  TopUpNotFoundError,
  TopUpAlreadyResolvedError,
  getUserTopUps,
} from "./topup.service.js";

export const topupsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });


// === MAIN FUNCTIONS ===
function handleKnownErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof TopUpNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (err instanceof TopUpAlreadyResolvedError) {
    res.status(409).json({ error: "ALREADY_RESOLVED" });
    return true;
  }
  return false;
}

// ---------- User-facing ----------

topupsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const topups = await getUserTopUps(req.user!.id);
    return res.json(topups);
  } catch (err) {
    logger.error({ err }, "Failed to get user top-ups");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

topupsRouter.post("/", requireAuth, upload.single("receipt"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "MISSING_RECEIPT_FILE" });

  // amountMinor arrives as a string over multipart form fields — coerce
  // before validating, same pattern as the KYC document submission route.
  const parsed = SubmitTopUpInput.safeParse({
    provider: req.body.provider,
    amountMinor: Number(req.body.amountMinor),
    referenceNumber: req.body.referenceNumber,
  });
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const topUp = await submitTopUp({
      userId: req.user!.id,
      provider: parsed.data.provider,
      amountMinor: parsed.data.amountMinor,
      referenceNumber: parsed.data.referenceNumber,
      fileBuffer: req.file.buffer,
      contentType: req.file.mimetype,
    });
    return res.status(201).json({ id: topUp.id, status: topUp.status });
  } catch (err) {
    logger.error({ err }, "Top-up submission failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Staff-only ----------

topupsRouter.get("/queue", requireAuth, requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"), async (_req, res) => {
  const queue = await getTopUpQueue();
  return res.json(queue);
});

topupsRouter.get(
  "/:topUpId/receipt-url",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const result = await getReceiptViewUrl(req.params.topUpId as string);
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to generate receipt view URL");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

topupsRouter.post(
  "/:topUpId/approve",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const result = await approveTopUp({ staffUserId: req.user!.id, topUpId: req.params.topUpId as string });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Top-up approval failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

topupsRouter.post(
  "/:topUpId/reject",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = TopUpReviewDecisionInput.safeParse({ decision: "REJECTED", ...req.body });
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const result = await rejectTopUp({
        staffUserId: req.user!.id,
        topUpId: req.params.topUpId as string,
        rejectionReason: parsed.data.rejectionReason!,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Top-up rejection failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

topupsRouter.post(
  "/:topUpId/flag",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = FlagTopUpInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const result = await flagTopUpSuspicious({
        staffUserId: req.user!.id,
        topUpId: req.params.topUpId as string,
        reason: parsed.data.reason,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to flag top-up");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);
