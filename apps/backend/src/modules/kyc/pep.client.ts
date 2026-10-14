// === IMPORTS ===
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

// === INTERFACES & TYPES ===
export interface PepScreeningResult {
  isMatch: boolean;
  matchedListSource?: string;
  confidence?: number;
}

/**
 * STUB — no PEP screening provider has been selected yet. That is a Compliance
 * Officer / Legal decision, not an engineering one.
 *
 * WHY THIS NOW READS PEP_PROVIDER
 * server.ts already refused to boot in production with PEP_PROVIDER=mock, but
 * this file ignored the variable entirely and always consulted the local
 * watchlist. An operator who set PEP_PROVIDER=real satisfied that guard and the
 * mock kept running -- exactly the failure the guard was added to prevent, one
 * env var away.
 *
 * So the flag now decides behaviour, and it decides conservatively: "no match"
 * from an unconfigured provider is not evidence of a clean screen, so in
 * production that is reported as an explicit failure rather than a pass.
 */
const MOCK_WATCHLIST = new Set<string>([
  // Lowercased full names for simple substring-free exact-match testing only.
  "test flagged person",
]);

// === MAIN FUNCTIONS ===
export async function screenForPep(
  fullName: string,
): Promise<PepScreeningResult> {
  const isProduction = env.NODE_ENV === "production";

  // Development: the mock watchlist keeps the compliance queue testable.
  if (!isProduction) {
    logger.warn(
      { fullName },
      "PEP screening is running against the local mock watchlist. Development only.",
    );
    const isMatch = MOCK_WATCHLIST.has(fullName.trim().toLowerCase());
    return {
      isMatch,
      matchedListSource: isMatch ? "mock-local-watchlist" : undefined,
      confidence: isMatch ? 1.0 : 0,
    };
  }

  // Production with no real vendor wired up. server.ts lets this boot only when
  // PEP_PROVIDER=real, but "real" is a declaration, not an implementation, and
  // none exists in this file. A one-name watchlist screening production
  // politically-exposed-person traffic is an AML failure, so refuse.
  logger.error(
    { fullName, provider: env.PEP_PROVIDER },
    "No PEP screening provider is implemented; refusing to report a clean screen in production",
  );
  throw new PepProviderUnavailableError(
    "PEP screening provider is not configured. Escalate to Compliance rather than clearing the applicant automatically.",
  );
}

/**
 * Thrown rather than returned, so the caller cannot treat it as a negative
 * screen by accident. kyc.service.ts surfaces Tier 2 submissions for manual
 * review; a thrown error must reach manual review too, never auto-approve.
 */
export class PepProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PepProviderUnavailableError";
  }
}