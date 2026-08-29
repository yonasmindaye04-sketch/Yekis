// === IMPORTS ===
import { Router } from "express";
import type { Response } from "express";
import {
  requireAuth,
  optionalAuth,
  type AuthedRequest,
} from "../../middleware/auth.js";
import { requireKycVerified } from "../../middleware/hardBlock.js";
import * as profileService from "./profile.service.js";
import {
  updateProfileSchema,
  reportProfileSchema,
} from "./profile.validation.js";
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
// Hard-block rule (roadmap Phase 1): unverified users cannot change their
// profile. KYC submission itself stays open via the kyc module — only
// profile mutation is gated here.
profileRouter.patch(
  "/me/profile",
  requireAuth,
  requireKycVerified("TIER_1"),
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
        return res
          .status(400)
          .json({ error: "VALIDATION_FAILED", details: error.errors });
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
