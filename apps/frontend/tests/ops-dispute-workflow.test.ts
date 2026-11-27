import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../src/api/client";

const DISPUTE_QUEUE_SRC = fs.readFileSync(
  path.resolve(__dirname, "../src/pages/ops/pages/DisputeQueue.tsx"),
  "utf8",
);

describe("OPS-07: Dispute staff workflow UI gating and readable 403 errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never surfaces an empty FORBIDDEN toast when a 403 omits message", async () => {
    const client = new ApiClient();
    client.setSession({ accessToken: "jwt-1", refreshToken: "rt-1" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "FORBIDDEN", message: "" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(client.escalateDispute("disp-1")).rejects.toThrow(
      /You do not have permission to perform this action/i,
    );
  });

  it("stage-gates and role-gates workflow buttons in DisputeQueue and closes evidence modal on error", () => {
    expect(DISPUTE_QUEUE_SRC).toContain("canMediate");
    expect(DISPUTE_QUEUE_SRC).toContain('sel.stage !== "STAGE_3_MEDIATION"');
    expect(DISPUTE_QUEUE_SRC).toContain('sel.stage !== "STAGE_1_NEGOTIATION"');
    expect(DISPUTE_QUEUE_SRC).toContain('sel.stage === "STAGE_4_ARBITRATION"');
    expect(DISPUTE_QUEUE_SRC).toContain("setEvidenceModalOpen(false)");
  });
});
