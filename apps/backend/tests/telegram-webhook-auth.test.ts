import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { createServer } from "node:http";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";

/**
 * The Telegram webhook is an unauthenticated endpoint by necessity — Telegram
 * cannot log in — so the shared secret it sends is the ONLY thing separating a
 * genuine update from anybody who found the URL.
 *
 * The check was conditional: `if (env.TELEGRAM_WEBHOOK_SECRET && ...)`. With
 * the secret unset, verification was skipped entirely and every update was
 * processed. Production is protected by assertProductionSafety refusing to boot
 * without one, so the exposure was dev and staging — the environments most
 * likely to be exposed and least likely to be watched. An unset secret is now a
 * hard failure rather than an open door.
 *
 * The same route family could also be redirected. POST /set-webhook took both a
 * URL and a secret token from the request body, so a hijacked admin session
 * could point every future bot update — including Mini App initData login
 * proofs, which are bearer credentials — at a host of its choosing, and
 * overwrite the secret with one it controlled.
 */

const STAMP = Date.now();
const SECRET = "a-webhook-secret-long-enough-for-the-check-0123456789";

const userIds: string[] = [];
let app: Express;
let server: ReturnType<typeof createServer>;

/**
 * Fresh module graph with the given env, so config/env re-reads process.env.
 *
 * "Unset" is expressed as an EMPTY STRING, not a deletion. config/env runs
 * dotenv itself, and dotenv re-populates any variable that is merely absent from
 * process.env — so deleting TELEGRAM_WEBHOOK_SECRET and re-importing got the
 * real value straight back out of .env. An empty string is falsy (which is what
 * the guard tests) and is left alone by dotenv.
 */
