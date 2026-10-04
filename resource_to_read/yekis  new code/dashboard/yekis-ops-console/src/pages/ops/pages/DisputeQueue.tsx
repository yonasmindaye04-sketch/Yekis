/* ────────────────────────────────────────────────────────────────────────
   DisputeQueue.tsx — Stage-3 mediation: scope, evidence chat, outcome
   selection with live settlement math, recommendation, resolve via
   POST /admin/disputes/:id/resolve. Hotkeys: ↑↓ navigate.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import { AlertTriangle, Eye, Scale } from "lucide-react";
import { dt, dts, fmt2, opsApi, useApi } from "../opsApi";
import type { DisputeItem, DisputeOutcome } from "../opsTypes";
import { Banner, Empty, ErrorBox, LoadingBox, PageHead, Pill, SlaBadge, isTyping, useHotkeys, useToast } from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { Clock } from "lucide-react";

const OUTCOMES: { id: DisputeOutcome; label: string }[] = [
  { id: "RELEASE_TO_FREELANCER", label: "Release to Freelancer" },
  { id: "PARTIAL_SPLIT", label: "Partial Split" },
  { id: "REFUND_TO_CLIENT", label: "Refund to Client" },
];

export default function DisputeQueue({ focusId }: { focusId?: string }) {
  const ui = useOpsUi();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<DisputeItem[]>(opsApi.disputes);
  const [selId, setSelId] = useState<string | null>(focusId ?? null);
  const [outcome, setOutcome] = useState<DisputeOutcome | "">("");
  const [split, setSplit] = useState(50);
  const [rec, setRec] = useState("");
  const [busy, setBusy] = useState(false);

  const list = data ?? [];
  const sel = list.find((d) => d.id === selId) ?? null;

  useHotkeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (ui.viewerOpen || ui.paletteOpen || isTyping() || !list.length) return;
        const idx = list.findIndex((d) => d.id === selId);
        if (e.key === "ArrowDown" && idx >= 0 && idx < list.length - 1) {
          e.preventDefault(); setSelId(list[idx + 1].id); setOutcome("");
        }
        if (e.key === "ArrowUp" && idx > 0) {
          e.preventDefault(); setSelId(list[idx - 1].id); setOutcome("");
        }
      },
      [list, selId, ui.viewerOpen, ui.paletteOpen],
    ),
  );

  const resolve = async () => {
    if (!sel || !outcome || !rec.trim()) {
      toast("Select an outcome and write the recommendation.");
      return;
    }
    setBusy(true);
    try {
      await opsApi.resolveDispute(sel.id, {
        outcome,
        split: outcome === "PARTIAL_SPLIT" ? split : undefined,
        recommendation: rec.trim(),
      });
      toast(`Dispute resolved — ${outcome.replace(/_/g, " ").toLowerCase()}.`);
      setSelId(null); setOutcome(""); setRec("");
      reload();
      ui.refreshBadges();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  /* settlement preview */
  let fGross = 0, cRefund = 0;
  if (sel && outcome === "RELEASE_TO_FREELANCER") fGross = sel.amt;
  else if (sel && outcome === "REFUND_TO_CLIENT") cRefund = sel.amt;
  else if (sel && outcome === "PARTIAL_SPLIT") {
    fGross = Math.round((sel.amt * split) / 100);
    cRefund = sel.amt - fGross;
  }
  const fee = Math.round(fGross * 0.05);
  const wh = fGross >= 1000000 ? Math.round(fGross * 0.3) : 0;
  const net = fGross - fee - wh;

  return (
    <div className="fade">
      <PageHead
        title="Dispute Mediation Queue"
        sub="Stage 3 mediation — review scope, evidence and settle escrow outcomes"
        right={
          <span className="pill p-violet" style={{ fontSize: 13 }}>
            <span className="pdot" />
            {list.filter((d) => d.stage === "STAGE_3_MEDIATION").length} awaiting mediation
          </span>
        }
      />
      {list.some((d) => d.slaH < 0) ? (
        <Banner tone="b-red" icon={Clock} strong="SLA breach detected." rest="At least one dispute exceeded its mediation deadline — resolve it first." />
      ) : null}

      <div className="queue-wrap">
        <div className="queue-list">
          {list.length === 0 ? (
            <div className="card" style={{ padding: "36px 16px", textAlign: "center" }}>
              <Empty icon={Scale}>No active disputes in this view.</Empty>
            </div>
          ) : (
            list.map((d) => (
              <button
                key={d.id}
                className={`q-card ${selId === d.id ? "selected" : ""}`}
                onClick={() => { setSelId(d.id); setOutcome(""); setRec(""); }}
              >
                <div className="q-head">
                  <strong>{d.cat.replace(/_/g, " ")}</strong>
                  <span className="q-date">{dt(d.created)}</span>
                </div>
                <div className="q-sub">
                  <span className="subject">{d.job}</span>
                  <Pill s={d.stage} />
                </div>
                <div style={{ marginTop: 7 }}>
                  <SlaBadge h={d.slaH} />
                </div>
              </button>
            ))
          )}
        </div>

        {sel ? (
          <div className="queue-detail card">
            <div className="qd-head">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3>{sel.job}</h3>
                <SlaBadge h={sel.slaH} />
              </div>
              <div className="qd-meta">
                Dispute category: <b style={{ color: "var(--ops-text)" }}>{sel.cat.replace(/_/g, " ")}</b> ·{" "}
                <Pill s={sel.stage} /> · opened {dt(sel.created)}
              </div>
            </div>
            <div className="qd-body">
              <div className="grid g2" style={{ alignItems: "start" }}>
                <div>
                  <div className="sec-title" style={{ marginTop: 0 }}>Original Scope &amp; Terms</div>
                  <div className="scope-box">
                    {sel.scope}
                    <div className="milestone-box">
                      <span className="mb-l">Disputed milestone</span>
                      <b>{sel.ms}</b>
                      <span className="amt">{fmt2(sel.amt)}</span>
                    </div>
                  </div>
                  <div className="sec-title" style={{ marginTop: 18 }}>Submitted Deliverable</div>
                  {sel.hasDel ? (
                    <div className="doc-tiles">
                      <button
                        className="doc-tile"
                        onClick={() => ui.openViewer([{ t: `Deliverable — ${sel.ms}`, k: "tin", name: "Delivery Package" }], 0)}
                      >
                        <Eye size={14} /> View deliverable file
                      </button>
                    </div>
                  ) : (
                    <div className="scope-box" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ops-red)", fontWeight: 600 }}>
                      <AlertTriangle size={17} /> No deliverable file or link was formally attached to this milestone.
                    </div>
                  )}
                </div>
                <div>
                  <div className="sec-title" style={{ marginTop: 0 }}>
                    Stage 2 — Evidence Statements ({sel.ev.length})
                  </div>
                  <div className="ev-chat">
                    {sel.ev.length === 0 ? (
                      <p className="empty" style={{ padding: 20 }}>No evidence submitted by either party.</p>
                    ) : (
                      sel.ev.map((ev, i) => (
                        <div className={`ev-bubble ${ev.side}`} key={i}>
                          <div className="ev-b-head">
                            <strong>{ev.side === "client" ? "Client" : "Freelancer"}</strong>
                            <span>{dts(ev.at)}</span>
                          </div>
                          <p>{ev.s}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="sec-title" style={{ marginTop: 22 }}>Mediation Resolution</div>
              <div className="outcome-row">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.id}
                    className={`outcome-btn ${outcome === o.id ? "active" : ""}`}
                    onClick={() => setOutcome(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {outcome === "PARTIAL_SPLIT" ? (
                <div style={{ marginBottom: 4 }}>
                  <div className="split-lbl">
                    <span>Freelancer share: <b style={{ color: "var(--ops-primary)" }}>{split}%</b></span>
                    <span>{fmt2(Math.round((sel.amt * split) / 100))}</span>
                  </div>
                  <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} />
                </div>
              ) : null}
              {outcome ? (
                <div className="calc">
                  <h5>Resolution Financial Preview</h5>
                  <div className="calc-row"><span>Client receives (refund)</span><b>{fmt2(cRefund)}</b></div>
                  <div className="calc-row"><span>Freelancer gross allocation</span><b>{fmt2(fGross)}</b></div>
                  <div className="calc-row sub"><span>− Platform fee (5%)</span><span>{fmt2(fee)}</span></div>
                  <div className="calc-row sub"><span>− Withholding tax (est. 30% over ETB 10,000)</span><span>{fmt2(wh)}</span></div>
                  <div className="calc-row total"><span>Freelancer net receivable</span><b style={{ color: "var(--ops-green)" }}>{fmt2(net)}</b></div>
                </div>
              ) : null}
              <label className="lbl" style={{ marginTop: 10 }}>Mediator recommendation &amp; rationale</label>
              <textarea
                className="inp-t"
                placeholder="Explain the reason for this decision. This will be visible to both parties."
                value={rec}
                onChange={(e) => setRec(e.target.value)}
              />
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button className="btn btn-primary" disabled={!outcome || busy} onClick={() => void resolve()}>
                  Confirm Final Resolution
                </button>
                <span className="kbd-hint">
                  {outcome ? `Outcome: ${outcome.replace(/_/g, " ")}` : "Select an outcome to preview the settlement math"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="queue-detail card">
            <div className="empty-detail">
              <Scale size={40} style={{ color: "#c3ccdb" }} />
              <p>Select a dispute to mediate.</p>
              <span className="kbd-hint">
                Tip: use <span className="kbd">↑</span> <span className="kbd">↓</span> arrows to navigate
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
