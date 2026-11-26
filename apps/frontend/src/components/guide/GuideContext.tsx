import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../../api/client";
import {
  CONTEXTUAL_HELP_ITEMS,
  HELP_DOC_TOPICS,
  MODULE_TOURS,
} from "./guideConfig";
import {
  applyGuideProgressMutation,
  clearStoredGuideProgress,
  createEmptyGuideProgress,
  filterTourStepsForRole,
  findTourTargetElement,
  mergeGuideProgress,
  normalizeGuideProgress,
  readStoredGuideProgress,
  shouldShowFirstTimeWelcome,
  writeStoredGuideProgress,
} from "./guideStorage";
import type {
  ContextualHelpItem,
  GuideModuleId,
  GuideProgressMutation,
  GuideProgressState,
  GuideRole,
  ModuleTourConfig,
  TourStep,
} from "./guideTypes";

export type DashboardSubViewAction =
  | "dashboard-analytics"
  | "dashboard-table"
  | "dashboard-kanban"
  | "dashboard-calendar";

interface ActiveTourState {
  moduleId: GuideModuleId;
  steps: TourStep[];
  stepIndex: number;
}

interface GuideContextValue {
  userId: string | null;
  tenantId: string | null;
  activeModule: GuideModuleId;
  role: GuideRole;
  progress: GuideProgressState;
  isHydrated: boolean;

  // Global help menu & dialogs
  helpMenuOpen: boolean;
  setHelpMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  explainPageOpen: boolean;
  setExplainPageOpen: (open: boolean) => void;
  docsOpen: boolean;
  activeDocTopicId: string | null;
  openDocs: (topicId?: string | null) => void;
  closeDocs: () => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  // Contextual help popovers
  activeContextualHelpId: string | null;
  setActiveContextualHelpId: (id: string | null) => void;
  getContextualHelp: (id: string) => ContextualHelpItem | undefined;

  // Product tour control
  activeTour: ActiveTourState | null;
  currentTourConfig: ModuleTourConfig;
  startTour: (
    moduleId?: GuideModuleId,
    options?: { fromBeginning?: boolean },
  ) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  isTourCompleted: (moduleId: GuideModuleId) => boolean;
  isTourSkipped: (moduleId: GuideModuleId) => boolean;

  // Progress & first-time welcome management
  showFirstVisitWelcome: boolean;
  dismissFirstVisitWelcome: () => void;
  resetModuleProgress: (moduleId: GuideModuleId) => Promise<void>;
  resetAllProgress: () => Promise<void>;

