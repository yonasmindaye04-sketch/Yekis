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

export type GuideRole = "CLIENT" | "FREELANCER" | "BOTH";

export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
  id: string;
  /** CSS selector or ordered fallback selectors targeting `[data-tour="..."]`. */
  target: string | string[];
  title: string;
  description: string;
  whyItMatters?: string;
  placement?: TourPlacement;
  /** Restrict step visibility to specific marketplace roles. */
  roles?: GuideRole[];
  /** Optional target module to navigate into before resolving this step. */
  module?: GuideModuleId;
  /** Optional sub-view preparation key (e.g., switch dashboard sub-tab). */
  prepareAction?:
    | "dashboard-analytics"
    | "dashboard-table"
    | "dashboard-kanban"
    | "dashboard-calendar";
  /** Skip silently when the target is not currently mounted in the DOM. */
  optional?: boolean;
  /** Related help documentation topic id. */
  docTopicId?: string;
}

export interface ModuleTourConfig {
  id: GuideModuleId;
  title: string;
  shortLabel: string;
  summary: string;
  whenToUse: string;
  keyActions: string[];
  steps: TourStep[];
}

export interface ContextualHelpItem {
  id: string;
  module: GuideModuleId;
  featureName: string;
  whatItDoes: string;
  whyItIsUseful: string;
  docTopicId?: string;
}

export interface HelpDocTopic {
  id: string;
  module: GuideModuleId;
  title: string;
  category: string;
  summary: string;
  howItWorks: string[];
  tips: string[];
}

export interface KeyboardShortcutItem {
  id: string;
  keys: string[];
  description: string;
  scope: string;
}

export interface GuideProgressState {
  version: number;
  completedTours: Record<string, string>;
  skippedTours: Record<string, string>;
  dismissedPrompts: Record<string, boolean>;
  lastActiveStepByModule: Record<string, number>;
  updatedAt: string | null;
}

export interface GuideProgressMutation {
  completeTour?: GuideModuleId;
  skipTour?: GuideModuleId;
  resetTour?: GuideModuleId;
  resetAll?: boolean;
  dismissPrompt?: string;
  lastStep?: { module: GuideModuleId; stepIndex: number };
}
