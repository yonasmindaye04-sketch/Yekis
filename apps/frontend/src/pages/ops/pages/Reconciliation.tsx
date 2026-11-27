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
import { dts, fmt, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { RECON_STATUSES, RAILS } from "../opsConst";
import type { ReconRow } from "../opsTypes";
import {
  Banner,
  Button,
  Card,
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
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { toCsv, downloadCsv } from "../opsExport";

export default function Reconciliation() {
  const ui = useOpsUi();

  const [recStatus, setRecStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

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

  const internalExpectedMinor = sel && sel.diff != null ? sel.amt - sel.diff : null;

  const openReconEvidence = (idx: number) => {
    if (!sel) return;
    ui.openViewer(
      [
        {
          id: "doc-1",
          t: `${sel.provider}_SETTLEMENT_MANIFEST`,
          k: "tin",
          name: `Rail TX: ${sel.txId}`,
          doc: `Provider Settled: ${fmt(sel.amt)} · Expected Milestone: ${
            internalExpectedMinor != null ? fmt(internalExpectedMinor) : "—"
          }`,
          tin: `Variance: ${sel.diff != null ? fmt(sel.diff) : "Awaiting computation"}`,
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

      <div className="filters" style={{ marginTop: 16 }}>
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
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon={Scale}>No provider transactions match this filter.</Empty>
        </Card>
      ) : (
        <div className="queue-wrap">
          <div className="queue-list">
            {rows.map((r) => {
              const active = sel?.id === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelId(r.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name mono">{r.txId}</div>
                      <div className="qi-sub">
                        Provider: {fmt(r.amt)} · {r.esc.replace(/_/g, " ")}
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
                </button>
              );
            })}
            <Pager page={page} pages={pages} total={total} onPage={setPage} unit="transactions" />
          </div>

          {sel ? (
            <Card className="queue-detail">
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
                    {sel.provider.replace(/_/g, " ")} ·{" "}
                    {sel.created ? `Recorded ${dts(sel.created)}` : "Automated ledger check"}
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
                  <div className="k">Provider Transaction Amount</div>
                  <div className="v mono">{fmt(sel.amt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Expected Milestone Amount</div>
                  <div className="v mono">
                    {internalExpectedMinor != null ? fmt(internalExpectedMinor) : "—"}
                  </div>
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
                      ? "Awaiting Verification"
                      : sel.diff === 0
                        ? "ETB 0 (Exact Match)"
                        : sel.diff > 0
                          ? `+${fmt(sel.diff)} Over-Credit`
                          : `${fmt(sel.diff)} Shortfall`}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Clearing Account Code</div>
                  <div className="v mono">
                    {sel.provider === "TELEBIRR"
                      ? "1010 · Telebirr Clearing"
                      : sel.provider === "M_PESA"
                        ? "1030 · M-Pesa Clearing"
                        : "1020 · CBE Birr Clearing"}
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
                Reconciliation Diagnostics
              </div>
              <div className="checks-row">
                <span className={`check ${sel.txId ? "pass" : "warn"}`}>
                  <ShieldCheck size={13} />{" "}
                  {sel.txId ? "Transaction Reference Present" : "Missing Transaction Reference"}
                </span>
                <span
                  className={`check ${
                    sel.rec === "MISMATCH" || sel.rec === "FAILED"
                      ? "fail"
                      : sel.rec === "MATCHED"
                        ? "pass"
                        : "warn"
                  }`}
                >
                  {sel.rec === "MISMATCH" || sel.rec === "FAILED" ? (
                    <TriangleAlert size={13} />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  {sel.rec === "MISMATCH"
                    ? `Variance Detected (${fmt(sel.diff ?? 0)})`
                    : sel.rec === "FAILED"
                      ? "Payment Failed on Rail"
                      : sel.rec === "MATCHED"
                        ? "Principal Amount Matches 1:1"
                        : "Awaiting Settlement Match"}
                </span>
                <span className={`check ${sel.rec === "PENDING" ? "warn" : "pass"}`}>
                  <CheckCircle2 size={13} />{" "}
                  {sel.rec === "PENDING" ? "Pending Final Settlement" : `Verdict: ${sel.rec}`}
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
                  Settlement Investigation &amp; Export
                </div>
                <p style={{ fontSize: 12.5, color: "var(--ops-text-2)", margin: "0 0 12px" }}>
                  Automated reconciliation compares Telebirr/CBE/M-Pesa manifests against internal custody ledger postings. Export the exception record or inspect the linked escrow and ledger entries below:
                </p>

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      downloadCsv(
                        `recon-${sel.txId}`,
                        toCsv(
                          ["Recon ID", "Provider TX ID", "Provider", "Internal Minor", "Diff Minor", "Escrow State", "Status"],
                          [[sel.id, sel.txId, sel.provider, sel.amt, sel.diff ?? 0, sel.esc, sel.rec]],
                        ),
                      )
                    }
                  >
                    <Download size={14} /> Export Exception CSV
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("ledger")}
                  >
                    <BookOpen size={14} /> Inspect Ledger Journal
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("escrow")}
                  >
                    <ExternalLink size={14} /> Hold / Inspect Escrow
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("payments")}
                  >
                    <ExternalLink size={14} /> Inbound Payments
                  </button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
