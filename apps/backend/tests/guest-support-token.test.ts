import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";
import { env } from "../src/config/env.js";
import {
  issueGuestSupportToken,
  isGuestSupportToken,
  GUEST_SUPPORT_TOKEN_TYPE,
  GUEST_SUPPORT_TOKEN_TTL,
} from "../src/modules/chat/guestSupportToken.js";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

async function decode(token: string) {
  const { payload } = await import("jose").then((jose) =>
    jose.jwtVerify(token, secret),
  );
  return payload;
}

describe("Guest support token issuance", () => {
  it("carries the guest-support discriminator and pins one conversation", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    const payload = await decode(token);

    expect(payload.sub).toBe("guest_user_1");
    expect(payload.typ).toBe(GUEST_SUPPORT_TOKEN_TYPE);
    expect(payload.conversationId).toBe("conv_abc");
    expect(isGuestSupportToken(payload as Record<string, unknown>)).toBe(true);
  });

  it("does NOT carry role or staff claims", async () => {
    const token = await issueGuestSupportToken({
      userId: "guest_user_1",
      conversationId: "conv_abc",
    });
    const payload = await decode(token);

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
    const payload = await decode(token);
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
    // Sanity-check the configured TTL is a bounded window, not "never".
    expect(GUEST_SUPPORT_TOKEN_TTL).toBe("12h");
  });

  it("is signed, so a hand-forged token with a different secret is rejected", async () => {
    const forged = await new SignJWT({
      typ: GUEST_SUPPORT_TOKEN_TYPE,
      conversationId: "conv_someone_elses",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("victim_user")
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("not-the-real-secret"));

    const { jwtVerify } = await import("jose");
    await expect(jwtVerify(forged, secret)).rejects.toBeTruthy();
  });
});

describe("Guest support token classification", () => {
  it("treats an ordinary session token as NOT a guest token", () => {
    // A normal access token has no `typ` claim.
    expect(isGuestSupportToken({ role: "CLIENT" })).toBe(false);
    expect(isGuestSupportToken({})).toBe(false);
  });

  it("treats a token with a different typ as NOT a guest token", () => {
    expect(isGuestSupportToken({ typ: "refresh" })).toBe(false);
  });
});