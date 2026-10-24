import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductionSafety } from "../src/config/env.js";

/**
 * Pre-Phase-1 audit, items 1-5.
 *
 * TWO KINDS OF TEST LIVE HERE, AND THE DESCRIBE NAMES SAY WHICH.
 *
 *   describe("...")                   behavioural: calls assertProductionSafety,
 *                                      queries the database, or otherwise
 *                                      executes the rule. Real coverage.
 *
 *   describe("LOCK (source text) ...")  a LOCK: it reads a source file as TEXT
 *                                      and asserts on its contents. It exists
 *                                      so a known-bad pattern cannot be
 *                                      reintroduced by a refactor that keeps
 *                                      everything green.
 *
 * A lock does NOT prove the system behaves correctly -- it can pass while the
 * feature is broken, and it fails on harmless renames. So a lock must never be
 * counted as behavioural coverage in a report.
 *
 * Behavioural here: API_PUBLIC_URL enforcement, the CBE webhook
 * secret/enabled pairing, the absence of the frontend_url locale key, and
 * STAFF_CONSOLE_URL enforcement. Locks here: the notify_url and redirect_url
 * derivation sites, Telegram message content, keyboard URL construction, and
 * .env.example documentation.
 *
 * These pin the RULES rather than the implementation, because the whole point
 * of each change is that a specific misconfiguration is now impossible:
 *   - a provider callback can never be built from FRONTEND_URL again;
 *   - a configured-but-disabled webhook is a startup error, not a silent hole;
 *   - no storage key or evidence link can reappear in a Telegram message;
 *   - the bot cannot ship a relative "frontend_url/..." Mini App button;
 *   - there is no hardcoded staff-console domain left to fall back on.
 */

const SRC = resolve(process.cwd(), "src");

function read(relative: string): string {
  return readFileSync(resolve(SRC, relative), "utf8");
}

/**
 * Source with comments removed.
 *
 * Every one of these audits greps for a string that the code must not contain —
 * but the code's own comments legitimately QUOTE the old offender ("this
 * previously emitted `/evidence/${doc.storagePath}`") to explain why it is gone.
 * Grepping the raw file therefore fails on the explanation, which is the wrong
 * outcome in both directions: it teaches you to delete the rationale.
 *
 * Only whole-line comments and block comments are stripped. A naive `//` scan
 * would truncate any line containing a URL, since `https://` contains `//`.
 */
function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
}

/** The lines of `relative` that are executable code, comments removed. */
function codeLines(relative: string): string[] {
  return code(relative).split("\n");
}

function validProd(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: "production",
    TELEGRAM_ENV: "prod" as const,
    TELEGRAM_BOT_TOKEN: "123456:AAEtestestestestestestestestestest",
    TELEGRAM_WEBHOOK_SECRET: "a-sufficiently-long-webhook-secret",
    TELEGRAM_WEBHOOK_URL: "https://api.yekis.com/api/v1/telegram/webhook",
    FRONTEND_URL: "https://app.yekis.com",
    API_PUBLIC_URL: "https://api.yekis.com",
    STAFF_CONSOLE_URL: "https://console.yekis.com",
    TELEGRAM_POLLING_ENABLED: false,
    CBE_WEBHOOK_ENABLED: false,
    // F-01: the guest-support signing key is part of a complete production config.
    GUEST_SUPPORT_JWT_SECRET: "a-distinct-guest-support-signing-secret",
    JWT_ACCESS_SECRET: "the-ordinary-access-token-signing-secret",
    ...overrides,
  };
}

describe("1. API_PUBLIC_URL is required in production", () => {
  it("refuses to boot without it", () => {
    const v = assertProductionSafety(validProd({ API_PUBLIC_URL: undefined }));
    expect(v.join(" ")).toMatch(/API_PUBLIC_URL is required/);
  });

  it("requires https", () => {
    const v = assertProductionSafety(validProd({ API_PUBLIC_URL: "http://api.yekis.com" }));
    expect(v.join(" ")).toMatch(/API_PUBLIC_URL must be an https origin/);
  });

  it("accepts a complete configuration", () => {
    expect(assertProductionSafety(validProd())).toEqual([]);
  });

  it("does not require it in development", () => {
    expect(
      assertProductionSafety({ NODE_ENV: "development", FRONTEND_URL: "http://localhost:5173" }),
    ).toEqual([]);
  });

  it("keeps it distinct from FRONTEND_URL", () => {
    // Two different hosts on purpose: the whole point is that a provider
    // callback never resolves to the web app origin.
    const v = assertProductionSafety(
      validProd({ FRONTEND_URL: "https://app.yekis.com", API_PUBLIC_URL: "https://api.yekis.com" }),
    );
    expect(v).toEqual([]);
  });
});

