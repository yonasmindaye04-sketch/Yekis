// === IMPORTS ===
import prisma from '../../lib/prisma.js';
import logger from '../../lib/logger.js';
import { sanitizeContactInfo } from '../../middleware/circumvention.middleware.js';
import { UpdateProfileInput } from './profile.validation.js';

// === MAIN FUNCTIONS ===

export async function getPublicProfile(targetUserId: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      skills: {
        include: { skill: true }
      },
      portfolio: {
        where: { isActive: true }
      },
      kyc: true,
      receivedReviews: {
        where: {
          isEligible: true,
          revealedAt: { not: null }
        }
      }
    }
  });

  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }

  const isOwnProfile = viewerId === targetUserId;
  let viewerIsStaff = false;

  if (viewerId && !isOwnProfile) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { staffRole: true }
    });
    viewerIsStaff = !!viewer?.staffRole;
  }

  // Privacy rules
  if (user.profileVisibility === 'PRIVATE' && !isOwnProfile && !viewerIsStaff) {
    const err = new Error('Profile is private');
    (err as any).statusCode = 403;
    throw err;
  }

  if (user.profileVisibility === 'PROPOSERS' && !isOwnProfile && !viewerIsStaff && viewerId) {
    const hasContractOrProposal = await prisma.contract.findFirst({
      where: {
        OR: [
          { clientId: viewerId, freelancerId: targetUserId },
          { clientId: targetUserId, freelancerId: viewerId }
        ]
      }
    }) || await prisma.proposal.findFirst({
      where: {
        OR: [
          { freelancerId: targetUserId, job: { clientId: viewerId } },
          { freelancerId: viewerId, job: { clientId: targetUserId } }
        ]
      }
    });

    if (!hasContractOrProposal) {
      const err = new Error('Not authorized to view this profile');
      (err as any).statusCode = 403;
      throw err;
    }
  } else if (user.profileVisibility === 'PROPOSERS' && !viewerId) {
    const err = new Error('Not authorized to view this profile');
    (err as any).statusCode = 403;
    throw err;
  }

  let ratingCount = 0;
  let totalRating = 0;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  user.receivedReviews.forEach(review => {
    ratingCount++;
    totalRating += review.rating;
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  });

  const ratingAverage = ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(1)) : null;
  const earnedRange = await computeEarnedRange(targetUserId);

  return {
    id: user.id,
    displayName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    profileCompleteness: user.profileCompleteness,
    isAvailableForWork: user.isAvailableForWork,
    primarySkillId: user.primarySkillId,
    skills: user.skills.map(s => s.skill),
    portfolio: user.portfolio,
    kyc: user.kyc ? {
      tier: user.kyc.tier,
      status: user.kyc.status,
      badgeType: user.kyc.tier >= 'TIER_2' ? 'shield' : user.kyc.tier >= 'TIER_1' ? 'checkmark' : null
    } : null,
    stats: {
      jobsCompleted: user.totalJobsCompleted,
      jobsPosted: user.totalJobsPosted,
      rating: {
        average: ratingAverage,
        count: ratingCount,
        distribution
      },
      earnedRange,
      memberSince: user.createdAt
    },
    isOwnProfile,
    canViewFullProfile: true
  };
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  if (data.bio) {
    data.bio = sanitizeContactInfo(data.bio);
  }

  if (data.skillIds && data.skillIds.length > 0) {
    const skills = await prisma.skill.findMany({
      where: { id: { in: data.skillIds }, isActive: true }
    });
    if (skills.length !== data.skillIds.length) {
      const err = new Error('One or more skills are invalid or inactive');
      (err as any).statusCode = 400;
      throw err;
    }
  }

  if (data.primarySkillId && data.skillIds && !data.skillIds.includes(data.primarySkillId)) {
    const err = new Error('Primary skill must be included in skillIds');
    (err as any).statusCode = 400;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    const userUpdateData: any = {};
    if (data.firstName !== undefined) userUpdateData.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdateData.lastName = data.lastName;
    if (data.bio !== undefined) userUpdateData.bio = data.bio;
    if (data.primarySkillId !== undefined) userUpdateData.primarySkillId = data.primarySkillId;
    if (data.isAvailableForWork !== undefined) userUpdateData.isAvailableForWork = data.isAvailableForWork;
    if (data.profileVisibility !== undefined) userUpdateData.profileVisibility = data.profileVisibility;

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: userUpdateData
    });

    if (data.skillIds) {
      await tx.userSkill.deleteMany({
        where: { userId }
      });
      if (data.skillIds.length > 0) {
        await tx.userSkill.createMany({
          data: data.skillIds.map(skillId => ({
            userId,
            skillId
          }))
        });
      }
    }
    
    return updatedUser;
  });

  await computeProfileCompleteness(userId);

  return result;
}

export async function computeProfileCompleteness(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: true,
      portfolio: { where: { isActive: true } },
      kyc: true
    }
  });

  if (!user) return 0;

  let score = 0;
  if (user.avatarUrl) score += 15;
  if (user.firstName && user.lastName) score += 10;
  if (user.bio && user.bio.length >= 50) score += 15;
  if (user.skills.length > 0) score += 20;
  if (user.primarySkillId) score += 10;
  if (user.kyc?.status === 'VERIFIED') score += 20;
  if (user.portfolio.length > 0) score += 10;

  await prisma.user.update({
    where: { id: userId },
    data: { profileCompleteness: score }
  });

  return score;
}

export async function computeEarnedRange(userId: string) {
  const result = await prisma.paymentTransaction.aggregate({
    _sum: {
      amountMinor: true
    },
    where: {
      milestone: {
        escrowState: 'RELEASED',
        contract: {
          freelancerId: userId
        }
      }
    }
  });

  const amount = Number(result._sum.amountMinor || 0);

  if (amount === 0) return null;
  if (amount <= 1000000) return 'ETB 1K-10K';
  if (amount <= 5000000) return 'ETB 10K-50K';
  if (amount <= 10000000) return 'ETB 50K-100K';
  if (amount <= 50000000) return 'ETB 100K-500K';
  return 'ETB 500K+';
}

export async function recordProfileView(targetUserId: string, viewerId?: string, source?: string) {
  if (viewerId === targetUserId) return;

  await prisma.profileView.create({
    data: {
      targetUserId,
      viewerId,
      source
    }
  });

  await prisma.user.update({
    where: { id: targetUserId },
    data: { profileViewCount: { increment: 1 } }
  });
}

export async function reportProfile(reporterId: string, targetUserId: string, reason: any, details?: string) {
  const report = await prisma.profileReport.create({
    data: {
      reporterId,
      targetUserId,
      reason,
      details
    }
  });
  return report;
}

export async function recalculateUserStats(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { freelancerId: userId },
    include: { milestones: true }
  });

  const jobsCompletedCount = contracts.filter(c => 
    c.milestones.length > 0 && c.milestones.every(m => m.escrowState === 'RELEASED')
  ).length;

  const jobsPostedCount = await prisma.job.count({
    where: { clientId: userId }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalJobsCompleted: jobsCompletedCount,
      totalJobsPosted: jobsPostedCount
    }
  });
}
