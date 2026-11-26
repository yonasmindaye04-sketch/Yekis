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
  languagePreference: z.enum(["en", "am", "om", "ti"]).optional(),
  timezone: z.string().max(60).optional(),
  // `avatarUrl` is stored in VARCHAR(500), and it is copied into every chat,
  // contract, gig and featured response that selects an avatar. Accept only a
  // short, referenceable URL — the bytes are uploaded separately to
  // POST /me/avatar. A data URL here is the bug that made every profile save
  // with a custom photo fail with a 500: Zod allowed 1.5 MB and Postgres
  // rejected anything over 500 characters.
  avatarUrl: z
    .string()
    .max(500, "Avatar URL cannot exceed 500 characters")
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || /^https:\/\//i.test(value),
      "Avatar must be an uploaded image or an https URL.",
    )
    .nullable()
    .optional(),
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

export const guideProgressModuleSchema = z.enum([
  "overview",
  "jobs",
  "proposals",
  "gigs",
  "contracts",
  "escrow",
  "wallet",
  "chat",
  "profile",
  "cases",
  "verification",
  "settings",
]);

export const guideProgressUpdateSchema = z
  .object({
    completeTour: guideProgressModuleSchema.optional(),
    skipTour: guideProgressModuleSchema.optional(),
    resetTour: guideProgressModuleSchema.optional(),
    resetAll: z.boolean().optional(),
    dismissPrompt: z.string().min(1).max(64).optional(),
    lastStep: z
      .object({
        module: guideProgressModuleSchema,
        stepIndex: z.number().int().min(0).max(50),
      })
      .optional(),
  })
  .refine(
    (val) =>
      val.completeTour !== undefined ||
      val.skipTour !== undefined ||
      val.resetTour !== undefined ||
      val.resetAll !== undefined ||
      val.dismissPrompt !== undefined ||
      val.lastStep !== undefined,
    { message: "At least one guide progress update field is required." },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ReportProfileInput = z.infer<typeof reportProfileSchema>;
export type GuideProgressUpdateInput = z.infer<typeof guideProgressUpdateSchema>;
