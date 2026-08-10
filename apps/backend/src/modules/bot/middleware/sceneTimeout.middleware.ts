import { BotContext } from "../types.js";
import { SCENE_TTL_MS } from "../types.js";

/**
 * Middleware to enforce scene timeouts.
 * Scenes that sit idle longer than SCENE_TTL_MS are automatically cleared.
 * This prevents users from submitting stale data (e.g., proposing on an expired job).
 */
export async function sceneTimeoutMiddleware(ctx: BotContext, next: () => Promise<void>) {
  // Check if we're in a scene and it has a start timestamp
  if (ctx.session.scene && ctx.session.sceneStartedAt) {
    const elapsed = Date.now() - ctx.session.sceneStartedAt;

    if (elapsed > SCENE_TTL_MS) {
      // Scene expired - clear it and notify user
      const expiredScene = ctx.session.scene;
      ctx.session.scene = undefined;
      ctx.session.sceneStep = undefined;
      ctx.session.sceneData = undefined;
      ctx.session.sceneStartedAt = undefined;

      // Notify user their session expired
      const t = ctx.i18n?.t ?? ((key: string) => key);
      await ctx.reply(
        ctx.t("errors.scene_expired", { scene: expiredScene }) ||
        `Your ${expiredScene} session expired due to inactivity. Please start again.`
      );
    }
  }

  await next();
}

/**
 * Helper to start a new scene with timeout tracking
 */
export function startScene(
  ctx: BotContext,
  sceneName: string,
  initialData: Record<string, any> = {}
): void {
  ctx.session.scene = sceneName;
  ctx.session.sceneStep = 0;
  ctx.session.sceneData = initialData;
  ctx.session.sceneStartedAt = Date.now();
}

/**
 * Helper to advance scene step
 */
export function advanceScene(
  ctx: BotContext,
  dataUpdates: Record<string, any> = {}
): void {
  if (ctx.session.scene) {
    ctx.session.sceneStep = (ctx.session.sceneStep ?? 0) + 1;
    ctx.session.sceneData = { ...ctx.session.sceneData, ...dataUpdates };
    ctx.session.sceneStartedAt = Date.now(); // Reset timeout on activity
  }
}

/**
 * Helper to clear current scene
 */
export function clearScene(ctx: BotContext): void {
  ctx.session.scene = undefined;
  ctx.session.sceneStep = undefined;
  ctx.session.sceneData = undefined;
  ctx.session.sceneStartedAt = undefined;
}

/**
 * Check if current scene matches expected (with timeout validation)
 */
export function assertScene(ctx: BotContext, expectedScene: string): boolean {
  if (ctx.session.scene !== expectedScene) {
    return false;
  }

  // Also check timeout
  if (ctx.session.sceneStartedAt) {
    const elapsed = Date.now() - ctx.session.sceneStartedAt;
    if (elapsed > SCENE_TTL_MS) {
      clearScene(ctx);
      return false;
    }
  }

  return true;
}
