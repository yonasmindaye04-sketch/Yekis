// === IMPORTS ===
import { useState, useEffect, useCallback, useRef } from "react";
import { Check, X, Search, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { EvidenceViewer } from "./EvidenceViewer";
import { api } from "./api/client";
import { QueueControls, type PaginationState, type QueueMeta } from "./QueueControls";
import { StatusBadge } from "./StatusBadge";


// === INTERFACES & TYPES ===
interface KycQueueItem {
  id: string;
  userId: string;
  status?: string;
  tier?: string;
  tin?: string;
  businessRegNumber?: string;
  isPepMatch?: boolean;
  faydaVerificationAttempted?: boolean;
  faydaVerificationSucceeded?: boolean;
  fullName?: string;
  documentNumber?: string;
  updatedAt?: string;
  user?: { email: string; phone?: string; dateOfBirth?: string; ucid?: string };
  documents?: { id: string; documentType: string }[];
  reviewEvents?: { id: string; decision: string; reason: string; createdAt: string; staffUserId: string }[];
}


// === MAIN COMPONENT ===
export function KycQueue({ onReview }: { onReview: (userId: string, decision: "VERIFIED" | "REJECTED", reason?: string) => Promise<void> }) {
  const [queue, setQueue] = useState<KycQueueItem[]>([]);
  const [meta, setMeta] = useState<QueueMeta | null>(null);
  const [state, setState] = useState<PaginationState>({ page: 1, pageSize: 20, search: "", status: "UNDER_REVIEW" });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedItem, setSelectedItem] = useState<KycQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasonRef = useRef<HTMLSelectElement>(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getKycReviewQueue(state);
      setQueue(res.items || []);
      setMeta({ total: res.total || 0, page: res.page || 1, pageSize: res.pageSize || 20 });
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [state]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = useCallback(async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await onReview(selectedItem.userId, "VERIFIED");
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
      await onReview(selectedItem.userId, "REJECTED", finalReason);
      setSelectedItem(null);
      setRejectReason("");
      setCustomReason("");
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItem, rejectReason, customReason, onReview, loadData]);

  const handleRequestClearerPhoto = useCallback(async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await onReview(selectedItem.userId, "REJECTED", "Photo is unclear, blurry, or cropped. Please re-upload a clear image.");
      setSelectedItem(null);
      setRejectReason("");
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItem, onReview, loadData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
      if (!selectedItem) return;
      
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        void handleApprove();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reasonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = queue.findIndex(q => q.userId === selectedItem.userId);
        if (idx >= 0 && idx < queue.length - 1) setSelectedItem(queue[idx + 1]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = queue.findIndex(q => q.userId === selectedItem.userId);
        if (idx > 0) setSelectedItem(queue[idx - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedItem, queue, handleApprove]);

  const evidenceDocs = selectedItem?.documents?.map(d => ({
    id: d.id,
    type: d.documentType,
    urlFetcher: async () => api.getKycDocumentUrl(d.id).then(r => r.url),
    title: d.documentType
  })) || [];

  return (
    <section className="staff-panel staff-kyc-panel" style={{ minHeight: "600px" }}>
      <div className="staff-panel-heading" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">Identity Verification</p>
          <h2>KYC Reviews</h2>
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
          <select value={state.status} onChange={e => setState({ ...state, status: e.target.value, page: 1 })}>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        }
      />

      <div className="dispute-queue-container" style={{ marginTop: 0, border: 'none' }}>
        <div className="staff-queue-list">
          {queue.length === 0 ? (
            <div className="staff-inbox-empty">
              <CheckCircle size={32} />
              <p>No KYC applications in this view.</p>
            </div>
          ) : (
            queue.map(item => (
              <button 
                key={item.userId} 
                className={`staff-conversation-row ${selectedItem?.userId === item.userId ? "selected" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="row-header">
                  <strong>{item.user?.email || "Unknown User"}</strong>
                  <small className="date">{new Date(item.updatedAt || "").toLocaleDateString()}</small>
                </div>
                <div className="row-preview">
                  <span className="subject">{item.tier || "No Tier"} Request</span>
                  <StatusBadge status={item.status || "UNKNOWN"} />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="staff-queue-detail dispute-detail-panel">
          {selectedItem ? (
            <div className="dispute-detail-scroll">
              <div className="dispute-detail-header">
                <div className="header-top">
                  <h3>Identity Review</h3>
                  <StatusBadge status={selectedItem.status || "UNKNOWN"} />
                </div>
                <p className="eyebrow">User: {selectedItem.user?.email} (UCID: {selectedItem.user?.ucid})</p>
              </div>

              <div className="detail-two-col">
                <div className="detail-data">
                  <h4>Extracted Information</h4>
                  <div className="info-grid">
                    <div className="info-field"><label>Tier Request</label><div>{selectedItem.tier?.replace("_", " ")}</div></div>
                    {selectedItem.tier === "TIER_2" || selectedItem.tier === "TIER_3" ? (
                      <>
                        <div className="info-field"><label>TIN</label><div>{selectedItem.tin || "-"}</div></div>
                        <div className="info-field"><label>Business Reg</label><div>{selectedItem.businessRegNumber || "-"}</div></div>
                      </>
                    ) : null}
                  </div>

                  <h4 style={{ marginTop: '2rem' }}>Automated Checks</h4>
                  <div className="checks-list">
                    {selectedItem.faydaVerificationAttempted ? (
                      selectedItem.faydaVerificationSucceeded ? (
                        <div className="check-badge pass"><CheckCircle size={14} /> Fayda Verified</div>
                      ) : (
                        <div className="check-badge fail"><X size={14} /> Fayda Failed</div>
                      )
                    ) : (
                      <div className="check-badge none">Fayda Unattempted</div>
                    )}
                    {selectedItem.isPepMatch && <div className="check-badge fail"><ShieldAlert size={14} /> PEP Match</div>}
                    {selectedItem.reviewEvents?.some(r => r.reason === "DUPLICATE_IDENTITY_FLAGGED_FOR_REVIEW") && (
                      <div className="check-badge fail"><AlertTriangle size={14} /> Duplicate Flag</div>
                    )}
                  </div>

                  {selectedItem.reviewEvents && selectedItem.reviewEvents.length > 0 && (
                    <>
                      <h4 style={{ marginTop: '2rem' }}>Review History</h4>
                      <div className="history-list">
                        {selectedItem.reviewEvents.map(evt => (
                          <div key={evt.id} className="history-item">
                            <strong>{evt.decision}</strong> by {evt.staffUserId.slice(0,6)}
                            <span>{new Date(evt.createdAt).toLocaleDateString()}</span>
                            {evt.reason && <p className="history-reason">Reason: {evt.reason}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="detail-documents">
                  <h4>Submitted Evidence</h4>
                  {evidenceDocs.length > 0 ? (
                    <div className="doc-preview">
                      <EvidenceViewer documents={evidenceDocs} onClose={() => {}} />
                    </div>
                  ) : <p className="no-docs">No documents found.</p>}
                </div>
              </div>

              <div className="detail-actions">
                <div className="reject-group">
                  <select ref={reasonRef} value={rejectReason} onChange={e => setRejectReason(e.target.value)} disabled={isSubmitting}>
                    <option value="">-- Select Rejection Reason (Press 'r' to focus) --</option>
                    <option value="Photo is unclear, blurry, or cropped. Please re-upload a clear image.">Photo Unclear</option>
                    <option value="Name on document does not match submitted name.">Name Mismatch</option>
                    <option value="Document appears to be expired.">Expired ID</option>
                    <option value="custom">Custom Reason...</option>
                  </select>
                  {rejectReason === "custom" && (
                    <input type="text" placeholder="Type custom reason..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                  )}
                  <button className="btn-danger" onClick={handleReject} disabled={!rejectReason || (rejectReason === "custom" && !customReason) || isSubmitting}>
                    Reject
                  </button>
                  <button className="btn-warning" onClick={handleRequestClearerPhoto} disabled={isSubmitting}>
                    Ask for Clearer Photo
                  </button>
                </div>
                <button className="btn-success" onClick={handleApprove} disabled={isSubmitting} title="Press 'a' to approve">
                  <Check size={18} /> Approve (A)
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-detail">
              <Search size={48} />
              <p>Select a record to review.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: 'var(--text-muted)' }}>Tip: Use UP/DOWN arrows to navigate</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
