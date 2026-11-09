// === IMPORTS ===
import { Router } from "express";
import type { Response } from "express";
import {
  requireAuth,
  optionalAuth,
  type AuthedRequest,
} from "../../middleware/auth.js";
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

// GET /me/export
profileRouter.get(
  "/me/export",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          kyc: { select: { tier: true, status: true } },
          wallet: { select: { balanceMinor: true } },
          _count: {
            select: {
              jobsPosted: true,
              proposals: true,
              contractsAsClient: true,
              contractsAsFreelancer: true,
              notifications: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }

      const exportData = {
        platform: "Yekis Jobs",
        exportedAt: new Date().toISOString(),
        account: {
          ucid: user.ucid,
          email: user.email,
          phone: user.phone,
          phoneVerified: !!user.phoneVerifiedAt,
          role: user.role,
          languagePreference: user.languagePreference,
          timezone: user.timezone,
          createdAt: user.createdAt,
        },
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          bio: user.bio,
          isAvailableForWork: user.isAvailableForWork,
          profileVisibility: user.profileVisibility,
          profileCompleteness: user.profileCompleteness,
        },
        verification: {
          kycTier: user.cachedKycTier || user.kyc?.tier || "TIER_1",
          kycStatus: user.cachedKycStatus || user.kyc?.status || "PENDING",
        },
        financials: {
          currency: "ETB",
          balanceMinor: user.wallet?.balanceMinor || 0,
          totalEarnedNetMinor: user.totalEarnedNetMinor,
          totalSpentGrossMinor: user.totalSpentGrossMinor,
        },
        activityCounts: {
          jobsPosted: user._count.jobsPosted,
          proposalsSubmitted: user._count.proposals,
          contractsAsClient: user._count.contractsAsClient,
          contractsAsFreelancer: user._count.contractsAsFreelancer,
          notificationsReceived: user._count.notifications,
        },
      };

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
