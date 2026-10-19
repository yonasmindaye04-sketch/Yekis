import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "../src/config/env.js";
import { sendSms } from "../src/modules/notifications/sms.client.js";

/**
 * The SMSEthiopia contract, taken from the provider's own developer docs
 * (https://smsethiopia.com/developer-docs.txt, April 2026):
 *
 *   POST https://smsethiopia.com/api/sms/send
 *   Headers: KEY: <api key>, Content-Type: application/json
 *   Body:    { "msisdn": "251911234567", "text": "..." }
 *   Success: 200 with { "sent": true, "id": 0, "description": "..." }
 *
 * The property that matters most is the last line. A 200 does not mean the
 * message went out: the provider distinguishes accepted from delivered with
 * `sent`. For phone verification, reporting a delivery that did not happen
 * locks a user out of their own account.
 *
 * The module is imported once, statically, and `env` is mutated in place. An
 * earlier draft reloaded the client with vi.resetModules(), which handed it a
 * different env instance, so the key never applied and every send short-circuited
 * as "not configured" -- which looked like a broken client rather than a broken
 * test.
 */

const originalKey = env.SMS_ETHIOPIA_API_KEY;

function setKey(value: string | undefined) {
  (env as Record<string, unknown>).SMS_ETHIOPIA_API_KEY = value;
}

type FetchCall = { url: string; init: RequestInit | undefined };

function stubFetch(
  respond: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
) {
  const calls: FetchCall[] = [];
  vi.stubGlobal("fetch", async (url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: init as RequestInit });
    return respond(String(url), init as RequestInit);
  });
  return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const OK = () => jsonResponse({ sent: true, id: 0, description: "Accepted" });

afterEach(() => {
  setKey(originalKey);
  vi.unstubAllGlobals();
});

describe("sendSms against the documented contract", () => {
  it("sends to the documented URL with the KEY header and exactly two body fields", async () => {
    setKey("test-key");
    const calls = stubFetch(() => OK());

    await sendSms({ phone: "+251911234567", message: "Your code is 123456" });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://smsethiopia.com/api/sms/send");

    const headers = calls[0].init?.headers as Record<string, string>;
    // The provider rejects Authorization: Bearer in favour of KEY.
    expect(headers.KEY).toBe("test-key");
    expect(headers["Authorization"]).toBeUndefined();

    const body = JSON.parse(calls[0].init?.body as string);
    // sender / from / username / password are all documented as wrong.
    expect(Object.keys(body).sort()).toEqual(["msisdn", "text"]);
    expect(body.msisdn).toBe("251911234567");
    expect(body.text).toBe("Your code is 123456");
  });

  it("treats a 200 carrying sent:false as a failure, not a delivery", async () => {
    setKey("test-key");
    stubFetch(() => jsonResponse({ sent: false, description: "Invalid destination" }));
    const result = await sendSms({ phone: "+251911234567", message: "hello" });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not_confirmed");
  });

  it("treats a 200 with an unparseable body as a failure", async () => {
    setKey("test-key");
    stubFetch(
      () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("not json");
          },
          text: async () => "not json",
        }) as unknown as Response,
    );
    const result = await sendSms({ phone: "+251911234567", message: "hello" });
    expect(result.sent).toBe(false);
  });

  it("reports a non-2xx as a failure without echoing the message back", async () => {
    setKey("test-key");
    stubFetch(() => jsonResponse({ error: "bad key" }, 401));
    const result = await sendSms({
      phone: "+251911234567",
      message: "secret code 123456",
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("http_401");
    expect(JSON.stringify(result)).not.toContain("123456");
  });

  it("refuses to send to a malformed number rather than wasting a send", async () => {
    setKey("test-key");
    const calls = stubFetch(() => OK());
    const result = await sendSms({ phone: "+15551234567", message: "hello" });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("invalid_msisdn");
    expect(calls).toHaveLength(0);
  });

  it("does not claim delivery when no API key is configured", async () => {
    setKey(undefined);
    const calls = stubFetch(() => OK());
    const result = await sendSms({ phone: "+251911234567", message: "hello" });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not_configured");
    expect(calls).toHaveLength(0);
  });

  it("bounds the request with a timeout so a hung provider cannot hang the caller", async () => {
    setKey("test-key");
    const calls = stubFetch(() => OK());
    await sendSms({ phone: "+251911234567", message: "hello" });
    expect(calls[0].init?.signal).toBeDefined();
  });

  it("reports a network failure rather than throwing at the caller", async () => {
    setKey("test-key");
    stubFetch(() => {
      throw new Error("ECONNRESET");
    });
    const result = await sendSms({ phone: "+251911234567", message: "hello" });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("network_error");
  });

  it("reports a timeout distinctly from a generic network failure", async () => {
    setKey("test-key");
    stubFetch(() => {
      const err = new Error("aborted");
      err.name = "TimeoutError";
      throw err;
    });
    const result = await sendSms({ phone: "+251911234567", message: "hello" });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("timeout");
  });
});