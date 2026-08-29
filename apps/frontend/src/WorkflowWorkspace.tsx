// === IMPORTS ===
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  Gavel,
  Paperclip,
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

// === INTERFACES & TYPES ===
type MarketplaceRole = "CLIENT" | "FREELANCER";

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

  const refresh = useCallback(async () => {
    if (role === "CLIENT") {
      const jobs = await api.getMyJobs();
      setOwnedJobs(jobs);
      const entries = await Promise.all(
        jobs.map(
          async (job) => [job.id, await api.getJobProposals(job.id)] as const,
        ),
      );
      setProposalsByJob(Object.fromEntries(entries));
    } else {
      setMyProposals(await api.getMyProposals());
    }
  }, [role]);

  useEffect(() => {
    const load = async () => {
      try {
        await refresh();
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Unable to load proposals",
        );
      }
    };
    void load();
  }, [refresh]);

  const act = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await Promise.all([refresh(), onChanged()]);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to complete this action",
      );
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
        "Add a detailed cover letter, valid amount, delivery estimate, and milestone due date.",
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
      setMessage("Proposal submitted.");
      await Promise.all([refresh(), onChanged()]);
      
      setCoverLetter("");
      setAmount("");
      setDueDate("");
      setAttachments([]);
      setSelectedJobId(null);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to complete this action",
      );
    } finally {
      setBusy(false);
    }
  };

  if (role === "CLIENT") {
    return (
      <div className="workflow-stack">
        {message && (
          <p className="workflow-message">
            <Check size={16} />
            {message}
          </p>
        )}
        {ownedJobs.length === 0 ? (
          <p className="empty-state">Your published jobs will appear here.</p>
        ) : (
          ownedJobs.map((job) => (
            <article className="workflow-item" key={job.id}>
              <div className="workflow-item-head">
                <div>
                  <span className="status-pill">{label(job.status)}</span>
                  <h3>{job.title}</h3>
                  <p>{job.description}</p>
                </div>
                <strong>{proposalsByJob[job.id]?.length ?? 0} proposals</strong>
              </div>
              {(proposalsByJob[job.id] ?? []).length > 0 && (
                <div className="proposal-list">
                  {proposalsByJob[job.id].map((proposal) => (
                    <div className="proposal-row" key={proposal.id}>
                      <div>
                        <strong>
                          {proposal.freelancer?.email ?? "Freelancer"}
                        </strong>
                        <span>
                          {money(proposal.quotedAmountMinor)} ·{" "}
                          {proposal.estimatedDays} days ·{" "}
                          {label(proposal.status)}
                        </span>
                        <p>{proposal.coverLetter}</p>
                      </div>
                      {["SUBMITTED", "SHORTLISTED"].includes(
                        proposal.status,
                      ) && (
                        <div className="workflow-actions">
                          {proposal.status === "SUBMITTED" && (
                            <button
                              className="btn-secondary"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () =>
                                    api.decideProposal(
                                      proposal.id,
                                      "SHORTLISTED",
                                    ),
                                  "Proposal shortlisted.",
                                )
                              }
                            >
                              Shortlist
                            </button>
                          )}
                          <button
                            className="btn-primary"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () =>
                                  api.decideProposal(proposal.id, "ACCEPTED"),
                                "Proposal accepted and contract generated.",
                              )
                            }
                          >
                            Accept <Check size={15} />
                          </button>
                          <button
                            className="icon-action reject"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () =>
                                  api.decideProposal(proposal.id, "REJECTED"),
                                "Proposal rejected.",
                              )
                            }
                            aria-label="Reject proposal"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    );
  }

  const proposalByJob = new Map(
    myProposals.map((proposal) => [proposal.jobId, proposal]),
  );
  return (
    <div className="workflow-stack">
      {message && (
        <p className="workflow-message">
          <Check size={16} />
          {message}
        </p>
      )}
      {myProposals.length > 0 && (
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h2>Your proposals</h2>
          </div>
          {myProposals.map((proposal) => (
            <div className="proposal-row" key={proposal.id}>
              <div>
                <strong>{proposal.job?.title ?? "Job"}</strong>
                <span>
                  {money(proposal.quotedAmountMinor)} · {label(proposal.status)}
                </span>
              </div>
              {["SUBMITTED", "SHORTLISTED"].includes(proposal.status) && (
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      () => api.withdrawProposal(proposal.id),
                      "Proposal withdrawn.",
                    )
                  }
                >
                  Withdraw
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {openJobs.length === 0 ? (
        <p className="empty-state">No open jobs yet.</p>
      ) : (
        openJobs.map((job) => {
          const existing = proposalByJob.get(job.id);
          const showDetail = detailJobId === job.id;
          const showForm = selectedJobId === job.id;

          return (
            <article className="workflow-item" key={job.id}>
              <div className="workflow-item-head" style={showDetail ? { cursor: 'pointer' } : {}} onClick={() => !showForm && setDetailJobId(showDetail ? null : job.id)}>
                <div>
                  <span className="status-pill">Open</span>
                  <h3>{job.title}</h3>
                  {!showDetail && <p>{job.description.substring(0, 150)}{job.description.length > 150 ? "..." : ""}</p>}
                  <small>
                    {money(job.budgetMinMinor)} - {money(job.budgetMaxMinor)} ·
                    due {date(job.deadline)}
                  </small>
                </div>
                {existing ? (
                  <span className="status-pill">{label(existing.status)}</span>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    {!showForm && (
                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailJobId(showDetail ? null : job.id);
                        }}
                      >
                        {showDetail ? "Hide Details" : "View Details"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {showDetail && !showForm && (
                <div className="job-detail-panel" style={{ marginTop: 16 }}>
                  <h4>Description</h4>
                  <p>{job.description}</p>
                  
                  {job.proposedMilestones && (
                    <>
                      <h4>Proposed Milestones</h4>
                      <pre style={{ background: "var(--color-bg-subtle)", padding: 12, borderRadius: 8, fontSize: "0.85rem", overflow: "auto", whiteSpace: "pre-wrap", color: "var(--color-text)" }}>
                        {JSON.stringify(job.proposedMilestones, null, 2)}
                      </pre>
                    </>
                  )}
                  
                  {!existing && (
                    <button
                      className="btn-primary"
                      style={{ marginTop: 16 }}
                      onClick={() => {
                        setDetailJobId(null);
                        setSelectedJobId(job.id);
                      }}
                    >
                      Apply Now <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {showForm && !existing && (
                <div className="inline-workflow-form">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>Submit Proposal</h3>
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        setSelectedJobId(null);
                        setDetailJobId(job.id);
                      }}
                    >
                      Back to details
                    </button>
                  </div>
                  <label className="form-wide">
                    Cover letter
                    <textarea
                      value={coverLetter}
                      onChange={(event) => setCoverLetter(event.target.value)}
                      minLength={20}
                      placeholder="Explain your approach and relevant experience."
                    />
                  </label>
                  <label>
                    Quote (ETB)
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
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
                      <Paperclip size={16} /> Attach Files
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                      />
                    </label>
                    {attachments.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        {attachments.map((file, idx) => (
                          <span key={idx} className="attachment-chip">
                            {file.name}
                            <button
                              type="button"
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-primary"
                    disabled={busy}
                    style={{ gridColumn: "1 / -1", width: "fit-content", marginTop: 16 }}
                    onClick={() => void submitProposal(job)}
                  >
                    <Send size={15} /> Submit proposal
                  </button>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

export function ContractsWorkspace({
  role,
  onChanged,
}: {
  role: MarketplaceRole;
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

  const refresh = useCallback(
    async () => setContracts(await api.getContracts()),
    [],
  );
  useEffect(() => {
    const load = async () => {
      try {
        await refresh();
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Unable to load contracts",
        );
      }
    };
    void load();
  }, [refresh]);

  const act = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await Promise.all([refresh(), onChanged()]);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to complete this action",
      );
    } finally {
      setBusy(false);
    }
  };

  const viewDocument = async (contractId: string) => {
    try {
      const { url } = await api.getContractDocumentUrl(contractId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to open agreement",
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
      "Dispute opened and auto-release cancelled.",
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
        <p className="empty-state">
          No contracts yet. Accepting a proposal creates one here.
        </p>
      ) : (
        contracts.map((contract) => {
          const acceptedByMe =
            role === "CLIENT"
              ? contract.clientAcceptedAt
              : contract.freelancerAcceptedAt;
          return (
            <article className="workflow-item" key={contract.id}>
              <div className="workflow-item-head">
                <div>
                  <span className="status-pill">
                    {contract.fullyExecuted
                      ? "Fully executed"
                      : "Awaiting signatures"}
                  </span>
                  <h3>{contract.job.title}</h3>
                  <small>Agreement {contract.templateVersion}</small>
                </div>
                <div className="workflow-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => void viewDocument(contract.id)}
                  >
                    <FileText size={15} /> View PDF
                  </button>
                  {!acceptedByMe && (
                    <button
                      className="btn-primary"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () => api.acceptContract(contract.id),
                          "Agreement accepted.",
                        )
                      }
                    >
                      Accept agreement
                    </button>
                  )}
                </div>
              </div>
              <div className="signature-grid">
                <span className={contract.clientAcceptedAt ? "done" : ""}>
                  Client {contract.clientAcceptedAt ? "signed" : "pending"}
                </span>
                <span className={contract.freelancerAcceptedAt ? "done" : ""}>
                  Freelancer{" "}
                  {contract.freelancerAcceptedAt ? "signed" : "pending"}
                </span>
              </div>
              <div className="milestone-list">
                {contract.milestones.map((milestone) => {
                  const canDispute = [
                    "ESCROW_HELD",
                    "WORK_IN_PROGRESS",
                    "SUBMITTED_FOR_REVIEW",
                  ].includes(milestone.escrowState);
                  return (
                    <div className="milestone-row" key={milestone.id}>
                      <div>
                        <strong>{milestone.title}</strong>
                        <span>
                          {money(milestone.amountMinor)} · due{" "}
                          {date(milestone.dueDate)}
                        </span>
                      </div>
                      <span className="status-pill">
                        {label(milestone.escrowState)}
                      </span>
                      <div className="workflow-actions">
                        {role === "CLIENT" &&
                          contract.fullyExecuted &&
                          milestone.escrowState === "PAYMENT_PENDING" && (
                            <button
                              className="btn-primary"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () =>
                                    api.fundMilestoneFromWallet(milestone.id),
                                  "Escrow funded from your wallet. Work can begin!",
                                )
                              }
                            >
                              <WalletCards size={15} /> Fund from wallet
                            </button>
                          )}
                        {role === "CLIENT" &&
                          !contract.fullyExecuted &&
                          milestone.escrowState === "PAYMENT_PENDING" && (
                            <span className="status-note">
                              Sign the agreement to auto-fund escrow
                            </span>
                          )}
                        {role === "FREELANCER" &&
                          ["ESCROW_HELD", "WORK_IN_PROGRESS"].includes(
                            milestone.escrowState,
                          ) && (
                            <button
                              className="btn-primary"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () => api.submitMilestone(milestone.id),
                                  "Milestone submitted for review.",
                                )
                              }
                            >
                              Submit delivery
                            </button>
                          )}
                        {role === "CLIENT" &&
                          milestone.escrowState === "SUBMITTED_FOR_REVIEW" && (
                            <button
                              className="btn-primary"
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () => api.acceptMilestone(milestone.id),
                                  "Milestone accepted and funds released.",
                                )
                              }
                            >
                              Accept delivery
                            </button>
                          )}
                        {canDispute && (
                          <button
                            className="btn-secondary danger-button"
                            onClick={() =>
                              setDisputeMilestoneId(
                                disputeMilestoneId === milestone.id
                                  ? null
                                  : milestone.id,
                              )
                            }
                          >
                            <AlertTriangle size={15} /> Dispute
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
                            />
                          </label>
                          <button
                            className="btn-primary"
                            disabled={busy}
                            onClick={() => void raise(contract, milestone.id)}
                          >
                            Open dispute
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

  const refresh = useCallback(
    async () => setDisputes(await api.getDisputes()),
    [],
  );
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const load = async () => {
      try {
        await refresh();
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Unable to load disputes",
        );
      }
      setNow(Date.now());
    };
    void load();
  }, [refresh, disputes]);

  const act = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to complete this action",
      );
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
        <div className="panel">
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
            <article className="workflow-item" key={dispute.id}>
              <div className="workflow-item-head">
                <div>
                  <span className="status-pill">{label(dispute.stage)}</span>
                  <h3>{dispute.contract?.job.title ?? "Contract dispute"}</h3>
                  <p>{dispute.description}</p>
                  <small>
                    {label(dispute.category)} · {dispute.milestone?.title}
                  </small>
                </div>
                <Gavel size={24} />
              </div>
              {dispute.negotiationDeadlineAt &&
                dispute.stage === "STAGE_1_NEGOTIATION" && (
                  <p className="deadline-note">
                    Negotiation window ends{" "}
                    {date(dispute.negotiationDeadlineAt)}.
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
                    className="btn-secondary"
                    disabled={!canEscalate || busy}
                    onClick={() =>
                      void act(
                        () => api.escalateDispute(dispute.id),
                        "Dispute moved to evidence.",
                      )
                    }
                  >
                    Escalate to evidence
                  </button>
                )}
                {dispute.stage === "STAGE_2_EVIDENCE" && (
                  <>
                    <textarea
                      className="evidence-input"
                      value={statement[dispute.id] ?? ""}
                      onChange={(event) =>
                        setStatement((current) => ({
                          ...current,
                          [dispute.id]: event.target.value,
                        }))
                      }
                      placeholder="Submit your written evidence statement."
                    />
                    <button
                      className="btn-primary"
                      disabled={
                        busy || (statement[dispute.id]?.trim().length ?? 0) < 10
                      }
                      onClick={() =>
                        void act(
                          () =>
                            api.submitDisputeEvidence(
                              dispute.id,
                              statement[dispute.id].trim(),
                            ),
                          "Evidence submitted for mediation.",
                        )
                      }
                    >
                      Submit evidence
                    </button>
                  </>
                )}
                {["STAGE_3_MEDIATION", "RESOLVED"].includes(dispute.stage) && (
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => api.escalateDisputeToArbitration(dispute.id),
                        "Arbitration escalation recorded for staff filing.",
                      )
                    }
                  >
                    <Gavel size={15} /> Escalate to arbitration
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
