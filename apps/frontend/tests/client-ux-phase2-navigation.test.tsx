import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type NotificationItem } from "../src/api/client";
import { markViewNotificationsRead } from "../src/api/notificationFeed";
import { BrowserVerification } from "../src/BrowserVerification";
import { GuideProvider } from "../src/components/guide/GuideContext";
import { MODULE_TOURS } from "../src/components/guide/guideConfig";
import { GUIDE_MODULE_IDS } from "../src/components/guide/guideTypes";
import { LanguageProvider } from "../src/i18n";
import {
  getActiveGuideModule,
  getAggregatedNavBadgeCount,
  getAvatarMenuViews,
  getNotificationReadViews,
  getSidebarVisibleViews,
  getTabSelectionForView,
  MOBILE_BOTTOM_NAV_VIEWS,
  resolveViewAlias,
  type WorkspaceView,
} from "../src/navigation/workspaceNavigation";
import { ThemeProvider } from "../src/theme/ThemeContext";
import {
  ContractsWorkspace,
  DisputesWorkspace,
  EscrowWorkspace,
  JobsWorkspace,
} from "../src/WorkflowWorkspace";

function makeNotification(
  id: string,
  type: string,
  isRead = false,
): NotificationItem {
  return {
    id,
    type,
    message: `Event ${type}`,
    isRead,
    createdAt: "2026-11-28T06:00:00.000Z",
    metadata: {},
  };
}

