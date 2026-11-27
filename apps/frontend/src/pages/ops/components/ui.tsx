/* ────────────────────────────────────────────────────────────────────────
   ui.tsx — shared presentational primitives for the Operations Console.
   All class names are scoped under .ops-root by ops-console.css.
   ──────────────────────────────────────────────────────────────────────── */

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
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
  X,
  XCircle,
  LayoutList,
  Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmt } from "../opsApi";
import type { Rail as RailT } from "../opsTypes";
import { Sparkline } from "./charts";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar";
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
  SENDING: "p-sky", SENT: "p-green", PARTIAL: "p-amber",
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
  // or "pending" rather than the SCREAMING_SNAKE enum.
  // Renders as bold colored text only — no background, border, or dot (docs/rule.md §2).
  const key = (s || "").toUpperCase().replace(/\s+/g, "_");
  const urgent = isUrgentStatus(key);
  return (
    <span className={cn("pill", PILL[key] ?? PILL[s] ?? "p-gray")}>
      {urgent ? <TriangleAlert size={12} aria-hidden="true" /> : null}
      {formatStatusLabel(s, dict)}
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

export function SlaBadge({
  h,
  sla,
}: {
  h: number;
  sla?: {
    firstResponse: { breached: boolean; remainingMinutes: number; metAt: string | null };
    resolution: { breached: boolean; remainingMinutes: number; metAt: string | null };
    breached: boolean;
  } | null;
}) {
  // When the API returned server-computed SLA state, render that. It is the
  // same number the reporting endpoint counts, so the badge and the report
  // cannot disagree.
  if (sla) {
    if (sla.breached) {
      const clock = sla.firstResponse.breached ? sla.firstResponse : sla.resolution;
      const which = sla.firstResponse.breached ? "no first response" : "unresolved";
      return (
        <span className="sla breach">
          ● {which} for {Math.floor(Math.abs(clock.remainingMinutes) / 60)}h
        </span>
      );
    }
    const clock = sla.firstResponse.metAt ? sla.resolution : sla.firstResponse;
    if (clock.metAt) return <span className="sla ok">● SLA met</span>;
    const hours = Math.max(0, Math.floor(clock.remainingMinutes / 60));
    if (hours < 24)
      return <span className="sla warn">● SLA due in {hours}h</span>;
    return <span className="sla ok">● SLA due in {Math.floor(hours / 24)}d</span>;
  }

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
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{sub}</p>
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
  const variant =
    tone === "b-red"
      ? "destructive"
      : tone === "b-amber"
      ? "warning"
      : tone === "b-green"
      ? "success"
      : "info";

  const fallbackBg =
    tone === "b-red"
      ? "bg-destructive dark:bg-destructive/60"
      : tone === "b-amber"
      ? "bg-amber-600 dark:bg-amber-600/80"
      : tone === "b-green"
      ? "bg-emerald-600 dark:bg-emerald-600/80"
      : "bg-sky-600 dark:bg-sky-600/80";

  return (
    <Alert variant={variant} className={cn("flex items-center gap-2.5 mb-3", tone)}>
      <Avatar className="size-6 rounded-[5px] shrink-0">
        <AvatarFallback className={cn("rounded-[5px] text-white", fallbackBg)}>
          <Icon className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <AlertTitle className="inline font-semibold">{strong}</AlertTitle>{" "}
        <span className="text-xs text-muted-foreground">{rest}</span>
      </div>
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
      <div
        className={`tbl-wrap ${mobileViewMode === "cards" ? "ops-tbl-cards-mode" : "ops-tbl-scroll-mode"}`}
        tabIndex={0}
        role="region"
        aria-label="Operations data table"
      >
        <table ref={tableRef} className="tbl sh-data-table">
          <thead>
            <tr>
              {heads.map((h) => (
                <th key={h} scope="col">{h}</th>
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
    <Alert variant="destructive" className="flex items-center gap-2.5 mb-3 b-red">
      <Avatar className="size-6 rounded-[5px] shrink-0">
        <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
          <XCircle className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <AlertTitle className="inline font-semibold">Could not load data.</AlertTitle>{" "}
        <span className="text-xs text-muted-foreground">{error}</span>
      </div>
      {reload && (
        <Button variant="ghost" size="sm" onClick={reload} className="shrink-0">
          Retry
        </Button>
      )}
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
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    } else if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      if (loading) {
        e.preventDefault();
      }
    };
    const handleClose = () => {
      dialog.returnValue = "";
      if (!loading) onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    const supportsClosedBy =
      typeof HTMLDialogElement !== "undefined" &&
      "closedBy" in HTMLDialogElement.prototype;
    if (supportsClosedBy) {
      return () => {
        dialog.removeEventListener("cancel", handleCancel);
        dialog.removeEventListener("close", handleClose);
      };
    }

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open && !loading) {
        dialog.close();
      }
      pressedOutside = false;
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [loading, onCancel]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="yk-confirm-native-dialog"
      aria-labelledby={titleId}
      {...(!loading ? ({ closedby: "any" } as Record<string, string>) : {})}
    >
      <div className="yk-confirm-dialog">
        <div className="yk-confirm-head">
          <h3 id={titleId}>{title}</h3>
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
            autoFocus={tone === "danger" || tone === "warning"}
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
    </dialog>
  );
}

export interface EscrowFeeBreakdownProps {
  grossEtb: number;
  viewerRole?: "CLIENT" | "FREELANCER" | "ADMIN";
  /** Platform commission. Defaults to the backend's PLATFORM_FEE_RATE_FREELANCER. */
  feeRate?: number;
  /** Payment/disbursement provider fee. Defaults to PAYMENT_PROVIDER_FEE_RATE. */
  providerFeeRate?: number;
  compact?: boolean;
  labels?: {
    title?: string;
    grossLabel?: string;
    platformFeeLabel?: string;
    providerFeeLabel?: string;
    clientFeeLabel?: string;
    clientTotalLabel?: string;
    clientFeeNote?: string;
    tinTaxLabel?: string;
    unverifiedTaxLabel?: string;
    netPayoutLabel?: string;
    escrowGuarantee?: string;
  };
}

/**
 * Role-aware escrow & fee split.
 *
 * Clients pay ETB 0 in platform fees; platform commission and provider fees
 * are deducted from the freelancer payout on release.
 */
export function EscrowFeeBreakdown({
  grossEtb,
  viewerRole = "FREELANCER",
  feeRate = 0.07,
  providerFeeRate = 0.005,
  compact = false,
  labels,
}: EscrowFeeBreakdownProps) {
  const safeGross = Number.isFinite(grossEtb) && grossEtb > 0 ? grossEtb : 0;
  const isClientView = viewerRole === "CLIENT";
  const platformFee = Math.round(safeGross * feeRate * 100) / 100;
  const providerFee = Math.round(safeGross * providerFeeRate * 100) / 100;
  const totalFee = platformFee + providerFee;
  const netPayout = Math.max(0, Math.round((safeGross - totalFee) * 100) / 100);

  return (
    <div className={`yk-fee-breakdown ${compact ? "compact" : ""}`}>
      <div className="yk-fee-breakdown-head">
        <strong>{labels?.title ?? "Escrow & Fee Breakdown"}</strong>
        <span className="sh-status-inline emerald">
          <CheckCircle2 size={13} />
          <span>Escrow Protected</span>
        </span>
      </div>
      <div className="yk-fee-breakdown-rows">
        <div className="yk-fee-row">
          <span>{labels?.grossLabel ?? "Gross Amount"}</span>
          <strong className="sh-mono">{formatEtbMajor(safeGross)}</strong>
        </div>
        {isClientView ? (
          <>
            <div className="yk-fee-row">
              <span>{labels?.clientFeeLabel ?? "Client Fee"}</span>
              <span className="sh-mono">{formatEtbMajor(0)}</span>
            </div>
            <div className="yk-fee-row total">
              <strong>{labels?.clientTotalLabel ?? "Total Client Charge"}</strong>
              <strong className="sh-mono yk-fee-net">{formatEtbMajor(safeGross)}</strong>
            </div>
            <p className="sh-cell-meta" style={{ margin: "6px 0 0" }}>
              {labels?.clientFeeNote ??
                "Platform fees are paid by the freelancer. You pay ETB 0 in fees."}
            </p>
          </>
        ) : (
          <>
            <div className="yk-fee-row">
              <span>
                {labels?.platformFeeLabel ??
                  `Yekis Fee (${Math.round(feeRate * 100)}%)`}
              </span>
              <span className="sh-mono">− {formatEtbMajor(platformFee)}</span>
            </div>
            <div className="yk-fee-row">
              <span>
                {labels?.providerFeeLabel ??
                  `Payment Fee (${(providerFeeRate * 100).toFixed(1).replace(/\.0$/, "")}%)`}
              </span>
              <span className="sh-mono">− {formatEtbMajor(providerFee)}</span>
            </div>
            <div className="yk-fee-row total">
              <strong>{labels?.netPayoutLabel ?? "Estimated Net Payout"}</strong>
              <strong className="sh-mono yk-fee-net">{formatEtbMajor(netPayout)}</strong>
            </div>
          </>
        )}
      </div>
      {!compact && (
        <p className="yk-fee-guarantee">
          {labels?.escrowGuarantee ??
            "100% funded in Yekis Escrow before work starts · 7-day auto-release after delivery."}
        </p>
      )}
    </div>
  );
}

/* ── Native <dialog> modal replacing window.prompt / window.confirm ── */
export interface OpsActionField {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  initialValue?: string;
}

export interface OpsActionModalProps {
  open: boolean;
  title: string;
  description?: string;
  fields?: OpsActionField[];
  checkbox?: {
    label: string;
    hint?: string;
    defaultChecked?: boolean;
  };
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: (result: { values: Record<string, string>; checked: boolean }) => void | Promise<void>;
  onCancel: () => void;
}

export function OpsActionModal({
  open,
  title,
  description,
  fields = [],
  checkbox,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: OpsActionModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.initialValue ?? ""])),
  );
  const [checked, setChecked] = useState(Boolean(checkbox?.defaultChecked));
  const [validationErr, setValidationErr] = useState<string | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open) {
      setValues(Object.fromEntries(fields.map((f) => [f.name, f.initialValue ?? ""])));
      setChecked(Boolean(checkbox?.defaultChecked));
      setValidationErr(null);
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      dlg.returnValue = "";
      onCancel();
    };
    dlg.addEventListener("close", handleClose);

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const outside = (e: PointerEvent) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e) && !busy) dlg.close();
        pressedOutside = false;
      };
      dlg.addEventListener("pointerdown", onDown);
      dlg.addEventListener("pointerup", onUp);
      return () => {
        dlg.removeEventListener("close", handleClose);
        dlg.removeEventListener("pointerdown", onDown);
        dlg.removeEventListener("pointerup", onUp);
      };
    }

    return () => dlg.removeEventListener("close", handleClose);
  }, [onCancel, busy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      const val = (values[f.name] ?? "").trim();
      if (f.required && !val) {
        setValidationErr(`${f.label} is required.`);
        return;
      }
      if (f.minLength && val.length < f.minLength) {
        setValidationErr(`${f.label} must be at least ${f.minLength} characters.`);
        return;
      }
      if (f.maxLength && val.length > f.maxLength) {
        setValidationErr(`${f.label} cannot exceed ${f.maxLength} characters.`);
        return;
      }
    }
    setValidationErr(null);
    const trimmed = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim()]),
    );
    void onConfirm({ values: trimmed, checked });
  };

  const isDestructiveConfirmOnly = tone === "danger" && fields.length === 0;

  return (
    <dialog
      ref={dialogRef}
      className="ops-native-dialog"
      aria-labelledby={titleId}
      {...({ closedby: busy ? "none" : "any" } as Record<string, string>)}
    >
      <div className="ops-dlg-head">
        <div>
          <h1 id={titleId} className="ops-dlg-title">
            {title}
          </h1>
          {description ? <p className="ops-dlg-sub">{description}</p> : null}
        </div>
        <button
          type="button"
          className="icon-btn"
          disabled={busy}
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {(fields.length > 0 || checkbox || validationErr) && (
          <div className="ops-dlg-body">
            {fields.map((f, idx) => {
              const val = values[f.name] ?? "";
              const trimmedLen = val.trim().length;
              return (
                <div className="field" key={f.name}>
                  <label className="field-l" htmlFor={`ops-dlg-${f.name}`}>
                    <span>{f.label}</span>
                    {f.minLength ? (
                      <em className={trimmedLen < f.minLength ? "over" : undefined}>
                        {trimmedLen}/{f.minLength} min
                      </em>
                    ) : null}
                  </label>
                  {f.multiline ? (
                    <textarea
                      id={`ops-dlg-${f.name}`}
                      className="inp-t"
                      rows={3}
                      placeholder={f.placeholder}
                      value={val}
                      autoFocus={idx === 0}
                      onChange={(e) => {
                        setValidationErr(null);
                        setValues((prev) => ({ ...prev, [f.name]: e.target.value }));
                      }}
                    />
                  ) : (
                    <input
                      id={`ops-dlg-${f.name}`}
                      className="inp"
                      placeholder={f.placeholder}
                      value={val}
                      autoFocus={idx === 0}
                      onChange={(e) => {
                        setValidationErr(null);
                        setValues((prev) => ({ ...prev, [f.name]: e.target.value }));
                      }}
                    />
                  )}
                </div>
              );
            })}

            {checkbox ? (
              <label
                className="chat-internal-toggle"
                style={{ alignItems: "flex-start", gap: 10 }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ display: "block", color: "var(--ops-text)" }}>
                    {checkbox.label}
                  </strong>
                  {checkbox.hint ? (
                    <span className="hint" style={{ display: "block" }}>
                      {checkbox.hint}
                    </span>
                  ) : null}
                </span>
              </label>
            ) : null}

            {validationErr ? (
              <div className="ops-dlg-err" role="alert">
                {validationErr}
              </div>
            ) : null}
          </div>
        )}

        <div className="ops-dlg-foot">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            autoFocus={isDestructiveConfirmOnly}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={`btn ${tone === "danger" ? "btn-red" : "btn-primary"}`}
            disabled={busy}
          >
            {busy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

