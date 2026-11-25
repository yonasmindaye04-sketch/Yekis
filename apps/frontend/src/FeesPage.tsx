import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Language, useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import { FiscalDocumentSheet, type FiscalDocType } from "./components/FiscalDocumentModal";
import {
  AnimatedCountUpStrip,
  ScrollIlluminatedHeadline,
  ScrollParallaxDiptych,
  StickyScrollServicesStage,
  StudioBreadcrumb,
  type StickyStackItem,
} from "./components/StudioScrollMotion";

interface FeesPageProps {
  onNavigate?: (view: string) => void;
  onStart?: (mode: "login" | "register") => void;
}

type PaymentRailId = "telebirr" | "cbebirr" | "mpesa" | "erca";

interface RailServiceItem {
  id: PaymentRailId;
  label: Record<Language, string>;
  topChip: Record<Language, string>;
  badge: Record<Language, string>;
  rows: { label: Record<Language, string>; badge: Record<Language, string> }[];
}

interface PlatformComparisonItem {
  id: string;
  name: Record<Language, string>;
  role: Record<Language, string>;
  quote: Record<Language, string>;
  metric: Record<Language, string>;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PRESET_AMOUNTS = [15000, 50000, 120000, 350000];

const RAIL_SERVICES: RailServiceItem[] = [
  {
    id: "telebirr",
    label: {
      en: "Telebirr",
      am: "ቴሌብር",
      om: "Telebirr",
      ti: "ቴሌብር",
    },
    topChip: {
      en: "ETHIO TELECOM RAIL",
      am: "የኢትዮ ቴሌኮም መስመር",
      om: "SARARA ETHIO TELECOM",
      ti: "መስመር ኢትዮ ቴሌኮም",
    },
    badge: {
      en: "0 ETB PAYOUT FEE",
      am: "0 ብር የማውጫ ክፍያ",
      om: "BAASII ETB 0",
      ti: "0 ብር ክፍሊት ምውጻእ",
    },
    rows: [
      {
        label: { en: "ESCROW DEPOSIT", am: "የኤስክሮ ተቀማጭ", om: "KUUSAA ISKUUROO", ti: "ተቐማጢ ኤስክሮ" },
        badge: { en: "INSTANT", am: "ወዲያውኑ", om: "BATTALAA", ti: "ብኡንብኡ" },
      },
      {
        label: { en: "WALLET PAYOUT", am: "የዋሌት ክፍያ", om: "KAFFALTII WALLET", ti: "ክፍሊት ዋሌት" },
        badge: { en: "< 45 SEC", am: "< 45 ሰከንድ", om: "< SEKONDII 45", ti: "< 45 ካልኢት" },
      },
      {
        label: { en: "RAIL SURCHARGE", am: "ተጨማሪ ክፍያ", om: "DABALATA SARARAA", ti: "ተወሳኺ ክፍሊት" },
        badge: { en: "0.0% ETB", am: "0.0% ብር", om: "0.0% ETB", ti: "0.0% ብር" },
      },
    ],
  },
  {
    id: "cbebirr",
    label: {
      en: "CBE Birr",
      am: "ሲቢኢ ብር",
      om: "CBE Birr",
      ti: "CBE ብር",
    },
    topChip: {
      en: "COMMERCIAL BANK ET",
      am: "የኢትዮጵያ ንግድ ባንክ",
      om: "BAANKII DALDALA ITOOPHIYAA",
      ti: "ባንኪ ንግዲ ኢትዮጵያ",
    },
    badge: {
      en: "UP TO 5M ETB",
      am: "እስከ 5 ሚሊዮን ብር",
      om: "HANGA ETB 5M",
      ti: "ክሳብ 5 ሚልዮን ብር",
    },
    rows: [
      {
        label: { en: "CBE BIRR WALLET", am: "የCBE ብር ዋሌት", om: "WALLET CBE BIRR", ti: "ዋሌት CBE ብር" },
        badge: { en: "< 90 SEC", am: "< 90 ሰከንድ", om: "< SEKONDII 90", ti: "< 90 ካልኢት" },
      },
      {
        label: { en: "BANK RTGS LIMIT", am: "የባንክ RTGS ገደብ", om: "DAANGAA RTGS BAANKII", ti: "ገደብ RTGS ባንኪ" },
        badge: { en: "5,000,000 ETB", am: "5,000,000 ብር", om: "ETB 5,000,000", ti: "5,000,000 ብር" },
      },
      {
        label: { en: "ESCROW FEE", am: "የኤስክሮ ክፍያ", om: "KAFFALTII ISKUUROO", ti: "ክፍሊት ኤስክሮ" },
        badge: { en: "7.5% FLAT", am: "7.5% ቋሚ", om: "7.5% DHAABBATA", ti: "7.5% ቀዋሚ" },
      },
    ],
  },
  {
    id: "mpesa",
    label: {
      en: "M-Pesa ET",
      am: "ኤም-ፔሳ ኢትዮጵያ",
      om: "M-Pesa ET",
      ti: "M-Pesa ኢትዮጵያ",
    },
    topChip: {
      en: "SAFARICOM · AWASH",
      am: "ሳፋሪኮም · አዋሽ",
      om: "SAFARICOM · AWASH",
      ti: "ሳፋሪኮም · ኣዋሽ",
    },
    badge: {
      en: "MULTI-RAIL",
      am: "ብዙ መስመሮች",
      om: "SARARA HEDDUU",
      ti: "ብዙሕ መስመራት",
    },
    rows: [
      {
        label: { en: "M-PESA (07)", am: "ኤም-ፔሳ (07)", om: "M-PESA (07)", ti: "M-PESA (07)" },
        badge: { en: "< 60 SEC", am: "< 60 ሰከንድ", om: "< SEKONDII 60", ti: "< 60 ካልኢት" },
      },
      {
        label: { en: "AWASH / ABYSSINIA", am: "አዋሽ / አቢሲኒያ", om: "AWASH / ABYSSINIA", ti: "ኣዋሽ / ኣቢሲንያ" },
        badge: { en: "< 3 MIN", am: "< 3 ደቂቃ", om: "< DAQIIQAA 3", ti: "< 3 ደቒቕ" },
      },
      {
        label: { en: "FX CONVERSION LOSS", am: "የምንዛሪ ኪሳራ", om: "KASAARA JIJJIIRRAA", ti: "ክሳራ ሸርፊ" },
        badge: { en: "0.00 ETB", am: "0.00 ብር", om: "0.00 ETB", ti: "0.00 ብር" },
      },
    ],
  },
  {
    id: "erca",
    label: {
      en: "ERCA Tax",
      am: "የገቢዎች ታክስ",
      om: "Gibira ERCA",
      ti: "ግብሪ ERCA",
    },
    topChip: {
      en: "FISCAL LEDGER",
      am: "የታክስ መዝገብ",
      om: "GALMEE GIBIRAA",
      ti: "መዝገብ ግብሪ",
    },
    badge: {
      en: "FREE PDF & CSV",
      am: "ነጻ PDF እና CSV",
      om: "PDF & CSV BILISAA",
      ti: "ነጻ PDFን CSVን",
    },
    rows: [
      {
        label: { en: "15% VAT SCHEDULE", am: "የ15% ቫት ሰንጠረዥ", om: "TARREE VAT 15%", ti: "ሰንጠረዥ 15% ቫት" },
        badge: { en: "AUTO", am: "በራስ-ሰር", om: "OFUMAA", ti: "ብቐጥታ" },
      },
      {
        label: { en: "WITHHOLDING TAX", am: "ዊዝሆልዲንግ ታክስ", om: "GIBIRA QABAMU", ti: "ዝተሓዝ ግብሪ" },
        badge: { en: "DEFERRED", am: "በክፍያ ጊዜ", om: "YEROO KAFFALTII", ti: "ኣብ ግዜ ክፍሊት" },
      },
      {
        label: { en: "AUDIT EXPORT", am: "የኦዲት ሰነድ", om: "ERGAA OODIITII", ti: "ውጽኢት ኦዲት" },
        badge: { en: "0 ETB", am: "0 ብር", om: "0 ETB", ti: "0 ብር" },
      },
    ],
  },
];

const PLATFORM_COMPARISONS: PlatformComparisonItem[] = [
  {
    id: "comp-yekis",
    name: {
      en: "YeKis General Escrow (7.5%)",
      am: "YeKis መደበኛ ኤስክሮ (7.5%)",
      om: "Iskuuroo Idilee YeKis (7.5%)",
      ti: "ስሩዕ ኤስክሮ YeKis (7.5%)",
    },
    role: {
      en: "92.5% FREELANCER TAKE-HOME · NATIVE ETB",
      am: "92.5% የባለሙያ የተጣራ ገቢ · በቀጥታ በብር",
      om: "GALII OGEEYYII 92.5% · ETB KALLATTII",
      ti: "92.5% ጽሩይ እቶት ክኢላ · ብቐጥታ ብብር",
    },
    quote: {
      en: "On a 100,000 ETB software contract, the freelancer receives 92,500 ETB directly into Telebirr or CBE Birr in under two minutes.",
      am: "በ100,000 ብር የሶፍትዌር ውል ባለሙያው 92,500 ብር ከሁለት ደቂቃ ባነሰ ጊዜ ውስጥ በቀጥታ ወደ ቴሌብር ወይም CBE ብር ይቀበላል።",
      om: "Waliigaltee sooftiweerii ETB 100,000 irratti, ogeessi daqiiqaa lama hin guunne keessatti Telebirr ykn CBE Birr isaanii keessatti ETB 92,500 kallattiin argata.",
      ti: "ኣብ 100,000 ብር ውዕል ሶፍትዌር፣ ክኢላ ኣብ ትሕቲ ክልተ ደቒቕ 92,500 ብር ብቐጥታ ናብ ቴሌብር ወይ CBE ብር ይቕበል።",
    },
    metric: {
      en: "92.5% KEPT",
      am: "92.5% ይቀርለታል",
      om: "92.5% HAFA",
      ti: "92.5% ይተርፈሉ",
    },
  },
  {
    id: "comp-global",
    name: {
      en: "Overseas Portals (15%–20%)",
      am: "የውጭ ፕላትፎርሞች (15%–20%)",
      om: "Waltajjiiwwan Alaa (15%–20%)",
      ti: "ወጻኢ መድረኻት (15%–20%)",
    },
    role: {
      en: "UPWORK / FIVERR + WIRE & FX SPREAD",
      am: "UPWORK / FIVERR + የባንክ ማስተላለፊያ እና የምንዛሪ ልዩነት",
      om: "UPWORK / FIVERR + BAASII BAANKII & JIJJIIRRAA",
      ti: "UPWORK / FIVERR + ክፍሊት ባንክን ፍልልይ ሸርፍን",
    },
    quote: {
      en: "Global platforms deduct 10% to 20% in marketplace commissions plus $30–$50 USD wire fees before a single Birr reaches Addis Ababa.",
      am: "ዓለም አቀፍ ፕላትፎርሞች ገንዘቡ አዲስ አበባ ከመድረሱ በፊት ከ10% እስከ 20% ኮሚሽን እና ከ30–50 ዶላር የባንክ ክፍያ ይቆርጣሉ።",
      om: "Waltajjiiwwan addunyaa Birriin tokko Finfinnee osoo hin ga'in dura komishinii %10–20 fi kaffaltii baankii USD $30–$50 hir'isu.",
      ti: "ዓለምለኸ መድረኻት ገንዘብ ኣዲስ ኣበባ ከይበጽሐ ካብ 10% ክሳብ 20% ኮሚሽንን $30–$50 USD ክፍሊት ባንክን ይቆርጹ።",
    },
    metric: {
      en: "~78% KEPT",
      am: "~78% ይቀርለታል",
      om: "~78% HAFA",
      ti: "~78% ይተርፈሉ",
    },
  },
  {
    id: "comp-informal",
    name: {
      en: "Informal Transfers (0% Protection)",
      am: "መደበኛ ያልሆነ ክፍያ (0% ጥበቃ)",
      om: "Dabarsa Seera-alaa (Eegumsa 0%)",
      ti: "ዘይስሩዕ ክፍሊት (0% ሓለዋ)",
    },
    role: {
      en: "UNPROTECTED BANK TRANSFERS · HIGH RISK",
      am: "ጥበቃ የሌለው የባንክ ዝውውር · ከፍተኛ ስጋት",
      om: "DABARSA BAANKII EEGUMSA MALEE · BALAA OLAANAA",
      ti: "ዘይተሓለወ ዝውውር ባንኪ · ልዑል ስግኣት",
    },
    quote: {
      en: "Unsecured 50% upfront transfers leave clients exposed to vanished deliverables and leave freelancers chasing final invoices without mediation.",
      am: "ያለ ዋስትና የሚፈጸም 50% ቅድመ ክፍያ ደንበኞችን ለኪሳራ፣ ባለሙያዎችንም ያለ ሽምግልና ቀሪ ክፍያ ለመጠበቅ ይዳርጋል።",
      om: "Kaffaltiin dursaa %50 wabii malee kaffalamu maamiltoota hojii dhabuuf, ogeeyyii ammoo kaffaltii dhumaa araara malee ari'uuf saaxila.",
      ti: "ብዘይ ውሕስነት ዝግበር 50% ቅድመ ክፍሊት ንዓማዊል ንኽሳራ፣ ንኽኢላታት ድማ ብዘይ ዕርቂ ክፍሊት ንምጽባይ የቃልዕ።",
    },
    metric: {
      en: "HIGH RISK",
      am: "ከፍተኛ ስጋት",
      om: "BALAA OLAANAA",
      ti: "ልዑል ስግኣት",
    },
  },
];

const FEES_COPY: Record<
  Language,
  {
    home: string;
    zeroClientFeeCode: string;
    pricingBreadcrumb: string;
    etbTag: string;
    feeCalculatorPill: string;
    slaTag: string;
    escrowFaqPill: string;
    heroLine1: string;
    heroLine2: string;
    heroLeftPill: string;
    heroRightPill: string;
    openCalculator: string;
    manifestoSegments: { text: string; highlight?: boolean }[];
    kpiTakeHome: string;
    kpiPlatformFee: string;
    kpiSubscription: string;
    currencyCode: string;
    simulatorKicker: string;
    milestoneValueLabel: string;
    milestoneSliderAria: string;
    settlementRailLabel: string;
    rails: { id: "telebirr" | "cbebirr" | "mpesa"; name: string; speed: string }[];
    vatToggle: string;
    whtToggle: string;
    railPrefix: string;
    dossierTitle: string;
    netBadge: string;
    tableLineCol: string;
    tableRateCol: string;
    rowGross: string;
    rowGrossRate: string;
    rowClientFee: string;
    rowPlatformFee: string;
    rowVat: string;
    rowWithholding: string;
    clientDepositLabel: string;
    freelancerPayoutLabel: string;
    clientTaxInvoiceBtn: string;
    payoutVoucherBtn: string;
    railsKicker: string;
    comparisonKicker: string;
    readFaqLink: string;
    zeroSubKicker: string;
    outroTitle: string;
    hireEscrowBtn: string;
    keepTalentBtn: string;
    taxDeskBtn: string;
  }
> = {
  en: {
    home: "Home",
    zeroClientFeeCode: "0% CLIENT FEE",
    pricingBreadcrumb: "Pricing & Fee Schedule",
    etbTag: "ETB",
    feeCalculatorPill: "Fee Calculator ↓",
    slaTag: "SLA",
    escrowFaqPill: "Escrow FAQ",
    heroLine1: "we keep",
    heroLine2: "in your pocket",
    heroLeftPill: "{ ETB Calculator } ↗",
    heroRightPill: "{ ERCA Tax Dossier } ↗",
    openCalculator: "Open calculator ↓",
    manifestoSegments: [
      { text: "While global portals take up to 20%, YeKis charges a flat" },
      { text: "7.5% total fee (7% platform + 0.5% payment)", highlight: true },
      { text: "—with native ETB payouts and zero hidden charges." },
    ],
    kpiTakeHome: "FREELANCER TAKE-HOME",
    kpiPlatformFee: "GENERAL PLATFORM FEE",
    kpiSubscription: "SUBSCRIPTION COST",
    currencyCode: "ETB",
    simulatorKicker: "ETB ESCROW SIMULATOR",
    milestoneValueLabel: "MILESTONE VALUE",
    milestoneSliderAria: "Milestone contract amount in ETB",
    settlementRailLabel: "SETTLEMENT RAIL",
    rails: [
      { id: "telebirr", name: "Telebirr", speed: "< 45 sec" },
      { id: "cbebirr", name: "CBE Birr", speed: "< 90 sec" },
      { id: "mpesa", name: "M-Pesa ET", speed: "< 60 sec" },
    ],
    vatToggle: "15% Ethiopian VAT",
    whtToggle: "Statutory withholding tax (deferred)",
    railPrefix: "RAIL:",
    dossierTitle: "Settlement Dossier",
    netBadge: "92.5% NET",
    tableLineCol: "LINE",
    tableRateCol: "RATE",
    rowGross: "Gross Milestone",
    rowGrossRate: "Base",
    rowClientFee: "Client Escrow Fee",
    rowPlatformFee: "Freelancer Platform Fee",
    rowVat: "ERCA VAT",
    rowWithholding: "ERCA Withholding",
    clientDepositLabel: "CLIENT DEPOSIT",
    freelancerPayoutLabel: "FREELANCER PAYOUT",
    clientTaxInvoiceBtn: "Client Tax Invoice ↗",
    payoutVoucherBtn: "Payout Voucher ↗",
    railsKicker: "{ RAILS }",
    comparisonKicker: "COMPARISON",
    readFaqLink: "Read escrow & tax FAQ ↗",
    zeroSubKicker: "0 ETB SUBSCRIPTION",
    outroTitle: "Open your workspace for 0 ETB today.",
    hireEscrowBtn: "Hire with Escrow ↗",
    keepTalentBtn: "Keep 92.5% as Talent",
    taxDeskBtn: "Tax Desk",
  },
  am: {
    home: "መነሻ",
    zeroClientFeeCode: "0% የደንበኛ ክፍያ",
    pricingBreadcrumb: "ክፍያዎች እና ኢስክሮ",
    etbTag: "ETB",
    feeCalculatorPill: "የክፍያ ማስያ ↓",
    slaTag: "SLA",
    escrowFaqPill: "ደንቦች",
    heroLine1: "የድካምዎን",
    heroLine2: "በኪስዎ እናስቀራለን",
    heroLeftPill: "{ የክፍያ ማስያ } ↗",
    heroRightPill: "{ የERCA ደረሰኝ } ↗",
    openCalculator: "ማስያውን ይመልከቱ ↓",
    manifestoSegments: [
      { text: "ዓለም አቀፍ ፕላትፎርሞች 20% ሲቆርጡ፣ YeKis ግን" },
      { text: "92.5% ክፍያዎ በቀጥታ", highlight: true },
      { text: "ወደ ቴሌብር ወይም ንግድ ባንክ እንዲገባ ያደርጋል።" },
    ],
    kpiTakeHome: "የባለሙያ የተጣራ ገቢ",
    kpiPlatformFee: "መደበኛ የፕላትፎርም ክፍያ",
    kpiSubscription: "ወርሃዊ የደንበኝነት ክፍያ",
    currencyCode: "ብር",
    simulatorKicker: "የክፍያ እና የታክስ ማስያ",
    milestoneValueLabel: "የምዕራፍ ዋጋ (ብር)",
    milestoneSliderAria: "የምዕራፍ ውል መጠን በብር",
    settlementRailLabel: "የክፍያ መስመር",
    rails: [
      { id: "telebirr", name: "ቴሌብር", speed: "< 45 ሰከንድ" },
      { id: "cbebirr", name: "ሲቢኢ ብር", speed: "< 90 ሰከንድ" },
      { id: "mpesa", name: "ኤም-ፔሳ", speed: "< 60 ሰከንድ" },
    ],
    vatToggle: "15% ተጨማሪ እሴት ታክስ (VAT)",
    whtToggle: "ሕጋዊ የዊዝሆልዲንግ ታክስ (በክፍያ ጊዜ)",
    railPrefix: "መስመር:",
    dossierTitle: "የክፍያ ሰነድ",
    netBadge: "92.5% የተጣራ",
    tableLineCol: "መደብ",
    tableRateCol: "ተመን",
    rowGross: "ጠቅላላ የምዕራፍ ክፍያ",
    rowGrossRate: "መነሻ",
    rowClientFee: "የደንበኛ ኤስክሮ ክፍያ",
    rowPlatformFee: "የባለሙያ የፕላትፎርም ክፍያ",
    rowVat: "የገቢዎች VAT",
    rowWithholding: "የገቢዎች ዊዝሆልዲንግ",
    clientDepositLabel: "ደንበኛው የሚያስይዘው",
    freelancerPayoutLabel: "ባለሙያው የሚቀበለው",
    clientTaxInvoiceBtn: "የደንበኛ ደረሰኝ ↗",
    payoutVoucherBtn: "የባለሙያ ሰነድ ↗",
    railsKicker: "{ መስመሮች }",
    comparisonKicker: "ንጽጽር",
    readFaqLink: "የኤስክሮ ደንቦችን ያንብቡ ↗",
    zeroSubKicker: "በነጻ ይጀምሩ",
    outroTitle: "የመጀመሪያ የኤስክሮ ውልዎን በ0 ብር ይክፈቱ።",
    hireEscrowBtn: "እንደ ደንበኛ ይጀምሩ ↗",
    keepTalentBtn: "እንደ ባለሙያ ይቀላቀሉ",
    taxDeskBtn: "የታክስ ምክክር",
  },
  om: {
    home: "Mana",
    zeroClientFeeCode: "KAFFALTII MAAMILAA 0%",
    pricingBreadcrumb: "Gatii & Tarree Kaffaltii",
    etbTag: "ETB",
    feeCalculatorPill: "Herregaa Kaffaltii ↓",
    slaTag: "SLA",
    escrowFaqPill: "Gaaffilee Iskuuroo",
    heroLine1: "galii keessan",
    heroLine2: "kiisii keessan keessa tursuu",
    heroLeftPill: "{ Herregaa ETB } ↗",
    heroRightPill: "{ Galmee Gibiraa ERCA } ↗",
    openCalculator: "Herregaa bani ↓",
    manifestoSegments: [
      { text: "Waltajjiiwwan addunyaa hanga %20 yoo fudhatan, YeKis garuu" },
      { text: "kaffaltii waligalaa dhaabbataa %7.5 (7% waltajjii + 0.5% kaffaltii)", highlight: true },
      { text: "kaffaltii ETB kallattiin baasii dhokataa malee kenna." },
    ],
    kpiTakeHome: "GALII QULQULLUU OGEEYYII",
    kpiPlatformFee: "KAFFALTII WALTAJJII IDILEE",
    kpiSubscription: "KAFFALTII GALMEE",
    currencyCode: "ETB",
    simulatorKicker: "HERREGAA ISKUUROO ETB",
    milestoneValueLabel: "GATII BOQONNAA",
    milestoneSliderAria: "Hanga waliigaltee boqonnaa ETB dhaan",
    settlementRailLabel: "SARARA KAFFALTII",
    rails: [
      { id: "telebirr", name: "Telebirr", speed: "< sekondii 45" },
      { id: "cbebirr", name: "CBE Birr", speed: "< sekondii 90" },
      { id: "mpesa", name: "M-Pesa ET", speed: "< sekondii 60" },
    ],
    vatToggle: "VAT Itoophiyaa 15%",
    whtToggle: "Gibira seeraan qabamu (yeroo kaffaltii)",
    railPrefix: "SARARA:",
    dossierTitle: "Galmee Kaffaltii",
    netBadge: "92.5% QULQULLUU",
    tableLineCol: "TARREE",
    tableRateCol: "SAFARTUU",
    rowGross: "Boqonnaa Waliigalaa",
    rowGrossRate: "Bu'uura",
    rowClientFee: "Kaffaltii Iskuuroo Maamilaa",
    rowPlatformFee: "Kaffaltii Waltajjii Ogeessaa",
    rowVat: "ERCA VAT",
    rowWithholding: "Gibira Qabamu ERCA",
    clientDepositLabel: "KUUSAA MAAMILAA",
    freelancerPayoutLabel: "KAFFALTII OGEESSAA",
    clientTaxInvoiceBtn: "Nagahee Gibira Maamilaa ↗",
    payoutVoucherBtn: "Boocharii Kaffaltii ↗",
    railsKicker: "{ SARAROOTA }",
    comparisonKicker: "MADAALLII",
    readFaqLink: "Gaaffilee iskuuroo & gibiraa dubbisi ↗",
    zeroSubKicker: "GALMEE ETB 0",
    outroTitle: "Har'a ETB 0 dhaan bakka hojii keessan banaa.",
    hireEscrowBtn: "Iskuuroodhaan Qacari ↗",
    keepTalentBtn: "Akka Ogeessaatti %92.5 Fudhadhu",
    taxDeskBtn: "Deeggarsa Gibiraa",
  },
  ti: {
    home: "መበገሲ",
    zeroClientFeeCode: "0% ክፍሊት ዓሚል",
    pricingBreadcrumb: "ዋጋን መምርሒ ክፍሊትን",
    etbTag: "ETB",
    feeCalculatorPill: "መስልሒ ክፍሊት ↓",
    slaTag: "SLA",
    escrowFaqPill: "ሕቶታት ኤስክሮ",
    heroLine1: "ናይ ጻዕርኹም",
    heroLine2: "ኣብ ጁባኹም ነቐርዮ",
    heroLeftPill: "{ መስልሒ ETB } ↗",
    heroRightPill: "{ ሰነድ ግብሪ ERCA } ↗",
    openCalculator: "መስልሒ ክፈት ↓",
    manifestoSegments: [
      { text: "ዓለምለኸ መድረኻት ክሳብ 20% ክቖርጹ ከለዉ፣ YeKis ግን" },
      { text: "ቀዋሚ 7.5% ጠቕላላ ክፍሊት (7% መድረኽ + 0.5% ክፍሊት)", highlight: true },
      { text: "—ብብር ብቐጥታን ብዘይ ሕቡእ ወጻእን የኽፍል።" },
    ],
    kpiTakeHome: "ጽሩይ እቶት ክኢላ",
    kpiPlatformFee: "ስሩዕ ክፍሊት መድረኽ",
    kpiSubscription: "ወርሓዊ ክፍሊት ኣባልነት",
    currencyCode: "ብር",
    simulatorKicker: "መስልሒ ኤስክሮን ግብርን ETB",
    milestoneValueLabel: "ዋጋ ምዕራፍ ስራሕ",
    milestoneSliderAria: "መጠን ውዕል ምዕራፍ ብብር",
    settlementRailLabel: "መስመር ክፍሊት",
    rails: [
      { id: "telebirr", name: "ቴሌብር", speed: "< 45 ካልኢት" },
      { id: "cbebirr", name: "CBE ብር", speed: "< 90 ካልኢት" },
      { id: "mpesa", name: "M-Pesa ET", speed: "< 60 ካልኢት" },
    ],
    vatToggle: "15% ተወሳኺ እሴት ታክስ (VAT)",
    whtToggle: "ሕጋዊ ዝተሓዝ ግብሪ (ኣብ ግዜ ክፍሊት)",
    railPrefix: "መስመር:",
    dossierTitle: "ሰነድ ክፍሊት",
    netBadge: "92.5% ጽሩይ",
    tableLineCol: "ዓይነት",
    tableRateCol: "መጠን",
    rowGross: "ጠቕላላ ምዕራፍ",
    rowGrossRate: "መሰረት",
    rowClientFee: "ክፍሊት ኤስክሮ ዓሚል",
    rowPlatformFee: "ክፍሊት መድረኽ ክኢላ",
    rowVat: "ቫት ERCA",
    rowWithholding: "ዝተሓዝ ግብሪ ERCA",
    clientDepositLabel: "ተቐማጢ ዓሚል",
    freelancerPayoutLabel: "ክፍሊት ክኢላ",
    clientTaxInvoiceBtn: "ደረሰኝ ግብሪ ዓሚል ↗",
    payoutVoucherBtn: "ወረቐት ክፍሊት ክኢላ ↗",
    railsKicker: "{ መስመራት }",
    comparisonKicker: "ምንጽጻር",
    readFaqLink: "ሕቶታት ኤስክሮን ግብርን ኣንብብ ↗",
    zeroSubKicker: "ብ0 ብር ጀምር",
    outroTitle: "ናይ መጀመርታ ስራሕኩም ሎሚ ብ0 ብር ክፈቱ።",
    hireEscrowBtn: "ብኤስክሮ ቅጸር ↗",
    keepTalentBtn: "ከም ክኢላ 92.5% ውሰድ",
    taxDeskBtn: "ደገፍ ግብሪ",
  },
};

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
  const lang: Language = language;
  const copy = FEES_COPY[lang] ?? FEES_COPY.en;
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
    const clientFee = 0;
    // 7% platform commission + 0.5% payment/disbursement provider fee.
    // The provider fee used to be charged at cash-out instead; it is now
    // collected on the transaction, so the take is one number up front.
    const freelancerFee = Math.round(amount * 0.075);
    const vatAmount = includeVat ? Math.round(amount * 0.15) : 0;
    const whtEligible = false;
    const whtAmount = 0;

