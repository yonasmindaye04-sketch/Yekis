import { describe, it, expect, afterEach } from "vitest";
import { env } from "../src/config/env.js";
import { verifyWithFayda } from "../src/modules/kyc/fayda.client.js";
import { screenForPep, PepProviderUnavailableError } from "../src/modules/kyc/pep.client.js";

/**
 * Both of these used to pass silently in production.
 *
 * verifyWithFayda returned { success: true, biometricId: "mock-biometric-<id>" }
 * for any input. That is a KYC system that cannot fail: every applicant is
 * approved and the audit trail records a clean Fayda verification. There is no
 * FAYDA_API_* credential in the config at all, so adding credentials could not
 * have fixed it -- there was nothing for them to authenticate against.
 *
 * screenForPep consulted a one-name local watchlist unconditionally.
 * server.ts already refused to boot production with PEP_PROVIDER=mock, but
 * nothing read the variable, so setting PEP_PROVIDER=real satisfied that guard
 * while the mock kept running: the exact failure the guard was written to
 * prevent, one env var away.
 *
 * Both must fail closed in production.
 */

const originalNodeEnv = env.NODE_ENV;
const originalPepProvider = env.PEP_PROVIDER;
const originalSimulate = env.FAYDA_SIMULATE_UNAVAILABLE;

function setNodeEnv(value: string) {
  (env as Record<string, unknown>).NODE_ENV = value;
}

afterEach(() => {
  (env as Record<string, unknown>).NODE_ENV = originalNodeEnv;
  (env as Record<string, unknown>).PEP_PROVIDER = originalPepProvider;
  (env as Record<string, unknown>).FAYDA_SIMULATE_UNAVAILABLE = originalSimulate;
});

const INPUT = {
  documentNumber: "11928301234",
  fullName: "Test Applicant",
  dateOfBirth: "1990-01-01",
};

describe("Fayda document lookup", () => {
  it("refuses to verify in production, whatever the ID number", async () => {
    setNodeEnv("production");
    (env as Record<string, unknown>).FAYDA_SIMULATE_UNAVAILABLE = false;

    const result = await verifyWithFayda(INPUT);

    // Must never report success, and must never mint a biometric id.
    expect(result.success).toBe(false);
    expect(result.biometricId).toBeUndefined();
    // UNAVAILABLE routes to manual review rather than a denial, which is the
    // documented contract for "the provider told us nothing".
    expect(result.failureKind).toBe("UNAVAILABLE");
  });

  it("cannot be coaxed into success with the dev test values in production", async () => {
    setNodeEnv("production");
    for (const documentNumber of ["FAYDA_TEST_REJECT", "FAYDA_TEST_FAIL", "anything"]) {
      const result = await verifyWithFayda({ ...INPUT, documentNumber });
      expect(result.success, `documentNumber=${documentNumber}`).toBe(false);
      expect(result.biometricId).toBeUndefined();
    }
  });

  it("keeps the mock in development so the KYC flow stays testable", async () => {
    setNodeEnv("test");
    (env as Record<string, unknown>).FAYDA_SIMULATE_UNAVAILABLE = false;
    const result = await verifyWithFayda(INPUT);
    expect(result.success).toBe(true);
    expect(result.biometricId).toContain("mock-biometric");
  });
});

describe("PEP screening", () => {
  it("refuses to report a clean screen in production", async () => {
    setNodeEnv("production");
    (env as Record<string, unknown>).PEP_PROVIDER = "real";

    // Throws rather than returning isMatch:false, because a false from an
    // unconfigured provider is not evidence of anything.
    await expect(screenForPep("Test Applicant")).rejects.toBeInstanceOf(
      PepProviderUnavailableError,
    );
  });

  it("does not match the mock watchlist in production even when the flag says real", async () => {
    setNodeEnv("production");
    (env as Record<string, unknown>).PEP_PROVIDER = "real";
    // The one name in the local watchlist. Before the fix this returned
    // isMatch:true, which at least looked like screening; the failure mode
    // was every OTHER name returning a confident false.
    await expect(screenForPep("test flagged person")).rejects.toBeInstanceOf(
      PepProviderUnavailableError,
    );
  });

  it("keeps the mock watchlist in development", async () => {
    setNodeEnv("test");
    const hit = await screenForPep("test flagged person");
    expect(hit.isMatch).toBe(true);
    const miss = await screenForPep("Someone Else");
    expect(miss.isMatch).toBe(false);
  });
});

describe("LOCK (source text) — the config cannot imply a capability it lacks", () => {
  it("declares no Fayda credential, because none is implemented", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "..", "src", "config", "env.ts"),
      "utf8",
    );
    // A FAYDA_API_* or FAYDA_BASE_URL would imply an integration to point it at.
    expect(src).not.toMatch(/FAYDA_(API|BASE_URL|ENDPOINT|APP_ID)/);
  });

  it("pep.client.ts reads PEP_PROVIDER rather than ignoring it", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "..", "src", "modules", "kyc", "pep.client.ts"),
      "utf8",
    );
    // The guard in server.ts is only meaningful if the provider honours it.
    expect(src).toMatch(/PEP_PROVIDER|env\.NODE_ENV === "production"/);
  });
});