/* ────────────────────────────────────────────────────────────────────────
   Payouts.tsx — disbursement queue with inline settle row (confirm/fail).
   GET /admin/payouts · POST /admin/payouts/:payoutId/settle
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { Check, ChevronDown, Clock, RefreshCw, Search, X } from "lucide-react";
import { fmt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { PAYOUT_STATUSES, RAILS } from "../opsConst";
import type { Payout } from "../opsTypes";
import {
  Banner,
  ErrorBox,
  FilterSelect,
  LoadingBox,
  OpsTable,
  PageHead,
  Pager,
  Pill,
  Rail,
  useToast,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

export default function Payouts() {
  const ui = useOpsUi();
  const toast = useToast();  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [settleId, setSettleId] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useListPage<Payout>(
    (p) => opsListApi.payouts({ ...p, status, provider }),
    25,
    [status, provider],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  const settle = async (id: string, outcome: "CONFIRMED" | "FAILED") => {
    setBusy(true);
    try {
      await opsApi.settlePayout(id, {
        outcome,
        ref: ref.trim() || undefined,
        reason: outcome === "FAILED" ? reason.trim() || undefined : undefined,
      });
      toast(
        outcome === "CONFIRMED"
          ? "Payout confirmed on rail."
          : "Payout failed — wallet re-credited.",
      );
      setSettleId(null);
      setRef("");
      setReason("");
      reload();
      ui.refreshBadges();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const pendingOnPage = rows.filter(
    (p) => p.status === "PENDING" || p.status === "PROCESSING",
  ).length;

  return (
    <div className="fade">
      <PageHead
        title="Payouts & Disbursements"
        sub="Settle freelancer transfers executed out-of-band on provider rails"
      />
      {pendingOnPage ? (
        <Banner
          tone="b-amber"
          icon={Clock}
          strong={`${pendingOnPage} payout(s) awaiting disbursement on this page.`}
          rest="Confirm once the transfer executed on the rail — failing re-credits the wallet."
        />
      ) : null}
      <Card className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search provider ref, payout account or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={status} onChange={setStatus} options={PAYOUT_STATUSES} allLabel="Any status" label="Payout status" />
        <FilterSelect value={provider} onChange={setProvider} options={RAILS} allLabel="Any rail" label="Provider" humanise={false} />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>
      <OpsTable
        heads={["Freelancer", "Payout Acct", "Provider Ref", "Provider", "Net", "Status", "Reason", "Settle"]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="payouts" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={8}><EmptyPayout /></td></tr>
        ) : (
          rows.map((p) => (
            <PayoutRow
              key={p.id}
              p={p}
              open={settleId === p.id}
              busy={busy}
              refVal={ref}
              reasonVal={reason}
              onRef={setRef}
              onReason={setReason}
              onToggle={() => {
                setSettleId(settleId === p.id ? null : p.id);
                setRef("");
                setReason("");
              }}
              onSettle={(o) => void settle(p.id, o)}
            />
          ))
        )}
      </OpsTable>
    </div>
  );
}

function EmptyPayout() {
  return (
    <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--ops-text-2)" }}>
      No payouts match this search.
    </div>
  );
}

function PayoutRow({
  p, open, busy, refVal, reasonVal, onRef, onReason, onToggle, onSettle,
}: {
  p: Payout;
  open: boolean;
  busy: boolean;
  refVal: string;
  reasonVal: string;
  onRef: (v: string) => void;
  onReason: (v: string) => void;
  onToggle: () => void;
  onSettle: (o: "CONFIRMED" | "FAILED") => void;
}) {
  const settleable = p.status === "PENDING" || p.status === "PROCESSING";
  return (
    <>
      <tr>
        <td><div className="cell-main">{p.user.displayName}</div><div className="cell-sub">{p.user.email}</div></td>
        <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{p.acct}</td>
        <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{p.ref ?? "—"}</td>
        <td><Rail p={p.provider} /></td>
        <td className="amount">{fmt(p.net)}</td>
        <td><Pill s={p.status} /></td>
        <td style={{ fontSize: 12, fontWeight: 700, color: p.err ? "var(--ops-red)" : "var(--ops-text-3)", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis" }} title={p.err ?? ""}>
          {p.err ?? "—"}
        </td>
        <td>
          {settleable ? (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {open ? "Close" : "Settle"} <ChevronDown size={12} />
            </Button>
          ) : (
            <span style={{ color: "var(--ops-text-3)" }}>—</span>
          )}
        </td>
      </tr>
      {open ? (
        <tr className="expand-row">
          <td colSpan={8}>
            <div className="settle-grid">
              <div className="fld">
                <label className="lbl">Provider reference (for confirm)</label>
                <input className="inp mono" placeholder="e.g. TXN-9982" value={refVal} onChange={(e) => onRef(e.target.value)} />
              </div>
              <div className="fld">
                <label className="lbl">Failure reason (for fail)</label>
                <input className="inp" placeholder="e.g. Wrong account number" value={reasonVal} onChange={(e) => onReason(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" disabled={busy} onClick={() => onSettle("CONFIRMED")}><Check size={13} /> Confirm</Button>
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => onSettle("FAILED")}><X size={13} /> Failed</Button>
                <Button variant="ghost" size="sm" onClick={onToggle}>Cancel</Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
