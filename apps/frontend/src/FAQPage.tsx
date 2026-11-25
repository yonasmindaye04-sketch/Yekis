import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Language, useI18n } from "./i18n";
import { events } from "./analytics";
import { openSupportChat } from "./components/supportChatEvents";
import {
  AnimatedCountUpStrip,
  ScrollIlluminatedHeadline,
  ScrollParallaxDiptych,
  StickyScrollServicesStage,
  StudioBreadcrumb,
  type StickyStackItem,
} from "./components/StudioScrollMotion";

interface FAQPageProps {
  onNavigate?: (view: string) => void;
  onStart?: (mode: "login" | "register") => void;
}

type FAQCategoryId = "escrow" | "payouts" | "disputes" | "verification" | "tax";

interface FAQItem {
  id: string;
  num: string;
  category: FAQCategoryId;
  question: Record<Language, string>;
  answer: Record<Language, string>;
  goldHighlight: Record<Language, string>;
  slaMetric: Record<Language, string>;
}

interface FAQTopicService {
  id: FAQCategoryId;
  label: Record<Language, string>;
  topChip: Record<Language, string>;
  slaBadge: Record<Language, string>;
  rows: { label: Record<Language, string>; badge: Record<Language, string> }[];
}

interface SlaAssuranceItem {
  id: string;
  name: Record<Language, string>;
  role: Record<Language, string>;
  quote: Record<Language, string>;
  metric: Record<Language, string>;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const FAQ_TOPICS: FAQTopicService[] = [
  {
    id: "escrow",
    label: {
      en: "Escrow Locks",
      am: "የኤስክሮ ጥበቃ",
      om: "Eegumsa Iskuuroo",
      ti: "ሓለዋ ኤስክሮ",
    },
    topChip: {
      en: "NBE ESCROW TRUST",
      am: "የብሔራዊ ባንክ ኤስክሮ ጥበቃ",
      om: "EEGUMSA ISKUUROO NBE",
      ti: "ሓለዋ ኤስክሮ ብሄራዊ ባንኪ",
    },
    slaBadge: {
      en: "100% RINGFENCED",
      am: "100% የተጠበቀ",
      om: "100% EEGAME",
      ti: "100% ዝተሓለወ",
    },
    rows: [
      {
        label: { en: "SCOPE DEPOSIT", am: "የውል ተቀማጭ", om: "KUUSAA WALIIGALTEE", ti: "ተቐማጢ ውዕል" },
        badge: { en: "100% LOCKED", am: "100% ተቆልፏል", om: "100% CUFAME", ti: "100% ተዓጽዩ" },
      },
      {
        label: { en: "DELIVERY PROOF", am: "የማስረከቢያ ማስረጃ", om: "RAGAA RAAWWII", ti: "መረጋገጺ ርክክብ" },
        badge: { en: "SHA-256", am: "SHA-256", om: "SHA-256", ti: "SHA-256" },
      },
      {
        label: { en: "AUTO-RELEASE", am: "ራስ-ሰር ክፍያ መልቀቂያ", om: "GADHIISA OFUMAA", ti: "ብቐጥታ ዝፍኖ ክፍሊት" },
        badge: { en: "120 HOURS", am: "120 ሰዓታት", om: "SA'AATII 120", ti: "120 ሰዓታት" },
      },
    ],
  },
  {
    id: "payouts",
    label: {
      en: "Instant Payouts",
      am: "ፈጣን ክፍያዎች",
      om: "Kaffaltii Saffisaa",
      ti: "ቅልጡፍ ክፍሊታት",
    },
    topChip: {
      en: "TELEBIRR · CBE BIRR",
      am: "ቴሌብር · ሲቢኢ ብር",
      om: "TELEBIRR · CBE BIRR",
      ti: "ቴሌብር · CBE ብር",
    },
    slaBadge: {
      en: "< 45 SEC PAYOUT",
      am: "< 45 ሰከንድ ክፍያ",
      om: "< SEKONDII 45",
      ti: "< 45 ካልኢት ክፍሊት",
    },
    rows: [
      {
        label: { en: "TELEBIRR WALLET", am: "የቴሌብር ዋሌት", om: "WALLET TELEBIRR", ti: "ዋሌት ቴሌብር" },
        badge: { en: "< 45 SEC", am: "< 45 ሰከንድ", om: "< SEKONDII 45", ti: "< 45 ካልኢት" },
      },
      {
        label: { en: "CBE BIRR / RTGS", am: "ሲቢኢ ብር / RTGS", om: "CBE BIRR / RTGS", ti: "CBE ብር / RTGS" },
        badge: { en: "< 90 SEC", am: "< 90 ሰከንድ", om: "< SEKONDII 90", ti: "< 90 ካልኢት" },
      },
      {
        label: { en: "M-PESA ETHIOPIA", am: "ኤም-ፔሳ ኢትዮጵያ", om: "M-PESA ITOOPHIYAA", ti: "M-PESA ኢትዮጵያ" },
        badge: { en: "< 60 SEC", am: "< 60 ሰከንድ", om: "< SEKONDII 60", ti: "< 60 ካልኢት" },
      },
    ],
  },
  {
    id: "disputes",
    label: {
      en: "48h Mediation",
      am: "የ48 ሰዓት ሽምግልና",
      om: "Araara Sa'aatii 48",
      ti: "ዕርቂ 48 ሰዓት",
    },
    topChip: {
      en: "ADDIS ABABA DESK",
      am: "የአዲስ አበባ ቢሮ",
      om: "WAAJJIRA FINFINNEE",
      ti: "ቤት ጽሕፈት ኣዲስ ኣበባ",
    },
    slaBadge: {
      en: "48H BINDING SLA",
      am: "የ48 ሰዓት ውሳኔ",
      om: "MURTOO SA'AATII 48",
      ti: "ውሳነ 48 ሰዓት",
    },
    rows: [
      {
        label: { en: "ESCROW FREEZE", am: "ኤስክሮ ማገድ", om: "DHORKA ISKUUROO", ti: "ምእጋድ ኤስክሮ" },
        badge: { en: "INSTANT", am: "ወዲያውኑ", om: "YEROO SANAA", ti: "ብኡንብኡ" },
      },
      {
        label: { en: "EVIDENCE AUDIT", am: "የማስረጃ ምርመራ", om: "QORANNOO RAGAA", ti: "ምርመራ መርትዖ" },
        badge: { en: "12 HOURS", am: "12 ሰዓታት", om: "SA'AATII 12", ti: "12 ሰዓታት" },
      },
      {
        label: { en: "FINAL RULING", am: "የመጨረሻ ውሳኔ", om: "MURTOO XUMURAA", ti: "ናይ መወዳእታ ውሳነ" },
        badge: { en: "48 HOURS", am: "48 ሰዓታት", om: "SA'AATII 48", ti: "48 ሰዓታት" },
      },
    ],
  },
  {
    id: "verification",
    label: {
      en: "Fayda ID",
      am: "ፋይዳ መታወቂያ",
      om: "Eenyummaa Fayda",
      ti: "መንነት ፋይዳ",
    },
    topChip: {
      en: "BIOMETRIC & TIN",
      am: "ባዮሜትሪክ እና TIN",
      om: "BAAYOOMEETIRIKII & TIN",
      ti: "ባዮሜትሪክን TINን",
    },
    slaBadge: {
      en: "3-MIN KYC",
      am: "3 ደቂቃ KYC",
      om: "KYC DAQIIQAA 3",
      ti: "3 ደቒቕ KYC",
    },
    rows: [
      {
        label: { en: "FAYDA / KEBELE", am: "ፋይዳ / ቀበሌ", om: "FAYDA / GANDA", ti: "ፋይዳ / ቀበሌ" },
        badge: { en: "VERIFIED", am: "ተረጋግጧል", om: "MIRKANA'E", ti: "ተረጋጊጹ" },
      },
      {
        label: { en: "PORTFOLIO VETTING", am: "የሥራ ናሙና ማረጋገጫ", om: "QORANNOO HOJII", ti: "ምርመራ ስራሕቲ" },
        badge: { en: "AUDITED", am: "ተፈትሿል", om: "SAKATTA'AME", ti: "ተመርሚሩ" },
      },
      {
        label: { en: "CORPORATE TIN", am: "የድርጅት TIN", om: "TIN DHAABBATA", ti: "TIN ትካል" },
        badge: { en: "LICENSED", am: "ፈቃድ ያለው", om: "HAYYAMA QABA", ti: "ፍቓድ ዘለዎ" },
      },
    ],
  },
  {
    id: "tax",
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
    slaBadge: {
      en: "AUDIT-READY PDF",
      am: "ለኦዲት ዝግጁ PDF",
      om: "PDF OODIITIIF QOPHAA'E",
      ti: "ንኦዲት ድሉው PDF",
    },
    rows: [
      {
        label: { en: "ETHIOPIAN VAT", am: "የኢትዮጵያ ቫት", om: "VAT ITOOPHIYAA", ti: "ቫት ኢትዮጵያ" },
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

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-escrow-work",
    num: "01",
    category: "escrow",
    question: {
      en: "How does YeKis milestone escrow protect both clients and freelancers?",
      am: "የYeKis ኤስክሮ ደንበኞችን እና ባለሙያዎችን እንዴት ይጠብቃል?",
      om: "Iskuuroon boqonnaa YeKis maamiltootaa fi ogeeyyii akkamitti eega?",
      ti: "ኤስክሮ ምዕራፋት YeKis ንዓማዊልን ክኢላታትን ከመይ ይሕሉ?",
    },
    answer: {
      en: "Before work starts on any phase, the client funds that milestone in Ethiopian Birr (ETB). YeKis ringfences the capital in an audited escrow trust account and releases funds the moment deliverables are approved.",
      am: "ሥራ ከመጀመሩ በፊት ደንበኛው ክፍያውን በብር ወደ ኤስክሮ ያስገባል። ሥራው በትክክል መጠናቀቁ ሲረጋገጥ ክፍያው ወዲያውኑ ይለቀቃል።",
      om: "Hojiin kamiyyuu osoo hin jalqabin dura, maamilli boqonnaa sana Birrii Itoophiyaan (ETB) kuusaa iskuurootti kaffala. YeKis maallaqa kana herrega amanamaa keessatti eegee yeroo hojiin mirkanaa'u battalumatti gadhiisa.",
      ti: "ስራሕ ቅድሚ ምጅማሩ ዓሚል ክፍሊት ብብር (ETB) ናብ ኤስክሮ የእቱ። YeKis ነቲ ገንዘብ ኣብ ዝተመርመረ ሕሳብ ሓልዩ፣ ስራሕ ምስ ጸደቐ ብኡንብኡ ይፍኖ።",
    },
    goldHighlight: {
      en: "Zero unpaid trial work · Zero deposit risk.",
      am: "ያለ ክፍያ የሚባክን ድካም የለም · ቅድመ ክፍያ ተከፍሎ የሚጠፋ ሥራ የለም።",
      om: "Hojii yaalii kaffaltii malee zeroo · Balaa kuusaa zeroo.",
      ti: "ብዘይ ክፍሊት ዝባኽን ስራሕ የለን · ስግኣት ቅድመ ክፍሊት የለን።",
    },
    slaMetric: {
      en: "100% ESCROW BACKED",
      am: "100% በኤስክሮ የተጠበቀ",
      om: "100% ISKUUROON EEGAME",
      ti: "100% ብኤስክሮ ዝተሓለወ",
    },
  },
  {
    id: "faq-client-ghost",
    num: "02",
    category: "escrow",
    question: {
      en: "What happens if a client goes silent after I submit completed milestone files?",
      am: "ሥራዬን አጠናቅቄ ካስረከብኩ በኋላ ደንበኛው ምላሽ ባይሰጥ ምን ይሆናል?",
      om: "Ergan faayila hojii xumurame ergee booda maamilli yoo callise maaltu ta'a?",
      ti: "ዝተዛዘመ ስራሕ ምስ ኣረከብኩ ዓሚል ስቕ እንተበለ እንታይ ይኸውን?",
    },
    answer: {
      en: "Uploading deliverables starts an automated 120-hour (5-business-day) review timer. If the client neither approves nor requests a scope-backed revision before the clock hits zero, 100% of the milestone releases automatically.",
      am: "ሥራዎን እንዳስረከቡ የ120 ሰዓታት ቆጣሪ ይጀምራል። ደንበኛው ምላሽ ካልሰጠ ሲስተሙ ክፍያውን በራሱ ወደ ቦርሳዎ ይለቃል።",
      om: "Faayiloota hojii erguun lakkooftuu sa'aatii 120 (guyyoota hojii 5) ofumaan jalqabsiisa. Maamilli sa'aatiin osoo hin xumuramin yoo hin mirkaneessine ykn sirreeffama hin gaafanne, kaffaltiin 100% ofumaan gadhiifama.",
      ti: "ስራሕ ምስ ኣረከብኩም ናይ 120 ሰዓት (5 መዓልቲ ስራሕ) ቆጻሪ ይጅምር። ዓሚል ከይፈቐደ ወይ ሕጋዊ ምምሕያሽ ከይሓተተ ግዜኡ እንተኣኺሉ፣ 100% ክፍሊት ብቐጥታ ይፍኖ።",
    },
    goldHighlight: {
      en: "120-Hour Auto-Release Covenant.",
      am: "የ120 ሰዓት አውቶማቲክ የክፍያ መልቀቂያ ዋስትና።",
      om: "Waadaa Gadhiisa Ofumaa Sa'aatii 120.",
      ti: "ውዕል ብቐጥታ መፍነዊ 120 ሰዓት።",
    },
    slaMetric: {
      en: "120H AUTO-RELEASE",
      am: "የ120 ሰዓት ራስ-ሰር ክፍያ",
      om: "GADHIISA OFUMAA 120H",
      ti: "120 ሰዓት ብቐጥታ",
    },
  },
  {
    id: "faq-payout-rails",
    num: "03",
    category: "payouts",
    question: {
      en: "Which Ethiopian payment methods are supported for funding and instant withdrawals?",
      am: "ክፍያ ለመፈጸም እና ገንዘብ ለማውጣት የትኞቹ የኢትዮጵያ የክፍያ አማራጮች ይሠራሉ?",
      om: "Kaffaltii galchuu fi baasiif tooftaaleen kaffaltii Itoophiyaa kamfaatu hojjeta?",
      ti: "ክፍሊት ንምእታውን ብቕልጡፍ ንምውጻእን ኣየኖት መንገድታት ክፍሊት ኢትዮጵያ ይሰርሑ?",
    },
    answer: {
      en: "YeKis natively integrates Telebirr, CBE Birr, Commercial Bank of Ethiopia RTGS, Awash Birr, Abyssinia, Dashen Amole, and M-Pesa Ethiopia in 100% native ETB.",
      am: "ቴሌብር፣ ሲቢኢ ብር፣ የኢትዮጵያ ንግድ ባንክ፣ አዋሽ ብር፣ አቢሲኒያ ባንክ፣ አሞሌ እና ኤም-ፔሳ ኢትዮጵያ በሙሉ በቀጥታ ይሠራሉ።",
      om: "YeKis Telebirr, CBE Birr, Baankii Daldala Itoophiyaa RTGS, Awash Birr, Abyssinia, Dashen Amole fi M-Pesa Itoophiyaa guutummaatti ETB dhaan walitti hidheera.",
      ti: "YeKis ምስ ቴሌብር፣ CBE ብር፣ ባንኪ ንግዲ ኢትዮጵያ RTGS፣ ኣዋሽ ብር፣ ኣቢሲንያ፣ ዳሽን ኣሞሌን M-Pesa ኢትዮጵያን 100% ብብር ይሰርሕ።",
    },
    goldHighlight: {
      en: "Median Telebirr & CBE Birr payout speed: 42 seconds.",
      am: "በአማካይ በ42 ሰከንድ ውስጥ ወደ ቴሌብር ይገባል።",
      om: "Saffisni giddugaleessaa kaffaltii Telebirr & CBE Birr: sekondii 42.",
      ti: "ማእከላይ ፍጥነት ክፍሊት ቴሌብርን CBE ብርን፡ 42 ካልኢት።",
    },
    slaMetric: {
      en: "< 45 SEC PAYOUT",
      am: "< 45 ሰከንድ ክፍያ",
      om: "< SEKONDII 45",
      ti: "< 45 ካልኢት ክፍሊት",
    },
  },
  {
    id: "faq-fee-split",
    num: "04",
    category: "payouts",
    question: {
      en: "How much does YeKis charge compared to international freelance platforms?",
      am: "የYeKis የአገልግሎት ክፍያ ከውጭ ፕላትፎርሞች አንጻር ምን ያህል ነው?",
      om: "Kaffaltiin tajaajilaa YeKis waltajjiiwwan addunyaa biroo waliin yoo madaalamu hammami?",
      ti: "ክፍሊት ኣገልግሎት YeKis ምስ ዓለምለኸ መድረኻት ስራሕ ክነጻጸር ከሎ ክንደይ እዩ?",
    },
    answer: {
      en: "YeKis charges a flat 7% platform fee on released milestones and no client deposit fee. Freelancers keep 93% of every contract with zero monthly subscriptions.",
      am: "YeKis ከተለቀቀ የሥራ ምዕራፍ 7% ክፍያ ያስከፍላል፤ ከደንበኛው ግን ምንም የቅድመ ክፍያ አይጠየቅም። ባለሙያዎች የውሉን 93% በሙሉ ያገኛሉ።",
      om: "YeKis boqonnaa gadhiifame irraa kaffaltii dhaabbataa 7% fudhata; maamila irraa kaffaltiin kuusaa hin jiru. Ogeeyyiin kaffaltii ji'aa tokko malee %93 ni argatu.",
      ti: "YeKis ካብ ዝተፈነወ ምዕራፍ ስራሕ 7% ክፍሊት ይወስድ፤ ካብ ዓሚል ግን ናይ ምእታው ክፍሊት የለን። ክኢላታት ብዘይ ወርሓዊ ክፍሊት 93% ይረኽቡ።",
    },
    goldHighlight: {
      en: "Freelancers take home 93% of every ETB milestone.",
      am: "ባለሙያዎች የድካማቸውን 93% ያለምንም ወርሃዊ ክፍያ ያገኛሉ።",
      om: "Ogeeyyiin boqonnaa ETB hunda keessaa %93 mana isaanii fudhatu.",
      ti: "ክኢላታት ካብ ነፍሲ ወከፍ ምዕራፍ ETB 93% ናብ ኢዶም ይወስዱ።",
    },
    slaMetric: {
      en: "93% TAKE-HOME",
      am: "93% የተጣራ ገቢ",
      om: "93% GALII QULQULLUU",
      ti: "93% ጽሩይ እቶት",
    },
  },
  {
    id: "faq-dispute-sla",
    num: "05",
    category: "disputes",
    question: {
      en: "How does the 48-hour bilingual dispute mediation process work?",
      am: "የ48 ሰዓት የሽምግልና እና የዳኝነት ሂደት እንዴት ይሠራል?",
      om: "Adeemsi araara falmii sa'aatii 48 afaanoota hedduun akkamitti hojjeta?",
      ti: "ናይ 48 ሰዓት መስርሕ ዕርቂ ክትዕ ከመይ ይሰርሕ?",
    },
    answer: {
      en: "Our Addis Ababa arbitration desk audits the signed milestone rubric, SHA-256 deliverable hashes, and workspace logs in Amharic and English, issuing a binding settlement within 48 hours.",
      am: "የአዲስ አበባ የሽምግልና ቡድናችን ውሉን እና የተላኩ ፋይሎችን መርምሮ በ48 ሰዓት ውስጥ ውሳኔ ይሰጣል።",
      om: "Gareen araara keenya Finfinnee waliigaltee mallattaa'e, haashii faayilii SHA-256 fi galmee hojii Afaan Oromoo, Amaaraa fi Ingiliffaan qoratee sa'aatii 48 keessatti murtoo kenna.",
      ti: "ጉጅለ ዕርቅና ኣብ ኣዲስ ኣበባ ዝተፈረመ ውዕል፣ ሃሽ SHA-256ን መዝገብ ስራሕን መርሚሩ ኣብ ውሽጢ 48 ሰዓት ቀያዲ ውሳነ ይህብ።",
    },
    goldHighlight: {
      en: "99.4% dispute-free rate · 48h human resolution.",
      am: "99.4% የሚሆኑ ሥራዎች በሰላም ይጠናቀቃሉ፤ ክርክሮች በ48 ሰዓት ይፈታሉ።",
      om: "99.4% falmii malee xumurama · Furmaata namaan sa'aatii 48 keessatti.",
      ti: "99.4% ብዘይ ክትዕ ይዛዘም · ኣብ 48 ሰዓት ብሰብ ይፍታሕ።",
    },
    slaMetric: {
      en: "48H HUMAN REVIEW",
      am: "የ48 ሰዓት ግምገማ",
      om: "QORANNOO 48H",
      ti: "ገምጋም 48 ሰዓት",
    },
  },
  {
    id: "faq-fayda-kyc",
    num: "06",
    category: "verification",
    question: {
      en: "Do I need a Fayda National ID or Trade License to join YeKis?",
      am: "በYeKis ለመመዝገብ የፋይዳ ብሔራዊ መታወቂያ ወይም የንግድ ፈቃድ ያስፈልገኛል?",
      om: "YeKis tti makamuuf Waraqaa Eenyummaa Biyyaalessaa Fayda ykn Hayyama Daldalaa nan barbaachisaa?",
      ti: "ኣብ YeKis ንምምዝጋብ ብሄራዊ መታወቂያ ፋይዳ ወይ ፍቓድ ንግዲ የድልየኒ ድዩ?",
    },
    answer: {
      en: "Individuals verify in 3 minutes using Fayda National ID (FAN), Kebele ID, or Passport. Registered companies attach their TIN and Trade License for enterprise escrow limits.",
      am: "የግል ባለሙያዎች በፋይዳ መታወቂያ፣ በቀበሌ መታወቂያ ወይም በፓስፖርት በ3 ደቂቃ መመዝገብ ይችላሉ።",
      om: "Namoonni dhuunfaa Fayda (FAN), Waraqaa Ganda ykn Paaspoortiin daqiiqaa 3 keessatti mirkanaa'u. Dhaabbileen TIN fi Hayyama Daldalaa isaanii dhiyeessu.",
      ti: "ውልቀ ሰባት ብፋይዳ (FAN)፣ መታወቂያ ቀበሌ ወይ ፓስፖርት ኣብ 3 ደቒቕ ይረጋገጹ። ትካላት ድማ TINን ፍቓድ ንግድን የቕርቡ።",
    },
    goldHighlight: {
      en: "Verified badges boost proposal acceptance by 3.4×.",
      am: "ማንነታቸው የተረጋገጠ ባለሙያዎች በ3.4 እጥፍ የበለጠ ሥራ ያገኛሉ።",
      om: "Mallattoon mirkanaa'inaa fudhatama yaada hojii dachaa 3.4 dabala.",
      ti: "ዝተረጋገጸ መለለዪ ተቐባልነት ሕቶ ስራሕ ብ3.4 ዕጽፊ የዕቢ።",
    },
    slaMetric: {
      en: "3-MIN KYC CHECK",
      am: "የ3 ደቂቃ KYC ማረጋገጫ",
      om: "QORANNOO KYC DAQIIQAA 3",
      ti: "መረጋገጺ KYC 3 ደቒቕ",
    },
  },
  {
    id: "faq-erca-tax",
    num: "07",
    category: "tax",
    question: {
      en: "Does YeKis generate ERCA-compliant VAT and Withholding Tax certificates?",
      am: "YeKis ለገቢዎች ሚኒስቴር የሚሆን የ15% ቫት እና የዊዝሆልዲንግ ታክስ ሰነድ ያዘጋጃል?",
      om: "YeKis waraqaa ragaa VAT fi Gibira Qabamu (Withholding Tax) ERCA waliin walsimu ni qopheessaa?",
      ti: "YeKis ምስ ERCA ዝሰማማዕ ወረቐት ቫትን ዝተሓዝ ግብርን (Withholding) የዳሉ ድዩ?",
    },
    answer: {
      en: "Yes. Our fiscal engine automatically calculates optional 15% VAT and statutory withholding tax on contracts above 10,000 ETB — 3% where the freelancer holds a TIN, 30% where they do not — issuing downloadable PDFs.",
      am: "አዎ! ሲስተሙ የ15% ቫት እና ከ10,000 ብር በላይ ለሆኑ ውሎች የዊዝሆልዲንግ ታክስ አስልቶ (TIN ላለው ባለሙያ 3%፣ ከሌለው 30%) ሕጋዊ የPDF ሰነድ ያዘጋጃል።",
      om: "Eeyyee. Sirni herregaa keenya waliigaltee ETB 10,000 oliitiif VAT %15 fi gibira qabamu (ogeessa TIN qabuuf %3, kan hin qabneef %30) ofumaan herregee PDF qopheessa.",
      ti: "እወ። ስርዓት ሕሳብና ልዕሊ 10,000 ETB ንዝኾኑ ውዕላት 15% ቫትን ሕጋዊ ዝተሓዝ ግብርን (TIN ንዘለዎ ክኢላ 3%፣ ንዘይብሉ 30%) ብቐጥታ ኣስሊሑ PDF ይፈጥር።",
    },
    goldHighlight: {
      en: "Instant ERCA tax invoices & withholding vouchers.",
      am: "አውቶማቲክ የታክስ ሰነዶች የሂሳብ ክፍሎችን ጊዜ ይቆጥባሉ።",
      om: "Nagahee gibiraa ERCA fi boochariiwwan battalaa.",
      ti: "ቅጽበታዊ ደረሰኛት ግብሪ ERCAን ወረቐት ምስክርን።",
    },
    slaMetric: {
      en: "ERCA COMPLIANT",
      am: "ከERCA ጋር የሚጣጣም",
      om: "ERCA WALIIN WALSIMA",
      ti: "ምስ ERCA ዝሰማማዕ",
    },
  },
  {
    id: "faq-milestone-edits",
    num: "08",
    category: "escrow",
    question: {
      en: "Can we add new milestones or adjust scope mid-project without restarting?",
      am: "ፕሮጀክቱ በመካከል ላይ እያለ አዲስ ምዕራፍ መጨመር ወይም ማስተካከል ይቻላል?",
      om: "Piroojektii gidduutti boqonnaa haaraa dabaluu ykn daangaa hojii jijjiiruun ni danda'amaa?",
      ti: "ፕሮጀክት ኣብ ማእከሉ ከሎ ሓድሽ ምዕራፍ ምውሳኽ ወይ ስፍሓት ስራሕ ምምዕርራይ ይከኣል ድዩ?",
    },
    answer: {
      en: "Either party can propose an Addendum Milestone inside the active contract ledger. Once funded via Telebirr or bank transfer, the new tranche joins the escrow timeline.",
      am: "በማንኛውም ጊዜ አዲስ የሥራ ምዕራፍ መጨመር ወይም ያልተጀመሩ ምዕራፎችን ማስተካከል ይቻላል።",
      om: "Gareen kamiyyuu galmee waliigaltee hojjechaa jiru keessatti boqonnaa dabalataa dhiyeessuu danda'a. Akkuma Telebirr ykn baankiin kaffalameen tarree iskuurootti makama.",
      ti: "ዝኾነ ወገን ኣብ ውሽጢ ንጡፍ መዝገብ ውዕል ተወሳኺ ምዕራፍ ክሓትት ይኽእል። ብቴሌብር ወይ ባንኪ ምስ ተኸፍለ ናብ መስመር ኤስክሮ ይጽንበር።",
    },
    goldHighlight: {
      en: "Scales from 5,000 ETB sprints to 2M+ ETB rollouts.",
      am: "ከ5,000 ብር እስከ 2 ሚሊዮን ብር ፕሮጀክቶች በተለዋዋጭ ይሠራል።",
      om: "Piroojektoota ETB 5,000 irraa hanga ETB 2M+ oliitiif hojjeta.",
      ti: "ካብ 5,000 ETB ክሳብ 2M+ ETB ንዝበጽሑ ፕሮጀክታት ይሰርሕ።",
    },
    slaMetric: {
      en: "DYNAMIC ADDENDUMS",
      am: "ተለዋዋጭ ማሻሻያዎች",
      om: "DABALATA HARIIROO",
      ti: "ተዓጻጻፊ ተወሳኺ ምዕራፍ",
    },
  },
];

const SLA_ASSURANCES: SlaAssuranceItem[] = [
  {
    id: "sla-auto",
    name: {
      en: "120-Hour Auto-Release",
      am: "የ120 ሰዓት ራስ-ሰር ክፍያ",
      om: "Gadhiisa Ofumaa Sa'aatii 120",
      ti: "ብቐጥታ መፍነዊ 120 ሰዓት",
    },
    role: {
      en: "FREELANCER PROTECTION COVENANT · CLAUSE 04",
      am: "የባለሙያዎች ጥበቃ ቃል ኪዳን · አንቀጽ 04",
      om: "WAADAA EEGUMSA OGEEYYII · KEEWWATA 04",
      ti: "ውዕል ሓለዋ ክኢላታት · ዓንቀጽ 04",
    },
    quote: {
      en: "Silent clients can never trap completed work in limbo—verified milestone uploads release automatically at hour 120.",
      am: "ምላሽ የማይሰጡ ደንበኞች የተጠናቀቀ ሥራን ማገድ አይችሉም—የተረጋገጡ የሥራ ምዕራፎች በ120ኛው ሰዓት በራስ-ሰር ይለቀቃሉ።",
      om: "Maamiltoonni callisan hojii xumurame hidhuu hin danda'an—hojiin ergame sa'aatii 120ffaa irratti ofumaan gadhiifama.",
      ti: "ስቕ ዝበሉ ዓማዊል ዝተዛዘመ ስራሕ ክዓግቱ ኣይክእሉን—ዝተረጋገጸ ስራሕ ኣብ 120 ሰዓት ብቐጥታ ይፍኖ።",
    },
    metric: {
      en: "100% ON-TIME",
      am: "100% በሰዓቱ",
      om: "100% YEROOTTI",
      ti: "100% ኣብ ግዜኡ",
    },
  },
  {
    id: "sla-mediation",
    name: {
      en: "48-Hour Human Arbitration",
      am: "የ48 ሰዓት የሰው ሽምግልና",
      om: "Araara Namaa Sa'aatii 48",
      ti: "ናይ 48 ሰዓት ሰብኣዊ ዕርቂ",
    },
    role: {
      en: "ADDIS ABABA DISPUTE DESK · MULTILINGUAL PANEL",
      am: "የአዲስ አበባ የክርክር ቢሮ · ባለብዙ ቋንቋ ፓነል",
      om: "WAAJJIRA FALMII FINFINNEE · GAREE AFAANOOTAA",
      ti: "ቤት ጽሕፈት ክትዕ ኣዲስ ኣበባ · ብዙሕ ቋንቋ ጉጅለ",
    },
    quote: {
      en: "Senior Ethiopian engineering, design, and legal mediators inspect your signed scope and SHA-256 artifacts to issue a binding ETB split within 48 hours.",
      am: "ከፍተኛ የኢትዮጵያ የኢንጂነሪንግ፣ የዲዛይን እና የሕግ አሸማጋዮች የተፈረመውን ውል እና የSHA-256 ማስረጃዎችን መርምረው በ48 ሰዓት ውስጥ ውሳኔ ይሰጣሉ።",
      om: "Araarsitoonni olaanoon injinariingii, dizaayinii fi seeraa Itoophiyaa waliigaltee fi ragaalee SHA-256 qoratanii sa'aatii 48 keessatti murtoo kenna.",
      ti: "ላዕለዎት ኢትዮጵያውያን ሽማግለታት ኢንጂነሪንግ፣ ዲዛይንን ሕግን ዝተፈረመ ውዕልን መርትዖ SHA-256ን መርሚሮም ኣብ 48 ሰዓት ውሳነ ይህቡ።",
    },
    metric: {
      en: "48H BINDING SLA",
      am: "የ48 ሰዓት ቀያዲ SLA",
      om: "SLA MURTII 48H",
      ti: "ቀያዲ SLA 48 ሰዓት",
    },
  },
  {
    id: "sla-ringfence",
    name: {
      en: "1:1 NBE Escrow Custody",
      am: "1:1 የብሔራዊ ባንክ ኤስክሮ ጥበቃ",
      om: "Eegumsa Iskuuroo NBE 1:1",
      ti: "1:1 ሓለዋ ኤስክሮ ብሄራዊ ባንኪ",
    },
    role: {
      en: "CAPITAL RINGFENCING · ZERO REHYPOTHECATION",
      am: "የገንዘብ ጥበቃ · ያልተነካ ተቀማጭ",
      om: "EEGUMSA MAALLAQAA · QABIIYYEE QULQULLUU",
      ti: "ሓለዋ ርእሰ-ማል · ዘይትንከፍ ተቐማጢ",
    },
    quote: {
      en: "Every Ethiopian Birr locked in a YeKis contract sits 1:1 in segregated commercial trust accounts—ready for instant Telebirr or CBE Birr settlement.",
      am: "በYeKis ውል ውስጥ የተቀመጠ እያንዳንዱ ብር 1:1 በተለየ የባንክ የአደራ ሂሳብ ይጠበቃል—ለፈጣን የቴሌብር ወይም የCBE ብር ክፍያ ዝግጁ።",
      om: "Birriin Itoophiyaa waliigaltee YeKis keessatti qabame hundi 1:1 herrega amanamaa qophaa keessatti eegama—kaffaltii Telebirr ykn CBE Birr battalaaf qophii dha.",
      ti: "ኣብ ውዕል YeKis ዝተዓጽወ ነፍሲ ወከፍ ብር 1:1 ኣብ ዝተፈልየ ናይ ሓደራ ሕሳብ ባንኪ ይሕሎ—ንቅልጡፍ ክፍሊት ቴሌብር ወይ CBE ብር ድሉው።",
    },
    metric: {
      en: "1:1 ETB RESERVE",
      am: "1:1 የብር መጠባበቂያ",
      om: "KUUSAA ETB 1:1",
      ti: "1:1 መጠባበቒ ETB",
    },
  },
];

const FAQ_COPY: Record<
  Language,
  {
    home: string;
    helpGovernance: string;
    topicPrefix: string;
    categoryLabels: Record<"all" | FAQCategoryId, string>;
    feesTag: string;
    feeSchedule: string;
    legalTag: string;
    terms: string;
    heroLine1: string;
    heroBrace: string;
    heroLine2: string;
    heroLeftPill: string;
    heroRightPill: string;
    scrollDown: string;
    clarityBraceWord: string;
    manifestoSegments: { text: string; highlight?: boolean }[];
    searchPlaceholder: string;
    clear: string;
    pressSlash: string;
    kpiEscrow: string;
    kpiTelebirr: string;
    kpiAutoRelease: string;
    questionsKicker: string;
    allTabPrefix: string;
    inspectFeeCalculator: string;
    topicsKicker: string;
    covenantsKicker: string;
    readDossiers: string;
    liveDeskKicker: string;
    outroTitle: string;
    askSupport: string;
    startContract: string;
  }
> = {
  en: {
    home: "Home",
    helpGovernance: "Help & Governance",
    topicPrefix: "Topic ·",
    categoryLabels: {
      all: "ALL",
      escrow: "ESCROW",
      payouts: "PAYOUTS",
      disputes: "DISPUTES",
      verification: "FAYDA ID",
      tax: "ERCA TAX",
    },
    feesTag: "FEES",
    feeSchedule: "Fee Schedule",
    legalTag: "LEGAL",
    terms: "Terms",
    heroLine1: "we make",
    heroBrace: "{escrow}",
    heroLine2: "clear before you start",
    heroLeftPill: "{ Escrow Locks } ↗",
    heroRightPill: "{ Instant Payouts } ↗",
    scrollDown: "Scroll down ↓",
    clarityBraceWord: "CLARITY",
    manifestoSegments: [
      { text: "Every rule in the YeKis ledger is engineered for" },
      { text: "predictable ETB settlement", highlight: true },
      { text: "—protecting talent and buyers alike." },
    ],
    searchPlaceholder: "Search Telebirr, 120h auto-release, Fayda ID, ERCA VAT...",
    clear: "CLEAR",
    pressSlash: "PRESS /",
    kpiEscrow: "ESCROW RINGFENCED",
    kpiTelebirr: "TELEBIRR PAYOUT",
    kpiAutoRelease: "AUTO-RELEASE SLA",
    questionsKicker: "QUESTIONS & CLAUSES",
    allTabPrefix: "All",
    inspectFeeCalculator: "Inspect interactive fee calculator ↗",
    topicsKicker: "{ TOPICS }",
    covenantsKicker: "COVENANTS",
    readDossiers: "Read verified escrow dossiers ↗",
    liveDeskKicker: "LIVE DESK",
    outroTitle: "Let’s structure your first ETB milestone.",
    askSupport: "Ask Support Desk ↗",
    startContract: "Start Contract",
  },
  am: {
    home: "መነሻ",
    helpGovernance: "የእገዛ ማዕከል",
    topicPrefix: "ምድብ ·",
    categoryLabels: {
      all: "ሁሉም",
      escrow: "ኤስክሮ",
      payouts: "ክፍያዎች",
      disputes: "ሽምግልና",
      verification: "ፋይዳ ID",
      tax: "ታክስ",
    },
    feesTag: "ክፍያ",
    feeSchedule: "የክፍያ ማስያ",
    legalTag: "ሕግ",
    terms: "የአገልግሎት ውል",
    heroLine1: "ኤስክሮን",
    heroBrace: "{ግልጽ}",
    heroLine2: "ከመጀመርዎ በፊት",
    heroLeftPill: "{ ኤስክሮ } ↗",
    heroRightPill: "{ ቴሌብር ክፍያ } ↗",
    scrollDown: "ጥያቄዎችን ይመልከቱ ↓",
    clarityBraceWord: "ግልጽነት",
    manifestoSegments: [
      { text: "የኢትዮጵያ የዲጂታል ሥራ ውሎች" },
      { text: "ያለምንም ብዥታ እና በኤስክሮ ዋስትና", highlight: true },
      { text: "እንዲፈጸሙ የተነደፉ ናቸው።" },
    ],
    searchPlaceholder: "ቴሌብር፣ ኤስክሮ፣ ፋይዳ ወይም ታክስ ይፈልጉ...",
    clear: "አጽዳ",
    pressSlash: "/ ይጫኑ",
    kpiEscrow: "በኤስክሮ የተጠበቀ",
    kpiTelebirr: "የቴሌብር ክፍያ",
    kpiAutoRelease: "ራስ-ሰር ክፍያ ገደብ",
    questionsKicker: "ተደጋጋሚ ጥያቄዎች",
    allTabPrefix: "ሁሉም",
    inspectFeeCalculator: "የክፍያ ማስያ ይመልከቱ ↗",
    topicsKicker: "{ ዘርፎች }",
    covenantsKicker: "ቃል ኪዳን",
    readDossiers: "የተጠናቀቁ ፕሮጀክቶችን ይመልከቱ ↗",
    liveDeskKicker: "ቀጥታ ድጋፍ",
    outroTitle: "ከቡድናችን ጋር በቀጥታ ይወያዩ።",
    askSupport: "የቀጥታ ድጋፍ ↗",
    startContract: "ውል ይጀምሩ",
  },
  om: {
    home: "Mana",
    helpGovernance: "Gargaarsa & Seera",
    topicPrefix: "Mata Duree ·",
    categoryLabels: {
      all: "HUNDA",
      escrow: "ISKUUROO",
      payouts: "KAFFALTII",
      disputes: "ARAARA",
      verification: "FAYDA ID",
      tax: "GIBIRA ERCA",
    },
    feesTag: "KAFFALTII",
    feeSchedule: "Tarree Kaffaltii",
    legalTag: "SEERA",
    terms: "Waliigaltee",
    heroLine1: "iskuuroo",
    heroBrace: "{ifa}",
    heroLine2: "osoo hin jalqabin goona",
    heroLeftPill: "{ Eegumsa Iskuuroo } ↗",
    heroRightPill: "{ Kaffaltii Saffisaa } ↗",
    scrollDown: "Gaaffilee ilaali ↓",
    clarityBraceWord: "IFTOOMINA",
    manifestoSegments: [
      { text: "Seerri galmee YeKis hundi kan qophaa'eef" },
      { text: "kaffaltii ETB tilmaamamaa", highlight: true },
      { text: "ogeeyyii fi maamiltoota eeguufidha." },
    ],
    searchPlaceholder: "Telebirr, sa'aatii 120, Fayda ID, ERCA VAT barbaadi...",
    clear: "HAQI",
    pressSlash: "/ TUQI",
    kpiEscrow: "ISKUUROO EEGAME",
    kpiTelebirr: "KAFFALTII TELEBIRR",
    kpiAutoRelease: "YEROO GADHIISAA",
    questionsKicker: "GAAFFILEE FI KEEWWATOOTA",
    allTabPrefix: "Hunda",
    inspectFeeCalculator: "Herregaa kaffaltii ilaali ↗",
    topicsKicker: "{ MATA DUREEWWAN }",
    covenantsKicker: "WAADAAWWAN",
    readDossiers: "Piroojektoota mirkanaa'an dubbisi ↗",
    liveDeskKicker: "GARGAARSA KALLATTII",
    outroTitle: "Boqonnaa ETB keessan jalqabaa haa qindeessinu.",
    askSupport: "Deeggarsa Gaafadhu ↗",
    startContract: "Waliigaltee Jalqabi",
  },
  ti: {
    home: "መበገሲ",
    helpGovernance: "ሓገዝን ምምሕዳርን",
    topicPrefix: "ዓውዲ ·",
    categoryLabels: {
      all: "ኩሉ",
      escrow: "ኤስክሮ",
      payouts: "ክፍሊታት",
      disputes: "ዕርቂ",
      verification: "ፋይዳ ID",
      tax: "ግብሪ ERCA",
    },
    feesTag: "ክፍሊት",
    feeSchedule: "መምርሒ ክፍሊት",
    legalTag: "ሕጊ",
    terms: "ውዕል ኣገልግሎት",
    heroLine1: "ኤስክሮ",
    heroBrace: "{ንጹር}",
    heroLine2: "ቅድሚ ምጅማርኩም ንገብሮ",
    heroLeftPill: "{ ሓለዋ ኤስክሮ } ↗",
    heroRightPill: "{ ቅልጡፍ ክፍሊት } ↗",
    scrollDown: "ንታሕቲ ውረድ ↓",
    clarityBraceWord: "ንጹርነት",
    manifestoSegments: [
      { text: "ኣብ መዝገብ YeKis ዘሎ ነፍሲ ወከፍ ሕጊ" },
      { text: "ንርጉጽ ክፍሊት ETB", highlight: true },
      { text: "—ንኽኢላታትን ዓማዊልን ንምሕላው ዝተነድፈ እዩ።" },
    ],
    searchPlaceholder: "ቴሌብር፣ ኤስክሮ፣ ፋይዳ ወይ ግብሪ ድለ...",
    clear: "ኣጽሪ",
    pressSlash: "/ ጠውቕ",
    kpiEscrow: "ብኤስክሮ ዝተሓለወ",
    kpiTelebirr: "ክፍሊት ቴሌብር",
    kpiAutoRelease: "ብቐጥታ መፍነዊ ግዜ",
    questionsKicker: "ሕቶታትን ዓንቀጻትን",
    allTabPrefix: "ኩሉ",
    inspectFeeCalculator: "መስልሒ ክፍሊት ርአ ↗",
    topicsKicker: "{ ዓውድታት }",
    covenantsKicker: "ውዕላት ሓለዋ",
    readDossiers: "ዝተረጋገጹ ፕሮጀክታት ኣንብብ ↗",
    liveDeskKicker: "ቀጥታዊ ደገፍ",
    outroTitle: "ናይ መጀመርታ ምዕራፍ ETB ብሓባር ነዳሉ።",
    askSupport: "ደገፍ ሕተት ↗",
    startContract: "ውዕል ጀምር",
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
  const lang: Language = language;
  const copy = FAQ_COPY[lang] ?? FAQ_COPY.en;
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
      const fields = [
        item.question[lang],
        item.answer[lang],
        item.question.en,
        item.answer.en,
        item.question.am,
        item.answer.am,
        item.question.om,
        item.answer.om,
        item.question.ti,
        item.answer.ti,
      ];
      return fields.some((text) => text.toLowerCase().includes(q));
    });
  }, [activeCategory, searchQuery, lang]);

