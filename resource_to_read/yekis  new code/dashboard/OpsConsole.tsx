/* ────────────────────────────────────────────────────────────────────────
   OpsConsole.tsx — Operations Console shell for the Vite SPA.

   Mount it from App.tsx with the existing string router, e.g.:

     {page === "ops-console" && <OpsConsole onExit={() => onNavigate("home")} />}

   · internal sub-navigation is local state (same pattern as App.tsx)
   · sidebar badges refresh from GET /admin/badges on every page switch
   · provides OpsUiContext (navigate / viewer / palette / toast / badges),
     ChartTipContext (single floating chart tooltip) and ToastContext
   · Ctrl/⌘+K toggles the command palette from anywhere in the console
   · styles live in src/styles/ops-console.css, scoped under .ops-root and
     themed through the global ThemeContext (`data-theme` on <html>)
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Bell, CheckCircle2, LogOut, Menu, Search, Zap } from "lucide-react";
import "../../styles/ops-console.css";
import { opsApi, useApi } from "./opsApi";
import type { OpsBadges } from "./opsTypes";
import { OPS_NAV, OPS_PAGES } from "./opsNav";
import type { OpsPageId } from "./opsNav";
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
  kyc: KycQueue,
  "dispute-queue": DisputeQueue,
  "reports-queue": ReportsQueue,
  contracts: Contracts,
  payments: Payments,
  payouts: Payouts,
  escrow: EscrowPage,
  reconciliation: Reconciliation,
  ledger: Ledger,
  users: UsersPage,
  staff: StaffPage,
  reports: Reports,
  risk: Risk,
  monitoring: Monitoring,
};

export default function OpsConsole({ onExit }: { onExit?: () => void }) {
  const [page, setPage] = useState<OpsPageId>("overview");
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewer, setViewer] = useState<{ docs: ViewerDoc[]; idx: number } | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const badges = useApi<OpsBadges>(opsApi.badges);

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

  const Page = PAGE_MAP[page];
  const current = OPS_PAGES.find((i) => i.id === page);
  const b = badges.data;

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
                  {OPS_NAV.map((g) => (
                    <div className="nav-group" key={g.label}>
                      <div className="nav-label">{g.label}</div>
                      {g.items.map((i) => {
                        const count = b && i.badge ? i.badge(b) : 0;
                        return (
                          <button
                            key={i.id}
                            className={`nav-item ${page === i.id ? "active" : ""}`}
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
                  <div className="user-chip" onClick={onExit} title={onExit ? "Back to site" : undefined}>
                    <div className="avatar">SA</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">Super Admin</div>
                      <div className="em">super@yekis.com</div>
                    </div>
                    <LogOut size={15} style={{ color: "#93a0b4" }} />
                  </div>
                </div>
              </aside>
              {sidebarOpen ? <div className="overlay show" onClick={() => setSidebarOpen(false)} /> : null}

              <div className="main">
                <header className="header">
                  <button className="menu-btn" onClick={() => setSidebarOpen((o) => !o)}>
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
                    <button className="icon-btn">
                      <Bell size={17} />
                      <span className="dot" />
                    </button>
                  </div>
                </header>
                <main className="content">
                  <Page key={page} focusId={focusId} />
                </main>
              </div>
            </div>

            {viewer ? (
              <EvidenceViewer docs={viewer.docs} startIdx={viewer.idx} onClose={() => setViewer(null)} />
            ) : null}

            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              onPick={(p, id) => navigate(p, id)}
            />

            {toastMsg ? (
              <div className="toast">
                <span className="t-ic">
                  <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
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
