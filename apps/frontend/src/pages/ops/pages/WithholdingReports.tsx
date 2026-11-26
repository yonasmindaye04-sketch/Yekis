/**
 * WithholdingReports.tsx — Ethiopian Revenues & Customs Authority (ERCA/MOR)
 * Withholding Tax (Form WHT-03) filing & CSV export workbench.
 * Backed strictly by `opsApi.withholdingReports()` and `opsApi.fileWithholdingReport()`,
 * without synthetic contractor splits or stubbed local toggles.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { dt, fmt, opsApi } from "../opsApi";
import {
  Button,
  Card,
  Empty,
  Kv,
  LoadingBox,
  PageHead,
  Pill,
  useToast,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { downloadCsv, toCsv } from "../opsExport";

interface WithholdingReport {
  id: string;
  periodMonth: string;
  totalWithholdingMinor: number;
  transactionCount: number;
  eraReferenceNumber: string | null;
  filedAt: string | null;
}

export default function WithholdingReports() {
  const ui = useOpsUi();
  const toast = useToast();

  const [rows, setRows] = useState<WithholdingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [eraRefInput, setEraRefInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await opsApi.withholdingReports({ limit: 50 })) as { data?: WithholdingReport[] };
      const items = (res.data ?? []) as WithholdingReport[];
      setRows(items);
      if (items.length > 0 && (!selId || !items.some((r) => r.id === selId))) {
        setSelId(items[0].id);
      }
    } catch {
      toast("Failed to load ERCA withholding reports");
    } finally {
      setLoading(false);
    }
  }, [selId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const sel = useMemo(() => rows.find((r) => r.id === selId) ?? null, [rows, selId]);

  useEffect(() => {
    if (sel) {
      setEraRefInput(sel.eraReferenceNumber ?? "");
    }
  }, [sel]);

  const fileWithEra = async () => {
    if (!sel || busy) return;
    const value = eraRefInput.trim();
    if (value.length < 4) {
      toast("Enter the official ERA / MOR filing reference number (min 4 characters).");
      return;
    }
    setBusy(true);
    try {
      await opsApi.fileWithholdingReport(sel.id, value);
      toast(`Tax period ${sel.periodMonth} marked as filed with ERA (${value}).`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not file withholding report");
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;

  const totalLiability = rows.reduce((s, r) => s + r.totalWithholdingMinor, 0);
  const unfiledCount = rows.filter((r) => !r.filedAt).length;
  const filedCount = rows.filter((r) => Boolean(r.filedAt)).length;
  const totalTxCount = rows.reduce((s, r) => s + r.transactionCount, 0);

  return (
    <div className="fade">
      <PageHead
        title="ERCA Withholding Tax (WHT)"
        sub="Monthly 3% / 30% Ethiopian Revenues & Customs Authority remittances and return filings"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() =>
                downloadCsv(
                  "yekis-erca-withholding-periods",
                  toCsv(
                    [
                      "Report ID",
                      "Period Month",
                      "Withheld Minor",
                      "Transaction Count",
                      "ERA Reference",
                      "Filed At",
                    ],
                    rows.map((r) => [
                      r.id,
                      r.periodMonth,
                      r.totalWithholdingMinor,
                      r.transactionCount,
                      r.eraReferenceNumber ?? "",
                      r.filedAt ?? "",
                    ]),
                  ),
                )
              }
            >
              <Download size={14} /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kv
          k="Total WHT Liability"
          v={fmt(totalLiability)}
          title="Inspect Account 2030 in Ledger"
          onClick={() => ui.navigate("ledger")}
        />
        <Kv
          k="Pending Tax Filings"
          v={String(unfiledCount)}
          warn={unfiledCount > 0}
          title="Select unfiled tax period"
          onClick={() => {
            const unfiled = rows.find((r) => !r.filedAt);
            if (unfiled) setSelId(unfiled.id);
          }}
        />
        <Kv
          k="Filed Tax Periods"
          v={`${filedCount} / ${rows.length}`}
          title="Select most recent filed tax period"
          onClick={() => {
            const filed = rows.find((r) => Boolean(r.filedAt));
            if (filed) setSelId(filed.id);
          }}
        />
        <Kv
          k="Withholding Transactions"
          v={String(totalTxCount)}
          title="Open Payouts & Disbursements Workbench"
          onClick={() => ui.navigate("payouts")}
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon={FileText}>No withholding tax periods found.</Empty>
        </Card>
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
                      <div className="qi-name">Period {r.periodMonth}</div>
                      <div className="qi-sub">{r.transactionCount} freelancer disbursements</div>
                    </div>
                    <Pill s={r.filedAt ? "CONFIRMED" : "PENDING"} />
                  </div>
                  <div className="qi-foot">
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {fmt(r.totalWithholdingMinor)}
                    </span>
                    <span>·</span>
                    <span className="mono">{r.eraReferenceNumber ?? "Unfiled"}</span>
                  </div>
                </div>
              );
            })}
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ops-text-2)" }}>
                      ERCA Form WHT-03
                    </span>
                    <Pill s={sel.filedAt ? "CONFIRMED" : "PENDING"} />
                    <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                      {sel.id}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      margin: "8px 0 2px",
                      letterSpacing: "-.02em",
                    }}
                  >
                    Withholding Return — {sel.periodMonth}
                  </h3>
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                    {sel.filedAt
                      ? `Filed on ${dt(sel.filedAt)} · ERA Reference: ${sel.eraReferenceNumber}`
                      : "Due by the 30th of the following month per Ethiopian Federal Income Tax Proclamation"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => ui.navigate("ledger")}
                  >
                    <ExternalLink size={13} /> Account 2030 Ledger
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => ui.navigate("payouts")}
                  >
                    <ExternalLink size={13} /> Source Payouts
                  </button>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Total WHT Remittance</div>
                  <div className="v mono">{fmt(sel.totalWithholdingMinor)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Estimated Gross Payout Base (at 3% rate)</div>
                  <div className="v mono">{fmt(Math.round(sel.totalWithholdingMinor / 0.03))}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Withheld Payout Count</div>
                  <div className="v mono">{sel.transactionCount} payouts</div>
                </div>
                <div className="info-cell">
                  <div className="k">ERA Filing Reference</div>
                  <div className="v mono">{sel.eraReferenceNumber ?? "Pending Submission"}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Period Audit &amp; Filing Status
              </div>
              <div className="checks-row">
                <span className="check pass">
                  <ShieldCheck size={13} /> Aggregated from Account 2030 Remittances
                </span>
                <span className={`check ${sel.filedAt ? "pass" : "warn"}`}>
                  {sel.filedAt ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />}
                  {sel.filedAt
                    ? `ERA Receipt Recorded (${sel.eraReferenceNumber})`
                    : "Awaiting ERA E-Tax Filing"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: "1px solid var(--ops-border-soft)",
                }}
              >
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Record ERA Filing Receipt &amp; Export Return
                </div>

                {!sel.filedAt ? (
                  <div className="fld" style={{ marginBottom: 12 }}>
                    <label className="lbl">ERA / MOR Official Filing Reference Number</label>
                    <input
                      className="inp mono"
                      placeholder="e.g. ERCA-WH-202610-90412"
                      value={eraRefInput}
                      onChange={(e) => setEraRefInput(e.target.value)}
                    />
                  </div>
                ) : null}

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  {!sel.filedAt ? (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={busy || !eraRefInput.trim()}
                      onClick={() => void fileWithEra()}
                    >
                      <FileCheck size={14} /> Mark Filed with ERA Reference
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      downloadCsv(
                        `erca-wht-${sel.periodMonth}`,
                        toCsv(
                          [
                            "Period",
                            "Report ID",
                            "Total Withheld Minor",
                            "Transactions",
                            "ERA Reference",
                            "Filed At",
                          ],
                          [
                            [
                              sel.periodMonth,
                              sel.id,
                              sel.totalWithholdingMinor,
                              sel.transactionCount,
                              sel.eraReferenceNumber ?? "UNFILED",
                              sel.filedAt ?? "UNFILED",
                            ],
                          ],
                        ),
                      )
                    }
                  >
                    <Download size={14} /> Export Period Summary CSV
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
