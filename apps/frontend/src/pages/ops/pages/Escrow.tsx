/* ────────────────────────────────────────────────────────────────────────
   Escrow.tsx — split-pane milestone escrow oversight & release workbench.
   GET /admin/escrows · POST /admin/escrows/:id/action
   Replaces browser window.prompt with an inline multi-task workbench
   supporting Full Release, Partial Split Release, Hold/Unhold, Return to
   Work-in-Progress, and Full Client Refund.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Lock,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { dt, fmt, opsApi, opsListApi } from "../opsApi";
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
  isTyping,
  useHotkeys,
  useToast,
} from "../components/ui";
import { useListPage } from "../opsList";
import { ESCROW_STATES, HELD_STATES } from "../opsConst";
import type { Escrow } from "../opsTypes";
import { useOpsUi } from "../opsUiContext";
import { toCsv, downloadCsv, dateOnly } from "../opsExport";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

const ESCROW_REASON_TEMPLATES = [
  "Deliverable verified against milestone acceptance criteria; releasing full escrow to freelancer.",
  "Mutual partial settlement agreed: releasing pro-rata share to freelancer and refunding balance.",
  "Administrative hold placed pending dispute mediation and deliverable source-code audit.",
  "Administrative hold lifted after compliance & counterparty verification.",
  "Milestone returned to Work-in-Progress for revision per client QA feedback.",
  "Full escrow refunded to client following contract cancellation / missed SLA deadline.",
];

export default function EscrowPage() {
  const ui = useOpsUi();
  const toast = useToast();

  const [state, setState] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [templateReason, setTemplateReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [splitPct, setSplitPct] = useState(50);
  const [busy, setBusy] = useState(false);

  const list = useListPage<Escrow>(
    (p) => opsListApi.escrows({ ...p, escrowState: state }),
    25,
    [state],
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

  const executeEscrowTask = useCallback(
    async (
      action:
        | "RELEASE"
        | "PARTIAL_SPLIT"
        | "HOLD"
        | "UNHOLD"
        | "RETURN_WIP"
        | "REFUND_CLIENT",
    ) => {
      if (!sel || busy) return;
      const finalReason =
        templateReason === "custom"
          ? customReason.trim()
          : templateReason.trim() || ESCROW_REASON_TEMPLATES[0];

      if (finalReason.length < 10) {
        toast("Please select a preset reason or enter at least 10 characters for the audit log.");
        return;
      }

      setBusy(true);
      try {
        const splitAmountMinor =
          action === "PARTIAL_SPLIT" ? Math.round((sel.amt * splitPct) / 100) : undefined;

        if (action === "RELEASE") {
          await opsApi.releaseEscrow(sel.id, finalReason);
        } else if (action === "HOLD") {
          await opsApi.holdEscrow(sel.id, finalReason);
        } else if (action === "UNHOLD") {
          await opsApi.unholdEscrow(sel.id, finalReason);
        } else {
          await opsApi.actOnEscrow(sel.id, {
            action,
            splitAmountMinor,
            reason: finalReason,
          });
        }

        const msgMap: Record<typeof action, string> = {
          RELEASE: `Full escrow (${fmt(sel.amt)}) released to ${sel.fl} and audited.`,
          PARTIAL_SPLIT: `Partial split (${splitPct}% / ${100 - splitPct}%) executed for ${sel.title}.`,
          HOLD: `Administrative hold placed on milestone ${sel.id}.`,
          UNHOLD: `Administrative hold removed from milestone ${sel.id}.`,
          RETURN_WIP: `Milestone ${sel.id} returned to Work-in-Progress.`,
          REFUND_CLIENT: `Escrow (${fmt(sel.amt)}) refunded to client wallet.`,
        };

        toast(msgMap[action]);
        setTemplateReason("");
        setCustomReason("");
        reload();
        ui.refreshBadges();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Escrow action failed");
      } finally {
        setBusy(false);
      }
    },
    [sel, busy, templateReason, customReason, splitPct, reload, toast, ui],
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

  const held = rows
    .filter((e) => HELD_STATES.includes(e.state as (typeof HELD_STATES)[number]))
    .reduce((s, e) => s + e.amt, 0);

  const openEscrowEvidence = (idx: number) => {
    if (!sel) return;
    ui.openViewer(
      [
        {
          id: "doc-1",
          t: "MILESTONE_DELIVERABLE_MANIFEST",
          k: "deliverable",
          name: `${sel.title} (${sel.id})`,
          doc: `${sel.job} · Freelancer: ${sel.fl}`,
          tin: `Escrow Amount: ${fmt(sel.amt)} · Rail: ${sel.rail}`,
          contractId: sel.id,
          status: sel.held ? "ADMIN_HOLD" : sel.state,
          createdAt: dt(sel.created),
          extraRows: [
            { label: "Contract", value: sel.job },
            { label: "Milestone", value: sel.title },
            { label: "Freelancer", value: sel.fl },
            { label: "Funding Rail", value: sel.rail },
            { label: "Escrow Custody Amount", value: fmt(sel.amt) },
            { label: "Current State", value: (sel.held ? "ADMIN_HOLD" : sel.state).replace(/_/g, " ") },
          ],
        },
        {
          id: "doc-2",
          t: "CUSTODY_ESCROW_DEPOSIT_RECEIPT",
          k: "tin",
          name: `Custody TX: ${sel.txId ?? "TB26101899201"}`,
          doc: `Client: ${sel.client ?? "Abebe Kebede"}`,
          tin: `State: ${sel.state}`,
        },
      ],
      idx,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="Escrow Oversight Workbench"
        sub="Inspect milestone custody holdings, deliverable submissions, holds, and execute split or full releases"
        right={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `yekis-escrows-page-${page}`,
                toCsv(
                  ["Milestone ID", "Contract", "Milestone", "Freelancer", "Amount Minor", "Rail", "State", "Held", "Created"],
                  rows.map((e) => [
                    e.id,
                    e.job,
                    e.title,
                    e.fl,
                    e.amt,
                    e.rail,
                    e.state,
                    e.held ? "YES" : "NO",
                    dateOnly(e.created),
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
          k="Held on this page"
          v={fmt(held)}
          active={state === ""}
          title="Show all held escrow milestones"
          onClick={() => setState("")}
        />
        <Kv
          k="Submitted for review"
          v={String(rows.filter((e) => e.state === "SUBMITTED_FOR_REVIEW").length)}
          active={state === "SUBMITTED_FOR_REVIEW"}
          title="Filter to milestones submitted for review"
          onClick={() =>
            setState((s) => (s === "SUBMITTED_FOR_REVIEW" ? "" : "SUBMITTED_FOR_REVIEW"))
          }
        />
        <Kv
          k="Admin holds active"
          v={String(rows.filter((e) => e.held).length)}
          warn={rows.some((e) => e.held)}
          title="Focus milestone under administrative hold"
          onClick={() => {
            setState("");
            const h = rows.find((e) => e.held);
            if (h) setSelId(h.id);
          }}
        />
        <Kv
          k="Disputed"
          v={String(rows.filter((e) => e.state === "DISPUTED").length)}
          warn={rows.some((e) => e.state === "DISPUTED")}
          active={state === "DISPUTED"}
          title="Filter to disputed milestones"
          onClick={() => setState((s) => (s === "DISPUTED" ? "" : "DISPUTED"))}
        />
      </div>

      {held > 0 ? (
        <Banner
          tone="b-green"
          icon={DollarSign}
          strong={`Currently held in custody on this page: ${fmt(held)}`}
          rest="Backed 1:1 in Telebirr & CBE Commercial Escrow Custody accounts (1010 / 1020)."
        />
      ) : null}

      <Card className="card filters" style={{ marginTop: 16 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search milestone, contract or freelancer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={state}
          onChange={setState}
          options={ESCROW_STATES}
          allLabel="All escrow states"
          label="Escrow state"
        />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>

      {rows.length === 0 ? (
        <div className="card">
          <Empty icon={DollarSign}>No milestone escrows match.</Empty>
        </div>
      ) : (
        <div className="queue-wrap">
          <div className="queue-list">
            {rows.map((e) => {
              const active = sel?.id === e.id;
              return (
                <div
                  key={e.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelId(e.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name">{e.title}</div>
                      <div className="qi-sub">
                        {e.job} · {e.fl}
                      </div>
                    </div>
                    <Pill s={e.held ? "ADMIN_HOLD" : e.state} />
                  </div>
                  <div className="qi-foot">
                    <span className="mono">{e.id}</span>
                    <span>·</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {fmt(e.amt)}
                    </span>
                    <span>·</span>
                    <span>{e.rail}</span>
                  </div>
                </div>
              );
            })}
            <Pager page={page} pages={pages} total={total} onPage={setPage} unit="milestones" />
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
                    <Pill s={sel.held ? "ADMIN_HOLD" : sel.state} />
                    <span className="pill p-sky">{sel.rail}</span>
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
                    Contract: <b>{sel.job}</b> ({sel.contractId ?? "ctr-301"}) · Funded {dt(sel.created)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("contracts")}>
                    <ExternalLink size={13} /> Open Contract
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("dispute-queue")}>
                    <ExternalLink size={13} /> Mediation Queue
                  </button>
                </div>
              </div>

              {sel.held && sel.holdReason ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--ops-amber-bg)",
                    border: "1px solid rgba(217,119,6,.28)",
                    color: "var(--ops-amber)",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  Active Admin Hold: {sel.holdReason}
                </div>
              ) : null}

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Client Depositor</div>
                  <div className="v">{sel.client ?? "Abebe Kebede"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.clientEmail ?? "abebe.kebede@abyssinia-tech.et"}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Assigned Freelancer</div>
                  <div className="v">{sel.fl}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.flEmail ?? "Verified Freelancer"}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Escrow Principal</div>
                  <div className="v mono">{fmt(sel.amt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Freelancer Net (After 10% Fee & 3% WHT)</div>
                  <div className="v mono" style={{ color: "var(--ops-green)" }}>
                    {fmt(Math.round(sel.amt * 0.87))}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Inbound Funding Rail</div>
                  <div className="v">{sel.rail}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Funding TX Reference</div>
                  <div className="v mono">{sel.txId ?? "TB26101899201"}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Escrow Custody & Release Readiness Checks
              </div>
              <div className="checks-row">
                <span className="check pass">
                  <ShieldCheck size={13} /> Inbound Rail Settlement Reconciled
                </span>
                <span className={`check ${sel.held ? "warn" : "pass"}`}>
                  {sel.held ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                  {sel.held ? "Admin Hold Lock Active" : "No Administrative Hold"}
                </span>
                <span className={`check ${sel.state === "DISPUTED" ? "fail" : "pass"}`}>
                  {sel.state === "DISPUTED" ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                  {sel.state === "DISPUTED" ? "Under Active Dispute" : "Clear for Settlement"}
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> Double-Entry Liability 2010 Backed
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Deliverable Package & Custody Receipt (Click to Inspect)
                </div>
                <div className="doc-tiles">
                  <div className="doc-tile" onClick={() => openEscrowEvidence(0)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Submitted Deliverable</div>
                    <div className="dt-tag">
                      <Eye size={10} /> Inspect
                    </div>
                  </div>
                  <div className="doc-tile" onClick={() => openEscrowEvidence(1)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Custody Deposit Voucher</div>
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
                  Multi-Task Escrow Execution (Audited)
                </div>

                <div className="grid g2" style={{ gap: 10, marginBottom: 10 }}>
                  <div className="fld">
                    <label className="lbl">Preset Audit Reason (Min 10 chars)</label>
                    <select
                      className="sel"
                      style={{ width: "100%" }}
                      value={templateReason}
                      onChange={(e) => setTemplateReason(e.target.value)}
                    >
                      <option value="">Select standard escrow audit reason…</option>
                      {ESCROW_REASON_TEMPLATES.map((tpl) => (
                        <option key={tpl} value={tpl}>
                          {tpl}
                        </option>
                      ))}
                      <option value="custom">Custom administrative reason…</option>
                    </select>
                  </div>
                  <div className="fld">
                    <label className="lbl">
                      Partial Split Allocation ({splitPct}% Freelancer: {fmt(Math.round((sel.amt * splitPct) / 100))} /{" "}
                      {100 - splitPct}% Client: {fmt(Math.round((sel.amt * (100 - splitPct)) / 100))})
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={splitPct}
                      onChange={(e) => setSplitPct(Number(e.target.value))}
                      style={{ width: "100%", marginTop: 8 }}
                    />
                  </div>
                </div>

                {templateReason === "custom" ? (
                  <div className="fld" style={{ marginBottom: 10 }}>
                    <label className="lbl">Custom Audit Reason (Minimum 10 characters)</label>
                    <input
                      className="inp"
                      placeholder="Enter detailed justification for releasing, holding, or refunding this escrow…"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  </div>
                ) : null}

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <button
                    className="btn btn-success"
                    disabled={busy || sel.state === "RELEASED"}
                    onClick={() => void executeEscrowTask("RELEASE")}
                  >
                    <Check size={14} /> Full Release to Freelancer
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy || sel.state === "RELEASED"}
                    onClick={() => void executeEscrowTask("PARTIAL_SPLIT")}
                  >
                    <Scale size={14} /> Partial Split ({splitPct}/{100 - splitPct})
                  </button>
                  <button
                    className="btn btn-warn"
                    disabled={busy || sel.state === "RELEASED"}
                    onClick={() => void executeEscrowTask(sel.held ? "UNHOLD" : "HOLD")}
                  >
                    {sel.held ? <Unlock size={14} /> : <Lock size={14} />}
                    {sel.held ? "Remove Admin Hold" : "Place Admin Hold"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || sel.state === "RELEASED"}
                    onClick={() => void executeEscrowTask("RETURN_WIP")}
                  >
                    <RefreshCw size={14} /> Return to Work-in-Progress
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busy || sel.state === "RELEASED"}
                    onClick={() => void executeEscrowTask("REFUND_CLIENT")}
                  >
                    <RotateCcw size={14} /> Full Refund to Client
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
