/* ────────────────────────────────────────────────────────────────────────
   Ledger.tsx — double-entry chart of accounts & split-pane journal workbench.
   GET /admin/ledger · GET /admin/ledger/journals · POST /admin/ledger/journals/:id/action
   Preserves top account balance cards & integrity banner while upgrading the
   journal table into a full double-entry leg inspector and adjustment workbench.
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { dts, fmt, opsApi, opsListApi, useApi } from "../opsApi";
import { useListPage } from "../opsList";
import { JOURNAL_TYPES } from "../opsConst";
import type { JournalEntry, LedgerBundle } from "../opsTypes";
import {
  Banner,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  PageHead,
  Card,
  Pager,
  Pill,
  Button,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { toCsv, downloadCsv } from "../opsExport";

export default function Ledger() {
  const ui = useOpsUi();

  const summary = useApi<LedgerBundle>(opsApi.ledger);
  const [refType, setRefType] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const journals = useListPage<JournalEntry>(
    (p) => opsListApi.ledgerJournals({ ...p, referenceType: refType }),
    25,
    [refType],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = journals;

  useEffect(() => {
    if (rows.length > 0 && (!selId || !rows.some((r) => r.id === selId))) {
      setSelId(rows[0].id);
    } else if (rows.length === 0) {
      setSelId(null);
    }
  }, [rows, selId]);

  const sel = useMemo(() => rows.find((r) => r.id === selId) ?? null, [rows, selId]);
  const legs = sel?.entries ?? [];
  const discrepancyMinor = sel ? Math.abs(sel.dr - sel.cr) : 0;

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const bundle = summary.data;

  const openVoucher = () => {
    if (!sel) return;
    ui.openViewer(
      [
        {
          id: "doc-1",
          t: "DOUBLE_ENTRY_JOURNAL_VOUCHER",
          k: "license",
          name: `Journal ${sel.id} (${sel.ref})`,
          doc: sel.desc,
          tin: `Debits: ${fmt(sel.dr)} = Credits: ${fmt(sel.cr)}`,
        },
      ],
      0,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="Double-Entry Ledger Workbench"
        sub="Chart of accounts, live debit/credit invariant verification, journal leg drilldown & contra adjustments"
        right={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `yekis-ledger-journals-page-${page}`,
                toCsv(
                  ["Journal ID", "Description", "Reference Type", "Debits Minor", "Credits Minor", "Posted At"],
                  rows.map((j) => [j.id, j.desc, j.ref, j.dr, j.cr, j.posted]),
                ),
              )
            }
          >
            <Download size={14} /> Export Journals CSV
          </Button>
        }
      />

      {bundle ? (
        <>
          <div className="grid g6" style={{ marginBottom: 16 }}>
            {bundle.accounts.slice(0, 12).map((a) => (
              <Card className="acct-card" key={a.code}>
                <div className="acct-type" style={{ color: a.c }}>
                  {a.type}
                </div>
                <div className="acct-name">{a.name}</div>
                <div className="acct-bal">{fmt(a.bal)}</div>
                <div className="acct-code mono">{a.code}</div>
              </Card>
            ))}
          </div>
          {bundle.integrity.bal ? (
            <Banner
              tone="b-green"
              icon={CheckCircle2}
              strong="Integrity: Balanced"
              rest={`— debits ${fmt(bundle.integrity.dr)} · credits ${fmt(bundle.integrity.cr)} · ${bundle.integrity.entries.toLocaleString()} entries across ${bundle.integrity.journals} journals.`}
            />
          ) : (
            <Banner
              tone="b-red"
              icon={BookOpen}
              strong="Integrity: MISMATCH"
              rest={`— debits ${fmt(bundle.integrity.dr)} · credits ${fmt(bundle.integrity.cr)} · discrepancy is a real accounting fault, investigate immediately.`}
            />
          )}
          <div className="grid g4" style={{ marginTop: 16, marginBottom: 16 }}>
            <Kv k="Active accounts" v={String(bundle.accounts.length)} />
            <Kv k="Journals (all time)" v={bundle.integrity.journals.toLocaleString()} />
            <Kv k="Ledger entries" v={bundle.integrity.entries.toLocaleString()} />
            <Kv k="Journals matching filter" v={total.toLocaleString()} />
          </div>
        </>
      ) : summary.error ? (
        <ErrorBox error={summary.error} reload={summary.reload} />
      ) : (
        <LoadingBox />
      )}

      <div className="filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search description, reference ID or journal code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={refType}
          onChange={setRefType}
          options={JOURNAL_TYPES}
          allLabel="All journal types"
          label="Journal type"
        />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon={BookOpen}>No journal entries match.</Empty>
        </Card>
      ) : (
        <div className="queue-wrap">
          <div className="queue-list">
            {rows.map((j) => {
              const active = sel?.id === j.id;
              return (
                <button
                  type="button"
                  key={j.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelId(j.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name">{j.desc}</div>
                      <div className="qi-sub mono">
                        {j.id} {j.refId ? `· Entity: ${j.refId}` : ""}
                      </div>
                    </div>
                    <Pill s={j.ref} />
                  </div>
                  <div className="qi-foot">
                    <span className="mono" style={{ fontWeight: 700 }}>
                      DR {fmt(j.dr)} / CR {fmt(j.cr)}
                    </span>
                    <span>·</span>
                    <span>{dts(j.posted)}</span>
                  </div>
                </button>
              );
            })}
            <Pager page={page} pages={pages} total={total} onPage={setPage} unit="journals" />
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
                    <Pill s={sel.ref} />
                    <Pill s="BALANCED" />
                    <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                      {sel.id}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      margin: "8px 0 2px",
                      letterSpacing: "-.02em",
                    }}
                  >
                    {sel.desc}
                  </h3>
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                    Posted {dts(sel.posted)} · Source Reference:{" "}
                    <span className="mono">{sel.refId ?? sel.id}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={openVoucher}>
                    <Eye size={13} /> Inspect Voucher
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => ui.navigate("reconciliation")}
                  >
                    <ExternalLink size={13} /> Recon Queue
                  </button>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Journal ID</div>
                  <div className="v mono">{sel.id}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Reference Type</div>
                  <div className="v">{sel.ref.replace(/_/g, " ")}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Total Debited (DR)</div>
                  <div className="v mono">{fmt(sel.dr)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Total Credited (CR)</div>
                  <div className="v mono">{fmt(sel.cr)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Discrepancy</div>
                  <div
                    className="v mono"
                    style={{
                      color: discrepancyMinor === 0 ? "var(--ops-green)" : "var(--ops-red)",
                    }}
                  >
                    {fmt(discrepancyMinor)}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Idempotency Key</div>
                  <div className="v mono">{sel.idempotencyKey ?? "Not recorded"}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Double-Entry Invariant Checks
              </div>
              <div className="checks-row">
                <span className={`check ${discrepancyMinor === 0 ? "pass" : "fail"}`}>
                  <ShieldCheck size={13} />{" "}
                  {discrepancyMinor === 0
                    ? "Zero-Sum Invariant Verified (DR = CR)"
                    : `Journal Imbalance (${fmt(discrepancyMinor)})`}
                </span>
                <span className={`check ${sel.idempotencyKey ? "pass" : "none"}`}>
                  <CheckCircle2 size={13} />{" "}
                  {sel.idempotencyKey ? "Idempotency Key Present" : "System-Generated Journal"}
                </span>
                <span className={`check ${legs.length > 0 ? "pass" : "none"}`}>
                  <CheckCircle2 size={13} />{" "}
                  {legs.length > 0 ? `${legs.length} Itemized Legs Loaded` : "Summary Totals Loaded"}
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Itemized Double-Entry Journal Legs ({legs.length})
                </div>
                {legs.length === 0 ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--ops-border-soft)",
                      borderRadius: 10,
                      fontSize: 12.5,
                      color: "var(--ops-text-2)",
                    }}
                  >
                    No itemized leg rows returned for this journal summary.
                  </div>
                ) : (
                  <div
                    className="tbl-wrap"
                    style={{ border: "1px solid var(--ops-border-soft)", borderRadius: 10 }}
                  >
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Acct Code</th>
                          <th>Account Name</th>
                          <th>Type</th>
                          <th>Debit (DR)</th>
                          <th>Credit (CR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {legs.map((leg, idx) => (
                          <tr key={idx}>
                            <td className="mono" style={{ fontWeight: 700 }}>
                              {leg.code}
                            </td>
                            <td className="cell-main">{leg.name}</td>
                            <td>
                              <Pill s={leg.type} />
                            </td>
                            <td className="amount">{leg.dr > 0 ? fmt(leg.dr) : "—"}</td>
                            <td className="amount">{leg.cr > 0 ? fmt(leg.cr) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Journal Voucher Document
                </div>
                <div className="doc-tiles">
                  <div className="doc-tile" onClick={openVoucher}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Signed Journal Voucher</div>
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
                  Voucher Verification &amp; Audit Export
                </div>
                <p style={{ fontSize: 12.5, color: "var(--ops-text-2)", margin: "0 0 12px" }}>
                  General ledger entries are immutable, append-only double-entry records (DR = CR). Inspect the voucher breakdown or export the journal lines for external audit.
                </p>

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <Button variant="outline" onClick={openVoucher}>
                    <Eye size={14} /> Inspect Accounting Voucher
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadCsv(
                        `ledger-journal-${sel.id}`,
                        toCsv(
                          ["Journal ID", "Account Code", "Account Name", "Type", "Debit Minor", "Credit Minor"],
                          legs.map((l) => [sel.id, l.code, l.name, l.type, l.dr, l.cr]),
                        ),
                      )
                    }
                  >
                    <Download size={14} /> Export Journal Legs CSV
                  </Button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("reconciliation")}
                  >
                    <ExternalLink size={14} /> Open Reconciliation Queue
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