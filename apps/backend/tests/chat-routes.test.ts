import { describe, it, expect } from "vitest";
import { chatRouter } from "../src/modules/chat/chat.routes.js";

/**
 * Chat route surface guard.
 *
 * `POST /api/v1/chat/support` was silently deleted at one point while removing
 * an unrelated block of routes — TypeScript stayed green (the frontend just
 * holds the path as a string), the server booted, and the failure only showed
 * up as a 404 in manual testing.
 *
 * These assertions are deliberately blunt: they pin the public surface of the
 * chat router so an accidental deletion fails CI instead of production.
 */

type Layer = { route?: { path: string; methods: Record<string, boolean> } };

function registeredRoutes(): { method: string; path: string }[] {
  const out: { method: string; path: string }[] = [];
  for (const layer of chatRouter.stack as Layer[]) {
    const route = layer.route;
    if (!route?.path) continue;
    for (const [method, enabled] of Object.entries(route.methods)) {
      if (enabled && method !== "_all") {
        out.push({ method: method.toUpperCase(), path: route.path });
      }
    }
  }
  return out;
}

const routes = registeredRoutes();

function has(method: string, path: string): boolean {
  return routes.some((r) => r.method === method && r.path === path);
}

describe("Chat router surface", () => {
  it("exposes guest intake (public)", () => {
    expect(has("POST", "/guest")).toBe(true);
  });

  it("exposes the authenticated support ticket endpoint", () => {
    // Regression: this route was removed by accident and only surfaced as a 404.
    expect(has("POST", "/support")).toBe(true);
  });

  it("exposes conversation read and write for participants and guests", () => {
    expect(has("GET", "/conversations")).toBe(true);
    expect(has("POST", "/conversations")).toBe(true);
    expect(has("GET", "/conversations/:conversationId/messages")).toBe(true);
    expect(has("POST", "/conversations/:conversationId/messages")).toBe(true);
    expect(has("POST", "/conversations/:conversationId/read")).toBe(true);
  });

  it("exposes direct messaging and attachments", () => {
    expect(has("POST", "/direct")).toBe(true);
    expect(has("POST", "/upload")).toBe(true);
    expect(has("GET", "/attachments/:key(*)")).toBe(true);
  });

  it("exposes the staff queue operations", () => {
    expect(has("GET", "/admin/conversations")).toBe(true);
    expect(has("POST", "/admin/conversations/:conversationId/claim")).toBe(true);
    expect(has("PATCH", "/admin/conversations/:conversationId/assign")).toBe(true);
    expect(has("PATCH", "/admin/conversations/:conversationId/status")).toBe(true);
  });

  it("exposes the Mini-Me assistant endpoints", () => {
    expect(has("POST", "/conversations/:conversationId/assistant/suggest-replies")).toBe(true);
    expect(has("POST", "/conversations/:conversationId/assistant/summarize")).toBe(true);
    expect(has("POST", "/conversations/:conversationId/assistant/extract-deal")).toBe(true);
  });

  it("no longer exposes the removed Chatwoot bridge endpoints", () => {
    const paths = routes.map((r) => r.path);
    expect(paths.some((p) => p.includes("chatwoot"))).toBe(false);
  });

  it("registers a non-trivial number of routes (sanity check on introspection)", () => {
    // If the stack shape ever changes, `registeredRoutes()` would silently
    // return [] and every assertion above would pass vacuously.
    expect(routes.length).toBeGreaterThanOrEqual(14);
  });
});