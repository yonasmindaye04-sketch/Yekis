/* ────────────────────────────────────────────────────────────────────────
   OpsConsole.tsx — Operations Console shell for the Vite SPA.

   Mount it from FullPlatformApp where a staff account is detected:

     <OpsConsole user={user} onExit={onLogout} />

   · internal sub-navigation is local state (same pattern as the string router)
   · sidebar badges refresh from opsApi.badges() on demand
   · nav visibility is gated by opsPerms, driven by GET /admin/permissions/matrix
   · provides OpsUiContext (navigate / viewer / palette / toast / badges),
     ChartTipContext (single floating chart tooltip) and ToastContext
   · Ctrl/⌘+K toggles the command palette from anywhere in the console
   · styles live in src/styles/ops-console.css, scoped under .ops-root and
     themed through the global ThemeContext (`data-theme` on <html>)
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Bell,
  CheckCircle2,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  Zap,
} from "lucide-react";
import type { MeResponse } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import "../../styles/ops-console.css";
import { opsApi, useApi } from "./opsApi";
import type { OpsBadges } from "./opsTypes";
import { OPS_NAV, OPS_PAGES } from "./opsNav";
import type { OpsPageId } from "./opsPerms";
import { ROLE_LABEL, useOpsPerms } from "./opsPerms";
import { OpsUiContext } from "./opsUiContext";
import { ChartTipContext } from "./components/charts";
import type { ChartTipApi } from "./components/charts";
import { ToastContext } from "./components/ui";
import CommandPalette from "./components/CommandPalette";
import EvidenceViewer from "./components/EvidenceViewer";
import type { ViewerDoc } from "./components/EvidenceViewer";

import Overview from "./pages/Overview";
import KycQueue from "./pages/KycQueue";
import DisputeQueue from "./pages/DisputeQueue";
import ReportsQueue from "./pages/ReportsQueue";
import Receipts from "./pages/Receipts";
import SupportDesk from "./pages/SupportDesk";
import AuditLogs from "./pages/AuditLogs";
import Contracts from "./pages/Contracts";
import Payments from "./pages/Payments";
import Payouts from "./pages/Payouts";
import EscrowPage from "./pages/Escrow";
import Reconciliation from "./pages/Reconciliation";
import Ledger from "./pages/Ledger";
import UsersPage from "./pages/Users";
import StaffPage from "./pages/Staff";
import Reports from "./pages/Reports";
import Risk from "./pages/Risk";
import Monitoring from "./pages/Monitoring";

const PAGE_MAP: Record<OpsPageId, ComponentType<{ focusId?: string }>> = {
  overview: Overview,
  support: SupportDesk,
  "dispute-queue": DisputeQueue,
  risk: Risk,
  kyc: KycQueue,
  "reports-queue": ReportsQueue,
  receipts: Receipts,
  ledger: Ledger,
  reconciliation: Reconciliation,
  reports: Reports,
  contracts: Contracts,
  payments: Payments,
  escrow: EscrowPage,
  payouts: Payouts,
  users: UsersPage,
  staff: StaffPage,
  audit: AuditLogs,
  monitoring: Monitoring,
};

export interface OpsConsoleProps {
  /** Signed-in staff account — drives the sidebar identity and role gating. */
  user?: MeResponse | null;
  /** Called when the reviewer signs out or leaves the console. */
  onExit?: () => void;
}

