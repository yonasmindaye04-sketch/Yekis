import { InlineKeyboard } from "grammy";
import { env } from "../../../config/env.js";

/**
 * The bot's public handle, WITHOUT the leading @.
 *
 * Read from TELEGRAM_BOT_USERNAME rather than hardcoded: a hardcoded handle
 * silently produced deep links to a different (or nonexistent) bot, and the
 * Login Widget refuses to render when the handle does not match the bot whose
 * token signs the payload.
 */
export function botUsername(): string {
  return (env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
}

/**
 * Build a URL into the Yekis web app.
 *
 * Uses FRONTEND_URL verbatim. An earlier version rewrote any localhost or
 * http:// base to a hardcoded `https://yekis.io`, on the theory that Telegram
 * rejects such URLs. That constraint applies only to `web_app` (Mini App)
 * inline buttons, NOT to ordinary `url` buttons — and because FRONTEND_URL
 * defaults to http://localhost:5173, the rewrite fired on EVERY call. The bot
 * therefore handed members links to a domain that does not host the app
 * ("site can't be reached") from /start, /login, /contracts, /disputes and
 * /proposals alike.
 *
 * For Mini App buttons use buildPublicWebAppUrl(), which enforces the real
 * Telegram requirement instead of faking a domain.
 */
export function buildWebAppUrl(
  path: string,
  params: Record<string, string> = {},
): string {
  const search = new URLSearchParams(params).toString();
  const base = (env.FRONTEND_URL || "").replace(/\/+$/, "");
  return `${base}${path}${search ? `?${search}` : ""}`;
}

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "0:0:0:0:0:0:0:1",
]);

/**
 * True when FRONTEND_URL is something Telegram can actually open: a public
 * HTTPS origin. Loopback, LAN and plain-HTTP origins are rejected because
 * they resolve to the phone or to nothing at all from Telegram's side.
 */
export function isPublicFrontendUrl(): boolean {
  const raw = env.FRONTEND_URL;
  if (!raw) return false;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".localhost")) return false;
  // Private IPv4 ranges are unreachable from the public internet.
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  return true;
}

/**
 * URL for a Telegram **Mini App** inline button.
 *
 * Telegram rejects `web_app` buttons whose URL is not a public HTTPS origin,
 * so this returns null rather than substituting a plausible-looking domain.
 * Callers must skip the button on null instead of shipping a dead link.
 */
export function buildPublicWebAppUrl(path = "/"): string | null {
  if (!isPublicFrontendUrl()) return null;
  return buildWebAppUrl(path);
}

/**
 * Whether Telegram will accept this URL inside an inline keyboard button.
 *
 * IMPORTANT CORRECTION: Telegram validates the URL of EVERY inline keyboard
 * button, not just `web_app` ones. A plain `url` button pointing at
 * `http://localhost:5173` is rejected with
 *
 *   400 Bad Request: inline keyboard button URL '...' is invalid: Wrong HTTP URL
 *
 * and because the rejection applies to the whole sendMessage call, ONE such
 * button means the user receives NO message at all — not even the text. So every
 * button URL must be checked, and the button omitted when it fails.
 */
export function isPublishableWebUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".localhost")) return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  return true;
}

/**
 * Returns the URL if Telegram will accept it in a button, otherwise null.
 * Use this at every button-construction site.
 */
export function safeWebUrl(url: string): string | null {
  return isPublishableWebUrl(url) ? url : null;
}

/** Convenience wrapper: is a web button possible at all right now? */
export function canLinkToWeb(): boolean {
  return isPublicFrontendUrl();
}

/**
 * Builds a keyboard containing ONLY the URL buttons Telegram will accept.
 *
 * Telegram rejects an inline keyboard button URL with
 * "Wrong HTTP URL" for anything non-https, and that rejection fails the entire
 * sendMessage call — so one unusable button means the member receives no
 * message at all, not even the text. Filtering here means a keyboard degrades
 * gracefully instead of nuking the reply.
 *
 * The returned keyboard may legitimately be empty; that is still a valid
 * reply_markup.
 */
