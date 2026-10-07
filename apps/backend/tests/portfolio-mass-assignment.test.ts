import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * F-17 — portfolio items cannot be mass-assigned.
 *
 * `PATCH /api/v1/portfolio/me/:itemId` handed the raw request body to
 * `prisma.portfolioItem.update`. The ownership check protected the ITEM, not its
 * FIELDS, so `{"userId": "<anyone>"}` transferred the item to another account
 * and `{"id": "..."}` could rewrite the primary key. `POST /me` had the same
 * shape (raw spread, no zod at all).
 *
 * Both verbs now parse through `.strict()` schemas and the service builds the
 * Prisma data object field by field.
 */

const app = buildApp();

const STAMP = Date.now();
const OWNER_EMAIL = `f17-owner-${STAMP}@test.et`;
const ATTACKER_EMAIL = `f17-attacker-${STAMP}@test.et`;

let ownerId: string;
let attackerId: string;
let itemId: string;

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { in: [OWNER_EMAIL, ATTACKER_EMAIL] } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.portfolioItem.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function createUser(email: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email,
      phone: `+2519${String(20000000 + Math.abs(email.charCodeAt(6)) * 1000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    select: { id: true },
  });
  return user.id;
}

beforeAll(async () => {
  await cleanup();
  ownerId = await createUser(OWNER_EMAIL);
  attackerId = await createUser(ATTACKER_EMAIL);

  const item = await prisma.portfolioItem.create({
    data: {
      userId: ownerId,
      title: "Owner project",
      description: "A legitimate portfolio entry",
      isActive: true,
    },
  });
  itemId = item.id;
});

afterAll(async () => {
  await cleanup();
});

/** Async because minting a token is a promise. */
async function asOwner() {
  return { Authorization: `Bearer ${await mintFor(ownerId)}` };
}
async function asAttacker() {
  return { Authorization: `Bearer ${await mintFor(attackerId)}` };
}

import { SignJWT } from "jose";
import { env } from "../src/config/env.js";
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

async function mintFor(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "FREELANCER", auth_time: now, amr: ["pwd"] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime("15m")
    .sign(accessSecret);
}

describe("F-17 portfolio items reject mass assignment", () => {
  it("a valid PATCH still works", async () => {
    const res = await request(app)
      .patch(`/api/v1/portfolio/me/${itemId}`)
      .set(await asOwner())
      .send({ title: "Renamed project", description: "Updated copy" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed project");

    const row = await prisma.portfolioItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(row.title).toBe("Renamed project");
    expect(row.userId).toBe(ownerId);
  });

  it("PATCH with userId is rejected and the row is unchanged", async () => {
    const before = await prisma.portfolioItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    const res = await request(app)
      .patch(`/api/v1/portfolio/me/${itemId}`)
      .set(await asOwner())
      .send({ title: "Attempted takeover", userId: attackerId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");

    const after = await prisma.portfolioItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(after.userId).toBe(ownerId);
    expect(after.title).toBe(before.title);
  });

  it("PATCH with id / createdAt / updatedAt is rejected", async () => {
    const before = await prisma.portfolioItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    for (const payload of [
      { id: "cm0000000000000000000099" },
      { createdAt: "2020-01-01T00:00:00.000Z" },
      { updatedAt: "2020-01-01T00:00:00.000Z" },
      { isActive: false },
    ]) {
      const res = await request(app)
        .patch(`/api/v1/portfolio/me/${itemId}`)
        .set(await asOwner())
        .send(payload);
      expect(res.status, `payload ${JSON.stringify(payload)}`).toBe(400);
    }

    const after = await prisma.portfolioItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(after.userId).toBe(before.userId);
    expect(after.id).toBe(before.id);
    expect(after.isActive).toBe(true);
    expect(after.createdAt.toISOString()).toBe(before.createdAt.toISOString());
  });

  it("POST with userId is rejected", async () => {
    const before = await prisma.portfolioItem.count({
      where: { userId: attackerId },
    });

    const res = await request(app)
      .post("/api/v1/portfolio/me")
      .set(await asOwner())
      .send({ title: "Sneaky item", userId: attackerId });

    expect(res.status).toBe(400);

    const after = await prisma.portfolioItem.count({
      where: { userId: attackerId },
    });
    expect(after).toBe(before);
  });

  it("POST ignores unknown keys and creates an owned item", async () => {
    const res = await request(app)
      .post("/api/v1/portfolio/me")
      .set(await asOwner())
      .send({
        title: "Legit item",
        description: "Fine",
        // @ts-expect-error deliberately extra
        someInternalFlag: true,
      });

    // `.strict()` rejects the unknown key outright.
    expect(res.status).toBe(400);

    const clean = await request(app)
      .post("/api/v1/portfolio/me")
      .set(await asOwner())
      .send({ title: "Legit item", description: "Fine" });
    expect(clean.status).toBe(201);
    expect(clean.body.userId).toBe(ownerId);
  });

  it("a non-owner still cannot touch someone else's item", async () => {
    const res = await request(app)
      .patch(`/api/v1/portfolio/me/${itemId}`)
      .set(await asAttacker())
      .send({ title: "Not mine" });

    expect([403, 404]).toContain(res.status);
    const row = await prisma.portfolioItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(row.userId).toBe(ownerId);
  });
});