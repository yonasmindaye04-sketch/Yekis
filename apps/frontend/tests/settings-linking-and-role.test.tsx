import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LinkedAccountsCard,
  type AuthIdentities,
} from "../src/components/settings/LinkedAccountsCard";
import {
  AccountTypeCard,
  type AccountRole,
} from "../src/components/settings/AccountTypeCard";
import { SETTINGS_WORKSPACE_COPY } from "../src/settingsWorkspaceCopy";
import { LanguageProvider } from "../src/i18n";

/**
 * The two new settings surfaces, rendered.
 *
 * They are rendered to static markup rather than driven through a DOM
 * because the thing worth guarding is STRUCTURE: that every provider has a
 * row, that the connect control is there, that the account-type switch
 * offers exactly the three account types the platform has, and that a control
 * which would do the wrong thing is marked unavailable. A row that silently
 * lost its button, or a type that was offered that the server does not have,
 * is the kind of regression that no type-checker catches.
 */

const COPY = SETTINGS_WORKSPACE_COPY.en;

const IDENTITIES: AuthIdentities = {
  email: "member@example.com",
  emailVerified: false,
  passwordSet: true,
  google: false,
  apple: false,
  facebook: false,
  telegram: false,
  phoneVerified: false,
};

function renderLinkedAccounts(identities: AuthIdentities, language: "en" | "am" = "en") {
  const copy = SETTINGS_WORKSPACE_COPY[language];
  return renderToStaticMarkup(
    <LanguageProvider>
      <LinkedAccountsCard
        identities={identities}
        copy={copy}
        onRefresh={() => {}}
        onSuccess={() => {}}
        onError={() => {}}
        describeError={() => "error"}
      />
    </LanguageProvider>,
  );
}

describe("Linked Accounts card", () => {
  it("gives every provider a row and a connect control", () => {
    const html = renderLinkedAccounts(IDENTITIES);

    // One row per provider in the registry.
    expect(html).toContain("Password");
    expect(html).toContain("Email");
    expect(html).toContain("Google");
    expect(html).toContain("Telegram");

    // The email row can be verified, and the Telegram row can be connected.
    expect(html).toContain(COPY.security.verifyEmailBtn);
    expect(html).toContain(COPY.security.connectTelegramBtn);

    // The address on the account is shown, so the member knows WHICH address
    // they are about to prove control of.
    expect(html).toContain("member@example.com");
  });

  it("offers no verification for an address that is already verified", () => {
    const html = renderLinkedAccounts({ ...IDENTITIES, emailVerified: true });
    expect(html).not.toContain(COPY.security.verifyEmailBtn);
  });

  it("offers a disconnect control for a provider that is already connected", () => {
    const html = renderLinkedAccounts({ ...IDENTITIES, telegram: true });
    expect(html).toContain(COPY.security.disconnectTelegramBtn);
    expect(html).not.toContain(COPY.security.connectTelegramBtn);
  });

  it("renders in every supported language", () => {
    for (const language of ["en", "am", "om", "ti"] as const) {
      const copy = SETTINGS_WORKSPACE_COPY[language];
      const html = renderLinkedAccounts(IDENTITIES, language);
      expect(html).toContain(copy.security.connectTelegramBtn);
      expect(html).toContain(copy.security.verifyEmailBtn);
      // The provider name is a brand and is never translated.
      expect(html).toContain("Telegram");
    }
  });
});

function renderAccountType(role: AccountRole, language: "en" | "am" = "en") {
  const copy = SETTINGS_WORKSPACE_COPY[language];
  return renderToStaticMarkup(
    <LanguageProvider>
      <AccountTypeCard
        currentRole={role}
        language={language}
        copy={copy}
        onSuccess={() => {}}
        onError={() => {}}
        describeError={() => "error"}
      />
    </LanguageProvider>,
  );
}

describe("Account type card", () => {
  it("offers exactly the three account types the platform has", () => {
    const html = renderAccountType("CLIENT");
    expect(html).toContain('role="radiogroup"');
    expect((html.match(/role="radio"/g) ?? []).length).toBe(3);
    expect(html).toContain(COPY.accountType.clientDesc);
    expect(html).toContain(COPY.accountType.freelancerDesc);
    expect(html).toContain(COPY.accountType.bothDesc);
  });

  it("marks the type the account holds as the current one", () => {
    const html = renderAccountType("FREELANCER");
    expect(html).toContain(COPY.accountType.currentLabel);
    expect(html).toContain('aria-checked="true"');
  });

  it("cannot be saved until a different type is chosen", () => {
    const html = renderAccountType("CLIENT");
    // The save control is rendered disabled while the selection still matches
    // the account, so a double-click cannot fire a pointless request.
    expect(html).toContain(COPY.accountType.saveBtn);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Change account type/);
  });

  it("says what happens to the historic record", () => {
    const html = renderAccountType("CLIENT");
    expect(html).toContain(COPY.accountType.historyNote);
  });
});
