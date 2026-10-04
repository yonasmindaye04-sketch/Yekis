// === IMPORTS ===
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

// === INTERFACES & TYPES ===

/**
 * Why a verification failed. The distinction drives the Tier 1 policy:
 *
 *  - UNAVAILABLE: Fayda is down, timing out, or returning 5xx. Nothing is
 *    known about this person — the application MUST fall back to manual
 *    review rather than being denied (and rather than being auto-approved,
 *    since no evidence was actually returned).
 *  - REJECTED / NOT_FOUND: Fayda answered and did not match. Still routed to
 *    manual review, but the reviewer is told the ID lookup came back empty so
 *    they can ask for a corrected document number instead of a better photo.
 */
export type FaydaFailureKind =
  | "UNAVAILABLE"
  | "REJECTED"
  | "NOT_FOUND";

export interface FaydaVerificationResult {
  success: boolean;
  /** Fayda's biometric identifier — used for platform-wide deduplication.
   *  Only present when success is true. */
  biometricId?: string;
  dateOfBirth?: string;
  fullName?: string;
  failureReason?: string;
  failureKind?: FaydaFailureKind;
}

/**
 * STUB — Fayda ID API access is a Phase 0 blocking item (roadmap §Legal &
 * Compliance) still pending formal application approval. This function is
 * structured so that once real credentials and an API contract exist, only
 * this file needs to change — every caller (kyc.service.ts) already treats
 * this as an async black box returning FaydaVerificationResult.
 *
 * Until then: returns a deterministic mock result so the rest of the KYC
 * flow (manual review fallback, dedup, status transitions) can be built
 * and tested end-to-end against realistic data shapes.
 */

// === MAIN FUNCTIONS ===
export async function verifyWithFayda(params: {
  documentNumber: string;
  fullName: string;
  dateOfBirth: string;
}): Promise<FaydaVerificationResult> {
  logger.warn(
    { documentNumber: params.documentNumber },
    "Fayda API integration not yet live — using mock verification. Do not deploy this to production.",
  );

  // Reserved test values, so both Tier 1 branches are reachable from the UI
  // without editing code. Checked before the env flag so a forced outage is
  // always reported as an outage, whatever the document number.
  if (env.FAYDA_SIMULATE_UNAVAILABLE || params.documentNumber === "FAYDA_TEST_FAIL") {
    return {
      success: false,
      failureKind: "UNAVAILABLE",
      failureReason: "FAYDA_SERVICE_UNAVAILABLE",
    };
  }

  if (params.documentNumber === "FAYDA_TEST_REJECT") {
    return {
      success: false,
      failureKind: "NOT_FOUND",
      failureReason: "IDENTITY_NOT_FOUND_AT_FAYDA",
    };
  }

  return {
    success: true,
    biometricId: `mock-biometric-${params.documentNumber}`,
    dateOfBirth: params.dateOfBirth,
    fullName: params.fullName,
  };
}
