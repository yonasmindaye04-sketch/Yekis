import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "./i18n";
import { events } from "./analytics";
import { openSupportChat } from "./components/supportChatEvents";
import {
  AnimatedCountUpStrip,
  ScrollIlluminatedHeadline,
  ScrollParallaxDiptych,
  StickyScrollServicesStage,
  type StickyStackItem,
} from "./components/StudioScrollMotion";

interface FAQPageProps {
  onNavigate?: (view: "landing" | "about" | "faq" | "fees" | "casestudies") => void;
  onStart?: (mode: "login" | "register") => void;
}

type FAQCategoryId = "escrow" | "payouts" | "disputes" | "verification" | "tax";

interface FAQItem {
  id: string;
  num: string;
  category: FAQCategoryId;
  question: { en: string; am: string };
  answer: { en: string; am: string };
  goldHighlight: { en: string; am: string };
  slaMetric: string;
}

interface FAQTopicService {
  id: FAQCategoryId;
  label: { en: string; am: string };
  topChip: string;
  slaBadge: string;
  rows: { label: string; badge: string }[];
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const FAQ_TOPICS: FAQTopicService[] = [
  {
    id: "escrow",
    label: { en: "Escrow Locks", am: "የኤስክሮ ጥበቃ" },
    topChip: "NBE ESCROW TRUST",
    slaBadge: "100% RINGFENCED",
    rows: [
      { label: "SCOPE DEPOSIT", badge: "100% LOCKED" },
      { label: "DELIVERY PROOF", badge: "SHA-256" },
      { label: "AUTO-RELEASE", badge: "120 HOURS" },
    ],
  },
  {
    id: "payouts",
    label: { en: "Instant Payouts", am: "ፈጣን ክፍያዎች" },
    topChip: "TELEBIRR · CBE BIRR",
    slaBadge: "< 45 SEC PAYOUT",
    rows: [
      { label: "TELEBIRR WALLET", badge: "< 45 SEC" },
      { label: "CBE BIRR / RTGS", badge: "< 90 SEC" },
      { label: "M-PESA ETHIOPIA", badge: "< 60 SEC" },
    ],
  },
  {
    id: "disputes",
    label: { en: "48h Mediation", am: "የ48 ሰዓት ሽምግልና" },
    topChip: "ADDIS ABABA DESK",
    slaBadge: "48H BINDING SLA",
    rows: [
      { label: "ESCROW FREEZE", badge: "INSTANT" },
      { label: "EVIDENCE AUDIT", badge: "12 HOURS" },
      { label: "FINAL RULING", badge: "48 HOURS" },
    ],
  },
  {
    id: "verification",
    label: { en: "Fayda ID", am: "ፋይዳ መታወቂያ" },
    topChip: "BIOMETRIC & TIN",
    slaBadge: "3-MIN KYC",
    rows: [
      { label: "FAYDA / KEBELE", badge: "VERIFIED" },
      { label: "PORTFOLIO VETTING", badge: "AUDITED" },
      { label: "CORPORATE TIN", badge: "LICENSED" },
    ],
  },
  {
    id: "tax",
    label: { en: "ERCA Tax", am: "የገቢዎች ታክስ" },
    topChip: "FISCAL LEDGER",
    slaBadge: "AUDIT-READY PDF",
    rows: [
      { label: "ETHIOPIAN VAT", badge: "15% AUTO" },
      { label: "WITHHOLDING", badge: "2% > 10K ETB" },
      { label: "FINANCE EXPORT", badge: "PDF + CSV" },
    ],
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-escrow-work",
    num: "01",
    category: "escrow",
    question: {
      en: "How does YeKis milestone escrow protect both clients and freelancers?",
      am: "የYeKis ኤስክሮ ደንበኞችን እና ባለሙያዎችን እንዴት ይጠብቃል?",
    },
    answer: {
      en: "Before work starts on any phase, the client funds that milestone in Ethiopian Birr (ETB). YeKis ringfences the capital in an audited escrow trust account and releases funds the moment deliverables are approved.",
      am: "ሥራ ከመጀመሩ በፊት ደንበኛው ክፍያውን በብር ወደ ኤስክሮ ያስገባል። ሥራው በትክክል መጠናቀቁ ሲረጋገጥ ክፍያው ወዲያውኑ ይለቀቃል።",
    },
    goldHighlight: {
      en: "Zero unpaid trial work · Zero deposit risk.",
      am: "ያለ ክፍያ የሚባክን ድካም የለም · ቅድመ ክፍያ ተከፍሎ የሚጠፋ ሥራ የለም።",
    },
    slaMetric: "100% ESCROW BACKED",
  },
  {
    id: "faq-client-ghost",
    num: "02",
    category: "escrow",
    question: {
      en: "What happens if a client goes silent after I submit completed milestone files?",
      am: "ሥራዬን አጠናቅቄ ካስረከብኩ በኋላ ደንበኛው ምላሽ ባይሰጥ ምን ይሆናል?",
    },
    answer: {
      en: "Uploading deliverables starts an automated 120-hour (5-business-day) review timer. If the client neither approves nor requests a scope-backed revision before the clock hits zero, 100% of the milestone releases automatically.",
      am: "ሥራዎን እንዳስረከቡ የ120 ሰዓታት ቆጣሪ ይጀምራል። ደንበኛው ምላሽ ካልሰጠ ሲስተሙ ክፍያውን በራሱ ወደ ቦርሳዎ ይለቃል።",
    },
    goldHighlight: {
      en: "120-Hour Auto-Release Covenant.",
      am: "የ120 ሰዓት አውቶማቲክ የክፍያ መልቀቂያ ዋስትና።",
    },
    slaMetric: "120H AUTO-RELEASE",
  },
  {
    id: "faq-payout-rails",
    num: "03",
    category: "payouts",
    question: {
      en: "Which Ethiopian payment methods are supported for funding and instant withdrawals?",
      am: "ክፍያ ለመፈጸም እና ገንዘብ ለማውጣት የትኞቹ የኢትዮጵያ የክፍያ አማራጮች ይሠራሉ?",
    },
    answer: {
      en: "YeKis natively integrates Telebirr, CBE Birr, Commercial Bank of Ethiopia RTGS, Awash Birr, Abyssinia, Dashen Amole, and M-Pesa Ethiopia in 100% native ETB.",
      am: "ቴሌብር፣ ሲቢኢ ብር፣ የኢትዮጵያ ንግድ ባንክ፣ አዋሽ ብር፣ አቢሲኒያ ባንክ፣ አሞሌ እና ኤም-ፔሳ ኢትዮጵያ በሙሉ በቀጥታ ይሠራሉ።",
    },
    goldHighlight: {
      en: "Median Telebirr & CBE Birr payout speed: 42 seconds.",
      am: "በአማካይ በ42 ሰከንድ ውስጥ ወደ ቴሌብር ይገባል።",
    },
    slaMetric: "< 45 SEC PAYOUT",
  },
  {
    id: "faq-fee-split",
    num: "04",
    category: "payouts",
    question: {
      en: "How much does YeKis charge compared to international freelance platforms?",
      am: "የYeKis የአገልግሎት ክፍያ ከውጭ ፕላትፎርሞች አንጻር ምን ያህል ነው?",
    },
    answer: {
      en: "YeKis charges a flat 2.5% client deposit fee and a 2.5% freelancer release fee. Freelancers keep 97.5% of every contract with zero monthly subscriptions.",
      am: "YeKis ከደንበኛው 2.5% እና ከባለሙያው 2.5% ብቻ ይቆርጣል። ባለሙያዎች የውሉን 97.5% በሙሉ ያገኛሉ።",
    },
    goldHighlight: {
      en: "Freelancers take home 97.5% of every ETB milestone.",
      am: "ባለሙያዎች የድካማቸውን 97.5% ያለምንም ወርሃዊ ክፍያ ያገኛሉ።",
    },
    slaMetric: "97.5% TAKE-HOME",
  },
  {
    id: "faq-dispute-sla",
    num: "05",
    category: "disputes",
    question: {
      en: "How does the 48-hour bilingual dispute mediation process work?",
      am: "የ48 ሰዓት የሽምግልና እና የዳኝነት ሂደት እንዴት ይሠራል?",
    },
    answer: {
      en: "Our Addis Ababa arbitration desk audits the signed milestone rubric, SHA-256 deliverable hashes, and workspace logs in Amharic and English, issuing a binding settlement within 48 hours.",
      am: "የአዲስ አበባ የሽምግልና ቡድናችን ውሉን እና የተላኩ ፋይሎችን መርምሮ በ48 ሰዓት ውስጥ ውሳኔ ይሰጣል።",
    },
    goldHighlight: {
      en: "99.4% dispute-free rate · 48h human resolution.",
      am: "99.4% የሚሆኑ ሥራዎች በሰላም ይጠናቀቃሉ፤ ክርክሮች በ48 ሰዓት ይፈታሉ።",
    },
    slaMetric: "48H HUMAN REVIEW",
  },
  {
    id: "faq-fayda-kyc",
    num: "06",
    category: "verification",
    question: {
      en: "Do I need a Fayda National ID or Trade License to join YeKis?",
      am: "በYeKis ለመመዝገብ የፋይዳ ብሔራዊ መታወቂያ ወይም የንግድ ፈቃድ ያስፈልገኛል?",
    },
    answer: {
      en: "Individuals verify in 3 minutes using Fayda National ID (FAN), Kebele ID, or Passport. Registered companies attach their TIN and Trade License for enterprise escrow limits.",
      am: "የግል ባለሙያዎች በፋይዳ መታወቂያ፣ በቀበሌ መታወቂያ ወይም በፓስፖርት በ3 ደቂቃ መመዝገብ ይችላሉ።",
    },
    goldHighlight: {
      en: "Verified badges boost proposal acceptance by 3.4×.",
      am: "ማንነታቸው የተረጋገጠ ባለሙያዎች በ3.4 እጥፍ የበለጠ ሥራ ያገኛሉ።",
    },
    slaMetric: "3-MIN KYC CHECK",
  },
  {
    id: "faq-erca-tax",
    num: "07",
    category: "tax",
    question: {
      en: "Does YeKis generate ERCA-compliant VAT and 2% Withholding Tax certificates?",
      am: "YeKis ለገቢዎች ሚኒስቴር የሚሆን የ15% ቫት እና የ2% ዊዝሆልዲንግ ሰነድ ያዘጋጃል?",
    },
    answer: {
      en: "Yes. Our fiscal engine automatically calculates optional 15% VAT and statutory 2% Withholding Tax on contracts above 10,000 ETB, issuing downloadable PDFs.",
      am: "አዎ! ሲስተሙ የ15% ቫት እና ከ10,000 ብር በላይ ለሆኑ ውሎች የ2% ዊዝሆልዲንግ አስልቶ ሕጋዊ የPDF ሰነድ ያዘጋጃል።",
    },
    goldHighlight: {
      en: "Instant ERCA tax invoices & withholding vouchers.",
      am: "አውቶማቲክ የታክስ ሰነዶች የሂሳብ ክፍሎችን ጊዜ ይቆጥባሉ።",
    },
    slaMetric: "ERCA COMPLIANT",
  },
  {
    id: "faq-milestone-edits",
    num: "08",
    category: "escrow",
    question: {
      en: "Can we add new milestones or adjust scope mid-project without restarting?",
      am: "ፕሮጀክቱ በመካከል ላይ እያለ አዲስ ምዕራፍ መጨመር ወይም ማስተካከል ይቻላል?",
    },
    answer: {
      en: "Either party can propose an Addendum Milestone inside the active contract ledger. Once funded via Telebirr or bank transfer, the new tranche joins the escrow timeline.",
      am: "በማንኛውም ጊዜ አዲስ የሥራ ምዕራፍ መጨመር ወይም ያልተጀመሩ ምዕራፎችን ማስተካከል ይቻላል።",
    },
    goldHighlight: {
      en: "Scales from 5,000 ETB sprints to 2M+ ETB rollouts.",
      am: "ከ5,000 ብር እስከ 2 ሚሊዮን ብር ፕሮጀክቶች በተለዋዋጭ ይሠራል።",
    },
    slaMetric: "DYNAMIC ADDENDUMS",
  },
];

const SLA_ASSURANCES = [
  {
    id: "sla-auto",
    name: "120-Hour Auto-Release",
    role: "FREELANCER PROTECTION COVENANT · CLAUSE 04",
    quote:
      "Silent clients can never trap completed work in limbo—verified milestone uploads release automatically at hour 120.",
    metric: "100% ON-TIME",
  },
  {
    id: "sla-mediation",
    name: "48-Hour Human Arbitration",
    role: "ADDIS ABABA DISPUTE DESK · BILINGUAL PANEL",
    quote:
      "Senior Ethiopian engineering, design, and legal mediators inspect your signed scope and SHA-256 artifacts to issue a binding ETB split within 48 hours.",
    metric: "48H BINDING SLA",
  },
  {
    id: "sla-ringfence",
    name: "1:1 NBE Escrow Custody",
    role: "CAPITAL RINGFENCING · ZERO REHYPOTHECATION",
    quote:
      "Every Ethiopian Birr locked in a YeKis contract sits 1:1 in segregated commercial trust accounts—ready for instant Telebirr or CBE Birr settlement.",
    metric: "1:1 ETB RESERVE",
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

function renderTopicArtwork(topicId: FAQCategoryId, variant: "hero-left" | "hero-right" | "fluted") {
  const uid = `${topicId}-${variant}`;

  if (topicId === "escrow" || variant === "hero-left") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#1b3c25" />
            <stop offset="55%" stopColor="#0b1810" />
            <stop offset="100%" stopColor="#050806" />
          </radialGradient>
          <linearGradient id={`em-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9be564" />
            <stop offset="50%" stopColor="#5fa032" />
            <stop offset="100%" stopColor="#1e4618" />
          </linearGradient>
          <linearGradient id={`gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe47a" />
            <stop offset="100%" stopColor="#d99b00" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#bg-${uid})`} />
        <g opacity="0.2" stroke="#78c841" strokeWidth="1">
          <circle cx="300" cy="210" r="165" fill="none" strokeDasharray="5 9" className="cs-svg-orbit" />
          <circle cx="300" cy="210" r="122" fill="none" className="cs-svg-pulse" />
        </g>
        <g className="cs-svg-float">
          <ellipse
            cx="300"
            cy="210"
            rx="116"
            ry="66"
            transform="rotate(-24 300 210)"
            fill="none"
            stroke={`url(#em-${uid})`}
            strokeWidth="26"
          />
          <ellipse
            cx="300"
            cy="210"
            rx="102"
            ry="56"
            transform="rotate(28 300 210)"
            fill="none"
            stroke={`url(#gold-${uid})`}
            strokeWidth="18"
            opacity="0.92"
          />
        </g>
        <g className="cs-svg-float-alt">
          <circle cx="300" cy="210" r="44" fill="#0d1e13" stroke="#9be564" strokeWidth="3" />
          <path d="M288 206 V195 A12 12 0 0 1 312 195 V206" fill="none" stroke="#ffe47a" strokeWidth="4" strokeLinecap="round" />
          <rect x="282" y="206" width="36" height="26" rx="6" fill={`url(#gold-${uid})`} />
        </g>
      </svg>
    );
  }

  if (topicId === "payouts" || variant === "hero-right") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`bg-${uid}`} cx="50%" cy="50%" r="72%">
            <stop offset="0%" stopColor="#173026" />
            <stop offset="60%" stopColor="#09130f" />
            <stop offset="100%" stopColor="#040705" />
          </radialGradient>
          <linearGradient id={`rail-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3f26d" />
            <stop offset="50%" stopColor="#5fa032" />
            <stop offset="100%" stopColor="#1b4320" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#bg-${uid})`} />
        <g className="cs-svg-orbit" opacity="0.22">
          <circle cx="300" cy="210" r="154" fill="none" stroke="#9be564" strokeWidth="1.5" strokeDasharray="8 10" />
        </g>
        <g className="cs-svg-float">
          <rect x="155" y="135" width="290" height="44" rx="22" fill={`url(#rail-${uid})`} transform="rotate(-12 300 157)" />
          <rect x="155" y="195" width="290" height="44" rx="22" fill="#f5c518" transform="rotate(-12 300 217)" opacity="0.9" />
          <rect x="155" y="255" width="290" height="44" rx="22" fill={`url(#rail-${uid})`} transform="rotate(-12 300 277)" />
        </g>
        <g className="cs-svg-float-alt">
          <circle cx="415" cy="145" r="24" fill="#ffe47a" />
          <circle cx="190" cy="280" r="18" fill="#9be564" />
        </g>
      </svg>
    );
  }

  if (topicId === "disputes") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <rect width="600" height="420" fill="#09140d" />
        <circle cx="300" cy="210" r="150" fill="none" stroke="rgba(155,229,100,0.22)" strokeWidth="2" className="cs-svg-orbit" />
        <g className="cs-svg-float">
          <polygon points="300,115 352,295 248,295" fill="rgba(95,160,50,0.28)" stroke="#9be564" strokeWidth="3" />
          <line x1="160" y1="185" x2="440" y2="185" stroke="#f5c518" strokeWidth="8" strokeLinecap="round" />
          <circle cx="185" cy="235" r="34" fill="#5fa032" stroke="#ffffff" strokeWidth="2" />
          <circle cx="415" cy="235" r="34" fill="#f5c518" stroke="#141715" strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (topicId === "verification") {
    return (
      <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
        <rect width="600" height="420" fill="#08120c" />
        <g className="cs-svg-float">
          <polygon
            points="300,88 415,142 415,252 300,332 185,252 185,142"
            fill="rgba(95,160,50,0.25)"
            stroke="#9be564"
            strokeWidth="4"
          />
          <polygon
            points="300,122 382,162 382,238 300,296 218,238 218,162"
            fill="#102618"
            stroke="#f5c518"
            strokeWidth="2.5"
          />
          <path d="M272 210 L294 232 L336 184" fill="none" stroke="#ffe47a" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 600 420" className="cs-hero-art-svg" aria-hidden="true">
      <rect width="600" height="420" fill="#0a140e" />
      <g className="cs-svg-float">
        <rect x="195" y="92" width="210" height="245" rx="18" fill="#fafaf7" stroke="#f5c518" strokeWidth="4" transform="rotate(-6 300 214)" />
        <rect x="225" y="132" width="140" height="16" rx="4" fill="#141715" transform="rotate(-6 300 214)" />
        <rect x="225" y="166" width="110" height="12" rx="4" fill="#5fa032" transform="rotate(-6 300 214)" />
        <rect x="225" y="196" width="145" height="36" rx="6" fill="#f5c518" transform="rotate(-6 300 214)" />
        <circle cx="372" cy="285" r="32" fill="#5fa032" stroke="#ffffff" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function FAQPage({ onNavigate, onStart }: FAQPageProps) {
  const { language } = useI18n();
  const lang: "en" | "am" = language === "am" ? "am" : "en";
  const [activeCategory, setActiveCategory] = useState<"all" | FAQCategoryId>("all");
  const [activeTopicId, setActiveTopicId] = useState<FAQCategoryId>("escrow");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string>("faq-escrow-work");
  const [activeSlaIdx, setActiveSlaIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const questionsSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCat = activeCategory === "all" || item.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.question.en.toLowerCase().includes(q) ||
        item.question.am.toLowerCase().includes(q) ||
        item.answer.en.toLowerCase().includes(q) ||
        item.answer.am.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const stickyItems: StickyStackItem[] = useMemo(
    () =>
      FAQ_TOPICS.map((topic) => ({
        id: topic.id,
        title: topic.label[lang],
        topChip: topic.topChip,
        kickerBadge: topic.slaBadge,
        artNode: renderTopicArtwork(topic.id, "fluted"),
        rows: topic.rows,
        onCardClick: () => {
          setActiveCategory(topic.id);
          questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
        },
      })),
    [lang]
  );

  const activeSla = SLA_ASSURANCES[activeSlaIdx] ?? SLA_ASSURANCES[0];

  const handleToggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? "" : id));
    events.faqExpanded(id);
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
                {lang === "am" ? "ኤስክሮን" : "we make"}{" "}
                <span className="cs-hero-brace">{lang === "am" ? "{ግልጽ}" : "{escrow}"}</span>
              </span>
              <span className="cs-hero-line">
                <span className="cs-hero-arrow" aria-hidden="true">
                  →
                </span>
                {lang === "am" ? "ከመጀመርዎ በፊት" : "clear before you start"}
              </span>
            </h1>
          </motion.div>

          {/* Scroll-Parallax Pure-Visual 2-Frame Diptych */}
          <ScrollParallaxDiptych
            leftFrame={
              <TiltVisualSurface
                className="cs-hero-art-frame"
                onClick={() => {
                  setActiveCategory("escrow");
                  questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {renderTopicArtwork("escrow", "hero-left")}
                <span className="cs-hero-hover-pill">
                  {lang === "am" ? "{ ኤስክሮ } ↗" : "{ Escrow Locks } ↗"}
                </span>
              </TiltVisualSurface>
            }
            rightFrame={
              <TiltVisualSurface
                className="cs-hero-art-frame"
                onClick={() => {
                  setActiveCategory("payouts");
                  questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {renderTopicArtwork("payouts", "hero-right")}
                <span className="cs-hero-hover-pill">
                  {lang === "am" ? "{ ቴሌብር ክፍያ } ↗" : "{ Instant Payouts } ↗"}
                </span>
              </TiltVisualSurface>
            }
          />

          <div className="cs-hero-foot" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="cs-scroll-pill"
              onClick={() => questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              {lang === "am" ? "ጥያቄዎችን ይመልከቱ ↓" : "Scroll down ↓"}
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 2 — CRISP WHITE MANIFESTO & LIVE SEARCH (ZERO SUB-PARAGRAPHS)
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
              <span className="cs-brace-emblem-word">{lang === "am" ? "ግልጽነት" : "CLARITY"}</span>
              <span className="cs-brace-emblem-char">{"}"}</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline
                segments={
                  lang === "am"
                    ? [
                        { text: "የኢትዮጵያ የዲጂታል ሥራ ውሎች" },
                        { text: "ያለምንም ብዥታ እና በኤስክሮ ዋስትና", highlight: true },
                        { text: "እንዲፈጸሙ የተነደፉ ናቸው።" },
                      ]
                    : [
                        { text: "Every rule in the YeKis ledger is engineered for" },
                        { text: "predictable ETB settlement", highlight: true },
                        { text: "—protecting talent and buyers alike." },
                      ]
                }
              />

              {/* Live Search Bar with `/` Shortcut */}
              <div className="cs-search-shell">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5fa032" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="search"
                  className="cs-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === "am"
                      ? "ቴሌብር፣ ኤስክሮ፣ ፋይዳ ወይም ታክስ ይፈልጉ..."
                      : "Search Telebirr, 120h auto-release, Fayda ID, ERCA VAT..."
                  }
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="cs-search-kbd"
                    onClick={() => setSearchQuery("")}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    CLEAR
                  </button>
                ) : (
                  <span className="cs-search-kbd">PRESS /</span>
                )}
              </div>

              {/* Self-Counting Bold KPI Strip (Replaces small text columns) */}
              <AnimatedCountUpStrip
                metrics={[
                  { value: 100, suffix: "%", label: "ESCROW RINGFENCED" },
                  { prefix: "< ", value: 45, suffix: "s", label: "TELEBIRR PAYOUT" },
                  { value: 120, suffix: "h", label: "AUTO-RELEASE SLA" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 3 — WARM ALABASTER INTERACTIVE Q&A ACCORDION (#eff2ee)
          ================================================================ */}
      <section className="cs-works-band" ref={questionsSectionRef}>
        <div className="cs-band-inner">
          <div className="cs-works-topbar">
            <span className="cs-kicker" style={{ color: "#0b0f0c" }}>
              {"{"} {lang === "am" ? "ተደጋጋሚ ጥያቄዎች" : "QUESTIONS & CLAUSES"} {"}"}
            </span>

            <div className="cs-works-tabs" role="tablist">
              {(
                [
                  { id: "all", label: lang === "am" ? "ሁሉም (8)" : "All (8)" },
                  { id: "escrow", label: lang === "am" ? "ኤስክሮ" : "Escrow" },
                  { id: "payouts", label: lang === "am" ? "ክፍያዎች" : "Payouts" },
                  { id: "disputes", label: lang === "am" ? "ሽምግልና" : "Disputes" },
                  { id: "verification", label: lang === "am" ? "ፋይዳ ID" : "Fayda ID" },
                  { id: "tax", label: lang === "am" ? "ታክስ" : "ERCA Tax" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`cs-works-tab ${activeCategory === tab.id ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cs-faq-grid">
            {filteredFaqs.map((item, idx) => {
              const isOpen = openFaqId === item.id;
              return (
                <motion.div
                  key={item.id}
                  className={`cs-faq-card ${isOpen ? "is-open" : ""}`}
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5, delay: idx * 0.05, ease: EASE_OUT_EXPO }}
                >
                  <button
                    type="button"
                    className="cs-faq-trigger"
                    onClick={() => handleToggleFaq(item.id)}
                    aria-expanded={isOpen}
                  >
                    <div>
                      <span className="cs-faq-num">
                        {item.num} · {item.slaMetric}
                      </span>
                      <h3 className="cs-faq-q">{item.question[lang]}</h3>
                    </div>
                    <span className="cs-faq-brace-toggle">{isOpen ? "{−}" : "{+}"}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        className="cs-faq-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                      >
                        <p className="cs-faq-a">{item.answer[lang]}</p>
                        <div className="cs-gold-strip" style={{ borderRadius: 10 }}>
                          {item.goldHighlight[lang]}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className="cs-works-footer-row">
            <button type="button" className="cs-see-all-btn" onClick={() => onNavigate?.("fees")}>
              {lang === "am" ? "የክፍያ ማስያ ይመልከቱ ↗" : "Inspect interactive fee calculator ↗"}
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 4 — STICKY SCROLL-PINNED { TOPICS } 3-COLUMN STAGE
          ================================================================ */}
      <section className="cs-services-band">
        <StickyScrollServicesStage
          kicker={lang === "am" ? "{ ዘርፎች }" : "{ TOPICS }"}
          items={stickyItems}
          activeId={activeTopicId}
          onSelect={(id) => setActiveTopicId(id as FAQCategoryId)}
        />
      </section>

      {/* ================================================================
          BAND 5 — VIBRANT STUDIO GREEN SLA ASSURANCE BAND (#5fa032)
          ================================================================ */}
      <section className="cs-testi-band">
        <div className="cs-band-inner">
          <div className="cs-testi-grid">
            <div className="cs-testi-left">
              <span className="cs-kicker" style={{ color: "#070a08" }}>
                {"{"} {lang === "am" ? "ቃል ኪዳን" : "COVENANTS"} {"}"}
              </span>

              <div className="cs-testi-authors">
                {SLA_ASSURANCES.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cs-testi-author-btn ${idx === activeSlaIdx ? "is-active" : ""}`}
                    onClick={() => setActiveSlaIdx(idx)}
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
                  key={activeSla.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  <p className="cs-testi-quote">“{activeSla.quote}”</p>
                  <div className="cs-testi-role">{activeSla.role}</div>
                  <button type="button" className="cs-testi-link" onClick={() => onNavigate?.("casestudies")}>
                    {lang === "am" ? "የተጠናቀቁ ፕሮጀክቶችን ይመልከቱ ↗" : "Read verified escrow dossiers ↗"}
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
                {"{"} {lang === "am" ? "ቀጥታ ድጋፍ" : "LIVE DESK"} {"}"}
              </span>
              <h2 className="cs-outro-title">
                {lang === "am" ? "ከቡድናችን ጋር በቀጥታ ይወያዩ።" : "Let’s structure your first ETB milestone."}
              </h2>
            </div>

            <div className="cs-outro-brace-stage">
              <span className="cs-outro-giant-brace">{"{"}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" className="cs-outro-pill-btn" onClick={() => openSupportChat()}>
                  {lang === "am" ? "የቀጥታ ድጋፍ ↗" : "Ask Support Desk ↗"}
                </button>
                <button
                  type="button"
                  className="cs-outro-pill-btn"
                  style={{ background: "transparent", color: "#f4f7f4", border: "1px solid rgba(255,255,255,0.28)" }}
                  onClick={() => onStart?.("register")}
                >
                  {lang === "am" ? "ውል ይጀምሩ" : "Start Contract"}
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
export default FAQPage;
