// === IMPORTS ===
import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .regex(/^[\p{L}\s-]{1,50}$/u, "Invalid first name format")
    .optional(),
  lastName: z
    .string()
    .regex(/^[\p{L}\s-]{1,50}$/u, "Invalid last name format")
    .optional(),
  bio: z.string().max(2000, "Bio cannot exceed 2000 characters").optional(),
  primarySkillId: z.string().optional(),
  skillIds: z
    .array(z.string())
    .max(10, "Maximum of 10 skills allowed")
    .optional(),
  isAvailableForWork: z.boolean().optional(),
  profileVisibility: z.enum(["PUBLIC", "PROPOSERS", "PRIVATE"]).optional(),
});

export const reportProfileSchema = z.object({
  reason: z.enum([
    "FAKE_IDENTITY",
    "OFFENSIVE_CONTENT",
    "OFF_PLATFORM_CONTACT",
    "MISLEADING_SKILLS",
    "SPAM",
    "OTHER",
  ]),
  details: z.string().max(1000).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ReportProfileInput = z.infer<typeof reportProfileSchema>;
