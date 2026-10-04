/* ────────────────────────────────────────────────────────────────────────
   NotificationBell.tsx — staff notification popover.

   Reads GET /api/v1/notifications and marks items read via
   POST /api/v1/notifications/:id/read. Clicking a row marks it read and
   navigates to the queue that raised it (see api/notificationTargets.ts).
   Styled with the console's own tokens (scoped under .ops-root) rather than
   the marketing shell's.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, CornerDownRight } from "lucide-react";
import { api } from "../../../api/client";
import type { NotificationItem } from "../../../api/client";
import { opsTargetFor } from "../../../api/notificationTargets";
import { dts } from "../opsApi";
import { useOpsUi } from "../opsUiContext";
import type { OpsPageId } from "../opsPerms";

export default function NotificationBell() {
  const { navigate, toast, can } = useOpsUi();
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

  /* Open the queue the event came from. The permission check matters: a
     SUPPORT reviewer receives the staff-wide fan-out for KYC and dispute
     events too, and must not be pushed at a page their role cannot open. */
  const open_target = async (n: NotificationItem) => {
    const t = opsTargetFor(n);
    if (t && can(t.page as OpsPageId)) {
      navigate(t.page as OpsPageId, t.focusId);
      setOpen(false);
    } else if (t) {
      toast("You do not have access to that queue");
    }
    if (n.isRead) return;
    try {
      await api.markNotificationRead(n.id);
      setItems((cur) => cur.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
    } catch {
      toast("Could not mark that notification as read");
    }
  };

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
              items.map((n) => {
                const t = opsTargetFor(n);
                /* Inert rows stay readable but are not focusable, so keyboard
                   users are not offered a target that does nothing. */
                const reachable = !!t && can(t.page as OpsPageId);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif-row ${n.isRead ? "" : "unread"}`}
                    onClick={() => void open_target(n)}
                    disabled={!reachable}
                    title={
                      reachable
                        ? `Go to ${t!.page}`
                        : t
                          ? "Your role cannot open that queue"
                          : "No queue for this event yet"
                    }
                  >
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-meta">
                      {n.type.replace(/_/g, " ")} · {dts(n.createdAt)}
                      {reachable ? <CornerDownRight size={11} className="notif-go" /> : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}