import { type Language } from "./i18n";

export type ReviewSource = "google" | "trustpilot";

export type MemberReview = {
  source: ReviewSource;
  rating: number;
  quote: string;
  name: string;
  meta: string;
  when: string;
  tone: 1 | 2 | 3 | 4 | 5;
};

type ReviewText = Pick<MemberReview, "quote" | "name" | "meta" | "when">;

const REVIEW_BASE: { source: ReviewSource; rating: number; tone: 1 | 2 | 3 | 4 | 5 }[] = [
  { source: "google", rating: 5, tone: 1 },
  { source: "trustpilot", rating: 5, tone: 2 },
  { source: "google", rating: 4, tone: 3 },
  { source: "trustpilot", rating: 5, tone: 4 },
  { source: "google", rating: 5, tone: 5 },
  { source: "trustpilot", rating: 5, tone: 1 },
  { source: "google", rating: 5, tone: 2 },
  { source: "trustpilot", rating: 4, tone: 3 },
  { source: "google", rating: 5, tone: 4 },
  { source: "google", rating: 5, tone: 5 },
  { source: "trustpilot", rating: 5, tone: 1 },
  { source: "google", rating: 5, tone: 2 },
];

const REVIEWS_TEXT_BY_LANG: Record<Language, ReviewText[]> = {
  en: [
    {
      quote:
        "As a freelancer in Bahir Dar, getting paid used to be the hardest part. Now funds land in my wallet the moment the client approves.",
      name: "Abel T.",
      meta: "Full-stack developer",
      when: "2 weeks ago",
    },
    {
      quote:
        "Escrow on every contract means I never chase invoices again. The payout to my local bank is quicker than my old platform ever managed.",
      name: "Meron G.",
      meta: "Brand designer · Addis Ababa",
      when: "a month ago",
    },
    {
      quote:
        "Clear milestones, clear fees, no surprises. Support answered my payout question in Amharic within the hour — that meant a lot.",
      name: "Dawit B.",
      meta: "Mobile developer",
      when: "3 weeks ago",
    },
    {
      quote:
        "We hired three developers through YEKIS last quarter. Approving a milestone releases payment instantly; our contractors stopped asking about delays.",
      name: "Hanna L.",
      meta: "Startup founder",
      when: "2 months ago",
    },
    {
      quote:
        "The wallet view is the best part — pending, escrowed and released amounts at a glance. Invoicing used to take me a whole evening.",
      name: "Samuel K.",
      meta: "Data analyst · Hawassa",
      when: "a week ago",
    },
    {
      quote:
        "Dispute handling was fair and fast when scope changed mid-project. Both sides saw exactly what was agreed in the milestone trail.",
      name: "Lidia F.",
      meta: "Content strategist",
      when: "3 months ago",
    },
    {
      quote:
        "I switched from Upwork because the fees were eating me alive. YEKIS is transparent about what I pay and clients see the same numbers.",
      name: "Yonas M.",
      meta: "DevOps engineer",
      when: "5 days ago",
    },
    {
      quote:
        "Onboarding my studio took one afternoon. Contracts, escrow and payouts in one place — my accountant is happier too.",
      name: "Betty A.",
      meta: "Studio owner · Mekelle",
      when: "6 weeks ago",
    },
    {
      quote:
        "Client approved at 9pm, money was in my wallet before I closed the laptop. That has never happened to me on any other platform.",
      name: "Kalid H.",
      meta: "Flutter developer",
      when: "4 days ago",
    },
    {
      quote:
        "I funded escrow on a Friday and the first milestone was approved by Tuesday. No chasing, no awkward money conversations.",
      name: "Hanna G.",
      meta: "Founder, import & retail",
      when: "3 days ago",
    },
    {
      quote:
        "We had one disagreement about scope. Support reviewed the brief and messages and settled it in two days — fairly.",
      name: "Sara M.",
      meta: "Marketing lead, NGO",
      when: "1 month ago",
    },
    {
      quote:
        "Milestones, invoices and payouts live in the same tab now. My clients see exactly where every birr is sitting.",
      name: "Nardos A.",
      meta: "Backend engineer · Dire Dawa",
      when: "2 weeks ago",
    },
  ],
  am: [
    {
      quote:
        "ባህር ዳር ውስጥ ለሚሠራ ባለሙያ ክፍያ ማግኘት በጣም ከባድ ነበር። አሁን ደንበኛው ሲያጸድቅ ገንዘቡ ወዲያውኑ ዋሌቴ ውስጥ ይገባል።",
      name: "አቤል ተ.",
      meta: "ፉል-ስታክ ገንቢ",
      when: "ከ2 ሳምንት በፊት",
    },
    {
      quote:
        "በእያንዳንዱ ውል ላይ ኤስክሮ መኖሩ ደረሰኝ እያሳደድኩ እንዳልጠይቅ አድርጎኛል። ወደ ሀገር ውስጥ ባንክ የሚገባው ክፍያ ከቀድሞው ፕላትፎርም በጣም ፈጣን ነው።",
      name: "ሜሮን ግ.",
      meta: "የብራንድ ዲዛይነር · አዲስ አበባ",
      when: "ከ1 ወር በፊት",
    },
    {
      quote:
        "ግልጽ ምዕራፎች፣ ግልጽ ክፍያ፣ ምንም ያልተጠበቀ ነገር የለም። የድጋፍ ቡድኑ በአማርኛ በአንድ ሰዓት ውስጥ መልስ ሰጥቶኛል።",
      name: "ዳዊት ብ.",
      meta: "የሞባይል ገንቢ",
      when: "ከ3 ሳምንት በፊት",
    },
    {
      quote:
        "ባለፈው ሩብ ዓመት በYeKis ሦስት ገንቢዎችን ቀጥረናል። ምዕራፍ ሲጸድቅ ክፍያ ወዲያው ስለሚለቀቅ መዘግየት የለም።",
      name: "ሃና ል.",
      meta: "የስታርትአፕ መስራች",
      when: "ከ2 ወር በፊት",
    },
    {
      quote:
        "የዋሌት እይታው ምርጡ ክፍል ነው — በመጠባበቅ ላይ ያለ፣ በኤስክሮ የተያዘ እና የተለቀቀ ገንዘብ በአንድ ጊዜ ይታያል።",
      name: "ሳሙኤል ክ.",
      meta: "የዳታ ተንታኝ · ሀዋሳ",
      when: "ከ1 ሳምንት በፊት",
    },
    {
      quote:
        "በፕሮጀክቱ መካከል የሥራ ወሰን ሲቀየር የክርክር አፈታቱ ፍትሐዊ እና ፈጣን ነበር። ሁለቱም ወገን የተስማሙበትን በግልጽ አይተዋል።",
      name: "ሊድያ ፍ.",
      meta: "የይዘት ስትራቴጂስት",
      when: "ከ3 ወር በፊት",
    },
    {
      quote:
        "ክፍያው ከመጠን በላይ ስለነበር ከUpwork ቀየርኩ። YeKis የምከፍለው ግልጽ ነው፤ ደንበኞችም ተመሳሳዩን ያያሉ።",
      name: "ዮናስ መ.",
      meta: "DevOps ኢንጂነር",
      when: "ከ5 ቀን በፊት",
    },
    {
      quote:
        "ስቱዲዮዬን መመዝገብ አንድ ከሰዓት ብቻ ነው የወሰደው። ውሎች፣ ኤስክሮ እና ክፍያ በአንድ ቦታ — የሂሳብ ባለሙያዬም ተደስቷል።",
      name: "ቤቲ አ.",
      meta: "የስቱዲዮ ባለቤት · መቀሌ",
      when: "ከ6 ሳምንት በፊት",
    },
    {
      quote:
        "ደንበኛው ምሽት 3 ሰዓት ላይ አጸደቀ፤ ላፕቶፔን ከመዝጋቴ በፊት ገንዘቡ ዋሌቴ ውስጥ ገባ። ይህ በሌላ ፕላትፎርም አጋጥሞኝ አያውቅም።",
      name: "ካሊድ ሀ.",
      meta: "Flutter ገንቢ",
      when: "ከ4 ቀን በፊት",
    },
    {
      quote:
        "ዓርብ ቀን ኤስክሮ አስያዝኩ፣ የመጀመሪያው ምዕራፍ ማክሰኞ ጸደቀ። ምንም ማሳደድ እና አስቸጋሪ የገንዘብ ንግግር የለም።",
      name: "ሃና ግ.",
      meta: "መስራች፣ አስመጪ እና ቸርቻሪ",
      when: "ከ3 ቀን በፊት",
    },
    {
      quote:
        "ስለ ሥራ ወሰን አንድ አለመግባባት ነበረን። የድጋፍ ቡድኑ ዝርዝሩን እና መልዕክቶችን ገምግሞ በሁለት ቀን በፍትሐዊነት ፈታው።",
      name: "ሳራ መ.",
      meta: "የማርኬቲንግ መሪ፣ NGO",
      when: "ከ1 ወር በፊት",
    },
    {
      quote:
        "ምዕራፎች፣ ደረሰኞች እና ክፍያዎች አሁን በአንድ ትር ውስጥ ይገኛሉ። ደንበኞቼ እያንዳንዱ ብር የት እንዳለ በግልጽ ያያሉ።",
      name: "ናርዶስ አ.",
      meta: "ባክኤንድ ኢንጂነር · ድሬዳዋ",
      when: "ከ2 ሳምንት በፊት",
    },
  ],
  om: [
    {
      quote:
        "Baahir Daar keessatti ogeessa bilisaaf kaffaltii argachuun baay'ee ulfaataa ture. Amma yeroo maamilli mirkaneessu maallaqni battalumatti wallet koo seena.",
      name: "Abel T.",
      meta: "Misoomsaa Full-stack",
      when: "Torban 2 dura",
    },
    {
      quote:
        "Waliigaltee hunda irratti iskuuroon jiraachuun nagahee duuka bu'uu na oolcheera. Baankii naannootti kaffaltiin ariitiidha.",
      name: "Meron G.",
      meta: "Dizaayinara Biraandii · Finfinnee",
      when: "Ji'a 1 dura",
    },
    {
      quote:
        "Boqonnaawwan ifaa fi kaffaltii ifaa. Deeggarsi sa'aatii tokko keessatti Afaan Oromoo fi Amaaraan naaf deebise.",
      name: "Dawit B.",
      meta: "Misoomsaa Moobaayilaa",
      when: "Torban 3 dura",
    },
    {
      quote:
        "Kurmaana darbe YeKis dhaan misoomsitoota sadii qacarre. Boqonnaa mirkaneessuun battalumatti kaffaltii gadhiisa.",
      name: "Hanna L.",
      meta: "Hundeessituu Startup",
      when: "Ji'a 2 dura",
    },
    {
      quote:
        "Mul'anni wallet baay'ee gaariidha — maallaqni eegamaa jiru, iskuuroo keessa jiruu fi gadhiifame altokkotti mul'ata.",
      name: "Samuel K.",
      meta: "Xiinxalaa Daataa · Hawaasaa",
      when: "Torban 1 dura",
    },
    {
      quote:
        "Yeroo daangaan hojii gidduutti jijjiiramu furmaanni falmii haqa qabeessaa fi saffisaa ture.",
      name: "Lidia F.",
      meta: "Tarsiimoo Qabiyyee",
      when: "Ji'a 3 dura",
    },
    {
      quote:
        "Kaffaltiin Upwork baay'ee waan guddaa tureef gara YeKis tti jijjiire. Waan kaffalu hundi ifaadha.",
      name: "Yonas M.",
      meta: "Injinara DevOps",
      when: "Guyyaa 5 dura",
    },
    {
      quote:
        "Istudiyoo koo galmeessuun sa'aatii muraasa qofa fudhate. Waliigaltee, iskuuroo fi kaffaltiin iddoo tokko jira.",
      name: "Betty A.",
      meta: "Abbaa Istudiyoo · Maqalee",
      when: "Torban 6 dura",
    },
    {
      quote:
        "Maamilli galgala sa'aatii 3 irratti mirkaneesse, osoo laaptoppii hin cufin maallaqni wallet koo gale.",
      name: "Kalid H.",
      meta: "Misoomsaa Flutter",
      when: "Guyyaa 4 dura",
    },
    {
      quote:
        "Jimaata iskuuroo galchee Kibxata boqonnaan jalqabaa mirkanaa'e. Haasaan maallaqaa rakkisaa hin jiru.",
      name: "Hanna G.",
      meta: "Hundeessituu daldalaa",
      when: "Guyyaa 3 dura",
    },
    {
      quote:
        "Daangaa hojii irratti wal-dhabdeen tokko uumamee ture. Deeggarsi ibsa hojii ilaalee guyyaa lama keessatti haqaan fure.",
      name: "Sara M.",
      meta: "Hogganaa Maarkeetingii, NGO",
      when: "Ji'a 1 dura",
    },
    {
      quote:
        "Boqonnaawwan, nagaheen fi kaffaltiin amma tarree tokko keessa jiru. Maamilli koo Birriin hundi eessa akka jiru ifatti arga.",
      name: "Nardos A.",
      meta: "Injinara Backend · Dirree Dhawaa",
      when: "Torban 2 dura",
    },
  ],
  ti: [
    {
      quote:
        "ኣብ ባህር ዳር ንዝሰርሕ ፍሪላንሰር ክፍሊት ምርካብ ዝኸበደ ነይሩ። ሕጂ ዓሚል ምስ ኣጽደቐ ገንዘብ ብኡንብኡ ናብ ዋሌተይ ይኣቱ።",
      name: "ኣቤል ተ.",
      meta: "ፉል-ስታክ ዲቨሎፐር",
      when: "ቅድሚ 2 ሰሙን",
    },
    {
      quote:
        "ኣብ ነፍሲ ወከፍ ውዕል ኤስክሮ ምህላዉ ደረሰኝ ምድላይ ኣትሪፉለይ። ናብ ባንኪ ሃገረይ ዝኣቱ ክፍሊት ካብ ዝኾነ መድረኽ ይቅልጥፍ።",
      name: "ሜሮን ግ.",
      meta: "ዲዛይነር ብራንድ · ኣዲስ ኣበባ",
      when: "ቅድሚ 1 ወርሒ",
    },
    {
      quote:
        "ንጹራት ምዕራፋትን ንጹር ክፍሊትን። ጉጅለ ደገፍ ኣብ ውሽጢ ሰዓት መልሲ ሂቡኒ — እዚ ዓቢ ትርጉም ኣለዎ።",
      name: "ዳዊት ብ.",
      meta: "ዲቨሎፐር ሞባይል",
      when: "ቅድሚ 3 ሰሙን",
    },
    {
      quote:
        "ኣብ ዝሓለፈ ርብዒ ዓመት ብYeKis ሰለስተ ዲቨሎፐራት ቆጺርና። ምዕራፍ ምስ ጸደቐ ክፍሊት ብኡንብኡ ስለ ዝፍኖ ምድንጓይ የለን።",
      name: "ሃና ል.",
      meta: "መስራቲት Startup",
      when: "ቅድሚ 2 ወርሒ",
    },
    {
      quote:
        "ትርኢት ዋሌት እቲ ዝበለጸ ክፋል እዩ — ዝጽበ፣ ኣብ ኤስክሮ ዘሎን ዝተፈነወን መጠን ብሓንሳብ ይረአ።",
      name: "ሳሙኤል ክ.",
      meta: "ተንታኒ ዳታ · ሃዋሳ",
      when: "ቅድሚ 1 ሰሙን",
    },
    {
      quote:
        "ስፍሓት ስራሕ ኣብ ማእከል ምስ ተቐየረ ኣፈታትሓ ክትዕ ፍትሓውን ቅልጡፍን ነይሩ።",
      name: "ሊድያ ፍ.",
      meta: "ስትራተጂስት ትሕዝቶ",
      when: "ቅድሚ 3 ወርሒ",
    },
    {
      quote:
        "ክፍሊት Upwork ብዙሕ ስለ ዝነበረ ናብ YeKis ቀዪረ። ክንደይ ከም ዝኸፍል ንጹር እዩ።",
      name: "ዮናስ መ.",
      meta: "ኢንጂነር DevOps",
      when: "ቅድሚ 5 መዓልቲ",
    },
    {
      quote:
        "ስቱድዮይ ምምዝጋብ ሓደ ድሕሪ ቀትሪ ጥራይ ወሲዱ። ውዕላት፣ ኤስክሮን ክፍሊትን ኣብ ሓደ ቦታ ኣለዉ።",
      name: "ቤቲ ኣ.",
      meta: "ወናኒት ስቱድዮ · መቐለ",
      when: "ቅድሚ 6 ሰሙን",
    },
    {
      quote:
        "ዓሚል ሰዓት 3 ምሸት ኣጽዲቑ፣ ላፕቶፐይ ከይዓጸኹ ገንዘብ ኣብ ዋሌተይ ኣትዩ።",
      name: "ካሊድ ሀ.",
      meta: "ዲቨሎፐር Flutter",
      when: "ቅድሚ 4 መዓልቲ",
    },
    {
      quote:
        "ዓርቢ ኤስክሮ ኣእትየ፣ ሰሉስ ቀዳማይ ምዕራፍ ጸዲቑ። ዝኾነ ምድላው ወይ ጸገም ገንዘብ የለን።",
      name: "ሃና ግ.",
      meta: "መስራቲት ንግዲ",
      when: "ቅድሚ 3 መዓልቲ",
    },
    {
      quote:
        "ብዛዕባ ስፍሓት ስራሕ ሓደ ዘይምስምማዕ ነይሩ። ደገፍ ነቲ ዝርዝር መርሚሩ ኣብ ክልተ መዓልቲ ብፍትሓውነት ፈቲሕዎ።",
      name: "ሳራ መ.",
      meta: "መራሒት ማርኬቲንግ፣ NGO",
      when: "ቅድሚ 1 ወርሒ",
    },
    {
      quote:
        "ምዕራፋት፣ ደረሰኛትን ክፍሊታትን ሕጂ ኣብ ሓደ ቦታ ኣለዉ። ዓማዊለይ ነፍሲ ወከፍ ብር ኣበይ ከም ዘሎ ብንጹር ይርእዩ።",
      name: "ናርዶስ ኣ.",
      meta: "ኢንጂነር Backend · ድሬዳዋ",
      when: "ቅድሚ 2 ሰሙን",
    },
  ],
};

