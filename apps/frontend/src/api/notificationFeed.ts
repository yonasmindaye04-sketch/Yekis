/* ────────────────────────────────────────────���────────────────────────────
   notificationFeed.ts — one poller for GET /api/v1/notifications, shared by
   the notification bell and the sidebar activity dots.

   WHY A SHARED FEED
   Two consumers need the same records: the bell in the topbar (which shows
   the unread count and the list) and the sidebar (which shows a dot on a tab
   when something in that tab has not been looked at yet). Two pollers would
   mean two requests every fifteen seconds for one endpoint, and — worse —
   two copies of the same records that could disagree for a few seconds
   after a read.

   So the feed owns the polling, the socket subscription and the records, and
   publishes an immutable snapshot. `useSyncExternalStore` is the right
   primitive here: it reads the snapshot during render (so the first paint
   already has the records) and re-renders only when the snapshot actually
   changes identity.

   THE SNAPSHOT IDENTITY MATTERS
   `useSyncExternalStore` compares the snapshot by reference. A poll that
   returns the same records must NOT produce a new array, or every consumer
   re-renders every fifteen seconds for nothing. `sameRecords` compares the
   ids and the read flags, which are the only two things that change.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { api, type NotificationItem } from "./client";
import { appTargetFor } from "./notificationTargets";
import { realtimeSocket } from "./socket";

/** How often the feed refreshes. Matches the bell's previous interval. */
const POLL_MS = 15_000;

type Listener = () => void;

let records: NotificationItem[] = [];
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let detachSocket: (() => void) | null = null;
let inFlight = false;

/**
 * Whether two fetched lists describe the same set of records.
 *
 * A notification row is immutable apart from `isRead`, so the id and the read
 * flag are the whole of it.
 */
function sameRecords(a: NotificationItem[], b: NotificationItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].isRead !== b[i].isRead) return false;
  }
  return true;
}

/** The current snapshot. Stable identity until the records actually change. */
export function getNotificationSnapshot(): NotificationItem[] {
  return records;
}

async function refresh(): Promise<void> {
  // One request at a time. A slow response followed by a fast one would
  // otherwise let the older response land last and overwrite the newer
  // records — a bell that shows a read notification as unread.
  if (inFlight) return;
  inFlight = true;
  try {
    const next = await api.getNotifications();
    if (!sameRecords(next, records)) {
      records = next;
      listeners.forEach((listener) => listener());
    }
  } catch {
    /* Unavailable notifications must not block the workspace. The last
       successful snapshot stays on screen. */
  } finally {
    inFlight = false;
  }
}

function start(): void {
  if (timer !== null) return;
  void refresh();
  timer = setInterval(() => void refresh(), POLL_MS);
  // Real-time: refresh instantly when the server pushes a notify:* event
  // instead of waiting for the next poll tick.
  realtimeSocket.connect();
  detachSocket = realtimeSocket.onAny(({ event }) => {
    if (event.startsWith("notify:")) void refresh();
  });
}

function stop(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (detachSocket) {
    detachSocket();
    detachSocket = null;
  }
  // Nobody is listening, which normally means the person signed out. Drop the
  // records with the subscription: the next account must never see the
  // previous one's notifications while its first poll is still in flight.
  if (records.length > 0) records = [];
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

/** The notification records, shared by every consumer. */
export function useNotifications(enabled = true): NotificationItem[] {
  // A consumer that is not ready for notifications (a signed-out visitor)
  // must not start the poller: GET /api/v1/notifications is behind auth, and
  // a feed that polls it every fifteen seconds would fill the log with 401s.
  const subscribeWhenEnabled = useCallback(
    (listener: Listener) => (enabled ? subscribe(listener) : () => {}),
    [enabled],
  );
  return useSyncExternalStore(
    subscribeWhenEnabled,
    getNotificationSnapshot,
    getNotificationSnapshot,
  );
}

/**
 * How many unread notifications belong to each workspace view.
 *
 * The mapping is the same one the bell uses to deep-link, so the dot and the
 * link always agree: if clicking a notification takes you to the Proposals
 * tab, then an unread proposal notification is what lights the Proposals tab
 * up. A notification with no destination lights nothing up — there is nowhere
 * for the person to go, so a dot would be a promise the platform cannot keep.
 */
export function useUnreadByView(enabled = true): Record<string, number> {
  const notifications = useNotifications(enabled);
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of notifications) {
      if (item.isRead) continue;
      const destination = appTargetFor(item);
      if (!destination) continue;
      counts[destination.page] = (counts[destination.page] ?? 0) + 1;
    }
    return counts;
  }, [notifications]);
}

/**
 * Applies a read to the shared snapshot straight away.
 *
 * Waiting for the next poll would leave the bell and the dot lit for up to
 * fifteen seconds after a click that visibly did something. The server is
 * still the source of truth: the next refresh reconciles the row, and a
 * failed read will light it up again rather than hiding the failure.
 */
export function markNotificationsReadLocally(ids: Iterable<string>): void {
  const targeted = new Set(ids);
  let changed = false;
  records = records.map((item) => {
    if (!targeted.has(item.id) || item.isRead) return item;
    changed = true;
    return { ...item, isRead: true };
  });
  if (changed) listeners.forEach((listener) => listener());
}

/**
 * Marks the notifications belonging to a view as read.
 *
 * Opening a section IS looking at it. That is the whole meaning of the dot:
 * "there is something here you have not looked at yet". Leaving the dot lit
 * after the person has walked into the section would make it noise, and noise
 * is how a real signal gets ignored.
 *
 * Only the notifications routed to THAT view are marked. The dot on another
 * tab means something else happened, and the person has not been there.
 */
export async function markViewNotificationsRead(
  view: string,
  notifications: NotificationItem[],
): Promise<void> {
  const ids = notifications
    .filter(
      (item) => !item.isRead && appTargetFor(item)?.page === view,
    )
    .map((item) => item.id);
  if (!ids.length) return;
  // Clear the dot on this render pass, then let the server confirm.
  markNotificationsReadLocally(ids);
  await Promise.allSettled(ids.map((id) => api.markNotificationRead(id)));
}
