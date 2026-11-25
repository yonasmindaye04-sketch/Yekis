// === IMPORTS ===
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";

// === TYPES ===
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface PasswordResetEmailOptions {
  email: string;
  name?: string;
  token: string;
  resetUrl?: string;
}

export interface InvoiceEmailOptions {
  email: string;
  recipientName?: string;
  invoiceNumber: string;
  milestoneTitle: string;
  contractTitle?: string;
  amountEtb: number;
  payerName: string;
  payeeName: string;
  status?: string;
  paidAt?: Date;
}

export interface PlatformMovementEmailOptions {
  email: string;
  recipientName?: string;
  title: string;
  message: string;
  eventType: string;
  actionText?: string;
  actionUrl?: string;
}

export interface EmailVerificationCodeOptions {
  email: string;
  code: string;
  /** What the code is for, shown to the recipient. */
  purposeLabel?: string;
}

// In-memory test store for automated testing assertions
export const sentEmailsLog: EmailPayload[] = [];

// Helper to escape HTML characters
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Real SMTP transport (nodemailer). Created lazily on first send so missing
 * credentials in dev never crash boot. `verify()` is available for a startup
 * connectivity check if wanted.
 */
let smtpTransport: nodemailer.Transporter | null = null;

/** Whether the SMTP credentials are complete. Asked without side effects. */
function hasSmtpCredentials(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransport(): nodemailer.Transporter | null {
  if (!hasSmtpCredentials()) return null;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return smtpTransport;
}

/**
 * Which transport carries the mail.
 *
 *   "smtp"  - the SMTP host, and nothing else
 *   "brevo" - the Brevo HTTPS API, and nothing else
 *   "auto"  - SMTP when it is configured, otherwise the Brevo API
 *
 * An explicit preference never silently falls back to the other transport. If
 * the host says "brevo" and there is no API key, the answer is "no transport",
 * so the caller learns that the message was not delivered instead of assuming
 * that some other transport quietly carried it.
 */
export type EmailTransportKind = "smtp" | "brevo" | "none";

export function resolveEmailTransport(): EmailTransportKind {
  const preference = env.EMAIL_TRANSPORT;
  if (preference === "smtp") return hasSmtpCredentials() ? "smtp" : "none";
  if (preference === "brevo") return env.BREVO_API_KEY ? "brevo" : "none";
  if (hasSmtpCredentials()) return "smtp";
  if (env.BREVO_API_KEY) return "brevo";
  return "none";
}

/**
 * Whether the platform has a transport that can actually deliver a message.
 *
 * This is the question the capability endpoint asks, and the question the
 * onboarding code path asks before it mints a code nobody can receive. The
 * answer is the CONFIGURATION, never the environment name.
 */
export function isEmailTransportConfigured(): boolean {
  return resolveEmailTransport() !== "none";
}

/**
 * The Brevo HTTPS API endpoint.
 *
 * The API - not SMTP - because the hosted app already talks to the internet
 * over HTTPS for everything else, and a container may not have an outbound
 * SMTP port open at all. Brevo's free plan covers the whole platform today.
 */
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Splits "Yekis <emushu70@gmail.com>" into the name and the address the
 * Brevo API expects. A bare address is used as the address, with the default
 * sender name.
 */
function parseSender(from: string): { name: string; email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (match) {
    // The regex guarantees both groups, but `noUncheckedIndexedAccess` makes
    // the index access `string | undefined`, so the optionality is handled
    // here rather than asserted away.
    return {
      name: match[1]?.trim() || "Yekis",
      email: (match[2] ?? "").trim(),
    };
  }
  return { name: "Yekis", email: from.trim() };
}

/**
 * Sends one message through the Brevo HTTPS API.
 *
 * The field names are Brevo's, not a generic mail API's: `htmlContent` and
 * `textContent`, not `html` and `text`. Sending `html`/`text` is accepted
 * only in Brevo's older v2 endpoint and is rejected here with
 * `missing_parameter` - which is why the shape is asserted in the test.
 */
async function sendViaBrevo(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) return { success: false };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(params.from),
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
      }),
    });

    if (!response.ok) {
      // The body carries the reason (an unverified sender, a breached quota, a
      // malformed payload). It is truncated, and it never contains the API key.
      const detail = await response.text().catch(() => "");
      logger.error(
        {
          status: response.status,
          to: params.to,
          subject: params.subject,
          detail: detail.slice(0, 300),
        },
        "Failed to send email via the Brevo API",
      );
      return { success: false };
    }

    const body = (await response.json().catch(() => ({}))) as {
      messageId?: unknown;
    };
    const messageId =
      typeof body.messageId === "string" ? body.messageId : undefined;
    logger.info(
      { to: params.to, subject: params.subject, messageId, transport: "brevo" },
      "Email delivered via the Brevo API",
    );
    return { success: true, messageId };
  } catch (err) {
    logger.error(
      { err, to: params.to, subject: params.subject },
      "Failed to send email via the Brevo API",
    );
    return { success: false };
  }
}

