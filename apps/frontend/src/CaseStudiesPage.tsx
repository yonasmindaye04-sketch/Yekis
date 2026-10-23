import { useState, useMemo, useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Layers,
  X,
  Briefcase,
  Target,
  Activity,
  Award,
  Sparkles,
} from "lucide-react";
import { useI18n } from "./i18n";
import "./landing-v2.css";

type CaseStudiesPageProps = {
  onNavigate: (page: string) => void;
  onStart?: (mode: "login" | "register") => void;
};

type CaseCategory = "ALL" | "ENGINEERING" | "DESIGN" | "MARKETING" | "LOCALIZATION" | "DATA";

type ProblemPillar = {
  label: string;
  detail: string;
};

type CaseStudyItem = {
  id: string;
  index: string;
  category: Exclude<CaseCategory, "ALL">;
  categoryLabel: string;
  title: string;
  editorialHeadline: string;
  client: string;
  clientShort: string;
  city: string;
  summary: string;
  executiveSummary: string;
  historicalContext: string;
  industryOverview: string;
  problemPillars: [ProblemPillar, ProblemPillar, ProblemPillar];
  methodologyNote: string;
  findingsHeadline: string;
  findingsSub: string;
  budgetEtb: string;
  timeline: string;
  milestoneCount: number;
  rail: string;
  quote: string;
  quoteAuthor: string;
  quoteRole: string;
  outcomeMetric: string;
  chartBefore: number[];
  chartAfter: number[];
  finalThought: string;
  futureImplication: string;
  artVariant: "monolith" | "botanical" | "acoustic" | "prism" | "lattice" | "vault";
  milestones: { title: string; amount: string; duration: string }[];
};