describe("Client UX Phase 2 navigation consolidation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps alias Views cleanly into consolidated Jobs & Contracts shells with zero lost routes", () => {
    expect(resolveViewAlias("proposals")).toEqual({
      view: "jobs",
      jobsTab: "proposals",
    });
    expect(resolveViewAlias("jobs")).toEqual({
      view: "jobs",
      jobsTab: "jobs",
    });
    expect(resolveViewAlias("escrow")).toEqual({
      view: "contracts",
      contractsTab: "payments",
    });
    expect(resolveViewAlias("cases")).toEqual({
      view: "contracts",
      contractsTab: "disputes",
    });
    expect(resolveViewAlias("contracts")).toEqual({
      view: "contracts",
      contractsTab: "overview",
    });

    for (const v of [
      "overview",
      "gigs",
      "my-gigs",
      "wallet",
      "chat",
      "verification",
      "settings",
      "profile",
      "profile-edit",
    ] satisfies WorkspaceView[]) {
      expect(resolveViewAlias(v)).toEqual({ view: v });
    }

    expect(getTabSelectionForView("proposals").jobsTab).toBe("proposals");
    expect(getTabSelectionForView("escrow").contractsTab).toBe("payments");
    expect(getTabSelectionForView("cases").contractsTab).toBe("disputes");
  });

  it("builds 6-item Client desktop sidebar, Option B mobile bar, and header-menu Account/Services reachability", () => {
    const clientDesktop = getSidebarVisibleViews({
      canWork: false,
      isStaff: false,
      isMobileViewport: false,
    });
    expect(clientDesktop).toEqual([
      "overview",
      "jobs",
      "gigs",
      "contracts",
      "wallet",
      "chat",
    ]);

    const freelancerDesktop = getSidebarVisibleViews({
      canWork: true,
      isStaff: false,
      isMobileViewport: false,
    });
    expect(freelancerDesktop).toContain("my-gigs");

    // Header menu drawer on 360px mobile keeps Services, Profile, Identity verification, and Settings reachable
    const clientMobileDrawer = getSidebarVisibleViews({
      canWork: false,
      isStaff: false,
      isMobileViewport: true,
    });
    expect(clientMobileDrawer).toEqual(
      expect.arrayContaining([
        "gigs",
        "profile",
        "verification",
        "settings",
      ]),
    );

    expect(MOBILE_BOTTOM_NAV_VIEWS).toEqual([
      "overview",
      "jobs",
      "contracts",
      "wallet",
      "chat",
    ]);

    expect(getAvatarMenuViews(false)).toEqual([
      "profile",
      "verification",
      "settings",
    ]);
    expect(getAvatarMenuViews(true)).toEqual(["profile", "settings"]);
  });

  it("clears unread notifications only when the matching host view and sub-tab are active", async () => {
    const spy = vi
      .spyOn(api, "markNotificationRead")
      .mockResolvedValue({ ok: true } as any);

    const items: NotificationItem[] = [
      makeNotification("n-prop", "proposal-received"),
      makeNotification("n-con", "contract-executed"),
      makeNotification("n-ms", "milestone-submitted"),
      makeNotification("n-case", "dispute-raised"),
      makeNotification("n-kyc", "kyc-periodic-review-due"),
    ];

    expect(
      getAggregatedNavBadgeCount("jobs", {
        newBriefsCount: 1,
        unreadByView: { jobs: 1, proposals: 2 },
      }),
    ).toBe(4);
    expect(
      getAggregatedNavBadgeCount("contracts", {
        newBriefsCount: 0,
        unreadByView: { contracts: 1, escrow: 3, cases: 1 },
      }),
    ).toBe(5);

    // Viewing Jobs -> My jobs does NOT prematurely clear unread proposal notifications
    await markViewNotificationsRead(
      getNotificationReadViews({
        view: "jobs",
        jobsTab: "jobs",
        contractsTab: "overview",
      }),
      items,
    );
    expect(spy).not.toHaveBeenCalled();

    // Switching to Proposals tab (directly or via alias) clears "proposals" notifications
    await markViewNotificationsRead(
      getNotificationReadViews({
        view: "jobs",
        jobsTab: "proposals",
        contractsTab: "overview",
      }),
      items,
    );
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["n-prop"]);

    spy.mockClear();

    // Viewing Contracts -> Overview clears contract notifications while leaving Disputes ("cases") unread
    await markViewNotificationsRead(
      getNotificationReadViews({
        view: "contracts",
        jobsTab: "jobs",
        contractsTab: "overview",
      }),
      items,
    );
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["n-con", "n-ms"]);

    spy.mockClear();

    // Switching to Contracts -> Disputes clears "cases" notifications
    await markViewNotificationsRead(
      getNotificationReadViews({
        view: "contracts",
        jobsTab: "jobs",
        contractsTab: "disputes",
      }),
      items,
    );
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["n-case"]);

    spy.mockClear();

    // Opening Verification from avatar/header menu clears "verification" notifications
    await markViewNotificationsRead(
      getNotificationReadViews({
        view: "verification",
        jobsTab: "jobs",
        contractsTab: "overview",
      }),
      items,
    );
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["n-kyc"]);
  });

  it("preserves all 12 Yekis Guide module tours and mounts merged tab targets cleanly", () => {
    for (const moduleId of GUIDE_MODULE_IDS) {
      const targetView: WorkspaceView =
        moduleId === "gigs" ? "gigs" : (moduleId as WorkspaceView);
      const resolved = resolveViewAlias(targetView);
      const activeGuide = getActiveGuideModule({
        view: resolved.view,
        jobsTab: resolved.jobsTab ?? "jobs",
        contractsTab: resolved.contractsTab ?? "overview",
      });
      expect(activeGuide).toBe(moduleId);
      expect(MODULE_TOURS[moduleId].steps.length).toBeGreaterThan(0);
    }

    const wrap = (node: React.ReactNode) =>
      renderToStaticMarkup(
        <ThemeProvider>
          <LanguageProvider>
            <GuideProvider>{node}</GuideProvider>
          </LanguageProvider>
        </ThemeProvider>,
      );

    const jobsOverviewHtml = wrap(
      <JobsWorkspace role="CLIENT" openJobs={[]} onChanged={async () => {}} section="jobs" />,
    );
    expect(jobsOverviewHtml).toContain('data-tour="jobs-my-briefs"');

    const proposalsTabHtml = wrap(
      <JobsWorkspace role="CLIENT" openJobs={[]} onChanged={async () => {}} section="proposals" />,
    );
    expect(proposalsTabHtml).toContain('data-tour="proposals-hiring-pipeline"');

    const contractsTabHtml = wrap(
      <ContractsWorkspace userId="usr-1" onChanged={async () => {}} />,
    );
    expect(contractsTabHtml).toContain('data-tour="contracts-kpis"');
    expect(contractsTabHtml).toContain('data-tour="contracts-filters"');

    const paymentsTabHtml = wrap(
      <EscrowWorkspace userId="usr-1" onChanged={async () => {}} />,
    );
    expect(paymentsTabHtml).toContain('data-tour="escrow-kpis"');
    expect(paymentsTabHtml).toContain('data-tour="escrow-filters"');

    const disputesTabHtml = wrap(<DisputesWorkspace />);
    expect(disputesTabHtml).toContain('data-tour="disputes-workspace"');

    const verificationHtml = wrap(<BrowserVerification />);
    expect(verificationHtml).toContain('data-tour="kyc-status-header"');
    expect(verificationHtml).toContain('data-tour="kyc-form-card"');
  });
});
