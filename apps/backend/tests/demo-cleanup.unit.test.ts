import { describe, expect, it, vi } from "vitest";

// The purge engine is exercised against a real database by the operator run;
// this suite covers the decisions that must never depend on the database:
// which environment values turn the feature on, and which accounts may never
// be in the target set.
vi.mock("../src/lib/prisma.js", () => ({ prisma: {} }));
vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { readCleanupMode, validateTargets, SEEDED_DEMO_EMAILS, PROTECTED_EMAILS } =
  await import("../src/bootstrap/demoCleanup.js");
type TargetUser = import("../src/bootstrap/demoCleanup.js").TargetUser;

function target(email: string, staffRole: string | null = null): TargetUser {
  return { id: `id-${email}`, email, staffRole };
}

const DEMO = SEEDED_DEMO_EMAILS.map((email) =>
  target(
    email,
    email === "compliance@yekis.et"
      ? "COMPLIANCE_OFFICER"
      : email === "support@yekis.et"
        ? "SUPPORT"
        : null,
  ),
);

describe("readCleanupMode", () => {
  it("is off when the variable is absent or blank", () => {
    expect(readCleanupMode({})).toBe("");
    expect(readCleanupMode({ DEMO_CLEANUP: "   " })).toBe("");
  });

  it("normalises case and surrounding whitespace", () => {
    expect(readCleanupMode({ DEMO_CLEANUP: "dry-run" })).toBe("dry-run");
    expect(readCleanupMode({ DEMO_CLEANUP: "  CONFIRM " })).toBe("confirm");
  });

  it("returns an unknown value unchanged so the caller can refuse it", () => {
    expect(readCleanupMode({ DEMO_CLEANUP: "yes" })).toBe("yes");
  });
});

describe("validateTargets", () => {
  it("accepts the seeded demo accounts and RFC 2606 test accounts", () => {
    expect(() =>
      validateTargets([...DEMO, target("onboarding.check.1@example.com")]),
    ).not.toThrow();
  });

  it("protects the administrator even if the selector somehow returned it", () => {
    for (const email of PROTECTED_EMAILS) {
      expect(() => validateTargets([target(email, "SUPER_ADMIN")])).toThrow(
        /protected/,
      );
    }
  });

  it("allows the two seeded staff identities but refuses any other staff account", () => {
    expect(() => validateTargets(DEMO)).not.toThrow();
    expect(() =>
      validateTargets([target("intruder@example.com", "SUPPORT")]),
    ).toThrow(/staff account/);
  });

  it("never touches the real-member domains", () => {
    for (const email of [
      "someone@guest.invalid",
      "erased@erased.invalid",
      "user.998461832@yekis.local",
    ]) {
      expect(() => validateTargets([target(email)])).toThrow(/real-member domain/);
    }
  });

  it("refuses an address outside the demo list and the automated-test pattern", () => {
    expect(() => validateTargets([target("founder@yekis.et")])).toThrow(
      /matches neither/,
    );
    expect(() => validateTargets([target("real.person@gmail.com")])).toThrow(
      /matches neither/,
    );
  });

  it("refuses a runaway target set instead of deleting a crowd", () => {
    const crowd = Array.from({ length: 101 }, (_, index) =>
      target(`probe.${index}@example.com`),
    );
    expect(() => validateTargets(crowd)).toThrow(/limit/);
  });

  it("keeps the administrator out of the seeded demo list", () => {
    expect(SEEDED_DEMO_EMAILS).not.toContain("admin@yekis.et");
    expect(SEEDED_DEMO_EMAILS).toHaveLength(6);
  });
});
