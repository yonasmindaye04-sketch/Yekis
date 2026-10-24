import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import { FiscalDocumentSheet, type FiscalDocType } from "./components/FiscalDocumentModal";
import {
  AnimatedCountUpStrip,
  ScrollIlluminatedHeadline,
  ScrollParallaxDiptych,
  StickyScrollServicesStage,
  type StickyStackItem,
} from "./components/StudioScrollMotion";

interface FeesPageProps {
  onNavigate?: (view: "landing" | "about" | "faq" | "fees" | "casestudies") => void;
  onStart?: (mode: "login" | "register") => void;
}

type PaymentRailId = "telebirr" | "cbebirr" | "mpesa" | "erca";

interface RailServiceItem {
  id: PaymentRailId;
  label: { en: string; am: string };
  topChip: string;
  badge: string;
  rows: { label: string; badge: string }[];
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PRESET_AMOUNTS = [15000, 50000, 120000, 350000];

const RAIL_SERVICES: RailServiceItem[] = [
  {
    id: "telebirr",
    label: { en: "Telebirr", am: "ቴሌብር" },
    topChip: "ETHIO TELECOM RAIL",
    badge: "0 ETB PAYOUT FEE",
    rows: [
      { label: "ESCROW DEPOSIT", badge: "INSTANT" },
      { label: "WALLET PAYOUT", badge: "< 45 SEC" },
      { label: "RAIL SURCHARGE", badge: "0.0% ETB" },
    ],
  },
  {
    id: "cbebirr",
    label: { en: "CBE Birr", am: "ሲቢኢ ብር" },
    topChip: "COMMERCIAL BANK ET",
    badge: "UP TO 5M ETB",
    rows: [
      { label: "CBE BIRR WALLET", badge: "< 90 SEC" },
      { label: "BANK RTGS LIMIT", badge: "5,000,000 ETB" },
      { label: "ESCROW FEE", badge: "2.5% FLAT" },
    ],
  },
  {
    id: "mpesa",
    label: { en: "M-Pesa ET", am: "ኤም-ፔሳ" },
    topChip: "SAFARICOM · AWASH",
    badge: "MULTI-RAIL",
    rows: [
      { label: "M-PESA (07)", badge: "< 60 SEC" },
      { label: "AWASH / ABYSSINIA", badge: "< 3 MIN" },
      { label: "FX CONVERSION LOSS", badge: "0.00 ETB" },
    ],
  },
  {
    id: "erca",
    label: { en: "ERCA Tax", am: "የገቢዎች ታክስ" },
    topChip: "FISCAL LEDGER",
    badge: "FREE PDF & CSV",
    rows: [
      { label: "15% VAT SCHEDULE", badge: "AUTO" },
      { label: "2% WITHHOLDING", badge: "> 10,000 ETB" },
      { label: "AUDIT EXPORT", badge: "0 ETB" },
    ],
  },
];

const PLATFORM_COMPARISONS = [
  {
    id: "comp-yekis",
    name: "YeKis Studio Escrow (2.5%)",
    role: "97.5% FREELANCER TAKE-HOME · NATIVE ETB",
    quote:
      "On a 100,000 ETB software contract, the freelancer receives 97,500 ETB directly into Telebirr or CBE Birr in under two minutes.",
    metric: "97.5% KEPT",
  },
  {
    id: "comp-global",
    name: "Overseas Portals (15%–20%)",
    role: "UPWORK / FIVERR + WIRE & FX SPREAD",
    quote:
      "Global platforms deduct 10% to 20% in marketplace commissions plus $30–$50 USD wire fees before a single Birr reaches Addis Ababa.",
    metric: "~78% KEPT",
  },
  {
    id: "comp-informal",
    name: "Informal Transfers (0% Protection)",
    role: "UNPROTECTED BANK TRANSFERS · HIGH RISK",
    quote:
      "Unsecured 50% upfront transfers leave clients exposed to vanished deliverables and leave freelancers chasing final invoices without mediation.",
    metric: "HIGH RISK",
  },
];

function TiltVisualSurface({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - py) * 11,
      rotateY: (px - 0.5) * 11,
      glareX: px * 100,
      glareY: py * 100,
      active: true,
    });
  };

  return (
    <motion.div
      className={`${className} cs-tilt-surface`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, active: false })}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
        scale: tilt.active ? 1.015 : 1,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.6 }}
      style={{ transformPerspective: 1100, transformStyle: "preserve-3d" }}
    >
      {children}
      <div
        className="cs-tilt-glare"
        style={{
          opacity: tilt.active ? 0.22 : 0,
          background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.55), transparent 58%)`,
        }}
      />
    </motion.div>
  );
}

function renderRailArtwork(railId: PaymentRailId, variant: "hero-left" | "hero-right" | "fluted") {
  const uid = `${railId}-${variant}`;

  if (variant === "hero-left" || railId === "telebirr") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="72%">
            <stop offset="0%" stopColor="#1d4227" />
            <stop offset="58%" stopColor="#0a160e" />
            <stop offset="100%" stopColor="#050806" />
          </radialGradient>
          <linearGradient id={`disc-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a7f370" />
            <stop offset="55%" stopColor="#5fa032" />
            <stop offset="100%" stopColor="#1e4918" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#bg-${uid})`} />
        <circle cx="300" cy="210" r="160" fill="none" stroke="rgba(155,229,100,0.22)" strokeDasharray="6 10" className="cs-svg-orbit" />
        <g className="cs-svg-float">
          <ellipse cx="300" cy="225" rx="135" ry="62" fill="#132c1b" stroke="#5fa032" strokeWidth="3" />
          <ellipse cx="300" cy="198" rx="135" ry="62" fill={`url(#disc-${uid})`} />
          <ellipse cx="300" cy="170" rx="74" ry="34" fill="#0b1710" stroke="#f5c518" strokeWidth="10" />
        </g>
        <g className="cs-svg-float-alt">
          <circle cx="410" cy="135" r="22" fill="#f5c518" />
          <circle cx="195" cy="275" r="15" fill="#9be564" />
        </g>
      </svg>
    );
  }

  if (variant === "hero-right" || railId === "cbebirr") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <rect width="600" height="420" fill="#08130d" />
        <circle cx="300" cy="210" r="150" fill="none" stroke="rgba(245,197,24,0.22)" strokeWidth="1.5" className="cs-svg-orbit" />
        <g className="cs-svg-float">
          <rect x="170" y="150" width="64" height="165" rx="14" fill="#1e4918" stroke="#9be564" strokeWidth="2.5" />
          <rect x="268" y="110" width="64" height="205" rx="14" fill="#5fa032" stroke="#ffffff" strokeWidth="2" />
          <rect x="366" y="80" width="64" height="235" rx="14" fill="#f5c518" />
        </g>
      </svg>
    );
  }

  if (railId === "mpesa") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <rect width="600" height="420" fill="#09150e" />
        <g className="cs-svg-float">
          <circle cx="235" cy="210" r="78" fill="rgba(95,160,50,0.32)" stroke="#9be564" strokeWidth="4" />
          <circle cx="365" cy="210" r="78" fill="rgba(245,197,24,0.25)" stroke="#f5c518" strokeWidth="4" />
          <circle cx="300" cy="210" r="32" fill="#fafaf7" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
      <rect width="600" height="420" fill="#08120c" />
      <g className="cs-svg-float">
        <rect x="180" y="95" width="240" height="230" rx="20" fill="#fafaf7" stroke="#f5c518" strokeWidth="4" />
        <rect x="210" y="130" width="180" height="22" rx="5" fill="#141715" />
        <rect x="210" y="170" width="130" height="16" rx="4" fill="#5fa032" />
        <rect x="210" y="205" width="180" height="42" rx="8" fill="#f5c518" />
        <rect x="210" y="265" width="105" height="14" rx="4" fill="#8b948e" />
      </g>
    </svg>
  );
}

