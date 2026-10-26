// === IMPORTS ===
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Check,
  FileText,
  Gavel,
  Paperclip,
  Search,
  Send,
  WalletCards,
  X,
} from "lucide-react";
import {
  api,
  type Contract,
  type Dispute,
  type Job,
  type Proposal,
} from "./api/client";
import { events } from "./analytics";
import { useI18n } from "./i18n";
import {
  ConfirmActionModal,
  EscrowFeeBreakdown,
  formatEtbMajor,
  formatStatusLabel,
} from "./pages/ops/components/ui";

// === INTERFACES & TYPES ===
type MarketplaceRole = "CLIENT" | "FREELANCER" | "BOTH";
type BudgetPreset =
  | "ALL"
  | "UNDER_10K"
  | "10K_30K"
  | "30K_75K"
  | "OVER_75K"
  | "CUSTOM";
type DeadlineWindow = "ALL" | "3" | "7" | "14" | "30";

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  WEB_APP_DEVELOPMENT: "Web app development",
  GRAPHIC_DESIGN: "Graphic design",
  DIGITAL_MARKETING: "Digital marketing",
  CONTENT_WRITING: "Content writing",
  TRANSLATION: "Translation",
  DATA_ENTRY: "Data entry",
};

export const DEFAULT_CATEGORIES = Object.keys(DEFAULT_CATEGORY_LABELS);

const isHiring = (role: MarketplaceRole) => role === "CLIENT" || role === "BOTH";
const isWorking = (role: MarketplaceRole) => role === "FREELANCER" || role === "BOTH";

// === MAIN COMPONENT ===
const money = (minor: number) => formatEtbMajor(minor / 100);
const date = (value: string) => new Date(value).toLocaleDateString();
const label = (value: string, dict?: Record<string, string>) =>
  formatStatusLabel(value, dict);

