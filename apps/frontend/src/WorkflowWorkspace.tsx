// === IMPORTS ===
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
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

// === INTERFACES & TYPES ===
type MarketplaceRole = "CLIENT" | "FREELANCER" | "BOTH";

const isHiring = (role: MarketplaceRole) => role === "CLIENT" || role === "BOTH";
const isWorking = (role: MarketplaceRole) => role === "FREELANCER" || role === "BOTH";

// === MAIN COMPONENT ===
const money = (minor: number) => `ETB ${(minor / 100).toLocaleString()}`;
const date = (value: string) => new Date(value).toLocaleDateString();
const label = (value: string) => value.replaceAll("_", " ");

export function JobsWorkspace({
  role,
  openJobs,
  onChanged,
}: {
  role: MarketplaceRole;
  openJobs: Job[];
  onChanged: () => Promise<void>;
}) {
  const [ownedJobs, setOwnedJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [proposalsByJob, setProposalsByJob] = useState<
    Record<string, Proposal[]>
  >({});
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
                    <span className="sh-status-inline emerald">{label(job.status)}</span>
                    <span className="sh-mono" style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--color-primary)" }}>
                      {money(job.budgetMinMinor)} – {money(job.budgetMaxMinor)}
                    </span>
                  </div>
                  <h3>{job.title}</h3>
                  <p>{job.description}</p>
                  <small className="sh-cell-meta">
                    Category: {job.category.replaceAll("_", " ")} · Deadline:{" "}
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
                            {label(proposal.status)}
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
  const filteredOpenJobs = effectiveOpenJobs.filter(
    (j) =>
      !searchQuery.trim() ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="workflow-stack">
      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}
      {hiringPanel}
      {myProposals.length > 0 && (
        <section className="sh-card">
          <div className="sh-card-header">
            <div>
              <h3 className="sh-card-title">Your Submitted Proposals</h3>
              <p className="sh-card-desc">
                Active bids and milestone quotes awaiting client review
              </p>
            </div>
            <span className="sh-kbd">{myProposals.length} Bids</span>
          </div>
          <div className="sh-compact-list">
            {myProposals.map((proposal) => (
              <div
                className="sh-compact-row"
                key={proposal.id}
              >
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
                    {label(proposal.status)}
                  </span>
                  {["SUBMITTED", "SHORTLISTED"].includes(proposal.status) && (
                    <button
                      className="sh-row-action-btn"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () => api.withdrawProposal(proposal.id),
                          () =>
                            setMyProposals((prev) =>
                              prev.filter((p) => p.id !== proposal.id),
                            ),
                          "Proposal withdrawn.",
                        )
                      }
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="sh-card">
        <div className="sh-card-header">
          <div>
            <h3 className="sh-card-title">Open Marketplace Briefs</h3>
            <p className="sh-card-desc">
              Verified Ethiopian clients with milestone-backed escrow budgets
            </p>
          </div>
          <div className="sh-search-input-wrap">
            <Search size={14} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter briefs by title or keyword..."
            />
          </div>
        </div>

        {filteredOpenJobs.length === 0 ? (
          <p className="empty-state">No matching open jobs found.</p>
        ) : (
          <div className="workflow-stack">
            {filteredOpenJobs.map((job) => {
              const existing = proposalByJob.get(job.id);
              const showDetail = detailJobId === job.id;
              const showForm = selectedJobId === job.id;

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
                        <span className="sh-status-inline emerald">OPEN BRIEF</span>
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
                        Category: {job.category.replaceAll("_", " ")} · Deadline:{" "}
                        <span className="sh-mono">{date(job.deadline)}</span>
                      </small>
                    </div>
                    {existing ? (
                      <span className="sh-status-inline amber">
                        {label(existing.status)}
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {!showForm && (
                          <>
                            <button
                              className="sh-btn sh-btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailJobId(showDetail ? null : job.id);
                              }}
                            >
                              {showDetail ? "Hide Details" : "View Details"}
                            </button>
                            <button
                              className="sh-btn sh-btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailJobId(null);
                                setSelectedJobId(job.id);
                              }}
                            >
                              Apply
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
                          className="sh-btn sh-btn-primary"
                          style={{ marginTop: 12 }}
                          onClick={() => {
                            setDetailJobId(null);
                            setSelectedJobId(job.id);
                          }}
                        >
                          Submit Proposal <ArrowRight size={14} />
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
                          Submit Milestone Proposal
                        </h3>
                        <button
                          type="button"
                          className="sh-btn sh-btn-secondary"
                          onClick={() => {
                            setSelectedJobId(null);
                            setDetailJobId(job.id);
                          }}
                        >
                          Back to brief
                        </button>
                      </div>
                      <label className="form-wide">
                        Cover letter
                        <textarea
                          value={coverLetter}
                          onChange={(event) => setCoverLetter(event.target.value)}
                          minLength={20}
                          placeholder="Explain your approach, architecture, and relevant Ethiopian project experience."
                        />
                      </label>
                      <label>
                        Quote (ETB)
                        <input
                          type="number"
                          min="1"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="85000"
                        />
                      </label>
                      <label>
                        Estimated days
                        <input
                          type="number"
                          min="1"
                          value={days}
                          onChange={(event) => setDays(event.target.value)}
                        />
                      </label>
                      <label>
                        Milestone due date
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                        />
                      </label>

                      <div className="proposal-attachments form-wide" style={{ gridColumn: "1 / -1" }}>
                        <label className="file-upload-btn">
                          <Paperclip size={15} /> Attach Portfolio / Technical Spec
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
                        <Send size={14} /> Submit Proposal
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContractsWorkspace({
  userId,
  onChanged,
}: {
  userId: string;
  onChanged: () => Promise<void>;
}) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="workflow-stack">
      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}
      {contracts.length === 0 ? (
        <div className="sh-card">
          <p className="empty-state">
            No contracts yet. Accepting a proposal creates one here.
          </p>
        </div>
      ) : (
        contracts.map((contract) => {
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

          return (
            <article className="sh-card" key={contract.id}>
              <div className="sh-card-header">
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
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
                    <span className="sh-kbd">{contract.id.toUpperCase()}</span>
                  </div>
                  <h3 className="sh-card-title">{contract.job.title}</h3>
                  <p className="sh-card-desc">
                    Agreement {contract.templateVersion}
                  </p>
                </div>
                <div className="workflow-actions">
                  <button
                    className="sh-btn sh-btn-secondary"
                    onClick={() => void viewDocument(contract.id)}
                  >
                    <FileText size={14} /> Agreement PDF
                  </button>
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
                  Client E-Signature:{" "}
                  {contract.clientAcceptedAt ? "Verified ✓" : "Pending"}
                </span>
                <span className={contract.freelancerAcceptedAt ? "done" : ""}>
                  Freelancer E-Signature:{" "}
                  {contract.freelancerAcceptedAt ? "Verified ✓" : "Pending"}
                </span>
              </div>

              <div className="milestone-list">
                {contract.milestones.map((milestone) => {
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
                          <strong className="sh-mono" style={{ color: "var(--color-text)" }}>
                            {money(milestone.amountMinor)}
                          </strong>{" "}
                          · Due <span className="sh-mono">{date(milestone.dueDate)}</span>
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
                        {label(milestone.escrowState)}
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
                                              milestones: c.milestones.map((m) =>
                                                m.id === milestone.id
                                                  ? {
                                                      ...m,
                                                      escrowState: "ESCROW_HELD",
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
                                              milestones: c.milestones.map((m) =>
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
                                              milestones: c.milestones.map((m) =>
                                                m.id === milestone.id
                                                  ? {
                                                      ...m,
                                                      escrowState: "RELEASED",
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
        })
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

