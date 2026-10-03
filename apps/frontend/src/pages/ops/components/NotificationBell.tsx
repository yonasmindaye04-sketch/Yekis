/* ────────────────────────────────────────────────────────────────────────
   NotificationBell.tsx — staff notification popover.

   Reads GET /api/v1/notifications and marks items read via
   POST /api/v1/notifications/:id/read. Styled with the console's own
   tokens (scoped under .ops-root) rather than the marketing shell's.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../../../api/client";
import type { NotificationItem } from "../../../api/client";
import { dts } from "../opsApi";

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const next = await api.getNotifications();
    setItems(next);
    setError(null);
  }, []);

  /* Initial fetch. State is only written from the promise callbacks, never
     synchronously in the effect body. */
  useEffect(() => {
    let alive = true;
    api
      .getNotifications()
      .then((next) => {
        if (!alive) return;
        setItems(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load notifications");
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Click-away + Escape dismissal. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((i) => !i.isRead).length;

  const markAll = async () => {
    const targets = items.filter((i) => !i.isRead);
    setBusy(true);
    // Mark sequentially so a single failure cannot silently drop the rest.
    for (const t of targets) {
      try {
        await api.markNotificationRead(t.id);
      } catch {
        /* leave the rest to retry on the next open */
      }
    }
    setBusy(false);
    void load();
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        title="Notifications"
      >
        <Bell size={17} />
        {unread ? <span className="dot" /> : null}
      </button>

      {open ? (
        <div className="notif-pop">
          <div className="notif-head">
            <span>
              Notifications{unread ? ` · ${unread} unread` : ""}
            </span>
            {unread ? (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void markAll()}>
                <CheckCheck size={12} /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="notif-list">
            {error ? (
              <div className="notif-empty">
                <div>Could not load notifications.</div>
                <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 4 }}>{error}</div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => void load()}>
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="notif-empty">Nothing here yet.</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`notif-row ${n.isRead ? "" : "unread"}`}>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-meta">
                    {n.type.replace(/_/g, " ")} · {dts(n.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}