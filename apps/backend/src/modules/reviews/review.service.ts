// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { sanitizeContactInfo } from "../../middleware/circumvention.middleware.js";

// === MAIN FUNCTIONS ===
export async function submitReview(authorId: string, contractId: string, rating: number, comment?: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      milestones: true,
      review: true
    }
  });

  if (!contract) {
    throw new Error("NOT_FOUND: Contract not found");
  }

  if (contract.clientId !== authorId && contract.freelancerId !== authorId) {
    throw new Error("FORBIDDEN: User not part of this contract");
  }

  const hasReleasedOrAcceptedMilestone = contract.milestones.some(
    (m: any) => m.escrowState === "RELEASED"
  );

  if (!hasReleasedOrAcceptedMilestone) {
    throw new Error("BAD_REQUEST: Contract has no eligible milestones");
  }

  if (contract.review && contract.review.authorId === authorId) {
    throw new Error("BAD_REQUEST: Review already submitted");
  }

  const targetUserId = authorId === contract.clientId ? contract.freelancerId : contract.clientId;
  const sanitizedComment = comment ? sanitizeContactInfo(comment).sanitized : undefined;

  const review = await prisma.review.create({
    data: {
      contractId,
      authorId,
      targetUserId,
      rating,
      comment: sanitizedComment,
      isEligible: true,
      isBlind: true
    }
  });

  await recordAuditEvent({
    eventType: "REVIEW_SUBMITTED",
    entityType: "Review",
    entityId: review.id,
    userId: authorId,
    metadata: { contractId, reviewId: review.id }
  });

  // Check if both parties submitted
  const allReviews = await prisma.review.findMany({
    where: { contractId }
  });

  if (allReviews.length >= 2) {
    await prisma.review.updateMany({
      where: { contractId },
      data: { isBlind: false, revealedAt: new Date() }
    });
    
    // Both revealed, calculate ratings for both parties
    await recalculateUserRating(contract.clientId);
    await recalculateUserRating(contract.freelancerId);
  }

  return review;
}

export async function recalculateUserRating(userId: string) {
  const userReviews = await prisma.review.findMany({
    where: { targetUserId: userId, isEligible: true, isBlind: false }
  });

  const v = userReviews.length;
  if (v === 0) return;

  const totalScore = userReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  const R = totalScore / v;

  // Global metrics approximation
  const m = 3;
  const C = 3.0; // Global average

  const bayesianScore = (v / (v + m)) * R + (m / (v + m)) * C;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ratingAverage: R,
      ratingCount: v,
      ratingBayesianScore: bayesianScore
    }
  });
}

export async function getReviewsForUser(targetUserId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  const reviews = await prisma.review.findMany({
    where: { targetUserId, isEligible: true, isBlind: false },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      author: {
        select: {
          displayName: true
        }
      }
    }
  });

  return reviews.map((r: any) => ({
    ...r,
    authorName: r.author?.displayName || "Anonymous"
  }));
}

export async function respondToReview(targetUserId: string, reviewId: string, response: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  
  if (!review) throw new Error("NOT_FOUND: Review not found");
  if (review.targetUserId !== targetUserId) throw new Error("FORBIDDEN: Not your review");
  if (review.response) throw new Error("BAD_REQUEST: Already responded");

  const sanitizedResponse = sanitizeContactInfo(response).sanitized;

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      response: sanitizedResponse,
      respondedAt: new Date()
    }
  });
}

export async function disputeReview(userId: string, reviewId: string, reason: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  
  if (!review) throw new Error("NOT_FOUND: Review not found");
  if (review.targetUserId !== userId) throw new Error("FORBIDDEN: Not your review");

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      isDisputed: true,
      disputeReason: reason
    }
  });
}
