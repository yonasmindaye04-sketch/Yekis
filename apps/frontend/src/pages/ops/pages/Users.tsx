/* ────────────────────────────────────────────────────────────────────────
   Users.tsx — account browser with server-side search, role filter, inline
   profile detail and moderation actions.
   GET /admin/users · GET /admin/users/:userId
   POST /admin/users/:id/suspend · /unsuspend · /force-kyc-rereview
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import { dt, fmt, opsApi, opsListApi, withUserDetail } from "../opsApi";
import { useListPage } from "../opsList";
import { USER_ROLES } from "../opsConst";
import type { User } from "../opsTypes";
import {
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

const roleColor = (r: string) =>
  r === "CLIENT" ? "#15803d" : r === "FREELANCER" ? "#2563eb" : "#7c3aed";

export default function UsersPage() {
  const toast = useToast();
  const [role, setRole] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useListPage<User>(
    (p) => opsListApi.users({ ...p, role }),
    25,
    [role],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  /* Wallet balance and activity counters live on a separate summary route,
     so they load when the profile is opened rather than for every row. */
  const [detail, setDetail] = useState<User | null>(null);
  const [detailRaw, setDetailRaw] = useState<Awaited<ReturnType<typeof opsApi.userDetail>> | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const openDetail = useCallback(
    async (id: string) => {
      setDetailId(id);
      setDetail(null);
      setDetailBusy(true);
      setDetailErr(null);
      try {
        const raw = await opsApi.userDetail(id);
        setDetailRaw(raw);
        const row = rows.find((u) => u.id === id);
        if (row) setDetail(withUserDetail(row, raw));
      } catch (e) {
        setDetailErr(e instanceof Error ? e.message : "Could not load profile");
      } finally {
        setDetailBusy(false);
      }
    },
    [rows],
  );

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailRaw(null);
    setDetailErr(null);
  }, []);

  const moderate = async (u: User, action: "suspend" | "unsuspend" | "rereview") => {
    try {
      if (action === "suspend") {
        const reason = window.prompt(`Suspend ${u.email} — reason (min 5 characters):`) ?? "";
        if (reason.trim().length < 5) {
          toast("A reason of at least 5 characters is required.");
          return;
        }
        await opsApi.suspendUser(u.id, reason.trim());
        toast(`${u.email} suspended.`);
      } else if (action === "unsuspend") {
        await opsApi.unsuspendUser(u.id);
        toast(`${u.email} reinstated.`);
      } else {
        const r = await opsApi.forceKycRereview(u.id);
        toast(
          r.nextReviewDueAt
            ? `KYC re-review scheduled for ${dt(r.nextReviewDueAt)}.`
            : "KYC re-review requested.",
        );
      }
      reload();
      if (detailId === u.id) void openDetail(u.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  if (detailId) {
    if (detailBusy && !detail) return <LoadingBox />;
    if (detailErr)
      return (
        <div className="fade">
          <button className="back-link" onClick={closeDetail}>
            <ChevronLeft size={15} /> Back to users
          </button>
          <ErrorBox error={detailErr} reload={() => void openDetail(detailId)} />
        </div>
      );
    if (!detail) return <LoadingBox />;
    return (
      <div className="fade">
        <button className="back-link" onClick={closeDetail}>
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
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="pill" style={{ color: roleColor(detail.role), fontSize: 13 }}><span className="pdot" />{detail.role}</span>
              {detail.suspended ? <Pill s="SUSPENDED" /> : null}
            </div>
          </div>

          <div className="grid g4" style={{ marginTop: 20 }}>
            <div className="kv"><div className="kv-k">Wallet Balance</div><div className="kv-v">{fmt(detail.wallet)}</div></div>
            <div className="kv"><div className="kv-k">KYC Status</div><div className="kv-v" style={{ fontSize: 14, paddingTop: 4 }}><Pill s={detail.kyc} /></div></div>
            <div className="kv"><div className="kv-k">Profile Completeness</div><div className="kv-v">{detail.completeness}%</div></div>
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

          <div className="sec-title" style={{ marginTop: 22 }}>Moderation</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {detail.suspended ? (
              <button className="btn btn-green btn-sm" onClick={() => void moderate(detail, "unsuspend")}>
                <UserCheck size={13} /> Reinstate account
              </button>
            ) : (
              <button className="btn btn-red btn-sm" onClick={() => void moderate(detail, "suspend")}>
                <UserX size={13} /> Suspend account
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => void moderate(detail, "rereview")}>
              <ShieldAlert size={13} /> Force KYC re-review
            </button>
          </div>
          {detailRaw ? <>
            <div className="sec-title" style={{ marginTop: 22 }}>Recent support conversations</div>
            {detailRaw.recentConversations.length ? detailRaw.recentConversations.map((c) => <div className="q-sub" key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}><span>{c.subject} · {c.status}</span><span>{dt(c.updatedAt)}</span></div>) : <div className="muted">No support conversations.</div>}
            <div className="sec-title" style={{ marginTop: 22 }}>Recent account activity</div>
            {detailRaw.recentAudit.length ? detailRaw.recentAudit.map((a) => <div className="q-sub" key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}><span>{a.eventType} · {a.entityType}</span><span>{dt(a.createdAt)}</span></div>) : <div className="muted">No audit activity recorded for this user.</div>}
          </> : null}
          <div className="kbd-hint" style={{ marginTop: 8 }}>
            Suspension requires <span className="mono">users.suspend</span>; forcing re-review requires{" "}
            <span className="mono">kyc.review</span>. Both are enforced server-side and audited.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade">
      <PageHead title="Users" sub="Browse platform accounts, KYC state and activity" />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Matching accounts" v={total.toLocaleString()} />
        <Kv k="On this page" v={String(rows.length)} />
        <Kv k="Suspended" v={String(rows.filter((u) => u.suspended).length)} warn />
        <Kv k="KYC verified" v={String(rows.filter((u) => u.kyc === "VERIFIED").length)} />
      </div>
      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search email, phone, name or UCID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={role} onChange={setRole} options={USER_ROLES} allLabel="All roles" label="Role" />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <OpsTable
        heads={["User", "Contact", "Role", "KYC", "Status", "Joined", ""]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="accounts" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={UsersIcon}>No users match this search.</Empty></td></tr>
        ) : (
          rows.map((u) => (
            <tr key={u.id} className="clickable" onClick={() => void openDetail(u.id)}>
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
