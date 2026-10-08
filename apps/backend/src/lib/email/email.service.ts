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

function getTransport(): nodemailer.Transporter | null {
  if (!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)) return null;
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

  const transport = getTransport();
  if (transport) {
    try {
      const info = await transport.sendMail({
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

  // Development / fallback logging
  logger.warn(
    { to, subject },
    "SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) - email NOT delivered, logged to console only.",
  );
  // eslint-disable-next-line no-console
  console.log(
    `\n================== 📧 [DEV - NOT SENT] EMAIL ==================`,
  );
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${text}`);
  console.log(`============================================================\n`);

  return { success: true, messageId: `mock-${Date.now()}` };
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

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0b1116; padding: 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; color: #22c55e; letter-spacing: -0.02em; }
          .content { padding: 32px 28px; }
          .btn { display: inline-block; background-color: #16a34a; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .token-box { background: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 700; color: #0f172a; margin: 12px 0; word-break: break-all; }
          .footer { background: #f8fafc; padding: 18px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yekis Escrow Security</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset the password for your Yekis account. Click the button below to choose a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #475569;">Or use this reset token manually:</p>
            <div class="token-box">${escapeHtml(options.token)}</div>
            <p style="font-size: 13px; color: #64748b;">This link and token will expire in 1 hour. If you did not make this request, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Yekis Jobs • Ethiopia's freelance marketplace
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: options.email,
    subject: "Reset your Yekis password",
    html,
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

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0b1116; padding: 28px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
          .logo { font-size: 24px; font-weight: 800; color: #22c55e; }
          .badge { background: #16a34a; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
          .content { padding: 32px 28px; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
          .invoice-table th { text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; }
          .invoice-table td { padding: 14px 10px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
          .total-row td { font-weight: 800; font-size: 18px; color: #16a34a; border-bottom: none; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 14px; }
          .meta-item strong { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .escrow-callout { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 24px; color: #166534; font-size: 14px; }
          .footer { background: #f8fafc; padding: 18px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">Yekis</span>
            <span class="badge">Payment Receipt</span>
          </div>
          <div class="content">
            <h2 style="margin-top:0;">Payment Confirmation & Receipt</h2>
            <p>Hello ${recipient},</p>
            <p>This email confirms that Yekis is holding your payment for the milestone below, pending your approval:</p>

            <div class="meta-grid">
              <div class="meta-item">
                <strong>Invoice Number</strong>
                ${escapeHtml(options.invoiceNumber)}
              </div>
              <div class="meta-item">
                <strong>Date</strong>
                ${dateStr}
              </div>
              <div class="meta-item">
                <strong>Client / Payer</strong>
                ${escapeHtml(options.payerName)}
              </div>
              <div class="meta-item">
                <strong>Freelancer / Payee</strong>
                ${escapeHtml(options.payeeName)}
              </div>
            </div>

            <table class="invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${escapeHtml(options.milestoneTitle)}</strong>
                    ${options.contractTitle ? `<br><small style="color: #64748b;">${escapeHtml(options.contractTitle)}</small>` : ""}
                  </td>
                  <td style="text-align: right; font-weight: 600;">ETB ${formattedAmount}</td>
                </tr>
                <tr class="total-row">
                  <td>Total held</td>
                  <td style="text-align: right;">ETB ${formattedAmount}</td>
                </tr>
              </tbody>
            </table>

            <div class="escrow-callout">
              🔒 <strong>How this payment is held:</strong> Yekis holds this amount until the milestone is delivered. It is released when you approve the delivered work, or automatically after ${env.AUTO_RELEASE_WINDOW_DAYS} days if you do not respond. If either party raises a dispute, the amount stays held until that dispute is resolved.
            </div>
          </div>
          <div class="footer">
            Tax withholding and platform terms apply per ERCA & Yekis Policies.<br>
            © ${new Date().getFullYear()} Yekis Jobs • Addis Ababa, Ethiopia
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: options.email,
    subject: `Receipt: Escrow Payment for ${options.milestoneTitle} (ETB ${formattedAmount})`,
    html,
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

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0b1116; padding: 24px 28px; color: #ffffff; }
          .logo { font-size: 22px; font-weight: 800; color: #22c55e; }
          .content { padding: 32px 28px; }
          .btn { display: inline-block; background-color: #16a34a; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; margin-top: 18px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 15px; line-height: 1.6; }
          .footer { background: #f8fafc; padding: 18px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">Yekis</span>
          </div>
          <div class="content">
            <h2 style="margin-top: 0;">${escapeHtml(options.title)}</h2>
            <p>Hello ${recipient},</p>
            <div class="card">
              ${escapeHtml(options.message)}
            </div>
            <div style="text-align: center;">
              <a href="${actionUrl}" class="btn">${escapeHtml(actionText)}</a>
            </div>
          </div>
          <div class="footer">
            You received this notification regarding your Yekis account movements.<br>
            © ${new Date().getFullYear()} Yekis Jobs
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: options.email,
    subject: `Yekis: ${options.title}`,
    html,
  });
}
