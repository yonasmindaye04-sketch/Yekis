import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { authorizeAttachmentAccess } from "../src/modules/chat/chat.service.js";

/**
 * Attachment read authorization.
 *
 * The storage key is opaque and unguessable, but a leaked URL must not be a
 * permanent unauthenticated grant: the serving route resolves the key back to
 * the owning conversation and checks access before touching storage. These
 * tests pin that behaviour, including the negative cases that matter — a
 * stranger, and a different participant on another thread.
 */

const SUFFIX = Date.now();
const OWNER_EMAIL = `attach.owner.${SUFFIX}@example.com`;
const STRANGER_EMAIL = `attach.stranger.${SUFFIX}@example.com`;
const OTHER_EMAIL = `attach.other.${SUFFIX}@example.com`;
const STAFF_EMAIL = `attach.staff.${SUFFIX}@example.com`;

const KEY = `chat-attachments/ab/${SUFFIX}-statement.pdf`;
const ATTACHMENT_URL = `/api/v1/chat/attachments/${encodeURIComponent(KEY)}`;

async function makeUser(email: string, staffRole?: string) {
  return prisma.user.create({
    data: {
      email,
      phone: `+2519${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
      passwordHash: "x",
      role: "CLIENT",
      staffRole: staffRole ?? null,
      wallet: { create: { balanceMinor: 0 } },
    },
  });
}

let ownerId = "";
let strangerId = "";
let otherId = "";
let staffId = "";
let conversationId = "";
let otherConversationId = "";

beforeAll(async () => {
  const owner = await makeUser(OWNER_EMAIL);
  const stranger = await makeUser(STRANGER_EMAIL);
  const other = await makeUser(OTHER_EMAIL);
  const staff = await makeUser(STAFF_EMAIL, "SUPPORT");
  ownerId = owner.id;
  strangerId = stranger.id;
  otherId = other.id;
  staffId = staff.id;

  // Thread 1: owner + a message carrying the attachment.
  conversationId = (
    await prisma.conversation.create({
      data: {
        creatorId: ownerId,
        subject: "Attachment authorization thread",
        participants: { create: [{ userId: ownerId }] },
        messages: {
          create: { senderId: ownerId, body: "see attached", attachmentUrl: ATTACHMENT_URL },
        },
      },
    })
  ).id;

  // Thread 2: a different user, no attachment — used to prove scoping.
  otherConversationId = (
    await prisma.conversation.create({
      data: {
        creatorId: otherId,
        subject: "Unrelated thread",
        participants: { create: [{ userId: otherId }] },
      },
    })
  ).id;
});

afterAll(async () => {
  const ids = [ownerId, strangerId, otherId, staffId].filter(Boolean);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { conversationId: { in: [conversationId, otherConversationId] } } }),
    prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: [conversationId, otherConversationId] } } }),
    prisma.conversation.deleteMany({ where: { id: { in: [conversationId, otherConversationId] } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
});

describe("Attachment read authorization", () => {
  it("grants the thread owner access", async () => {
    const allowed = await authorizeAttachmentAccess({
      storageKey: KEY,
      userId: ownerId,
    });
    expect(allowed).toBe(conversationId);
  });

  it("denies an unrelated authenticated user", async () => {
    const allowed = await authorizeAttachmentAccess({
      storageKey: KEY,
      userId: strangerId,
    });
    expect(allowed).toBeNull();
  });

  it("denies a participant on a different thread", async () => {
    // `otherId` owns a different conversation; membership somewhere must not
    // grant access to an attachment on thread 1.
    const allowed = await authorizeAttachmentAccess({
      storageKey: KEY,
      userId: otherId,
    });
    expect(allowed).toBeNull();
  });

  it("grants staff access so the support desk can read a customer's file", async () => {
    const allowed = await authorizeAttachmentAccess({
      storageKey: KEY,
      userId: staffId,
    });
    expect(allowed).toBe(conversationId);
  });

  it("denies when the key matches no message at all", async () => {
    const allowed = await authorizeAttachmentAccess({
      storageKey: "chat-attachments/ff/does-not-exist.pdf",
      userId: ownerId,
    });
    expect(allowed).toBeNull();
  });

  it("does not resolve a key from another thread's conversation id", async () => {
    // Guards against a confused-deputy style bug: the returned id must be the
    // conversation that actually owns the attachment.
    const allowed = await authorizeAttachmentAccess({
      storageKey: KEY,
      userId: ownerId,
    });
    expect(allowed).not.toBe(otherConversationId);
  });
});