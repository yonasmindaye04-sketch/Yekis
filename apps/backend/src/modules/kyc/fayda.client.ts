// === IMPORTS ===
import { logger } from "../../lib/logger.js";

// === INTERFACES & TYPES ===
export interface FaydaVerificationResult {
  success: boolean;
  /** Fayda's biometric identifier — used for platform-wide deduplication.
   *  Only present when success is true. */
  biometricId?: string;
  dateOfBirth?: string;
  fullName?: string;
  failureReason?: string;
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

  // Mock behavior: fail deterministically for a specific test value so the
  // manual-review-fallback path is exercisable without real Fayda access.
  if (params.documentNumber === "FAYDA_TEST_FAIL") {
    return { success: false, failureReason: "MOCK_API_UNAVAILABLE" };
  }

  return {
    success: true,
    biometricId: `mock-biometric-${params.documentNumber}`,
    dateOfBirth: params.dateOfBirth,
    fullName: params.fullName,
  };
}
