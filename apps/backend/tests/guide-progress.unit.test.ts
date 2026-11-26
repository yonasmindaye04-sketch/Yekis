import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

// Mock Postgres/Prisma & logger in-memory so this unit & HTTP isolation suite
// verifies route authorization, Zod validation, and per-user data boundaries
// cleanly without needing a live Postgres or Redis daemon.
const mockUsers = new Map<string, { id: string; guideProgress: unknown }>();
let activeAuthUserId: string | null = null;

vi.mock("../src/lib/prisma.js", () => {
  const client = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = mockUsers.get(where.id);
        return user ? { guideProgress: user.guideProgress } : null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { guideProgress: unknown };
        }) => {
          const user = mockUsers.get(where.id);
          if (!user) throw new Error("User not found");
          user.guideProgress = data.guideProgress;
          return { id: user.id, guideProgress: user.guideProgress };
        },
      ),
    },
    profileView: {
      count: vi.fn(async () => 0),
    },
    $transaction: vi.fn(async (cb: (tx: typeof client) => Promise<unknown>) =>
      cb(client),
    ),
  };
  return { prisma: client };
});

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../src/middleware/auth.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!activeAuthUserId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    req.user = { id: activeAuthUserId, role: "BOTH" };
    return next();
  },
  requireFreshAuth: () => (_req: any, _res: any, next: any) => next(),
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));

import {
  GUIDE_MODULE_IDS,
  applyGuideProgressUpdate,
  createEmptyGuideProgress,
  normalizeGuideProgress,
} from "../src/modules/profiles/guideProgress.service.js";
import { guideProgressUpdateSchema } from "../src/modules/profiles/profile.validation.js";
import { profileRouter } from "../src/modules/profiles/profile.routes.js";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/users", profileRouter);
  return app;
}