export function safeUrlKeyboard(
  entries: { text: string; url: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const entry of entries) {
    const url = safeWebUrl(entry.url);
    if (url) kb.url(entry.text, url);
  }
  return kb;
}

/** True when a keyboard ended up with no buttons at all. */
export function isEmptyKeyboard(kb: InlineKeyboard): boolean {
  return kb.inline_keyboard.length === 0;
}

/**
 * One-tap web sign-in link.
 *
 * Carries a single-use code minted by the bot. The web app redeems it for a
 * normal session on load, so following this link signs the member in — this is
 * the path that works when the Telegram Login Widget cannot render.
 */
export function webAuthRoute(code: string): string {
  return buildWebAppUrl("/", { tg_code: code });
}

/**
 * Predefined Mini App routes
 */
export const webAppRoutes = {
  jobs: (filters?: Record<string, string>) => buildWebAppUrl("/jobs", filters),
  jobDetail: (jobId: string) => buildWebAppUrl(`/jobs/${jobId}`),
  myJobs: () => buildWebAppUrl("/my-jobs"),
  proposals: (jobId?: string) =>
    buildWebAppUrl("/proposals", jobId ? { jobId } : {}),
  contract: (contractId: string) => buildWebAppUrl(`/contracts/${contractId}`),
  wallet: () => buildWebAppUrl("/wallet"),
  kyc: () => buildWebAppUrl("/kyc"),
  disputes: () => buildWebAppUrl("/disputes"),
  notifications: () => buildWebAppUrl("/notifications"),
  settings: () => buildWebAppUrl("/settings"),

  // Staff routes
  staffDashboard: () => buildWebAppUrl("/staff"),
  staffKycReview: (kycId: string) => buildWebAppUrl(`/staff/kyc/${kycId}`),
  staffTopupReview: (topupId: string) =>
    buildWebAppUrl(`/staff/topups/${topupId}`),
  staffDisputeMediation: (disputeId: string) =>
    buildWebAppUrl(`/staff/disputes/${disputeId}`),
  staffTmsReview: (flagId: string) => buildWebAppUrl(`/staff/tms/${flagId}`),
  staffUserLookup: (ucid: string) => buildWebAppUrl(`/staff/users/${ucid}`),
  staffAnalytics: () => buildWebAppUrl("/staff/analytics"),
};

/**
 * Create a Telegram deep link for sharing
 */
export function createTelegramDeepLink(
  botUsername: string,
  startParam?: string,
): string {
  return `https://t.me/${botUsername}${startParam ? `?start=${startParam}` : ""}`;
}

/**
 * Create a job share link
 */
export function createJobShareLink(jobId: string): string {
  return createTelegramDeepLink(botUsername(), `job_${jobId}`);
}

/**
 * Create a referral link
 */
export function createReferralLink(userId: string): string {
  return createTelegramDeepLink(botUsername(), `ref_${userId}`);
}

/**
 * Create the "sign in on the web" deep link that the browser sign-in page
 * links to as its fallback.
 */
export function createWebAuthDeepLink(): string {
  return createTelegramDeepLink(botUsername(), "web_auth");
}

/**
 * Parse a deep link start parameter
 */
export function parseDeepLink(
  startParam: string,
): { type: string; id: string } | null {
  const match = startParam.match(/^(job|ref|proposal|contract|dispute)_(\w+)$/);
  if (match) return { type: match[1]!, id: match[2]! };

  // `web_auth` is emitted by the browser sign-in page as its fallback so a
  // member sent there from the site lands on a bot that explains the code
  // flow instead of a bare welcome screen.
  if (startParam === "web_auth" || startParam === "login") {
    return { type: "web_auth", id: "" };
  }

  return null;
}