export function getLandingReviews(language: Language): MemberReview[] {
  const texts = REVIEWS_TEXT_BY_LANG[language] ?? REVIEWS_TEXT_BY_LANG.en;
  return REVIEW_BASE.map((base, idx) => ({
    ...base,
    ...texts[idx],
  }));
}

export type EscrowRowCopy = { bold: string; small: string };

export const ESCROW_STEP_ROWS_BY_LANG: Record<Language, EscrowRowCopy[][]> = {
  en: [
    [
      { bold: "Balance locked in escrow", small: "Held safely — never sent until you approve" },
      { bold: "Deposit · Telebirr 0911 ••• 421", small: "ETB 96,000 reserved for milestone 2 of 4" },
      { bold: "Protection on", small: "Active from the second the deposit lands" },
    ],
    [
      { bold: "3 deliverables uploaded", small: "addis-cafe-menu.fig · launch-poster.pdf · amharic-copy.docx" },
      { bold: "Review notes attached", small: "Context for every file, so feedback stays sharp" },
      { bold: "48h review window", small: "Gentle reminders if a review goes quiet" },
    ],
    [
      { bold: "ETB 96,000 released to Selam T.", small: "One tap — paid straight to her Telebirr wallet" },
      { bold: "Receipt issued automatically", small: "Telebirr receipt saved for both sides" },
      { bold: "0-day wait", small: "No invoices, no chasing, no awkward emails" },
    ],
    [
      { bold: "Yekis mediates with evidence", small: "Brief, versions and messages auto-collected" },
      { bold: "Full audit trail", small: "Every revision and message, time-stamped" },
      { bold: "Partial release only when fair", small: "Money moves exactly as the resolution says" },
    ],
  ],
  am: [
    [
      { bold: "ቀሪ ሂሳብ በኤስክሮ ተቆልፏል", small: "በደህንነት ተይዟል — እስኪያጸድቁ ድረስ አይላክም" },
      { bold: "ተቀማጭ · ቴሌብር 0911 ••• 421", small: "96,000 ብር ለምዕራፍ 2 ከ4 ተይዟል" },
      { bold: "ጥበቃው ነቅቷል", small: "ገንዘቡ ከገባበት ሰከንድ ጀምሮ ይሠራል" },
    ],
    [
      { bold: "3 የሥራ ውጤቶች ተጭነዋል", small: "addis-cafe-menu.fig · launch-poster.pdf · amharic-copy.docx" },
      { bold: "የግምገማ ማስታወሻዎች ተያይዘዋል", small: "አስተያየት ግልጽ እንዲሆን ለእያንዳንዱ ፋይል ማብራሪያ" },
      { bold: "የ48 ሰዓት የግምገማ ጊዜ", small: "ግምገማው ከዘገየ ረጋ ያለ ማስታወሻ ይላካል" },
    ],
    [
      { bold: "96,000 ብር ለሰላም ተ. ተለቋል", small: "በአንድ ንክኪ — በቀጥታ ወደ ቴሌብር ዋሌቷ ገብቷል" },
      { bold: "ደረሰኝ በራስ-ሰር ተሰጥቷል", small: "የቴሌብር ደረሰኝ ለሁለቱም ወገን ተቀምጧል" },
      { bold: "ምንም መጠበቅ የለም (0 ቀን)", small: "ደረሰኝ ማሳደድም ሆነ አስቸጋሪ ኢሜይል የለም" },
    ],
    [
      { bold: "YeKis በማስረጃ ያሸማግላል", small: "መግለጫው፣ እትሞቹ እና መልዕክቶች በራስ-ሰር ይሰበሰባሉ" },
      { bold: "ሙሉ የኦዲት መዝገብ", small: "እያንዳንዱ ማሻሻያ እና መልዕክት በሰዓት የተመዘገበ" },
      { bold: "ፍትሐዊ ሲሆን ብቻ ከፊል ክፍያ", small: "ገንዘቡ በውሳኔው መሠረት ብቻ ይንቀሳቀሳል" },
    ],
  ],
  om: [
    [
      { bold: "Hafeensi iskuuroo keessatti cufameera", small: "Nageenyaan qabame — hanga mirkaneessitutti hin ergamu" },
      { bold: "Kuusaa · Telebirr 0911 ••• 421", small: "ETB 96,000 boqonnaa 2 keessaa 4f qabame" },
      { bold: "Eegumsi banaadha", small: "Sekondii kuusaan seenerraa kaasee hojjeta" },
    ],
    [
      { bold: "Bu'aan hojii 3 fe'amaniiru", small: "addis-cafe-menu.fig · launch-poster.pdf · amharic-copy.docx" },
      { bold: "Yaadannoon gamaaggamaa maxxanfameera", small: "Faayila hundaaf ibsa gabaabaa" },
      { bold: "Yeroo gamaaggamaa sa'aatii 48", small: "Yoo callisame yaadachiisa gaarii erga" },
    ],
    [
      { bold: "ETB 96,000 Selam T.f gadhiifame", small: "Tuqaatii tokkoon — kallattiin wallet Telebirr ishee gale" },
      { bold: "Nagaheen ofumaan ba'e", small: "Nagaheen Telebirr garee lamaaniifuu olkaa'ama" },
      { bold: "Turtii guyyaa 0", small: "Nagahee ari'uu fi imeelii rakkisaa hin qabu" },
    ],
    [
      { bold: "YeKis ragaan araarsa", small: "Ibsa, jijjiirama fi ergaawwan ofumaan walitti qaba" },
      { bold: "Galmee oodiitii guutuu", small: "Sirreeffamni fi ergaan hundi yeroon galmaa'a" },
      { bold: "Haqa qabeessa yoo ta'e qofa gartokkeen gadhiisa", small: "Maallaqni akkaataa murtootiin socho'a" },
    ],
  ],
  ti: [
    [
      { bold: "ሚዛን ኣብ ኤስክሮ ተዓጽዩ", small: "ብውሕስነት ተታሒዙ — ክሳብ እተጽድቑ ኣይለኣኽን" },
      { bold: "ተቐማጢ · ቴሌብር 0911 ••• 421", small: "96,000 ብር ንምዕራፍ 2 ካብ 4 ተዓጽዩ" },
      { bold: "ሓለዋ ተወሊዑ", small: "ገንዘብ ካብ ዝኣተወሉ ካልኢት ጀሚሩ ይሰርሕ" },
    ],
    [
      { bold: "3 ውጽኢታት ስራሕ ተጻዒኖም", small: "addis-cafe-menu.fig · launch-poster.pdf · amharic-copy.docx" },
      { bold: "መግለጺ ገምጋም ተተሓሒዙ", small: "ርእይቶ ንጹር ክኸውን ንነፍሲ ወከፍ ፋይል መብርሂ" },
      { bold: "ናይ 48 ሰዓት መስኮት ገምጋም", small: "ገምጋም እንተደንጉዩ ህዱእ መዘኻኸሪ ይለኣኽ" },
    ],
    [
      { bold: "96,000 ብር ንሰላም ተ. ተፈኒዩ", small: "ብሓንቲ ምጥዋቕ — ብቐጥታ ናብ ዋሌት ቴሌብር ኣትዩ" },
      { bold: "ደረሰኝ ብቐጥታ ወጺኡ", small: "ደረሰኝ ቴሌብር ንኽልቲኦም ወገናት ተዓቂቡ" },
      { bold: "0 መዓልቲ ምጽባይ", small: "ደረሰኝ ምስጓግን ኣጸጋሚ ኢሜይልን የለን" },
    ],
    [
      { bold: "YeKis ብመርትዖ የዓርቕ", small: "ዝርዝር ስራሕ፣ ሕታማትን መልእኽትታትን ብቐጥታ ይእከቡ" },
      { bold: "ምሉእ መዝገብ ኦዲት", small: "ነፍሲ ወከፍ ምምሕያሽን መልእኽትን ብሰዓቱ ዝተመዝገበ" },
      { bold: "ፍትሓዊ ምስ ዝኸውን ጥራይ ክፋል ክፍሊት", small: "ገንዘብ ብውሳነ መሰረት ጥራይ ይንቀሳቐስ" },
    ],
  ],
};

