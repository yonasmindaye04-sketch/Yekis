// === IMPORTS ===
import { useEffect, useState } from "react";
import { Bell, Check, CornerDownRight } from "lucide-react";
import { api, type NotificationItem } from "./api/client";
import { appTargetFor } from "./api/notificationTargets";
import { realtimeSocket } from "./api/socket";
import { useI18n } from "./i18n";

/** Views this component may navigate to; kept in step with FullPlatformApp's View. */
const ROUTABLE = new Set([
  "overview",
  "jobs",
  "gigs",
  "contracts",
  "wallet",
  "chat",
  "verification",
  "cases",
]);

// === MAIN COMPONENT ===
export function NotificationCenter({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.isRead).length;
  const load = async () => {
    try {
      setItems(await api.getNotifications());
    } catch {
      /* unavailable notifications should not block the workspace */
    }
  };
  useEffect(() => {
    void load();

    // Real-time: refresh instantly when the server pushes a notify:* event,
    // instead of waiting for the next poll tick.
    realtimeSocket.connect();
    const offAny = realtimeSocket.onAny(({ event }) => {
      if (event.startsWith("notify:")) void load();
    });

    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearInterval(timer);
      offAny();
    };
  }, []);
  /* Mark read, then jump to the view the event came from. Marking is attempted
   even when there is no destination, so a click always clears the badge. */
  const read = async (item: NotificationItem) => {
    const dest = appTargetFor(item);
    if (dest && onNavigate && ROUTABLE.has(dest.page)) {
      onNavigate(dest.page);
      setOpen(false);
    }
    if (item.isRead) return;
    try {
      await api.markNotificationRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: true } : entry,
        ),
      );
    } catch {
      /* a failed read should not block navigation */
    }
  };
  return (
    <div className="notification-center">
      <button
        className="icon-button notification-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${t.workspace.notifications.title}${unread ? `, ${t.workspace.notifications.unreadCount.replace("{count}", String(unread))}` : ""}`}
      >
        <Bell size={18} />
        {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <strong>{t.workspace.notifications.title}</strong>
            {unread > 0 && (
              <span>
                {t.workspace.notifications.unreadCount.replace("{count}", String(unread))}
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <p className="empty-state">{t.workspace.notifications.empty}</p>
          ) : (
            items.slice(0, 8).map((item) => {
              const dest = appTargetFor(item);
              const reachable = !!dest && !!onNavigate && ROUTABLE.has(dest.page);
              return (
                <button
                  className={
                    item.isRead ? "notification-item" : "notification-item unread"
                  }
                  key={item.id}
                  onClick={() => void read(item)}
                  title={
                    reachable
                      ? t.workspace.notifications.goTo.replace("{page}", dest!.page)
                      : undefined
                  }
                >
                  <span>
                    <strong>{item.type.replaceAll("-", " ")}</strong>
                    <small>{item.message}</small>
                    <em>
                      {new Date(item.createdAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </em>
                  </span>
                  {reachable ? (
                    <CornerDownRight size={15} className="notification-go" />
                  ) : !item.isRead ? (
                    <Check size={15} />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

