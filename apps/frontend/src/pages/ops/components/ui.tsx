/* ────────────────────────────────────────────────────────────────────────
   ui.tsx — shared presentational primitives for the Operations Console.
   All class names are scoped under .ops-root by ops-console.css.
   ──────────────────────────────────────────────────────────────────────── */

import { createContext, useContext, useEffect } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  TriangleAlert,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmt } from "../opsApi";
import type { Rail as RailT } from "../opsTypes";
import { Sparkline } from "./charts";

/* ── toast ─ */
export const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/* ── hotkeys ── */
export const isTyping = () =>
  ["INPUT", "TEXTAREA", "SELECT"].includes(
    (document.activeElement as HTMLElement | null)?.tagName ?? "",
  );
export function useHotkeys(
  handler: (e: KeyboardEvent) => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler, active]);
}
export const stopKey = (e: ReactKeyboardEvent) => e.stopPropagation();

/* ── status pills (text-first) ── */
const PILL: Record<string, string> = {
  ACTIVE: "p-green", CONFIRMED: "p-green", MATCHED: "p-green", SUCCESS: "p-green",
  VERIFIED: "p-green", RELEASED: "p-green", COMPLETED: "p-green", RESOLVED: "p-green",
  ESCROW_HELD: "p-sky", WORK_IN_PROGRESS: "p-sky", WALLET_TOPUP: "p-sky",
  PENDING: "p-amber", PROCESSING: "p-amber", SUBMITTED_FOR_REVIEW: "p-amber",
  OPEN: "p-amber", UNDER_REVIEW: "p-amber", STAGE_1_NEGOTIATION: "p-amber",
  HIGH: "p-amber", RESOLVED_PROFILE_HIDDEN: "p-amber", DISPUTE_REFUND: "p-amber",
  REVIEWING: "p-violet", STAGE_3_MEDIATION: "p-violet", BOTH: "p-violet",
  SUPER_ADMIN: "p-violet", WITHDRAWAL_PAYOUT: "p-violet",
  STAGE_2_EVIDENCE: "p-blue", MEDIUM: "p-blue", FREELANCER: "p-blue",
  ESCROW_FUND: "p-blue", OPERATIONS_ADMIN: "p-blue",
  FAILED: "p-red", SUSPENDED: "p-red", TERMINATED: "p-red", MISMATCH: "p-red",
  DISPUTED: "p-red", CRITICAL: "p-red", REJECTED: "p-red", RESOLVED_PROFILE_BANNED: "p-red",
  CANCELLED: "p-gray", REFUNDED: "p-gray", NONE: "p-gray",
  RESOLVED_NO_ACTION: "p-gray", ADMIN: "p-gray",
  CLIENT: "p-green", FINANCE_ADMIN: "p-green", MILESTONE_RELEASE: "p-green", LOW: "p-green",
  SUPPORT: "p-amber", COMPLIANCE_ADMIN: "p-sky", DISPUTE_MEDIATOR: "p-violet",
};
export function Pill({ s }: { s: string }) {
  return (
    <span className={`pill ${PILL[s] ?? "p-gray"}`}>
      <span className="pdot" />
      {s.replace(/_/g, " ")}
    </span>
  );
}

export function Rail({ p }: { p: RailT | string }) {
  return (
    <span className={`rail ${p === "TELEBIRR" ? "rail-tele" : "rail-cbe"}`}>
      <i />
      {p}
    </span>
  );
}

export function SlaBadge({ h }: { h: number }) {
  // h === Infinity means the case carries no mediation deadline at all.
  if (!Number.isFinite(h))
    return <span className="sla ok">● No SLA deadline</span>;
  if (h < 0)
    return <span className="sla breach">● SLA breached {Math.abs(h)}h ago</span>;
  if (h < 24) return <span className="sla warn">● SLA due in {h}h</span>;
  return <span className="sla ok">● SLA due in {Math.floor(h / 24)}d</span>;
}

/* ── layout bits ── */
export function PageHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub: string;
  right?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      {right}
    </div>
  );
}

export function SecTitle({
  icon: Icon,
  children,
  right,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="sec-title">
      {Icon ? <Icon size={16} /> : null}
      <span style={{ flex: 1 }}>{children}</span>
      {right}
    </div>
  );
}

