import { describe, it, expect } from "vitest";
import { UserRole } from "../src/schemas";

/**
 * The dual-role contract.
 *
 * `BOTH` is a first-class backend role: UserRole includes it, RegisterInput
 * accepts it, and every gate that cares accepts it (POST /jobs and proposals
 * take CLIENT or BOTH, gig publishing takes FREELANCER or BOTH, and the ops
 * dashboard counts BOTH in both tallies).
 *
 * The frontend used to collapse it. PlatformRole omitted "BOTH" entirely, and
 * four workspaces received `platformRole as "CLIENT" | "FREELANCER"` â€” an `as`
 * cast the compiler cannot check. "BOTH" reached those components at runtime,
 * making every `role === "CLIENT"` false *and* every `role === "FREELANCER"`
 * false, so both decisive branches rendered nothing at all.
 *
 * These assertions pin the parts of that contract which are cheap to test
 * without a browser. The UI branching itself is verified by typecheck: making
 * MarketplaceRole include "BOTH" is what forces every consumer to handle it,
 * because a `role === "CLIENT" ? ... : ...` chain would otherwise still
 * silently take the wrong branch.
 */
describe("dual-role (BOTH) support", () => {
  it("is a real backend role", () => {
    expect(UserRole.options).toContain("BOTH");
  });

  it("is accepted at registration", () => {
    // RegisterInput.role is UserRole, so BOTH parses without coercion.
    expect(() => UserRole.parse("BOTH")).not.toThrow();
  });

  it("rejects roles outside the enum", () => {
    expect(() => UserRole.parse("STAFF")).toThrow();
  });
});
