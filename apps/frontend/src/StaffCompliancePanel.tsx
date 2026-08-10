// === IMPORTS ===
import { useCallback, useEffect, useState } from "react";
import { FileWarning, X, ShieldAlert, AlertTriangle, History, Smartphone, TrendingUp, RefreshCcw } from "lucide-react";
import { api, type TransactionFlag } from "./api/client";
import { QueueControls, type PaginationState, type QueueMeta } from "./QueueControls";
import { StatusBadge } from "./StatusBadge";


// === INTERFACES & TYPES ===
type StaffCompliancePanelProps = {
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

const TMS_STR_FILING_SLA_HOURS = 24;


// === MAIN COMPONENT ===
export function StaffCompliancePanel({ onChanged, onError }: StaffCompliancePanelProps) {
  const [flags, setFlags] = useState<TransactionFlag[]>([]);
  const [meta, setMeta] = useState<QueueMeta | null>(null);
  const [state, setState] = useState<PaginationState>({ page: 1, pageSize: 20, search: "", status: "PENDING_REVIEW", flagType: "" });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFlags = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getTmsQueue(state);
      setFlags(res.items || []);
      setMeta({ total: res.total || 0, page: res.page || 1, pageSize: res.pageSize || 20 });
      setLastUpdated(new Date());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load compliance flags");
    } finally {
      setIsRefreshing(false);
    }
  }, [state, onError]);
  
  useEffect(() => { loadFlags(); }, [loadFlags]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
      if (!selectedFlagId) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = flags.findIndex(q => q.id === selectedFlagId);
        if (idx >= 0 && idx < flags.length - 1) setSelectedFlagId(flags[idx + 1].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = flags.findIndex(q => q.id === selectedFlagId);
        if (idx > 0) setSelectedFlagId(flags[idx - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedFlagId, flags]);

  const closeFlag = async (flagId: string, action: "FILE" | "DISMISS", notes: string, strReference: string) => {
    if (notes.trim().length < 10) { onError("Add review notes (at least 10 characters)."); return; }
    if (action === "FILE" && strReference.trim().length < 3) { onError("Provide a valid STR reference number when filing."); return; }
    setBusy(true);
    try {
      if (action === "FILE") await api.fileStr(flagId, notes.trim(), strReference.trim());
      else await api.dismissFlag(flagId, notes.trim());
      setSelectedFlagId(null);
      await loadFlags();
      await onChanged();
    } catch (err) { 
      onError(err instanceof Error ? err.message : "Unable to update compliance flag"); 
    } finally { 
      setBusy(false); 
    }
  };

  const selectedFlag = flags.find(f => f.id === selectedFlagId);

  return (
    <section className="staff-panel staff-kyc-panel" style={{ minHeight: "600px", marginTop: "20px" }}>
      <div className="staff-panel-heading" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">Transaction Monitoring</p>
          <h2>AML Review Queue</h2>
        </div>
        <StatusBadge status="PENDING_REVIEW" />
      </div>

      <QueueControls 
        meta={meta} 
        state={state} 
        onChange={setState} 
        onRefresh={loadFlags} 
        isRefreshing={isRefreshing} 
        lastUpdated={lastUpdated} 
        customFilters={
          <>
            <select value={state.status} onChange={e => setState({ ...state, status: e.target.value, page: 1 })}>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="STR_FILED">STR Filed</option>
            </select>
            <select value={state.flagType || ""} onChange={e => setState({ ...state, flagType: e.target.value, page: 1 })}>
              <option value="">All Types</option>
              <option value="STRUCTURING">Structuring</option>
              <option value="VELOCITY">High Velocity</option>
              <option value="PASS_THROUGH">Pass-Through</option>
              <option value="WALLET_MISMATCH">Wallet Mismatch</option>
            </select>
          </>
        }
      />

      <div className="dispute-queue-container" style={{ marginTop: 0, border: 'none' }}>
        <div className="staff-queue-list">
          {flags.length === 0 ? (
            <div className="staff-inbox-empty">
              <ShieldAlert size={32} />
              <p>No AML flags in this view.</p>
            </div>
          ) : (
            flags.map((flag) => {
              const diffHours = (new Date(flag.createdAt).getTime() + (TMS_STR_FILING_SLA_HOURS * 60 * 60 * 1000) - Date.now()) / (1000 * 60 * 60);
              const isBreached = diffHours < 0;
              
              return (
                <button
                  key={flag.id}
                  className={`staff-conversation-row ${selectedFlagId === flag.id ? "selected" : ""}`}
                  onClick={() => setSelectedFlagId(flag.id)}
                >
                  <div className="row-header">
                    <strong>{flag.type.replaceAll("_", " ")}</strong>
                    <small className="date">{new Date(flag.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div className="row-preview">
                    <span className="subject">{flag.user.email}</span>
                    {flag.status === "PENDING_REVIEW" ? (
                      <span className={`status-pill ${isBreached ? "error" : "warning"}`}>
                        {isBreached ? "SLA Breached" : "Pending"}
                      </span>
                    ) : (
                      <StatusBadge status={flag.status} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="staff-queue-detail dispute-detail-panel">
          {selectedFlag ? (
            <FlagDetail flag={selectedFlag} onCloseFlag={closeFlag} isSubmitting={busy} />
          ) : (
            <div className="staff-inbox-empty">
              <ShieldAlert size={32} />
              <p>Select an AML flag to review.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: 'var(--text-muted)' }}>Tip: Use UP/DOWN arrows to navigate</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FlagDetail({ flag, onCloseFlag, isSubmitting }: { flag: TransactionFlag, onCloseFlag: any, isSubmitting: boolean }) {
  const [notes, setNotes] = useState("");
  const [strReference, setStrReference] = useState("");
  const [actionType, setActionType] = useState<"FILE" | "DISMISS" | null>(null);

  const renderSla = () => {
    if (flag.status !== "PENDING_REVIEW") return <StatusBadge status={flag.status} />;
    const deadline = new Date(flag.createdAt).getTime() + (TMS_STR_FILING_SLA_HOURS * 60 * 60 * 1000);
    const diffHours = (deadline - Date.now()) / (1000 * 60 * 60);
    if (diffHours < 0) return <span className="sla-indicator sla-breached">SLA Breached ({Math.abs(Math.floor(diffHours))}h ago)</span>;
    if (diffHours < 4) return <span className="sla-indicator sla-warning">SLA Critical: {Math.floor(diffHours)}h left</span>;
    return <span className="sla-indicator sla-ok">SLA: {Math.floor(diffHours)}h left</span>;
  };

  const renderFlagSpecificDetails = () => {
    const details = flag.details as any;
    switch (flag.type) {
      case "STRUCTURING":
        return (
          <div className="aml-specific-details structuring">
            <h4><RefreshCcw size={16} /> Structuring Detected</h4>
            <p>Multiple deposits immediately below the withholding threshold detected within a short window.</p>
            <div className="stat-grid">
              <div className="stat-box"><span>Transaction Count</span><strong>{details.count}</strong></div>
              <div className="stat-box"><span>Time Window</span><strong>{details.windowHours} Hours</strong></div>
            </div>
            <div className="flag-sub-list">
              <strong>Matched Transaction IDs:</strong>
              <ul>{details.matchedTransactionIds?.map((id: string) => <li key={id}>{id}</li>)}</ul>
            </div>
          </div>
        );
      case "VELOCITY":
        return (
          <div className="aml-specific-details velocity">
            <h4><TrendingUp size={16} /> High Velocity</h4>
            <p>Abnormal milestone completion frequency detected for this freelancer.</p>
            <div className="stat-grid">
              <div className="stat-box"><span>Milestones Released</span><strong>{details.releaseCount}</strong></div>
              <div className="stat-box"><span>Time Window</span><strong>{details.windowHours} Hours</strong></div>
            </div>
          </div>
        );
      case "PASS_THROUGH":
        return (
          <div className="aml-specific-details passthrough">
            <h4><AlertTriangle size={16} /> Pass-Through Risk</h4>
            <p>Funds released and nearly fully withdrawn shortly after with no other active contracts.</p>
            <div className="stat-grid">
              <div className="stat-box"><span>Withdrawal Amount</span><strong>ETB {(details.withdrawalAmountMinor / 100).toFixed(2)}</strong></div>
              <div className="stat-box"><span>Related Milestone ID</span><strong>{details.relatedMilestoneId}</strong></div>
            </div>
          </div>
        );
      case "WALLET_MISMATCH":
        return (
          <div className="aml-specific-details mismatch">
            <h4><Smartphone size={16} /> Wallet Mismatch</h4>
            <p>Withdrawal destination phone number does not match the registered KYC identity phone.</p>
            <div className="comparison-box">
              <div className="comp-side">
                <span>Registered Identity Phone:</span>
                <strong className="text-success">{details.registeredPhone}</strong>
              </div>
              <div className="comp-side">
                <span>Attempted Payout Phone:</span>
                <strong className="text-danger">{details.payoutAccountIdentifier}</strong>
              </div>
            </div>
          </div>
        );
      default:
        return <pre className="raw-details">{JSON.stringify(flag.details, null, 2)}</pre>;
    }
  };

  const handleAction = () => {
    if (!actionType) return;
    onCloseFlag(flag.id, actionType, notes, strReference);
  };

  return (
    <div className="dispute-detail-scroll aml-detail-scroll">
      <div className="dispute-detail-header aml-detail-header">
        <div className="header-top">
          <h3>{flag.type.replaceAll("_", " ")} Review</h3>
          {renderSla()}
        </div>
        <p className="eyebrow">User: {flag.user.email} (UCID: {flag.user.ucid})</p>
      </div>

      <div className="aml-grid-layout">
        <div className="aml-col-main">
          <section className="dispute-section">
            {renderFlagSpecificDetails()}
          </section>

          {flag.status === "PENDING_REVIEW" ? (
            <section className="dispute-resolution-section aml-resolution">
              <h4>Compliance Action Required</h4>
              
              <div className="outcome-selector aml-selector">
                <button className={`btn-outline ${actionType === "DISMISS" ? "active" : ""}`} onClick={() => setActionType("DISMISS")}>
                  <X size={15} /> Dismiss Flag (False Positive)
                </button>
                <button className={`btn-outline error ${actionType === "FILE" ? "active" : ""}`} onClick={() => setActionType("FILE")}>
                  <FileWarning size={15} /> File Official STR
                </button>
              </div>

              {actionType && (
                <div className="resolution-rationale">
                  {actionType === "FILE" && (
                    <div className="str-input-group">
                      <label>Official STR Reference Number (From FIC) *</label>
                      <input 
                        type="text" 
                        value={strReference} 
                        onChange={e => setStrReference(e.target.value)} 
                        placeholder="e.g. FIC-2026-98234"
                      />
                    </div>
                  )}
                  
                  <label>Compliance Review Notes *</label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder={`Explain the rationale for ${actionType === "FILE" ? "filing this STR" : "dismissing this flag"}. This is permanently recorded for regulatory audit.`}
                    rows={4}
                  />
                  
                  <button 
                    className="btn-primary confirm-btn" 
                    disabled={notes.trim().length < 10 || (actionType === "FILE" && strReference.trim().length < 3) || isSubmitting}
                    onClick={handleAction}
                    style={{ marginTop: '1rem' }}
                  >
                    {isSubmitting ? "Finalizing..." : `Confirm ${actionType === "FILE" ? "STR Filing" : "Dismissal"}`}
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="dispute-section">
              <h4>Review Details</h4>
              <p><strong>Action:</strong> {flag.status}</p>
              {flag.strReferenceNumber && <p><strong>STR Ref:</strong> {flag.strReferenceNumber}</p>}
              <p><strong>Notes:</strong> {flag.reviewNotes}</p>
              <p><strong>Reviewed By:</strong> {flag.reviewedByStaffId}</p>
            </section>
          )}
        </div>

        <div className="aml-col-sidebar">
          <section className="dispute-section history-section">
            <h4><History size={16} /> User Compliance History</h4>
            <div className="history-summary">
              <div className="hist-row"><span>KYC Status</span><strong className="status-pill">{flag.user.kyc?.status || "UNKNOWN"}</strong></div>
              <div className="hist-row"><span>KYC Tier</span><strong>{flag.user.kyc?.tier?.replace("_", " ") || "UNKNOWN"}</strong></div>
              <div className="hist-row"><span>Total Balance</span><strong>ETB {((flag.user.wallet?.balanceMinor || 0)/100).toLocaleString()}</strong></div>
            </div>
            
            <div className="past-flags">
              <h5>Past Flags</h5>
              {flag.user.transactionFlags && flag.user.transactionFlags.length > 1 ? (
                flag.user.transactionFlags.filter((f: any) => f.id !== flag.id).map((f: any) => (
                  <div key={f.id} className={`past-flag-item ${f.status === "STR_FILED" ? "severe" : ""}`}>
                    <div className="pf-top"><strong>{f.type}</strong><span>{new Date(f.createdAt).toLocaleDateString()}</span></div>
                    <div className="pf-bottom"><span>Status: {f.status}</span></div>
                  </div>
                ))
              ) : (
                <p className="empty-state" style={{margin:0, padding:'8px'}}>No prior flags on record.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
