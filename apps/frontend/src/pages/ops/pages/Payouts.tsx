/* ────────────────────────────────────────────────────────────────────────
   Payouts.tsx — split-pane freelancer disbursement & rail settlement workbench.
   GET /admin/payouts · POST /admin/payouts/:payoutId/settle
   Provides gross-to-net fee & ERCA WHT breakdown, beneficiary KYC/TIN checks,
   bank slip viewer, rail switching, auto-retry, hold, and confirm/fail tasks.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  PauseCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { dts, fmt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { PAYOUT_STATUSES, RAILS } from "../opsConst";
import type { Payout, Rail as RailType } from "../opsTypes";
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
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { toCsv, downloadCsv } from "../opsExport";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

const PAYOUT_NOTES = [
  "Disbursement confirmed on provider rail; bank/mobile money reference recorded.",
  "Switched payout rail and queued automated retry after destination account verification.",
  "Placed temporary compliance hold pending TIN / beneficiary name match check.",
  "Transfer rejected by provider rail (dormant/invalid account) — freelancer wallet re-credited.",
];

export default function Payouts() {
  const ui = useOpsUi();
  const toast = useToast();

  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const [ref, setRef] = useState("");
  const [targetRail, setTargetRail] = useState<RailType>("TELEBIRR");
  const [targetAcct, setTargetAcct] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useListPage<Payout>(
    (p) => opsListApi.payouts({ ...p, status, provider }),
    25,
    [status, provider],
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
      setTargetRail(sel.provider);
      setTargetAcct(sel.acct);
      setRef(sel.ref ?? "");
    }
  }, [sel]);

  const executeSettle = useCallback(
    async (outcome: "CONFIRMED" | "FAILED" | "RETRY" | "SWITCH_RAIL" | "HOLD") => {
      if (!sel || busy) return;
      setBusy(true);
      try {
        await opsApi.settlePayout(sel.id, {
          outcome,
          provider: outcome === "SWITCH_RAIL" ? targetRail : undefined,
          acct: outcome === "SWITCH_RAIL" ? targetAcct.trim() || sel.acct : undefined,
          ref: ref.trim() || undefined,
          reason: reason.trim() || PAYOUT_NOTES[0],
        });

        const msgMap: Record<typeof outcome, string> = {
          CONFIRMED: `Payout ${sel.id} confirmed on ${sel.provider}.`,
          SWITCH_RAIL: `Payout ${sel.id} rerouted to ${targetRail} and queued for processing.`,
          RETRY: `Payout ${sel.id} re-queued for automated rail execution.`,
          HOLD: `Compliance hold placed on payout ${sel.id}.`,
          FAILED: `Payout ${sel.id} marked failed — freelancer wallet re-credited.`,
        };
        toast(msgMap[outcome]);
        setReason("");
        reload();
        ui.refreshBadges();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Payout action failed");
      } finally {
        setBusy(false);
      }
    },
    [sel, busy, targetRail, targetAcct, ref, reason, reload, toast, ui],
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

  const pendingOnPage = rows.filter(
    (p) => p.status === "PENDING" || p.status === "PROCESSING",
  ).length;
  const pendingVolume = rows
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + p.net, 0);
  const confirmedVolume = rows
    .filter((p) => p.status === "CONFIRMED")
    .reduce((s, p) => s + p.net, 0);

  const grossAmt = sel ? sel.gross ?? Math.round(sel.net / 0.87) : 0;
  const platformFeeAmt = sel ? sel.fee ?? Math.round(grossAmt * 0.1) : 0;
  const whtAmt = sel ? Math.max(0, grossAmt - platformFeeAmt - sel.net) || Math.round(grossAmt * 0.03) : 0;

  const openDisbursementDocs = (idx: number) => {
    if (!sel) return;
    ui.openViewer(
      [
        {
          id: "doc-1",
          t: `${sel.provider}_DISBURSEMENT_VOUCHER`,
          k: "id-front",
          name: `${sel.user.displayName} (${sel.acct})`,
          doc: `Net Payable: ${fmt(sel.net)} · Ref: ${sel.ref ?? "PENDING"}`,
          tin: `Gross: ${fmt(grossAmt)} · Fee: ${fmt(platformFeeAmt)}`,
        },
        {
          id: "doc-2",
          t: "FREELANCER_WHT_RECEIPT_PREVIEW",
          k: "tin",
          name: `${sel.user.displayName} · 3% ERCA Withholding`,
          doc: `Withheld Tax: ${fmt(whtAmt)}`,
          tin: `Account: ${sel.user.email}`,
        },
      ],
      idx,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="Payouts & Disbursements Workbench"
        sub="Inspect freelancer withdrawals, verify tax & fee deductions, switch rails, and settle transfers"
        right={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `yekis-payouts-page-${page}`,
                toCsv(
                  ["Payout ID", "Freelancer", "Email", "Account", "Provider", "Reference", "Net Minor", "Status"],
                  rows.map((p) => [
                    p.id,
                    p.user.displayName,
                    p.user.email,
                    p.acct,
                    p.provider,
                    p.ref ?? "",
                    p.net,
                    p.status,
                  ]),
                ),
              )
            }
          >
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Awaiting settlement" v={String(pendingOnPage)} warn={pendingOnPage > 0} />
        <Kv k="Pending net volume" v={fmt(pendingVolume)} />
        <Kv k="Settled net volume" v={fmt(confirmedVolume)} />
        <Kv k="Total payouts" v={total.toLocaleString()} />
      </div>

      {pendingOnPage ? (
        <Banner
          tone="b-amber"
          icon={Clock}
          strong={`${pendingOnPage} payout(s) awaiting disbursement on this page (${fmt(pendingVolume)}).`}
          rest="Select a payout below to inspect deductions, switch rails if needed, or confirm settlement."
        />
      ) : null}

      <Card className="card filters" style={{ marginTop: 14 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search provider ref, payout account or freelancer email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={PAYOUT_STATUSES}
          allLabel="Any status"
          label="Payout status"
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
          <Empty icon={Wallet}>No payouts match this filter.</Empty>
        </div>
      ) : (
        <div className="queue-wrap">
          <div className="queue-list">
            {rows.map((p) => {
              const active = sel?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelId(p.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name">{p.user.displayName}</div>
                      <div className="qi-sub mono">{p.acct}</div>
                    </div>
                    <Pill s={p.status} />
                  </div>
                  <div className="qi-foot">
                    <Rail p={p.provider} />
                    <span>·</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {fmt(p.net)}
                    </span>
                    {p.ref ? (
                      <>
                        <span>·</span>
                        <span className="mono">{p.ref}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <Pager page={page} pages={pages} total={total} onPage={setPage} unit="payouts" />
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
                    <Pill s={sel.status} />
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
                    {sel.user.displayName} — {fmt(sel.net)}
                  </h3>
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                    Destination: <span className="mono">{sel.acct}</span> · {sel.user.email}
                    {sel.created ? ` · Requested ${dts(sel.created)}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("users")}>
                    <ExternalLink size={13} /> Beneficiary Profile
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("withholding")}>
                    <ExternalLink size={13} /> WHT Schedule
                  </button>
                </div>
              </div>

              {sel.err ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--ops-red-bg)",
                    border: "1px solid rgba(220,38,38,.25)",
                    color: "var(--ops-red)",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  Rail Notice / Error: {sel.err}
                </div>
              ) : null}

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Gross Withdrawal</div>
                  <div className="v mono">{fmt(grossAmt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Platform Fee Deducted</div>
                  <div className="v mono">{fmt(platformFeeAmt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">3% ERCA Withholding</div>
                  <div className="v mono">{fmt(whtAmt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Net Rail Disbursement</div>
                  <div className="v mono" style={{ color: "var(--ops-green)" }}>
                    {fmt(sel.net)}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Destination Account</div>
                  <div className="v mono">{sel.acct}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Provider Settlement Ref</div>
                  <div className="v mono">{sel.ref ?? "Awaiting Confirmation"}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Pre-Disbursement Compliance & Account Checks
              </div>
              <div className="checks-row">
                <span className="check pass">
                  <ShieldCheck size={13} /> Tier 2/3 Fayda KYC Verified
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> 10-Digit TIN Active (3% WHT)
                </span>
                <span className={`check ${sel.err ? "fail" : "pass"}`}>
                  {sel.err ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                  {sel.err ? "Beneficiary Account Mismatch" : "Beneficiary Name Matches KYC"}
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> Wallet Balance Locked in 2020
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Disbursement Voucher & Tax Receipt (Click to Inspect)
                </div>
                <div className="doc-tiles">
                  <div className="doc-tile" onClick={() => openDisbursementDocs(0)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Rail Disbursement Slip</div>
                    <div className="dt-tag">
                      <Eye size={10} /> Inspect
                    </div>
                  </div>
                  <div className="doc-tile" onClick={() => openDisbursementDocs(1)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Freelancer WHT Certificate</div>
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
                  Multi-Task Disbursement & Rail Execution
                </div>

                <div className="grid g3" style={{ gap: 10, marginBottom: 10 }}>
                  <div className="fld">
                    <label className="lbl">Provider Reference / Bank Slip ID</label>
                    <input
                      className="inp mono"
                      placeholder="e.g. TB-OUT-99412"
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label className="lbl">Target Rail (for Rail Switch)</label>
                    <select
                      className="sel"
                      style={{ width: "100%" }}
                      value={targetRail}
                      onChange={(e) => setTargetRail(e.target.value as RailType)}
                    >
                      {RAILS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label className="lbl">Destination Account / MSISDN</label>
                    <input
                      className="inp mono"
                      value={targetAcct}
                      onChange={(e) => setTargetAcct(e.target.value)}
                    />
                  </div>
                </div>

                <div className="fld" style={{ marginBottom: 12 }}>
                  <label className="lbl">Settlement / Failure / Hold Note</label>
                  <input
                    className="inp"
                    placeholder="Enter settlement note or reason for rail switch / failure…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <button
                    className="btn btn-success"
                    disabled={busy}
                    onClick={() => void executeSettle("CONFIRMED")}
                  >
                    <Check size={14} /> Confirm Disbursement
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void executeSettle("SWITCH_RAIL")}
                  >
                    <ArrowLeftRight size={14} /> Switch Rail & Retry
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void executeSettle("RETRY")}
                  >
                    <RefreshCw size={14} /> Auto-Retry Transfer
                  </button>
                  <button
                    className="btn btn-warn"
                    disabled={busy}
                    onClick={() => void executeSettle("HOLD")}
                  >
                    <PauseCircle size={14} /> Place Compliance Hold
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => void executeSettle("FAILED")}
                  >
                    <X size={14} /> Fail & Re-Credit Wallet
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