async function loadAppWith(envOverrides: Record<string, string>) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  vi.resetModules();
  try {
    const { buildApp } = await import("../src/app.js");
    return buildApp();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function makeAdmin(staffRole: string) {
  const seq = userIds.length;
  const created = await prisma.user.create({
    data: {
      email: `tgwebhook-${staffRole.toLowerCase()}-${STAMP}-${seq}@test.et`,
      phone: `+2519${String(20000000 + (STAMP % 9000000) + seq * 31)}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole,
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  userIds.push(created.id);

  const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");
  return (
    await createAuthTokens(
      { id: created.id, role: "CLIENT", ucid: null, staffRole },
      ["pwd"],
    )
  ).accessToken;
}

beforeEach(async () => {
  // Nothing to reset: each test builds its own app with its own env.
  void server;
});

afterAll(async () => {
  const ids = userIds.splice(0, userIds.length);
  if (ids.length) {
    await prisma.$transaction([
      prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
      prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
      prisma.user.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }
  await prisma.$disconnect();
});

describe("the webhook fails closed when no secret is configured", () => {
  it("refuses updates instead of accepting unauthenticated ones", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: "" });

    const res = await request(built)
      .post("/api/v1/telegram/webhook")
      .set("Content-Type", "application/json")
      .send({ update_id: 1, message: { text: "/start" } });

    // WEBHOOK_NOT_CONFIGURED, distinct from "Bot not initialized" so a
    // misconfiguration is not mistaken for a transient outage.
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("WEBHOOK_NOT_CONFIGURED");
  });

  it("refuses even when the caller supplies a header", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: "" });

    const res = await request(built)
      .post("/api/v1/telegram/webhook")
      .set("x-telegram-bot-api-secret-token", "anything-at-all")
      .send({ update_id: 2 });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("WEBHOOK_NOT_CONFIGURED");
  });
});

describe("with a secret configured, only Telegram gets through", () => {
  it("rejects a missing secret token", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: SECRET });

    const res = await request(built)
      .post("/api/v1/telegram/webhook")
      .send({ update_id: 3 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid secret token");
  });

  it("rejects a wrong secret token", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: SECRET });

    for (const wrong of ["", "x", `${SECRET}x`, SECRET.slice(0, -1), SECRET.toUpperCase()]) {
      const res = await request(built)
        .post("/api/v1/telegram/webhook")
        .set("x-telegram-bot-api-secret-token", wrong)
        .send({ update_id: 4 });
      expect(res.status, `secret ${JSON.stringify(wrong)} must be rejected`).toBe(401);
    }
  });

  it("accepts the correct secret and gets past authentication", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: SECRET });

    const res = await request(built)
      .post("/api/v1/telegram/webhook")
      .set("x-telegram-bot-api-secret-token", SECRET)
      .send({ update_id: 5, message: { text: "/start" } });

    // The control. Without it, 'everything is 401/503' would satisfy the tests
    // above for the wrong reason. Authentication passes; whatever happens next
    // (the bot is not started in tests, so 503 Bot not initialized) is a
    // different concern and proves the guard let it through.
    expect(res.status).not.toBe(401);
    expect(res.body.error).not.toBe("Invalid secret token");
    expect(res.body.error).not.toBe("WEBHOOK_NOT_CONFIGURED");
  });
});

describe("the webhook cannot be redirected", () => {
  it("refuses a body-supplied secret token", async () => {
    const built = await loadAppWith({
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      API_PUBLIC_URL: "https://api.yekis.com",
    });
    const token = await makeAdmin("ADMIN");

    const res = await request(built)
      .post("/api/v1/telegram/set-webhook")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://api.yekis.com/api/v1/telegram/webhook",
        secretToken: "an-attacker-chosen-secret",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("secretToken is not accepted");
  });

  it("refuses a non-public or non-https URL", async () => {
    const built = await loadAppWith({
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      API_PUBLIC_URL: "https://api.yekis.com",
    });
    const token = await makeAdmin("ADMIN");

    const rejected = [
      "http://api.yekis.com/api/v1/telegram/webhook", // not https
      "https://localhost/api/v1/telegram/webhook",
      "https://127.0.0.1/api/v1/telegram/webhook",
      "https://10.0.0.5/api/v1/telegram/webhook",
      "https://192.168.1.10/api/v1/telegram/webhook",
      "https://172.16.0.1/api/v1/telegram/webhook",
      "https://box.local/api/v1/telegram/webhook",
      // Public and https — but not this deployment. A webhook pointed here
      // delivers every future update, including Mini App initData login proofs.
      "https://attacker.example/api/v1/telegram/webhook",
      // Right host, someone else's port.
      "https://api.yekis.com.evil.example/api/v1/telegram/webhook",
      "not-a-url",
    ];

    for (const url of rejected) {
      const res = await request(built)
        .post("/api/v1/telegram/set-webhook")
        .set("Authorization", `Bearer ${token}`)
        .send({ url });
      expect(res.status, `${url} must be refused`).toBe(400);
      expect(res.body.error).toBe("WEBHOOK_URL_NOT_ALLOWED");
    }
  });

  it("refuses to guess when this deployment's own origin is unknown", async () => {
    // Neither API_PUBLIC_URL nor TELEGRAM_WEBHOOK_URL set: the comparison cannot
    // be made, so it must not be skipped. An earlier version treated a null
    // expected origin as "no constraint", which is the bug reappearing through
    // a missing setting.
    const built = await loadAppWith({
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      API_PUBLIC_URL: "",
      TELEGRAM_WEBHOOK_URL: "",
    });
    const token = await makeAdmin("ADMIN");

    const res = await request(built)
      .post("/api/v1/telegram/set-webhook")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://attacker.example/api/v1/telegram/webhook" });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("WEBHOOK_ORIGIN_UNKNOWN");
  });

  it("accepts this deployment's own webhook URL", async () => {
    // The control. Without it, 'every URL is rejected' would satisfy the tests
    // above while leaving the feature unusable. The bot is not initialised in
    // tests, so a correct URL gets past validation and stops at 503 Bot not
    // initialized — which still proves the URL was accepted.
    const built = await loadAppWith({
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      API_PUBLIC_URL: "https://api.yekis.com",
    });
    const token = await makeAdmin("ADMIN");

    const res = await request(built)
      .post("/api/v1/telegram/set-webhook")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://api.yekis.com/api/v1/telegram/webhook" });

    expect(res.status).not.toBe(400);
    expect(res.body.error).not.toBe("WEBHOOK_URL_NOT_ALLOWED");
    expect(res.body.error).not.toBe("WEBHOOK_ORIGIN_UNKNOWN");
  });

  it("requires a step-up credential even for an administrator", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: SECRET });

    const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");
    const admin = userIds[userIds.length - 1];
    const weak = await createAuthTokens(
      { id: admin, role: "CLIENT", ucid: null, staffRole: "ADMIN" },
      ["tg_miniapp"],
    );

    const res = await request(built)
      .post("/api/v1/telegram/set-webhook")
      .set("Authorization", `Bearer ${weak.accessToken}`)
      .send({ url: "https://api.yekis.com/api/v1/telegram/webhook" });

    // 403, not 401: the credential is recent but weak.
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("STEP_UP_REQUIRED");
  });

  it("still refuses a non-admin outright", async () => {
    const built = await loadAppWith({ TELEGRAM_WEBHOOK_SECRET: SECRET });
    const token = await makeAdmin("SUPPORT");

    const res = await request(built)
      .post("/api/v1/telegram/set-webhook")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://api.yekis.com/api/v1/telegram/webhook" });

    expect(res.status).toBe(403);
  });
});