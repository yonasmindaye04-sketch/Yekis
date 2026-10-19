// === IMPORTS ===
import { Router } from "express";
import { logger } from "../../lib/logger.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import {
  CreatePortfolioItemInput,
  UpdatePortfolioItemInput,
} from "@marketplace/schemas";
import {
  listPortfolioItems,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
} from "./portfolio.service.js";

export const portfolioRouter = Router();

// === ROUTES ===
portfolioRouter.get("/users/:userId/portfolio", async (req, res) => {
  try {
    const { userId } = req.params;
    const items = await listPortfolioItems(userId!);
    return res.json(items);
  } catch (err) {
    logger.error({ err }, "Failed to list portfolio items");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

portfolioRouter.post("/me", requireAuth, async (req: AuthedRequest, res) => {
  // F-17: parse before the service. The old route handed the raw body through.
  const parsed = CreatePortfolioItemInput.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  try {
    const userId = req.user!.id;
    const item = await createPortfolioItem(userId, parsed.data);
    return res.status(201).json(item);
  } catch (err: any) {
    if (err.message?.startsWith("BAD_REQUEST"))
      return res.status(400).json({ error: err.message });
    logger.error({ err }, "Failed to create portfolio item");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

portfolioRouter.patch(
  "/me/:itemId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    // F-17: `.strict()` means `userId`, `id`, `createdAt` etc. are rejected
    // rather than reaching Prisma.
    const parsed = UpdatePortfolioItemInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    try {
      const userId = req.user!.id;
      const { itemId } = req.params;
      const item = await updatePortfolioItem(userId, itemId!, parsed.data);
      return res.json(item);
    } catch (err: any) {
      if (err.message?.startsWith("NOT_FOUND"))
        return res.status(404).json({ error: err.message });
      if (err.message?.startsWith("FORBIDDEN"))
        return res.status(403).json({ error: err.message });
      logger.error({ err }, "Failed to update portfolio item");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

portfolioRouter.delete(
  "/me/:itemId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { itemId } = req.params;
      await deletePortfolioItem(userId, itemId!);
      return res.json({ success: true });
    } catch (err: any) {
      if (err.message?.startsWith("NOT_FOUND"))
        return res.status(404).json({ error: err.message });
      if (err.message?.startsWith("FORBIDDEN"))
        return res.status(403).json({ error: err.message });
      logger.error({ err }, "Failed to delete portfolio item");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
