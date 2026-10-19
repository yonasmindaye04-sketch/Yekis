// === IMPORTS ===
import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "./auth.js";

/**
 * Blocks: withdrawing funds, changing profile, bidding on projects, or
 * receiving payments — for any user whose KYC is not VERIFIED.
 * This is a non-negotiable AML requirement (roadmap Phase 1, Auth module).
 *
 * requiredTier lets a route additionally require Tier 2 (e.g. withdrawal
 * endpoints) rather than just "verified at all".
 */

// === MAIN FUNCTIONS ===
export function requireKycVerified(
  requiredTier: "TIER_1" | "TIER_2" | "TIER_3" = "TIER_1",
) {
  const tierOrder: Record<"TIER_1" | "TIER_2" | "TIER_3", number> = {
    TIER_1: 1,
    TIER_2: 2,
    TIER_3: 3,
  };

  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

    const kyc = await prisma.kycRecord.findUnique({
      where: { userId: req.user.id },
    });

    if (!kyc || kyc.status !== "VERIFIED") {
      // F-02: a bare 403 told the user only that they were blocked. It carries
      // a machine-readable next step so the frontend can offer the action
      // instead of rendering a dead end.
      return res.status(403).json({
        error: "KYC_NOT_VERIFIED",
        message: "This action requires a verified account.",
        nextAction: {
          type: "KYC",
          path: "/verification",
          reason: !kyc
            ? "NOT_STARTED"
            : kyc.status === "UNDER_REVIEW"
              ? "UNDER_REVIEW"
              : kyc.status === "REJECTED"
                ? "REJECTED"
                : "NOT_STARTED",
        },
      });
    }

    if (tierOrder[kyc.tier] < tierOrder[requiredTier]) {
      // Same for a tier shortfall: say what to do, and why it matters.
      return res.status(403).json({
        error: "KYC_TIER_INSUFFICIENT",
        message: `This action requires ${requiredTier}, current tier is ${kyc.tier}.`,
        nextAction: {
          type: "KYC",
          path: "/verification",
          requiredTier,
          currentTier: kyc.tier,
        },
      });
    }

    next();
  };
}
