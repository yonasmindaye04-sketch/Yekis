import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  KanbanBoardView,
  getKanbanDueStatus,
} from "../src/components/dashboard/KanbanBoardView";
import type { KanbanTask } from "../src/components/dashboard/dashboardData";
import { LanguageProvider } from "../src/i18n";
import { GuideProvider } from "../src/components/guide/GuideContext";

const SAMPLE_TASKS: KanbanTask[] = [
  {
    id: "t-1",
    code: "MS-101",
    title: "Telebirr Webhook Signature Verification",
    contractId: "c-1",
    contractTitle: "Telebirr Checkout Integration",
    counterparty: "Abebe Bikila",
    client: "Addis FinTech PLC",
    freelancer: "Abebe Bikila",
    rail: "TELEBIRR",
    amountMinor: 5_000_000,
    platformFeeMinor: 500_000,
    providerFeeMinor: 100_000,
    clientFeeMinor: 0,
    clientTotalChargeMinor: 5_000_000,
    netPayoutMinor: 4_400_000,
    dueDate: "2026-11-20",
    priority: "HIGH",
    column: "WORK_IN_PROGRESS",
    escrowState: "WORK_IN_PROGRESS",
    category: "backend engineering",
  },
  {
    id: "t-2",
    code: "MS-102",
    title: "Mobile Wallet Reconciliation Report",
    contractId: "c-2",
    contractTitle: "CBE Birr Settlement Portal",
    counterparty: "Selamawit Tesfaye",
    client: "Horn Commerce",
    freelancer: "Selamawit Tesfaye",
    rail: "CBE_BIRR",
    amountMinor: 2_500_000,
    platformFeeMinor: 250_000,
    providerFeeMinor: 50_000,
    clientFeeMinor: 0,
    clientTotalChargeMinor: 2_500_000,
    netPayoutMinor: 2_200_000,
    dueDate: "2026-12-05",
    priority: "LOW",
    column: "RELEASED",
    escrowState: "RELEASED",
    category: "finance",
  },
];

function renderKanban(tasks: KanbanTask[] = SAMPLE_TASKS) {
  return renderToStaticMarkup(
    <LanguageProvider>
      <GuideProvider>
        <KanbanBoardView
          tasks={tasks}
          viewerRole="CLIENT"
          onOpenContracts={() => {}}
          onOpenEscrow={() => {}}
          onNavigateView={() => {}}
        />
      </GuideProvider>
    </LanguageProvider>,
  );
}

describe("KanbanBoardView", () => {
  it("computes overdue, due-today, due-soon, on-track, and settled statuses accurately", () => {
    expect(
      getKanbanDueStatus("2026-11-20", "WORK_IN_PROGRESS", "2026-11-26"),
    ).toEqual({ state: "overdue", diffDays: 6 });

    expect(
      getKanbanDueStatus("2026-11-26", "ESCROW_HELD", "2026-11-26"),
    ).toEqual({ state: "due-today", diffDays: 0 });

    expect(
      getKanbanDueStatus("2026-11-28", "SUBMITTED_FOR_REVIEW", "2026-11-26"),
    ).toEqual({ state: "due-soon", diffDays: 2 });

    expect(
      getKanbanDueStatus("2026-12-10", "BACKLOG", "2026-11-26"),
    ).toEqual({ state: "on-track", diffDays: 14 });

    expect(
      getKanbanDueStatus("2026-11-01", "RELEASED", "2026-11-26"),
    ).toEqual({ state: "settled", diffDays: 0 });
  });

  it("renders client, freelancer, contract, priority, and overdue filter controls", () => {
    const html = renderKanban();
    expect(html).toContain('aria-label="Filter by client"');
    expect(html).toContain('aria-label="Filter by freelancer"');
    expect(html).toContain('aria-label="Filter by contract"');
    expect(html).toContain("All Clients");
    expect(html).toContain("Addis FinTech PLC");
    expect(html).toContain("Abebe Bikila");
    expect(html).toContain("Telebirr Checkout Integration");
    expect(html).toContain("Overdue only");
    expect(html).toContain("All Priorities");
  });

  it("renders collapse controls, meaningful task counts, and empty-stage calls to action", () => {
    const html = renderKanban();
    expect(html).toContain('aria-label="Collapse Scoping &amp; Awaiting Funding column"');
    expect(html).toContain("Collapse empty");
    expect(html).toContain("1 task");
    expect(html).toContain("0 tasks");
    expect(html).toContain("2 of 2 milestones");
    // Useful stage-specific empty CTAs pointing to authoritative Contracts & Escrow workflows
    expect(html).toContain("Live read-only projection of server escrow state");
    expect(html).toContain("Open Contracts");
    expect(html).toContain("Open Escrow Center");
  });

  it("renders native dialog for inline milestone details plus horizontal scroll sentinels", () => {
    const html = renderKanban();
    expect(html).toContain("sh-kanban-scroll-sentinel");
    expect(html).toContain("sh-kanban-dialog");
    expect(html).toContain('aria-label="View details for Telebirr Webhook Signature Verification"');
    expect(html).toContain("Addis FinTech PLC → Abebe Bikila");
  });

  it("keeps Kanban CSS consistent, scroll-hinted, and theme-parity compliant", () => {
    const cssPath = path.resolve(
      __dirname,
      "../src/styles/shadcn-dashboard.css",
    );
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css).toContain("flex: 0 0 284px;");
    expect(css).toContain("flex: 0 0 56px;");
    expect(css).toContain("@property --sh-kanban-fade-start");
    expect(css).toContain("animation-timeline: scroll(self inline)");
    expect(css).toContain("dialog.sh-kanban-dialog:modal");
    expect(css).toContain("overscroll-behavior: contain");
  });
});