describe("Yekis Guide backend persistence & isolation", () => {
  beforeEach(() => {
    mockUsers.clear();
    mockUsers.set("user-alpha", { id: "user-alpha", guideProgress: null });
    mockUsers.set("user-beta", { id: "user-beta", guideProgress: null });
    activeAuthUserId = null;
  });

  it("normalizes malformed JSON payloads into a clean v1 guide state", () => {
    expect(normalizeGuideProgress(null)).toEqual(createEmptyGuideProgress());
    expect(normalizeGuideProgress(["bad"])).toEqual(createEmptyGuideProgress());

    const cleaned = normalizeGuideProgress({
      completedTours: {
        overview: "2026-11-26T10:00:00.000Z",
        "invalid-module": "2026-11-26T10:00:00.000Z",
        wallet: 12345,
      },
      skippedTours: {
        jobs: "2026-11-26T10:01:00.000Z",
        unknown: "nope",
      },
      dismissedPrompts: {
        "welcome-bar": true,
        ignored: "yes",
      },
      lastActiveStepByModule: {
        contracts: 2,
        escrow: -1,
        gigs: 999,
      },
    });

    expect(cleaned.completedTours).toEqual({
      overview: "2026-11-26T10:00:00.000Z",
    });
    expect(cleaned.skippedTours).toEqual({
      jobs: "2026-11-26T10:01:00.000Z",
    });
    expect(cleaned.dismissedPrompts).toEqual({
      "welcome-bar": true,
    });
    expect(cleaned.lastActiveStepByModule).toEqual({
      contracts: 2,
    });
  });

  it("applies complete, skip, restart, prompt dismissal, and full reset transitions cleanly", () => {
    let state = createEmptyGuideProgress();

    // First-time skip marks skipped + dismisses module prompt
    state = applyGuideProgressUpdate(state, { skipTour: "jobs" });
    expect(state.skippedTours.jobs).toBeTruthy();
    expect(state.dismissedPrompts.jobs).toBe(true);
    expect(state.completedTours.jobs).toBeUndefined();

    // Completing later removes skipped mark & records completion timestamp
    state = applyGuideProgressUpdate(state, { completeTour: "jobs" });
    expect(state.completedTours.jobs).toBeTruthy();
    expect(state.skippedTours.jobs).toBeUndefined();

    // Re-skipping an already-completed tour must not erase completion
    state = applyGuideProgressUpdate(state, { skipTour: "jobs" });
    expect(state.completedTours.jobs).toBeTruthy();
    expect(state.skippedTours.jobs).toBeUndefined();

    // Saving intermediate step index
    state = applyGuideProgressUpdate(state, {
      lastStep: { module: "escrow", stepIndex: 2 },
    });
    expect(state.lastActiveStepByModule.escrow).toBe(2);

    // Restarting a single module clears only that module
    state = applyGuideProgressUpdate(state, { resetTour: "jobs" });
    expect(state.completedTours.jobs).toBeUndefined();
    expect(state.skippedTours.jobs).toBeUndefined();
    expect(state.dismissedPrompts.jobs).toBeUndefined();
    expect(state.lastActiveStepByModule.escrow).toBe(2);

    // Resetting all clears every module and prompt
    state = applyGuideProgressUpdate(state, { resetAll: true });
    expect(state.completedTours).toEqual({});
    expect(state.skippedTours).toEqual({});
    expect(state.dismissedPrompts).toEqual({});
    expect(state.lastActiveStepByModule).toEqual({});
    expect(state.updatedAt).toBeTruthy();
  });

  it("validates payloads with guideProgressUpdateSchema for all 12 modules", () => {
    for (const moduleId of GUIDE_MODULE_IDS) {
      expect(
        guideProgressUpdateSchema.safeParse({ completeTour: moduleId }).success,
      ).toBe(true);
    }

    expect(guideProgressUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      guideProgressUpdateSchema.safeParse({ completeTour: "not-a-module" })
        .success,
    ).toBe(false);
    expect(
      guideProgressUpdateSchema.safeParse({
        lastStep: { module: "overview", stepIndex: 100 },
      }).success,
    ).toBe(false);
  });

  it("enforces authentication and isolates guide progress strictly between different users", async () => {
    const app = createTestApp();

    // Unauthenticated requests fail closed with 401
    const unauthGet = await request(app).get("/api/v1/users/me/guide-progress");
    expect(unauthGet.status).toBe(401);

    const unauthPatch = await request(app)
      .patch("/api/v1/users/me/guide-progress")
      .send({ completeTour: "overview" });
    expect(unauthPatch.status).toBe(401);

    // User Alpha completes overview and dismisses welcome banner
    activeAuthUserId = "user-alpha";
    const alphaInitial = await request(app).get(
      "/api/v1/users/me/guide-progress",
    );
    expect(alphaInitial.status).toBe(200);
    expect(alphaInitial.body.completedTours).toEqual({});

    const alphaPatch = await request(app)
      .patch("/api/v1/users/me/guide-progress")
      .send({ completeTour: "overview", dismissPrompt: "welcome-bar" });
    expect(alphaPatch.status).toBe(200);
    expect(alphaPatch.body.completedTours.overview).toBeTruthy();
    expect(alphaPatch.body.dismissedPrompts["welcome-bar"]).toBe(true);

    // Invalid payload returns 400 VALIDATION_FAILED
    const badPatch = await request(app)
      .patch("/api/v1/users/me/guide-progress")
      .send({ completeTour: "nonexistent" });
    expect(badPatch.status).toBe(400);
    expect(badPatch.body.error).toBe("VALIDATION_FAILED");

    // User Beta sees completely clean onboarding state (zero cross-user leakage)
    activeAuthUserId = "user-beta";
    const betaInitial = await request(app).get(
      "/api/v1/users/me/guide-progress",
    );
    expect(betaInitial.status).toBe(200);
    expect(betaInitial.body.completedTours).toEqual({});
    expect(betaInitial.body.dismissedPrompts).toEqual({});

    // User Beta skips wallet tour; Alpha's state remains isolated and unchanged
    const betaPatch = await request(app)
      .patch("/api/v1/users/me/guide-progress")
      .send({ skipTour: "wallet" });
    expect(betaPatch.status).toBe(200);
    expect(betaPatch.body.skippedTours.wallet).toBeTruthy();

    activeAuthUserId = "user-alpha";
    const alphaVerify = await request(app).get(
      "/api/v1/users/me/guide-progress",
    );
    expect(alphaVerify.status).toBe(200);
    expect(alphaVerify.body.completedTours.overview).toBeTruthy();
    expect(alphaVerify.body.skippedTours.wallet).toBeUndefined();

    // Resetting Alpha's progress via DELETE leaves Beta's skipped tour intact
    const alphaDelete = await request(app).delete(
      "/api/v1/users/me/guide-progress",
    );
    expect(alphaDelete.status).toBe(200);
    expect(alphaDelete.body.completedTours).toEqual({});
    expect(alphaDelete.body.dismissedPrompts).toEqual({});

    activeAuthUserId = "user-beta";
    const betaStillHasSkip = await request(app).get(
      "/api/v1/users/me/guide-progress",
    );
    expect(betaStillHasSkip.status).toBe(200);
    expect(betaStillHasSkip.body.skippedTours.wallet).toBeTruthy();
  });
});
