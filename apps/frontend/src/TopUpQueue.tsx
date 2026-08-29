// === IMPORTS ===
import { useState, useEffect, useCallback, useRef } from "react";
import { Check, X, Search, CheckCircle, Flag } from "lucide-react";
import { EvidenceViewer, type EvidenceDocument } from "./EvidenceViewer";
import { api, type TopUpQueueItem } from "./api/client";
import {
  QueueControls,
  type PaginationState,
  type QueueMeta,
} from "./QueueControls";
import { StatusBadge } from "./StatusBadge";

// === MAIN COMPONENT ===
export function TopUpQueue({
  onReview,
  onFlag,
}: {
  onReview: (
    topUpId: string,
    decision: "APPROVED" | "REJECTED",
    reason?: string,
  ) => Promise<void>;
  onFlag: (topUpId: string, reason: string) => Promise<void>;
}) {
  const [queue, setQueue] = useState<TopUpQueueItem[]>([]);
  const [meta, setMeta] = useState<QueueMeta | null>(null);
  const [state, setState] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    search: "",
    status: "PENDING_REVIEW",
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedItem, setSelectedItem] = useState<TopUpQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const reasonRef = useRef<HTMLSelectElement>(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getTopUpReviewQueue(state);
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

  const handleApprove = useCallback(async () => {
    if (!selectedItem) return;
    const amountStr = (selectedItem.amountMinor / 100).toLocaleString();
    const userDisplay =
      selectedItem.user?.email ||
      selectedItem.user?.phone ||
      selectedItem.userId;

    if (
      !window.confirm(
        `You are crediting ETB ${amountStr} to ${userDisplay} — confirm the receipt image matches?`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReview(selectedItem.id, "APPROVED");
      setSelectedItem(null);
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItem, onReview, loadData]);

  const handleReject = useCallback(async () => {
    if (!selectedItem) return;
    const finalReason = rejectReason === "custom" ? customReason : rejectReason;
    if (!finalReason) {
      alert("Please provide a rejection reason.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onReview(selectedItem.id, "REJECTED", finalReason);
      setSelectedItem(null);
      setRejectReason("");
      setCustomReason("");
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItem, rejectReason, customReason, onReview, loadData]);

  const handleFlag = useCallback(async () => {
    if (!selectedItem) return;
    if (!flagReason) {
      alert("Please provide a reason for flagging this receipt as suspicious.");
      return;
    }
    if (
      !window.confirm(
        "Flagging this transaction will send it to the compliance queue. Are you sure?",
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await onFlag(selectedItem.id, flagReason);
      setSelectedItem(null);
      setFlagReason("");
      setIsFlagging(false);
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItem, flagReason, onFlag, loadData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;
      if (!selectedItem) return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        void handleApprove();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        reasonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = queue.findIndex((q) => q.id === selectedItem.id);
        if (idx >= 0 && idx < queue.length - 1) setSelectedItem(queue[idx + 1]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = queue.findIndex((q) => q.id === selectedItem.id);
        if (idx > 0) setSelectedItem(queue[idx - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedItem, queue, handleApprove]);

  const getDestinationAccount = (provider: string) => {
    switch (provider) {
      case "TELEBIRR":
        return "Platform Telebirr (0910011818)";
      case "CBE_BIRR":
        return "Platform CBE (1000XXXXX)";
      default:
        return `Platform ${provider} Account`;
    }
  };

  const evidenceDocs: EvidenceDocument[] = selectedItem
    ? [
        {
          id: selectedItem.id,
          title: "Payment Receipt",
          urlFetcher: async () => {
            const res = await api.getTopUpReceiptUrl(selectedItem.id);
            return res.url;
          },
        },
      ]
    : [];

  return (
    <section
      className="staff-panel staff-topup-panel"
      style={{ minHeight: "600px" }}
    >
      <div className="staff-panel-heading" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">Payment Control</p>
          <h2>Receipt Approvals</h2>
        </div>
        <StatusBadge status="PENDING_REVIEW" />
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
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        }
      />

      <div
        className="kyc-queue-container"
        style={{ marginTop: 0, border: "none" }}
      >
        <div className="kyc-queue-list">
          {queue.length === 0 ? (
            <div className="staff-inbox-empty">
              <CheckCircle size={32} />
              <p>No pending receipts in this view.</p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className={`kyc-queue-row ${selectedItem?.id === item.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedItem(item);
                  setIsFlagging(false);
                }}
              >
                <div className="row-main">
                  <strong>
                    ETB {(item.amountMinor / 100).toLocaleString()}
                  </strong>
                  <span className="tier-badge">{item.provider}</span>
                  {item.userHistory && item.userHistory.approvedCount > 0 && (
                    <span
                      className="status-pill success"
                      style={{ marginLeft: "8px", fontSize: "10px" }}
                    >
                      Trusted
                    </span>
                  )}
                </div>
                <div className="row-meta">
                  <span>
                    {item.user?.email ||
                      item.user?.phone ||
                      item.userId.slice(0, 8)}
                  </span>
                  <StatusBadge status={item.status || "UNKNOWN"} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="kyc-queue-detail">
          {selectedItem ? (
            <div className="detail-content">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h3>Review Receipt</h3>
                <StatusBadge status={selectedItem.status || "UNKNOWN"} />
              </div>

              <div className="detail-split">
                <div className="detail-info">
                  <h4>Submitted Data</h4>
                  <div className="info-grid">
                    <div className="info-field">
                      <label>Amount Claimed</label>
                      <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                        ETB {(selectedItem.amountMinor / 100).toLocaleString()}
                      </div>
                    </div>
                    <div className="info-field">
                      <label>Provider</label>
                      <div>{selectedItem.provider}</div>
                    </div>
                    <div className="info-field">
                      <label>Reference Number</label>
                      <div
                        style={{ fontFamily: "monospace", fontSize: "1.1em" }}
                      >
                        {selectedItem.referenceNumber}
                      </div>
                    </div>
                    <div
                      className="info-field"
                      style={{
                        backgroundColor: "#f8f9fa",
                        padding: "8px",
                        borderRadius: "4px",
                      }}
                    >
                      <label>Expected Destination</label>
                      <div style={{ color: "#0d6efd", fontWeight: "500" }}>
                        {getDestinationAccount(selectedItem.provider)}
                      </div>
                    </div>
                  </div>

                  <h4>User Context</h4>
                  <div className="info-grid">
                    <div className="info-field">
                      <label>User</label>
                      <div>
                        {selectedItem.user?.email ||
                          selectedItem.user?.phone ||
                          selectedItem.userId}
                      </div>
                    </div>
                  </div>

                  {selectedItem.userHistory && (
                    <div className="checks-list" style={{ marginTop: "12px" }}>
                      <div className="check-badge pass">
                        <CheckCircle size={14} />{" "}
                        {selectedItem.userHistory.approvedCount} Prior Approvals
                      </div>
                      {selectedItem.userHistory.approvedCount > 0 && (
                        <div className="check-badge pass">
                          Total: ETB{" "}
                          {(
                            selectedItem.userHistory.approvedTotalMinor / 100
                          ).toLocaleString()}
                        </div>
                      )}
                      {selectedItem.userHistory.rejectedCount > 0 && (
                        <div className="check-badge fail">
                          <X size={14} />{" "}
                          {selectedItem.userHistory.rejectedCount} Prior
                          Rejections
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="detail-documents">
                  <h4>Uploaded Receipt</h4>
                  {evidenceDocs.length > 0 ? (
                    <div className="doc-preview" style={{ height: "400px" }}>
                      <EvidenceViewer
                        documents={evidenceDocs}
                        onClose={() => {}}
                      />
                    </div>
                  ) : (
                    <p className="no-docs">No receipt found.</p>
                  )}
                </div>
              </div>

              <div className="detail-actions">
                {isFlagging ? (
                  <div
                    className="reject-group"
                    style={{
                      flex: 1,
                      backgroundColor: "#fff3cd",
                      padding: "8px",
                      borderRadius: "4px",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Reason for suspicion (e.g. forged receipt)..."
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn-danger"
                      onClick={handleFlag}
                      disabled={isSubmitting || !flagReason}
                    >
                      Submit to Compliance
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setIsFlagging(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="reject-group">
                      <select
                        ref={reasonRef}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">
                          -- Reject: Select Reason (Press 'r' to focus) --
                        </option>
                        <option value="Reference number does not match receipt.">
                          Reference Mismatch
                        </option>
                        <option value="Amount does not match receipt.">
                          Amount Mismatch
                        </option>
                        <option value="Receipt is unreadable. Please upload a clear photo.">
                          Unreadable Photo
                        </option>
                        <option value="Funds not yet received in our account.">
                          Funds Not Received
                        </option>
                        <option value="custom">Custom Reason...</option>
                      </select>
                      {rejectReason === "custom" && (
                        <input
                          type="text"
                          placeholder="Type custom reason..."
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                        />
                      )}
                      <button
                        className="btn-warning"
                        onClick={handleReject}
                        disabled={
                          !rejectReason ||
                          (rejectReason === "custom" && !customReason) ||
                          isSubmitting
                        }
                      >
                        Reject
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-outline"
                        style={{
                          color: "var(--danger-color)",
                          borderColor: "var(--danger-color)",
                        }}
                        onClick={() => setIsFlagging(true)}
                        disabled={isSubmitting}
                      >
                        <Flag size={16} /> Flag Suspicious
                      </button>
                      <button
                        className="btn-success"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        title="Press 'a' to approve"
                      >
                        <Check size={18} /> Approve (A)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-detail">
              <Search size={48} />
              <p>Select a receipt to review.</p>
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
