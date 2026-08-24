import { describe, it, expect } from "vitest";
import { requestPasswordReset } from "../src/modules/auth/auth.service.js";
import {
  sendEmail,
  sendPasswordResetEmail,
  sendInvoiceReceiptEmail,
  sendPlatformMovementEmail,
  sentEmailsLog,
} from "../src/lib/email/email.service.js";
import { prisma } from "../src/lib/prisma.js";

// NOTE: The "Google & Social Auth Service" suite was removed along with the
// loginWithGoogle service itself — that flow was an authentication bypass
// (bare-email login, no Google credential verification). Do not reintroduce
// without real ID-token verification against Google's JWKS.

describe("Transactional Email Service", () => {
  it("records and dispatches password reset email with reset token", async () => {
    const email = "reset.test@example.com";
    const initialLogCount = sentEmailsLog.length;

    await sendPasswordResetEmail({
      email,
      name: "Dawit",
      token: "test-token-abcdef123456",
    });

    expect(sentEmailsLog.length).toBeGreaterThan(initialLogCount);
    const lastEmail = sentEmailsLog[sentEmailsLog.length - 1];
    expect(lastEmail.to).toBe(email);
    expect(lastEmail.subject).toContain("Reset your Yekis password");
    expect(lastEmail.html).toContain("test-token-abcdef123456");
  });

  it("formats and dispatches escrow invoice receipt email with ETB amount breakdown", async () => {
    const email = "client.invoice@example.com";
    const initialLogCount = sentEmailsLog.length;

    await sendInvoiceReceiptEmail({
      email,
      recipientName: "Hanan Client",
      invoiceNumber: "INV-2026-9901",
      milestoneTitle: "Landing Page UI Implementation",
      contractTitle: "Full Website Redesign",
      amountEtb: 15000,
      payerName: "Hanan Client",
      payeeName: "Yared Freelancer",
    });

    expect(sentEmailsLog.length).toBeGreaterThan(initialLogCount);
    const lastEmail = sentEmailsLog[sentEmailsLog.length - 1];
    expect(lastEmail.to).toBe(email);
    expect(lastEmail.subject).toContain("Receipt: Escrow Payment");
    expect(lastEmail.html).toContain("INV-2026-9901");
    expect(lastEmail.html).toContain("15,000");
    expect(lastEmail.html).toContain("Escrow Protection Active");
  });

  it("dispatches platform movement alert email", async () => {
    const email = "movement.test@example.com";
    const initialLogCount = sentEmailsLog.length;

    await sendPlatformMovementEmail({
      email,
      recipientName: "Betelhem",
      title: "Escrow Milestone Funded",
      message: "The client has funded Milestone 2 (ETB 8,500). You may safely begin work.",
      eventType: "escrow-funded",
    });

    expect(sentEmailsLog.length).toBeGreaterThan(initialLogCount);
    const lastEmail = sentEmailsLog[sentEmailsLog.length - 1];
    expect(lastEmail.to).toBe(email);
    expect(lastEmail.subject).toContain("Escrow Milestone Funded");
    expect(lastEmail.html).toContain("ETB 8,500");
  });
});
