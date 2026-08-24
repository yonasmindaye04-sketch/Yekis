// === IMPORTS ===
import type { TelegramWebApp } from "./types";

// === MAIN FUNCTIONS ===
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramMiniApp(): boolean {
  if (typeof window === "undefined") return false;
  const webApp = getTelegramWebApp();
  return Boolean(
    webApp?.initData ||
    Boolean(webApp?.platform && webApp.platform !== "unknown") ||
    window.location.search.includes("tgWebApp") ||
    window.location.hash.includes("tgWebAppData")
  );
}
