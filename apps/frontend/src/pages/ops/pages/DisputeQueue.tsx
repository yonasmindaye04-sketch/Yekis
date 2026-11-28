/* ────────────────────────────────────────────────────────────────────────
   DisputeQueue.tsx — Stage-3 mediation: scope, evidence chat, outcome
   selection with live settlement math, recommendation and resolution,
   plus the claim / evidence / escalate / arbitrate workflow actions.
   GET  /disputes/staff/queue
   POST /disputes/:id/resolve · /claim · /evidence · /escalate · /arbitration
   Hotkeys: ↑↓ navigate.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Eye,
  FileText,
  HandHelping,
  Scale,
  Search,
  TrendingUp,
} from "lucide-react";
import { dt, dts, fmt2, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { DISPUTE_STAGES } from "../opsConst";
import type { DisputeItem, DisputeOutcome, DisputeSplitPreview } from "../opsTypes";
import {
  Banner,
  Card,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  OpsActionModal,
  PageHead,
  Pager,
  Pill,
  SlaBadge,
  isTyping,
  useHotkeys,
  useToast,
  Button,
} from "../components/ui";
import { TbFileAlert } from "react-icons/tb";
import { Alert, AlertTitle } from "@/components/base-ui/alert";
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar";
import { useOpsUi } from "../opsUiContext";

const OUTCOMES: { id: DisputeOutcome; label: string }[] = [
  { id: "RELEASE_TO_FREELANCER", label: "Release to Freelancer" },
  { id: "PARTIAL_SPLIT", label: "Partial Split" },
  { id: "REFUND_TO_CLIENT", label: "Refund to Client" },
];

export default function DisputeQueue({ focusId }: { focusId?: string }) {
  const ui = useOpsUi();
  const toast = useToast();
  const [stage, setStage] = useState("STAGE_3_MEDIATION");
  const [kpiFilter, setKpiFilter] = useState<"ALL" | "BREACHED">("ALL");
  const [selId, setSelId] = useState<string | null>(focusId ?? null);
  const [outcome, setOutcome] = useState<DisputeOutcome | "">("");
  const [split, setSplit] = useState(50);
  const [rec, setRec] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [splitPreview, setSplitPreview] = useState<DisputeSplitPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const list = useListPage<DisputeItem>(
    (p) => opsListApi.disputes({ ...p, status: stage }),
    25,
    [stage],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;
  const partialSplitEnabled = Boolean(
    (list.extra as { partialSplitEnabled?: boolean } | null)?.partialSplitEnabled,
  );

  // The breach flag comes from the server (either clock missed). The
  // browser-side `slaH` is only the fallback for rows that predate the
  // server-side SLA.
  const visibleRows =
    kpiFilter === "BREACHED"
      ? rows.filter((d) => d.sla?.breached ?? d.slaH < 0)
      : rows;
  const sel = visibleRows.find((d) => d.id === selId) ?? rows.find((d) => d.id === selId) ?? null;

  useEffect(() => {
    if (!sel || !outcome) {
      setSplitPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    if (outcome === "PARTIAL_SPLIT" && !partialSplitEnabled) {
      setSplitPreview(null);
      setPreviewError("Partial split settlement is currently disabled.");
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    void opsApi
      .splitPreview(sel.id, {
        outcome,
        freelancerSharePct: outcome === "PARTIAL_SPLIT" ? split : undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setSplitPreview(res);
          setPreviewLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSplitPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Failed to load preview");
          setPreviewLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sel?.id, outcome, split, partialSplitEnabled]);

  useHotkeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (ui.viewerOpen || ui.paletteOpen || isTyping() || !visibleRows.length) return;
        const idx = visibleRows.findIndex((d) => d.id === selId);
        if (e.key === "ArrowDown" && idx >= 0 && idx < visibleRows.length - 1) {
          e.preventDefault(); setSelId(visibleRows[idx + 1].id); setOutcome("");
        }
        if (e.key === "ArrowUp" && idx > 0) {
          e.preventDefault(); setSelId(visibleRows[idx - 1].id); setOutcome("");
        }
      },
      [visibleRows, selId, ui.viewerOpen, ui.paletteOpen],
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
        splitPct: outcome === "PARTIAL_SPLIT" ? split : undefined,
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

  /* Non-terminal case actions. Each maps to a real backend route; the UI
     disables transitions that do not apply to the active stage and the server
     enforces the same stage & disputes.mediate rules. */
  const staffRole = ui.account?.staffRole ?? "";
  const hasAccount = Boolean(ui.account);
  const canMediate =
    !hasAccount ||
    [
      "SUPER_ADMIN",
      "ADMIN",
      "DISPUTE_MEDIATOR",
      "COMPLIANCE_ADMIN",
      "COMPLIANCE_OFFICER",
    ].includes(staffRole);
  const canResolve =
    !hasAccount ||
    ["SUPER_ADMIN", "ADMIN", "DISPUTE_MEDIATOR"].includes(staffRole);

  const workflow = async (kind: "claim" | "escalate" | "arbitration") => {
    if (!sel) return;
    setBusy(true);
    try {
      if (kind === "claim") {
        await opsApi.claimDispute(sel.id);
        toast("Case claimed and assigned to you.");
      } else if (kind === "escalate") {
        await opsApi.escalateDispute(sel.id);
        toast("Dispute escalated to the next stage.");
      } else {
        await opsApi.escalateToArbitration(sel.id);
        toast("Dispute moved to stage 4 arbitration.");
      }
      reload();
      ui.refreshBadges();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const submitEvidenceNote = async ({
    values,
    checked,
  }: {
    values: Record<string, string>;
    checked: boolean;
  }) => {
    if (!sel) return;
    setBusy(true);
    try {
      await opsApi.submitDisputeEvidence(sel.id, values.statement, checked);
      toast(
        checked
          ? "Internal staff note attached (hidden from parties)."
          : "Evidence statement attached to the case.",
      );
      setEvidenceModalOpen(false);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
      setEvidenceModalOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const fGross = splitPreview?.freelancerGrossMinor ?? 0;
  const cRefund = splitPreview?.clientRefundMinor ?? 0;
  const fee = splitPreview?.totalFeeMinor ?? 0;
  const wh = splitPreview?.withholdingTaxMinor ?? 0;
  const net = splitPreview?.freelancerNetMinor ?? 0;
  const feePctLabel = splitPreview
    ? ((splitPreview.freelancerFeeRate + splitPreview.providerFeeRate) * 100).toFixed(1)
    : "7.5";

  return (
    <div className="fade">
      <PageHead
        title="Dispute Mediation Queue"
        sub={`Stage 3 mediation — ${rows.filter((d) => d.stage === "STAGE_3_MEDIATION").length} awaiting mediation on this page`}
        right={
          <Button variant="outline" onClick={reload}>
            Refresh
          </Button>
        }
      />
      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Kv
          k="Matching disputes"
          v={total.toLocaleString()}
          active={stage === "" && kpiFilter === "ALL"}
          title="Show all dispute stages"
          onClick={() => {
            setStage("");
            setKpiFilter("ALL");
          }}
        />
        <Kv
          k="On this page"
          v={String(visibleRows.length)}
          active={stage === "STAGE_3_MEDIATION" && kpiFilter === "ALL"}
          title="Filter to Stage 3 Mediation queue"
          onClick={() => {
            setStage("STAGE_3_MEDIATION");
            setKpiFilter("ALL");
            if (rows.length > 0) setSelId(rows[0].id);
          }}
        />
        <Kv
          k="Escrow in view"
          v={fmt2(visibleRows.reduce((s, d) => s + d.amt, 0))}
          title="Open Escrow Oversight Workbench"
          onClick={() => ui.navigate("escrow")}
        />
        <Kv
          k="SLA breached"
          v={String(rows.filter((d) => d.slaH < 0).length)}
          warn={rows.some((d) => d.slaH < 0)}
          active={kpiFilter === "BREACHED"}
          title="Filter to SLA-breached disputes"
          onClick={() => {
            const next = kpiFilter === "BREACHED" ? "ALL" : "BREACHED";
            setKpiFilter(next);
            const firstBreached = rows.find((d) => d.slaH < 0);
            if (next === "BREACHED" && firstBreached) {
              setSelId(firstBreached.id);
            }
          }}
        />
      </div>
      {rows.some((d) => d.slaH < 0) ? (
        <Banner tone="b-red" icon={Clock} strong="SLA breach detected." rest="At least one dispute exceeded its mediation deadline — resolve it first." />
      ) : null}

      <div className="filters" style={{ marginBottom: 14 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search by client or freelancer email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={stage}
          onChange={(v) => {
            setStage(v);
            setKpiFilter("ALL");
          }}
          options={DISPUTE_STAGES}
          allLabel="All stages"
          label="Dispute stage"
        />
        <Button variant="outline" onClick={reload}>Refresh</Button>
      </div>

      <div className="queue-wrap">
        <div className="queue-list">
          {visibleRows.length === 0 ? (
            <Card className="card-pad" style={{ padding: "36px 16px", textAlign: "center" }}>
              <Empty icon={Scale}>No active disputes in this view.</Empty>
            </Card>
          ) : (
            visibleRows.map((d) => (
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
                  <SlaBadge h={d.slaH} sla={d.sla} />
                </div>
              </button>
            ))
          )}
          <Pager page={page} pages={pages} total={total} onPage={setPage} unit="disputes" />
        </div>

        {sel ? (
          <Card className="queue-detail">
            <div className="qd-head">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3>{sel.job}</h3>
                <SlaBadge h={sel.slaH} sla={sel.sla} />
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
                        type="button"
                        className="doc-tile"
                        onClick={() =>
                          ui.openViewer(
                            [
                              {
                                id: `del-${sel.id}`,
                                t: `MILESTONE_DELIVERABLE — ${sel.ms}`,
                                k: "deliverable",
                                url: sel.deliverableUrl ?? undefined,
                                name: `${sel.job} (${sel.id})`,
                                doc: `Disputed Milestone: ${sel.ms}`,
                                tin: `Escrow Held: ${fmt2(sel.amt)}`,
                                scope: sel.scope,
                                contractId: sel.id,
                                status: sel.stage,
                                createdAt: dt(sel.created),
                                extraRows: [
                                  { label: "Dispute Category", value: sel.cat.replace(/_/g, " ") },
                                  { label: "Mediation Stage", value: sel.stage.replace(/_/g, " ") },
                                  { label: "Milestone Escrow Value", value: fmt2(sel.amt) },
                                  { label: "Evidence Statements", value: `${sel.ev.length} attached` },
                                  {
                                    label: "Artifact Location",
                                    value: sel.deliverableUrl ?? "Uploaded file URL not returned",
                                  },
                                  {
                                    label: "SLA Status",
                                    value:
                                      sel.slaH < 0
                                        ? `Breached ${Math.abs(sel.slaH)}h ago`
                                        : `Due in ${sel.slaH}h`,
                                  },
                                ],
                              },
                            ],
                            0,
                          )
                        }
                      >
                        <Eye size={14} /> View deliverable file
                      </button>
                    </div>
                  ) : (
                    <Alert variant="destructive" className="flex items-center gap-2.5">
                      <Avatar className="size-6 rounded-[5px] shrink-0">
                        <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
                          <TbFileAlert className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <AlertTitle>No deliverable file or link was formally attached to this milestone.</AlertTitle>
                    </Alert>
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
                            <strong>
                              {ev.roleLabel ||
                                (ev.side === "client"
                                  ? "Client"
                                  : ev.side === "freelancer"
                                    ? "Freelancer"
                                    : "Mediator")}
                              {ev.internal ? " · Internal Only" : ""}
                            </strong>
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
                {OUTCOMES.map((o) => {
                  const disabled = o.id === "PARTIAL_SPLIT" && !partialSplitEnabled;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={disabled}
                      title={
                        disabled
                          ? "Partial split is disabled by the server feature flag."
                          : undefined
                      }
                      className={`outcome-btn ${outcome === o.id ? "active" : ""}`}
                      onClick={() => setOutcome(o.id)}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {outcome === "PARTIAL_SPLIT" && partialSplitEnabled ? (
                <div style={{ marginBottom: 4 }}>
                  <div className="split-lbl">
                    <label htmlFor="dispute-partial-split-range">
                      Freelancer share: <b style={{ color: "var(--ops-primary)" }}>{split}%</b>
                    </label>
                    <span>{splitPreview ? fmt2(fGross) : "…"}</span>
                  </div>
                  <input
                    id="dispute-partial-split-range"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={split}
                    onChange={(e) => setSplit(Math.round(Number(e.target.value)))}
                  />
                </div>
              ) : null}
              {outcome ? (
                <div className="calc">
                  <h5>Resolution Financial Preview</h5>
                  {previewLoading ? (
                    <div className="kbd-hint">Calculating authoritative split on server…</div>
                  ) : previewError ? (
                    <div className="kbd-hint" style={{ color: "var(--color-danger, #dc2626)" }}>
                      {previewError}
                    </div>
                  ) : splitPreview ? (
                    <>
                      <div className="calc-row"><span>Client receives (refund)</span><b>{fmt2(cRefund)}</b></div>
                      <div className="calc-row"><span>Freelancer gross allocation</span><b>{fmt2(fGross)}</b></div>
                      <div className="calc-row sub"><span>− Platform &amp; rail fee ({feePctLabel}%)</span><span>{fmt2(fee)}</span></div>
                      <div className="calc-row sub"><span>− Withholding tax (deferred / 0%)</span><span>{fmt2(wh)}</span></div>
                      <div className="calc-row total"><span>Freelancer net receivable</span><b style={{ color: "var(--ops-green)" }}>{fmt2(net)}</b></div>
                    </>
                  ) : null}
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
                <Button
                  disabled={!outcome || busy || !canResolve || sel.stage === "RESOLVED"}
                  title={!canResolve ? "Resolving disputes requires DISPUTE_MEDIATOR or SUPER_ADMIN permission" : undefined}
                  onClick={() => void resolve()}
                >
                  Confirm Final Resolution
                </Button>
                <span className="kbd-hint">
                  {!canResolve
                    ? "View/mediation role only — final financial resolution requires DISPUTE_MEDIATOR or SUPER_ADMIN."
                    : outcome
                      ? `Outcome: ${outcome.replace(/_/g, " ")}`
                      : "Select an outcome to preview the settlement math"}
                </span>
              </div>

              <div className="sec-title" style={{ marginTop: 22 }}>Case workflow</div>
              <div className="kbd-hint" style={{ marginBottom: 8 }}>
                {canMediate
                  ? "Claiming and arbitration apply in Stage 3 (Mediation); Escalate stage applies in Stage 1 (Negotiation). Mediator evidence notes can be attached in Stages 1–3."
                  : "View-only role (disputes.view). Mediation workflow actions require DISPUTE_MEDIATOR, COMPLIANCE_ADMIN, or SUPER_ADMIN."}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy || !canMediate || sel.stage !== "STAGE_3_MEDIATION"}
                  onClick={() => void workflow("claim")}
                  title={
                    !canMediate
                      ? "Requires disputes.mediate permission"
                      : sel.stage !== "STAGE_3_MEDIATION"
                        ? `Claiming is available only in Stage 3 Mediation (current: ${sel.stage})`
                        : "Assign this mediation case to yourself"
                  }
                >
                  <HandHelping size={13} /> Claim case
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={
                    busy ||
                    !canMediate ||
                    sel.stage === "STAGE_4_ARBITRATION" ||
                    sel.stage === "RESOLVED"
                  }
                  onClick={() => setEvidenceModalOpen(true)}
                  title={
                    !canMediate
                      ? "Requires disputes.mediate permission"
                      : sel.stage === "STAGE_4_ARBITRATION" || sel.stage === "RESOLVED"
                        ? `Evidence statements cannot be attached in stage ${sel.stage}`
                        : "Attach a mediator evidence statement to the case record"
                  }
                >
                  <FileText size={13} /> Add evidence note
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy || !canMediate || sel.stage !== "STAGE_1_NEGOTIATION"}
                  onClick={() => void workflow("escalate")}
                  title={
                    !canMediate
                      ? "Requires disputes.mediate permission"
                      : sel.stage !== "STAGE_1_NEGOTIATION"
                        ? `Stage escalation applies only in Stage 1 Negotiation (current: ${sel.stage})`
                        : "Advance the dispute to Stage 2 Evidence"
                  }
                >
                  <TrendingUp size={13} /> Escalate stage
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy || !canMediate || sel.stage !== "STAGE_3_MEDIATION"}
                  onClick={() => void workflow("arbitration")}
                  title={
                    !canMediate
                      ? "Requires disputes.mediate permission"
                      : sel.stage !== "STAGE_3_MEDIATION"
                        ? `Arbitration escalation applies only in Stage 3 Mediation (current: ${sel.stage})`
                        : "Move the dispute into stage 4 arbitration"
                  }
                >
                  <Scale size={13} /> Send to arbitration
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="queue-detail">
            <div className="empty-detail">
              <Scale size={40} style={{ color: "var(--ops-text-3)" }} />
              <p>Select a dispute to mediate.</p>
              <span className="kbd-hint">
                Tip: use <span className="kbd">↑</span> <span className="kbd">↓</span> arrows to navigate
              </span>
            </div>
          </Card>
        )}
      </div>

      <OpsActionModal
        open={evidenceModalOpen}
        title="Attach Mediator Evidence Statement"
        description={sel ? `Case: ${sel.job} (${sel.ms})` : undefined}
        confirmLabel="Attach Evidence Statement"
        busy={busy}
        fields={[
          {
            name: "statement",
            label: "Evidence Statement",
            placeholder: "Record mediator findings, deliverable inspection notes, or log references…",
            multiline: true,
            required: true,
            minLength: 10,
            maxLength: 2000,
          },
        ]}
        checkbox={{
          label: "Internal staff-only note (hidden from client and freelancer)",
          hint: "Internal notes are visible only in the Ops Console and excluded from party evidence views and bundles.",
          defaultChecked: true,
        }}
        onConfirm={submitEvidenceNote}
        onCancel={() => !busy && setEvidenceModalOpen(false)}
      />
    </div>
  );
}