export function FeesPage({ onNavigate, onStart }: FeesPageProps) {
  const { language } = useI18n();
  const lang: "en" | "am" = language === "am" ? "am" : "en";
  const [amount, setAmount] = useState<number>(50000);
  const [selectedRail, setSelectedRail] = useState<"telebirr" | "cbebirr" | "mpesa">("telebirr");
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [includeWithholding, setIncludeWithholding] = useState<boolean>(true);
  const [activeDocPreview, setActiveDocPreview] = useState<FiscalDocType | null>(null);
  const [activeRailServiceId, setActiveRailServiceId] = useState<PaymentRailId>("telebirr");
  const [activeCompIdx, setActiveCompIdx] = useState<number>(0);

  const calculatorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const calc = useMemo(() => {
    const clientFee = Math.round(amount * 0.025);
    const freelancerFee = Math.round(amount * 0.025);
    const vatAmount = includeVat ? Math.round(amount * 0.15) : 0;
    const whtEligible = amount > 10000;
    const whtAmount = includeWithholding && whtEligible ? Math.round(amount * 0.02) : 0;

    const totalClientEscrowFunding = amount + clientFee + vatAmount - whtAmount;
    const netFreelancerTakeHome = amount - freelancerFee + vatAmount - whtAmount;

    return {
      clientFee,
      freelancerFee,
      vatAmount,
      whtEligible,
      whtAmount,
      totalClientEscrowFunding,
      netFreelancerTakeHome,
    };
  }, [amount, includeVat, includeWithholding]);

  const stickyItems: StickyStackItem[] = useMemo(
    () =>
      RAIL_SERVICES.map((rail) => ({
        id: rail.id,
        title: rail.label[lang],
        topChip: rail.topChip,
        kickerBadge: rail.badge,
        artNode: renderRailArtwork(rail.id, "fluted"),
        rows: rail.rows,
        onCardClick: () => calculatorRef.current?.scrollIntoView({ behavior: "smooth" }),
      })),
    [lang]
  );

  const activeComp = PLATFORM_COMPARISONS[activeCompIdx] ?? PLATFORM_COMPARISONS[0];

  return (
    <div className="yk-v2 yk-v2-subpage yk-cs-studio">
      {/* ================================================================
          BAND 1 — DARK OBSIDIAN STUDIO HERO (#070a08)
          ================================================================ */}
      <section className="cs-hero-band">
        <div className="cs-band-inner">
          <motion.div
            className="cs-hero-top"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
          >
            <h1 className="cs-hero-display">
              <span className="cs-hero-line">
                {lang === "am" ? "የድካምዎን" : "we keep"}{" "}
                <span className="cs-hero-brace">{"{97.5%}"}</span>
              </span>
              <span className="cs-hero-line">
                <span className="cs-hero-arrow" aria-hidden="true">
                  →
                </span>
                {lang === "am" ? "በኪስዎ እናስቀራለን" : "in your pocket"}
              </span>
            </h1>
          </motion.div>

          {/* Scroll-Parallax Pure-Visual 2-Frame Diptych */}
          <ScrollParallaxDiptych
            leftFrame={
              <TiltVisualSurface
                className="cs-hero-art-frame"
                onClick={() => calculatorRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                {renderRailArtwork("telebirr", "hero-left")}
                <span className="cs-hero-hover-pill">
                  {lang === "am" ? "{ የክፍያ ማስያ } ↗" : "{ ETB Calculator } ↗"}
                </span>
              </TiltVisualSurface>
            }
            rightFrame={
              <TiltVisualSurface
                className="cs-hero-art-frame"
                onClick={() => {
                  setActiveDocPreview("CLIENT_INVOICE");
                  calculatorRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {renderRailArtwork("cbebirr", "hero-right")}
                <span className="cs-hero-hover-pill">
                  {lang === "am" ? "{ የERCA ደረሰኝ } ↗" : "{ ERCA Tax Dossier } ↗"}
                </span>
              </TiltVisualSurface>
            }
          />

          <div className="cs-hero-foot" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="cs-scroll-pill"
              onClick={() => calculatorRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              {lang === "am" ? "ማስያውን ይመልከቱ ↓" : "Open calculator ↓"}
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 2 — CRISP WHITE { 2.5% } MANIFESTO (ZERO SUB-PARAGRAPHS)
          ================================================================ */}
      <section className="cs-manifesto-band">
        <div className="cs-band-inner">
          <div className="cs-manifesto-grid">
            <motion.div
              className="cs-brace-emblem"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="cs-brace-emblem-char">{"{"}</span>
              <span className="cs-brace-emblem-word">2.5%</span>
              <span className="cs-brace-emblem-char">{"}"}</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline
                segments={
                  lang === "am"
                    ? [
                        { text: "ዓለም አቀፍ ፕላትፎርሞች 20% ሲቆርጡ፣ YeKis ግን" },
                        { text: "97.5% ክፍያዎ በቀጥታ", highlight: true },
                        { text: "ወደ ቴሌብር ወይም ንግድ ባንክ እንዲገባ ያደርጋል።" },
                      ]
                    : [
                        { text: "While global portals take up to 20%, YeKis charges a symmetric" },
                        { text: "2.5% escrow fee per side", highlight: true },
                        { text: "—with native ETB payouts and free ERCA tax schedules." },
                      ]
                }
              />

              <AnimatedCountUpStrip
                metrics={[
                  { value: 97.5, decimals: 1, suffix: "%", label: "FREELANCER TAKE-HOME" },
                  { value: 2.5, decimals: 1, suffix: "%", label: "FLAT ESCROW FEE" },
                  { value: 0, suffix: " ETB", label: "SUBSCRIPTION COST" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 3 — WARM ALABASTER INTERACTIVE ETB & TAX WORKBENCH (#eff2ee)
          ================================================================ */}
      <section className="cs-works-band" ref={calculatorRef}>
        <div className="cs-band-inner">
          <div className="cs-works-topbar">
            <span className="cs-kicker" style={{ color: "#0b0f0c" }}>
              {"{"} {lang === "am" ? "የክፍያ እና የታክስ ማስያ" : "ETB ESCROW SIMULATOR"} {"}"}
            </span>

            <div className="cs-calc-presets">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`cs-works-tab ${amount === preset ? "is-active" : ""}`}
                  onClick={() => setAmount(preset)}
                >
                  {preset.toLocaleString()} ETB
                </button>
              ))}
            </div>
          </div>

          <div className="cs-fees-workbench">
            {/* Left Dark Obsidian Interactive Controls */}
            <div className="cs-calc-panel">
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      color: "rgba(244,247,244,0.65)",
                      textTransform: "uppercase",
                    }}
                  >
                    {lang === "am" ? "የምዕራፍ ዋጋ (ETB)" : "MILESTONE VALUE"}
                  </span>
                  <span className="cs-calc-amount-display">{amount.toLocaleString()} ETB</span>
                </div>

                <input
                  type="range"
                  min={2000}
                  max={500000}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="cs-calc-slider"
                  aria-label="Milestone contract amount in ETB"
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    color: "rgba(244,247,244,0.5)",
                    marginTop: 6,
                  }}
                >
                  <span>2,000 ETB</span>
                  <span>250,000 ETB</span>
                  <span>500,000 ETB</span>
                </div>
              </div>

              {/* Settlement Rail Selector */}
              <div>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "rgba(244,247,244,0.65)",
                    marginBottom: 10,
                    textTransform: "uppercase",
                  }}
                >
                  {lang === "am" ? "የክፍያ መስመር" : "SETTLEMENT RAIL"}
                </span>
                <div className="cs-calc-rail-grid">
                  {(
                    [
                      { id: "telebirr", name: "Telebirr", speed: "< 45 sec" },
                      { id: "cbebirr", name: "CBE Birr", speed: "< 90 sec" },
                      { id: "mpesa", name: "M-Pesa ET", speed: "< 60 sec" },
                    ] as const
                  ).map((rail) => (
                    <button
                      key={rail.id}
                      type="button"
                      className={`cs-calc-rail-btn ${selectedRail === rail.id ? "is-active" : ""}`}
                      onClick={() => setSelectedRail(rail.id)}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{rail.name}</div>
                      <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 11, color: "#78c841", marginTop: 2 }}>
                        {rail.speed}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact ERCA Tax Toggles */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {lang === "am" ? "15% ተጨማሪ እሴት ታክስ (VAT)" : "15% Ethiopian VAT"}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#78c841" }}
                  />
                </label>

                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {lang === "am" ? "2% ዊዝሆልዲንግ (WHT > 10K ETB)" : "2% Withholding Tax (> 10K ETB)"}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeWithholding}
                    onChange={(e) => setIncludeWithholding(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#78c841" }}
                  />
                </label>
              </div>
            </div>

            {/* Right Editorial Dossier Receipt Card */}
            <div className="cs-dossier-receipt">
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "2px solid #141715",
                    paddingBottom: 14,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 10.5,
                        letterSpacing: "0.1em",
                        color: "#5a5f5b",
                        display: "block",
                      }}
                    >
                      RAIL: {selectedRail.toUpperCase()}
                    </span>
                    <h3
                      style={{
                        fontFamily: "var(--v2-font-display)",
                        fontSize: 22,
                        fontWeight: 700,
                        margin: "4px 0 0",
                      }}
                    >
                      {lang === "am" ? "የክፍያ ሰነድ" : "Settlement Dossier"}
                    </h3>
                  </div>
                  <span
                    style={{
                      background: "#f5c518",
                      color: "#141715",
                      fontFamily: "var(--v2-font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "6px 12px",
                      borderRadius: 6,
                    }}
                  >
                    97.5% NET
                  </span>
                </div>

                <table className="cs-ledger-table">
                  <thead>
                    <tr>
                      <th>{lang === "am" ? "መደብ" : "LINE"}</th>
                      <th>{lang === "am" ? "ተመን" : "RATE"}</th>
                      <th style={{ textAlign: "right" }}>ETB</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Gross Milestone</strong></td>
                      <td>Base</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)", fontWeight: 700 }}>
                        {amount.toLocaleString()} ETB
                      </td>
                    </tr>
                    <tr>
                      <td>Client Escrow Fee</td>
                      <td>+2.5%</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        +{calc.clientFee.toLocaleString()} ETB
                      </td>
                    </tr>
                    <tr>
                      <td>Freelancer Fee</td>
                      <td>−2.5%</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        −{calc.freelancerFee.toLocaleString()} ETB
                      </td>
                    </tr>
                    <tr>
                      <td>ERCA VAT</td>
                      <td>{includeVat ? "+15%" : "0%"}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        {includeVat ? `+${calc.vatAmount.toLocaleString()} ETB` : "0 ETB"}
                      </td>
                    </tr>
                    <tr>
                      <td>ERCA Withholding</td>
                      <td>{calc.whtAmount > 0 ? "−2%" : "0%"}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        {calc.whtAmount > 0 ? `−${calc.whtAmount.toLocaleString()} ETB` : "0 ETB"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="cs-findings-kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="cs-findings-kpi" style={{ background: "#141715", color: "#fafaf7", borderRadius: 12 }}>
                  <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10, color: "rgba(250,250,247,0.65)" }}>
                    {lang === "am" ? "ደንበኛው የሚያስይዘው" : "CLIENT DEPOSIT"}
                  </span>
                  <strong style={{ fontFamily: "var(--v2-font-display)", fontSize: 22, color: "#f5c518" }}>
                    {calc.totalClientEscrowFunding.toLocaleString()} ETB
                  </strong>
                </div>

                <div className="cs-findings-kpi" style={{ borderRadius: 12 }}>
                  <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10 }}>
                    {lang === "am" ? "ባለሙያው የሚቀበለው" : "FREELANCER PAYOUT"}
                  </span>
                  <strong style={{ fontFamily: "var(--v2-font-display)", fontSize: 22 }}>
                    {calc.netFreelancerTakeHome.toLocaleString()} ETB
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="cs-see-all-btn"
                  style={{ flex: 1, justifyContent: "center", fontSize: 15 }}
                  onClick={() => setActiveDocPreview((prev) => (prev === "CLIENT_INVOICE" ? null : "CLIENT_INVOICE"))}
                >
                  {lang === "am" ? "የደንበኛ ደረሰኝ ↗" : "Client Tax Invoice ↗"}
                </button>
                <button
                  type="button"
                  className="cs-see-all-btn"
                  style={{ flex: 1, justifyContent: "center", fontSize: 15 }}
                  onClick={() =>
                    setActiveDocPreview((prev) => (prev === "FREELANCER_VOUCHER" ? null : "FREELANCER_VOUCHER"))
                  }
                >
                  {lang === "am" ? "የባለሙያ ሰነድ ↗" : "Payout Voucher ↗"}
                </button>
              </div>
            </div>
          </div>

          {activeDocPreview && (
            <div style={{ marginTop: 28 }}>
              <FiscalDocumentSheet
                data={{
                  docType: activeDocPreview,
                  principalEtb: amount,
                  rail:
                    selectedRail === "telebirr"
                      ? "TELEBIRR"
                      : selectedRail === "cbebirr"
                        ? "CBE_BIRR"
                        : "M_PESA",
                  includeVat15: includeVat,
                  includeWithholding,
                  hasVerifiedTin: true,
                }}
                mode="embedded"
                interactiveControls={true}
                onClose={() => setActiveDocPreview(null)}
                onChangeDocType={(doc) => setActiveDocPreview(doc)}
                onToggleVat={(next) => setIncludeVat(next)}
                onToggleWithholding={(next) => setIncludeWithholding(next)}
              />
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          BAND 4 — STICKY SCROLL-PINNED { RAILS } 3-COLUMN STAGE (FIXED)
          ================================================================ */}
      <section className="cs-services-band">
        <StickyScrollServicesStage
          kicker={lang === "am" ? "{ መስመሮች }" : "{ RAILS }"}
          items={stickyItems}
          activeId={activeRailServiceId}
          onSelect={(id) => setActiveRailServiceId(id as PaymentRailId)}
        />
      </section>

      {/* ================================================================
          BAND 5 — VIBRANT STUDIO GREEN COMPARISON BAND (#5fa032)
          ================================================================ */}
      <section className="cs-testi-band">
        <div className="cs-band-inner">
          <div className="cs-testi-grid">
            <div className="cs-testi-left">
              <span className="cs-kicker" style={{ color: "#070a08" }}>
                {"{"} {lang === "am" ? "ንጽጽር" : "COMPARISON"} {"}"}
              </span>

              <div className="cs-testi-authors">
                {PLATFORM_COMPARISONS.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cs-testi-author-btn ${idx === activeCompIdx ? "is-active" : ""}`}
                    onClick={() => setActiveCompIdx(idx)}
                  >
                    <span>{item.name}</span>
                    <span className="cs-testi-metric-pill">{item.metric}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="cs-testi-right">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeComp.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  <p className="cs-testi-quote">“{activeComp.quote}”</p>
                  <div className="cs-testi-role">{activeComp.role}</div>
                  <button type="button" className="cs-testi-link" onClick={() => onNavigate?.("faq")}>
                    {lang === "am" ? "የኤስክሮ ደንቦችን ያንብቡ ↗" : "Read escrow & tax FAQ ↗"}
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 6 — DARK OBSIDIAN STUDIO OUTRO CTA (#070a08)
          ================================================================ */}
      <section className="cs-outro-band">
        <div className="cs-band-inner">
          <div className="cs-outro-grid">
            <div>
              <span className="cs-kicker" style={{ color: "#78c841" }}>
                {"{"} {lang === "am" ? "በነጻ ይጀምሩ" : "0 ETB SUBSCRIPTION"} {"}"}
              </span>
              <h2 className="cs-outro-title">
                {lang === "am" ? "የመጀመሪያ የኤስክሮ ውልዎን በ0 ብር ይክፈቱ።" : "Open your workspace for 0 ETB today."}
              </h2>
            </div>

            <div className="cs-outro-brace-stage">
              <span className="cs-outro-giant-brace">{"{"}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" className="cs-outro-pill-btn" onClick={() => onStart?.("register")}>
                  {lang === "am" ? "እንደ ደንበኛ ይጀምሩ ↗" : "Hire with Escrow ↗"}
                </button>
                <button
                  type="button"
                  className="cs-outro-pill-btn"
                  style={{ background: "transparent", color: "#f4f7f4", border: "1px solid rgba(255,255,255,0.28)" }}
                  onClick={() => onStart?.("register")}
                >
                  {lang === "am" ? "እንደ ባለሙያ ይቀላቀሉ" : "Keep 97.5% as Talent"}
                </button>
                <button
                  type="button"
                  className="cs-outro-pill-btn"
                  style={{ background: "transparent", color: "#9be564", border: "1px solid rgba(155,229,100,0.35)" }}
                  onClick={() => openSupportChat()}
                >
                  {lang === "am" ? "የታክስ ምክክር" : "Tax Desk"}
                </button>
              </div>
              <span className="cs-outro-giant-brace">{"}"}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
export default FeesPage;
