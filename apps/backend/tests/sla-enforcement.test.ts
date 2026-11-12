import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  addBusinessDays,
  supportSla,
  disputeSla,
  slaSummary,
} from "../src/modules/sla/sla.service.js";
import { sendMessage } from "../src/modules/chat/chat.service.js";
import { setConversationStatus } from "../src/modules/chat/chat.service.js";
import { env } from "../src/config/env.js";

/**
 * SLA enforcement (2026-11-12).
 *
 * The Roadmap's helpdesk SLAs -- "general support within 24 hours" and
 * "disputes within 3 business days" -- were previously a number drawn in the
 * browser: the ops console computed "hours since the ticket was created" and
 * coloured it. Nothing was enforced, nothing was stored, and nothing could
 * be reported on.
 *
 * These tests pin the enforced behaviour:
 *   - the deadline is derived from the creation time plus the configured
 *     target, so changing a target takes effect immediately
 *   - the clock stops when the obligation is met, and only then
 *   - a breach is a fact that survives, not a redraw
 *   - business days exclude Sunday
 */

const STAMP = Date.now();
const userIds: string[] = [];
const conversationIds: string[] = [];

async function makeUser(label: string, role: "CLIENT" | "FREELANCER" | "ADMIN") {
  const u = await prisma.user.create({
    data: {
      email: `sla-${label}-${STAMP}-${userIds.length}@test.et`,
      phone: `+2519${String(95000000 + userIds.length * 1000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      // staffRole is what makes an account staff; role is the marketplace
      // persona (CLIENT | FREELANCER | BOTH) and "ADMIN" is not one of them.
      role: role === "FREELANCER" ? "FREELANCER" : "CLIENT",
      staffRole: role === "ADMIN" ? "ADMIN" : null,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  userIds.push(u.id);
  return u;
}

async function makeConversation(creatorId: string, createdAt?: Date) {
  const c = await prisma.conversation.create({
    data: {
      creatorId,
      subject: `sla fixture ${STAMP}`,
      status: "OPEN",
      ...(createdAt ? { createdAt } : {}),
      // The creator has to be a participant, or sendMessage rejects their own
      // message ("ConversationAccessError") before any SLA fact is written.
      participants: { create: { userId: creatorId } },
    },
  });
  conversationIds.push(c.id);
  return c;
}

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  const convos = conversationIds.splice(0, conversationIds.length);
  if (convos.length) {
    await prisma.chatMessage.deleteMany({
      where: { conversationId: { in: convos } },
    });
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: { in: convos } },
    });
    await prisma.conversation.deleteMany({ where: { id: { in: convos } } });
  }
  if (ids.length) {
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await cleanup();
});

describe("business days", () => {
  it("excludes Sunday and counts every other day", () => {
    // 2026-11-11 is a Wednesday.
    const wednesday = new Date("2026-11-11T09:00:00.000Z");
    const plus3 = addBusinessDays(wednesday, 3);
    // Wed + 3 business days = Saturday 2026-11-14.
    expect(plus3.getDay()).toBe(6);
    expect(plus3.getDate()).toBe(14);
  });

  it("skips the Sunday in the middle of a window", () => {
    // Friday 2026-11-13 + 3 business days: Sat(1), Mon(2), Tue(3).
    const friday = new Date("2026-11-13T09:00:00.000Z");
    const plus3 = addBusinessDays(friday, 3);
    expect(plus3.getDay()).toBe(2);
    expect(plus3.getDate()).toBe(17);
  });

  it("adds nothing for zero days", () => {
    const d = new Date("2026-11-11T09:00:00.000Z");
    expect(addBusinessDays(d, 0).getTime()).toBe(d.getTime());
  });
});

describe("support SLA", () => {
  it("derives the deadline from creation time plus the configured target", () => {
    const created = new Date("2026-11-01T09:00:00.000Z");
    const sla = supportSla({ createdAt: created }, created);
    expect(sla.firstResponse.dueAt).toBe(
      new Date(
        created.getTime() + env.SUPPORT_FIRST_RESPONSE_SLA_HOURS * 3_600_000,
      ).toISOString(),
    );
    expect(sla.resolution.dueAt).toBe(
      new Date(
        created.getTime() + env.SUPPORT_RESOLUTION_SLA_HOURS * 3_600_000,
      ).toISOString(),
    );
  });

  it("is not breached while the clock is still running", () => {
    const created = new Date();
    const sla = supportSla({ createdAt: created }, created);
    expect(sla.firstResponse.breached).toBe(false);
    expect(sla.resolution.breached).toBe(false);
    expect(sla.breached).toBe(false);
  });

  it("is breached when the target passes with no response", () => {
    const created = new Date(
      Date.now() - (env.SUPPORT_FIRST_RESPONSE_SLA_HOURS + 1) * 3_600_000,
    );
    const sla = supportSla({ createdAt: created }, new Date());
    expect(sla.firstResponse.breached).toBe(true);
    expect(sla.breached).toBe(true);
  });

  it("stops the first-response clock when staff replies", async () => {
    const client = await makeUser("client", "CLIENT");
    const staff = await makeUser("staff", "ADMIN");
    const conversation = await makeConversation(client.id);

    await sendMessage({
      conversationId: conversation.id,
      userId: client.id,
      body: "My payment went somewhere else. Please help.",
    });

    const beforeReply = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    expect(beforeReply.firstRespondedAt).toBeNull();

    await sendMessage({
      conversationId: conversation.id,
      userId: staff.id,
      body: "Looking into it now.",
    });

    const afterReply = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    expect(afterReply.firstRespondedAt).not.toBeNull();

    const sla = supportSla(afterReply, new Date());
    expect(sla.firstResponse.breached).toBe(false);
    expect(sla.firstResponse.metAt).not.toBeNull();
  });

  it("does not let a second reply rewrite the first response", async () => {
    const client = await makeUser("client", "CLIENT");
    const staff = await makeUser("staff", "ADMIN");
    const conversation = await makeConversation(client.id);

    await sendMessage({
      conversationId: conversation.id,
      userId: staff.id,
      body: "First reply.",
    });
    const first = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });

    await sendMessage({
      conversationId: conversation.id,
      userId: staff.id,
      body: "Second reply.",
    });
    const second = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });

    expect(second.firstRespondedAt?.getTime()).toBe(first.firstRespondedAt?.getTime());
  });

  it("stops the resolution clock when the ticket is closed", async () => {
    const client = await makeUser("client", "CLIENT");
    const staff = await makeUser("staff", "ADMIN");
    const conversation = await makeConversation(client.id);

    await sendMessage({
      conversationId: conversation.id,
      userId: staff.id,
      body: "Answer.",
    });
    await setConversationStatus({
      conversationId: conversation.id,
      status: "CLOSED",
    });

    const closed = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    expect(closed.resolvedAt).not.toBeNull();

    const sla = supportSla(closed, new Date());
    expect(sla.resolution.breached).toBe(false);
    expect(sla.resolution.metAt).not.toBeNull();
  });

  it("keeps a breach that already happened even after a late reply", async () => {
    const client = await makeUser("client", "CLIENT");
    const staff = await makeUser("staff", "ADMIN");
    const created = new Date(
      Date.now() - (env.SUPPORT_FIRST_RESPONSE_SLA_HOURS + 2) * 3_600_000,
    );
    const conversation = await makeConversation(client.id, created);

    await sendMessage({
      conversationId: conversation.id,
      userId: staff.id,
      body: "Very late reply.",
    });

    const after = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    const sla = supportSla(after, new Date());
    // The reply happened AFTER the deadline, so the obligation was missed.
    expect(sla.firstResponse.breached).toBe(true);
  });
});

describe("dispute SLA", () => {
  it("derives both deadlines in business days", () => {
    const created = new Date("2026-11-11T09:00:00.000Z");
    const sla = disputeSla({ createdAt: created }, created);
    expect(sla.firstResponse.dueAt).toBe(
      addBusinessDays(created, env.DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS).toISOString(),
    );
    expect(sla.resolution.dueAt).toBe(
      addBusinessDays(created, env.DISPUTE_RESOLUTION_SLA_BUSINESS_DAYS).toISOString(),
    );
  });

  it("is breached when no mediator ever responded", () => {
    const created = new Date(
      Date.now() -
        (env.DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS + 2) * 86_400_000,
    );
    const sla = disputeSla({ createdAt: created }, new Date());
    expect(sla.firstResponse.breached).toBe(true);
  });

  it("is not breached when the mediator answered inside the window", () => {
    const created = new Date(
      Date.now() - (env.DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS + 2) * 86_400_000,
    );
    // The mediator answered before the deadline, so the obligation was met.
    const answeredAt = addBusinessDays(
      created,
      env.DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS - 1,
    );
    const sla = disputeSla(
      { createdAt: created, firstRespondedAt: answeredAt },
      new Date(),
    );
    expect(sla.firstResponse.breached).toBe(false);
  });

  it("stays breached when the mediator answered late", () => {
    const created = new Date(
      Date.now() - (env.DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS + 2) * 86_400_000,
    );
    const sla = disputeSla(
      { createdAt: created, firstRespondedAt: new Date() },
      new Date(),
    );
    expect(sla.firstResponse.breached).toBe(true);
  });
});

describe("SLA summary", () => {
  it("counts the open queues by breach state", async () => {
    const client = await makeUser("client", "CLIENT");
    const staff = await makeUser("staff", "ADMIN");

    // A fresh conversation: within SLA.
    await makeConversation(client.id);
    // An old, unanswered conversation: first-response breached.
    await makeConversation(
      client.id,
      new Date(Date.now() - (env.SUPPORT_FIRST_RESPONSE_SLA_HOURS + 3) * 3_600_000),
    );

    const summary = await slaSummary();
    expect(summary.support.open).toBeGreaterThanOrEqual(2);
    expect(summary.support.firstResponseBreached).toBeGreaterThanOrEqual(1);
    expect(summary.support.withinSla).toBeGreaterThanOrEqual(1);
    expect(summary.generatedAt).toBeTruthy();
    expect(staff.id).toBeTruthy();
  });
});
