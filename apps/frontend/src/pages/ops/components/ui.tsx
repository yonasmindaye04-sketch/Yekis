/* ────────────────────────────────────────────────────────────────────────
   ui.tsx — shared presentational primitives for the Operations Console.
   All class names are scoped under .ops-root by ops-console.css.
   ──────────────────────────────────────────────────────────────────────── */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  TriangleAlert,
  CheckCircle2,
  Clock,
  XCircle,
  LayoutList,
  Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmt } from "../opsApi";
import type { Rail as RailT } from "../opsTypes";
import { Sparkline } from "./charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Card as ShadcnCard } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ── button ──
   The shadcn primitive underneath, wearing the console's own `.ui-button`
   skin so every existing admin page keeps its current look. */
export function Button({
  variant = "default",
  size = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "icon";
}) {
  return (
    <ShadcnButton
      variant={variant}
      size={size}
      className={cn("ui-button", `ui-button-${variant}`, `ui-button-${size}`, className)}
      {...props}
    />
  );
}

/* ── card ──
   Same idea: the shadcn card carries the structure, `.card` keeps the
   console's panel styling. `--card-spacing: 0` neutralises the primitive's
   built-in padding so layouts are unchanged (see ops-console.css). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <ShadcnCard className={cn("card", className)} {...props} />;
}

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
  ACCEPTED: "p-green", TIER_2: "p-green", LIVE: "p-green", FILED: "p-green",
  POSTED: "p-green", RECONCILED: "p-green", PAID: "p-green",
  ESCROW_HELD: "p-sky", WORK_IN_PROGRESS: "p-sky", WALLET_TOPUP: "p-sky",
  SHORTLISTED: "p-sky", TIER_1: "p-sky", PARTIAL_RELEASE: "p-sky", FORCE_MATCHED: "p-sky",
  PENDING: "p-amber", PROCESSING: "p-amber", SUBMITTED_FOR_REVIEW: "p-amber",
  OPEN: "p-amber", UNDER_REVIEW: "p-amber", STAGE_1_NEGOTIATION: "p-amber",
  HIGH: "p-amber", RESOLVED_PROFILE_HIDDEN: "p-amber", DISPUTE_REFUND: "p-amber",
  SUBMITTED: "p-amber", PENDING_SIGNATURES: "p-amber", PENDING_FUNDING: "p-amber",
  PAYMENT_PENDING: "p-amber", PAUSED: "p-amber", AWAITING_REVIEW: "p-amber",
  ADMIN_HOLD: "p-amber", VARIANCE: "p-amber", FLAGGED: "p-amber", UNPAID: "p-amber",
  REVIEWING: "p-violet", STAGE_3_MEDIATION: "p-violet", BOTH: "p-violet",
  SUPER_ADMIN: "p-violet", WITHDRAWAL_PAYOUT: "p-violet",
  STAGE_2_EVIDENCE: "p-blue", MEDIUM: "p-blue", FREELANCER: "p-blue",
  ESCROW_FUND: "p-blue", OPERATIONS_ADMIN: "p-blue", ADJUSTED: "p-blue",
  FAILED: "p-red", SUSPENDED: "p-red", TERMINATED: "p-red", MISMATCH: "p-red",
  DISPUTED: "p-red", CRITICAL: "p-red", REJECTED: "p-red", RESOLVED_PROFILE_BANNED: "p-red",
  ESCALATED: "p-red", REVERSED: "p-red", OVERDUE: "p-red",
  CANCELLED: "p-gray", REFUNDED: "p-gray", NONE: "p-gray",
  RESOLVED_NO_ACTION: "p-gray", ADMIN: "p-gray", DRAFT: "p-gray",
  ARCHIVED: "p-gray", WITHDRAWN: "p-gray", TIER_0: "p-gray",
  CLIENT: "p-green", FINANCE_ADMIN: "p-green", MILESTONE_RELEASE: "p-green", LOW: "p-green",
  SUPPORT: "p-amber", COMPLIANCE_ADMIN: "p-sky", DISPUTE_MEDIATOR: "p-violet",
  RESOLVED_WARNED: "p-blue", RESOLVED_ACCOUNT_RESTRICTED: "p-violet",
  OFF_PLATFORM_CONTACT: "p-amber", IMPERSONATION: "p-red", FRAUD: "p-red",
  ABUSIVE_LANGUAGE: "p-amber", SPAM: "p-blue",
};

/**
 * Shared semantic status tone mapper reused across Ops Console and Freelancer workspaces.
 * Maps backend status codes to `.status-pill.{success|warning|error|info|neutral}` classes.
 */
