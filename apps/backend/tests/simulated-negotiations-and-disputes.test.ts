import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { createJob } from "../src/modules/jobs/jobs.service.js";
import { submitProposal, decideProposal, withdrawProposal } from "../src/modules/jobs/proposals.service.js";
import { acceptContract } from "../src/modules/contracts/contracts.service.js";
import { fundMilestoneFromWallet, submitMilestone, acceptMilestone } from "../src/modules/escrow/escrow.service.js";
import {
  raiseDispute,
  escalateToEvidence,
  submitEvidence,
  getMediationQueue,
  claimDisputeAsMediator,
  resolveDispute,
  escalateToArbitration,
  applyArbitrationAward,
  withdrawDisputeMutually,
  MutualWithdrawalOutcomeMismatchError,
  DisputeAlreadyClaimedError,
} from "../src/modules/disputes/dispute.service.js";

// Mock object storage upload and PDF generation to keep tests pure and fast
vi.mock("../src/modules/contracts/contractStorage.js", () => ({
  uploadContractDocument: vi.fn().mockResolvedValue("contracts/test-contract-mock.pdf"),
  getContractDocumentUrl: vi.fn().mockResolvedValue("https://mock-s3.local/contract.pdf"),
}));

vi.mock("../src/lib/objectStore.js", () => ({
  uploadEvidenceBundle: vi.fn().mockResolvedValue("disputes/evidence-bundle-mock.json"),
  uploadKycDocument: vi.fn().mockResolvedValue("kyc/mock-doc.jpg"),
  uploadTopUpReceipt: vi.fn().mockResolvedValue("topup/mock-receipt.jpg"),
  getPresignedObjectUrl: vi.fn().mockResolvedValue("https://mock-s3.local/file"),
}));

vi.mock("../src/queue/queues.js", () => ({
  autoReleaseQueue: { add: vi.fn().mockResolvedValue({ id: "job-1" }), remove: vi.fn().mockResolvedValue(true) },
  notificationQueue: { add: vi.fn().mockResolvedValue({ id: "notif-1" }) },
  kycRefreshQueue: { add: vi.fn().mockResolvedValue({ id: "kyc-1" }) },
  reviewRevealQueue: { add: vi.fn().mockResolvedValue({ id: "review-1" }) },
  featuredRefreshQueue: { add: vi.fn().mockResolvedValue({ id: "featured-1" }) },
}));

