export const GETTING_STARTED_CHANGED_EVENT = "yekis:getting-started-pref";

function keyFor(userId?: string): string {
  return `yekis_show_getting_started_${userId || "anon"}`;
}

export function getShowGettingStartedGuide(userId?: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(keyFor(userId)) !== "false";
  } catch {
    return true;
  }
}

export function setShowGettingStartedGuide(
  userId: string | undefined,
  show: boolean,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), show ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent(GETTING_STARTED_CHANGED_EVENT, { detail: { show } }),
    );
  } catch {
    // ignore storage quota errors
  }
}
