import {
  GUIDE_MODULE_IDS,
  type GuideModuleId,
  type GuideProgressMutation,
  type GuideProgressState,
  type GuideRole,
  type TourPlacement,
  type TourStep,
} from "./guideTypes";

const VALID_MODULES = new Set<string>(GUIDE_MODULE_IDS);
const STORAGE_PREFIX = "yekis:guide:v1";

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

/**
 * Builds a strict tenant- and user-scoped storage key so onboarding progress
 * never leaks across accounts or tenants sharing the same browser.
 */
export function buildGuideStorageKey(
  userId: string,
  tenantId: string = userId,
): string {
  const safeTenant = encodeURIComponent(tenantId.trim() || "anon");
  const safeUser = encodeURIComponent(userId.trim() || "anon");
  return `${STORAGE_PREFIX}:${safeTenant}:${safeUser}`;
}

export function normalizeGuideProgress(raw: unknown): GuideProgressState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createEmptyGuideProgress();
  }
  const rec = raw as Record<string, unknown>;

  const completedTours: Record<string, string> = {};
  if (rec.completedTours && typeof rec.completedTours === "object") {
    for (const [k, v] of Object.entries(
      rec.completedTours as Record<string, unknown>,
    )) {
      if (VALID_MODULES.has(k) && typeof v === "string") {
        completedTours[k] = v;
      }
    }
  }

  const skippedTours: Record<string, string> = {};
  if (rec.skippedTours && typeof rec.skippedTours === "object") {
    for (const [k, v] of Object.entries(
      rec.skippedTours as Record<string, unknown>,
    )) {
      if (VALID_MODULES.has(k) && typeof v === "string") {
        skippedTours[k] = v;
      }
    }
  }

  const dismissedPrompts: Record<string, boolean> = {};
  if (rec.dismissedPrompts && typeof rec.dismissedPrompts === "object") {
    for (const [k, v] of Object.entries(
      rec.dismissedPrompts as Record<string, unknown>,
    )) {
      if (k.length <= 64 && v === true) {
        dismissedPrompts[k] = true;
      }
    }
  }

  const lastActiveStepByModule: Record<string, number> = {};
  if (
    rec.lastActiveStepByModule &&
    typeof rec.lastActiveStepByModule === "object"
  ) {
    for (const [k, v] of Object.entries(
      rec.lastActiveStepByModule as Record<string, unknown>,
    )) {
      if (
        VALID_MODULES.has(k) &&
        typeof v === "number" &&
        Number.isInteger(v) &&
        v >= 0
      ) {
        lastActiveStepByModule[k] = v;
      }
    }
  }

  return {
    version: 1,
    completedTours,
    skippedTours,
    dismissedPrompts,
    lastActiveStepByModule,
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : null,
  };
}