describe("Multi-User Simulated Negotiations & Dispute Lifecycles", () => {
  let clientId: string;
  let freelancerAId: string;
  let freelancerBId: string;
  let mediatorStaffId: string;
  let secondMediatorStaffId: string;

  const testSuffix = Date.now().toString();

  beforeAll(async () => {
    // 1. Seed Client User with wallet balance
    const client = await prisma.user.create({
      data: {
        email: `client-${testSuffix}@test.et`,
        phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "CLIENT",
        languagePreference: "en",
        dateOfBirth: new Date("1990-01-01"),
        wallet: { create: { balanceMinor: 5_000_000 } }, // 50,000 ETB
        kyc: {
          create: {
            tier: "TIER_1",
            status: "VERIFIED",
            fullName: "Simulated Client",
          },
        },
      },
    });
    clientId = client.id;

    // 2. Seed Freelancer A with TIN (standard withholding)
    const freelancerA = await prisma.user.create({
      data: {
        email: `freelancerA-${testSuffix}@test.et`,
        phone: `+25192${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "FREELANCER",
        languagePreference: "en",
        dateOfBirth: new Date("1995-05-15"),
        wallet: { create: { balanceMinor: 0 } },
        kyc: {
          create: {
            tier: "TIER_2",
            status: "VERIFIED",
            fullName: "Freelancer Alpha",
            tin: "TIN-ALPHA-123",
          },
        },
      },
    });
    freelancerAId = freelancerA.id;

    // 3. Seed Freelancer B
    const freelancerB = await prisma.user.create({
      data: {
        email: `freelancerB-${testSuffix}@test.et`,
        phone: `+25193${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "FREELANCER",
        languagePreference: "en",
        dateOfBirth: new Date("1996-08-20"),
        wallet: { create: { balanceMinor: 0 } },
        kyc: {
          create: {
            tier: "TIER_1",
            status: "VERIFIED",
            fullName: "Freelancer Beta",
          },
        },
      },
    });
    freelancerBId = freelancerB.id;

    // 4. Seed Compliance Officer (Staff)
    const staff1 = await prisma.user.create({
      data: {
        email: `mediator1-${testSuffix}@test.et`,
        phone: `+25194${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "BOTH",
        staffRole: "COMPLIANCE_OFFICER",
        languagePreference: "en",
        dateOfBirth: new Date("1988-03-10"),
      },
    });
    mediatorStaffId = staff1.id;

    // 5. Seed Second Compliance Officer (Staff)
    const staff2 = await prisma.user.create({
      data: {
        email: `mediator2-${testSuffix}@test.et`,
        phone: `+25195${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: "mockHash",
        role: "BOTH",
        staffRole: "COMPLIANCE_OFFICER",
        languagePreference: "en",
        dateOfBirth: new Date("1989-07-22"),
      },
    });
    secondMediatorStaffId = staff2.id;
  });

  afterAll(async () => {
    const userIds = [clientId, freelancerAId, freelancerBId, mediatorStaffId, secondMediatorStaffId].filter(Boolean) as string[];
    if (userIds.length === 0) return;

    // Cleanup created test records
    await prisma.disputeEvidence.deleteMany({
      where: { submittedByUserId: { in: userIds } },
    });
    await prisma.dispute.deleteMany({
      where: { raisedByUserId: { in: userIds } },
    });
    await prisma.milestone.deleteMany({
      where: { contract: { clientId: { in: userIds } } },
    });
    await prisma.contract.deleteMany({
      where: { clientId: { in: userIds } },
    });
    await prisma.proposal.deleteMany({
      where: { freelancerId: { in: userIds } },
    });
    await prisma.job.deleteMany({
      where: { clientId: { in: userIds } },
    });
    await prisma.kycRecord.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.wallet.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  });

  it("completes a full multi-user proposal negotiation, digital signing, and delivery flow", async () => {
    // 1. Client posts job
    const job = await createJob({
      clientId,
      clientRole: "CLIENT",
      input: {
        title: "Fullstack Fintech App Development",
        category: "WEB_APP_DEVELOPMENT",
        description: "Develop responsive web app with Ethiopian payment gateway integrations.",
        budgetMin: { amountMinor: 200_000, currency: "ETB" },
        budgetMax: { amountMinor: 500_000, currency: "ETB" },
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        proposedMilestones: [
          { title: "UI Mockups & Architecture", amount: { amountMinor: 100_000, currency: "ETB" }, dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) },
          { title: "Backend & Payments", amount: { amountMinor: 150_000, currency: "ETB" }, dueDate: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10) },
        ],
      },
    });
    expect(job.id).toBeDefined();
    expect(job.status).toBe("OPEN");

    // 2. Freelancer A submits Proposal A with customized milestones
    const proposalA = await submitProposal({
      freelancerId: freelancerAId,
      freelancerRole: "FREELANCER",
      input: {
        jobId: job.id,
        coverLetter: "I have 5 years experience in building Telebirr and CBE integrations.",
        quotedAmount: { amountMinor: 200_000, currency: "ETB" },
        estimatedDays: 20,
        milestoneBreakdown: [
          { title: "M1: Frontend & Setup", amount: { amountMinor: 100_000, currency: "ETB" }, dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) },
          { title: "M2: Payment APIs & Tests", amount: { amountMinor: 100_000, currency: "ETB" }, dueDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10) },
        ],
      },
    });
    expect(proposalA.status).toBe("SUBMITTED");

    // 3. Freelancer B submits competing Proposal B
    const proposalB = await submitProposal({
      freelancerId: freelancerBId,
      freelancerRole: "FREELANCER",
      input: {
        jobId: job.id,
        coverLetter: "I can deliver this project quickly.",
        quotedAmount: { amountMinor: 250_000, currency: "ETB" },
        estimatedDays: 15,
        milestoneBreakdown: [
          { title: "M1: Complete Delivery", amount: { amountMinor: 250_000, currency: "ETB" }, dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10) },
        ],
      },
    });
    expect(proposalB.status).toBe("SUBMITTED");

    // 4. Freelancer B decides to withdraw Proposal B
    const withdrawnB = await withdrawProposal({
      proposalId: proposalB.id,
      requestingUserId: freelancerBId,
    });
    expect(withdrawnB.status).toBe("WITHDRAWN");

    // 5. Client accepts Proposal A atomically
    const decisionResult = await decideProposal({
      proposalId: proposalA.id,
      requestingUserId: clientId,
      decision: "ACCEPTED",
    });
    expect(decisionResult.proposal.status).toBe("ACCEPTED");
    expect(decisionResult.contract).toBeDefined();
    expect(decisionResult.contract.milestones.length).toBe(2);

    const contractId = decisionResult.contract.id;

    // 6. Digital Contract Acceptance (E-Signature) by both parties
    const clientSign = await acceptContract(clientId, contractId);
    expect(clientSign.clientAcceptedAt).toBeDefined();
    expect(clientSign.fullyExecuted).toBe(false);

    const freelancerSign = await acceptContract(freelancerAId, contractId);
    expect(freelancerSign.freelancerAcceptedAt).toBeDefined();
    expect(freelancerSign.fullyExecuted).toBe(true);

    // 7. Wallet-First Milestone 1 Funding
    const milestone1 = decisionResult.contract.milestones[0]!;
    const fundedM1 = await fundMilestoneFromWallet({
      clientId,
      milestoneId: milestone1.id,
    });
    expect(fundedM1.escrowState).toBe("ESCROW_HELD");

    // 8. Freelancer Delivers Milestone 1
    const deliveredM1 = await submitMilestone({
      freelancerId: freelancerAId,
      milestoneId: milestone1.id,
      deliverableUrl: "https://github.com/test/project-delivery-m1",
    });
    expect(deliveredM1.escrowState).toBe("SUBMITTED_FOR_REVIEW");

    // 9. Client Accepts Work and Releases Funds
    const initialFreelancerWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: freelancerAId } });
    await acceptMilestone({
      clientId,
      milestoneId: milestone1.id,
    });

    const settledM1 = await prisma.milestone.findUniqueOrThrow({ where: { id: milestone1.id } });
    expect(settledM1.escrowState).toBe("RELEASED");

    const updatedFreelancerWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: freelancerAId } });
    expect(updatedFreelancerWallet.balanceMinor).toBeGreaterThan(initialFreelancerWallet.balanceMinor);
  });

  it("handles Dispute Flow A: Mutual negotiation and direct settlement without staff", async () => {
    // Setup job & contract for mutual dispute test
    const job = await createJob({
      clientId,
      clientRole: "CLIENT",
      input: {
        title: "Logo Design Project",
        category: "GRAPHIC_DESIGN",
        description: "Vector branding and icon pack.",
        budgetMin: { amountMinor: 50_000, currency: "ETB" },
        budgetMax: { amountMinor: 100_000, currency: "ETB" },
        deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        proposedMilestones: [{ title: "Final Design", amount: { amountMinor: 50_000, currency: "ETB" }, dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) }],
      },
    });

    const proposal = await submitProposal({
      freelancerId: freelancerAId,
      freelancerRole: "FREELANCER",
      input: {
        jobId: job.id,
        coverLetter: "Professional illustrator here.",
        quotedAmount: { amountMinor: 50_000, currency: "ETB" },
        estimatedDays: 5,
        milestoneBreakdown: [{ title: "Final Design", amount: { amountMinor: 50_000, currency: "ETB" }, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) }],
      },
    });

    const { contract } = await decideProposal({ proposalId: proposal.id, requestingUserId: clientId, decision: "ACCEPTED" });
    await acceptContract(clientId, contract.id);
    await acceptContract(freelancerAId, contract.id);

    const milestone = contract.milestones[0]!;
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    // Client raises a dispute
    const dispute = await raiseDispute({
      raisedByUserId: clientId,
      contractId: contract.id,
      milestoneId: milestone.id,
      category: "QUALITY_ISSUE",
      description: "Delivered SVG files had missing layers and corrupted fonts.",
    });

    expect(dispute.stage).toBe("STAGE_1_NEGOTIATION");
    const disputedMilestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
    expect(disputedMilestone.escrowState).toBe("DISPUTED");

    // Freelancer proposes a 50/50 split settlement (25,000 minor units to freelancer)
    const proposed = await withdrawDisputeMutually({
      userId: freelancerAId,
      disputeId: dispute.id,
      proposedOutcome: "PARTIAL_SPLIT",
      proposedFreelancerShareMinor: 25_000,
    });
    expect(proposed.withdrawalRequestedByUserId).toBe(freelancerAId);
    expect(proposed.withdrawalProposedOutcome).toBe("PARTIAL_SPLIT");

    // Mismatched confirmation fails
    await expect(
      withdrawDisputeMutually({
        userId: clientId,
        disputeId: dispute.id,
        proposedOutcome: "REFUND_TO_CLIENT", // Mismatch with proposed PARTIAL_SPLIT
      })
    ).rejects.toThrow(MutualWithdrawalOutcomeMismatchError);

    // Client confirms matching 50/50 split proposal
    const resolvedDispute = await withdrawDisputeMutually({
      userId: clientId,
      disputeId: dispute.id,
      proposedOutcome: "PARTIAL_SPLIT",
      proposedFreelancerShareMinor: 25_000,
    });

    expect(resolvedDispute.stage).toBe("RESOLVED");
    expect(resolvedDispute.resolutionOutcome).toBe("PARTIAL_SPLIT");

    const finalMilestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
    expect(finalMilestone.escrowState).toBe("PARTIAL_REFUND");

    // Contract completes cleanly
    const finalContract = await prisma.contract.findUniqueOrThrow({ where: { id: contract.id } });
    expect(finalContract.status).toBe("COMPLETED");
  });

  it("handles Dispute Flow B: Evidence submission, queue claiming, and mediator resolution", async () => {
    // Setup job & contract
    const job = await createJob({
      clientId,
      clientRole: "CLIENT",
      input: {
        title: "Translation Task",
        category: "TRANSLATION",
        description: "Translate 20 pages from English to Amharic.",
        budgetMin: { amountMinor: 40_000, currency: "ETB" },
        budgetMax: { amountMinor: 40_000, currency: "ETB" },
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        proposedMilestones: [{ title: "Full Translation", amount: { amountMinor: 40_000, currency: "ETB" }, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) }],
      },
    });

    const proposal = await submitProposal({
      freelancerId: freelancerAId,
      freelancerRole: "FREELANCER",
      input: {
        jobId: job.id,
        coverLetter: "Certified Amharic translator.",
        quotedAmount: { amountMinor: 40_000, currency: "ETB" },
        estimatedDays: 3,
        milestoneBreakdown: [{ title: "Full Translation", amount: { amountMinor: 40_000, currency: "ETB" }, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }],
      },
    });

    const { contract } = await decideProposal({ proposalId: proposal.id, requestingUserId: clientId, decision: "ACCEPTED" });
    await acceptContract(clientId, contract.id);
    await acceptContract(freelancerAId, contract.id);

    const milestone = contract.milestones[0]!;
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    // Freelancer raises dispute
    const dispute = await raiseDispute({
      raisedByUserId: freelancerAId,
      contractId: contract.id,
      milestoneId: milestone.id,
      category: "COMMUNICATION_BREAKDOWN",
      description: "Client stopped responding after work was provided via draft.",
    });

    // Escalation & Evidence submission
    const escalatedDispute = await submitEvidence({
      userId: freelancerAId,
      disputeId: dispute.id,
      statement: "Here is the timestamped chat and full delivery log.",
    });
    expect(escalatedDispute.stage).toBe("STAGE_3_MEDIATION");

    // Compliance Officer views mediation queue
    const queue = await getMediationQueue({ status: "STAGE_3_MEDIATION" });
    expect(queue.items.some((d) => d.id === dispute.id)).toBe(true);

    // Mediator 1 claims dispute atomically
    const claimed = await claimDisputeAsMediator({
      staffUserId: mediatorStaffId,
      disputeId: dispute.id,
    });
    expect(claimed.assignedMediatorStaffId).toBe(mediatorStaffId);

    // Mediator 2 attempting to claim the same dispute is rejected
    await expect(
      claimDisputeAsMediator({
        staffUserId: secondMediatorStaffId,
        disputeId: dispute.id,
      })
    ).rejects.toThrow(DisputeAlreadyClaimedError);

    // Mediator 1 resolves the dispute with RELEASE_TO_FREELANCER
    const resolved = await resolveDispute({
      staffUserId: mediatorStaffId,
      disputeId: dispute.id,
      outcome: "RELEASE_TO_FREELANCER",
      recommendation: "Freelancer demonstrated full delivery of translation assets.",
    });

    expect(resolved.stage).toBe("RESOLVED");
    expect(resolved.resolutionOutcome).toBe("RELEASE_TO_FREELANCER");

    const resolvedMilestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
    expect(resolvedMilestone.escrowState).toBe("RELEASED");
  });

  it("handles Dispute Flow C: Escalation to Arbitration and Applying Arbitration Award", async () => {
    // Setup job & contract
    const job = await createJob({
      clientId,
      clientRole: "CLIENT",
      input: {
        title: "Enterprise Security Audit",
        category: "WEB_APP_DEVELOPMENT",
        description: "Penetration testing and security report.",
        budgetMin: { amountMinor: 100_000, currency: "ETB" },
        budgetMax: { amountMinor: 100_000, currency: "ETB" },
        deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        proposedMilestones: [{ title: "Audit Report", amount: { amountMinor: 100_000, currency: "ETB" }, dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) }],
      },
    });

    const proposal = await submitProposal({
      freelancerId: freelancerAId,
      freelancerRole: "FREELANCER",
      input: {
        jobId: job.id,
        coverLetter: "Certified Ethical Hacker.",
        quotedAmount: { amountMinor: 100_000, currency: "ETB" },
        estimatedDays: 7,
        milestoneBreakdown: [{ title: "Audit Report", amount: { amountMinor: 100_000, currency: "ETB" }, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }],
      },
    });

    const { contract } = await decideProposal({ proposalId: proposal.id, requestingUserId: clientId, decision: "ACCEPTED" });
    await acceptContract(clientId, contract.id);
    await acceptContract(freelancerAId, contract.id);

    const milestone = contract.milestones[0]!;
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    const dispute = await raiseDispute({
      raisedByUserId: clientId,
      contractId: contract.id,
      milestoneId: milestone.id,
      category: "NON_DELIVERY",
      description: "Report was not delivered on the scheduled date.",
    });

    // Advance to Stage 3 via evidence
    await submitEvidence({
      userId: clientId,
      disputeId: dispute.id,
      statement: "No deliverables received by the contractual deadline.",
    });

    // Escalation to Stage 4 AACCSA Arbitration
    const arbitrated = await escalateToArbitration({
      userId: clientId,
      disputeId: dispute.id,
    });
    expect(arbitrated.stage).toBe("STAGE_4_ARBITRATION");

    // Compliance Officer records and applies AACCSA arbitration award
    const initialClientWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: clientId } });

    const awarded = await applyArbitrationAward({
      staffUserId: mediatorStaffId,
      disputeId: dispute.id,
      awardReferenceNumber: "AACCSA-ARB-2026-0042",
      outcome: "REFUND_TO_CLIENT",
      recommendation: "AACCSA ruling order #42: Full refund granted to client due to material breach.",
    });

    expect(awarded.stage).toBe("RESOLVED");
    expect(awarded.awardReferenceNumber).toBe("AACCSA-ARB-2026-0042");
    expect(awarded.resolutionOutcome).toBe("REFUND_TO_CLIENT");

    const finalClientWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: clientId } });
    expect(finalClientWallet.balanceMinor).toBe(initialClientWallet.balanceMinor + milestone.amountMinor);

    const refundedMilestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
    expect(refundedMilestone.escrowState).toBe("REFUNDED");
  });
});
