import type { GuideModuleId } from "../components/guide/guideTypes";

export type WorkspaceView =
  | "overview"
  | "jobs"
  | "proposals"
  | "gigs"
  | "my-gigs"
  | "contracts"
  | "escrow"
  | "wallet"
  | "chat"
  | "verification"
  | "cases"
  | "settings"
  | "profile"
  | "profile-edit";

export type JobsTabKey = "jobs" | "proposals";

export type ContractsTabKey = "overview" | "payments" | "disputes";

export interface ResolvedViewNavigation {
  view: WorkspaceView;
  jobsTab?: JobsTabKey;
  contractsTab?: ContractsTabKey;
}

/**
 * Option B mobile bottom bar: Home, Jobs, Contracts, Wallet, Messages.
 * Secondary destinations (Services, Profile, Identity verification, Settings)
 * remain reachable from the 360px header menu button and avatar menu.
 */
export const MOBILE_BOTTOM_NAV_VIEWS: readonly WorkspaceView[] = [
  "overview",
  "jobs",
  "contracts",
  "wallet",
  "chat",
];

/**
 * Resolves the initial tab selection for consolidated Jobs and Contracts shells.
 */
export function getTabSelectionForView(view: WorkspaceView): {
  jobsTab?: JobsTabKey;
  contractsTab?: ContractsTabKey;
} {
  if (view === "proposals") return { jobsTab: "proposals" };
  if (view === "jobs") return { jobsTab: "jobs" };
  if (view === "escrow") return { contractsTab: "payments" };
  if (view === "cases") return { contractsTab: "disputes" };
  if (view === "contracts") return { contractsTab: "overview" };
  return {};
}

/**
 * Maps legacy or direct View keys into the consolidated primary shell views + sub-tabs
 * while preserving full deep-link compatibility for notifications, Command Palette, and tours.
 */
export function resolveViewAlias(requested: WorkspaceView): ResolvedViewNavigation {
  if (requested === "proposals") {
    return { view: "jobs", jobsTab: "proposals" };
  }
  if (requested === "jobs") {
    return { view: "jobs", jobsTab: "jobs" };
  }
  if (requested === "escrow") {
    return { view: "contracts", contractsTab: "payments" };
  }
  if (requested === "cases") {
    return { view: "contracts", contractsTab: "disputes" };
  }
  if (requested === "contracts") {
    return { view: "contracts", contractsTab: "overview" };
  }
  return { view: requested };
}

/**
 * Returns the notification routing keys considered "viewed" for the current view/sub-tab state.
 */
export function getNotificationReadViews(state: {
  view: WorkspaceView;
  jobsTab: JobsTabKey;
  contractsTab: ContractsTabKey;
}): WorkspaceView[] {
  if (state.view === "proposals") return ["proposals"];
  if (state.view === "jobs") {
    return [state.jobsTab === "proposals" ? "proposals" : "jobs"];
  }
  if (state.view === "escrow") return ["escrow"];
  if (state.view === "cases") return ["cases"];
  if (state.view === "contracts") {
    if (state.contractsTab === "payments") return ["escrow"];
    if (state.contractsTab === "disputes") return ["cases"];
    return ["contracts"];
  }
  return [state.view];
}

/**
 * Computes the active 12-module Yekis Guide tour ID from the current shell view and sub-tabs.
 */
export function getActiveGuideModule(state: {
  view: WorkspaceView;
  jobsTab: JobsTabKey;
  contractsTab: ContractsTabKey;
}): GuideModuleId {
  if (state.view === "my-gigs") return "gigs";
  if (state.view === "profile-edit") return "profile";
  if (state.view === "jobs" && state.jobsTab === "proposals") return "proposals";
  if (state.view === "contracts" && state.contractsTab === "payments") return "escrow";
  if (state.view === "contracts" && state.contractsTab === "disputes") return "cases";
  return state.view as GuideModuleId;
}

/**
 * Returns the sidebar / drawer views visible for the current role and viewport.
 * Desktop Client sidebar shows 6 core items; Account links move into the avatar menu
 * on desktop while staying available inside the 360px header menu drawer on mobile.
 */
export function getSidebarVisibleViews(options: {
  canWork: boolean;
  isStaff: boolean;
  isMobileViewport: boolean;
}): WorkspaceView[] {
  const core: WorkspaceView[] = [
    "overview",
    "jobs",
    "gigs",
    ...(options.canWork ? (["my-gigs"] as const) : []),
    "contracts",
    "wallet",
    "chat",
  ];
  if (!options.isMobileViewport) {
    return core;
  }
  return [
    ...core,
    "profile",
    ...(options.isStaff ? ([] as const) : (["verification"] as const)),
    "settings",
  ];
}

/**
 * Account destinations grouped inside the topbar avatar dropdown menu.
 */
export function getAvatarMenuViews(isStaff: boolean): WorkspaceView[] {
  return isStaff
    ? ["profile", "settings"]
    : ["profile", "verification", "settings"];
}

/**
 * Aggregates unread activity counts across consolidated sidebar/bottom nav items.
 */
export function getAggregatedNavBadgeCount(
  tabView: string,
  params: {
    newBriefsCount: number;
    unreadByView: Record<string, number>;
  },
): number {
  const { newBriefsCount, unreadByView } = params;
  if (tabView === "jobs") {
    return newBriefsCount + (unreadByView.jobs ?? 0) + (unreadByView.proposals ?? 0);
  }
  if (tabView === "contracts") {
    return (
      (unreadByView.contracts ?? 0) +
      (unreadByView.escrow ?? 0) +
      (unreadByView.cases ?? 0)
    );
  }
  return unreadByView[tabView] ?? 0;
}
