import { afterAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { SignJWT } from "jose";

/**
 * OPS-08 — Password re-authentication refreshes `auth_time` and `amr` for
 * `requireFreshAuth(...)` step-up endpoints without clearing the session.
 */
const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];

afterAll(async () => {
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

async function makeStaleToken(user: {
  id: string;
  role: string;
  staffRole: string | null;
  ucid: string | null;
}) {
  const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
  const staleTime = Math.floor(Date.now() / 1000) - 600;
  return new SignJWT({
    sub: user.id,
    role: user.role,
    ucid: user.ucid,
    staffRole: user.staffRole,
    session_version: 0,
    amr: ["pwd"],
    auth_time: staleTime,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(staleTime)
    .setExpirationTime("15m")
    .sign(secret);
}

describe("OPS-08: POST /api/v1/auth/reauth refreshes step-up credentials", () => {
  it("refuses wrong password with 401 INVALID_CREDENTIALS and mints fresh auth_time on valid password", async () => {
    const password = "StaffPass!2026";
    const passwordHash = await hashPassword(password);
    const staff = await prisma.user.create({
      data: {
        email: `ops08-staff-${STAMP}@test.et`,
        phone: `+25198${String(9000000 + (STAMP % 900000))}`,
        passwordHash,
        role: "CLIENT",
        staffRole: "ADMIN",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(staff.id);

    const staleAccessToken = await makeStaleToken(staff);

    // Step-up route rejects the >5m idle token with 401 REAUTH_REQUIRED
    const target = await prisma.user.create({
      data: {
        email: `ops08-target-${STAMP}@test.et`,
        phone: `+25197${String(9000000 + (STAMP % 900000))}`,
        passwordHash,
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(target.id);

    const beforeReauth = await request(app)
      .post(`/api/v1/admin/users/${target.id}/suspend`)
      .set("Authorization", `Bearer ${staleAccessToken}`)
      .send({ reason: "Suspending test user after idle session" });
    expect(beforeReauth.status).toBe(401);
    expect(beforeReauth.body.error).toBe("REAUTH_REQUIRED");

    // Wrong password returns 401 INVALID_CREDENTIALS (not REAUTH_REQUIRED)
    const badRes = await request(app)
      .post("/api/v1/auth/reauth")
      .set("Authorization", `Bearer ${staleAccessToken}`)
      .send({ password: "WrongPassword!" });
    expect(badRes.status).toBe(401);
    expect(badRes.body.error).toBe("INVALID_CREDENTIALS");

    // Correct password mints fresh tokens that pass requireFreshAuth(300)
    const okRes = await request(app)
      .post("/api/v1/auth/reauth")
      .set("Authorization", `Bearer ${staleAccessToken}`)
      .send({ password });
    expect(okRes.status).toBe(200);
    expect(okRes.body.accessToken).toBeTruthy();

    const retried = await request(app)
      .post(`/api/v1/admin/users/${target.id}/suspend`)
      .set("Authorization", `Bearer ${okRes.body.accessToken}`)
      .send({ reason: "Suspending test user after password reauth" });
    expect(retried.status).toBe(200);
    expect(retried.body.isSuspended).toBe(true);
  });

  it("returns 403 STEP_UP_REQUIRED when the signed-in account has no password set", async () => {
    const oauthOnly = await prisma.user.create({
      data: {
        email: `ops08-oauth-${STAMP}@test.et`,
        phone: `+25196${String(9000000 + (STAMP % 900000))}`,
        passwordHash: "",
        role: "CLIENT",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(oauthOnly.id);

    const session = await createAuthTokens(
      { id: oauthOnly.id, role: "CLIENT", ucid: null },
      ["google"],
    );
    const res = await request(app)
      .post("/api/v1/auth/reauth")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ password: "anything" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("STEP_UP_REQUIRED");
  });
});