export function Banner({
  tone,
  icon: Icon,
  strong,
  rest,
}: {
  tone: "b-amber" | "b-green" | "b-red" | "b-blue";
  icon: LucideIcon;
  strong: string;
  rest: string;
}) {
  return (
    <div className={`banner ${tone}`}>
      <span className="banner-ic">
        <Icon size={18} />
      </span>
      <div>
        <b>{strong}</b> {rest}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  trendValue,
  spark,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend?: "up" | "dn";
  trendValue?: string;
  spark?: number[];
}) {
  return (
    <div className="card stat">
      {trend ? (
        <span className={`stat-t ${trend === "up" ? "t-up" : "t-dn"}`}>
          {trend === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {trendValue}
        </span>
      ) : null}
      <div className="stat-ic" style={{ color }}>
        <Icon size={20} />
      </div>
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
      {spark ? <Sparkline data={spark} color={color} /> : null}
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  label,
  humanise = true,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Values excluding the "all" entry. */
  options: readonly string[];
  allLabel: string;
  label?: string;
  humanise?: boolean;
}) {
  return (
    <select
      className="sel"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>{humanise ? o.replace(/_/g, " ") : o}</option>
      ))}
    </select>
  );
}

export function OpsTable({
  heads,
  foot,
  children,
}: {
  heads: string[];
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {heads.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {foot}
    </div>
  );
}

export function Pager({
  page = 1,
  pages = 1,
  total = 0,
  onPage,
  unit = "records",
}: {
  page?: number;
  pages?: number;
  total?: number;
  onPage?: (p: number) => void;
  unit?: string;
}) {
  /* With no handler the pager is read-only (some pages hold one page of data). */
  const canNav = typeof onPage === "function" && pages > 1;
  return (
    <div className="pager">
      <span>
        Page {page} of {pages} · {total.toLocaleString()} {unit}
      </span>
      <div className="pager-btns">
        <button
          className="btn btn-ghost btn-sm"
          disabled={!canNav || page <= 1}
          onClick={() => onPage?.(page - 1)}
        >
          ← Prev
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={!canNav || page >= pages}
          onClick={() => onPage?.(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function Kv({
  k,
  v,
  warn,
  children,
}: {
  k: string;
  v?: ReactNode;
  warn?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="kv">
      <div className="kv-k">{k}</div>
      <div className="kv-v" style={warn ? { color: "var(--ops-red)" } : undefined}>
        {v ?? children}
      </div>
    </div>
  );
}

export function Empty({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={30} style={{ color: "#c3ccdb" }} />
      <p style={{ marginTop: 10, fontWeight: 600 }}>{children}</p>
    </div>
  );
}

export function ErrorBox({ error, reload }: { error: string; reload: () => void }) {
  return (
    <div className="banner b-red">
      <span className="banner-ic">
        <XCircle size={18} />
      </span>
      <div>
        <b>Could not load data.</b> {error}{" "}
        <button className="btn btn-ghost btn-sm" onClick={reload}>Retry</button>
      </div>
    </div>
  );
}

export function LoadingBox() {
  return (
    <div className="card" style={{ padding: 48, textAlign: "center" }}>
      <span className="pill p-sky">
        <span className="pdot" />
        <Clock size={13} /> loading…
      </span>
    </div>
  );
}

export function ChecksRow({
  faydaA,
  faydaS,
  pep,
  dup,
}: {
  faydaA: boolean;
  faydaS: boolean;
  pep: boolean;
  dup: boolean;
}) {
  return (
    <div className="checks">
      {faydaA ? (
        faydaS ? (
          <span className="check pass"><CheckCircle2 size={15} /> Fayda Verified</span>
        ) : (
          <span className="check fail"><XCircle size={15} /> Fayda Failed</span>
        )
      ) : (
        <span className="check none"><Clock size={15} /> Fayda Unattempted</span>
      )}
      {pep ? <span className="check fail"><TriangleAlert size={15} /> PEP Match</span> : null}
      {dup ? <span className="check fail"><TriangleAlert size={15} /> Duplicate Flag</span> : null}
      {!pep && !dup ? <span className="check pass"><CheckCircle2 size={15} /> No AML flags</span> : null}
    </div>
  );
}

export const fmtEscrow = (amt: number) => fmt(amt);
