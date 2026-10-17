import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import type { Express } from "express";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { loginUser, refreshSession, resetPassword, createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * "Log out" used to delete two localStorage keys and nothing else.
 *
 * There was no /logout route, and completing a password reset rewrote
 * passwordHash without touching sessionVersion. Both token types carry the
 * sessionVersion they were minted at and both are re-checked against the stored
 * value on every use -- but nothing in either flow ever moved that number, so
 * the revocation machinery existed and nothing ever pulled the lever.
 *
 * The consequence is identical in both cases and it is the whole problem: a
 * stolen refresh token survives for the remainder of JWT_REFRESH_TTL (default
 * 30 days). Resetting the password -- the documented remedy for "I think
 * someone has my account" -- handed the account straight back to whoever
 * triggered it.
 *
 * Every test here holds a real refresh token across the revocation and then
 * tries to use it. Asserting that a version counter went up would prove
 * nothing; the token itself has to stop working.
 */

const app: Express = buildApp();
const STAMP = Date.now();
const EMAIL = `session-revoke-${STAMP}@test.et`;

/**
 * Test credentials, built at run time instead of written as literals.
 *
 * A previous revision assigned these as `const PASSWORD = "..."`, which is
 * byte-for-byte the shape of a hardcoded credential. It was not one — the
 * value was derived from Date.now() and existed only inside one vitest
 * process — but it read identically to a secret scanner, and GitGuardian
 * flagged it as a generic password twice. A test suite that trains its
 * reviewers to dismiss alerts is worse than one that never raises them, so
 * the literal is gone rather than allowlisted.
 *
 * Returns something fresh per call so the "reset changed the password" case
 * stays genuinely different.
 */
const credential = (tag: string) =>
  `${tag}.${STAMP}.${Math.random().toString(36).slice(2, 10)}`;

let userId = "";
let password = "";
let replacementPassword = "";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: EMAIL }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } }),
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function makeUser() {
  const created = await prisma.user.create({
    data: {
      email: EMAIL,
      phone: `+2519${String(70000000 + (STAMP % 9000000))}`,
      passwordHash: await argon2.hash(password),
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { wallet: true },
  });
  userId = created.id;
  return created;
}

/** Mints a reset token directly; the mail-delivery path is not under test. */
async function mintResetToken() {
  const token = `reset-${STAMP}-${Math.random().toString(36).slice(2, 10)}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
  });
  return token;
}

async function storedSessionVersion(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ sessionVersion: number }>>`
    SELECT "sessionVersion" FROM "User" WHERE id = ${userId}
  `;
  return rows[0]?.sessionVersion ?? 0;
}

beforeEach(async () => {
  await cleanup();
  // Fresh values per test so "the reset changed the password" is a real
  // difference and not two names for the same string.
  password = credential("original");
  replacementPassword = credential("replacement");
  await makeUser();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("the control: an unrevoked session keeps working", () => {
  it("refreshes successfully and rotates its token", async () => {
    const session = await loginUser({ identifier: EMAIL, password });
    const again = await refreshSession(session.refreshToken);
    expect(again.accessToken).toBeTruthy();
    expect(again.refreshToken).toBeTruthy();
  });
});

describe("a password reset revokes the sessions it was supposed to evict", () => {
  it("kills a refresh token minted before the reset", async () => {
    const session = await loginUser({ identifier: EMAIL, password });

    // Prove the token is live first, so a later failure cannot be explained by
    // the token having been invalid all along.
    expect((await refreshSession(session.refreshToken)).accessToken).toBeTruthy();

    const token = await mintResetToken();
    await resetPassword(token, replacementPassword);

    // The stolen copy must not survive. This is the assertion the hardening
    // exists for; before the fix it returned a fresh access token.
    await expect(refreshSession(session.refreshToken)).rejects.toThrow();

    // The legitimate holder is not locked out.
    const after = await loginUser({ identifier: EMAIL, password: replacementPassword });
    expect(after.accessToken).toBeTruthy();
  });

  it("kills the access token the reset invalidated, via the real middleware", async () => {
    const session = await loginUser({ identifier: EMAIL, password });

    const token = await mintResetToken();
    await resetPassword(token, replacementPassword);

    // requireAuth re-reads sessionVersion on every request, so the previously
    // valid access token must now be refused at the HTTP boundary.
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${session.accessToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("SESSION_REVOKED");
  });

  it("revokes on reset even when the same user has several live sessions", async () => {
    const phone = await loginUser({ identifier: EMAIL, password });
    const laptop = await loginUser({ identifier: EMAIL, password });

    const token = await mintResetToken();
    await resetPassword(token, replacementPassword);

    // sessionVersion is per-user, so there is no "which session" question:
    // all of them die. Asserted because a per-token revocation would make this
    // the only place a second device could survive.
    await expect(refreshSession(phone.refreshToken)).rejects.toThrow();
    await expect(refreshSession(laptop.refreshToken)).rejects.toThrow();
  });
});

describe("logout revokes server-side, not just in the browser", () => {
  it("POST /logout exists and is authenticated", async () => {
    const session = await loginUser({ identifier: EMAIL, password });

    // Unauthenticated logout must not be a route that silently 404s.
    const anon = await request(app).post("/api/v1/auth/logout");
    expect(anon.status).toBe(401);

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${session.accessToken}`);
    expect(res.status).toBe(200);
  });

  it("kills a refresh token minted before logout", async () => {
    const session = await loginUser({ identifier: EMAIL, password });
    const versionBefore = await storedSessionVersion();

    expect((await refreshSession(session.refreshToken)).accessToken).toBeTruthy();

    await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    expect(await storedSessionVersion(), "logout must move the version").toBeGreaterThan(
      versionBefore,
    );

    // The property that matters: the token is dead after logout.
    await expect(refreshSession(session.refreshToken)).rejects.toThrow();

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${session.accessToken}`);
    expect(me.status).toBe(401);

    // Logging back in works — revocation is not a lockout.
    const again = await loginUser({ identifier: EMAIL, password });
    expect(again.accessToken).toBeTruthy();
  });

  it("lets a fresh session work after logout", async () => {
    const first = await createAuthTokens({ id: userId, role: "CLIENT", ucid: null }, ["pwd"]);

    await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${first.accessToken}`)
      .expect(200);

    // This is the sequencing a user actually hits: log out, log back in.
    const second = await loginUser({ identifier: EMAIL, password });
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${second.accessToken}`);
    expect(me.status).toBe(200);
  });
});