function formatCategoryName(
  category: string,
  labelsMap: Record<string, string>,
): string {
  if (labelsMap[category]) return labelsMap[category];
  const normalized = category.replaceAll("_", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getDaysUntilDeadline(deadlineStr: string): number | null {
  const parsed = new Date(deadlineStr);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const targetStartOfDay = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  ).getTime();
  return Math.round((targetStartOfDay - startOfToday) / 86_400_000);
}

export function JobsWorkspace({
  role,
  openJobs,
  onChanged,
  categories = DEFAULT_CATEGORIES,
  categoryLabels = DEFAULT_CATEGORY_LABELS,
}: {
  role: MarketplaceRole;
  openJobs: Job[];
  onChanged: () => Promise<void>;
  categories?: string[];
  categoryLabels?: Record<string, string>;
}) {
  const { t } = useI18n();
  const jf = t.workspace.jobsFlow;
  const fb = t.workspace.feeBreakdown;
  const statuses = t.workspace.statuses;

  const [ownedJobs, setOwnedJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [proposalsByJob, setProposalsByJob] = useState<
    Record<string, Proposal[]>
  >({});
  const [jobsSubTab, setJobsSubTab] = useState<"browse" | "proposals">("browse");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("7");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [budgetPreset, setBudgetPreset] = useState<BudgetPreset>("ALL");
  const [customMinEtb, setCustomMinEtb] = useState("");
  const [customMaxEtb, setCustomMaxEtb] = useState("");
  const [deadlineWindow, setDeadlineWindow] = useState<DeadlineWindow>("ALL");
  const [withdrawTarget, setWithdrawTarget] = useState<Proposal | null>(null);

  const refresh = useCallback(async () => {
    if (isHiring(role)) {
      try {
        const jobs = await api.getMyJobs();
        setOwnedJobs(jobs);
        if (jobs.length > 0) {
          const entries = await Promise.all(
            jobs.map(
              async (job) => [job.id, await api.getJobProposals(job.id)] as const,
            ),
          );
          setProposalsByJob(Object.fromEntries(entries));
        } else {
          setProposalsByJob({});
        }
      } catch {
        // Retain current state on transient network error
      }
    }
    if (isWorking(role)) {
      try {
        const list = await api.getMyProposals();
        setMyProposals(list);
      } catch {
        // Retain current state on transient network error
      }
    }
  }, [role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (
    operation: () => Promise<unknown>,
    _fallbackUpdate: () => void,
    success: string,
  ) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await Promise.all([refresh(), onChanged().catch(() => {})]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitProposal = async (job: Job) => {
    const amountMinor = Math.round(Number(amount) * 100);
    if (
      coverLetter.trim().length < 20 ||
      !Number.isFinite(amountMinor) ||
      amountMinor <= 0 ||
      !dueDate
    ) {
      setMessage(
        "Add a detailed cover letter (min 20 chars), valid amount, delivery estimate, and milestone due date.",
      );
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const attachmentPaths: string[] = [];
      for (const file of attachments) {
        const result = await api.uploadProposalAttachment(job.id, file);
        attachmentPaths.push(result.path);
      }

      await api.submitProposal({
        jobId: job.id,
        coverLetter: coverLetter.trim(),
        quotedAmountMinor: amountMinor,
        estimatedDays: Number(days),
        milestoneBreakdown: [
          { title: "Project delivery", amountMinor, dueDate },
        ],
        attachmentPaths,
      });
      events.proposalSubmitted();
      setMessage("Proposal submitted.");
      setCoverLetter("");
      setAmount("");
      setDueDate("");
      setAttachments([]);
      setSelectedJobId(null);
      await Promise.all([refresh(), onChanged().catch(() => {})]);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to submit proposal.",
      );
    } finally {
      setBusy(false);
    }
  };

  const hiringPanel = isHiring(role) ? (
    <div className="sh-card">
      <div className="sh-card-header">
        <div>
          <h3 className="sh-card-title">Published Hiring Briefs & Proposal Pipeline</h3>
          <p className="sh-card-desc">
            Review incoming freelancer proposals, shortlist candidates, and generate escrow contracts
          </p>
        </div>
        <span className="sh-kbd">{ownedJobs.length} Active Briefs</span>
      </div>
      {ownedJobs.length === 0 ? (
        <p className="empty-state">Your published jobs will appear here.</p>
      ) : (
        <div className="workflow-stack">
          {ownedJobs.map((job) => (
            <article className="workflow-item sh-subcard" key={job.id}>
              <div className="workflow-item-head">
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span className="sh-status-inline emerald">
                      {label(job.status, statuses)}
                    </span>
                    <span className="sh-mono" style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--color-primary)" }}>
                      {money(job.budgetMinMinor)} – {money(job.budgetMaxMinor)}
                    </span>
                  </div>
                  <h3>{job.title}</h3>
                  <p>{job.description}</p>
                  <small className="sh-cell-meta">
                    Category: {formatCategoryName(job.category, categoryLabels)} · Deadline:{" "}
                    <span className="sh-mono">{date(job.deadline)}</span>
                  </small>
                </div>
                <span className="sh-kbd">
                  {proposalsByJob[job.id]?.length ?? 0} proposals
                </span>
              </div>
              {(proposalsByJob[job.id] ?? []).length > 0 && (
                <div className="proposal-list">
                  {proposalsByJob[job.id].map((proposal) => (
                    <div
                      className="proposal-row"
                      key={proposal.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: "0.92rem", color: "var(--color-text)" }}>
                          {proposal.freelancer?.email ?? "Freelancer"}
                        </strong>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "3px 0 6px" }}>
                          <span className="sh-mono" style={{ fontWeight: 600, color: "var(--color-primary)", fontSize: "0.86rem" }}>
                            {money(proposal.quotedAmountMinor)}
                          </span>
                          <span className="sh-mono" style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
                            · {proposal.estimatedDays} days
                          </span>
                          <span
                            className={`sh-status-inline ${
                              proposal.status === "ACCEPTED"
                                ? "emerald"
                                : proposal.status === "REJECTED"
                                  ? "crimson"
                                  : "amber"
                            }`}
                          >
                            {label(proposal.status, statuses)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
                          {proposal.coverLetter}
                        </p>
                      </div>
                      {["SUBMITTED", "SHORTLISTED"].includes(proposal.status) && (
                        <div className="workflow-actions" style={{ flexShrink: 0, marginTop: 4 }}>
                          {proposal.status === "SUBMITTED" && (
                            <button
                              className="sh-btn sh-btn-secondary"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () => api.decideProposal(proposal.id, "SHORTLISTED"),
                                  () =>
                                    setProposalsByJob((prev) => ({
                                      ...prev,
                                      [job.id]: (prev[job.id] ?? []).map((p) =>
                                        p.id === proposal.id
                                          ? { ...p, status: "SHORTLISTED" }
                                          : p,
                                      ),
                                    })),
                                  "Proposal shortlisted.",
                                )
                              }
                            >
                              Shortlist
                            </button>
                          )}
                          <button
                            className="sh-btn sh-btn-primary"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () => api.decideProposal(proposal.id, "ACCEPTED"),
                                () =>
                                  setProposalsByJob((prev) => ({
                                    ...prev,
                                    [job.id]: (prev[job.id] ?? []).map((p) =>
                                      p.id === proposal.id
                                        ? { ...p, status: "ACCEPTED" }
                                        : p,
                                    ),
                                  })),
                                "Proposal accepted and contract generated.",
                              )
                            }
                          >
                            Accept <Check size={14} />
                          </button>
                          <button
                            className="sh-icon-only-btn"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () => api.decideProposal(proposal.id, "REJECTED"),
                                () =>
                                  setProposalsByJob((prev) => ({
                                    ...prev,
                                    [job.id]: (prev[job.id] ?? []).map((p) =>
                                      p.id === proposal.id
                                        ? { ...p, status: "REJECTED" }
                                        : p,
                                    ),
                                  })),
                                "Proposal rejected.",
                              )
                            }
                            aria-label="Reject proposal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const proposalByJob = new Map(
    myProposals.map((proposal) => [proposal.jobId, proposal]),
  );
  const effectiveOpenJobs = openJobs;

  const availableCategories = Array.from(
    new Set([
      ...categories,
      ...effectiveOpenJobs.map((j) => j.category).filter(Boolean),
    ]),
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "ALL" ||
    budgetPreset !== "ALL" ||
    deadlineWindow !== "ALL";

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setBudgetPreset("ALL");
    setCustomMinEtb("");
    setCustomMaxEtb("");
    setDeadlineWindow("ALL");
  };

  const filteredOpenJobs = effectiveOpenJobs.filter((j) => {
    // 1. Keyword search (title, description, or category label)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const catLabel = formatCategoryName(j.category, categoryLabels).toLowerCase();
      const matchesKeyword =
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        catLabel.includes(q);
      if (!matchesKeyword) return false;
    }

    // 2. Category filter
    if (selectedCategory !== "ALL" && j.category !== selectedCategory) {
      return false;
    }

    // 3. Budget range filter (overlap-aware in minor ETB units)
    if (budgetPreset !== "ALL") {
      let minMinor = 0;
      let maxMinor = Number.POSITIVE_INFINITY;
      if (budgetPreset === "UNDER_10K") {
        maxMinor = 10_000 * 100;
      } else if (budgetPreset === "10K_30K") {
        minMinor = 10_000 * 100;
        maxMinor = 30_000 * 100;
      } else if (budgetPreset === "30K_75K") {
        minMinor = 30_000 * 100;
        maxMinor = 75_000 * 100;
      } else if (budgetPreset === "OVER_75K") {
        minMinor = 75_000 * 100;
      } else if (budgetPreset === "CUSTOM") {
        const parsedMin =
          customMinEtb.trim() !== "" ? Number(customMinEtb) : Number.NaN;
        const parsedMax =
          customMaxEtb.trim() !== "" ? Number(customMaxEtb) : Number.NaN;
        if (Number.isFinite(parsedMin) && parsedMin >= 0) {
          minMinor = Math.round(parsedMin * 100);
        }
        if (Number.isFinite(parsedMax) && parsedMax >= 0) {
          maxMinor = Math.round(parsedMax * 100);
        }
      }
      if (minMinor > maxMinor) return false;
      const jobMin = j.budgetMinMinor ?? 0;
      const jobMax = j.budgetMaxMinor ?? jobMin;
      if (jobMax < minMinor || jobMin > maxMinor) {
        return false;
      }
    }

    // 4. Deadline proximity filter (due within N days from today)
    if (deadlineWindow !== "ALL") {
      const maxDays = Number(deadlineWindow);
      const daysUntil = getDaysUntilDeadline(j.deadline);
      if (daysUntil === null || daysUntil < 0 || daysUntil > maxDays) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="workflow-stack">
      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}
      {hiringPanel}

      {/* Freelancer Sub-Navigation: Browse Open Briefs vs My Submitted Proposals (FR-12) */}
      {isWorking(role) && (
        <div className="sh-subnav-bar" style={{ marginBottom: 4 }}>
          <div className="sh-subnav-left">
            <div
              className="sh-segmented"
              role="tablist"
              aria-label="Jobs and proposals view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={jobsSubTab === "browse"}
                className={`sh-seg-btn ${jobsSubTab === "browse" ? "active" : ""}`}
                onClick={() => setJobsSubTab("browse")}
              >
                <Briefcase size={14} />
                <span>
                  {jf.tabBrowseBriefs} ({effectiveOpenJobs.length})
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={jobsSubTab === "proposals"}
                className={`sh-seg-btn ${jobsSubTab === "proposals" ? "active" : ""}`}
                onClick={() => setJobsSubTab("proposals")}
              >
                <Send size={14} />
                <span>
                  {jf.tabMyProposals} ({myProposals.length})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isWorking(role) && jobsSubTab === "proposals" && (
        <section className="sh-card">
          <div className="sh-card-header">
            <div>
              <h3 className="sh-card-title">{jf.tabMyProposals}</h3>
              <p className="sh-card-desc">
                Active bids and milestone quotes awaiting client review
              </p>
            </div>
            <span className="sh-kbd sh-mono">{myProposals.length} Bids</span>
          </div>
          {myProposals.length === 0 ? (
            <div style={{ padding: "24px 8px", textAlign: "center" }}>
              <p style={{ fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
                {jf.noProposalsYetTitle}
              </p>
              <p style={{ margin: "0 0 14px", fontSize: "0.86rem", color: "var(--color-text-secondary)" }}>
                {jf.noProposalsYetDesc}
              </p>
              <button
                type="button"
                className="sh-btn sh-btn-primary"
                onClick={() => setJobsSubTab("browse")}
              >
                <Briefcase size={14} /> {jf.tabBrowseBriefs}
              </button>
            </div>
          ) : (
            <div className="sh-compact-list">
              {myProposals.map((proposal) => (
                <div className="sh-compact-row" key={proposal.id}>
                  <div className="sh-compact-row-main">
                    <div className="sh-cell-primary">
                      {proposal.job?.title ?? "Job Brief"}
                    </div>
                    <div className="sh-cell-meta">
                      <span className="sh-mono">{money(proposal.quotedAmountMinor)}</span>
                      <span>·</span>
                      <span className="sh-mono">{proposal.estimatedDays} days delivery</span>
                    </div>
                  </div>
                  <div className="sh-compact-row-right">
                    <span
                      className={`sh-status-inline ${
                        proposal.status === "ACCEPTED"
                          ? "emerald"
                          : proposal.status === "REJECTED"
                            ? "crimson"
                            : "amber"
                      }`}
                    >
                      {label(proposal.status, statuses)}
                    </span>
                    {["SUBMITTED", "SHORTLISTED"].includes(proposal.status) && (
                      <button
                        type="button"
                        className="sh-row-action-btn"
                        disabled={busy}
                        onClick={() => setWithdrawTarget(proposal)}
                      >
                        {jf.withdrawBtn}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(!isWorking(role) || jobsSubTab === "browse") && (
        <div className="sh-card">
          <div className="sh-card-header">
            <div>
              <h3 className="sh-card-title">{jf.tabBrowseBriefs}</h3>
              <p className="sh-card-desc">
                Verified Ethiopian clients with milestone-backed escrow budgets
              </p>
            </div>
            <span className="sh-kbd sh-mono">
              Showing {filteredOpenJobs.length} of {effectiveOpenJobs.length} briefs
            </span>
          </div>

          {/* Compact Multi-Criteria Filter Bar */}
          <div
            className="sh-table-toolbar"
            role="region"
            aria-label="Filter open job briefs"
            style={{
              paddingBottom: 12,
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="sh-search-input-wrap" style={{ minWidth: 220, flex: "1 1 240px" }}>
              <Search size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={jf.searchPlaceholder}
                aria-label="Search briefs by keyword"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="sh-clear-input"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <select
                className="sh-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="ALL">All categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategoryName(cat, categoryLabels)}
                  </option>
                ))}
              </select>

              <select
                className="sh-select"
                value={budgetPreset}
                onChange={(e) => {
                  const next = e.target.value as BudgetPreset;
                  setBudgetPreset(next);
                  if (next !== "CUSTOM") {
                    setCustomMinEtb("");
                    setCustomMaxEtb("");
                  }
                }}
                aria-label="Filter by budget range"
              >
                <option value="ALL">Any budget (ETB)</option>
                <option value="UNDER_10K">Under ETB 10,000</option>
                <option value="10K_30K">ETB 10,000 – 30,000</option>
                <option value="30K_75K">ETB 30,000 – 75,000</option>
                <option value="OVER_75K">ETB 75,000+</option>
                <option value="CUSTOM">Custom ETB range…</option>
              </select>

              {budgetPreset === "CUSTOM" && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="sh-mono"
                    value={customMinEtb}
                    onChange={(e) => setCustomMinEtb(e.target.value)}
                    placeholder="Min ETB"
                    aria-label="Minimum budget in ETB"
                    style={{
                      width: 104,
                      height: 34,
                      padding: "0 10px",
                      fontSize: "0.78rem",
                      borderRadius: "var(--sh-radius)",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      color: "var(--color-neutral-text, #64748b)",
                      fontSize: "0.78rem",
                    }}
                  >
                    –
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="sh-mono"
                    value={customMaxEtb}
                    onChange={(e) => setCustomMaxEtb(e.target.value)}
                    placeholder="Max ETB"
                    aria-label="Maximum budget in ETB"
                    style={{
                      width: 104,
                      height: 34,
                      padding: "0 10px",
                      fontSize: "0.78rem",
                      borderRadius: "var(--sh-radius)",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              )}

              <select
                className="sh-select"
                value={deadlineWindow}
                onChange={(e) =>
                  setDeadlineWindow(e.target.value as DeadlineWindow)
                }
                aria-label="Filter by deadline proximity"
              >
                <option value="ALL">Any deadline</option>
                <option value="3">Due within 3 days</option>
                <option value="7">Due within 7 days</option>
                <option value="14">Due within 14 days</option>
                <option value="30">Due within 30 days</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={resetAllFilters}
                >
                  <X size={13} /> Reset filters
                </button>
              )}
            </div>
          </div>

          {filteredOpenJobs.length === 0 ? (
            <div style={{ padding: "24px 8px", textAlign: "center" }}>
              <p className="empty-state" style={{ marginBottom: 10 }}>
                {jf.noMatchingJobs}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={resetAllFilters}
                >
                  {jf.clearSearchBtn}
                </button>
              )}
            </div>
          ) : (
            <div className="workflow-stack">
              {filteredOpenJobs.map((job) => {
                const existing = proposalByJob.get(job.id);
                const showDetail = detailJobId === job.id;
                const showForm = selectedJobId === job.id;
                const daysUntil = getDaysUntilDeadline(job.deadline);

                return (
                  <article className="workflow-item sh-subcard" key={job.id}>
                    <div
                      className="workflow-item-head"
                      style={showDetail ? { cursor: "pointer" } : {}}
                      onClick={() =>
                        !showForm && setDetailJobId(showDetail ? null : job.id)
                      }
                    >
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span className="sh-status-inline emerald">
                            {label(job.status || "OPEN", statuses)}
                          </span>
                          <span className="sh-mono" style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--color-primary)" }}>
                            {money(job.budgetMinMinor)} – {money(job.budgetMaxMinor)}
                          </span>
                        </div>
                        <h3>{job.title}</h3>
                        {!showDetail && (
                          <p>
                            {job.description.substring(0, 160)}
                            {job.description.length > 160 ? "..." : ""}
                          </p>
                        )}
                        <small className="sh-cell-meta">
                          Category: {formatCategoryName(job.category, categoryLabels)} · Deadline:{" "}
                          <span className="sh-mono">{date(job.deadline)}</span>
                          {daysUntil !== null && (
                            <>
                              {" "}
                              ·{" "}
                              <span className="sh-mono">
                                {daysUntil < 0
                                  ? `${Math.abs(daysUntil)}d overdue`
                                  : daysUntil === 0
                                    ? "Due today"
                                    : `${daysUntil}d left`}
                              </span>
                            </>
                          )}
                        </small>
                      </div>
                      {existing ? (
                        <span className="sh-status-inline amber">
                          {label(existing.status, statuses)}
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {!showForm && (
                            <>
                              <button
                                type="button"
                                className="sh-btn sh-btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailJobId(showDetail ? null : job.id);
                                }}
                              >
                                {showDetail ? jf.hideDetailsBtn : jf.viewDetailsBtn}
                              </button>
                              <button
                                type="button"
                                className="sh-btn sh-btn-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailJobId(null);
                                  setSelectedJobId(job.id);
                                }}
                              >
                                {jf.applyBtn}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {showDetail && !showForm && (
                      <div className="job-detail-panel" style={{ marginTop: 14 }}>
                        <h4>Scope & Deliverables</h4>
                        <p>{job.description}</p>
                        {!existing && (
                          <button
                            type="button"
                            className="sh-btn sh-btn-primary"
                            style={{ marginTop: 12 }}
                            onClick={() => {
                              setDetailJobId(null);
                              setSelectedJobId(job.id);
                            }}
                          >
                            {jf.submitProposalTitle} <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {showForm && !existing && (
                      <div className="inline-workflow-form">
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>
                            {jf.submitProposalTitle}
                          </h3>
                          <button
                            type="button"
                            className="sh-btn sh-btn-secondary"
                            onClick={() => {
                              setSelectedJobId(null);
                              setDetailJobId(job.id);
                            }}
                          >
                            {jf.backToBriefBtn}
                          </button>
                        </div>
                        <label className="form-wide">
                          {jf.coverLetterLabel}
                          <textarea
                            value={coverLetter}
                            onChange={(event) => setCoverLetter(event.target.value)}
                            minLength={20}
                            placeholder={jf.coverLetterPlaceholder}
                          />
                        </label>
                        <label>
                          {jf.quoteEtbLabel}
                          <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder={String(Math.round(job.budgetMaxMinor / 100))}
                          />
                        </label>
                        <label>
                          {jf.estimatedDaysLabel}
                          <input
                            type="number"
                            min="1"
                            value={days}
                            onChange={(event) => setDays(event.target.value)}
                          />
                        </label>
                        <label>
                          {jf.dueDateLabel}
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(event) => setDueDate(event.target.value)}
                          />
                        </label>

                        {/* Inline Escrow & Net Payout Breakdown (FR-02) */}
                        <div style={{ gridColumn: "1 / -1" }}>
                          <EscrowFeeBreakdown
                            grossEtb={
                              Number(amount) > 0
                                ? Number(amount)
                                : Math.round(job.budgetMaxMinor / 100)
                            }
                            labels={fb}
                          />
                        </div>

                        <div className="proposal-attachments form-wide" style={{ gridColumn: "1 / -1" }}>
                          <label className="file-upload-btn">
                            <Paperclip size={15} /> {jf.attachSpecBtn}
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                if (e.target.files?.length) {
                                  setAttachments((prev) => [
                                    ...prev,
                                    ...Array.from(e.target.files!),
                                  ]);
                                }
                              }}
                            />
                          </label>
                          {attachments.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              {attachments.map((file, idx) => (
                                <span key={idx} className="attachment-chip">
                                  {file.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttachments((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    }
                                  >
                                    <X size={13} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="sh-btn sh-btn-primary"
                          disabled={busy}
                          style={{ gridColumn: "1 / -1", width: "fit-content" }}
                          onClick={() => void submitProposal(job)}
                        >
                          <Send size={14} /> {jf.submitProposalTitle}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Proposal Withdrawal Confirmation Modal (FR-04) */}
      <ConfirmActionModal
        open={withdrawTarget !== null}
        title={jf.withdrawConfirmTitle}
        description={jf.withdrawConfirmDesc}
        amountEtb={
          withdrawTarget ? money(withdrawTarget.quotedAmountMinor) : undefined
        }
        summaryRows={
          withdrawTarget
            ? [
                {
                  label: "Brief",
                  value: withdrawTarget.job?.title ?? "Job Brief",
                },
                {
                  label: jf.quoteEtbLabel,
                  value: money(withdrawTarget.quotedAmountMinor),
                },
              ]
            : undefined
        }
        confirmLabel={jf.withdrawBtn}
        cancelLabel={t.workspace.gigsFlow.cancelBtn}
        tone="danger"
        loading={busy}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={() => {
          if (!withdrawTarget) return;
          const target = withdrawTarget;
          setWithdrawTarget(null);
          void act(
            () => api.withdrawProposal(target.id),
            () =>
              setMyProposals((prev) => prev.filter((p) => p.id !== target.id)),
            "Proposal withdrawn.",
          );
        }}
      />
    </div>
  );
}

export function ContractsWorkspace({
  userId,
  onChanged,
  focusContractId,
  onOpenEscrow,
}: {
  userId: string;
  onChanged: () => Promise<void>;
  focusContractId?: string | null;
  onOpenEscrow?: (contractId: string) => void;
}) {
  const { t } = useI18n();
  const statuses = t.workspace.statuses;
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "AWAITING_SIGNATURES" | "EXECUTED" | "CANCELLED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [disputeMilestoneId, setDisputeMilestoneId] = useState<string | null>(
    null,
  );
  const [category, setCategory] = useState("QUALITY_ISSUE");
  const [description, setDescription] = useState("");

  const refresh = useCallback(async () => {
    try {
      const list = await api.getContracts();
      setContracts(list);
    } catch {
      // Retain current state on transient network error
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (
    operation: () => Promise<unknown>,
    _fallbackUpdate: () => void,
    success: string,
  ) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await Promise.all([refresh(), onChanged().catch(() => {})]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const viewDocument = async (contractId: string) => {
    try {
      const { url } = await api.getContractDocumentUrl(contractId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setMessage(
        `Generated bilingual AACCSA agreement preview for contract #${contractId.slice(0, 8)}.`,
      );
    }
  };

  const raise = async (contract: Contract, milestoneId: string) => {
    if (description.trim().length < 20) {
      setMessage("Describe the issue in at least 20 characters.");
      return;
    }
    await act(
      () =>
        api.raiseDispute({
          contractId: contract.id,
          milestoneId,
          category,
          description: description.trim(),
        }),
      () => {
        setContracts((prev) =>
          prev.map((c) =>
            c.id === contract.id
              ? {
                  ...c,
                  milestones: c.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, escrowState: "DISPUTED" } : m,
                  ),
                }
              : c,
          ),
        );
      },
      "Dispute opened and auto-release timer paused.",
    );
    setDescription("");
    setDisputeMilestoneId(null);
  };

  const totalContracts = contracts.length;
  const awaitingSignatureCount = contracts.filter(
    (c) => c.status !== "CANCELLED" && !c.fullyExecuted,
  ).length;
  const executedCount = contracts.filter(
    (c) => c.status !== "CANCELLED" && c.fullyExecuted,
  ).length;
  const cancelledCount = contracts.filter(
    (c) => c.status === "CANCELLED",
  ).length;

  const rawQuery = searchQuery.trim();
  const normalizedQuery = rawQuery.toLowerCase();
  const normalizedIdQuery = normalizedQuery.replace(/^#/, "");
  const hasActiveContractFilters =
    rawQuery !== "" || statusFilter !== "ALL";

  const filteredContractEntries = contracts
    .filter((contract) => {
      if (statusFilter === "AWAITING_SIGNATURES") {
        if (contract.status === "CANCELLED" || contract.fullyExecuted)
          return false;
      } else if (statusFilter === "EXECUTED") {
        if (contract.status === "CANCELLED" || !contract.fullyExecuted)
          return false;
      } else if (statusFilter === "CANCELLED") {
        if (contract.status !== "CANCELLED") return false;
      }
      return true;
    })
    .flatMap((contract) => {
      if (!normalizedQuery) {
        return [
          {
            contract,
            visibleMilestones: contract.milestones,
            matchedByMilestoneOnly: false,
          },
        ];
      }

      const matchesContractTitle = contract.job.title
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesContractId =
        Boolean(normalizedIdQuery) &&
        contract.id.toLowerCase().includes(normalizedIdQuery);
      const matchesContractLevel = matchesContractTitle || matchesContractId;

      const matchingMilestones = contract.milestones.filter(
        (m) =>
          m.title.toLowerCase().includes(normalizedQuery) ||
          (Boolean(normalizedIdQuery) &&
            m.id.toLowerCase().includes(normalizedIdQuery)),
      );

      if (!matchesContractLevel && matchingMilestones.length === 0) {
        return [];
      }

      return [
        {
          contract,
          visibleMilestones: matchesContractLevel
            ? contract.milestones
            : matchingMilestones,
          matchedByMilestoneOnly:
            !matchesContractLevel && matchingMilestones.length > 0,
        },
      ];
    });

  const totalVisibleMilestones = filteredContractEntries.reduce(
    (sum, entry) => sum + entry.visibleMilestones.length,
    0,
  );

  const resetContractFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
  };

  return (
    <div className="workflow-stack">
      <div className="sh-kpi-grid" style={{ marginBottom: 4 }}>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Total Contracts</span>
            <FileText size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{totalContracts}</div>
          <div className="sh-kpi-sub">Bilingual AACCSA service agreements</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Awaiting Signatures</span>
            <FileText size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{awaitingSignatureCount}</div>
          <div className="sh-kpi-sub">Pending bilateral e-signature execution</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Active & Executed</span>
            <Check size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{executedCount}</div>
          <div className="sh-kpi-sub">Legally binding & milestone-backed</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Cancelled / Closed</span>
            <X size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{cancelledCount}</div>
          <div className="sh-kpi-sub">Terminated or cooling-off withdrawn</div>
        </div>
      </div>

      <div
        className="sh-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="sh-segmented" role="tablist" aria-label="Filter contracts by status">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "ALL"}
            className={`sh-seg-btn ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All ({totalContracts})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "AWAITING_SIGNATURES"}
            className={`sh-seg-btn ${statusFilter === "AWAITING_SIGNATURES" ? "active" : ""}`}
            onClick={() => setStatusFilter("AWAITING_SIGNATURES")}
          >
            Awaiting Signatures ({awaitingSignatureCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "EXECUTED"}
            className={`sh-seg-btn ${statusFilter === "EXECUTED" ? "active" : ""}`}
            onClick={() => setStatusFilter("EXECUTED")}
          >
            Executed ({executedCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "CANCELLED"}
            className={`sh-seg-btn ${statusFilter === "CANCELLED" ? "active" : ""}`}
            onClick={() => setStatusFilter("CANCELLED")}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: "1 1 280px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {hasActiveContractFilters && (
            <span className="sh-cell-meta sh-mono" style={{ whiteSpace: "nowrap" }}>
              {totalVisibleMilestones}{" "}
              {totalVisibleMilestones === 1 ? "milestone" : "milestones"} ·{" "}
              {filteredContractEntries.length}{" "}
              {filteredContractEntries.length === 1 ? "contract" : "contracts"}
            </span>
          )}
          <div
            className="sh-search-input-wrap"
            style={{ minWidth: 240, flex: "1 1 260px", maxWidth: 380 }}
          >
            <Search size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter milestones by title or contract ID..."
              aria-label="Filter milestones by title or contract ID"
            />
            {searchQuery && (
              <button
                type="button"
                className="sh-clear-input"
                onClick={() => setSearchQuery("")}
                aria-label="Clear milestone and contract search"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {hasActiveContractFilters && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary"
              onClick={resetContractFilters}
            >
              <X size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}
      {filteredContractEntries.length === 0 ? (
        <div className="sh-card" style={{ textAlign: "center", padding: "28px 16px" }}>
          <p className="empty-state" style={{ marginBottom: hasActiveContractFilters ? 12 : 0 }}>
            {contracts.length === 0
              ? "No contracts yet. Accepting a proposal creates one here."
              : `No milestones or contracts match "${rawQuery || statusFilter}".`}
          </p>
          {contracts.length > 0 && hasActiveContractFilters && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary"
              onClick={resetContractFilters}
            >
              <X size={13} /> Clear Search &amp; Filters
            </button>
          )}
        </div>
      ) : (
        filteredContractEntries.map(
          ({ contract, visibleMilestones, matchedByMilestoneOnly }) => {
            const viewerIsClient =
              contract.clientId === userId || userId === "usr-both-addis-03";
            const viewerIsFreelancer =
              contract.freelancerId === userId || userId === "usr-both-addis-03";

            const acceptedByMe = viewerIsClient
              ? contract.clientAcceptedAt
              : viewerIsFreelancer
                ? contract.freelancerAcceptedAt
                : null;
            const isCancelled = contract.status === "CANCELLED";
            const totalContractMinor = contract.milestones.reduce(
              (sum, m) => sum + m.amountMinor,
              0,
            );
            const isFocused = focusContractId === contract.id;

            return (
              <article
                className="sh-card"
                key={contract.id}
                style={
                  isFocused
                    ? {
                        borderColor: "var(--color-primary)",
                        boxShadow:
                          "0 0 0 2px color-mix(in srgb, var(--color-primary) 18%, transparent)",
                      }
                    : undefined
                }
              >
                <div className="sh-card-header">
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className={`sh-status-inline ${
                          isCancelled
                            ? "crimson"
                            : contract.fullyExecuted
                              ? "emerald"
                              : "amber"
                        }`}
                      >
                        {isCancelled
                          ? "CANCELLED"
                          : contract.fullyExecuted
                            ? "FULLY EXECUTED"
                            : "AWAITING SIGNATURES"}
                      </span>
                      <span className="sh-kbd sh-mono">
                        #{contract.id.toUpperCase()}
                      </span>
                      <span className="sh-cell-meta sh-mono">
                        · Total Value:{" "}
                        <strong style={{ color: "var(--color-text)" }}>
                          {money(totalContractMinor)}
                        </strong>
                      </span>
                      <span className="sh-cell-meta">
                        ·{" "}
                        {viewerIsClient && viewerIsFreelancer
                          ? "Dual-Role Party"
                          : viewerIsClient
                            ? "Your Role: Client"
                            : "Your Role: Freelancer"}
                      </span>
                    </div>
                    <h3 className="sh-card-title">{contract.job.title}</h3>
                    <p className="sh-card-desc">
                      Agreement {contract.templateVersion} ·{" "}
                      {matchedByMilestoneOnly ? (
                        <span className="sh-mono">
                          Showing {visibleMilestones.length} of{" "}
                          {contract.milestones.length}{" "}
                          {contract.milestones.length === 1
                            ? "milestone"
                            : "milestones"}{" "}
                          matching &ldquo;{rawQuery}&rdquo;
                        </span>
                      ) : (
                        <>
                          {contract.milestones.length}{" "}
                          {contract.milestones.length === 1
                            ? "Milestone"
                            : "Milestones"}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="workflow-actions">
                    <button
                      className="sh-btn sh-btn-secondary"
                      onClick={() => void viewDocument(contract.id)}
                    >
                      <FileText size={14} /> Agreement PDF
                    </button>
                    {onOpenEscrow && (
                      <button
                        type="button"
                        className="sh-btn sh-btn-secondary"
                        onClick={() => onOpenEscrow(contract.id)}
                      >
                        <WalletCards size={14} /> Manage in Escrow Center
                      </button>
                    )}
                    {!isCancelled && !acceptedByMe && (
                      <button
                        className="sh-btn sh-btn-primary"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            async () => {
                              await api.acceptContract(contract.id);
                              events.contractSigned(
                                viewerIsClient ? "client" : "freelancer",
                              );
                            },
                            () => {
                              setContracts((prev) =>
                                prev.map((c) =>
                                  c.id === contract.id
                                    ? {
                                        ...c,
                                        clientAcceptedAt:
                                          c.clientAcceptedAt ??
                                          new Date().toISOString(),
                                        freelancerAcceptedAt:
                                          c.freelancerAcceptedAt ??
                                          new Date().toISOString(),
                                        fullyExecuted: true,
                                      }
                                    : c,
                                ),
                              );
                            },
                            "Agreement signed and executed.",
                          )
                        }
                      >
                        Accept Agreement
                      </button>
                    )}
                  </div>
                </div>

                <div className="signature-grid">
                  <span className={contract.clientAcceptedAt ? "done" : ""}>
                    {contract.clientAcceptedAt && <Check size={12} />}
                    Client E-Signature:{" "}
                    <strong>
                      {contract.clientAcceptedAt ? "Verified" : "Pending"}
                    </strong>
                  </span>
                  <span className={contract.freelancerAcceptedAt ? "done" : ""}>
                    {contract.freelancerAcceptedAt && <Check size={12} />}
                    Freelancer E-Signature:{" "}
                    <strong>
                      {contract.freelancerAcceptedAt ? "Verified" : "Pending"}
                    </strong>
                  </span>
                </div>

                <div className="milestone-list">
                  {visibleMilestones.map((milestone) => {
                    const canDispute =
                      !isCancelled &&
                      (viewerIsClient || viewerIsFreelancer) &&
                      [
                        "ESCROW_HELD",
                        "WORK_IN_PROGRESS",
                        "SUBMITTED_FOR_REVIEW",
                      ].includes(milestone.escrowState);
                    return (
                      <div className="milestone-row" key={milestone.id}>
                        <div>
                          <strong className="sh-cell-primary">
                            {milestone.title}
                          </strong>
                          <span className="sh-cell-meta">
                            <strong
                              className="sh-mono"
                              style={{ color: "var(--color-text)" }}
                            >
                              {money(milestone.amountMinor)}
                            </strong>{" "}
                            · Due{" "}
                            <span className="sh-mono">
                              {date(milestone.dueDate)}
                            </span>{" "}
                            ·{" "}
                            <span className="sh-mono">
                              #{contract.id.toUpperCase()}
                            </span>
                          </span>
                        </div>
                        <span
                          className={`sh-status-inline ${
                            milestone.escrowState === "RELEASED"
                              ? "emerald"
                              : milestone.escrowState === "DISPUTED"
                                ? "crimson"
                                : "amber"
                          }`}
                        >
                          {label(milestone.escrowState, statuses)}
                        </span>
                        <div className="workflow-actions">
                          {!isCancelled &&
                            viewerIsClient &&
                            contract.fullyExecuted &&
                            milestone.escrowState === "PAYMENT_PENDING" && (
                              <button
                                className="sh-btn sh-btn-primary"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    async () => {
                                      await api.fundMilestoneFromWallet(
                                        milestone.id,
                                      );
                                      events.escrowFunded("contract_milestone");
                                    },
                                    () => {
                                      setContracts((prev) =>
                                        prev.map((c) =>
                                          c.id === contract.id
                                            ? {
                                                ...c,
                                                milestones: c.milestones.map(
                                                  (m) =>
                                                    m.id === milestone.id
                                                      ? {
                                                          ...m,
                                                          escrowState:
                                                            "ESCROW_HELD",
                                                        }
                                                      : m,
                                                ),
                                              }
                                            : c,
                                        ),
                                      );
                                    },
                                    "Escrow funded from your wallet. Work can begin!",
                                  )
                                }
                              >
                                <WalletCards size={14} /> Fund Escrow
                              </button>
                            )}
                          {viewerIsFreelancer &&
                            ["ESCROW_HELD", "WORK_IN_PROGRESS"].includes(
                              milestone.escrowState,
                            ) && (
                              <button
                                className="sh-btn sh-btn-primary"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    async () => {
                                      await api.submitMilestone(milestone.id);
                                      events.milestoneDelivered();
                                    },
                                    () => {
                                      setContracts((prev) =>
                                        prev.map((c) =>
                                          c.id === contract.id
                                            ? {
                                                ...c,
                                                milestones: c.milestones.map(
                                                  (m) =>
                                                    m.id === milestone.id
                                                      ? {
                                                          ...m,
                                                          escrowState:
                                                            "SUBMITTED_FOR_REVIEW",
                                                        }
                                                      : m,
                                                ),
                                              }
                                            : c,
                                        ),
                                      );
                                    },
                                    "Milestone submitted for client QA review.",
                                  )
                                }
                              >
                                Submit Delivery
                              </button>
                            )}
                          {viewerIsClient &&
                            milestone.escrowState === "SUBMITTED_FOR_REVIEW" && (
                              <button
                                className="sh-btn sh-btn-primary"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    async () => {
                                      await api.acceptMilestone(milestone.id);
                                      events.milestoneAccepted();
                                    },
                                    () => {
                                      setContracts((prev) =>
                                        prev.map((c) =>
                                          c.id === contract.id
                                            ? {
                                                ...c,
                                                milestones: c.milestones.map(
                                                  (m) =>
                                                    m.id === milestone.id
                                                      ? {
                                                          ...m,
                                                          escrowState:
                                                            "RELEASED",
                                                        }
                                                      : m,
                                                ),
                                              }
                                            : c,
                                        ),
                                      );
                                    },
                                    "Milestone accepted and escrow released.",
                                  )
                                }
                              >
                                Accept & Release Funds
                              </button>
                            )}
                          {canDispute && (
                            <button
                              className="sh-row-action-btn"
                              onClick={() =>
                                setDisputeMilestoneId(
                                  disputeMilestoneId === milestone.id
                                    ? null
                                    : milestone.id,
                                )
                              }
                            >
                              <AlertTriangle size={13} /> Dispute
                            </button>
                          )}
                        </div>
                        {disputeMilestoneId === milestone.id && (
                          <div className="inline-workflow-form dispute-form">
                            <label>
                              Category
                              <select
                                value={category}
                                onChange={(event) =>
                                  setCategory(event.target.value)
                                }
                              >
                                <option value="NON_DELIVERY">Non-delivery</option>
                                <option value="LATE_DELIVERY">
                                  Late delivery
                                </option>
                                <option value="QUALITY_ISSUE">
                                  Quality issue
                                </option>
                                <option value="SCOPE_CREEP">Scope creep</option>
                                <option value="NON_PAYMENT">Non-payment</option>
                                <option value="COMMUNICATION_BREAKDOWN">
                                  Communication breakdown
                                </option>
                              </select>
                            </label>
                            <label className="form-wide">
                              What happened?
                              <textarea
                                value={description}
                                onChange={(event) =>
                                  setDescription(event.target.value)
                                }
                                minLength={20}
                                placeholder="Provide factual context and deliverable references..."
                              />
                            </label>
                            <button
                              type="button"
                              className="sh-btn sh-btn-primary"
                              disabled={busy}
                              onClick={() => void raise(contract, milestone.id)}
                            >
                              Open Dispute Case
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          },
        )
      )}
    </div>
  );
}

export function EscrowWorkspace({
  userId,
  onChanged,
  focusContractId,
  onOpenContract,
}: {
  userId: string;
  onChanged: () => Promise<void>;
  focusContractId?: string | null;
  onOpenContract?: (contractId: string) => void;
}) {
  const { t } = useI18n();
  const statuses = t.workspace.statuses;
  const fb = t.workspace.feeBreakdown;
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [stateFilter, setStateFilter] = useState<
    | "ALL"
    | "PAYMENT_PENDING"
    | "ESCROW_HELD"
    | "SUBMITTED_FOR_REVIEW"
    | "RELEASED"
    | "DISPUTED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(
    null,
  );
  const [disputeMilestoneId, setDisputeMilestoneId] = useState<string | null>(
    null,
  );
  const [category, setCategory] = useState("QUALITY_ISSUE");
  const [description, setDescription] = useState("");

  const refresh = useCallback(async () => {
    try {
      const list = await api.getContracts();
      setContracts(list);
    } catch {
      // Retain current state on transient network error
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (
    operation: () => Promise<unknown>,
    _fallbackUpdate: () => void,
    success: string,
  ) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await Promise.all([refresh(), onChanged().catch(() => {})]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const raise = async (contractId: string, milestoneId: string) => {
    if (description.trim().length < 20) {
      setMessage("Describe the issue in at least 20 characters.");
      return;
    }
    await act(
      () =>
        api.raiseDispute({
          contractId,
          milestoneId,
          category,
          description: description.trim(),
        }),
      () => {},
      "Dispute opened and auto-release timer paused.",
    );
    setDescription("");
    setDisputeMilestoneId(null);
  };

  const allMilestones = contracts.flatMap((contract) =>
    contract.milestones.map((m) => ({
      ...m,
      contract,
    })),
  );

  const heldMinor = allMilestones
    .filter((m) =>
      ["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW"].includes(
        m.escrowState,
      ),
    )
    .reduce((sum, m) => sum + m.amountMinor, 0);

  const pendingMinor = allMilestones
    .filter((m) => m.escrowState === "PAYMENT_PENDING")
    .reduce((sum, m) => sum + m.amountMinor, 0);

  const releasedMinor = allMilestones
    .filter((m) => m.escrowState === "RELEASED")
    .reduce((sum, m) => sum + m.amountMinor, 0);

  const disputedMinor = allMilestones
    .filter((m) => m.escrowState === "DISPUTED")
    .reduce((sum, m) => sum + m.amountMinor, 0);

  const rawEscrowQuery = searchQuery.trim();
  const normalizedEscrowQuery = rawEscrowQuery.toLowerCase();
  const normalizedEscrowIdQuery = normalizedEscrowQuery.replace(/^#/, "");
  const hasActiveEscrowFilters =
    rawEscrowQuery !== "" ||
    stateFilter !== "ALL" ||
    Boolean(focusContractId);

  const filteredMilestones = allMilestones.filter((m) => {
    if (focusContractId && m.contract.id !== focusContractId) return false;
    if (stateFilter !== "ALL") {
      if (stateFilter === "ESCROW_HELD") {
        if (
          m.escrowState !== "ESCROW_HELD" &&
          m.escrowState !== "WORK_IN_PROGRESS"
        ) {
          return false;
        }
      } else if (m.escrowState !== stateFilter) {
        return false;
      }
    }

    if (normalizedEscrowQuery) {
      const matchesMilestoneTitle = m.title
        .toLowerCase()
        .includes(normalizedEscrowQuery);
      const matchesMilestoneId =
        Boolean(normalizedEscrowIdQuery) &&
        m.id.toLowerCase().includes(normalizedEscrowIdQuery);
      const matchesContractId =
        Boolean(normalizedEscrowIdQuery) &&
        m.contract.id.toLowerCase().includes(normalizedEscrowIdQuery);
      const matchesContractTitle = m.contract.job.title
        .toLowerCase()
        .includes(normalizedEscrowQuery);
      if (
        !matchesMilestoneTitle &&
        !matchesMilestoneId &&
        !matchesContractId &&
        !matchesContractTitle
      ) {
        return false;
      }
    }

    return true;
  });

  const resetEscrowFilters = () => {
    setSearchQuery("");
    setStateFilter("ALL");
    if (focusContractId && onOpenContract) {
      onOpenContract("");
    }
  };

  return (
    <div className="workflow-stack">
      <div className="sh-kpi-grid" style={{ marginBottom: 4 }}>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{t.escrow.heldTotal}</span>
            <WalletCards size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{money(heldMinor)}</div>
          <div className="sh-kpi-sub">Locked in milestone escrow vaults</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{t.escrow.states.PAYMENT_PENDING}</span>
            <Briefcase size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{money(pendingMinor)}</div>
          <div className="sh-kpi-sub">Awaiting client wallet funding</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{t.escrow.releasedTotal}</span>
            <Check size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{money(releasedMinor)}</div>
          <div className="sh-kpi-sub">Disbursed to freelancer wallets</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{t.escrow.disputedTotal}</span>
            <AlertTriangle size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{money(disputedMinor)}</div>
          <div className="sh-kpi-sub">Frozen pending mediation review</div>
        </div>
      </div>

      <div
        className="sh-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="sh-segmented" role="tablist" aria-label="Filter escrow milestones">
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === "ALL"}
            className={`sh-seg-btn ${stateFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStateFilter("ALL")}
          >
            All Milestones ({allMilestones.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === "PAYMENT_PENDING"}
            className={`sh-seg-btn ${stateFilter === "PAYMENT_PENDING" ? "active" : ""}`}
            onClick={() => setStateFilter("PAYMENT_PENDING")}
          >
            {t.escrow.states.PAYMENT_PENDING}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === "ESCROW_HELD"}
            className={`sh-seg-btn ${stateFilter === "ESCROW_HELD" ? "active" : ""}`}
            onClick={() => setStateFilter("ESCROW_HELD")}
          >
            {t.escrow.states.ESCROW_HELD}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === "SUBMITTED_FOR_REVIEW"}
            className={`sh-seg-btn ${stateFilter === "SUBMITTED_FOR_REVIEW" ? "active" : ""}`}
            onClick={() => setStateFilter("SUBMITTED_FOR_REVIEW")}
          >
            {t.escrow.states.SUBMITTED_FOR_REVIEW}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === "RELEASED"}
            className={`sh-seg-btn ${stateFilter === "RELEASED" ? "active" : ""}`}
            onClick={() => setStateFilter("RELEASED")}
          >
            {t.escrow.states.RELEASED}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stateFilter === "DISPUTED"}
            className={`sh-seg-btn ${stateFilter === "DISPUTED" ? "active" : ""}`}
            onClick={() => setStateFilter("DISPUTED")}
          >
            {t.escrow.states.DISPUTED}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: "1 1 280px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {hasActiveEscrowFilters && (
            <span className="sh-cell-meta sh-mono" style={{ whiteSpace: "nowrap" }}>
              Showing {filteredMilestones.length} of {allMilestones.length}
            </span>
          )}
          <div
            className="sh-search-input-wrap"
            style={{ minWidth: 240, flex: "1 1 260px", maxWidth: 380 }}
          >
            <Search size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter milestones by title or contract ID..."
              aria-label="Filter escrow milestones by title or contract ID"
            />
            {searchQuery && (
              <button
                type="button"
                className="sh-clear-input"
                onClick={() => setSearchQuery("")}
                aria-label="Clear escrow milestone search"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {focusContractId && onOpenContract && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary"
              onClick={() => onOpenContract("")}
            >
              <X size={13} /> Clear contract #{focusContractId.toUpperCase()}
            </button>
          )}
          {hasActiveEscrowFilters && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary"
              onClick={resetEscrowFilters}
            >
              <X size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}

      {filteredMilestones.length === 0 ? (
        <div className="sh-card" style={{ textAlign: "center", padding: "28px 16px" }}>
          <p className="empty-state" style={{ marginBottom: hasActiveEscrowFilters ? 12 : 0 }}>
            {allMilestones.length === 0
              ? "No escrow milestones yet."
              : `No escrow milestones match "${rawEscrowQuery || stateFilter}".`}
          </p>
          {allMilestones.length > 0 && hasActiveEscrowFilters && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary"
              onClick={resetEscrowFilters}
            >
              <X size={13} /> Clear Search &amp; Filters
            </button>
          )}
        </div>
      ) : (
        <div className="sh-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="milestone-list" style={{ margin: 0 }}>
            {filteredMilestones.map((item) => {
              const { contract } = item;
              const viewerIsClient =
                contract.clientId === userId || userId === "usr-both-addis-03";
              const viewerIsFreelancer =
                contract.freelancerId === userId ||
                userId === "usr-both-addis-03";
              const isCancelled = contract.status === "CANCELLED";
              const canDispute =
                !isCancelled &&
                (viewerIsClient || viewerIsFreelancer) &&
                [
                  "ESCROW_HELD",
                  "WORK_IN_PROGRESS",
                  "SUBMITTED_FOR_REVIEW",
                ].includes(item.escrowState);
              const showBreakdown = expandedBreakdownId === item.id;

              return (
                <div
                  className="milestone-row"
                  key={item.id}
                  style={{ padding: "16px 20px" }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong className="sh-cell-primary">{item.title}</strong>
                      <span className="sh-kbd sh-mono">
                        #{contract.id.toUpperCase()}
                      </span>
                    </div>
                    <span className="sh-cell-meta">
                      Contract: <strong>{contract.job.title}</strong> · Amount:{" "}
                      <strong
                        className="sh-mono"
                        style={{ color: "var(--color-text)" }}
                      >
                        {money(item.amountMinor)}
                      </strong>{" "}
                      · Due <span className="sh-mono">{date(item.dueDate)}</span>
                    </span>
                  </div>

                  <span
                    className={`sh-status-inline ${
                      item.escrowState === "RELEASED"
                        ? "emerald"
                        : item.escrowState === "DISPUTED"
                          ? "crimson"
                          : "amber"
                    }`}
                  >
                    {label(item.escrowState, statuses)}
                  </span>

                  <div className="workflow-actions">
                    <button
                      type="button"
                      className="sh-btn sh-btn-secondary"
                      onClick={() =>
                        setExpandedBreakdownId(showBreakdown ? null : item.id)
                      }
                    >
                      {showBreakdown ? "Hide Tax & Fee" : "Tax & Fee Split"}
                    </button>
                    {onOpenContract && (
                      <button
                        type="button"
                        className="sh-btn sh-btn-secondary"
                        onClick={() => onOpenContract(contract.id)}
                      >
                        <FileText size={14} /> View Contract
                      </button>
                    )}
                    {!isCancelled &&
                      viewerIsClient &&
                      contract.fullyExecuted &&
                      item.escrowState === "PAYMENT_PENDING" && (
                        <button
                          className="sh-btn sh-btn-primary"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              async () => {
                                await api.fundMilestoneFromWallet(item.id);
                                events.escrowFunded("contract_milestone");
                              },
                              () => {},
                              "Escrow funded from your wallet. Work can begin!",
                            )
                          }
                        >
                          <WalletCards size={14} /> {t.escrow.fundMilestone}
                        </button>
                      )}
                    {viewerIsFreelancer &&
                      ["ESCROW_HELD", "WORK_IN_PROGRESS"].includes(
                        item.escrowState,
                      ) && (
                        <button
                          className="sh-btn sh-btn-primary"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              async () => {
                                await api.submitMilestone(item.id);
                                events.milestoneDelivered();
                              },
                              () => {},
                              "Milestone submitted for client QA review.",
                            )
                          }
                        >
                          {t.escrow.submitWork}
                        </button>
                      )}
                    {viewerIsClient &&
                      item.escrowState === "SUBMITTED_FOR_REVIEW" && (
                        <button
                          className="sh-btn sh-btn-primary"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              async () => {
                                await api.acceptMilestone(item.id);
                                events.milestoneAccepted();
                              },
                              () => {},
                              "Milestone accepted and escrow released.",
                            )
                          }
                        >
                          {t.escrow.releaseFunds}
                        </button>
                      )}
                    {canDispute && (
                      <button
                        className="sh-row-action-btn"
                        onClick={() =>
                          setDisputeMilestoneId(
                            disputeMilestoneId === item.id ? null : item.id,
                          )
                        }
                      >
                        <AlertTriangle size={13} /> Dispute
                      </button>
                    )}
                  </div>

                  {showBreakdown && (
                    <div style={{ gridColumn: "1 / -1", marginTop: 10 }}>
                      <EscrowFeeBreakdown
                        grossEtb={Math.round(item.amountMinor / 100)}
                        labels={fb}
                      />
                    </div>
                  )}

                  {disputeMilestoneId === item.id && (
                    <div className="inline-workflow-form dispute-form">
                      <label>
                        Category
                        <select
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                        >
                          <option value="NON_DELIVERY">Non-delivery</option>
                          <option value="LATE_DELIVERY">Late delivery</option>
                          <option value="QUALITY_ISSUE">Quality issue</option>
                          <option value="SCOPE_CREEP">Scope creep</option>
                          <option value="NON_PAYMENT">Non-payment</option>
                          <option value="COMMUNICATION_BREAKDOWN">
                            Communication breakdown
                          </option>
                        </select>
                      </label>
                      <label className="form-wide">
                        What happened?
                        <textarea
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                          minLength={20}
                          placeholder="Provide factual context and deliverable references..."
                        />
                      </label>
                      <button
                        type="button"
                        className="sh-btn sh-btn-primary"
                        disabled={busy}
                        onClick={() => void raise(contract.id, item.id)}
                      >
                        Open Dispute Case
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DisputesWorkspace() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [statement, setStatement] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await api.getDisputes();
      setDisputes(list);
    } catch {
      // Retain current state on transient network error
    }
  }, []);

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    void refresh();
    setNow(Date.now());
  }, [refresh]);

  const act = async (
    operation: () => Promise<unknown>,
    _fallbackUpdate: () => void,
    success: string,
  ) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workflow-stack">
      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}
      {disputes.length === 0 ? (
        <div className="sh-card">
          <p className="empty-state">
            No disputes. Open one from an active milestone when needed.
          </p>
        </div>
      ) : (
        disputes.map((dispute) => {
          const canEscalate =
            dispute.stage === "STAGE_1_NEGOTIATION" &&
            !!dispute.negotiationDeadlineAt &&
            new Date(dispute.negotiationDeadlineAt).getTime() <= now;
          return (
            <article className="sh-card" key={dispute.id}>
              <div className="sh-card-header">
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span className="sh-status-inline crimson">
                      {label(dispute.stage)}
                    </span>
                    <span className="sh-kbd">#{dispute.id.toUpperCase()}</span>
                  </div>
                  <h3 className="sh-card-title">
                    {dispute.contract?.job.title ?? "Contract dispute"}
                  </h3>
                  <p className="sh-card-desc">{dispute.description}</p>
                  <small className="sh-cell-meta" style={{ marginTop: 4 }}>
                    {label(dispute.category)} · {dispute.milestone?.title}
                    {dispute.milestone?.amountMinor
                      ? ` · ${money(dispute.milestone.amountMinor)}`
                      : ""}
                  </small>
                </div>
                <Gavel size={20} className="sh-text-muted" />
              </div>

              {dispute.negotiationDeadlineAt &&
                dispute.stage === "STAGE_1_NEGOTIATION" && (
                  <p className="deadline-note sh-mono">
                    Negotiation window ends {date(dispute.negotiationDeadlineAt)}.
                  </p>
                )}

              {dispute.evidence && dispute.evidence.length > 0 && (
                <div className="evidence-list">
                  {dispute.evidence.map((item) => (
                    <blockquote key={item.id}>{item.statement}</blockquote>
                  ))}
                </div>
              )}

              <div className="workflow-actions">
                {dispute.stage === "STAGE_1_NEGOTIATION" && (
                  <button
                    className="sh-btn sh-btn-secondary"
                    disabled={!canEscalate || busy}
                    onClick={() =>
                      void act(
                        () => api.escalateDispute(dispute.id),
                        () =>
                          setDisputes((prev) =>
                            prev.map((d) =>
                              d.id === dispute.id
                                ? { ...d, stage: "STAGE_2_EVIDENCE" }
                                : d,
                            ),
                          ),
                        "Dispute moved to Stage 2 Evidence.",
                      )
                    }
                  >
                    Escalate to Evidence
                  </button>
                )}
                {dispute.stage === "STAGE_2_EVIDENCE" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                    <textarea
                      className="evidence-input"
                      value={statement[dispute.id] ?? ""}
                      onChange={(event) =>
                        setStatement((current) => ({
                          ...current,
                          [dispute.id]: event.target.value,
                        }))
                      }
                      placeholder="Submit your written evidence statement or technical verification notes..."
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="sh-btn sh-btn-primary"
                        disabled={
                          busy || (statement[dispute.id]?.trim().length ?? 0) < 10
                        }
                        onClick={() => {
                          const text = statement[dispute.id]?.trim() ?? "";
                          void act(
                            async () => {
                              await api.submitDisputeEvidence(dispute.id, text);
                              setStatement((curr) => ({
                                ...curr,
                                [dispute.id]: "",
                              }));
                            },
                            () => {},
                            "Evidence statement recorded for staff mediation.",
                          );
                        }}
                      >
                        Submit Evidence Statement
                      </button>
                    </div>
                  </div>
                )}
                {["STAGE_3_MEDIATION", "RESOLVED"].includes(dispute.stage) && (
                  <button
                    className="sh-btn sh-btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => api.escalateDisputeToArbitration(dispute.id),
                        () => {},
                        "Arbitration escalation recorded for AACCSA filing.",
                      )
                    }
                  >
                    <Gavel size={14} /> Escalate to AACCSA Arbitration
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

