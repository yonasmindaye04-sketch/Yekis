import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { recordAuditEvent } from "../src/lib/audit.js";

afterEach(() => vi.restoreAllMocks());

describe("recordAuditEvent", () => {
  it("creates an append-only row with defaults when optional fields are omitted", async () => {
    const create = vi
      .spyOn(prisma.auditLog, "create")
      .mockResolvedValue({} as never);

    await recordAuditEvent({
      userId: "u1",
      eventType: "USER_SUSPENDED",
      entityType: "User",
      entityId: "target-1",
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "USER_SUSPENDED",
          action: "USER_SUSPENDED", // defaults to eventType
          actorRole: null,
          amountMinor: null,
        }),
      }),
    );
  });

  it("persists previous/new state, amount, and request correlation fields", async () => {
    const create = vi
      .spyOn(prisma.auditLog, "create")
      .mockResolvedValue({} as never);

    await recordAuditEvent({
      userId: "u1",
      eventType: "STAFF_ROLE_CHANGED",
      entityType: "User",
      entityId: "target-2",
      actorRole: "SUPER_ADMIN",
      previousState: { staffRole: "SUPPORT" },
      newState: { staffRole: "DISPUTE_MEDIATOR" },
      amountMinor: 12500,
      requestId: "req-123",
      ipAddress: "127.0.0.1",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorRole: "SUPER_ADMIN",
          previousState: { staffRole: "SUPPORT" },
          newState: { staffRole: "DISPUTE_MEDIATOR" },
          amountMinor: 12500,
          requestId: "req-123",
          ipAddress: "127.0.0.1",
        }),
      }),
    );
  });
});
