/* ────────────────────────────────────────────────────────────────────────
   KycQueue.tsx — identity review queue (list + detail).
   GET /admin/kyc/queue · POST /admin/kyc/:id/decision
   Hotkeys: ↑↓ navigate · A approve · R focus reason · Esc closes viewer.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import { Check, Eye, RefreshCw, Search, ShieldCheck, UserCheck } from "lucide-react";
import { dt, opsApi, useApi } from "../opsApi";
import type { KycDecision, KycItem } from "../opsTypes";
import { ChecksRow, Empty, ErrorBox, LoadingBox, PageHead, Pill, isTyping, useHotkeys, useToast } from "../components/ui";
import { useOpsUi } from "../opsUiContext";

const KYC_REASONS = [
  "Photo is unclear, blurry, or cropped. Please re-upload a clear image.",
  "Name on document does not match submitted name.",
  "Document appears to be expired.",
];

export default function KycQueue({ focusId }: { focusId?: string }) {
  const ui = useOpsUi();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<KycItem[]>(opsApi.kycQueue);
  const [status, setStatus] = useState<"UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "ALL">("UNDER_REVIEW");
  const [selId, setSelId] = useState<string | null>(focusId ?? null);
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const list = (data ?? []).filter((k) => status === "ALL" || k.status === status);
  const sel = list.find((k) => k.id === selId) ?? null;

  const decide = useCallback(
    async (decision: KycDecision, reasonOverride?: string) => {
      if (!sel) return;
      let r = reasonOverride ?? reason;
      if (r === "custom") r = custom.trim();
      if (decision === "CLEARER")
        r = KYC_REASONS[0];
      if (decision === "REJECTED" && !r) {
        toast("Please provide a rejection reason.");
        return;
      }
      setBusy(true);
      try {
        await opsApi.kycDecide(sel.id, decision, r || undefined);
        toast(
          decision === "VERIFIED"
            ? `${sel.name || sel.email} verified for ${sel.tier.replace("_", " ")}.`
            : decision === "CLEARER"
              ? "Clearer photo requested from user."
              : "Application rejected.",
        );
        setSelId(null);
        setReason("");
        setCustom("");
        reload();
        ui.refreshBadges();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Decision failed");
      } finally {
        setBusy(false);
      }
    },
    [sel, reason, custom, reload, toast, ui],
  );

  useHotkeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (ui.viewerOpen || ui.paletteOpen || isTyping() || !list.length) return;
        const idx = list.findIndex((k) => k.id === selId);
        if (e.key === "ArrowDown" && idx >= 0 && idx < list.length - 1) { e.preventDefault(); setSelId(list[idx + 1].id); }
        if (e.key === "ArrowUp" && idx > 0) { e.preventDefault(); setSelId(list[idx - 1].id); }
        if ((e.key === "a" || e.key === "A") && sel) { e.preventDefault(); void decide("VERIFIED"); }
        if ((e.key === "r" || e.key === "R") && sel) { e.preventDefault(); document.getElementById("kyc-reason")?.focus(); }
      },
      [list, selId, sel, decide, ui.viewerOpen, ui.paletteOpen],
    ),
  );

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const openDocs = (i: number) => {
    if (!sel) return;
    ui.openViewer(
      sel.docs.map((d) => ({ ...d, name: sel.name, doc: sel.doc, tin: sel.tin ?? undefined })),
      i,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="KYC Reviews"
        sub="Identity verification queue — Fayda, TIN & business registration checks"
        right={
          <span className="pill p-amber" style={{ fontSize: 13 }}>
            <span className="pdot" />
            {data.filter((k) => k.status === "UNDER_REVIEW").length} pending review
          </span>
        }
      />
      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input placeholder="Search email, UCID or Fayda number…" />
        </div>
        <select
          className="sel"
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setSelId(null); }}
        >
          <option value="UNDER_REVIEW">Under review</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All statuses</option>
        </select>
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="queue-wrap">
        <div className="queue-list">
          {list.length === 0 ? (
            <div className="card" style={{ padding: "36px 16px", textAlign: "center" }}>
              <Empty icon={ShieldCheck}>No KYC applications in this view.</Empty>
            </div>
          ) : (
            list.map((k) => (
              <button
                key={k.id}
                className={`q-card ${selId === k.id ? "selected" : ""}`}
                onClick={() => setSelId(k.id)}
              >
                <div className="q-head">
                  <strong>{k.email}</strong>
                  <span className="q-date">{dt(k.updated)}</span>
                </div>
                <div className="q-sub">
                  <span className="subject">{k.tier.replace("_", " ")} Request</span>
                  <Pill s={k.status} />
                </div>
                {k.pep || k.dup ? (
                  <div style={{ marginTop: 7 }}>
                    <span className="check fail" style={{ fontSize: 11 }}>
                      ⚠ {k.pep ? "PEP match" : "Duplicate identity"}
                    </span>
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>

        {sel ? (
          <div className="queue-detail card">
            <div className="qd-head">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3>Identity Review</h3>
                <Pill s={sel.status} />
              </div>
              <div className="qd-meta">
                User: {sel.email} · UCID <span className="mono">{sel.ucid}</span> · {sel.name}
              </div>
            </div>
            <div className="qd-body">
              <div className="sec-title" style={{ marginTop: 0 }}>Extracted Information</div>
              <div className="info-grid">
                <div className="kv"><div className="kv-k">Tier Request</div><div className="kv-v" style={{ fontSize: 14 }}>{sel.tier.replace("_", " ")}</div></div>
                <div className="kv"><div className="kv-k">Fayda Number</div><div className="kv-v mono" style={{ fontSize: 14 }}>{sel.doc}</div></div>
                {sel.tier !== "TIER_1" ? (
                  <>
                    <div className="kv"><div className="kv-k">TIN</div><div className="kv-v mono" style={{ fontSize: 14 }}>{sel.tin ?? "—"}</div></div>
                    <div className="kv"><div className="kv-k">Business Reg</div><div className="kv-v mono" style={{ fontSize: 14 }}>{sel.biz ?? "—"}</div></div>
                  </>
                ) : null}
              </div>
              <div className="sec-title" style={{ marginTop: 20 }}>Automated Checks</div>
              <ChecksRow faydaA={sel.faydaA} faydaS={sel.faydaS} pep={sel.pep} dup={sel.dup} />
              <div className="sec-title" style={{ marginTop: 20 }}>Submitted Evidence</div>
              <div className="doc-tiles">
                {sel.docs.map((d, i) => (
                  <button className="doc-tile" key={d.k} onClick={() => openDocs(i)}>
                    <Eye size={14} /> {d.t}
                  </button>
                ))}
              </div>
              {sel.history.length ? (
                <>
                  <div className="sec-title" style={{ marginTop: 20 }}>Review History</div>
                  {sel.history.map((h, i) => (
                    <div className="hist-item" key={i}>
                      <b>{h.d}</b> by <span className="mono">{h.by}</span> · {dt(h.at)}
                      {h.reason ? <div className="hist-reason">Reason: {h.reason}</div> : null}
                    </div>
                  ))}
                </>
              ) : null}
            </div>
            <div className="qd-actions">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  className="sel"
                  id="kyc-reason"
                  style={{ flex: 1, minWidth: 220 }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="">— Select rejection reason (press R) —</option>
                  {KYC_REASONS.map((v) => (
                    <option value={v} key={v}>{v.split(".")[0]}</option>
                  ))}
                  <option value="custom">Custom reason…</option>
                </select>
                <button className="btn btn-red" disabled={busy || !(sel.pep || sel.dup)} onClick={() => void decide("REJECTED")}>
                  Reject
                </button>
                <button className="btn btn-amber" disabled={busy} onClick={() => void decide("CLEARER")}>
                  Ask for Clearer Photo
                </button>
                <button className="btn btn-green" disabled={busy} title="Press A" onClick={() => void decide("VERIFIED")}>
                  <Check size={15} /> Approve{" "}
                  <span className="kbd" style={{ background: "rgba(255,255,255,.25)", borderColor: "rgba(255,255,255,.4)", color: "#fff" }}>
                    A
                  </span>
                </button>
              </div>
              {reason === "custom" ? (
                <div style={{ marginTop: 10 }}>
                  <input className="inp" placeholder="Type custom rejection reason…" value={custom} onChange={(e) => setCustom(e.target.value)} />
                </div>
              ) : null}
              <div className="kbd-hint" style={{ marginTop: 10 }}>
                <span className="kbd">↑</span> <span className="kbd">↓</span> navigate queue ·{" "}
                <span className="kbd">A</span> approve · <span className="kbd">R</span> focus reason ·{" "}
                <span className="kbd">Esc</span> close viewer
              </div>
            </div>
          </div>
        ) : (
          <div className="queue-detail card">
            <div className="empty-detail">
              <UserCheck size={40} style={{ color: "#c3ccdb" }} />
              <p>Select a record to review.</p>
              <span className="kbd-hint">
                Tip: use <span className="kbd">↑</span> <span className="kbd">↓</span> arrows to navigate the queue
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
