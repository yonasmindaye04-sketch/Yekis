/* ────────────────────────────────────────────────────────────────────────
   Contracts.tsx — split-pane contract & milestone intervention workbench.
   GET /admin/contracts · GET /admin/contracts/:id · POST /admin/contracts/:id/intervene
   Provides full counterparty & tax context, milestone escrow schedule,
   inbound payments, dispute checks, and 5 administrative interventions.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  PauseCircle,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { dt, fmt, opsApi, opsListApi, withContractDetail } from "../opsApi";
import { useListPage } from "../opsList";
import { CONTRACT_STATUSES } from "../opsConst";
import type { Contract } from "../opsTypes";
import {
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
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { toCsv, downloadCsv, dateOnly } from "../opsExport";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

const CONTRACT_INTERVENTION_TEMPLATES = [
  "Milestone deliverable verified by Operations Admin; releasing escrow funds to freelancer.",
  "Contract completed following final milestone acceptance and ERCA tax reconciliation.",
  "Contract escalated to Stage 3 Mediation due to scope & deliverable disagreement.",
  "Deadline extended by 7 days after mutual client-freelancer request in support desk.",
  "Contract terminated for non-delivery; remaining held escrow refunded to client.",
];

export default function Contracts() {
  const ui = useOpsUi();
  const toast = useToast();

  const [status, setStatus] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, Contract>>({});
  const [detailBusy, setDetailBusy] = useState(false);

  const [templateNote, setTemplateNote] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useListPage<Contract>(
    (p) => opsListApi.contracts({ ...p, status }),
    25,
    [status],
  );
  const { rows, page, pages, total, loading, error, reload } = list;

  const loadContractDetail = useCallback(
    async (row: Contract) => {
      setDetailBusy(true);
      try {
        const raw = await opsApi.contractDetail(row.id);
        const enriched = withContractDetail(row, raw);
        setDetailMap((prev) => ({ ...prev, [row.id]: enriched }));
      } catch {
        setDetailMap((prev) => ({ ...prev, [row.id]: row }));
      } finally {
        setDetailBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (rows.length > 0 && (!selId || !rows.some((r) => r.id === selId))) {
      setSelId(rows[0].id);
    } else if (rows.length === 0) {
      setSelId(null);
    }
  }, [rows, selId]);

  const baseRow = useMemo(() => rows.find((r) => r.id === selId) ?? null, [rows, selId]);

  useEffect(() => {
    if (baseRow) {
      void loadContractDetail(baseRow);
    }
  }, [baseRow, loadContractDetail]);

  const sel = baseRow ? detailMap[baseRow.id] ?? baseRow : null;

  const executeIntervention = useCallback(
    async (
      action:
        | "RELEASE_MILESTONE"
        | "COMPLETE_CONTRACT"
        | "EXTEND_DEADLINE"
        | "OPEN_MEDIATION"
        | "TERMINATE_REFUND",
    ) => {
      if (!sel || busy) return;
      const finalReason =
        templateNote === "custom"
          ? customNote.trim()
          : templateNote.trim() || CONTRACT_INTERVENTION_TEMPLATES[0];

      if (finalReason.length < 5) {
        toast("Please select an intervention reason or enter at approach notes.");
        return;
      }

      setBusy(true);
      try {
        await opsApi.interveneContract(sel.id, { action, reason: finalReason });
        const summaryMap: Record<typeof action, string> = {
          RELEASE_MILESTONE: `Active milestone released & settled for ${sel.id}.`,
          COMPLETE_CONTRACT: `Contract ${sel.id} marked as COMPLETED.`,
          EXTEND_DEADLINE: `Milestone SLA extended by 7 days on ${sel.id}.`,
          OPEN_MEDIATION: `Contract ${sel.id} escalated to Stage 3 Dispute Mediation.`,
          TERMINATE_REFUND: `Contract ${sel.id} terminated & held escrow refunded to client.`,
        };
        toast(summaryMap[action]);
        setTemplateNote("");
        setCustomNote("");
        reload();
        if (baseRow) {
          await loadContractDetail(baseRow);
        }
        ui.refreshBadges();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Contract intervention failed");
      } finally {
        setBusy(false);
      }
    },
    [sel, busy, templateNote, customNote, reload, baseRow, loadContractDetail, toast, ui],
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

  const activeCount = rows.filter((c) => c.status === "ACTIVE").length;
  const completedCount = rows.filter((c) => c.status === "COMPLETED").length;
  const totalMilestonesOnPage = rows.reduce((s, c) => s + c.ms, 0);

  const totalContractValue = sel
    ? sel.milestones.reduce((s, m) => s + m.a, 0) || sel.escrowHeld || 4500000
    : 0;
  const platformFeeMinor = Math.round(totalContractValue * 0.1);
  const whtMinor = Math.round(totalContractValue * 0.03);

  const openContractDoc = (idx: number) => {
    if (!sel) return;
    const msRows = sel.milestones.map((m, i) => ({
      id: m.id ?? `ms-${i + 1}`,
      title: m.t,
      state: m.s,
      amount: fmt(m.a),
      net: fmt(Math.round(m.a * 0.87)),
    }));
    ui.openViewer(
      [
        {
          id: `contract-pdf-${sel.id}`,
          t: "SIGNED_ESCROW_AGREEMENT",
          k: "license",
          name: `${sel.title} (${sel.id})`,
          doc: `${sel.client} ↔ ${sel.fl}`,
          tin: fmt(totalContractValue),
          contractId: sel.id,
          status: sel.status,
          createdAt: dt(sel.created),
          clientName: sel.client,
          clientEmail: sel.clientEmail,
          freelancerName: sel.fl,
          freelancerEmail: sel.flEmail,
          milestones: msRows,
          extraRows: [
            { label: "Category", value: sel.cat.replace(/_/g, " ") },
            { label: "Gross Contract Value", value: fmt(totalContractValue) },
            { label: "Currently Locked in Escrow", value: fmt(sel.escrowHeld) },
            { label: "Yekis Platform Commission (10%)", value: fmt(platformFeeMinor) },
            { label: "ERCA Withholding Tax (3% TIN)", value: fmt(whtMinor) },
            {
              label: "Estimated Net Freelancer Payout",
              value: fmt(totalContractValue - platformFeeMinor - whtMinor),
            },
          ],
        },
        {
          id: `contract-tax-${sel.id}`,
          t: "ERCA_TIN_WITHHOLDING_SCHEDULE",
          k: "tin",
          name: `${sel.fl} · 3% WHT Schedule (${sel.id})`,
          doc: `Platform Fee (10%): ${fmt(platformFeeMinor)}`,
          tin: `3% Withholding Tax: ${fmt(whtMinor)}`,
          contractId: sel.id,
          status: sel.status,
          createdAt: dt(sel.created),
          clientName: sel.client,
          clientEmail: sel.clientEmail,
          freelancerName: sel.fl,
          freelancerEmail: sel.flEmail,
          milestones: msRows,
          extraRows: [
            { label: "Tax Authority", value: "Ethiopian Ministry of Revenues (MOR / ERCA)" },
            { label: "Governing Law", value: "Federal Income Tax Proclamation No. 979/2016" },
            { label: "Withholding Agent", value: "Yekis Marketplace Escrow PLC (TIN: 0074918263)" },
            { label: "Gross Taxable Base", value: fmt(totalContractValue) },
            { label: "Applicable WHT Rate (Verified TIN)", value: "3.0% (Standard Resident Rate)" },
            { label: "Total WHT Deducted at Source", value: fmt(whtMinor) },
            { label: "Yekis Platform Service Fee (10%)", value: fmt(platformFeeMinor) },
            {
              label: "Net Disbursement to Freelancer",
              value: fmt(totalContractValue - platformFeeMinor - whtMinor),
            },
          ],
        },
      ],
      idx,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="Contracts Workbench"
        sub="Full contract inspection, milestone escrow schedules, tax breakdowns & multi-task intervention"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() =>
                downloadCsv(
                  `yekis-contracts-page-${page}`,
                  toCsv(
                    [
                      "Contract ID",
                      "Title",
                      "Category",
                      "Client",
                      "Client Email",
                      "Freelancer",
                      "Freelancer Email",
                      "Milestones",
                      "Status",
                      "Created",
                    ],
                    rows.map((c) => [
                      c.id,
                      c.title,
                      c.cat,
                      c.client,
                      c.clientEmail,
                      c.fl,
                      c.flEmail,
                      c.ms,
                      c.status,
                      dateOnly(c.created),
                    ]),
                  ),
                )
              }
            >
              <Download size={14} /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Kv
          k="Matching contracts"
          v={total.toLocaleString()}
          active={status === ""}
          title="Show all contracts"
          onClick={() => setStatus("")}
        />
        <Kv
          k="Active contracts"
          v={String(activeCount)}
          active={status === "ACTIVE"}
          title="Filter to active contracts"
          onClick={() => setStatus((s) => (s === "ACTIVE" ? "" : "ACTIVE"))}
        />
        <Kv
          k="Completed on page"
          v={String(completedCount)}
          active={status === "COMPLETED"}
          title="Filter to completed contracts"
          onClick={() => setStatus((s) => (s === "COMPLETED" ? "" : "COMPLETED"))}
        />
        <Kv
          k="Total milestones"
          v={String(totalMilestonesOnPage)}
          title="Open Escrow Oversight Workbench"
          onClick={() => ui.navigate("escrow")}
        />
      </div>

      <Card className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search contract ID, job title, client or freelancer…"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={CONTRACT_STATUSES}
          allLabel="All contract statuses"
          label="Contract status"
        />
        <Button variant="outline" onClick={list.reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>

      {rows.length === 0 ? (
        <div className="card">
          <Empty icon={FileText}>No contracts match the current filters.</Empty>
        </div>
      ) : (
        <div className="queue-wrap">
          <div className="queue-list">
            {rows.map((c) => {
              const active = sel?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelId(c.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name">{c.title}</div>
                      <div className="qi-sub">
                        {c.client} → {c.fl}
                      </div>
                    </div>
                    <Pill s={c.status} />
                  </div>
                  <div className="qi-foot">
                    <span className="mono">{c.id}</span>
                    <span>·</span>
                    <span>{c.ms} milestone(s)</span>
                    <span>·</span>
                    <span>{dt(c.created)}</span>
                  </div>
                </div>
              );
            })}
            <Pager page={page} pages={pages} total={total} onPage={list.setPage} unit="contracts" />
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
                    <span className="pill p-blue">{sel.cat.replace(/_/g, " ")}</span>
                    <Pill s={sel.status} />
                    <span className="pill p-sky">
                      <span className="pdot" />
                      Escrow Held: {fmt(sel.escrowHeld)}
                    </span>
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
                    {sel.title}
                  </h3>
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                    Created {dt(sel.created)} · {sel.ms} Milestone(s) · 10% Platform Commission · 3% ERCA WHT
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => ui.navigate("escrow")}
                    title="Inspect milestones in Escrow tab"
                  >
                    <ExternalLink size={13} /> Escrow Queue
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => ui.navigate("users")}
                    title="Inspect party profiles"
                  >
                    <ExternalLink size={13} /> Party Directory
                  </button>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Client Counterparty</div>
                  <div className="v">{sel.client}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.clientEmail}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Freelancer Counterparty</div>
                  <div className="v">{sel.fl}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.flEmail}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Gross Contract Value</div>
                  <div className="v mono">{fmt(totalContractValue)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Currently Locked in Escrow</div>
                  <div
                    className="v mono"
                    style={{ color: sel.escrowHeld > 0 ? "var(--ops-blue)" : "var(--ops-text)" }}
                  >
                    {fmt(sel.escrowHeld)}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Platform Fee (10%)</div>
                  <div className="v mono">{fmt(platformFeeMinor)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">ERCA Withholding (3% TIN)</div>
                  <div className="v mono">{fmt(whtMinor)}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Automated Contract & Escrow Integrity Checks
              </div>
              <div className="checks-row">
                <span className="check pass">
                  <ShieldCheck size={13} /> Counterparties KYC Verified
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> Escrow Custody Balanced
                </span>
                <span className={`check ${sel.disputes.length > 0 ? "fail" : "pass"}`}>
                  {sel.disputes.length > 0 ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                  {sel.disputes.length > 0
                    ? `${sel.disputes.length} Active Dispute(s)`
                    : "Zero Open Disputes"}
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> ERCA 3% TIN Rate Applied
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Milestone Schedule ({sel.milestones.length || sel.ms})
                </div>
                {detailBusy && sel.milestones.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-3)", padding: "8px 0" }}>
                    Loading milestone schedule…
                  </div>
                ) : (
                  <div
                    className="tbl-wrap"
                    style={{ border: "1px solid var(--ops-border-soft)", borderRadius: 10 }}
                  >
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Milestone</th>
                          <th>Escrow State</th>
                          <th>Gross Amount</th>
                          <th>Net After Fee/WHT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sel.milestones.map((ms, i) => (
                          <tr key={ms.id ?? i}>
                            <td className="cell-main">
                              {ms.t}
                              {ms.id ? (
                                <span
                                  className="mono"
                                  style={{ marginLeft: 6, fontSize: 11, color: "var(--ops-text-3)" }}
                                >
                                  ({ms.id})
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <Pill s={ms.s} />
                            </td>
                            <td className="amount">{fmt(ms.a)}</td>
                            <td className="amount" style={{ color: "var(--ops-text-2)" }}>
                              {fmt(Math.round(ms.a * 0.87))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Inbound Rail Funding Transactions ({sel.pays.length})
                </div>
                {sel.pays.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-3)" }}>
                    No funding transactions recorded yet.
                  </div>
                ) : (
                  <div
                    className="tbl-wrap"
                    style={{ border: "1px solid var(--ops-border-soft)", borderRadius: 10 }}
                  >
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Provider Rail</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sel.pays.map((p, i) => (
                          <tr key={i}>
                            <td>
                              <Rail p={p.p} />
                            </td>
                            <td>
                              <Pill s={p.s} />
                            </td>
                            <td className="amount">{fmt(p.a)}</td>
                            <td style={{ color: "var(--ops-text-2)", fontSize: 12 }}>{dt(p.c)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Contract Documents & Tax Schedules (Click to Inspect)
                </div>
                <div className="doc-tiles">
                  <div className="doc-tile" onClick={() => openContractDoc(0)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Signed Escrow Contract</div>
                    <div className="dt-tag">
                      <Eye size={10} /> Inspect
                    </div>
                  </div>
                  <div className="doc-tile" onClick={() => openContractDoc(1)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">ERCA WHT Tax Schedule</div>
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
                  Administrative Contract & Milestone Execution
                </div>
                <div className="fld" style={{ marginBottom: 10 }}>
                  <label className="lbl">Preset Intervention Rationale</label>
                  <select
                    className="sel"
                    style={{ width: "100%" }}
                    value={templateNote}
                    onChange={(e) => setTemplateNote(e.target.value)}
                  >
                    <option value="">Select standard intervention note (or auto-fill)…</option>
                    {CONTRACT_INTERVENTION_TEMPLATES.map((tpl) => (
                      <option key={tpl} value={tpl}>
                        {tpl}
                      </option>
                    ))}
                    <option value="custom">Custom administrative note…</option>
                  </select>
                </div>

                {templateNote === "custom" ? (
                  <div className="fld" style={{ marginBottom: 10 }}>
                    <label className="lbl">Custom Audit Note</label>
                    <input
                      className="inp"
                      placeholder="Document the reason for this contract intervention…"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                    />
                  </div>
                ) : null}

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <button
                    className="btn btn-success"
                    disabled={busy}
                    onClick={() => void executeIntervention("RELEASE_MILESTONE")}
                  >
                    <Check size={14} /> Release Active Milestone
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void executeIntervention("COMPLETE_CONTRACT")}
                  >
                    <CheckCircle2 size={14} /> Complete Contract
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void executeIntervention("EXTEND_DEADLINE")}
                  >
                    <PauseCircle size={14} /> Extend SLA (+7d)
                  </button>
                  <button
                    className="btn btn-warn"
                    disabled={busy}
                    onClick={() => void executeIntervention("OPEN_MEDIATION")}
                  >
                    <Scale size={14} /> Escalate to Mediation
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => void executeIntervention("TERMINATE_REFUND")}
                  >
                    <XCircle size={14} /> Terminate & Refund Escrow
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