export function statusTone(
  s: string | null | undefined,
): "success" | "warning" | "error" | "info" | "neutral" {
  if (!s) return "neutral";
  const key = s.toUpperCase().replace(/\s+/g, "_");
  const p = PILL[key];
  if (p === "p-green") return "success";
  if (p === "p-amber") return "warning";
  if (p === "p-red") return "error";
  if (p === "p-sky" || p === "p-blue" || p === "p-violet") return "info";
  return "neutral";
}

/**
 * Formats a backend status string using the active i18n workspace.statuses dictionary
 * when available, or falls back to clean human-readable casing.
 */
export function formatStatusLabel(
  s: string | null | undefined,
  statusesDict?: Record<string, string>,
): string {
  if (!s) return "—";
  const key = s.toUpperCase().replace(/\s+/g, "_");
  if (statusesDict && statusesDict[key]) {
    return statusesDict[key];
  }
  return s.replace(/_/g, " ");
}

/**
 * Statuses that must stand out in a queue: money or identity is at risk and
 * someone has to act on it within a SLA.
 */
const URGENT_STATUSES = new Set([
  "MISMATCH",
  "VARIANCE",
  "FAILED",
  "DISPUTED",
  "ADMIN_HOLD",
  "STAGE_3_MEDIATION",
  "STAGE_4_ARBITRATION",
  "ESCALATED",
  "CRITICAL",
  "HIGH",
  "SUSPENDED",
  "OVERDUE",
  "REVERSED",
  "FRAUD",
  "IMPERSONATION",
  "STRUCTURING",
  "WALLET_MISMATCH",
  "PASS_THROUGH",
  "VELOCITY",
  "VELOCITIES",
]);

export function isUrgentStatus(s: string | null | undefined): boolean {
  if (!s) return false;
  return URGENT_STATUSES.has(s.toUpperCase().replace(/\s+/g, "_"));
}

