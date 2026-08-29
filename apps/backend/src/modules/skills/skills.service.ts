// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import type { SkillCategory } from "@prisma/client";

const SKILLS_CACHE_KEY = "skills:all";
const SKILLS_CACHE_TTL = 3600; // 1 hour

// === MAIN FUNCTIONS ===
export async function listSkills(category?: SkillCategory) {
  // Try cache first (only for unfiltered)
  if (!category) {
    const cached = await redis.get(SKILLS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }

  const where: any = { isActive: true };
  if (category) where.category = category;

  const skills = await prisma.skill.findMany({
    where,
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { nameEn: "asc" }],
  });

  if (!category) {
    await redis.set(
      SKILLS_CACHE_KEY,
      JSON.stringify(skills),
      "EX",
      SKILLS_CACHE_TTL,
    );
  }

  return skills;
}

export async function listCategories() {
  return [
    "DEVELOPMENT",
    "DESIGN",
    "MARKETING",
    "WRITING",
    "TRANSLATION",
    "DATA_ENTRY",
    "VIDEO_AUDIO",
    "BUSINESS",
    "ENGINEERING",
    "OTHER",
  ];
}
