/* ────────────────────────────────────────────────────────────────────────
   actionCenter.tsx — turns live admin data into a prioritised directive
   list: SLA breaches → critical risk → system/recon issues → queues.
   Severity order: 3 = critical (red), 2 = high (amber), 1 = queue (blue).
   ──────────────────────────────────────────────────────────────────────── */

import { ChevronRight, Target } from "lucide-react";
import { dt, fmt } from "../opsApi";
import type {
  DisputeItem,
  HealthState,
  KycItem,
  Payout,
  ProfileReport,
  ReconRow,
  RiskFlag,
} from "../opsTypes";
import { RISK_LEVEL } from "../opsTypes";
import type { OpsPageId } from "../opsNav";

export interface ActionItem {
  sev: 1 | 2 | 3;
  tag: string;
  t: string;
  why: string;
  page: OpsPageId;
  refId?: string;
}

export interface ActionSource {
  disputes: DisputeItem[];
  riskFlags: RiskFlag[];
  health: HealthState;
  recon: ReconRow[];
  payouts: Payout[];
  kyc: KycItem[];
  reports: ProfileReport[];
}

export function buildActionItems(d: ActionSource): ActionItem[] {
  const A: ActionItem[] = [];

  d.disputes.forEach((x) => {
    if (x.slaH < 0)
      A.push({
        sev: 3,
        tag: "SLA BREACH",
        t: `Mediate “${x.job}”`,
        why: `Deadline passed ${Math.abs(x.slaH)}h ago — ${fmt(x.amt)} of escrow stays locked until this is resolved.`,
        page: "dispute-queue",
        refId: x.id,
      });
    else if (x.slaH < 24)
      A.push({
        sev: 2,
        tag: "DUE TODAY",
        t: `Resolve “${x.job}”`,
        why: `Mediation SLA due in ${x.slaH}h — schedule the decision now.`,
        page: "dispute-queue",
        refId: x.id,
      });
  });

  d.riskFlags
    .filter((f) => f.status === "OPEN" || f.status === "REVIEWING")
    .forEach((f) => {
      const lv = RISK_LEVEL[f.type] ?? "LOW";
      A.push({
        sev: lv === "CRITICAL" ? 3 : lv === "HIGH" ? 2 : 1,
        tag: `${lv} RISK`,
        t: `Review flag: ${f.type.replace(/_/g, " ")}`,
        why:
          lv === "CRITICAL"
            ? "Critical: freeze linked wallets until the mismatch is reconciled."
            : f.status === "REVIEWING"
              ? "Analyst review in progress — verify findings and close the loop."
              : "Monitor pattern and clear within 48h.",
        page: "risk",
      });
    });

  Object.entries(d.health.checks).forEach(([n, c]) => {
    if (!c.ok)
      A.push({
        sev: 2,
        tag: "SYSTEM",
        t: `Fix ${n.replace(/_/g, " ")}`,
        why: `${c.d} — processing delays compound every hour.`,
        page: "monitoring",
      });
  });

  d.recon
    .filter((r) => r.rec === "MISMATCH")
    .forEach((r) =>
      A.push({
        sev: 2,
        tag: "RECON",
        t: `Reconcile ${r.txId}`,
        why: `Rail and ledger differ by ${fmt(r.diff ?? 0)} — clear before the next settlement run.`,
        page: "reconciliation",
      }),
    );

  const pendPo = d.payouts.filter(
    (p) => p.status === "PENDING" || p.status === "PROCESSING",
  );
  if (pendPo.length)
    A.push({
      sev: 1,
      tag: "PAYOUTS",
      t: `Settle ${pendPo.length} pending payout(s)`,
      why: `${fmt(pendPo.reduce((s, p) => s + p.net, 0))} waiting on freelancer wallets — confirm rail transfers.`,
      page: "payouts",
    });

  const kycPend = d.kyc.filter((k) => k.status === "UNDER_REVIEW");
  if (kycPend.length)
    A.push({
      sev: kycPend.some((k) => k.pep || k.dup) ? 2 : 1,
      tag: "KYC",
      t: `Clear ${kycPend.length} identity review(s)`,
      why: kycPend.some((k) => k.pep)
        ? "Includes a PEP match — compliance priority over the rest of the queue."
        : `Oldest application waiting since ${dt(
            kycPend.reduce((m, k) => (k.updated < m ? k.updated : m), kycPend[0].updated),
          )}.`,
      page: "kyc",
    });

  const repOpen = d.reports.filter((r) => r.status === "OPEN");
  if (repOpen.length)
    A.push({
      sev: 1,
      tag: "TRUST",
      t: `Moderate ${repOpen.length} profile report(s)`,
      why: "Fraud and impersonation reports age into real user harm if left open.",
      page: "reports-queue",
    });

  return A.sort((a, b) => b.sev - a.sev);
}

const SEV_C: Record<1 | 2 | 3, string> = {
  3: "var(--ops-red)",
  2: "var(--ops-amber)",
  1: "var(--ops-blue)",
};

export function ActionCenter({
  items,
  done,
  onToggle,
  onOpen,
}: {
  items: ActionItem[];
  done: Record<number, boolean>;
  onToggle: (i: number) => void;
  onOpen: (item: ActionItem) => void;
}) {
  const open = items.filter((_, i) => !done[i]).length;
  const crit = items.filter((x, i) => x.sev === 3 && !done[i]).length;
  const pct = items.length
    ? Math.round(((items.length - open) / items.length) * 100)
    : 100;
  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="ac-head">
        <div className="sec-title" style={{ marginBottom: 0 }}>
          <Target size={17} /> Action Center — what needs you first
        </div>
        <span
          className="ac-count"
          style={{
            color: crit
              ? "var(--ops-red)"
              : open
                ? "var(--ops-amber)"
                : "var(--ops-green)",
          }}
        >
          {open} open · {crit} critical
        </span>
      </div>
      <div className="ac-prog">
        <div className="ac-prog-f" style={{ width: `${pct}%` }} />
      </div>
      <div className="ac-prog-l">
        {pct}% of today’s directives cleared
        {pct === 100 && items.length ? " — queue clean, nice work." : ""}
      </div>
      {items.length === 0 ? (
        <div className="empty">Nothing requires attention right now.</div>
      ) : (
        items.map((it, i) => (
          <div className={`ac-item ${done[i] ? "done" : ""}`} key={`${it.page}-${it.refId ?? i}-${it.t}`}>
            <span className="ac-sev" style={{ background: SEV_C[it.sev] }} />
            <div className="ac-body">
              <div className="ac-t">
                {it.t}
                <span className="ac-tag" style={{ color: SEV_C[it.sev] }}>
                  {it.tag}
                </span>
              </div>
              <div className="ac-w">{it.why}</div>
            </div>
            <div className="ac-acts">
              <button className="btn btn-ghost btn-sm" onClick={() => onToggle(i)}>
                {done[i] ? "Undo" : "Done"}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => onOpen(it)}>
                Open <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