  // Navigation & support hooks
  navigateToModule: (moduleId: GuideModuleId) => void;
  canContactSupport: boolean;
  contactSupport: () => void;
  returnFocusRef: React.MutableRefObject<HTMLElement | null>;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export interface GuideProviderProps {
  userId: string | null;
  /** Optional tenant/workspace isolation key; defaults to userId. */
  tenantId?: string | null;
  activeModule: GuideModuleId;
  role: GuideRole;
  onNavigateModule: (module: GuideModuleId) => void;
  onPrepareDashboardSubView?: (action: DashboardSubViewAction) => void;
  onContactSupport?: () => void;
  children: React.ReactNode;
}

export function GuideProvider({
  userId,
  tenantId,
  activeModule,
  role,
  onNavigateModule,
  onPrepareDashboardSubView,
  onContactSupport,
  children,
}: GuideProviderProps) {
  const effectiveTenantId = tenantId ?? userId;
  const scopeKey = userId ? `${effectiveTenantId ?? userId}:${userId}` : null;

  const [progress, setProgress] = useState<GuideProgressState>(() =>
    readStoredGuideProgress(userId, effectiveTenantId ?? undefined),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [explainPageOpen, setExplainPageOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [activeDocTopicId, setActiveDocTopicId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeContextualHelpId, setActiveContextualHelpId] = useState<
    string | null
  >(null);
  const [activeTour, setActiveTour] = useState<ActiveTourState | null>(null);

  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activeScopeRef = useRef<string | null>(scopeKey);

  // Close transient overlays & reload isolated progress whenever user/tenant changes
  useEffect(() => {
    activeScopeRef.current = scopeKey;
    setHelpMenuOpen(false);
    setExplainPageOpen(false);
    setDocsOpen(false);
    setShortcutsOpen(false);
    setActiveContextualHelpId(null);
    setActiveTour(null);

    if (!userId) {
      setProgress(createEmptyGuideProgress());
      setIsHydrated(true);
      return;
    }

    const local = readStoredGuideProgress(
      userId,
      effectiveTenantId ?? undefined,
    );
    setProgress(local);
    setIsHydrated(false);

    let cancelled = false;
    const expectedScope = `${effectiveTenantId ?? userId}:${userId}`;

    api
      .getGuideProgress()
      .then((remote) => {
        if (cancelled || activeScopeRef.current !== expectedScope) return;
        const normalizedRemote = normalizeGuideProgress(remote);
        const merged = mergeGuideProgress(local, normalizedRemote);
        setProgress(merged);
        writeStoredGuideProgress(
          userId,
          merged,
          effectiveTenantId ?? undefined,
        );
      })
      .catch(() => {
        // Offline or transient network error — keep isolated local state
      })
      .finally(() => {
        if (!cancelled && activeScopeRef.current === expectedScope) {
          setIsHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, effectiveTenantId]);

  // Close contextual popovers on module navigation (keep tour alive if tour targets that module)
  useEffect(() => {
    setActiveContextualHelpId(null);
    setHelpMenuOpen(false);
  }, [activeModule]);

  const mutateProgress = useCallback(
    async (mutation: GuideProgressMutation) => {
      const targetUserId = userId;
      const targetTenantId = effectiveTenantId ?? undefined;
      setProgress((prev) => {
        const next = applyGuideProgressMutation(prev, mutation);
        writeStoredGuideProgress(targetUserId, next, targetTenantId);
        return next;
      });

      if (!targetUserId) return;
      const expectedScope = `${effectiveTenantId ?? targetUserId}:${targetUserId}`;
      try {
        const remote = await api.updateGuideProgress(mutation);
        if (activeScopeRef.current === expectedScope) {
          const normalized = normalizeGuideProgress(remote);
          setProgress(normalized);
          writeStoredGuideProgress(targetUserId, normalized, targetTenantId);
        }
      } catch {
        // Local per-user progress stays intact if backend is offline
      }
    },
    [userId, effectiveTenantId],
  );

  const prepareStep = useCallback(
    (step: TourStep | undefined, tourModuleId: GuideModuleId) => {
      if (!step) return;
      const targetModule = step.module ?? tourModuleId;
      if (targetModule !== activeModule) {
        onNavigateModule(targetModule);
      }
      if (step.prepareAction && onPrepareDashboardSubView) {
        onPrepareDashboardSubView(step.prepareAction);
      }
    },
    [activeModule, onNavigateModule, onPrepareDashboardSubView],
  );

  const startTour = useCallback(
    (
      moduleId: GuideModuleId = activeModule,
      options: { fromBeginning?: boolean } = {},
    ) => {
      const config = MODULE_TOURS[moduleId] ?? MODULE_TOURS.overview;
      const roleFiltered = filterTourStepsForRole(config.steps, role);
      const steps = roleFiltered.length > 0 ? roleFiltered : config.steps;

      if (steps.length === 0) return;

      setHelpMenuOpen(false);
      setExplainPageOpen(false);
      setDocsOpen(false);
      setShortcutsOpen(false);
      setActiveContextualHelpId(null);

      if (
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement
      ) {
        returnFocusRef.current = document.activeElement;
      }

      if (moduleId !== activeModule) {
        onNavigateModule(moduleId);
      }

      const initialIndex = options.fromBeginning ? 0 : 0;
      prepareStep(steps[initialIndex], moduleId);

      setActiveTour({
        moduleId,
        steps,
        stepIndex: initialIndex,
      });
    },
    [activeModule, role, onNavigateModule, prepareStep],
  );

  const finishTour = useCallback(() => {
    setActiveTour((curr) => {
      if (!curr) return null;
      void mutateProgress({ completeTour: curr.moduleId });
      return null;
    });
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, [mutateProgress]);

  const skipTour = useCallback(() => {
    setActiveTour((curr) => {
      if (!curr) return null;
      void mutateProgress({ skipTour: curr.moduleId });
      return null;
    });
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, [mutateProgress]);

  const nextStep = useCallback(() => {
    setActiveTour((curr) => {
      if (!curr) return null;
      // Find the next step whose target is either non-optional or present,
      // or let the overlay resolve after preparing the step.
      for (let i = curr.stepIndex + 1; i < curr.steps.length; i += 1) {
        const candidate = curr.steps[i];
        const needsPrep =
          Boolean(candidate.prepareAction) ||
          (candidate.module && candidate.module !== activeModule);
        if (needsPrep || !candidate.optional) {
          prepareStep(candidate, curr.moduleId);
          return { ...curr, stepIndex: i };
        }
        if (findTourTargetElement(candidate.target)) {
          prepareStep(candidate, curr.moduleId);
          return { ...curr, stepIndex: i };
        }
      }
      // No more steps -> complete tour
      void mutateProgress({ completeTour: curr.moduleId });
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
      return null;
    });
  }, [activeModule, mutateProgress, prepareStep]);

  const prevStep = useCallback(() => {
    setActiveTour((curr) => {
      if (!curr || curr.stepIndex <= 0) return curr;
      for (let i = curr.stepIndex - 1; i >= 0; i -= 1) {
        const candidate = curr.steps[i];
        const needsPrep =
          Boolean(candidate.prepareAction) ||
          (candidate.module && candidate.module !== activeModule);
        if (needsPrep || !candidate.optional || findTourTargetElement(candidate.target)) {
          prepareStep(candidate, curr.moduleId);
          return { ...curr, stepIndex: i };
        }
      }
      return curr;
    });
  }, [activeModule, prepareStep]);

  const openDocs = useCallback(
    (topicId?: string | null) => {
      setHelpMenuOpen(false);
      setExplainPageOpen(false);
      setActiveContextualHelpId(null);
      const fallbackTopic =
        HELP_DOC_TOPICS.find((t) => t.module === activeModule)?.id ??
        HELP_DOC_TOPICS[0]?.id ??
        null;
      setActiveDocTopicId(topicId ?? fallbackTopic);
      setDocsOpen(true);
    },
    [activeModule],
  );

  const closeDocs = useCallback(() => {
    setDocsOpen(false);
  }, []);

  const resetModuleProgress = useCallback(
    async (moduleId: GuideModuleId) => {
      await mutateProgress({ resetTour: moduleId });
    },
    [mutateProgress],
  );

  const resetAllProgress = useCallback(async () => {
    const targetUserId = userId;
    const targetTenantId = effectiveTenantId ?? undefined;
    clearStoredGuideProgress(targetUserId, targetTenantId);
    const clean = createEmptyGuideProgress();
    setProgress(clean);
    if (!targetUserId) return;
    const expectedScope = `${effectiveTenantId ?? targetUserId}:${targetUserId}`;
    try {
      const remote = await api.resetGuideProgress();
      if (activeScopeRef.current === expectedScope) {
        const normalized = normalizeGuideProgress(remote);
        setProgress(normalized);
        writeStoredGuideProgress(targetUserId, normalized, targetTenantId);
      }
    } catch {
      // Offline resilient: already cleared locally
    }
  }, [userId, effectiveTenantId]);

  const dismissFirstVisitWelcome = useCallback(() => {
    void mutateProgress({ dismissPrompt: activeModule });
  }, [activeModule, mutateProgress]);

  const isTourCompleted = useCallback(
    (moduleId: GuideModuleId) => Boolean(progress.completedTours[moduleId]),
    [progress.completedTours],
  );

  const isTourSkipped = useCallback(
    (moduleId: GuideModuleId) => Boolean(progress.skippedTours[moduleId]),
    [progress.skippedTours],
  );

  const getContextualHelp = useCallback(
    (id: string) => CONTEXTUAL_HELP_ITEMS[id],
    [],
  );

  // Global Shift+? shortcut to open Help menu (ignoring text inputs/editors)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isEditable) return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setHelpMenuOpen((open) => !open);
      } else if (e.key === "Escape") {
        if (activeContextualHelpId) {
          setActiveContextualHelpId(null);
        } else if (helpMenuOpen) {
          setHelpMenuOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeContextualHelpId, helpMenuOpen]);

  const showFirstVisitWelcome = useMemo(() => {
    if (!userId || !isHydrated || activeTour) return false;
    return shouldShowFirstTimeWelcome(progress, activeModule);
  }, [userId, isHydrated, activeTour, progress, activeModule]);

  const currentTourConfig: ModuleTourConfig =
    MODULE_TOURS[activeModule] ?? MODULE_TOURS.overview;

  const contactSupport = useCallback(() => {
    setHelpMenuOpen(false);
    setExplainPageOpen(false);
    setDocsOpen(false);
    onContactSupport?.();
  }, [onContactSupport]);

  const value = useMemo<GuideContextValue>(
    () => ({
      userId,
      tenantId: effectiveTenantId,
      activeModule,
      role,
      progress,
      isHydrated,
      helpMenuOpen,
      setHelpMenuOpen,
      explainPageOpen,
      setExplainPageOpen,
      docsOpen,
      activeDocTopicId,
      openDocs,
      closeDocs,
      shortcutsOpen,
      setShortcutsOpen,
      activeContextualHelpId,
      setActiveContextualHelpId,
      getContextualHelp,
      activeTour,
      currentTourConfig,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      finishTour,
      isTourCompleted,
      isTourSkipped,
      showFirstVisitWelcome,
      dismissFirstVisitWelcome,
      resetModuleProgress,
      resetAllProgress,
      navigateToModule: onNavigateModule,
      canContactSupport: Boolean(onContactSupport),
      contactSupport,
      returnFocusRef,
    }),
    [
      userId,
      effectiveTenantId,
      activeModule,
      role,
      progress,
      isHydrated,
      helpMenuOpen,
      explainPageOpen,
      docsOpen,
      activeDocTopicId,
      openDocs,
      closeDocs,
      shortcutsOpen,
      activeContextualHelpId,
      getContextualHelp,
      activeTour,
      currentTourConfig,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      finishTour,
      isTourCompleted,
      isTourSkipped,
      showFirstVisitWelcome,
      dismissFirstVisitWelcome,
      resetModuleProgress,
      resetAllProgress,
      onNavigateModule,
      onContactSupport,
      contactSupport,
    ],
  );

  return (
    <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) {
    throw new Error("useGuide must be used within GuideProvider");
  }
  return ctx;
}

/**
 * Optional hook safe inside components that can also render outside the
 * authenticated shell (such as standalone demos or tests).
 */
export function useOptionalGuide(): GuideContextValue | null {
  return useContext(GuideContext);
}
