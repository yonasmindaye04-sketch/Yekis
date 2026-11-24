// === IMPORTS ===
import { Router } from "express";
import type { Response } from "express";
import multer from "multer";
import {
  requireAuth,
  requireFreshAuth,
  optionalAuth,
  type AuthedRequest,
} from "../../middleware/auth.js";
import * as profileService from "./profile.service.js";
import * as avatarService from "./avatar.service.js";
import {
  updateProfileSchema,
  reportProfileSchema,
} from "./profile.validation.js";
import {
  buildUserDataExport,
  eraseUserData,
  findErasureBlockers,
  ErasureBlockedError,
  UserNotFoundError,
} from "../privacy/privacy.service.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";

export const profileRouter = Router();

function handleKnownErrors(err: unknown, res: Response): boolean {
  if (err && typeof err === "object" && "statusCode" in err) {
    const e = err as { statusCode: number; message: string };
    res.status(e.statusCode).json({ error: e.message });
    return true;
  }
  return false;
}

// Avatar uploads are images, not documents. The client compresses to a 320px
// JPEG before sending, so 2 MB leaves ample room for a large source that a
// browser failed to re-encode while still refusing a 40 MB camera original.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: avatarService.MAX_AVATAR_BYTES },
});

/**
 * Multer reports an oversized file by calling back with `MulterError` before
 * the route handler runs. Without this wrapper that error reaches Express's
 * default handler and the client sees an HTML 500 instead of the reason.
 */
function receiveAvatarUpload(
  req: AuthedRequest,
  res: Response,
  next: (err?: unknown) => void,
) {
  avatarUpload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: "AVATAR_TOO_LARGE",
          message: "Avatar images must be smaller than 2 MB.",
        });
      }
      return res.status(400).json({
        error: "INVALID_AVATAR_UPLOAD",
        message: "The avatar upload could not be read.",
      });
    }
    return res.status(400).json({
      error: "INVALID_AVATAR_UPLOAD",
      message: "The avatar upload could not be read.",
    });
  });
}

