// === IMPORTS ===
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

// === CONSTANTS & TYPES ===
export const GUIDE_MODULE_IDS = [
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
] as const;

export type GuideModuleId = (typeof GUIDE_MODULE_IDS)[number];

const VALID_MODULES = new Set<string>(GUIDE_MODULE_IDS);

export interface GuideProgressState {
  version: number;
  completedTours: Record<string, string>;
  skippedTours: Record<string, string>;
  dismissedPrompts: Record<string, boolean>;
  lastActiveStepByModule: Record<string, number>;
  updatedAt: string | null;
}

export interface GuideProgressMutation {
  completeTour?: string;
  skipTour?: string;
  resetTour?: string;
  resetAll?: boolean;
  dismissPrompt?: string;
  lastStep?: { module: string; stepIndex: number };
}

export function createEmptyGuideProgress(): GuideProgressState {
  return {
    version: 1,
    completedTours: {},
    skippedTours: {},
    dismissedPrompts: {},
    lastActiveStepByModule: {},
    updatedAt: null,
  };
}

function sanitizeModuleTimestampMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (VALID_MODULES.has(key) && typeof value === "string" && value.length <= 64) {
      result[key] = value;
    }
  }
  return result;
}

function sanitizePromptMap(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.length <= 64 && typeof value === "boolean" && value) {
      result[key] = true;
    }
  }
  return result;
}

function sanitizeStepMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      VALID_MODULES.has(key) &&
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 50
    ) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Normalizes untrusted database JSON into a deterministic GuideProgressState.
 */
export function normalizeGuideProgress(raw: unknown): GuideProgressState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createEmptyGuideProgress();
  }
  const rec = raw as Record<string, unknown>;
  return {
    version: 1,
    completedTours: sanitizeModuleTimestampMap(rec.completedTours),
    skippedTours: sanitizeModuleTimestampMap(rec.skippedTours),
    dismissedPrompts: sanitizePromptMap(rec.dismissedPrompts),
    lastActiveStepByModule: sanitizeStepMap(rec.lastActiveStepByModule),
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : null,
  };
}

/**
 * Applies a validated mutation to a user's guide progress state without
 * mutating the input object.
 */
export function applyGuideProgressUpdate(
  current: GuideProgressState,
  mutation: GuideProgressMutation,
  nowIso: string = new Date().toISOString(),
): GuideProgressState {
  if (mutation.resetAll) {
    return {
      ...createEmptyGuideProgress(),
      updatedAt: nowIso,
    };
  }

  const next: GuideProgressState = {
    version: 1,
    completedTours: { ...current.completedTours },
    skippedTours: { ...current.skippedTours },
    dismissedPrompts: { ...current.dismissedPrompts },
    lastActiveStepByModule: { ...current.lastActiveStepByModule },
    updatedAt: nowIso,
  };

  if (mutation.completeTour && VALID_MODULES.has(mutation.completeTour)) {
    next.completedTours[mutation.completeTour] = nowIso;
    delete next.skippedTours[mutation.completeTour];
    delete next.lastActiveStepByModule[mutation.completeTour];
    next.dismissedPrompts[mutation.completeTour] = true;
  }

  if (mutation.skipTour && VALID_MODULES.has(mutation.skipTour)) {
    if (!next.completedTours[mutation.skipTour]) {
      next.skippedTours[mutation.skipTour] = nowIso;
    }
    next.dismissedPrompts[mutation.skipTour] = true;
  }

  if (mutation.resetTour && VALID_MODULES.has(mutation.resetTour)) {
    delete next.completedTours[mutation.resetTour];
    delete next.skippedTours[mutation.resetTour];
    delete next.lastActiveStepByModule[mutation.resetTour];
    delete next.dismissedPrompts[mutation.resetTour];
  }

  if (mutation.dismissPrompt && mutation.dismissPrompt.length <= 64) {
    next.dismissedPrompts[mutation.dismissPrompt] = true;
  }

  if (
    mutation.lastStep &&
    VALID_MODULES.has(mutation.lastStep.module) &&
    Number.isInteger(mutation.lastStep.stepIndex) &&
    mutation.lastStep.stepIndex >= 0
  ) {
    next.lastActiveStepByModule[mutation.lastStep.module] =
      mutation.lastStep.stepIndex;
  }

  return next;
}

// === PERSISTENCE FUNCTIONS (USER-ISOLATED) ===

export async function getUserGuideProgress(
  userId: string,
): Promise<GuideProgressState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { guideProgress: true },
  });

  if (!user) {
    const err = new Error("User not found");
    (err as { statusCode?: number }).statusCode = 404;
    throw err;
  }

  return normalizeGuideProgress(user.guideProgress);
}

export async function updateUserGuideProgress(
  userId: string,
  mutation: GuideProgressMutation,
): Promise<GuideProgressState> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { guideProgress: true },
    });

    if (!user) {
      const err = new Error("User not found");
      (err as { statusCode?: number }).statusCode = 404;
      throw err;
    }

    const current = normalizeGuideProgress(user.guideProgress);
    const updated = applyGuideProgressUpdate(current, mutation);

    await tx.user.update({
      where: { id: userId },
      data: {
        guideProgress: updated as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  });
}

export async function resetUserGuideProgress(
  userId: string,
): Promise<GuideProgressState> {
  return updateUserGuideProgress(userId, { resetAll: true });
}
