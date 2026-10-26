/* ────────────────────────────────────────────────────────────────────────
   ReportsQueue.tsx — profile abuse & trust review queue (list + detail).
   GET /staff/reports · PATCH /staff/reports/:id
   Provides full incident context, automated trust checks, flagged excerpts,
   submitted evidence viewer, history, and 5 administrative approaches.
   Hotkeys: ↑↓ navigate · W warn · H hide · B ban · D dismiss · R focus note.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { dt, fmt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import type { ProfileReport, ReportResolution } from "../opsTypes";
import {
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
  Button,
  Card,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";

const ENFORCEMENT_TEMPLATES = [
  "First offense: formal compliance warning issued; off-platform contact handle redacted.",
  "Profile hidden from public search & featured carousel until bio/portfolio is remediated.",
  "Account restricted: payouts frozen & mandatory Fayda KYC re-review scheduled.",
  "Permanent account ban & profile takedown for severe fraud / escrow circumvention.",
  "Report dismissed: no policy violation substantiated after transcript and evidence review.",
];

const DEFAULT_NOTES_BY_ACTION: Record<ReportResolution, string> = {
  RESOLVED_NO_ACTION: ENFORCEMENT_TEMPLATES[4],
  RESOLVED_WARNED: ENFORCEMENT_TEMPLATES[0],
  RESOLVED_PROFILE_HIDDEN: ENFORCEMENT_TEMPLATES[1],
  RESOLVED_ACCOUNT_RESTRICTED: ENFORCEMENT_TEMPLATES[2],
  RESOLVED_PROFILE_BANNED: ENFORCEMENT_TEMPLATES[3],
};

export default function ReportsQueue() {
  const ui = useOpsUi();
  const toast = useToast();

  const [status, setStatus] = useState("OPEN");
  const [reasonFilter, setReasonFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [templateNote, setTemplateNote] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyFeatured, setBusyFeatured] = useState(false);

  const page = useListPage<ProfileReport>(
    (p) =>
      opsListApi.profileReports({
        ...p,
        status: status || "ALL",
        flagType: reasonFilter || undefined,
        role: severityFilter || undefined,
      }),
    25,
    [status, reasonFilter, severityFilter],
  );
  const { rows, total, loading, error, reload } = page;

  /* Auto-select the first row when the queue loads or filters change so the
     detail pane is immediately populated for the administrator. */
  useEffect(() => {
    if (rows.length > 0 && (!selId || !rows.some((r) => r.id === selId))) {
      setSelId(rows[0].id);
    } else if (rows.length === 0) {
      setSelId(null);
    }
  }, [rows, selId]);

  const sel = useMemo(() => rows.find((r) => r.id === selId) ?? null, [rows, selId]);

  const refreshFeatured = async () => {
    setBusyFeatured(true);
    try {
      await opsApi.refreshFeaturedCarousel();
      toast("Featured talent carousel recomputed and refreshed.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Carousel refresh failed");
    } finally {
      setBusyFeatured(false);
    }
  };

  const applyApproach = useCallback(
    async (action: ReportResolution) => {
      if (!sel || busy) return;
      const finalNote =
        templateNote === "custom"
          ? customNote.trim()
          : templateNote.trim() || DEFAULT_NOTES_BY_ACTION[action];

      if (!finalNote || finalNote.length < 5) {
        toast("Please select an enforcement template or enter at least 5 characters of staff notes.");
        return;
      }

      setBusy(true);
      try {
        await opsApi.resolveProfileReport(sel.id, action, finalNote);

        // Execute secondary administrative enforcement hooks when applicable
        if (action === "RESOLVED_ACCOUNT_RESTRICTED") {
          try {
            await opsApi.forceKycRereview(sel.reportedUserId);
          } catch {
            /* supplementary hook */
          }
        } else if (action === "RESOLVED_PROFILE_BANNED") {
          try {
            await opsApi.suspendUser(sel.reportedUserId, finalNote);
          } catch {
            /* supplementary hook */
          }
        }

        const actionSummary: Record<ReportResolution, string> = {
          RESOLVED_NO_ACTION: `Report dismissed for ${sel.reported}.`,
          RESOLVED_WARNED: `Formal warning & strike recorded for ${sel.reported}.`,
          RESOLVED_PROFILE_HIDDEN: `${sel.reported}'s profile hidden from public marketplace.`,
          RESOLVED_ACCOUNT_RESTRICTED: `${sel.reported} restricted & routed to mandatory KYC re-review.`,
          RESOLVED_PROFILE_BANNED: `${sel.reported} permanently banned and account suspended.`,
        };

        toast(actionSummary[action]);
        setTemplateNote("");
        setCustomNote("");
        reload();
        ui.refreshBadges();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Enforcement action failed");
      } finally {
        setBusy(false);
      }
    },
    [sel, busy, templateNote, customNote, reload, toast, ui],
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
        if ((e.key === "w" || e.key === "W") && sel) {
          e.preventDefault();
          void applyApproach("RESOLVED_WARNED");
        }
        if ((e.key === "h" || e.key === "H") && sel) {
          e.preventDefault();
          void applyApproach("RESOLVED_PROFILE_HIDDEN");
        }
        if ((e.key === "b" || e.key === "B") && sel) {
          e.preventDefault();
          void applyApproach("RESOLVED_PROFILE_BANNED");
        }
        if ((e.key === "d" || e.key === "D") && sel) {
          e.preventDefault();
          void applyApproach("RESOLVED_NO_ACTION");
        }
        if ((e.key === "r" || e.key === "R") && sel) {
          e.preventDefault();
          document.getElementById("report-enforcement-note")?.focus();
        }
      },
      [rows, selId, sel, applyApproach, ui.viewerOpen, ui.paletteOpen],
    ),
  );

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const openEvidence = (i: number) => {
    if (!sel) return;
    ui.openViewer(
      sel.evidence.map((d) => ({
        ...d,
        name: `${sel.reported} (${sel.reportedUcid})`,
        doc: `${sel.reason} · ${sel.sourceContext}`,
        tin: `Reporter: ${sel.reporter} (${sel.reporterUcid})`,
      })),
      i,
    );
  };

  const openCount = rows.filter((r) => r.status === "OPEN").length;
  const criticalOrHighCount = rows.filter(
    (r) => r.severity === "CRITICAL" || r.severity === "HIGH",
  ).length;
  const repeatOffendersCount = rows.filter((r) => r.checks.repeatOffender).length;

  return (
    <div className="fade">
      <PageHead
        title="Profile Reports"
        sub="User-to-user abuse reports, off-platform circumvention, impersonation & fraud moderation"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill p-amber" style={{ fontSize: 13 }}>
              <span className="pdot" />
              {total.toLocaleString()}{" "}
              {status === "OPEN"
                ? "pending moderation"
                : status === "ALL"
                  ? "total reports"
                  : status.toLowerCase().replace(/_/g, " ")}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refreshFeatured()} disabled={busyFeatured}>
              <RefreshCw size={14} /> Refresh Featured Carousel
            </Button>
          </div>
        }
      />

      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Kv
          k="Matching reports"
          v={total.toLocaleString()}
          active={status === "ALL" && reasonFilter === ""}
          title="Show all profile reports"
          onClick={() => {
            setStatus("ALL");
            setReasonFilter("");
          }}
        />
        <Kv
          k="Awaiting moderation"
          v={String(openCount)}
          warn={openCount > 0}
          active={status === "OPEN"}
          title="Filter to open profile reports"
          onClick={() => setStatus("OPEN")}
        />
        <Kv
          k="Critical / High severity"
          v={String(criticalOrHighCount)}
          warn={criticalOrHighCount > 0}
          title="Focus highest-severity profile report"
          onClick={() => {
            const c = rows.find(
              (r) => r.severity === "CRITICAL" || r.severity === "HIGH",
            );
            if (c) setSelId(c.id);
          }}
        />
        <Kv
          k="Repeat offenders"
          v={String(repeatOffendersCount)}
          warn={repeatOffendersCount > 0}
          title="Focus repeat offender report"
          onClick={() => {
            const rep = rows.find((r) => r.checks.repeatOffender);
            if (rep) setSelId(rep.id);
          }}
        />
      </div>

      <Card className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search reported user, reporter, UCID, email or flagged excerpt…"
            value={page.search}
            onChange={(e) => page.setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v || "ALL");
            setSelId(null);
          }}
          options={[
            "OPEN",
            "ALL",
            "RESOLVED_WARNED",
            "RESOLVED_PROFILE_HIDDEN",
            "RESOLVED_ACCOUNT_RESTRICTED",
            "RESOLVED_PROFILE_BANNED",
            "RESOLVED_NO_ACTION",
          ]}
          allLabel="All statuses"
          label="Report status"
        />
        <FilterSelect
          value={reasonFilter}
          onChange={(v) => {
            setReasonFilter(v);
            setSelId(null);
          }}
          options={[
            "OFF_PLATFORM_CONTACT",
            "IMPERSONATION",
            "FRAUD",
            "ABUSIVE_LANGUAGE",
            "SPAM",
          ]}
          allLabel="All violation types"
          label="Violation reason"
        />
        <FilterSelect
          value={severityFilter}
          onChange={(v) => {
            setSeverityFilter(v);
            setSelId(null);
          }}
          options={["CRITICAL", "HIGH", "MEDIUM", "LOW"]}
          allLabel="All severities"
          label="Severity"
        />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>

      <div className="queue-wrap">
        <div className="queue-list">
          {rows.length === 0 ? (
            <Card className="card" style={{ padding: "36px 16px", textAlign: "center" }}>
              <Empty icon={ShieldCheck}>
                No profile reports match this filter.{" "}
                {status !== "ALL" ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 8 }}
                    onClick={() => setStatus("ALL")}
                  >
                    Show all reports
                  </button>
                ) : null}
              </Empty>
            </Card>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                className={`q-card ${selId === r.id ? "selected" : ""}`}
                onClick={() => setSelId(r.id)}
              >
                <div className="q-head">
                  <strong>{r.reported}</strong>
                  <span className="q-date">{dt(r.created)}</span>
                </div>
                <div className="q-sub" style={{ marginTop: 4 }}>
                  <span className="subject">{r.reason.replace(/_/g, " ")}</span>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <Pill s={r.severity} />
                    <Pill s={r.status} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ops-text-2)",
                    marginTop: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.details}
                </div>
                {r.checks.regexFlagged || r.checks.repeatOffender || r.checks.escrowAtRisk ? (
                  <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {r.checks.repeatOffender ? (
                      <span className="check fail" style={{ fontSize: 11 }}>
                        ⚠ {r.priorWarningsCount} prior strike(s)
                      </span>
                    ) : null}
                    {r.checks.regexFlagged ? (
                      <span className="check warn" style={{ fontSize: 11 }}>
                        ⚠ Regex match
                      </span>
                    ) : null}
                    {r.checks.escrowAtRisk ? (
                      <span className="check warn" style={{ fontSize: 11 }}>
                        ⚠ Escrow {fmt(r.escrowExposureMinor)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            ))
          )}
          <Pager
            page={page.page}
            pages={page.pages}
            total={total}
            onPage={page.setPage}
            unit="reports"
          />
        </div>

        {sel ? (
          <Card className="queue-detail card">
            <div className="qd-head">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h3>Profile Abuse & Trust Review</h3>
                  <Pill s={sel.reason} />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill s={sel.severity} />
                  <Pill s={sel.status} />
                </div>
              </div>
              <div
                className="qd-meta"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <span>
                  Reported: <b>{sel.reported}</b> ({sel.reportedEmail} ·{" "}
                  <span className="mono">{sel.reportedUcid}</span>) · Reporter:{" "}
                  <b>{sel.reporter}</b> (<span className="mono">{sel.reporterUcid}</span>)
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => ui.navigate("users")}
                  title="Open Users directory"
                >
                  <ExternalLink size={12} /> Inspect User Directory
                </button>
              </div>
            </div>

            <div className="qd-body">
              <div className="sec-title" style={{ marginTop: 0 }}>
                Extracted Account & Incident Information
              </div>
              <div className="info-grid">
                <div className="kv">
                  <div className="kv-k">Reported Account</div>
                  <div className="kv-v" style={{ fontSize: 14 }}>
                    {sel.reported} · <span className="mono">{sel.reportedUcid}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    {sel.reportedEmail} · {sel.reportedRole}
                  </div>
                </div>
                <div className="kv">
                  <div className="kv-k">KYC & Verification</div>
                  <div className="kv-v" style={{ fontSize: 14 }}>
                    {sel.reportedKycTier.replace("_", " ")} · {sel.reportedKycStatus}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    Reporter: {sel.reporter} ({sel.reporterRole})
                  </div>
                </div>
                <div className="kv">
                  <div className="kv-k">Source Context</div>
                  <div className="kv-v mono" style={{ fontSize: 13 }}>
                    {sel.sourceContext}
                  </div>
                </div>
                <div className="kv">
                  <div className="kv-k">Prior Offense & Escrow Exposure</div>
                  <div className="kv-v" style={{ fontSize: 13.5 }}>
                    {sel.priorWarningsCount} warning(s) · {sel.priorReportsCount} report(s)
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ops-text-2)", marginTop: 2 }}>
                    Active Escrow: {fmt(sel.escrowExposureMinor)} ({sel.activeContractsCount} contract
                    {sel.activeContractsCount === 1 ? "" : "s"})
                  </div>
                </div>
              </div>

              <div className="sec-title" style={{ marginTop: 20 }}>
                Automated Trust & Safety Checks
              </div>
              <div className="checks-row">
                <span className={`check ${sel.checks.faydaVerified ? "ok" : "fail"}`}>
                  {sel.checks.faydaVerified ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
                  {sel.checks.faydaVerified ? "Fayda Verified" : "Unverified Identity"}
                </span>
                <span className={`check ${sel.checks.regexFlagged ? "warn" : "ok"}`}>
                  {sel.checks.regexFlagged ? <TriangleAlert size={14} /> : <CheckCircle2 size={14} />}
                  {sel.checks.regexFlagged ? "Contact / Fraud Pattern Matched" : "No Regex Triggers"}
                </span>
                <span className={`check ${sel.checks.repeatOffender ? "fail" : "ok"}`}>
                  {sel.checks.repeatOffender ? <TriangleAlert size={14} /> : <CheckCircle2 size={14} />}
                  {sel.checks.repeatOffender
                    ? `Repeat Offender (${sel.priorWarningsCount} strike${sel.priorWarningsCount === 1 ? "" : "s"})`
                    : "First Recorded Offense"}
                </span>
                <span className={`check ${sel.checks.escrowAtRisk ? "warn" : "ok"}`}>
                  {sel.checks.escrowAtRisk ? <TriangleAlert size={14} /> : <CheckCircle2 size={14} />}
                  {sel.checks.escrowAtRisk
                    ? `Active Escrow Exposure (${fmt(sel.escrowExposureMinor)})`
                    : "Zero Active Escrow Exposure"}
                </span>
              </div>

              <div className="sec-title" style={{ marginTop: 20 }}>
                Incident Report & Flagged Content Excerpt
              </div>
              <div className="kv" style={{ marginBottom: 10 }}>
                <div className="kv-k">Reporter Statement</div>
                <div style={{ fontSize: 13.5, color: "var(--ops-text)", marginTop: 4, lineHeight: 1.5 }}>
                  {sel.details}
                </div>
              </div>
              <div
                className="kv"
                style={{
                  borderLeft: "3px solid var(--ops-amber, #d97706)",
                  background: "var(--ops-bg-subtle, rgba(217, 119, 6, 0.06))",
                }}
              >
                <div className="kv-k">Captured Flagged Excerpt ({sel.sourceContext})</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 12.5,
                    color: "var(--ops-text)",
                    marginTop: 5,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  “{sel.flaggedExcerpt}”
                </div>
              </div>

              <div className="sec-title" style={{ marginTop: 20 }}>
                Submitted Evidence
              </div>
              <div className="doc-tiles">
                {sel.evidence.map((d, i) => (
                  <button className="doc-tile" key={d.id} onClick={() => openEvidence(i)}>
                    <Eye size={14} /> {d.t}
                  </button>
                ))}
              </div>

              <div className="sec-title" style={{ marginTop: 20 }}>
                Moderation & Enforcement History
              </div>
              {sel.history.length ? (
                sel.history.map((h, i) => (
                  <div className="hist-item" key={i}>
                    <b>{h.d.replace(/_/g, " ")}</b> by <span className="mono">{h.by}</span> · {dt(h.at)}
                    {h.reason ? <div className="hist-reason">Note: {h.reason}</div> : null}
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: 12.5 }}>
                  No prior moderation actions recorded on this user profile.
                </div>
              )}
            </div>

            <div className="qd-actions">
              <div style={{ marginBottom: 10 }}>
                <select
                  className="sel"
                  id="report-enforcement-note"
                  style={{ width: "100%" }}
                  value={templateNote}
                  onChange={(e) => setTemplateNote(e.target.value)}
                >
                  <option value="">
                    — Select enforcement note template or leave default per action (press R) —
                  </option>
                  {ENFORCEMENT_TEMPLATES.map((v) => (
                    <option value={v} key={v}>
                      {v}
                    </option>
                  ))}
                  <option value="custom">Write custom staff enforcement note…</option>
                </select>
                {templateNote === "custom" ? (
                  <div style={{ marginTop: 8 }}>
                    <input
                      className="inp"
                      placeholder="Type custom audit & enforcement note (min 5 characters)…"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  title="Dismiss report with no penalty (Press D)"
                  onClick={() => void applyApproach("RESOLVED_NO_ACTION")}
                >
                  <Check size={14} /> Dismiss (No Action)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  title="Send formal compliance warning & record strike (Press W)"
                  onClick={() => void applyApproach("RESOLVED_WARNED")}
                >
                  <TriangleAlert size={14} /> Issue Warning
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  title="Hide profile & gigs until user remediates violation (Press H)"
                  onClick={() => void applyApproach("RESOLVED_PROFILE_HIDDEN")}
                >
                  <EyeOff size={14} /> Hide Profile
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  title="Freeze payouts & force mandatory Fayda KYC re-review"
                  onClick={() => void applyApproach("RESOLVED_ACCOUNT_RESTRICTED")}
                >
                  <ShieldAlert size={14} /> Restrict & Force KYC
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  title="Permanently ban profile & suspend account (Press B)"
                  onClick={() => void applyApproach("RESOLVED_PROFILE_BANNED")}
                >
                  <Ban size={14} /> Ban & Suspend{" "}
                  <span
                    className="kbd"
                    style={{
                      background: "rgba(255,255,255,.25)",
                      borderColor: "rgba(255,255,255,.4)",
                      color: "#fff",
                    }}
                  >
                    B
                  </span>
                </Button>
              </div>

              <div className="kbd-hint" style={{ marginTop: 10 }}>
                <span className="kbd">↑</span> <span className="kbd">↓</span> navigate queue ·{" "}
                <span className="kbd">W</span> issue warning · <span className="kbd">H</span> hide
                profile · <span className="kbd">B</span> ban & suspend ·{" "}
                <span className="kbd">D</span> dismiss · <span className="kbd">R</span> focus note
              </div>
            </div>
          </Card>
        ) : (
          <Card className="queue-detail card">
            <div className="empty-detail">
              <UserCheck size={40} style={{ color: "var(--ops-text-3)" }} />
              <p>Select a profile report to inspect details and take enforcement action.</p>
              <span className="kbd-hint">
                Tip: use <span className="kbd">↑</span> <span className="kbd">↓</span> arrows to
                navigate the queue
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