export function applyGuideProgressMutation(
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

export function mergeGuideProgress(
  localState: GuideProgressState,
  remoteState: GuideProgressState,
): GuideProgressState {
  const localTs = localState.updatedAt ? Date.parse(localState.updatedAt) : 0;
  const remoteTs = remoteState.updatedAt
    ? Date.parse(remoteState.updatedAt)
    : 0;
  if (remoteTs >= localTs && remoteState.updatedAt) {
    return remoteState;
  }
  return localState;
}

export function readStoredGuideProgress(
  userId: string | null | undefined,
  tenantId?: string,
): GuideProgressState {
  if (typeof window === "undefined" || !userId) {
    return createEmptyGuideProgress();
  }
  try {
    const raw = window.localStorage.getItem(
      buildGuideStorageKey(userId, tenantId ?? userId),
    );
    if (!raw) return createEmptyGuideProgress();
    return normalizeGuideProgress(JSON.parse(raw));
  } catch {
    return createEmptyGuideProgress();
  }
}

export function writeStoredGuideProgress(
  userId: string | null | undefined,
  state: GuideProgressState,
  tenantId?: string,
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(
      buildGuideStorageKey(userId, tenantId ?? userId),
      JSON.stringify(state),
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearStoredGuideProgress(
  userId: string | null | undefined,
  tenantId?: string,
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(
      buildGuideStorageKey(userId, tenantId ?? userId),
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Filters a module's configured tour steps for the user's current role.
 */
export function filterTourStepsForRole(
  steps: TourStep[],
  role: GuideRole,
): TourStep[] {
  return steps.filter((step) => {
    if (!step.roles || step.roles.length === 0) return true;
    if (role === "BOTH") return true;
    return step.roles.includes(role);
  });
}

/**
 * Resolves the first visible matching DOM element for a step selector or
 * selector list. Returns null when the element is absent or hidden.
 */
export function findTourTargetElement(
  target: string | string[],
  root: ParentNode = document,
): HTMLElement | null {
  const selectors = Array.isArray(target) ? target : [target];
  for (const selector of selectors) {
    const candidates = root.querySelectorAll<HTMLElement>(selector);
    for (const el of candidates) {
      const style =
        typeof window !== "undefined" ? window.getComputedStyle(el) : null;
      if (style && (style.display === "none" || style.visibility === "hidden")) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }
      return el;
    }
  }
  return null;
}

export interface RectLike {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SizeLike {
  width: number;
  height: number;
}

export interface PositionedBox {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right" | "center";
  maxWidth: number;
}

/**
 * Computes a viewport-clamped tooltip or popover position relative to an anchor
 * rect, automatically flipping axes to prevent clipping on desktop and mobile.
 */
export function computeOverlayPosition(params: {
  anchorRect: RectLike | null;
  overlaySize: SizeLike;
  viewport: SizeLike;
  preferredPlacement?: TourPlacement;
  offset?: number;
  padding?: number;
  isMobileSheetFallback?: boolean;
}): PositionedBox {
  const {
    anchorRect,
    overlaySize,
    viewport,
    preferredPlacement = "auto",
    offset = 12,
    padding = 12,
    isMobileSheetFallback = true,
  } = params;

  const maxAllowedWidth = Math.max(240, viewport.width - padding * 2);
  const effectiveW = Math.min(overlaySize.width, maxAllowedWidth);
  const effectiveH = Math.min(overlaySize.height, viewport.height - padding * 2);

  if (!anchorRect) {
    return {
      top: Math.max(padding, (viewport.height - effectiveH) / 2),
      left: Math.max(padding, (viewport.width - effectiveW) / 2),
      placement: "center",
      maxWidth: maxAllowedWidth,
    };
  }

  // On narrow mobile screens, dock cleanly opposite the target's vertical half
  if (isMobileSheetFallback && viewport.width < 640) {
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const targetInTopHalf = anchorCenterY < viewport.height / 2;
    const top = targetInTopHalf
      ? Math.max(padding, viewport.height - effectiveH - padding)
      : padding;
    return {
      top,
      left: Math.max(padding, (viewport.width - effectiveW) / 2),
      placement: targetInTopHalf ? "bottom" : "top",
      maxWidth: maxAllowedWidth,
    };
  }

  const spaceBottom = viewport.height - anchorRect.bottom - offset - padding;
  const spaceTop = anchorRect.top - offset - padding;
  const spaceRight = viewport.width - anchorRect.right - offset - padding;
  const spaceLeft = anchorRect.left - offset - padding;

  const fits: Record<"bottom" | "top" | "right" | "left", boolean> = {
    bottom: spaceBottom >= effectiveH,
    top: spaceTop >= effectiveH,
    right: spaceRight >= effectiveW,
    left: spaceLeft >= effectiveW,
  };

  const defaultOrder: Array<"bottom" | "top" | "right" | "left"> = [
    "bottom",
    "top",
    "right",
    "left",
  ];

  const candidateOrder: Array<"bottom" | "top" | "right" | "left"> =
    preferredPlacement !== "auto"
      ? [
          preferredPlacement,
          ...defaultOrder.filter((p) => p !== preferredPlacement),
        ]
      : defaultOrder;

  const chosen: "bottom" | "top" | "right" | "left" =
    candidateOrder.find((p) => fits[p]) ??
    candidateOrder.reduce((best, curr) => {
      const spaceFor = (p: "bottom" | "top" | "right" | "left") =>
        p === "bottom"
          ? spaceBottom
          : p === "top"
            ? spaceTop
            : p === "right"
              ? spaceRight
              : spaceLeft;
      return spaceFor(curr) > spaceFor(best) ? curr : best;
    }, candidateOrder[0]);

  let top: number;
  let left: number;

  if (chosen === "bottom") {
    top = anchorRect.bottom + offset;
    left = anchorRect.left + anchorRect.width / 2 - effectiveW / 2;
  } else if (chosen === "top") {
    top = anchorRect.top - effectiveH - offset;
    left = anchorRect.left + anchorRect.width / 2 - effectiveW / 2;
  } else if (chosen === "right") {
    top = anchorRect.top + anchorRect.height / 2 - effectiveH / 2;
    left = anchorRect.right + offset;
  } else {
    top = anchorRect.top + anchorRect.height / 2 - effectiveH / 2;
    left = anchorRect.left - effectiveW - offset;
  }

  const clampedLeft = Math.min(
    Math.max(padding, left),
    Math.max(padding, viewport.width - effectiveW - padding),
  );
  const clampedTop = Math.min(
    Math.max(padding, top),
    Math.max(padding, viewport.height - effectiveH - padding),
  );

  return {
    top: clampedTop,
    left: clampedLeft,
    placement: chosen,
    maxWidth: maxAllowedWidth,
  };
}

/**
 * Checks whether a user has never completed, skipped, or dismissed a module's
 * onboarding prompt (used for non-intrusive first-time user welcome).
 */
export function shouldShowFirstTimeWelcome(
  progress: GuideProgressState,
  moduleId: GuideModuleId,
): boolean {
  if (moduleId !== "overview") return false;
  const hasCompletedAny = Object.keys(progress.completedTours).length > 0;
  const hasSkippedOverview = Boolean(progress.skippedTours[moduleId]);
  const hasDismissedOverview = Boolean(progress.dismissedPrompts[moduleId]);
  return !hasCompletedAny && !hasSkippedOverview && !hasDismissedOverview;
}