export function OpsConsole({ user, onExit }: OpsConsoleProps) {
  const { theme, toggleTheme } = useTheme();
  const perms = useOpsPerms(user?.staffRole);

  const [page, setPage] = useState<OpsPageId>("overview");
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewer, setViewer] = useState<{ docs: ViewerDoc[]; idx: number } | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const badges = useApi<OpsBadges>(opsApi.badges);

  /* Groups with at least one page this role may open. */
  const groups = useMemo(
    () =>
      OPS_NAV.map((g) => ({ ...g, items: g.items.filter((i) => perms.can(i.id)) })).filter(
        (g) => g.items.length > 0,
      ),
    [perms],
  );

  /* A deep link (or a role change) can land on a page this role cannot open;
     fall back to the first permitted page during render rather than in an
     effect, which would cost an extra render pass. */
  const activePage: OpsPageId = perms.can(page)
    ? page
    : groups[0]?.items[0]?.id ?? "overview";

  const navigate = useCallback((p: OpsPageId, focus?: string) => {
    setPage(p);
    setFocusId(focus);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200);
  }, []);

  /* Ctrl/⌘+K — palette toggle (queue hotkeys live inside each page) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const ui = useMemo(
    () => ({
      navigate,
      openViewer: (docs: ViewerDoc[], startIdx = 0) => setViewer({ docs, idx: startIdx }),
      viewerOpen: viewer !== null,
      paletteOpen,
      toast,
      refreshBadges: badges.reload,
    }),
    [navigate, viewer, paletteOpen, toast, badges.reload],
  );

  const tipApi = useMemo<ChartTipApi>(
    () => ({
      show: (text, x, y) => setTip({ text, x, y }),
      hide: () => setTip(null),
    }),
    [],
  );

  const Page = PAGE_MAP[activePage];
  const current = OPS_PAGES.find((i) => i.id === activePage);
  const b = badges.data;
  const email = user?.email ?? "";
  const roleLabel = user?.staffRole ? ROLE_LABEL[user.staffRole] ?? user.staffRole : "Staff desk";

  return (
    <OpsUiContext.Provider value={ui}>
      <ChartTipContext.Provider value={tipApi}>
        <ToastContext.Provider value={toast}>
          <div className="ops-root">
            <div className="app">
              <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="brand">
                  <div className="brand-logo"><Zap size={17} /></div>
                  <div>
                    <div className="brand-name">
                      Yekis<span className="brand-tag">OPS CONSOLE</span>
                    </div>
                  </div>
                </div>
                <nav className="nav">
                  {groups.map((g) => (
                    <div className="nav-group" key={g.label}>
                      <div className="nav-label">{g.label}</div>
                      {g.items.map((i) => {
                        const count = b && i.badge ? i.badge(b) : 0;
                        return (
                          <button
                            key={i.id}
                            className={`nav-item ${activePage === i.id ? "active" : ""}`}
                            onClick={() => navigate(i.id)}
                          >
                            <i.icon size={16} /> {i.name}
                            {count ? <span className="nav-badge">{count}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>
                <div className="sidebar-foot">
                  <div className="user-chip" title={email || undefined}>
                    <div className="avatar">{email.slice(0, 1).toUpperCase() || "S"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">{roleLabel}</div>
                      <div className="em">{email || "—"}</div>
                    </div>
                    {onExit ? (
                      <button
                        className="icon-btn"
                        onClick={onExit}
                        title="Sign out"
                        aria-label="Sign out"
                      >
                        <LogOut size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </aside>
              {sidebarOpen ? <div className="overlay show" onClick={() => setSidebarOpen(false)} /> : null}

              <div className="main">
                <header className="header">
                  <button
                    className="menu-btn"
                    onClick={() => setSidebarOpen((o) => !o)}
                    aria-label="Toggle navigation"
                  >
                    <Menu size={18} />
                  </button>
                  <div className="crumb">
                    Ops / <b>{current?.name ?? ""}</b>
                  </div>
                  <div className="search-wrap" style={{ margin: "0 auto" }}>
                    <Search size={15} />
                    <input
                      placeholder="Search or jump to anything…"
                      onFocus={(e) => { setPaletteOpen(true); e.target.blur(); }}
                    />
                    <span className="kbd srch-kbd">Ctrl K</span>
                  </div>
                  <div className="hdr-right">
                    <button
                      className="icon-btn"
                      onClick={toggleTheme}
                      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                    >
                      {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                    </button>
                    <button className="icon-btn" aria-label="Notifications">
                      <Bell size={17} />
                    </button>
                  </div>
                </header>
                <main className="content">
                  <Page key={activePage} focusId={focusId} />
                </main>
              </div>
            </div>

            {viewer ? (
              <EvidenceViewer docs={viewer.docs} startIdx={viewer.idx} onClose={() => setViewer(null)} />
            ) : null}

            {/* Keyed on `open` so the query box and selection reset on each launch. */}
            <CommandPalette
              key={paletteOpen ? "palette-open" : "palette-closed"}
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              onPick={(p, id) => navigate(p, id)}
              can={perms.can}
            />

            {toastMsg ? (
              <div className="toast">
                <span className="t-ic">
                  <CheckCircle2 size={16} />
                </span>
                {toastMsg}
              </div>
            ) : null}

            <div
              className="ops-tip"
              style={{ left: tip?.x ?? 0, top: tip?.y ?? 0, opacity: tip ? 1 : 0 }}
            >
              {tip?.text ?? ""}
            </div>
          </div>
        </ToastContext.Provider>
      </ChartTipContext.Provider>
    </OpsUiContext.Provider>
  );
}

export default OpsConsole;