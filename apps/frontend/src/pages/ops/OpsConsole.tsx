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
  CheckCircle2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Moon,
  Menu,
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
import NotificationBell from "./components/NotificationBell";
import EvidenceViewer from "./components/EvidenceViewer";
import type { ViewerDoc } from "./components/EvidenceViewer";
import {
  LayoutCustomizerTrigger,
  useShadcnLayout,
} from "../../components/dashboard/ShadcnLayoutContext";

import Overview from "./pages/Overview";
import KycQueue from "./pages/KycQueue";
import DisputeQueue from "./pages/DisputeQueue";
import ReportsQueue from "./pages/ReportsQueue";
import GigModeration from "./pages/GigModeration";
import FeaturedTalent from "./pages/FeaturedTalent";
import BotOperations from "./pages/BotOperations";
import WithholdingReports from "./pages/WithholdingReports";
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
import ProfilePage from "./pages/Profile";

const PAGE_MAP: Record<OpsPageId, ComponentType<{ focusId?: string }>> = {
  overview: Overview,
  support: SupportDesk,
  "dispute-queue": DisputeQueue,
  risk: Risk,
  kyc: KycQueue,
  "reports-queue": ReportsQueue,
  gigs: GigModeration,
  featured: FeaturedTalent,
  bot: BotOperations,
  withholding: WithholdingReports,
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
  profile: ProfilePage,
};

export interface OpsConsoleProps {
  /** Signed-in staff account — drives the sidebar identity and role gating. */
  user?: MeResponse | null;
  /** Called when the reviewer signs out or leaves the console. */
  onExit?: () => void;
}

/** localStorage key holding the sidebar collapsed/expanded preference. */
const NAV_KEY = "yekis-ops-nav";

export function OpsConsole({ user, onExit }: OpsConsoleProps) {
  const { theme, toggleTheme } = useTheme();
  const { sidebarVariant } = useShadcnLayout();
  const perms = useOpsPerms(user?.staffRole);

  const [page, setPage] = useState<OpsPageId>("overview");
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /* Desktop: sidebar hidden to free the full width for wide tables/charts.
     Persisted so the choice survives a reload. */
  const [navCollapsed, setNavCollapsed] = useState(
    () => window.localStorage.getItem(NAV_KEY) === "collapsed",
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewer, setViewer] = useState<{ docs: ViewerDoc[]; idx: number } | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const badges = useApi<OpsBadges>(opsApi.badges);

  /* Below 860px the sidebar is an overlay drawer; above it, a collapsible
     column. One 3-bar button drives whichever applies. */
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 860,
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleNav = useCallback(() => {
    if (isNarrow) {
      setSidebarOpen((o) => !o);
    } else {
      setNavCollapsed((c) => {
        window.localStorage.setItem(NAV_KEY, c ? "expanded" : "collapsed");
        return !c;
      });
    }
  }, [isNarrow]);

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

  /* Nav labels live in OPS_PAGES; expose a lookup so deep-link surfaces (the
   notification bell) can name a destination without importing opsNav. */
const pageLabel = useCallback(
  (p: OpsPageId) => OPS_PAGES.find((i) => i.id === p)?.name ?? p,
  [],
);

const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200);
  }, []);

  /* Ctrl/⌘+K — palette toggle + Escape to close mobile sidebar drawer */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const email = user?.email ?? "";
  const roleLabel = user?.staffRole ? ROLE_LABEL[user.staffRole] ?? user.staffRole : "Staff desk";

  const ui = useMemo(
    () => ({
      navigate,
      openViewer: (docs: ViewerDoc[], startIdx = 0) => setViewer({ docs, idx: startIdx }),
      viewerOpen: viewer !== null,
      paletteOpen,
      toast,
      refreshBadges: badges.reload,
      account: user ? { id: user.id, email, staffRole: user.staffRole, roleLabel } : null,
      can: perms.can,
      pageLabel,
    }),
    [
      navigate,
      viewer,
      paletteOpen,
      toast,
      badges.reload,
      user,
      email,
      roleLabel,
      perms.can,
      pageLabel,
    ],
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

  return (
    <OpsUiContext.Provider value={ui}>
      <ChartTipContext.Provider value={tipApi}>
        <ToastContext.Provider value={toast}>
          <div className={`ops-root sh-ops-shell sh-variant-${sidebarVariant}${navCollapsed && !isNarrow ? " nav-collapsed" : ""}`}>
            <div className="app">
              <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="brand">
                  <div className="brand-logo">
                    <img src="/svgviewer-output.svg" alt="Yekis Jobs" />
                  </div>
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
                  <div className="user-chip">
                    {/* Identity block opens the profile editor; sign-out stays a
                        separate control so it can never be triggered by accident. */}
                    <button
                      className="user-chip-main"
                      onClick={() => navigate("profile")}
                      title="Edit your profile"
                      aria-label={`Edit your profile — signed in as ${roleLabel}`}
                    >
                      <span className="avatar">{email.slice(0, 1).toUpperCase() || "S"}</span>
                      <span className="user-chip-id">
                        <span className="nm">{roleLabel}</span>
                        <span className="em">{email || "—"}</span>
                      </span>
                    </button>
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
                  {/* Single sidebar control, always in the header. The glyph names
                      the action it performs, and aria-expanded tracks the sidebar so
                      assistive tech reads the current state rather than the action. */}
                  <button
                    className="menu-btn"
                    onClick={toggleNav}
                    aria-label={isNarrow ? "Toggle navigation" : navCollapsed ? "Show sidebar" : "Hide sidebar"}
                    aria-expanded={isNarrow ? sidebarOpen : !navCollapsed}
                    title={isNarrow ? "Toggle navigation" : navCollapsed ? "Show sidebar" : "Hide sidebar"}
                  >
                    {isNarrow || navCollapsed ? (
                      <PanelLeftOpen size={17} />
                    ) : (
                      <PanelLeftClose size={17} />
                    )}
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
                      type="button"
                      className="icon-btn ops-mobile-search-btn"
                      onClick={() => setPaletteOpen(true)}
                      aria-label="Search or jump to page"
                      title="Search or jump to page (Ctrl+K)"
                    >
                      <Search size={17} />
                    </button>
                    <LayoutCustomizerTrigger />
                    <button
                      className="icon-btn"
                      onClick={toggleTheme}
                      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                    >
                      {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                    </button>
                    <NotificationBell />
                  </div>
                </header>
                <main className="content">
                  <Page key={activePage} focusId={focusId} />
                </main>
              </div>
            </div>

            <nav className="ops-bottom-nav" aria-label="Operations mobile navigation">
              {groups
                .flatMap((g) => g.items)
                .slice(0, 4)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ops-bottom-nav-item ${activePage === item.id && !sidebarOpen ? "active" : ""}`}
                    onClick={() => navigate(item.id)}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </button>
                ))}
              <button
                type="button"
                className={`ops-bottom-nav-item ${sidebarOpen ? "active" : ""}`}
                onClick={() => setSidebarOpen((o) => !o)}
                aria-expanded={sidebarOpen}
                aria-label="Toggle operations menu drawer"
              >
                <Menu size={18} />
                <span>Menu</span>
              </button>
            </nav>

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
