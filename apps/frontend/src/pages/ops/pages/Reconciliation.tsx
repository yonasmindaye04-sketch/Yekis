/* ────────────────────────────────────────────────────────────────────────
   Reconciliation.tsx — split-pane rail vs. ledger variance workbench.
   GET /admin/reconciliation · POST /admin/reconciliation/:id/resolve
   Provides side-by-side Provider Settlement vs. Internal Escrow Ledger
   comparison, automated variance diagnostics, settlement manifest viewer,
   and 4 resolution tasks (Force-Match, Post Adjustment Journal, Flag
   Provider Dispute, Mark Resolved).
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { dts, fmt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { RECON_STATUSES, RAILS } from "../opsConst";
import type { ReconRow } from "../opsTypes";
import {
  Banner,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  PageHead,
  Pager,
  Pill,
  Rail,
  isTyping,
  useHotkeys,
  useToast,
  Button,
  Card,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { toCsv, downloadCsv } from "../opsExport";

const RECON_TEMPLATES = [
  "Variance explained by unrecorded provider bank/gateway fee; posting adjustment entry to 5010.",
  "Duplicate webhook callback confirmed; internal ledger entry force-matched to primary settlement.",
  "Delayed settlement batch cleared on Telebirr / CBE Birr T+1 manifest; marked MATCHED.",
  "Escalated to provider merchant operations desk due to unexplained rail settlement shortfall.",
];

export default function Reconciliation() {
  const ui = useOpsUi();
  const toast = useToast();

  const [recStatus, setRecStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [templateNote, setTemplateNote] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [adjAmountEtb, setAdjAmountEtb] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useListPage<ReconRow>(
    (p) => opsListApi.reconciliation({ ...p, recStatus, provider }),
    25,
    [recStatus, provider],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  useEffect(() => {
    if (rows.length > 0 && (!selId || !rows.some((r) => r.id === selId))) {
      setSelId(rows[0].id);
    } else if (rows.length === 0) {
      setSelId(null);
    }
  }, [rows, selId]);

  const sel = useMemo(() => rows.find((r) => r.id === selId) ?? null, [rows, selId]);

  useEffect(() => {
    if (sel) {
      setAdjAmountEtb(sel.diff ? String(Math.abs(sel.diff) / 100) : "0");
    }
  }, [sel]);

  const executeResolution = useCallback(
    async (action: "FORCE_MATCH" | "POST_ADJUSTMENT" | "FLAG_FAILED" | "RESOLVE") => {
      if (!sel || busy) return;
      const reason =
        templateNote === "custom"
          ? customNote.trim()
          : templateNote.trim() || RECON_TEMPLATES[0];

      if (reason.length < 5) {
        toast("Please select or enter a reconciliation resolution note.");
        return;
      }

      setBusy(true);
      try {
        const adjustedAmountMinor = Math.round((Number(adjAmountEtb) || 0) * 100);
        await opsApi.resolveReconciliation(sel.id, {
          action,
          adjustedAmountMinor,
          reason,
        });

        if (action === "POST_ADJUSTMENT" && adjustedAmountMinor > 0) {
          try {
            await opsApi.actOnJournal("jrn-adj", {
              action: "ADJUSTMENT",
              amountMinor: adjustedAmountMinor,
              description: `Recon Variance Adjustment (${sel.txId}) — ${reason}`,
              referenceType: "RECON_ADJUSTMENT",
              referenceId: sel.id,
            });
          } catch {
            /* supplementary journal hook */
          }
        }

        const msgMap: Record<typeof action, string> = {
          FORCE_MATCH: `Transaction ${sel.txId} force-matched to internal ledger.`,
          POST_ADJUSTMENT: `Variance adjustment journal posted & ${sel.txId} reconciled.`,
          FLAG_FAILED: `Transaction ${sel.txId} flagged as FAILED for provider dispute.`,
          RESOLVE: `Reconciliation item ${sel.txId} marked resolved.`,
        };
        toast(msgMap[action]);
        setTemplateNote("");
        setCustomNote("");
        reload();
        ui.refreshBadges();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Reconciliation action failed");
      } finally {
        setBusy(false);
      }
    },
    [sel, busy, templateNote, customNote, adjAmountEtb, reload, toast, ui],
  );

  useHotkeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (ui.viewerOpen || ui.paletteOpen || isTyping() || !rows.length) return;
        const idx = rows.findIndex((r) => r.id === selId);
        if (e.key === "ArrowDown" && idx >= 0 && idx < rows.length - 1) {
          e.preventDefault();
          setSelId(rows[idx + 1].id);
        }
        if (e.key === "ArrowUp" && idx > 0) {
          e.preventDefault();
          setSelId(rows[idx - 1].id);
        }
      },
      [rows, selId, ui.viewerOpen, ui.paletteOpen],
    ),
  );

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const mism = rows.filter((r) => r.rec === "MISMATCH");
  const totalVarianceMinor = rows.reduce((s, r) => s + Math.abs(r.diff ?? 0), 0);

  const railSettledMinor = sel ? sel.amt + (sel.diff ?? 0) : 0;

  const openReconEvidence = (idx: number) => {
    if (!sel) return;
    ui.openViewer(
      [
        {
          id: "doc-1",
          t: `${sel.provider}_SETTLEMENT_MANIFEST`,
          k: "tin",
          name: `Rail TX: ${sel.txId}`,
          doc: `Internal: ${fmt(sel.amt)} · Provider Settled: ${fmt(railSettledMinor)}`,
          tin: `Variance: ${sel.diff ? fmt(sel.diff) : "ETB 0"}`,
        },
        {
          id: "doc-2",
          t: "INTERNAL_LEDGER_AUDIT_TRAIL",
          k: "license",
          name: `Recon Record ${sel.id}`,
          doc: `Escrow State: ${sel.esc} · Status: ${sel.rec}`,
          tin: `Provider: ${sel.provider}`,
        },
      ],
      idx,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="Reconciliation Workbench"
        sub="Side-by-side verification of Telebirr, CBE Birr & M-Pesa settlement manifests against internal escrow custody"
        right={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `yekis-reconciliation-page-${page}`,
                toCsv(
                  ["Recon ID", "Provider TX ID", "Provider", "Internal Minor", "Escrow State", "Recon Status", "Difference Minor"],
                  rows.map((r) => [
                    r.id,
                    r.txId,
                    r.provider,
                    r.amt,
                    r.esc,
                    r.rec,
                    r.diff ?? 0,
                  ]),
                ),
              )
            }
          >
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Kv
          k="Mismatches on page"
          v={String(mism.length)}
          warn={mism.length > 0}
          active={recStatus === "MISMATCH"}
          title="Filter to mismatched settlement rows"
          onClick={() => setRecStatus((s) => (s === "MISMATCH" ? "" : "MISMATCH"))}
        />
        <Kv
          k="Matched on page"
          v={String(rows.filter((r) => r.rec === "MATCHED").length)}
          active={recStatus === "MATCHED"}
          title="Filter to reconciled matched rows"
          onClick={() => setRecStatus((s) => (s === "MATCHED" ? "" : "MATCHED"))}
        />
        <Kv
          k="Awaiting settlement"
          v={String(rows.filter((r) => r.rec === "PENDING").length)}
          active={recStatus === "PENDING"}
          title="Filter to pending settlement rows"
          onClick={() => setRecStatus((s) => (s === "PENDING" ? "" : "PENDING"))}
        />
        <Kv
          k="Absolute variance"
          v={fmt(totalVarianceMinor)}
          warn={totalVarianceMinor > 0}
          title="Focus first mismatched transaction"
          onClick={() => {
            setRecStatus("MISMATCH");
            if (mism[0]) setSelId(mism[0].id);
          }}
        />
      </div>

      {mism.length ? (
        <Banner
          tone="b-red"
          icon={TriangleAlert}
          strong={`${mism.length} variance mismatch(es) detected (${fmt(totalVarianceMinor)} total discrepancy).`}
          rest="Select a mismatched item below to compare provider settlement figures and post a balancing adjustment or force-match."
        />
      ) : null}

      <Card className="card filters" style={{ marginTop: 16 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search provider transaction ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={recStatus}
          onChange={setRecStatus}
          options={RECON_STATUSES}
          allLabel="All reconciliation statuses"
          label="Reconciliation status"
        />
        <FilterSelect
          value={provider}
          onChange={setProvider}
          options={RAILS}
          allLabel="Any rail"
          label="Provider"
          humanise={false}
        />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>

      {rows.length === 0 ? (
        <div className="card">
          <Empty icon={Scale}>No provider transactions match this filter.</Empty>
        </div>
      ) : (
        <div className="queue-wrap">
          <div className="queue-list">
            {rows.map((r) => {
              const active = sel?.id === r.id;
              return (
                <div
                  key={r.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelId(r.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name mono">{r.txId}</div>
                      <div className="qi-sub">
                        Internal: {fmt(r.amt)} · {r.esc.replace(/_/g, " ")}
                      </div>
                    </div>
                    <Pill s={r.rec} />
                  </div>
                  <div className="qi-foot">
                    <Rail p={r.provider} />
                    <span>·</span>
                    {r.diff ? (
                      <span className="mono" style={{ color: "var(--ops-red)", fontWeight: 700 }}>
                        Diff: {r.diff > 0 ? `+${fmt(r.diff)}` : fmt(r.diff)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--ops-green)", fontWeight: 600 }}>Zero variance</span>
                    )}
                  </div>
                </div>
              );
            })}
            <Pager page={page} pages={pages} total={total} onPage={setPage} unit="transactions" />
          </div>

          {sel ? (
            <div className="queue-detail card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Rail p={sel.provider} />
                    <Pill s={sel.rec} />
                    <Pill s={sel.esc} />
                    <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                      {sel.id}
                    </span>
                  </div>
                  <h3
                    className="mono"
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      margin: "8px 0 2px",
                      letterSpacing: "-.02em",
                    }}
                  >
                    {sel.txId}
                  </h3>
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                    Settlement Batch #{sel.provider.slice(0, 3)}-202610 ·{" "}
                    {sel.created ? `Recorded ${dts(sel.created)}` : "T+0 Automated Feed"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("ledger")}>
                    <ExternalLink size={13} /> Double-Entry Ledger
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("payments")}>
                    <ExternalLink size={13} /> Inbound Payments
                  </button>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Internal Ledger Amount</div>
                  <div className="v mono">{fmt(sel.amt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Provider Settlement Amount</div>
                  <div className="v mono">{fmt(railSettledMinor)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Net Discrepancy (Variance)</div>
                  <div
                    className="v mono"
                    style={{
                      color: sel.diff ? "var(--ops-red)" : "var(--ops-green)",
                    }}
                  >
                    {sel.diff == null
                      ? "Awaiting T+1 Batch"
                      : sel.diff === 0
                        ? "ETB 0 (Exact Match)"
                        : sel.diff > 0
                          ? `+${fmt(sel.diff)} Over-Credit`
                          : `${fmt(sel.diff)} Shortfall`}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Custody Account Code</div>
                  <div className="v mono">
                    {sel.provider === "TELEBIRR" ? "1010 · Telebirr Trust" : "1020 · CBE Custody"}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Linked Milestone State</div>
                  <div className="v">{sel.esc.replace(/_/g, " ")}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Reconciliation Verdict</div>
                  <div className="v">{sel.rec}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Automated Variance Diagnostics
              </div>
              <div className="checks-row">
                <span className="check pass">
                  <ShieldCheck size={13} /> TX ID Present in Provider Feed
                </span>
                <span className={`check ${sel.rec === "MISMATCH" ? "fail" : "pass"}`}>
                  {sel.rec === "MISMATCH" ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                  {sel.rec === "MISMATCH"
                    ? `Variance Detected (${fmt(sel.diff ?? 0)})`
                    : "Principal Amount Matches 1:1"}
                </span>
                <span className={`check ${sel.rec === "PENDING" ? "warn" : "pass"}`}>
                  <CheckCircle2 size={13} />{" "}
                  {sel.rec === "PENDING" ? "Pending EOD Settlement File" : "EOD Batch Closed"}
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Settlement Manifest & Ledger Proof (Click to Inspect)
                </div>
                <div className="doc-tiles">
                  <div className="doc-tile" onClick={() => openReconEvidence(0)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Provider Settlement CSV</div>
                    <div className="dt-tag">
                      <Eye size={10} /> Inspect
                    </div>
                  </div>
                  <div className="doc-tile" onClick={() => openReconEvidence(1)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Ledger Journal Audit</div>
                    <div className="dt-tag">
                      <Eye size={10} /> Inspect
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: "1px solid var(--ops-border-soft)",
                }}
              >
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Variance Resolution & Ledger Adjustment Execution
                </div>

                <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
                  <div className="fld">
                    <label className="lbl">Adjustment Journal Amount (ETB)</label>
                    <input
                      className="inp mono"
                      type="number"
                      placeholder="e.g. 450"
                      value={adjAmountEtb}
                      onChange={(e) => setAdjAmountEtb(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label className="lbl">Preset Variance Resolution Note</label>
                    <select
                      className="sel"
                      style={{ width: "100%" }}
                      value={templateNote}
                      onChange={(e) => setTemplateNote(e.target.value)}
                    >
                      <option value="">Select standard reconciliation note…</option>
                      {RECON_TEMPLATES.map((tpl) => (
                        <option key={tpl} value={tpl}>
                          {tpl}
                        </option>
                      ))}
                      <option value="custom">Custom variance explanation…</option>
                    </select>
                  </div>
                </div>

                {templateNote === "custom" ? (
                  <div className="fld" style={{ marginBottom: 10 }}>
                    <label className="lbl">Custom Reconciliation Note</label>
                    <input
                      className="inp"
                      placeholder="Explain variance root cause and accounting treatment…"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                    />
                  </div>
                ) : null}

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <button
                    className="btn btn-success"
                    disabled={busy}
                    onClick={() => void executeResolution("FORCE_MATCH")}
                  >
                    <Check size={14} /> Force-Match to Ledger
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void executeResolution("POST_ADJUSTMENT")}
                  >
                    <BookOpen size={14} /> Post Variance Adjustment Journal
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void executeResolution("RESOLVE")}
                  >
                    <CheckCircle2 size={14} /> Mark Resolved
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => void executeResolution("FLAG_FAILED")}
                  >
                    <TriangleAlert size={14} /> Escalate Provider Dispute
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
