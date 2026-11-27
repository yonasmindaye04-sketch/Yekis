import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpsActionModal } from "../src/pages/ops/components/ui";

const RECEIPTS_SRC = fs.readFileSync(
  path.resolve(__dirname, "../src/pages/ops/pages/Receipts.tsx"),
  "utf8",
);

describe("OPS-13: Receipts confirmation modal, reject validation, and EvidenceViewer lightbox", () => {
  it("opens an approval confirmation modal and disables Reject submit until minLength is met", () => {
    expect(RECEIPTS_SRC).toContain('setDialog({ kind: "APPROVED", row: r })');
    expect(RECEIPTS_SRC).toContain("Confirm Top-Up Approval & Credit");
    expect(RECEIPTS_SRC).toContain("disableSubmitUntilValid");
    expect(RECEIPTS_SRC).toContain("ui.openViewer(");
    expect(RECEIPTS_SRC).not.toContain("window.open(");
    expect(RECEIPTS_SRC).toContain("ui.refreshBadges()");

    const rejectInvalidHtml = renderToStaticMarkup(
      <OpsActionModal
        open={true}
        title="Reject Top-Up Transfer"
        confirmLabel="Reject Top-Up"
        tone="danger"
        disableSubmitUntilValid={true}
        fields={[
          {
            name: "reason",
            label: "Rejection Reason",
            initialValue: "no",
            required: true,
            minLength: 5,
          },
        ]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(rejectInvalidHtml).toContain('type="submit"');
    expect(rejectInvalidHtml).toContain("disabled");

    const rejectValidHtml = renderToStaticMarkup(
      <OpsActionModal
        open={true}
        title="Reject Top-Up Transfer"
        confirmLabel="Reject Top-Up"
        tone="danger"
        disableSubmitUntilValid={true}
        fields={[
          {
            name: "reason",
            label: "Rejection Reason",
            initialValue: "Receipt amount does not match bank statement",
            required: true,
            minLength: 5,
          },
        ]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(rejectValidHtml).not.toMatch(/type="submit"[^>]*disabled/);
  });
});
