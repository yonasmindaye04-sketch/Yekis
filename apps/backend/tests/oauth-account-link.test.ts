import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/lib/password.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import {
  loginWithOAuthProfile,
  linkGoogleToUser,
  unlinkGoogleFromUser,
  OAuthEmailMismatchError,
  OAuthLinkConflictError,
  type OAuthProfile,
} from "../src/modules/auth/oauth.service.js";
import { AccountLinkRequiredError } from "../src/modules/auth/identity.js";

/**
 * Why this suite exists
 * --------------------
 * A member whose account owns a password could not sign in with Google at
 * all. The lookup was by EMAIL only, so a provider credential that had been
 * linked deliberately was never read back, and the password check refused the
 * match with `409 ACCOUNT_LINK_REQUIRED` — a message that pointed at an
 * account settings screen that did not exist. Linking Google was therefore
 * impossible, and so was signing in with it.
 *
 * Two things are asserted here, and they pull in opposite directions:
 *
 *   1. a Google credential that was linked DELIBERATELY signs in;
 *   2. a Google credential that merely MATCHES an address never does.
 *
 * The second is the one that protects the account. Anyone can register an
 * address they do not own — Yekis does not require the mailbox to be proven
 * before an account exists — so "the address matches" is not evidence of
 * anything. Only the credential itself is.
 */

const app: Express = buildApp();
const STAMP = Date.now();
let phoneCounter = 0;

function nextPhone(): string {
  phoneCounter += 1;
  return `+2519${String(70000000 + ((STAMP + phoneCounter) % 9000000))}`;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { contains: "oauth-link-test" } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

/**
 * A password-owned account — the shape the founder's account has, and the
 * shape every member who signed up with a password has.
 */
async function makePasswordUser(overrides: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: {
      email: `oauth-link-test-${STAMP}-${Math.random()
        .toString(36)
        .slice(2, 8)}@test.et`,
      phone: nextPhone(),
      passwordHash: await hashPassword("not-a-real-password"),
      passwordSetAt: new Date(),
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
      ...overrides,
    } as never,
  });
}

function googleProfile(email: string, providerId: string): OAuthProfile {
  return {
    provider: "GOOGLE",
    providerId,
    email: email.trim().toLowerCase(),
    name: "Test Member",
  };
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("a Google credential that was linked deliberately signs in", () => {
  it("signs in a password account whose Google was linked from Settings", async () => {
    const user = await makePasswordUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: "g-linked-1" },
    });

    const session = await loginWithOAuthProfile(
      googleProfile(user.email, "g-linked-1"),
    );

    expect(session.accessToken).toBeTruthy();
    expect(session.user.id).toBe(user.id);
  });

  it("keeps the account's own address when the provider's address has changed", async () => {
    const user = await makePasswordUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: "g-linked-moved" },
    });

    await loginWithOAuthProfile(
      googleProfile("moved-address@test.et", "g-linked-moved"),
    );

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.email).toBe(user.email);
  });
});

describe("a matching address is never enough when unverified, but auto-links when verified", () => {
  it("refuses an unverified password account with no Google link", async () => {
    const user = await makePasswordUser({ emailVerified: false });

    await expect(
      loginWithOAuthProfile(googleProfile(user.email, "g-unlinked-1")),
    ).rejects.toThrow(AccountLinkRequiredError);
  });

  it("auto-links Google and signs in when the password account email is verified", async () => {
    const user = await makePasswordUser({ emailVerified: true });

    const session = await loginWithOAuthProfile(
      googleProfile(user.email, "g-autolink-verified"),
    );

    expect(session.accessToken).toBeTruthy();
    expect(session.user.id).toBe(user.id);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBe("g-autolink-verified");
  });

  it("refuses to overwrite a different Google account even when email is verified", async () => {
    const user = await makePasswordUser({
      emailVerified: true,
      googleId: "g-already-bound",
    });

    await expect(
      loginWithOAuthProfile(googleProfile(user.email, "g-different-sub")),
    ).rejects.toThrow();

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBe("g-already-bound");
  });

  it("writes nothing onto the account it refused", async () => {
    const user = await makePasswordUser();

    await expect(
      loginWithOAuthProfile(googleProfile(user.email, "g-unlinked-3")),
    ).rejects.toThrow(AccountLinkRequiredError);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBeNull();
    expect(after?.emailVerified).toBe(false);
  });

  it("never overwrites a credential the account is already bound to", async () => {
    // A provider account can change its address, and the address it released
    // can then be registered by somebody else. The account belongs to the
    // credential it was linked to, not to whoever shows up with the same
    // address later.
    const user = await makePasswordUser({
      passwordSetAt: null,
      emailVerified: true,
      googleId: "g-original",
    });

    await expect(
      loginWithOAuthProfile(googleProfile(user.email, "g-recycled")),
    ).rejects.toThrow();

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBe("g-original");
  });
});

