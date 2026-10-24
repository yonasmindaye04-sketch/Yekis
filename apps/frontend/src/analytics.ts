// Consent-aware GA4 analytics for the Yekis platform (marketing site, browser
// workspace, and Telegram Mini App shell).
//
// Loading rules (all must hold before gtag.js is injected):
//   1. Production build only (import.meta.env.PROD) — never loads from `vite dev`.
//      Local `vite preview` is also skipped unless the GA debug flag is set.
//   2. VITE_GA_MEASUREMENT_ID is set to a real "G-…" ID — never hardcoded; the
//      value comes from apps/frontend/.env (or the host env) so dev/staging/prod
//      can point at different GA4 properties.
//   3. The user has accepted analytics cookies in the consent banner
//      (localStorage "yekis_consent", see CookieBanner.tsx).
//
// DebugView: open a production build with `?ga_debug=1` in the URL (or run
// `localStorage.setItem("yekis_ga_debug", "1")` and reload). Events then send
// with debug_mode=true and surface in GA4 Admin → DebugView without polluting
// standard reports.
//
// PRIVACY: never put PII (emails, names, phone numbers, account identifiers)
// or user-specific amounts into event parameters. In dev builds a console
// warning is emitted if a parameter value looks like an email or phone number.

const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? "";

type GtagFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

type EventParams = Record<string, string | number | boolean>;
/** "both" is the dual-role account (UserRole.BOTH), selectable at signup. */
export type UserType = "client" | "freelancer" | "both";
export type AuthFlow = "login" | "register" | "forgot-password" | "reset-password";

/** True when a real measurement ID is configured via the environment. */
export function isAnalyticsConfigured(): boolean {
  return GA_MEASUREMENT_ID.startsWith("G-");
}

/** True when the user has previously accepted analytics cookies. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("yekis_consent");
    if (!raw) return false;
    return JSON.parse(raw)?.analytics === true;
  } catch {
    return false;
  }
}

/** GA debug flag (`?ga_debug=1` or localStorage "yekis_ga_debug" = "1"). */
function isDebugSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("ga_debug") === "1") {
      return true;
    }
    return window.localStorage.getItem("yekis_ga_debug") === "1";
  } catch {
    return false;
  }
}

function isLocalHostname(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

/** Dev-only guardrail: warn when a param value smells like PII. */
function warnOnPossiblePii(eventName: string, params?: EventParams): void {
  if (!import.meta.env.DEV || !params) return;
  for (const [key, value] of Object.entries(params)) {
    const v = String(value);
    if (/@/.test(v) || /\+?\d[\d\s-]{7,}/.test(v)) {
      console.warn(
        `[analytics] Possible PII in event "${eventName}" param "${key}" — remove it.`,
      );
    }
  }
}

let initialized = false;
let debugMode = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  // Gate 1: production builds only (vite dev serves import.meta.env.DEV). Local
  // preview (localhost) is skipped too, unless a debug session is requested so
  // DebugView verification stays possible from `vite preview`.
  debugMode = isDebugSession();
  if (!import.meta.env.PROD) return;
  if (isLocalHostname() && !debugMode) return;

  // Gate 2: a real measurement ID must be configured via env.
  if (!isAnalyticsConfigured()) return;

  // Gate 3: analytics cookie consent.
  if (!hasAnalyticsConsent()) return;

  // Load gtag.js dynamically.
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag — MUST be assigned to window: GA's script replaces the
  // dataLayer push target, and trackEvent() relies on window.gtag existing.
  window.dataLayer = window.dataLayer || [];
  const gtag: GtagFn = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // SPA — page views are sent explicitly on view changes
    // SameSite=Lax, not GA's default "SameSite=None;Secure".
    //
    // GA4 defaults its _ga cookies to SameSite=None, which sends them on
    // every cross-site request — a cookie scoped wider than the site needs,
    // and a finding an OWASP ZAP scan flags on every page load. The
    // measurement here is first-party only (no cross-site tagging), so Lax
    // keeps the same first-party behaviour with a far smaller blast radius.
    cookie_flags: "SameSite=Lax",
    ...(debugMode ? { debug_mode: true } : {}),
  });

  initialized = true;
}

/** Whether gtag.js is live in this session (config + consent + prod gates passed). */
export function isAnalyticsActive(): boolean {
  return initialized;
}

// Track custom conversion/funnel events.
export function trackEvent(eventName: string, params?: EventParams): void {
  if (import.meta.env.DEV) {
    // Local visibility into what would be tracked without sending anything.
    console.debug(`[analytics] ${eventName}`, params ?? {});
    warnOnPossiblePii(eventName, params);
  }
  if (!initialized) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// Predefined funnel/engagement events. Keep every parameter PII-free.
export const events = {
  // --- Auth funnel ---
  signupStarted: (params?: { method?: "email" | "mobile" | "telegram"; user_type?: UserType }) =>
    trackEvent("signup_started", params),
  signupCompleted: (userType: UserType) =>
    trackEvent("signup_completed", { user_type: userType }),
  login: (method: "email" | "mobile" | "telegram" | "google" | "apple" | "facebook") =>
    trackEvent("login", { method }),
  authAbandoned: (flow: AuthFlow) =>
    trackEvent("auth_abandoned", { flow }),

  // --- Marketplace funnel ---
  jobPosted: () => trackEvent("job_posted"),
  proposalSubmitted: () => trackEvent("proposal_submitted"),
  contractSigned: (userType: UserType) =>
    trackEvent("contract_signed", { user_type: userType }),
  escrowFunded: (source: "contract_milestone" | "gig_order") =>
    trackEvent("escrow_funded", { source }),
  milestoneDelivered: () => trackEvent("milestone_delivered"),
  milestoneAccepted: () => trackEvent("milestone_accepted"),
  payoutRequested: () => trackEvent("payout_requested"),
  payoutCompleted: (provider: string) =>
    trackEvent("payout_completed", { provider }),

  // --- Marketing site engagement ---
  ctaClicked: (label: "hire" | "work") =>
    trackEvent("cta_clicked", { cta_label: label }),
  languageChanged: (lang: "en" | "am" | "om" | "ti") =>
    trackEvent("language_changed", { language: lang }),
  faqExpanded: (question: string) =>
    trackEvent("faq_expanded", { question }),

  // --- SPA page views (sent manually since send_page_view is off) ---
  // `page` is a virtual path ("/", "/faq", "/app/wallet", ...) because the app
  // keeps its own router state instead of changing the URL on navigation.
  pageView: (page: string, title?: string) =>
    trackEvent("page_view", {
      page_name: page,
      page_title: title || document.title,
      page_location:
        typeof window !== "undefined"
          ? window.location.origin + (page.startsWith("/") ? page : `/${page}`)
          : page,
    }),
};
