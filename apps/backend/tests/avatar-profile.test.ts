import { describe, it, expect, beforeEach, afterAll } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { updateProfileSchema } from "../src/modules/profiles/profile.validation.js";

/**
 * Profile photos.
 *
 * The live defect these pin: the editor compressed a chosen photo into a JPEG
 * data URL and sent it as `avatarUrl`. Zod allowed 1.5 MB; the column is
 * VARCHAR(500); Postgres raised P2000 and the route answered an opaque
 * `500 INTERNAL_ERROR`. Every member who picked a photo could not save
 * Settings at all.
 *
 * The fix is not a bigger column — `avatarUrl` is copied into chat, contract,
 * gig and featured responses, so a base64 image there would ride along on
 * every one of them. The bytes are uploaded to POST /me/avatar, stored in
 * UserAvatar, and `avatarUrl` holds a short public reference.
 */

const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];

// Enough of each format to satisfy the magic-byte check. The endpoint does not
// decode pixels; it stores the bytes the browser produced.
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0xff, 0xd9,
]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const NOT_AN_IMAGE = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>", "utf8");

async function makeUser(tag: string) {
  const seq = userIds.length;
  const user = await prisma.user.create({
    data: {
      email: `avatar-${tag}-${seq}-${STAMP}@test.et`,
      phone: `+2519${String(100000000 + (STAMP % 800000000) + seq * 11).slice(0, 9)}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      firstName: "Avatar",
      lastName: "Tester",
      wallet: { create: { balanceMinor: 0 } },
    },
  });
  userIds.push(user.id);
  return user;
}

async function authHeader(userId: string): Promise<string> {
  const session = await createAuthTokens(
    { id: userId, role: "FREELANCER", ucid: null },
    ["pwd"],
  );
  return `Bearer ${session.accessToken}`;
}

async function uploadAs(userId: string, buffer: Buffer, filename = "avatar.jpg") {
  return request(app)
    .post("/api/v1/users/me/avatar")
    .set("Authorization", await authHeader(userId))
    .attach("file", buffer, { filename, contentType: "image/jpeg" });
}

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe("updateProfileSchema.avatarUrl", () => {
  it("rejects a value longer than the column", () => {
    const parsed = updateProfileSchema.safeParse({
      avatarUrl: `https://example.test/${"a".repeat(500)}`,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an inline data URL", () => {
    const parsed = updateProfileSchema.safeParse({
      avatarUrl: "data:image/jpeg;base64,AAAAAAAA",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an uploaded avatar reference, an https URL and null", () => {
    for (const avatarUrl of [
      "/api/v1/users/avatars/cm0000000000000000000000a",
      "https://t.me/i/userpic/320/example.jpg",
      null,
    ]) {
      expect(updateProfileSchema.safeParse({ avatarUrl }).success).toBe(true);
    }
  });
});

describe("POST /api/v1/users/me/avatar", () => {
  it("stores the image and points the profile at a short, public URL", async () => {
    const user = await makeUser("store");

    const res = await uploadAs(user.id, JPEG);
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toMatch(
      /^\/api\/v1\/users\/avatars\/[a-z0-9]{20,40}$/,
    );
    expect(res.body.contentType).toBe("image/jpeg");

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatarUrl: true },
    });
    expect(stored.avatarUrl).toBe(res.body.avatarUrl);

    // Public: an <img> on a signed-out profile page cannot send a token.
    const fetched = await request(app).get(res.body.avatarUrl);
    expect(fetched.status).toBe(200);
    expect(fetched.headers["content-type"]).toContain("image/jpeg");
    expect(fetched.headers["cache-control"]).toContain("immutable");
    expect(fetched.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.compare(fetched.body as Buffer, JPEG)).toBe(0);
  });

  it("keeps exactly one stored photo per member when replaced", async () => {
    const user = await makeUser("replace");

    const first = await uploadAs(user.id, JPEG);
    expect(first.status).toBe(200);
    const firstId = first.body.avatarUrl.split("/").pop() as string;

    const second = await uploadAs(user.id, PNG);
    expect(second.status).toBe(200);
    expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);

    expect(
      await prisma.userAvatar.findUnique({ where: { id: firstId } }),
    ).toBeNull();
    expect(await prisma.userAvatar.count({ where: { userId: user.id } })).toBe(1);

    // The replaced URL is gone, not silently reused.
    expect((await request(app).get(first.body.avatarUrl)).status).toBe(404);
  });

  it("refuses a file whose bytes are not an image, whatever the filename says", async () => {
    const user = await makeUser("bad");

    const res = await uploadAs(user.id, NOT_AN_IMAGE, "avatar.jpg");
    expect(res.status).toBe(400);
    expect(await prisma.userAvatar.count({ where: { userId: user.id } })).toBe(0);
  });

  it("requires a session", async () => {
    const res = await request(app)
      .post("/api/v1/users/me/avatar")
      .attach("file", JPEG, { filename: "avatar.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown or malformed avatar id", async () => {
    expect((await request(app).get("/api/v1/users/avatars/not-an-id")).status).toBe(404);
    expect(
      (await request(app).get("/api/v1/users/avatars/cm0000000000000000000000a"))
        .status,
    ).toBe(404);
  });
});

describe("PATCH /api/v1/users/me/profile avatarUrl", () => {
  it("returns 400, not 500, for an over-long avatar URL", async () => {
    const user = await makeUser("long");
    const tooLong = `https://example.test/${"a".repeat(600)}`;

    const res = await request(app)
      .patch("/api/v1/users/me/profile")
      .set("Authorization", await authHeader(user.id))
      .send({ avatarUrl: tooLong });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_FAILED");
    expect(res.body.message).toMatch(/500 characters/);
  });

  it("clearing the avatar deletes the stored bytes", async () => {
    const user = await makeUser("clear");
    const uploaded = await uploadAs(user.id, JPEG);
    expect(uploaded.status).toBe(200);
    const avatarId = uploaded.body.avatarUrl.split("/").pop() as string;

    const res = await request(app)
      .patch("/api/v1/users/me/profile")
      .set("Authorization", await authHeader(user.id))
      .send({ avatarUrl: null });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBeNull();
    expect(
      await prisma.userAvatar.findUnique({ where: { id: avatarId } }),
    ).toBeNull();
  });

  it("refuses to attach another member's uploaded photo", async () => {
    const owner = await makeUser("owner");
    const thief = await makeUser("thief");
    const uploaded = await uploadAs(owner.id, JPEG);
    expect(uploaded.status).toBe(200);

    const res = await request(app)
      .patch("/api/v1/users/me/profile")
      .set("Authorization", await authHeader(thief.id))
      .send({ avatarUrl: uploaded.body.avatarUrl });

    expect(res.status).toBe(400);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: thief.id },
      select: { avatarUrl: true },
    });
    expect(stored.avatarUrl).toBeNull();
  });
});
