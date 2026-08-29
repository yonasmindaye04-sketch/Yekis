// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";

// === MAIN FUNCTIONS ===
export async function getFeaturedTalent() {
  const cached = await redis.get("featured:carousel");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      logger.error({ err: e }, "Failed to parse cached featured talent");
    }
  }

  return refreshFeaturedCarousel();
}

export async function refreshFeaturedCarousel() {
  try {
    const featuredUsers = new Map();
    const result: any[] = [];

    // 1. Staff-pinned (up to 3)
    const staffPinnedLogs = await prisma.featuredLog.findMany({
      where: { reason: "STAFF_PINNED" },
      orderBy: { featuredAt: "desc" },
      take: 10,
      include: {
        user: {
          include: {
            primarySkill: true,
            kyc: true,
          },
        },
      },
    });

    for (const log of staffPinnedLogs) {
      if (result.length >= 3) break;
      const user = log.user;
      if (!user || featuredUsers.has(user.id)) continue;
      if (user.role === "CLIENT" || user.isSuspended) continue;

      featuredUsers.set(user.id, true);
      result.push(buildFeaturedCard(user, "STAFF_PINNED"));
    }

    // 2. Top-rated (up to 4)
    const topRated = await prisma.user.findMany({
      where: {
        ratingBayesianScore: { gt: 0 },
        role: { in: ["FREELANCER", "BOTH"] },
        profileVisibility: "PUBLIC",
        isSuspended: false,
        kyc: {
          status: "VERIFIED",
        },
      },
      orderBy: { ratingBayesianScore: "desc" },
      take: 10,
      include: {
        primarySkill: true,
        kyc: true,
      },
    });

    let topRatedCount = 0;
    for (const user of topRated) {
      if (topRatedCount >= 4) break;
      if (featuredUsers.has(user.id)) continue;

      featuredUsers.set(user.id, true);
      result.push(buildFeaturedCard(user, "TOP_RATED"));
      topRatedCount++;
    }

    // 3. Recently verified (up to 3)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyVerified = await prisma.user.findMany({
      where: {
        role: { in: ["FREELANCER", "BOTH"] },
        profileVisibility: "PUBLIC",
        isSuspended: false,
        kyc: {
          status: "VERIFIED",
          lastVerifiedAt: { gte: thirtyDaysAgo },
        },
      },
      orderBy: {
        kyc: {
          lastVerifiedAt: "desc",
        },
      },
      take: 10,
      include: {
        primarySkill: true,
        kyc: true,
      },
    });

    let verifiedCount = 0;
    for (const user of recentlyVerified) {
      if (verifiedCount >= 3) break;
      if (featuredUsers.has(user.id)) continue;

      featuredUsers.set(user.id, true);
      result.push(buildFeaturedCard(user, "RECENTLY_VERIFIED"));
      verifiedCount++;
    }

    // 4. Category balancing (up to 2)
    const existingCategoryIds = result
      .map((u) => u.primarySkill?.id)
      .filter(Boolean);
    const categoryBalancing = await prisma.user.findMany({
      where: {
        role: { in: ["FREELANCER", "BOTH"] },
        profileVisibility: "PUBLIC",
        isSuspended: false,
        kyc: {
          status: "VERIFIED",
        },
        primarySkillId: { notIn: existingCategoryIds },
      },
      orderBy: { ratingBayesianScore: "desc" },
      take: 5,
      include: {
        primarySkill: true,
        kyc: true,
      },
    });

    let categoryCount = 0;
    for (const user of categoryBalancing) {
      if (categoryCount >= 2) break;
      if (featuredUsers.has(user.id)) continue;

      featuredUsers.set(user.id, true);
      result.push(buildFeaturedCard(user, "CATEGORY_BALANCING"));
      categoryCount++;
    }

    // Update lastFeaturedAt and create FeaturedLog for newly featured
    const userIds = result.map((r) => r.id);

    if (userIds.length > 0) {
      await prisma.$transaction([
        prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { lastFeaturedAt: new Date() },
        }),
        prisma.featuredLog.createMany({
          data: result.map((r) => ({
            userId: r.id,
            reason: r.reason as any,
            category: (r.primarySkill?.category || "OTHER") as any,
            featuredAt: new Date(),
          })),
        }),
      ]);
    }

    await redis.set("featured:carousel", JSON.stringify(result), "EX", 3600);
    logger.info(`Refreshed featured carousel with ${result.length} users`);

    return result;
  } catch (error) {
    logger.error({ err: error }, "Error refreshing featured carousel");
    throw new Error("Failed to refresh featured carousel");
  }
}

export async function pinUser(
  staffId: string,
  userId: string,
  category: string,
  notes?: string,
) {
  try {
    await prisma.featuredLog.create({
      data: {
        userId,
        reason: "STAFF_PINNED",
        pinnedByStaffId: staffId,
        category: category as any,
        notes,
      },
    });

    await redis.del("featured:carousel");

    await recordAuditEvent({
      eventType: "PIN_FEATURED_USER",
      entityType: "User",
      entityId: userId,
      userId: staffId,
      metadata: { category, notes },
    });

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Error pinning user");
    throw new Error("Failed to pin user");
  }
}

// === HELPERS ===
function buildFeaturedCard(user: any, reason: string) {
  return {
    id: user.id,
    ucid: user.ucid,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    primarySkill: user.primarySkill
      ? {
          id: user.primarySkill.id,
          nameEn: user.primarySkill.nameEn,
          nameAm: user.primarySkill.nameAm,
          category: user.primarySkill.category,
        }
      : null,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    totalJobsCompleted: user.totalJobsCompleted,
    kycBadge: user.kyc?.status === "VERIFIED" ? "shield" : null,
    isAvailableForWork: user.isAvailableForWork,
    reason,
  };
}
