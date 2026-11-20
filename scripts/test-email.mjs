// === test-email.mjs ===
//
// A delivery check for the configured mail transport.
//
// WHY THIS EXISTS
// The audit's F-03 was not "the platform has no provider" - it was "the
// platform cannot tell you whether its mail works". A misconfigured
// transport fails silently: the API returns success, the onboarding step
// dead-ends, and the only symptom is a member who says the code never
// arrived. This script sends one real message through the transport the
// host is actually configured with, and reports what happened.
//
// WHAT IT DOES NOT DO
// It never prints a credential. The API key is read from the environment and
// sent in a header; the SMTP password is passed to nodemailer and never
// logged. The recipient address is the only personal data in the output.
//
// USAGE
//   node scripts/test-email.mjs you@example.com
//
// The transport is chosen exactly as the platform chooses it:
//   EMAIL_TRANSPORT=smtp   -> the SMTP host
//   EMAIL_TRANSPORT=brevo  -> the Brevo HTTPS API
//   EMAIL_TRANSPORT=auto   -> SMTP when its credentials are complete,
//                             otherwise the Brevo API
//
// Exit code 0 when the message was accepted by the provider, 1 otherwise.

import { createRequire } from "node:module";

const recipient = process.argv[2];

if (!recipient) {
  console.error(
    "usage: node scripts/test-email.mjs <recipient@example.com>",
  );
  process.exit(2);
}

const env = process.env;

const smtpConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS,
);
const brevoConfigured = Boolean(env.BREVO_API_KEY);

function resolveTransport() {
  const preference = env.EMAIL_TRANSPORT || "auto";
  if (preference === "smtp") return smtpConfigured ? "smtp" : "none";
  if (preference === "brevo") return brevoConfigured ? "brevo" : "none";
  if (smtpConfigured) return "smtp";
  if (brevoConfigured) return "brevo";
  return "none";
}

function parseSender(from) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || "");
  if (match) {
    return { name: match[1]?.trim() || "Yekis", email: (match[2] ?? "").trim() };
  }
  return { name: "Yekis", email: (from || "").trim() };
}

async function sendViaBrevo() {
  const apiKey = env.BREVO_API_KEY;
  const from = env.EMAIL_FROM || "Yekis <notifications@yekis.com>";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(from),
      to: [{ email: recipient }],
      subject: "Yekis: mail transport test",
      htmlContent:
        "<p>This is the Yekis transactional-mail transport test. If you are reading this, the transport works.</p>",
      textContent:
        "Yekis transactional-mail transport test. If you are reading this, the transport works.",
    }),
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText.slice(0, 300) };
  }

  if (!response.ok) {
    return {
      success: false,
      transport: "brevo",
      status: response.status,
      error: body.message || body.code || "the Brevo API rejected the message",
    };
  }
  return {
    success: true,
    transport: "brevo",
    messageId: body.messageId,
    status: response.status,
  };
}

async function sendViaSmtp() {
  // nodemailer lives in the backend's dependency tree, not the repository
  // root's, so it is resolved from there.
  const require = createRequire(
    new URL("../apps/backend/package.json", import.meta.url),
  );
  const nodemailer = require("nodemailer");

  const port = Number(env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE === "true" || port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  try {
    const info = await transport.sendMail({
      from: env.EMAIL_FROM || "Yekis <notifications@yekis.com>",
      to: recipient,
      subject: "Yekis: mail transport test",
      text: "Yekis transactional-mail transport test. If you are reading this, the transport works.",
      html: "<p>This is the Yekis transactional-mail transport test. If you are reading this, the transport works.</p>",
    });
    return { success: true, transport: "smtp", messageId: info.messageId };
  } finally {
    transport.close();
  }
}

const transport = resolveTransport();

if (transport === "none") {
  console.error(
    JSON.stringify(
      {
        success: false,
        error:
          "No mail transport is configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS, or BREVO_API_KEY, or check EMAIL_TRANSPORT.",
        emailTransport: env.EMAIL_TRANSPORT || "auto",
        smtpConfigured,
        brevoConfigured,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

try {
  const result =
    transport === "brevo" ? await sendViaBrevo() : await sendViaSmtp();
  console.log(JSON.stringify({ ...result, to: recipient }, null, 2));
  process.exit(result.success ? 0 : 1);
} catch (err) {
  console.error(
    JSON.stringify(
      {
        success: false,
        transport,
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
