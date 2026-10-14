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
 * STUB — there is no Fayda server-to-server ID API integration in this file, and
 * no credential that would change that. FAYDA_API_* does not exist.
 *
 * The previous version of this function returned
 * `success: true` with `biometricId: mock-biometric-<documentNumber>` for any
 * input. In production that silently approved every applicant while the audit
 * trail recorded a clean Fayda verification, which is worse than an outage: it
 * is a KYC system that cannot fail.
 *
 * It now fails closed. There is no code path here that can produce a real
 * verification, so the honest result is UNAVAILABLE, which routes the applicant
 * to manual review (see the failure-kind contract above) instead of approving
 * them on the strength of a fabricated biometric id.
 *
 * The real biometric identity check is the eSignet OIDC flow in
 * esignet.client.ts, which IS implemented. This function only covers the
 * document-number lookup and stays a stub until Fayda publishes that contract.
 */
export async function verifyWithFayda(params: {
  documentNumber: string;
  fullName: string;
  dateOfBirth: string;
}): Promise<FaydaVerificationResult> {
  // Dev keeps the mock so the KYC flow stays testable end to end.
  if (env.NODE_ENV !== "production") {
    logger.warn(
      { documentNumber: params.documentNumber },
      "Fayda document lookup is a stub; using mock verification. Not for production.",
    );

    // Reserved test values, so both Tier 1 branches are reachable from the UI
    // without editing code. Checked before the env flag so a forced outage is
    // always reported as an outage, whatever the document number.
    if (
      env.FAYDA_SIMULATE_UNAVAILABLE ||
      params.documentNumber === "FAYDA_TEST_FAIL"
    ) {
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

  // Production. No integration exists, so nothing can be verified and nothing
  // may be auto-approved. Manual review is the correct destination.
  logger.error(
    { documentNumber: params.documentNumber },
    "Fayda document lookup is not integrated; refusing to auto-verify in production",
  );
  return {
    success: false,
    failureKind: "UNAVAILABLE",
    failureReason: "FAYDA_INTEGRATION_NOT_CONFIGURED",
  };
}
