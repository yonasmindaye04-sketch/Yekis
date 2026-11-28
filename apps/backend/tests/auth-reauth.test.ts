import { afterAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { decodeJwt, SignJWT } from "jose";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { logger } from "../src/lib/logger.js";
import { ApiClient } from "../../frontend/src/api/client";

/**
 * OPS-08 — Password re-authentication refreshes `auth_time` and `amr`, records
 * USER_REAUTH_FAILED / USER_REAUTHENTICATED audits without logging secrets,
 * shares loginLimiter lockout across /reauth and /login, and preserves form
 * input end-to-end when the client retries after 401 REAUTH_REQUIRED.
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
  return {
    staleTime,
    token: await new SignJWT({
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
      .sign(secret),
  };
}

describe("OPS-08: POST /api/v1/auth/reauth refreshes step-up credentials", () => {
  it("audits failure + success, never logs passwords, mints fresh auth_time, and completes E2E retry with form intact", async () => {
    const password = `StaffPass!${STAMP}`;
    const wrongPassword = `WrongPass!${STAMP}`;
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
    const target = await prisma.user.create({
      data: {
        email: `ops08-target-${STAMP}@test.et`,
        phone: `+25197${String(9000000 + (STAMP % 900000))}`,
        passwordHash,
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(staff.id, target.id);

    const { staleTime, token: staleAccessToken } = await makeStaleToken(staff);

    const logChunks: string[] = [];
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(((...args: unknown[]) => {
      logChunks.push(JSON.stringify(args));
    }) as never);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(((...args: unknown[]) => {
      logChunks.push(JSON.stringify(args));
    }) as never);

    try {
      // Wrong password returns 401 INVALID_CREDENTIALS and logs USER_REAUTH_FAILED
      const badRes = await request(app)
        .post("/api/v1/auth/reauth")
        .set("Authorization", `Bearer ${staleAccessToken}`)
        .send({ password: wrongPassword });
      expect(badRes.status).toBe(401);
      expect(badRes.body.error).toBe("INVALID_CREDENTIALS");

      // E2E via ApiClient against real Express app (>5m idle -> 401 REAUTH_REQUIRED -> dialog -> /reauth -> retry)
      const draftForm = { reason: "Confirming user suspension after idle dialog reauth" };
      const client = new ApiClient();
      client.setSession({ accessToken: staleAccessToken, refreshToken: "rt-initial" });

      let dialogOpened = 0;
      const supertestFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === "string" ? input : input.toString();
        const parsedPath = urlStr.startsWith("http") ? new URL(urlStr).pathname : urlStr;
        const headers = (init?.headers ?? {}) as Record<string, string>;
        const method = (init?.method ?? "GET").toLowerCase() as "get" | "post" | "patch";
        const req = request(app)[method](parsedPath);
        for (const [k, v] of Object.entries(headers)) {
          req.set(k, v);
        }
        const res = init?.body ? await req.send(init.body as string) : await req;
        return new Response(JSON.stringify(res.body), {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      vi.stubGlobal("fetch", supertestFetch);

      client.setReauthHandler(async () => {
        dialogOpened += 1;
        await client.reauthenticate(password);
        return true;
      });

      const suspended = await client.adminSuspendUser(target.id, draftForm.reason);
      expect(dialogOpened).toBe(1);
      expect(suspended.isSuspended).toBe(true);
      expect(draftForm.reason).toBe("Confirming user suspension after idle dialog reauth");

      const freshJwt = client.getToken()!;
      const claims = decodeJwt(freshJwt);
      expect(typeof claims.auth_time).toBe("number");
      expect((claims.auth_time as number)).toBeGreaterThan(staleTime);

      const audits = await prisma.auditLog.findMany({
        where: { userId: staff.id, eventType: { in: ["USER_REAUTH_FAILED", "USER_REAUTHENTICATED"] } },
        orderBy: { createdAt: "asc" },
      });
      expect(audits.map((a) => a.eventType)).toEqual([
        "USER_REAUTH_FAILED",
        "USER_REAUTHENTICATED",
      ]);

      const serializedLogs = logChunks.join("\n");
      expect(serializedLogs).not.toContain(password);
      expect(serializedLogs).not.toContain(wrongPassword);
    } finally {
      vi.unstubAllGlobals();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    }
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

  it("shares the loginLimiter budget across POST /api/v1/auth/reauth and POST /api/v1/auth/login", async () => {
    const password = `LimitPass!${STAMP}`;
    const user = await prisma.user.create({
      data: {
        email: `ops08-limit-${STAMP}@test.et`,
        phone: `+25195${String(9000000 + (STAMP % 900000))}`,
        passwordHash: await hashPassword(password),
        role: "CLIENT",
        staffRole: "ADMIN",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(user.id);

    const { accessToken } = await createAuthTokens(
      { id: user.id, role: "CLIENT", ucid: null, staffRole: "ADMIN" },
      ["pwd"],
    );

    // Verify /reauth and /login share the exact same loginLimiter counter:
    // RateLimit-Remaining decrements across /reauth -> /login until 429 fires.
    const r1 = await request(app)
      .post("/api/v1/auth/reauth")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password: "wrong" });
    expect(r1.status).toBe(401);
    const remAfterReauth = Number(r1.headers["ratelimit-remaining"]);

    const r2 = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: user.email, password: "wrong" });
    expect(r2.status).toBe(401);
    const remAfterLogin = Number(r2.headers["ratelimit-remaining"]);
    expect(remAfterLogin).toBe(remAfterReauth - 1);

    let blockedStatus = 0;
    let blockedError = "";
    for (let i = 0; i < remAfterLogin + 2; i += 1) {
      const r = await request(app)
        .post("/api/v1/auth/reauth")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ password });
      if (r.status === 429) {
        blockedStatus = r.status;
        blockedError = r.body.error;
        break;
      }
    }
    expect(blockedStatus).toBe(429);
    expect(blockedError).toBe("TOO_MANY_LOGIN_ATTEMPTS");
  });
});