/**
 * Base email dispatch function
 * Sends via SMTP when configured; otherwise logs to console & test memory
 * so local dev still shows what WOULD have been delivered.
 */
export async function sendEmail(
  payload: EmailPayload,
): Promise<{ success: boolean; messageId?: string }> {
  const from = payload.from || env.EMAIL_FROM;
  const to = payload.to;
  const subject = payload.subject;
  const text =
    payload.text ||
    payload.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  sentEmailsLog.push({ ...payload, from });

  const transport = resolveEmailTransport();

  if (transport === "brevo") {
    return sendViaBrevo({ to, subject, html: payload.html, text, from });
  }

  if (transport === "smtp") {
    const smtp = getTransport();
    if (!smtp) return { success: false };
    try {
      const info = await smtp.sendMail({
        from,
        to,
        subject,
        html: payload.html,
        text,
      });
      logger.info(
        { to, subject, messageId: info.messageId },
        "Email delivered via SMTP",
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err, to, subject }, "Failed to send email via SMTP");
      return { success: false };
    }
  }

  // Development / fallback logging.
  //
  // The body is printed ONLY on a developer machine. This used to be an
  // unconditional console.log, and the password-reset email's body contains the
  // reset URL — a live bearer credential that sets the account password for
  // anyone who holds it, valid for an hour. Two problems with printing it
  // anywhere else:
  //
  //   - console.log bypasses the pino redaction in lib/logger.ts entirely. That
  //     logger scrubs `token` keys and every string argument; none of it runs
  //     here, so a misconfigured staging box writes real reset tokens to
  //     whatever collects stdout.
  //   - it reported success for a message that was never sent, so
  //     requestPasswordReset believed the user had a mail. It had not.
  //
  // Development only is the correct blast radius: a local developer needs to
  // read the token out of their own terminal to test the flow, and that token
  // is theirs.
  const isDevelopment = env.NODE_ENV === "development";

  if (isDevelopment) {
    logger.warn(
      { to, subject },
      "No mail transport configured - email NOT delivered, printed to console for local development only.",
    );
    // eslint-disable-next-line no-console
    console.log(
      `\n================== [DEV - NOT SENT] EMAIL ==================`,
    );
    // eslint-disable-next-line no-console
    console.log(`To: ${to}`);
    // eslint-disable-next-line no-console
    console.log(`Subject: ${subject}`);
    // eslint-disable-next-line no-console
    console.log(`Body:\n${text}`);
    // eslint-disable-next-line no-console
    console.log(`============================================================\n`);

    return { success: true, messageId: `mock-${Date.now()}` };
  }

  // Not development and not configured: this is a misconfiguration, not a dev
  // affordance. Report failure so the caller can invalidate the undelivered
  // token instead of leaving a valid credential nobody can receive.
  logger.error(
    { to, subject },
    "No mail transport is configured and this is not a development environment - email NOT delivered.",
  );
  return { success: false };
}

/**
 * Unified Corporate Email Shell for Transactional Notifications
 */
interface CorporateEmailShellOptions {
  title: string;
  preheader: string;
  categoryBadge: string;
  bodyContent: string;
}

