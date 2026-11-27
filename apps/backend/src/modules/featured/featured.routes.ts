// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requirePermission } from "../admin/permissions.js";
import {
  getFeaturedTalent,
  refreshFeaturedCarousel,
  pinUser,
  getSavedTalentIdsForUser,
  saveTalentsForUser,
  removeSavedTalentForUser,
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

featuredRouter.get("/saved", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const talentIds = await getSavedTalentIdsForUser(req.user!.id);
    return res.json({ talentIds });
  } catch (error) {
    logger.error({ err: error }, "GET /featured/saved error");
    return res.status(500).json({ error: "Failed to fetch saved talents" });
  }
});

const SaveTalentInput = z.object({
  talentId: z.string().trim().min(1).optional(),
  talentIds: z.array(z.string().trim().min(1)).max(50).optional(),
});

featuredRouter.post("/saved", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = SaveTalentInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR" });
  }
  const ids = [
    ...(parsed.data.talentId ? [parsed.data.talentId] : []),
    ...(parsed.data.talentIds ?? []),
  ];
  try {
    const talentIds = await saveTalentsForUser(req.user!.id, ids);
    return res.json({ talentIds });
  } catch (error) {
    logger.error({ err: error }, "POST /featured/saved error");
    return res.status(500).json({ error: "Failed to save talent" });
  }
});

featuredRouter.delete(
  "/saved/:talentId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const talentIds = await removeSavedTalentForUser(
        req.user!.id,
        req.params.talentId as string,
      );
      return res.json({ talentIds });
    } catch (error) {
      logger.error({ err: error }, "DELETE /featured/saved/:talentId error");
      return res.status(500).json({ error: "Failed to remove saved talent" });
    }
  },
);

const pinUserSchema = z.object({
  userId: z.string(),
  category: z.string(),
  notes: z.string().optional(),
});

featuredRouter.post(
  "/staff/pin",
  requireAuth,
  requirePermission("featured.manage"),
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
  requirePermission("featured.manage"),
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
