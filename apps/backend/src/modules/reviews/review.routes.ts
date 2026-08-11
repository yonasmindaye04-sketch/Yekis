// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { logger } from "../../lib/logger.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { submitReview, getReviewsForUser, respondToReview, disputeReview } from "./review.service.js";

export const reviewRouter = Router();

// === ROUTES ===

const SubmitReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional()
});

reviewRouter.post("/contracts/:contractId/review", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { contractId } = req.params;
    const authorId = req.user!.id;
    const { rating, comment } = SubmitReviewSchema.parse(req.body);

    const review = await submitReview(authorId, contractId, rating, comment);
    return res.status(201).json(review);
  } catch (err: any) {
    if (err.message?.startsWith("NOT_FOUND")) return res.status(404).json({ error: err.message });
    if (err.message?.startsWith("FORBIDDEN")) return res.status(403).json({ error: err.message });
    if (err.message?.startsWith("BAD_REQUEST")) return res.status(400).json({ error: err.message });
    
    logger.error({ err }, "Failed to submit review");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

reviewRouter.get("/users/:userId/reviews", async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const reviews = await getReviewsForUser(userId, page, limit);
    return res.json(reviews);
  } catch (err) {
    logger.error({ err }, "Failed to get reviews");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

const RespondSchema = z.object({
  response: z.string().min(1).max(1000)
});

reviewRouter.post("/:reviewId/respond", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { reviewId } = req.params;
    const targetUserId = req.user!.id;
    const { response } = RespondSchema.parse(req.body);

    const review = await respondToReview(targetUserId, reviewId, response);
    return res.json(review);
  } catch (err: any) {
    if (err.message?.startsWith("NOT_FOUND")) return res.status(404).json({ error: err.message });
    if (err.message?.startsWith("FORBIDDEN")) return res.status(403).json({ error: err.message });
    if (err.message?.startsWith("BAD_REQUEST")) return res.status(400).json({ error: err.message });
    
    logger.error({ err }, "Failed to respond to review");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

const DisputeSchema = z.object({
  reason: z.string().min(1).max(500)
});

reviewRouter.post("/:reviewId/dispute", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!.id;
    const { reason } = DisputeSchema.parse(req.body);

    const review = await disputeReview(userId, reviewId, reason);
    return res.json(review);
  } catch (err: any) {
    if (err.message?.startsWith("NOT_FOUND")) return res.status(404).json({ error: err.message });
    if (err.message?.startsWith("FORBIDDEN")) return res.status(403).json({ error: err.message });
    
    logger.error({ err }, "Failed to dispute review");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});
