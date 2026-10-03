import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { env } from "../src/config/env.js";
import {
  buildWebAppUrl,
  buildPublicWebAppUrl,
  isPublicFrontendUrl,
  webAuthRoute,
  botUsername,
  createJobShareLink,
  createWebAuthDeepLink,
  parseDeepLink,
  webAppRoutes,
} from "../src/modules/bot/utils/deepLink.js";

/**
 * Regression cover for the bug where buildWebAppUrl rewrote any localhost or
 * http:// base to a hardcoded https://yekis.io. Because FRONTEND_URL defaults to
 * http://localhost:5173, that rewrite fired on EVERY call, so every link the bot
 * handed out (/start, /login, /contracts, /disputes, /proposals) pointed at a
 * domain that does not host the app and members got "site can't be reached".
 */
describe("Bot deep links", () => {
  const originalFrontendUrl = env.FRONTEND_URL;
  const originalUsername = env.TELEGRAM_BOT_USERNAME;

  const setFrontendUrl = (value: string) => {
    (env as Record<string, unknown>).FRONTEND_URL = value;
  };

  beforeEach(() => {
    setFrontendUrl("http://localhost:5173");
  });

  afterAll(() => {
    (env as Record<string, unknown>).FRONTEND_URL = originalFrontendUrl;
    (env as Record<string, unknown>).TELEGRAM_BOT_USERNAME = originalUsername;
  });

  it("uses FRONTEND_URL verbatim instead of substituting a domain", () => {
    expect(buildWebAppUrl("/jobs")).toBe("http://localhost:5173/jobs");
    expect(buildWebAppUrl("/")).toBe("http://localhost:5173/");
  });

  it("never emits the dead hardcoded domain", () => {
    const urls = [
      buildWebAppUrl("/"),
      buildWebAppUrl("/jobs"),
      webAppRoutes.disputes(),
      webAppRoutes.wallet(),
      webAppRoutes.kyc(),
      webAppRoutes.settings(),
    ];
    for (const url of urls) {
      expect(url).not.toContain("yekis.io");
    }
  });

  it("carries the one-time code so the link lands authenticated", () => {
    const url = webAuthRoute("AB3D9F2K");
    expect(url).toBe("http://localhost:5173/?tg_code=AB3D9F2K");
    const code = new URL(url).searchParams.get("tg_code");
    expect(code).toBe("AB3D9F2K");
  });

  it("respects a configured public origin", () => {
    setFrontendUrl("https://app.yekis.et/");
    expect(buildWebAppUrl("/jobs")).toBe("https://app.yekis.et/jobs");
    expect(webAuthRoute("AB3D9F2K")).toBe(
      "https://app.yekis.et/?tg_code=AB3D9F2K",
    );
  });

  it("preserves query params on deep routes", () => {
    expect(webAppRoutes.proposals("job123")).toBe(
      "http://localhost:5173/proposals?jobId=job123",
    );
  });

  describe("public URL detection for Telegram Mini App buttons", () => {
    it("accepts a public https origin", () => {
      setFrontendUrl("https://app.yekis.et");
      expect(isPublicFrontendUrl()).toBe(true);
      expect(buildPublicWebAppUrl("/")).toBe("https://app.yekis.et/");
    });

    it("rejects loopback, LAN, plain http and malformed origins", () => {
      for (const bad of [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://192.168.1.20:5173",
        "https://10.0.0.5:5173",
        "https://172.20.0.4:5173",
        "https://mybox.local:5173",
        "not-a-url",
        "",
      ]) {
        setFrontendUrl(bad);
        expect(isPublicFrontendUrl(), bad).toBe(false);
        // Returns null so callers SKIP the button rather than emit a dead link.
        expect(buildPublicWebAppUrl("/"), bad).toBeNull();
      }
    });
  });

  describe("bot handle", () => {
    it("reads the handle from config and strips a leading @", () => {
      (env as Record<string, unknown>).TELEGRAM_BOT_USERNAME = "ye_kis_bot";
      expect(botUsername()).toBe("ye_kis_bot");

      (env as Record<string, unknown>).TELEGRAM_BOT_USERNAME = "@ye_kis_bot";
      expect(botUsername()).toBe("ye_kis_bot");
    });

    it("is empty when unconfigured rather than guessing a handle", () => {
      (env as Record<string, unknown>).TELEGRAM_BOT_USERNAME = undefined;
      expect(botUsername()).toBe("");
    });

    it("builds share and web-auth links from the configured handle", () => {
      (env as Record<string, unknown>).TELEGRAM_BOT_USERNAME = "ye_kis_bot";
      expect(createJobShareLink("job42")).toBe(
        "https://t.me/ye_kis_bot?start=job_job42",
      );
      expect(createWebAuthDeepLink()).toBe(
        "https://t.me/ye_kis_bot?start=web_auth",
      );
    });
  });

  describe("start payload parsing", () => {
    it("recognises web_auth, which the browser sign-in page links to", () => {
      expect(parseDeepLink("web_auth")).toEqual({ type: "web_auth", id: "" });
      expect(parseDeepLink("login")).toEqual({ type: "web_auth", id: "" });
    });

    it("still recognises entity deep links", () => {
      expect(parseDeepLink("job_abc123")).toEqual({
        type: "job",
        id: "abc123",
      });
      expect(parseDeepLink("ref_user9")).toEqual({ type: "ref", id: "user9" });
    });

    it("returns null for unknown payloads", () => {
      expect(parseDeepLink("nonsense")).toBeNull();
      expect(parseDeepLink("")).toBeNull();
    });
  });
});