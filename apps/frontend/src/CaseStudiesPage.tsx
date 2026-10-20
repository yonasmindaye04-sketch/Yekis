import { useState, useMemo } from "react";
import {
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Wallet,
  MapPin,
  Layers,
  X,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { useI18n } from "./i18n";
import "./landing-v2.css";

type CaseStudiesPageProps = {
  onNavigate: (page: string) => void;
  onStart?: (mode: "login" | "register") => void;
};

type CaseCategory = "ALL" | "ENGINEERING" | "DESIGN" | "MARKETING" | "LOCALIZATION" | "DATA";

type CaseStudyItem = {
  id: string;
  category: Exclude<CaseCategory, "ALL">;
  categoryLabel: string;
  title: string;
  client: string;
  city: string;
  summary: string;
  budgetEtb: string;
  timeline: string;
  milestoneCount: number;
  rail: string;
  quote: string;
  quoteAuthor: string;
  outcomeMetric: string;
  milestones: { title: string; amount: string; duration: string }[];
};

const CASE_STUDIES: CaseStudyItem[] = [
  {
    id: "cs-abyssinia-fleet",
    category: "ENGINEERING",
    categoryLabel: "Web & Mobile Engineering",
    title: "Abyssinia Logistics Dispatch & Telebirr Driver Settlement Portal",
    client: "Abyssinia Freight & Cold-Chain PLC",
    city: "Addis Ababa",
    summary:
      "Built a real-time fleet tracking web application and mobile driver check-in portal with automated Telebirr trip allowances, replacing manual spreadsheet reconciliation across 140+ trucks.",
    budgetEtb: "85,000 ETB",
    timeline: "3 Weeks",
    milestoneCount: 4,
    rail: "Telebirr & CBE Birr",
    quote:
      "Approving each milestone released payment immediately. Our lead developer in Bahir Dar delivered every sprint ahead of schedule with zero payment friction.",
    quoteAuthor: "Yared K., Operations Director · Addis Ababa",
    outcomeMetric: "-68% dispatch reconciliation time",
    milestones: [
      { title: "01 · System Architecture & API Schema", amount: "15,000 ETB", duration: "4 days" },
      { title: "02 · Dispatcher Web Dashboard & Live Map", amount: "30,000 ETB", duration: "7 days" },
      { title: "03 · Driver Mobile Check-In & Telebirr Webhook", amount: "25,000 ETB", duration: "6 days" },
      { title: "04 · Load Testing, QA & Production Handover", amount: "15,000 ETB", duration: "4 days" },
    ],
  },
  {
    id: "cs-kaffa-coffee",
    category: "DESIGN",
    categoryLabel: "Design & Creative",
    title: "Kaffa Origin Specialty Coffee Export Identity & Packaging System",
    client: "Kaffa Highland Exporters Union",
    city: "Hawassa",
    summary:
      "Complete brand identity, bilingual export packaging dielines, and a wholesale buyer lookbook for specialty washed Arabica lots shipping to European and Middle Eastern roasters.",
    budgetEtb: "45,000 ETB",
    timeline: "2 Weeks",
    milestoneCount: 3,
    rail: "CBE Birr",
    quote:
      "Escrow gave our union board confidence to hire a top Addis studio remotely. We reviewed print-ready proofs inside Yekis before releasing each tranche.",
    quoteAuthor: "Meron G., Export Marketing Lead · Hawassa",
    outcomeMetric: "3 international buyer contracts signed",
    milestones: [
      { title: "01 · Brand Strategy, Wordmark & Color System", amount: "15,000 ETB", duration: "5 days" },
      { title: "02 · 250g & 1kg Export Bag Print Dielines", amount: "18,000 ETB", duration: "5 days" },
      { title: "03 · Digital Buyer Deck & Brand Guidelines", amount: "12,000 ETB", duration: "4 days" },
    ],
  },
  {
    id: "cs-zemen-localization",
    category: "LOCALIZATION",
    categoryLabel: "Translation & Localization",
    title: "Multilingual Maternal Health App Localization (Amharic, Afaan Oromoo & Tigrinya)",
    client: "Biruh Health Initiative NGO",
    city: "Bahir Dar",
    summary:
      "Medical-grade translation, voiceover recording, and cultural QA of 180+ maternal nutrition modules across Amharic, Afaan Oromoo, and Tigrinya for rural health extension workers.",
    budgetEtb: "38,000 ETB",
    timeline: "10 Days",
    milestoneCount: 3,
    rail: "Telebirr",
    quote:
      "Hiring three certified linguists through Yekis with TIN-compliant receipts saved our finance team weeks of grant auditing paperwork.",
    quoteAuthor: "Dr. Sara M., Program Coordinator · Bahir Dar",
    outcomeMetric: "180 modules localized with 100% clinical QA",
    milestones: [
      { title: "01 · Medical Glossary & Terminology Alignment", amount: "8,000 ETB", duration: "2 days" },
      { title: "02 · UI Strings & Lesson Script Translation", amount: "18,000 ETB", duration: "5 days" },
      { title: "03 · Native Audio Prompts & In-App Linguistic QA", amount: "12,000 ETB", duration: "3 days" },
    ],
  },
  {
    id: "cs-sheger-growth",
    category: "MARKETING",
    categoryLabel: "Digital Marketing",
    title: "Sheger Home & Electronics Telegram + TikTok Performance Launch",
    client: "Sheger Retail Group",
    city: "Addis Ababa",
    summary:
      "Produced 12 short-form Amharic product reels, automated a Telegram catalog bot funnel, and managed targeted holiday conversion campaigns with clear ROAS milestones.",
    budgetEtb: "52,000 ETB",
    timeline: "4 Weeks",
    milestoneCount: 3,
    rail: "Telebirr",
    quote:
      "We tied every milestone to verified creative deliverables and campaign setup. Sales inquiries on our Telegram channel tripled in the first two weeks.",
    quoteAuthor: "Hanna G., Founder · Addis Ababa",
    outcomeMetric: "3.4x return on campaign spend",
    milestones: [
      { title: "01 · Creative Scripting & 6 Studio Video Reels", amount: "20,000 ETB", duration: "10 days" },
      { title: "02 · Telegram Catalog Funnel & Pixel Tracking", amount: "14,000 ETB", duration: "7 days" },
      { title: "03 · Second Batch Reels & Conversion Optimization", amount: "18,000 ETB", duration: "11 days" },
    ],
  },
  {
    id: "cs-tigray-agri-data",
    category: "DATA",
    categoryLabel: "Data & Back-Office",
    title: "Regional Grain Market Price & Cooperative Inventory Analytics Suite",
    client: "Northern Highlands Cooperative Network",
    city: "Mekelle",
    summary:
      "Cleaned 4 years of historical commodity records, automated weekly woreda price ingestion forms, and delivered an interactive Power BI & Python reporting dashboard.",
    budgetEtb: "64,000 ETB",
    timeline: "3 Weeks",
    milestoneCount: 4,
    rail: "CBE Birr",
    quote:
      "Every dataset delivery was verified in the milestone workspace before release. Our analysts now publish weekly market briefs in 15 minutes instead of 3 days.",
    quoteAuthor: "Betty A., Operations Lead · Mekelle",
    outcomeMetric: "42,000+ historical records structured",
    milestones: [
      { title: "01 · Historical CSV/Excel Cleaning & Deduplication", amount: "16,000 ETB", duration: "5 days" },
      { title: "02 · Automated Mobile Data Collection Schema", amount: "16,000 ETB", duration: "5 days" },
      { title: "03 · Executive Price & Inventory Dashboard", amount: "20,000 ETB", duration: "6 days" },
      { title: "04 · Staff Training & Documentation Handover", amount: "12,000 ETB", duration: "5 days" },
    ],
  },
  {
    id: "cs-diredawa-portal",
    category: "ENGINEERING",
    categoryLabel: "Web & Mobile Engineering",
    title: "Dire Dawa Textile Supplier B2B Ordering & Customs Document Tracker",
    client: "East Rift Manufacturing PLC",
    city: "Dire Dawa",
    summary:
      "Engineered a secure supplier portal with role-based document sign-off, pro-forma invoice generation in ETB/USD, and automated SMS/Telegram status alerts.",
    budgetEtb: "110,000 ETB",
    timeline: "5 Weeks",
    milestoneCount: 4,
    rail: "CBE Birr & M-Pesa",
    quote:
      "Splitting a 110,000 ETB build into four clear milestones kept both our procurement team and the freelance engineering squad 100% aligned.",
    quoteAuthor: "Nardos A., Technical Lead · Dire Dawa",
    outcomeMetric: "100% digital pro-forma workflow",
    milestones: [
      { title: "01 · Role-Based Auth & Supplier Onboarding Flow", amount: "25,000 ETB", duration: "8 days" },
      { title: "02 · Pro-Forma Invoice & Customs Document Engine", amount: "35,000 ETB", duration: "10 days" },
      { title: "03 · Automated Telegram & SMS Alert Integration", amount: "28,000 ETB", duration: "9 days" },
      { title: "04 · Security Audit & Cloud Deployment", amount: "22,000 ETB", duration: "8 days" },
    ],
  },
];

export function CaseStudiesPage({ onNavigate, onStart }: CaseStudiesPageProps) {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CaseCategory>("ALL");
  const [selectedStudy, setSelectedStudy] = useState<CaseStudyItem | null>(null);

  const categories: { id: CaseCategory; label: string }[] = [
    { id: "ALL", label: "All Stories" },
    { id: "ENGINEERING", label: `${t.marketing.categories.c1Title1} ${t.marketing.categories.c1Title2}` },
    { id: "DESIGN", label: `${t.marketing.categories.c2Title1} ${t.marketing.categories.c2Title2}` },
    { id: "MARKETING", label: `${t.marketing.categories.c3Title1} ${t.marketing.categories.c3Title2}` },
    { id: "LOCALIZATION", label: `${t.marketing.categories.c5Title1} ${t.marketing.categories.c5Title2}` },
    { id: "DATA", label: `${t.marketing.categories.c6Title1} ${t.marketing.categories.c6Title2}` },
  ];

  const filteredStudies = useMemo(() => {
    if (activeCategory === "ALL") return CASE_STUDIES;
    return CASE_STUDIES.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const handleStartProject = () => {
    setSelectedStudy(null);
    if (onStart) {
      onStart("register");
    } else {
      onNavigate("home");
    }
  };

  return (
    <div className="yk-v2 yk-v2-subpage">
      <div className="v2-container">
        {/* Hero */}
        <header className="v2-sub-hero">
          <div className="v2-sub-hero-grid">
            <div>
              <h1 className="v2-sub-title">{t.marketing.caseStudies.title}</h1>
              <p className="v2-sub-lead">{t.marketing.caseStudies.subtitle}</p>
            </div>

            <div className="v2-sub-kpis">
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">394,000 ETB</div>
                <div className="v2-sub-kpi-lbl">Featured Escrow Volume Released</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">21 Milestones</div>
                <div className="v2-sub-kpi-lbl">100% Approved Without Dispute Loss</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">&lt; 15 min</div>
                <div className="v2-sub-kpi-lbl">Median Wallet Payout After Approval</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">5 Cities</div>
                <div className="v2-sub-kpi-lbl">Addis, Bahir Dar, Hawassa, Mekelle, Dire Dawa</div>
              </div>
            </div>
          </div>
        </header>

        {/* Category Filter Tabs */}
        <div className="v2-filter-bar">
          <div className="v2-filter-tabs" role="tablist" aria-label="Filter case studies by category">
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
                  className={`v2-filter-tab ${activeCategory === cat.id ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                  <span className="v2-filter-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Case Studies Grid */}
        <section className="v2-cases-grid" aria-label="Case study stories">
          {filteredStudies.map((study) => (
            <article key={study.id} className="v2-case-card">
              <div>
                <h2 className="v2-case-title" style={{ marginTop: 0 }}>{study.title}</h2>
                <div className="v2-case-client">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <MapPin size={13} color="var(--v2-primary)" />
                    {study.client} &middot; {study.city}
                  </span>
                </div>

                <p className="v2-case-summary">{study.summary}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* 3-Column Metrics */}
                <div className="v2-case-metrics">
                  <div>
                    <div className="v2-case-metric-val">{study.budgetEtb}</div>
                    <div className="v2-case-metric-lbl">Escrow Budget</div>
                  </div>
                  <div>
                    <div className="v2-case-metric-val">{study.timeline}</div>
                    <div className="v2-case-metric-lbl">Delivery Time</div>
                  </div>
                  <div>
                    <div className="v2-case-metric-val">{study.milestoneCount} Tranches</div>
                    <div className="v2-case-metric-lbl">{study.rail}</div>
                  </div>
                </div>

                {/* Client Quote */}
                <blockquote className="v2-case-quote" style={{ margin: 0 }}>
                  &ldquo;{study.quote}&rdquo;
                  <footer
                    style={{
                      marginTop: 6,
                      fontStyle: "normal",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "var(--v2-text2)",
                    }}
                  >
                    — {study.quoteAuthor}
                  </footer>
                </blockquote>

                {/* Outcome + Inspect Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--v2-border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--v2-primary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    {study.outcomeMetric}
                  </span>

                  <button
                    type="button"
                    className="v2-btn"
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      borderRadius: 10,
                      borderColor: "var(--v2-border2)",
                      background: "var(--v2-surface)",
                      color: "var(--v2-text)",
                    }}
                    onClick={() => setSelectedStudy(study)}
                  >
                    <span>Milestones</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Bottom Navigation / CTA */}
        <section className="v2-outro-cta" style={{ borderRadius: 28, minHeight: 320 }}>
          <span className="v2-outro-ambient" aria-hidden />
          <div className="v2-outro-cta-inner" style={{ paddingTop: 42, paddingBottom: 42 }}>
            <h2>Ready to fund your first milestone with zero guesswork?</h2>
            <p>
              Post your project scope for free, lock funds in ETB only when you choose a verified specialist, and release payment as each milestone is delivered.
            </p>
            <div className="v2-outro-actions">
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-primary"
                onClick={handleStartProject}
              >
                <span className="v2-outro-shine" aria-hidden />
                <Briefcase />
                <span>{t.marketing.cta.postJob}</span>
              </button>
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-ghost"
                onClick={() => onNavigate("fees")}
              >
                <Wallet />
                <span>Calculate Escrow Fees</span>
              </button>
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-ghost"
                onClick={() => onNavigate("faq")}
              >
                <HelpCircle />
                <span>{t.marketing.caseStudies.readFaq}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Milestone Breakdown Modal */}
      {selectedStudy && (
        <div
          className="v2-case-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-modal-title"
          onClick={() => setSelectedStudy(null)}
        >
          <div className="v2-case-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <h2 id="case-modal-title" style={{ fontSize: 24, fontWeight: 800 }}>
                  {selectedStudy.title}
                </h2>
                <p style={{ fontSize: 13.5, color: "var(--v2-text2)", marginTop: 4 }}>
                  {selectedStudy.client} &middot; {selectedStudy.city} &middot; Paid via {selectedStudy.rail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudy(null)}
                aria-label="Close milestone breakdown"
                style={{
                  background: "var(--v2-surface)",
                  border: "1px solid var(--v2-border)",
                  color: "var(--v2-text)",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="v2-milestone-list">
              {selectedStudy.milestones.map((ms) => (
                <div key={ms.title} className="v2-milestone-row">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{ms.title}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--v2-text2)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 3,
                      }}
                    >
                      <Clock size={12} /> Delivered in {ms.duration} &middot; Approved &amp; Released
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 800,
                      color: "var(--v2-primary)",
                      fontSize: 15,
                    }}
                  >
                    {ms.amount}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--v2-text2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Layers size={15} color="var(--v2-primary)" />
                Total Escrowed &amp; Released: <strong style={{ color: "var(--v2-text)" }}>{selectedStudy.budgetEtb}</strong>
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  onClick={handleStartProject}
                >
                  <span>Post a Similar Project</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
