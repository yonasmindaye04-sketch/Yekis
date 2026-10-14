// === IMPORTS ===
import { Router } from "express";
import multer from "multer";
import {
  SubmitTopUpInput,
  TopUpRejectInput,
  FlagTopUpInput,
} from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { PaymentProviderUnavailableError } from "../escrow/providers/paymentProvider.interface.js";
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
  initiateCheckoutTopUp,
  isCheckoutProviderEnabled,
  handleTopUpWebhook,
  attachReceiptToTopUp,
} from "./topup.service.js";

export const topupsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// === MAIN FUNCTIONS ===
function handleKnownErrors(
  err: unknown,
  res: import("express").Response,
): boolean {
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

topupsRouter.post(
  "/",
  requireAuth,
  upload.single("receipt"),
  async (req: AuthedRequest, res) => {
    if (!req.file)
      return res.status(400).json({ error: "MISSING_RECEIPT_FILE" });

    // amountMinor arrives as a string over multipart form fields — coerce
    // before validating, same pattern as the KYC document submission route.
    const parsed = SubmitTopUpInput.safeParse({
      provider: req.body.provider,
      amountMinor: Number(req.body.amountMinor),
      referenceNumber: req.body.referenceNumber,
    });
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

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
  },
);

topupsRouter.post("/checkout", requireAuth, async (req: AuthedRequest, res) => {
  const { amountMinor, provider } = req.body;
  if (!amountMinor || typeof amountMinor !== "number" || amountMinor <= 0) {
    return res.status(400).json({ error: "INVALID_AMOUNT" });
  }
  const KNOWN_PROVIDERS = ["TELEBIRR", "CBE_BIRR", "M_PESA"];
  if (!KNOWN_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: "UNSUPPORTED_PROVIDER" });
  }
  // Known-but-not-connected rails are refused here, before any provider call
  // and before a WalletTopUp row exists. CBE Birr and M-Pesa have no approved
  // merchant API; answering 503 "unavailable" implied a temporary outage
  // rather than a rail that does not exist yet.
  if (!isCheckoutProviderEnabled(provider)) {
    return res.status(400).json({ error: "PROVIDER_NOT_AVAILABLE" });
  }

  try {
    const result = await initiateCheckoutTopUp({
      userId: req.user!.id,
      amountMinor,
      provider,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof PaymentProviderUnavailableError) {
      return res.status(503).json({ error: err.code });
    }
    logger.error({ err }, "Top-up checkout initiation failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

topupsRouter.post(
  "/:topUpId/attach-receipt",
  requireAuth,
  upload.single("receipt"),
  async (req: AuthedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "MISSING_RECEIPT_FILE" });
    }
    const referenceNumber = (req.body.referenceNumber || "").trim();
    if (!referenceNumber || referenceNumber.length < 3) {
      return res.status(400).json({ error: "INVALID_REFERENCE" });
    }

    try {
      const topUp = await attachReceiptToTopUp({
        userId: req.user!.id,
        topUpId: req.params.topUpId as string,
        referenceNumber,
        fileBuffer: req.file.buffer,
        contentType: req.file.mimetype,
      });
      return res.json({ id: topUp.id, status: topUp.status, referenceNumber: topUp.referenceNumber });
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to attach receipt to top-up");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

topupsRouter.post(
  "/checkout/:topUpId/simulate-success",
  requireAuth,
  async (req: AuthedRequest, res) => {
    // SECURITY: sandbox/dev convenience ONLY. This endpoint credits a wallet
    // without any payment verification, so it must never exist in production —
    // in production, wallets may only be credited by a signature-verified
    // provider webhook or a staff approval in the manual review queue.
    if (env.NODE_ENV === "production") {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    try {
      const topUp = await prisma.walletTopUp.findUnique({
        where: { id: req.params.topUpId },
      });
      if (!topUp || topUp.userId !== req.user!.id) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      await handleTopUpWebhook({
        providerTransactionId: topUp.providerTransactionId || "",
        status: "SUCCESS",
        rawPayload: { simulated: true },
      });

      return res.json({ success: true, message: "Top-up approved successfully." });
    } catch (err) {
      logger.error({ err }, "Failed to simulate top-up success");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Status of one of the caller's own top-ups.
//
// The checkout return page needs to answer a single question -- did the money
// actually arrive -- and there was no route that could answer it for one
// transaction. It previously slept three seconds and then rendered "Payment
// Complete" unconditionally, which told a user their money was in escrow when
// nothing had confirmed it. That is the worst possible message to get wrong:
// a user who believes they funded a milestone will start work that is not
// protected.
//
// Scoped to req.user.id, so one user cannot poll another's payment status.
topupsRouter.get("/:topUpId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const topUp = await prisma.walletTopUp.findFirst({
      where: { id: req.params.topUpId as string, userId: req.user!.id },
      select: {
        id: true,
        amountMinor: true,
        provider: true,
        status: true,
        providerTransactionId: true,
        createdAt: true,
      },
    });
    // 404 rather than 403: a top-up belonging to somebody else should be
    // indistinguishable from one that does not exist.
    if (!topUp) return res.status(404).json({ error: "NOT_FOUND" });

    // Convenience for the caller: only APPROVED means the wallet was credited.
    return res.json({ ...topUp, credited: topUp.status === "APPROVED" });
  } catch (err) {
    logger.error({ err }, "Failed to read top-up status");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Staff-only ----------

topupsRouter.get(
  "/queue",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : undefined;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const queue = await getTopUpQueue({ page, pageSize, search, status });
    return res.json(queue);
  },
);

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
  },
);

topupsRouter.post(
  "/:topUpId/approve",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const result = await approveTopUp({
        staffUserId: req.user!.id,
        topUpId: req.params.topUpId as string,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Top-up approval failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

topupsRouter.post(
  "/:topUpId/reject",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    // The outcome of this endpoint is REJECTED by definition — it is decided by
    // the URL, not the body. The previous
    // `{ decision: "REJECTED", ...req.body }` spread AFTER the literal, so a
    // body of `{ decision: "APPROVED" }` silently overrode it. TopUpRejectInput
    // is strict, so `decision` is now refused with a 400 rather than trusted.
    const parsed = TopUpRejectInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const result = await rejectTopUp({
        staffUserId: req.user!.id,
        topUpId: req.params.topUpId as string,
        rejectionReason: parsed.data.rejectionReason,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Top-up rejection failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

topupsRouter.post(
  "/:topUpId/flag",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = FlagTopUpInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

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
  },
);