const CASE_STUDIES: CaseStudyItem[] = [
  {
    id: "cs-abyssinia-fleet",
    index: "01",
    category: "ENGINEERING",
    categoryLabel: "Web & Mobile Engineering",
    title: "Abyssinia Logistics Dispatch & Telebirr Driver Settlement Portal",
    editorialHeadline:
      "From manual spreadsheet dispatch to automated Telebirr driver settlements across 140+ cold-chain trucks",
    client: "Abyssinia Freight & Cold-Chain PLC",
    clientShort: "Abyssinia Freight",
    city: "Addis Ababa",
    summary:
      "Built a real-time fleet tracking web application and mobile driver check-in portal with automated Telebirr trip allowances, replacing manual spreadsheet reconciliation across 140+ trucks.",
    executiveSummary:
      "Abyssinia Freight structured an 85,000 ETB engineering contract into four milestone tranches on Yekis. Each sprint was reviewed in staging before releasing funds, cutting dispatch reconciliation time by 68% within 21 days.",
    historicalContext:
      "Prior to milestone-backed remote hiring, fleet dispatchers reconciled fuel and trip allowances across five regional depots using manual spreadsheets and phone transfers, resulting in 4-day settlement delays.",
    industryOverview:
      "Ethiopian cold-chain and freight operators increasingly require real-time GPS check-ins paired with instant mobile money disbursements to keep long-haul drivers moving on schedule.",
    problemPillars: [
      {
        label: "defining the challenge",
        detail: "140+ active trucks waited up to 96 hours for manual trip allowance verification and bank sign-off.",
      },
      {
        label: "scope of the problem",
        detail: "Five corridor checkpoints lacked unified digital proof of delivery or automated Telebirr payout hooks.",
      },
      {
        label: "impact of the problem",
        detail: "Finance staff spent 28 hours every week auditing paper receipts and resolving duplicate claims.",
      },
    ],
    methodologyNote:
      "Work was divided into four escrowed sprints: architecture schema, live dispatcher map, mobile driver check-in with Telebirr webhook, and load testing across 140 concurrent driver sessions.",
    findingsHeadline: "-68%",
    findingsSub: "Reduction in weekly dispatch & driver allowance reconciliation time",
    budgetEtb: "85,000 ETB",
    timeline: "3 Weeks",
    milestoneCount: 4,
    rail: "Telebirr & CBE Birr",
    quote:
      "Approving each milestone released payment immediately. Our lead developer in Bahir Dar delivered every sprint ahead of schedule with zero payment friction.",
    quoteAuthor: "Yared K.",
    quoteRole: "Operations Director · Abyssinia Freight, Addis Ababa",
    outcomeMetric: "-68% dispatch reconciliation time",
    chartBefore: [28, 34, 31, 39, 42, 45],
    chartAfter: [40, 58, 72, 84, 91, 96],
    finalThought:
      "Milestone escrow allowed an Addis logistics operator to hire senior engineering talent in Bahir Dar with complete technical and financial accountability.",
    futureImplication:
      "Phase 2 expands automated customs clearance alerts along the Addis–Djibouti corridor using the same 4-tranche milestone structure.",
    artVariant: "monolith",
    milestones: [
      { title: "01 · System Architecture & API Schema", amount: "15,000 ETB", duration: "4 days" },
      { title: "02 · Dispatcher Web Dashboard & Live Map", amount: "30,000 ETB", duration: "7 days" },
      { title: "03 · Driver Mobile Check-In & Telebirr Webhook", amount: "25,000 ETB", duration: "6 days" },
      { title: "04 · Load Testing, QA & Production Handover", amount: "15,000 ETB", duration: "4 days" },
    ],
  },
  {
    id: "cs-kaffa-coffee",
    index: "02",
    category: "DESIGN",
    categoryLabel: "Design & Creative",
    title: "Kaffa Origin Specialty Coffee Export Identity & Packaging System",
    editorialHeadline:
      "Building an export-grade specialty coffee identity from regional cooperative to three international buyer contracts",
    client: "Kaffa Highland Exporters Union",
    clientShort: "Kaffa Exporters",
    city: "Hawassa",
    summary:
      "Complete brand identity, bilingual export packaging dielines, and a wholesale buyer lookbook for specialty washed Arabica lots shipping to European and Middle Eastern roasters.",
    executiveSummary:
      "By locking 45,000 ETB across three deliverable stages, Kaffa Highland Exporters collaborated remotely with an Addis brand studio—approving typography, print-ready bag dielines, and wholesale buyer decks with zero revision disputes.",
    historicalContext:
      "Specialty coffee unions in southern Ethiopia historically exported unbranded green lots at commodity discounts because local cooperatives lacked direct access to export-packaging designers.",
    industryOverview:
      "Direct-trade roasters in Europe and the Gulf demand traceable lot storytelling, moisture-barrier bag dielines, and bilingual cupping specification sheets before signing seasonal contracts.",
    problemPillars: [
      {
        label: "defining the challenge",
        detail: "High-scoring single-origin Arabica lots were presented to international buyers with generic unbranded spec sheets.",
      },
      {
        label: "scope of the problem",
        detail: "Required 250g and 1kg valve-bag print dielines plus a 24-page wholesale lookbook in under 14 days.",
      },
      {
        label: "impact of the problem",
        detail: "Previous informal design agreements stalled over unverified print color profiles and upfront deposit risk.",
      },
    ],
    methodologyNote:
      "Three milestone releases tied to tangible design artifacts: vector brand system, press-ready CMYK+Pantone packaging dielines, and bilingual buyer lookbook.",
    findingsHeadline: "3x",
    findingsSub: "International specialty roaster contracts signed at specialty trade show",
    budgetEtb: "45,000 ETB",
    timeline: "2 Weeks",
    milestoneCount: 3,
    rail: "CBE Birr",
    quote:
      "Escrow gave our union board confidence to hire a top Addis studio remotely. We reviewed print-ready proofs inside Yekis before releasing each tranche.",
    quoteAuthor: "Meron G.",
    quoteRole: "Export Marketing Lead · Kaffa Union, Hawassa",
    outcomeMetric: "3 international buyer contracts signed",
    chartBefore: [20, 24, 22, 26, 29, 30],
    chartAfter: [35, 52, 68, 79, 88, 95],
    finalThought:
      "Structured proof reviews eliminated cross-city trust barriers between a Hawassa agricultural union and a specialized Addis packaging studio.",
    futureImplication:
      "The union now commissions seasonal harvest lookbooks every quarter through recurring Yekis milestone templates.",
    artVariant: "botanical",
    milestones: [
      { title: "01 · Brand Strategy, Wordmark & Color System", amount: "15,000 ETB", duration: "5 days" },
      { title: "02 · 250g & 1kg Export Bag Print Dielines", amount: "18,000 ETB", duration: "5 days" },
      { title: "03 · Digital Buyer Deck & Brand Guidelines", amount: "12,000 ETB", duration: "4 days" },
    ],
  },
  {
    id: "cs-zemen-localization",
    index: "03",
    category: "LOCALIZATION",
    categoryLabel: "Translation & Localization",
    title: "Multilingual Maternal Health App Localization (Amharic, Afaan Oromoo & Tigrinya)",
    editorialHeadline:
      "Clinical-grade localization of 180+ maternal nutrition modules across three Ethiopian languages in 10 days",
    client: "Biruh Health Initiative NGO",
    clientShort: "Biruh Health NGO",
    city: "Bahir Dar",
    summary:
      "Medical-grade translation, voiceover recording, and cultural QA of 180+ maternal nutrition modules across Amharic, Afaan Oromoo, and Tigrinya for rural health extension workers.",
    executiveSummary:
      "Biruh Health Initiative coordinated three certified medical linguists under a 38,000 ETB escrowed workflow, achieving 100% clinical QA sign-off and audit-ready Telebirr disbursement records.",
    historicalContext:
      "Public health NGOs operating in rural woredas struggled to localize digital field-worker apps quickly while maintaining strict donor-compliant financial audit trails.",
    industryOverview:
      "Field health extension tools require synchronized terminology glossaries, native voice prompts for low-literacy mothers, and verifiable clinician sign-off.",
    problemPillars: [
      {
        label: "defining the challenge",
        detail: "180 clinical nutrition lessons needed simultaneous translation and audio recording across three languages.",
      },
      {
        label: "scope of the problem",
        detail: "Inconsistent medical terminology across regional contractors previously caused field-testing delays.",
      },
      {
        label: "impact of the problem",
        detail: "Grant auditors required itemized milestone receipts matched to verified deliverable files.",
      },
    ],
    methodologyNote:
      "Milestone 1 locked the trilingual medical glossary before Milestone 2 script translation and Milestone 3 studio voiceover QA.",
    findingsHeadline: "180+",
    findingsSub: "Clinical modules localized & audio-verified with 100% QA pass rate",
    budgetEtb: "38,000 ETB",
    timeline: "10 Days",
    milestoneCount: 3,
    rail: "Telebirr",
    quote:
      "Hiring three certified linguists through Yekis with TIN-compliant receipts saved our finance team weeks of grant auditing paperwork.",
    quoteAuthor: "Dr. Sara M.",
    quoteRole: "Program Coordinator · Biruh Health, Bahir Dar",
    outcomeMetric: "180 modules localized with 100% clinical QA",
    chartBefore: [18, 22, 25, 29, 31, 35],
    chartAfter: [42, 60, 74, 86, 94, 100],
    finalThought:
      "Locking the clinical glossary as Milestone 01 prevented downstream rework and guaranteed uniform terminology across all 180 lessons.",
    futureImplication:
      "Expanded to Somali and Sidama language packs using the same three-stage clinical verification protocol.",
    artVariant: "acoustic",
    milestones: [
      { title: "01 · Medical Glossary & Terminology Alignment", amount: "8,000 ETB", duration: "2 days" },
      { title: "02 · UI Strings & Lesson Script Translation", amount: "18,000 ETB", duration: "5 days" },
      { title: "03 · Native Audio Prompts & In-App Linguistic QA", amount: "12,000 ETB", duration: "3 days" },
    ],
  },
  {
    id: "cs-sheger-growth",
    index: "04",
    category: "MARKETING",
    categoryLabel: "Digital Marketing",
    title: "Sheger Home & Electronics Telegram + TikTok Performance Launch",
    editorialHeadline:
      "Turning 12 short-form Amharic video reels and an automated Telegram catalog bot into a 3.4x return on spend",
    client: "Sheger Retail Group",
    clientShort: "Sheger Retail",
    city: "Addis Ababa",
    summary:
      "Produced 12 short-form Amharic product reels, automated a Telegram catalog bot funnel, and managed targeted holiday conversion campaigns with clear ROAS milestones.",
    executiveSummary:
      "Sheger Retail Group replaced open-ended agency retainers with a 52,000 ETB milestone contract tied directly to studio video reels, Telegram bot attribution, and conversion optimization.",
    historicalContext:
      "Retailers in Addis Ababa frequently paid upfront monthly social-media retainers without clear deliverable schedules or attributable Telegram order tracking.",
    industryOverview:
      "High-intent consumer commerce in Ethiopia runs on short-form TikTok/Reels discovery paired with instant Telegram catalog checkout.",
    problemPillars: [
      {
        label: "defining the challenge",
        detail: "Holiday campaign required 12 studio-shot Amharic product reels and a live Telegram order bot in 4 weeks.",
      },
      {
        label: "scope of the problem",
        detail: "Previous marketing spend lacked deep-link attribution between video views and Telegram sales inquiries.",
      },
      {
        label: "impact of the problem",
        detail: "Sales reps were overwhelmed by unstructured DMs instead of pre-qualified product cart inquiries.",
      },
    ],
    methodologyNote:
      "Split into three performance tranches: Batch 1 studio reels, Telegram catalog funnel with tracking links, and Batch 2 conversion-optimized cuts.",
    findingsHeadline: "3.4x",
    findingsSub: "Verified return on holiday campaign spend with 3x Telegram order volume",
    budgetEtb: "52,000 ETB",
    timeline: "4 Weeks",
    milestoneCount: 3,
    rail: "Telebirr",
    quote:
      "We tied every milestone to verified creative deliverables and campaign setup. Sales inquiries on our Telegram channel tripled in the first two weeks.",
    quoteAuthor: "Hanna G.",
    quoteRole: "Founder · Sheger Retail Group, Addis Ababa",
    outcomeMetric: "3.4x return on campaign spend",
    chartBefore: [22, 26, 24, 28, 30, 32],
    chartAfter: [38, 54, 71, 83, 90, 97],
    finalThought:
      "Deliverable-linked escrow aligned creative production speed with measurable Telegram funnel conversion.",
    futureImplication:
      "Sheger Retail now runs every seasonal product drop through 3-tranche creative + bot performance contracts.",
    artVariant: "prism",
    milestones: [
      { title: "01 · Creative Scripting & 6 Studio Video Reels", amount: "20,000 ETB", duration: "10 days" },
      { title: "02 · Telegram Catalog Funnel & Pixel Tracking", amount: "14,000 ETB", duration: "7 days" },
      { title: "03 · Second Batch Reels & Conversion Optimization", amount: "18,000 ETB", duration: "11 days" },
    ],
  },
  {
    id: "cs-tigray-agri-data",
    index: "05",
    category: "DATA",
    categoryLabel: "Data & Back-Office",
    title: "Regional Grain Market Price & Cooperative Inventory Analytics Suite",
    editorialHeadline:
      "Structuring 42,000+ historical commodity records into a 15-minute weekly cooperative intelligence brief",
    client: "Northern Highlands Cooperative Network",
    clientShort: "Highlands Co-op",
    city: "Mekelle",
    summary:
      "Cleaned 4 years of historical commodity records, automated weekly woreda price ingestion forms, and delivered an interactive Power BI & Python reporting dashboard.",
    executiveSummary:
      "A 64,000 ETB data engineering engagement across four escrowed milestones transformed fragmented Excel sheets into an automated Python + Power BI cooperative inventory suite.",
    historicalContext:
      "Four years of regional grain price and warehouse stock records were scattered across inconsistent spreadsheets with duplicate woreda codes and missing timestamps.",
    industryOverview:
      "Agricultural cooperative networks rely on timely weekly price dispersion data to allocate transport and stabilize member farmer payouts.",
    problemPillars: [
      {
        label: "defining the challenge",
        detail: "42,000+ historical rows required deduplication, schema normalization, and outlier validation.",
      },
      {
        label: "scope of the problem",
        detail: "Weekly market brief compilation took analysts 3 full days of manual copy-pasting every week.",
      },
      {
        label: "impact of the problem",
        detail: "Delayed inventory visibility led to stock imbalances across cooperative storage hubs.",
      },
    ],
    methodologyNote:
      "Four sequential data milestones: historical dataset deduplication, mobile ingestion schema, executive BI dashboard, and analyst handover training.",
    findingsHeadline: "42K+",
    findingsSub: "Historical commodity records structured; weekly reporting cut from 3 days to 15 min",
    budgetEtb: "64,000 ETB",
    timeline: "3 Weeks",
    milestoneCount: 4,
    rail: "CBE Birr",
    quote:
      "Every dataset delivery was verified in the milestone workspace before release. Our analysts now publish weekly market briefs in 15 minutes instead of 3 days.",
    quoteAuthor: "Betty A.",
    quoteRole: "Operations Lead · Highlands Co-op, Mekelle",
    outcomeMetric: "42,000+ historical records structured",
    chartBefore: [15, 19, 21, 20, 24, 26],
    chartAfter: [36, 55, 69, 82, 91, 96],
    finalThought:
      "Verifying data quality at each milestone stage ensured the final BI dashboard launched on clean, trusted historical series.",
    futureImplication:
      "Automated SMS price feeds from 18 additional woreda markets are now ingested directly into the schema.",
    artVariant: "lattice",
    milestones: [
      { title: "01 · Historical CSV/Excel Cleaning & Deduplication", amount: "16,000 ETB", duration: "5 days" },
      { title: "02 · Automated Mobile Data Collection Schema", amount: "16,000 ETB", duration: "5 days" },
      { title: "03 · Executive Price & Inventory Dashboard", amount: "20,000 ETB", duration: "6 days" },
      { title: "04 · Staff Training & Documentation Handover", amount: "12,000 ETB", duration: "5 days" },
    ],
  },
  {
    id: "cs-diredawa-portal",
    index: "06",
    category: "ENGINEERING",
    categoryLabel: "Web & Mobile Engineering",
    title: "Dire Dawa Textile Supplier B2B Ordering & Customs Document Tracker",
    editorialHeadline:
      "Digitizing 100% of pro-forma invoice and customs sign-offs for an export manufacturing corridor",
    client: "East Rift Manufacturing PLC",
    clientShort: "East Rift Mfg",
    city: "Dire Dawa",
    summary:
      "Engineered a secure supplier portal with role-based document sign-off, pro-forma invoice generation in ETB/USD, and automated SMS/Telegram status alerts.",
    executiveSummary:
      "East Rift Manufacturing executed a 110,000 ETB full-stack portal build across four verified milestones—moving 100% of supplier pro-forma approvals and customs waybill tracking online in 5 weeks.",
    historicalContext:
      "Cross-corridor textile procurement relied on emailed PDFs and physical stamp chains, creating bottlenecks between factory floor procurement and clearing agents.",
    industryOverview:
      "Industrial parks and export manufacturers in Dire Dawa require multi-role audit trails, dual-currency pro-forma templates, and instant status notifications.",
    problemPillars: [
      {
        label: "defining the challenge",
        detail: "Manual pro-forma invoice revisions and customs waybill sign-offs delayed raw material dispatch.",
      },
      {
        label: "scope of the problem",
        detail: "Required role-based access for procurement officers, suppliers, and clearing agents with full audit logs.",
      },
      {
        label: "impact of the problem",
        detail: "High-value B2B software builds demanded strict milestone escrow to protect both factory and engineering squad.",
      },
    ],
    methodologyNote:
      "Delivered in four audited tranches: RBAC auth & onboarding, pro-forma & customs document engine, Telegram/SMS notifications, and production cloud deployment.",
    findingsHeadline: "100%",
    findingsSub: "Digital pro-forma & customs document workflow with zero audit discrepancies",
    budgetEtb: "110,000 ETB",
    timeline: "5 Weeks",
    milestoneCount: 4,
    rail: "CBE Birr & M-Pesa",
    quote:
      "Splitting a 110,000 ETB build into four clear milestones kept both our procurement team and the freelance engineering squad 100% aligned.",
    quoteAuthor: "Nardos A.",
    quoteRole: "Technical Lead · East Rift Manufacturing, Dire Dawa",
    outcomeMetric: "100% digital pro-forma workflow",
    chartBefore: [24, 28, 27, 31, 33, 36],
    chartAfter: [45, 62, 76, 87, 94, 100],
    finalThought:
      "Four-tranche milestone escrow made a 110,000 ETB enterprise build predictable, transparent, and risk-free for both sides.",
    futureImplication:
      "Now onboarding 60+ regional raw-material suppliers onto the automated pro-forma portal.",
    artVariant: "vault",
    milestones: [
      { title: "01 · Role-Based Auth & Supplier Onboarding Flow", amount: "25,000 ETB", duration: "8 days" },
      { title: "02 · Pro-Forma Invoice & Customs Document Engine", amount: "35,000 ETB", duration: "10 days" },
      { title: "03 · Automated Telegram & SMS Alert Integration", amount: "28,000 ETB", duration: "9 days" },
      { title: "04 · Security Audit & Cloud Deployment", amount: "22,000 ETB", duration: "8 days" },
    ],
  },
];

