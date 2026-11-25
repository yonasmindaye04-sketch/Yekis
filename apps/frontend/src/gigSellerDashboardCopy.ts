import { type Language } from "./i18n";

export type GigSellerDashboardCopy = {
  categories: Record<string, string>;
  validation: {
    titleMin: string;
    titleMax: string;
    descMin: string;
    descMax: string;
    tagsMax: string;
    duplicateTier: string;
    pkgTitleMin: string;
    pkgDescMin: string;
    deliveryRange: string;
    revisionsRange: string;
    pricePositive: string;
  };
  statusHints: Record<string, string>;
  loadErrorFallback: string;
  gigUpdated: string;
  gigSubmittedReview: string;
  saveErrorFallback: string;
  gigPaused: string;
  gigArchived: string;
  statusErrorFallback: string;
  editSubtitle: string;
  createSubtitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  categoryLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  descriptionCounter: (len: number) => string;
  tagsLabel: string;
  tagsPlaceholder: string;
  tagsHint: string;
  maxRevisionsLabel: string;
  packagesFixedHint: string;
  packagesFlexibleHint: string;
  removePackageAria: (tier: string) => string;
  packageTitlePlaceholder: string;
  pricePlaceholder: string;
  savingBtn: string;
  liveTotalBadge: (live: number, total: number) => string;
  kpiLiveGigs: string;
  kpiLiveGigsSub: string;
  kpiActiveOrders: string;
  kpiActiveOrdersSub: string;
  kpiTotalEarnings: string;
  kpiTotalEarningsSub: string;
  kpiTotalGigs: string;
  kpiTotalGigsSub: string;
  summaryLine: (total: number, live: number, pending: number) => string;
  fromPrice: (formatted: string) => string;
  ratingsCount: (n: number) => string;
  viewsCount: (n: number) => string;
  packagesCount: (n: number) => string;
  archiveSummaryGig: string;
  archiveSummaryStatus: string;
  tiers: Record<string, string>;
};

