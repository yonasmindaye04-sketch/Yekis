import { describe, expect, it, vi } from "vitest";

// The purge engine is exercised against a real database by the operator run;
// this suite covers the decisions that must never depend on the database:
// which environment values turn the feature on, and which accounts may never
// be in the target set.
vi.mock("../src/lib/prisma.js", () => ({ prisma: {} }));
vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const {
  readCleanupMode,
  validateTargets,
  classifySharedChatRows,
  isTransientDatabaseError,
  withTransientDatabaseRetry,
  SEEDED_DEMO_EMAILS,
  PROTECTED_EMAILS,
} = await import("../src/bootstrap/demoCleanup.js");
type TargetUser = import("../src/bootstrap/demoCleanup.js").TargetUser;
type SharedChatRow = import("../src/bootstrap/demoCleanup.js").SharedChatRow;

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

describe("classifySharedChatRows", () => {
  const targetIds = new Set(["id-demo", "id-test"]);

  function shared(overrides: Partial<SharedChatRow> = {}): SharedChatRow {
    return {
      rowId: "row-1",
      kind: "membership",
      memberUserId: "id-admin",
      memberEmail: "admin@yekis.et",
      conversationId: "conversation-1",
      conversationSubject: "AletCloud object-store check",
      conversationCreatorId: "id-test",
      memberMessages: 0,
      ...overrides,
    };
  }

  it("absorbs a membership in a demo thread when the member wrote nothing", () => {
    const verdict = classifySharedChatRows([shared()], targetIds);
    expect(verdict.absorbed).toHaveLength(1);
    expect(verdict.blocked).toHaveLength(0);
  });

  it("absorbs a membership in a demo thread even when the member replied in it", () => {
    // The ticket was opened by an automated test account, so the whole thread
    // is dummy data. The member's account keeps everything else.
    const verdict = classifySharedChatRows(
      [shared({ memberMessages: 2 })],
      targetIds,
    );
    expect(verdict.absorbed).toHaveLength(1);
    expect(verdict.blocked).toHaveLength(0);
  });

  it("absorbs a message written by a member in a demo thread", () => {
    const verdict = classifySharedChatRows(
      [shared({ kind: "message", memberMessages: 1 })],
      targetIds,
    );
    expect(verdict.absorbed).toHaveLength(1);
  });

  it("blocks a row in a thread a real member opened", () => {
    const verdict = classifySharedChatRows(
      [shared({ conversationCreatorId: "id-real" })],
      targetIds,
    );
    expect(verdict.absorbed).toHaveLength(0);
    expect(verdict.blocked).toHaveLength(1);
  });

  it("ignores a row that names a target — it is not shared at all", () => {
    const verdict = classifySharedChatRows(
      [shared({ memberUserId: "id-demo", conversationCreatorId: "id-real" })],
      targetIds,
    );
    expect(verdict.absorbed).toHaveLength(0);
    expect(verdict.blocked).toHaveLength(0);
  });

  it("never treats the administrator's account as a target", () => {
    const verdict = classifySharedChatRows(
      [shared({ memberUserId: "id-admin" })],
      targetIds,
    );
    // The chat row goes with the demo thread; the account is not a target and
    // is never deleted — only the row that links it to a demo thread.
    expect(verdict.absorbed).toHaveLength(1);
    expect(verdict.absorbed[0]?.memberEmail).toBe("admin@yekis.et");
    expect(targetIds.has(verdict.absorbed[0]!.memberUserId)).toBe(false);
  });
});

describe("isTransientDatabaseError", () => {
  it("recognises a Prisma error code for an unreachable database", () => {
    expect(isTransientDatabaseError({ code: "P1001" })).toBe(true);
    expect(isTransientDatabaseError({ code: "P1002" })).toBe(true);
    expect(isTransientDatabaseError({ code: "P1017" })).toBe(true);
  });

  it("recognises the managed database refusing a connection", () => {
    // The exact shape the AletCloud PostgreSQL produces when a deployment
    // overlaps the one it replaces: the FATAL text arrives in `meta.message`.
    expect(
      isTransientDatabaseError({
        name: "PrismaClientKnownRequestError",
        code: "P1001",
        meta: {
          modelName: "User",
          message:
            "FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute",
        },
      }),
    ).toBe(true);
  });

  it("recognises the wording even without a Prisma error code", () => {
    expect(
      isTransientDatabaseError({ message: "sorry, too many clients already" }),
    ).toBe(true);
    expect(
      isTransientDatabaseError({
        meta: { message: "FATAL: remaining connection slots are reserved" },
      }),
    ).toBe(true);
  });

  it("does not retry a refusal that is not about connections", () => {
    expect(isTransientDatabaseError({ code: "P2003", message: "foreign key" })).toBe(
      false,
    );
    expect(isTransientDatabaseError({ message: "permission denied" })).toBe(false);
    expect(isTransientDatabaseError(new Error("something else"))).toBe(false);
  });

  it("does not retry a value that is not an error", () => {
    expect(isTransientDatabaseError(null)).toBe(false);
    expect(isTransientDatabaseError(undefined)).toBe(false);
    expect(isTransientDatabaseError("P1001")).toBe(false);
  });
});

describe("withTransientDatabaseRetry", () => {
  it("retries a busy database and returns the eventual result", async () => {
    let calls = 0;
    const result = await withTransientDatabaseRetry(
      "test",
      async () => {
        calls += 1;
        if (calls < 3) {
          throw {
            code: "P1001",
            meta: { message: "FATAL: remaining connection slots are reserved" },
          };
        }
        return "done";
      },
      { attempts: 5, delayMs: 0 },
    );
    expect(result).toBe("done");
    expect(calls).toBe(3);
  });

  it("does not retry a failure that is not about connections", async () => {
    let calls = 0;
    await expect(
      withTransientDatabaseRetry(
        "test",
        async () => {
          calls += 1;
          throw new Error("permission denied");
        },
        { attempts: 5, delayMs: 0 },
      ),
    ).rejects.toThrow("permission denied");
    expect(calls).toBe(1);
  });

  it("gives up after the attempts and reports the last failure", async () => {
    let calls = 0;
    await expect(
      withTransientDatabaseRetry(
        "test",
        async () => {
          calls += 1;
          throw { code: "P1001" };
        },
        { attempts: 3, delayMs: 0 },
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    expect(calls).toBe(3);
  });
});