const DISCIPLINES: {
  id: Exclude<CaseCategory, "ALL">;
  title: string;
  escrowRange: string;
  avgTranches: string;
  description: string;
  rails: string;
  featuredStudyId: string;
}[] = [
  {
    id: "ENGINEERING",
    title: "Engineering",
    escrowRange: "45,000 – 120,000 ETB",
    avgTranches: "4 Milestone Tranches",
    rails: "Telebirr · CBE Birr · M-Pesa",
    description:
      "Full-stack web portals, Telebirr webhook integrations, fleet dispatch systems, and B2B enterprise workflows verified sprint-by-sprint.",
    featuredStudyId: "cs-abyssinia-fleet",
  },
  {
    id: "DESIGN",
    title: "Branding",
    escrowRange: "25,000 – 65,000 ETB",
    avgTranches: "3 Milestone Tranches",
    rails: "CBE Birr · Telebirr",
    description:
      "Export-ready packaging systems, brand identity guidelines, UI/UX design systems, and wholesale buyer lookbooks with staged proof sign-offs.",
    featuredStudyId: "cs-kaffa-coffee",
  },
  {
    id: "MARKETING",
    title: "Growth & Reels",
    escrowRange: "30,000 – 75,000 ETB",
    avgTranches: "3 Milestone Tranches",
    rails: "Telebirr",
    description:
      "Studio Amharic video reels, automated Telegram catalog bots, and conversion-tracked performance launches tied to clear ROAS deliverables.",
    featuredStudyId: "cs-sheger-growth",
  },
  {
    id: "LOCALIZATION",
    title: "Localization",
    escrowRange: "20,000 – 55,000 ETB",
    avgTranches: "3 Milestone Tranches",
    rails: "Telebirr · CBE Birr",
    description:
      "Clinical, technical, and NGO localization across Amharic, Afaan Oromoo, and Tigrinya with glossary lock and native audio QA.",
    featuredStudyId: "cs-zemen-localization",
  },
  {
    id: "DATA",
    title: "Data & BI Suites",
    escrowRange: "35,000 – 85,000 ETB",
    avgTranches: "4 Milestone Tranches",
    rails: "CBE Birr",
    description:
      "Historical dataset deduplication, automated woreda field ingestion schemas, and executive Python / Power BI analytics dashboards.",
    featuredStudyId: "cs-tigray-agri-data",
  },
];

