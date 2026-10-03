/* ────────────────────────────────────────────────────────────────────────
   CommandPalette.tsx — Ctrl/⌘+K jump-to-anything palette.
   Index = nav pages + contracts + users + disputes + KYC + payouts,
   loaded lazily on first open via opsApi (plain fetch).
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPS_NAV, OPS_PAGES } from "../opsNav";
import type { OpsPageId } from "../opsPerms";
import { opsApi } from "../opsApi";

export interface PalEntry {
  t: string;
  sub: string;
  icon: LucideIcon;
  page: OpsPageId;
  refId?: string;
}

const iconFor = (page: OpsPageId) =>
  OPS_PAGES.find((p) => p.id === page)?.icon ?? OPS_PAGES[0].icon;

/** Record index, restricted to the pages the signed-in role may open. */
async function buildIndex(can: (p: OpsPageId) => boolean): Promise<PalEntry[]> {
  const ix: PalEntry[] = OPS_NAV.flatMap((g) =>
    g.items
      .filter((i) => can(i.id))
      .map((i) => ({ t: i.name, sub: `Page · ${g.label}`, icon: i.icon, page: i.id })),
  );

  // Only fetch record lists for pages this role can actually reach.
  const wanted: Array<[OpsPageId, () => Promise<PalEntry[]>]> = [];
  if (can("contracts"))
    wanted.push([
      "contracts",
      () =>
        opsApi
          .contracts()
          .then((cs) => cs.map((c) => ({ t: c.title, sub: `Contract · ${c.id}`, icon: iconFor("contracts"), page: "contracts" as OpsPageId, refId: c.id })))
          .catch(() => []),
    ]);
  if (can("users"))
    wanted.push([
      "users",
      () =>
        opsApi
          .users()
          .then((us) => us.map((u) => ({ t: u.name || u.email, sub: `User · ${u.ucid}`, icon: iconFor("users"), page: "users" as OpsPageId, refId: u.id })))
          .catch(() => []),
    ]);
  if (can("dispute-queue"))
    wanted.push([
      "dispute-queue",
      () =>
        opsApi
          .disputes()
          .then((ds) => ds.map((d) => ({ t: d.job, sub: `Dispute · ${d.id}`, icon: iconFor("dispute-queue"), page: "dispute-queue" as OpsPageId, refId: d.id })))
          .catch(() => []),
    ]);
  if (can("kyc"))
    wanted.push([
      "kyc",
      () =>
        opsApi
          .kycQueue()
          .then((ks) => ks.map((k) => ({ t: k.email, sub: `KYC · ${k.id}`, icon: iconFor("kyc"), page: "kyc" as OpsPageId, refId: k.id })))
          .catch(() => []),
    ]);
  if (can("payouts"))
    wanted.push([
      "payouts",
      () =>
        opsApi
          .payouts()
          .then((ps) => ps.map((p) => ({ t: p.user.displayName, sub: `Payout · ${p.id}`, icon: iconFor("payouts"), page: "payouts" as OpsPageId })))
          .catch(() => []),
    ]);

  const lists = await Promise.all(wanted.map(([, run]) => run()));
  for (const list of lists) ix.push(...list);
  return ix;
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
  /** Permission predicate from opsPerms — hides pages the role cannot open. */
  can: (page: OpsPageId) => boolean;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [index, setIndex] = useState<PalEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  /* Query and selection reset by remount: the shell passes a key that flips
     with `open`, so no effect has to synchronously clear this state. */
  useEffect(() => {
    if (open && !loaded.current) {
      loaded.current = true;
      buildIndex(can).then(setIndex);
    }
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    // `can` is stable per staff role; the index is built once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const items = useMemo(() => {
    const base =
      index ??
      OPS_NAV.flatMap((g) =>
        g.items
          .filter((i) => can(i.id))
          .map((i) => ({ t: i.name, sub: `Page · ${g.label}`, icon: i.icon, page: i.id } as PalEntry)),
      );
    const needle = q.trim().toLowerCase();
    return needle ? base.filter((it) => `${it.t} ${it.sub}`.toLowerCase().includes(needle)) : base;
  }, [index, q, can]);

  /* Clamp during render instead of correcting via an effect. */
  const active = Math.min(sel, Math.max(0, items.length - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const it = items[active];
        if (it) { onClose(); onPick(it.page, it.refId); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, onClose, onPick]);

  if (!open) return null;
  return (
    <div className="pal-overlay" onClick={onClose}>
      <div className="pal" onClick={(e) => e.stopPropagation()}>
        <div className="pal-in">
          <Search size={17} style={{ color: "#93a0b4" }} />
          <input
            ref={inputRef}
            placeholder="Jump to a page, contract, user, dispute…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="pal-list">
          {items.length ? (
            items.map((it, i) => (
              <button
                key={`${it.page}-${it.refId ?? it.t}`}
                className={`pal-item ${i === active ? "sel" : ""}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => { onClose(); onPick(it.page, it.refId); }}
              >
                <it.icon size={15} />
                <span>{it.t}</span>
                <span className="pi-sub">{it.sub}</span>
              </button>
            ))
          ) : (
            <div className="empty">No matches for “{q}”.</div>
          )}
        </div>
        <div className="pal-foot">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">Ctrl K</span> toggle</span>
        </div>
      </div>
    </div>
  );
}