export const GIG_SELLER_DASHBOARD_COPY: Record<Language, GigSellerDashboardCopy> = {
  en: {
    categories: {
      WEB_APP_DEVELOPMENT: "Web App Development",
      GRAPHIC_DESIGN: "Graphic Design",
      DIGITAL_MARKETING: "Digital Marketing",
      CONTENT_WRITING: "Content Writing",
      TRANSLATION: "Translation",
      DATA_ENTRY: "Data Entry",
    },
    validation: {
      titleMin: "Title must be at least 5 characters.",
      titleMax: "Title cannot exceed 120 characters.",
      descMin:
        "Description must be at least 20 characters — buyers need to know what they get.",
      descMax: "Description cannot exceed 5000 characters.",
      tagsMax: "At most 20 tags.",
      duplicateTier: "Each package tier can only be used once.",
      pkgTitleMin: "Every package needs a title.",
      pkgDescMin:
        "Every package needs a description of at least 5 characters.",
      deliveryRange: "Delivery days must be between 1 and 365.",
      revisionsRange: "Included revisions must be between 0 and 20.",
      pricePositive: "Every package needs a price greater than zero, in ETB.",
    },
    statusHints: {
      DRAFT:
        "Published? Our team reviews every gig before it goes live. You'll be notified once a decision is made.",
      ACTIVE: "Visible in the marketplace and can be ordered.",
      PAUSED: "Hidden from buyers. Archive it if you don't plan to relist.",
      REJECTED:
        "Our team declined this gig. Edit the details and publish a new version.",
      ARCHIVED: "No longer listed.",
    },
    loadErrorFallback: "Could not load your gigs.",
    gigUpdated: "Gig updated.",
    gigSubmittedReview:
      "Gig submitted for review. It appears in the marketplace once our team approves it.",
    saveErrorFallback: "Could not save your gig.",
    gigPaused: "Gig paused.",
    gigArchived: "Gig archived.",
    statusErrorFallback: "Could not change the gig status.",
    editSubtitle: "Update the details buyers see.",
    createSubtitle:
      "Package a service you can deliver. Our team reviews it before it goes live.",
    titleLabel: "Title",
    titlePlaceholder: "I will design a modern logo for your brand",
    categoryLabel: "Category",
    descriptionLabel: "Description",
    descriptionPlaceholder:
      "What the buyer receives, how you work, and what you need from them.",
    descriptionCounter: (len) => `${len}/5000 · minimum 20`,
    tagsLabel: "Tags",
    tagsPlaceholder: "logo, branding, illustrator",
    tagsHint: "Comma separated, up to 20",
    maxRevisionsLabel: "Maximum revisions per order",
    packagesFixedHint: "Package tiers are fixed once a gig is created.",
    packagesFlexibleHint:
      "Offer up to three tiers. Buyers pick one when ordering.",
    removePackageAria: (tier) => `Remove ${tier} package`,
    packageTitlePlaceholder: "Standard logo package",
    pricePlaceholder: "1500",
    savingBtn: "Saving…",
    liveTotalBadge: (live, total) => `${live} Live · ${total} Total`,
    kpiLiveGigs: "Live Gigs",
    kpiLiveGigsSub: "Active in marketplace",
    kpiActiveOrders: "Active Orders",
    kpiActiveOrdersSub: "In progress deliverables",
    kpiTotalEarnings: "Total Earnings",
    kpiTotalEarningsSub: "Net revenue settled",
    kpiTotalGigs: "Total Gigs",
    kpiTotalGigsSub: "Created gig packages",
    summaryLine: (total, live, pending) =>
      `${total} ${total === 1 ? "gig" : "gigs"} · ${live} live · ${pending} awaiting review`,
    fromPrice: (formatted) => `from ${formatted}`,
    ratingsCount: (n) => `${n} ${n === 1 ? "rating" : "ratings"}`,
    viewsCount: (n) => `${n} views`,
    packagesCount: (n) => `${n} ${n === 1 ? "package" : "packages"}`,
    archiveSummaryGig: "Gig",
    archiveSummaryStatus: "Status",
    tiers: { BASIC: "BASIC", STANDARD: "STANDARD", PREMIUM: "PREMIUM" },
  },
  am: {
    categories: {
      WEB_APP_DEVELOPMENT: "የድር መተግበሪያ ልማት",
      GRAPHIC_DESIGN: "ግራፊክ ዲዛይን",
      DIGITAL_MARKETING: "ዲጂታል ማርኬቲንግ",
      CONTENT_WRITING: "የይዘት ጽሑፍ",
      TRANSLATION: "ትርጉም",
      DATA_ENTRY: "የውሂብ ግቤት",
    },
    validation: {
      titleMin: "ርዕስ ቢያንስ 5 ቁምፊዎች መሆን አለበት።",
      titleMax: "ርዕስ ከ120 ቁምፊዎች መብለጥ አይችልም።",
      descMin: "መግለጫ ቢያንስ 20 ቁምፊዎች መሆን አለበት — ገዢዎች ምን እንደሚያገኙ ማወቅ አለባቸው።",
      descMax: "መግለጫ ከ5000 ቁምፊዎች መብለጥ አይችልም።",
      tagsMax: "ቢበዛ 20 መለያዎች።",
      duplicateTier: "እያንዳንዱ የጥቅል ደረጃ አንድ ጊዜ ብቻ መጠቀም ይቻላል።",
      pkgTitleMin: "እያንዳንዱ ጥቅል ርዕስ ያስፈልገዋል።",
      pkgDescMin: "እያንዳንዱ ጥቅል ቢያንስ 5 ቁምፊዎች ያለው መግለጫ ያስፈልገዋል።",
      deliveryRange: "የአቅርቦት ቀናት በ1 እና 365 መካከል መሆን አለባቸው።",
      revisionsRange: "የተካተቱ ማሻሻያዎች በ0 እና 20 መካከል መሆን አለባቸው።",
      pricePositive: "እያንዳንዱ ጥቅል በETB ከዜሮ በላይ ዋጋ ያስፈልገዋል።",
    },
    statusHints: {
      DRAFT:
        "ታትሟል? ቡድናችን እያንዳንዱን ጊግ ከመታተሙ በፊት ይገመግማል። ውሳኔ ሲሰጥ ማሳወቂያ ይደርስዎታል።",
      ACTIVE: "በገበያው ላይ ይታያል እና ሊታዘዝ ይችላል።",
      PAUSED: "ከገዢዎች ተደብቋል። እንደገና ለማውጣት ካላሰቡ በማህደር ያስቀምጡት።",
      REJECTED: "ቡድናችን ይህንን ጊግ ውድቅ አድርጓል። ዝርዝሮቹን ያስተካክሉ እና አዲስ ስሪት ያትሙ።",
      ARCHIVED: "ከእንግዲህ አይዘረዘርም።",
    },
    loadErrorFallback: "ጊጎችዎን መጫን አልተቻለም።",
    gigUpdated: "ጊጉ ተዘምኗል።",
    gigSubmittedReview:
      "ጊጉ ለግምገማ ቀርቧል። ቡድናችን ካጸደቀው በኋላ በገበያው ላይ ይታያል።",
    saveErrorFallback: "ጊግዎን ማስቀመጥ አልተቻለም።",
    gigPaused: "ጊጉ ታግዷል።",
    gigArchived: "ጊጉ በማህደር ተቀምጧል።",
    statusErrorFallback: "የጊጉን ሁኔታ መቀየር አልተቻለም።",
    editSubtitle: "ገዢዎች የሚያዩትን ዝርዝሮች ያዘምኑ።",
    createSubtitle:
      "ሊያቀርቡት የሚችሉትን አገልግሎት ያዘጋጁ። ቡድናችን ከመታተሙ በፊት ይገመግመዋል።",
    titleLabel: "ርዕስ",
    titlePlaceholder: "ለብራንድዎ ዘመናዊ ሎጎ እነድፋለሁ",
    categoryLabel: "ምድብ",
    descriptionLabel: "መግለጫ",
    descriptionPlaceholder: "ገዢው ምን እንደሚያገኝ፣ እንዴት እንደሚሰሩ እና ከእነሱ ምን እንደሚፈልጉ።",
    descriptionCounter: (len) => `${len}/5000 · ቢያንስ 20`,
    tagsLabel: "መለያዎች",
    tagsPlaceholder: "logo, branding, illustrator",
    tagsHint: "በኮማ የተለያዩ፣ እስከ 20",
    maxRevisionsLabel: "በትዕዛዝ ከፍተኛ የማሻሻያ ብዛት",
    packagesFixedHint: "ጊግ ከተፈጠረ በኋላ የጥቅል ደረጃዎች አይቀየሩም።",
    packagesFlexibleHint: "እስከ ሦስት ደረጃዎች ያቅርቡ። ገዢዎች ሲያዙ አንዱን ይመርጣሉ።",
    removePackageAria: (tier) => `የ${tier} ጥቅልን አስወግድ`,
    packageTitlePlaceholder: "መደበኛ የሎጎ ጥቅል",
    pricePlaceholder: "1500",
    savingBtn: "በማስቀመጥ ላይ…",
    liveTotalBadge: (live, total) => `${live} ንቁ · ${total} ጠቅላላ`,
    kpiLiveGigs: "ንቁ ጊጎች",
    kpiLiveGigsSub: "በገበያ ላይ ንቁ የሆኑ",
    kpiActiveOrders: "ንቁ ትዕዛዞች",
    kpiActiveOrdersSub: "በሂደት ላይ ያሉ አቅርቦቶች",
    kpiTotalEarnings: "ጠቅላላ ገቢ",
    kpiTotalEarningsSub: "የተጣራ የተከፈለ ገቢ",
    kpiTotalGigs: "ጠቅላላ ጊጎች",
    kpiTotalGigsSub: "የተፈጠሩ የጊግ ጥቅሎች",
    summaryLine: (total, live, pending) =>
      `${total} ጊጎች · ${live} ንቁ · ${pending} ግምገማ የሚጠብቁ`,
    fromPrice: (formatted) => `ከ${formatted} ጀምሮ`,
    ratingsCount: (n) => `${n} ደረጃዎች`,
    viewsCount: (n) => `${n} እይታዎች`,
    packagesCount: (n) => `${n} ጥቅሎች`,
    archiveSummaryGig: "ጊግ",
    archiveSummaryStatus: "ሁኔታ",
    tiers: { BASIC: "መሠረታዊ", STANDARD: "መደበኛ", PREMIUM: "ፕሪሚየም" },
  },
  om: {
    categories: {
      WEB_APP_DEVELOPMENT: "Misooma App Weebii",
      GRAPHIC_DESIGN: "Dizaayinii Giraafiksii",
      DIGITAL_MARKETING: "Maarkeetingii Dijitaalaa",
      CONTENT_WRITING: "Barreessuu Qabiyyee",
      TRANSLATION: "Hiikkaa Afaanii",
      DATA_ENTRY: "Galmee Daataa",
    },
    validation: {
      titleMin: "Mata dureen yoo xiqqaate arfiiwwan 5 ta'uu qaba.",
      titleMax: "Mata dureen arfiiwwan 120 caaluu hin danda'u.",
      descMin:
        "Ibsi yoo xiqqaate arfiiwwan 20 ta'uu qaba — bittoonni maal akka argatan beekuu qabu.",
      descMax: "Ibsi arfiiwwan 5000 caaluu hin danda'u.",
      tagsMax: "Tagoota baay'inaan 20.",
      duplicateTier: "Sadarkaan paakeejii tokkoon tokkoon si'a tokko qofa fayyadama.",
      pkgTitleMin: "Paakeejiin hundi mata duree barbaada.",
      pkgDescMin: "Paakeejiin hundi ibsa yoo xiqqaate arfii 5 qabu barbaada.",
      deliveryRange: "Guyyoonni dhiyeessaa 1 hanga 365 gidduu ta'uu qabu.",
      revisionsRange: "Fooyya'iinsi dabalame 0 hanga 20 gidduu ta'uu qaba.",
      pricePositive: "Paakeejiin hundi gatii zeeroo olii ETBtiin barbaada.",
    },
    statusHints: {
      DRAFT:
        "Maxxanfameeraa? Gareen keenya giigii hunda osoo hin mul'atin dura ni gamaaggama. Murtoon yoo kenname ni beeksifamtu.",
      ACTIVE: "Gabaa keessatti mul'ata, ajajamuus ni danda'a.",
      PAUSED:
        "Bittoota irraa dhokfameera. Deebistanii baasuu yoo hin karoorfine kuusaa keessa kaa'aa.",
      REJECTED:
        "Gareen keenya giigii kana hin fudhanne. Bal'ina isaa sirreessaa gosa haaraa maxxansaa.",
      ARCHIVED: "Si'achi hin tarreeffamu.",
    },
    loadErrorFallback: "Giigota keessan fe'uun hin danda'amne.",
    gigUpdated: "Giigiin haaromfameera.",
    gigSubmittedReview:
      "Giigiin gamaaggamaaf dhiyaateera. Gareen keenya erga mirkaneessee booda gabaa keessatti mul'ata.",
    saveErrorFallback: "Giigii keessan olkaa'uun hin danda'amne.",
    gigPaused: "Giigiin dhaabameera.",
    gigArchived: "Giigiin kuusaa keessa kaa'ameera.",
    statusErrorFallback: "Haala giigii jijjiiruun hin danda'amne.",
    editSubtitle: "Odeeffannoo bittoonni argan haaromsaa.",
    createSubtitle:
      "Tajaajila dhiyeessuu dandeessan qopheessaa. Gareen keenya osoo hin mul'atin dura ni gamaaggama.",
    titleLabel: "Mata duree",
    titlePlaceholder: "Biraandii keessaniif loogoo ammayyaa nan qopheessa",
    categoryLabel: "Ramaddii",
    descriptionLabel: "Ibsa",
    descriptionPlaceholder:
      "Waan bitataan argatu, akkaataa hojii keessaniifi waan isaan irraa barbaaddan.",
    descriptionCounter: (len) => `${len}/5000 · xiqqaa 20`,
    tagsLabel: "Tagoota",
    tagsPlaceholder: "logo, branding, illustrator",
    tagsHint: "Koomaadhaan adda baafame, hanga 20",
    maxRevisionsLabel: "Fooyya'iinsa olaanaa ajaja tokkoon",
    packagesFixedHint:
      "Sadarkaaleen paakeejii giigiin erga uumamee booda dhaabbataadha.",
    packagesFlexibleHint:
      "Hanga sadarkaa sadii dhiyeessaa. Bittoonni yeroo ajajan tokko filatu.",
    removePackageAria: (tier) => `Paakeejii ${tier} haqi`,
    packageTitlePlaceholder: "Paakeejii loogoo idilee",
    pricePlaceholder: "1500",
    savingBtn: "Olkaa'aa jira…",
    liveTotalBadge: (live, total) => `${live} Banaa · ${total} Waliigala`,
    kpiLiveGigs: "Giigota Banaa",
    kpiLiveGigsSub: "Gabaa keessatti hojjechaa kan jiran",
    kpiActiveOrders: "Ajajoota Banaa",
    kpiActiveOrdersSub: "Hojiiwwan adeemsa irra jiran",
    kpiTotalEarnings: "Galii Waliigalaa",
    kpiTotalEarningsSub: "Galii qulqulluu kaffalame",
    kpiTotalGigs: "Giigota Waliigalaa",
    kpiTotalGigsSub: "Paakeejota giigii uumaman",
    summaryLine: (total, live, pending) =>
      `Giigii ${total} · ${live} banaa · ${pending} gamaaggama eegaa jira`,
    fromPrice: (formatted) => `${formatted} irraa`,
    ratingsCount: (n) => `Madaallii ${n}`,
    viewsCount: (n) => `Ilaalcha ${n}`,
    packagesCount: (n) => `Paakeejii ${n}`,
    archiveSummaryGig: "Giigii",
    archiveSummaryStatus: "Haala",
    tiers: { BASIC: "BU'UURAA", STANDARD: "IDILEE", PREMIUM: "PIRIIMIYAM" },
  },
  ti: {
    categories: {
      WEB_APP_DEVELOPMENT: "ምዕባለ ዌብ ኣፕ",
      GRAPHIC_DESIGN: "ግራፊክ ዲዛይን",
      DIGITAL_MARKETING: "ዲጂታል ማርኬቲንግ",
      CONTENT_WRITING: "ምጽሓፍ ትሕዝቶ",
      TRANSLATION: "ትርጉም",
      DATA_ENTRY: "ምእታው ዳታ",
    },
    validation: {
      titleMin: "ኣርእስቲ ብውሑዱ 5 ፊደላት ክኸውን ኣለዎ።",
      titleMax: "ኣርእስቲ ካብ 120 ፊደላት ክበልጽ ኣይክእልን።",
      descMin:
        "መግለጺ ብውሑዱ 20 ፊደላት ክኸውን ኣለዎ — ዓደግቲ እንታይ ከም ዝረኽቡ ክፈልጡ ኣለዎም።",
      descMax: "መግለጺ ካብ 5000 ፊደላት ክበልጽ ኣይክእልን።",
      tagsMax: "ብዝበዝሐ 20 መለለይታት።",
      duplicateTier: "ነፍሲ ወከፍ ብርኪ ፓኬጅ ሓንሳብ ጥራይ ክጥቀም ይከኣል።",
      pkgTitleMin: "ነፍሲ ወከፍ ፓኬጅ ኣርእስቲ የድልዮ።",
      pkgDescMin: "ነፍሲ ወከፍ ፓኬጅ ብውሑዱ 5 ፊደላት ዘለዎ መግለጺ የድልዮ።",
      deliveryRange: "መዓልታት ርኽክብ ኣብ መንጎ 1ን 365ን ክኾኑ ኣለዎም።",
      revisionsRange: "ዝተሓወሱ ምምሕያሻት ኣብ መንጎ 0ን 20ን ክኾኑ ኣለዎም።",
      pricePositive: "ነፍሲ ወከፍ ፓኬጅ ብETB ካብ ዜሮ ንላዕሊ ዋጋ የድልዮ።",
    },
    statusHints: {
      DRAFT:
        "ተዘርጊሑ? ጉጅለና ነፍሲ ወከፍ ጊግ ቅድሚ ምዝርግሑ ይግምግሞ። ውሳነ ምስ ተዋህበ ክንሕብረኩም ኢና።",
      ACTIVE: "ኣብ ዕዳጋ ይርአን ክእዘዝ ይኽእልን።",
      PAUSED: "ካብ ዓደግቲ ተሓቢኡ ኣሎ። እንደገና ክተውጽእዎ እንተዘይሓሲብኩም ኣብ ማህደር ኣቐምጥዎ።",
      REJECTED: "ጉጅለና ነዚ ጊግ ነጺግዎ። ዝርዝራት ኣመሓይሹ እሞ ሓድሽ ሕታም ዘርግሑ።",
      ARCHIVED: "ደጊሙ ኣይዝርዘርን።",
    },
    loadErrorFallback: "ጊጋትኩም ምጽዓን ኣይተኻእለን።",
    gigUpdated: "ጊግ ተሓዲሱ።",
    gigSubmittedReview:
      "ጊግ ንግምገማ ቀሪቡ። ጉጅለና ምስ ኣጽደቖ ኣብ ዕዳጋ ይርአ።",
    saveErrorFallback: "ጊግኩም ምዕቃብ ኣይተኻእለን።",
    gigPaused: "ጊግ ደው ኢሉ።",
    gigArchived: "ጊግ ኣብ ማህደር ተቐሚጡ።",
    statusErrorFallback: "ኩነታት ጊግ ምቕያር ኣይተኻእለን።",
    editSubtitle: "ዓደግቲ ዝርእይዎ ዝርዝራት ኣሐድሱ።",
    createSubtitle:
      "ከተቕርብዎ እትኽእሉ ኣገልግሎት ኣዳልዉ። ጉጅለና ቅድሚ ምዝርግሑ ይግምግሞ።",
    titleLabel: "ኣርእስቲ",
    titlePlaceholder: "ንብራንድኹም ዘመናዊ ሎጎ ክነድፍ እየ",
    categoryLabel: "ምድብ",
    descriptionLabel: "መግለጺ",
    descriptionPlaceholder:
      "ዓዳጋይ እንታይ ከም ዝረክብ፣ ከመይ ከም እትሰርሑን ካብኦም እንታይ ከም እትደልዩን።",
    descriptionCounter: (len) => `${len}/5000 · ብውሑዱ 20`,
    tagsLabel: "መለለይታት",
    tagsPlaceholder: "logo, branding, illustrator",
    tagsHint: "ብኮማ ዝተፈላለየ፣ ክሳብ 20",
    maxRevisionsLabel: "ዝለዓለ ምምሕያሻት ብትእዛዝ",
    packagesFixedHint: "ጊግ ምስ ተፈጥረ ብርክታት ፓኬጅ ኣይቅየሩን።",
    packagesFlexibleHint: "ክሳብ ሰለስተ ብርክታት ኣቕርቡ። ዓደግቲ ክእዝዙ ከለዉ ሓደ ይመርጹ።",
    removePackageAria: (tier) => `ፓኬጅ ${tier} ኣወግድ`,
    packageTitlePlaceholder: "ስሩዕ ፓኬጅ ሎጎ",
    pricePlaceholder: "1500",
    savingBtn: "ይዕቀብ ኣሎ…",
    liveTotalBadge: (live, total) => `${live} ንጡፍ · ${total} ጠቕላላ`,
    kpiLiveGigs: "ንጡፋት ጊጋት",
    kpiLiveGigsSub: "ኣብ ዕዳጋ ንጡፋት",
    kpiActiveOrders: "ንጡፋት ትእዛዛት",
    kpiActiveOrdersSub: "ኣብ ከይዲ ዘለዉ ርኽክባት",
    kpiTotalEarnings: "ጠቕላላ እቶት",
    kpiTotalEarningsSub: "ዝተኸፍለ ጽሩይ እቶት",
    kpiTotalGigs: "ጠቕላላ ጊጋት",
    kpiTotalGigsSub: "ዝተፈጥሩ ፓኬጃት ጊግ",
    summaryLine: (total, live, pending) =>
      `${total} ጊጋት · ${live} ንጡፍ · ${pending} ግምገማ ዝጽበዩ`,
    fromPrice: (formatted) => `ካብ ${formatted}`,
    ratingsCount: (n) => `${n} ደረጃታት`,
    viewsCount: (n) => `${n} ትርኢታት`,
    packagesCount: (n) => `${n} ፓኬጃት`,
    archiveSummaryGig: "ጊግ",
    archiveSummaryStatus: "ኩነታት",
    tiers: { BASIC: "መሰረታዊ", STANDARD: "ስሩዕ", PREMIUM: "ፕሪሚየም" },
  },
};
