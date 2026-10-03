// === NATIVE SUPPORT CHAT LAUNCHER ===
//
// Lets any component (footer links, nav buttons, marketing pages) open the one
// native support widget without importing it or mounting a second copy.
//
// A window CustomEvent is used deliberately: the widget lives on the landing
// shell while the triggers can sit in the footer, header or any marketing
// variant, and there is no shared React context above them.

export const OPEN_SUPPORT_CHAT_EVENT = "yekis:open-support-chat";

/**
 * Asks the mounted support widget to open.
 *
 * `document` is queried rather than assumed mounted so the helper is safe to
 * call during SSR or in tests.
 */
export function openSupportChat(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
  return Boolean(document.querySelector(".landing-chat-fab"));
}