function wrapCorporateEmail({
  title,
  preheader,
  categoryBadge,
  bodyContent,
}: CorporateEmailShellOptions): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escapeHtml(title)}</title>
    <!--[if mso]>
    <style type="text/css">
      body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
    <style type="text/css">
      body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; }
      table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
      @media only screen and (max-width: 620px) {
        .email-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
        .email-body { padding: 22px 18px !important; }
        .email-header { padding: 18px 18px !important; border-radius: 0 !important; }
        .email-footer { padding: 20px 18px !important; border-radius: 0 !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Corporate Brand Header -->
            <tr>
              <td class="email-header" style="background-color: #0b1116; padding: 24px 28px; border-bottom: 1px solid #1e293b;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="width: 38px; height: 38px; background-color: #14573a; border-radius: 8px; text-align: center; vertical-align: middle; color: #ffffff; font-size: 19px; font-weight: 900; letter-spacing: -0.5px;">
                            YJ
                          </td>
                          <td style="padding-left: 12px; vertical-align: middle;">
                            <div style="font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; line-height: 1;">
                              YEKIS
                            </div>
                            <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: #94a3b8; text-transform: uppercase; margin-top: 3px;">
                              Ethiopian Freelance &amp; Escrow
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: #22c55e; text-transform: uppercase; border: 1px solid rgba(34, 197, 94, 0.35); padding: 5px 11px; border-radius: 6px; background-color: rgba(34, 197, 94, 0.08); display: inline-block;">
                        ${escapeHtml(categoryBadge)}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Content Area -->
            <tr>
              <td class="email-body" style="padding: 32px 28px; background-color: #ffffff;">
                ${bodyContent}
              </td>
            </tr>

            <!-- Corporate Footer -->
            <tr>
              <td class="email-footer" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center;">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b;">
                  <strong style="color: #0f172a;">Yekis Technologies PLC</strong> &bull; Addis Ababa, Ethiopia<br />
                  Secure Ethiopian Freelance Marketplace &amp; Professional Digital Infrastructure.<br />
                  <span style="font-size: 11px; color: #94a3b8; margin-top: 6px; display: inline-block;">
                    &copy; ${currentYear} Yekis Technologies PLC. All rights reserved. &bull; Testing &amp; Verification Environment
                  </span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * 1. Password Reset Transactional Email
 */
export async function sendPasswordResetEmail(
  options: PasswordResetEmailOptions,
) {
  const resetUrl =
    options.resetUrl ||
    `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(options.token)}`;
  const userName = options.name ? escapeHtml(options.name) : "Yekis Member";

  const bodyContent = `
    <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">Password Reset Request</h2>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.5; color: #334155;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5; color: #475569;">
      We received a request to reset the password for your Yekis account. Click the button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff !important; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">
        Reset Password
      </a>
    </div>

    <p style="margin: 20px 0 8px; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">
      Or enter this verification token manually:
    </p>
    <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-all;">
      ${escapeHtml(options.token)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 12px 14px; margin-top: 24px;">
      <tr>
        <td style="font-size: 13px; line-height: 1.5; color: #166534;">
          <strong>Security Notice:</strong> This password reset link and token expire in 1 hour. If you did not make this request, you can safely disregard this email. Your password remains unchanged.
        </td>
      </tr>
    </table>
  `;

  const html = wrapCorporateEmail({
    title: "Reset your Yekis password",
    preheader: "Instructions to securely reset your Yekis account password.",
    categoryBadge: "Account Security",
    bodyContent,
  });

  return sendEmail({
    to: options.email,
    subject: "Reset your Yekis password",
    html,
    text: `Password Reset Request\n\nHello ${userName},\n\nClick the link below to reset your password:\n${resetUrl}\n\nOr enter this token: ${options.token}\n\nThis token expires in 1 hour. If you did not request this, ignore this email.`,
  });
}

/**
 * 2. Milestone Escrow Invoice & Order Receipt Email
 */
export async function sendInvoiceReceiptEmail(options: InvoiceEmailOptions) {
  const formattedAmount = options.amountEtb.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const recipient = options.recipientName
    ? escapeHtml(options.recipientName)
    : "Valued Customer";
  const dateStr = (options.paidAt || new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bodyContent = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">Payment Confirmation &amp; Receipt</h2>
    <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.5; color: #334155;">Hello ${recipient},</p>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5; color: #475569;">
      This email confirms that Yekis is holding your payment for the milestone below, pending your approval:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; padding: 14px 16px;">
      <tr>
        <td width="50%" style="padding: 6px 0; vertical-align: top;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Invoice Number</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;">${escapeHtml(options.invoiceNumber)}</div>
        </td>
        <td width="50%" style="padding: 6px 0; vertical-align: top;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Transaction Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;">${dateStr}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 8px 0 2px; vertical-align: top;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Client / Payer</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;">${escapeHtml(options.payerName)}</div>
        </td>
        <td width="50%" style="padding: 8px 0 2px; vertical-align: top;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Freelancer / Payee</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;">${escapeHtml(options.payeeName)}</div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0; overflow: hidden;">
      <thead>
        <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
          <th align="left" style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Milestone Description</th>
          <th align="right" style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Amount (ETB)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a;">
            <strong>${escapeHtml(options.milestoneTitle)}</strong>
            ${options.contractTitle ? `<br /><span style="font-size: 12px; color: #64748b;">Contract: ${escapeHtml(options.contractTitle)}</span>` : ""}
          </td>
          <td align="right" style="padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 600; color: #0f172a;">
            ETB ${formattedAmount}
          </td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 12px 14px; font-size: 14px; font-weight: 700; color: #0f172a;">Total held</td>
          <td align="right" style="padding: 12px 14px; font-size: 16px; font-weight: 800; color: #16a34a;">ETB ${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 12px 14px; margin-top: 18px;">
      <tr>
        <td style="font-size: 13px; line-height: 1.5; color: #166534;">
          <strong>How this payment is held:</strong> Yekis holds this amount until the milestone is delivered. It is released when you approve the delivered work, or automatically after ${env.AUTO_RELEASE_WINDOW_DAYS} days if you do not respond. If either party raises a dispute, the amount stays held until that dispute is resolved.
        </td>
      </tr>
    </table>
  `;

  const html = wrapCorporateEmail({
    title: `Receipt: Escrow Payment for ${options.milestoneTitle}`,
    preheader: `Escrow payment receipt for ${options.milestoneTitle} (ETB ${formattedAmount}).`,
    categoryBadge: "Payment Receipt",
    bodyContent,
  });

  return sendEmail({
    to: options.email,
    subject: `Receipt: Escrow Payment for ${options.milestoneTitle} (ETB ${formattedAmount})`,
    html,
    text: `Payment Receipt: ${options.milestoneTitle}\n\nInvoice: ${options.invoiceNumber}\nAmount: ETB ${formattedAmount}\nDate: ${dateStr}\nClient: ${options.payerName}\nFreelancer: ${options.payeeName}\n\nYekis holds this amount until the milestone is delivered. It is released when you approve the delivered work, or automatically after ${env.AUTO_RELEASE_WINDOW_DAYS} days if you do not respond. If either party raises a dispute, the amount stays held until that dispute is resolved.`,
  });
}

/**
 * 3. Platform Movement Notification Email
 */
export async function sendPlatformMovementEmail(
  options: PlatformMovementEmailOptions,
) {
  const recipient = options.recipientName
    ? escapeHtml(options.recipientName)
    : "Member";
  const actionUrl = options.actionUrl || `${env.FRONTEND_URL}`;
  const actionText = options.actionText || "View in Workspace";

  const bodyContent = `
    <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${escapeHtml(options.title)}</h2>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.5; color: #334155;">Hello ${recipient},</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 18px; margin: 18px 0; font-size: 15px; line-height: 1.6; color: #334155;">
      ${escapeHtml(options.message)}
    </div>
    <div style="text-align: center; margin: 24px 0 10px;">
      <a href="${actionUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff !important; padding: 12px 26px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
        ${escapeHtml(actionText)}
      </a>
    </div>
  `;

  const html = wrapCorporateEmail({
    title: options.title,
    preheader: options.message.slice(0, 100),
    categoryBadge: "Workspace Update",
    bodyContent,
  });

  return sendEmail({
    to: options.email,
    subject: `Yekis: ${options.title}`,
    html,
    text: `${options.title}\n\nHello ${recipient},\n\n${options.message}\n\nOpen workspace: ${actionUrl}`,
  });
}

/**
 * 4. Email Verification Code (onboarding OTP)
 */
export async function sendEmailVerificationCodeEmail(
  options: EmailVerificationCodeOptions,
) {
  const code = escapeHtml(options.code);
  const purposeLabel = options.purposeLabel
    ? escapeHtml(options.purposeLabel)
    : "Confirm your email address";

  const bodyContent = `
    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${purposeLabel}</h2>
    <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.5; color: #475569;">
      Enter this 6-digit verification code in Yekis to verify your email address and continue setting up your account:
    </p>

    <!-- Verification Code Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 22px 0;">
      <tr>
        <td align="center" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px 16px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
            One-Time Security Code
          </div>
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0f172a; line-height: 1.2;">
            ${code}
          </div>
          <div style="font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 8px;">
            Valid for 10 minutes &bull; Single-use security token
          </div>
        </td>
      </tr>
    </table>

    <!-- Security Warning Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 12px 14px; margin-top: 18px;">
      <tr>
        <td style="font-size: 13px; line-height: 1.5; color: #166534;">
          <strong>Security Notice:</strong> Yekis staff will never ask for your verification code by phone, chat, or email. Do not share this code with anyone. If you did not request this code, you can safely ignore this email.
        </td>
      </tr>
    </table>
  `;

  const html = wrapCorporateEmail({
    title: purposeLabel,
    preheader: `Your Yekis verification code is ${options.code}. Valid for 10 minutes.`,
    categoryBadge: "Security Verification",
    bodyContent,
  });

  return sendEmail({
    to: options.email,
    subject: `${options.purposeLabel ?? "Your Yekis verification code"}: ${options.code}`,
    html,
    text: `${options.purposeLabel ?? "Your Yekis verification code"}: ${options.code}\n\nEnter this code in Yekis to continue.\nThis code expires in 10 minutes and can be used once. We will never ask you to share it.`,
  });
}