describe("linking Google to the account that is already signed in", () => {
  it("binds the credential to that account", async () => {
    const user = await makePasswordUser();

    const result = await linkGoogleToUser(
      user.id,
      googleProfile(user.email, "g-link-1"),
    );

    expect(result).toEqual({ linked: true, alreadyLinked: false });
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBe("g-link-1");
  });

  it("is idempotent", async () => {
    const user = await makePasswordUser();
    await linkGoogleToUser(user.id, googleProfile(user.email, "g-link-2"));

    const again = await linkGoogleToUser(
      user.id,
      googleProfile(user.email, "g-link-2"),
    );

    expect(again.alreadyLinked).toBe(true);
  });

  it("refuses a Google address that is not the account's own", async () => {
    // Linking adds a CREDENTIAL. It must never become a way to attach a
    // second mailbox — and with it a second destination for transactional
    // mail and a second KYC subject — to an account that already has one.
    const user = await makePasswordUser();

    await expect(
      linkGoogleToUser(user.id, googleProfile("someone-else@test.et", "g-link-3")),
    ).rejects.toThrow(OAuthEmailMismatchError);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBeNull();
  });

  it("refuses a credential that already belongs to another account", async () => {
    const owner = await makePasswordUser();
    await prisma.user.update({
      where: { id: owner.id },
      data: { googleId: "g-shared" },
    });
    const other = await makePasswordUser();

    await expect(
      linkGoogleToUser(other.id, googleProfile(other.email, "g-shared")),
    ).rejects.toThrow(OAuthLinkConflictError);

    const after = await prisma.user.findUnique({ where: { id: other.id } });
    expect(after?.googleId).toBeNull();
  });
});

describe("unlinking Google", () => {
  it("removes the credential when another way in remains", async () => {
    const user = await makePasswordUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: "g-unlink-1" },
    });

    const result = await unlinkGoogleFromUser(user.id);

    expect(result.unlinked).toBe(true);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBeNull();
  });

  it("refuses to remove the last way into the account", async () => {
    const user = await makePasswordUser({
      passwordSetAt: null,
      emailVerified: false,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: "g-unlink-2" },
    });

    await expect(unlinkGoogleFromUser(user.id)).rejects.toThrow(
      OAuthLinkConflictError,
    );

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleId).toBe("g-unlink-2");
  });
});

describe("the HTTP surface", () => {
  it("GET /identities needs a session", async () => {
    await request(app).get("/api/v1/auth/identities").expect(401);
  });

  it("GET /identities says what is linked without leaking the provider ids", async () => {
    const user = await makePasswordUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: "g-identities" },
    });
    const { accessToken } = await createAuthTokens(user, ["pwd"]);

    const res = await request(app)
      .get("/api/v1/auth/identities")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.google).toBe(true);
    expect(res.body.passwordSet).toBe(true);
    expect(res.body.emailVerified).toBe(false);
    // The provider id is the handle the member is impersonated by at Google.
    // It must never reach the browser.
    expect(res.body).not.toHaveProperty("googleId");
    expect(JSON.stringify(res.body)).not.toContain("g-identities");
  });

  it("POST /oauth/google/link needs a session", async () => {
    await request(app)
      .post("/api/v1/auth/oauth/google/link")
      .send({ idToken: "x".repeat(30) })
      .expect(401);
  });

  it("POST /oauth/google/link refuses a session that is not strong", async () => {
    // A provider session is not a strong factor: a session opened with one
    // must not be enough to change how the account gets in.
    const user = await makePasswordUser();
    const { accessToken } = await createAuthTokens(user, ["oauth"]);

    const res = await request(app)
      .post("/api/v1/auth/oauth/google/link")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ idToken: "x".repeat(30) })
      .expect(403);

    expect(res.body.error).toBe("STEP_UP_REQUIRED");
  });

  it("POST /oauth/google/link answers rather than falling over on an unverifiable credential", async () => {
    const user = await makePasswordUser();
    const { accessToken } = await createAuthTokens(user, ["pwd"]);

    const res = await request(app)
      .post("/api/v1/auth/oauth/google/link")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ idToken: "not-a-real-id-token-but-long-enough" });

    // No client id is configured in the test environment, so the credential
    // cannot be verified and the route must say so — never 500.
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("NOT_CONFIGURED");
  });
});
