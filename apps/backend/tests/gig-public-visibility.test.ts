import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { searchGigs, getGigById, GigNotFoundError } from "../src/modules/gigs/gig.service.js";

/**
 * Gig publication boundary.
 *
 * Two disclosure bugs motivated this file:
 *
 *   1. `GET /api/v1/gigs/search` is unauthenticated and used to pass the
 *      caller's `status` straight into the Prisma `where`. Because
 *      GigSearchQuery accepted any GigStatus, `?status=DRAFT` listed every
 *      unpublished listing on the platform — freelancerId, title, price and
 *      all.
 *
 *   2. `GET /api/v1/gigs/:gigId` had no status check at all, so a draft was
 *      fetchable by anyone who had or guessed the id.
 *
 * These assert the *service* boundary rather than the HTTP layer, because the
 * route handler is a thin passthrough and the service is where the where-clause
 * lives. The regression that matters is someone reintroducing a caller-supplied
 * status filter here, which these tests fail on directly.
 */

const SUFFIX = Date.now();
const OWNER_EMAIL = `gig.owner.${SUFFIX}@example.com`;
const STRANGER_EMAIL = `gig.stranger.${SUFFIX}@example.com`;

async function makeFreelancer(email: string, staffRole?: string) {
  return prisma.user.create({
    data: {
      email,
      phone: `+2519${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
      passwordHash: "x",
      role: "FREELANCER",
      staffRole: staffRole ?? null,
      wallet: { create: { balanceMinor: 0 } },
    },
  });
}

let ownerId = "";
let strangerId = "";
let draftGigId = "";
let activeGigId = "";
let rejectedGigId = "";

beforeAll(async () => {
  const owner = await makeFreelancer(OWNER_EMAIL);
  const stranger = await makeFreelancer(STRANGER_EMAIL);
  ownerId = owner.id;
  strangerId = stranger.id;

  const base = {
    freelancerId: ownerId,
    category: "GRAPHIC_DESIGN" as const,
    description: "Test gig for publication boundary checks.",
    tags: [] as string[],
    requirements: [] as string[],
    mediaUrls: [] as string[],
  };

  const draft = await prisma.gig.create({
    data: { ...base, title: `Draft gig ${SUFFIX}`, status: "DRAFT" },
  });
  const active = await prisma.gig.create({
    data: { ...base, title: `Active gig ${SUFFIX}`, status: "ACTIVE" },
  });
  const rejected = await prisma.gig.create({
    data: { ...base, title: `Rejected gig ${SUFFIX}`, status: "REJECTED" },
  });

  draftGigId = draft.id;
  activeGigId = active.id;
  rejectedGigId = rejected.id;
});

afterAll(async () => {
  await prisma.gig.deleteMany({
    where: { id: { in: [draftGigId, activeGigId, rejectedGigId] } },
  });
  // The seeded wallet is a required relation on User, so remove it first —
  // otherwise deleting the user trips the Wallet_userId foreign key.
  await prisma.wallet.deleteMany({
    where: { userId: { in: [ownerId, strangerId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerId, strangerId] } },
  });
});

describe("gig search is restricted to ACTIVE", () => {
  it("never returns a DRAFT gig, even when the caller asks for one", async () => {
    // The regression case: `status` used to be a caller-supplied filter.
    // It is no longer part of GigSearchQuery, so this cast is deliberately
    // hostile — it simulates a hand-rolled or future caller trying to re-open it.
    // GigSearchQuery applies page/pageSize defaults; the service reads them
    // straight off the parsed object, so supply them explicitly rather than
    // bypassing the schema. Only `status` is smuggled in.
    const res = await searchGigs({
      q: `Draft gig ${SUFFIX}`,
      page: 1,
      pageSize: 20,
      status: "DRAFT",
    } as never);

    expect(res.items.map((g) => g.id)).not.toContain(draftGigId);
  });

  it("does not return REJECTED or ARCHIVED listings", async () => {
    const rejectedRes = await searchGigs({
      q: `Rejected gig ${SUFFIX}`,
      page: 1,
      pageSize: 20,
      status: "REJECTED",
    } as never);
    expect(rejectedRes.items.map((g) => g.id)).not.toContain(rejectedGigId);

    const archived = await prisma.gig.update({
      where: { id: activeGigId },
      data: { status: "ARCHIVED" },
    });
    try {
      const res = await searchGigs({
        q: `Active gig ${SUFFIX}`,
        page: 1,
        pageSize: 20,
        status: "ARCHIVED",
      } as never);
      expect(res.items.map((g) => g.id)).not.toContain(archived.id);
    } finally {
      await prisma.gig.update({
        where: { id: activeGigId },
        data: { status: "ACTIVE" },
      });
    }
  });

  it("still returns an ACTIVE gig, so the marketplace is not simply empty", async () => {
    const res = await searchGigs({ q: `Active gig ${SUFFIX}`, page: 1, pageSize: 20 });
    expect(res.items.map((g) => g.id)).toContain(activeGigId);
  });
});

describe("getGigById visibility", () => {
  it("returns an ACTIVE gig to an anonymous caller", async () => {
    const gig = await getGigById(activeGigId);
    expect(gig.id).toBe(activeGigId);
  });

  it("hides a DRAFT gig from anonymous callers", async () => {
    await expect(getGigById(draftGigId)).rejects.toBeInstanceOf(GigNotFoundError);
  });

  it("hides a DRAFT gig from another user", async () => {
    await expect(
      getGigById(draftGigId, { userId: strangerId, staffRole: null }),
    ).rejects.toBeInstanceOf(GigNotFoundError);
  });

  it("hides a REJECTED gig from a non-owner", async () => {
    await expect(
      getGigById(rejectedGigId, { userId: strangerId, staffRole: null }),
    ).rejects.toBeInstanceOf(GigNotFoundError);
  });

  it("lets the owner preview their own DRAFT gig", async () => {
    const gig = await getGigById(draftGigId, { userId: ownerId, staffRole: null });
    expect(gig.id).toBe(draftGigId);
  });

  it("lets staff inspect a non-ACTIVE gig for moderation", async () => {
    const gig = await getGigById(draftGigId, { userId: strangerId, staffRole: "ADMIN" });
    expect(gig.id).toBe(draftGigId);
  });
});
