import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { completeTelegramLink } from "../src/modules/auth/telegram-code.service.js";

/**
 * Three settings features over the real assembled app:
 *
 *   1. the account-type switch (client / freelancer / both),
 *   2. verification of the email address already on the account,
 *   3. connecting a Telegram chat to the signed-in account.
 *
 * They are asserted through HTTP rather than against the service functions,
 * because the interesting failures are in the WIRING: a route that is not
 * mounted, a guard that is missing, a body that never reaches the service. A
 * unit test on the service would stay green through all of those.
 */

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];
const emails: string[] = [];
let seq = 0;

function uniqueEmail(label: string) {
  seq += 1;
  const email = `acct-${label}-${STAMP}-${seq}@test.et`;
  emails.push(email);
  return email;
}

function uniquePhone() {
  seq += 1;
  return `+2519${String(94000000 + (STAMP % 1000) * 100 + seq)}`;
}

async function makeUser(
  label: string,
  options: { role?: "CLIENT" | "FREELANCER" | "BOTH"; emailVerified?: boolean } = {},
) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail(label),
      phone: uniquePhone(),
      passwordHash: "not-a-real-hash",
      role: options.role ?? "CLIENT",
      emailVerified: options.emailVerified ?? false,
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  userIds.push(user.id);
  return user;
}

async function tokenFor(
  userId: string,
  role: "CLIENT" | "FREELANCER" | "BOTH",
  amr: ("pwd" | "tg_web" | "oauth")[] = ["pwd"],
) {
  const { accessToken } = await createAuthTokens(
    { id: userId, role, ucid: null, sessionVersion: 0 },
    amr,
  );
  return accessToken;
}

