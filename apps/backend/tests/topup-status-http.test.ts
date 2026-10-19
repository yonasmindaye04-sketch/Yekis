import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { prisma } from "../src/lib/prisma.js";
import { topupsRouter } from "../src/modules/topups/topup.routes.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * The checkout return page needs to answer one question: did this payment
 * actually arrive. It had no route that could answer it for a single
 * transaction, so it slept three seconds and rendered "Payment Complete"
 * unconditionally -- telling users their milestone was funded when nothing had
 * confirmed it. Users who believe that will start work that escrow is not
 * protecting.
 *
 * GET /wallet/topups/:topUpId is that route. The properties pinned here are
 * that it is scoped to the caller, that it does not confirm existence of
 * somebody else's top-up, and that `credited` tracks the real status rather
 * than the mere existence of the row.
 */

const STAMP = Date.now();
const M = 100000;

let userId: string;
let otherId: string;
const created: string[] = [];

async function makeUser(label: string) {
  // Hash the WHOLE label: charCodeAt(0) collides for "owner"/"other", which
  // both start with 'o', and User.phone is unique.
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000;
  return prisma.user.create({
    data: {
      email: `topup-status-${label}-${STAMP}@test.et`,
      phone: `+2519${String(70000000 + hash)}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { wallet: true },
  });
}

async function makeTopUp(ownerId: string, walletId: string, status: string) {
  const row = await prisma.walletTopUp.create({
    data: {
      userId: ownerId,
      walletId,
      amountMinor: M,
      provider: "TELEBIRR",
      status,
      providerTransactionId: `txn-${STAMP}-${created.length}`,
      // APPROVED rows carry a reviewer in this schema; a top-up that nobody
      // looked at is not approved, whatever the status column says.
      ...(status === "APPROVED"
        ? { reviewedByStaffId: otherId, reviewedAt: new Date() }
        : {}),
    },
  });
  created.push(row.id);
  return row;
}

function appFor(uid: string) {
  const app = express();
  app.use(express.json());
  (app as unknown as { token?: string }).token = undefined;
  return app;
}

async function authed(uid: string, url: string) {
  const { accessToken } = await createAuthTokens(
    { id: uid, role: "CLIENT", ucid: null, sessionVersion: 0 },
    ["pwd"],
  );
  const app = express();
  app.use(express.json());
  app.use("/api/v1/wallet/topups", topupsRouter);
  return request(app).get(url).set("Authorization", `Bearer ${accessToken}`);
}

beforeAll(async () => {
  userId = (await makeUser("owner")).id;
  otherId = (await makeUser("other")).id;
});

afterAll(async () => {
  const ids = created.length ? created : ["__none__"];
  await prisma.auditLog.deleteMany({ where: { userId: { in: [userId, otherId] } } });
  await prisma.walletTopUp.deleteMany({ where: { id: { in: ids } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: [userId, otherId] } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: [userId, otherId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
});

describe("GET /wallet/topups/:topUpId", () => {
  it("reports credited only once the top-up is actually APPROVED", async () => {
    const wallet = (await prisma.wallet.findUniqueOrThrow({ where: { userId: userId } })).id;

    const pending = await makeTopUp(userId, wallet, "CHECKOUT_PENDING");
    const pendingRes = await authed(userId, `/api/v1/wallet/topups/${pending.id}`);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.status).toBe("CHECKOUT_PENDING");
    expect(pendingRes.body.credited).toBe(false);

    const approved = await makeTopUp(userId, wallet, "APPROVED");
    const approvedRes = await authed(userId, `/api/v1/wallet/topups/${approved.id}`);
    expect(approvedRes.status).toBe(200);
    expect(approvedRes.body.status).toBe("APPROVED");
    expect(approvedRes.body.credited).toBe(true);
  });

  it("does not expose another user's top-up, and does not confirm it exists", async () => {
    const theirWallet = (await prisma.wallet.findUniqueOrThrow({ where: { userId: otherId } })).id;
    const theirs = await makeTopUp(otherId, theirWallet, "APPROVED");

    const res = await authed(userId, `/api/v1/wallet/topups/${theirs.id}`);
    // 404, not 403: 403 would confirm the id belongs to a real account.
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty("credited");

    // And a genuinely absent id is indistinguishable from the above.
    const absent = await authed(userId, "/api/v1/wallet/topups/__no_such_topup__");
    expect(absent.status).toBe(404);
    expect(absent.body).toEqual(res.body);
  });

  it("requires authentication", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/v1/wallet/topups", topupsRouter);
    const res = await request(app).get("/api/v1/wallet/topups/__anything__");
    expect(res.status).toBe(401);
  });

  it("tells a rejected payment apart from a pending one", async () => {
    // The return page renders a different message for these, so the distinction
    // has to survive to the client.
    const wallet = (await prisma.wallet.findUniqueOrThrow({ where: { userId: userId } })).id;
    const rejected = await makeTopUp(userId, wallet, "REJECTED");
    const res = await authed(userId, `/api/v1/wallet/topups/${rejected.id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
    expect(res.body.credited).toBe(false);
  });
});