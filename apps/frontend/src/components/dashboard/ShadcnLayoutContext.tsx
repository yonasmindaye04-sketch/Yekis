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
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";

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
  const { language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).customizer;
  return (
    <button
      type="button"
      className="sh-icon-btn"
      onClick={() => setCustomizerOpen(true)}
      title={copy.triggerTitle}
      aria-label={copy.triggerAria}
    >
      <SlidersHorizontal size={15} />
      <span className="sh-hide-mobile">{copy.triggerText}</span>
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
  const { language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).customizer;

  if (!customizerOpen) return null;

  return (
    <div
      className="sh-sheet-backdrop"
      onClick={() => setCustomizerOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={copy.dialogAria}
    >
      <aside
        className="sh-sheet-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sh-sheet-header">
          <div>
            <h3 className="sh-sheet-title">{copy.title}</h3>
            <p className="sh-sheet-subtitle">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={() => setCustomizerOpen(false)}
            aria-label={copy.closeAria}
          >
            <X size={16} />
          </button>
        </div>

        <div className="sh-sheet-body">
          {/* Section 1: Dashboard Template Variant */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Sparkles size={13} /> {copy.templateModeLabel}
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${dashboardVariant === "dashboard-1" ? "active" : ""}`}
                onClick={() => setDashboardVariant("dashboard-1")}
              >
                <span className="sh-choice-head">
                  <span>{copy.d1Title}</span>
                  {dashboardVariant === "dashboard-1" && <Check size={13} />}
                </span>
                <small>{copy.d1Desc}</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${dashboardVariant === "dashboard-2" ? "active" : ""}`}
                onClick={() => setDashboardVariant("dashboard-2")}
              >
                <span className="sh-choice-head">
                  <span>{copy.d2Title}</span>
                  {dashboardVariant === "dashboard-2" && <Check size={13} />}
                </span>
                <small>{copy.d2Desc}</small>
              </button>
            </div>
          </div>

          {/* Section 2: Sidebar Shell Variant */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Layout size={13} /> {copy.sidebarArchLabel}
            </label>
            <div className="sh-customizer-grid-3">
              {(
                [
                  { id: "sidebar", label: copy.sidebarStandard, desc: copy.sidebarStandardDesc },
                  { id: "inset", label: copy.sidebarInset, desc: copy.sidebarInsetDesc },
                  { id: "floating", label: copy.sidebarFloating, desc: copy.sidebarFloatingDesc },
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
              <PanelLeft size={13} /> {copy.railWidthLabel}
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${!sidebarCollapsed ? "active" : ""}`}
                onClick={() => setSidebarCollapsed(false)}
              >
                <span className="sh-choice-head">
                  <span>{copy.railExpanded}</span>
                  {!sidebarCollapsed && <Check size={13} />}
                </span>
                <small>{copy.railExpandedDesc}</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${sidebarCollapsed ? "active" : ""}`}
                onClick={() => setSidebarCollapsed(true)}
              >
                <span className="sh-choice-head">
                  <span>{copy.railCompact}</span>
                  {sidebarCollapsed && <Check size={13} />}
                </span>
                <small>{copy.railCompactDesc}</small>
              </button>
            </div>
          </div>

          {/* Section 4: Data Grid & Row Density */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Rows3 size={13} /> {copy.densityLabel}
            </label>
            <div className="sh-customizer-grid-2">
              <button
                type="button"
                className={`sh-choice-btn ${density === "compact" ? "active" : ""}`}
                onClick={() => setDensity("compact")}
              >
                <span className="sh-choice-head">
                  <span>{copy.densityCompact}</span>
                  {density === "compact" && <Check size={13} />}
                </span>
                <small>{copy.densityCompactDesc}</small>
              </button>
              <button
                type="button"
                className={`sh-choice-btn ${density === "comfortable" ? "active" : ""}`}
                onClick={() => setDensity("comfortable")}
              >
                <span className="sh-choice-head">
                  <span>{copy.densityComfortable}</span>
                  {density === "comfortable" && <Check size={13} />}
                </span>
                <small>{copy.densityComfortableDesc}</small>
              </button>
            </div>
          </div>

          {/* Section 5: Corner Radius */}
          <div className="sh-customizer-group">
            <label className="sh-customizer-label">
              <Maximize2 size={13} /> {copy.radiusLabel}
            </label>
            <div className="sh-customizer-grid-3">
              {(
                [
                  { id: "0.375rem", label: copy.radiusCrisp },
                  { id: "0.5rem", label: copy.radiusDefault },
                  { id: "0.75rem", label: copy.radiusSoft },
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
              <Columns3 size={13} /> {copy.colorThemeLabel}
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
                    <Sun size={13} /> {copy.lightLabel}
                  </span>
                  {theme === "light" && <Check size={13} />}
                </span>
                <small>{copy.lightDesc}</small>
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
                    <Moon size={13} /> {copy.darkLabel}
                  </span>
                  {theme === "dark" && <Check size={13} />}
                </span>
                <small>{copy.darkDesc}</small>
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
            <RotateCcw size={14} /> {copy.resetBtn}
          </button>
        </div>
      </aside>
    </div>
  );
}
