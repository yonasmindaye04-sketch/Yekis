import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  setGigStatus,
  moderateGigStatus,
  GigForbiddenError,
  GigNotFoundError,
} from "../src/modules/gigs/gig.service.js";

/**
 * Gig publication is a staff decision.
 *
 * `POST /:gigId/status` used to accept ACTIVE and REJECTED from the gig's own
 * owner, which made the "moderation checkpoint" in schema.prisma decorative:
 * a seller could self-publish to the marketplace, or self-reject. Only
 * PAUSED and ARCHIVED are owner-settable now; ACTIVE and REJECTED go through
 * the staff moderation path, which also records who decided.
 */

const SUFFIX = Date.now();
const OWNER_EMAIL = `gigmod.owner.${SUFFIX}@example.com`;
const STAFF_EMAIL = `gigmod.staff.${SUFFIX}@example.com`;
const OTHER_EMAIL = `gigmod.other.${SUFFIX}@example.com`;

async function makeUser(email: string, role: string, staffRole?: string) {
  return prisma.user.create({
    data: {
      email,
      phone: `+2519${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
      passwordHash: "x",
      role,
      staffRole: staffRole ?? null,
      wallet: { create: { balanceMinor: 0 } },
    },
  });
}

let ownerId = "";
let staffId = "";
let otherId = "";
let gigId = "";

async function freshGig() {
  return prisma.gig.create({
    data: {
      freelancerId: ownerId,
      title: `Moderation gig ${SUFFIX} ${Math.random()}`,
      category: "CONTENT_WRITING",
      description: "Gig used to assert the publication boundary.",
      tags: [],
      requirements: [],
      mediaUrls: [],
      status: "DRAFT",
    },
  });
}

beforeAll(async () => {
  ownerId = (await makeUser(OWNER_EMAIL, "FREELANCER")).id;
  staffId = (await makeUser(STAFF_EMAIL, "CLIENT", "ADMIN")).id;
  otherId = (await makeUser(OTHER_EMAIL, "FREELANCER")).id;
  gigId = (await freshGig()).id;
});

afterAll(async () => {
  await prisma.gig.deleteMany({ where: { freelancerId: ownerId } });
  // Wallets are a required relation on User; drop them before the users.
  await prisma.wallet.deleteMany({
    where: { userId: { in: [ownerId, staffId, otherId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerId, staffId, otherId] } },
  });
});

describe("owner status changes", () => {
  it("lets the owner pause their own gig", async () => {
    const gig = await freshGig();
    const updated = await setGigStatus({
      ownerId,
      gigId: gig.id,
      status: "PAUSED",
    });
    expect(updated.status).toBe("PAUSED");
  });

  it("lets the owner archive their own gig", async () => {
    const gig = await freshGig();
    const updated = await setGigStatus({
      ownerId,
      gigId: gig.id,
      status: "ARCHIVED",
    });
    expect(updated.status).toBe("ARCHIVED");
  });

  it("refuses to let the owner self-publish", async () => {
    const gig = await freshGig();
    await expect(
      setGigStatus({ ownerId, gigId: gig.id, status: "ACTIVE" }),
    ).rejects.toBeInstanceOf(GigForbiddenError);

    const after = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(after.status).toBe("DRAFT");
  });

  it("refuses to let the owner self-reject", async () => {
    const gig = await freshGig();
    await expect(
      setGigStatus({ ownerId, gigId: gig.id, status: "REJECTED" }),
    ).rejects.toBeInstanceOf(GigForbiddenError);
  });

  it("refuses status changes from a user who is not the owner", async () => {
    const gig = await freshGig();
    await expect(
      setGigStatus({ ownerId: otherId, gigId: gig.id, status: "PAUSED" }),
    ).rejects.toBeInstanceOf(GigForbiddenError);
  });

  it("404s for an unknown gig", async () => {
    await expect(
      setGigStatus({ ownerId, gigId: "cmdoesnotexist0000000000000", status: "PAUSED" }),
    ).rejects.toBeInstanceOf(GigNotFoundError);
  });
});

describe("staff moderation", () => {
  it("publishes a DRAFT gig to ACTIVE", async () => {
    const gig = await freshGig();
    const updated = await moderateGigStatus({
      staffUserId: staffId,
      gigId: gig.id,
      status: "ACTIVE",
    });
    expect(updated.status).toBe("ACTIVE");
  });

  it("rejects a gig and records the deciding staff member and reason", async () => {
    const gig = await freshGig();
    const updated = await moderateGigStatus({
      staffUserId: staffId,
      gigId: gig.id,
      status: "REJECTED",
      reason: "Description does not describe a deliverable service.",
    });
    expect(updated.status).toBe("REJECTED");

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "Gig", entityId: gig.id },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.eventType).toBe("GIG_STATUS_CHANGED");

    const meta = audit!.metadata as Record<string, unknown> | null;
    expect(meta?.decidedByStaffId).toBe(staffId);
    expect(meta?.previousStatus).toBe("DRAFT");
  });
});
