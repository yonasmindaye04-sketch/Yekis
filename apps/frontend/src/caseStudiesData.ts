import { type Language } from "./i18n";

export type CaseCategory =
  | "ALL"
  | "ENGINEERING"
  | "DESIGN"
  | "MARKETING"
  | "LOCALIZATION"
  | "DATA";

export type ProblemPillar = {
  label: string;
  detail: string;
};

export type CaseStudyItem = {
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

export type DisciplineItem = {
  id: Exclude<CaseCategory, "ALL">;
  title: string;
  escrowRange: string;
  avgTranches: string;
  description: string;
  rails: string;
  featuredStudyId: string;
};

export type CaseStudiesCopy = {
  breadcrumbHome: string;
  breadcrumbCases: string;
  filterPrefix: string;
  feesTag: string;
  feesLabel: string;
  studioTag: string;
  aboutLabel: string;
  heroSectionAria: string;
  heroPrefix: string;
  heroBraceWord: string;
  heroSuffix: string;
  hoverDossier01: string;
  hoverDossier02: string;
  hoverAria01: string;
  hoverAria02: string;
  heroTagline: string;
  scrollPill: string;
  manifestoAria: string;
  proofBraceWord: string;
  proofSegments: { text: string; highlight?: boolean }[];
  kpiVolumeSuffix: string;
  kpiVolumeLabel: string;
  kpiPhasesSuffix: string;
  kpiPhasesLabel: string;
  kpiReleaseLabel: string;
  worksAria: string;
  selectedWorkKicker: string;
  filterAria: string;
  categories: { id: CaseCategory; label: string }[];
  openDossierPill: string;
  openDossierBtn: string;
  clientPrefix: string;
  milestonesLabel: string;
  openFullDossier: string;
  servicesAria: string;
  servicesKicker: string;
  rowEscrowRange: string;
  rowSettlement: string;
  rowTranches: string;
  testimonialsAria: string;
  testimonialsKicker: string;
  chooseTestimonialAria: string;
  readDossierPrefix: string;
  readDossierSuffix: string;
  outroAria: string;
  outroTitleLine1: string;
  outroTitleLine2: string;
  outroSubtitle: string;
  calculateFees: string;
  outroPillEmail: string;
  modal: {
    dossierPrefix: string;
    prevAria: string;
    nextAria: string;
    closeAria: string;
    spreadTabsAria: string;
    tabs: { id: "all" | "1" | "2" | "3" | "4"; label: string }[];
    spread1Aria: string;
    clientMandateTitle: string;
    contractScopeTitle: string;
    escrowRailPrefix: string;
    cityPrefix: string;
    tocSummaryTitle: string;
    tocRows: { num: string; label: string; spread: "1" | "2" | "3" | "4" }[];
    execSummaryTitle: string;
    contractConclusionsTitle: string;
    conclusion1Title: string;
    conclusion1Body: (budget: string) => string;
    conclusion2Title: string;
    conclusion2Body: (metric: string, timeline: string, count: number) => string;
    categoryPrefix: string;
    totalPrefix: string;
    spread2Aria: string;
    bgInfoTitle: string;
    opBaselineLabel: string;
    histContextTitle: string;
    marketLandscapeLabel: string;
    industryOverviewTitle: string;
    chartTitle: string;
    chartIndexLabel: string;
    chartLegendAfter: string;
    chartLegendBefore: string;
    baselineAuditFoot: string;
    verifiedFoot: string;
    problemStatementTitle: string;
    keyBottleneck: string;
    problemRiskParagraph: string;
    problemRiskQuote: string;
    diagnosticFoot: string;
    tranchesDefinedSuffix: string;
    spread3Aria: string;
    methodologyTitle: string;
    protocolTitle: string;
    verificationMetricsTitle: string;
    metricLocked: string;
    metricFirstPass: string;
    metricApproved: string;
    metricRail: string;
    qaApproachTitle: string;
    qaApproachBody: string;
    protocolFoot: string;
    zeroDisputesFoot: string;
    findingsTitle: string;
    breakdownTitle: string;
    kpiEscrowed: string;
    kpiReleased: string;
    kpiPayoutSpeed: string;
    kpiPayoutVal: string;
    resultsObsTitle: string;
    resultsObsSuffix: string;
    findingsBullets: (count: number) => string[];
    outcomeFootPrefix: string;
    verified100Foot: string;
    spread4Aria: string;
    solutionsTitle: string;
    ringApproved: string;
    ringNetPayout: string;
    thDeliverable: string;
    thWindow: string;
    thTranche: string;
    allTranchesFoot: (count: number) => string;
    conclusionTitle: string;
    finalThoughtsTitle: string;
    futureTitle: string;
    postSimilar: string;
    dossierFoot: string;
    endReportFoot: string;
  };
};

type StudyTranslationFields = Omit<
  CaseStudyItem,
  "id" | "index" | "category" | "milestoneCount" | "chartBefore" | "chartAfter" | "artVariant"
>;

const STUDY_BASE: Pick<
  CaseStudyItem,
  "id" | "index" | "category" | "milestoneCount" | "chartBefore" | "chartAfter" | "artVariant"
>[] = [
  {
    id: "cs-abyssinia-fleet",
    index: "01",
    category: "ENGINEERING",
    milestoneCount: 4,
    chartBefore: [28, 34, 31, 39, 42, 45],
    chartAfter: [40, 58, 72, 84, 91, 96],
    artVariant: "monolith",
  },
  {
    id: "cs-kaffa-coffee",
    index: "02",
    category: "DESIGN",
    milestoneCount: 3,
    chartBefore: [20, 24, 22, 26, 29, 30],
    chartAfter: [35, 52, 68, 79, 88, 95],
    artVariant: "botanical",
  },
  {
    id: "cs-zemen-localization",
    index: "03",
    category: "LOCALIZATION",
    milestoneCount: 3,
    chartBefore: [18, 22, 25, 29, 31, 35],
    chartAfter: [42, 60, 74, 86, 94, 100],
    artVariant: "acoustic",
  },
  {
    id: "cs-sheger-growth",
    index: "04",
    category: "MARKETING",
    milestoneCount: 3,
    chartBefore: [22, 26, 24, 28, 30, 32],
    chartAfter: [38, 54, 71, 83, 90, 97],
    artVariant: "prism",
  },
  {
    id: "cs-tigray-agri-data",
    index: "05",
    category: "DATA",
    milestoneCount: 4,
    chartBefore: [15, 19, 21, 20, 24, 26],
    chartAfter: [36, 55, 69, 82, 91, 96],
    artVariant: "lattice",
  },
  {
    id: "cs-diredawa-portal",
    index: "06",
    category: "ENGINEERING",
    milestoneCount: 4,
    chartBefore: [24, 28, 27, 31, 33, 36],
    chartAfter: [45, 62, 76, 87, 94, 100],
    artVariant: "vault",
  },
];

const STUDIES_BY_LANG: Record<Language, StudyTranslationFields[]> = {
  en: [
    {
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
      rail: "Telebirr & CBE Birr",
      quote:
        "Approving each milestone released payment immediately. Our lead developer in Bahir Dar delivered every sprint ahead of schedule with zero payment friction.",
      quoteAuthor: "Yared K.",
      quoteRole: "Operations Director · Abyssinia Freight, Addis Ababa",
      outcomeMetric: "-68% dispatch reconciliation time",
      finalThought:
        "Milestone escrow allowed an Addis logistics operator to hire senior engineering talent in Bahir Dar with complete technical and financial accountability.",
      futureImplication:
        "Phase 2 expands automated customs clearance alerts along the Addis–Djibouti corridor using the same 4-tranche milestone structure.",
      milestones: [
        { title: "01 · System Architecture & API Schema", amount: "15,000 ETB", duration: "4 days" },
        { title: "02 · Dispatcher Web Dashboard & Live Map", amount: "30,000 ETB", duration: "7 days" },
        { title: "03 · Driver Mobile Check-In & Telebirr Webhook", amount: "25,000 ETB", duration: "6 days" },
        { title: "04 · Load Testing, QA & Production Handover", amount: "15,000 ETB", duration: "4 days" },
      ],
    },
    {
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
      rail: "CBE Birr",
      quote:
        "Escrow gave our union board confidence to hire a top Addis studio remotely. We reviewed print-ready proofs inside Yekis before releasing each tranche.",
      quoteAuthor: "Meron G.",
      quoteRole: "Export Marketing Lead · Kaffa Union, Hawassa",
      outcomeMetric: "3 international buyer contracts signed",
      finalThought:
        "Structured proof reviews eliminated cross-city trust barriers between a Hawassa agricultural union and a specialized Addis packaging studio.",
      futureImplication:
        "The union now commissions seasonal harvest lookbooks every quarter through recurring Yekis milestone templates.",
      milestones: [
        { title: "01 · Brand Strategy, Wordmark & Color System", amount: "15,000 ETB", duration: "5 days" },
        { title: "02 · 250g & 1kg Export Bag Print Dielines", amount: "18,000 ETB", duration: "5 days" },
        { title: "03 · Digital Buyer Deck & Brand Guidelines", amount: "12,000 ETB", duration: "4 days" },
      ],
    },
    {
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
      rail: "Telebirr",
      quote:
        "Hiring three certified linguists through Yekis with TIN-compliant receipts saved our finance team weeks of grant auditing paperwork.",
      quoteAuthor: "Dr. Sara M.",
      quoteRole: "Program Coordinator · Biruh Health, Bahir Dar",
      outcomeMetric: "180 modules localized with 100% clinical QA",
      finalThought:
        "Locking the clinical glossary as Milestone 01 prevented downstream rework and guaranteed uniform terminology across all 180 lessons.",
      futureImplication:
        "Expanded to Somali and Sidama language packs using the same three-stage clinical verification protocol.",
      milestones: [
        { title: "01 · Medical Glossary & Terminology Alignment", amount: "8,000 ETB", duration: "2 days" },
        { title: "02 · UI Strings & Lesson Script Translation", amount: "18,000 ETB", duration: "5 days" },
        { title: "03 · Native Audio Prompts & In-App Linguistic QA", amount: "12,000 ETB", duration: "3 days" },
      ],
    },
    {
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
      rail: "Telebirr",
      quote:
        "We tied every milestone to verified creative deliverables and campaign setup. Sales inquiries on our Telegram channel tripled in the first two weeks.",
      quoteAuthor: "Hanna G.",
      quoteRole: "Founder · Sheger Retail Group, Addis Ababa",
      outcomeMetric: "3.4x return on campaign spend",
      finalThought:
        "Deliverable-linked escrow aligned creative production speed with measurable Telegram funnel conversion.",
      futureImplication:
        "Sheger Retail now runs every seasonal product drop through 3-tranche creative + bot performance contracts.",
      milestones: [
        { title: "01 · Creative Scripting & 6 Studio Video Reels", amount: "20,000 ETB", duration: "10 days" },
        { title: "02 · Telegram Catalog Funnel & Pixel Tracking", amount: "14,000 ETB", duration: "7 days" },
        { title: "03 · Second Batch Reels & Conversion Optimization", amount: "18,000 ETB", duration: "11 days" },
      ],
    },
    {
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
      rail: "CBE Birr",
      quote:
        "Every dataset delivery was verified in the milestone workspace before release. Our analysts now publish weekly market briefs in 15 minutes instead of 3 days.",
      quoteAuthor: "Betty A.",
      quoteRole: "Operations Lead · Highlands Co-op, Mekelle",
      outcomeMetric: "42,000+ historical records structured",
      finalThought:
        "Verifying data quality at each milestone stage ensured the final BI dashboard launched on clean, trusted historical series.",
      futureImplication:
        "Automated SMS price feeds from 18 additional woreda markets are now ingested directly into the schema.",
      milestones: [
        { title: "01 · Historical CSV/Excel Cleaning & Deduplication", amount: "16,000 ETB", duration: "5 days" },
        { title: "02 · Automated Mobile Data Collection Schema", amount: "16,000 ETB", duration: "5 days" },
        { title: "03 · Executive Price & Inventory Dashboard", amount: "20,000 ETB", duration: "6 days" },
        { title: "04 · Staff Training & Documentation Handover", amount: "12,000 ETB", duration: "5 days" },
      ],
    },
    {
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
      rail: "CBE Birr & M-Pesa",
      quote:
        "Splitting a 110,000 ETB build into four clear milestones kept both our procurement team and the freelance engineering squad 100% aligned.",
      quoteAuthor: "Nardos A.",
      quoteRole: "Technical Lead · East Rift Manufacturing, Dire Dawa",
      outcomeMetric: "100% digital pro-forma workflow",
      finalThought:
        "Four-tranche milestone escrow made a 110,000 ETB enterprise build predictable, transparent, and risk-free for both sides.",
      futureImplication:
        "Now onboarding 60+ regional raw-material suppliers onto the automated pro-forma portal.",
      milestones: [
        { title: "01 · Role-Based Auth & Supplier Onboarding Flow", amount: "25,000 ETB", duration: "8 days" },
        { title: "02 · Pro-Forma Invoice & Customs Document Engine", amount: "35,000 ETB", duration: "10 days" },
        { title: "03 · Automated Telegram & SMS Alert Integration", amount: "28,000 ETB", duration: "9 days" },
        { title: "04 · Security Audit & Cloud Deployment", amount: "22,000 ETB", duration: "8 days" },
      ],
    },
  ],
  am: [
    {
      categoryLabel: "ድረ-ገጽ እና ሞባይል ኢንጂነሪንግ",
      title: "የአቢሲኒያ ሎጂስቲክስ የጭነት መቆጣጠሪያ እና የቴሌብር የአሽከርካሪዎች ክፍያ ፖርታል",
      editorialHeadline:
        "ከእጅ የተሠራ ኤክሴል መዝገብ ወደ አውቶማቲክ የቴሌብር የአሽከርካሪዎች ክፍያ ለ140+ የማቀዝቀዣ ተሽከርካሪዎች",
      client: "አቢሲኒያ ፍሬይት እና ኮልድ-ቼይን ኃ.የተ.የግ.ማ",
      clientShort: "አቢሲኒያ ፍሬይት",
      city: "አዲስ አበባ",
      summary:
        "ከ140 በላይ ተሽከርካሪዎች ላይ የእጅ ኤክሴል ሂሳብ ማስታረቅን በመተካት ቀጥታ የፍሊት ክትትል ድረ-ገጽ እና አውቶማቲክ የቴሌብር የጉዞ አበል መክፈያ የሞባይል ፖርታል ተገነባ።",
      executiveSummary:
        "አቢሲኒያ ፍሬይት የ85,000 ብር የኢንጂነሪንግ ውልን በYeKis ላይ በአራት የኤስክሮ ምዕራፎች አዋቀረ። እያንዳንዱ ስፕሪንት ገንዘብ ከመለቀቁ በፊት በሙከራ አካባቢ ተገምግሞ በ21 ቀናት ውስጥ የማስታረቅ ጊዜን በ68% ቀንሷል።",
      historicalContext:
        "በምዕራፍ ከተደገፈ የርቀት ቅጥር በፊት ተቆጣጣሪዎች በአምስት የክልል ማዕከላት የነዳጅ እና የጉዞ አበልን በወረቀት እና በስልክ ያስተካክሉ ነበር፤ ይህም የ4 ቀናት የክፍያ መዘግየት ያስከትል ነበር።",
      industryOverview:
        "የኢትዮጵያ የማቀዝቀዣ እና የጭነት ኩባንያዎች የረጅም ርቀት አሽከርካሪዎችን በጊዜው ለማንቀሳቀስ ቀጥታ የGPS ፍተሻ እና ፈጣን የሞባይል ገንዘብ ክፍያ ይፈልጋሉ።",
      problemPillars: [
        {
          label: "ተግዳሮቱን መለየት",
          detail: "140+ ንቁ ተሽከርካሪዎች ለጉዞ አበል ማረጋገጫ እና ለባንክ ፊርማ እስከ 96 ሰዓታት ይጠብቁ ነበር።",
        },
        {
          label: "የችግሩ ስፋት",
          detail: "አምስት የኮሪደር ኬላዎች የተዋሃደ የዲጂታል ማስረከቢያ ማረጋገጫ ወይም አውቶማቲክ የቴሌብር ክፍያ አልነበራቸውም።",
        },
        {
          label: "የችግሩ ተጽዕኖ",
          detail: "የፋይናንስ ሠራተኞች የወረቀት ደረሰኞችን በመመርመር በየሳምንቱ 28 ሰዓታት ያጠፉ ነበር።",
        },
      ],
      methodologyNote:
        "ሥራው በአራት የኤስክሮ ስፕሪንቶች ተከፈለ፡ የሲስተም መዋቅር፣ የቀጥታ የመቆጣጠሪያ ካርታ፣ የአሽከርካሪ ሞባይል መግቢያ ከቴሌብር ጋር እና በ140 ተጠቃሚዎች ላይ የጭነት ሙከራ።",
      findingsHeadline: "-68%",
      findingsSub: "በሳምንታዊ የመቆጣጠሪያ እና የአሽከርካሪ አበል ማስታረቅ ጊዜ ላይ የተገኘ ቅናሽ",
      budgetEtb: "85,000 ብር",
      timeline: "3 ሳምንታት",
      rail: "ቴሌብር እና CBE ብር",
      quote:
        "እያንዳንዱን ምዕራፍ ማጽደቃችን ክፍያውን ወዲያውኑ ይለቅ ነበር። ባህር ዳር የሚገኘው ዋና ገንቢያችን ሁሉንም ስፕሪንቶች ያለ ምንም የክፍያ ችግር ከጊዜው ቀድሞ አስረክቧል።",
      quoteAuthor: "ያሬድ ከ.",
      quoteRole: "የኦፕሬሽን ዳይሬክተር · አቢሲኒያ ፍሬይት፣ አዲስ አበባ",
      outcomeMetric: "-68% የሂሳብ ማስታረቅ ጊዜ",
      finalThought:
        "የምዕራፍ ኤስክሮ አንድ የአዲስ አበባ የሎጂስቲክስ ድርጅት በባህር ዳር የሚገኝ ከፍተኛ መሃንዲስ በሙሉ የቴክኒክ እና የፋይናንስ ተጠያቂነት እንዲቀጥር አስችሎታል።",
      futureImplication:
        "ምዕራፍ 2 በአዲስ–ጅቡቲ ኮሪደር ላይ ተመሳሳይ ባለ 4-ምዕራፍ ውል በመጠቀም አውቶማቲክ የጉምሩክ ማንቂያዎችን ይጨምራል።",
      milestones: [
        { title: "01 · የሲስተም አርክቴክቸር እና API ስኪማ", amount: "15,000 ብር", duration: "4 ቀናት" },
        { title: "02 · የመቆጣጠሪያ ዌብ ዳሽቦርድ እና የቀጥታ ካርታ", amount: "30,000 ብር", duration: "7 ቀናት" },
        { title: "03 · የአሽከርካሪ ሞባይል መግቢያ እና ቴሌብር Webhook", amount: "25,000 ብር", duration: "6 ቀናት" },
        { title: "04 · የጭነት ሙከራ፣ QA እና የምርት ርክክብ", amount: "15,000 ብር", duration: "4 ቀናት" },
      ],
    },
    {
      categoryLabel: "ዲዛይን እና ፈጠራ",
      title: "የካፋ ልዩ ቡና የወጪ ንግድ ብራንድ መለያ እና የማሸጊያ ሲስተም",
      editorialHeadline:
        "ከክልል የገበሬዎች ኅብረት ሥራ ማኅበር ወደ ሦስት ዓለም አቀፍ የቡና ገዢ ውሎች ያደገ የብራንድ መለያ",
      client: "የካፋ ደጋማ ላኪዎች ኅብረት ሥራ ዩኒየን",
      clientShort: "ካፋ ላኪዎች",
      city: "ሀዋሳ",
      summary:
        "ወደ አውሮፓ እና መካከለኛው ምሥራቅ ለሚላኩ ልዩ የታጠበ አረቢካ ቡና ምርቶች ሙሉ የብራንድ መለያ፣ ባለሁለት ቋንቋ የማሸጊያ ዲዛይን እና የጅምላ ገዢ ካታሎግ ተዘጋጀ።",
      executiveSummary:
        "45,000 ብርን በሦስት የማስረከቢያ ደረጃዎች በኤስክሮ በመቆለፍ የካፋ ላኪዎች ከአዲስ አበባ የብራንድ ስቱዲዮ ጋር በርቀት በመሥራት ያለምንም ክርክር የሕትመት ማሸጊያዎችን አጸደቁ።",
      historicalContext:
        "በደቡብ ኢትዮጵያ የሚገኙ የቡና ማኅበራት የኤክስፖርት ማሸጊያ ዲዛይነሮችን በቀጥታ ማግኘት ባለመቻላቸው ያልታሸገ ጥሬ ቡናን በዝቅተኛ ዋጋ ይልኩ ነበር።",
      industryOverview:
        "በአውሮፓ እና በባሕረ ሰላጤው የሚገኙ ቀጥታ ገዢዎች ዓመታዊ ውል ከመፈረማቸው በፊት የቡናውን ታሪክ፣ ጥራት ያለው ቦርሳ እና የጥራት ሰነድ ይፈልጋሉ።",
      problemPillars: [
        {
          label: "ተግዳሮቱን መለየት",
          detail: "ከፍተኛ ነጥብ ያላቸው የአረቢካ ቡና ዓይነቶች ለዓለም አቀፍ ገዢዎች በተራ ያልታተመ ወረቀት ይቀርቡ ነበር።",
        },
        {
          label: "የችግሩ ስፋት",
          detail: "ከ14 ቀናት ባነሰ ጊዜ ውስጥ የ250ግ እና የ1ኪግ የማሸጊያ ዲዛይን እና ባለ 24 ገጽ ካታሎግ ያስፈልግ ነበር።",
        },
        {
          label: "የችግሩ ተጽዕኖ",
          detail: "ቀደም ሲል የነበሩ መደበኛ ያልሆኑ የዲዛይን ስምምነቶች በቀለም ፕሮፋይል እና በቅድመ ክፍያ ስጋት ተቋርጠው ነበር።",
        },
      ],
      methodologyNote:
        "ከሚታዩ የዲዛይን ውጤቶች ጋር የተሳሰሩ ሦስት ምዕራፎች፡ የቬክተር ብራንድ ሲስተም፣ ለሕትመት ዝግጁ CMYK+Pantone ማሸጊያ እና ባለሁለት ቋንቋ ካታሎግ።",
      findingsHeadline: "3x",
      findingsSub: "በዓለም አቀፍ የንግድ ትርኢት ላይ የተፈረሙ የልዩ ቡና ገዢ ውሎች",
      budgetEtb: "45,000 ብር",
      timeline: "2 ሳምንታት",
      rail: "CBE ብር",
      quote:
        "ኤስክሮ ለቦርዳችን ከፍተኛ የአዲስ አበባ ስቱዲዮን በርቀት የመቅጠር እምነት ሰጠን። እያንዳንዱን ክፍያ ከመልቀቃችን በፊት የሕትመት ናሙናዎችን በYeKis ውስጥ ገምግመናል።",
      quoteAuthor: "ሜሮን ግ.",
      quoteRole: "የኤክስፖርት ማርኬቲንግ ኃላፊ · ካፋ ዩኒየን፣ ሀዋሳ",
      outcomeMetric: "3 ዓለም አቀፍ የገዢ ውሎች ተፈረሙ",
      finalThought:
        "የተዋቀረ የናሙና ግምገማ በሀዋሳ የግብርና ዩኒየን እና በአዲስ አበባ የማሸጊያ ስቱዲዮ መካከል የነበረውን የርቀት እምነት እንቅፋት አስወገደ።",
      futureImplication:
        "ዩኒየኑ አሁን በየሩብ ዓመቱ የሚወጡ ወቅታዊ የቡና ምርት ካታሎጎችን በYeKis የምዕራፍ አብነቶች ያዘጋጃል።",
      milestones: [
        { title: "01 · የብራንድ ስትራቴጂ፣ አርማ እና የቀለም ሲስተም", amount: "15,000 ብር", duration: "5 ቀናት" },
        { title: "02 · 250ግ እና 1ኪግ የኤክስፖርት ከረጢት ዲዛይን", amount: "18,000 ብር", duration: "5 ቀናት" },
        { title: "03 · ዲጂታል የገዢ ካታሎግ እና የብራንድ መመሪያ", amount: "12,000 ብር", duration: "4 ቀናት" },
      ],
    },
    {
      categoryLabel: "ትርጉም እና አካባቢያዊ ማስማማት",
      title: "ባለብዙ ቋንቋ የእናቶች ጤና መተግበሪያ ትርጉም (አማርኛ፣ አፋን ኦሮሞ እና ትግርኛ)",
      editorialHeadline:
        "ከ180 በላይ የእናቶች ሥነ-ምግብ ትምህርቶችን በሦስት የኢትዮጵያ ቋንቋዎች በ10 ቀናት ውስጥ በሕክምና ደረጃ ማስተርጎም",
      client: "ብሩህ የጤና ተነሳሽነት NGO",
      clientShort: "ብሩህ ጤና NGO",
      city: "ባህር ዳር",
      summary:
        "ለገጠር ጤና ኤክስቴንሽን ባለሙያዎች ከ180 በላይ የእናቶች ሥነ-ምግብ ትምህርቶች በአማርኛ፣ በአፋን ኦሮሞ እና በትግርኛ በሕክምና ደረጃ ተተርጉመው የድምጽ ቅጂ እና የጥራት ፍተሻ ተደረገላቸው።",
      executiveSummary:
        "ብሩህ ጤና ሦስት የተረጋገጡ የሕክምና ተርጓሚዎችን በ38,000 ብር የኤስክሮ ሥርዓት በማስተባበር 100% የሕክምና ጥራት ማረጋገጫ እና ለኦዲት ዝግጁ የቴሌብር ደረሰኞችን አገኘ።",
      historicalContext:
        "በገጠር ወረዳዎች የሚሰሩ የጤና NGOs ጥብቅ የለጋሽ ድርጅቶችን የፋይናንስ ኦዲት መስፈርቶች እያሟሉ ዲጂታል መተግበሪያዎችን በፍጥነት መተርጎም ይከብዳቸው ነበር።",
      industryOverview:
        "የመስክ የጤና ኤክስቴንሽን መተግበሪያዎች ወጥ የሆነ የሕክምና ቃላት መዝገብ፣ የድምጽ መመሪያ እና የባለሙያ ማረጋገጫ ይፈልጋሉ።",
      problemPillars: [
        {
          label: "ተግዳሮቱን መለየት",
          detail: "180 የሕክምና ሥነ-ምግብ ትምህርቶች በአንድ ጊዜ በሦስት ቋንቋዎች ትርጉም እና የድምጽ ቅጂ ያስፈልጋቸው ነበር።",
        },
        {
          label: "የችግሩ ስፋት",
          detail: "በተለያዩ ተርጓሚዎች መካከል ወጥነት የሌለው የሕክምና ቃላት አጠቃቀም የመስክ ሙከራን ያዘገይ ነበር።",
        },
        {
          label: "የችግሩ ተጽዕኖ",
          detail: "የድጋፍ ኦዲተሮች ከተረጋገጡ ፋይሎች ጋር የተገናኙ ዝርዝር የክፍያ ደረሰኞችን ይጠይቁ ነበር።",
        },
      ],
      methodologyNote:
        "ምዕራፍ 1 ባለሦስት ቋንቋ የሕክምና ቃላት መዝገብን አጸደቀ፤ ከዚያም ምዕራፍ 2 ትርጉም እና ምዕራፍ 3 የድምጽ ቅጂ QA ተከተሉ።",
      findingsHeadline: "180+",
      findingsSub: "በ100% የጥራት ማረጋገጫ የተተረጎሙ እና በድምጽ የተረጋገጡ የጤና ትምህርቶች",
      budgetEtb: "38,000 ብር",
      timeline: "10 ቀናት",
      rail: "ቴሌብር",
      quote:
        "በYeKis በኩል TIN ያላቸው ሦስት የተረጋገጡ ተርጓሚዎችን መቅጠራችን ለፋይናንስ ቡድናችን የሳምንታት የኦዲት ወረቀት ሥራ አድኖልናል።",
      quoteAuthor: "ዶ/ር ሳራ መ.",
      quoteRole: "የፕሮግራም አስተባባሪ · ብሩህ ጤና፣ ባህር ዳር",
      outcomeMetric: "180 ትምህርቶች በ100% ክሊኒካዊ QA ተተረጎሙ",
      finalThought:
        "የሕክምና ቃላት መዝገቡን በምዕራፍ 01 መቆለፍ ድጋሚ ሥራን አስቀርቶ በሁሉም 180 ትምህርቶች ላይ ወጥነትን አረጋገጠ።",
      futureImplication:
        "ተመሳሳዩን ባለ ሦስት ደረጃ የማረጋገጫ ሂደት በመጠቀም ወደ ሶማሊኛ እና ሲዳምኛ ቋንቋዎች ተስፋፍቷል።",
      milestones: [
        { title: "01 · የሕክምና ቃላት መዝገብ እና ስምምነት", amount: "8,000 ብር", duration: "2 ቀናት" },
        { title: "02 · የመተግበሪያ ጽሑፎች እና የትምህርት ትርጉም", amount: "18,000 ብር", duration: "5 ቀናት" },
        { title: "03 · የድምጽ ቅጂ እና በመተግበሪያ ውስጥ የቋንቋ ፍተሻ", amount: "12,000 ብር", duration: "3 ቀናት" },
      ],
    },
    {
      categoryLabel: "ዲጂታል ማርኬቲንግ",
      title: "ሸገር ሆም እና ኤሌክትሮኒክስ የቴሌግራም + ቲክቶክ የሽያጭ ዘመቻ",
      editorialHeadline:
        "12 አጫጭር የአማርኛ ቪዲዮዎችን እና አውቶማቲክ የቴሌግራም ካታሎግ ቦትን ወደ 3.4x ትርፍ መቀየር",
      client: "ሸገር ሪቴይል ግሩፕ",
      clientShort: "ሸገር ሪቴይል",
      city: "አዲስ አበባ",
      summary:
        "12 አጫጭር የአማርኛ ምርት ቪዲዮዎች ተዘጋጅተው፣ አውቶማቲክ የቴሌግራም ካታሎግ ቦት ተገንብቶ እና ግልጽ የበዓል የሽያጭ ዘመቻ ተካሄደ።",
      executiveSummary:
        "ሸገር ሪቴይል ክፍት ወርሃዊ የኤጀንሲ ክፍያን በመተው በ52,000 ብር የኤስክሮ ውል ከስቱዲዮ ቪዲዮዎች፣ ከቴሌግራም ቦት እና ከሽያጭ ማሳደጊያ ጋር አገናኘ።",
      historicalContext:
        "በአዲስ አበባ የሚገኙ ነጋዴዎች ግልጽ የሥራ ውጤት ሳይኖር ቀድመው ወርሃዊ የማርኬቲንግ ክፍያ ይከፍሉ ነበር።",
      industryOverview:
        "በኢትዮጵያ ውጤታማ የሸማቾች ንግድ የሚመራው በቲክቶክ/Reels ቪዲዮ እና በፈጣን የቴሌግራም ካታሎግ ትዕዛዝ ነው።",
      problemPillars: [
        {
          label: "ተግዳሮቱን መለየት",
          detail: "የበዓል ዘመቻ በ4 ሳምንታት ውስጥ 12 የስቱዲዮ ቪዲዮዎችን እና ቀጥታ የቴሌግራም ትዕዛዝ ቦት ይፈልግ ነበር።",
        },
        {
          label: "የችግሩ ስፋት",
          detail: "ቀደም ሲል የወጣው የማስታወቂያ ወጪ በቪዲዮ እይታዎች እና በቴሌግራም ትዕዛዞች መካከል ግንኙነት አልነበረውም።",
        },
        {
          label: "የችግሩ ተጽዕኖ",
          detail: "የሽያጭ ሠራተኞች በተበታተኑ መልዕክቶች ተጨናንቀው ነበር።",
        },
      ],
      methodologyNote:
        "በሦስት የውጤት ምዕራፎች ተከፈለ፡ የመጀመሪያዎቹ 6 ቪዲዮዎች፣ የቴሌግራም ካታሎግ ቦት እና የሁለተኛ ዙር ማሻሻያ ቪዲዮዎች።",
      findingsHeadline: "3.4x",
      findingsSub: "በበዓል ማስታወቂያ ወጪ ላይ የተረጋገጠ ተመላሽ እና 3x የቴሌግራም ትዕዛዝ ዕድገት",
      budgetEtb: "52,000 ብር",
      timeline: "4 ሳምንታት",
      rail: "ቴሌብር",
      quote:
        "እያንዳንዱን ምዕራፍ ከተረጋገጡ ቪዲዮዎች እና የዘመቻ ውቅር ጋር አያይዘነዋል። በቴሌግራም ቻናላችን የሚመጡ የሽያጭ ጥያቄዎች በመጀመሪያዎቹ ሁለት ሳምንታት በሦስት እጥፍ አደጉ።",
      quoteAuthor: "ሃና ግ.",
      quoteRole: "መስራች · ሸገር ሪቴይል ግሩፕ፣ አዲስ አበባ",
      outcomeMetric: "3.4x የዘመቻ ወጪ ተመላሽ",
      finalThought:
        "ከውጤት ጋር የተገናኘ ኤስክሮ የፈጠራ ፍጥነትን ከሚለካ የቴሌግራም ሽያጭ ጋር አስተሳስሯል።",
      futureImplication:
        "ሸገር ሪቴይል አሁን እያንዳንዱን ወቅታዊ የምርት ማስተዋወቂያ በ3-ምዕራፍ ውል ያካሂዳል።",
      milestones: [
        { title: "01 · ጽሑፍ ዝግጅት እና 6 የስቱዲዮ ቪዲዮዎች", amount: "20,000 ብር", duration: "10 ቀናት" },
        { title: "02 · የቴሌግራም ካታሎግ ቦት እና የክትትል ሊንክ", amount: "14,000 ብር", duration: "7 ቀናት" },
        { title: "03 · ሁለተኛ ዙር ቪዲዮዎች እና የሽያጭ ማሻሻያ", amount: "18,000 ብር", duration: "11 ቀናት" },
      ],
    },
    {
      categoryLabel: "ዳታ እና የቢሮ ድጋፍ",
      title: "የክልል እህል ገበያ ዋጋ እና የኅብረት ሥራ ማኅበራት ክምችት ትንተና",
      editorialHeadline:
        "42,000+ የታሪክ የገበያ መዝገቦችን በማደራጀት የ3 ቀን ሪፖርትን ወደ 15 ደቂቃ መቀነስ",
      client: "የሰሜን ደጋማ ኅብረት ሥራ ማኅበራት ኔትወርክ",
      clientShort: "ሃይላንድስ Co-op",
      city: "መቀሌ",
      summary:
        "የ4 ዓመታት የእህል ገበያ መረጃዎችን ማጽዳት፣ ሳምንታዊ የወረዳ ዋጋ መሰብሰቢያ ቅጾችን አውቶማቲክ ማድረግ እና የPower BI እና Python ዳሽቦርድ ማቅረብ።",
      executiveSummary:
        "በአራት የኤስክሮ ምዕራፎች የተፈጸመው የ64,000 ብር የዳታ ኢንጂነሪንግ ውል የተበታተኑ የኤክሴል ሰንጠረዦችን ወደ ዘመናዊ Python + Power BI ሲስተም ቀየረ።",
      historicalContext:
        "የ4 ዓመታት የክልል እህል ዋጋ እና የመጋዘን ክምችት መዝገቦች በተደጋጋሚ የወረዳ ኮዶች እና የጎደሉ ቀናት በተበታተኑ ፋይሎች ውስጥ ነበሩ።",
      industryOverview:
        "የግብርና ኅብረት ሥራ ማኅበራት የትራንስፖርት ስርጭትን ለማስተካከል እና ለገበሬዎች ተገቢ ክፍያ ለመክፈል ወቅታዊ ሳምንታዊ የዋጋ መረጃ ያስፈልጋቸዋል።",
      problemPillars: [
        {
          label: "ተግዳሮቱን መለየት",
          detail: "42,000+ መዝገቦችን ማጽዳት፣ ተደጋጋሚ ረድፎችን ማስወገድ እና መደበኛ ቅርጽ ማስያዝ ያስፈልግ ነበር።",
        },
        {
          label: "የችግሩ ስፋት",
          detail: "ሳምንታዊ የገበያ ሪፖርት ማዘጋጀት ለተንታኞች በየሳምንቱ 3 ሙሉ ቀናት ይወስድባቸው ነበር።",
        },
        {
          label: "የችግሩ ተጽዕኖ",
          detail: "የዘገየ የክምችት ታይነት በማከማቻ ማዕከላት መካከል የእህል ክምችት አለመመጣጠን ያስከትል ነበር።",
        },
      ],
      methodologyNote:
        "አራት ተከታታይ የዳታ ምዕራፎች፡ የታሪክ ዳታ ማጽዳት፣ የሞባይል መረጃ መሰብሰቢያ፣ የአመራር BI ዳሽቦርድ እና የሠራተኞች ሥልጠና።",
      findingsHeadline: "42K+",
      findingsSub: "የተደራጁ የታሪክ ሸቀጥ መዝገቦች፤ ሳምንታዊ ሪፖርት ከ3 ቀናት ወደ 15 ደቂቃ ወረደ",
      budgetEtb: "64,000 ብር",
      timeline: "3 ሳምንታት",
      rail: "CBE ብር",
      quote:
        "እያንዳንዱ የዳታ ርክክብ ገንዘብ ከመለቀቁ በፊት በሥራ ቦታው ውስጥ ተረጋግጧል። ተንታኞቻችን አሁን ሳምንታዊ የገበያ መግለጫዎችን በ3 ቀናት ፋንታ በ15 ደቂቃ ያትማሉ።",
      quoteAuthor: "ቤቲ አ.",
      quoteRole: "የኦፕሬሽን ኃላፊ · ሃይላንድስ Co-op፣ መቀሌ",
      outcomeMetric: "42,000+ የታሪክ መዝገቦች ተደራጁ",
      finalThought:
        "በእያንዳንዱ ምዕራፍ የዳታ ጥራትን ማረጋገጥ የመጨረሻው የBI ዳሽቦርድ በንጹህ እና በታመነ መረጃ ላይ እንዲቆም አድርጓል።",
      futureImplication:
        "ከተጨማሪ 18 የወረዳ ገበያዎች በSMS የሚላኩ የዋጋ መረጃዎች አሁን በቀጥታ ወደ ሲስተሙ ይገባሉ።",
      milestones: [
        { title: "01 · የታሪክ CSV/ኤክሴል ማጽዳት እና ማደራጀት", amount: "16,000 ብር", duration: "5 ቀናት" },
        { title: "02 · አውቶማቲክ የሞባይል መረጃ መሰብሰቢያ ስኪማ", amount: "16,000 ብር", duration: "5 ቀናት" },
        { title: "03 · የዋጋ እና ክምችት BI ዳሽቦርድ", amount: "20,000 ብር", duration: "6 ቀናት" },
        { title: "04 · የሠራተኞች ሥልጠና እና የሰነድ ርክክብ", amount: "12,000 ብር", duration: "5 ቀናት" },
      ],
    },
    {
      categoryLabel: "ድረ-ገጽ እና ሞባይል ኢንጂነሪንግ",
      title: "የድሬዳዋ ጨርቃጨርቅ አቅራቢዎች B2B ትዕዛዝ እና የጉምሩክ ሰነድ መከታተያ",
      editorialHeadline:
        "ለኤክስፖርት አምራች ኮሪደር 100% የፕሮ-ፎርማ ደረሰኞችን እና የጉምሩክ ማጽደቂያዎችን ዲጂታል ማድረግ",
      client: "ኢስት ሪፍት ማኑፋክቸሪንግ ኃ.የተ.የግ.ማ",
      clientShort: "ኢስት ሪፍት Mfg",
      city: "ድሬዳዋ",
      summary:
        "በሚና ላይ የተመሠረተ የሰነድ ፊርማ፣ በETB/USD የፕሮ-ፎርማ ደረሰኝ ማመንጫ እና አውቶማቲክ የSMS/ቴሌግራም ማንቂያ ያለው ደህንነቱ የተጠበቀ የአቅራቢዎች ፖርታል ተገነባ።",
      executiveSummary:
        "ኢስት ሪፍት ማኑፋክቸሪንግ የ110,000 ብር ሙሉ ፖርታል ግንባታን በአራት የተረጋገጡ ምዕራፎች በመፈጸም በ5 ሳምንታት ውስጥ 100% የአቅራቢ ማጽደቂያዎችን ወደ ኦንላይን አዛወረ።",
      historicalContext:
        "የጨርቃጨርቅ ግዥ በኢሜይል PDFs እና በአካል ማኅተም ላይ የተመሠረተ ስለነበር በፋብሪካው ግዥ እና በጉምሩክ አስተላላፊዎች መካከል መዘግየት ይፈጥር ነበር።",
      industryOverview:
        "በድሬዳዋ የሚገኙ የኢንዱስትሪ ፓርኮች እና ላኪዎች ባለብዙ-ሚና የኦዲት መዝገብ እና ፈጣን ማንቂያዎችን ይፈልጋሉ።",
      problemPillars: [
        {
          label: "ተግዳሮቱን መለየት",
          detail: "የእጅ የፕሮ-ፎርማ ማሻሻያዎች እና የጉምሩክ ወረቀቶች የጥሬ ዕቃ አቅርቦትን ያዘገዩ ነበር።",
        },
        {
          label: "የችግሩ ስፋት",
          detail: "ለግዥ ኃላፊዎች፣ ለአቅራቢዎች እና ለጉምሩክ ወኪሎች ሙሉ የኦዲት መዝገብ ያለው የመዳረሻ ቁጥጥር ያስፈልግ ነበር።",
        },
        {
          label: "የችግሩ ተጽዕኖ",
          detail: "ከፍተኛ ዋጋ ያለው B2B ሶፍትዌር ግንባታ ፋብሪካውንም ሆነ የኢንጂነሪንግ ቡድኑን ለመጠበቅ ጥብቅ ኤስክሮ ይፈልግ ነበር።",
        },
      ],
      methodologyNote:
        "በአራት የተፈተሹ ምዕራፎች ተከናወነ፡ የRBAC መግቢያ፣ የፕሮ-ፎርማ እና የጉምሩክ ሰነድ ሞተር፣ የቴሌግራም/SMS ማንቂያዎች እና የክላውድ ምርት ስራ።",
      findingsHeadline: "100%",
      findingsSub: "ዲጂታል የፕሮ-ፎርማ እና የጉምሩክ ሰነድ ሂደት ያለምንም የኦዲት ልዩነት",
      budgetEtb: "110,000 ብር",
      timeline: "5 ሳምንታት",
      rail: "CBE ብር እና ኤም-ፔሳ",
      quote:
        "የ110,000 ብር ግንባታን በአራት ግልጽ ምዕራፎች መከፋፈላችን የግዥ ቡድናችንን እና የፍሪላንስ ኢንጂነሪንግ ቡድኑን 100% አስተሳስሮ አቆይቷል።",
      quoteAuthor: "ናርዶስ አ.",
      quoteRole: "የቴክኒክ መሪ · ኢስት ሪፍት ማኑፋክቸሪንግ፣ ድሬዳዋ",
      outcomeMetric: "100% ዲጂታል የፕሮ-ፎርማ ሂደት",
      finalThought:
        "ባለ አራት-ምዕራፍ ኤስክሮ የ110,000 ብር የድርጅት ግንባታን ለሁለቱም ወገኖች ሊገመት የሚችል፣ ግልጽ እና ከስጋት የጸዳ አድርጎታል።",
      futureImplication:
        "አሁን ከ60 በላይ የክልል ጥሬ ዕቃ አቅራቢዎችን ወደ አውቶማቲክ የፕሮ-ፎርማ ፖርታሉ በማስገባት ላይ ይገኛል።",
      milestones: [
        { title: "01 · በሚና ላይ የተመሠረተ መግቢያ እና የአቅራቢ ምዝገባ", amount: "25,000 ብር", duration: "8 ቀናት" },
        { title: "02 · የፕሮ-ፎርማ ደረሰኝ እና የጉምሩክ ሰነድ ሲስተም", amount: "35,000 ብር", duration: "10 ቀናት" },
        { title: "03 · አውቶማቲክ የቴሌግራም እና SMS ማንቂያ ውህደት", amount: "28,000 ብር", duration: "9 ቀናት" },
        { title: "04 · የደህንነት ኦዲት እና የክላውድ ስርጭት", amount: "22,000 ብር", duration: "8 ቀናት" },
      ],
    },
  ],
  om: [
    {
      categoryLabel: "Injinariingii Weebii & Moobaayilaa",
      title: "Poortaalii Bobbaasaa Abyssinia Logistics & Kaffaltii Konkolaachistoota Telebirr",
      editorialHeadline:
        "Galmee harka irraa gara kaffaltii Telebirr ofumaa konkolaattota qorrisiistuu 140+ irratti",
      client: "Abyssinia Freight & Cold-Chain PLC",
      clientShort: "Abyssinia Freight",
      city: "Finfinnee",
      summary:
        "Appilikeeshinii hordoffii konkolaataa yeroo qabatamaa fi poortaalii galmee konkolaachistootaa Telebirr ofumaa wajjin hojjechuun walitti-araarsa harka konkolaattota 140+ bakka buuse.",
      executiveSummary:
        "Abyssinia Freight waliigaltee injinariingii ETB 85,000 boqonnaawwan iskuuroo afuritti YeKis irratti qoode. Tartiibni hundi osoo maallaqni hin gadhiifamin dura gamaaggamamee guyyoota 21 keessatti yeroo walitti-araarsaa %68 hir'ise.",
      historicalContext:
        "Qacarrii boqonnaan deeggarame dura, bobbaastonni garee boba'aa fi baasii imalaa buufataalee shan keessatti waraqaa fi bilbilaan hojjechaa turan—kunis turtii kaffaltii guyyaa 4 fidaa ture.",
      industryOverview:
        "Dhaabbileen fe'umsaa fi qorrisiistuu Itoophiyaa hordoffii GPS yeroo qabatamaa fi kaffaltii moobaayilaa saffisaa barbaadu.",
      problemPillars: [
        {
          label: "rakkoo adda baasuu",
          detail: "Konkolaattonni 140+ mirkaneessa baasii imalaa fi mallattoo baankiitiif hanga sa'aatii 96 eegaa turan.",
        },
        {
          label: "bal'ina rakkoo",
          detail: "Buufataaleen sakatta'iinsaa shan ragaa dijitaalaa fi kaffaltii Telebirr ofumaa hin qaban turan.",
        },
        {
          label: "dhiibbaa rakkoo",
          detail: "Hojjettoonni faayinaansii nagahee waraqaa sakatta'uun torbanitti sa'aatii 28 balleessaa turan.",
        },
      ],
      methodologyNote:
        "Hojiin isprintii iskuuroo afuritti qoodame: caasaa siistamaa, kaartaa bobbaasaa yeroo qabatamaa, check-in moobaayilaa Telebirr webhook waliinii fi qorannoo ba'aa.",
      findingsHeadline: "-68%",
      findingsSub: "Hir'ina yeroo walitti-araarsa bobbaasaa fi baasii konkolaachistootaa torbanii",
      budgetEtb: "85,000 ETB",
      timeline: "Torban 3",
      rail: "Telebirr & CBE Birr",
      quote:
        "Boqonnaa tokkoon tokkoon mirkaneessuun battalumatti kaffaltii gadhiisa ture. Misoomsaan keenya Baahir Daar jiru hojii hunda yeroo dura rakkoo kaffaltii tokko malee dhiyeesse.",
      quoteAuthor: "Yared K.",
      quoteRole: "Daarikteera Hojii · Abyssinia Freight, Finfinnee",
      outcomeMetric: "-68% yeroo walitti-araarsaa",
      finalThought:
        "Iskuuroon boqonnaa dhaabbata Finfinnee tokkoof ogeessa olaanaa Baahir Daar jiru itti gaafatamummaa guutuun akka qacaru dandeessise.",
      futureImplication:
        "Boqonnaan 2ffaan sarara Finfinnee–Jibuutii irratti beeksisa gumrukaa ofumaa caasaa boqonnaa 4 walfakkaatuun babal'isa.",
      milestones: [
        { title: "01 · Caasaa Siistamaa & Iskiimaa API", amount: "15,000 ETB", duration: "Guyyaa 4" },
        { title: "02 · Daashboordii Bobbaasaa & Kaartaa Yeroo Qabatamaa", amount: "30,000 ETB", duration: "Guyyaa 7" },
        { title: "03 · Check-In Konkolaachisaa & Webhook Telebirr", amount: "25,000 ETB", duration: "Guyyaa 6" },
        { title: "04 · Qorannoo Ba'aa, QA & Dabarsa Oomishaa", amount: "15,000 ETB", duration: "Guyyaa 4" },
      ],
    },
    {
      categoryLabel: "Dizaayinii & Kalaqa",
      title: "Eenyummaa Al-Ergii Bunaa Addaa Kaffa & Caasaa Saamsaa",
      editorialHeadline:
        "Eenyummaa bunaa sadarkaa al-ergii ijaaruun waliigaltee bittoota idil-addunyaa sadii argachuu",
      client: "Gamtaa Al-Ergitoota Bunaa Kaffa",
      clientShort: "Kaffa Exporters",
      city: "Hawaasaa",
      summary:
        "Eenyummaa biraandii guutuu, dizaayinii saamsaa al-ergii afaan lamaa fi kitaaba gabaa bittoota Awurooppaa fi Baha Giddugaleessaaf qophaa'e.",
      executiveSummary:
        "Boqonnaawwan sadii keessatti ETB 45,000 cufuudhaan, Kaffa Exporters istudiyoo biraandii Finfinnee waliin fageenyarraa hojjetee falmii malee saamsaa maxxansaaf qophii ta'e mirkaneesse.",
      historicalContext:
        "Waldaaleen bunaa kibba Itoophiyaa dizaayinaroota saamsaa al-ergii kallattiin waan hin arganneef bunaa hin saamsamne gatii gadi aanaadhaan ergaa turan.",
      industryOverview:
        "Bittoonni kallattii Awurooppaa fi Galoo Galaanaa seenaa bunaa, dizaayinii qulqullina qabuu fi waraqaa ibsa dhandhamaa barbaadu.",
      problemPillars: [
        {
          label: "rakkoo adda baasuu",
          detail: "Bunni qabxii olaanaa qabu waraqaa ibsaa biraandii hin qabneen bittoota alaa biratti dhiyaataa ture.",
        },
        {
          label: "bal'ina rakkoo",
          detail: "Guyyoota 14 gadi keessatti dizaayinii korojoo 250g fi 1kg fi kitaaba fuula 24 barbaachisa ture.",
        },
        {
          label: "dhiibbaa rakkoo",
          detail: "Waliigalteen duraanii qulqullina halluu fi sodaa kaffaltii duraatiin addaan citee ture.",
        },
      ],
      methodologyNote:
        "Gadhiisa boqonnaa sadii hojii qabatamaa wajjin hidhaman: siistama biraandii veektarii, dizaayinii CMYK+Pantone fi kitaaba bittootaa.",
      findingsHeadline: "3x",
      findingsSub: "Waliigalteewwan bittoota bunaa idil-addunyaa sadii mallattaa'an",
      budgetEtb: "45,000 ETB",
      timeline: "Torban 2",
      rail: "CBE Birr",
      quote:
        "Iskuuroon boordii gamtaa keenyaaf istudiyoo Finfinnee olaanaa fageenyaan qacaruuf amanamummaa kenne. Osoo maallaqa hin gadhiisin dura ragaalee YeKis keessatti ilaalle.",
      quoteAuthor: "Meron G.",
      quoteRole: "Hogganaa Gabaa Al-Ergii · Gamtaa Kaffa, Hawaasaa",
      outcomeMetric: "Waliigaltee bittoota idil-addunyaa 3 mallattaa'e",
      finalThought:
        "Gamaaggamni qindaa'aan daangaa amanamummaa gamtaa qonnaa Hawaasaa fi istudiyoo Finfinnee gidduu jiru balleessee jira.",
      futureImplication:
        "Gamtichi amma kurmaana hunda kitaaba sassaabbii yeroo unka boqonnaa YeKis tiin hojjechiisa.",
      milestones: [
        { title: "01 · Tarsiimoo Biraandii, Asxaa & Sirna Halluu", amount: "15,000 ETB", duration: "Guyyaa 5" },
        { title: "02 · Dizaayinii Korojoo Al-Ergii 250g & 1kg", amount: "18,000 ETB", duration: "Guyyaa 5" },
        { title: "03 · Kitaaba Bittoota Dijitaalaa & Qajeelfama Biraandii", amount: "12,000 ETB", duration: "Guyyaa 4" },
      ],
    },
    {
      categoryLabel: "Hiika & Afaanota Naannootti Jijjiiruu",
      title: "Hiika Appii Fayyaa Haadholii Afaanota Hedduun (Amaaraa, Afaan Oromoo & Tigrinya)",
      editorialHeadline:
        "Mojuulota nyaata haadholii 180+ sadarkaa yaalaatiin afaanota Itoophiyaa sadiitti guyyoota 10 keessatti hiikuu",
      client: "Dhaabbata Biruh Health Initiative NGO",
      clientShort: "Biruh Health NGO",
      city: "Baahir Daar",
      summary:
        "Mojuulota nyaata haadholii 180+ hojjettoota ekisteenshinii fayyaa baadiyyaatiif Afaan Amaaraa, Afaan Oromoo fi Tigrinyatti hiikamuu, waraabbii sagalee fi mirkaneessa QA qulqullina yaalaa.",
      executiveSummary:
        "Biruh Health Initiative ogeeyyii afaanii yaalaa mirkanaa'an sadii sirna iskuuroo ETB 38,000 jalatti qindeessee mirkaneessa %100 fi galmee kaffaltii Telebirr oodiitiif qophii ta'e argate.",
      historicalContext:
        "Dhaabbileen NGO fayyaa aanaalee baadiyyaa keessa hojjetan appii dafanii hiikuu fi nagahee oodiitii arjoomtootaaf guutuu rakkachaa turan.",
      industryOverview:
        "Meeshaaleen ekisteenshinii fayyaa kuusaa jechootaa wal-fakkaatu, qajeelfama sagalee fi mirkaneessa ogeessaa barbaadu.",
      problemPillars: [
        {
          label: "rakkoo adda baasuu",
          detail: "Barnoonni nyaata yaalaa 180 yeroo tokkotti afaanota sadiin hiikamuu fi sagaleen waraabamuu qabu turan.",
        },
        {
          label: "bal'ina rakkoo",
          detail: "Garaagarummaan jechoota yaalaa ogeeyyii gidduu ture yeroo yaalii dirree harkisa ture.",
        },
        {
          label: "dhiibbaa rakkoo",
          detail: "Oodiitaroonni arjoomaa nagahee boqonnaa faayiloota mirkanaa'an wajjin wal-qabate gaafatu turan.",
        },
      ],
      methodologyNote:
        "Boqonnaan 1ffaan kuusaa jechoota yaalaa afaan sadii cufe; itti aansuun Boqonnaan 2ffaan hiika barruu, Boqonnaan 3ffaan sagalee fi QA.",
      findingsHeadline: "180+",
      findingsSub: "Mojuulonni yaalaa hiikamanii fi sagaleen mirkanaa'an %100 QA darban",
      budgetEtb: "38,000 ETB",
      timeline: "Guyyaa 10",
      rail: "Telebirr",
      quote:
        "Ogeeyyii afaanii sadii YeKis irraa nagahee TIN qabuun qacaruun keenya garee faayinaansii keenyaaf hojii oodiitii torban hedduu qusate.",
      quoteAuthor: "Dr. Sara M.",
      quoteRole: "Qindeessituu Sagantaa · Biruh Health, Baahir Daar",
      outcomeMetric: "Mojuulonni 180 %100 QA yaalaatiin hiikaman",
      finalThought:
        "Boqonnaa 01 irratti kuusaa jechootaa mirkaneessuun irra-deebii hojii hambisee tokkummaa jechootaa barnoota 180 hunda keessatti mirkaneesse.",
      futureImplication:
        "Amma tartiiba mirkaneessaa walfakkaatuun gara Afaan Somaalee fi Sidaamuutti babal'ateera.",
      milestones: [
        { title: "01 · Kuusaa Jechoota Yaalaa & Walsimsiisa", amount: "8,000 ETB", duration: "Guyyaa 2" },
        { title: "02 · Jechoota UI & Hiika Barnootaa", amount: "18,000 ETB", duration: "Guyyaa 5" },
        { title: "03 · Sagalee Dhalootaa & QA Afaanii Appii Keessaa", amount: "12,000 ETB", duration: "Guyyaa 3" },
      ],
    },
    {
      categoryLabel: "Maarkeetingii Dijitaalaa",
      title: "Duula Gurgurtaa Telegram + TikTok Sheger Home & Electronics",
      editorialHeadline:
        "Viidiyoowwan gaggabaaboo Amaaraa 12 fi bootii kaataaloogii Telegram gara bu'aa dachaa 3.4x jijjiiruu",
      client: "Sheger Retail Group",
      clientShort: "Sheger Retail",
      city: "Finfinnee",
      summary:
        "Viidiyoowwan oomishaa gaggabaaboo 12 oomishame, bootii kaataaloogii Telegram hojjetamee duulli gurgurtaa ayyaanaa bu'aa ROAS ifa ta'e argamsiise.",
      executiveSummary:
        "Sheger Retail kaffaltii ejensii daangaa hin qabne waliigaltee boqonnaa ETB 52,000 kan viidiyoo istudiyoo fi bootii Telegram irratti hundaa'een bakka buuse.",
      historicalContext:
        "Daldaltoonni Finfinnee yeroo baay'ee bu'aa ifa ta'e malee kaffaltii ji'aa dursanii kaffalaa turan.",
      industryOverview:
        "Daldalli shamattootaa Itoophiyaa TikTok/Reels fi ajaja battalaa Telegram irratti hundaa'a.",
      problemPillars: [
        {
          label: "rakkoo adda baasuu",
          detail: "Duulli ayyaanaa torban 4 keessatti viidiyoo 12 fi bootii ajaja Telegram hojjetu barbaada ture.",
        },
        {
          label: "bal'ina rakkoo",
          detail: "Baasiin beeksisaa duraanii ilaallii viidiyoo fi ajaja Telegram walitti hin hidhne ture.",
        },
        {
          label: "dhiibbaa rakkoo",
          detail: "Hojjettoonni gurgurtaa ergaa hedduu hin qindaa'iniin muddamaa turan.",
        },
      ],
      methodologyNote:
        "Boqonnaa bu'aa sadiitti qoodame: viidiyoo istudiyoo 6 duraa, kaataaloogii Telegram hordoffii waliin fi fooyya'iinsa marsaa 2ffaa.",
      findingsHeadline: "3.4x",
      findingsSub: "Deebii baasii beeksisaa mirkanaa'ee fi ajaja Telegram dachaa 3 dabale",
      budgetEtb: "52,000 ETB",
      timeline: "Torban 4",
      rail: "Telebirr",
      quote:
        "Boqonnaa hunda hojii kalaqaa mirkanaa'e wajjin wal-qabsiisne. Gaaffiin gurgurtaa chaanaalii Telegram keenya irratti torban lamaan jalqabaa keessatti dachaa sadii dabale.",
      quoteAuthor: "Hanna G.",
      quoteRole: "Hundeessituu · Sheger Retail Group, Finfinnee",
      outcomeMetric: "Deebii baasii duulaa 3.4x",
      finalThought:
        "Iskuuroon bu'aa hojii wajjin walqabate saffisa oomisha kalaqaa gurgurtaa Telegram wajjin walitti fide.",
      futureImplication:
        "Sheger Retail amma yeroo ayyaanaa hunda waliigaltee boqonnaa 3n gaggeessa.",
      milestones: [
        { title: "01 · Barruu Kalaqaa & Viidiyoowwan Istudiyoo 6", amount: "20,000 ETB", duration: "Guyyaa 10" },
        { title: "02 · Bootii Kaataaloogii Telegram & Hordoffii Pixel", amount: "14,000 ETB", duration: "Guyyaa 7" },
        { title: "03 · Viidiyoo Marsaa 2ffaa & Fooyya'iinsa Gurgurtaa", amount: "18,000 ETB", duration: "Guyyaa 11" },
      ],
    },
    {
      categoryLabel: "Daataa & Deeggarsa Waajjiraa",
      title: "Kuusaa Xiinxala Gatii Midhaanii Naannoo & Mana Kuusaa Waldaalee",
      editorialHeadline:
        "Galmeewwan midhaanii seenaa 42,000+ qindeessuun gabaasa torbanii gara daqiiqaa 15tti gadi buusuu",
      client: "Networkii Waldaalee Hojii Gamtaa Kaabaa",
      clientShort: "Highlands Co-op",
      city: "Maqalee",
      summary:
        "Galmeewwan waggaa 4 qulqulleessuu, unka funaansa gatii aanaalee ofumaa gochuu fi daashboordii Power BI & Python dhiyeessuu.",
      executiveSummary:
        "Hojii injinariingii daataa ETB 64,000 boqonnaawwan afuritti qoodameun waraqaa Excel faffaca'aa ture gara sirna Python + Power BI ammayyaatti jijjiirame.",
      historicalContext:
        "Galmeewwan gatii midhaanii fi mana kuusaa waggaa afurii faayiloota adda addaa dogoggora qaban keessatti bittinnaa'anii turan.",
      industryOverview:
        "Waldaaleen qonnaa geejjibaa fi kaffaltii qonnaan bultootaaf daataa gatii torbanii saffisaa barbaadu.",
      problemPillars: [
        {
          label: "rakkoo adda baasuu",
          detail: "Tarreewwan seenaa 42,000+ qulqulleessuu fi irra-deebii balleessuu barbaachisa ture.",
        },
        {
          label: "bal'ina rakkoo",
          detail: "Gabaasa torbanii qopheessuun xiinxaltootarraa torbanitti guyyoota guutuu 3 fudhata ture.",
        },
        {
          label: "dhiibbaa rakkoo",
          detail: "Turtii mul'ata mana kuusaatiin giddugaleessota keessatti hanqinni wal-madaallii uumamaa ture.",
        },
      ],
      methodologyNote:
        "Boqonnaawwan daataa wal-duraa duubaa afur: qulqulleessuu daataa duraa, iskiimaa moobaayilaa, daashboordii BI fi leenjii hojjettootaa.",
      findingsHeadline: "42K+",
      findingsSub: "Galmeewwan seenaa qindaa'an; gabaasni torbanii guyyaa 3 irraa gara daqiiqaa 15tti hir'ate",
      budgetEtb: "64,000 ETB",
      timeline: "Torban 3",
      rail: "CBE Birr",
      quote:
        "Dhiyeessiin daataa hundi osoo kaffaltiin hin gadhiifamin bakka hojii keessatti mirkanaa'e. Xiinxaltoonni keenya amma gabaasa torbanii guyyoota 3 osoo hin taane daqiiqaa 15 keessatti maxxansu.",
      quoteAuthor: "Betty A.",
      quoteRole: "Hogganaa Hojii · Highlands Co-op, Maqalee",
      outcomeMetric: "Galmeewwan seenaa 42,000+ qindaa'an",
      finalThought:
        "Boqonnaa hunda irratti qulqullina daataa mirkaneessuun daashboordiin dhumaa daataa qulqulluu irratti akka hojjetu taasise.",
      futureImplication:
        "Gabaa aanaalee dabalataa 18 irraa daataan gatii SMS dhaan kallattiin gara siistamichaatti gala.",
      milestones: [
        { title: "01 · Qulqulleessa CSV/Excel Seenaa", amount: "16,000 ETB", duration: "Guyyaa 5" },
        { title: "02 · Iskiimaa Funaansa Daataa Moobaayilaa", amount: "16,000 ETB", duration: "Guyyaa 5" },
        { title: "03 · Daashboordii Gatii & Kuusaa Hogganaa", amount: "20,000 ETB", duration: "Guyyaa 6" },
        { title: "04 · Leenjii Hojjettootaa & Dabarsa Sanadaa", amount: "12,000 ETB", duration: "Guyyaa 5" },
      ],
    },
    {
      categoryLabel: "Injinariingii Weebii & Moobaayilaa",
      title: "Poortaalii Ajaja B2B Dhiyeessitoota Huccuu Dirree Dhawaa & Hordoffii Gumrukaa",
      editorialHeadline:
        "Mirkaneessa nagahee piro-foormaa fi gumrukaa %100 dijitaalaa gochuu warshaa al-ergiif",
      client: "East Rift Manufacturing PLC",
      clientShort: "East Rift Mfg",
      city: "Dirree Dhawaa",
      summary:
        "Poortaalii dhiyeessitootaa nageenya qabu, mallattoo gahee irratti hundaa'e, uumama piro-foormaa ETB/USD fi beeksisa SMS/Telegram ofumaa hojjetame.",
      executiveSummary:
        "East Rift Manufacturing ijaarsa poortaalii ETB 110,000 boqonnaa mirkanaa'an afuriin raawwachuun torban 5 keessatti hayyama piro-foormaa %100 gara oonlaayiniitti ceesise.",
      historicalContext:
        "Bittaan huccuu PDF imeelii fi chaappaa harkaa irratti waan hundaa'eef bittaa warshaa fi ogeeyyii gumrukaa gidduutti turtii uuma ture.",
      industryOverview:
        "Paarkiiwwan industirii Dirree Dhawaa galmee oodiitii gahee hedduu fi beeksisa battalaa barbaadu.",
      problemPillars: [
        {
          label: "rakkoo adda baasuu",
          detail: "Sirreeffamni piro-foormaa harkaa fi mallattoon gumrukaa dhiyeessii meeshaa dheedhii tursiisa ture.",
        },
        {
          label: "bal'ina rakkoo",
          detail: "Hojjettoota bittaa, dhiyeessitootaa fi bakka bu'oota gumrukaatiif argama gahee irratti hundaa'e barbaachisa ture.",
        },
        {
          label: "dhiibbaa rakkoo",
          detail: "Ijaarsi B2B gatii olaanaa warshaa fi garee injinariingii eeguuf iskuuroo cimaa barbaada ture.",
        },
      ],
      methodologyNote:
        "Boqonnaa sakatta'ame afuriin kenname: RBAC auth, motara piro-foormaa & gumrukaa, beeksisa Telegram/SMS fi fe'umsa kilaawudii.",
      findingsHeadline: "100%",
      findingsSub: "Adeemsa sanada piro-foormaa & gumrukaa dijitaalaa dogoggora oodiitii malee",
      budgetEtb: "110,000 ETB",
      timeline: "Torban 5",
      rail: "CBE Birr & M-Pesa",
      quote:
        "Ijaarsa ETB 110,000 boqonnaa ifa ta'an afuritti qooduun garee bittaa keenyaa fi garee injinariingii %100 wal-simsiisee tursiise.",
      quoteAuthor: "Nardos A.",
      quoteRole: "Hogganaa Teeknikaa · East Rift Manufacturing, Dirree Dhawaa",
      outcomeMetric: "Adeemsa piro-foormaa dijitaalaa %100",
      finalThought:
        "Iskuuroon boqonnaa 4 ijaarsa dhaabbataa ETB 110,000 gama lamaaniifuu tilmaamamaa fi balaa irraa bilisa godhe.",
      futureImplication:
        "Amma dhiyeessitoota meeshaa dheedhii naannoo 60+ gara poortaalichaatti galchaa jira.",
      milestones: [
        { title: "01 · Auth Gahee Irratti Hundaa'e & Galmee Dhiyeessaa", amount: "25,000 ETB", duration: "Guyyaa 8" },
        { title: "02 · Motara Nagahee Piro-Foormaa & Sanada Gumrukaa", amount: "35,000 ETB", duration: "Guyyaa 10" },
        { title: "03 · Walitti Hidhamiinsa Beeksisa Telegram & SMS", amount: "28,000 ETB", duration: "Guyyaa 9" },
        { title: "04 · Oodiitii Nageenyaa & Bobbaasa Kilaawudii", amount: "22,000 ETB", duration: "Guyyaa 8" },
      ],
    },
  ],
  ti: [
    {
      categoryLabel: "ኢንጂነሪንግ ዌብን ሞባይልን",
      title: "ፖርታል ምምሕዳር ሎጂስቲክስ ኣቢሲንያን ክፍሊት መራሕቲ መካይን ቴሌብርን",
      editorialHeadline:
        "ካብ ብኢድ ዝስራሕ ኤክሴል ናብ ብቐጥታ ዝፍጸም ክፍሊት ቴሌብር ኣብ ልዕሊ 140+ መዝሓሊ መካይን",
      client: "ኣቢሲንያ ፍሬይትን ኮልድ-ቼይንን ሓ.ዝ.ው.ማ",
      clientShort: "ኣቢሲንያ ፍሬይት",
      city: "ኣዲስ ኣበባ",
      summary:
        "ኣብ ልዕሊ 140+ መካይን ንዝግበር ዝነበረ ምምዕርራይ ኤክሴል ብምትካእ ብቀጥታ ቦታ ዝከታተል ዌብን ብቴሌብር ዝኸፍል ናይ ሞባይል ፖርታልን ተሃኒጹ።",
      executiveSummary:
        "ኣቢሲንያ ፍሬይት ናይ 85,000 ብር ውዕል ኢንጂነሪንግ ኣብ YeKis ናብ 4 ምዕራፋት ኤስክሮ መቐሎ። ነፍሲ ወከፍ ስፕሪንት ቅድሚ ምፍናው ገንዘብ ተፈቲሹ ኣብ 21 መዓልታት ግዜ ምምዕርራይ ብ68% ነኪዩ።",
      historicalContext:
        "ቅድሚ ብምዕራፍ ዝድገፍ ምቑጻር፣ መተሓባበርቲ ኣብ ሓሙሽተ ዞባዊ ማእከላት ነዳድን ናይ መገሻ ኣበልን ብወረቐትን ስልክን ይሰርሑ ብምንባሮም ናይ 4 መዓልቲ ምድንጓይ የጋጥም ነይሩ።",
      industryOverview:
        "ኢትዮጵያውያን ትካላት መጓዓዝያን መዝሓልን ብቕልጡፍ ንምስራሕ ቀጥታዊ ምርግጋጽ GPSን ቅጽበታዊ ክፍሊት ሞባይልን የድልዮም።",
      problemPillars: [
        {
          label: "ብድሆ ምፍላይ",
          detail: "140+ ንጡፋት መካይን ንምርግጋጽ ኣበል መገሻን ፊርማ ባንክን ክሳብ 96 ሰዓት ይጽበያ ነይረን።",
        },
        {
          label: "ስፍሓት እቲ ጸገም",
          detail: "ሓሙሽተ ነቑጣታት መቆጻጸሪ ዝተዋደደ ዲጂታላዊ መረጋገጺ ወይ ቅጽበታዊ መኽፈሊ ቴሌብር ኣይነበሮምን።",
        },
        {
          label: "ጽልዋ እቲ ጸገም",
          detail: "ሰራሕተኛታት ፋይናንስ ወረቐት ደረሰኛት ብምምርማር ሰሙናዊ 28 ሰዓታት የጥፍኡ ነይሮም።",
        },
      ],
      methodologyNote:
        "ስራሕ ኣብ 4 ኤስክሮ ስፕሪንት ተኸፋፊሉ፡ ቅርጺ ስርዓት፣ ቀጥታዊ ካርታ፣ ናይ ሞባይል ቼክ-ኢን ምስ ቴሌብር webhookን ፈተነ ጽዕነትን።",
      findingsHeadline: "-68%",
      findingsSub: "ኣብ ሰሙናዊ ግዜ ምምዕርራይ መጓዓዝያን ኣበል መራሕትን ዝተረኽበ ምንካይ",
      budgetEtb: "85,000 ብር",
      timeline: "3 ሰሙን",
      rail: "ቴሌብርን CBE ብርን",
      quote:
        "ነፍሲ ወከፍ ምዕራፍ ምስ ኣጽደቕና ክፍሊት ብኡንብኡ ይፍኖ ነይሩ። ኣብ ባህር ዳር ዝርከብ ዋና መሃንዲስና ኩሎም ስፕሪንታት ብዘይ ዝኾነ ጸገም ክፍሊት ኣቐዲሙ ኣረኪቡ።",
      quoteAuthor: "ያሬድ ከ.",
      quoteRole: "ዳይሬክተር ኦፕሬሽን · ኣቢሲንያ ፍሬይት፣ ኣዲስ ኣበባ",
      outcomeMetric: "-68% ግዜ ምምዕርራይ",
      finalThought:
        "ኤስክሮ ምዕራፋት ንሓደ ትካል ሎጂስቲክስ ኣዲስ ኣበባ ኣብ ባህር ዳር ዝርከብ ላዕለዋይ መሃንዲስ ብሙሉእ ቴክኒካውን ፋይናንሳውን ተሓታትነት ክቆጽር ኣኽኢልዎ።",
      futureImplication:
        "ምዕራፍ 2 ኣብ መስመር ኣዲስ–ጅቡቲ ብተመሳሳሊ 4 ምዕራፋት ብቐጥታ ዝፍኖ መጠንቀቕታ ጉምሩክ ይውስኽ።",
      milestones: [
        { title: "01 · ቅርጺ ስርዓትን API ስኪማን", amount: "15,000 ብር", duration: "4 መዓልቲ" },
        { title: "02 · ዳሽቦርድ መተሓባበርን ቀጥታዊ ካርታን", amount: "30,000 ብር", duration: "7 መዓልቲ" },
        { title: "03 · ቼክ-ኢን መራሕቲን Webhook ቴሌብርን", amount: "25,000 ብር", duration: "6 መዓልቲ" },
        { title: "04 · ፈተነ ጽዕነት፣ QAን ምርካብን", amount: "15,000 ብር", duration: "4 መዓልቲ" },
      ],
    },
    {
      categoryLabel: "ዲዛይንን ፈጠራን",
      title: "መለለዪ ብራንድ ሰደድ ፍሉይ ቡን ካፋን ስርዓት መዐሸግን",
      editorialHeadline:
        "ካብ ዞባዊ ማሕበር ናብ ሰለስተ ኣህጉራዊ ውዕላት ገዛእቲ ዝዓበየ መለለዪ ፍሉይ ቡን",
      client: "ሕብረት ሰደድቲ ቡን ካፋ",
      clientShort: "ካፋ ሰደድቲ",
      city: "ሃዋሳ",
      summary:
        "ናብ ኣውሮጳን ማእከላይ ምብራቕን ንዝለኣኹ ፍሉያት ቡን ዓረቢካ ምሉእ መለለዪ ብራንድ፣ ናይ ክልተ ቋንቋ መዐሸጊ ዲዛይንን መጽሓፍ ገዛእትን ተዳልዩ።",
      executiveSummary:
        "ብ45,000 ብር ኣብ ሰለስተ ደረጃታት ብምዕጻው፣ ሰደድቲ ካፋ ምስ ኣብ ኣዲስ ኣበባ ዝርከብ ስቱድዮ ብራንድ ብርሕቐት ብምስራሕ ብዘይ ክትዕ ናይ ሕትመት ዲዛይን ኣጽዲቖም።",
      historicalContext:
        "ኣብ ደቡብ ኢትዮጵያ ዝርከባ ማሕበራት ቡን ንክኢላታት ዲዛይን ብቐጥታ ክረኽባ ብዘይምኽኣለን ዘይተዓሸገ ጥረ ቡን ብትሑት ዋጋ ይሰዳ ነይረን።",
      industryOverview:
        "ቀጥታ ገዛእቲ ኣውሮጳን ወሽመጥን ቅድሚ ውዕል ምፍራም ታሪኽ ቡን፣ ጽቡቕ መዐሸግን መግለጺ ጽሬትን ይሓቱ።",
      problemPillars: [
        {
          label: "ብድሆ ምፍላይ",
          detail: "ልዑል ነጥቢ ዘለዎም ቡን ዓረቢካ ንገዛእቲ ብተራ ዘይተሓትመ ወረቐት ይቀርቡ ነይሮም።",
        },
        {
          label: "ስፍሓት እቲ ጸገም",
          detail: "ኣብ ትሕቲ 14 መዓልቲ ናይ 250gን 1kgን መዐሸጊ ዲዛይንን ባለ 24 ገጽ ካታሎግን የድሊ ነይሩ።",
        },
        {
          label: "ጽልዋ እቲ ጸገም",
          detail: "ቅድሚኡ ዝነበሩ ዘይስሩዓት ስምምዓት ብሕቶ ሕብርን ስግኣት ቅድመ ክፍሊትን ተዓጊቶም ነይሮም።",
        },
      ],
      methodologyNote:
        "ምስ ዝጭበጡ ፍርያት ዲዛይን ዝተኣሳሰሩ ሰለስተ ምዕራፋት፡ ቬክተር ብራንድ ስርዓት፣ ንሕትመት ድሉው CMYK+Pantoneን ካታሎግ ገዛእትን።",
      findingsHeadline: "3x",
      findingsSub: "ኣብ ኣህጉራዊ ምርኢት ንግዲ ዝተፈረሙ ሰለስተ ዓበይቲ ውዕላት ገዛእቲ",
      budgetEtb: "45,000 ብር",
      timeline: "2 ሰሙን",
      rail: "CBE ብር",
      quote:
        "ኤስክሮ ንቦርድና ኣብ ኣዲስ ኣበባ ዝርከብ ብሉጽ ስቱድዮ ብርሕቐት ንምቑጻር እምነት ሂቡና። ገንዘብ ቅድሚ ምፍናውና ናሙናታት ኣብ ውሽጢ YeKis ገምጊምናዮ።",
      quoteAuthor: "ሜሮን ግ.",
      quoteRole: "ሓላፊት ዕዳጋ ሰደድ · ማሕበር ካፋ፣ ሃዋሳ",
      outcomeMetric: "3 ኣህጉራዊ ውዕላት ገዛእቲ ተፈሪሞም",
      finalThought:
        "ዝተወደበ ገምጋም ናሙና ኣብ መንጎ ማሕበር ሕርሻ ሃዋሳን ስቱድዮ ኣዲስ ኣበባን ዝነበረ ዕንቅፋት እምነት ኣወጊዱ።",
      futureImplication:
        "ማሕበሩ ሕጂ ኣብ ነፍሲ ወከፍ ርብዒ ዓመት ካታሎግ ምህርቲ ብቅጥዒ ምዕራፍ YeKis የዳሉ።",
      milestones: [
        { title: "01 · ስትራተጂ ብራንድ፣ ምልክትን ቅጥዒ ሕብርን", amount: "15,000 ብር", duration: "5 መዓልቲ" },
        { title: "02 · ዲዛይን ከረጢት ሰደድ 250gን 1kgን", amount: "18,000 ብር", duration: "5 መዓልቲ" },
        { title: "03 · ዲጂታል ካታሎግ ገዛእትን መምርሒ ብራንድን", amount: "12,000 ብር", duration: "4 መዓልቲ" },
      ],
    },
    {
      categoryLabel: "ትርጉምን ምምዕርራይ ቋንቋን",
      title: "ትርጉም ኣፕ ጥዕና ኣዴታት ብዙሕ ቋንቋ (ኣምሓርኛ፣ ኦሮምኛን ትግርኛን)",
      editorialHeadline:
        "ልዕሊ 180 ትምህርትታት ስነ-መግቢ ኣዴታት ብሰለስተ ቋንቋታት ኢትዮጵያ ኣብ 10 መዓልቲ ምትርጓም",
      client: "ትካል ተበግሶ ጥዕና ብሩህ NGO",
      clientShort: "ብሩህ ጥዕና NGO",
      city: "ባህር ዳር",
      summary:
        "ንሰራሕተኛታት ኤክስቴንሽን ጥዕና ገጠር 180+ ትምህርትታት ስነ-መግቢ ብኣምሓርኛ፣ ኦሮምኛን ትግርኛን ብሕክምናዊ ደረጃ ምትርጓምን ምቕዳሕ ድምጽን።",
      executiveSummary:
        "ብሩህ ጥዕና ሰለስተ ዝተረጋገጹ ተርጎምቲ ሕክምና ብ38,000 ብር ኤስክሮ ብምውዳድ 100% ምርግጋጽ ጽሬትን ንኦዲት ድሉው ደረሰኝ ቴሌብርን ረኺቡ።",
      historicalContext:
        "ኣብ ገጠር ዝሰርሑ ትካላት NGO ንኣበርከትቲ ዝበቅዕ ሰነድ ፋይናንስ ሒዞም ኣፕሊኬሽናት ብቕልጡፍ ምትርጓም ይጽግሞም ነይሩ።",
      industryOverview:
        "ናይ መስክ ኣፕሊኬሽናት ጥዕና ወጥ ዝኾነ መዝገብ ቃላት ሕክምና፣ መምርሒ ድምጽን ምርግጋጽ ሓኪምን ይደልዩ።",
      problemPillars: [
        {
          label: "ብድሆ ምፍላይ",
          detail: "180 ሕክምናዊ ትምህርትታት ብሓደ ግዜ ብሰለስተ ቋንቋታት ትርጉምን ድምጽን የድልዮም ነይሩ።",
        },
        {
          label: "ስፍሓት እቲ ጸገም",
          detail: "ዘይተመሳሰለ ቃላት ሕክምና ኣብ መንጎ ዞባዊ ተርጎምቲ ናይ መስክ ፈተነ የደንጉይ ነይሩ።",
        },
        {
          label: "ጽልዋ እቲ ጸገም",
          detail: "ኦዲተራት ሓገዝቲ ምስ ዝተረጋገጹ ፋይላት ዝተኣሳሰሩ ዝርዝር ደረሰኛት ይሓቱ ነይሮም።",
        },
      ],
      methodologyNote:
        "ምዕራፍ 1 ሰለስተ-ቋንቋ መዝገብ ቃላት ሕክምና ዓጺዩ፤ ብድሕሪኡ ምዕራፍ 2 ትርጉምን ምዕራፍ 3 QA ድምጽን።",
      findingsHeadline: "180+",
      findingsSub: "ብ100% መርመራ ጽሬት ዝተተርጎሙን ብድምጺ ዝተረጋገጹን ትምህርትታት",
      budgetEtb: "38,000 ብር",
      timeline: "10 መዓልቲ",
      rail: "ቴሌብር",
      quote:
        "ብYeKis ኣቢልና TIN ዘለዎም ሰለስተ ዝተረጋገጹ ተርጎምቲ ምቑጻርና ንጉጅለ ፋይናንስና ናይ ሰሙናት ስራሕ ኦዲት ኣድሒኑልና።",
      quoteAuthor: "ዶ/ር ሳራ መ.",
      quoteRole: "ኣተሓባባሪት መደብ · ብሩህ ጥዕና፣ ባህር ዳር",
      outcomeMetric: "180 ትምህርትታት ብ100% QA ተተርጊሞም",
      finalThought:
        "ኣብ ምዕራፍ 01 መዝገብ ቃላት ምዕጻው ዳግማይ ስራሕ ብምውጋድ ኣብ ኩሎም 180 ትምህርትታት ሓድነት ቃላት ኣውሒሱ።",
      futureImplication:
        "ብተመሳሳሊ ሰለስተ-ደረጃ መስርሕ ናብ ቋንቋታት ሶማልኛን ሲዳምኛን ተስፋሕፊሑ።",
      milestones: [
        { title: "01 · መዝገብ ቃላት ሕክምናን ምስምማዕን", amount: "8,000 ብር", duration: "2 መዓልቲ" },
        { title: "02 · ጽሑፋት UIን ትርጉም ትምህርትታትን", amount: "18,000 ብር", duration: "5 መዓልቲ" },
        { title: "03 · ቅዳሕ ድምጽን ኣብ ውሽጢ ኣፕ ምርመራ ቋንቋን", amount: "12,000 ብር", duration: "3 መዓልቲ" },
      ],
    },
    {
      categoryLabel: "ዲጂታል ማርኬቲንግ",
      title: "ወፍሪ መሸጣ ቴሌግራም + ቲክቶክ ሸገር ሆምን ኤሌክትሮኒክስን",
      editorialHeadline:
        "12 ሓጸርቲ ቪድዮታት ኣምሓርኛን ቦት ካታሎግ ቴሌግራምን ናብ 3.4x መኽሰብ ምቕያር",
      client: "ሸገር ሪቴይል ግሩፕ",
      clientShort: "ሸገር ሪቴይል",
      city: "ኣዲስ ኣበባ",
      summary:
        "12 ሓጸርቲ ቪድዮታት ፍርያት ተዳልዮም፣ ቦት ካታሎግ ቴሌግራም ተሃኒጹን ንጹር ውጽኢት ዝዕቅን ወፍሪ መሸጣ በዓል ተኻይዱን።",
      executiveSummary:
        "ሸገር ሪቴይል ዘይተወሰነ ወርሓዊ ክፍሊት ኤጀንሲ ብ52,000 ብር ውዕል ምዕራፍ ምስ ቪድዮ ስቱድዮን ቦት ቴሌግራምን ብምትእስሳር ተኪእዎ።",
      historicalContext:
        "ኣብ ኣዲስ ኣበባ ዝርከቡ ነጋዶ ንጹር ዝዕቀን ውጽኢት ከይረኣዩ ቀዲሞም ወርሓዊ ክፍሊት ማርኬቲንግ ይኸፍሉ ነይሮም።",
      industryOverview:
        "ውጽኢታዊ ንግዲ ኣብ ኢትዮጵያ ብሓጸርቲ ቪድዮታት TikTok/Reelsን ቅጽበታዊ ትእዛዝ ቴሌግራምን ይካየድ።",
      problemPillars: [
        {
          label: "ብድሆ ምፍላይ",
          detail: "ወፍሪ በዓል ኣብ 4 ሰሙን 12 ቪድዮታት ስቱድዮን ንጡፍ ቦት ትእዛዝ ቴሌግራምን የድልዮ ነይሩ።",
        },
        {
          label: "ስፍሓት እቲ ጸገም",
          detail: "ቅድሚኡ ዝነበረ ወጻኢ መወዓውዒ ኣብ መንጎ ትርኢት ቪድዮን ትእዛዛት ቴሌግራምን መራኸቢ ኣይነበሮን።",
        },
        {
          label: "ጽልዋ እቲ ጸገም",
          detail: "ሰራሕተኛታት መሸጣ ብዘይተወደቡ መልእኽትታት DM ይጽዕቑ ነይሮም።",
        },
      ],
      methodologyNote:
        "ኣብ ሰለስተ ምዕራፋት ውጽኢት ተኸፋፊሉ፡ 6 ቪድዮታት ቀዳማይ ዙር፣ ቦት ካታሎግ ቴሌግራምን ካልኣይ ዙር ምምሕያሽን።",
      findingsHeadline: "3.4x",
      findingsSub: "ኣብ ወጻኢ ወፍሪ በዓል ዝተረጋገጸ እቶትን 3x ዝዓበየ ትእዛዝ ቴሌግራምን",
      budgetEtb: "52,000 ብር",
      timeline: "4 ሰሙን",
      rail: "ቴሌብር",
      quote:
        "ነፍሲ ወከፍ ምዕራፍ ምስ ዝተረጋገጹ ቪድዮታትን ምድላው ወፍርን ኣተኣሳሲርናዮ። ሕቶታት መሸጣ ቻናል ቴሌግራምና ኣብ ውሽጢ ክልተ ሰሙን ብሰለስተ ዕጽፊ ወሲኹ።",
      quoteAuthor: "ሃና ግ.",
      quoteRole: "መስራቲት · ሸገር ሪቴይል ግሩፕ፣ ኣዲስ ኣበባ",
      outcomeMetric: "3.4x ምላሽ ወጻኢ ወፍሪ",
      finalThought:
        "ምስ ፍርያት ዝተኣሳሰረ ኤስክሮ ንቅልጣፈ ምድላው ቪድዮ ምስ ዝዕቀን መሸጣ ቴሌግራም ኣራኺብዎ።",
      futureImplication:
        "ሸገር ሪቴይል ሕጂ ነፍሲ ወከፍ ወቅታዊ ምልላይ ፍርያት ብውዕል 3 ምዕራፋት የካይድ።",
      milestones: [
        { title: "01 · ምድላው ጽሑፍን 6 ቪድዮታት ስቱድዮን", amount: "20,000 ብር", duration: "10 መዓልቲ" },
        { title: "02 · ቦት ካታሎግ ቴሌግራምን ክትትል ፒክሰልን", amount: "14,000 ብር", duration: "7 መዓልቲ" },
        { title: "03 · ካልኣይ ዙር ቪድዮታትን ምምሕያሽ መሸጣን", amount: "18,000 ብር", duration: "11 መዓልቲ" },
      ],
    },
    {
      categoryLabel: "ዳታን ደገፍ ቤት ጽሕፈትን",
      title: "መድረኽ ትንተና ዋጋ እኽሊ ዕዳጋን ክምችት ማሕበራትን",
      editorialHeadline:
        "ልዕሊ 42,000 ታሪኻዊ መዛግብቲ ብምውዳድ ሰሙናዊ ጸብጻብ ካብ 3 መዓልቲ ናብ 15 ደቒቕ ምንካይ",
      client: "መርበብ ሕብረት ስራሕ ማሕበራት ሰሜናዊ ከበሳ",
      clientShort: "ሃይላንድስ Co-op",
      city: "መቐለ",
      summary:
        "ናይ 4 ዓመት ታሪኻዊ መዛግብቲ ምጽራይ፣ ሰሙናዊ መመላእታ ዋጋ ወረዳታት ኣውቶማቲክ ምግባርን ዳሽቦርድ Power BIን Pythonን ምቕራብን።",
      executiveSummary:
        "ብ64,000 ብር ኣብ ኣርባዕተ ምዕራፋት ኤስክሮ ዝተኻየደ ስራሕ ዝተበታተኑ ፋይላት ኤክሴል ናብ ዘመናዊ ስርዓት Python + Power BI ቀዪርዎም።",
      historicalContext:
        "ናይ 4 ዓመት ዋጋ እኽልን መኽዘን ክምችትን ኣብ ዝተፈላለዩ ፋይላት ተደጋጋሚ ኮድን ጎደሎ ዕለትን ተበታቲኖም ነይሮም።",
      industryOverview:
        "ማሕበራት ሕርሻ መጓዓዝያ ንምምዳብን ንሓረስቶት ቅኑዕ ዋጋ ንምኽፋልን ቅልጡፍ ሰሙናዊ ሓበሬታ ዋጋ የድልዮም።",
      problemPillars: [
        {
          label: "ብድሆ ምፍላይ",
          detail: "42,000+ ታሪኻዊ መስመራት ምጽራይ፣ ምውጋድ ድግግሞሽን ምምዕርራይ ስኪማን የድልዮም ነይሩ።",
        },
        {
          label: "ስፍሓት እቲ ጸገም",
          detail: "ሰሙናዊ ጸብጻብ ምድላው ንተንተንቲ ኣብ ነፍሲ ወከፍ ሰሙን 3 ምሉእ መዓልቲ ይወስድ ነይሩ።",
        },
        {
          label: "ጽልዋ እቲ ጸገም",
          detail: "ዝተደናጎየ ሓበሬታ ክምችት ኣብ መንጎ መኽዘናት ማሕበራት ዘይምምጥጣን የስዕብ ነይሩ።",
        },
      ],
      methodologyNote:
        "ኣርባዕተ ተኸታተልቲ ምዕራፋት ዳታ፡ ምጽራይ ታሪኻዊ ዳታ፣ ስኪማ ሞባይል፣ ዳሽቦርድ BIን ስልጠና ሰራሕተኛታትን።",
      findingsHeadline: "42K+",
      findingsSub: "ዝተወደቡ ታሪኻዊ መዛግብቲ፤ ሰሙናዊ ጸብጻብ ካብ 3 መዓልቲ ናብ 15 ደቒቕ ነኪዩ",
      budgetEtb: "64,000 ብር",
      timeline: "3 ሰሙን",
      rail: "CBE ብር",
      quote:
        "ነፍሲ ወከፍ ርክክብ ዳታ ቅድሚ ክፍሊት ኣብ ውሽጢ መድረኽ ተረጋጊጹ። ተንተንትና ሕጂ ሰሙናዊ ጸብጻብ ኣብ ክንዲ 3 መዓልቲ ብ15 ደቒቕ ይሕትሙ።",
      quoteAuthor: "ቤቲ ኣ.",
      quoteRole: "ሓላፊት ኦፕሬሽን · ሃይላንድስ Co-op፣ መቐለ",
      outcomeMetric: "42,000+ ታሪኻዊ መዛግብቲ ተወዲቦም",
      finalThought:
        "ኣብ ነፍሲ ወከፍ ምዕራፍ ጽሬት ዳታ ምርግጋጽ እቲ ናይ መወዳእታ ዳሽቦርድ BI ኣብ ጽሩይን እሙንን መረዳእታ ክምስረት ኣኽኢሉ።",
      futureImplication:
        "ካብ ተወሳኺ 18 ዕዳጋታት ወረዳ ብSMS ዝመጽእ ዋጋ ሕጂ ብቐጥታ ናብቲ ስርዓት ይኣቱ።",
      milestones: [
        { title: "01 · ምጽራይ ታሪኻዊ CSV/ኤክሴልን ምውጋድ ድግግሞሽን", amount: "16,000 ብር", duration: "5 መዓልቲ" },
        { title: "02 · ስኪማ ምእካብ ዳታ ብሞባይል", amount: "16,000 ብር", duration: "5 መዓልቲ" },
        { title: "03 · ዳሽቦርድ ዋጋን ክምችትን", amount: "20,000 ብር", duration: "6 መዓልቲ" },
        { title: "04 · ስልጠና ሰራሕተኛታትን ርክክብ ሰነድን", amount: "12,000 ብር", duration: "5 መዓልቲ" },
      ],
    },
    {
      categoryLabel: "ኢንጂነሪንግ ዌብን ሞባይልን",
      title: "ፖርታል ትእዛዝ B2B ኣቕረብቲ ዓለባ ድሬዳዋን መከታተሊ ሰነድ ጉምሩክን",
      editorialHeadline:
        "ንኣፍራዪ ሰደድ 100% ናይ ፕሮ-ፎርማ ደረሰኛትን ፍቓድ ጉምሩክን ናብ ዲጂታል ምቕያር",
      client: "ኢስት ሪፍት ማኑፋክቸሪንግ ሓ.ዝ.ው.ማ",
      clientShort: "ኢስት ሪፍት Mfg",
      city: "ድሬዳዋ",
      summary:
        "ብግደ ዝተወሰነ ፊርማ ሰነድ፣ ምፍጣር ፕሮ-ፎርማ ብETB/USDን ኣውቶማቲክ መፍለጢ SMS/ቴሌግራምን ዘለዎ ውሑስ ፖርታል ኣቕረብቲ ተሃኒጹ።",
      executiveSummary:
        "ኢስት ሪፍት ማኑፋክቸሪንግ ናይ 110,000 ብር ምሉእ ፖርታል ብ4 ዝተረጋገጹ ምዕራፋት ብምፍጻም ኣብ 5 ሰሙን 100% ፍቓድ ፕሮ-ፎርማ ናብ ኦንላይን ኣሰጋጊሩ።",
      historicalContext:
        "ዕድጊ ዓለባ ኣብ ኢሜይል PDFን ኣካላዊ ማሕተምን ይምርኮስ ብምንባሩ ኣብ መንጎ ፋብሪካን ወኪላት ጉምሩክን ምድንጓይ ይፈጥር ነይሩ።",
      industryOverview:
        "ኢንዱስትሪ ፓርክታትን ሰደድትን ድሬዳዋ ብዙሕ ግደ ዘለዎ መዝገብ ኦዲትን ቅልጡፍ መፍለጥን የድልዮም።",
      problemPillars: [
        {
          label: "ብድሆ ምፍላይ",
          detail: "ብኢድ ዝስራሕ ምምዕርራይ ፕሮ-ፎርማን ፊርማ ጉምሩክን ምልኣኽ ጥረ ኣቕሑ የደንጉዩ ነይሮም።",
        },
        {
          label: "ስፍሓት እቲ ጸገም",
          detail: "ንሓለፍቲ ዕድጊ፣ ኣቕረብትን ወኪላት ጉምሩክን ምሉእ መዝገብ ኦዲት ዘለዎ መእተዊ የድሊ ነይሩ።",
        },
        {
          label: "ጽልዋ እቲ ጸገም",
          detail: "ልዑል ዋጋ ዘለዎ ህንጸት B2B ሶፍትዌር ንፋብሪካን ጉጅለ ኢንጂነሪንግን ንምሕላው ጽኑዕ ኤስክሮ ጠሊቡ።",
        },
      ],
      methodologyNote:
        "ብ4 ዝተመርመሩ ምዕራፋት ቀሪቡ፡ RBAC መእተዊ፣ ሞተር ፕሮ-ፎርማን ጉምሩክን፣ መፍለጢ ቴሌግራም/SMSን ምዝርጋሕ ክላውድን።",
      findingsHeadline: "100%",
      findingsSub: "ዲጂታላዊ መስርሕ ሰነድ ፕሮ-ፎርማን ጉምሩክን ብዘይ ጌጋ ኦዲት",
      budgetEtb: "110,000 ብር",
      timeline: "5 ሰሙን",
      rail: "CBE ብርን M-Pesaን",
      quote:
        "110,000 ብር ህንጸት ናብ 4 ንጹራት ምዕራፋት ምምቃልና ንጉጅለ ዕድግናን ንፍሪላንስ ኢንጂነራትን 100% ኣወሃሂዱ ኣጽኒዑ።",
      quoteAuthor: "ናርዶስ ኣ.",
      quoteRole: "መራሒት ቴክኒክ · ኢስት ሪፍት ማኑፋክቸሪንግ፣ ድሬዳዋ",
      outcomeMetric: "100% ዲጂታላዊ መስርሕ ፕሮ-ፎርማ",
      finalThought:
        "ብ4-ምዕራፍ ኤስክሮ ን110,000 ብር ትካላዊ ህንጸት ንኽልቲኦም ወገናት ዝግመት፣ ግልጽን ካብ ስግኣት ነጻን ገይርዎ።",
      futureImplication:
        "ሕጂ ልዕሊ 60 ዞባዊ ኣቕረብቲ ጥረ ኣቕሑ ናብቲ ኣውቶማቲክ ፖርታል ይጽንበሩ ኣለዉ።",
      milestones: [
        { title: "01 · መእተዊ RBACን ምዝገባ ኣቕረብትን", amount: "25,000 ብር", duration: "8 መዓልቲ" },
        { title: "02 · ሞተር ደረሰኝ ፕሮ-ፎርማን ሰነድ ጉምሩክን", amount: "35,000 ብር", duration: "10 መዓልቲ" },
        { title: "03 · ውህደት መፍለጢ ቴሌግራምን SMSን", amount: "28,000 ብር", duration: "9 መዓልቲ" },
        { title: "04 · ኦዲት ድሕነትን ምዝርጋሕ ክላውድን", amount: "22,000 ብር", duration: "8 መዓልቲ" },
      ],
    },
  ],
};

export function getCaseStudies(language: Language): CaseStudyItem[] {
  const fieldsList = STUDIES_BY_LANG[language] ?? STUDIES_BY_LANG.en;
  return STUDY_BASE.map((base, idx) => ({
    ...base,
    ...fieldsList[idx],
  }));
}

export const DISCIPLINES_BY_LANG: Record<Language, DisciplineItem[]> = {
  en: [
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
  ],
  am: [
    {
      id: "ENGINEERING",
      title: "ኢንጂነሪንግ",
      escrowRange: "45,000 – 120,000 ብር",
      avgTranches: "4 የምዕራፍ ክፍያዎች",
      rails: "ቴሌብር · CBE ብር · ኤም-ፔሳ",
      description:
        "ሙሉ ዌብ ፖርታሎች፣ የቴሌብር ውህደቶች፣ የሎጂስቲክስ መቆጣጠሪያዎች እና በየስፕሪንቱ የተረጋገጡ B2B ሲስተሞች።",
      featuredStudyId: "cs-abyssinia-fleet",
    },
    {
      id: "DESIGN",
      title: "ብራንዲንግ",
      escrowRange: "25,000 – 65,000 ብር",
      avgTranches: "3 የምዕራፍ ክፍያዎች",
      rails: "CBE ብር · ቴሌብር",
      description:
        "ለኤክስፖርት ዝግጁ የማሸጊያ ዲዛይኖች፣ የብራንድ መመሪያዎች፣ UI/UX ሲስተሞች እና በደረጃ የተረጋገጡ ካታሎጎች።",
      featuredStudyId: "cs-kaffa-coffee",
    },
    {
      id: "MARKETING",
      title: "ዕድገት እና ቪዲዮ",
      escrowRange: "30,000 – 75,000 ብር",
      avgTranches: "3 የምዕራፍ ክፍያዎች",
      rails: "ቴሌብር",
      description:
        "የስቱዲዮ አማርኛ ቪዲዮዎች፣ አውቶማቲክ የቴሌግራም ካታሎግ ቦቶች እና ከውጤት ጋር የተያያዙ የሽያጭ ዘመቻዎች።",
      featuredStudyId: "cs-sheger-growth",
    },
    {
      id: "LOCALIZATION",
      title: "ትርጉም እና አካባቢያዊ ማስማማት",
      escrowRange: "20,000 – 55,000 ብር",
      avgTranches: "3 የምዕራፍ ክፍያዎች",
      rails: "ቴሌብር · CBE ብር",
      description:
        "በአማርኛ፣ በአፋን ኦሮሞ እና በትግርኛ የሕክምና፣ የቴክኒክ እና የNGO ትርጉም ከቃላት መዝገብ እና የድምጽ ፍተሻ ጋር።",
      featuredStudyId: "cs-zemen-localization",
    },
    {
      id: "DATA",
      title: "ዳታ እና BI ሲስተሞች",
      escrowRange: "35,000 – 85,000 ብር",
      avgTranches: "4 የምዕራፍ ክፍያዎች",
      rails: "CBE ብር",
      description:
        "የታሪክ ዳታ ማጽዳት፣ አውቶማቲክ የመስክ መረጃ መሰብሰቢያ እና የPython / Power BI የትንተና ዳሽቦርዶች።",
      featuredStudyId: "cs-tigray-agri-data",
    },
  ],
  om: [
    {
      id: "ENGINEERING",
      title: "Injinariingii",
      escrowRange: "45,000 – 120,000 ETB",
      avgTranches: "Boqonnaa 4",
      rails: "Telebirr · CBE Birr · M-Pesa",
      description:
        "Poortaalii weebii guutuu, walitti hidhamiinsa Telebirr, siistama bobbaasaa fi sirnoota B2B sadarkaan mirkanaa'an.",
      featuredStudyId: "cs-abyssinia-fleet",
    },
    {
      id: "DESIGN",
      title: "Biraandii & Dizaayinii",
      escrowRange: "25,000 – 65,000 ETB",
      avgTranches: "Boqonnaa 3",
      rails: "CBE Birr · Telebirr",
      description:
        "Sirna saamsaa al-ergii, qajeelfama biraandii, UI/UX fi kitaabota bittootaa ragaa maxxansaa mirkanaa'aniin.",
      featuredStudyId: "cs-kaffa-coffee",
    },
    {
      id: "MARKETING",
      title: "Guddina & Viidiyoo",
      escrowRange: "30,000 – 75,000 ETB",
      avgTranches: "Boqonnaa 3",
      rails: "Telebirr",
      description:
        "Viidiyoowwan gaggabaaboo istudiyoo, bootii kaataaloogii Telegram fi duula gurgurtaa bu'aa ROAS qabuu.",
      featuredStudyId: "cs-sheger-growth",
    },
    {
      id: "LOCALIZATION",
      title: "Hiika Afaanii",
      escrowRange: "20,000 – 55,000 ETB",
      avgTranches: "Boqonnaa 3",
      rails: "Telebirr · CBE Birr",
      description:
        "Hiika yaalaa, teeknikaa fi NGO Amaaraa, Afaan Oromoo fi Tigrinyatti kuusaa jechootaa fi QA sagaleetiin.",
      featuredStudyId: "cs-zemen-localization",
    },
    {
      id: "DATA",
      title: "Daataa & BI",
      escrowRange: "35,000 – 85,000 ETB",
      avgTranches: "Boqonnaa 4",
      rails: "CBE Birr",
      description:
        "Qulqulleessa daataa seenaa, iskiimaa dirree ofumaa fi daashboordii xiinxalaa Python / Power BI.",
      featuredStudyId: "cs-tigray-agri-data",
    },
  ],
  ti: [
    {
      id: "ENGINEERING",
      title: "ኢንጂነሪንግ",
      escrowRange: "45,000 – 120,000 ብር",
      avgTranches: "4 ምዕራፋት",
      rails: "ቴሌብር · CBE ብር · M-Pesa",
      description:
        "ምሉእ ዌብ ፖርታላት፣ ውህደት ቴሌብር፣ ስርዓት መጓዓዝያን ብስፕሪንት ዝተረጋገጹ B2B መድረኻትን።",
      featuredStudyId: "cs-abyssinia-fleet",
    },
    {
      id: "DESIGN",
      title: "ብራንዲንግ",
      escrowRange: "25,000 – 65,000 ብር",
      avgTranches: "3 ምዕራፋት",
      rails: "CBE ብር · ቴሌብር",
      description:
        "ንሰደድ ድሉው ስርዓት መዐሸጊ፣ መምርሒ ብራንድ፣ UI/UXን ብደረጃ ዝጸደቑ ካታሎጋት ገዛእትን።",
      featuredStudyId: "cs-kaffa-coffee",
    },
    {
      id: "MARKETING",
      title: "ዕብየትን ቪድዮን",
      escrowRange: "30,000 – 75,000 ብር",
      avgTranches: "3 ምዕራፋት",
      rails: "ቴሌብር",
      description:
        "ቪድዮታት ስቱድዮ፣ ኣውቶማቲክ ቦት ካታሎግ ቴሌግራምን ምስ ዝዕቀን ውጽኢት ዝተኣሳሰሩ ወፍርታትን።",
      featuredStudyId: "cs-sheger-growth",
    },
    {
      id: "LOCALIZATION",
      title: "ትርጉምን ምምዕርራይን",
      escrowRange: "20,000 – 55,000 ብር",
      avgTranches: "3 ምዕራፋት",
      rails: "ቴሌብር · CBE ብር",
      description:
        "ሕክምናዊ፣ ቴክኒካውን NGOን ትርጉም ብኣምሓርኛ፣ ኦሮምኛን ትግርኛን ምስ መዝገብ ቃላትን QA ድምጽን።",
      featuredStudyId: "cs-zemen-localization",
    },
    {
      id: "DATA",
      title: "ዳታን BIን",
      escrowRange: "35,000 – 85,000 ብር",
      avgTranches: "4 ምዕራፋት",
      rails: "CBE ብር",
      description:
        "ምጽራይ ታሪኻዊ ዳታ፣ ስኪማ ምእካብ ዳታ ሞባይልን ዳሽቦርዳት ትንተና Python / Power BIን።",
      featuredStudyId: "cs-tigray-agri-data",
    },
  ],
};

export const CASE_STUDIES_COPY: Record<Language, CaseStudiesCopy> = {
  en: {
    breadcrumbHome: "Home",
    breadcrumbCases: "Case Studies",
    filterPrefix: "Filter ·",
    feesTag: "FEES",
    feesLabel: "Fee Schedule",
    studioTag: "STUDIO",
    aboutLabel: "About",
    heroSectionAria: "Case Studies Studio Hero",
    heroPrefix: "we prove",
    heroBraceWord: "escrow",
    heroSuffix: "results in practice",
    hoverDossier01: "{ 01 · INSPECT DOSSIER }",
    hoverDossier02: "{ 02 · INSPECT DOSSIER }",
    hoverAria01: "Inspect Abyssinia Logistics case study dossier",
    hoverAria02: "Inspect Kaffa Specialty Export case study dossier",
    heroTagline:
      "The benchmark for milestone-verified engineering, brand identity, and regional execution across Ethiopia.",
    scrollPill: "{ SCROLL ↓ }",
    manifestoAria: "Our Approach and Proof",
    proofBraceWord: "PROOF",
    proofSegments: [
      { text: "Great delivery is more than just promises—it’s about" },
      { text: "clear milestones, verified work, and measurable impact.", highlight: true },
    ],
    kpiVolumeSuffix: "K ETB",
    kpiVolumeLabel: "FEATURED ESCROW VOLUME",
    kpiPhasesSuffix: " PHASES",
    kpiPhasesLabel: "VERIFIED MILESTONES",
    kpiReleaseLabel: "ON-TIME RELEASE",
    worksAria: "Selected Case Studies",
    selectedWorkKicker: "{ SELECTED WORK }",
    filterAria: "Filter case studies by discipline",
    categories: [
      { id: "ALL", label: "All Stories" },
      { id: "ENGINEERING", label: "Engineering" },
      { id: "DESIGN", label: "Design & Brand" },
      { id: "MARKETING", label: "Growth & Reels" },
      { id: "LOCALIZATION", label: "Localization" },
      { id: "DATA", label: "Data & BI" },
    ],
    openDossierPill: "OPEN DOSSIER",
    openDossierBtn: "OPEN DOSSIER →",
    clientPrefix: "Client:",
    milestonesLabel: "Milestones",
    openFullDossier: "→ Open full editorial dossier",
    servicesAria: "Marketplace Disciplines",
    servicesKicker: "{ SERVICES }",
    rowEscrowRange: "ESCROW RANGE",
    rowSettlement: "SETTLEMENT",
    rowTranches: "TRANCHES",
    testimonialsAria: "Client Testimonials",
    testimonialsKicker: "{ TESTIMONIALS }",
    chooseTestimonialAria: "Choose client testimonial",
    readDossierPrefix: "Read",
    readDossierSuffix: "(case study dossier)",
    outroAria: "Start a milestone project",
    outroTitleLine1: "Got a project in mind?",
    outroTitleLine2: "Let’s fund it safely.",
    outroSubtitle:
      "Post your scope for free, lock funds in ETB via Telebirr, CBE Birr, or M-Pesa only when you hire, and release payment milestone by milestone.",
    calculateFees: "Calculate Escrow Fees",
    outroPillEmail: "{start-project@yekis.et}",
    modal: {
      dossierPrefix: "DOSSIER #",
      prevAria: "Previous case study dossier",
      nextAria: "Next case study dossier",
      closeAria: "Close case study dossier",
      spreadTabsAria: "Dossier spread selector",
      tabs: [
        { id: "all", label: "All 4 Spreads" },
        { id: "1", label: "01 · Executive Summary" },
        { id: "2", label: "02 · Problem Statement" },
        { id: "3", label: "03 · Methodology & Findings" },
        { id: "4", label: "04 · Solutions & Ledger" },
      ],
      spread1Aria: "Spread 1: Client Mandate and Executive Summary",
      clientMandateTitle: "Client Mandate",
      contractScopeTitle: "Contract Scope & Escrow Structure",
      escrowRailPrefix: "ESCROW RAIL:",
      cityPrefix: "CITY:",
      tocSummaryTitle: "Table of Contents & Summary",
      tocRows: [
        { num: "02", label: "Client Mandate", spread: "1" },
        { num: "06", label: "Methodology", spread: "3" },
        { num: "03", label: "Executive Summary", spread: "1" },
        { num: "07", label: "Quantified Findings", spread: "3" },
        { num: "04", label: "Background Info", spread: "2" },
        { num: "08", label: "Milestone Ledger", spread: "4" },
        { num: "05", label: "Problem Statement", spread: "2" },
        { num: "09", label: "Conclusion & Next", spread: "4" },
      ],
      execSummaryTitle: "Executive Summary",
      contractConclusionsTitle: "Contract Conclusions",
      conclusion1Title: "100% Tranche Verification:",
      conclusion1Body: (budget) =>
        `Every birr of the ${budget} budget was locked prior to kickoff and released strictly upon verified deliverable approval.`,
      conclusion2Title: "Measurable Outcome:",
      conclusion2Body: (metric, timeline, count) =>
        `Achieved ${metric} within ${timeline} across ${count} structured milestones.`,
      categoryPrefix: "CATEGORY:",
      totalPrefix: "TOTAL:",
      spread2Aria: "Spread 2: Background Information and Problem Statement",
      bgInfoTitle: "Background Information",
      opBaselineLabel: "Operational Baseline",
      histContextTitle: "Historical Context",
      marketLandscapeLabel: "Market Landscape",
      industryOverviewTitle: "Industry Overview",
      chartTitle: "Delivery Velocity & Verification Index (Sprint 1 → Final)",
      chartIndexLabel: "INDEX (0–100)",
      chartLegendAfter: "Yekis Milestone Trajectory",
      chartLegendBefore: "Pre-Escrow Baseline",
      baselineAuditFoot: "BASELINE AUDIT",
      verifiedFoot: "VERIFIED BY YEKIS",
      problemStatementTitle: "Problem Statement",
      keyBottleneck: "KEY BOTTLENECK",
      problemRiskParagraph:
        "Without milestone-locked escrow, both client procurement teams and remote specialists faced asymmetric delivery and payment risk.",
      problemRiskQuote: "“Clear milestone definitions turned risk into predictable execution.”",
      diagnosticFoot: "DIAGNOSTIC REVIEW",
      tranchesDefinedSuffix: "TRANCHES DEFINED",
      spread3Aria: "Spread 3: Methodology and Quantified Findings",
      methodologyTitle: "Methodology",
      protocolTitle: "Escrow & Sprint Verification Protocol",
      verificationMetricsTitle: "VERIFICATION METRICS",
      metricLocked: "Escrow Locked Upfront",
      metricFirstPass: "First-Pass Milestone QA",
      metricApproved: "100% Approved",
      metricRail: "Wallet Settlement Rail",
      qaApproachTitle: "Analytical & QA Approach",
      qaApproachBody:
        "Each deliverable tranche was inspected against pre-agreed acceptance criteria before instant payout release.",
      protocolFoot: "PROTOCOL: MILESTONE ESCROW",
      zeroDisputesFoot: "ZERO DISPUTES",
      findingsTitle: "Findings",
      breakdownTitle: "Data Analysis & Settlement Breakdown",
      kpiEscrowed: "Total Escrowed",
      kpiReleased: "Tranches Released",
      kpiPayoutSpeed: "Payout Speed",
      kpiPayoutVal: "< 15 min",
      resultsObsTitle: "Results & Observations",
      resultsObsSuffix: "verified upon final milestone sign-off.",
      findingsBullets: (count) => [
        "100% of milestone funds were deposited in ETB prior to sprint commencement.",
        "Automated receipts generated for both client accounting and freelancer wallet ledger.",
        `Zero scope creep or delayed bank reconciliation across all ${count} tranches.`,
      ],
      outcomeFootPrefix: "OUTCOME:",
      verified100Foot: "100% VERIFIED",
      spread4Aria: "Spread 4: Solutions, Milestone Ledger and Conclusion",
      solutionsTitle: "Solutions & Milestone Ledger",
      ringApproved: "Milestones Approved",
      ringNetPayout: "Net Talent Payout",
      thDeliverable: "Milestone Deliverable",
      thWindow: "Window",
      thTranche: "Escrow Tranche",
      allTranchesFoot: (count) => `ALL ${count} TRANCHES RELEASED`,
      conclusionTitle: "Conclusion",
      finalThoughtsTitle: "Final Thoughts",
      futureTitle: "Implications For Future",
      postSimilar: "Post a Similar Project",
      dossierFoot: "YEKIS CASE STUDY DOSSIER",
      endReportFoot: "END OF REPORT",
    },
  },
  am: {
    breadcrumbHome: "መነሻ",
    breadcrumbCases: "የተሳኩ ፕሮጀክቶች",
    filterPrefix: "ማጣሪያ ·",
    feesTag: "ክፍያ",
    feesLabel: "ክፍያዎች",
    studioTag: "ስቱዲዮ",
    aboutLabel: "ስለ እኛ",
    heroSectionAria: "የተሳኩ ፕሮጀክቶች መግቢያ",
    heroPrefix: "በተግባር",
    heroBraceWord: "ኤስክሮን",
    heroSuffix: "ውጤታማ እናደርጋለን",
    hoverDossier01: "{ 01 · ሰነድ ይመልከቱ }",
    hoverDossier02: "{ 02 · ሰነድ ይመልከቱ }",
    hoverAria01: "የአቢሲኒያ ሎጂስቲክስ ፕሮጀክት ሰነድ ይመልከቱ",
    hoverAria02: "የካፋ ቡና ፕሮጀክት ሰነድ ይመልከቱ",
    heroTagline:
      "በመላው ኢትዮጵያ በምዕራፍ የተረጋገጠ ኢንጂነሪንግ፣ የብራንድ ዲዛይን እና የክልል ሥራ አፈጻጸም መለኪያ።",
    scrollPill: "{ ወደ ታች ↓ }",
    manifestoAria: "የእኛ አቀራረብ እና ማረጋገጫ",
    proofBraceWord: "ማረጋገጫ",
    proofSegments: [
      { text: "ታላቅ ውጤት ከቃል ኪዳን በላይ ነው—እሱም ስለ" },
      { text: "ግልጽ ምዕራፎች፣ የተረጋገጠ ሥራ እና የሚለካ ተጽዕኖ ነው።", highlight: true },
    ],
    kpiVolumeSuffix: "ሺ ብር",
    kpiVolumeLabel: "የተመረጡ የኤስክሮ መጠን",
    kpiPhasesSuffix: " ምዕራፎች",
    kpiPhasesLabel: "የተረጋገጡ ምዕራፎች",
    kpiReleaseLabel: "በሰዓቱ የተለቀቀ",
    worksAria: "የተመረጡ ፕሮጀክቶች",
    selectedWorkKicker: "{ የተመረጡ ሥራዎች }",
    filterAria: "ፕሮጀክቶችን በዘርፍ አጣራ",
    categories: [
      { id: "ALL", label: "ሁሉም ታሪኮች" },
      { id: "ENGINEERING", label: "ኢንጂነሪንግ" },
      { id: "DESIGN", label: "ዲዛይን እና ብራንድ" },
      { id: "MARKETING", label: "ዕድገት እና ቪዲዮ" },
      { id: "LOCALIZATION", label: "ትርጉም" },
      { id: "DATA", label: "ዳታ እና BI" },
    ],
    openDossierPill: "ሰነድ ክፈት",
    openDossierBtn: "ሰነድ ክፈት →",
    clientPrefix: "ደንበኛ:",
    milestonesLabel: "ምዕራፎች",
    openFullDossier: "→ ሙሉ የፕሮጀክት ሰነድ ክፈት",
    servicesAria: "የገበያ ቦታ ዘርፎች",
    servicesKicker: "{ አገልግሎቶች }",
    rowEscrowRange: "የኤስክሮ መጠን",
    rowSettlement: "የክፍያ መስመር",
    rowTranches: "ምዕራፎች",
    testimonialsAria: "የደንበኞች ምስክርነት",
    testimonialsKicker: "{ ምስክርነቶች }",
    chooseTestimonialAria: "የደንበኛ ምስክርነት ይምረጡ",
    readDossierPrefix: "ያንብቡ:",
    readDossierSuffix: "(የፕሮጀክት ሰነድ)",
    outroAria: "የምዕራፍ ፕሮጀክት ይጀምሩ",
    outroTitleLine1: "ፕሮጀክት አስበዋል?",
    outroTitleLine2: "በደህንነት እንፈጽመው።",
    outroSubtitle:
      "የሥራ ዝርዝርዎን በነጻ ይለጥፉ፣ ባለሙያ ሲቀጥሩ ብቻ ገንዘብን በቴሌብር፣ CBE ብር ወይም ኤም-ፔሳ በኤስክሮ ያስይዙ እና በየምዕራፉ ይልቀቁ።",
    calculateFees: "የኤስክሮ ክፍያ ያስሉ",
    outroPillEmail: "{start-project@yekis.et}",
    modal: {
      dossierPrefix: "ሰነድ #",
      prevAria: "ቀዳሚ የፕሮጀክት ሰነድ",
      nextAria: "ቀጣይ የፕሮጀክት ሰነድ",
      closeAria: "ሰነዱን ዝጋ",
      spreadTabsAria: "የሰነድ ክፍል መምረጫ",
      tabs: [
        { id: "all", label: "ሁሉም 4 ክፍሎች" },
        { id: "1", label: "01 · አጠቃላይ ማጠቃለያ" },
        { id: "2", label: "02 · የችግሩ መግለጫ" },
        { id: "3", label: "03 · አሰራር እና ውጤቶች" },
        { id: "4", label: "04 · መፍትሄ እና ሌጀር" },
      ],
      spread1Aria: "ክፍል 1: የደንበኛ ትዕዛዝ እና ማጠቃለያ",
      clientMandateTitle: "የደንበኛ ትዕዛዝ",
      contractScopeTitle: "የውል ወሰን እና የኤስክሮ መዋቅር",
      escrowRailPrefix: "የኤስክሮ መስመር:",
      cityPrefix: "ከተማ:",
      tocSummaryTitle: "ማውጫ እና ማጠቃለያ",
      tocRows: [
        { num: "02", label: "የደንበኛ ትዕዛዝ", spread: "1" },
        { num: "06", label: "አሰራር", spread: "3" },
        { num: "03", label: "ማጠቃለያ", spread: "1" },
        { num: "07", label: "የተመዘገቡ ውጤቶች", spread: "3" },
        { num: "04", label: "መነሻ መረጃ", spread: "2" },
        { num: "08", label: "የምዕራፍ ሌጀር", spread: "4" },
        { num: "05", label: "የችግሩ መግለጫ", spread: "2" },
        { num: "09", label: "ማጠቃለያ እና ቀጣይ", spread: "4" },
      ],
      execSummaryTitle: "አጠቃላይ ማጠቃለያ",
      contractConclusionsTitle: "የውል ማጠቃለያ",
      conclusion1Title: "100% የምዕራፍ ማረጋገጫ:",
      conclusion1Body: (budget) =>
        `የ${budget} በጀት እያንዳንዱ ብር ከመጀመሩ በፊት ተቆልፎ ውጤቱ ሲጸድቅ ብቻ ተለቋል።`,
      conclusion2Title: "የሚለካ ውጤት:",
      conclusion2Body: (metric, timeline, count) =>
        `በ${timeline} ውስጥ በ${count} የተዋቀሩ ምዕራፎች ${metric} ተሳክቷል።`,
      categoryPrefix: "ዘርፍ:",
      totalPrefix: "ጠቅላላ:",
      spread2Aria: "ክፍል 2: መነሻ መረጃ እና የችግሩ መግለጫ",
      bgInfoTitle: "መነሻ መረጃ",
      opBaselineLabel: "የአሠራር መነሻ",
      histContextTitle: "ታሪካዊ ዳራ",
      marketLandscapeLabel: "የገበያ ሁኔታ",
      industryOverviewTitle: "የኢንዱስትሪ ዳሰሳ",
      chartTitle: "የማስረከቢያ ፍጥነት እና የማረጋገጫ መረጃ ጠቋሚ",
      chartIndexLabel: "መለኪያ (0–100)",
      chartLegendAfter: "የYeKis ምዕራፍ ጉዞ",
      chartLegendBefore: "ከኤስክሮ በፊት የነበረ",
      baselineAuditFoot: "የመነሻ ኦዲት",
      verifiedFoot: "በYeKis የተረጋገጠ",
      problemStatementTitle: "የችግሩ መግለጫ",
      keyBottleneck: "ዋና ማነቆ",
      problemRiskParagraph:
        "በምዕራፍ የታገዘ ኤስክሮ ከሌለ የግዥ ቡድኖችም ሆኑ የርቀት ባለሙያዎች ለማስረከብ እና ለክፍያ ስጋት ይጋለጡ ነበር።",
      problemRiskQuote: "“ግልጽ የምዕራፍ መለኪያዎች ስጋትን ወደ አስተማማኝ አፈጻጸም ቀየሩት።”",
      diagnosticFoot: "የምርመራ ግምገማ",
      tranchesDefinedSuffix: "ምዕራፎች ተገልጸዋል",
      spread3Aria: "ክፍል 3: አሰራር እና የተመዘገቡ ውጤቶች",
      methodologyTitle: "አሰራር (Methodology)",
      protocolTitle: "የኤስክሮ እና የስፕሪንት ማረጋገጫ ሂደት",
      verificationMetricsTitle: "የማረጋገጫ መለኪያዎች",
      metricLocked: "ቀድሞ የተቆለፈ ኤስክሮ",
      metricFirstPass: "የመጀመሪያ ዙር QA",
      metricApproved: "100% የጸደቀ",
      metricRail: "የዋሌት ክፍያ መስመር",
      qaApproachTitle: "የትንተና እና የQA አቀራረብ",
      qaApproachBody:
        "እያንዳንዱ ምዕራፍ ክፍያ ከመለቀቁ በፊት ቀድሞ በተስማሙበት መስፈርት መሠረት ተመርምሯል።",
      protocolFoot: "ፕሮቶኮል: የምዕራፍ ኤስክሮ",
      zeroDisputesFoot: "ምንም ክርክር የለም",
      findingsTitle: "ውጤቶች",
      breakdownTitle: "የዳታ ትንተና እና የክፍያ ዝርዝር",
      kpiEscrowed: "ጠቅላላ የተያዘ ኤስክሮ",
      kpiReleased: "የተለቀቁ ምዕራፎች",
      kpiPayoutSpeed: "የክፍያ ፍጥነት",
      kpiPayoutVal: "< 15 ደቂቃ",
      resultsObsTitle: "ውጤቶች እና ምልከታዎች",
      resultsObsSuffix: "በመጨረሻው ምዕራፍ ማጽደቂያ ላይ ተረጋግጧል።",
      findingsBullets: (count) => [
        "100% የምዕራፍ ገንዘብ ሥራ ከመጀመሩ በፊት በብር ተቀምጧል።",
        "ለደንበኛ ሂሳብ ክፍል እና ለባለሙያ ዋሌት አውቶማቲክ ደረሰኝ ተዘጋጅቷል።",
        `በሁሉም ${count} ምዕራፎች ውስጥ ምንም የወሰን መዛባት ወይም የባንክ መዘግየት አልነበረም።`,
      ],
      outcomeFootPrefix: "ውጤት:",
      verified100Foot: "100% የተረጋገጠ",
      spread4Aria: "ክፍል 4: መፍትሄዎች፣ የምዕራፍ ሌጀር እና ማጠቃለያ",
      solutionsTitle: "መፍትሄዎች እና የምዕራፍ ሌጀር",
      ringApproved: "የጸደቁ ምዕራፎች",
      ringNetPayout: "የባለሙያ የተጣራ ክፍያ",
      thDeliverable: "የምዕራፍ ማስረከቢያ",
      thWindow: "ጊዜ",
      thTranche: "የኤስክሮ ክፍያ",
      allTranchesFoot: (count) => `ሁሉም ${count} ምዕራፎች ተለቀዋል`,
      conclusionTitle: "ማጠቃለያ",
      finalThoughtsTitle: "የመጨረሻ ሐሳቦች",
      futureTitle: "ለወደፊት አንድምታ",
      postSimilar: "ተመሳሳይ ፕሮጀክት ይለጥፉ",
      dossierFoot: "የYeKis የፕሮጀክት ጥናት ሰነድ",
      endReportFoot: "የሪፖርቱ መጨረሻ",
    },
  },
  om: {
    breadcrumbHome: "Mana",
    breadcrumbCases: "Piroojektoota",
    filterPrefix: "Calallii ·",
    feesTag: "KAFFALTII",
    feesLabel: "Tarree Kaffaltii",
    studioTag: "ISTUDIYOO",
    aboutLabel: "Waa'ee Keenyaa",
    heroSectionAria: "Banaa Piroojektoota Milkaa'anii",
    heroPrefix: "qabatamaan",
    heroBraceWord: "iskuuroo",
    heroSuffix: "bu'aa isaa mirkaneessina",
    hoverDossier01: "{ 01 · GALMEE ILAALI }",
    hoverDossier02: "{ 02 · GALMEE ILAALI }",
    hoverAria01: "Galmee Abyssinia Logistics ilaali",
    hoverAria02: "Galmee Kaffa Specialty Export ilaali",
    heroTagline:
      "Itoophiyaa guutuutti injinariingii, biraandii fi raawwii naannoo boqonnaan mirkanaa'eef ulaagaa olaanaa.",
    scrollPill: "{ GADI BU'I ↓ }",
    manifestoAria: "Tooftaa fi Ragaa Keenya",
    proofBraceWord: "RAGAA",
    proofSegments: [
      { text: "Hojii gaariin waadaa qofa caala—inni waa'ee" },
      { text: "boqonnaawwan ifaa, hojii mirkanaa'ee fi bu'aa safaramuu ti.", highlight: true },
    ],
    kpiVolumeSuffix: "K ETB",
    kpiVolumeLabel: "HAMMA ISKUUROO FILATAMEE",
    kpiPhasesSuffix: " BOQONNAA",
    kpiPhasesLabel: "BOQONNAAWWAN MIRKANA'AN",
    kpiReleaseLabel: "YEROOTTI GADHIISAME",
    worksAria: "Piroojektoota Filataman",
    selectedWorkKicker: "{ HOJIIWWAN FILATAMAN }",
    filterAria: "Piroojektoota gosa hojiin calali",
    categories: [
      { id: "ALL", label: "Seenaa Hunda" },
      { id: "ENGINEERING", label: "Injinariingii" },
      { id: "DESIGN", label: "Dizaayinii & Biraandii" },
      { id: "MARKETING", label: "Guddina & Viidiyoo" },
      { id: "LOCALIZATION", label: "Hiika Afaanii" },
      { id: "DATA", label: "Daataa & BI" },
    ],
    openDossierPill: "GALMEE BANI",
    openDossierBtn: "GALMEE BANI →",
    clientPrefix: "Maamila:",
    milestonesLabel: "Boqonnaa",
    openFullDossier: "→ Galmee guutuu bani",
    servicesAria: "Gosoota Tajaajilaa",
    servicesKicker: "{ TAJAAJILAWWAN }",
    rowEscrowRange: "DAANGAA ISKUUROO",
    rowSettlement: "SARARA KAFFALTII",
    rowTranches: "BOQONNAA",
    testimonialsAria: "Ragaa Maamiltootaa",
    testimonialsKicker: "{ RAGAA MAAMILTOOTAA }",
    chooseTestimonialAria: "Ragaa maamilaa filadhu",
    readDossierPrefix: "Dubbisi:",
    readDossierSuffix: "(galmee piroojektii)",
    outroAria: "Piroojektii boqonnaa jalqabi",
    outroTitleLine1: "Piroojektii yaada qabduu?",
    outroTitleLine2: "Nageenyaan haa maallaqeessinu.",
    outroSubtitle:
      "Ibsa hojii bilisaan maxxansi, yeroo qacartu qofa Telebirr, CBE Birr ykn M-Pesa dhaan ETB cufii boqonnaa boqonnaan gadhiisi.",
    calculateFees: "Kaffaltii Iskuuroo Herregi",
    outroPillEmail: "{start-project@yekis.et}",
    modal: {
      dossierPrefix: "GALMEE #",
      prevAria: "Galmee duraa",
      nextAria: "Galmee itti aanu",
      closeAria: "Galmee cufi",
      spreadTabsAria: "Filannoo fuula galmee",
      tabs: [
        { id: "all", label: "Fuulawwan 4 Hunda" },
        { id: "1", label: "01 · Cuunfaa Hojii" },
        { id: "2", label: "02 · Ibsa Rakkoo" },
        { id: "3", label: "03 · Tooftaa & Bu'aa" },
        { id: "4", label: "04 · Furmaata & Leejarii" },
      ],
      spread1Aria: "Fuula 1: Ajaja Maamilaa fi Cuunfaa",
      clientMandateTitle: "Ajaja Maamilaa",
      contractScopeTitle: "Daangaa Waliigaltee & Caasaa Iskuuroo",
      escrowRailPrefix: "SARARA ISKUUROO:",
      cityPrefix: "MAGAALAA:",
      tocSummaryTitle: "Baafata & Cuunfaa",
      tocRows: [
        { num: "02", label: "Ajaja Maamilaa", spread: "1" },
        { num: "06", label: "Tooftaa", spread: "3" },
        { num: "03", label: "Cuunfaa", spread: "1" },
        { num: "07", label: "Bu'aa Mirkanaa'e", spread: "3" },
        { num: "04", label: "Seenaa Ka'umsaa", spread: "2" },
        { num: "08", label: "Leejarii Boqonnaa", spread: "4" },
        { num: "05", label: "Ibsa Rakkoo", spread: "2" },
        { num: "09", label: "Xumura & Itti Aanu", spread: "4" },
      ],
      execSummaryTitle: "Cuunfaa Ijoo",
      contractConclusionsTitle: "Xumura Waliigaltee",
      conclusion1Title: "Mirkaneessa Boqonnaa %100:",
      conclusion1Body: (budget) =>
        `Birriin bajata ${budget} hundi jalqabuu dura cufamee yeroo dhiyeessiin mirkanaa'u qofa gadhiifame.`,
      conclusion2Title: "Bu'aa Safaramu:",
      conclusion2Body: (metric, timeline, count) =>
        `Yeroo ${timeline} keessatti boqonnaa ${count}n ${metric} argame.`,
      categoryPrefix: "GOSA:",
      totalPrefix: "WALIIGALA:",
      spread2Aria: "Fuula 2: Seenaa Ka'umsaa fi Ibsa Rakkoo",
      bgInfoTitle: "Odeeffannoo Ka'umsaa",
      opBaselineLabel: "Bu'uura Hojii",
      histContextTitle: "Seenaa Duraanii",
      marketLandscapeLabel: "Haala Gabaa",
      industryOverviewTitle: "Ilaalcha Industirii",
      chartTitle: "Saffisa Dhiyeessii & Agarsiistuu Mirkaneessaa",
      chartIndexLabel: "AGARSIISTUU (0–100)",
      chartLegendAfter: "Tartiiba Boqonnaa Yekis",
      chartLegendBefore: "Haala Iskuuroo Duraa",
      baselineAuditFoot: "OODIITII BU'UURAA",
      verifiedFoot: "YEKISN MIRKANA'E",
      problemStatementTitle: "Ibsa Rakkoo",
      keyBottleneck: "RAKKAANA IJOO",
      problemRiskParagraph:
        "Iskuuroo boqonnaan hidhame malee gareen bittaa fi ogeeyyiin fageenyaa balaa dhiyeessii fi kaffaltiif saaxilamu turan.",
      problemRiskQuote: "“Hiikni boqonnaa ifaan balaa gara raawwii tilmaamamaatti jijjiire.”",
      diagnosticFoot: "QORANNOO RAAWWII",
      tranchesDefinedSuffix: "BOQONNAAN IBSAAME",
      spread3Aria: "Fuula 3: Tooftaa fi Bu'aa Safarame",
      methodologyTitle: "Tooftaa (Methodology)",
      protocolTitle: "Protokoolii Mirkaneessa Iskuuroo & Isprintii",
      verificationMetricsTitle: "SAFARTUULEE MIRKANEESSAA",
      metricLocked: "Iskuuroo Dursaan Cufame",
      metricFirstPass: "QA Jalqabaa Darbe",
      metricApproved: "100% Mirkanaa'e",
      metricRail: "Sarara Kaffaltii Wallet",
      qaApproachTitle: "Tooftaa Xiinxalaa & QA",
      qaApproachBody:
        "Boqonnaan dhiyaate hundi osoo kaffaltiin hin gadhiifamin ulaagaa walii galteen mirkanaa'e.",
      protocolFoot: "PROTOKOOLII: ISKUUROO BOQONNAA",
      zeroDisputesFoot: "FALMII ZEROO",
      findingsTitle: "Argannoowwan",
      breakdownTitle: "Xiinxala Daataa & Tarree Kaffaltii",
      kpiEscrowed: "Iskuuroo Waliigalaa",
      kpiReleased: "Boqonnaa Gadhiifame",
      kpiPayoutSpeed: "Saffisa Kaffaltii",
      kpiPayoutVal: "< daqiiqaa 15",
      resultsObsTitle: "Bu'aawwan & Hubannoo",
      resultsObsSuffix: "yeroo mirkaneessa boqonnaa dhumaa irratti mirkanaa'e.",
      findingsBullets: (count) => [
        "Maallaqni boqonnaa %100 hojii jalqabuu dura ETB dhaan kuufame.",
        "Nagaheen ofumaa herrega maamilaa fi wallet ogeessaatiif qophaa'e.",
        `Boqonnaawwan ${count} hunda keessatti jijjiiramni daangaa ykn turtiin baankii hin turre.`,
      ],
      outcomeFootPrefix: "BU'AA:",
      verified100Foot: "100% MIRKANA'E",
      spread4Aria: "Fuula 4: Furmaata, Leejarii Boqonnaa fi Xumura",
      solutionsTitle: "Furmaata & Leejarii Boqonnaa",
      ringApproved: "Boqonnaa Mirkanaa'an",
      ringNetPayout: "Kaffaltii Qulqulluu Ogeessaa",
      thDeliverable: "Bu'aa Boqonnaa",
      thWindow: "Yeroo",
      thTranche: "Kaffaltii Iskuuroo",
      allTranchesFoot: (count) => `BOQONNAA ${count} HUNDUU GADHIIFAMANIIRU`,
      conclusionTitle: "Xumura",
      finalThoughtsTitle: "Yaada Xumuraa",
      futureTitle: "Dhiibbaa Fuulduraaf",
      postSimilar: "Piroojektii Walfakkaatu Maxxansi",
      dossierFoot: "GALMEE QORANNOO YEKIS",
      endReportFoot: "DHUMA GABAASAA",
    },
  },
  ti: {
    breadcrumbHome: "መበገሲ",
    breadcrumbCases: "ዝተዓወቱ ፕሮጀክታት",
    filterPrefix: "መጽረዪ ·",
    feesTag: "ክፍሊት",
    feesLabel: "ክፍሊታት",
    studioTag: "ስቱድዮ",
    aboutLabel: "ብዛዕባና",
    heroSectionAria: "መግቢ ዝተዓወቱ ፕሮጀክታት",
    heroPrefix: "ብግብሪ",
    heroBraceWord: "ኤስክሮ",
    heroSuffix: "ውጽኢታዊ ንገብሮ",
    hoverDossier01: "{ 01 · ሰነድ ርአ }",
    hoverDossier02: "{ 02 · ሰነድ ርአ }",
    hoverAria01: "ሰነድ ፕሮጀክት ኣቢሲንያ ሎጂስቲክስ ርአ",
    hoverAria02: "ሰነድ ፕሮጀክት ቡን ካፋ ርአ",
    heroTagline:
      "ኣብ መላእ ኢትዮጵያ ብምዕራፍ ዝተረጋገጸ ኢንጂነሪንግ፣ ዲዛይን ብራንድን ዞባዊ ኣፈጻጽማ ስራሕን መለክዒ።",
    scrollPill: "{ ንታሕቲ ውረድ ↓ }",
    manifestoAria: "ኣገባብናን መረጋገጺናን",
    proofBraceWord: "መረጋገጺ",
    proofSegments: [
      { text: "ዓቢ ኣፈጻጽማ ካብ ቃል ንላዕሊ እዩ—ንሱ ብዛዕባ" },
      { text: "ንጹራት ምዕራፋት፣ ዝተረጋገጸ ስራሕን ዝዕቀን ጽልዋን እዩ።", highlight: true },
    ],
    kpiVolumeSuffix: "ሽ ብር",
    kpiVolumeLabel: "ዝተመርጸ መጠን ኤስክሮ",
    kpiPhasesSuffix: " ምዕራፋት",
    kpiPhasesLabel: "ዝተረጋገጹ ምዕራፋት",
    kpiReleaseLabel: "ኣብ ግዜኡ ዝተፈነወ",
    worksAria: "ዝተመርጹ ፕሮጀክታት",
    selectedWorkKicker: "{ ዝተመርጹ ስራሕቲ }",
    filterAria: "ፕሮጀክታት ብዓውዲ ፍለ",
    categories: [
      { id: "ALL", label: "ኩሎም ታሪኻት" },
      { id: "ENGINEERING", label: "ኢንጂነሪንግ" },
      { id: "DESIGN", label: "ዲዛይንን ብራንድን" },
      { id: "MARKETING", label: "ዕብየትን ቪድዮን" },
      { id: "LOCALIZATION", label: "ትርጉም" },
      { id: "DATA", label: "ዳታን BIን" },
    ],
    openDossierPill: "ሰነድ ክፈት",
    openDossierBtn: "ሰነድ ክፈት →",
    clientPrefix: "ዓሚል:",
    milestonesLabel: "ምዕራፋት",
    openFullDossier: "→ ምሉእ ሰነድ ፕሮጀክት ክፈት",
    servicesAria: "ዓውድታት ዕዳጋ",
    servicesKicker: "{ ኣገልግሎታት }",
    rowEscrowRange: "ደረጃ ኤስክሮ",
    rowSettlement: "መስመር ክፍሊት",
    rowTranches: "ምዕራፋት",
    testimonialsAria: "ምስክርነት ዓማዊል",
    testimonialsKicker: "{ ምስክርነታት }",
    chooseTestimonialAria: "ምስክርነት ዓሚል ምረጽ",
    readDossierPrefix: "ኣንብብ:",
    readDossierSuffix: "(ሰነድ ፕሮጀክት)",
    outroAria: "ፕሮጀክት ምዕራፍ ጀምር",
    outroTitleLine1: "ፕሮጀክት ኣብ ሓሳብኩም ኣሎ?",
    outroTitleLine2: "ብውሑስ ንምውሎ።",
    outroSubtitle:
      "ዝርዝር ስራሕኩም ብነጻ ለጥፉ፣ ክኢላ ምስ ቆጸርኩም ጥራይ ብቴሌብር፣ CBE ብር ወይ M-Pesa ገንዘብ ኣብ ኤስክሮ ዓጺኹም በብምዕራፉ ፍነዉ።",
    calculateFees: "ክፍሊት ኤስክሮ ኣስልሕ",
    outroPillEmail: "{start-project@yekis.et}",
    modal: {
      dossierPrefix: "ሰነድ #",
      prevAria: "ቀዳማይ ሰነድ",
      nextAria: "ዝቕጽል ሰነድ",
      closeAria: "ሰነድ ዕጾ",
      spreadTabsAria: "መምረጺ ክፋል ሰነድ",
      tabs: [
        { id: "all", label: "ኩሎም 4 ክፋላት" },
        { id: "1", label: "01 · ሓፈሻዊ ጽማቕ" },
        { id: "2", label: "02 · መግለጺ ጸገም" },
        { id: "3", label: "03 · ኣገባብን ውጽኢትን" },
        { id: "4", label: "04 · ፍታሕን ሌጀርን" },
      ],
      spread1Aria: "ክፋል 1: ትእዛዝ ዓሚልን ጽማቕን",
      clientMandateTitle: "ትእዛዝ ዓሚል",
      contractScopeTitle: "ስፍሓት ውዕልን ቅርጺ ኤስክሮን",
      escrowRailPrefix: "መስመር ኤስክሮ:",
      cityPrefix: "ከተማ:",
      tocSummaryTitle: "ትሕዝቶን ጽማቕን",
      tocRows: [
        { num: "02", label: "ትእዛዝ ዓሚል", spread: "1" },
        { num: "06", label: "ኣገባብ", spread: "3" },
        { num: "03", label: "ሓፈሻዊ ጽማቕ", spread: "1" },
        { num: "07", label: "ዝተዓቀነ ውጽኢት", spread: "3" },
        { num: "04", label: "መበገሲ ሓበሬታ", spread: "2" },
        { num: "08", label: "ሌጀር ምዕራፋት", spread: "4" },
        { num: "05", label: "መግለጺ ጸገም", spread: "2" },
        { num: "09", label: "መደምደምታን መጻእን", spread: "4" },
      ],
      execSummaryTitle: "ሓፈሻዊ ጽማቕ",
      contractConclusionsTitle: "መደምደምታ ውዕል",
      conclusion1Title: "100% ምርግጋጽ ምዕራፍ:",
      conclusion1Body: (budget) =>
        `ካብ ባጀት ${budget} ነፍሲ ወከፍ ብር ቅድሚ ምጅማር ተዓጽዩ ስራሕ ምስ ጸደቐ ጥራይ ተፈኒዩ።`,
      conclusion2Title: "ዝዕቀን ውጽኢት:",
      conclusion2Body: (metric, timeline, count) =>
        `ኣብ ውሽጢ ${timeline} ብ${count} ዝተወደቡ ምዕራፋት ${metric} ተረጋጊጹ።`,
      categoryPrefix: "ዓውዲ:",
      totalPrefix: "ጠቕላላ:",
      spread2Aria: "ክፋል 2: መበገሲ ሓበሬታን መግለጺ ጸገምን",
      bgInfoTitle: "መበገሲ ሓበሬታ",
      opBaselineLabel: "መሰረታዊ ኣሰራርሓ",
      histContextTitle: "ታሪኻዊ ድሕረ-ባይታ",
      marketLandscapeLabel: "ኩነታት ዕዳጋ",
      industryOverviewTitle: "ዳህሳስ ኢንዱስትሪ",
      chartTitle: "ፍጥነት ምርካብን መርኣዪ ምርግጋጽን",
      chartIndexLabel: "መዐቀኒ (0–100)",
      chartLegendAfter: "መስመር ምዕራፍ YeKis",
      chartLegendBefore: "ቅድሚ ኤስክሮ ዝነበረ",
      baselineAuditFoot: "መሰረታዊ ኦዲት",
      verifiedFoot: "ብYeKis ዝተረጋገጸ",
      problemStatementTitle: "መግለጺ ጸገም",
      keyBottleneck: "ቀንዲ ዕንቅፋት",
      problemRiskParagraph:
        "ብምዕራፍ ዝተዓጽወ ኤስክሮ እንተዘየለ ጉጅለታት ዕድግን ክኢላታት ርሕቐትን ንስግኣት ምርካብን ክፍሊትን ይቃልዑ ነይሮም።",
      problemRiskQuote: "“ንጹራት መለክዒታት ምዕራፍ ንስግኣት ናብ ርጉጽ ኣፈጻጽማ ቀዪሮምዎ።”",
      diagnosticFoot: "መርመራ ጸገም",
      tranchesDefinedSuffix: "ምዕራፋት ተገሊጾም",
      spread3Aria: "ክፋል 3: ኣገባብን ውጽኢታትን",
      methodologyTitle: "ኣገባብ (Methodology)",
      protocolTitle: "ፕሮቶኮል ምርግጋጽ ኤስክሮን ስፕሪንትን",
      verificationMetricsTitle: "መዐቀኒታት ምርግጋጽ",
      metricLocked: "ኣቐዲሙ ዝተዓጽወ ኤስክሮ",
      metricFirstPass: "ቀዳማይ ዙር QA",
      metricApproved: "100% ዝጸደቐ",
      metricRail: "መስመር ክፍሊት ዋሌት",
      qaApproachTitle: "ኣገባብ ትንተናን QAን",
      qaApproachBody:
        "ነፍሲ ወከፍ ምዕራፍ ቅድሚ ቅጽበታዊ ክፍሊት ምፍናው ብዝተስማዕምዑሉ መዐቀኒ ተፈቲሹ።",
      protocolFoot: "ፕሮቶኮል: ኤስክሮ ምዕራፍ",
      zeroDisputesFoot: "ዜሮ ክትዕ",
      findingsTitle: "ውጽኢታት",
      breakdownTitle: "ትንተና ዳታን ዝርዝር ክፍሊትን",
      kpiEscrowed: "ጠቕላላ ዝተዓጽወ ኤስክሮ",
      kpiReleased: "ዝተፈነዉ ምዕራፋት",
      kpiPayoutSpeed: "ፍጥነት ክፍሊት",
      kpiPayoutVal: "< 15 ደቒቕ",
      resultsObsTitle: "ውጽኢታትን ትዕዝብትን",
      resultsObsSuffix: "ኣብ መወዳእታ ምዕራፍ ምጽዳቕ ተረጋጊጹ።",
      findingsBullets: (count) => [
        "100% ገንዘብ ምዕራፍ ቅድሚ ምጅማር ብብር ተዓጽዩ።",
        "ንዓሚልን ዋሌት ክኢላን ብቐጥታ ደረሰኝ ተዳልዩ።",
        `ኣብ ኩሎም ${count} ምዕራፋት ዝኾነ ምዝንባል ወይ ምድንጓይ ባንኪ ኣይነበረን።`,
      ],
      outcomeFootPrefix: "ውጽኢት:",
      verified100Foot: "100% ዝተረጋገጸ",
      spread4Aria: "ክፋል 4: ፍታሕ፣ ሌጀር ምዕራፍን መደምደምታን",
      solutionsTitle: "ፍታሕን ሌጀር ምዕራፋትን",
      ringApproved: "ዝጸደቑ ምዕራፋት",
      ringNetPayout: "ጽሩይ ክፍሊት ክኢላ",
      thDeliverable: "ዝርከብ ውጽኢት ምዕራፍ",
      thWindow: "ግዜ",
      thTranche: "ክፍሊት ኤስክሮ",
      allTranchesFoot: (count) => `ኩሎም ${count} ምዕራፋት ተፈኒዮም`,
      conclusionTitle: "መደምደምታ",
      finalThoughtsTitle: "ናይ መወዳእታ ሓሳባት",
      futureTitle: "ጽልዋ ንመጻኢ",
      postSimilar: "ተመሳሳሊ ፕሮጀክት ለጥፍ",
      dossierFoot: "ሰነድ መጽናዕቲ YeKis",
      endReportFoot: "መወዳእታ ጸብጻብ",
    },
  },
};
