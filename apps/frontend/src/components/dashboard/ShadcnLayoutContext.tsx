import React, { createContext, useContext, useEffect, useState } from "react";
import {
  SlidersHorizontal,
  X,
  PanelLeft,
  Layout,
  Maximize2,
  Rows3,
  Sun,
  Moon,
  RotateCcw,
  Check,
  Sparkles,
  Columns3,
} from "lucide-react";
import { useTheme } from "../../theme/ThemeContext";

export type SidebarVariant = "sidebar" | "inset" | "floating";
export type DashboardVariant = "dashboard-1" | "dashboard-2";
export type OperationsSubTab = "table" | "kanban" | "calendar";
export type TableDensity = "compact" | "comfortable";
export type CornerRadius = "0.375rem" | "0.5rem" | "0.75rem";
export type DemoWorkspaceMode = "CLIENT" | "FREELANCER" | "BOTH" | "ADMIN";

export interface ShadcnLayoutConfig {
  sidebarVariant: SidebarVariant;
  sidebarCollapsed: boolean;
  dashboardVariant: DashboardVariant;
  opsSubTab: OperationsSubTab;
  density: TableDensity;
  radius: CornerRadius;
}

interface ShadcnLayoutContextValue extends ShadcnLayoutConfig {
  setSidebarVariant: (v: SidebarVariant) => void;
  setSidebarCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebarCollapsed: () => void;
  setDashboardVariant: (v: DashboardVariant) => void;
  setOpsSubTab: (v: OperationsSubTab) => void;
  setDensity: (v: TableDensity) => void;
  setRadius: (v: CornerRadius) => void;
  resetLayout: () => void;
  customizerOpen: boolean;
  setCustomizerOpen: (v: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const STORAGE_KEY = "yekis-shadcn-layout-v1";

const DEFAULT_CONFIG: ShadcnLayoutConfig = {
  sidebarVariant: "inset",
  sidebarCollapsed: false,
  dashboardVariant: "dashboard-1",
  opsSubTab: "table",
  density: "compact",
  radius: "0.5rem",
};

const ShadcnLayoutContext = createContext<ShadcnLayoutContextValue | null>(null);

export function ShadcnLayoutProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ShadcnLayoutConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore quota errors */
    }
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--sh-radius", config.radius);
      document.documentElement.setAttribute("data-sh-density", config.density);
      document.documentElement.setAttribute("data-sh-variant", config.sidebarVariant);
    }
  }, [config]);

  const setSidebarVariant = (sidebarVariant: SidebarVariant) =>
    setConfig((prev) => ({ ...prev, sidebarVariant }));

  const setSidebarCollapsed = (
    updater: boolean | ((prev: boolean) => boolean),
  ) =>
    setConfig((prev) => ({
      ...prev,
      sidebarCollapsed:
        typeof updater === "function" ? updater(prev.sidebarCollapsed) : updater,
    }));

  const toggleSidebarCollapsed = () =>
    setConfig((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));

  const setDashboardVariant = (dashboardVariant: DashboardVariant) =>
    setConfig((prev) => ({ ...prev, dashboardVariant }));

  const setOpsSubTab = (opsSubTab: OperationsSubTab) =>
    setConfig((prev) => ({ ...prev, opsSubTab }));

  const setDensity = (density: TableDensity) =>
    setConfig((prev) => ({ ...prev, density }));

  const setRadius = (radius: CornerRadius) =>
    setConfig((prev) => ({ ...prev, radius }));

  const resetLayout = () => setConfig(DEFAULT_CONFIG);

  return (
    <ShadcnLayoutContext.Provider
      value={{
        ...config,
        setSidebarVariant,
        setSidebarCollapsed,
        toggleSidebarCollapsed,
        setDashboardVariant,
        setOpsSubTab,
        setDensity,
        setRadius,
        resetLayout,
        customizerOpen,
        setCustomizerOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
      <LayoutCustomizerDrawer />
    </ShadcnLayoutContext.Provider>
  );
}

export function useShadcnLayout() {
  const ctx = useContext(ShadcnLayoutContext);
  if (!ctx) {
    throw new Error("useShadcnLayout must be used within ShadcnLayoutProvider");
  }
  return ctx;
}

export function LayoutCustomizerTrigger() {
  const { setCustomizerOpen } = useShadcnLayout();
  return (
    <button
      type="button"
      className="sh-icon-btn"
      onClick={() => setCustomizerOpen(true)}
      title="Customize workspace layout & appearance"
      aria-label="Customize workspace layout"
    >
      <SlidersHorizontal size={15} />
      <span className="sh-hide-mobile">Customize</span>
    </button>
  );
}

function LayoutCustomizerDrawer() {
  const {
    sidebarVariant,
    setSidebarVariant,
    sidebarCollapsed,
    setSidebarCollapsed,
    dashboardVariant,
    setDashboardVariant,
    density,
    setDensity,
    radius,
    setRadius,
    resetLayout,
    customizerOpen,
    setCustomizerOpen,
  } = useShadcnLayout();
  const { theme, toggleTheme } = useTheme();

  if (!customizerOpen) return null;

  return (
    <div
      className="sh-sheet-backdrop"
      onClick={() => setCustomizerOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Workspace Layout Customizer"
    >
      <aside
        className="sh-sheet-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sh-sheet-header">
          <div>
            <h3 className="sh-sheet-title">Workspace Customizer</h3>
            <p className="sh-sheet-subtitle">
              Configure sidebar framing, dashboard template mode, and table density.
            </p>
          </div>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={() => setCustomizerOpen(false)}
            aria-label="Close customizer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="sh-sheet-body">
          {/* Section 1: Dashboard Template Variant */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Sparkles size={13} /> Dashboard Template Mode
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${dashboardVariant === "dashboard-1" ? "active" : ""}`}
                onClick={() => setDashboardVariant("dashboard-1")}
              >
                <span className="sh-choice-head">
                  <span>Dashboard 1</span>
                  {dashboardVariant === "dashboard-1" && <Check size={13} />}
                </span>
                <small>Executive KPIs & Cashflow Charts</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${dashboardVariant === "dashboard-2" ? "active" : ""}`}
                onClick={() => setDashboardVariant("dashboard-2")}
              >
                <span className="sh-choice-head">
                  <span>Dashboard 2</span>
                  {dashboardVariant === "dashboard-2" && <Check size={13} />}
                </span>
                <small>Data Grid, Kanban & Schedule</small>
              </button>
            </div>
          </div>

          {/* Section 2: Sidebar Shell Variant */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Layout size={13} /> Sidebar Architecture
            </label>
            <div className="sh-customizer-grid-3">
              {(
                [
                  { id: "sidebar", label: "Standard", desc: "Flush edge" },
                  { id: "inset", label: "Inset", desc: "Framed canvas" },
                  { id: "floating", label: "Floating", desc: "Detached rail" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sh-choice-btn ${sidebarVariant === item.id ? "active" : ""}`}
                  onClick={() => setSidebarVariant(item.id)}
                >
                  <span className="sh-choice-head">
                    <span>{item.label}</span>
                    {sidebarVariant === item.id && <Check size={12} />}
                  </span>
                  <small>{item.desc}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Sidebar Collapse State */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <PanelLeft size={13} /> Navigation Rail Width
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${!sidebarCollapsed ? "active" : ""}`}
                onClick={() => setSidebarCollapsed(false)}
              >
                <span className="sh-choice-head">
                  <span>Expanded (256px)</span>
                  {!sidebarCollapsed && <Check size={13} />}
                </span>
                <small>Full labels & role card</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${sidebarCollapsed ? "active" : ""}`}
                onClick={() => setSidebarCollapsed(true)}
              >
                <span className="sh-choice-head">
                  <span>Compact Icon Rail</span>
                  {sidebarCollapsed && <Check size={13} />}
                </span>
                <small>Maximizes table width</small>
              </button>
            </div>
          </div>

          {/* Section 4: Data Grid & Row Density */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Rows3 size={13} /> Data Table & List Density
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${density === "compact" ? "active" : ""}`}
                onClick={() => setDensity("compact")}
              >
                <span className="sh-choice-head">
                  <span>Compact (38px)</span>
                  {density === "compact" && <Check size={13} />}
                </span>
                <small>High-density financial rows</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${density === "comfortable" ? "active" : ""}`}
                onClick={() => setDensity("comfortable")}
              >
                <span className="sh-choice-head">
                  <span>Comfortable (46px)</span>
                  {density === "comfortable" && <Check size={13} />}
                </span>
                <small>Relaxed spacing</small>
              </button>
            </div>
          </div>

          {/* Section 5: Corner Radius */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Maximize2 size={13} /> Surface Radius Scale
            </label>
            <div className="sh-customizer-grid-3">
              {(
                [
                  { id: "0.375rem", label: "Crisp (6px)" },
                  { id: "0.5rem", label: "Default (8px)" },
                  { id: "0.75rem", label: "Soft (12px)" },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`sh-choice-btn ${radius === r.id ? "active" : ""}`}
                  onClick={() => setRadius(r.id)}
                >
                  <span className="sh-choice-head">
                    <span>{r.label}</span>
                    {radius === r.id && <Check size={12} />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 6: Color Mode */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Columns3 size={13} /> Color Theme (Yekis Emerald)
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => {
                  if (theme !== "light") toggleTheme();
                }}
              >
                <span className="sh-choice-head">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Sun size={13} /> Alabaster Light
                  </span>
                  {theme === "light" && <Check size={13} />}
                </span>
                <small>#F8FAFC canvas · #16A34A accent</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => {
                  if (theme !== "dark") toggleTheme();
                }}
              >
                <span className="sh-choice-head">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Moon size={13} /> Carbon Dark
                  </span>
                  {theme === "dark" && <Check size={13} />}
                </span>
                <small>#090D12 canvas · #22C55E accent</small>
              </button>
            </div>
          </div>
        </div>

        <div className="sh-sheet-footer">
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={resetLayout}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <RotateCcw size={14} /> Reset to Default Layout
          </button>
        </div>
      </aside>
    </div>
  );
}
