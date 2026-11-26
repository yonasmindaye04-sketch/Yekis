/* ────────────────────────────────────────────────────────────────────────
   CommandPalette.tsx — Native <dialog> Ctrl/⌘+K jump-to-anything palette.
   Index = dashboard modes + permitted nav pages + live records (contracts,
   users, disputes, KYC, payouts) + layout/theme appearance controls.
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Kanban,
  LayoutDashboard,
  Moon,
  PanelLeft,
  Search,
  SlidersHorizontal,
  Sun,
  Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPS_NAV, OPS_PAGES } from "../opsNav";
import type { OpsPageId } from "../opsPerms";
import { opsApi } from "../opsApi";
import { useShadcnLayout } from "../../../components/dashboard/ShadcnLayoutContext";
import { useTheme } from "../../../theme/ThemeContext";

export interface PalEntry {
  id: string;
  group: string;
  t: string;
  sub: string;
  icon: LucideIcon;
  run: () => void;
}

const iconFor = (page: OpsPageId) =>
  OPS_PAGES.find((p) => p.id === page)?.icon ?? OPS_PAGES[0].icon;

/** Lazily indexes live records for pages the signed-in role may open. */
async function buildRecordEntries(
  can: (p: OpsPageId) => boolean,
  onPick: (page: OpsPageId, refId?: string) => void,
): Promise<PalEntry[]> {
  const wanted: Array<Promise<PalEntry[]>> = [];

  if (can("contracts")) {
    wanted.push(
      opsApi
        .contracts()
        .then((cs) =>
          cs.map((c) => ({
            id: `rec-contract-${c.id}`,
            group: "Live Records",
            t: c.title,
            sub: `Contract · ${c.id}`,
            icon: iconFor("contracts"),
            run: () => onPick("contracts", c.id),
          })),
        )
        .catch(() => []),
    );
  }

  if (can("users")) {
    wanted.push(
      opsApi
        .users()
        .then((us) =>
          us.map((u) => ({
            id: `rec-user-${u.id}`,
            group: "Live Records",
            t: u.name || u.email,
            sub: `User · ${u.ucid}`,
            icon: iconFor("users"),
            run: () => onPick("users", u.id),
          })),
        )
        .catch(() => []),
    );
  }

  if (can("dispute-queue")) {
    wanted.push(
      opsApi
        .disputes()
        .then((ds) =>
          ds.map((d) => ({
            id: `rec-dispute-${d.id}`,
            group: "Live Records",
            t: d.job,
            sub: `Dispute · ${d.id}`,
            icon: iconFor("dispute-queue"),
            run: () => onPick("dispute-queue", d.id),
          })),
        )
        .catch(() => []),
    );
  }

  if (can("kyc")) {
    wanted.push(
      opsApi
        .kycQueue()
        .then((ks) =>
          ks.map((k) => ({
            id: `rec-kyc-${k.id}`,
            group: "Live Records",
            t: k.email,
            sub: `KYC · ${k.id}`,
            icon: iconFor("kyc"),
            run: () => onPick("kyc", k.id),
          })),
        )
        .catch(() => []),
    );
  }

  if (can("payouts")) {
    wanted.push(
      opsApi
        .payouts()
        .then((ps) =>
          ps.map((p) => ({
            id: `rec-payout-${p.id}`,
            group: "Live Records",
            t: p.user.displayName,
            sub: `Payout · ${p.id}`,
            icon: iconFor("payouts"),
            run: () => onPick("payouts"),
          })),
        )
        .catch(() => []),
    );
  }

  const lists = await Promise.all(wanted);
  return lists.flat();
}

