/* ────────────────────────────────────────────────────────────────────────
   Users.tsx — account browser with role filter + inline profile detail.
   GET /admin/users
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, Users as UsersIcon } from "lucide-react";
import { dt, fmt, opsApi, useApi } from "../opsApi";
import type { User } from "../opsTypes";
import { Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill } from "../components/ui";

const roleColor = (r: string) => (r === "CLIENT" ? "#15803d" : r === "FREELANCER" ? "#2563eb" : "#7c3aed");

export default function UsersPage() {
  const { data, error, loading, reload } = useApi<User[]>(opsApi.users);
  const [role, setRole] = useState("ALL");
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const detail = detailId ? data.find((u) => u.id === detailId) : null;
  if (detail) {
    return (
      <div className="fade">
        <button className="back-link" onClick={() => setDetailId(null)}>
          <ChevronLeft size={15} /> Back to users
        </button>
        <div className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>
                {(detail.name || detail.email).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ops-text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>User Profile</div>
                <h2 style={{ fontSize: 20, margin: "3px 0 2px", letterSpacing: "-.02em", fontWeight: 800 }}>{detail.name || detail.email}</h2>
                <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>{detail.email} · {detail.phone} · <span className="mono">{detail.ucid}</span></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="pill" style={{ color: roleColor(detail.role), fontSize: 13 }}><span className="pdot" />{detail.role}</span>
              {detail.suspended ? <Pill s="SUSPENDED" /> : null}
            </div>
          </div>
          <div className="grid g4" style={{ marginTop: 20 }}>
            <div className="kv"><div className="kv-k">Wallet Balance</div><div className="kv-v">{fmt(detail.wallet)}</div></div>
            <div className="kv"><div className="kv-k">KYC Status</div><div className="kv-v" style={{ fontSize: 14, paddingTop: 4 }}><Pill s={detail.kyc} /></div></div>
            <div className="kv"><div className="kv-k">Email Verified</div><div className="kv-v">Yes</div></div>
            <div className="kv"><div className="kv-k">Joined</div><div className="kv-v">{dt(detail.created)}</div></div>
          </div>
          <div className="kv" style={{ marginTop: 14 }}>
            <div className="kv-k" style={{ marginBottom: 10 }}>Activity</div>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap", fontSize: 13, color: "var(--ops-text-2)" }}>
              <span>Jobs posted: <b style={{ color: "var(--ops-text)" }}>{detail.act.jobs}</b></span>
              <span>Proposals: <b style={{ color: "var(--ops-text)" }}>{detail.act.props}</b></span>
              <span>Contracts (client): <b style={{ color: "var(--ops-text)" }}>{detail.act.cClient}</b></span>
              <span>Contracts (freelancer): <b style={{ color: "var(--ops-text)" }}>{detail.act.cFree}</b></span>
              <span>Gigs: <b style={{ color: "var(--ops-text)" }}>{detail.act.gigs}</b></span>
              <span>Orders: <b style={{ color: "var(--ops-text)" }}>{detail.act.orders}</b></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rows = data.filter((u) => role === "ALL" || u.role === role);
  return (
    <div className="fade">
      <PageHead title="Users" sub="Browse platform accounts, KYC state and activity" />
      <div className="card filters">
        <div className="f-search"><Search size={15} /><input placeholder="Search email / phone / name / UCID" /></div>
        <select className="sel" value={role} onChange={(e) => setRole(e.target.value)}>
          {["ALL", "CLIENT", "FREELANCER", "BOTH"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All roles" : s[0] + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Search</button>
      </div>
      <OpsTable heads={["User", "Contact", "Role", "KYC", "Status", "Joined", ""]} foot={<Pager n={rows.length} />}>
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={UsersIcon}>No users match.</Empty></td></tr>
        ) : (
          rows.map((u) => (
            <tr className="clickable" key={u.id} onClick={() => setDetailId(u.id)}>
              <td><div className="cell-main">{u.name ?? u.email}</div><div className="cell-sub mono">{u.ucid}</div></td>
              <td><div style={{ fontSize: 12.5 }}>{u.email}</div><div className="cell-sub">{u.phone}</div></td>
              <td><span className="pill" style={{ color: roleColor(u.role) }}><span className="pdot" />{u.role}</span></td>
              <td><Pill s={u.kyc} /></td>
              <td>{u.suspended ? <Pill s="SUSPENDED" /> : <span className="pill p-gray"><span className="pdot" />Active</span>}</td>
              <td style={{ color: "var(--ops-text-2)" }}>{dt(u.created)}</td>
              <td style={{ color: "var(--ops-text-3)" }}><ChevronRight size={15} /></td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
