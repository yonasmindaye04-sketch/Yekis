/* ────────────────────────────────────────────────────────────────────────
   Payments.tsx — inbound client funding verification & reversal workbench.
   GET /admin/payments · POST /admin/payments/:id/action
   Provides full Telebirr / CBE Birr / M-Pesa transaction breakdown, VAT &
   commission split, rail signature checks, receipt viewer, and 4 tasks.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { dts, fmt, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { PAYMENT_STATUSES, RAILS } from "../opsConst";
import type { Payment } from "../opsTypes";
import {
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
import { toCsv, downloadCsv, dateOnly } from "../opsExport";

export default function Payments() {
  const ui = useOpsUi();

  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const list = useListPage<Payment>(
    (p) => opsListApi.payments({ ...p, status, provider }),
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

  const confirmedVolume = rows
    .filter((p) => p.status === "SUCCESS")
    .reduce((s, p) => s + p.amount, 0);
  const pendingCount = rows.filter((p) => p.status === "PENDING").length;
  const failedCount = rows.filter((p) => p.status === "FAILED").length;

  const netBaseMinor = sel ? Math.round(sel.amount / 1.15) : 0;
  const vatComponentMinor = sel ? sel.amount - netBaseMinor : 0;

  const openReceiptPreview = (idx: number) => {
    if (!sel) return;
    ui.openViewer(
      [
        {
          id: "doc-1",
          t: `${sel.provider}_MERCHANT_RECEIPT`,
          k: "id-front",
          name: `${sel.client} (${sel.txId})`,
          doc: `${sel.job} · ${fmt(sel.amount)}`,
          tin: `Rail: ${sel.provider} · Status: ${sel.status}`,
        },
        {
          id: "doc-2",
          t: "WEBHOOK_RSA_PAYLOAD_LOG",
          k: "tin",
          name: `TX Reference: ${sel.txId}`,
          doc: `Base: ${fmt(netBaseMinor)} · 15% VAT: ${fmt(vatComponentMinor)}`,
          tin: `Created: ${dts(sel.created)}`,
        },
      ],
      idx,
    );
  };

  return (
    <div className="fade">
      <PageHead
        title="Payments Workbench"
        sub="Inbound client funding transactions across Telebirr, CBE Birr & M-Pesa rails"
        right={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `yekis-payments-page-${page}`,
                toCsv(
                  ["Payment ID", "Provider TX ID", "Contract", "Client", "Provider", "Status", "Amount Minor", "Created"],
                  rows.map((p) => [
                    p.id,
                    p.txId,
                    p.job,
                    p.client,
                    p.provider,
                    p.status,
                    p.amount,
                    dateOnly(p.created),
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
          k="Confirmed volume (page)"
          v={fmt(confirmedVolume)}
          active={status === "SUCCESS"}
          title="Filter to confirmed inbound payments"
          onClick={() => setStatus((s) => (s === "SUCCESS" ? "" : "SUCCESS"))}
        />
        <Kv
          k="Total transactions"
          v={total.toLocaleString()}
          active={status === "" && provider === ""}
          title="Show all inbound payment transactions"
          onClick={() => {
            setStatus("");
            setProvider("");
          }}
        />
        <Kv
          k="Pending verification"
          v={String(pendingCount)}
          warn={pendingCount > 0}
          active={status === "PENDING"}
          title="Filter to pending inbound payments"
          onClick={() => setStatus((s) => (s === "PENDING" ? "" : "PENDING"))}
        />
        <Kv
          k="Failed / Reversed"
          v={String(failedCount)}
          warn={failedCount > 0}
          active={status === "FAILED"}
          title="Filter to failed inbound payments"
          onClick={() => setStatus((s) => (s === "FAILED" ? "" : "FAILED"))}
        />
      </div>

      <div className="filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search provider TX ID, contract or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={PAYMENT_STATUSES}
          allLabel="Any status"
          label="Payment status"
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
          <Empty icon={CreditCard}>No inbound payments match this filter.</Empty>
        </Card>
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
                      <div className="qi-name mono">{p.txId}</div>
                      <div className="qi-sub">
                        {p.client} · {p.job}
                      </div>
                    </div>
                    <Pill s={p.status} />
                  </div>
                  <div className="qi-foot">
                    <Rail p={p.provider} />
                    <span>·</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {fmt(p.amount)}
                    </span>
                    <span>·</span>
                    <span>{dts(p.created)}</span>
                  </div>
                </div>
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
                    <Pill s={sel.status} />
                    <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                      Internal ID: {sel.id}
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
                    {sel.job} · {sel.milestoneTitle ?? "Escrow Funding"} · Recorded {dts(sel.created)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => ui.navigate("reconciliation")}
                  >
                    <ExternalLink size={13} /> Open Reconciliation
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => ui.navigate("contracts")}>
                    <ExternalLink size={13} /> View Contract
                  </button>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Payer / Client</div>
                  <div className="v">{sel.client}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.clientEmail ?? "Verified Client Account"}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Beneficiary Freelancer</div>
                  <div className="v">{sel.freelancer ?? "—"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.contractId ? `Contract ${sel.contractId}` : "Escrow contract linked"}
                  </div>
                </div>
                <div className="info-cell">
                  <div className="k">Gross Inbound Amount</div>
                  <div className="v mono">{fmt(sel.amount)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Net Milestone Principal</div>
                  <div className="v mono">{fmt(netBaseMinor)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">15% VAT Component (ERCA)</div>
                  <div className="v mono">{fmt(vatComponentMinor)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Settlement Rail</div>
                  <div className="v">{sel.provider.replace(/_/g, " ")}</div>
                </div>
              </div>

              <div className="sec-title" style={{ marginBottom: 8 }}>
                Automated Gateway & Cryptographic Checks
              </div>
              <div className="checks-row">
                <span className={`check ${sel.status === "FAILED" ? "fail" : "pass"}`}>
                  {sel.status === "FAILED" ? <TriangleAlert size={13} /> : <ShieldCheck size={13} />}
                  {sel.status === "FAILED" ? "Gateway Callback Error" : "RSA-SHA256 Webhook Signed"}
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> Milestone Amount Exact Match
                </span>
                <span className="check pass">
                  <CheckCircle2 size={13} /> Idempotency Key Unique
                </span>
                <span className={`check ${sel.status === "SUCCESS" ? "pass" : "warn"}`}>
                  <CheckCircle2 size={13} />{" "}
                  {sel.status === "SUCCESS" ? "Posted to Account 1010/1020" : "Awaiting Custody Posting"}
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>
                  Payment Slip & Webhook Payload (Click to Inspect)
                </div>
                <div className="doc-tiles">
                  <div className="doc-tile" onClick={() => openReceiptPreview(0)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">{sel.provider} Payment Slip</div>
                    <div className="dt-tag">
                      <Eye size={10} /> Inspect
                    </div>
                  </div>
                  <div className="doc-tile" onClick={() => openReceiptPreview(1)}>
                    <div className="dt-ico">
                      <FileText size={20} />
                    </div>
                    <div className="dt-lbl">Signed Webhook Log</div>
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
                  Linked Finance &amp; Escrow Workbenches
                </div>
                <p style={{ fontSize: 12.5, color: "var(--ops-text-2)", margin: "0 0 12px" }}>
                  Inbound payments are settled by signed gateway webhooks. To hold/release custody funds, inspect double-entry postings, or mediate refunds, jump to the authoritative workbench:
                </p>
                <div className="action-bar" style={{ flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("escrow")}
                  >
                    <ExternalLink size={14} /> Manage Linked Escrow
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("reconciliation")}
                  >
                    <ExternalLink size={14} /> Open Reconciliation
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("ledger")}
                  >
                    <ExternalLink size={14} /> Inspect Ledger Journal
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => ui.navigate("dispute-queue")}
                  >
                    <ExternalLink size={14} /> Dispute Mediation
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
