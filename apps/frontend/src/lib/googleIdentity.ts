// === GOOGLE IDENTITY SERVICES (GIS) ===
//
// The one place in the frontend that talks to Google's script.
//
// WHY THIS IS SHARED
// ------------------
// Two screens need a Google credential: the sign-in card, which turns one into
// a session, and the Account security screen, which turns one into a LINKED
// credential on the account that is already signed in. Both need the same
// three things — load the script exactly once, initialise it for this client
// id, and hand the ID token to the caller — and each of them doing it
// separately is how two screens end up with two different opinions about
// whether Google is available.
//
// The `window.google` type lives here too, so the declaration exists exactly
// once in the project.
//
// WHAT THE CREDENTIAL IS, AND IS NOT
// ----------------------------------
// The credential this file returns is an ID TOKEN. It is not a session, and it
// is not proof of anything on its own: the backend verifies its signature
// against Google's JWKS, its audience against this client id, and its expiry
// before it will act on it. The token never leaves the browser except to the
// Yekis API, and it never carries a password.

export interface GoogleIdTokenResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleIdTokenResponse) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getNotDisplayedReason: () => string;
              getSkippedReason: () => string;
            }) => void,
          ) => void;
        };
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GIS_SCRIPT_ID = "google-gsi-client";

/** The client id the bundle was built with, or undefined when unset. */
export function googleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

/**
 * Loads the GIS script, once.
 *
 * The script tag is marked when it has loaded so a second caller resolves
 * immediately instead of appending a second copy of Google's script — which
 * would re-initialise the button under the first caller's callback.
 */
export function loadGoogleIdentity(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID) as
      | HTMLScriptElement
      | null;
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google Sign-In could not be loaded.")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.id = GIS_SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error("Google Sign-In could not be loaded."));
    document.head.appendChild(s);
  });
}

export interface GoogleButtonOptions {
  theme?: "outline" | "filled" | "filled_blue";
  type?: "standard" | "icon";
  shape?: "rectangular" | "pill" | "circle" | "square";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with";
}

/**
 * Renders the official Google button into `element`.
 *
 * `onCredential` receives the raw ID token. What happens to it is the
 * caller's business — the sign-in card exchanges it for a session, the
 * Account security screen binds it to the account that is already signed in.
 *
 * The button is rendered by Google into an IFRAME, which is why the
 * production CSP lists `https://accounts.google.com` under `frame-src`.
 */
export function renderGoogleIdentityButton(
  element: HTMLElement,
  onCredential: (credential: string) => void,
  options: GoogleButtonOptions = {},
): void {
  const clientId = googleClientId();
  if (!clientId || !window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) onCredential(response.credential);
    },
  });

  window.google.accounts.id.renderButton(element, {
    theme: options.theme ?? "outline",
    type: options.type ?? "icon",
    shape: options.shape ?? "circle",
    size: options.size ?? "large",
    ...(options.text ? { text: options.text } : {}),
  });
}