afterAll(async () => {
  const ids = userIds.length ? userIds : ["__none__"];
  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.emailVerificationCode.deleteMany({
    where: { email: { in: emails.length ? emails : ["__none__"] } },
  });
  await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe("Account type switch", () => {
  it("moves a client account to freelancer and re-stamps the token", async () => {
    const user = await makeUser("role-switch");
    const token = await tokenFor(user.id, "CLIENT");

    const res = await request(app)
      .post("/api/v1/auth/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "FREELANCER" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("FREELANCER");
    expect(res.body.from).toBe("CLIENT");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    // The row moved.
    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    expect(after?.role).toBe("FREELANCER");

    // The audit log records the transition — it is a change of what the
    // account may do on the platform, and disputes turn on it.
    const audit = await prisma.auditLog.findFirst({
      where: { userId: user.id, eventType: "USER_ROLE_SWITCHED" },
      select: { metadata: true },
    });
    expect(audit).toBeTruthy();

    // The NEW token carries the new role, so the very next request agrees
    // with the database. A token that still said CLIENT would let the member
    // hire as a freelancer and be refused by every freelancer-only route.
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("FREELANCER");
  });

  it("refuses an unauthenticated role change", async () => {
    const res = await request(app)
      .post("/api/v1/auth/role")
      .send({ role: "FREELANCER" });
    expect(res.status).toBe(401);
  });

  it("refuses a weak credential (Telegram only) — step-up is required", async () => {
    const user = await makeUser("role-stepup");
    const token = await tokenFor(user.id, "CLIENT", ["tg_web"]);

    const res = await request(app)
      .post("/api/v1/auth/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "FREELANCER" });

    expect(res.status).toBe(403);
    expect(res.body.code ?? res.body.error).toBe("STEP_UP_REQUIRED");

    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    expect(after?.role).toBe("CLIENT");
  });

  it("rejects a role the platform does not have", async () => {
    const user = await makeUser("role-invalid");
    const token = await tokenFor(user.id, "CLIENT");

    const res = await request(app)
      .post("/api/v1/auth/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "ADMIN" });

    expect(res.status).toBe(400);
  });

  it("treats a switch to the role already held as a no-op", async () => {
    const user = await makeUser("role-noop");
    const token = await tokenFor(user.id, "CLIENT");

    const res = await request(app)
      .post("/api/v1/auth/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "CLIENT" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("CLIENT");
    expect(res.body.from).toBe("CLIENT");

    const audit = await prisma.auditLog.findFirst({
      where: { userId: user.id, eventType: "USER_ROLE_SWITCHED" },
      select: { id: true },
    });
    expect(audit).toBeNull();
  });
});

describe("Account email verification", () => {
  it("sends a code to the address on the account and marks it verified", async () => {
    const user = await makeUser("email-verify");
    const token = await tokenFor(user.id, "CLIENT");

    const start = await request(app)
      .post("/api/v1/auth/email/verification/start")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(start.status).toBe(200);
    expect(start.body.sent).toBe(true);
    // The address is read from the account, never from the request body.
    expect(start.body.email).toBe(user.email);

    // The code itself is only disclosed in development and in the test
    // suite; in production it never leaves the mail transport.
    expect(start.body.devCode).toMatch(/^\d{6}$/);

    const check = await request(app)
      .post("/api/v1/auth/email/verification/check")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: start.body.devCode });

    expect(check.status).toBe(200);
    expect(check.body.verified).toBe(true);

    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true, emailVerifiedAt: true },
    });
    expect(after?.emailVerified).toBe(true);
    expect(after?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("refuses to start a verification for an address that is already verified", async () => {
    const user = await makeUser("email-already", { emailVerified: true });
    const token = await tokenFor(user.id, "CLIENT");

    const res = await request(app)
      .post("/api/v1/auth/email/verification/start")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("EMAIL_ALREADY_VERIFIED");
  });

  it("refuses a code that was issued for somebody else", async () => {
    const user = await makeUser("email-wrong-code");
    const token = await tokenFor(user.id, "CLIENT");

    await request(app)
      .post("/api/v1/auth/email/verification/start")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const res = await request(app)
      .post("/api/v1/auth/email/verification/check")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_CODE");

    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    expect(after?.emailVerified).toBe(false);
  });

  it("requires a signed-in member", async () => {
    const res = await request(app)
      .post("/api/v1/auth/email/verification/start")
      .send({});
    expect(res.status).toBe(401);
  });
});

describe("Telegram account linking", () => {
  it("mints a link session, and the bot binds the chat to that account", async () => {
    const user = await makeUser("tg-link");
    const token = await tokenFor(user.id, "CLIENT");

    const start = await request(app)
      .post("/api/v1/auth/telegram/link/start")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(start.status).toBe(200);
    expect(start.body.sid).toBeTruthy();
    expect(start.body.botUrl).toContain(start.body.sid);

    // Before the bot confirms it, the link is still pending.
    const pending = await request(app)
      .get(`/api/v1/auth/telegram/link/${start.body.sid}/status`)
      .set("Authorization", `Bearer ${token}`);
    expect(pending.status).toBe(200);
    expect(pending.body.status).toBe("pending");

    // The bot side of the handshake.
    const telegramId = BigInt(7000000000000000000 + (STAMP % 1000));
    const bound = await completeTelegramLink({
      sid: start.body.sid,
      telegramUserId: telegramId,
    });
    expect(bound.userId).toBe(user.id);

    const linked = await request(app)
      .get(`/api/v1/auth/telegram/link/${start.body.sid}/status`)
      .set("Authorization", `Bearer ${token}`);
    expect(linked.body.status).toBe("linked");

    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { telegramUserId: true },
    });
    expect(after?.telegramUserId?.toString()).toBe(telegramId.toString());
  });

  it("will not let one member read another member's link session", async () => {
    const owner = await makeUser("tg-owner");
    const stranger = await makeUser("tg-stranger");
    const ownerToken = await tokenFor(owner.id, "CLIENT");
    const strangerToken = await tokenFor(stranger.id, "CLIENT");

    const start = await request(app)
      .post("/api/v1/auth/telegram/link/start")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    const peek = await request(app)
      .get(`/api/v1/auth/telegram/link/${start.body.sid}/status`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(peek.status).toBe(200);
    // "expired" rather than a 403: the endpoint must not confirm that
    // somebody else's session id exists.
    expect(peek.body.status).toBe("expired");
  });

  it("refuses to bind a Telegram id that already belongs to another account", async () => {
    const owner = await makeUser("tg-conflict-owner", { role: "BOTH" });
    const other = await makeUser("tg-conflict-other");
    const ownerToken = await tokenFor(owner.id, "BOTH");
    const otherToken = await tokenFor(other.id, "CLIENT");

    const telegramId = BigInt(7100000000000000000 + (STAMP % 1000));

    // The first account takes the Telegram id.
    const first = await request(app)
      .post("/api/v1/auth/telegram/link/start")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    await completeTelegramLink({ sid: first.body.sid, telegramUserId: telegramId });

    // The second account must not be able to take the same id — that would
    // silently merge two accounts into one.
    const second = await request(app)
      .post("/api/v1/auth/telegram/link/start")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({});
    await expect(
      completeTelegramLink({ sid: second.body.sid, telegramUserId: telegramId }),
    ).rejects.toThrow(/TELEGRAM_ALREADY_LINKED/);

    const after = await prisma.user.findUnique({
      where: { id: other.id },
      select: { telegramUserId: true },
    });
    expect(after?.telegramUserId).toBeNull();
  });
});