/* Interactive 3D Pointer-Tracked Tilt & Magnetic Cursor Pill Surface */
function TiltVisualSurface({
  className,
  children,
  magneticLabel,
  onClick,
  ariaLabel,
}: {
  className: string;
  children: ReactNode;
  magneticLabel?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, cursorX: 0, cursorY: 0, hovered: false });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const rotateY = (relX - 0.5) * 9;
    const rotateX = (0.5 - relY) * 9;
    setTilt({
      rotateX,
      rotateY,
      glareX: relX * 100,
      glareY: relY * 100,
      cursorX: e.clientX - rect.left,
      cursorY: e.clientY - rect.top,
      hovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt((prev) => ({ ...prev, rotateX: 0, rotateY: 0, hovered: false }));
  };

  return (
    <motion.div
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
      }}
      transition={{ type: "spring", stiffness: 240, damping: 22, mass: 0.6 }}
      style={{ cursor: onClick ? "pointer" : undefined }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
      <div
        className="cs-tilt-glare"
        style={{
          background: `radial-gradient(360px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(154, 232, 92, 0.22), transparent 68%)`,
        }}
      />
      <AnimatePresence>
        {magneticLabel && tilt.hovered && (
          <motion.span
            className="cs-work-magnetic-pill"
            initial={{ opacity: 0, scale: 0.78 }}
            animate={{
              opacity: 1,
              scale: 1,
              left: Math.min(Math.max(tilt.cursorX - 64, 14), 240),
              top: Math.min(Math.max(tilt.cursorY - 18, 14), 220),
            }}
            exit={{ opacity: 0, scale: 0.78 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
          >
            <span>{magneticLabel}</span>
            <ArrowUpRight size={13} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* Sculptural 3D-inspired architectural artwork per project card with living continuous motion */
function ProjectSculpturalArt({ variant }: { variant: CaseStudyItem["artVariant"] }) {
  if (variant === "monolith") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 380" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="cs-g1" cx="65%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#6eb83b" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#2e5420" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#14260e" />
          </radialGradient>
          <linearGradient id="cs-step" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5d9c34" />
            <stop offset="100%" stopColor="#1f3b14" />
          </linearGradient>
        </defs>
        <rect width="480" height="380" fill="url(#cs-g1)" />
        {/* Stepped architectural monoliths + levitating translucent vessel */}
        <polygon className="cs-svg-float-alt" points="40,290 130,245 180,270 90,315" fill="url(#cs-step)" opacity="0.95" />
        <polygon className="cs-svg-float" points="120,255 210,210 260,235 170,280" fill="url(#cs-step)" opacity="0.88" />
        <polygon className="cs-svg-float-alt" points="200,220 290,175 340,200 250,245" fill="url(#cs-step)" opacity="0.82" />
        <g className="cs-svg-float">
          <ellipse cx="340" cy="145" rx="64" ry="28" fill="#18320e" stroke="#8ad453" strokeWidth="1.5" opacity="0.85" />
          <path d="M276,145 L276,195 A64,28 0 0,0 404,195 L404,145" fill="rgba(110,184,59,0.28)" stroke="#8ad453" strokeWidth="1.2" />
          <ellipse className="cs-svg-pulse" cx="340" cy="175" rx="58" ry="22" fill="#5ea030" opacity="0.72" />
        </g>
      </svg>
    );
  }
  if (variant === "botanical") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 420" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="cs-g2" cx="50%" cy="42%" r="68%">
            <stop offset="0%" stopColor="#5ea030" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#233d18" />
            <stop offset="100%" stopColor="#0f1d0a" />
          </radialGradient>
        </defs>
        <rect width="480" height="420" fill="url(#cs-g2)" />
        {/* Sculptural disc backdrop + cylindrical pedestal + rotating botanical ring */}
        <circle className="cs-svg-pulse" cx="240" cy="195" r="118" fill="#2c4c1e" stroke="rgba(154,224,99,0.22)" strokeWidth="1.5" />
        <circle className="cs-svg-orbit" cx="240" cy="185" r="58" fill="none" stroke="#6eb83b" strokeWidth="26" strokeDasharray="4 3" opacity="0.92" />
        <circle className="cs-svg-orbit-reverse" cx="240" cy="185" r="58" fill="none" stroke="#a3e668" strokeWidth="14" strokeDasharray="2 5" opacity="0.65" />
        <g className="cs-svg-float">
          <rect x="186" y="255" width="108" height="110" rx="8" fill="#355925" stroke="rgba(163,230,104,0.28)" />
          <ellipse cx="240" cy="255" rx="54" ry="14" fill="#4d7d36" />
        </g>
      </svg>
    );
  }
  if (variant === "acoustic") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 380" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="380" fill="#162912" />
        {[48, 78, 108, 138, 168].map((r, idx) => (
          <circle
            key={r}
            className={idx % 2 === 0 ? "cs-svg-pulse" : "cs-svg-orbit"}
            cx="240"
            cy="190"
            r={r}
            fill="none"
            stroke="#6eb83b"
            strokeWidth={idx === 1 ? "12" : "2"}
            strokeDasharray={idx === 2 ? "8 6" : undefined}
            strokeOpacity={0.85 - idx * 0.14}
          />
        ))}
        <circle className="cs-svg-float" cx="240" cy="190" r="28" fill="#74b843" />
      </svg>
    );
  }
  if (variant === "prism") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 420" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="420" fill="#12210e" />
        <polygon className="cs-svg-float-alt" points="240,68 380,300 100,300" fill="rgba(110,184,59,0.22)" stroke="#74b843" strokeWidth="2" />
        <polygon className="cs-svg-float" points="240,110 340,280 140,280" fill="rgba(110,184,59,0.34)" stroke="#a3e668" strokeWidth="1.5" />
        <circle className="cs-svg-pulse" cx="240" cy="222" r="36" fill="#5ea030" />
      </svg>
    );
  }
  if (variant === "lattice") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 380" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="380" fill="#13240f" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            className={i % 2 === 0 ? "cs-svg-float" : "cs-svg-float-alt"}
            x={75 + i * 56}
            y={240 - i * 24}
            width="36"
            height={80 + i * 24}
            rx="4"
            fill={i === 4 ? "#74b843" : "#2f5422"}
            stroke="rgba(163,230,104,0.3)"
          />
        ))}
      </svg>
    );
  }
  return (
    <svg className="cs-hero-art-svg" viewBox="0 0 480 420" preserveAspectRatio="xMidYMid slice">
      <rect width="480" height="420" fill="#101e0c" />
      <rect className="cs-svg-float-alt" x="110" y="85" width="260" height="250" rx="18" fill="#1c3415" stroke="#6eb83b" strokeWidth="2" />
      <circle className="cs-svg-orbit" cx="240" cy="210" r="68" fill="#0d190a" stroke="#8ad453" strokeWidth="3" strokeDasharray="12 6" />
      <circle className="cs-svg-pulse" cx="240" cy="210" r="26" fill="#67ad36" />
    </svg>
  );
}