// POST /me/avatar
// Stores an uploaded profile photo and points User.avatarUrl at the short,
// public URL that serves it. This is a separate endpoint from PATCH /me/profile
// because `avatarUrl` must never carry the image itself: the column is
// VARCHAR(500) and the value is copied into every chat, contract and gig
// response that selects an avatar.
profileRouter.post(
  "/me/avatar",
  requireAuth,
  receiveAvatarUpload,
  async (req: AuthedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "MISSING_FILE",
          message: "Choose an image to upload.",
        });
      }

      const saved = await avatarService.saveAvatar({
        userId: req.user!.id,
        fileBuffer: req.file.buffer,
      });

      return res.json(saved);
    } catch (error: any) {
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error storing avatar");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// GET /avatars/:avatarId
//
// Public on purpose. Public profile pages render for signed-out visitors, and
// an <img> cannot send a bearer token. The id is random and the content is the
// same photo every member already sees; it is not a bearer secret. The URL is
// immutable — a new upload gets a new id — so it can be cached indefinitely.
profileRouter.get(
  "/avatars/:avatarId",
  async (req, res: Response) => {
    try {
      const avatar = await avatarService.getAvatar(req.params.avatarId as string);
      if (!avatar) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("X-Content-Type-Options", "nosniff");
      res.type(avatar.contentType);
      return res.send(avatar.data);
    } catch (error) {
      logger.error({ err: error }, "Error serving avatar");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// GET /:userId/profile
profileRouter.get(
  "/:userId/profile",
  optionalAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const viewerId = req.user?.id;
      const { userId } = req.params;

      const profile = await profileService.getPublicProfile(userId!, viewerId);

      profileService
        .recordProfileView(userId!, viewerId, req.query.source as string)
        .catch((e) => {
          logger.error({ err: e }, "Failed to record profile view");
        });

      res.json(profile);
    } catch (error: any) {
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error fetching profile");
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// PATCH /me/profile
// Basic profile editing is open to all authenticated users (name, bio, skills,
// availability, visibility — see updateProfileSchema). KYC verification stays
// mandatory for every economic action instead: posting jobs, submitting
// proposals, creating/purchasing gigs, funding escrow and withdrawals all keep
// their requireKycVerified gates. Gating profile edits blocked onboarding —
// users must be able to build a profile before they verify.
profileRouter.patch(
  "/me/profile",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const validatedData = updateProfileSchema.parse(req.body);
      const updatedProfile = await profileService.updateProfile(
        userId,
        validatedData,
      );
      res.json(updatedProfile);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          error: "VALIDATION_FAILED",
          // The client shows `message`, not the raw issue list. Without this
          // the person editing the profile saw only "VALIDATION_FAILED".
          message: error.errors?.[0]?.message ?? "The profile could not be saved.",
          details: error.errors,
        });
      }
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error updating profile");
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// GET /me/profile/completeness
profileRouter.get(
  "/me/profile/completeness",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const score = await profileService.computeProfileCompleteness(userId);
      res.json({ profileCompleteness: score });
    } catch (error: any) {
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error computing completeness");
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// GET /me/export
//
// PDPP Art. 13 — the data subject's right of access. Returns every category
// of personal data the platform holds, not a summary. The payload is built by
// the privacy module so that the export and the erasure agree on what
// "personal data" means — the two must not drift apart, or the export would
// quietly under-report what the platform keeps.
profileRouter.get(
  "/me/export",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { ucid: true },
      });

      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }

      const exportData = await buildUserDataExport(userId);

      res.setHeader("Content-Disposition", `attachment; filename=yekis-export-${user.ucid}.json`);
      res.setHeader("Content-Type", "application/json");
      res.json(exportData);
    } catch (error: any) {
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error exporting user data");
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// GET /me/erasure/blockers
//
// Checks for outstanding obligations (wallet balance, active contracts, open
// disputes, pending payouts/topups) that block account deactivation/erasure.
profileRouter.get(
  "/me/erasure/blockers",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const blockers = await findErasureBlockers(userId);
      return res.json({
        eligible: blockers.length === 0,
        blockers,
      });
    } catch (error: any) {
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error checking erasure blockers");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// POST /me/erasure
//
// PDPP Art. 15 — the data subject's right to erasure.
//
// Step-up authentication is required. This destroys the account's personal
// content and closes it; it must not be triggerable from a session that was
// left open on a shared machine.
//
// The response states exactly what was erased and exactly what was retained
// (and why), because "your data has been erased" while the AML records are
// still on file would be a misleading answer.
profileRouter.post(
  "/me/erasure",
  requireAuth,
  requireFreshAuth(300),
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // A dry run first: tell the caller what is blocking the request without
      // destroying anything, so an unresolvable state does not look like a
      // silent failure.
      const blockers = await findErasureBlockers(userId);
      if (blockers.length > 0) {
        return res.status(409).json({
          error: "ERASURE_BLOCKED",
          message:
            "Erasure cannot proceed until the outstanding items below are resolved.",
          blockers,
        });
      }

      const result = await eraseUserData(userId);
      return res.json(result);
    } catch (error: any) {
      if (error instanceof ErasureBlockedError) {
        return res.status(409).json({
          error: "ERASURE_BLOCKED",
          message: error.message,
          blockers: error.blockers,
        });
      }
      if (error instanceof UserNotFoundError) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }
      logger.error({ err: error }, "Error erasing user data");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// POST /:userId/report
profileRouter.post(
  "/:userId/report",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const reporterId = req.user!.id;
      const { userId } = req.params;
      const validatedData = reportProfileSchema.parse(req.body);

      const report = await profileService.reportProfile(
        reporterId,
        userId!,
        validatedData.reason,
        validatedData.details,
      );
      res.status(201).json(report);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "VALIDATION_FAILED", details: error.errors });
      }
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error reporting profile");
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// GET /me/profile/views
profileRouter.get(
  "/me/profile/views",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileViewCount: true },
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentViews = await prisma.profileView.count({
        where: {
          targetUserId: userId,
          viewedAt: { gte: thirtyDaysAgo },
        },
      });

      res.json({
        totalViews: user?.profileViewCount || 0,
        recent30DaysViews: recentViews,
      });
    } catch (error: any) {
      if (handleKnownErrors(error, res)) return;
      logger.error({ err: error }, "Error fetching profile views");
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
