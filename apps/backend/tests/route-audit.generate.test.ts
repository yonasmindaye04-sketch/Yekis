import { describe, it } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { listRoutes, routeKey } from "../src/testing/routeInventory.js";

/**
 * Prints every route that answers 2xx with NO token. Run once to regenerate the
 * allowlist after an intentional change; the result is pasted into
 * tests/fixtures/publicRoutes.ts with a justification for each entry.
 *
 *   npx vitest run tests/route-audit.generate.test.ts
 */
describe("generate public route allowlist", () => {
  it("prints anonymously-reachable routes", async () => {
    const app = buildApp();
    const routes = listRoutes(app);
    const out: string[] = [];

    for (const route of routes) {
      const path = route.path.replace(/:([A-Za-z0-9_]+)(\(\*\))?/g, "audit-fixture");
      try {
        const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
          route.method.toLowerCase()
        ]!(path);
        if (res.status >= 200 && res.status < 300) {
          out.push(`${routeKey(route)} -> ${res.status}`);
        }
      } catch {
        // Unreachable (timed out / socket error) is not "public".
      }
    }

    // eslint-disable-next-line no-console
    console.log("\n=== PUBLIC ROUTES ===\n" + out.join("\n") + "\n=== END ===\n");
  }, 300_000);
});
