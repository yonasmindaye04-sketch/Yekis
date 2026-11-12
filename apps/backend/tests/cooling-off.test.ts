import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  cancelDuringCoolingOff,
  ContractNotFoundError,
  NotContractPartyError,
  CoolingOffExpiredError,
  ContractWorkAlreadyStartedError,
  createContractFromProposal,
} from "../src/modules/contracts/contracts.service.js";

// Mock external services if needed
vi.mock("../src/modules/contracts/contractStorage.js", () => ({
  uploadContractDocument: vi.fn().mockResolvedValue("contracts/test-contract.pdf"),
  getContractDocumentUrl: vi.fn().mockResolvedValue("https://mock-s3.local/contract.pdf"),
}));

describe("Statutory 7-day Cooling-Off Cancellation (ECA Proclamation No. 1205/2020)", () => {
  let clientId: string;
  let freelancerId: string;
  let thirdPartyId: string;
  let jobId: string;

  beforeAll(async () => {
    const timestamp = Date.now().toString();

    const client = await prisma.user.create({
      data: {
        email: `cooling-client-${timestamp}@test.et`,
        phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "CLIENT",
        languagePreference: "en",
        dateOfBirth: new Date("1992-05-15"),
      },
    });
    clientId = client.id;

    const freelancer = await prisma.user.create({
      data: {
        email: `cooling-freelancer-${timestamp}@test.et`,
        phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "FREELANCER",
        languagePreference: "en",
        dateOfBirth: new Date("1995-08-20"),
      },
    });
    freelancerId = freelancer.id;

    const otherUser = await prisma.user.create({
      data: {
        email: `cooling-other-${timestamp}@test.et`,
        phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "CLIENT",
        languagePreference: "en",
        dateOfBirth: new Date("1991-03-10"),
      },
    });
    thirdPartyId = otherUser.id;

    // Test helper to generate a unique Job for each contract (Contract.jobId is unique)
    async function createTestJob() {
      return prisma.job.create({
        data: {
          clientId,
          title: `Test Job for Cooling Off ${Math.random()}`,
          description: "Test description for statutory cooling-off cancellation rights",
          category: "TRANSLATION",
          budgetMinMinor: 500000,
          budgetMaxMinor: 500000,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          proposedMilestones: [],
          status: "IN_PROGRESS",
        },
      });
    }

    (globalThis as any).createTestJob = createTestJob;
  });

  it("allows client to cancel an active contract within the 7-day cooling-off window", async () => {
    const job = await (globalThis as any).createTestJob();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId,
        freelancerId,
        templateVersion: "1.0",
        documentStoragePath: "contracts/sample.pdf",
        status: "ACTIVE",
        cancellableUntil: futureDate,
        milestones: {
          create: [
            {
              title: "Milestone 1",
              amountMinor: 250000,
              dueDate: futureDate,
              escrowState: "PAYMENT_PENDING",
            },
          ],
        },
      },
      include: { milestones: true },
    });

    const cancelled = await cancelDuringCoolingOff({
      userId: clientId,
      contractId: contract.id,
    });

    expect(cancelled.status).toBe("CANCELLED");

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: {
        eventType: "CONTRACT_CANCELLED_COOLING_OFF",
        entityId: contract.id,
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.userId).toBe(clientId);
  });

  it("prevents non-client party (freelancer or third party) from executing cooling-off cancellation", async () => {
    const job = await (globalThis as any).createTestJob();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId,
        freelancerId,
        templateVersion: "1.0",
        documentStoragePath: "contracts/sample2.pdf",
        status: "ACTIVE",
        cancellableUntil: futureDate,
        milestones: {
          create: [
            {
              title: "Milestone 1",
              amountMinor: 250000,
              dueDate: futureDate,
              escrowState: "PAYMENT_PENDING",
            },
          ],
        },
      },
    });

    // Freelancer attempt
    await expect(
      cancelDuringCoolingOff({
        userId: freelancerId,
        contractId: contract.id,
      }),
    ).rejects.toThrow(NotContractPartyError);

    // Third-party attempt
    await expect(
      cancelDuringCoolingOff({
        userId: thirdPartyId,
        contractId: contract.id,
      }),
    ).rejects.toThrow(NotContractPartyError);
  });

  it("rejects cooling-off cancellation once cancellableUntil has expired", async () => {
    const job = await (globalThis as any).createTestJob();
    const pastDate = new Date(Date.now() - 1000);

    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId,
        freelancerId,
        templateVersion: "1.0",
        documentStoragePath: "contracts/sample3.pdf",
        status: "ACTIVE",
        cancellableUntil: pastDate,
        milestones: {
          create: [
            {
              title: "Milestone 1",
              amountMinor: 250000,
              dueDate: new Date(Date.now() + 86400000),
              escrowState: "PAYMENT_PENDING",
            },
          ],
        },
      },
    });

    await expect(
      cancelDuringCoolingOff({
        userId: clientId,
        contractId: contract.id,
      }),
    ).rejects.toThrow(CoolingOffExpiredError);
  });

  it("rejects cooling-off cancellation once milestone funding has started (escrow held)", async () => {
    const job = await (globalThis as any).createTestJob();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId,
        freelancerId,
        templateVersion: "1.0",
        documentStoragePath: "contracts/sample4.pdf",
        status: "ACTIVE",
        cancellableUntil: futureDate,
        milestones: {
          create: [
            {
              title: "Milestone 1",
              amountMinor: 250000,
              dueDate: futureDate,
              escrowState: "ESCROW_HELD",
            },
          ],
        },
      },
    });

    await expect(
      cancelDuringCoolingOff({
        userId: clientId,
        contractId: contract.id,
      }),
    ).rejects.toThrow(ContractWorkAlreadyStartedError);
  });
});

