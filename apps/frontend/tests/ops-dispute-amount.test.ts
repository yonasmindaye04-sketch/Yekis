import { describe, expect, it } from "vitest";
import { toDispute } from "../src/pages/ops/opsApi";
import { buildActionItems } from "../src/pages/ops/components/actionCenter";
import type { RawDisputeItem } from "../src/pages/ops/opsBackend";

describe("OPS-02: disputed amounts reflect only disputed milestones", () => {
  it("uses server disputedAmountMinor for seed-contract-brand disputes (22k + 9k = 31k, never 64k)", () => {
    const sharedContract = {
      id: "seed-contract-brand",
      job: { title: "Brand & Packaging" },
      client: { id: "c1", email: "client@yekis.et" },
      freelancer: { id: "f1", email: "freelancer@yekis.et" },
      milestones: [
        { id: "seed-ms-brand-1", title: "Logo concepts", amountMinor: 1_800_000, escrowState: "RELEASED" as const, deliverableUrl: null },
        { id: "seed-ms-brand-2", title: "Brand guidelines", amountMinor: 2_200_000, escrowState: "DISPUTED" as const, deliverableUrl: null },
        { id: "seed-ms-brand-3", title: "Social media kit", amountMinor: 1_500_000, escrowState: "WORK_IN_PROGRESS" as const, deliverableUrl: null },
        { id: "seed-ms-brand-4", title: "Packaging templates", amountMinor: 900_000, escrowState: "DISPUTED" as const, deliverableUrl: null },
      ],
    };

    const d1: RawDisputeItem = {
      id: "seed-dispute-brand-quality",
      milestoneId: "seed-ms-brand-2",
      category: "QUALITY_ISSUE",
      stage: "STAGE_3_MEDIATION",
      description: "Quality issue",
      negotiationDeadlineAt: null,
      mediationDeadlineAt: null,
      createdAt: "2026-11-15T00:00:00.000Z",
      disputedAmountMinor: 2_200_000,
      disputedMilestone: {
        id: "seed-ms-brand-2",
        title: "Brand guidelines",
        amountMinor: 2_200_000,
        escrowState: "DISPUTED",
        deliverableUrl: null,
      },
      evidence: [],
      contract: sharedContract,
    };

    const d2: RawDisputeItem = {
      id: "seed-dispute-brand-scope",
      milestoneId: "seed-ms-brand-4",
      category: "SCOPE_CREEP",
      stage: "STAGE_1_NEGOTIATION",
      description: "Scope creep",
      negotiationDeadlineAt: null,
      mediationDeadlineAt: null,
      createdAt: "2026-11-21T00:00:00.000Z",
      disputedAmountMinor: 900_000,
      disputedMilestone: {
        id: "seed-ms-brand-4",
        title: "Packaging templates",
        amountMinor: 900_000,
        escrowState: "DISPUTED",
        deliverableUrl: null,
      },
      evidence: [],
      contract: sharedContract,
    };

    const mapped = [toDispute(d1), toDispute(d2)];
    expect(mapped[0].amt).toBe(2_200_000);
    expect(mapped[0].ms).toBe("Brand guidelines");
    expect(mapped[1].amt).toBe(900_000);
    expect(mapped[1].ms).toBe("Packaging templates");
    expect(mapped.reduce((s, d) => s + d.amt, 0)).toBe(3_100_000);

    const actions = buildActionItems({
      disputes: [{ ...mapped[0], slaH: -12 }],
      riskFlags: [],
      health: { checks: {}, ledger: { dr: 0, cr: 0, bal: true }, checkedAt: "2026-11-27T00:00:00.000Z" },
      recon: [],
      payouts: [],
      kyc: [],
      reports: [],
    });
    expect(actions[0].why).toContain("ETB 22,000");
    expect(actions[0].why).not.toContain("64,000");
  });
});
