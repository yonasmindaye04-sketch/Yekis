/* ────────────────────────────────────────────────────────────────────────
   CommandPalette.tsx — Ctrl/⌘+K jump-to-anything palette.
   Index = nav pages + contracts + users + disputes + KYC + payouts,
   loaded lazily on first open via opsApi (plain fetch).
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPS_NAV, OPS_PAGES } from "../opsNav";
import type { OpsPageId } from "../opsNav";
import { opsApi } from "../opsApi";

export interface PalEntry {
  t: string;
  sub: string;
  icon: LucideIcon;
  page: OpsPageId;
  refId?: string;
}

async function buildIndex(): Promise<PalEntry[]> {
  const ix: PalEntry[] = OPS_NAV.flatMap((g) =>
    g.items.map((i) => ({
      t: i.name,
      sub: `Page · ${g.label}`,
      icon: i.icon,
      page: i.id,
    })),
  );
  const [contracts, users, disputes, kyc, payouts] = await Promise.all([
    opsApi.contracts().catch(() => []),
    opsApi.users().catch(() => []),
    opsApi.disputes().catch(() => []),
    opsApi.kycQueue().catch(() => []),
    opsApi.payouts().catch(() => []),
  ]);
  contracts.forEach((c) =>
    ix.push({ t: c.title, sub: `Contract · ${c.id}`, icon: OPS_PAGES.find((p) => p.id === "contracts")!.icon, page: "contracts", refId: c.id }),
  );
  users.forEach((u) =>
    ix.push({ t: u.name || u.email, sub: `User · ${u.ucid}`, icon: OPS_PAGES.find((p) => p.id === "users")!.icon, page: "users", refId: u.id }),
  );
  disputes.forEach((d) =>
    ix.push({ t: d.job, sub: `Dispute · ${d.id}`, icon: OPS_PAGES.find((p) => p.id === "dispute-queue")!.icon, page: "dispute-queue", refId: d.id }),
  );
  kyc.forEach((k) =>
    ix.push({ t: k.email, sub: `KYC · ${k.id}`, icon: OPS_PAGES.find((p) => p.id === "kyc")!.icon, page: "kyc", refId: k.id }),
  );
  payouts.forEach((p) =>
    ix.push({ t: p.user.displayName, sub: `Payout · ${p.id}`, icon: OPS_PAGES.find((p2) => p2.id === "payouts")!.icon, page: "payouts" }),
  );
  return ix;
}

export default function CommandPalette({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (page: OpsPageId, refId?: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [index, setIndex] = useState<PalEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (open && !loaded.current) {
      loaded.current = true;
      buildIndex().then(setIndex);
    }
    if (open) {
      setQ("");
      setSel(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo(() => {
    const base = index ?? OPS_NAV.flatMap((g) => g.items.map((i) => ({ t: i.name, sub: `Page · ${g.label}`, icon: i.icon, page: i.id } as PalEntry)));
    const needle = q.trim().toLowerCase();
    return needle ? base.filter((it) => `${it.t} ${it.sub}`.toLowerCase().includes(needle)) : base;
  }, [index, q]);

  useEffect(() => {
    if (sel >= items.length) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const it = items[sel];
        if (it) { onClose(); onPick(it.page, it.refId); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, sel, onClose, onPick]);

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
                className={`pal-item ${i === sel ? "sel" : ""}`}
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
