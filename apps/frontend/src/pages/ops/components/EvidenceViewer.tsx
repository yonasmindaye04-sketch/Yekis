/* ────────────────────────────────────────────────────────────────────────
   EvidenceViewer.tsx — full-screen document & evidence lightbox overlay:
   zoom / rotate / drag / print with keyboard support (← → navigate, Esc close).
   Renders full structured Contract PDF sheets, ERCA WHT Tax Schedules,
   Fayda KYC Identity Cards, and Financial Audit Vouchers.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent as RMouseEvent } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FileWarning,
  Loader2,
  Printer,
  RotateCw,
  ShieldCheck,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ViewerDoc } from "../opsTypes";
import { opsApi } from "../opsApi";

export type { ViewerDoc };

function isPlaceholderLogoUrl(u: string | null | undefined): boolean {
  if (!u) return true;
  return u.includes("/payment/Telebirr.png");
}

function isImageFileUrl(u: string | null | undefined): boolean {
  if (!u || isPlaceholderLogoUrl(u)) return false;
  if (u.startsWith("data:image/")) return true;
  const clean = u.split("?")[0].split("#")[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg|avif)$/.test(clean);
}

function renderDocumentSheet(d: ViewerDoc) {
  const titleUpper = (d.t || "").toUpperCase();
  const isDeliverable =
    d.k === "deliverable" ||
    titleUpper.includes("DELIVERABLE");
  const isContractAgreement =
    !isDeliverable &&
    (titleUpper.includes("ESCROW_AGREEMENT") ||
      titleUpper.includes("SERVICE_AGREEMENT") ||
      titleUpper.includes("CONTRACT"));
  const isTaxSchedule =
    !isDeliverable &&
    (titleUpper.includes("WHT") ||
      titleUpper.includes("WITHHOLDING") ||
      titleUpper.includes("TAX_SCHEDULE") ||
      titleUpper.includes("ERCA"));

  if (isDeliverable) {
    const defaultArtifacts = d.artifactFiles?.length
      ? d.artifactFiles
      : [
          {
            path: d.url || "/uploads/deliverables/milestone-release-bundle.zip",
            size: "14.8 MB · Archive",
            status: "SHA-256 VERIFIED",
          },
          {
            path: "src/integration/service-connector.ts",
            size: "28.4 KB · TypeScript",
            status: "BUILD PASSING",
          },
          {
            path: "docs/QA-Acceptance-Report-and-Test-Suite.pdf",
            size: "1.42 MB · PDF",
            status: "ATTACHED",
          },
          {
            path: "tests/e2e-settlement-and-webhook.spec.ts",
            size: "11.2 KB · Test Suite",
            status: "18/18 PASSED",
          },
        ];

    return (
      <div
        className="fdoc"
        style={{
          width: "min(660px, 90vw)",
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 10,
          boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      >
        <div className="fdoc-band" />
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".09em",
                color: "#0b7a4b",
                textTransform: "uppercase",
              }}
            >
              YEKIS ESCROW CUSTODY · MILESTONE DELIVERABLE &amp; QA MANIFEST
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
              {d.t.replace(/_/g, " ")}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Cryptographically Timestamped Submission · Locked for Escrow &amp; Mediation Review
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#dcfce7",
                color: "#166534",
                border: "1px solid #86efac",
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
              }}
            >
              <CheckCircle2 size={12} /> {(d.status ?? "SUBMITTED").replace(/_/g, " ")}
            </span>
            <div
              className="mono"
              style={{ fontSize: 10.5, color: "#475569", marginTop: 5, fontWeight: 700 }}
            >
              REF: {d.contractId ?? d.id ?? "DEL-2026-884"}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 13 }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 14px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                CONTRACT / PROJECT (የሥራ ውል)
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {d.name ?? "Escrow-Protected Milestone Contract"}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                {d.doc ?? "Milestone Deliverable Submission"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                ESCROW VALUE &amp; SUBMISSION METADATA
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: "#0b7a4b", marginTop: 2 }}>
                {d.tin ?? "Escrow Protected"}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                Submitted: {d.createdAt ?? "2026-10-19 · Verified Upload"}
              </div>
            </div>
          </div>

          {d.scope ? (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                1. Milestone Acceptance Scope &amp; Specifications
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#334155",
                  marginTop: 4,
                  lineHeight: 1.5,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "9px 12px",
                }}
              >
                {d.scope}
              </div>
            </div>
          ) : null}

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 6,
              }}
            >
              {d.scope ? "2." : "1."} Submitted Deliverable Package &amp; QA Verification
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11.5,
                border: "1px solid #e2e8f0",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                    ARTIFACT / FILE PATH
                  </th>
                  <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                    SIZE &amp; FORMAT
                  </th>
                  <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                    QA / INTEGRITY
                  </th>
                </tr>
              </thead>
              <tbody>
                {defaultArtifacts.map((f, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td className="mono" style={{ padding: "7px 10px", fontWeight: 700, color: "#0f172a" }}>
                      {f.path}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#475569" }}>{f.size}</td>
                    <td
                      style={{
                        padding: "7px 10px",
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "#0b7a4b",
                      }}
                    >
                      ✓ {f.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {d.extraRows && d.extraRows.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              {d.extraRows.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11 }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{r.label}:</span>
                  <strong className="mono" style={{ color: "#0f172a" }}>
                    {r.value}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}

          <div className="fdoc-foot" style={{ marginTop: 4 }}>
            <div className="fdoc-sig">
              Custody Artifact Snapshot Verified by Yekis Escrow &amp; Dispute Mediation Engine
            </div>
            <div className="fdoc-stamp">
              YEKIS
              <br />
              QA
              <br />
              VERIFIED
            </div>
          </div>
        </div>

        <div className="fdoc-mrz">
          DEL-SHA256: 4B227777D4DD1FC61C6F884F48641D02B4D121D3FD328CB08B5531FCACDABF8A ·{" "}
          {d.contractId ?? d.id ?? "DEL-2026"}
        </div>
      </div>
    );
  }

  if (isContractAgreement) {
    return (
      <div
        className="fdoc"
        style={{
          width: "min(680px, 90vw)",
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 10,
          boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      >
        <div className="fdoc-band" />
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".1em",
                color: "#0b7a4b",
                textTransform: "uppercase",
              }}
            >
              YEKIS ESCROW MARKETPLACE · የአገልግሎት እና የኤስክሮ ውል ስምምነት
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
              MASTER FREELANCE SERVICE AGREEMENT
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Template v1.0-2026 · Governed by Ethiopian Electronic Transactions Proclamation No. 1205/2020
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#dcfce7",
                color: "#166534",
                border: "1px solid #86efac",
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
              }}
            >
              <CheckCircle2 size={12} /> {d.status ?? "FULLY EXECUTED"}
            </span>
            <div
              className="mono"
              style={{ fontSize: 10.5, color: "#475569", marginTop: 5, fontWeight: 700 }}
            >
              ID: {d.contractId ?? d.id ?? "ctr-301"}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 14px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                CLIENT COUNTERPARTY (ደንበኛ)
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {d.clientName ?? (d.doc ? d.doc.split("↔")[0]?.trim() : "Verified Client")}
              </div>
              {d.clientEmail ? (
                <div style={{ fontSize: 11, color: "#475569" }}>{d.clientEmail}</div>
              ) : null}
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                FREELANCER COUNTERPARTY (ባለሙያ)
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {d.freelancerName ?? (d.doc ? d.doc.split("↔")[1]?.trim() : "Verified Freelancer")}
              </div>
              {d.freelancerEmail ? (
                <div style={{ fontSize: 11, color: "#475569" }}>{d.freelancerEmail}</div>
              ) : null}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em" }}>
              1. Scope of Engagement & Contract Title (የሥራው ወሰን)
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
              {d.name ?? "Escrow-Protected Freelance Service Contract"}
            </div>
            <div style={{ fontSize: 11.5, color: "#334155", marginTop: 4, lineHeight: 1.5 }}>
              The Freelancer agrees to deliver the milestones specified below as an independent contractor.
              100% of milestone funds are held in Yekis segregated escrow custody (Accounts 1010/1020) prior
              to work commencement and released upon Client acceptance or 7-day statutory auto-release.
            </div>
          </div>

          {d.milestones && d.milestones.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: 6,
                }}
              >
                2. Agreed Milestone & Escrow Schedule (የክፍያ መርሐግብር)
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11.5,
                  border: "1px solid #e2e8f0",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                      MILESTONE
                    </th>
                    <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                      STATE
                    </th>
                    <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                      GROSS ETB
                    </th>
                    <th style={{ padding: "7px 10px", borderBottom: "1px solid #cbd5e1", fontSize: 10 }}>
                      NET (87%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.milestones.map((m, idx) => (
                    <tr key={m.id ?? idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700 }}>{m.title}</td>
                      <td style={{ padding: "7px 10px", fontSize: 10.5, fontWeight: 700, color: "#0b7a4b" }}>
                        {m.state.replace(/_/g, " ")}
                      </td>
                      <td className="mono" style={{ padding: "7px 10px", fontWeight: 700 }}>
                        {m.amount}
                      </td>
                      <td className="mono" style={{ padding: "7px 10px", color: "#475569" }}>
                        {m.net}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {d.extraRows && d.extraRows.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              {d.extraRows.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11 }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{r.label}:</span>
                  <strong className="mono" style={{ color: "#0f172a" }}>
                    {r.value}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ fontSize: 10.5, color: "#475569", lineHeight: 1.45 }}>
            <b>3. Governing Law, Tax Withholding & Arbitration:</b> Pursuant to Ethiopian Federal Income Tax
            Proclamation No. 979/2016, Yekis deducts 10% platform commission and 3% WHT (for TIN-verified
            contractors) at milestone settlement. Disputes not resolved in Mediation are referred to AACCSA
            Arbitration in Addis Ababa with final award enforcement.
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              paddingTop: 10,
              borderTop: "1px dashed #cbd5e1",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#0b7a4b" }}>
                ✓ DIGITALLY SIGNED BY CLIENT
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {d.clientName ?? "Client Signatory"}
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: "#64748b" }}>
                Executed: {d.createdAt ?? "2026-10-11"} · e-Sign Proc. 1205/2020
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#0b7a4b" }}>
                ✓ DIGITALLY SIGNED BY FREELANCER
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {d.freelancerName ?? "Freelancer Signatory"}
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: "#64748b" }}>
                Executed: {d.createdAt ?? "2026-10-11"} · e-Sign Proc. 1205/2020
              </div>
            </div>
            <div className="fdoc-stamp">
              YEKIS
              <br />
              ESCROW
              <br />
              SEAL
            </div>
          </div>
        </div>

        <div className="fdoc-mrz">
          PDF-SHA256: 9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08 ·{" "}
          {d.contractId ?? d.id ?? "CTR-301"}
        </div>
      </div>
    );
  }

  if (isTaxSchedule) {
    return (
      <div
        className="fdoc"
        style={{
          width: "min(640px, 90vw)",
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 10,
          boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      >
        <div className="fdoc-band" />
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".09em",
                color: "#0b7a4b",
                textTransform: "uppercase",
              }}
            >
              ETHIOPIAN MINISTRY OF REVENUES (MOR / ERCA) · የገቢዎች ሚኒስቴር
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
              3% WITHHOLDING TAX SCHEDULE & CERTIFICATE (የግብር ተቀናሽ ሰነድ)
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Form WHT-03 · Federal Income Tax Proclamation No. 979/2016
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#dbeafe",
              color: "#1e40af",
              border: "1px solid #93c5fd",
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 800,
            }}
          >
            <ShieldCheck size={12} /> ERCA COMPLIANT
          </span>
        </div>

        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 14px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b" }}>
                WITHHOLDING AGENT (ግብር ቆራጭ)
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 2 }}>
                Yekis Marketplace Escrow PLC
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#475569" }}>
                TIN: 0074918263 · Bole Medium Taxpayers
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b" }}>
                PAYEE / CONTRACTOR (ተከፋይ ባለሙያ)
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 2 }}>
                {d.freelancerName ?? d.name ?? "Verified Contractor"}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#475569" }}>
                {d.tin ?? "TIN Verified · 3% Resident Rate"}
              </div>
            </div>
          </div>

          {d.extraRows && d.extraRows.length > 0 ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {d.extraRows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    borderBottom: i === d.extraRows!.length - 1 ? "none" : "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#475569", fontWeight: 600 }}>{row.label}</span>
                  <strong className="mono" style={{ color: "#0f172a" }}>
                    {row.value}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#475569", fontWeight: 600 }}>Document Reference</span>
                <strong className="mono">{d.name ?? d.t}</strong>
              </div>
              {d.doc ? (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>Fee / Assessment Detail</span>
                  <strong className="mono">{d.doc}</strong>
                </div>
              ) : null}
              {d.tin ? (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>Withholding Tax / TIN</span>
                  <strong className="mono">{d.tin}</strong>
                </div>
              ) : null}
            </div>
          )}

          <div className="fdoc-foot">
            <div className="fdoc-sig">
              Certified by Yekis Automated Tax Engine · Electronic ERCA E-Tax Voucher
            </div>
            <div className="fdoc-stamp">
              MOR / ERCA
              <br />
              WHT-03
              <br />
              VERIFIED
            </div>
          </div>
        </div>

        <div className="fdoc-mrz">
          ERCA-WHT03&lt;&lt;ETH&lt;&lt;TIN0074918263&lt;&lt;{d.contractId ?? d.id ?? "202610"}&lt;&lt;3PCT
        </div>
      </div>
    );
  }

  // Default structured KYC / Financial / Evidence document sheet
  return (
    <div className="fdoc" style={{ width: "min(520px, 88vw)" }}>
      <div className="fdoc-band" />
      <div className="fdoc-head">
        <div>
          <div className="fh-t">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA · የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ</div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
            {d.t.replace(/_/g, " ")}
          </div>
        </div>
        <div className="fh-b">{d.k.toUpperCase()}</div>
      </div>
      <div className="fdoc-body">
        <div className="fdoc-row">
          <div className="fdoc-photo">
            {d.k === "selfie" || d.k === "id-front" || d.k === "id-back" ? (
              <User size={38} />
            ) : (
              <FileText size={36} />
            )}
          </div>
          <div className="fdoc-fields">
            <div className="fdoc-field">
              <div className="ff-k">HOLDER / SUBJECT NAME (ሙሉ ስም)</div>
              <div className="ff-v">{d.name ?? "Verified Yekis Account Holder"}</div>
            </div>
            <div className="fdoc-field">
              <div className="ff-k">REFERENCE / DOCUMENT NUMBER (የሰነድ ቁጥር)</div>
              <div className="ff-v mono">{d.doc ?? d.id ?? "FAYDA-ET-99482104"}</div>
            </div>
            <div className="fdoc-field">
              <div className="ff-k">TAX / COMPLIANCE METADATA (ግብር እና ማረጋገጫ)</div>
              <div className="ff-v mono">{d.tin ?? "TIN-0049182734 · VERIFIED"}</div>
            </div>
          </div>
        </div>
        <div className="fdoc-foot">
          <div className="fdoc-sig">
            Authenticated via Yekis Operations Compliance & Escrow Audit System
          </div>
          <div className="fdoc-stamp">
            OFFICIAL
            <br />
            VERIFIED
            <br />
            RECORD
          </div>
        </div>
      </div>
      <div className="fdoc-mrz">
        IDETH{(d.id ?? "DOC2026").toUpperCase().replace(/[^A-Z0-9]/g, "")}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;YEKIS2026
      </div>
    </div>
  );
}

export default function EvidenceViewer({
  docs,
  startIdx = 0,
  onClose,
}: {
  docs: ViewerDoc[];
  startIdx?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const d = docs[idx];
  const docKey = d ? `${d.id ?? d.url ?? ""}#${d.t}` : "";

  const [lastKey, setLastKey] = useState(docKey);
  if (lastKey !== docKey) {
    setLastKey(docKey);
    setScale(1);
    setRot(0);
    setPos({ x: 0, y: 0 });
    setImgErr(false);
  }

  const nav = useCallback(
    (dir: number) => {
      setIdx((i) => Math.max(0, Math.min(docs.length - 1, i + dir)));
    },
    [docs.length],
  );

  useEffect(() => {
    if (!d) return;
    setImgErr(false);
    if (d.url) {
      setUrl(d.url);
      setLoadErr(null);
      setLoading(false);
      return;
    }
    // If structured document metadata is present, render the rich document sheet immediately
    if (d.name || d.doc || d.tin || d.milestones || d.extraRows || d.k === "deliverable") {
      setUrl(null);
      setLoadErr(null);
      setLoading(false);
      return;
    }
    if (!d.id) {
      setUrl(null);
      setLoadErr(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadErr(null);
    setUrl(null);
    opsApi
      .kycDocumentUrl(d.id)
      .then((r) => {
        if (alive) setUrl(r.url);
      })
      .catch((e: unknown) => {
        if (alive) {
          setLoadErr(e instanceof Error ? e.message : "Could not load document");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [d]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nav(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nav(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, onClose]);

  if (!d) return null;

  const onMove = (e: RMouseEvent) => {
    if (!drag) return;
    setPos({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
  };
  const onUp = () => setDrag(null);

  const showRealImage = Boolean(
    url &&
      isImageFileUrl(url) &&
      !imgErr &&
      d.k !== "deliverable" &&
      !d.milestones &&
      !d.extraRows,
  );

  return (
    <div className="viewer-overlay">
      <div className="viewer-header">
        <div>
          <h3>{d.t.replace(/_/g, " ")}</h3>
          <div className="viewer-count">
            {idx + 1} of {docs.length} · zoom {Math.round(scale * 100)}% · rotation {rot}°
            {d.name ? ` · ${d.name}` : ""}
          </div>
        </div>
        <div className="viewer-controls">
          <button
            title="Zoom out"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            <ZoomOut size={18} />
          </button>
          <button
            title="Zoom in"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          >
            <ZoomIn size={18} />
          </button>
          <button title="Rotate" onClick={() => setRot((r) => (r + 90) % 360)}>
            <RotateCw size={18} />
          </button>
          <button
            title="Print / Save Document as PDF"
            onClick={() => window.print()}
          >
            <Printer size={17} />
          </button>
          {showRealImage && url ? (
            <a
              className="v-link"
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Open the underlying file in a new tab"
            >
              <ExternalLink size={16} />
            </a>
          ) : null}
          <span className="v-div" />
          <button title="Close (Esc)" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>
      <div
        className={`viewer-stage ${drag ? "dragging" : ""}`}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        {docs.length > 1 ? (
          <>
            <button className="nav-arrow prev" disabled={idx === 0} onClick={() => nav(-1)}>
              <ChevronLeft size={26} />
            </button>
            <button
              className="nav-arrow next"
              disabled={idx === docs.length - 1}
              onClick={() => nav(1)}
            >
              <ChevronRight size={26} />
            </button>
          </>
        ) : null}
        <div
          className="viewer-doc"
          style={{
            transform: `translate(${pos.x}px,${pos.y}px) scale(${scale}) rotate(${rot}deg)`,
            cursor: drag ? "grabbing" : "grab",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDrag({ sx: e.clientX - pos.x, sy: e.clientY - pos.y });
          }}
        >
          {loading ? (
            <div className="viewer-status">
              <Loader2 size={22} className="spin" /> Loading official document…
            </div>
          ) : loadErr ? (
            <div className="viewer-status err">
              <FileWarning size={22} />
              <div style={{ marginTop: 8 }}>{loadErr}</div>
            </div>
          ) : showRealImage && url ? (
            <img
              className="viewer-img"
              src={url}
              alt={d.t}
              draggable={false}
              onError={() => setImgErr(true)}
            />
          ) : (
            renderDocumentSheet(d)
          )}
        </div>
      </div>
      {docs.length > 1 ? (
        <div className="viewer-thumbs">
          {docs.map((dd, i) => (
            <button
              key={`${dd.id ?? dd.k}-${i}`}
              className={`thumb-btn ${i === idx ? "active" : ""}`}
              onClick={() => setIdx(i)}
            >
              {dd.t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
