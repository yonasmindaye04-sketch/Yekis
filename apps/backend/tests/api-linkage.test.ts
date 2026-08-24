import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../frontend/src/api/client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("frontend journey API linkage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse({ id: "result" }));
    vi.stubGlobal("fetch", fetchMock);
    api.setToken("test-token");
  });

  it("submits proposals to the job-scoped route with shared-schema money shapes", async () => {
    await api.submitProposal({
      jobId: "cm0job0000000000000000000",
      coverLetter: "A detailed delivery approach for this project.",
      quotedAmountMinor: 250_000,
      estimatedDays: 10,
      milestoneBreakdown: [{ title: "Delivery", amountMinor: 250_000, dueDate: "2026-09-01" }],
    });

    const [path, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/jobs/cm0job0000000000000000000/proposals");
    expect(JSON.parse(options.body as string)).toEqual({
      coverLetter: "A detailed delivery approach for this project.",
      quotedAmount: { amountMinor: 250_000, currency: "ETB" },
      estimatedDays: 10,
      milestoneBreakdown: [{
        title: "Delivery",
        amount: { amountMinor: 250_000, currency: "ETB" },
        dueDate: "2026-09-01",
      }],
    });
  });

  it("sends both contract and milestone identifiers when funding escrow", async () => {
    await api.fundMilestone("contract-1", "milestone-1", "TELEBIRR");
    const [path, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/escrow/fund");
    expect(JSON.parse(options.body as string)).toEqual({
      contractId: "contract-1",
      milestoneId: "milestone-1",
      provider: "TELEBIRR",
    });
  });

  it("links contract signatures, disputes, Tier 2, and withdrawals to their live routes", async () => {
    await api.acceptContract("contract-1");
    await api.raiseDispute({ contractId: "contract-1", milestoneId: "milestone-1", category: "QUALITY_ISSUE", description: "The submitted work does not match the agreed scope." });
    await api.upgradeKycTier2({ tin: "TIN-12345" });
    await api.withdrawWallet({ amountMinor: 50_000, provider: "TELEBIRR", payoutAccountIdentifier: "+251911223344" });

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/v1/contracts/contract-1/accept",
      "/api/v1/disputes",
      "/api/v1/kyc/upgrade-tier2",
      "/api/v1/escrow/wallet/withdraw",
    ]);
  });

  it("links proposal negotiations, milestone delivery, and dispute stages to their live routes", async () => {
    await api.decideProposal("prop-1", "ACCEPTED");
    await api.withdrawProposal("prop-2");
    await api.fundMilestoneFromWallet("ms-1");
    await api.submitMilestone("ms-1");
    await api.acceptMilestone("ms-1");
    await api.escalateDispute("disp-1");
    await api.submitDisputeEvidence("disp-1", "Detailed delivery proof and logs");
    await api.escalateDisputeToArbitration("disp-1");
    await api.resolveDispute("disp-1", {
      outcome: "RELEASE_TO_FREELANCER",
      recommendation: "Evidence confirmed delivery",
    });

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/v1/jobs/proposals/prop-1/decision",
      "/api/v1/jobs/proposals/prop-2/withdraw",
      "/api/v1/escrow/fund-from-wallet",
      "/api/v1/escrow/milestones/ms-1/submit",
      "/api/v1/escrow/milestones/ms-1/accept",
      "/api/v1/disputes/disp-1/escalate",
      "/api/v1/disputes/disp-1/evidence",
      "/api/v1/disputes/disp-1/arbitration",
      "/api/v1/disputes/disp-1/resolve",
    ]);
  });
});
