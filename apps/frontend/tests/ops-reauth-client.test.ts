import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../src/api/client";

describe("OPS-08: ApiClient handles 401 REAUTH_REQUIRED without signing user out", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes reauthHandler, preserves session, and retries request once on success", async () => {
    const client = new ApiClient();
    client.setSession({ accessToken: "stale-jwt", refreshToken: "refresh-jwt" });

    const unauthorizedSpy = vi.fn();
    client.onUnauthorized(unauthorizedSpy);

    const reauthSpy = vi.fn(async () => {
      client.setSession({ accessToken: "fresh-jwt", refreshToken: "fresh-refresh" });
      return true;
    });
    client.setReauthHandler(reauthSpy);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "REAUTH_REQUIRED", code: "REAUTH_REQUIRED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "hold-1", active: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const res = await client.adminHoldEscrow("ms-1", "Fraud investigation");
    expect(res).toEqual({ id: "hold-1", active: true });
    expect(reauthSpy).toHaveBeenCalledTimes(1);
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect((fetchSpy.mock.calls[1]?.[1]?.headers as Record<string, string>)?.Authorization).toBe(
      "Bearer fresh-jwt",
    );
  });

  it("keeps tokens intact and surfaces cancellation error when user cancels re-auth prompt", async () => {
    const client = new ApiClient();
    client.setSession({ accessToken: "stale-jwt", refreshToken: "refresh-jwt" });

    const unauthorizedSpy = vi.fn();
    client.onUnauthorized(unauthorizedSpy);
    client.setReauthHandler(async () => false);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "REAUTH_REQUIRED", code: "REAUTH_REQUIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      client.adminHoldEscrow("ms-1", "Fraud investigation"),
    ).rejects.toThrow(/cancelled|expired/i);
    expect(unauthorizedSpy).not.toHaveBeenCalled();
  });

  it("opens only one reauth dialog when several simultaneous requests return 401 REAUTH_REQUIRED and keeps form state", async () => {
    const client = new ApiClient();
    client.setSession({ accessToken: "stale-jwt", refreshToken: "refresh-jwt" });

    const unauthorizedSpy = vi.fn();
    client.onUnauthorized(unauthorizedSpy);

    // Simulated React form input in progress
    const formState = { reason: "Repeated abusive spam reports from this account" };

    let reauthCalls = 0;
    client.setReauthHandler(async () => {
      reauthCalls += 1;
      await new Promise((r) => setTimeout(r, 15));
      client.setSession({ accessToken: "fresh-jwt", refreshToken: "fresh-refresh" });
      return true;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      if (auth === "Bearer stale-jwt") {
        return new Response(
          JSON.stringify({ error: "REAUTH_REQUIRED", code: "REAUTH_REQUIRED" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true, id: "done" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const results = await Promise.all([
      client.adminHoldEscrow("ms-1", formState.reason),
      client.adminHoldEscrow("ms-2", formState.reason),
      client.adminHoldEscrow("ms-3", formState.reason),
    ]);

    expect(results).toHaveLength(3);
    expect(reauthCalls).toBe(1);
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    expect(formState.reason).toBe("Repeated abusive spam reports from this account");
  });
});
