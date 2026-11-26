import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONTEXTUAL_HELP_ITEMS,
  HELP_DOC_TOPICS,
  KEYBOARD_SHORTCUTS,
  MODULE_TOURS,
} from "../src/components/guide/guideConfig";
import {
  applyGuideProgressMutation,
  buildGuideStorageKey,
  clearStoredGuideProgress,
  computeOverlayPosition,
  createEmptyGuideProgress,
  filterTourStepsForRole,
  findTourTargetElement,
  mergeGuideProgress,
  readStoredGuideProgress,
  shouldShowFirstTimeWelcome,
  writeStoredGuideProgress,
} from "../src/components/guide/guideStorage";
import { GUIDE_MODULE_IDS } from "../src/components/guide/guideTypes";
import { GuideProvider } from "../src/components/guide/GuideContext";
import {
  FirstVisitWelcomeBar,
  GlobalHelpMenu,
} from "../src/components/guide/GlobalHelpMenu";
import { ContextualHelpTrigger } from "../src/components/guide/ContextualHelpTrigger";

const FRONTEND_SRC_DIR = path.resolve(__dirname, "../src");

function collectSourceFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function installMockStorage() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: mockLocalStorage,
      getComputedStyle: (el: any) =>
        el.__style ?? { display: "block", visibility: "visible" },
    },
  });
  return { store, mockLocalStorage };
}

