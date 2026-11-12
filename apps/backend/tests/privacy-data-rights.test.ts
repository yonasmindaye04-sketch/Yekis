import { describe, it, expect, beforeEach, afterAll } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";

/**
 * PDPP data-subject rights: access, portability and erasure.
 *
 * The Roadmap's rule for the erasure tool is specific — "wipe marketing data,
 * photos, chat; preserve AML data" — and the law behind it (PDPP No.
 * 1321/2024) is that a data subject may ask for their personal data to be
 * erased, except where another legal obligation requires it to be kept.
 *
 * So erasure here is NOT "delete the user row". It is:
 *
 *   - destroy the personal content and the credentials,
 *   - keep the identity, financial and AML evidence the law requires,
 *   - close the account so it cannot be used.
 *
 * These tests pin both halves. A test that only checked the content was
 * destroyed would pass an implementation that deleted the audit trail along
 * with it; a test that only checked the retention would pass one that kept
 * everything.
 */

const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.payoutTransaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.walletTopUp.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.transactionFlag.deleteMany({ where: { userId: { in: ids } } }),
    prisma.profileView.deleteMany({ where: { targetUserId: { in: ids } } }),
    prisma.featuredLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.portfolioItem.deleteMany({ where: { userId: { in: ids } } }),
    prisma.userSkill.deleteMany({ where: { userId: { in: ids } } }),
    prisma.proposal.deleteMany({ where: { freelancerId: { in: ids } } }),
    prisma.job.deleteMany({ where: { clientId: { in: ids } } }),
    prisma.chatMessage.deleteMany({ where: { senderId: { in: ids } } }),
    prisma.conversationParticipant.deleteMany({ where: { userId: { in: ids } } }),
    prisma.conversation.deleteMany({ where: { creatorId: { in: ids } } }),
    prisma.phoneVerificationCode.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

/**
 * A user with content of every category the erasure has to deal with, and a
 * zero wallet balance so nothing is outstanding.
 */
