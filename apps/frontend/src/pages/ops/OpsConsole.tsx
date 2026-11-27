/* ────────────────────────────────────────────────────────────────────────
   OpsConsole.tsx — Operations Console shell for the Vite SPA.

   Mount it from FullPlatformApp where a staff account is detected:

     <OpsConsole user={user} onExit={onLogout} />

   · internal sub-navigation is local state with history back-stack
   · sidebar collapse, shell variant (sidebar/inset/floating), density and
     radius are synced with ShadcnLayoutContext + LayoutCustomizerTrigger
   · sidebar badges refresh from opsApi.badges() on demand
   · nav visibility is gated by opsPerms, driven by GET /admin/permissions/matrix
   · provides OpsUiContext (navigate / viewer / palette / toast / badges),
     ChartTipContext (single floating chart tooltip) and ToastContext
   · Ctrl/⌘+K toggles the native <dialog> command palette from anywhere
   · styles live in src/styles/ops-console.css, scoped under .ops-root and
     themed through the global ThemeContext (`data-theme` on <html>)
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from "lucide-react";
import type { MeResponse } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import "../../styles/shadcn-dashboard.css";
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
import { SoundToggle } from "../../components/SoundToggle";
import { YekisAvatar } from "../../components/YekisAvatar";
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

export function OpsConsole({ user, onExit }: OpsConsoleProps) {
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarVariant,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
  } = useShadcnLayout();
  const perms = useOpsPerms(user?.staffRole);

  const [page, setPage] = useState<OpsPageId>("overview");
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<Array<{ page: OpsPageId; focusId?: string }>>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewer, setViewer] = useState<{ docs: ViewerDoc[]; idx: number } | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const badges = useApi<OpsBadges>(opsApi.badges);

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 1024,
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Groups with at least one page this role may open. */
  const groups = useMemo(
    () =>
      OPS_NAV.map((g) => ({ ...g, items: g.items.filter((i) => perms.can(i.id)) })).filter(
        (g) => g.items.length > 0,
      ),
    [perms],
  );

  const activePage: OpsPageId = perms.can(page)
    ? page
    : groups[0]?.items[0]?.id ?? "overview";

  const navigate = useCallback(
    (p: OpsPageId, focus?: string) => {
      if (p !== activePage || focus !== focusId) {
        setHistory((prev) => [...prev.slice(-14), { page: activePage, focusId }]);
      }
      setPage(p);
      setFocusId(focus);
      setSidebarOpen(false);
      window.scrollTo(0, 0);
    },
    [activePage, focusId],
  );

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setPage(prev.page);
      setFocusId(prev.focusId);
      setSidebarOpen(false);
      return;
    }
    if (activePage !== "overview") {
      setPage("overview");
      setFocusId(undefined);
    }
  }, [history, activePage]);

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
        setCommandPaletteOpen((o) => !o);
      } else if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, setCommandPaletteOpen]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const email = user?.email ?? "";
  const roleLabel = user?.staffRole ? ROLE_LABEL[user.staffRole] ?? user.staffRole : "Staff desk";

  const ui = useMemo(
    () => ({
      navigate,
      openViewer: (docs: ViewerDoc[], startIdx = 0) => setViewer({ docs, idx: startIdx }),
      viewerOpen: viewer !== null,
      paletteOpen: commandPaletteOpen,
      toast,
      refreshBadges: badges.reload,
      account: user ? { id: user.id, email, staffRole: user.staffRole, roleLabel } : null,
      can: perms.can,
      pageLabel,
    }),
    [
      navigate,
      viewer,
      commandPaletteOpen,
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
  const activeGroup = groups.find((g) => g.items.some((i) => i.id === activePage));
  const canGoBack = history.length > 0 || activePage !== "overview";

  return (
    <OpsUiContext.Provider value={ui}>
      <ChartTipContext.Provider value={tipApi}>
        <ToastContext.Provider value={toast}>
          <div
            className={`ops-root sh-ops-shell sh-variant-${sidebarVariant}${
              sidebarCollapsed && !isNarrow ? " sh-collapsed" : ""
            }`}
          >
            <div className="app">
              {sidebarOpen ? (
                <div
                  className="overlay show"
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden="true"
                />
              ) : null}

              <aside
                id="ops-mobile-drawer"
                className={`sidebar ${sidebarOpen ? "open" : ""}`}
                aria-label="Operations Console navigation"
              >
                <div className="sidebar-brand-row">
                  <button
                    type="button"
                    className="brand"
                    onClick={() => navigate("overview")}
                    title="Operations Command Center"
                  >
                    <div className="brand-logo">
                      <img src="/svgviewer-output.svg" alt="Yekis Jobs" />
                    </div>
                    <div className="brand-name">
                      <span>Yekis</span>
                      <span className="brand-tag">Workspace</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      isNarrow ? setSidebarOpen(false) : toggleSidebarCollapsed()
                    }
                    aria-expanded={isNarrow ? sidebarOpen : !sidebarCollapsed}
                    aria-controls="ops-mobile-drawer"
                    title={
                      isNarrow
                        ? "Close navigation"
                        : sidebarCollapsed
                          ? "Expand sidebar"
                          : "Collapse sidebar"
                    }
                    aria-label={
                      isNarrow
                        ? "Close navigation"
                        : sidebarCollapsed
                          ? "Expand sidebar"
                          : "Collapse sidebar"
                    }
                  >
                    {isNarrow ? (
                      <X size={16} />
                    ) : sidebarCollapsed ? (
                      <PanelLeftOpen size={16} />
                    ) : (
                      <PanelLeftClose size={16} />
                    )}
                  </button>
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
                            type="button"
                            className={`nav-item ${activePage === i.id ? "active" : ""}`}
                            onClick={() => navigate(i.id)}
                          >
                            <i.icon size={16} />
                            <span>{i.name}</span>
                            {count ? <span className="nav-badge sh-mono">{count}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>

                <div className="sidebar-foot">
                  <div className="user-chip">
                    <button
                      type="button"
                      className="user-chip-main"
                      onClick={() => navigate("profile")}
                      title="Edit your profile"
                      aria-label={`Edit your profile — signed in as ${roleLabel}`}
                    >
                      <span className="avatar">
                        {user ? (
                          <YekisAvatar
                            userId={user.id}
                            email={user.email}
                            displayName={user.displayName}
                            avatarUrl={user.avatarUrl}
                            size={34}
                            animate="hover"
                          />
                        ) : (
                          email.slice(0, 1).toUpperCase() || "S"
                        )}
                      </span>
                      <span className="user-chip-id">
                        <span className="nm">{roleLabel}</span>
                        <span className="em">{email || "—"}</span>
                      </span>
                    </button>
                    {onExit ? (
                      <button
                        type="button"
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

              <div className="main">
                <header className="header">
                  <div className="hdr-left">
                    {(isNarrow || sidebarCollapsed) && (
                      <button
                        type="button"
                        className="menu-btn"
                        onClick={() =>
                          isNarrow ? setSidebarOpen((o) => !o) : toggleSidebarCollapsed()
                        }
                        aria-label={isNarrow ? "Open navigation" : "Show sidebar"}
                        aria-expanded={isNarrow ? sidebarOpen : !sidebarCollapsed}
                        aria-controls="ops-mobile-drawer"
                        title={isNarrow ? "Open navigation" : "Show sidebar"}
                      >
                        <Menu size={17} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="icon-btn"
                      onClick={goBack}
                      disabled={!canGoBack}
                      aria-label="Go back"
                      title={canGoBack ? "Go back to previous page" : "At Command Center"}
                    >
                      <ArrowLeft size={16} />
                    </button>

                    <nav className="crumb" aria-label="Operations Console breadcrumb">
                      <button
                        type="button"
                        className="crumb-link"
                        onClick={() => navigate("overview")}
                      >
                        Ops Console
                      </button>
                      {activeGroup && activePage !== "overview" ? (
                        <>
                          <span className="crumb-sep">/</span>
                          <button
                            type="button"
                            className="crumb-link"
                            onClick={() =>
                              activeGroup.items[0] && navigate(activeGroup.items[0].id)
                            }
                          >
                            {activeGroup.label}
                          </button>
                        </>
                      ) : null}
                      <span className="crumb-sep">/</span>
                      <strong className="crumb-current" aria-current="page">
                        {current?.name ?? ""}
                      </strong>
                      {focusId ? (
                        <>
                          <span className="crumb-sep">/</span>
                          <button
                            type="button"
                            className="crumb-focus-clear"
                            onClick={() => setFocusId(undefined)}
                            title="Clear focused record filter"
                          >
                            <span>#{focusId}</span>
                            <span aria-hidden="true">×</span>
                          </button>
                        </>
                      ) : null}
                    </nav>
                  </div>

                  <div className="hdr-right">
                    <button
                      type="button"
                      className="ops-cmd-trigger"
                      onClick={() => setCommandPaletteOpen(true)}
                      title="Jump to page, record or layout setting (Ctrl+K)"
                    >
                      <Search size={14} />
                      <span>Search / Jump</span>
                      <kbd className="kbd">⌘K</kbd>
                    </button>

                    <button
                      type="button"
                      className="icon-btn ops-mobile-search-btn"
                      onClick={() => setCommandPaletteOpen(true)}
                      aria-label="Search or jump to page"
                      title="Search or jump to page (Ctrl+K)"
                    >
                      <Search size={17} />
                    </button>

                    <LayoutCustomizerTrigger />
                    <SoundToggle className="icon-btn" size={16} />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={toggleTheme}
                      aria-label={
                        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                      }
                      title={
                        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                      }
                    >
                      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                    <NotificationBell />
                    <button
                      type="button"
                      className="ops-topbar-avatar-btn"
                      onClick={() => navigate("profile")}
                      title={`${roleLabel} — ${email}`}
                      aria-label="Open staff profile"
                    >
                      <span className="avatar" style={{ width: 32, height: 32 }}>
                        {user ? (
                          <YekisAvatar
                            userId={user.id}
                            email={user.email}
                            displayName={user.displayName}
                            avatarUrl={user.avatarUrl}
                            size={32}
                            animate="hover"
                          />
                        ) : (
                          email.slice(0, 1).toUpperCase() || "S"
                        )}
                      </span>
                    </button>
                  </div>
                </header>

                <main className="content sh-workspace-view">
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
                    className={`ops-bottom-nav-item ${
                      activePage === item.id && !sidebarOpen ? "active" : ""
                    }`}
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
                aria-controls="ops-mobile-drawer"
                aria-label="Toggle operations menu drawer"
              >
                <Menu size={18} />
                <span>Menu</span>
              </button>
            </nav>

            {viewer ? (
              <EvidenceViewer
                docs={viewer.docs}
                startIdx={viewer.idx}
                onClose={() => setViewer(null)}
              />
            ) : null}

            <CommandPalette
              key={commandPaletteOpen ? "palette-open" : "palette-closed"}
              open={commandPaletteOpen}
              onClose={() => setCommandPaletteOpen(false)}
              onPick={(p, id) => navigate(p, id)}
              can={perms.can}
            />

            {toastMsg ? (
              <div className="toast" role="status" aria-live="polite">
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
