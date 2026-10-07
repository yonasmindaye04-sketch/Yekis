/**
 * Routes that carry NO JWT guard ON PURPOSE.
 *
 * Distinct from `publicRoutes.ts`:
 *   - `BASELINE_PUBLIC_ROUTES` is behavioural — verified by replaying the route
 *     with no token and observing a 2xx.
 *   - this set is structural — verified by inspecting the handler chain and
 *     confirming there is deliberately no `requireAuth`.
 *
 * The plan calls this the "explicit allowlist (webhook, health, auth
 * endpoints)". It exists because "no requireAuth in the chain" is not by itself
 * a finding: the sign-in endpoints cannot require a session, and the payment and
 * Telegram webhooks authenticate with a signature or a shared secret instead of
 * a bearer token. What matters is that each of those mechanisms is real, which
 * is checked by the replay and by tests/webhook-auth.test.ts.
 *
 * `scripts/route-audit.ts --check` fails on any route that has no guard, is not
 * listed here, and is not in the committed route baseline — i.e. a NEW
 * unauthenticated route.
 */
export const UNAUTHENTICATED_BY_DESIGN: ReadonlySet<string> = new Set([
  // ── The authentication surface itself ────────────────────────────────────
  // These are how a caller obtains a session in the first place. They are
  // protected by rate limiting and credential verification, not by a session.
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/reset-password",
  "POST /api/v1/auth/reset-password-request",
  "POST /api/v1/auth/oauth/google",
  "POST /api/v1/auth/oauth/apple",
  "POST /api/v1/auth/oauth/facebook",
  "POST /api/v1/auth/telegram",
  "POST /api/v1/auth/telegram/code",
  "POST /api/v1/auth/telegram/miniapp",
  "POST /api/v1/auth/telegram/miniapp/register",
  "POST /api/v1/auth/telegram/widget",
  "POST /api/v1/auth/telegram/web-login/start",
  "POST /api/v1/auth/telegram/web-login/redeem",

  // ── Inbound webhooks: authenticated by signature, not by session ─────────
  // Telegram: X-Telegram-Bot-Api-Secret-Token, constant-time compared.
  "POST /api/v1/telegram/webhook",
  // Telebirr: HMAC over the RAW body, which is why these routers are mounted
  // before express.json().
  "POST /api/v1/webhooks/telebirr",
  // CBE: shared-secret header check.
  "POST /api/v1/webhooks/cbe",

  // ── Health probes ────────────────────────────────────────────────────────
  "GET /health",
  "GET /api/v1/telegram/health",
]);