export type LandingV2ExtraCopy = {
  ratingAria: (rating: number) => string;
  escrowAria: string;
  feesEyebrow: string;
  feesTitle: string;
  feesSubtitle: string;
  categoriesAria: string;
  cardDeckAria: string;
  browseCategoryAria: (cat: string, t1: string, t2: string) => string;
  jumpToCategoryAria: string;
  jumpToItemAria: (cat: string) => string;
  ctaAria: string;
  verifiedMemberAria: string;
  aboutVideoAria: string;
  backToTopAria: string;
};

export const LANDING_V2_EXTRA: Record<Language, LandingV2ExtraCopy> = {
  en: {
    ratingAria: (r) => `${r} out of 5`,
    escrowAria: "How YEKIS works, step by step",
    feesEyebrow: "Yekis Jobs",
    feesTitle: "Make ideas visible.",
    feesSubtitle: "Where verified Ethiopian talent and ambitious teams build together.",
    categoriesAria: "Explore expertise",
    cardDeckAria: "Pinned category card stack",
    browseCategoryAria: (cat, t1, t2) => `Browse ${cat}: ${t1} ${t2}`,
    jumpToCategoryAria: "Jump to category",
    jumpToItemAria: (cat) => `Jump to ${cat}`,
    ctaAria: "Call to action",
    verifiedMemberAria: "Verified member",
    aboutVideoAria: "Escrow agreement and guaranteed milestone payout animation",
    backToTopAria: "Back to top",
  },
  am: {
    ratingAria: (r) => `ከ5 ${r} ደረጃ`,
    escrowAria: "YeKis እንዴት እንደሚሠራ፣ ደረጃ በደረጃ",
    feesEyebrow: "YeKis ሥራዎች",
    feesTitle: "ሐሳቦችን እውን ያድርጉ።",
    feesSubtitle: "የተረጋገጡ የኢትዮጵያ ባለሙያዎች እና ታላቅ ቡድኖች በጋራ የሚገነቡበት መድረክ።",
    categoriesAria: "ዘርፎችን ያስሱ",
    cardDeckAria: "የዘርፍ ካርዶች ስብስብ",
    browseCategoryAria: (cat, t1, t2) => `${cat} ይመልከቱ: ${t1} ${t2}`,
    jumpToCategoryAria: "ወደ ዘርፍ ሂድ",
    jumpToItemAria: (cat) => `ወደ ${cat} ሂድ`,
    ctaAria: "ለመጀመር ጥሪ",
    verifiedMemberAria: "የተረጋገጠ አባል",
    aboutVideoAria: "የኤስክሮ ስምምነት እና የምዕራፍ ክፍያ አኒሜሽን",
    backToTopAria: "ወደ ላይ ተመለስ",
  },
  om: {
    ratingAria: (r) => `5 keessaa ${r}`,
    escrowAria: "Akkaataa YeKis itti hojjetu, sadarkaa sadarkaan",
    feesEyebrow: "Hojiiwwan Yekis",
    feesTitle: "Yaada kee ifatti mul'isi.",
    feesSubtitle: "Bakka ogeeyyiin Itoophiyaa mirkanaa'anii fi gareen ciccimoon waliin ijaaran.",
    categoriesAria: "Ogummaa sakatta'i",
    cardDeckAria: "Kaardiiwwan gosa hojii",
    browseCategoryAria: (cat, t1, t2) => `${cat} ilaali: ${t1} ${t2}`,
    jumpToCategoryAria: "Gara gosa hojiitti utaali",
    jumpToItemAria: (cat) => `Gara ${cat} tti utaali`,
    ctaAria: "Waamicha tarkaanfii",
    verifiedMemberAria: "Miseensa mirkanaa'e",
    aboutVideoAria: "Aniimeeshinii waliigaltee iskuuroo fi kaffaltii boqonnaa",
    backToTopAria: "Gara oliitti deebi'i",
  },
  ti: {
    ratingAria: (r) => `ካብ 5 ${r}`,
    escrowAria: "YeKis ከመይ ከም ዝሰርሕ፣ ደረጃ ብደረጃ",
    feesEyebrow: "ስራሕቲ YeKis",
    feesTitle: "ሓሳባት ናብ ግብሪ ቀይር።",
    feesSubtitle: "ዝተረጋገጹ ኢትዮጵያውያን ክኢላታትን ዕላማ ዘለወን ጉጅለታትን ብሓባር ዝሃንጹሉ መድረኽ።",
    categoriesAria: "ዓውድታት ዳህስስ",
    cardDeckAria: "ካርድታት ዓውዲ ስራሕ",
    browseCategoryAria: (cat, t1, t2) => `${cat} ርአ: ${t1} ${t2}`,
    jumpToCategoryAria: "ናብ ዓውዲ ኪድ",
    jumpToItemAria: (cat) => `ናብ ${cat} ኪድ`,
    ctaAria: "ጻውዒት ተግባር",
    verifiedMemberAria: "ዝተረጋገጸ ኣባል",
    aboutVideoAria: "ኣኒሜሽን ስምምዕ ኤስክሮን ክፍሊት ምዕራፍን",
    backToTopAria: "ናብ ላዕሊ ተመለስ",
  },
};
