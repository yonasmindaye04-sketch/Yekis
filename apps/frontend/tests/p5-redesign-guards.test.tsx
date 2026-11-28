import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { FirstRunChecklist } from "../src/components/dashboard/FirstRunChecklist";
import { DASHBOARD_EXTRAS_COPY } from "../src/components/dashboard/dashboardExtrasCopy";

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe("P5 redesign CI guards & parity", () => {
  const frontendSrc = path.resolve(__dirname, "../src");
  const files = collectSourceFiles(frontendSrc);

  it("ships zero DEMO_TALENTS, stateOverrides, customTasks, customEvents, or hardcoded 10% fee math", () => {
    const forbidden = [
      "DEMO_TALENTS",
      "EXTRA_DEMO_TALENTS",
      "getDemoTalentById",
      "customTasks",
      "customEvents",
      "stateOverrides",
      "jumpToDemoWeek",
      "DEMO_DATE",
    ];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(text, `${path.relative(frontendSrc, file)} must not contain ${token}`).not.toContain(
          token,
        );
      }
      if (
        file.includes(`${path.sep}dashboard${path.sep}`) ||
        file.endsWith("WorkflowWorkspace.tsx") ||
        file.endsWith("BrowserWallet.tsx") ||
        file.endsWith("FullPlatformApp.tsx")
      ) {
        expect(
          text,
          `${path.relative(frontendSrc, file)} must not multiply fees by 0.1`,
        ).not.toMatch(/\bfee\w*\s*=.*\*\s*0\.1\b/i);
        expect(
          text,
          `${path.relative(frontendSrc, file)} must not label fee as (10%)`,
        ).not.toMatch(/fee.*\(10%\)/i);
      }
    }
  });

  it("gates simulateTopUpSuccess behind DEV check", () => {
    const walletSrc = fs.readFileSync(path.join(frontendSrc, "BrowserWallet.tsx"), "utf8");
    if (walletSrc.includes("simulateTopUpSuccess")) {
      expect(walletSrc).toContain("import.meta.env.DEV");
    }
  });

  it("renders FirstRunChecklist steps in Decision 5 order with Browse services and escrow dialog", () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <FirstRunChecklist
          kycVerified={true}
          kycStatus="VERIFIED"
          hasBriefs={false}
          hasFundsOrPending={false}
          hasPendingTopUpOnly={false}
          pendingTopUpEtb={0}
          hasProposals={false}
          hasFundedMilestone={false}
          onNavigateView={() => {}}
          onOpenEscrow={() => {}}
          onHideChecklist={() => {}}
        />
      </LanguageProvider>,
    );

    const kycPos = html.indexOf("Verify identity");
    const briefPos = html.indexOf("Post a job");
    const fundsPos = html.indexOf("Add funds (before you hire)");
    const proposalsPos = html.indexOf("Review proposals");
    const fundMsPos = html.indexOf("Fund your first milestone");

    expect(kycPos).toBeGreaterThan(-1);
    expect(briefPos).toBeGreaterThan(kycPos);
    expect(fundsPos).toBeGreaterThan(briefPos);
    expect(proposalsPos).toBeGreaterThan(fundsPos);
    expect(fundMsPos).toBeGreaterThan(proposalsPos);
    expect(html).toContain("How escrow protects you");
    expect(html).toContain("Browse services");
    expect(html).not.toContain("Browse talent");
  });

  it("shows bold amber Waiting for approval (not Done) when only pending top-up exists and links locked step to KYC", () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <FirstRunChecklist
          kycVerified={false}
          kycStatus="UNDER_REVIEW"
          hasBriefs={false}
          hasFundsOrPending={true}
          hasPendingTopUpOnly={true}
          pendingTopUpEtb={2500}
          hasProposals={false}
          hasFundedMilestone={false}
          onNavigateView={() => {}}
          onOpenEscrow={() => {}}
          onHideChecklist={() => {}}
        />
      </LanguageProvider>,
    );

    expect(html).toContain("Under review");
    expect(html).toContain("Verify identity to unlock");
    expect(html).toContain("Waiting for approval");
    expect(html).toContain("ETB 2,500 top-up submitted");
    expect(html).toContain("We will notify you once approved");
    expect(html).not.toContain("sh-first-run-done-label");
  });

  it("keeps DASHBOARD_EXTRAS_COPY aligned across all 4 locales", () => {
    const baseKeys = Object.keys(DASHBOARD_EXTRAS_COPY.en).sort();
    for (const lang of ["am", "om", "ti"] as const) {
      expect(Object.keys(DASHBOARD_EXTRAS_COPY[lang]).sort()).toEqual(baseKeys);
      expect(Object.keys(DASHBOARD_EXTRAS_COPY[lang].firstRun).sort()).toEqual(
        Object.keys(DASHBOARD_EXTRAS_COPY.en.firstRun).sort(),
      );
      expect(Object.keys(DASHBOARD_EXTRAS_COPY[lang].firstRun.steps).sort()).toEqual(
        Object.keys(DASHBOARD_EXTRAS_COPY.en.firstRun.steps).sort(),
      );
    }
  });

  it("keeps empty-state and P1-P4 CSS theme-parity safe (no theme-conditional layout/shape overrides or low-opacity pills)", () => {
    const css = fs.readFileSync(
      path.join(frontendSrc, "styles/shadcn-dashboard.css"),
      "utf8",
    );
    expect(css).toContain(".sh-first-run-card");
    expect(css).toContain(".sh-pending-banner");
    expect(css).toContain(".sh-attention-strip");
    expect(css).toContain(".sh-cal-legend");
    expect(css).toContain("font-variant-numeric: tabular-nums;");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toContain("status-pill");
  });
});
