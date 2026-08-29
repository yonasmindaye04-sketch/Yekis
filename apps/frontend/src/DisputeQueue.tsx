// === IMPORTS ===
import { useState, useEffect, useCallback } from "react";
import { Scale, AlertCircle } from "lucide-react";
import { EvidenceViewer } from "./EvidenceViewer";
import { api } from "./api/client";

// === INTERFACES & TYPES ===
export interface DisputeQueueItem {
  id: string;
  contractId: string;
  milestoneId: string;
  category: string;
  stage: string;
  description: string;
  negotiationDeadlineAt: string | null;
  mediationDeadlineAt: string | null;
  mediatorRecommendation: string | null;
  resolutionOutcome: string | null;
  createdAt: string;
  contract?: {
    id: string;
    clientId: string;
    freelancerId: string;
    client?: { id: string };
    job?: { title: string; description?: string };
    milestones?: {
      id: string;
      title: string;
      amountMinor: number;
      deliverableUrl?: string;
    }[];
  };
  milestone?: {
    id: string;
    title: string;
    amountMinor: number;
    escrowState: string;
    deliverableUrl?: string;
  };
  evidence?: {
    id: string;
    submittedByUserId: string;
    statement: string;
    createdAt: string;
  }[];
}
import {
  QueueControls,
  type PaginationState,
  type QueueMeta,
} from "./QueueControls";
import { StatusBadge } from "./StatusBadge";

interface DisputeQueueProps {
  onResolve: (
    id: string,
    outcome: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT",
    recommendation: string,
    freelancerShareMinor?: number,
  ) => Promise<void>;
}

const PLATFORM_FEE_RATE = 0.05;
const WITHHOLDING_RATE_WITHOUT_TIN = 0.3;

