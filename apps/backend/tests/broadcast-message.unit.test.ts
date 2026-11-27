import { describe, expect, it } from "vitest";
import {
  BROADCAST_AUDIENCES,
  TELEGRAM_CAPTION_LIMIT,
  TELEGRAM_MESSAGE_LIMIT,
  audienceWhere,
  composeBroadcastHtml,
  describeSendError,
  escapeTelegramHtml,
  fitsTelegramLimits,
  retryAfterSeconds,
} from "../src/modules/bot/broadcast.message.js";

describe("escapeTelegramHtml", () => {
  it("escapes the three characters Telegram HTML parses", () => {
    expect(escapeTelegramHtml("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });

  it("leaves ordinary prose and prices untouched", () => {
    const text = "Escrow released: ETB 1,250 (100%).";
    expect(escapeTelegramHtml(text)).toBe(text);
  });

  it("escapes an ampersand once, not the ampersand of the escape it just wrote", () => {
    expect(escapeTelegramHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("composeBroadcastHtml", () => {
  it("puts a trimmed heading in bold followed by a blank line", () => {
    expect(composeBroadcastHtml({ heading: "  Hello  ", body: "World" })).toBe(
      "<b>Hello</b>\n\nWorld"
    );
  });

  it("sends the body alone when no heading was written", () => {
    expect(composeBroadcastHtml({ heading: "   ", body: "World" })).toBe("World");
    expect(composeBroadcastHtml({ heading: null, body: "World" })).toBe("World");
  });

  it("escapes the heading and the body instead of accepting admin markup", () => {
    expect(
      composeBroadcastHtml({ heading: "<i>Sale</i>", body: "Use <code> this & that" })
    ).toBe("<b>&lt;i&gt;Sale&lt;/i&gt;</b>\n\nUse &lt;code&gt; this &amp; that");
  });
});

describe("fitsTelegramLimits", () => {
  it("accepts exactly the text limit and refuses one character more", () => {
    expect(fitsTelegramLimits({ heading: null, body: "a".repeat(TELEGRAM_MESSAGE_LIMIT) }).ok)
      .toBe(true);
    const over = fitsTelegramLimits({
      heading: null,
      body: "a".repeat(TELEGRAM_MESSAGE_LIMIT + 1),
    });
    expect(over.ok).toBe(false);
    expect(over.reason).toContain("4096");
  });

  it("counts the heading and its blank separator", () => {
    expect(fitsTelegramLimits({ heading: "Hi", body: "a".repeat(4092) }).ok).toBe(true);
    expect(fitsTelegramLimits({ heading: "Hi", body: "a".repeat(4093) }).ok).toBe(false);
  });

  it("uses the caption limit whenever an image is attached", () => {
    expect(
      fitsTelegramLimits({
        heading: null,
        body: "a".repeat(TELEGRAM_CAPTION_LIMIT),
        imageUrl: "https://cdn.example.com/a.png",
      }).ok
    ).toBe(true);
    const over = fitsTelegramLimits({
      heading: null,
      body: "a".repeat(TELEGRAM_CAPTION_LIMIT + 1),
      imageUrl: "https://cdn.example.com/a.png",
    });
    expect(over.ok).toBe(false);
    expect(over.reason).toContain("caption");
  });

  it("does not charge the budget for platform HTML or escaped characters", () => {
    // 4096 ampersands become 20,480 characters of HTML but stay 4096 visible.
    expect(fitsTelegramLimits({ heading: null, body: "&".repeat(4096) }).ok).toBe(true);
  });
});

describe("audienceWhere", () => {
  const base = { isSuspended: false, isGuestContact: false, telegramChatId: { not: null } };

  it("covers every declared audience", () => {
    for (const audience of BROADCAST_AUDIENCES) {
      const where = audienceWhere(audience) as Record<string, unknown>;
      expect(where.isSuspended).toBe(false);
      expect(where.isGuestContact).toBe(false);
      expect(where.telegramChatId).toEqual({ not: null });
    }
  });

  it("selects everyone reachable for ALL", () => {
    expect(audienceWhere("ALL")).toEqual(base);
  });

  it("includes BOTH in the client and freelancer audiences", () => {
    expect(audienceWhere("CLIENTS")).toEqual({ ...base, role: { in: ["CLIENT", "BOTH"] } });
    expect(audienceWhere("FREELANCERS")).toEqual({
      ...base,
      role: { in: ["FREELANCER", "BOTH"] },
    });
  });

  it("selects staff by staff role and verified members by cached KYC", () => {
    expect(audienceWhere("STAFF")).toEqual({ ...base, staffRole: { not: null } });
    expect(audienceWhere("KYC_VERIFIED")).toEqual({ ...base, cachedKycStatus: "VERIFIED" });
  });
});

describe("retryAfterSeconds", () => {
  it("reads retry_after from a 429 response", () => {
    expect(retryAfterSeconds({ error_code: 429, parameters: { retry_after: 7 } })).toBe(7);
    expect(retryAfterSeconds({ error: { error_code: 429, parameters: { retry_after: 2 } } })).toBe(2);
  });

  it("rounds up and clamps to a sane wait", () => {
    expect(retryAfterSeconds({ error_code: 429, parameters: { retry_after: 2.2 } })).toBe(3);
    expect(retryAfterSeconds({ error_code: 429, parameters: { retry_after: 0 } })).toBe(1);
    expect(retryAfterSeconds({ error_code: 429, parameters: { retry_after: 300 } })).toBe(60);
  });

  it("returns null for anything that is not a 429", () => {
    expect(retryAfterSeconds({ error_code: 400, parameters: { retry_after: 5 } })).toBeNull();
    expect(retryAfterSeconds({ error_code: 429 })).toBeNull();
    expect(retryAfterSeconds(null)).toBeNull();
  });
});

describe("describeSendError", () => {
  it("collapses whitespace into one line", () => {
    expect(describeSendError(new Error("  Telegram   said no  "))).toBe("Telegram said no");
  });

  it("bounds the stored reason", () => {
    const long = describeSendError(new Error("x".repeat(400)));
    expect(long.length).toBe(300);
    expect(long.endsWith("...")).toBe(true);
  });
});
