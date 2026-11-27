/* ────────────────────────────────────────────────────────────────────────
   Risk.tsx — TMS transaction-monitoring flags and the AML decisions that
   resolve them.
   GET /tms/queue
   POST /tms/:flagId/file-str · /tms/:flagId/dismiss · /tms/users/:userId/lift-hold
   ──────────────────────────────────────────────────────────────────────── */

import { Fragment, useState } from "react";
import {
  RefreshCw,
  Search,
  ShieldAlert,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { dts, fmt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { FLAG_STATUSES, FLAG_TYPES } from "../opsConst";
import { RISK_LEVEL } from "../opsTypes";
import type { RiskFlag } from "../opsTypes";
import {
  Banner,
  Card,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  OpsActionModal,
  OpsTable,
  PageHead,
  Pager,
  Pill,
  useToast,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";

type RiskDialogState =
  | { kind: "str"; flag: RiskFlag }
  | { kind: "dismiss"; flag: RiskFlag }
  | { kind: "lift"; flag: RiskFlag }
  | null;

export default function Risk() {
  const ui = useOpsUi();
  const toast = useToast();
  const [flagType, setFlagType] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<RiskDialogState>(null);
  const [busy, setBusy] = useState(false);

  const list = useListPage<RiskFlag>(
    (p) => opsListApi.riskFlags({ ...p, flagType, status }),
    25,
    [flagType, status],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  const handleConfirm = async ({
    values,
    checked,
  }: {
    values: Record<string, string>;
    checked: boolean;
  }) => {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.kind === "str") {
        await opsApi.fileStr(dialog.flag.id, values.notes, values.ref, checked);
        toast(checked ? "STR filed and account suspended." : "STR filed.");
      } else if (dialog.kind === "dismiss") {
        await opsApi.dismissFlag(dialog.flag.id, values.notes);
        toast("Flag dismissed.");
      } else {
        await opsApi.liftHold(dialog.flag.user.id, values.reason || undefined);
        toast("Compliance hold lifted.");
      }
      setDialog(null);
      setOpenId(null);
      reload();
      ui.refreshBadges();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Compliance action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const open = rows.filter((f) => f.status === "OPEN");
  const critical = open.filter((f) => (RISK_LEVEL[f.type] ?? "LOW") === "CRITICAL").length;

  return (
    <div className="fade">
      <PageHead
        title="Risk & Fraud"
        sub="Transaction-monitoring alerts from the compliance queue"
        right={
          <button type="button" className="btn btn-ghost" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Kv
          k="Matching flags"
          v={total.toLocaleString()}
          active={status === "" && flagType === ""}
          title="Show all compliance risk flags"
          onClick={() => {
            setStatus("");
            setFlagType("");
          }}
        />
        <Kv
          k="Awaiting review"
          v={String(open.length)}
          warn={open.length > 0}
          active={status === "PENDING_REVIEW"}
          title="Filter to open risk flags"
          onClick={() =>
            setStatus((s) => (s === "PENDING_REVIEW" ? "" : "PENDING_REVIEW"))
          }
        />
        <Kv
          k="Critical (on page)"
          v={String(critical)}
          warn={critical > 0}
          active={flagType === "WALLET_MISMATCH"}
          title="Filter to critical WALLET_MISMATCH flags"
          onClick={() =>
            setFlagType((t) => (t === "WALLET_MISMATCH" ? "" : "WALLET_MISMATCH"))
          }
        />
        <Kv
          k="STR filed"
          v={String(rows.filter((f) => f.status === "REVIEWING").length)}
          active={status === "STR_FILED"}
          title="Filter to flags under STR review"
          onClick={() => setStatus((s) => (s === "STR_FILED" ? "" : "STR_FILED"))}
        />
      </div>
      {open.length ? (
        <Banner
          tone="b-red"
          icon={TriangleAlert}
          strong={`${open.length} flag(s) await a decision.`}
          rest="WALLET_MISMATCH is CRITICAL — freeze related wallets until reviewed. Filing an STR records a reference number and audit event."
        />
      ) : null}

      <div className="filters" style={{ marginTop: 12 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search by user email, phone or UCID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={flagType}
          onChange={setFlagType}
          options={FLAG_TYPES}
          allLabel="All rule types"
          label="Flag type"
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={FLAG_STATUSES}
          allLabel="All statuses"
          label="Flag status"
        />
        <button type="button" className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <OpsTable
        heads={["Rule", "Risk", "Status", "User", "KYC", "Wallet", "Detected", ""]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="flags" />}
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8}>
              <Empty icon={ShieldAlert}>No flags match these filters.</Empty>
            </td>
          </tr>
        ) : (
          rows.map((f) => {
            const lv = RISK_LEVEL[f.type] ?? "LOW";
            return (
              <Fragment key={f.id}>
                <tr
                  className="clickable"
                  onClick={() => setOpenId(openId === f.id ? null : f.id)}
                >
                  <td>
                    <div className="cell-main">{f.type.replace(/_/g, " ")}</div>
                    <div className="cell-sub mono">{f.id}</div>
                  </td>
                  <td>
                    <Pill s={lv} />
                  </td>
                  <td>
                    <Pill s={f.status} />
                  </td>
                  <td>
                    <div className="cell-main" style={{ fontWeight: 600 }}>
                      {f.user.email}
                    </div>
                    <div className="cell-sub mono">{f.user.ucid}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {f.user.kycTier ? `${f.user.kycTier.replace("_", " ")} · ${f.user.kycStatus}` : "—"}
                  </td>
                  <td className="amount">
                    {f.user.walletMinor != null ? fmt(f.user.walletMinor) : "—"}
                  </td>
                  <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>
                    {dts(f.created)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(openId === f.id ? null : f.id);
                      }}
                    >
                      {openId === f.id ? "Close" : "Review"}
                    </button>
                  </td>
                </tr>
                {openId === f.id ? (
                  <tr className="expand-row">
                    <td colSpan={8}>
                      <Card className="card-pad" style={{ margin: 0 }}>
                        <div className="sec-title">Rule detail</div>
                        <div className="kv" style={{ marginTop: 10 }}>
                          <div className="kv-k">Trigger payload</div>
                          <div
                            className="kv-v mono"
                            style={{ fontSize: 11.5, whiteSpace: "pre-wrap" }}
                          >
                            {JSON.stringify(f.details, null, 2)}
                          </div>
                        </div>
                        <div className="grid g4" style={{ marginTop: 12 }}>
                          <Kv k="Flags on this user" v={String(f.user.flagCount)} />
                          <Kv k="STR reference" v={f.strRef ?? "—"} />
                          <Kv k="KYC tier" v={f.user.kycTier ?? "—"} />
                          <Kv k="KYC status" v={f.user.kycStatus ?? "—"} />
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn btn-red btn-sm"
                            onClick={() => setDialog({ kind: "str", flag: f })}
                          >
                            <TriangleAlert size={13} /> File STR
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDialog({ kind: "dismiss", flag: f })}
                          >
                            Dismiss flag
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDialog({ kind: "lift", flag: f })}
                          >
                            <Unlock size={13} /> Lift hold
                          </button>
                        </div>
                      </Card>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })
        )}
      </OpsTable>

      <OpsActionModal
        open={dialog?.kind === "str"}
        title="File Suspicious Transaction Report (STR)"
        description={
          dialog?.kind === "str"
            ? `Record compliance investigation notes and the FIU/STR reference number for ${dialog.flag.user.email}.`
            : undefined
        }
        tone="danger"
        confirmLabel="Submit STR Filing"
        busy={busy}
        fields={[
          {
            name: "ref",
            label: "STR Reference Number",
            placeholder: "e.g. FIU-STR-2026-00419",
            required: true,
            minLength: 1,
            maxLength: 200,
          },
          {
            name: "notes",
            label: "Compliance Review Notes",
            placeholder: "Summarize suspicious pattern, linked accounts, and evidence…",
            multiline: true,
            required: true,
            minLength: 10,
            maxLength: 1000,
          },
        ]}
        checkbox={{
          label: "Also suspend this user account",
          hint: "Suspending blocks the user immediately on every authenticated request.",
          defaultChecked: false,
        }}
        onConfirm={handleConfirm}
        onCancel={() => !busy && setDialog(null)}
      />

      <OpsActionModal
        open={dialog?.kind === "dismiss"}
        title="Dismiss Compliance Flag"
        description={
          dialog?.kind === "dismiss"
            ? `Document why ${dialog.flag.type.replace(/_/g, " ")} for ${dialog.flag.user.email} is cleared.`
            : undefined
        }
        confirmLabel="Dismiss Flag"
        busy={busy}
        fields={[
          {
            name: "notes",
            label: "Dismissal Reason",
            placeholder: "Explain verification checks confirming legitimate activity…",
            multiline: true,
            required: true,
            minLength: 10,
            maxLength: 1000,
          },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => !busy && setDialog(null)}
      />

      <OpsActionModal
        open={dialog?.kind === "lift"}
        title="Lift Compliance Hold"
        description={
          dialog?.kind === "lift"
            ? `Remove the TMS compliance hold on ${dialog.flag.user.email} (${dialog.flag.user.ucid}).`
            : undefined
        }
        confirmLabel="Lift Compliance Hold"
        busy={busy}
        fields={[
          {
            name: "reason",
            label: "Audit Note (optional)",
            placeholder: "Optional note recorded in the audit log…",
            multiline: true,
            maxLength: 500,
          },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => !busy && setDialog(null)}
      />
    </div>
  );
}
