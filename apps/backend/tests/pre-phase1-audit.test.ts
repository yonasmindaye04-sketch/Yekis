import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertProductionSafety } from "../src/config/env.js";

/**
 * Pre-Phase-1 audit, items 1-5.
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

describe("1. provider callbacks are built from API_PUBLIC_URL", () => {
  it("telebirr.client.ts never builds notify_url from FRONTEND_URL", () => {
    const src = read("modules/escrow/providers/telebirr.client.ts");
    const notifyBlock = src.slice(
      src.indexOf("notify_url:"),
      src.indexOf("appid:"),
    );
    expect(notifyBlock).toContain("env.API_PUBLIC_URL");
    expect(notifyBlock).not.toContain("env.FRONTEND_URL");
  });

  it("still sends the USER back to FRONTEND_URL after paying", () => {
    // redirect_url is user-facing, so FRONTEND_URL is the correct source there.
    const src = read("modules/escrow/providers/telebirr.client.ts");
    const redirectBlock = src.slice(
      src.indexOf("redirect_url:"),
      src.indexOf("},\n      sign:"),
    );
    expect(redirectBlock).toContain("env.FRONTEND_URL");
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

describe("3. no KYC or receipt data in Telegram (C4)", () => {
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

describe("4. no locale-derived URL in keyboards", () => {
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

describe("5. staff console URL has no hardcoded fallback", () => {
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

describe("6. the new variables are documented in .env.example", () => {
  const example = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

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