/**
 * D-2 — what does the REAL acceptance path set cancellableUntil to?
 *
 * Every other test in this file hand-builds a Contract and supplies its own
 * cancellableUntil, so none of them proves that the production path sets it at
 * all. schema.prisma carries the comment
 *
 *   cancellableUntil DateTime? // set to createdAt + 7 days by
 *                              createContractFromProposal()
 *
 * and the 7-day cooling-off right (ECA Proclamation No. 1205/2020) depends on
 * it. This test creates a contract the way the application does and asserts
 * what is actually stored.
 *
 * THIS USED TO BE A MEASUREMENT, NOT AN ASSERTION. It recorded the value
 * without asserting it, and asserted the consequence instead: that
 * cancelDuringCoolingOff always refused, because the field was never written.
 * That was ESC-002 — the schema documented an assignment the code never made,
 * so `cancellableUntil` was always NULL, `cancelDuringCoolingOff` treated
 * NULL as "expired", and the cooling-off right the Terms of Service promise
 * the client was never actually available.
 *
 * It is now an assertion: the field is written, it is written to the right
 * instant, and the right it arms can actually be exercised.
 */
describe("the real acceptance path arms cancellableUntil (ESC-002)", () => {
  it("sets the 7-day window on the contract the acceptance path creates", async () => {
    const stamp = Date.now();

    const client = await prisma.user.create({
      data: {
        email: `coolreal-client-${stamp}@test.et`,
        phone: `+25190${Math.floor(1000000 + Math.random() * 8999999)}`,
        passwordHash: "mockHash",
        role: "CLIENT",
      },
    });
    const freelancer = await prisma.user.create({
      data: {
        email: `coolreal-freelancer-${stamp}@test.et`,
        phone: `+25190${Math.floor(1000000 + Math.random() * 8999999)}`,
        passwordHash: "mockHash",
        role: "FREELANCER",
      },
    });

    const job = await prisma.job.create({
      data: {
        clientId: client.id,
        title: `Cooling-off real path ${stamp}`,
        category: "WEB_APP_DEVELOPMENT",
        description:
          "A description comfortably longer than the twenty character minimum required by the schema.",
        budgetMinMinor: 100000,
        budgetMaxMinor: 100000,
        deadline: new Date(Date.now() + 86400000 * 30),
        proposedMilestones: [],
      },
    });

    const proposal = await prisma.proposal.create({
      data: {
        jobId: job.id,
        freelancerId: freelancer.id,
        coverLetter: "A cover letter long enough to satisfy the schema.",
        quotedAmountMinor: 100000,
        estimatedDays: 30,
        milestoneBreakdown: [
          {
            title: "First milestone",
            amount: { amountMinor: 100000, currency: "ETB" },
            dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
          },
        ],
        attachmentPaths: [],
        status: "ACCEPTED",
      },
    });

    const contract = await createContractFromProposal(proposal.id);

    const fresh = await prisma.contract.findUniqueOrThrow({
      where: { id: contract.id },
    });

    // The window must EXIST. A NULL here is what made the whole right
    // unreachable: cancelDuringCoolingOff reads a missing value as expired.
    expect(
      fresh.cancellableUntil,
      "the acceptance path must arm the cooling-off window",
    ).toBeInstanceOf(Date);

    // And it must be seven days from the contract's creation, not merely some
    // future instant — a window that is too long is a legal exposure and one
    // that is too short is a broken promise.
    const windowDays =
      (fresh.cancellableUntil!.getTime() - fresh.createdAt.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(windowDays).toBeGreaterThan(6.9);
    expect(windowDays).toBeLessThan(7.1);

    // The consequence, which is the part that actually matters to a client:
    // the right can now be exercised.
    const cancelled = await cancelDuringCoolingOff({
      userId: client.id,
      contractId: contract.id,
    });
    expect(cancelled.status).toBe("CANCELLED");
  });
});