describe("Yekis Guide frontend system", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe("1. First-time, returning, completion, skip, and restart flows", () => {
    it("shows the welcome nudge only to first-time users and suppresses after skip, completion, or dismissal", () => {
      const fresh = createEmptyGuideProgress();
      expect(shouldShowFirstTimeWelcome(fresh, "overview")).toBe(true);
      expect(shouldShowFirstTimeWelcome(fresh, "wallet")).toBe(false);

      const skipped = applyGuideProgressMutation(fresh, { skipTour: "overview" });
      expect(shouldShowFirstTimeWelcome(skipped, "overview")).toBe(false);

      const completed = applyGuideProgressMutation(fresh, {
        completeTour: "overview",
      });
      expect(shouldShowFirstTimeWelcome(completed, "overview")).toBe(false);

      const dismissed = applyGuideProgressMutation(fresh, {
        dismissPrompt: "overview",
      });
      expect(shouldShowFirstTimeWelcome(dismissed, "overview")).toBe(false);
    });

    it("supports skipping, completing, restarting one module, and resetting all progress", () => {
      let state = createEmptyGuideProgress();
      state = applyGuideProgressMutation(state, { completeTour: "overview" });
      state = applyGuideProgressMutation(state, { skipTour: "wallet" });
      state = applyGuideProgressMutation(state, {
        lastStep: { module: "contracts", stepIndex: 1 },
      });

      expect(state.completedTours.overview).toBeTruthy();
      expect(state.skippedTours.wallet).toBeTruthy();
      expect(state.lastActiveStepByModule.contracts).toBe(1);

      // Restarting wallet leaves overview & contracts intact
      state = applyGuideProgressMutation(state, { resetTour: "wallet" });
      expect(state.skippedTours.wallet).toBeUndefined();
      expect(state.completedTours.overview).toBeTruthy();
      expect(state.lastActiveStepByModule.contracts).toBe(1);

      // Full reset restores first-time state
      state = applyGuideProgressMutation(state, { resetAll: true });
      expect(state.completedTours).toEqual({});
      expect(state.skippedTours).toEqual({});
      expect(state.dismissedPrompts).toEqual({});
      expect(shouldShowFirstTimeWelcome(state, "overview")).toBe(true);
    });

    it("prefers newer state timestamp when merging local and backend progress", () => {
      const older = {
        ...createEmptyGuideProgress(),
        updatedAt: "2026-11-26T08:00:00.000Z",
      };
      const newer = {
        ...createEmptyGuideProgress(),
        completedTours: { overview: "2026-11-26T09:00:00.000Z" },
        updatedAt: "2026-11-26T09:00:00.000Z",
      };

      expect(mergeGuideProgress(older, newer).completedTours.overview).toBeTruthy();
      expect(mergeGuideProgress(newer, older).completedTours.overview).toBeTruthy();
    });
  });

  describe("2. Module coverage, cross-module navigation, missing targets, and role filtering", () => {
    it("configures distinct interactive tours and docs for all 12 platform modules", () => {
      expect(GUIDE_MODULE_IDS.length).toBe(12);
      for (const modId of GUIDE_MODULE_IDS) {
        const tour = MODULE_TOURS[modId];
        expect(tour).toBeDefined();
        expect(tour.id).toBe(modId);
        expect(tour.steps.length).toBeGreaterThanOrEqual(1);
        expect(HELP_DOC_TOPICS.some((t) => t.module === modId)).toBe(true);
      }

      // Overview tour transitions cleanly across dashboard sub-views (Analytics <-> Table)
      const overviewActions = MODULE_TOURS.overview.steps
        .map((s) => s.prepareAction)
        .filter(Boolean);
      expect(overviewActions).toContain("dashboard-analytics");
      expect(overviewActions).toContain("dashboard-table");
    });

    it("ensures every configured data-tour selector exists in the frontend codebase", () => {
      const tsxFiles = collectSourceFiles(FRONTEND_SRC_DIR, [".tsx"]);
      const allSource = tsxFiles
        .map((f) => fs.readFileSync(f, "utf8"))
        .join("\n");

      const dataTourMatches = Array.from(
        allSource.matchAll(/data-tour=(?:"([^"]+)"|\{[^}]*"([^"]+)"[^}]*\})/g),
      )
        .map((m) => m[1] || m[2])
        .filter(Boolean);
      const renderedTours = new Set(dataTourMatches);

      for (const modId of GUIDE_MODULE_IDS) {
        for (const step of MODULE_TOURS[modId].steps) {
          const selectors = Array.isArray(step.target)
            ? step.target
            : [step.target];
          const hasAtLeastOneMatch = selectors.some((sel) => {
            const m = sel.match(/\[data-tour="([^"]+)"\]/);
            return m ? renderedTours.has(m[1]!) : false;
          });
          expect(
            hasAtLeastOneMatch,
            `Expected DOM attribute for step ${modId}/${step.id}: ${selectors.join(", ")}`,
          ).toBe(true);
        }
      }
    });

    it("includes concise contextual help for all 9 priority dashboard & workflow features", () => {
      const requiredKeys = [
        "dashboard-kpis",
        "dashboard-cashflow",
        "dashboard-rail-mix",
        "dashboard-pipeline-stages",
        "dashboard-kanban",
        "dashboard-data-table",
        "dashboard-calendar",
        "wallet-financial-actions",
        "escrow-financial-actions",
        "contracts-management",
      ];

      for (const key of requiredKeys) {
        const item = CONTEXTUAL_HELP_ITEMS[key];
        expect(item, `Missing contextual help entry ${key}`).toBeDefined();
        expect(item.featureName.length).toBeGreaterThan(3);
        expect(item.whatItDoes.length).toBeGreaterThan(10);
        expect(item.whyItIsUseful.length).toBeGreaterThan(10);
        expect(item.docTopicId).toBeTruthy();
      }
    });

    it("handles missing, hidden, or zero-size conditional tour targets without throwing", () => {
      installMockStorage();

      const fakeRoot = {
        querySelectorAll: (sel: string) => {
          if (sel === '[data-tour="hidden"]') {
            return [
              {
                __style: { display: "none", visibility: "visible" },
                getBoundingClientRect: () => ({ width: 100, height: 40 }),
              },
            ];
          }
          if (sel === '[data-tour="collapsed"]') {
            return [
              {
                __style: { display: "block", visibility: "visible" },
                getBoundingClientRect: () => ({ width: 0, height: 0 }),
              },
            ];
          }
          if (sel === '[data-tour="visible"]') {
            return [
              {
                __style: { display: "block", visibility: "visible" },
                getBoundingClientRect: () => ({ width: 220, height: 48 }),
              },
            ];
          }
          return [];
        },
      } as unknown as ParentNode;

      expect(
        findTourTargetElement('[data-tour="missing"]', fakeRoot),
      ).toBeNull();
      expect(findTourTargetElement('[data-tour="hidden"]', fakeRoot)).toBeNull();
      expect(
        findTourTargetElement('[data-tour="collapsed"]', fakeRoot),
      ).toBeNull();

      // Ordered fallback resolves first visible target
      const resolved = findTourTargetElement(
        ['[data-tour="hidden"]', '[data-tour="visible"]'],
        fakeRoot,
      );
      expect(resolved).not.toBeNull();
    });

    it("filters role-specific steps cleanly for CLIENT, FREELANCER, and BOTH", () => {
      const jobsSteps = MODULE_TOURS.jobs.steps;
      const clientIds = filterTourStepsForRole(jobsSteps, "CLIENT").map(
        (s) => s.id,
      );
      const freelancerIds = filterTourStepsForRole(jobsSteps, "FREELANCER").map(
        (s) => s.id,
      );
      const bothIds = filterTourStepsForRole(jobsSteps, "BOTH").map((s) => s.id);

      expect(clientIds).toContain("jobs-publish");
      expect(clientIds).toContain("jobs-my-briefs");
      expect(freelancerIds).not.toContain("jobs-publish");
      expect(freelancerIds).not.toContain("jobs-my-briefs");
      expect(bothIds.length).toBe(jobsSteps.length);
    });
  });

  describe("3. Viewport auto-repositioning & mobile responsiveness", () => {
    it("flips bottom placement to top when target sits near bottom viewport edge on desktop", () => {
      const pos = computeOverlayPosition({
        anchorRect: {
          top: 710,
          left: 200,
          right: 480,
          bottom: 770,
          width: 280,
          height: 60,
        },
        overlaySize: { width: 340, height: 220 },
        viewport: { width: 1280, height: 800 },
        preferredPlacement: "bottom",
      });

      expect(pos.placement).toBe("top");
      expect(pos.top).toBeGreaterThanOrEqual(12);
      expect(pos.top + 220).toBeLessThanOrEqual(788);
    });

    it("clamps horizontal overflow and uses opposite-half docking on <640px mobile screens", () => {
      const posTopHalf = computeOverlayPosition({
        anchorRect: {
          top: 64,
          left: 16,
          right: 359,
          bottom: 140,
          width: 343,
          height: 76,
        },
        overlaySize: { width: 352, height: 210 },
        viewport: { width: 375, height: 667 },
        preferredPlacement: "bottom",
        isMobileSheetFallback: true,
      });

      expect(posTopHalf.placement).toBe("bottom");
      expect(posTopHalf.maxWidth).toBeLessThanOrEqual(375 - 24);
      expect(posTopHalf.left).toBeGreaterThanOrEqual(12);
      expect(posTopHalf.top).toBeGreaterThan(200);

      // Anchor in bottom half docks tooltip cleanly near top
      const posBottomHalf = computeOverlayPosition({
        anchorRect: {
          top: 520,
          left: 16,
          right: 359,
          bottom: 610,
          width: 343,
          height: 90,
        },
        overlaySize: { width: 352, height: 210 },
        viewport: { width: 375, height: 667 },
        preferredPlacement: "bottom",
        isMobileSheetFallback: true,
      });
      expect(posBottomHalf.placement).toBe("top");
      expect(posBottomHalf.top).toBe(12);
    });

    it("centers tooltips cleanly when no anchor element is passed", () => {
      const pos = computeOverlayPosition({
        anchorRect: null,
        overlaySize: { width: 320, height: 200 },
        viewport: { width: 1000, height: 700 },
      });
      expect(pos.placement).toBe("center");
      expect(pos.left).toBe((1000 - 320) / 2);
      expect(pos.top).toBe((700 - 200) / 2);
    });
  });

  describe("4. Multi-user and multi-tenant browser storage isolation", () => {
    beforeEach(() => {
      installMockStorage();
    });

    it("isolates onboarding progress by both tenantId and userId", () => {
      const k1 = buildGuideStorageKey("usr-1", "tenant-a");
      const k2 = buildGuideStorageKey("usr-2", "tenant-a");
      const k3 = buildGuideStorageKey("usr-1", "tenant-b");
      expect(new Set([k1, k2, k3]).size).toBe(3);

      const alphaState = applyGuideProgressMutation(
        createEmptyGuideProgress(),
        { completeTour: "overview" },
      );
      writeStoredGuideProgress("usr-1", alphaState, "tenant-a");

      expect(
        readStoredGuideProgress("usr-1", "tenant-a").completedTours.overview,
      ).toBeTruthy();
      expect(readStoredGuideProgress("usr-2", "tenant-a").completedTours).toEqual(
        {},
      );
      expect(readStoredGuideProgress("usr-1", "tenant-b").completedTours).toEqual(
        {},
      );

      clearStoredGuideProgress("usr-1", "tenant-a");
      expect(readStoredGuideProgress("usr-1", "tenant-a").completedTours).toEqual(
        {},
      );
    });
  });

  describe("5. Theme parity, accessibility markup, keyboard shortcuts, and Yekis UI rules", () => {
    it("enforces light/dark theme-parity CSS rules, coarse touch targets, and zero emojis", () => {
      const guideDir = path.join(FRONTEND_SRC_DIR, "components", "guide");
      const css = fs.readFileSync(path.join(guideDir, "guide.css"), "utf8");

      // Dark-theme blocks must ONLY change allowed color/surface/shadow/opacity properties
      const darkRuleMatches = css.matchAll(
        /(?::root\[data-theme="dark"\]|\.dark)[^{]*\{([^}]*)\}/g,
      );
      const allowedProps = new Set([
        "color",
        "background",
        "background-color",
        "border-color",
        "box-shadow",
        "opacity",
      ]);

      let darkRuleCount = 0;
      for (const match of darkRuleMatches) {
        darkRuleCount++;
        const declarations = match[1]
          .split(";")
          .map((d) => d.trim())
          .filter(Boolean);
        for (const decl of declarations) {
          const prop = decl.split(":")[0]?.trim().toLowerCase();
          expect(
            allowedProps.has(prop!),
            `Disallowed property "${prop}" in dark-theme rule`,
          ).toBe(true);
        }
      }
      expect(darkRuleCount).toBeGreaterThanOrEqual(3);

      // Mobile / coarse pointer touch target minimums (>= 44px)
      expect(css).toContain("@media (pointer: coarse)");
      expect(css).toContain("min-width: 44px");
      expect(css).toContain("min-height: 44px");

      // Zero emojis across all guide source files
      const guideFiles = collectSourceFiles(guideDir, [
        ".ts",
        ".tsx",
        ".css",
      ]);
      const emojiRegex = /\p{Extended_Pictographic}/u;
      for (const file of guideFiles) {
        const text = fs.readFileSync(file, "utf8");
        expect(
          emojiRegex.test(text),
          `Unexpected emoji found in ${path.basename(file)}`,
        ).toBe(false);
      }
    });

    it("renders accessible ARIA controls for Help menu, welcome bar, contextual trigger, and shortcuts", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          GuideProvider,
          {
            userId: null,
            activeModule: "overview",
            role: "CLIENT",
            onNavigateModule: () => {},
          },
          React.createElement(GlobalHelpMenu),
          React.createElement(FirstVisitWelcomeBar),
          React.createElement(ContextualHelpTrigger, {
            helpId: "dashboard-kpis",
          }),
        ),
      );

      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-label="Open Yekis Guide Help menu"');
      expect(html).toContain('aria-label="Help: Dashboard KPI Cards"');
      expect(html).toContain("Explain This Page");
      expect(html).toContain("Keyboard Shortcuts");
      // FirstVisitWelcomeBar must not flash before client hydration resolves server progress
      expect(html).not.toContain("New to the Yekis workspace?");

      const shortcutKeys = KEYBOARD_SHORTCUTS.map((s) => s.keys.join("+"));
      expect(shortcutKeys).toContain("Ctrl / Cmd+K");
      expect(shortcutKeys).toContain("Shift+?");
      expect(shortcutKeys).toContain("Esc");
      expect(shortcutKeys).toContain("Right Arrow");
      expect(shortcutKeys).toContain("Left Arrow");
    });
  });
});
