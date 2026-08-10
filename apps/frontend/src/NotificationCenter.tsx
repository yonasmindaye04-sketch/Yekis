// === IMPORTS ===
import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { api, type NotificationItem } from "./api/client";


// === MAIN COMPONENT ===
export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.isRead).length;
  const load = async () => { try { setItems(await api.getNotifications()); } catch { /* unavailable notifications should not block the workspace */ } };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, []);
  const read = async (item: NotificationItem) => { if (!item.isRead) { await api.markNotificationRead(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry)); } };
  return <div className="notification-center"><button className="icon-button notification-trigger" onClick={() => setOpen((current) => !current)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}><Bell size={18} />{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}</button>{open && <div className="notification-popover"><div className="notification-popover-head"><strong>Notifications</strong>{unread > 0 && <span>{unread} unread</span>}</div>{items.length === 0 ? <p className="empty-state">No notifications yet.</p> : items.slice(0, 8).map((item) => <button className={item.isRead ? "notification-item" : "notification-item unread"} key={item.id} onClick={() => void read(item)}><span><strong>{item.type.replaceAll("-", " ")}</strong><small>{item.message}</small><em>{new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</em></span>{!item.isRead && <Check size={15} />}</button>)}</div>}</div>;
}
