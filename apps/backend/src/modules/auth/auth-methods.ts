// === INTERFACES & TYPES ===
/**
 * The methods that can appear in a token's `amr` claim — the authentication
 * methods that were actually exercised in the credential event that produced
 * the session.
 *
 * This is deliberately its own module (no Prisma, no Express, no env access) so
 * both the token service and the HTTP middleware can depend on it without an
 * import cycle.
 */
export type AuthMethod =
  | "pwd"
  | "totp"
  | "email_otp"
  | "tg_miniapp"
  | "tg_web"
  | "tg_widget"
  | "oauth";

/**
 * A "strong" factor is one that required something only the account holder
 * possesses. Telegram is NEVER strong: the Bot API hands `from.id` to any
 * client that opens the bot, so a Telegram-only session cannot authorise money
 * movement. `oauth` is likewise not strong — a federated provider session says
 * nothing about who is sitting at the browser right now.
 */
export const STRONG_AUTH_METHODS: ReadonlySet<string> = new Set<AuthMethod>([
  "pwd",
  "totp",
  "email_otp",
]);

/**
 * Error codes the client must be able to branch on.
 *
 * REAUTH_REQUIRED means "no credential was presented recently enough" (401).
 * STEP_UP_REQUIRED means "recent, but only by a weak factor" (403). The
 * distinction matters: the first asks the user to sign in again, the second
 * asks them to add a strong factor.
 */
export const AUTH_ERROR_CODES = {
  REAUTH_REQUIRED: "REAUTH_REQUIRED",
  STEP_UP_REQUIRED: "STEP_UP_REQUIRED",
} as const;

export function isStrongMethod(amr: readonly string[] | undefined | null): boolean {
  if (!amr || amr.length === 0) return false;
  return amr.some((m) => STRONG_AUTH_METHODS.has(m));
}
