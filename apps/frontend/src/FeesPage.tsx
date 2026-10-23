import { useState } from "react";
import {
  ShieldCheck,
  Calculator,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Award,
  Wallet,
  Scale,
  AlertTriangle,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import {
  FiscalDocumentSheet,
  type FiscalDocType,
} from "./components/FiscalDocumentModal";
import "./landing-v2.css";

type FeesPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

type PaymentRail = "TELEBIRR" | "CBE_BIRR" | "M_PESA";

const PRESET_AMOUNTS = [5000, 15000, 25000, 50000, 100000];

export function FeesPage({ onNavigate, onStart }: FeesPageProps) {
  const { t } = useI18n();

  const [amountEtb, setAmountEtb] = useState<number>(25000);
  const [rolePerspective, setRolePerspective] = useState<"client" | "freelancer">("freelancer");
  const [selectedRail, setSelectedRail] = useState<PaymentRail>("TELEBIRR");
  const [includeVat15, setIncludeVat15] = useState<boolean>(true);
  const [includeWithholding, setIncludeWithholding] = useState<boolean>(true);
  const [hasVerifiedTin, setHasVerifiedTin] = useState<boolean>(true);

  const safeAmount = Number.isFinite(amountEtb) && amountEtb > 0 ? amountEtb : 0;
  const clientFee = Math.round(safeAmount * 0.025);
  const freelancerFee = Math.round(safeAmount * 0.025);
  const vatAmount = includeVat15 ? Math.round(safeAmount * 0.15) : 0;
  const clientTotalDeposit = safeAmount + clientFee + vatAmount;

  const withholdingRate = includeWithholding && safeAmount >= 10000
    ? hasVerifiedTin
      ? 0.03
      : 0.30
    : 0;
  const withholdingTax = Math.round(safeAmount * withholdingRate);
  const freelancerNetPayout = Math.max(
    0,
    safeAmount + vatAmount - freelancerFee - withholdingTax,
  );

  const formatEtb = (val: number) => `${val.toLocaleString("en-US")} ETB`;

  const feeItems = [
    t.marketing.fees.feeItem1,
    t.marketing.fees.feeItem2,
    t.marketing.fees.feeItem3,
    t.marketing.fees.feeItem4,
    t.marketing.fees.feeItem5,
  ];

  const activeDocType: FiscalDocType =
    rolePerspective === "client" ? "CLIENT_INVOICE" : "FREELANCER_VOUCHER";

  return (
    <div className="yk-v2 yk-v2-subpage">
      <div className="v2-container">
        {/* Hero Section */}
        <header className="v2-sub-hero">
          <div className="v2-sub-hero-grid">
            <div>
              <h1 className="v2-sub-title">{t.marketing.fees.title}</h1>
              <p className="v2-sub-lead">{t.marketing.fees.subheadline}</p>
            </div>

            <div className="v2-sub-kpis">
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">97.5%</div>
                <div className="v2-sub-kpi-lbl">{t.marketing.fees.talentShare}</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">2.5% + 2.5%</div>
                <div className="v2-sub-kpi-lbl">{t.marketing.fees.clientFee} / {t.marketing.fees.freelancerFee}</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">0 ETB</div>
                <div className="v2-sub-kpi-lbl">Signup &amp; Job Posting Fee</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">&lt; 48h</div>
                <div className="v2-sub-kpi-lbl">Human Escrow Mediation SLA</div>
              </div>
            </div>
          </div>
        </header>

        {/* Interactive Calculator + Policy Breakdown */}
        <section className="v2-fees-grid" aria-label="Fee calculator and policy">
          {/* Left: Interactive ETB Milestone Calculator */}
          <div className="v2-calc-card">
            <div className="v2-calc-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="v2-policy-icon">
                  <Calculator size={16} />
                </span>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>
                    ETB Milestone &amp; Payout Calculator
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--v2-text2)", marginTop: 2 }}>
                    Simulate exact escrow deposits, platform split fees, and net payout
                  </p>
                </div>
              </div>

              <div className="v2-role-switch" role="group" aria-label="Perspective selector">
                <button
                  type="button"
                  className={`v2-role-btn ${rolePerspective === "freelancer" ? "is-active" : ""}`}
                  onClick={() => setRolePerspective("freelancer")}
                >
                  Freelancer View
                </button>
                <button
                  type="button"
                  className={`v2-role-btn ${rolePerspective === "client" ? "is-active" : ""}`}
                  onClick={() => setRolePerspective("client")}
                >
                  Client View
                </button>
              </div>
            </div>

            {/* Milestone Amount Input */}
            <div className="v2-calc-input-group">
              <div className="v2-calc-label-row">
                <label htmlFor="yekis-fee-amount" className="v2-calc-label">
                  Agreed Milestone Amount
                </label>
                <span style={{ fontSize: 12, color: "var(--v2-text2)" }}>
                  Drag slider or type exact ETB
                </span>
              </div>
              <div className="v2-calc-amount-box">
                <input
                  id="yekis-fee-amount"
                  type="number"
                  min={500}
                  max={1000000}
                  step={500}
                  value={amountEtb}
                  onChange={(e) => setAmountEtb(Math.max(0, Number(e.target.value)))}
                />
                <span className="v2-calc-currency">ETB</span>
              </div>
              <input
                type="range"
                className="v2-calc-slider"
                min={1000}
                max={200000}
                step={1000}
                value={Math.min(200000, Math.max(1000, safeAmount))}
                onChange={(e) => setAmountEtb(Number(e.target.value))}
                aria-label="Milestone amount slider in ETB"
              />
              <div className="v2-calc-presets">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`v2-calc-preset ${safeAmount === preset ? "is-active" : ""}`}
                    onClick={() => setAmountEtb(preset)}
                  >
                    {preset.toLocaleString("en-US")} ETB
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Rail Selector */}
            <div className="v2-calc-input-group">
              <div className="v2-calc-label-row">
                <span className="v2-calc-label">Settlement Payment Rail</span>
                <span style={{ fontSize: 12, color: "var(--v2-teal)", fontWeight: 600 }}>
                  Instant Wallet Release
                </span>
              </div>
              <div className="v2-filter-tabs">
                {(
                  [
                    { id: "TELEBIRR", label: "Telebirr" },
                    { id: "CBE_BIRR", label: "CBE Birr" },
                    { id: "M_PESA", label: "M-Pesa Ethiopia" },
                  ] as const
                ).map((rail) => (
                  <button
                    key={rail.id}
                    type="button"
                    className={`v2-filter-tab ${selectedRail === rail.id ? "is-active" : ""}`}
                    onClick={() => setSelectedRail(rail.id)}
                  >
                    <Wallet size={14} />
                    {rail.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional ERCA Withholding Tax & 15% VAT Estimator */}
            <div className="v2-calc-options">
              <button
                type="button"
                className={`v2-calc-toggle-card ${includeVat15 ? "is-active" : ""}`}
                onClick={() => setIncludeVat15((prev) => !prev)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)" }}>
                    15% Ethiopian VAT (ተ.እ.ታ)
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: includeVat15 ? "var(--v2-primary)" : "var(--v2-text2)",
                    }}
                  >
                    {includeVat15 ? "15% INCLUDED" : "EXEMPT"}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--v2-text2)" }}>
                  Standard ERCA commercial tax invoice for VAT-registered entities
                </span>
              </button>

              <button
                type="button"
                className={`v2-calc-toggle-card ${includeWithholding ? "is-active" : ""}`}
                onClick={() => setIncludeWithholding((prev) => !prev)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)" }}>
                    ERCA Withholding Tax
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: includeWithholding ? "var(--v2-primary)" : "var(--v2-text2)",
                    }}
                  >
                    {includeWithholding ? "ENABLED" : "OPTIONAL"}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--v2-text2)" }}>
                  Applies to Ethiopian business service contracts &ge; 10,000 ETB
                </span>
              </button>

              <button
                type="button"
                className={`v2-calc-toggle-card ${includeWithholding && hasVerifiedTin ? "is-active" : ""}`}
                onClick={() => {
                  setIncludeWithholding(true);
                  setHasVerifiedTin((prev) => !prev);
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)" }}>
                    TIN Verification Status
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: hasVerifiedTin ? "var(--v2-primary)" : "#eab308",
                    }}
                  >
                    {hasVerifiedTin ? "3% (TIN VERIFIED)" : "30% (UNVERIFIED)"}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--v2-text2)" }}>
                  {hasVerifiedTin
                    ? "Verified TIN + license reduces withholding to 3%"
                    : "Unverified TIN incurs 30% statutory withholding"}
                </span>
              </button>
            </div>

            {/* Live Receipt Breakdown */}
            <div className="v2-calc-receipt" aria-live="polite">
              <div className="v2-calc-row">
                <span>Agreed Milestone Scope</span>
                <strong>{formatEtb(safeAmount)}</strong>
              </div>
              <div className="v2-calc-row">
                <span>Client Escrow Fee (+2.5%)</span>
                <strong>+{formatEtb(clientFee)}</strong>
              </div>
              {includeVat15 && (
                <div className="v2-calc-row">
                  <span>Ethiopian VAT (+15% ተ.እ.ታ)</span>
                  <strong>+{formatEtb(vatAmount)}</strong>
                </div>
              )}
              <div className="v2-calc-row">
                <span>Total Client Escrow Deposit</span>
                <strong>{formatEtb(clientTotalDeposit)}</strong>
              </div>
              <div className="v2-calc-row">
                <span>Freelancer Service Fee (-2.5%)</span>
                <strong>-{formatEtb(freelancerFee)}</strong>
              </div>
              {includeWithholding && (
                <div className="v2-calc-row">
                  <span>
                    ERCA Withholding Tax (
                    {safeAmount >= 10000
                      ? hasVerifiedTin
                        ? "3% Verified TIN"
                        : "30% Unverified"
                      : "0% under 10k ETB"}
                    )
                  </span>
                  <strong>-{formatEtb(withholdingTax)}</strong>
                </div>
              )}
              <div className="v2-calc-row is-total">
                <span>
                  {rolePerspective === "client"
                    ? `Total Client Deposit (${selectedRail.replace("_", " ")})`
                    : `Net Freelancer Take-Home (${selectedRail.replace("_", " ")})`}
                </span>
                <strong>
                  {rolePerspective === "client"
                    ? formatEtb(clientTotalDeposit)
                    : formatEtb(freelancerNetPayout)}
                </strong>
              </div>
            </div>
          </div>

          {/* Right: Official Fee Policy & Visual Split */}
          <div className="v2-policy-card">
            <h2 style={{ fontSize: 26, fontWeight: 800 }}>
              {t.marketing.fees.panelTitle}
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--v2-text2)", marginTop: 8, lineHeight: 1.6 }}>
              {t.marketing.fees.note}
            </p>

            {/* Visual Split Bar */}
            <div className="v2-split-meter">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: "var(--v2-primary)" }}>
                  97.5% Freelancer Take-Home
                </span>
                <span style={{ color: "#eab308" }}>
                  2.5% + 2.5% Escrow Split
                </span>
              </div>
              <div className="v2-split-bar" role="img" aria-label="97.5% freelancer take-home vs 2.5% fee">
                <div className="v2-split-seg-keep" />
                <div className="v2-split-seg-fee" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--v2-text2)" }}>
                <span>{t.marketing.fees.clientFee}</span>
                <span>{t.marketing.fees.freelancerFee}</span>
                <span>{t.marketing.fees.talentShare}</span>
              </div>
            </div>

            {/* 5 Core Policy Items from i18n */}
            <ul className="v2-policy-list">
              {feeItems.map((item, idx) => (
                <li key={idx} className="v2-policy-item">
                  <span className="v2-policy-icon" aria-hidden="true">
                    <CheckCircle2 size={16} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              <button
                type="button"
                className="v2-btn v2-btn-primary"
                onClick={() => onStart("register")}
              >
                <span>{t.nav.getStarted}</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="v2-btn"
                style={{
                  borderColor: "var(--v2-border2)",
                  background: "var(--v2-surface)",
                  color: "var(--v2-text)",
                }}
                onClick={() => onNavigate("faq")}
              >
                <HelpCircle size={16} />
                <span>{t.marketing.fees.readFaq}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Live Bilingual Client Invoice & Freelancer Payout Receipt Preview */}
        <section
          style={{ marginBottom: 72 }}
          aria-labelledby="fees-invoice-preview-heading"
        >
          <div className="v2-center" style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--v2-primary)",
                marginBottom: 8,
              }}
            >
              <FileText size={16} />
              <span>OFFICIAL ERCA &amp; AACCSA FISCAL DOCUMENTS · የክፍያ እና የታክስ ደረሰኞች</span>
            </div>
            <h2 className="v2-sec-title" id="fees-invoice-preview-heading">
              Client Invoice &amp; Freelancer Payout Receipt Preview
            </h2>
            <p className="v2-sec-sub">
              Every funded milestone and released payout generates a bilingual (English / አማርኛ) fiscal document with TIN, 15% VAT, and 3%/30% Withholding Tax breakdown—ready to print or save as PDF.
            </p>
          </div>

          <FiscalDocumentSheet
            mode="embedded"
            interactiveControls={true}
            data={{
              docType: activeDocType,
              principalEtb: safeAmount,
              rail: selectedRail,
              includeVat15,
              includeWithholding: includeWithholding && safeAmount >= 10000,
              hasVerifiedTin,
              clientFeeRate: 0.025,
              freelancerFeeRate: 0.025,
            }}
            onChangeDocType={(next) =>
              setRolePerspective(next === "CLIENT_INVOICE" ? "client" : "freelancer")
            }
            onToggleVat={setIncludeVat15}
            onToggleWithholding={setIncludeWithholding}
            onToggleVerifiedTin={setHasVerifiedTin}
          />
        </section>

        {/* 3-Column Comparison Matrix */}
        <section style={{ marginBottom: 72 }} aria-labelledby="fees-compare-heading">
          <div className="v2-center" style={{ marginBottom: 36 }}>
            <h2 className="v2-sec-title" id="fees-compare-heading">
              {t.marketing.fees.compareTitle}
            </h2>
            <p className="v2-sec-sub">
              Compare how Yekis milestone escrow protects both sides against informal bank transfers or expensive legal retainers.
            </p>
          </div>

          <div className="v2-compare-grid">
            {/* Column 1: Yekis (Featured) */}
            <article className="v2-compare-card is-featured">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={26} color="var(--v2-primary)" />
                <h3 style={{ fontSize: 22, fontWeight: 800 }}>{t.marketing.fees.yekisCol}</h3>
              </div>
              <div className="v2-compare-rows">
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">{t.marketing.fees.row1Feature}</div>
                  <div className="v2-compare-row-val" style={{ color: "var(--v2-primary)" }}>
                    {t.marketing.fees.row1Yekis}
                  </div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">{t.marketing.fees.row2Feature}</div>
                  <div className="v2-compare-row-val" style={{ color: "var(--v2-primary)" }}>
                    {t.marketing.fees.row2Yekis}
                  </div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">Identity &amp; Tax Compliance</div>
                  <div className="v2-compare-row-val">
                    Fayda ID &amp; TIN verification built-in with automated receipts
                  </div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">Local Payout Speed</div>
                  <div className="v2-compare-row-val">
                    Instant wallet credit on milestone approval via Telebirr &amp; CBE Birr
                  </div>
                </div>
              </div>
            </article>

            {/* Column 2: Informal Trust */}
            <article className="v2-compare-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={24} color="#eab308" />
                <h3 style={{ fontSize: 22, fontWeight: 800 }}>{t.marketing.fees.informalCol}</h3>
              </div>
              <div className="v2-compare-rows">
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">{t.marketing.fees.row1Feature}</div>
                  <div className="v2-compare-row-val">{t.marketing.fees.row1Informal}</div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">{t.marketing.fees.row2Feature}</div>
                  <div className="v2-compare-row-val">{t.marketing.fees.row2Informal}</div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">Identity &amp; Tax Compliance</div>
                  <div className="v2-compare-row-val" style={{ color: "var(--v2-text2)" }}>
                    Unverified Telegram/phone transfers with no audit trail
                  </div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">Local Payout Speed</div>
                  <div className="v2-compare-row-val" style={{ color: "var(--v2-text2)" }}>
                    Weeks of invoice chasing after final files are delivered
                  </div>
                </div>
              </div>
            </article>

            {/* Column 3: Hiring a Lawyer */}
            <article className="v2-compare-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Scale size={24} color="var(--v2-text2)" />
                <h3 style={{ fontSize: 22, fontWeight: 800 }}>{t.marketing.fees.lawyerCol}</h3>
              </div>
              <div className="v2-compare-rows">
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">{t.marketing.fees.row1Feature}</div>
                  <div className="v2-compare-row-val">{t.marketing.fees.row1Lawyer}</div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">{t.marketing.fees.row2Feature}</div>
                  <div className="v2-compare-row-val">{t.marketing.fees.row2Lawyer}</div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">Identity &amp; Tax Compliance</div>
                  <div className="v2-compare-row-val" style={{ color: "var(--v2-text2)" }}>
                    Manual paper contracts &amp; separate accounting filings
                  </div>
                </div>
                <div className="v2-compare-row">
                  <div className="v2-compare-row-label">Local Payout Speed</div>
                  <div className="v2-compare-row-val" style={{ color: "var(--v2-text2)" }}>
                    No automated milestone holding or instant release
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Bottom CTA Spotlight */}
        <section className="v2-outro-cta" style={{ borderRadius: 28, minHeight: 340 }}>
          <span className="v2-outro-ambient" aria-hidden />
          <div className="v2-outro-cta-inner" style={{ paddingTop: 44, paddingBottom: 44 }}>
            <h2>{t.marketing.cta.title}</h2>
            <p>{t.marketing.cta.subtitle}</p>
            <div className="v2-outro-actions">
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-primary"
                onClick={() => onStart("register")}
              >
                <span className="v2-outro-shine" aria-hidden />
                <Briefcase />
                <span>{t.marketing.cta.postJob}</span>
              </button>
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-ghost"
                onClick={() => onStart("register")}
              >
                <Award />
                <span>{t.marketing.cta.findWork}</span>
              </button>
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-ghost"
                onClick={() => {
                  if (!openSupportChat()) onNavigate("faq");
                }}
              >
                <HelpCircle />
                <span>Ask Billing Support</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