const sectionRevealVariants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function CaseStudiesPage({ onNavigate, onStart }: CaseStudiesPageProps) {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CaseCategory>("ALL");
  const [activeDiscipline, setActiveDiscipline] = useState<Exclude<CaseCategory, "ALL">>("ENGINEERING");
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);
  const [selectedStudy, setSelectedStudy] = useState<CaseStudyItem | null>(null);
  const [activeSpread, setActiveSpread] = useState<"all" | "1" | "2" | "3" | "4">("all");

  const worksSectionRef = useRef<HTMLElement | null>(null);
  const spread1Ref = useRef<HTMLDivElement | null>(null);
  const spread2Ref = useRef<HTMLDivElement | null>(null);
  const spread3Ref = useRef<HTMLDivElement | null>(null);
  const spread4Ref = useRef<HTMLDivElement | null>(null);

  const categories: { id: CaseCategory; label: string }[] = [
    { id: "ALL", label: "All Stories" },
    { id: "ENGINEERING", label: "Engineering" },
    { id: "DESIGN", label: "Design & Brand" },
    { id: "MARKETING", label: "Growth & Reels" },
    { id: "LOCALIZATION", label: "Localization" },
    { id: "DATA", label: "Data & BI" },
  ];

  const filteredStudies = useMemo(() => {
    if (activeCategory === "ALL") return CASE_STUDIES;
    return CASE_STUDIES.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const currentDiscipline = useMemo(
    () => DISCIPLINES.find((d) => d.id === activeDiscipline) ?? DISCIPLINES[0],
    [activeDiscipline],
  );

  const activeTestimonial = CASE_STUDIES[activeTestimonialIdx] ?? CASE_STUDIES[0];

  /* Lock background scroll when the Editorial Dossier modal is open */
  useEffect(() => {
    if (!selectedStudy) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStudy(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedStudy]);

  const openStudyDossier = (study: CaseStudyItem) => {
    setActiveSpread("all");
    setSelectedStudy(study);
  };

  const cycleStudyDossier = (dir: -1 | 1) => {
    if (!selectedStudy) return;
    const idx = CASE_STUDIES.findIndex((s) => s.id === selectedStudy.id);
    const nextIdx = (idx + dir + CASE_STUDIES.length) % CASE_STUDIES.length;
    setActiveSpread("all");
    setSelectedStudy(CASE_STUDIES[nextIdx]);
  };

  const jumpToSpread = (spread: "1" | "2" | "3" | "4") => {
    setActiveSpread("all");
    window.setTimeout(() => {
      const target =
        spread === "1"
          ? spread1Ref.current
          : spread === "2"
            ? spread2Ref.current
            : spread === "3"
              ? spread3Ref.current
              : spread4Ref.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  const handleStartProject = () => {
    setSelectedStudy(null);
    if (onStart) {
      onStart("register");
    } else {
      onNavigate("home");
    }
  };

  /* Build animated SVG polyline coordinates for Spread 2 Historical Trend Chart */
  const renderTrendChart = (study: CaseStudyItem) => {
    const w = 320;
    const h = 120;
    const padX = 24;
    const padY = 16;
    const toPoints = (arr: number[]) =>
      arr
        .map((v, idx) => {
          const x = padX + (idx / (arr.length - 1)) * (w - padX * 2);
          const y = h - padY - (v / 100) * (h - padY * 2);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.5, 1].map((tVal, i) => {
          const y = padY + tVal * (h - padY * 2);
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={w - padX}
              y2={y}
              stroke="#dcdcd4"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}
        {/* Baseline */}
        <polyline
          fill="none"
          stroke="#9ca39e"
          strokeWidth="1.75"
          strokeDasharray="4 3"
          points={toPoints(study.chartBefore)}
        />
        {/* Animated Post-Yekis Escrow Trajectory */}
        <motion.polyline
          key={study.id}
          fill="none"
          stroke="#141715"
          strokeWidth="2.4"
          points={toPoints(study.chartAfter)}
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.95, ease: "easeOut" }}
        />
        {study.chartAfter.map((v, idx) => {
          const x = padX + (idx / (study.chartAfter.length - 1)) * (w - padX * 2);
          const y = h - padY - (v / 100) * (h - padY * 2);
          return (
            <motion.circle
              key={`${study.id}-${idx}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="#f5c518"
              stroke="#141715"
              strokeWidth="1.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + idx * 0.12, type: "spring", stiffness: 320, damping: 18 }}
            />
          );
        })}
      </svg>
    );
  };

  const dossierModal = (
    <AnimatePresence>
      {selectedStudy && (
        <motion.div
          key="cs-dossier-backdrop"
          className="cs-dossier-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cs-dossier-modal-title"
          onClick={() => setSelectedStudy(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Top Dossier Control Bar */}
          <motion.div
            className="cs-dossier-topbar"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: 4,
                  background: "#f5c518",
                  color: "#141715",
                  letterSpacing: "0.1em",
                }}
              >
                DOSSIER #{selectedStudy.index}
              </span>
              <strong id="cs-dossier-modal-title" style={{ fontSize: 14.5, color: "#ffffff" }}>
                {selectedStudy.clientShort} &middot; {selectedStudy.city}
              </strong>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
                <button
                  type="button"
                  className="cs-dossier-spread-tab"
                  onClick={() => cycleStudyDossier(-1)}
                  aria-label="Previous case study dossier"
                  title="Previous dossier"
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  type="button"
                  className="cs-dossier-spread-tab"
                  onClick={() => cycleStudyDossier(1)}
                  aria-label="Next case study dossier"
                  title="Next dossier"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Spread Switcher Tabs */}
            <div className="cs-dossier-spread-tabs" role="tablist" aria-label="Dossier spread selector">
              {(
                [
                  { id: "all", label: "All 4 Spreads" },
                  { id: "1", label: "01 · Executive Summary" },
                  { id: "2", label: "02 · Problem Statement" },
                  { id: "3", label: "03 · Methodology & Findings" },
                  { id: "4", label: "04 · Solutions & Ledger" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSpread === tab.id}
                  className={`cs-dossier-spread-tab ${activeSpread === tab.id ? "is-active" : ""}`}
                  onClick={() => setActiveSpread(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudy(null)}
              aria-label="Close case study dossier"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#ffffff",
                width: 38,
                height: 38,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </motion.div>

          {/* Stacked Two-Page Book Spreads Canvas with Smooth Page-Flip / Slide Transitions */}
          <div className="cs-dossier-scroll-canvas" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="popLayout">
              {/* ── SPREAD 01: Client Mandate (p. 02) + Table of Contents & Executive Summary (p. 03) ── */}
              {(activeSpread === "all" || activeSpread === "1") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-1`}
                  className="cs-book-spread"
                  ref={spread1Ref}
                  aria-label="Spread 1: Client Mandate and Executive Summary"
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 02 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Client Mandate</h3>
                        <span className="cs-page-num">p. 02</span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "150px 1fr",
                          gap: 20,
                          marginTop: 22,
                          alignItems: "start",
                        }}
                      >
                        {/* Portrait / Monogram Card with Gold Badge matching Image 1 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          <div
                            style={{
                              position: "relative",
                              background: "#e4e5e0",
                              height: 156,
                              display: "grid",
                              placeItems: "center",
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "#f5c518",
                              }}
                            />
                            <div
                              style={{
                                width: 68,
                                height: 68,
                                borderRadius: "50%",
                                background: "#141715",
                                color: "#f5c518",
                                display: "grid",
                                placeItems: "center",
                                fontFamily: "var(--v2-font-head)",
                                fontWeight: 900,
                                fontSize: 24,
                              }}
                            >
                              {selectedStudy.quoteAuthor
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                          </div>
                          <div className="cs-gold-box" style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>
                              {selectedStudy.quoteAuthor}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85, lineHeight: 1.35 }}>
                              {selectedStudy.client} &middot; {selectedStudy.city}
                            </div>
                          </div>
                        </div>

                        {/* Highlighted Quote & Words From Client Lead */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
                            <span className="cs-gold-strip">
                              &ldquo;{selectedStudy.quote}&rdquo;
                            </span>
                          </p>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                              Contract Scope &amp; Escrow Structure
                            </div>
                            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#3d423f", margin: 0 }}>
                              {selectedStudy.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>ESCROW RAIL: {selectedStudy.rail.toUpperCase()}</span>
                      <span>CITY: {selectedStudy.city.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Right Page: p. 03 — Table of Contents + Executive Summary */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Table of Contents &amp; Summary</h3>
                        <span className="cs-page-num">p. 03</span>
                      </div>

                      {/* Clickable Numbered TOC matching Image 1 */}
                      <div className="cs-toc-grid" style={{ marginTop: 16, marginBottom: 20 }}>
                        {[
                          { num: "02", label: "Client Mandate", spread: "1" as const },
                          { num: "06", label: "Methodology", spread: "3" as const },
                          { num: "03", label: "Executive Summary", spread: "1" as const },
                          { num: "07", label: "Quantified Findings", spread: "3" as const },
                          { num: "04", label: "Background Info", spread: "2" as const },
                          { num: "08", label: "Milestone Ledger", spread: "4" as const },
                          { num: "05", label: "Problem Statement", spread: "2" as const },
                          { num: "09", label: "Conclusion & Next", spread: "4" as const },
                        ].map((item) => (
                          <button
                            key={item.num}
                            type="button"
                            className="cs-toc-row"
                            onClick={() => jumpToSpread(item.spread)}
                          >
                            <span className="cs-toc-num">{item.num}</span>
                            <span className="cs-toc-line" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Gold Executive Summary Block matching Image 1 */}
                      <div className="cs-gold-box" style={{ marginBottom: 18 }}>
                        <div
                          style={{
                            fontFamily: "var(--v2-font-head)",
                            fontWeight: 800,
                            fontSize: 15,
                            marginBottom: 8,
                          }}
                        >
                          Executive Summary
                        </div>
                        <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                          {selectedStudy.executiveSummary}
                        </p>
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                          Contract Conclusions
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12, lineHeight: 1.55, color: "#3d423f" }}>
                          <p style={{ margin: 0 }}>
                            <strong>100% Tranche Verification:</strong> Every birr of the {selectedStudy.budgetEtb} budget was locked prior to kickoff and released strictly upon verified deliverable approval.
                          </p>
                          <p style={{ margin: 0 }}>
                            <strong>Measurable Outcome:</strong> Achieved {selectedStudy.outcomeMetric} within {selectedStudy.timeline} across {selectedStudy.milestoneCount} structured milestones.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>CATEGORY: {selectedStudy.categoryLabel.toUpperCase()}</span>
                      <span>TOTAL: {selectedStudy.budgetEtb}</span>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* ── SPREAD 02: Background Information (p. 04) + Problem Statement (p. 05) ── */}
              {(activeSpread === "all" || activeSpread === "2") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-2`}
                  className="cs-book-spread"
                  ref={spread2Ref}
                  aria-label="Spread 2: Background Information and Problem Statement"
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.45, delay: activeSpread === "all" ? 0.06 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 04 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Background Information</h3>
                        <span className="cs-page-num">p. 04</span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 18,
                          marginTop: 18,
                          marginBottom: 20,
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#6e736f", textTransform: "uppercase" }}>
                            Operational Baseline
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, margin: "4px 0 6px" }}>
                            Historical Context
                          </div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, color: "#3d423f", margin: 0 }}>
                            {selectedStudy.historicalContext}
                          </p>
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#6e736f", textTransform: "uppercase" }}>
                            Market Landscape
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, margin: "4px 0 6px" }}>
                            Industry Overview
                          </div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, color: "#3d423f", margin: 0 }}>
                            {selectedStudy.industryOverview}
                          </p>
                        </div>
                      </div>

                      {/* Animated SVG Line Chart matching Image 1 Spread 3 Left Page */}
                      <div
                        style={{
                          background: "#f3f3ee",
                          border: "1px solid #e2e2dc",
                          borderRight: "6px solid #f5c518",
                          padding: "14px 16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                            fontSize: 11.5,
                            fontWeight: 800,
                          }}
                        >
                          <span>Delivery Velocity &amp; Verification Index (Sprint 1 → Final)</span>
                          <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#555a56" }}>
                            INDEX (0–100)
                          </span>
                        </div>
                        {renderTrendChart(selectedStudy)}
                        <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 11, fontFamily: "var(--v2-font-mono)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <i style={{ width: 8, height: 8, background: "#f5c518", border: "1px solid #141715", display: "inline-block" }} />
                            Yekis Milestone Trajectory
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#6e736f" }}>
                            <i style={{ width: 8, height: 8, background: "#9ca39e", display: "inline-block" }} />
                            Pre-Escrow Baseline
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>BASELINE AUDIT</span>
                      <span>VERIFIED BY YEKIS</span>
                    </div>
                  </div>

                  {/* Right Page: p. 05 — Problem Statement */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Problem Statement</h3>
                        <span className="cs-page-num">p. 05</span>
                      </div>

                      {/* 3 Vertical-Rule Pillars matching Image 1 */}
                      <div className="cs-problem-pillars" style={{ marginTop: 20, marginBottom: 20 }}>
                        {selectedStudy.problemPillars.map((p, idx) => (
                          <div key={p.label} className="cs-problem-pillar">
                            <span style={{ color: "#141715", display: "inline-flex", alignItems: "center", gap: 6 }}>
                              {idx === 0 ? <Target size={16} /> : idx === 1 ? <Layers size={16} /> : <Activity size={16} />}
                              <strong style={{ fontSize: 12, textTransform: "lowercase" }}>{p.label}</strong>
                            </span>
                            <p style={{ fontSize: 11.5, lineHeight: 1.55, color: "#3d423f", margin: 0 }}>
                              {p.detail}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Full-Width Gold Horizontal Bar matching Image 1 */}
                      <motion.div
                        className="cs-gold-bar"
                        style={{ marginBottom: 20, transformOrigin: "left" }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
                        <div
                          style={{
                            background: "#141715",
                            color: "#f4f7f4",
                            padding: 18,
                            borderBottom: "5px solid #f5c518",
                          }}
                        >
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#f5c518", letterSpacing: "0.1em" }}>
                            KEY BOTTLENECK
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6, lineHeight: 1.35 }}>
                            {selectedStudy.editorialHeadline}
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#292e2b", margin: "0 0 10px" }}>
                            Without milestone-locked escrow, both client procurement teams and remote specialists faced asymmetric delivery and payment risk.
                          </p>
                          <span className="cs-gold-strip" style={{ fontSize: 12 }}>
                            &ldquo;Clear milestone definitions turned risk into predictable execution.&rdquo;
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>DIAGNOSTIC REVIEW</span>
                      <span>{selectedStudy.milestoneCount} TRANCHES DEFINED</span>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* ── SPREAD 03: Methodology (p. 06) + Findings (p. 07) ── */}
              {(activeSpread === "all" || activeSpread === "3") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-3`}
                  className="cs-book-spread"
                  ref={spread3Ref}
                  aria-label="Spread 3: Methodology and Quantified Findings"
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.48, delay: activeSpread === "all" ? 0.12 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 06 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Methodology</h3>
                        <span className="cs-page-num">p. 06</span>
                      </div>

                      <div className="cs-gold-box" style={{ marginTop: 18, marginBottom: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>
                          Escrow &amp; Sprint Verification Protocol
                        </div>
                        <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                          {selectedStudy.methodologyNote}
                        </p>
                      </div>

                      {/* Data Collection Process & Year Callout matching Image 1 Spread 4 Left */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "center" }}>
                        <div style={{ border: "1px solid #141715", padding: 12 }}>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, fontWeight: 800, marginBottom: 8 }}>
                            VERIFICATION METRICS
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dfdfd9", fontSize: 12 }}>
                            <span>Escrow Locked Upfront</span>
                            <strong>100% ({selectedStudy.budgetEtb})</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dfdfd9", fontSize: 12 }}>
                            <span>First-Pass Milestone QA</span>
                            <strong>100% Approved</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
                            <span>Wallet Settlement Rail</span>
                            <strong>{selectedStudy.rail}</strong>
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontFamily: "var(--v2-font-head)",
                              fontSize: 34,
                              fontWeight: 900,
                              lineHeight: 1,
                              color: "#141715",
                            }}
                          >
                            {selectedStudy.timeline}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 12.5, marginTop: 6 }}>
                            Analytical &amp; QA Approach
                          </div>
                          <p style={{ fontSize: 11.5, lineHeight: 1.55, color: "#3d423f", margin: "4px 0 0" }}>
                            Each deliverable tranche was inspected against pre-agreed acceptance criteria before instant payout release.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>PROTOCOL: MILESTONE ESCROW</span>
                      <span>ZERO DISPUTES</span>
                    </div>
                  </div>

                  {/* Right Page: p. 07 — Findings */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Findings</h3>
                        <span className="cs-page-num">p. 07</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 16, marginBottom: 16 }}>
                        <span
                          style={{
                            fontFamily: "var(--v2-font-head)",
                            fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)",
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            lineHeight: 1,
                            color: "#141715",
                          }}
                        >
                          {selectedStudy.findingsHeadline}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#292e2b" }}>
                          {selectedStudy.findingsSub}
                        </span>
                      </div>

                      {/* 3 Gold Data Analysis KPI Cards matching Image 1 Spread 4 Right */}
                      <div style={{ fontWeight: 800, fontSize: 12.5, marginBottom: 8 }}>
                        Data Analysis &amp; Settlement Breakdown
                      </div>
                      <div className="cs-findings-kpi-grid" style={{ marginBottom: 18 }}>
                        <div className="cs-findings-kpi">
                          <span style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", textTransform: "uppercase" }}>
                            Total Escrowed
                          </span>
                          <strong style={{ fontSize: 16, fontFamily: "var(--v2-font-head)", fontWeight: 900 }}>
                            {selectedStudy.budgetEtb}
                          </strong>
                        </div>
                        <div className="cs-findings-kpi">
                          <span style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", textTransform: "uppercase" }}>
                            Tranches Released
                          </span>
                          <strong style={{ fontSize: 16, fontFamily: "var(--v2-font-head)", fontWeight: 900 }}>
                            {selectedStudy.milestoneCount} / {selectedStudy.milestoneCount}
                          </strong>
                        </div>
                        <div className="cs-findings-kpi">
                          <span style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", textTransform: "uppercase" }}>
                            Payout Speed
                          </span>
                          <strong style={{ fontSize: 16, fontFamily: "var(--v2-font-head)", fontWeight: 900 }}>
                            &lt; 15 min
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "0.38fr 0.62fr", gap: 14 }}>
                        <div className="cs-gold-box" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                            Results &amp; Observations
                          </div>
                          <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0 }}>
                            {selectedStudy.outcomeMetric} verified upon final milestone sign-off.
                          </p>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.65, color: "#292e2b" }}>
                          <li>100% of milestone funds were deposited in ETB prior to sprint commencement.</li>
                          <li>Automated receipts generated for both client accounting and freelancer wallet ledger.</li>
                          <li>Zero scope creep or delayed bank reconciliation across all {selectedStudy.milestoneCount} tranches.</li>
                        </ul>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>OUTCOME: {selectedStudy.outcomeMetric.toUpperCase()}</span>
                      <span>100% VERIFIED</span>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* ── SPREAD 04: Solutions & Milestone Ledger (p. 08) + Conclusion (p. 09) ── */}
              {(activeSpread === "all" || activeSpread === "4") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-4`}
                  className="cs-book-spread"
                  ref={spread4Ref}
                  aria-label="Spread 4: Solutions, Milestone Ledger and Conclusion"
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.5, delay: activeSpread === "all" ? 0.18 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 08 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Solutions &amp; Milestone Ledger</h3>
                        <span className="cs-page-num">p. 08</span>
                      </div>

                      {/* Animated Radial Progress Rings matching Image 1 Spread 5 Left */}
                      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16, marginBottom: 18, flexWrap: "wrap" }}>
                        {[
                          { pct: "100%", label: "Milestones Approved", dash: 113 },
                          { pct: "95%", label: "Net Talent Payout", dash: 107 },
                        ].map((ring) => (
                          <div key={ring.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <svg width="46" height="46" viewBox="0 0 46 46">
                              <circle cx="23" cy="23" r="18" fill="none" stroke="#e2e2dc" strokeWidth="5" />
                              <motion.circle
                                key={`${selectedStudy.id}-${ring.label}`}
                                cx="23"
                                cy="23"
                                r="18"
                                fill="none"
                                stroke="#f5c518"
                                strokeWidth="5"
                                strokeDasharray="113"
                                initial={{ strokeDashoffset: 113 }}
                                animate={{ strokeDashoffset: 113 - ring.dash }}
                                transition={{ duration: 0.9, ease: "easeOut" }}
                                strokeLinecap="round"
                              />
                              <text
                                x="23"
                                y="26"
                                textAnchor="middle"
                                fontSize="9.5"
                                fontWeight="800"
                                fill="#141715"
                              >
                                {ring.pct}
                              </text>
                            </svg>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#141715" }}>{ring.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Complete Milestone Tranche Ledger Table */}
                      <table className="cs-ledger-table">
                        <thead>
                          <tr>
                            <th>Milestone Deliverable</th>
                            <th>Window</th>
                            <th>Escrow Tranche</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudy.milestones.map((ms) => (
                            <tr key={ms.title}>
                              <td style={{ fontWeight: 700 }}>{ms.title}</td>
                              <td style={{ fontFamily: "var(--v2-font-mono)", color: "#555a56" }}>{ms.duration}</td>
                              <td style={{ fontFamily: "var(--v2-font-mono)", fontWeight: 800 }}>{ms.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>ALL {selectedStudy.milestoneCount} TRANCHES RELEASED</span>
                      <span>TOTAL: {selectedStudy.budgetEtb}</span>
                    </div>
                  </div>

                  {/* Right Page: p. 09 — Conclusion & Launch Action */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">Conclusion</h3>
                        <span className="cs-page-num">p. 09</span>
                      </div>

                      {/* Gold Quotation Callout Box matching Image 1 Spread 5 Right */}
                      <div className="cs-gold-box" style={{ marginTop: 18, marginBottom: 20 }}>
                        <div style={{ fontFamily: "var(--v2-font-head)", fontSize: 22, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
                          &ldquo;
                        </div>
                        <p style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.55, margin: 0 }}>
                          {selectedStudy.quote}
                        </p>
                        <div style={{ fontSize: 11, marginTop: 6, fontFamily: "var(--v2-font-mono)" }}>
                          — {selectedStudy.quoteAuthor}, {selectedStudy.quoteRole}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "1.5px solid #141715",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Award size={14} />
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>Final Thoughts</div>
                            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#3d423f", margin: "2px 0 0" }}>
                              {selectedStudy.finalThought}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "1.5px solid #141715",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Sparkles size={14} />
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>Implications For Future</div>
                            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#3d423f", margin: "2px 0 0" }}>
                              {selectedStudy.futureImplication}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleStartProject}
                          style={{
                            background: "#141715",
                            color: "#f5c518",
                            border: "none",
                            borderRadius: 6,
                            padding: "11px 18px",
                            fontFamily: "var(--v2-font-head)",
                            fontWeight: 800,
                            fontSize: 13.5,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>Post a Similar Project</span>
                          <ArrowUpRight size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudy(null);
                            onNavigate("fees");
                          }}
                          style={{
                            background: "transparent",
                            color: "#141715",
                            border: "1.5px solid #141715",
                            borderRadius: 6,
                            padding: "10px 16px",
                            fontFamily: "var(--v2-font-head)",
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          Calculate Escrow Fees
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>YEKIS CASE STUDY DOSSIER</span>
                      <span>END OF REPORT</span>
                    </div>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="yk-v2 yk-v2-subpage yk-cs-studio">
      {/* ── SECTION 1: Dark Studio Hero (Pure Visual Attraction & Motion) ── */}
      <section className="cs-hero-band" aria-label="Case Studies Studio Hero">
        <div className="cs-band-inner">
          <motion.div
            className="cs-hero-top"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="cs-hero-display">
              we prove{" "}
              <motion.span
                className="cs-hero-brace"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 16 }}
              >
                &#123;
              </motion.span>
              escrow
              <motion.span
                className="cs-hero-brace"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.26, type: "spring", stiffness: 260, damping: 16 }}
              >
                &#125;
              </motion.span>
              <br />
              <motion.span
                className="cs-hero-arrow"
                initial={{ x: -18, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.34, duration: 0.5 }}
              >
                &rarr;
              </motion.span>
              results in practice
            </h1>
          </motion.div>

          {/* Pure Visual 3D Sculptural Diptych Frames with Living Motion & Hover-Only Pill */}
          <motion.div
            className="cs-hero-diptych"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltVisualSurface
              className="cs-hero-art-frame"
              onClick={() => openStudyDossier(CASE_STUDIES[0])}
              ariaLabel="Inspect Abyssinia Logistics case study dossier"
            >
              <svg className="cs-hero-art-svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="hero-orb-1" cx="44%" cy="38%" r="54%">
                    <stop offset="0%" stopColor="#9ae85c" />
                    <stop offset="48%" stopColor="#4f9428" />
                    <stop offset="100%" stopColor="#081106" />
                  </radialGradient>
                  <radialGradient id="hero-Stage-Glow-1" cx="50%" cy="54%" r="58%">
                    <stop offset="0%" stopColor="rgba(116,184,67,0.34)" />
                    <stop offset="100%" stopColor="rgba(7,10,8,0)" />
                  </radialGradient>
                </defs>
                <rect width="600" height="380" fill="#080d09" />
                <circle className="cs-svg-pulse" cx="300" cy="200" r="210" fill="url(#hero-Stage-Glow-1)" />
                {/* Architectural Isometric Plinth */}
                <polygon
                  className="cs-svg-float-alt"
                  points="95,215 300,105 505,215 300,325"
                  fill="#111c13"
                  stroke="rgba(138,212,83,0.28)"
                  strokeWidth="1.5"
                />
                {/* Recessed Well & Orbital Ring */}
                <ellipse
                  className="cs-svg-orbit"
                  cx="300"
                  cy="212"
                  rx="132"
                  ry="68"
                  fill="none"
                  stroke="rgba(154,232,92,0.24)"
                  strokeWidth="1.5"
                  strokeDasharray="8 6"
                />
                <ellipse cx="300" cy="212" rx="108" ry="56" fill="#060a07" stroke="rgba(116,184,67,0.22)" />
                {/* Levitating Emerald Sphere */}
                <circle className="cs-svg-float" cx="300" cy="184" r="64" fill="url(#hero-orb-1)" />
              </svg>
              <span className="cs-hero-hover-pill">
                <span>&#123; 01 &middot; INSPECT DOSSIER &#125;</span>
                <ArrowUpRight size={13} />
              </span>
            </TiltVisualSurface>

            <TiltVisualSurface
              className="cs-hero-art-frame"
              onClick={() => openStudyDossier(CASE_STUDIES[1])}
              ariaLabel="Inspect Kaffa Specialty Export case study dossier"
            >
              <svg className="cs-hero-art-svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="hero-orb-2" cx="42%" cy="38%" r="55%">
                    <stop offset="0%" stopColor="#a3e668" />
                    <stop offset="56%" stopColor="#35681c" />
                    <stop offset="100%" stopColor="#070d08" />
                  </radialGradient>
                  <linearGradient id="hero-ribbon-2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#5ea030" />
                    <stop offset="100%" stopColor="#172d11" />
                  </linearGradient>
                </defs>
                <rect width="600" height="380" fill="#080d09" />
                {/* Fluid Sculptural Ribbon */}
                <path
                  className="cs-svg-float-alt"
                  d="M70,325 C155,175 260,115 340,260 C412,360 492,195 545,82"
                  fill="none"
                  stroke="url(#hero-ribbon-2)"
                  strokeWidth="38"
                  strokeLinecap="round"
                />
                {/* Rotating Torus Ring */}
                <circle
                  className="cs-svg-orbit"
                  cx="412"
                  cy="134"
                  r="56"
                  fill="none"
                  stroke="url(#hero-orb-2)"
                  strokeWidth="22"
                  strokeDasharray="180 28"
                />
                {/* Isometric Pedestal + Levitating Sphere */}
                <polygon
                  className="cs-svg-float"
                  points="210,278 330,234 420,278 300,322"
                  fill="#142215"
                  stroke="rgba(138,212,83,0.3)"
                />
                <circle className="cs-svg-float" cx="315" cy="238" r="30" fill="url(#hero-orb-2)" />
              </svg>
              <span className="cs-hero-hover-pill">
                <span>&#123; 02 &middot; INSPECT DOSSIER &#125;</span>
                <ArrowUpRight size={13} />
              </span>
            </TiltVisualSurface>
          </motion.div>

          <motion.div
            className="cs-hero-foot"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <p className="cs-hero-tagline">
              The benchmark for milestone-verified engineering, brand identity, and regional execution across Ethiopia.
            </p>
            <button
              type="button"
              className="cs-scroll-pill"
              onClick={() => worksSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              &#123; SCROLL &darr; &#125;
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: Crisp White { PROOF } Manifesto Band (Image 2 Second Band) ── */}
      <section className="cs-manifesto-band" aria-label="Our Approach and Proof">
        <div className="cs-band-inner">
          <motion.div
            className="cs-manifesto-grid"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            {/* Giant Sculptural { PROOF } Emblem with Breathing Motion */}
            <motion.div
              className="cs-brace-emblem"
              aria-hidden="true"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="cs-brace-emblem-char">&#123;</span>
              <span className="cs-brace-emblem-word">PROOF</span>
              <span className="cs-brace-emblem-char">&#125;</span>
            </motion.div>

            <div>
              <h2 className="cs-manifesto-title">
                Great delivery is more than just promises—it’s about clear milestones, verified work, and measurable impact.
              </h2>

              <div className="cs-manifesto-subgrid">
                <div className="cs-manifesto-kicker">&rarr; OUR APPROACH</div>
                <div>
                  <p className="cs-manifesto-copy">
                    We connect ambitious Ethiopian enterprises and NGOs with verified specialists who deliver on schedule. Whether you’re{" "}
                    <span className="cs-green-highlight">
                      launching a new product or modernizing regional operations, every birr is protected in escrow until milestone approval.
                    </span>
                  </p>
                  <button
                    type="button"
                    className="cs-inline-underline-btn"
                    onClick={() => openStudyDossier(CASE_STUDIES[0])}
                  >
                    <span>(See how we structure milestone dossiers)</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: Warm Alabaster { SELECTED WORK } Staggered Showcase (Image 2 Third Band) ── */}
      <section className="cs-works-band" ref={worksSectionRef} aria-label="Selected Case Studies">
        <div className="cs-band-inner">
          <motion.div
            className="cs-works-topbar"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <span className="cs-kicker" style={{ color: "#0e1410" }}>
              &#123; SELECTED WORK &#125;
            </span>

            <div className="cs-works-tabs" role="tablist" aria-label="Filter case studies by discipline">
              {categories.map((cat) => {
                const count =
                  cat.id === "ALL"
                    ? CASE_STUDIES.length
                    : CASE_STUDIES.filter((s) => s.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`cs-works-tab ${activeCategory === cat.id ? "is-active" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Staggered 2-Column Asymmetric Project Cards with Layout & 3D Tilt */}
          <motion.div className="cs-stagger-grid" layout>
            <AnimatePresence mode="popLayout">
              {filteredStudies.map((study, idx) => (
                <motion.div
                  key={study.id}
                  layout
                  className="cs-work-item"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.55, delay: (idx % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <article
                    className="cs-work-card"
                    onClick={() => openStudyDossier(study)}
                  >
                    <TiltVisualSurface
                      className="cs-work-visual"
                      magneticLabel="OPEN DOSSIER"
                    >
                      <ProjectSculpturalArt variant={study.artVariant} />
                      <div className="cs-work-visual-top">
                        <span>&#123; {study.index} &middot; {study.categoryLabel} &#125;</span>
                        <span>{study.budgetEtb}</span>
                      </div>
                      <div className="cs-work-visual-bottom">
                        <span
                          style={{
                            background: "rgba(9, 16, 6, 0.72)",
                            padding: "5px 10px",
                            borderRadius: 4,
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          {study.outcomeMetric}
                        </span>
                        <span
                          style={{
                            background: "#f5c518",
                            color: "#141715",
                            fontWeight: 800,
                            padding: "5px 10px",
                            borderRadius: 4,
                          }}
                        >
                          OPEN DOSSIER &rarr;
                        </span>
                      </div>
                    </TiltVisualSurface>

                    <h3 className="cs-work-headline">{study.editorialHeadline}</h3>

                    <div className="cs-work-meta">
                      <span>
                        Client:{" "}
                        <button
                          type="button"
                          className="cs-work-company-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudyDossier(study);
                          }}
                        >
                          {study.clientShort}
                        </button>{" "}
                        &middot; {study.city}
                      </span>
                      <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 12 }}>
                        {study.milestoneCount} Milestones &middot; {study.timeline}
                      </span>
                    </div>
                  </article>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="cs-works-footer-row">
            <button
              type="button"
              className="cs-see-all-btn"
              onClick={() => openStudyDossier(filteredStudies[0] ?? CASE_STUDIES[0])}
            >
              <span>&rarr; Open full editorial dossier &#123;0{CASE_STUDIES.length}&#125;</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Crisp White { DISCIPLINES } Interactive Stack (Image 2 Fourth Band) ── */}
      <section className="cs-services-band" aria-label="Marketplace Disciplines">
        <div className="cs-band-inner">
          <motion.div
            className="cs-services-grid"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="cs-kicker" style={{ color: "#0e1410", alignSelf: "start", paddingTop: 14 }}>
              &#123; SERVICES &#125;
            </div>

            <div className="cs-services-stack" role="tablist" aria-label="Select discipline">
              {DISCIPLINES.map((disc) => {
                const isActive = disc.id === activeDiscipline;
                return (
                  <motion.button
                    key={disc.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`cs-service-item ${isActive ? "is-active" : ""}`}
                    onClick={() => setActiveDiscipline(disc.id)}
                    onMouseEnter={() => setActiveDiscipline(disc.id)}
                    whileHover={{ x: 8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    {isActive && <span className="cs-service-brace">&#123;</span>}
                    <span>{disc.title}</span>
                    {isActive && <span className="cs-service-brace">&#125;</span>}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {(() => {
                const featuredStudy =
                  CASE_STUDIES.find((s) => s.id === currentDiscipline.featuredStudyId) ?? CASE_STUDIES[0];
                return (
                  <motion.div
                    key={currentDiscipline.id}
                    className="cs-service-preview"
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.28 }}
                  >
                    <div
                      className="cs-fluted-card"
                      onClick={() => openStudyDossier(featuredStudy)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect ${currentDiscipline.title} featured dossier: ${featuredStudy.clientShort}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openStudyDossier(featuredStudy);
                        }
                      }}
                    >
                      {/* Distinct 3D Sculptural Artwork per Discipline */}
                      <div style={{ position: "absolute", inset: 0, opacity: 0.72, zIndex: 0 }}>
                        <ProjectSculpturalArt variant={featuredStudy.artVariant} />
                      </div>

                      {/* Top Metadata Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          fontFamily: "var(--v2-font-mono)",
                          fontSize: 10.5,
                          letterSpacing: "0.12em",
                        }}
                      >
                        <span>&#123; {currentDiscipline.avgTranches.toUpperCase()} &#125;</span>
                        <span
                          style={{
                            background: "rgba(9, 16, 7, 0.75)",
                            border: "1px solid rgba(163, 230, 104, 0.35)",
                            padding: "3px 8px",
                            borderRadius: 4,
                            color: "#a3e668",
                          }}
                        >
                          DOSSIER #{featuredStudy.index}
                        </span>
                      </div>

                      {/* Center Discipline Showcase: Featured Project, Outcome Metric & Milestone Tranches */}
                      <div
                        style={{
                          background: "rgba(8, 15, 7, 0.76)",
                          border: "1px solid rgba(163, 230, 104, 0.24)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          borderRadius: 6,
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", color: "#a3e668", textTransform: "uppercase" }}>
                              Featured {currentDiscipline.title} Proof
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#ffffff", marginTop: 2 }}>
                              {featuredStudy.clientShort} &middot; {featuredStudy.city}
                            </div>
                          </div>
                          <span
                            style={{
                              background: "#f5c518",
                              color: "#141715",
                              fontFamily: "var(--v2-font-mono)",
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: "4px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {featuredStudy.outcomeMetric}
                          </span>
                        </div>

                        {/* Live Milestone Tranche Breakdown for this Service */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                          {featuredStudy.milestones.slice(0, 3).map((ms, i) => (
                            <div
                              key={ms.title}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                fontSize: 11.5,
                              }}
                            >
                              <span style={{ color: "rgba(244,247,244,0.88)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <strong style={{ fontFamily: "var(--v2-font-mono)", color: "#a3e668", marginRight: 6 }}>
                                  0{i + 1}
                                </strong>
                                {ms.title}
                              </span>
                              <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 11, fontWeight: 700, color: "#ffffff", flexShrink: 0 }}>
                                {ms.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Price & Rail Row */}
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, opacity: 0.82, marginBottom: 3 }}>Typical Escrow Range</div>
                          <div style={{ fontFamily: "var(--v2-font-head)", fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>
                            {currentDiscipline.escrowRange}
                          </div>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, marginTop: 6, color: "#a3e668" }}>
                            {currentDiscipline.rails}
                          </div>
                        </div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontFamily: "var(--v2-font-mono)",
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: "#f5c518",
                            flexShrink: 0,
                          }}
                        >
                          <span>OPEN</span>
                          <ArrowUpRight size={13} />
                        </span>
                      </div>
                    </div>

                    <p className="cs-service-preview-copy">{currentDiscipline.description}</p>
                    <button
                      type="button"
                      className="cs-inline-underline-btn"
                      style={{ marginTop: 4, alignSelf: "flex-start" }}
                      onClick={() => openStudyDossier(featuredStudy)}
                    >
                      <span>Inspect {currentDiscipline.title} dossier ({featuredStudy.clientShort}) &rarr;</span>
                    </button>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 5: Vibrant Studio Green { TESTIMONIALS } Band (Image 2 Fifth Band) ── */}
      <section className="cs-testi-band" aria-label="Client Testimonials">
        <div className="cs-band-inner">
          <motion.div
            className="cs-testi-grid"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="cs-testi-left">
              <span className="cs-kicker" style={{ color: "#0c1409" }}>
                &#123; TESTIMONIALS &#125;
              </span>

              <div className="cs-testi-authors" role="tablist" aria-label="Choose client testimonial">
                {CASE_STUDIES.map((study, idx) => (
                  <button
                    key={study.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeTestimonialIdx}
                    className={`cs-testi-author-btn ${idx === activeTestimonialIdx ? "is-active" : ""}`}
                    onClick={() => setActiveTestimonialIdx(idx)}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{study.quoteAuthor}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.78 }}>{study.clientShort} &middot; {study.city}</div>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <blockquote className="cs-testi-quote">
                  &ldquo;{activeTestimonial.quote}&rdquo;
                </blockquote>

                <button
                  type="button"
                  className="cs-testi-link"
                  onClick={() => openStudyDossier(activeTestimonial)}
                >
                  <span>Read {activeTestimonial.clientShort} (case study dossier)</span>
                  <ArrowUpRight size={15} />
                </button>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 6: Dark Obsidian Studio CTA Band (Image 2 Bottom Band) ── */}
      <section className="cs-outro-band" aria-label="Start a milestone project">
        <div className="cs-band-inner">
          <motion.div
            className="cs-outro-grid"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div>
              <h2 className="cs-outro-title">
                Got a project in mind?
                <br />
                Let’s fund it safely.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(244,247,244,0.72)", maxWidth: 460, marginBottom: 28 }}>
                Post your scope for free, lock funds in ETB via Telebirr, CBE Birr, or M-Pesa only when you hire, and release payment milestone by milestone.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  onClick={handleStartProject}
                >
                  <Briefcase size={17} />
                  <span>{t.marketing.cta.postJob}</span>
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary"
                  onClick={() => onNavigate("fees")}
                >
                  <Wallet size={17} />
                  <span>Calculate Escrow Fees</span>
                </button>
              </div>
            </div>

            <motion.div
              className="cs-outro-brace-stage"
              animate={{ scale: [1, 1.025, 1] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="cs-outro-giant-brace" aria-hidden="true">&#123;</span>
              <button
                type="button"
                className="cs-outro-pill-btn"
                onClick={handleStartProject}
              >
                &#123;start-project@yekis.et&#125;
              </button>
              <span className="cs-outro-giant-brace" aria-hidden="true">&#125;</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Render Two-Page Editorial Dossier Viewer at document.body level */}
      {typeof document !== "undefined"
        ? createPortal(dossierModal, document.body)
        : dossierModal}
    </div>
  );
}
