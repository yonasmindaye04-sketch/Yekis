// === IMPORTS ===
import { Router } from "express";
import multer from "multer";
import {
  KycDocumentType,
  UpgradeToTier2Input,
  KycReviewDecisionInput,
} from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import {
  submitKycDocument,
  upgradeToTier2,
  reviewKycRecord,
  getKycStatus,
  getReviewQueue,
  getDocumentViewUrl,
  getReviewHistory,
  initiateFaydaVerification,
  completeFaydaCallback,
  KycNotFoundError,
  InvalidTierTransitionError,
} from "./kyc.service.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

export const kycRouter = Router();

// 8MB cap, memory storage — files are streamed straight to object storage,
// never written to local disk on the API server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// ---------- User-facing routes ----------

// Fayda eSignet OIDC initiation
kycRouter.post(
  "/fayda/initiate",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const result = await initiateFaydaVerification(req.user!.id);
      return res.json(result);
    } catch (err) {
      if (err instanceof InvalidTierTransitionError) {
        return res
          .status(409)
          .json({ error: "INVALID_TIER_TRANSITION", message: err.message });
      }
      logger.error({ err }, "Failed to initiate Fayda verification");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Fayda eSignet OIDC callback
kycRouter.post(
  "/fayda/callback",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const { code, state } = req.body;
    if (!code || !state) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "code and state are required",
      });
    }

    try {
      const result = await completeFaydaCallback({
        userId: req.user!.id,
        code,
        state,
      });
      return res.json({ tier: result.tier, status: result.status });
    } catch (err: any) {
      logger.error({ err }, "Fayda callback processing failed");
      return res
        .status(400)
        .json({ error: "FAYDA_CALLBACK_FAILED", message: err.message });
    }
  },
);

kycRouter.post(
  "/documents",
  requireAuth,
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "MISSING_FILE" });

    const documentTypeParsed = KycDocumentType.safeParse(req.body.documentType);
    if (!documentTypeParsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: documentTypeParsed.error.flatten(),
      });
    }

    // fullName / dateOfBirth / documentNumber accompany the first document
    // to feed Fayda verification — required fields, validated inline here
    // rather than via the shared schema since they travel alongside a
    // multipart file rather than a JSON body.
    const { fullName, dateOfBirth, documentNumber } = req.body;
    if (!fullName || !dateOfBirth || !documentNumber) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "fullName, dateOfBirth, and documentNumber are required.",
      });
    }

    try {
      const kyc = await submitKycDocument({
        userId: req.user!.id,
        documentType: documentTypeParsed.data,
        fileBuffer: req.file.buffer,
        contentType: req.file.mimetype,
        fullName,
        dateOfBirth,
        documentNumber,
      });
      return res.status(201).json({ tier: kyc.tier, status: kyc.status });
    } catch (err) {
      if (err instanceof KycNotFoundError) {
        return res.status(404).json({ error: "KYC_RECORD_NOT_FOUND" });
      }
      logger.error({ err }, "KYC document submission failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

kycRouter.post(
  "/upgrade-tier2",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = UpgradeToTier2Input.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

    try {
      const kyc = await upgradeToTier2({
        userId: req.user!.id,
        fullName: `${user.email}`, // replace with real fullName field once profile module exists
        tin: parsed.data.tin,
        businessRegNumber: parsed.data.businessRegNumber,
      });
      return res.json({ tier: kyc.tier, status: kyc.status });
    } catch (err) {
      if (err instanceof KycNotFoundError)
        return res.status(404).json({ error: "KYC_RECORD_NOT_FOUND" });
      if (err instanceof InvalidTierTransitionError) {
        return res
          .status(409)
          .json({ error: "INVALID_TIER_TRANSITION", message: err.message });
      }
      logger.error({ err }, "Tier 2 upgrade failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

kycRouter.get("/status", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const status = await getKycStatus(req.user!.id);
    return res.json(status);
  } catch (err) {
    if (err instanceof KycNotFoundError)
      return res.status(404).json({ error: "KYC_RECORD_NOT_FOUND" });
    logger.error({ err }, "Failed to fetch KYC status");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Compliance Officer / Admin routes ----------

kycRouter.get(
  "/review-queue",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : undefined;
    const limit = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const queue = await getReviewQueue({ page, limit, search, status });
    return res.json(queue);
  },
);

// Powers the EvidenceViewer component — the frontend never receives or
// stores a raw storagePath, only a time-boxed URL fetched on demand.
kycRouter.get(
  "/documents/:documentId/url",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const result = await getDocumentViewUrl(req.params.documentId as string);
      return res.json(result);
    } catch (err) {
      if (err instanceof KycNotFoundError)
        return res.status(404).json({ error: "DOCUMENT_NOT_FOUND" });
      logger.error({ err }, "Failed to generate document view URL");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

kycRouter.get(
  "/:targetUserId/history",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const history = await getReviewHistory(req.params.targetUserId as string);
      return res.json(history);
    } catch (err) {
      if (err instanceof KycNotFoundError)
        return res.status(404).json({ error: "KYC_RECORD_NOT_FOUND" });
      logger.error({ err }, "Failed to fetch review history");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

kycRouter.post(
  "/:targetUserId/review",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = KycReviewDecisionInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await reviewKycRecord({
        staffUserId: req.user!.id,
        targetUserId: req.params.targetUserId as string,
        decision: parsed.data.decision,
        rejectionReason: parsed.data.rejectionReason,
      });
      return res.json({ tier: result.tier, status: result.status });
    } catch (err) {
      if (err instanceof KycNotFoundError)
        return res.status(404).json({ error: "KYC_RECORD_NOT_FOUND" });
      logger.error({ err }, "KYC review decision failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
