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
import { useShadcnLayout } from "./ShadcnLayoutContext";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";

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
  onSwitchRoleMode?: (mode: "CLIENT" | "FREELANCER") => void;
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
  const { language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).palette;

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
        group: copy.groups.modes,
        label: copy.actions.d1Label,
        hint: copy.actions.d1Hint,
        icon: <LayoutDashboard size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-1");
        },
      },
      {
        id: "mode-d2-table",
        group: copy.groups.modes,
        label: copy.actions.d2TableLabel,
        hint: copy.actions.d2TableHint,
        icon: <Table2 size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-2");
          setOpsSubTab("table");
        },
      },
      {
        id: "mode-d2-kanban",
        group: copy.groups.modes,
        label: copy.actions.d2KanbanLabel,
        hint: copy.actions.d2KanbanHint,
        icon: <Kanban size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-2");
          setOpsSubTab("kanban");
        },
      },
      {
        id: "mode-d2-calendar",
        group: copy.groups.modes,
        label: copy.actions.d2CalendarLabel,
        hint: copy.actions.d2CalendarHint,
        icon: <Calendar size={15} />,
        run: () => {
          onNavigateView("overview");
          setDashboardVariant("dashboard-2");
          setOpsSubTab("calendar");
        },
      },
      {
        id: "nav-jobs",
        group: copy.groups.navigation,
        label: copy.actions.jobsLabel,
        hint: copy.actions.jobsHint,
        icon: <Briefcase size={15} />,
        run: () => onNavigateView("jobs"),
      },
      {
        id: "nav-gigs",
        group: copy.groups.navigation,
        label: copy.actions.gigsLabel,
        hint: copy.actions.gigsHint,
        icon: <Package size={15} />,
        run: () => onNavigateView("gigs"),
      },
      {
        id: "nav-contracts",
        group: copy.groups.navigation,
        label: copy.actions.contractsLabel,
        hint: copy.actions.contractsHint,
        icon: <FileText size={15} />,
        run: () => onNavigateView("contracts"),
      },
      {
        id: "nav-escrow",
        group: copy.groups.navigation,
        label: copy.actions.escrowLabel,
        hint: copy.actions.escrowHint,
        icon: <ShieldCheck size={15} />,
        run: () => onNavigateView("escrow"),
      },
      {
        id: "nav-wallet",
        group: copy.groups.navigation,
        label: copy.actions.walletLabel,
        hint: copy.actions.walletHint,
        icon: <Wallet size={15} />,
        run: () => onNavigateView("wallet"),
      },
      {
        id: "nav-chat",
        group: copy.groups.navigation,
        label: copy.actions.chatLabel,
        hint: copy.actions.chatHint,
        icon: <MessageCircle size={15} />,
        run: () => onNavigateView("chat"),
      },
      {
        id: "nav-verification",
        group: copy.groups.navigation,
        label: copy.actions.verificationLabel,
        hint: copy.actions.verificationHint,
        icon: <ShieldCheck size={15} />,
        run: () => onNavigateView("verification"),
      },
      {
        id: "nav-cases",
        group: copy.groups.navigation,
        label: copy.actions.casesLabel,
        hint: copy.actions.casesHint,
        icon: <Scale size={15} />,
        run: () => onNavigateView("cases"),
      },
      {
        id: "nav-profile",
        group: copy.groups.navigation,
        label: copy.actions.profileLabel,
        hint: copy.actions.profileHint,
        icon: <UserIcon size={15} />,
        run: () => onNavigateView("profile"),
      },
      {
        id: "nav-settings",
        group: copy.groups.navigation,
        label: copy.actions.settingsLabel,
        hint: copy.actions.settingsHint,
        icon: <Settings size={15} />,
        run: () => onNavigateView("settings"),
      },
    ];

    if (onSwitchRoleMode) {
      list.push(
        {
          id: "role-client",
          group: copy.groups.roleMode,
          label: copy.actions.roleClientLabel,
          hint: copy.actions.roleClientHint(currentRole === "CLIENT"),
          icon: <Briefcase size={15} />,
          run: () => onSwitchRoleMode("CLIENT"),
        },
        {
          id: "role-freelancer",
          group: copy.groups.roleMode,
          label: copy.actions.roleFreelancerLabel,
          hint: copy.actions.roleFreelancerHint(currentRole === "FREELANCER"),
          icon: <UserIcon size={15} />,
          run: () => onSwitchRoleMode("FREELANCER"),
        },
      );
    }

    list.push(
      {
        id: "ui-customizer",
        group: copy.groups.appearance,
        label: copy.actions.customizerLabel,
        hint: copy.actions.customizerHint,
        icon: <SlidersHorizontal size={15} />,
        run: () => setCustomizerOpen(true),
      },
      {
        id: "ui-sidebar-toggle",
        group: copy.groups.appearance,
        label: copy.actions.sidebarToggleLabel,
        hint: copy.actions.sidebarToggleHint,
        icon: <PanelLeft size={15} />,
        run: () => setSidebarCollapsed((c) => !c),
      },
      {
        id: "ui-theme",
        group: copy.groups.appearance,
        label: copy.actions.themeLabel(theme === "light"),
        hint: copy.actions.themeHint,
        icon: theme === "light" ? <Moon size={15} /> : <Sun size={15} />,
        run: () => toggleTheme(),
      },
    );

    return list;
  }, [
    copy,
    currentRole,
    onNavigateView,
    onSwitchRoleMode,
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
      aria-label={copy.dialogAria}
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
            placeholder={copy.placeholder}
            aria-label={copy.searchAria}
          />
          <kbd className="sh-kbd">ESC</kbd>
        </div>

        <div className="sh-cmd-list">
          {filtered.length === 0 ? (
            <div className="sh-table-empty">{copy.empty(query)}</div>
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
            <kbd className="sh-kbd">↑</kbd> <kbd className="sh-kbd">↓</kbd> {copy.navNavigate}
          </span>
          <span>
            <kbd className="sh-kbd">↵</kbd> {copy.navExecute}
          </span>
          <span>
            <kbd className="sh-kbd">⌘K</kbd> {copy.navToggle}
          </span>
        </div>
      </div>
    </div>
  );
}
