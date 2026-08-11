// === IMPORTS ===
import { Router } from "express";
import { logger } from "../../lib/logger.js";
import { listSkills, listCategories } from "./skills.service.js";
import type { SkillCategory } from "@prisma/client";

export const skillsRouter = Router();

// === ROUTES ===
skillsRouter.get("/", async (req, res) => {
  try {
    const category = req.query.category as SkillCategory | undefined;
    const skills = await listSkills(category);
    return res.json(skills);
  } catch (err) {
    logger.error({ err }, "Failed to list skills");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

skillsRouter.get("/categories", async (_req, res) => {
  try {
    const categories = await listCategories();
    return res.json(categories);
  } catch (err) {
    logger.error({ err }, "Failed to list categories");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});
