import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import {
  AnimatedCountUpStrip,
  ScrollIlluminatedHeadline,
  ScrollParallaxDiptych,
  StickyScrollServicesStage,
  type StickyStackItem,
} from "./components/StudioScrollMotion";

interface AboutPageProps {
  onNavigate?: (view: "landing" | "about" | "faq" | "fees" | "casestudies") => void;
  onStart?: (mode: "login" | "register") => void;
}

type PillarId = "escrow" | "fayda" | "mediation" | "erca";

interface TrustPillarItem {
  id: PillarId;
  label: { en: string; am: string };
  topChip: string;
  badge: string;
  rows: { label: string; badge: string }[];
}

interface TeamLeader {
  id: string;
  name: string;
  role: { en: string; am: string };
  corridor: string;
  credential: string;
  theme: "emerald" | "gold" | "obsidian" | "cobalt";
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TRUST_PILLARS: TrustPillarItem[] = [
  {
    id: "escrow",
    label: { en: "Escrow Vaults", am: "የኤስክሮ ጥበቃ" },
    topChip: "1:1 NBE CUSTODY",
    badge: "ZERO UNPAID WORK",
    rows: [
      { label: "CAPITAL CUSTODY", badge: "100% ETB" },
      { label: "SILENT-CLIENT SLA", badge: "120 HOURS" },
      { label: "WALLET PAYOUT", badge: "< 45 SEC" },
    ],
  },
  {
    id: "fayda",
    label: { en: "Fayda KYC", am: "ፋይዳ መታወቂያ" },
    topChip: "NATIONAL ID & TIN",
    badge: "100% VETTED",
    rows: [
      { label: "INDIVIDUAL KYC", badge: "FAYDA FAN" },
      { label: "CORPORATE KYB", badge: "TIN + LICENSE" },
      { label: "IMPERSONATION", badge: "0.00%" },
    ],
  },
  {
    id: "mediation",
    label: { en: "48h Mediation", am: "የ48 ሰዓት ሽምግልና" },
    topChip: "BOLE ARBITRATION",
    badge: "99.4% DISPUTE-FREE",
    rows: [
      { label: "ARBITRATION SLA", badge: "48 HOURS" },
      { label: "FILE TIMESTAMP", badge: "SHA-256" },
      { label: "AMICABLE RATE", badge: "99.4%" },
    ],
  },
  {
    id: "erca",
    label: { en: "ERCA Ledgers", am: "የገቢዎች ታክስ" },
    topChip: "FISCAL ENGINE",
    badge: "AUDIT-READY",
    rows: [
      { label: "VAT COMPUTATION", badge: "15% AUTO" },
      { label: "WITHHOLDING", badge: "2% > 10K ETB" },
      { label: "FINANCE EXPORT", badge: "PDF + CSV" },
    ],
  },
];

const LEADERSHIP_TEAM: TeamLeader[] = [
  {
    id: "dawit",
    name: "Dawit Alemu",
    role: { en: "Co-Founder & Chief Executive Officer", am: "መስራች እና ዋና ሥራ አስፈጻሚ" },
    corridor: "ADDIS ABABA · FINTECH",
    credential: "CORE BANKING ARCHITECT",
    theme: "emerald",
  },
  {
    id: "selamawit",
    name: "Selamawit Tadesse",
    role: { en: "Chief Trust & Escrow Officer", am: "የኤስክሮ እና የሕግ ጉዳዮች ኃላፊ" },
    corridor: "ADDIS ABABA · LEGAL SLA",
    credential: "COMMERCIAL COMPLIANCE",
    theme: "gold",
  },
  {
    id: "bereket",
    name: "Bereket Hailu",
    role: { en: "VP of Engineering & Security", am: "የኢንጂነሪንግ ምክትል ፕሬዝዳንት" },
    corridor: "AAiT · DISTRIBUTED LEDGERS",
    credential: "TELEBIRR & CBE API LEAD",
    theme: "obsidian",
  },
  {
    id: "hana",
    name: "Hana Mekonnen",
    role: { en: "Head of Talent & Regional Corridors", am: "የባለሙያዎች ማረጋገጫ ኃላፊ" },
    corridor: "ADDIS · HAWASSA · BAHIR DAR",
    credential: "FAYDA KYC DIRECTOR",
    theme: "cobalt",
  },
];

const REGIONAL_CORRIDORS = [
  {
    id: "addis",
    name: "Addis Ababa HQ (Bole Atlas)",
    role: "ENTERPRISE ESCROW · FINTECH · FULL-STACK ENGINEERING",
    quote:
      "Our Bole Atlas studio coordinates enterprise software escrows, commercial bank RTGS custody, and our bilingual 48-hour mediation desk.",
    metric: "12,400+ TALENT",
  },
  {
    id: "hawassa",
    name: "Hawassa & Adama Corridor",
    role: "AGRITECH · INDUSTRIAL IOT · MOBILE COMMERCE",
    quote:
      "Connecting Rift Valley agro-processors and industrial parks with vetted mobile engineers, UI/UX specialists, and data analysts.",
    metric: "3,100+ TALENT",
  },
  {
    id: "bahirdar",
    name: "Bahir Dar, Mekelle & Dire Dawa",
    role: "MULTILINGUAL LOCALIZATION · AI DATA · DESIGN",
    quote:
      "Instant Telebirr and CBE Birr milestone releases empower university graduates across regional capitals to execute national contracts.",
    metric: "2,900+ TALENT",
  },
];

function TiltVisualSurface({
  children,
  className = "",
  pillLabel,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  pillLabel?: string;
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
      {pillLabel && (
        <div
          className={`cs-work-magnetic-pill ${tilt.active ? "is-visible" : ""}`}
          style={{
            left: `${Math.min(Math.max(tilt.glareX, 18), 82)}%`,
            top: `${Math.min(Math.max(tilt.glareY, 18), 82)}%`,
          }}
        >
          {pillLabel}
        </div>
      )}
    </motion.div>
  );
}

function renderAboutArtwork(key: string) {
  if (key === "hero-left" || key === "escrow" || key === "emerald") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`ab-bg-${key}`} cx="50%" cy="45%" r="72%">
            <stop offset="0%" stopColor="#1b3e26" />
            <stop offset="60%" stopColor="#09150d" />
            <stop offset="100%" stopColor="#040705" />
          </radialGradient>
          <linearGradient id={`ab-em-${key}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a6f272" />
            <stop offset="55%" stopColor="#5fa032" />
            <stop offset="100%" stopColor="#1b4319" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#ab-bg-${key})`} />
        <circle cx="300" cy="210" r="158" fill="none" stroke="rgba(155,229,100,0.22)" strokeDasharray="6 10" className="cs-svg-orbit" />
        <g className="cs-svg-float">
          <path d="M195 310 V175 A105 105 0 0 1 405 175 V310" fill="none" stroke={`url(#ab-em-${key})`} strokeWidth="28" strokeLinecap="round" />
          <path d="M235 310 V190 A65 65 0 0 1 365 190 V310" fill="none" stroke="#f5c518" strokeWidth="14" strokeLinecap="round" />
          <circle cx="300" cy="185" r="28" fill="#fafaf7" />
        </g>
      </svg>
    );
  }

  if (key === "hero-right" || key === "fayda" || key === "gold") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <rect width="600" height="420" fill="#09140e" />
        <g opacity="0.24" stroke="#9be564" strokeWidth="1.5">
          <line x1="160" y1="140" x2="300" y2="210" />
          <line x1="440" y1="135" x2="300" y2="210" />
          <line x1="185" y1="295" x2="300" y2="210" />
          <line x1="425" y1="290" x2="300" y2="210" />
        </g>
        <g className="cs-svg-float">
          <circle cx="300" cy="210" r="54" fill="#5fa032" stroke="#fafaf7" strokeWidth="4" />
          <circle cx="160" cy="140" r="24" fill="#f5c518" />
          <circle cx="440" cy="135" r="22" fill="#9be564" />
          <circle cx="185" cy="295" r="20" fill="#9be564" />
          <circle cx="425" cy="290" r="24" fill="#f5c518" />
        </g>
      </svg>
    );
  }

  if (key === "mediation" || key === "obsidian") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <rect width="600" height="420" fill="#08110c" />
        <g className="cs-svg-float">
          <rect x="175" y="135" width="250" height="150" rx="75" fill="none" stroke="#9be564" strokeWidth="20" />
          <circle cx="245" cy="210" r="38" fill="#f5c518" />
          <circle cx="355" cy="210" r="38" fill="#5fa032" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
      <rect width="600" height="420" fill="#09150f" />
      <g className="cs-svg-float">
        <polygon points="300,90 420,160 420,270 300,340 180,270 180,160" fill="#173822" stroke="#f5c518" strokeWidth="4" />
        <circle cx="300" cy="215" r="46" fill="#5fa032" stroke="#ffffff" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function AboutPage({ onNavigate, onStart }: AboutPageProps) {
  const { language } = useI18n();
  const lang: "en" | "am" = language === "am" ? "am" : "en";
  const [activePillarId, setActivePillarId] = useState<PillarId>("escrow");
  const [activeCorridorIdx, setActiveCorridorIdx] = useState<number>(0);
  const [contactName, setContactName] = useState("");
  const [contactOrg, setContactOrg] = useState("");
  const [contactTopic, setContactTopic] = useState("Enterprise Escrow Onboarding");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const teamSectionRef = useRef<HTMLElement | null>(null);
  const contactSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stickyItems: StickyStackItem[] = useMemo(
    () =>
      TRUST_PILLARS.map((pillar) => ({
        id: pillar.id,
        title: pillar.label[lang],
        topChip: pillar.topChip,
        kickerBadge: pillar.badge,
        artNode: renderAboutArtwork(pillar.id),
        rows: pillar.rows,
        onCardClick: () => onNavigate?.("faq"),
      })),
    [lang, onNavigate]
  );

  const activeCorridor = REGIONAL_CORRIDORS[activeCorridorIdx] ?? REGIONAL_CORRIDORS[0];

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMessage.trim()) return;
    setContactSent(true);
  };

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
                {lang === "am" ? "ለኢትዮጵያ" : "we build"}{" "}
                <span className="cs-hero-brace">{lang === "am" ? "{እምነት}" : "{trust}"}</span>
              </span>
              <span className="cs-hero-line">
                <span className="cs-hero-arrow" aria-hidden="true">
                  →
                </span>
                {lang === "am" ? "የዲጂታል ሥራ መሠረት" : "for Ethiopian work"}
              </span>
            </h1>
          </motion.div>

          {/* Scroll-Parallax Pure-Visual 2-Frame Diptych */}
          <ScrollParallaxDiptych
            leftFrame={
              <TiltVisualSurface
                className="cs-hero-art-frame"
                onClick={() => teamSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                {renderAboutArtwork("hero-left")}
                <span className="cs-hero-hover-pill">
                  {lang === "am" ? "{ የአመራር ቡድን } ↗" : "{ Addis Ababa Studio } ↗"}
                </span>
              </TiltVisualSurface>
            }
            rightFrame={
              <TiltVisualSurface
                className="cs-hero-art-frame"
                onClick={() => contactSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                {renderAboutArtwork("hero-right")}
                <span className="cs-hero-hover-pill">
                  {lang === "am" ? "{ መልዕክት ይላኩ } ↗" : "{ Bole Atlas HQ } ↗"}
                </span>
              </TiltVisualSurface>
            }
          />

          <div className="cs-hero-foot" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="cs-scroll-pill"
              onClick={() => teamSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              {lang === "am" ? "አመራሩን ይመልከቱ ↓" : "Explore studio ↓"}
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 2 — CRISP WHITE { TRUST } MANIFESTO (ZERO SUB-PARAGRAPHS)
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
              <span className="cs-brace-emblem-word">{lang === "am" ? "እምነት" : "TRUST"}</span>
              <span className="cs-brace-emblem-char">{"}"}</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline
                segments={
                  lang === "am"
                    ? [
                        { text: "ኢትዮጵያ ድንቅ ባለሙያዎች አሏት፤ YeKis ደግሞ" },
                        { text: "ሁለቱንም ወገን የሚጠብቅ የኤስክሮ ድልድይ", highlight: true },
                        { text: "በአዲስ አበባ ገንብቷል።" },
                      ]
                    : [
                        { text: "Ethiopia never lacked world-class talent—it needed" },
                        { text: "institutional escrow infrastructure", highlight: true },
                        { text: "so teams can build together with zero fear." },
                      ]
                }
              />

              <AnimatedCountUpStrip
                metrics={[
                  { value: 142, suffix: "M+ ETB", label: "RINGFENCED ESCROW" },
                  { value: 18400, suffix: "+", label: "FAYDA-VETTED TALENT" },
                  { value: 99.4, decimals: 1, suffix: "%", label: "DISPUTE-FREE RATE" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 3 — WARM ALABASTER STAGGERED 2-COLUMN LEADERSHIP SHOWCASE
          ================================================================ */}
      <section className="cs-works-band" ref={teamSectionRef}>
        <div className="cs-band-inner">
          <div className="cs-works-topbar">
            <span className="cs-kicker" style={{ color: "#0b0f0c" }}>
              {"{"} {lang === "am" ? "መስራቾች እና አመራሮች" : "STUDIO LEADERSHIP"} {"}"}
            </span>
          </div>

          <div className="cs-stagger-grid">
            {LEADERSHIP_TEAM.map((member, idx) => (
              <motion.article
                key={member.id}
                className="cs-work-item"
                initial={{ opacity: 0, y: 36, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE_OUT_EXPO }}
              >
                <div className="cs-work-card">
                  <TiltVisualSurface
                    className="cs-work-visual"
                    pillLabel={`{ ${member.name.split(" ")[0]} }`}
                  >
                    {renderAboutArtwork(member.theme)}
                    <div className="cs-work-visual-top">
                      <span className="cs-work-client-chip">{member.corridor}</span>
                      <span className="cs-work-year-chip">{member.credential}</span>
                    </div>
                  </TiltVisualSurface>

                  <h3 className="cs-work-headline" style={{ marginBottom: 4 }}>
                    {member.name}
                  </h3>
                  <div className="cs-work-meta">
                    <span>{member.role[lang]}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 4 — STICKY SCROLL-PINNED { PILLARS } 3-COLUMN STAGE
          ================================================================ */}
      <section className="cs-services-band">
        <StickyScrollServicesStage
          kicker={lang === "am" ? "{ ምሰሶዎች }" : "{ PILLARS }"}
          items={stickyItems}
          activeId={activePillarId}
          onSelect={(id) => setActivePillarId(id as PillarId)}
        />
      </section>

      {/* ================================================================
          BAND 5 — VIBRANT STUDIO GREEN CORRIDOR COVERAGE BAND (#5fa032)
          ================================================================ */}
      <section className="cs-testi-band">
        <div className="cs-band-inner">
          <div className="cs-testi-grid">
            <div className="cs-testi-left">
              <span className="cs-kicker" style={{ color: "#070a08" }}>
                {"{"} {lang === "am" ? "የሥራ ማዕከላት" : "CORRIDORS"} {"}"}
              </span>

              <div className="cs-testi-authors">
                {REGIONAL_CORRIDORS.map((corridor, idx) => (
                  <button
                    key={corridor.id}
                    type="button"
                    className={`cs-testi-author-btn ${idx === activeCorridorIdx ? "is-active" : ""}`}
                    onClick={() => setActiveCorridorIdx(idx)}
                  >
                    <span>{corridor.name}</span>
                    <span className="cs-testi-metric-pill">{corridor.metric}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="cs-testi-right">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCorridor.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  <p className="cs-testi-quote">“{activeCorridor.quote}”</p>
                  <div className="cs-testi-role">{activeCorridor.role}</div>
                  <button type="button" className="cs-testi-link" onClick={() => onStart?.("register")}>
                    {lang === "am" ? "ባለሙያ ይቅጠሩ ↗" : "Hire verified talent ↗"}
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 6 — DARK OBSIDIAN STUDIO CONTACT & DISPATCH BAND (#070a08)
          ================================================================ */}
      <section className="cs-outro-band" ref={contactSectionRef}>
        <div className="cs-band-inner">
          <div className="cs-outro-grid" style={{ alignItems: "start" }}>
            <div>
              <span className="cs-kicker" style={{ color: "#78c841" }}>
                {"{"} {lang === "am" ? "ቦሌ አትላስ · አዲስ አበባ" : "BOLE ATLAS HQ"} {"}"}
              </span>
              <h2 className="cs-outro-title" style={{ marginBottom: 18 }}>
                {lang === "am" ? "ከYeKis ቡድን ጋር ይገናኙ።" : "Dispatch our Addis Ababa studio."}
              </h2>

              <div className="cs-outro-brace-stage" style={{ justifyContent: "flex-start", marginTop: 24 }}>
                <span className="cs-outro-giant-brace" style={{ fontSize: "clamp(54px, 7vw, 92px)" }}>
                  {"{"}
                </span>
                <button type="button" className="cs-outro-pill-btn" onClick={() => openSupportChat()}>
                  hello@yekis.et ↗
                </button>
                <span className="cs-outro-giant-brace" style={{ fontSize: "clamp(54px, 7vw, 92px)" }}>
                  {"}"}
                </span>
              </div>
            </div>

            <form className="cs-contact-card" onSubmit={handleDispatchSubmit}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: 11,
                  color: "#78c841",
                  letterSpacing: "0.08em",
                }}
              >
                <span>STUDIO DISPATCH</span>
                <span>SLA: &lt; 2 HOURS</span>
              </div>

              {contactSent ? (
                <div
                  style={{
                    background: "rgba(120, 200, 65, 0.14)",
                    border: "1px solid #78c841",
                    borderRadius: 16,
                    padding: 22,
                    color: "#f4f7f4",
                  }}
                >
                  <h3 style={{ margin: "0 0 12px", fontSize: 20 }}>
                    {lang === "am" ? "መልዕክትዎ ደርሶናል!" : "Dispatch received by Bole Atlas HQ."}
                  </h3>
                  <button
                    type="button"
                    className="cs-outro-pill-btn"
                    onClick={() => {
                      setContactSent(false);
                      setContactMessage("");
                    }}
                  >
                    {lang === "am" ? "ሌላ መልዕክት ይላኩ" : "Send another dispatch"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <input
                      type="text"
                      required
                      className="cs-contact-input"
                      placeholder={lang === "am" ? "ሙሉ ስም *" : "Your full name *"}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="cs-contact-input"
                      placeholder={lang === "am" ? "ድርጅት / ስልክ" : "Company or Telebirr phone"}
                      value={contactOrg}
                      onChange={(e) => setContactOrg(e.target.value)}
                    />
                  </div>

                  <select
                    className="cs-contact-select"
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                  >
                    <option value="Enterprise Escrow Onboarding">Enterprise Escrow Onboarding</option>
                    <option value="ERCA VAT & Withholding Integration">ERCA VAT &amp; Withholding Integration</option>
                    <option value="Fayda KYC & Agency Verification">Fayda KYC &amp; Agency Verification</option>
                  </select>

                  <textarea
                    required
                    rows={3}
                    className="cs-contact-textarea"
                    placeholder={lang === "am" ? "መልዕክትዎን ይጻፉ..." : "Brief inquiry..."}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                  />

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="submit" className="cs-outro-pill-btn">
                      {lang === "am" ? "መልዕክት ይላኩ ↗" : "Send Dispatch ↗"}
                    </button>
                    <button
                      type="button"
                      className="cs-outro-pill-btn"
                      style={{
                        background: "transparent",
                        color: "#f4f7f4",
                        border: "1px solid rgba(255,255,255,0.24)",
                      }}
                      onClick={() => onStart?.("register")}
                    >
                      {lang === "am" ? "ውል ይጀምሩ" : "Start Contract"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
export default AboutPage;
