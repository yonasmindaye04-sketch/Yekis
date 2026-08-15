import { logger } from "../lib/logger.js";

export interface PepScreeningResult {
  isMatch: boolean;
  matchedListSource?: string;
  confidence?: number;
}

/**
 * STUB — no PEP screening provider has been selected yet (this is a
 * Compliance Officer / Legal decision, not an engineering one). Structured
 * the same way as fayda.client.ts: swap the implementation, keep the
 * signature, and every caller keeps working.
 *
 * A local watchlist file is used here only so the compliance-review-queue
 * flow is testable before a real screening vendor is chosen.
 */
const MOCK_WATCHLIST = new Set<string>([
  // Lowercased full names for simple substring-free exact-match testing only.
  "test flagged person",
]);

export async function screenForPep(fullName: string): Promise<PepScreeningResult> {
  logger.warn(
    { fullName },
    "PEP screening provider not yet selected — using local mock watchlist. Do not deploy this to production."
  );

  const isMatch = MOCK_WATCHLIST.has(fullName.trim().toLowerCase());

  return {
    isMatch,
    matchedListSource: isMatch ? "mock-local-watchlist" : undefined,
    confidence: isMatch ? 1.0 : 0,
  };
}
