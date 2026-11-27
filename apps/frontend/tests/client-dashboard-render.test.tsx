import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MarketplaceShadcnDashboard } from "../src/components/dashboard/MarketplaceShadcnDashboard";
import { ShadcnLayoutProvider } from "../src/components/dashboard/ShadcnLayoutContext";
import { GuideProvider } from "../src/components/guide/GuideContext";
import { LanguageProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme/ThemeContext";
import type { Job, Milestone, TopUpRequest, WalletResponse } from "../src/api/client";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const SAMPLE_WALLET: WalletResponse = {
  id: "wal-1",
  userId: "user-1",
  balanceMinor: 500_000,
  currency: "ETB",
  updatedAt: "2026-11-27T10:00:00.000Z",
};

const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: "ms-1",
    contractId: "cnt-1",
    title: "UI Prototype",
    amountMinor: 100_000,
    escrowState: "ESCROW_HELD",
    dueDate: "2026-12-05T00:00:00.000Z",
    submittedAt: null,
    autoReleaseAt: null,
    releasedAt: null,
    fundedAt: "2026-11-26T10:00:00.000Z",
    paymentRail: "TELEBIRR",
    contract: {
      title: "Platform Redesign",
      category: "WEB_APP_DEVELOPMENT",
      fullyExecuted: true,
      clientName: "Selam Client",
      freelancerName: "Dawit Freelancer",
    },
    counterparty: {
      id: "user-2",
      name: "Dawit Freelancer",
      email: "dawit@example.et",
      role: "FREELANCER",
    },
  },
  {
    id: "ms-2",
    contractId: "cnt-1",
    title: "QA Signoff",
    amountMinor: 150_000,
    escrowState: "SUBMITTED_FOR_REVIEW",
    dueDate: "2026-12-10T00:00:00.000Z",
    submittedAt: "2026-11-27T08:00:00.000Z",
    autoReleaseAt: "2026-12-04T08:00:00.000Z",
    releasedAt: null,
    fundedAt: "2026-11-26T10:00:00.000Z",
    paymentRail: "TELEBIRR",
    contract: {
      title: "Platform Redesign",
      category: "WEB_APP_DEVELOPMENT",
      fullyExecuted: true,
      clientName: "Selam Client",
      freelancerName: "Dawit Freelancer",
    },
    counterparty: {
      id: "user-2",
      name: "Dawit Freelancer",
      email: "dawit@example.et",
      role: "FREELANCER",
    },
  },
];

const SAMPLE_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Build Ethiopian Marketplace UI",
    description: "Design and build workspace views",
    category: "WEB_APP_DEVELOPMENT",
    budgetMinMinor: 100_000,
    budgetMaxMinor: 250_000,
    status: "OPEN",
    deadline: "2026-12-15T00:00:00.000Z",
    createdAt: "2026-11-20T10:00:00.000Z",
  },
];

const SAMPLE_TOPUPS: TopUpRequest[] = [];

function renderDashboard(props: {
  canHire: boolean;
  canWork: boolean;
  viewerRole: "CLIENT" | "FREELANCER";
}) {
  return renderToStaticMarkup(
    <ThemeProvider>
      <LanguageProvider>
        <ShadcnLayoutProvider>
          <GuideProvider>
            <MarketplaceShadcnDashboard
              userId="user-1"
              kycVerified={true}
              kycStatus="VERIFIED"
              proposalsCount={2}
              canHire={props.canHire}
              canWork={props.canWork}
              viewerRole={props.viewerRole}
              wallet={SAMPLE_WALLET}
              jobs={SAMPLE_JOBS}
              myJobs={SAMPLE_JOBS}
              milestones={SAMPLE_MILESTONES}
              topUps={SAMPLE_TOPUPS}
              isRefreshing={false}
              onRefresh={() => {}}
              onNavigateView={() => {}}
            />
          </GuideProvider>
        </ShadcnLayoutProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("A1 OPS-15: MarketplaceShadcnDashboard renders across all user roles", () => {
  it("mounts cleanly for a CLIENT", () => {
    const html = renderDashboard({
      canHire: true,
      canWork: false,
      viewerRole: "CLIENT",
    });
    expect(html).toContain("QA Signoff");
    expect(html).toContain("Build Ethiopian Marketplace UI");
    expect(html).toContain("5,000");
  });

  it("mounts cleanly for a FREELANCER", () => {
    const html = renderDashboard({
      canHire: false,
      canWork: true,
      viewerRole: "FREELANCER",
    });
    expect(html).toContain("UI Prototype");
  });

  it("mounts cleanly for a dual-role (BOTH) user in both client and freelancer modes", () => {
    const asClient = renderDashboard({
      canHire: true,
      canWork: true,
      viewerRole: "CLIENT",
    });
    const asFreelancer = renderDashboard({
      canHire: true,
      canWork: true,
      viewerRole: "FREELANCER",
    });
    expect(asClient).toContain("QA Signoff");
    expect(asFreelancer).toContain("UI Prototype");
  });
});
