import { describe, it, expect } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../src/config/env.js";
import {
  issueGuestSupportToken,
  isGuestSupportToken,
  verifyGuestSupportToken,
  GUEST_SUPPORT_TOKEN_TYPE,
  GUEST_SUPPORT_TOKEN_AUDIENCE,
  GUEST_SUPPORT_TOKEN_TTL,
} from "../src/modules/chat/guestSupportToken.js";

/**
 * F-01 — guest tokens are minted, classified and verified on their own key.
 *
 * The `decode` helper below uses the GUEST key. That is the point of this file:
 * before F-01 these tokens were signed with JWT_ACCESS_SECRET, so `decode` used
 * the access key and every assertion passed while the tokens were, in fact,
 * indistinguishable from a session.
 */

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
// Mirrors the dev fallback in guestSupportToken.ts so this suite works whether
// or not GUEST_SUPPORT_JWT_SECRET is configured locally.
const guestSecret = new TextEncoder().encode(
  env.GUEST_SUPPORT_JWT_SECRET ||
    "yekis-dev-only-guest-support-secret-not-for-prod",
);

async function decodeGuest(token: string) {
  const { payload } = await jwtVerify(token, guestSecret, {
    audience: GUEST_SUPPORT_TOKEN_AUDIENCE,
  });
  return payload;
}

describe("F-01 guest tokens are signed on a separate key", () => {
  it("carries the guest-support discriminator and pins one conversation", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    const payload = await decodeGuest(token);

    expect(payload.sub).toBe("guest_user_1");
    expect(payload.typ).toBe(GUEST_SUPPORT_TOKEN_TYPE);
    expect(payload.aud).toBe(GUEST_SUPPORT_TOKEN_AUDIENCE);
    expect(payload.conversationId).toBe("conv_abc");
    expect(isGuestSupportToken(payload as Record<string, unknown>)).toBe(true);
  });

  it("does NOT verify against JWT_ACCESS_SECRET — the F-01 regression guard", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });

    // This single assertion is what F-01 was. A guest token that verifies with
    // the access key is a session, whatever its claims say.
    await expect(jwtVerify(token, accessSecret)).rejects.toBeTruthy();
  });

  it("does NOT carry role or staff claims", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    const payload = await decodeGuest(token);

    // A guest token must never be mistakable for a session, or a middleware
    // that trusted `role`/`staffRole` would grant staff access.
    expect(payload.role).toBeUndefined();
    expect(payload.staffRole).toBeUndefined();
    expect(payload.staffRole ?? null).toBeNull();
  });

  it("expires", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    const payload = await decodeGuest(token);
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
    // Sanity-check the configured TTL is a bounded window, not "never".
    expect(GUEST_SUPPORT_TOKEN_TTL).toBe("12h");
  });

  it("is signed, so a hand-forged token with a different secret is rejected", async () => {
    const forged = await new SignJWT({
      typ: GUEST_SUPPORT_TOKEN_TYPE,
      aud: GUEST_SUPPORT_TOKEN_AUDIENCE,
      conversationId: "conv_someone_elses",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("victim_user")
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("not-the-real-secret"));

    await expect(
      verifyGuestSupportToken(forged, "conv_someone_elses"),
    ).resolves.toBeNull();
  });
});

describe("F-01 guest token verification is scoped to one conversation", () => {
  it("accepts a token for the requested conversation", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    await expect(verifyGuestSupportToken(token, "conv_abc")).resolves.toEqual({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
  });

  it("refuses a token presented against a different conversation", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    await expect(verifyGuestSupportToken(token, "conv_someone_else")).resolves.toBeNull();
  });

  it("refuses a real access token on the guest verifier", async () => {
    // A session must not be able to satisfy a guest-only code path.
    const session = await new SignJWT({ role: "CLIENT", auth_time: 1, amr: ["pwd"] })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("real_user")
      .setExpirationTime("1h")
      .sign(accessSecret);

    await expect(verifyGuestSupportToken(session, "conv_abc")).resolves.toBeNull();
  });

  it("refuses garbage", async () => {
    await expect(verifyGuestSupportToken("not-a-token", "conv_abc")).resolves.toBeNull();
    await expect(verifyGuestSupportToken("", "conv_abc")).resolves.toBeNull();
  });
});

describe("Guest support token classification", () => {
  it("treats an ordinary session token as NOT a guest token", () => {
    // A normal access token has no `typ` and no guest `aud`.
    expect(isGuestSupportToken({ role: "CLIENT" })).toBe(false);
    expect(isGuestSupportToken({})).toBe(false);
  });

  it("treats a token with a different typ as NOT a guest token", () => {
    expect(isGuestSupportToken({ typ: "refresh" })).toBe(false);
  });

  it("treats either discriminator as a guest token", () => {
    // Defence in depth: a token is refused if EITHER marker is present, so a
    // partially-correct payload cannot slip past.
    expect(isGuestSupportToken({ typ: GUEST_SUPPORT_TOKEN_TYPE })).toBe(true);
    expect(isGuestSupportToken({ aud: GUEST_SUPPORT_TOKEN_AUDIENCE })).toBe(true);
  });
});