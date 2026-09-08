import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "./api/client";

// ================= REPORTS =================
interface ReportsData {
  financial: {
    transactionVolumeMinor: number;
    releasedFundsMinor: number;
    refundedFundsMinor: number;
    payoutsMinor: number;
    platformFeesMinor: number;
    withholdingMinor: number;
    failedPaymentCount: number;
    failedPayoutCount: number;
  };
  marketplace: {
    clientCount: number;
    freelancerCount: number;
    totalContracts: number;
    contractsByStatus: Record<string, number>;
    openDisputes: number;
    openRiskFlags: number;
  };
  generatedAt: string;
}

const fmt = (minor: number) => `ETB ${(minor / 100).toLocaleString()}`;

export function AdminReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData((await api.adminReportsSummary()) as ReportsData); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load reports"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <p className="empty-state">Compiling reports…</p>;
  if (error) return <p className="single-chat-error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button className="btn-secondary" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
      </div>
      <h3 style={{ margin: "0 0 8px" }}>Financial</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          ["Transaction volume", fmt(data.financial.transactionVolumeMinor)],
          ["Released funds", fmt(data.financial.releasedFundsMinor)],
          ["Refunded funds", fmt(data.financial.refundedFundsMinor)],
          ["Payouts", fmt(data.financial.payoutsMinor)],
          ["Platform fees", fmt(data.financial.platformFeesMinor)],
          ["WH tax accrued", fmt(data.financial.withholdingMinor)],
          ["Failed payments", String(data.financial.failedPaymentCount)],
          ["Failed payouts", String(data.financial.failedPayoutCount)],
        ].map(([k, v]) => (
          <div key={k} className="panel" style={{ padding: 12 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{k}</p>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <h3 style={{ margin: "0 0 8px" }}>Marketplace</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          ["Clients", String(data.marketplace.clientCount)],
          ["Freelancers", String(data.marketplace.freelancerCount)],
          ["Total contracts", String(data.marketplace.totalContracts)],
          ["Open disputes", String(data.marketplace.openDisputes)],
          ["Open risk flags", String(data.marketplace.openRiskFlags)],
        ].map(([k, v]) => (
          <div key={k} className="panel" style={{ padding: 12 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{k}</p>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <p className="eyebrow">Contracts by status</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
          {Object.entries(data.marketplace.contractsByStatus).map(([s, n]) => (
            <span key={s}><span className="status-pill">{s}</span> {n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= RISK =================
interface RiskFlag {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  details: Record<string, unknown>;
}

const RISK_LEVEL: Record<string, string> = {
  STRUCTURING: "HIGH",
  VELOCITY: "HIGH",
  ROUND_AMOUNTS: "MEDIUM",
  PASS_THROUGH: "HIGH",
  WALLET_MISMATCH: "CRITICAL",
  STAFF_FLAGGED: "MEDIUM",
  VAT_THRESHOLD_REACHED: "LOW",
};

export function AdminRiskPage() {
  const [items, setItems] = useState<RiskFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.getTmsQueue({ pageSize: 50 }) as { items: RiskFlag[] };
      setItems(res.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load risk flags");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading risk flags…</p> : items.length === 0 ? <p className="empty-state">No risk flags pending review.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Flag type</th>
                <th style={{ padding: "8px" }}>Risk level</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Detected</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px" }}>{f.type}</td>
                  <td style={{ padding: "8px" }}>
                    <span className="status-pill" style={{
                      background: RISK_LEVEL[f.type] === "CRITICAL" ? "#dc2626"
                        : RISK_LEVEL[f.type] === "HIGH" ? "#d97706"
                        : RISK_LEVEL[f.type] === "MEDIUM" ? "#2563eb" : "#16a34a",
                      color: "#fff",
                    }}>{RISK_LEVEL[f.type] ?? "LOW"}</span>
                  </td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{f.status}</span></td>
                  <td style={{ padding: "8px" }}>{new Date(f.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ================= MONITORING =================
interface HealthData {
  checks: Record<string, { ok: boolean; detail?: string }>;
  ledger: { debitsMinor: number; creditsMinor: number; isBalanced: boolean };
  checkedAt: string;
}

export function AdminMonitoringPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData((await api.adminSystemHealth()) as HealthData); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to fetch health"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Check again</button>
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {!data ? <p className="empty-state">Running health checks…</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {Object.entries(data.checks).map(([name, check]) => (
              <div key={name} className="panel" style={{ padding: 12 }}>
                <p className="eyebrow" style={{ margin: 0 }}>{name}</p>
                <strong style={{ color: check.ok ? "#16a34a" : "#dc2626" }}>{check.ok ? "Healthy" : "Degraded"}</strong>
                {!check.ok && check.detail && <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{check.detail}</p>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: data.ledger.isBalanced ? "#16a34a1a" : "#dc26261a" }}>
            Ledger: {data.ledger.isBalanced ? "Balanced" : "MISMATCH"} — debits {fmt(data.ledger.debitsMinor)} · credits {fmt(data.ledger.creditsMinor)}
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>Last checked {new Date(data.checkedAt).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}

// ================= OVERVIEW =================
interface DashboardData {
  metrics: {
    totalUsers: number;
    activeContracts: number;
    fundsInEscrowMinor: number;
    pendingPayouts: number;
    openDisputes: number;
    pendingIdentity: number;
    openSupportTickets: number;
    pendingPayments: number;
    pendingTopUps: number;
  };
  recentActivity: { id: string; eventType: string; action: string | null; entityType: string; createdAt: string; actorRole: string | null }[];
}

export function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData((await api.adminDashboardSummary()) as DashboardData); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load dashboard"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <p className="empty-state">Loading command center…</p>;
  if (error) return <p className="single-chat-error">{error}</p>;
  if (!data) return null;

  const m = data.metrics;
  const metrics = [
    ["Total users", m.totalUsers, null],
    ["Active contracts", m.activeContracts, null],
    ["Funds in escrow", `ETB ${(m.fundsInEscrowMinor / 100).toLocaleString()}`, "financial"],
    ["Pending payouts", m.pendingPayouts, null],
    ["Open disputes", m.openDisputes, "danger"],
    ["Pending identity", m.pendingIdentity, null],
    ["Open support", m.openSupportTickets, null],
    ["Pending payments", m.pendingPayments, null],
    ["Pending top-ups", m.pendingTopUps, null],
  ] as const;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
        {metrics.map(([k, v, tone]) => (
          <div key={k} className="panel" style={{ padding: 14 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{k}</p>
            <strong style={{ fontSize: "1.3rem", color: tone === "danger" && Number(v) > 0 ? "#dc2626" : undefined }}>
              {v}
            </strong>
          </div>
        ))}
      </div>

      <h3 style={{ margin: "0 0 8px" }}>Recent activity</h3>
      {data.recentActivity.length === 0 ? <p className="empty-state">No recent activity.</p> : (
        <div className="panel" style={{ padding: "4px 12px" }}>
          {data.recentActivity.map((a) => (
            <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span className="status-pill">{a.action ?? a.eventType}</span>
              <span style={{ marginLeft: 8, fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                {a.entityType} · {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}