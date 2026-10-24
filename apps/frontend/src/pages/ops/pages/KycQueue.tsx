/* ────────────────────────────────────────────────────────────────────────
   KycQueue.tsx — identity review queue (list + detail).
   GET  /kyc/review-queue · GET /kyc/:userId/history
   POST /kyc/:userId/review · GET /kyc/documents/:id/url
   Hotkeys: ↑↓ navigate · A approve · R focus reason.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, RefreshCw, Search, ShieldCheck, UserCheck } from "lucide-react";
import { dt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import type { KycDecision, KycItem } from "../opsTypes";
import {
  ChecksRow,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  PageHead,
  Pager,
  Pill,
  isTyping,
  useHotkeys,
  useToast,
  Button,
  Card,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";

const KYC_REASONS = [
  "Photo is unclear, blurry, or cropped. Please re-upload a clear image.",
  "Name on document does not match submitted name.",
  "Document appears to be expired.",
];

export default function KycQueue({ focusId }: { focusId?: string }) {
  const ui = useOpsUi();
  const toast = useToast();
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [selId, setSelId] = useState<string | null>(focusId ?? null);
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const page = useListPage<KycItem>(
    (p) => opsListApi.kycQueue({ ...p, status: status || undefined }),
    25,
    [status],
  );
  const { rows, total, loading, error, reload } = page;

  /* Status split from the server. `underReview` is real review work;
     `pending` is users who registered but never uploaded a document, so
     there is nothing for a reviewer to act on and the sidebar KPI excludes
     them. Shown so an empty queue is explained rather than mysterious. */
  const counts = (page.extra ?? null) as {
    underReview: number;
    pending: number;
  } | null;

  /* Review history lives on its own route; load it for the open record. */
  const [history, setHistory] = useState<Record<string, KycItem["history"]>>({});

  const sel = rows.find((k) => k.id === selId) ?? null;

  /* History arrives from its own route, so merge it back onto the record the
     DETAIL pane renders.

     It must not be merged onto the list. The list column previously rendered
     an array built from `sel` alone, which meant it held zero cards until
     something was selected — and nothing could be selected because there were
     no cards to click. The queue was therefore permanently empty for every
     status, filter and date, while the stat tiles (which read `rows`/`total`)
     still showed real numbers. The list column renders `rows`; hotkeys
     navigate `rows`. */
  const detail = useMemo(
    () => (sel ? { ...sel, history: history[sel.id] ?? sel.history } : null),
    [sel, history],
  );

  /* Fetch the selected applicant's decision history once per selection. */
  useEffect(() => {
    if (!selId) return;
    let alive = true;
    void opsApi
      .kycHistory(selId)
      .then((events) => {
        if (!alive) return;
        setHistory((prev) => ({
          ...prev,
          [selId]: events.map((e) => ({
            d: e.decision,
            by: e.staffUserId,
            at: e.createdAt,
            reason: e.reason ?? undefined,
          })),
        }));
      })
      .catch(() => {
        /* history is supplementary — a failure must not block the review */
      });
    return () => {
      alive = false;
    };
  }, [selId]);

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
        if (ui.viewerOpen || ui.paletteOpen || isTyping() || !rows.length) return;
        const idx = rows.findIndex((k) => k.id === selId);
        if (e.key === "ArrowDown" && idx >= 0 && idx < rows.length - 1) { e.preventDefault(); setSelId(rows[idx + 1].id); }
        if (e.key === "ArrowUp" && idx > 0) { e.preventDefault(); setSelId(rows[idx - 1].id); }
        if ((e.key === "a" || e.key === "A") && sel) { e.preventDefault(); void decide("VERIFIED"); }
        if ((e.key === "r" || e.key === "R") && sel) { e.preventDefault(); document.getElementById("kyc-reason")?.focus(); }
      },
      [rows, selId, sel, decide, ui.viewerOpen, ui.paletteOpen],
    ),
  );

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

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
            {/* Was `rows.filter(k => k.status === "UNDER_REVIEW").length`, which
                always equals rows.length under the default filter and 0 under
                any other — it read "0 pending review" on a full VERIFIED page.
                `total` is the server's search+filter-aware match count. */}
            {total.toLocaleString()} {status === "UNDER_REVIEW" ? "pending review" : status ? `${status.toLowerCase().replace("_", " ")}` : "applications"}
          </span>
        }
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Matching applications" v={total.toLocaleString()} />
        <Kv k="On this page" v={String(rows.length)} />
        <Kv k="PEP matches" v={String(rows.filter((k) => k.pep).length)} warn={rows.some((k) => k.pep)} />
        <Kv k="With documents" v={String(rows.filter((k) => k.docs.length > 0).length)} />
      </div>
      {status === "UNDER_REVIEW" && counts ? (
        <Card className="card" style={{ marginBottom: 12, padding: "10px 14px", fontSize: 13 }}>
          <b>{counts.underReview.toLocaleString()}</b> awaiting review (shown below).{" "}
          {counts.pending > 0 ? (
            <>
              A further <b>{counts.pending.toLocaleString()}</b> registered users have not
              uploaded a document, so there is nothing to review — they are not counted
              as pending KYC.{" "}
            </>
          ) : null}
          <Button variant="outline" size="sm" style={{ marginLeft: 8 }} onClick={() => { setStatus(""); setSelId(null); }}>
            Show all statuses
          </Button>
        </Card>
      ) : null}
      <Card className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search email, phone or UCID…"
            value={page.search}
            onChange={(e) => page.setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            setSelId(null);
          }}
          options={["UNDER_REVIEW", "VERIFIED", "REJECTED", "PENDING"]}
          allLabel="All statuses"
          label="KYC status"
        />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>

      <div className="queue-wrap">
        <div className="queue-list">
          {rows.length === 0 ? (
            <Card className="card" style={{ padding: "36px 16px", textAlign: "center" }}>
              <Empty icon={ShieldCheck}>No KYC applications in this view.</Empty>
            </Card>
          ) : (
            rows.map((k) => (
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
          <Pager
            page={page.page}
            pages={page.pages}
            total={total}
            onPage={page.setPage}
            unit="applications"
          />
        </div>

        {detail ? (
          <Card className="queue-detail card">
            <div className="qd-head">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3>Identity Review</h3>
                <Pill s={detail.status} />
              </div>
              <div className="qd-meta">
                User: {detail.email} · UCID <span className="mono">{detail.ucid}</span> · {detail.name}
              </div>
            </div>
            <div className="qd-body">
              <div className="sec-title" style={{ marginTop: 0 }}>Extracted Information</div>
              <div className="info-grid">
                <div className="kv"><div className="kv-k">Tier Request</div><div className="kv-v" style={{ fontSize: 14 }}>{detail.tier.replace("_", " ")}</div></div>
                <div className="kv"><div className="kv-k">Fayda Number</div><div className="kv-v mono" style={{ fontSize: 14 }}>{detail.doc}</div></div>
                {detail.tier !== "TIER_1" ? (
                  <>
                    <div className="kv"><div className="kv-k">TIN</div><div className="kv-v mono" style={{ fontSize: 14 }}>{detail.tin ?? "—"}</div></div>
                    <div className="kv"><div className="kv-k">Business Reg</div><div className="kv-v mono" style={{ fontSize: 14 }}>{detail.biz ?? "—"}</div></div>
                  </>
                ) : null}
              </div>
              <div className="sec-title" style={{ marginTop: 20 }}>Automated Checks</div>
              <ChecksRow faydaA={detail.faydaA} faydaS={detail.faydaS} pep={detail.pep} dup={detail.dup} />
              {detail.flag && !detail.dup ? (
                <div style={{ marginTop: 8 }}>
                  <span className="check warn" style={{ fontSize: 12 }}>
                    Routed to you: {detail.flag.replace(/[_-]/g, " ").toLowerCase()}
                  </span>
                </div>
              ) : null}
              <div className="sec-title" style={{ marginTop: 20 }}>Submitted Evidence</div>
              <div className="doc-tiles">
                {detail.docs.map((d, i) => (
                  <button className="doc-tile" key={d.k} onClick={() => openDocs(i)}>
                    <Eye size={14} /> {d.t}
                  </button>
                ))}
              </div>
              {detail.history.length ? (
                <>
                  <div className="sec-title" style={{ marginTop: 20 }}>Review History</div>
                  {detail.history.map((h, i) => (
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
                {/* Was `disabled={busy || !(sel.pep || sel.dup)}`, which meant a
                    reviewer could only reject PEP and duplicate cases — a plain
                    blurry-photo rejection was impossible from the queue. */}
                <Button variant="destructive" disabled={busy} onClick={() => void decide("REJECTED")}>
                  Reject
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void decide("CLEARER")}>
                  Ask for Clearer Photo
                </Button>
                <Button disabled={busy} title="Press A" onClick={() => void decide("VERIFIED")}>
                  <Check size={15} /> Approve{" "}
                  <span className="kbd" style={{ background: "rgba(255,255,255,.25)", borderColor: "rgba(255,255,255,.4)", color: "#fff" }}>
                    A
                  </span>
                </Button>
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
          </Card>
        ) : (
          <Card className="queue-detail card">
            <div className="empty-detail">
              <UserCheck size={40} style={{ color: "var(--ops-text-3)" }} />
              <p>Select a record to review.</p>
              <span className="kbd-hint">
                Tip: use <span className="kbd">↑</span> <span className="kbd">↓</span> arrows to navigate the queue
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