    const totalClientEscrowFunding = amount;
    const netFreelancerTakeHome = amount - freelancerFee;

    return {
      clientFee,
      freelancerFee,
      vatAmount,
      whtEligible,
      whtAmount,
      totalClientEscrowFunding,
      netFreelancerTakeHome,
    };
  }, [amount, includeVat]);

  const stickyItems: StickyStackItem[] = useMemo(
    () =>
      RAIL_SERVICES.map((rail) => ({
        id: rail.id,
        title: rail.label[lang],
        topChip: rail.topChip[lang],
        kickerBadge: rail.badge[lang],
        artNode: renderRailArtwork(rail.id, "fluted"),
        rows: rail.rows.map((row) => ({
          label: row.label[lang],
          badge: row.badge[lang],
        })),
        onCardClick: () => calculatorRef.current?.scrollIntoView({ behavior: "smooth" }),
      })),
    [lang]
  );

  const activeComp = PLATFORM_COMPARISONS[activeCompIdx] ?? PLATFORM_COMPARISONS[0];
  const selectedRailInfo = copy.rails.find((r) => r.id === selectedRail) ?? copy.rails[0];

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
                code: copy.zeroClientFeeCode,
                label: copy.pricingBreadcrumb,
                active: true,
              },
            ]}
            rightMeta={
              <div className="cs-studio-band-pills">
                <button
                  type="button"
                  className="cs-studio-band-pill is-active"
                  onClick={() => calculatorRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  <span>{copy.etbTag}</span>
                  <span>{copy.feeCalculatorPill}</span>
                </button>
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate?.("faq")}
                >
                  <span>{copy.slaTag}</span>
                  <span>{copy.escrowFaqPill}</span>
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
                <span className="cs-hero-brace">{"{92.5%}"}</span>
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
                onClick={() => calculatorRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                {renderRailArtwork("telebirr", "hero-left")}
                <span className="cs-hero-hover-pill">
                  {copy.heroLeftPill}
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
                  {copy.heroRightPill}
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
              {copy.openCalculator}
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 2 — CRISP WHITE { 7.5% } MANIFESTO (ZERO SUB-PARAGRAPHS)
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
              <span className="cs-brace-emblem-word">7%</span>
              <span className="cs-brace-emblem-char">{"}"}</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline segments={copy.manifestoSegments} />

              <AnimatedCountUpStrip
                metrics={[
                  { value: 93, decimals: 0, suffix: "%", label: copy.kpiTakeHome },
                  { value: 7, decimals: 0, suffix: "%", label: copy.kpiPlatformFee },
                  { value: 0, suffix: ` ${copy.currencyCode}`, label: copy.kpiSubscription },
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
              {"{"} {copy.simulatorKicker} {"}"}
            </span>

            <div className="cs-calc-presets">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`cs-works-tab ${amount === preset ? "is-active" : ""}`}
                  onClick={() => setAmount(preset)}
                >
                  {preset.toLocaleString()} {copy.currencyCode}
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
                    {copy.milestoneValueLabel}
                  </span>
                  <span className="cs-calc-amount-display">
                    {amount.toLocaleString()} {copy.currencyCode}
                  </span>
                </div>

                <input
                  type="range"
                  min={2000}
                  max={500000}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="cs-calc-slider"
                  aria-label={copy.milestoneSliderAria}
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
                  <span>2,000 {copy.currencyCode}</span>
                  <span>250,000 {copy.currencyCode}</span>
                  <span>500,000 {copy.currencyCode}</span>
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
                  {copy.settlementRailLabel}
                </span>
                <div className="cs-calc-rail-grid">
                  {copy.rails.map((rail) => (
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
                    {copy.vatToggle}
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
                    {copy.whtToggle}
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
                      {copy.railPrefix} {selectedRailInfo.name.toUpperCase()}
                    </span>
                    <h3
                      style={{
                        fontFamily: "var(--v2-font-display)",
                        fontSize: 22,
                        fontWeight: 700,
                        margin: "4px 0 0",
                      }}
                    >
                      {copy.dossierTitle}
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
                    {copy.netBadge}
                  </span>
                </div>

                <table className="cs-ledger-table">
                  <thead>
                    <tr>
                      <th>{copy.tableLineCol}</th>
                      <th>{copy.tableRateCol}</th>
                      <th style={{ textAlign: "right" }}>{copy.currencyCode}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{copy.rowGross}</strong></td>
                      <td>{copy.rowGrossRate}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)", fontWeight: 700 }}>
                        {amount.toLocaleString()} {copy.currencyCode}
                      </td>
                    </tr>
                    <tr>
                      <td>{copy.rowClientFee}</td>
                      <td>0%</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        0 {copy.currencyCode}
                      </td>
                    </tr>
                    <tr>
                      <td>{copy.rowPlatformFee}</td>
                      <td>−7%</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        −{calc.freelancerFee.toLocaleString()} {copy.currencyCode}
                      </td>
                    </tr>
                    <tr>
                      <td>{copy.rowVat}</td>
                      <td>{includeVat ? "+15%" : "0%"}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        {includeVat ? `+${calc.vatAmount.toLocaleString()} ${copy.currencyCode}` : `0 ${copy.currencyCode}`}
                      </td>
                    </tr>
                    <tr>
                      <td>{copy.rowWithholding}</td>
                      <td>0%</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--v2-font-mono)" }}>
                        0 {copy.currencyCode}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="cs-findings-kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="cs-findings-kpi" style={{ background: "#141715", color: "#fafaf7", borderRadius: 12 }}>
                  <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10, color: "rgba(250,250,247,0.65)" }}>
                    {copy.clientDepositLabel}
                  </span>
                  <strong style={{ fontFamily: "var(--v2-font-display)", fontSize: 22, color: "#f5c518" }}>
                    {calc.totalClientEscrowFunding.toLocaleString()} {copy.currencyCode}
                  </strong>
                </div>

                <div className="cs-findings-kpi" style={{ borderRadius: 12 }}>
                  <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10 }}>
                    {copy.freelancerPayoutLabel}
                  </span>
                  <strong style={{ fontFamily: "var(--v2-font-display)", fontSize: 22 }}>
                    {calc.netFreelancerTakeHome.toLocaleString()} {copy.currencyCode}
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
                  {copy.clientTaxInvoiceBtn}
                </button>
                <button
                  type="button"
                  className="cs-see-all-btn"
                  style={{ flex: 1, justifyContent: "center", fontSize: 15 }}
                  onClick={() =>
                    setActiveDocPreview((prev) => (prev === "FREELANCER_VOUCHER" ? null : "FREELANCER_VOUCHER"))
                  }
                >
                  {copy.payoutVoucherBtn}
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
          kicker={copy.railsKicker}
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
                {"{"} {copy.comparisonKicker} {"}"}
              </span>

              <div className="cs-testi-authors">
                {PLATFORM_COMPARISONS.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cs-testi-author-btn ${idx === activeCompIdx ? "is-active" : ""}`}
                    onClick={() => setActiveCompIdx(idx)}
                  >
                    <span>{item.name[lang]}</span>
                    <span className="cs-testi-metric-pill">{item.metric[lang]}</span>
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
                  <p className="cs-testi-quote">“{activeComp.quote[lang]}”</p>
                  <div className="cs-testi-role">{activeComp.role[lang]}</div>
                  <button type="button" className="cs-testi-link" onClick={() => onNavigate?.("faq")}>
                    {copy.readFaqLink}
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
                {"{"} {copy.zeroSubKicker} {"}"}
              </span>
              <h2 className="cs-outro-title">
                {copy.outroTitle}
              </h2>
            </div>

            <div className="cs-outro-brace-stage">
              <span className="cs-outro-giant-brace">{"{"}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" className="cs-outro-pill-btn" onClick={() => onStart?.("register")}>
                  {copy.hireEscrowBtn}
                </button>
                <button
                  type="button"
                  className="cs-outro-pill-btn"
                  style={{ background: "transparent", color: "#f4f7f4", border: "1px solid rgba(255,255,255,0.28)" }}
                  onClick={() => onStart?.("register")}
                >
                  {copy.keepTalentBtn}
                </button>
                <button
                  type="button"
                  className="cs-outro-pill-btn"
                  style={{ background: "transparent", color: "#9be564", border: "1px solid rgba(155,229,100,0.35)" }}
                  onClick={() => openSupportChat()}
                >
                  {copy.taxDeskBtn}
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