export default function CommandPalette({
  open,
  onClose,
  onPick,
  can,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (page: OpsPageId, refId?: string) => void;
  can: (page: OpsPageId) => boolean;
}) {
  const {
    setDashboardVariant,
    setOpsSubTab,
    setCustomizerOpen,
    toggleSidebarCollapsed,
  } = useShadcnLayout();
  const { theme, toggleTheme } = useTheme();
  const labelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [records, setRecords] = useState<PalEntry[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    if (open) {
      if (!dlg.open) dlg.showModal();
      if (!loaded.current) {
        loaded.current = true;
        void buildRecordEntries(can, onPick).then(setRecords);
      }
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (dlg.open) {
      dlg.close();
    }
  }, [open, can, onPick]);

  /* Sync native Esc / backdrop close back to React state, plus light-dismiss
     fallback when HTMLDialogElement.closedBy is unsupported. */
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    const handleClose = () => {
      dlg.returnValue = "";
      onClose();
    };
    dlg.addEventListener("close", handleClose);

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const outside = (e: PointerEvent) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dlg.close();
        pressedOutside = false;
      };
      dlg.addEventListener("pointerdown", onDown);
      dlg.addEventListener("pointerup", onUp);
      return () => {
        dlg.removeEventListener("close", handleClose);
        dlg.removeEventListener("pointerdown", onDown);
        dlg.removeEventListener("pointerup", onUp);
      };
    }

    return () => dlg.removeEventListener("close", handleClose);
  }, [onClose]);

  const staticEntries = useMemo<PalEntry[]>(() => {
    const modes: PalEntry[] = can("overview")
      ? [
          {
            id: "mode-exec",
            group: "Dashboard Views",
            t: "Executive Command Center",
            sub: "KPIs, Action Center & Settlement Charts",
            icon: LayoutDashboard,
            run: () => {
              onPick("overview");
              setDashboardVariant("dashboard-1");
            },
          },
          {
            id: "mode-table",
            group: "Dashboard Views",
            t: "Operations Ledger · Table",
            sub: "Filterable escrow custody data grid",
            icon: Table2,
            run: () => {
              onPick("overview");
              setDashboardVariant("dashboard-2");
              setOpsSubTab("table");
            },
          },
          {
            id: "mode-kanban",
            group: "Dashboard Views",
            t: "Operations Ledger · Kanban",
            sub: "Stage board for active milestones",
            icon: Kanban,
            run: () => {
              onPick("overview");
              setDashboardVariant("dashboard-2");
              setOpsSubTab("kanban");
            },
          },
          {
            id: "mode-calendar",
            group: "Dashboard Views",
            t: "Operations Ledger · Calendar",
            sub: "Milestone & KYC review schedule",
            icon: Calendar,
            run: () => {
              onPick("overview");
              setDashboardVariant("dashboard-2");
              setOpsSubTab("calendar");
            },
          },
        ]
      : [];

    const pages: PalEntry[] = OPS_NAV.flatMap((g) =>
      g.items
        .filter((i) => can(i.id))
        .map((i) => ({
          id: `page-${i.id}`,
          group: "Pages",
          t: i.name,
          sub: g.label,
          icon: i.icon,
          run: () => onPick(i.id),
        })),
    );

    const appearance: PalEntry[] = [
      {
        id: "ui-customizer",
        group: "Appearance & Layout",
        t: "Customize Layout & Density",
        sub: "Shell framing, rail width, corner radius",
        icon: SlidersHorizontal,
        run: () => setCustomizerOpen(true),
      },
      {
        id: "ui-sidebar",
        group: "Appearance & Layout",
        t: "Toggle Sidebar Rail",
        sub: "Show or hide the navigation column",
        icon: PanelLeft,
        run: () => toggleSidebarCollapsed(),
      },
      {
        id: "ui-theme",
        group: "Appearance & Layout",
        t: theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme",
        sub: "Toggle light / dark color mode",
        icon: theme === "light" ? Moon : Sun,
        run: () => toggleTheme(),
      },
    ];

    return [...modes, ...pages, ...appearance];
  }, [
    can,
    onPick,
    setDashboardVariant,
    setOpsSubTab,
    setCustomizerOpen,
    toggleSidebarCollapsed,
    theme,
    toggleTheme,
  ]);

  const items = useMemo(() => {
    const all = [...staticEntries, ...records];
    const needle = q.trim().toLowerCase();
    return needle
      ? all.filter((it) => `${it.t} ${it.sub} ${it.group}`.toLowerCase().includes(needle))
      : all;
  }, [staticEntries, records, q]);

  const active = Math.min(sel, Math.max(0, items.length - 1));

  const grouped = useMemo(() => {
    const map = new Map<string, PalEntry[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(items.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      const chosen = items[active];
      onClose();
      chosen.run();
    }
  };

  let cursor = -1;

  return (
    <dialog
      ref={dialogRef}
      className="ops-native-dialog ops-pal-dialog"
      aria-labelledby={labelId}
      {...({ closedby: "any" } as Record<string, string>)}
    >
      <div className="pal-in">
        <Search size={17} style={{ color: "var(--ops-text-3)" }} aria-hidden="true" />
        <input
          ref={inputRef}
          id={labelId}
          placeholder="Jump to a page, view, contract, user, or setting…"
          aria-label="Command palette search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={onInputKeyDown}
        />
        <button
          type="button"
          className="kbd"
          onClick={onClose}
          title="Close palette"
          aria-label="Close command palette"
        >
          Esc
        </button>
      </div>

      <div className="pal-list">
        {items.length ? (
          grouped.map(([groupName, groupItems]) => (
            <div key={groupName}>
              <div className="pal-group-label">{groupName}</div>
              {groupItems.map((it) => {
                cursor += 1;
                const idx = cursor;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`pal-item ${idx === active ? "sel" : ""}`}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => {
                      onClose();
                      it.run();
                    }}
                  >
                    <it.icon size={15} />
                    <span>{it.t}</span>
                    <span className="pi-sub">{it.sub}</span>
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <div className="empty">No matches for “{q}”.</div>
        )}
      </div>

      <div className="pal-foot">
        <span>
          <span className="kbd">↑</span> <span className="kbd">↓</span> navigate
        </span>
        <span>
          <span className="kbd">↵</span> open
        </span>
        <span>
          <span className="kbd">Ctrl K</span> toggle
        </span>
      </div>
    </dialog>
  );
}