describe("LOCK (source text) — provider callbacks are built from API_PUBLIC_URL", () => {
  it("telebirr.client.ts never builds notify_url from FRONTEND_URL", () => {
    const src = read("modules/escrow/providers/telebirr.client.ts");

    // The intent of this test is that a settlement callback is addressed to the
    // API, never to the web app host. It previously grepped the literal string
    // "env.API_PUBLIC_URL" inside the window between `notify_url:` and
    // `appid:`. That window moved when the value was extracted into
    // getNotifyUrl(), so the grep no longer saw the derivation it was checking.
    // Assert the data flow instead of its source spelling.

    // 1. deriveTelebirrNotifyUrl must derive from API_PUBLIC_URL (or an
    //    explicit operator override) and must never mention FRONTEND_URL. The
    //    derivation was extracted out of getNotifyUrl() into this helper, so
    //    the assertions follow the data flow rather than a fixed call site.
    const helperStart = src.indexOf("export function deriveTelebirrNotifyUrl");
    expect(helperStart).toBeGreaterThan(-1);
    const helperEnd = src.indexOf("\n}", helperStart);
    const helper = src.slice(helperStart, helperEnd);
    expect(helper).toContain("API_PUBLIC_URL");
    expect(helper).not.toContain("FRONTEND_URL");

    // 2. The payload's notify_url must come from that helper, and must not be
    //    assembled from FRONTEND_URL anywhere in the request block.
    const notifyBlock = src.slice(
      src.indexOf("notify_url:"),
      src.indexOf("appid:"),
    );
    expect(notifyBlock).toMatch(/notify_url:\s*notifyUrl/);
    expect(notifyBlock).not.toContain("FRONTEND_URL");
  });

  it("still sends the USER back to FRONTEND_URL after paying", () => {
    // redirect_url is user-facing, so FRONTEND_URL is the correct source there.
    const src = read("modules/escrow/providers/telebirr.client.ts");
    const redirectBlock = src.slice(
      src.indexOf("redirect_url:"),
      src.indexOf("},\n      sign:"),
    );
    // The redirect derivation also moved into a helper, so assert the helper
    // builds from FRONTEND_URL rather than grepping the inline payload.
    expect(redirectBlock).toMatch(/redirect_url:\s*deriveTelebirrRedirectUrl/);
    const redirectHelperStart = src.indexOf(
      "export function deriveTelebirrRedirectUrl",
    );
    expect(redirectHelperStart).toBeGreaterThan(-1);
    const redirectHelper = src.slice(
      redirectHelperStart,
      src.indexOf("\n}", redirectHelperStart),
    );
    expect(redirectHelper).toContain("FRONTEND_URL");
  });

  it("no provider client builds a callback from FRONTEND_URL", () => {
    for (const file of [
      "modules/escrow/providers/telebirr.client.ts",
      "modules/escrow/providers/cbe.client.ts",
      "modules/escrow/providers/mpesa.client.ts",
    ]) {
      const src = read(file);
      for (const line of src.split("\n")) {
        // Any line that combines FRONTEND_URL with an /api/ path is a callback
        // built from the wrong variable.
        if (line.includes("FRONTEND_URL") && line.includes("/api/")) {
          throw new Error(`${file}: callback built from FRONTEND_URL -> ${line.trim()}`);
        }
      }
    }
  });
});

describe("2. CBE webhook secret requires an explicit enable", () => {
  it("refuses to boot when the secret is set but the route is not enabled", () => {
    const v = assertProductionSafety(
      validProd({ CBE_WEBHOOK_SECRET: "cbe-secret", CBE_WEBHOOK_ENABLED: false }),
    );
    expect(v.join(" ")).toMatch(/CBE_WEBHOOK_SECRET is set but CBE_WEBHOOK_ENABLED/);
  });

  it("refuses when the flag is enabled but the secret is missing", () => {
    // Enabled with no secret means the route could not verify anything. The
    // tempting field fix is to weaken verification, so refuse to boot instead.
    const v = assertProductionSafety(
      validProd({ CBE_WEBHOOK_SECRET: undefined, CBE_WEBHOOK_ENABLED: true }),
    );
    expect(v.join(" ")).toMatch(
      /CBE_WEBHOOK_ENABLED is true but CBE_WEBHOOK_SECRET is not set/,
    );
  });

  it("accepts secret + explicit enable together", () => {
    expect(
      assertProductionSafety(
        validProd({ CBE_WEBHOOK_SECRET: "cbe-secret", CBE_WEBHOOK_ENABLED: true }),
      ),
    ).toEqual([]);
  });

  it("defaults to disabled", () => {
    // Not setting the flag at all must not enable the route.
    expect(
      assertProductionSafety(validProd({ CBE_WEBHOOK_SECRET: "cbe-secret", CBE_WEBHOOK_ENABLED: undefined })),
    ).toEqual(assertProductionSafety(validProd({ CBE_WEBHOOK_SECRET: "cbe-secret", CBE_WEBHOOK_ENABLED: false })));
  });
});