// === MAIN COMPONENT ===
export function DisputeQueue({ onResolve }: DisputeQueueProps) {
  const [queue, setQueue] = useState<DisputeQueueItem[]>([]);
  const [meta, setMeta] = useState<QueueMeta | null>(null);
  const [state, setState] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    search: "",
    status: "STAGE_3_MEDIATION",
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getDisputeQueue(state);
      setQueue(res.items || []);
      setMeta({
        total: res.total || 0,
        page: res.page || 1,
        pageSize: res.pageSize || 10,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [state]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;
      if (!selectedDisputeId) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = queue.findIndex((q) => q.id === selectedDisputeId);
        if (idx >= 0 && idx < queue.length - 1)
          setSelectedDisputeId(queue[idx + 1].id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = queue.findIndex((q) => q.id === selectedDisputeId);
        if (idx > 0) setSelectedDisputeId(queue[idx - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedDisputeId, queue]);

  const handleResolveWrap = async (
    id: string,
    outcome: any,
    rec: string,
    share?: number,
  ) => {
    await onResolve(id, outcome, rec, share);
    setSelectedDisputeId(null);
    loadData();
  };

  return (
    <section
      className="staff-panel staff-dispute-panel"
      style={{ minHeight: "600px" }}
    >
      <div className="staff-panel-heading" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">Dispute Resolution</p>
          <h2>Mediation Queue</h2>
        </div>
        <StatusBadge status="STAGE_3_MEDIATION" />
      </div>

      <QueueControls
        meta={meta}
        state={state}
        onChange={setState}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        customFilters={
          <select
            value={state.status}
            onChange={(e) =>
              setState({ ...state, status: e.target.value, page: 1 })
            }
          >
            <option value="STAGE_3_MEDIATION">Awaiting Mediation</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        }
      />

      <div
        className="dispute-queue-container"
        style={{ marginTop: 0, border: "none" }}
      >
        <div className="staff-queue-list">
          {queue.length === 0 ? (
            <div className="staff-inbox-empty">
              <Scale size={32} />
              <p>No active disputes in this view.</p>
            </div>
          ) : (
            queue.map((item) => (
              <button
                key={item.id}
                className={`staff-queue-card ${selectedDisputeId === item.id ? "selected" : ""}`}
                onClick={() => setSelectedDisputeId(item.id)}
              >
                <div className="row-header">
                  <strong>{item.category.replace(/_/g, " ")}</strong>
                  <small className="date">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <div className="row-preview">
                  <span className="subject">
                    {item.contract?.job?.title || "Contract"}
                  </span>
                  <StatusBadge status={item.stage} />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="staff-queue-detail dispute-detail-panel">
          {selectedDisputeId ? (
            <DisputeDetail
              item={queue.find((q) => q.id === selectedDisputeId)!}
              onResolve={handleResolveWrap}
            />
          ) : (
            <div className="staff-inbox-empty">
              <Scale size={32} />
              <p>Select a dispute to mediate.</p>
              <p
                style={{
                  fontSize: "0.8rem",
                  marginTop: "1rem",
                  color: "var(--text-muted)",
                }}
              >
                Tip: Use UP/DOWN arrows to navigate
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DisputeDetail({
  item,
  onResolve,
}: {
  item: DisputeQueueItem;
  onResolve: (
    id: string,
    outcome: any,
    recommendation: string,
    share?: number,
  ) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<
    "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT" | ""
  >("");
  const [recommendation, setRecommendation] = useState("");
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const milestone = item.contract?.milestones?.find(
    (m) => m.id === item.milestoneId,
  );
  const grossAmount = milestone?.amountMinor || 0;

  const renderSla = () => {
    if (!item.mediationDeadlineAt)
      return <span className="sla-indicator">SLA N/A</span>;
    const diffHours =
      (new Date(item.mediationDeadlineAt).getTime() - Date.now()) /
      (1000 * 60 * 60);
    if (diffHours < 0)
      return (
        <span className="sla-indicator sla-breached">
          SLA Breached ({Math.abs(Math.floor(diffHours))}h ago)
        </span>
      );
    if (diffHours < 24)
      return (
        <span className="sla-indicator sla-warning">
          SLA Due in {Math.floor(diffHours)}h
        </span>
      );
    return (
      <span className="sla-indicator sla-ok">
        SLA Due in {Math.floor(diffHours / 24)}d
      </span>
    );
  };

  const calculatePreview = () => {
    let freelancerGross = 0;
    let clientRefund = 0;

    if (outcome === "RELEASE_TO_FREELANCER") {
      freelancerGross = grossAmount;
    } else if (outcome === "REFUND_TO_CLIENT") {
      clientRefund = grossAmount;
    } else if (outcome === "PARTIAL_SPLIT") {
      freelancerGross = Math.round(grossAmount * (splitPercent / 100));
      clientRefund = grossAmount - freelancerGross;
    }

    const freelancerFee = Math.round(freelancerGross * PLATFORM_FEE_RATE);
    const withholdingTax =
      freelancerGross >= 1000000
        ? Math.round(freelancerGross * WITHHOLDING_RATE_WITHOUT_TIN)
        : 0;
    const freelancerNet = freelancerGross - freelancerFee - withholdingTax;

    return (
      <div className="resolution-calculator">
        <h4>Resolution Financial Preview</h4>
        <div className="calc-row">
          <span>Client Receives (Refund):</span>
          <strong>ETB {(clientRefund / 100).toFixed(2)}</strong>
        </div>
        <div className="calc-row">
          <span>Freelancer Gross Allocation:</span>
          <strong>ETB {(freelancerGross / 100).toFixed(2)}</strong>
        </div>
        <div className="calc-row sub">
          <span>- Platform Fee (5%):</span>
          <span className="deduction">
            ETB {(freelancerFee / 100).toFixed(2)}
          </span>
        </div>
        <div className="calc-row sub">
          <span>- Withholding Tax (Est. 30%):</span>
          <span className="deduction">
            ETB {(withholdingTax / 100).toFixed(2)}
          </span>
        </div>
        <div className="calc-row total">
          <span>Freelancer Net Receivable:</span>
          <strong>ETB {(freelancerNet / 100).toFixed(2)}</strong>
        </div>
      </div>
    );
  };

  const handleResolve = async () => {
    if (!outcome || !recommendation) return;
    setIsSubmitting(true);
    try {
      const share =
        outcome === "PARTIAL_SPLIT"
          ? Math.round(grossAmount * (splitPercent / 100))
          : undefined;
      await onResolve(item.id, outcome, recommendation, share);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispute-detail-scroll">
      <div className="dispute-detail-header">
        <div className="header-top">
          <h3>{item.contract?.job?.title || "Contract Scope"}</h3>
          {renderSla()}
        </div>
        <p className="eyebrow">
          Dispute Category: {item.category.replace(/_/g, " ")}
        </p>
      </div>

      <div className="dispute-grid-layout">
        <div className="dispute-col-left">
          <section className="dispute-section">
            <h4>Original Scope & Terms</h4>
            <div className="scope-box">
              <p>
                {item.contract?.job?.description || "No description provided."}
              </p>
              <div className="milestone-box">
                <span className="label">Disputed Milestone:</span>
                <strong>{milestone?.title}</strong>
                <span className="amount">
                  ETB {((milestone?.amountMinor || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          <section className="dispute-section">
            <h4>Submitted Deliverable</h4>
            {milestone?.deliverableUrl ? (
              <div className="deliverable-viewer">
                <EvidenceViewer
                  documents={[
                    {
                      id: "1",
                      documentType: "Deliverable",
                      storagePath: milestone.deliverableUrl,
                    } as any,
                  ]}
                  onClose={() => {}}
                />
              </div>
            ) : (
              <div className="empty-deliverable">
                <AlertCircle size={20} />
                <p>
                  No deliverable file/link was formally attached to this
                  milestone.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="dispute-col-right">
          <section className="dispute-section">
            <h4>Stage 2: Evidence Statements</h4>
            <div className="evidence-chat">
              {!item.evidence || item.evidence.length === 0 ? (
                <p className="empty-state">
                  No evidence submitted by either party.
                </p>
              ) : (
                item.evidence.map((ev) => {
                  const isClient =
                    ev.submittedByUserId === item.contract?.client?.id;
                  return (
                    <div
                      key={ev.id}
                      className={`evidence-bubble ${isClient ? "client" : "freelancer"}`}
                    >
                      <div className="bubble-header">
                        <strong>{isClient ? "Client" : "Freelancer"}</strong>
                        <span>
                          {new Date(ev.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p>{ev.statement}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="dispute-resolution-section">
        <h4>Mediation Resolution</h4>
        <div className="resolution-controls">
          <div className="outcome-selector">
            <button
              className={`btn-outline ${outcome === "RELEASE_TO_FREELANCER" ? "active" : ""}`}
              onClick={() => setOutcome("RELEASE_TO_FREELANCER")}
            >
              Release to Freelancer
            </button>
            <button
              className={`btn-outline ${outcome === "PARTIAL_SPLIT" ? "active" : ""}`}
              onClick={() => setOutcome("PARTIAL_SPLIT")}
            >
              Partial Split
            </button>
            <button
              className={`btn-outline ${outcome === "REFUND_TO_CLIENT" ? "active" : ""}`}
              onClick={() => setOutcome("REFUND_TO_CLIENT")}
            >
              Refund to Client
            </button>
          </div>

          {outcome === "PARTIAL_SPLIT" && (
            <div className="split-slider-container">
              <label>
                Freelancer Share: {splitPercent}% (ETB{" "}
                {((grossAmount * (splitPercent / 100)) / 100).toFixed(2)})
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
              />
            </div>
          )}

          {outcome && calculatePreview()}

          <div className="resolution-rationale">
            <label>Mediator Recommendation & Rationale</label>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Explain the reason for this decision. This will be visible to both parties."
              rows={3}
            />
          </div>

          <div className="resolution-actions">
            <button
              className="btn-primary confirm-btn"
              disabled={!outcome || !recommendation.trim() || isSubmitting}
              onClick={handleResolve}
            >
              {isSubmitting ? "Finalizing..." : "Confirm Final Resolution"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
