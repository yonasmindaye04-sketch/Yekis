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
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  OpsTable,
  PageHead,
  Pager,
  Pill,
  useToast,
} from "../components/ui";

export default function Risk() {
  const toast = useToast();
  const [flagType, setFlagType] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useListPage<RiskFlag>(
    (p) => opsListApi.riskFlags({ ...p, flagType, status }),
    25,
    [flagType, status],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  const fileStr = async (f: RiskFlag) => {
    const notes = window.prompt("Review notes (min 10 characters) — recorded on the flag:") ?? "";
    if (notes.trim().length < 10) {
      toast("Review notes of at least 10 characters are required.");
      return;
    }
    const ref = window.prompt("STR reference number (1–200 characters):") ?? "";
    if (ref.trim().length < 1) {
      toast("An STR reference number is required.");
      return;
    }
    const suspend = window.confirm(
      "Also suspend this account as part of the STR filing?\n\n" +
        "Suspending blocks the user immediately on every authenticated request.",
    );
    try {
      await opsApi.fileStr(f.id, notes.trim(), ref.trim(), suspend);
      toast(suspend ? "STR filed and account suspended." : "STR filed.");
      setOpenId(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not file STR");
    }
  };

  const dismiss = async (f: RiskFlag) => {
    const notes = window.prompt("Dismissal reason (min 10 characters):") ?? "";
    if (notes.trim().length < 10) {
      toast("A dismissal reason of at least 10 characters is required.");
      return;
    }
    try {
      await opsApi.dismissFlag(f.id, notes.trim());
      toast("Flag dismissed.");
      setOpenId(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not dismiss flag");
    }
  };

  const liftHold = async (f: RiskFlag) => {
    const reason = window.prompt("Reason for lifting the compliance hold (optional):") ?? "";
    try {
      await opsApi.liftHold(f.user.id, reason.trim() || undefined);
      toast("Compliance hold lifted.");
      setOpenId(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not lift hold");
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
          <button className="btn btn-ghost" onClick={reload}>
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
          active={status === "OPEN"}
          title="Filter to open risk flags"
          onClick={() => setStatus((s) => (s === "OPEN" ? "" : "OPEN"))}
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
          active={status === "REVIEWING"}
          title="Filter to flags under STR review"
          onClick={() => setStatus((s) => (s === "REVIEWING" ? "" : "REVIEWING"))}
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

      <div className="card filters" style={{ marginTop: 16 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search by user email, phone or UCID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={flagType} onChange={setFlagType} options={FLAG_TYPES} allLabel="All rule types" label="Flag type" />
        <FilterSelect value={status} onChange={setStatus} options={FLAG_STATUSES} allLabel="All statuses" label="Flag status" />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <OpsTable
        heads={["Rule", "Risk", "Status", "User", "KYC", "Wallet", "Detected", ""]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="flags" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={8}><Empty icon={ShieldAlert}>No flags match these filters.</Empty></td></tr>
        ) : (
          rows.map((f) => {
            const lv = RISK_LEVEL[f.type] ?? "LOW";
            return (
              <Fragment key={f.id}>
                <tr className="clickable" onClick={() => setOpenId(openId === f.id ? null : f.id)}>
                  <td>
                    <div className="cell-main">{f.type.replace(/_/g, " ")}</div>
                    <div className="cell-sub mono">{f.id}</div>
                  </td>
                  <td><Pill s={lv} /></td>
                  <td><Pill s={f.status} /></td>
                  <td>
                    <div className="cell-main" style={{ fontWeight: 600 }}>{f.user.email}</div>
                    <div className="cell-sub mono">{f.user.ucid}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{f.user.kycTier ? `${f.user.kycTier.replace("_", " ")} · ${f.user.kycStatus}` : "—"}</td>
                  <td className="amount">{f.user.walletMinor != null ? fmt(f.user.walletMinor) : "—"}</td>
                  <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(f.created)}</td>
                  <td>
                    <button
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
                      <div className="card card-pad" style={{ margin: 0 }}>
                        <div className="sec-title">Rule detail</div>
                        <div className="kv" style={{ marginTop: 10 }}>
                          <div className="kv-k">Trigger payload</div>
                          <div className="kv-v mono" style={{ fontSize: 11.5, whiteSpace: "pre-wrap" }}>
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
                          <button className="btn btn-red btn-sm" onClick={() => void fileStr(f)}>
                            <TriangleAlert size={13} /> File STR
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => void dismiss(f)}>
                            Dismiss flag
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => void liftHold(f)}>
                            <Unlock size={13} /> Lift hold
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })
        )}
      </OpsTable>
    </div>
  );
}