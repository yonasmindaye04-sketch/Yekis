import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  LayoutDashboard,
  Table2,
  Kanban,
  Calendar,
  Briefcase,
  Package,
  FileText,
  Wallet,
  MessageCircle,
  ShieldCheck,
  Scale,
  User as UserIcon,
  Settings,
  SlidersHorizontal,
  Sun,
  Moon,
  ArrowRight,
  PanelLeft,
} from "lucide-react";
import { useShadcnLayout, type DemoWorkspaceMode } from "./ShadcnLayoutContext";
import { useTheme } from "../../theme/ThemeContext";

export interface CommandPaletteAction {
  id: string;
  group: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
}

interface WorkspaceCommandPaletteProps {
  onNavigateView: (view: string) => void;
  onSwitchRoleMode?: (mode: DemoWorkspaceMode) => void;
  currentRole?: string;
}

export function WorkspaceCommandPalette({
  onNavigateView,
  onSwitchRoleMode,
  currentRole,
}: WorkspaceCommandPaletteProps) {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setDashboardVariant,
    setOpsSubTab,
    setCustomizerOpen,
    setSidebarCollapsed,
  } = useShadcnLayout();
  const { theme, toggleTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandPaletteOpen]);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const list: CommandPaletteAction[] = [
      {
        id: "mode-d1",
        group: "Shadcn Dashboard Modes",
        label: "Switch to Dashboard 1: Executive Analytics & KPIs",
        hint: "Area charts, rail mix & KPI deltas",
        icon: <LayoutDashboard size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-1");
        },
      },
      {
        id: "mode-d2-table",
        group: "Shadcn Dashboard Modes",
        label: "Switch to Dashboard 2: Advanced Ledger & Data Grid",
        hint: "Multi-filter table, sorting & CSV export",
        icon: <Table2 size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-2");
          setOpsSubTab("table");
        },
      },
      {
        id: "mode-d2-kanban",
        group: "Shadcn Dashboard Modes",
        label: "Open Milestone & Deliverable Kanban Board",
        hint: "5-stage drag-and-drop escrow workflow",
        icon: <Kanban size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-2");
          setOpsSubTab("kanban");
        },
      },
      {
        id: "mode-d2-calendar",
        group: "Shadcn Dashboard Modes",
        label: "Open Contract & Payout Schedule Calendar",
        hint: "Monthly deadline grid & day agenda",
        icon: <Calendar size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-2");
          setOpsSubTab("calendar");
        },
      },
      {
        id: "nav-jobs",
        group: "Workspace Navigation",
        label: "Jobs & Briefs Marketplace",
        hint: "Post a brief or submit proposals",
        icon: <Briefcase size={15} />,
        run: () => onNavigateView("jobs"),
      },
      {
        id: "nav-gigs",
        group: "Workspace Navigation",
        label: "Fixed-Scope Gigs Catalog",
        hint: "Browse packaged Ethiopian talent services",
        icon: <Package size={15} />,
        run: () => onNavigateView("gigs"),
      },
      {
        id: "nav-contracts",
        group: "Workspace Navigation",
        label: "Contracts & Escrow Room",
        hint: "Sign agreements, fund milestones, release payouts",
        icon: <FileText size={15} />,
        run: () => onNavigateView("contracts"),
      },
      {
        id: "nav-wallet",
        group: "Workspace Navigation",
        label: "Wallet & Telebirr / CBE Top-Ups",
        hint: "Manage ETB balance & upload payment receipts",
        icon: <Wallet size={15} />,
        run: () => onNavigateView("wallet"),
      },
      {
        id: "nav-chat",
        group: "Workspace Navigation",
        label: "Messages & Contract Chat",
        hint: "Real-time client, freelancer & staff messaging",
        icon: <MessageCircle size={15} />,
        run: () => onNavigateView("chat"),
      },
      {
        id: "nav-verification",
        group: "Workspace Navigation",
        label: "Fayda National ID & KYC Verification",
        hint: "Verify identity to unlock withdrawals",
        icon: <ShieldCheck size={15} />,
        run: () => onNavigateView("verification"),
      },
      {
        id: "nav-cases",
        group: "Workspace Navigation",
        label: "Disputes & Mediation Center",
        hint: "Submit evidence and track AACCSA arbitration",
        icon: <Scale size={15} />,
        run: () => onNavigateView("cases"),
      },
      {
        id: "nav-profile",
        group: "Workspace Navigation",
        label: "Public Portfolio & Profile",
        hint: "Inspect skills, verified badges & reviews",
        icon: <UserIcon size={15} />,
        run: () => onNavigateView("profile"),
      },
      {
        id: "nav-settings",
        group: "Workspace Navigation",
        label: "Account Settings",
        hint: "Preferences & support",
        icon: <Settings size={15} />,
        run: () => onNavigateView("settings"),
      },
    ];

    if (onSwitchRoleMode) {
      list.push(
        {
          id: "role-client",
          group: "Workspace Mode (Dual-Role)",
          label: "Switch to Client Mode (Hiring & Escrow)",
          hint: currentRole === "CLIENT" ? "Active mode" : "Switch to Client view",
          icon: <Briefcase size={15} />,
          run: () => onSwitchRoleMode("CLIENT"),
        },
        {
          id: "role-freelancer",
          group: "Workspace Mode (Dual-Role)",
          label: "Switch to Freelancer Mode (Talent & Payouts)",
          hint:
            currentRole === "FREELANCER"
              ? "Active mode"
              : "Switch to Freelancer view",
          icon: <UserIcon size={15} />,
          run: () => onSwitchRoleMode("FREELANCER"),
        },
        {
          id: "role-both",
          group: "Workspace Mode (Dual-Role)",
          label: "Switch to Combined Mode (Client + Freelancer)",
          hint: currentRole === "BOTH" ? "Active mode" : "Hire and deliver work",
          icon: <LayoutDashboard size={15} />,
          run: () => onSwitchRoleMode("BOTH"),
        },
      );
    }

    list.push(
      {
        id: "ui-customizer",
        group: "Appearance & Shell",
        label: "Open Workspace Layout Customizer",
        hint: "Sidebar variant, density & corner radius",
        icon: <SlidersHorizontal size={15} />,
        run: () => setCustomizerOpen(true),
      },
      {
        id: "ui-sidebar-toggle",
        group: "Appearance & Shell",
        label: "Toggle Sidebar Collapse (Icon Rail / Expanded)",
        hint: "Maximize horizontal table canvas",
        icon: <PanelLeft size={15} />,
        run: () => setSidebarCollapsed((c) => !c),
      },
      {
        id: "ui-theme",
        group: "Appearance & Shell",
        label: `Switch to ${theme === "light" ? "Dark" : "Light"} Theme`,
        hint: "Yekis Emerald color system",
        icon: theme === "light" ? <Moon size={15} /> : <Sun size={15} />,
        run: () => toggleTheme(),
      },
    );

    return list;
  }, [
    onNavigateView,
    onSwitchRoleMode,
    currentRole,
    setDashboardVariant,
    setOpsSubTab,
    setCustomizerOpen,
    setSidebarCollapsed,
    theme,
    toggleTheme,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.hint.toLowerCase().includes(q),
    );
  }, [actions, query]);

  const safeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && filtered[safeIndex]) {
      e.preventDefault();
      const target = filtered[safeIndex];
      setCommandPaletteOpen(false);
      target.run();
    }
  };

  if (!commandPaletteOpen) return null;

  // Group filtered items
  const grouped = new Map<string, CommandPaletteAction[]>();
  for (const item of filtered) {
    const g = grouped.get(item.group) ?? [];
    g.push(item);
    grouped.set(item.group, g);
  }

  let flatCursor = -1;

  return (
    <div
      className="sh-cmd-backdrop"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div className="sh-cmd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sh-cmd-input-row">
          <Search size={16} className="sh-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Type a command, jump to a dashboard, or switch workspace role..."
            aria-label="Command search"
          />
          <kbd className="sh-kbd">ESC</kbd>
        </div>

        <div className="sh-cmd-list">
          {filtered.length === 0 ? (
            <div className="sh-table-empty">
              No matching commands or views for "{query}".
            </div>
          ) : (
            [...grouped.entries()].map(([groupName, groupItems]) => (
              <div key={groupName} className="sh-cmd-group">
                <div className="sh-cmd-group-label">{groupName}</div>
                {groupItems.map((item) => {
                  flatCursor += 1;
                  const idx = flatCursor;
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`sh-cmd-item ${active ? "active" : ""}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        item.run();
                      }}
                    >
                      <span className="sh-cmd-item-icon">{item.icon}</span>
                      <span className="sh-cmd-item-main">
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </span>
                      <ArrowRight size={13} className="sh-cmd-arrow" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="sh-cmd-footer">
          <span>
            <kbd className="sh-kbd">↑</kbd> <kbd className="sh-kbd">↓</kbd> Navigate
          </span>
          <span>
            <kbd className="sh-kbd">↵</kbd> Execute
          </span>
          <span>
            <kbd className="sh-kbd">⌘K</kbd> Toggle anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
