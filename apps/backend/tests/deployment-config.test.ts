import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  applyObjectStoreAliases,
  tlsVerificationBypassed,
} from "../src/config/env.js";
import {
  FRAME_ANCESTORS,
  resolveFrontendDistDir,
} from "../src/lib/staticSite.js";

/**
 * Configuration that only matters when the platform runs the application
 * rather than a developer running it locally.
 *
 * Three things changed to make a container deployment possible, and each one
 * is a decision that is easy to get wrong silently:
 *
 *   - the object store accepts the standard AWS_* names, because that is what
 *     a hosted platform injects when a bucket is linked to an app,
 *   - TLS certificate verification is no longer disabled on every
 *     non-production deployment, and
 *   - the built frontend can be served by the API process, which is what
 *     gives the Mini App one origin.
 */

/**
 * NODE_TLS_REJECT_UNAUTHORIZED is a process-wide switch: it turns off
 * certificate checking for EVERY outbound HTTPS call. Leaving it off on a
 * staging deployment means the object store, the Telegram API and every
 * provider callback are open to interception.
 */
describe("TLS verification is not disabled outside development", () => {
  it("bypasses verification in development", () => {
    expect(tlsVerificationBypassed({ NODE_ENV: "development" })).toBe(true);
  });

  it("bypasses verification against the Telebirr sandbox", () => {
    // The sandbox gateway's certificate is genuinely self-signed, so this
    // is the one case where the bypass is justified.
    expect(
      tlsVerificationBypassed({
        NODE_ENV: "staging",
        TELEBIRR_ENV: "sandbox",
      }),
    ).toBe(true);
  });

  it("verifies certificates on a staging deployment", () => {
    expect(tlsVerificationBypassed({ NODE_ENV: "staging" })).toBe(false);
    expect(
      tlsVerificationBypassed({ NODE_ENV: "staging", TELEBIRR_ENV: "production" }),
    ).toBe(false);
  });

  it("verifies certificates in production", () => {
    expect(tlsVerificationBypassed({ NODE_ENV: "production" })).toBe(false);
    expect(
      tlsVerificationBypassed({
        NODE_ENV: "production",
        TELEBIRR_ENV: "production",
      }),
    ).toBe(false);
  });
});

describe("object store environment aliases", () => {
  it("fills the platform's names from the standard AWS names", () => {
    // This is exactly what a hosted platform injects when a bucket is
    // linked to an app.
    const result = applyObjectStoreAliases({
      AWS_ENDPOINT_URL: "https://s3.aletcloud.com",
      AWS_REGION: "et-addis-1",
      AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_BUCKET: "yekis-test-media",
    });

    expect(result.OBJECT_STORE_ENDPOINT).toBe("https://s3.aletcloud.com");
    expect(result.OBJECT_STORE_REGION).toBe("et-addis-1");
    expect(result.OBJECT_STORE_ACCESS_KEY).toBe("AKIAEXAMPLE");
    expect(result.OBJECT_STORE_SECRET_KEY).toBe("secret");
    expect(result.OBJECT_STORE_BUCKET).toBe("yekis-test-media");
  });

  it("never overrides an explicitly configured value", () => {
    const result = applyObjectStoreAliases({
      OBJECT_STORE_ENDPOINT: "http://localhost:9000",
      OBJECT_STORE_BUCKET: "local-bucket",
      AWS_ENDPOINT_URL: "https://s3.aletcloud.com",
      AWS_BUCKET: "yekis-test-media",
    });

    expect(result.OBJECT_STORE_ENDPOINT).toBe("http://localhost:9000");
    expect(result.OBJECT_STORE_BUCKET).toBe("local-bucket");
  });

  it("accepts the other bucket-name spellings platforms use", () => {
    for (const name of [
      "AWS_BUCKET",
      "AWS_BUCKET_NAME",
      "AWS_S3_BUCKET",
      "S3_BUCKET",
      "BUCKET_NAME",
    ]) {
      const result = applyObjectStoreAliases({ [name]: "a-bucket" });
      expect(result.OBJECT_STORE_BUCKET, name).toBe("a-bucket");
    }
  });

  it("leaves the configuration alone when nothing is set", () => {
    const result = applyObjectStoreAliases({});
    expect(result.OBJECT_STORE_ENDPOINT).toBeUndefined();
    expect(result.OBJECT_STORE_BUCKET).toBeUndefined();
  });
});

describe("the framing allowlist", () => {
  it("names Telegram, because the Mini App is framed by Telegram", () => {
    expect(FRAME_ANCESTORS).toContain("https://web.telegram.org");
    expect(FRAME_ANCESTORS).toContain("https://*.telegram.org");
  });

  it("names 'self', because the app also runs in a normal tab", () => {
    expect(FRAME_ANCESTORS).toContain("'self'");
  });

  it("does not name any origin that is not on the approved list", () => {
    const origins = FRAME_ANCESTORS.split(" ").filter(Boolean);
    expect(origins).toHaveLength(7);
    for (const origin of origins) {
      expect(origin).toMatch(/^'self'$|^https:\/\//);
    }
  });
});

describe("locating the built frontend", () => {
  it("never returns a directory that holds no build", () => {
    // Whether a build exists depends on the checkout — CI has none, a
    // workstation that has run `pnpm --filter frontend build` has one. The
    // invariant is the same either way: the answer is null, or it is a
    // directory that really does contain the SPA's index.html.
    //
    // Returning a path without a build would make the API serve a 404 page
    // for every client-side route.
    const dir = resolveFrontendDistDir();
    if (dir === null) return;
    expect(existsSync(join(dir, "index.html"))).toBe(true);
    expect(dir.endsWith("dist")).toBe(true);
  });
});
