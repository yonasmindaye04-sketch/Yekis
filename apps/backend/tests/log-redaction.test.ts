import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { redactText, createLogger } from "../src/lib/logger.js";
import {
  hashUserId,
  safeCommandName,
} from "../src/modules/bot/middleware/logging.middleware.js";

/**
 * T0.4 — no credential may reach a log line.
 *
 * These tests drive the REAL logger configuration via `createLogger()`, so they
 * cannot drift from what ships. pino's `redact` paths alone are demonstrably
 * insufficient (its wildcards miss both root-level and deeply nested keys),
 * which is why the recursive scrubber exists — the tests below pin that
 * behaviour.
 *
 * `FAKE_TOKEN` is shaped exactly like a real bot token (`<digits>:<35 chars>`)
 * so it exercises the scrubber's pattern rather than a special case.
 */
const FAKE_TOKEN = "7123456789:AAFakeFakeFakeFakeFakeFakeFakeFakeX";

function capture(fn: (logger: ReturnType<typeof createLogger>) => void): string {
  const chunks: string[] = [];
  const logger = createLogger(
    new Writable({
      write(chunk, _e, cb) {
        chunks.push(chunk.toString());
        cb();
      },
    }),
  );
  fn(logger);
  return chunks.join("");
}

describe("T0.4 log redaction", () => {
  it("scrubs a bot token embedded in an error message", () => {
    const leaked = `Error: 401 Unauthorized from https://api.telegram.org/bot${FAKE_TOKEN}/getMe`;
    const cleaned = redactText(leaked);
    expect(cleaned).not.toContain(FAKE_TOKEN);
    expect(cleaned).toContain("[REDACTED_BOT_TOKEN]");
  });

  it("scrubs every occurrence, not just the first", () => {
    const cleaned = redactText(`${FAKE_TOKEN} and ${FAKE_TOKEN}`);
    expect(cleaned).not.toContain(FAKE_TOKEN);
    expect(cleaned.match(/\[REDACTED_BOT_TOKEN\]/g)).toHaveLength(2);
  });

  it("leaves ordinary text untouched", () => {
    const msg = "Update processed for job 42 in 15ms";
    expect(redactText(msg)).toBe(msg);
  });

  it("does not mangle a bare hex digest or a short colon pair", () => {
    // An over-eager scrubber that eats real data is its own outage, so the
    // pattern must stay narrow: a colon-separated pair needs a 30+ char suffix.
    const digest =
      "sha256 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
    const shortPair = "cache 12345:0123456789abcdef";
    expect(redactText(digest)).toBe(digest);
    expect(redactText(shortPair)).toBe(shortPair);
  });

  it("redacts the Authorization header", () => {
    const out = capture((l) =>
      l.info({ req: { headers: { authorization: "Bearer super-secret-jwt" } } }, "req"),
    );
    expect(out).not.toContain("super-secret-jwt");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts session cookies", () => {
    const out = capture((l) =>
      l.info(
        {
          req: { headers: { cookie: "session=abc123", "set-cookie": "session=abc123" } },
        },
        "req",
      ),
    );
    expect(out).not.toContain("session=abc123");
  });

  it("redacts secret keys at the ROOT of the logged object", () => {
    const out = capture((l) =>
      l.info(
        {
          initData: "query_id=abc&hash=deadbeef",
          verifier: "pkce-verifier-value",
          sid: "wl_abcdef123456",
          code: "K7M2QX9P",
          password: "hunter2-correct-horse",
          refreshToken: "refresh.jwt.value",
        },
        "auth attempt",
      ),
    );

    for (const secret of [
      "query_id=abc&hash=deadbeef",
      "pkce-verifier-value",
      "wl_abcdef123456",
      "K7M2QX9P",
      "hunter2-correct-horse",
      "refresh.jwt.value",
    ]) {
      expect(out, `leaked: ${secret}`).not.toContain(secret);
    }
  });

  it("redacts secret keys nested at arbitrary depth", () => {
    const out = capture((l) =>
      l.info(
        {
          body: { user: { account: { password: "deep-secret", sid: "deep-sid" } } },
          attempts: [{ code: "AAAA1111" }, { code: "BBBB2222" }],
        },
        "nested",
      ),
    );
    for (const secret of ["deep-secret", "deep-sid", "AAAA1111", "BBBB2222"]) {
      expect(out, `leaked: ${secret}`).not.toContain(secret);
    }
  });

  it("matches secret keys case-insensitively", () => {
    const out = capture((l) =>
      l.info({ AccessToken: "aaa", PASSWORD: "bbb", init_data: "ccc" }, "casing"),
    );
    expect(out).not.toContain("aaa");
    expect(out).not.toContain("bbb");
    expect(out).not.toContain("ccc");
  });

  it("scrubs a bot token handed to logger.info as the message itself", () => {
    const out = capture((l) => l.info(`calling ${FAKE_TOKEN}/getMe`));
    expect(out).not.toContain(FAKE_TOKEN);
  });

  it("scrubs a bot token inside a logged Error", () => {
    const out = capture((l) =>
      l.error({ err: new Error(`401 from https://api.telegram.org/bot${FAKE_TOKEN}/getMe`) }, "failed"),
    );
    expect(out).not.toContain(FAKE_TOKEN);
  });

  it("preserves interpolation arguments so formatted messages stay readable", () => {
    const out = capture((l) => l.info({ updateId: 7 }, "Bot error in update %d", 7));
    expect(out).toContain("Bot error in update 7");
  });
});

describe("T0.4 bot logging fields", () => {
  it("never returns free text as a command name", () => {
    // A member pasting a one-time code, or a PKCE sid, must not be logged.
    expect(safeCommandName("K7M2QX9P")).toBeUndefined();
    expect(safeCommandName("my password is hunter2")).toBeUndefined();
    expect(safeCommandName("+251911234567")).toBeUndefined();
  });

  it("returns only the command word and drops arguments", () => {
    expect(safeCommandName("/start")).toBe("start");
    // The sid is an argument — precisely the part that must not be recorded.
    expect(safeCommandName("/start wl_supersecretsid")).toBe("start");
    expect(safeCommandName("/login@YekisJobsBot")).toBe("login");
  });

  it("bounds an absurdly long command name", () => {
    expect(safeCommandName(`/${"a".repeat(5000)}`)?.length).toBeLessThanOrEqual(64);
  });

  it("hashes Telegram ids irreversibly and stably", () => {
    const a = hashUserId(51500100);
    const b = hashUserId(51500100);
    const c = hashUserId(51500101);

    expect(a).toBe(b); // stable, so one member's lines still correlate
    expect(a).not.toBe(c); // distinct per member
    expect(a).not.toContain("51500100");
    expect(a).toMatch(/^[a-f0-9]{16}$/);
  });

  it("returns undefined for a missing id rather than a bogus hash", () => {
    expect(hashUserId(undefined)).toBeUndefined();
    expect(hashUserId(null)).toBeUndefined();
    expect(hashUserId("")).toBeUndefined();
  });
});