describe("LOCK (source text) — no KYC or receipt data in Telegram (C4)", () => {
  it("scenes/index.ts emits no /evidence/ link", () => {
    expect(code("modules/bot/scenes/index.ts")).not.toContain("/evidence/");
  });

  it("scenes/index.ts interpolates no storage key into a message", () => {
    const offenders = codeLines("modules/bot/scenes/index.ts").filter(
      (l) => l.includes("${") && (l.includes("storagePath") || l.includes("receiptImagePath")),
    );
    // The keys are still SELECTed (the console needs counts) and still stored
    // on upload; what must never happen is interpolating one into a message.
    expect(offenders).toEqual([]);
  });

  it("tells the reviewer to use the console instead", () => {
    expect(read("modules/bot/scenes/index.ts")).toMatch(/not shown here|staff console/i);
  });

  it("no staff handler renders a photo or document", () => {
    // The plan's own verification command for T4.7.
    for (const forbidden of ["sendPhoto", "sendDocument", "photo", "storagePath", "documentNumber"]) {
      expect(code("modules/bot/handlers/staff.ts"), `staff.ts must not reference ${forbidden}`).not.toContain(
        forbidden,
      );
    }
  });
});

describe("LOCK (source text) — no locale-derived URL in keyboards", () => {
  it("no keyboard builds a URL from ctx.t(...)", () => {
    for (const file of ["modules/bot/keyboards/actions.ts", "modules/bot/keyboards/jobFilters.ts"]) {
      const offenders = codeLines(file).filter(
        (l) => /web_app|url:/.test(l) && l.includes("ctx.t("),
      );
      expect(offenders, `${file} builds a URL from a locale key`).toEqual([]);
    }
  });

  it("both keyboards use the deepLink helper", () => {
    for (const file of ["modules/bot/keyboards/actions.ts", "modules/bot/keyboards/jobFilters.ts"]) {
      expect(code(file)).toContain("buildPublicWebAppUrl");
    }
  });

  it("the frontend_url locale key does not exist in any locale file", () => {
    // There was never a key to delete, which is exactly why the button shipped
    // the literal string. Assert it stays absent.
    for (const locale of ["en.json", "am.json", "en.ftl"]) {
      const src = readFileSync(resolve(SRC, "modules", "bot", "locales", locale), "utf8");
      expect(src, `${locale} must not define frontend_url`).not.toContain("frontend_url");
    }
  });

  it("no keyboard references the frontend_url locale key in code", () => {
    for (const file of ["modules/bot/keyboards/actions.ts", "modules/bot/keyboards/jobFilters.ts"]) {
      expect(code(file)).not.toContain("frontend_url");
    }
  });
});

describe("LOCK (source text) — staff console URL has no hardcoded fallback", () => {
  it("refuses to boot in production without STAFF_CONSOLE_URL", () => {
    const v = assertProductionSafety(validProd({ STAFF_CONSOLE_URL: undefined }));
    expect(v.join(" ")).toMatch(/STAFF_CONSOLE_URL is required/);
  });

  it("requires https", () => {
    const v = assertProductionSafety(validProd({ STAFF_CONSOLE_URL: "http://console.yekis.com" }));
    expect(v.join(" ")).toMatch(/STAFF_CONSOLE_URL must be an https origin/);
  });

  it("staff.ts code no longer contains the hardcoded fallback domain", () => {
    expect(code("modules/bot/handlers/staff.ts")).not.toContain("staff.yekis.local");
  });

  it("staff.ts reads STAFF_CONSOLE_URL", () => {
    expect(code("modules/bot/handlers/staff.ts")).toContain("env.STAFF_CONSOLE_URL");
  });

  it("no bot source hardcodes a *.yekis.local staff domain", () => {
    for (const file of ["modules/bot/handlers/staff.ts", "modules/bot/handlers/commands.ts"]) {
      expect(code(file)).not.toContain("yekis.local");
    }
  });
});

describe("LOCK (source text) — the new variables are documented in .env.example", () => {
  // The example file lives at the repository root; the backend-local copy was
  // removed when the workspace was flattened.
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const example = readFileSync(resolve(repoRoot, ".env.example"), "utf8");

  it("documents API_PUBLIC_URL", () => {
    expect(example).toContain("API_PUBLIC_URL");
  });

  it("documents CBE_WEBHOOK_ENABLED and says it defaults to false", () => {
    expect(example).toContain("CBE_WEBHOOK_ENABLED");
    expect(example).toMatch(/CBE_WEBHOOK_ENABLED=false/);
  });

  it("documents STAFF_CONSOLE_URL", () => {
    expect(example).toContain("STAFF_CONSOLE_URL");
  });
});
