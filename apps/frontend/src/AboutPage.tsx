import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Language, useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import {
  AnimatedCountUpStrip,
  ScrollIlluminatedHeadline,
  ScrollParallaxDiptych,
  StickyScrollServicesStage,
  StudioBreadcrumb,
  type StickyStackItem,
} from "./components/StudioScrollMotion";

interface AboutPageProps {
  onNavigate?: (view: string) => void;
  onStart?: (mode: "login" | "register") => void;
}

type PillarId = "escrow" | "fayda" | "mediation" | "erca";

interface TrustPillarItem {
  id: PillarId;
  label: Record<Language, string>;
  topChip: Record<Language, string>;
  badge: Record<Language, string>;
  rows: { label: Record<Language, string>; badge: Record<Language, string> }[];
}

interface TeamLeader {
  id: string;
  name: string;
  role: Record<Language, string>;
  corridor: Record<Language, string>;
  credential: Record<Language, string>;
  theme: "emerald" | "gold" | "obsidian" | "cobalt";
}

interface RegionalCorridorItem {
  id: string;
  name: Record<Language, string>;
  role: Record<Language, string>;
  quote: Record<Language, string>;
  metric: Record<Language, string>;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TRUST_PILLARS: TrustPillarItem[] = [
  {
    id: "escrow",
    label: {
      en: "Escrow Vaults",
      am: "የኤስክሮ ጥበቃ",
      om: "Kuusaa Iskuuroo",
      ti: "ሓለዋ ኤስክሮ",
    },
    topChip: {
      en: "1:1 NBE CUSTODY",
      am: "1:1 የብሔራዊ ባንክ ጥበቃ",
      om: "EEGUMSA NBE 1:1",
      ti: "1:1 ሓለዋ ብሄራዊ ባንኪ",
    },
    badge: {
      en: "ZERO UNPAID WORK",
      am: "ያልተከፈለ ሥራ የለም",
      om: "HOJII KAFFALTII MALEE ZERO",
      ti: "ዘይተኸፍለ ስራሕ የለን",
    },
    rows: [
      {
        label: { en: "CAPITAL CUSTODY", am: "የገንዘብ ጥበቃ", om: "EEGUMSA MAALLAQAA", ti: "ሓለዋ ገንዘብ" },
        badge: { en: "100% ETB", am: "100% ብር", om: "100% ETB", ti: "100% ብር" },
      },
      {
        label: { en: "SILENT-CLIENT SLA", am: "የደንበኛ ምላሽ ገደብ", om: "DAANGAA DEEBII MAAMILAA", ti: "ገደብ ምላሽ ዓሚል" },
        badge: { en: "120 HOURS", am: "120 ሰዓታት", om: "SA'AATII 120", ti: "120 ሰዓታት" },
      },
      {
        label: { en: "WALLET PAYOUT", am: "የዋሌት ክፍያ", om: "KAFFALTII WALLET", ti: "ክፍሊት ዋሌት" },
        badge: { en: "< 45 SEC", am: "< 45 ሰከንድ", om: "< SEKONDII 45", ti: "< 45 ካልኢት" },
      },
    ],
  },
  {
    id: "fayda",
    label: {
      en: "Fayda KYC",
      am: "ፋይዳ መታወቂያ",
      om: "Mirkaneessa Fayda",
      ti: "መረጋገጺ ፋይዳ",
    },
    topChip: {
      en: "NATIONAL ID & TIN",
      am: "ብሔራዊ መታወቂያ እና TIN",
      om: "WARAQAA EENYUMMAA & TIN",
      ti: "ብሄራዊ መታወቂያን TINን",
    },
    badge: {
      en: "100% VETTED",
      am: "100% የተረጋገጠ",
      om: "100% MIRKANA'AA",
      ti: "100% ዝተረጋገጸ",
    },
    rows: [
      {
        label: { en: "INDIVIDUAL KYC", am: "የግል ማረጋገጫ", om: "MIRKANEESSA DHUNFAA", ti: "ውልቃዊ መረጋገጺ" },
        badge: { en: "FAYDA FAN", am: "ፋይዳ FAN", om: "FAYDA FAN", ti: "ፋይዳ FAN" },
      },
      {
        label: { en: "CORPORATE KYB", am: "የድርጅት ማረጋገጫ", om: "MIRKANEESSA DHAABBATA", ti: "መረጋገጺ ትካል" },
        badge: { en: "TIN + LICENSE", am: "TIN + ፈቃድ", om: "TIN + HAYYAMA", ti: "TIN + ፍቓድ" },
      },
      {
        label: { en: "IMPERSONATION", am: "ማጭበርበር", om: "FAKKESSUU", ti: "ምትላል መንነት" },
        badge: { en: "0.00%", am: "0.00%", om: "0.00%", ti: "0.00%" },
      },
    ],
  },
  {
    id: "mediation",
    label: {
      en: "48h Mediation",
      am: "የ48 ሰዓት ሽምግልና",
      om: "Araara Sa'aatii 48",
      ti: "ዕርቂ 48 ሰዓት",
    },
    topChip: {
      en: "BOLE ARBITRATION",
      am: "የቦሌ ሽምግልና ቢሮ",
      om: "GIDDUGALA ARAARA BOLEE",
      ti: "ቤት ጽሕፈት ዕርቂ ቦሌ",
    },
    badge: {
      en: "99.4% DISPUTE-FREE",
      am: "99.4% ያለክርክር",
      om: "99.4% FALMII MALEE",
      ti: "99.4% ብዘይ ክትዕ",
    },
    rows: [
      {
        label: { en: "ARBITRATION SLA", am: "የሽምግልና ጊዜ", om: "YEROO ARAARAA", ti: "ግዜ ዕርቂ" },
        badge: { en: "48 HOURS", am: "48 ሰዓታት", om: "SA'AATII 48", ti: "48 ሰዓታት" },
      },
      {
        label: { en: "FILE TIMESTAMP", am: "የፋይል ሰዓት ማረጋገጫ", om: "MALLATTOO YEROO FAAYILII", ti: "መረጋገጺ ግዜ ፋይል" },
        badge: { en: "SHA-256", am: "SHA-256", om: "SHA-256", ti: "SHA-256" },
      },
      {
        label: { en: "AMICABLE RATE", am: "በስምምነት የተፈታ", om: "SAFARTUU WALII GALTEE", ti: "ብስምምዕ ዝተፈትሐ" },
        badge: { en: "99.4%", am: "99.4%", om: "99.4%", ti: "99.4%" },
      },
    ],
  },
  {
    id: "erca",
    label: {
      en: "ERCA Ledgers",
      am: "የገቢዎች ታክስ",
      om: "Galmee Gibiraa ERCA",
      ti: "መዝገብ ግብሪ ERCA",
    },
    topChip: {
      en: "FISCAL ENGINE",
      am: "የታክስ ስርዓት",
      om: "SIRNA HERREGA GIBIRAA",
      ti: "ስርዓት ሕሳብ ግብሪ",
    },
    badge: {
      en: "AUDIT-READY",
      am: "ለኦዲት ዝግጁ",
      om: "OODIITIIF QOPHAA'AA",
      ti: "ንኦዲት ድሉው",
    },
    rows: [
      {
        label: { en: "VAT COMPUTATION", am: "የቫት ስሌት", om: "HERREGA VAT", ti: "ሕሳብ ቫት" },
        badge: { en: "15% AUTO", am: "15% በራስ-ሰር", om: "15% OFUMAA", ti: "15% ብቐጥታ" },
      },
      {
        label: { en: "WITHHOLDING", am: "ዊዝሆልዲንግ", om: "GIBIRA QABAMU", ti: "ዝተሓዝ ግብሪ" },
        badge: { en: "3% / 30% > 10K", am: "3% / 30% > 10ሺ", om: "3% / 30% > 10K", ti: "3% / 30% > 10ሽ" },
      },
      {
        label: { en: "FINANCE EXPORT", am: "የፋይናንስ ኤክስፖርት", om: "ERGAA FAYINAANSII", ti: "ውጽኢት ፋይናንስ" },
        badge: { en: "PDF + CSV", am: "PDF + CSV", om: "PDF + CSV", ti: "PDF + CSV" },
      },
    ],
  },
];

const LEADERSHIP_TEAM: TeamLeader[] = [
  {
    id: "dawit",
    name: "Dawit Alemu",
    role: {
      en: "Co-Founder & Chief Executive Officer",
      am: "መስራች እና ዋና ሥራ አስፈጻሚ",
      om: "Hundeessaa & Hogganaa Olaanaa (CEO)",
      ti: "መስራትን ዋና ፈጻሚ ስራሕን (CEO)",
    },
    corridor: {
      en: "ADDIS ABABA · FINTECH",
      am: "አዲስ አበባ · ፊንቴክ",
      om: "FINFINNEE · FIINTEK",
      ti: "ኣዲስ ኣበባ · ፊንቴክ",
    },
    credential: {
      en: "CORE BANKING ARCHITECT",
      am: "የባንክ ስርዓት መሃንዲስ",
      om: "QOPHEESSAA SIRNA BAANKII",
      ti: "መሃንዲስ ስርዓት ባንኪ",
    },
    theme: "emerald",
  },
  {
    id: "selamawit",
    name: "Selamawit Tadesse",
    role: {
      en: "Chief Trust & Escrow Officer",
      am: "የኤስክሮ እና የሕግ ጉዳዮች ኃላፊ",
      om: "Hogganaa Olaanaa Amanamummaa & Iskuuroo",
      ti: "ሓላፊት እምነትን ኤስክሮን",
    },
    corridor: {
      en: "ADDIS ABABA · LEGAL SLA",
      am: "አዲስ አበባ · የሕግ ማዕቀፍ",
      om: "FINFINNEE · SEERA SLA",
      ti: "ኣዲስ ኣበባ · ሕጋዊ SLA",
    },
    credential: {
      en: "COMMERCIAL COMPLIANCE",
      am: "የንግድ ሕግ ተገዢነት",
      om: "WALSIMANNAA DALDALAA",
      ti: "ምኽባር ሕጊ ንግዲ",
    },
    theme: "gold",
  },
  {
    id: "bereket",
    name: "Bereket Hailu",
    role: {
      en: "VP of Engineering & Security",
      am: "የኢንጂነሪንግ እና ደህንነት ምክትል ፕሬዝዳንት",
      om: "Itti Aanaa Pireezidaantii Injinariingii & Nageenyaa",
      ti: "ምክትል ፕረዚደንት ኢንጂነሪንግን ድሕነትን",
    },
    corridor: {
      en: "AAiT · DISTRIBUTED LEDGERS",
      am: "AAiT · የተከፋፈሉ ሌጀሮች",
      om: "AAiT · GALMEEWWAN QOODAMAN",
      ti: "AAiT · ዝተዘርግሑ መዛግብቲ",
    },
    credential: {
      en: "TELEBIRR & CBE API LEAD",
      am: "የቴሌብር እና ንግድ ባንክ API መሪ",
      om: "HOGGANAA API TELEBIRR & CBE",
      ti: "መራሒ API ቴሌብርን CBEን",
    },
    theme: "obsidian",
  },
  {
    id: "hana",
    name: "Hana Mekonnen",
    role: {
      en: "Head of Talent & Regional Corridors",
      am: "የባለሙያዎች እና የክልል ማዕከላት ኃላፊ",
      om: "Hogganaa Ogeeyyii & Naannolee",
      ti: "ሓላፊት ክኢላታትን ዞባዊ ማእከላትን",
    },
    corridor: {
      en: "ADDIS · HAWASSA · BAHIR DAR",
      am: "አዲስ · ሀዋሳ · ባህር ዳር",
      om: "FINFINNEE · HAWAASAA · BAAHIR DAAR",
      ti: "ኣዲስ · ሃዋሳ · ባህር ዳር",
    },
    credential: {
      en: "FAYDA KYC DIRECTOR",
      am: "የፋይዳ KYC ዳይሬክተር",
      om: "DAARIKTEERA FAYDA KYC",
      ti: "ዳይሬክተር ፋይዳ KYC",
    },
    theme: "cobalt",
  },
];

const REGIONAL_CORRIDORS: RegionalCorridorItem[] = [
  {
    id: "addis",
    name: {
      en: "Addis Ababa HQ (Bole Atlas)",
      am: "የአዲስ አበባ ዋና መስሪያ ቤት (ቦሌ አትላስ)",
      om: "Waajjira Muummee Finfinnee (Bolee Atlaas)",
      ti: "ዋና ቤት ጽሕፈት ኣዲስ ኣበባ (ቦሌ ኣትላስ)",
    },
    role: {
      en: "ENTERPRISE ESCROW · FINTECH · FULL-STACK ENGINEERING",
      am: "የድርጅት ኤስክሮ · ፊንቴክ · ፉል-ስታክ ኢንጂነሪንግ",
      om: "ISKUUROO DHAABBATA · FIINTEK · INJINARIINGII FULL-STACK",
      ti: "ኤስክሮ ትካላት · ፊንቴክ · ፉል-ስታክ ኢንጂነሪንግ",
    },
    quote: {
      en: "Our Bole Atlas studio coordinates enterprise software escrows, commercial bank RTGS custody, and our bilingual 48-hour mediation desk.",
      am: "የቦሌ አትላስ ማዕከላችን የድርጅት ሶፍትዌር ኤስክሮዎችን፣ የንግድ ባንክ RTGS ጥበቃን እና የ48 ሰዓት ባለብዙ ቋንቋ የሽምግልና ቢሮአችንን ያስተባብራል።",
      om: "Istudiyoon keenya Bolee Atlaas iskuuroo sooftiweerii dhaabbilee, eegumsa baankii daldalaa RTGS fi tajaajila araara sa'aatii 48 afaanoota hedduun ni qindeessa.",
      ti: "ማእከልና ቦሌ ኣትላስ ኤስክሮ ሶፍትዌር ትካላት፣ ሓለዋ RTGS ባንኪ ንግድን ብዙሕ ቋንቋ ዘለዎ ናይ 48 ሰዓት ቤት ጽሕፈት ዕርቅን የዋህድ።",
    },
    metric: {
      en: "12,400+ TALENT",
      am: "12,400+ ባለሙያዎች",
      om: "OGEEYYII 12,400+",
      ti: "12,400+ ክኢላታት",
    },
  },
  {
    id: "hawassa",
    name: {
      en: "Hawassa & Adama Corridor",
      am: "የሀዋሳ እና አዳማ ማዕከል",
      om: "Sarara Hawaasaa & Adaamaa",
      ti: "ማእከል ሃዋሳን ኣዳማን",
    },
    role: {
      en: "AGRITECH · INDUSTRIAL IOT · MOBILE COMMERCE",
      am: "አግሪቴክ · የኢንዱስትሪ IoT · የሞባይል ንግድ",
      om: "AGRITEK · IOT INDUSTIRII · DALDALA MOOBAAYILAA",
      ti: "ኣግሪቴክ · ኢንዱስትርያዊ IoT · ንግዲ ሞባይል",
    },
    quote: {
      en: "Connecting Rift Valley agro-processors and industrial parks with vetted mobile engineers, UI/UX specialists, and data analysts.",
      am: "በስምጥ ሸለቆ የሚገኙ የግብርና ማቀነባበሪያዎችን እና የኢንዱስትሪ ፓርኮችን ከተረጋገጡ የሞባይል ኢንጂነሮች፣ UI/UX ባለሙያዎች እና የውሂብ ተንታኞች ጋር እናገናኛለን።",
      om: "Warshaalee qonnaa Sulula Qiinxamaa fi paarkiiwwan industirii injinaroota moobaayilaa mirkanaa'an, ogeeyyii UI/UX fi xiinxaltoota daataa waliin walqunnamsiisa.",
      ti: "ኣብ ስንጭሮ ስምጥ ዝርከቡ ኣፍረይቲ ሕርሻን ኢንዱስትሪ ፓርክታትን ምስ ዝተረጋገጹ ኢንጂነራት ሞባይል፣ ክኢላታት UI/UXን ተንተንቲ ዳታን ነራኽብ።",
    },
    metric: {
      en: "3,100+ TALENT",
      am: "3,100+ ባለሙያዎች",
      om: "OGEEYYII 3,100+",
      ti: "3,100+ ክኢላታት",
    },
  },
  {
    id: "bahirdar",
    name: {
      en: "Bahir Dar, Mekelle & Dire Dawa",
      am: "ባህር ዳር፣ መቀሌ እና ድሬዳዋ",
      om: "Baahir Daar, Maqalee & Dirree Dhawaa",
      ti: "ባህር ዳር፣ መቐለን ድሬዳዋን",
    },
    role: {
      en: "MULTILINGUAL LOCALIZATION · AI DATA · DESIGN",
      am: "ባለብዙ ቋንቋ ትርጉም · AI ውሂብ · ዲዛይን",
      om: "HIWIKA AFAANOOTAA · DAATAA AI · DIZAAYINII",
      ti: "ትርጉም ብዙሕ ቋንቋታት · ዳታ AI · ዲዛይን",
    },
    quote: {
      en: "Instant Telebirr and CBE Birr milestone releases empower university graduates across regional capitals to execute national contracts.",
      am: "ፈጣን የቴሌብር እና የንግድ ባንክ ብር ክፍያዎች በክልል ዋና ከተሞች የሚገኙ የዩኒቨርሲቲ ምሩቃን ሀገር አቀፍ ውሎችን በብቃት እንዲያከናውኑ ያስችላቸዋል።",
      om: "Kaffaltiin saffisaan Telebirr fi CBE Birr eebbifamtoota yuunivarsiitii magaalaalee naannoo hunda keessa jiran waliigaltee biyyaalessaa akka raawwatan gargaara.",
      ti: "ቅልጡፍ ክፍሊት ቴሌብርን CBE ብርን ተመረቕቲ ዩኒቨርሲቲታት ኣብ ርእሰ ከተማታት ክልላት ሃገራዊ ውዕላት ብብቕዓት ክፍጽሙ የኽእሎም።",
    },
    metric: {
      en: "2,900+ TALENT",
      am: "2,900+ ባለሙያዎች",
      om: "OGEEYYII 2,900+",
      ti: "2,900+ ክኢላታት",
    },
  },
];

const ABOUT_COPY: Record<
  Language,
  {
    home: string;
    studioCode: string;
    aboutBreadcrumb: string;
    fees: string;
    cases: string;
    faq: string;
    heroLine1: string;
    heroBrace: string;
    heroLine2: string;
    heroLeftPill: string;
    heroRightPill: string;
    exploreStudio: string;
    trustBraceWord: string;
    manifestoSegments: { text: string; highlight?: boolean }[];
    kpiEscrowSuffix: string;
    kpiEscrowLabel: string;
    kpiTalentLabel: string;
    kpiDisputeLabel: string;
    leadershipKicker: string;
    pillarsKicker: string;
    corridorsKicker: string;
    hireTalent: string;
    boleKicker: string;
    dispatchTitle: string;
    dispatchHeader: string;
    dispatchSla: string;
    dispatchSentTitle: string;
    dispatchAnother: string;
    namePlaceholder: string;
    orgPlaceholder: string;
    messagePlaceholder: string;
    topics: { value: string; label: string }[];
    sendDispatch: string;
    startContract: string;
  }
> = {
  en: {
    home: "Home",
    studioCode: "STUDIO",
    aboutBreadcrumb: "About & Architecture",
    fees: "Fees",
    cases: "Cases",
    faq: "FAQ",
    heroLine1: "we build",
    heroBrace: "{trust}",
    heroLine2: "for Ethiopian work",
    heroLeftPill: "{ Addis Ababa Studio } ↗",
    heroRightPill: "{ Bole Atlas HQ } ↗",
    exploreStudio: "Explore studio ↓",
    trustBraceWord: "TRUST",
    manifestoSegments: [
      { text: "Ethiopia never lacked world-class talent—it needed" },
      { text: "institutional escrow infrastructure", highlight: true },
      { text: "so teams can build together with zero fear." },
    ],
    kpiEscrowSuffix: "M+ ETB",
    kpiEscrowLabel: "RINGFENCED ESCROW",
    kpiTalentLabel: "FAYDA-VETTED TALENT",
    kpiDisputeLabel: "DISPUTE-FREE RATE",
    leadershipKicker: "STUDIO LEADERSHIP",
    pillarsKicker: "{ PILLARS }",
    corridorsKicker: "CORRIDORS",
    hireTalent: "Hire verified talent ↗",
    boleKicker: "BOLE ATLAS HQ",
    dispatchTitle: "Dispatch our Addis Ababa studio.",
    dispatchHeader: "STUDIO DISPATCH",
    dispatchSla: "SLA: < 2 HOURS",
    dispatchSentTitle: "Dispatch received by Bole Atlas HQ.",
    dispatchAnother: "Send another dispatch",
    namePlaceholder: "Your full name *",
    orgPlaceholder: "Company or Telebirr phone",
    messagePlaceholder: "Brief inquiry...",
    topics: [
      { value: "Enterprise Escrow Onboarding", label: "Enterprise Escrow Onboarding" },
      { value: "ERCA VAT & Withholding Integration", label: "ERCA VAT & Withholding Integration" },
      { value: "Fayda KYC & Agency Verification", label: "Fayda KYC & Agency Verification" },
    ],
    sendDispatch: "Send Dispatch ↗",
    startContract: "Start Contract",
  },
  am: {
    home: "መነሻ",
    studioCode: "ስቱዲዮ",
    aboutBreadcrumb: "ስለ እኛ እና መዋቅር",
    fees: "ክፍያዎች",
    cases: "ፕሮጀክቶች",
    faq: "ጥያቄዎች",
    heroLine1: "ለኢትዮጵያ",
    heroBrace: "{እምነት}",
    heroLine2: "የዲጂታል ሥራ መሠረት",
    heroLeftPill: "{ የአመራር ቡድን } ↗",
    heroRightPill: "{ ቦሌ አትላስ ቢሮ } ↗",
    exploreStudio: "አመራሩን ይመልከቱ ↓",
    trustBraceWord: "እምነት",
    manifestoSegments: [
      { text: "ኢትዮጵያ ድንቅ ባለሙያዎች አሏት፤ YeKis ደግሞ" },
      { text: "ሁለቱንም ወገን የሚጠብቅ የኤስክሮ ድልድይ", highlight: true },
      { text: "በአዲስ አበባ ገንብቷል።" },
    ],
    kpiEscrowSuffix: "ሚ+ ብር",
    kpiEscrowLabel: "የኤስክሮ ጥበቃ መጠን",
    kpiTalentLabel: "በፋይዳ የተረጋገጡ ባለሙያዎች",
    kpiDisputeLabel: "ያለክርክር የተጠናቀቁ",
    leadershipKicker: "መስራቾች እና አመራሮች",
    pillarsKicker: "{ ምሰሶዎች }",
    corridorsKicker: "የሥራ ማዕከላት",
    hireTalent: "ባለሙያ ይቅጠሩ ↗",
    boleKicker: "ቦሌ አትላስ · አዲስ አበባ",
    dispatchTitle: "ከYeKis ቡድን ጋር ይገናኙ።",
    dispatchHeader: "የቢሮ መልዕክት",
    dispatchSla: "ምላሽ: < 2 ሰዓት",
    dispatchSentTitle: "መልዕክትዎ ለቦሌ አትላስ ቢሮ ደርሷል!",
    dispatchAnother: "ሌላ መልዕክት ይላኩ",
    namePlaceholder: "ሙሉ ስም *",
    orgPlaceholder: "ድርጅት / የቴሌብር ስልክ",
    messagePlaceholder: "መልዕክትዎን ይጻፉ...",
    topics: [
      { value: "Enterprise Escrow Onboarding", label: "የድርጅት ኤስክሮ ምዝገባ" },
      { value: "ERCA VAT & Withholding Integration", label: "የERCA ቫት እና ዊዝሆልዲንግ ውህደት" },
      { value: "Fayda KYC & Agency Verification", label: "የፋይዳ KYC እና የኤጀንሲ ማረጋገጫ" },
    ],
    sendDispatch: "መልዕክት ይላኩ ↗",
    startContract: "ውል ይጀምሩ",
  },
  om: {
    home: "Mana",
    studioCode: "ISTUDIYOO",
    aboutBreadcrumb: "Waa'ee Keenyaa & Caasaa",
    fees: "Kaffaltii",
    cases: "Piroojektoota",
    faq: "Gaaffilee",
    heroLine1: "hojiif",
    heroBrace: "{amanamummaa}",
    heroLine2: "Itoophiyaa keessatti ijaarra",
    heroLeftPill: "{ Istudiyoo Finfinnee } ↗",
    heroRightPill: "{ Waajjira Bolee Atlaas } ↗",
    exploreStudio: "Istudiyoo ilaali ↓",
    trustBraceWord: "AMANA",
    manifestoSegments: [
      { text: "Itoophiyaan ogeeyyii addunyaa qabdi—wanti barbaachisu garuu" },
      { text: "caasaa iskuuroo dhaabbataa", highlight: true },
      { text: "kan gareen lamaanuu sodaa malee ittiin hojjetaniidha." },
    ],
    kpiEscrowSuffix: "M+ ETB",
    kpiEscrowLabel: "ISKUUROO EEGAME",
    kpiTalentLabel: "OGEEYYII FAYDA MIRKANA'AN",
    kpiDisputeLabel: "FALMII MALEE XUMURAME",
    leadershipKicker: "HOGGANSA ISTUDIYOO",
    pillarsKicker: "{ UTUBAAWWAN }",
    corridorsKicker: "SARARA HOJII",
    hireTalent: "Ogeessa mirkanaa'e qacari ↗",
    boleKicker: "WAAJJIRA BOLEE ATLAAS",
    dispatchTitle: "Istudiyoo Finfinnee keenya quunnamaa.",
    dispatchHeader: "ERGAA ISTUDIYOO",
    dispatchSla: "DEEBII: < SA'AATII 2",
    dispatchSentTitle: "Ergaan keessan Waajjira Bolee Atlaas ga'eera!",
    dispatchAnother: "Ergaa biraa ergi",
    namePlaceholder: "Maqaa guutuu *",
    orgPlaceholder: "Dhaabbata ykn lakk. Telebirr",
    messagePlaceholder: "Gaaffii gabaabaa...",
    topics: [
      { value: "Enterprise Escrow Onboarding", label: "Galmee Iskuuroo Dhaabbilee" },
      { value: "ERCA VAT & Withholding Integration", label: "Walitti Hidhamiinsa ERCA VAT & Gibiraa" },
      { value: "Fayda KYC & Agency Verification", label: "Mirkaneessa Fayda KYC & Ejensii" },
    ],
    sendDispatch: "Ergaa Ergi ↗",
    startContract: "Waliigaltee Jalqabi",
  },
  ti: {
    home: "መበገሲ",
    studioCode: "ስቱድዮ",
    aboutBreadcrumb: "ብዛዕባናን መዋቕርን",
    fees: "ክፍሊታት",
    cases: "ፕሮጀክታት",
    faq: "ሕቶታት",
    heroLine1: "ንኢትዮጵያ",
    heroBrace: "{እምነት}",
    heroLine2: "መሰረት ዲጂታል ስራሕ",
    heroLeftPill: "{ ጉጅለ ኣመራርሓ } ↗",
    heroRightPill: "{ ቤት ጽሕፈት ቦሌ ኣትላስ } ↗",
    exploreStudio: "ኣመራርሓ ርአ ↓",
    trustBraceWord: "እምነት",
    manifestoSegments: [
      { text: "ኢትዮጵያ ድንቂ ክኢላታት ኣለውዋ—ዘድልያ ግን" },
      { text: "ትካላዊ መሰረተ-ልምዓት ኤስክሮ", highlight: true },
      { text: "ክልቲኦም ወገናት ብዘይ ስግኣት ክሰርሑ ዘኽእል እዩ።" },
    ],
    kpiEscrowSuffix: "ሚ+ ብር",
    kpiEscrowLabel: "ዝተሓለወ ኤስክሮ",
    kpiTalentLabel: "ብፋይዳ ዝተረጋገጹ ክኢላታት",
    kpiDisputeLabel: "ብዘይ ክትዕ ዝተዛዘመ",
    leadershipKicker: "መስረትትን ኣመራርሓን",
    pillarsKicker: "{ ዓንድታት }",
    corridorsKicker: "ዞባዊ ማእከላት",
    hireTalent: "ዝተረጋገጸ ክኢላ ቅጸር ↗",
    boleKicker: "ቦሌ ኣትላስ · ኣዲስ ኣበባ",
    dispatchTitle: "ምስ ጉጅለ YeKis ተራኸቡ።",
    dispatchHeader: "መልእኽቲ ቤት ጽሕፈት",
    dispatchSla: "ምላሽ: < 2 ሰዓት",
    dispatchSentTitle: "መልእኽትኹም ናብ ቤት ጽሕፈት ቦሌ ኣትላስ በጺሑ ኣሎ!",
    dispatchAnother: "ካልእ መልእኽቲ ስደድ",
    namePlaceholder: "ምሉእ ስም *",
    orgPlaceholder: "ትካል / ስልኪ ቴሌብር",
    messagePlaceholder: "መልእኽትኹም ጸሓፉ...",
    topics: [
      { value: "Enterprise Escrow Onboarding", label: "ምዝገባ ኤስክሮ ትካላት" },
      { value: "ERCA VAT & Withholding Integration", label: "ውህደት ቫትን ዝተሓዝ ግብርን ERCA" },
      { value: "Fayda KYC & Agency Verification", label: "መረጋገጺ ፋይዳ KYCን ኤጀንሲን" },
    ],
    sendDispatch: "መልእኽቲ ስደድ ↗",
    startContract: "ውዕል ጀምር",
  },
};

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
  const lang: Language = language;
  const copy = ABOUT_COPY[lang] ?? ABOUT_COPY.en;
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
        topChip: pillar.topChip[lang],
        kickerBadge: pillar.badge[lang],
        artNode: renderAboutArtwork(pillar.id),
        rows: pillar.rows.map((row) => ({
          label: row.label[lang],
          badge: row.badge[lang],
        })),
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
          <StudioBreadcrumb
            items={[
              {
                label: copy.home,
                onClick: () => onNavigate?.("home"),
              },
              {
                code: copy.studioCode,
                label: copy.aboutBreadcrumb,
                active: true,
              },
            ]}
            rightMeta={
              <div className="cs-studio-band-pills">
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate?.("fees")}
                >
                  <span>01</span>
                  <span>{copy.fees}</span>
                </button>
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate?.("case-studies")}
                >
                  <span>02</span>
                  <span>{copy.cases}</span>
                </button>
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate?.("faq")}
                >
                  <span>03</span>
                  <span>{copy.faq}</span>
                </button>
              </div>
            }
          />
          <motion.div
            className="cs-hero-top"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
          >
            <h1 className="cs-hero-display">
              <span className="cs-hero-line">
                {copy.heroLine1}{" "}
                <span className="cs-hero-brace">{copy.heroBrace}</span>
              </span>
              <span className="cs-hero-line">
                <span className="cs-hero-arrow" aria-hidden="true">
                  →
                </span>
                {copy.heroLine2}
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
                  {copy.heroLeftPill}
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
                  {copy.heroRightPill}
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
              {copy.exploreStudio}
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
              <span className="cs-brace-emblem-word">{copy.trustBraceWord}</span>
              <span className="cs-brace-emblem-char">{"}"}</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline segments={copy.manifestoSegments} />

              <AnimatedCountUpStrip
                metrics={[
                  { value: 142, suffix: copy.kpiEscrowSuffix, label: copy.kpiEscrowLabel },
                  { value: 18400, suffix: "+", label: copy.kpiTalentLabel },
                  { value: 99.4, decimals: 1, suffix: "%", label: copy.kpiDisputeLabel },
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
              {"{"} {copy.leadershipKicker} {"}"}
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
                      <span className="cs-work-client-chip">{member.corridor[lang]}</span>
                      <span className="cs-work-year-chip">{member.credential[lang]}</span>
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
          kicker={copy.pillarsKicker}
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
                {"{"} {copy.corridorsKicker} {"}"}
              </span>

              <div className="cs-testi-authors">
                {REGIONAL_CORRIDORS.map((corridor, idx) => (
                  <button
                    key={corridor.id}
                    type="button"
                    className={`cs-testi-author-btn ${idx === activeCorridorIdx ? "is-active" : ""}`}
                    onClick={() => setActiveCorridorIdx(idx)}
                  >
                    <span>{corridor.name[lang]}</span>
                    <span className="cs-testi-metric-pill">{corridor.metric[lang]}</span>
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
                  <p className="cs-testi-quote">“{activeCorridor.quote[lang]}”</p>
                  <div className="cs-testi-role">{activeCorridor.role[lang]}</div>
                  <button type="button" className="cs-testi-link" onClick={() => onStart?.("register")}>
                    {copy.hireTalent}
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
                {"{"} {copy.boleKicker} {"}"}
              </span>
              <h2 className="cs-outro-title" style={{ marginBottom: 18 }}>
                {copy.dispatchTitle}
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
                <span>{copy.dispatchHeader}</span>
                <span>{copy.dispatchSla}</span>
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
                    {copy.dispatchSentTitle}
                  </h3>
                  <button
                    type="button"
                    className="cs-outro-pill-btn"
                    onClick={() => {
                      setContactSent(false);
                      setContactMessage("");
                    }}
                  >
                    {copy.dispatchAnother}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <input
                      type="text"
                      required
                      className="cs-contact-input"
                      placeholder={copy.namePlaceholder}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="cs-contact-input"
                      placeholder={copy.orgPlaceholder}
                      value={contactOrg}
                      onChange={(e) => setContactOrg(e.target.value)}
                    />
                  </div>

                  <select
                    className="cs-contact-select"
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                  >
                    {copy.topics.map((topic) => (
                      <option key={topic.value} value={topic.value}>
                        {topic.label}
                      </option>
                    ))}
                  </select>

                  <textarea
                    required
                    rows={3}
                    className="cs-contact-textarea"
                    placeholder={copy.messagePlaceholder}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                  />

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="submit" className="cs-outro-pill-btn">
                      {copy.sendDispatch}
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
                      {copy.startContract}
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
