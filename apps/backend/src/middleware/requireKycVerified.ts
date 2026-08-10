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
export function requireKycVerified(requiredTier: "TIER_1" | "TIER_2" | "TIER_3" = "TIER_1") {
  const tierOrder: Record<"TIER_1" | "TIER_2" | "TIER_3", number> = {
    TIER_1: 1,
    TIER_2: 2,
    TIER_3: 3,
  };

  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

    const kyc = await prisma.kycRecord.findUnique({ where: { userId: req.user.id } });

    if (!kyc || kyc.status !== "VERIFIED") {
      return res.status(403).json({
        error: "KYC_NOT_VERIFIED",
        message: "This action requires a verified account.",
      });
    }

    if (tierOrder[kyc.tier as "TIER_1" | "TIER_2" | "TIER_3"] < tierOrder[requiredTier]) {
      return res.status(403).json({
        error: "KYC_TIER_INSUFFICIENT",
        message: `This action requires ${requiredTier}, current tier is ${kyc.tier}.`,
      });
    }

    next();
  };
}
