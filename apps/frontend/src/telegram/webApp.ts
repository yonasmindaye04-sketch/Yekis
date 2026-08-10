// === IMPORTS ===
import type { TelegramWebApp } from "./types";


// === MAIN FUNCTIONS ===
export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramWebApp()?.initData);
}
