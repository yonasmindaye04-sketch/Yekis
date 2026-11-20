import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * The mail transport, and the question the capability endpoint asks.
 *
 * WHY THIS SUITE EXISTS
 * The platform had exactly one way to send mail - SMTP - and the hosted app
 * may not have an outbound SMTP port open at all. The Brevo HTTPS API needs
 * nothing but port 443, and its free plan covers the whole platform today.
 *
 * Two things are being defended here:
 *
 *   1. **The transport is chosen by the configuration, not by luck.** A host
 *      with only a Brevo key can deliver, so the capability endpoint must say
 *      so; a host with neither must not.
 *
 *   2. **An explicit preference never silently falls back.** If the operator
 *      says EMAIL_TRANSPORT=brevo and the key is missing, the answer is "no
 *      transport" - not a quiet switch to SMTP. A platform that reports
 *      success through a transport nobody configured is how mail gets lost.
 *
 * The Brevo request shape is asserted rather than assumed: Brevo's v3 API
 * takes `htmlContent` and `textContent`, and rejects `html`/`text` with
 * `missing_parameter`. That was learned by sending a real request, and it is
 * the kind of detail that silently breaks every email if it is wrong.
 *
 * NOTE ON THE ENVIRONMENT: the suite forces NODE_ENV=staging. `development`
 * would take the "no transport, print the body to the console" branch, which
 * is a developer affordance and not what these tests are about; `production`
 * makes config/env.ts refuse to load without a full production secret set,
 * which would kill the test runner. Staging is the reachable-host behaviour:
 * no dev fallback, no code disclosure.
 */

const ORIGINAL_ENV = { ...process.env };

type LoadedModule = {
  resolveEmailTransport: () => "smtp" | "brevo" | "none";
  isEmailTransportConfigured: () => boolean;
  sendEmail: (payload: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }) => Promise<{ success: boolean; messageId?: string }>;
};

/**
 * Imports a fresh module graph with the given transport configuration.
 *
 * `vi.resetModules()` is what makes config/env.ts re-read process.env: the
 * environment is resolved once, at import time, and the exported object is
 * frozen for the life of the module.
 */
async function loadEmailModule(config: {
  smtp?: boolean;
  brevoKey?: string;
  transport?: "smtp" | "brevo" | "auto";
  emailFrom?: string;
}): Promise<LoadedModule> {
  process.env.NODE_ENV = "staging";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.BREVO_API_KEY;
  process.env.EMAIL_TRANSPORT = config.transport ?? "auto";
  if (config.smtp) {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASS = "smtp-pass";
  }
  if (config.brevoKey) {
    process.env.BREVO_API_KEY = config.brevoKey;
  }
  if (config.emailFrom) {
    process.env.EMAIL_FROM = config.emailFrom;
  }
  vi.resetModules();
  const mod = await import("../src/lib/email/email.service.js");
  return mod as unknown as LoadedModule;
}

/** A fetch stub that records the request and answers with `status`. */
function stubFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const spy = vi.fn(async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", spy);
  return { calls, spy };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("the mail transport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reports no transport when nothing is configured", async () => {
    const mod = await loadEmailModule({});
    expect(mod.resolveEmailTransport()).toBe("none");
    expect(mod.isEmailTransportConfigured()).toBe(false);
  });

  it("uses SMTP when the SMTP credentials are complete", async () => {
    const mod = await loadEmailModule({ smtp: true });
    expect(mod.resolveEmailTransport()).toBe("smtp");
    expect(mod.isEmailTransportConfigured()).toBe(true);
  });

  it("uses the Brevo API when only the API key is configured", async () => {
    // The hosted app has no outbound SMTP port, so this is the configuration
    // that has to work on its own.
    const mod = await loadEmailModule({ brevoKey: "xkeysib-test-key" });
    expect(mod.resolveEmailTransport()).toBe("brevo");
    expect(mod.isEmailTransportConfigured()).toBe(true);
  });

  it("prefers SMTP when both are configured", async () => {
    const mod = await loadEmailModule({ smtp: true, brevoKey: "xkeysib-test-key" });
    expect(mod.resolveEmailTransport()).toBe("smtp");
  });

  it("does not fall back to SMTP when the operator asked for Brevo and the key is missing", async () => {
    const mod = await loadEmailModule({ smtp: true, transport: "brevo" });
    expect(mod.resolveEmailTransport()).toBe("none");
    expect(mod.isEmailTransportConfigured()).toBe(false);
  });

  it("does not fall back to Brevo when the operator asked for SMTP and the credentials are missing", async () => {
    const mod = await loadEmailModule({ brevoKey: "xkeysib-test-key", transport: "smtp" });
    expect(mod.resolveEmailTransport()).toBe("none");
    expect(mod.isEmailTransportConfigured()).toBe(false);
  });

  it("sends through the Brevo API with the field names Brevo actually accepts", async () => {
    const { calls } = stubFetch(201, { messageId: "<abc@smtp-relay>" });
    const mod = await loadEmailModule({
      brevoKey: "xkeysib-test-key",
      emailFrom: "Yekis <emushu70@gmail.com>",
    });

    const result = await mod.sendEmail({
      to: "member@example.test",
      subject: "Your Yekis verification code: 123456",
      html: "<p>Code: <b>123456</b></p>",
      text: "Code: 123456",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("<abc@smtp-relay>");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(calls[0].init.method).toBe("POST");

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("xkeysib-test-key");

    const body = JSON.parse(String(calls[0].init.body));
    // htmlContent / textContent, NOT html / text: Brevo's v3 API rejects the
    // latter with `missing_parameter`.
    expect(body.htmlContent).toBe("<p>Code: <b>123456</b></p>");
    expect(body.textContent).toBe("Code: 123456");
    expect(body.subject).toBe("Your Yekis verification code: 123456");
    expect(body.sender).toEqual({ name: "Yekis", email: "emushu70@gmail.com" });
    expect(body.to).toEqual([{ email: "member@example.test" }]);
    // The API key must never end up in the payload.
    expect(JSON.stringify(body)).not.toContain("xkeysib-test-key");
  });

  it("reports a failed send when Brevo rejects the message", async () => {
    // 400 "unverified sender" is the realistic failure: the sender address has
    // to be verified in the Brevo account before anything can be sent.
    stubFetch(400, { code: "invalid_parameter", message: "Sender is not verified" });
    const mod = await loadEmailModule({ brevoKey: "xkeysib-test-key" });

    const result = await mod.sendEmail({
      to: "member@example.test",
      subject: "Yekis",
      html: "<p>hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.messageId).toBeUndefined();
  });

  it("reports a failed send when the Brevo API cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const mod = await loadEmailModule({ brevoKey: "xkeysib-test-key" });

    const result = await mod.sendEmail({
      to: "member@example.test",
      subject: "Yekis",
      html: "<p>hello</p>",
    });

    expect(result.success).toBe(false);
  });

  it("does not pretend to send on a reachable host with no transport", async () => {
    const { spy } = stubFetch(201, { messageId: "unused" });
    const mod = await loadEmailModule({});

    const result = await mod.sendEmail({
      to: "member@example.test",
      subject: "Yekis",
      html: "<p>hello</p>",
    });

    // No transport, NODE_ENV=staging: the message was not delivered, and the
    // caller must be told so. Nothing was sent to any provider either.
    expect(result.success).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
