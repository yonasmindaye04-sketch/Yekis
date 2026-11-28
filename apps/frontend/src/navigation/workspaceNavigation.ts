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
