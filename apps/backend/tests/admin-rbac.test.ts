import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  hasPermission,
} from "../src/modules/admin/permissions.js";

describe("Admin RBAC permission matrix", () => {
  it("denies everything for empty / unknown roles", () => {
    expect(hasPermission(null, "users.suspend")).toBe(false);
    expect(hasPermission(undefined, "audit.view")).toBe(false);
    expect(hasPermission("", "dashboard.view")).toBe(false);
    expect(hasPermission("NOT_A_ROLE", "dashboard.view")).toBe(false);
  });

  it("grants every declared permission to SUPER_ADMIN (and legacy ADMIN)", () => {
    for (const key of PERMISSIONS) {
      expect(hasPermission("SUPER_ADMIN", key)).toBe(true);
      expect(hasPermission("ADMIN", key)).toBe(true);
    }
  });

  it("limits SUPPORT to chat-only scope", () => {
    expect(hasPermission("SUPPORT", "support.handle")).toBe(true);
    expect(hasPermission("SUPPORT", "dashboard.view")).toBe(true);
    expect(hasPermission("SUPPORT", "users.view")).toBe(true);
    // least-privilege: no finance, suspension, compliance, or admin powers
    expect(hasPermission("SUPPORT", "users.suspend")).toBe(false);
    expect(hasPermission("SUPPORT", "kyc.review")).toBe(false);
    expect(hasPermission("SUPPORT", "tms.review")).toBe(false);
    expect(hasPermission("SUPPORT", "admins.manage")).toBe(false);
    expect(hasPermission("SUPPORT", "escrow.release")).toBe(false);
    expect(hasPermission("SUPPORT", "ledger.view")).toBe(false);
  });

  it("lets FINANCE_ADMIN see money records but not suspend users or release escrow", () => {
    expect(hasPermission("FINANCE_ADMIN", "ledger.view")).toBe(true);
    expect(hasPermission("FINANCE_ADMIN", "reconciliation.view")).toBe(true);
    expect(hasPermission("FINANCE_ADMIN", "reports.view")).toBe(true);
    expect(hasPermission("FINANCE_ADMIN", "users.suspend")).toBe(false);
    expect(hasPermission("FINANCE_ADMIN", "escrow.release")).toBe(false);
    expect(hasPermission("FINANCE_ADMIN", "admins.manage")).toBe(false);
  });

  it("lets DISPUTE_MEDIATOR resolve disputes but not touch identity or finance", () => {
    expect(hasPermission("DISPUTE_MEDIATOR", "disputes.resolve")).toBe(true);
    expect(hasPermission("DISPUTE_MEDIATOR", "disputes.mediate")).toBe(true);
    expect(hasPermission("DISPUTE_MEDIATOR", "users.suspend")).toBe(false);
    expect(hasPermission("DISPUTE_MEDIATOR", "kyc.review")).toBe(false);
    expect(hasPermission("DISPUTE_MEDIATOR", "ledger.view")).toBe(false);
  });

  it("keeps legacy COMPLIANCE_OFFICER parity with audit + kyc + tms queues", () => {
    expect(hasPermission("COMPLIANCE_OFFICER", "kyc.review")).toBe(true);
    expect(hasPermission("COMPLIANCE_OFFICER", "tms.review")).toBe(true);
    expect(hasPermission("COMPLIANCE_OFFICER", "audit.view")).toBe(true);
    expect(hasPermission("COMPLIANCE_ADMIN", "kyc.review")).toBe(true);
    // compliance staff must not be able to grant themselves other powers
    expect(hasPermission("COMPLIANCE_OFFICER", "admins.manage")).toBe(false);
  });

  it("covers every staff role exactly once and uses only valid permission keys", () => {
    expect(STAFF_ROLES).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "OPERATIONS_ADMIN",
      "FINANCE_ADMIN",
      "DISPUTE_MEDIATOR",
      "COMPLIANCE_ADMIN",
      "COMPLIANCE_OFFICER",
      "SUPPORT",
    ]);
    for (const role of STAFF_ROLES) {
      for (const key of ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
        expect(PERMISSIONS).toContain(key);
      }
    }
  });
});
