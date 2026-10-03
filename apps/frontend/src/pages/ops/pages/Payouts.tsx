/* ────────────────────────────────────────────────────────────────────────
   Payouts.tsx — disbursement queue with inline settle row (confirm/fail).
   GET /admin/payouts · POST /admin/payouts/:id/settle
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { Check, ChevronDown, Clock, RefreshCw, Search, X } from "lucide-react";
import { fmt, opsApi, useApi } from "../opsApi";
import type { Payout } from "../opsTypes";
import { Banner, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill, Rail, useToast } from "../components/ui";
import { useOpsUi } from "../opsUiContext";

export default function Payouts() {
  const ui = useOpsUi();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Payout[]>(opsApi.payouts);
  const [status, setStatus] = useState("ALL");
  const [prov, setProv] = useState("ALL");
  const [settleId, setSettleId] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const pending = data.filter((p) => p.status === "PENDING" || p.status === "PROCESSING");
  const rows = data.filter(
    (p) => (status === "ALL" || p.status === status) && (prov === "ALL" || p.provider === prov),
  );

  const settle = async (id: string, outcome: "CONFIRMED" | "FAILED") => {
    setBusy(true);
    try {
      await opsApi.settlePayout(id, {
        outcome,
        ref: ref.trim() || undefined,
        reason: outcome === "FAILED" ? reason.trim() || undefined : undefined,
      });
      toast(outcome === "CONFIRMED" ? "Payout confirmed on rail." : "Payout failed — wallet re-credited.");
      setSettleId(null); setRef(""); setReason("");
      reload();
      ui.refreshBadges();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade">
      <PageHead title="Payouts & Disbursements" sub="Settle freelancer transfers executed out-of-band on provider rails" />
      {pending.length ? (
        <Banner tone="b-amber" icon={Clock} strong={`${pending.length} payout(s) awaiting disbursement.`} rest="Confirm once the transfer executed on the rail — failing re-credits the wallet." />
      ) : null}
      <div className="card filters">
        <div className="f-search"><Search size={15} /><input placeholder="Search by freelancer email or payout account…" /></div>
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["ALL", "PENDING", "PROCESSING", "CONFIRMED", "FAILED", "REVERSED"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "Any status" : s}</option>
          ))}
        </select>
        <select className="sel" value={prov} onChange={(e) => setProv(e.target.value)}>
          {["ALL", "TELEBIRR", "CBE_BIRR"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "Any rail" : s}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <OpsTable heads={["Freelancer", "Payout Acct", "Provider Ref", "Provider", "Net", "Status", "Reason", "Settle"]} foot={<Pager n={rows.length} />}>
        {rows.map((p) => {
          const canSettle = p.status === "PENDING" || p.status === "PROCESSING";
          return (
            <FragmentRow
              key={p.id}
              p={p}
              canSettle={canSettle}
              open={settleId === p.id}
              busy={busy}
              refVal={ref}
              reasonVal={reason}
              onRef={setRef}
              onReason={setReason}
              onToggle={() => { setSettleId(settleId === p.id ? null : p.id); setRef(""); setReason(""); }}
              onSettle={(o) => void settle(p.id, o)}
            />
          );
        })}
      </OpsTable>
    </div>
  );
}

function FragmentRow({
  p, canSettle, open, busy, refVal, reasonVal, onRef, onReason, onToggle, onSettle,
}: {
  p: Payout;
  canSettle: boolean;
  open: boolean;
  busy: boolean;
  refVal: string;
  reasonVal: string;
  onRef: (v: string) => void;
  onReason: (v: string) => void;
  onToggle: () => void;
  onSettle: (o: "CONFIRMED" | "FAILED") => void;
}) {
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
          {canSettle ? (
            <button className="btn btn-ghost btn-sm" onClick={onToggle}>
              {open ? "Close" : "Settle"} <ChevronDown size={12} />
            </button>
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
                <button className="btn btn-green btn-sm" disabled={busy} onClick={() => onSettle("CONFIRMED")}><Check size={13} /> Confirm</button>
                <button className="btn btn-red btn-sm" disabled={busy} onClick={() => onSettle("FAILED")}><X size={13} /> Failed</button>
                <button className="btn btn-ghost btn-sm" onClick={onToggle}>Cancel</button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