async function makeUserWithContent() {
  const seq = userIds.length;
  const u = await prisma.user.create({
    data: {
      email: `privacy-${seq}-${STAMP}@test.et`,
      phone: `+2517${String(60000000 + (STAMP % 9000000) + seq * 7)}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      firstName: "Testy",
      lastName: "McTestface",
      displayName: "Testy McTestface",
      bio: "A bio that is personal data.",
      avatarUrl: "data:image/png;base64,iVBORw0KGgo=",
      phoneVerifiedAt: new Date(),
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
      consents: {
        create: [
          { purpose: "kyc_data_processing", granted: true },
          { purpose: "marketing_communications", granted: true },
          { purpose: "analytics", granted: true },
        ],
      },
      notifications: {
        create: [{ type: "escrow-released", message: "Payment released" }],
      },
    } as never,
    include: { wallet: true, kyc: true },
  });
  userIds.push(u.id);

  await prisma.portfolioItem.create({
    data: {
      userId: u.id,
      title: "A portfolio piece",
      description: "Personal work description",
      thumbnailUrl: "https://example.invalid/thumb.png",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      creatorId: u.id,
      subject: "A support conversation",
      contactEmail: "visitor@example.invalid",
      status: "OPEN",
    },
  });
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: u.id,
      body: "A private support message.",
    },
  });

  const job = await prisma.job.create({
    data: {
      clientId: u.id,
      title: "A job with a personal description",
      description: "A description that identifies the person who wrote it.",
      category: "TRANSLATION",
      budgetMinMinor: 100000,
      budgetMaxMinor: 200000,
      deadline: new Date(Date.now() + 86400000 * 30),
      proposedMilestones: [],
    },
  });
  await prisma.proposal.create({
    data: {
      jobId: job.id,
      freelancerId: u.id,
      coverLetter: "A cover letter with personal content.",
      quotedAmountMinor: 100000,
      estimatedDays: 10,
      milestoneBreakdown: [
        {
          title: "One",
          amount: { amountMinor: 100000, currency: "ETB" },
          dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
        },
      ],
      attachmentPaths: [],
      status: "SUBMITTED",
    },
  });

  await prisma.profileView.create({
    data: { targetUserId: u.id, viewerId: null, source: "carousel" },
  });

  return u;
}

async function authHeader(userId: string) {
  const session = await createAuthTokens(
    { id: userId, role: "FREELANCER", ucid: null },
    ["pwd"],
  );
  return `Bearer ${session.accessToken}`;
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("the data subject can get everything the platform holds", () => {
  it("exports the content, not just an account summary", async () => {
    const user = await makeUserWithContent();

    const res = await request(app)
      .get("/api/v1/users/me/export")
      .set("Authorization", await authHeader(user.id));

    expect(res.status).toBe(200);
    const data = res.body;

    // Account and profile.
    expect(data.account.email).toBe(user.email);
    expect(data.profile.firstName).toBe("Testy");
    expect(data.profile.bio).toBe("A bio that is personal data.");

    // The CONTENT, which the previous implementation did not include at all
    // even though the API docs called it a complete archive.
    expect(data.marketplaceActivity.jobsPosted.length).toBe(1);
    expect(data.marketplaceActivity.jobsPosted[0].title).toBe(
      "A job with a personal description",
    );
    expect(data.marketplaceActivity.proposals.length).toBe(1);
    expect(data.marketplaceActivity.proposals[0].coverLetter).toBe(
      "A cover letter with personal content.",
    );
    expect(data.communications.supportMessages.length).toBe(1);
    expect(data.communications.supportMessages[0].body).toBe(
      "A private support message.",
    );
    expect(data.profile.portfolioItems.length).toBe(1);
    expect(data.communications.consentRecords.length).toBe(3);

    // The verification and financial categories are in there too.
    expect(data.verification.kycStatus).toBe("VERIFIED");
    expect(data.financials.currency).toBe("ETB");
  });
});

describe("erasure destroys the personal content", () => {
  it("wipes the profile, the chat, the marketing data and the credentials", async () => {
    const user = await makeUserWithContent();

    const res = await request(app)
      .post("/api/v1/users/me/erasure")
      .set("Authorization", await authHeader(user.id))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.accountClosed).toBe(true);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    // Identity and credentials.
    expect(after.firstName).toBe("");
    expect(after.lastName).toBe("");
    expect(after.displayName).toBeNull();
    expect(after.bio).toBeNull();
    expect(after.avatarUrl).toBeNull();
    expect(after.email).not.toBe(user.email);
    expect(after.email).toContain("erased");
    expect(after.passwordHash).not.toBe(user.passwordHash);
    expect(after.isSuspended).toBe(true);

    // Chat.
    const message = await prisma.chatMessage.findFirstOrThrow({
      where: { senderId: user.id },
    });
    expect(message.body).toBe("[erased]");

    // Marketplace copy.
    const proposal = await prisma.proposal.findFirstOrThrow({
      where: { freelancerId: user.id },
    });
    expect(proposal.coverLetter).toBe("[erased]");

    const job = await prisma.job.findFirstOrThrow({
      where: { clientId: user.id },
    });
    expect(job.description).toBe("[erased]");

    // Portfolio, notifications and analytics.
    expect(
      await prisma.portfolioItem.count({ where: { userId: user.id } }),
    ).toBe(0);
    expect(
      await prisma.notification.count({ where: { userId: user.id } }),
    ).toBe(0);
    expect(
      await prisma.profileView.count({ where: { targetUserId: user.id } }),
    ).toBe(0);

    // Marketing consent is revoked, not deleted: the record of what was
    // agreed to is itself the evidence.
    const marketing = await prisma.consentRecord.findFirstOrThrow({
      where: { userId: user.id, purpose: "marketing_communications" },
      orderBy: { grantedAt: "desc" },
    });
    expect(marketing.granted).toBe(false);
  });

  it("keeps the AML and financial records the law requires", async () => {
    const user = await makeUserWithContent();

    await request(app)
      .post("/api/v1/users/me/erasure")
      .set("Authorization", await authHeader(user.id))
      .send({});

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    // The identity evidence and the join keys for this person's financial
    // history. Without them the retained records cannot be used by the FIC,
    // a court or a regulator.
    expect(after.ucid).toBe(user.ucid);
    expect(after.phone).toBe(user.phone);
    expect(after.faydaPsut).toBe(user.faydaPsut);

    // The KYC record survives.
    const kyc = await prisma.kycRecord.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(kyc.status).toBe("VERIFIED");

    // The financial record survives.
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(wallet).toBeTruthy();

    // The consent history survives, including the KYC and financial grants.
    const kycConsent = await prisma.consentRecord.findFirstOrThrow({
      where: { userId: user.id, purpose: "kyc_data_processing" },
    });
    expect(kycConsent.granted).toBe(true);
  });

  it("refuses while there is money still in flight, and says why", async () => {
    const user = await makeUserWithContent();
    // Give the wallet a balance: the platform owes it, so erasing the
    // identity under it would leave the money unclaimable.
    await prisma.wallet.update({
      where: { userId: user.id },
      data: { balanceMinor: 250_000 },
    });

    const res = await request(app)
      .post("/api/v1/users/me/erasure")
      .set("Authorization", await authHeader(user.id))
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("ERASURE_BLOCKED");
    expect(res.body.blockers.map((b: { code: string }) => b.code)).toContain(
      "WALLET_BALANCE",
    );

    // Nothing was destroyed.
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(after.firstName).toBe("Testy");
  });

  it("records the erasure in the audit trail", async () => {
    const user = await makeUserWithContent();

    await request(app)
      .post("/api/v1/users/me/erasure")
      .set("Authorization", await authHeader(user.id))
      .send({});

    const audit = await prisma.auditLog.findFirst({
      where: { eventType: "PRIVACY_DATA_ERASED", userId: user.id },
    });
    expect(audit).toBeTruthy();
  });
});
