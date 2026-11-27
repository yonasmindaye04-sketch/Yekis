import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdvancedDataTable } from "../src/components/dashboard/AdvancedDataTable";
import type { LedgerContractRecord } from "../src/components/dashboard/dashboardData";
import { ShadcnLayoutProvider } from "../src/components/dashboard/ShadcnLayoutContext";
import { GuideProvider } from "../src/components/guide/GuideContext";
import { LanguageProvider } from "../src/i18n";
import { ThemeProvider } from "../src/theme/ThemeContext";

const SAMPLE_RECORD: LedgerContractRecord = {
  id: "ms-1",
  contractId: "cnt-1",
  code: "MS-101",
  title: "API Integration Sprint",
  contractTitle: "Platform API Build",
  counterparty: "Abebe Bikila",
  counterpartyEmail: "abebe@example.et",
  category: "backend engineering",
  rail: "TELEBIRR",
  escrowState: "ESCROW_HELD",
  amountMinor: 1_000_000, // ETB 10,000.00
  platformFeeMinor: 50_000, // Server-computed (e.g. 5% custom env rate = ETB 500.00, not 10%!)
  providerFeeMinor: 5_000, // ETB 50.00
  clientFeeMinor: 0,
  clientTotalChargeMinor: 1_000_000,
  netPayoutMinor: 945_000, // ETB 9,450.00
  dueDate: "2026-12-01",
  updatedAt: "2026-11-27",
  contractFullyExecuted: true,
};

function renderTable(viewerRole: "CLIENT" | "FREELANCER") {
  return renderToStaticMarkup(
    <ThemeProvider>
      <LanguageProvider>
        <ShadcnLayoutProvider>
          <GuideProvider>
            <AdvancedDataTable
              records={[SAMPLE_RECORD]}
              viewerRole={viewerRole}
              feeConfig={{
                freelancerPlatformFeeRate: 0.05,
                clientPlatformFeeRate: 0,
                paymentProviderFeeRate: 0.005,
              }}
            />
          </GuideProvider>
        </ShadcnLayoutProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("P0 dashboard integrity", () => {
  it("displays client fee ETB 0 and hides freelancer deductions in client view", () => {
    const html = renderTable("CLIENT");
    expect(html).toContain("Client fee");
    expect(html).toContain("10,000.00");
    expect(html).toContain("0.00");
    expect(html).not.toContain("Net payout");
    expect(html).not.toContain("9,450.00");
    expect(html).not.toContain("(10%)");
  });

  it("displays backend-computed platform fee, provider fee, and net payout in freelancer view without 10% math", () => {
    const html = renderTable("FREELANCER");
    expect(html).toContain("Platform fee");
    expect(html).toContain("Provider fee");
    expect(html).toContain("Net payout");
    expect(html).toContain("500.00");
    expect(html).toContain("50.00");
    expect(html).toContain("9,450.00");
    expect(html).not.toContain("(10%)");
  });

  it("keeps demo talent arrays and client-side * 0.1 fee math out of production dashboard files", () => {
    const srcRoot = path.resolve(__dirname, "../src");
    const featured = fs.readFileSync(
      path.join(srcRoot, "FeaturedCarousel.tsx"),
      "utf8",
    );
    const dashboard = fs.readFileSync(
      path.join(srcRoot, "components/dashboard/MarketplaceShadcnDashboard.tsx"),
      "utf8",
    );
    expect(featured).not.toContain("DEMO_TALENTS");
    expect(dashboard).not.toMatch(/amountMinor\s*\*\s*0\.1/);
    expect(dashboard).not.toContain("stateOverrides");
  });
});
