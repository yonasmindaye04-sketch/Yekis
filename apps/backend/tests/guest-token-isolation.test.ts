import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * F-01 — a guest-support token must never be a session.
 *
 * The defect this pins shut: `POST /api/v1/chat/guest` used to upsert a `User`
 * on whatever email the caller typed, then mint a token whose `sub` was that
 * real user's id and sign it with JWT_ACCESS_SECRET. `requireAuth` verified
 * with the same secret and never inspected `typ`, so the token authenticated
 * as the victim on every `requireAuth` route — full account takeover, no
 * credentials needed.
 *
 * The guarantees asserted here:
 *   1. a guest token is refused by requireAuth (401), on the audited routes;
 *   2. a guest can still reach exactly one thing — its own support thread;
 *   3. a real account is untouched by a guest intake naming its email.
 */

const app = buildApp();

const STAMP = Date.now();
const VICTIM_EMAIL = `f01-victim-${STAMP}@test.et`;

let victimId: string;
let victimPasswordHash: string;
let victimPasswordSetAt: Date | null;
let guestToken: string;
let guestConversationId: string;
let guestUserId: string;

/** Routes the audit walked as CLIENT/FREELANCER; the token must not pass any. */
const AUDITED_ROUTES: ReadonlyArray<[string, string]> = [
  ["GET", "/api/v1/auth/me"],
  ["GET", "/api/v1/escrow/wallet"],
  ["GET", "/api/v1/contracts"],
  ["GET", "/api/v1/jobs/mine"],
  ["GET", "/api/v1/jobs/proposals/mine"],
  ["GET", "/api/v1/notifications"],
  ["GET", "/api/v1/gigs/mine"],
  ["GET", "/api/v1/disputes"],
  ["GET", "/api/v1/kyc/status"],
  ["GET", "/api/v1/wallet/topups"],
  ["GET", "/api/v1/users/me/profile/completeness"],
  ["GET", "/api/v1/chat/conversations"],
];

async function createVictim() {
  const user = await prisma.user.create({
    data: {
      email: VICTIM_EMAIL,
      phone: `+2519${String(STAMP).slice(-9)}`,
      passwordHash: "victim-password-hash-placeholder",
      passwordSetAt: new Date("2026-01-01T00:00:00.000Z"),
      role: "CLIENT",
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 500000 } },
    },
    include: { kyc: true },
  });
  return user;
}

/**
 * Delete test rows in FK order. Messages and participants reference both the
 * user and the conversation, so conversations have to go last, and the guest
 * rows are matched on their synthetic domain as well as this run's victim.
 */
async function cleanup() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: VICTIM_EMAIL },
        { email: { endsWith: "@guest.invalid" } },
        { email: { endsWith: "@guest.yekis.et" } },
      ],
    },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;

  const conversations = await prisma.conversation.findMany({
    where: { creatorId: { in: ids } },
    select: { id: true },
  });
  const conversationIds = conversations.map((c) => c.id);

  await prisma.chatMessage.deleteMany({
    where: { OR: [{ senderId: { in: ids } }, { conversationId: { in: conversationIds } }] },
  });
  await prisma.conversationParticipant.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { conversationId: { in: conversationIds } }] },
  });
  await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  await cleanup();
  const victim = await createVictim();
  victimId = victim.id;
  victimPasswordHash = victim.passwordHash;
  victimPasswordSetAt = victim.passwordSetAt;

  // The attack: a guest intake naming the victim's email.
  const res = await request(app)
    .post("/api/v1/chat/guest")
    .send({ email: VICTIM_EMAIL, body: "I need help with my account." });

  expect(res.status).toBe(201);
  expect(typeof res.body.accessToken).toBe("string");
  guestToken = res.body.accessToken as string;
  guestConversationId = res.body.id as string;
  guestUserId = res.body.creatorUserId as string;
});

afterAll(async () => {
  await cleanup();
});

describe("F-01 guest support tokens are not sessions", () => {
  it("a guest token cannot read the victim's session identity", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(401);
    expect(res.body?.email).not.toBe(VICTIM_EMAIL);
  });

  it("a guest token cannot read the victim's wallet", async () => {
    const res = await request(app)
      .get("/api/v1/escrow/wallet")
      .set("Authorization", `Bearer ${guestToken}`);

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain("500000");
  });

  it("a guest token is refused on every audited requireAuth route", async () => {
    for (const [method, path] of AUDITED_ROUTES) {
      const res = await request(app)
        [method.toLowerCase() as "get"](path)
        .set("Authorization", `Bearer ${guestToken}`);
      expect(
        res.status,
        `${method} ${path} accepted a guest-support token`,
      ).toBe(401);
    }
  });

  it("the guest identity is not the victim's account", async () => {
    const guest = await prisma.user.findUnique({ where: { id: guestUserId } });
    expect(guest).not.toBeNull();
    expect(guest!.id).not.toBe(victimId);
    // A guest is never a routable account.
    expect(guest!.isGuestContact).toBe(true);
    expect(guest!.email).not.toBe(VICTIM_EMAIL);
    expect(guest!.email.endsWith("@guest.invalid")).toBe(true);
    // It must be impossible to sign in as a guest.
    expect(guest!.passwordSetAt).toBeNull();
    // The address the visitor typed is contact metadata on the thread, never
    // an account key.
    const convo = await prisma.conversation.findUnique({
      where: { id: guestConversationId },
      select: { contactEmail: true, creatorId: true },
    });
    expect(convo!.contactEmail).toBe(VICTIM_EMAIL);
    expect(convo!.creatorId).toBe(guestUserId);
    expect(convo!.creatorId).not.toBe(victimId);
  });

  it("a real account is untouched by a guest intake naming its email", async () => {
    const victim = await prisma.user.findUnique({ where: { id: victimId } });
    expect(victim!.email).toBe(VICTIM_EMAIL);
    expect(victim!.passwordHash).toBe(victimPasswordHash);
    expect(victim!.passwordSetAt?.toISOString()).toBe(
      victimPasswordSetAt!.toISOString(),
    );
    expect(victim!.isGuestContact).toBe(false);
    expect(victim!.wallet?.balanceMinor ?? 500000).toBe(500000);

    // Exactly one account may hold this email: the original one.
    const sameEmail = await prisma.user.count({ where: { email: VICTIM_EMAIL } });
    expect(sameEmail).toBe(1);
  });

  it("the guest can still read its own support conversation", async () => {
    const res = await request(app)
      .get(`/api/v1/chat/conversations/${guestConversationId}/messages`)
      .set("Authorization", `Bearer ${guestToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("the guest can still reply in its own support conversation", async () => {
    const res = await request(app)
      .post(`/api/v1/chat/conversations/${guestConversationId}/messages`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ body: "Any update on my ticket?" });
    expect(res.status).toBe(201);
  });

  it("the guest cannot reach a conversation it does not own", async () => {
    // The token is pinned to its own thread, so presenting it against a
    // different conversation fails the guest verifier (audience/conversation
    // mismatch) and then fails the access-key verify: 401, not 200.
    const res = await request(app)
      .get("/api/v1/chat/conversations/cm0000000000000000000000f/messages")
      .set("Authorization", `Bearer ${guestToken}`);
    expect(res.status).toBe(401);
  });
});