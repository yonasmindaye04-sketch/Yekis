import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Receipt,
  RefreshCw,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
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

  if (loading && !data) return <p className="oc-empty">Compiling reports…</p>;
  if (error) return <p className="oc-empty" style={{ color: "var(--oc-red)" }}>{error}</p>;
  if (!data) return null;

  const kv = (k: string, v: string | number, warn = false) => (
    <div key={k} className="oc-kv">
      <div className="oc-kv-k">{k}</div>
      <div className="oc-kv-v" style={warn && Number(v) > 0 ? { color: "var(--oc-red)" } : undefined}>{v}</div>
    </div>
  );

  return (
    <div className="oc-fade">
      <div className="oc-page-head">
        <div>
          <div className="oc-page-title">Reports</div>
          <div className="oc-page-sub">Financial and marketplace analytics · generated {new Date(data.generatedAt).toLocaleString()}</div>
        </div>
        <button className="oc-btn oc-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "fa-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="oc-sec-title">Financial</div>
      <div className="oc-grid oc-g4" style={{ marginBottom: 24 }}>
        {kv("Transaction Volume", fmt(data.financial.transactionVolumeMinor))}
        {kv("Released Funds", fmt(data.financial.releasedFundsMinor))}
        {kv("Refunded Funds", fmt(data.financial.refundedFundsMinor))}
        {kv("Payouts", fmt(data.financial.payoutsMinor))}
        {kv("Platform Fees", fmt(data.financial.platformFeesMinor))}
        {kv("WH Tax Accrued", fmt(data.financial.withholdingMinor))}
        {kv("Failed Payments", data.financial.failedPaymentCount, true)}
        {kv("Failed Payouts", data.financial.failedPayoutCount, true)}
      </div>

      <div className="oc-sec-title">Marketplace</div>
      <div className="oc-grid oc-g5" style={{ marginBottom: 24 }}>
        {kv("Clients", data.marketplace.clientCount.toLocaleString())}
        {kv("Freelancers", data.marketplace.freelancerCount.toLocaleString())}
        {kv("Total Contracts", data.marketplace.totalContracts.toLocaleString())}
        {kv("Open Disputes", data.marketplace.openDisputes, true)}
        {kv("Open Risk Flags", data.marketplace.openRiskFlags, true)}
      </div>

      <div className="oc-card oc-card-pad">
        <div className="oc-sec-title">Contracts by Status</div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          {Object.entries(data.marketplace.contractsByStatus).map(([s, n]) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`oc-pill ${statusTone(s)}`}><span className="oc-pdot"></span>{s.replace(/_/g, " ")}</span>
              <b style={{ fontSize: 15 }}>{n.toLocaleString()}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Text-first status tone mapping shared by ops pages. */
export function statusTone(s: string): string {
  switch (s) {
    case "ACTIVE": case "CONFIRMED": case "MATCHED": case "SUCCESS": case "VERIFIED":
    case "RELEASED": case "COMPLETED": case "RESOLVED": case "OPEN": return "oc-p-green";
    case "ESCROW_HELD": case "WORK_IN_PROGRESS": return "oc-p-sky";
    case "PENDING": case "PROCESSING": case "SUBMITTED_FOR_REVIEW": case "UNDER_REVIEW": return "oc-p-amber";
    case "REVIEWING": return "oc-p-violet";
    case "STAGE_1_NEGOTIATION": return "oc-p-amber";
    case "STAGE_2_EVIDENCE": return "oc-p-blue";
    case "STAGE_3_MEDIATION": return "oc-p-violet";
    case "FAILED": case "SUSPENDED": case "TERMINATED": case "MISMATCH": case "DISPUTED":
    case "CRITICAL": case "REJECTED": return "oc-p-red";
    case "HIGH": return "oc-p-amber";
    case "MEDIUM": return "oc-p-blue";
    case "LOW": return "oc-p-green";
    default: return "oc-p-gray";
  }
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
    <div className="oc-fade">
      <div className="oc-page-head">
        <div>
          <div className="oc-page-title">Risk Flags</div>
          <div className="oc-page-sub">Transaction monitoring alerts from the TMS queue</div>
        </div>
        <button className="oc-btn oc-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "fa-spin" : ""} /> Refresh
        </button>
      </div>
      {error && <p className="oc-empty" style={{ color: "var(--oc-red)" }}>{error}</p>}
      {loading && items.length === 0 ? (
        <p className="oc-empty">Loading risk flags…</p>
      ) : items.length === 0 ? (
        <div className="oc-card"><p className="oc-empty">No risk flags pending review.</p></div>
      ) : (
        <div className="oc-card">
          <div className="oc-tbl-wrap">
            <table className="oc-tbl">
              <thead>
                <tr><th>Flag Type</th><th>Risk Level</th><th>Status</th><th>Detected</th></tr>
              </thead>
              <tbody>
                {items.map((f) => {
                  const level = RISK_LEVEL[f.type] ?? "LOW";
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="oc-cell-main">{f.type.replace(/_/g, " ")}</div>
                        <div className="oc-cell-sub oc-mono">{f.id}</div>
                      </td>
                      <td>
                        <span className={`oc-pill ${statusTone(level)}`}>
                          <span className="oc-pdot"></span>{level}
                        </span>
                      </td>
                      <td>
                        <span className={`oc-pill ${statusTone(f.status)}`}>
                          <span className="oc-pdot"></span>{f.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ color: "var(--oc-text-2)", fontSize: 12.5 }}>
                        {new Date(f.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    <div className="oc-fade">
      <div className="oc-page-head">
        <div>
          <div className="oc-page-title">System Health</div>
          <div className="oc-page-sub">Infrastructure checks and ledger integrity monitor</div>
        </div>
        <button className="oc-btn oc-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "fa-spin" : ""} /> Check Again
        </button>
      </div>
      {error && <p className="oc-empty" style={{ color: "var(--oc-red)" }}>{error}</p>}
      {!data ? <p className="oc-empty">Running health checks…</p> : (
        <>
          <div className="oc-grid oc-g5" style={{ marginBottom: 16 }}>
            {Object.entries(data.checks).map(([name, check]) => (
              <div key={name} className={`oc-card oc-health ${check.ok ? "oc-h-ok" : "oc-h-bad"}`}>
                <div className="oc-h-name">{name.replace(/_/g, " ")}</div>
                <div className="oc-h-state">
                  {check.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {check.ok ? "Healthy" : "Degraded"}
                </div>
                {check.detail && <div className="oc-h-detail">{check.detail}</div>}
              </div>
            ))}
          </div>
          <div className={`oc-banner ${data.ledger.isBalanced ? "oc-b-green" : "oc-b-red"}`}>
            <span className="oc-banner-ic">
              {data.ledger.isBalanced ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            </span>
            <div>
              <b>Ledger: {data.ledger.isBalanced ? "Balanced" : "MISMATCH"}</b>
              {" "}— debits {fmt(data.ledger.debitsMinor)} · credits {fmt(data.ledger.creditsMinor)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--oc-text-3)", marginTop: 4, fontWeight: 600 }}>
            Last checked {new Date(data.checkedAt).toLocaleString()}
          </div>
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

type ConsoleTab =
  | "OVERVIEW" | "SUPPORT" | "KYC" | "TOPUPS" | "DISPUTES" | "PROFILES"
  | "AUDIT" | "ADMINS" | "USERS" | "CONTRACTS" | "PAYMENTS" | "ESCROW"
  | "PAYOUTS" | "LEDGER" | "RECONCILIATION" | "REPORTS" | "RISK" | "MONITORING";

interface OverviewProps {
  onNavigate: (tab: ConsoleTab) => void;
  queueCounts: { kyc: number; topups: number; disputes: number };
  openSupportCount: number;
}

function relativeTime(value?: string): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AdminOverviewPage({ onNavigate, queueCounts, openSupportCount }: OverviewProps) {
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

  if (loading && !data) return <p className="oc-empty">Loading command center…</p>;
  if (error) return <p className="oc-empty" style={{ color: "var(--oc-red)" }}>{error}</p>;
  if (!data) return null;

  const m = data.metrics;

  const stat = (
    label: string,
    value: string | number,
    Icon: typeof Users,
    color: string,
    onClick?: () => void,
  ) => (
    <div
      key={label}
      className="oc-card oc-stat"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="oc-stat-ic" style={{ color }}>
        <Icon size={20} />
      </div>
      <div className="oc-stat-v">{value}</div>
      <div className="oc-stat-l">{label}</div>
    </div>
  );

  const actTone = (a: string): [string, typeof CreditCard] =>
    a.includes("PAYOUT") || a.includes("PAYMENT") ? ["var(--oc-green-text)", CreditCard]
    : a.includes("DISPUTE") || a.includes("RISK") ? ["var(--oc-red)", XCircle]
    : a.includes("ESCROW") ? ["var(--oc-sky)", DollarSign]
    : a.includes("KYC") || a.includes("IDENTITY") || a.includes("VERIFIED") ? ["var(--oc-violet)", ShieldCheck]
    : ["var(--oc-primary)", Activity];

  const queues: { tab: ConsoleTab; label: string; n: number; Icon: typeof Scale; c: string }[] = [
    { tab: "KYC",      label: "KYC Reviews",      n: queueCounts.kyc,      Icon: ShieldCheck,   c: "var(--oc-violet)" },
    { tab: "DISPUTES", label: "Dispute Mediation", n: queueCounts.disputes, Icon: Scale,        c: "var(--oc-red)" },
    { tab: "TOPUPS",   label: "Receipt Reviews",  n: queueCounts.topups,   Icon: Receipt,       c: "var(--oc-sky)" },
    { tab: "PAYOUTS",  label: "Review Payouts",   n: m.pendingPayouts,     Icon: Wallet,        c: "var(--oc-amber-text)" },
    { tab: "SUPPORT",  label: "Support Desk",     n: openSupportCount,     Icon: Activity,      c: "var(--oc-blue)" },
  ];

  return (
    <div className="oc-fade">
      <div className="oc-page-head">
        <div>
          <div className="oc-page-title">Command Center</div>
          <div className="oc-page-sub">Platform health, financial controls and staff review queues</div>
        </div>
        <button className="oc-btn oc-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "fa-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="oc-grid oc-g4" style={{ marginBottom: 16 }}>
        {stat("Total Users", m.totalUsers.toLocaleString(), Users, "var(--oc-primary)", () => onNavigate("USERS"))}
        {stat("Active Contracts", m.activeContracts, Briefcase, "var(--oc-blue)", () => onNavigate("CONTRACTS"))}
        {stat("Funds in Escrow", fmt(m.fundsInEscrowMinor), DollarSign, "var(--oc-green-text)", () => onNavigate("ESCROW"))}
        {stat("Pending Payouts", m.pendingPayouts, Wallet, "var(--oc-amber-text)", () => onNavigate("PAYOUTS"))}
      </div>
      <div className="oc-grid oc-g5" style={{ marginBottom: 24 }}>
        {stat("Open Disputes", m.openDisputes, Scale, "var(--oc-red)", () => onNavigate("DISPUTES"))}
        {stat("Pending KYC", m.pendingIdentity, ShieldCheck, "var(--oc-violet)", () => onNavigate("KYC"))}
        {stat("Support Tickets", m.openSupportTickets, Activity, "var(--oc-sky)", () => onNavigate("SUPPORT"))}
        {stat("Pending Payments", m.pendingPayments, CreditCard, "var(--oc-amber-text)", () => onNavigate("PAYMENTS"))}
        {stat("Pending Top-ups", m.pendingTopUps, Receipt, "var(--oc-blue)", () => onNavigate("TOPUPS"))}
      </div>

      <div className="oc-grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <div className="oc-card oc-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="oc-sec-title" style={{ margin: 0 }}>Recent Activity</div>
            <button className="oc-btn oc-btn-ghost oc-btn-sm" onClick={() => onNavigate("AUDIT")}>View all</button>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="oc-empty">No recent activity.</div>
          ) : (
            data.recentActivity.slice(0, 8).map((a) => {
              const [color, Icon] = actTone(a.action ?? a.eventType);
              return (
                <div key={a.id} className="oc-act-row">
                  <div className="oc-act-ic" style={{ color }}><Icon size={17} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="oc-act-t">{(a.action ?? a.eventType).replace(/_/g, " ")}</div>
                    <div className="oc-act-s">{a.entityType} · {relativeTime(a.createdAt)}</div>
                  </div>
                  <ChevronRight size={15} style={{ color: "var(--oc-text-3)" }} />
                </div>
              );
            })
          )}
        </div>

        <div className="oc-card oc-card-pad">
          <div className="oc-sec-title">Work Queues</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queues.map(({ tab, label, n, Icon, c }) => (
              <button key={tab} className="oc-qa-btn" onClick={() => onNavigate(tab)}>
                <span className="oc-qa-l">
                  <span className="oc-qa-ic" style={{ color: c }}><Icon size={16} /></span>
                  {label}
                </span>
                <span className="oc-qa-n" style={{ color: c }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}