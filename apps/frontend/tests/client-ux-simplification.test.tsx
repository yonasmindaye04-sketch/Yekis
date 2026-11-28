import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../src/theme/ThemeContext";
import { LanguageProvider } from "../src/i18n";
import { GuideProvider } from "../src/components/guide/GuideContext";
import { ShadcnLayoutProvider } from "../src/components/dashboard/ShadcnLayoutContext";
import { MarketplaceShadcnDashboard } from "../src/components/dashboard/MarketplaceShadcnDashboard";
import { AdvancedDataTable } from "../src/components/dashboard/AdvancedDataTable";
import { CalendarScheduleView } from "../src/components/dashboard/CalendarScheduleView";
import type { Contract, Job, Milestone, TopUpRequest } from "../src/api/client";

function renderDashboard(props: Partial<React.ComponentProps<typeof MarketplaceShadcnDashboard>>) {
  return renderToStaticMarkup(
    <ThemeProvider>
      <LanguageProvider>
        <GuideProvider>
          <ShadcnLayoutProvider>
            <MarketplaceShadcnDashboard
              userId="usr-client-1"
              kycVerified={false}
              kycStatus="NOT_STARTED"
              proposalsCount={0}
              unreadMessagesCount={0}
              canHire={true}
              canWork={false}
              viewerRole="CLIENT"
              wallet={{ balanceMinor: 0 }}
              jobs={[]}
              myJobs={[]}
              contracts={[]}
              milestones={[]}
              topUps={[]}
              isRefreshing={false}
              onRefresh={() => {}}
              onNavigateView={() => {}}
              {...props}
            />
          </ShadcnLayoutProvider>
        </GuideProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("Client UX simplification Phase 1", () => {
  it("renders zero-state Client Home with checklist first, single Verify identity CTA, and no KPI strip or charts", () => {
    const html = renderDashboard({
      kycVerified: false,
      kycStatus: "NOT_STARTED",
    });

    expect(html).toContain("Your first protected hire on Yekis");
    expect(html).toContain("Verify identity");
    expect(html).toContain("sh-unlock-btn");
    expect(html).toContain("Browse services");
    expect(html.match(/Browse services/g)?.length).toBe(1);
    expect(html).not.toContain('data-tour="dashboard-kpis"');
    expect(html).not.toContain("Recent Escrow");
    expect(html).not.toContain("Insights");
  });

  it("shows KPI strip when client has at least one job even before contracts or milestones exist", () => {
    const job: Job = {
      id: "job-only-1",
      title: "Mobile App QA Audit",
      category: "WEB_APP_DEVELOPMENT",
      description: "Test core onboarding and payment flows on mobile.",
      budgetMinMinor: 250_000,
      budgetMaxMinor: 400_000,
      deadline: "2026-12-20T00:00:00Z",
      status: "OPEN",
      proposalsCount: 0,
      clientId: "usr-client-1",
      createdAt: "2026-11-27T00:00:00Z",
    } as Job;

    const html = renderDashboard({
      kycVerified: true,
      kycStatus: "VERIFIED",
      myJobs: [job],
    });

    expect(html).toContain('data-tour="dashboard-kpis"');
    expect(html).toContain("Wallet balance");
    expect(html).toContain("Held in escrow");
    expect(html).toContain("Your open jobs");
  });

  it("keeps zero-state Home with pending top-up shown once in checklist step 3 (not Done)", () => {
    const pendingTopUp: TopUpRequest = {
      id: "tu-pending-1",
      method: "TELEBIRR",
      amountMinor: 150_000,
      status: "PENDING",
      createdAt: "2026-11-27T10:00:00Z",
    } as TopUpRequest;

    const html = renderDashboard({
      kycVerified: true,
      kycStatus: "VERIFIED",
      topUps: [pendingTopUp],
    });

    expect(html).toContain("Your first protected hire on Yekis");
    expect(html).toContain("Waiting for approval");
    expect(html).toContain("We will notify you once approved");
    expect(html).not.toContain("sh-pending-banner");
    expect(html).not.toContain('data-tour="dashboard-kpis"');
  });

  it("renders active Client Home in 3.2 order with Needs your attention, Active contracts, Your open jobs, 2 compact KPIs, and Insights only when settled", () => {
    const job: Job = {
      id: "job-1",
      title: "Build Ethiopian Accounting Portal",
      category: "WEB_APP_DEVELOPMENT",
      description: "Scope description with at least twenty characters here.",
      budgetMinMinor: 500_000,
      budgetMaxMinor: 800_000,
      deadline: "2026-12-15T00:00:00Z",
      status: "OPEN",
      proposalsCount: 3,
      clientId: "usr-client-1",
      createdAt: "2026-11-20T00:00:00Z",
    } as Job;

    const msReview: Milestone = {
      id: "ms-1",
      contractId: "con-1",
      title: "Frontend Prototype",
      amountMinor: 400_000,
      dueDate: "2026-11-30T00:00:00Z",
      escrowState: "SUBMITTED_FOR_REVIEW",
      autoReleaseAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      contract: {
        id: "con-1",
        title: "Build Ethiopian Accounting Portal",
        fullyExecuted: true,
        freelancerName: "Dawit Abebe",
      },
      counterparty: {
        id: "usr-fl-1",
        name: "Dawit Abebe",
        email: "dawit@yekis.et",
        role: "FREELANCER",
      },
    } as unknown as Milestone;

    const contract: Contract = {
      id: "con-1",
      jobId: "job-1",
      clientId: "usr-client-1",
      freelancerId: "usr-fl-1",
      templateVersion: "v2.4",
      clientAcceptedAt: "2026-11-21T00:00:00Z",
      freelancerAcceptedAt: "2026-11-21T00:00:00Z",
      fullyExecuted: true,
      status: "ACTIVE",
      createdAt: "2026-11-21T00:00:00Z",
      job: { id: "job-1", title: "Build Ethiopian Accounting Portal", status: "OPEN" },
      freelancer: {
        id: "usr-fl-1",
        email: "dawit@yekis.et",
        firstName: "Dawit",
        lastName: "Abebe",
        displayName: "Dawit Abebe",
      },
      milestones: [msReview],
    };

    const htmlNoSettled = renderDashboard({
      kycVerified: true,
      kycStatus: "VERIFIED",
      wallet: { balanceMinor: 900_000 },
      myJobs: [job],
      contracts: [contract],
      milestones: [msReview],
      unreadMessagesCount: 2,
    });

    const attIdx = htmlNoSettled.indexOf("Needs your attention");
    const contractsIdx = htmlNoSettled.indexOf("Active contracts");
    const jobsIdx = htmlNoSettled.indexOf("Your open jobs");
    const kpiIdx = htmlNoSettled.indexOf("Wallet balance");

    expect(attIdx).toBeGreaterThan(-1);
    expect(contractsIdx).toBeGreaterThan(attIdx);
    expect(jobsIdx).toBeGreaterThan(contractsIdx);
    expect(kpiIdx).toBeGreaterThan(jobsIdx);
    expect(htmlNoSettled).toContain("Held in escrow");
    expect(htmlNoSettled).toContain("Auto-releases in");
    expect(htmlNoSettled).toContain("Unread messages");
    expect(htmlNoSettled).not.toContain("Work in progress");
    expect(htmlNoSettled).not.toContain("Payments by method");
    expect(htmlNoSettled).not.toContain("sh-insights-details");

    const htmlWithApprovedTopUp = renderDashboard({
      kycVerified: true,
      kycStatus: "VERIFIED",
      wallet: { balanceMinor: 900_000 },
      myJobs: [job],
      contracts: [contract],
      milestones: [msReview],
      topUps: [
        {
          id: "tu-ok",
          method: "TELEBIRR",
          amountMinor: 900_000,
          status: "APPROVED",
          createdAt: "2026-11-20T00:00:00Z",
        } as TopUpRequest,
      ],
    });

    expect(htmlWithApprovedTopUp).toContain("sh-insights-details");
    expect(htmlWithApprovedTopUp).toContain("Insights");
  });

  it("renders Freelancer mode with all 4 KPIs and no client checklist", () => {
    const html = renderDashboard({
      viewerRole: "FREELANCER",
      canHire: false,
      canWork: true,
      kycVerified: true,
      kycStatus: "VERIFIED",
    });

    expect(html).toContain("Wallet balance");
    expect(html).toContain("Held in escrow");
    expect(html).toContain("Work in progress");
    expect(html).toContain("Open jobs");
    expect(html).not.toContain("Your first protected hire on Yekis");
  });

  it("renders simplified List and Calendar empty states when zero events/milestones exist", () => {
    const emptyTableHtml = renderToStaticMarkup(
      <ThemeProvider>
        <LanguageProvider>
          <GuideProvider>
            <ShadcnLayoutProvider>
              <AdvancedDataTable
                records={[]}
                viewerRole="CLIENT"
                onNavigateView={() => {}}
              />
            </ShadcnLayoutProvider>
          </GuideProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(emptyTableHtml).toContain("No milestones yet");
    expect(emptyTableHtml).toContain("Post a job");
    expect(emptyTableHtml).not.toContain("Export CSV");

    const emptyCalHtml = renderToStaticMarkup(
      <LanguageProvider>
        <GuideProvider>
          <CalendarScheduleView events={[]} />
        </GuideProvider>
      </LanguageProvider>,
    );

    expect(emptyCalHtml).toContain("Today");
    expect(emptyCalHtml).toContain("Add Reminder");
    expect(emptyCalHtml).not.toContain("sh-cal-legend");
    expect(emptyCalHtml).not.toContain("sh-fiscal-bar");
  });
});