export function Pill({ s, dict }: { s: string; dict?: Record<string, string> }) {
  // Normalise before lookup: some endpoints hand back "stage 1 negotiation"
  // or "pending" rather than the SCREAMING_SNAKE enum, and an unnormalised
  // lookup silently rendered every such status as neutral grey.
  const key = (s || "").toUpperCase().replace(/\s+/g, "_");
  const urgent = isUrgentStatus(key);
  return (
    <Badge variant="outline" className={cn("pill", PILL[key] ?? PILL[s] ?? "p-gray")}>
      <span className={cn("pdot", urgent && "urgent")} />
      {formatStatusLabel(s, dict)}
    </Badge>
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
    <Alert className={cn("banner", tone)}>
      <span className="banner-ic">
        <Icon size={18} />
      </span>
      <AlertDescription>
        <AlertTitle>{strong}</AlertTitle> {rest}
      </AlertDescription>
    </Alert>
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
  onClick,
  active,
  title,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend?: "up" | "dn";
  trendValue?: string;
  spark?: number[];
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <Card
      className={cn(
        "card stat",
        onClick && "stat-clickable",
        active && "stat-active",
      )}
      onClick={onClick}
      title={title}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
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
    </Card>
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
  const items = useMemo(() => {
    const map: Record<string, string> = { "": allLabel };
    for (const o of options) map[o] = humanise ? o.replace(/_/g, " ") : o;
    /* A filter can briefly hold a value that is no longer in the option list
       (the data changed underneath it) — keep it selectable so the trigger
       never renders blank. */
    if (value && !(value in map)) map[value] = humanise ? value.replace(/_/g, " ") : value;
    return map;
  }, [options, allLabel, humanise, value]);

  const visible = useMemo(
    () => (value && !options.includes(value) ? [...options, value] : [...options]),
    [options, value],
  );

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange((v as string) ?? "")}
    >
      <SelectTrigger className="sel" aria-label={label}>
        <SelectValue>{items[value] ?? allLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="">{allLabel}</SelectItem>
        {visible.map((o) => (
          <SelectItem key={o} value={o}>
            {humanise ? o.replace(/_/g, " ") : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "table">("cards");
  const tableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    const tbl = tableRef.current;
    if (!tbl) return;
    const rows = tbl.querySelectorAll("tbody > tr");
    rows.forEach((tr) => {
      const cells = tr.querySelectorAll(":scope > td");
      if (cells.length === 1 && cells[0].hasAttribute("colspan")) return;
      cells.forEach((td, idx) => {
        if (heads[idx]) {
          td.setAttribute("data-label", heads[idx]);
        }
      });
    });
  }, [heads, children, mobileViewMode]);

  return (
    <Card className="card">
      <div className="ops-table-view-bar" role="group" aria-label="Mobile table layout">
        <span className="ops-table-view-label">Mobile View</span>
        <div className="ops-table-view-seg">
          <button
            type="button"
            className={`ops-view-btn ${mobileViewMode === "cards" ? "active" : ""}`}
            onClick={() => setMobileViewMode("cards")}
            aria-pressed={mobileViewMode === "cards"}
          >
            <LayoutList size={13} /> Cards
          </button>
          <button
            type="button"
            className={`ops-view-btn ${mobileViewMode === "table" ? "active" : ""}`}
            onClick={() => setMobileViewMode("table")}
            aria-pressed={mobileViewMode === "table"}
          >
            <Table2 size={13} /> Table
          </button>
        </div>
      </div>
      <div className={`tbl-wrap ${mobileViewMode === "cards" ? "ops-tbl-cards-mode" : "ops-tbl-scroll-mode"}`}>
        <table ref={tableRef} className="tbl">
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
    </Card>
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
        <Button
          variant="ghost"
          size="sm"
          disabled={!canNav || page <= 1}
          onClick={() => onPage?.(page - 1)}
        >
          ← Prev
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canNav || page >= pages}
          onClick={() => onPage?.(page + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

export function Kv({
  k,
  v,
  warn,
  onClick,
  active,
  title,
  children,
}: {
  k: string;
  v?: ReactNode;
  warn?: boolean;
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn("kv", onClick && "kv-clickable", active && "kv-active")}
      onClick={onClick}
      title={title}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="kv-k">
        <span>{k}</span>
        {onClick ? <ArrowUpRight size={11} className="kv-go" /> : null}
      </div>
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
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const EmptyIcon = Icon ?? TriangleAlert;
  return (
    <div className="empty">
      <EmptyIcon size={30} style={{ color: "var(--ops-text-3)" }} />
      <p style={{ marginTop: 10, fontWeight: 600 }}>{children}</p>
    </div>
  );
}

export function ErrorBox({ error, reload }: { error: string; reload: () => void }) {
  return (
    <Alert className="banner b-red">
      <span className="banner-ic">
        <XCircle size={18} />
      </span>
      <AlertDescription>
        <AlertTitle>Could not load data.</AlertTitle> {error}{" "}
        <Button variant="ghost" size="sm" onClick={reload}>Retry</Button>
      </AlertDescription>
    </Alert>
  );
}

export function LoadingBox() {
  return (
    <Card className="card" style={{ padding: 48, textAlign: "center" }}>
      <span className="pill p-sky">
        <span className="pdot" />
        <Clock size={13} /> loading…
      </span>
    </Card>
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

/**
 * Shared tabular ETB currency formatter for major-unit ETB values (e.g. 12500 -> "ETB 12,500").
 * Preserves decimals when non-integer or when `decimals` is true.
 */
export function formatEtbMajor(amount: number, decimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasCents = Math.abs(safe % 1) > 0.001;
  return `ETB ${safe.toLocaleString("en-US", {
    minimumFractionDigits: decimals || hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description?: string;
  amountEtb?: string;
  summaryRows?: Array<{ label: string; value: ReactNode }>;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  description,
  amountEtb,
  summaryRows,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="yk-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yk-confirm-title"
      onClick={() => !loading && onCancel()}
    >
      <div className="yk-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="yk-confirm-head">
          <h3 id="yk-confirm-title">{title}</h3>
          {amountEtb && <span className="yk-confirm-amount sh-mono">{amountEtb}</span>}
        </div>
        {description && <p className="yk-confirm-desc">{description}</p>}
        {summaryRows && summaryRows.length > 0 && (
          <div className="yk-confirm-summary">
            {summaryRows.map((row, idx) => (
              <div key={idx} className="yk-confirm-row">
                <span>{row.label}</span>
                <strong className="sh-mono">{row.value}</strong>
              </div>
            ))}
          </div>
        )}
        <div className="yk-confirm-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary ${tone === "danger" ? "yk-btn-danger" : ""}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface EscrowFeeBreakdownProps {
  grossEtb: number;
  feeRate?: number;
  compact?: boolean;
  labels?: {
    title?: string;
    grossLabel?: string;
    platformFeeLabel?: string;
    tinTaxLabel?: string;
    unverifiedTaxLabel?: string;
    netPayoutLabel?: string;
    escrowGuarantee?: string;
  };
}

export function EscrowFeeBreakdown({
  grossEtb,
  feeRate = 0.1,
  compact = false,
  labels,
}: EscrowFeeBreakdownProps) {
  const safeGross = Number.isFinite(grossEtb) && grossEtb > 0 ? grossEtb : 0;
  const platformFee = Math.round(safeGross * feeRate * 100) / 100;
  const tinTax = Math.round(safeGross * 0.03 * 100) / 100;
  const netWithTin = Math.max(0, Math.round((safeGross - platformFee - tinTax) * 100) / 100);

  return (
    <div className={`yk-fee-breakdown ${compact ? "compact" : ""}`}>
      <div className="yk-fee-breakdown-head">
        <strong>{labels?.title ?? "Escrow & Net Payout Breakdown"}</strong>
        <span className="status-pill info">Escrow Protected</span>
      </div>
      <div className="yk-fee-breakdown-rows">
        <div className="yk-fee-row">
          <span>{labels?.grossLabel ?? "Gross Amount"}</span>
          <strong className="sh-mono">{formatEtbMajor(safeGross)}</strong>
        </div>
        <div className="yk-fee-row">
          <span>
            {labels?.platformFeeLabel ??
              `Yekis Freelancer Fee (${Math.round(feeRate * 100)}%)`}
          </span>
          <span className="sh-mono">− {formatEtbMajor(platformFee)}</span>
        </div>
        <div className="yk-fee-row">
          <span>{labels?.tinTaxLabel ?? "Withholding Tax (3% Verified TIN)"}</span>
          <span className="sh-mono">− {formatEtbMajor(tinTax)}</span>
        </div>
        <div className="yk-fee-row total">
          <strong>{labels?.netPayoutLabel ?? "Estimated Net Payout (with TIN)"}</strong>
          <strong className="sh-mono yk-fee-net">{formatEtbMajor(netWithTin)}</strong>
        </div>
      </div>
      {!compact && (
        <p className="yk-fee-guarantee">
          {labels?.escrowGuarantee ??
            "100% funded in Yekis Escrow before work starts · 7-day auto-release after delivery (30% ERCA withholding applies only if TIN is unverified)."}
        </p>
      )}
    </div>
  );
}

