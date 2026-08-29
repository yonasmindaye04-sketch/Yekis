// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import {
  getFeaturedTalent,
  refreshFeaturedCarousel,
  pinUser,
} from "./featured.service.js";
import { logger } from "../../lib/logger.js";

export const featuredRouter = Router();

// === ROUTES ===
featuredRouter.get("/", async (req, res) => {
  try {
    const featured = await getFeaturedTalent();
    res.json(featured);
  } catch (error) {
    logger.error({ err: error }, "GET /featured error");
    res.status(500).json({ error: "Failed to fetch featured talent" });
  }
});

const pinUserSchema = z.object({
  userId: z.string(),
  category: z.string(),
  notes: z.string().optional(),
});

featuredRouter.post(
  "/staff/pin",
  requireAuth,
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
  async (req: any, res) => {
    try {
      const data = pinUserSchema.parse(req.body);
      await pinUser(req.user.id, data.userId, data.category, data.notes);
      res.json({ message: "User pinned successfully" });
    } catch (error) {
      logger.error({ err: error }, "POST /featured/staff/pin error");
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to pin user" });
    }
  },
);

featuredRouter.post(
  "/staff/refresh",
  requireAuth,
  requireStaffRole("ADMIN"),
  async (req, res) => {
    try {
      await refreshFeaturedCarousel();
      res.json({ message: "Featured carousel refreshed successfully" });
    } catch (error) {
      logger.error({ err: error }, "POST /featured/staff/refresh error");
      res.status(500).json({ error: "Failed to refresh featured carousel" });
    }
  },
);