  const stickyItems: StickyStackItem[] = useMemo(
    () =>
      FAQ_TOPICS.map((topic) => ({
        id: topic.id,
        title: topic.label[lang],
        topChip: topic.topChip[lang],
        kickerBadge: topic.slaBadge[lang],
        artNode: renderTopicArtwork(topic.id, "fluted"),
        rows: topic.rows.map((row) => ({
          label: row.label[lang],
          badge: row.badge[lang],
        })),
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
          <StudioBreadcrumb
            items={[
              {
                label: copy.home,
                onClick: () => onNavigate?.("home"),
              },
              {
                label: copy.helpGovernance,
                onClick: () => questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" }),
              },
              {
                code: copy.categoryLabels[activeCategory],
                label: `${copy.topicPrefix} ${copy.categoryLabels[activeCategory]}`,
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
                  <span>{copy.feesTag}</span>
                  <span>{copy.feeSchedule}</span>
                </button>
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate?.("terms")}
                >
                  <span>{copy.legalTag}</span>
                  <span>{copy.terms}</span>
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
                onClick={() => {
                  setActiveCategory("escrow");
                  questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {renderTopicArtwork("escrow", "hero-left")}
                <span className="cs-hero-hover-pill">
                  {copy.heroLeftPill}
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
                  {copy.heroRightPill}
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
              {copy.scrollDown}
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
              <span className="cs-brace-emblem-word">{copy.clarityBraceWord}</span>
              <span className="cs-brace-emblem-char">{"}"}</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline segments={copy.manifestoSegments} />

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
                  placeholder={copy.searchPlaceholder}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="cs-search-kbd"
                    onClick={() => setSearchQuery("")}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {copy.clear}
                  </button>
                ) : (
                  <span className="cs-search-kbd">{copy.pressSlash}</span>
                )}
              </div>

              {/* Self-Counting Bold KPI Strip (Replaces small text columns) */}
              <AnimatedCountUpStrip
                metrics={[
                  { value: 100, suffix: "%", label: copy.kpiEscrow },
                  { prefix: "< ", value: 45, suffix: "s", label: copy.kpiTelebirr },
                  { value: 120, suffix: "h", label: copy.kpiAutoRelease },
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
              {"{"} {copy.questionsKicker} {"}"}
            </span>

            <div className="cs-works-tabs" role="tablist">
              {(
                [
                  { id: "all", label: `${copy.allTabPrefix} (${FAQ_ITEMS.length})` },
                  { id: "escrow", label: copy.categoryLabels.escrow },
                  { id: "payouts", label: copy.categoryLabels.payouts },
                  { id: "disputes", label: copy.categoryLabels.disputes },
                  { id: "verification", label: copy.categoryLabels.verification },
                  { id: "tax", label: copy.categoryLabels.tax },
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
                        {item.num} · {item.slaMetric[lang]}
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
              {copy.inspectFeeCalculator}
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          BAND 4 — STICKY SCROLL-PINNED { TOPICS } 3-COLUMN STAGE
          ================================================================ */}
      <section className="cs-services-band">
        <StickyScrollServicesStage
          kicker={copy.topicsKicker}
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
                {"{"} {copy.covenantsKicker} {"}"}
              </span>

              <div className="cs-testi-authors">
                {SLA_ASSURANCES.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cs-testi-author-btn ${idx === activeSlaIdx ? "is-active" : ""}`}
                    onClick={() => setActiveSlaIdx(idx)}
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
                  key={activeSla.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  <p className="cs-testi-quote">“{activeSla.quote[lang]}”</p>
                  <div className="cs-testi-role">{activeSla.role[lang]}</div>
                  <button type="button" className="cs-testi-link" onClick={() => onNavigate?.("casestudies")}>
                    {copy.readDossiers}
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
                {"{"} {copy.liveDeskKicker} {"}"}
              </span>
              <h2 className="cs-outro-title">
                {copy.outroTitle}
              </h2>
            </div>

            <div className="cs-outro-brace-stage">
              <span className="cs-outro-giant-brace">{"{"}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" className="cs-outro-pill-btn" onClick={() => openSupportChat()}>
                  {copy.askSupport}
                </button>
                <button
                  type="button"
                  className="cs-outro-pill-btn"
                  style={{ background: "transparent", color: "#f4f7f4", border: "1px solid rgba(255,255,255,0.28)" }}
                  onClick={() => onStart?.("register")}
                >
                  {copy.startContract}
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
