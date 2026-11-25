import { type Language } from "./i18n";

export type GigMarketplaceCopy = {
  categories: Record<string, string>;
  loadErrorFallback: string;
  orderPlacedNotice: (amountFormatted: string) => string;
  orderFailedFallback: string;
  verifiedFreelancerFallback: string;
  specialistFallback: string;
  specialistBioFallback: string;
  backToMarketplace: string;
  breadcrumbGigs: string;
  reviewsCount: (n: number) => string;
  turnaroundDays: (days: number) => string;
  escrowProtected: string;
  locationEthiopia: string;
  responseTimeBadge: string;
  completenessLabel: (pct: number) => string;
  serviceOverviewHeading: string;
  requirementsHeading: string;
  requiredTag: string;
  faqHeading: string;
  escrowPromiseTitle: string;
  escrowPromiseText: string;
  tiers: Record<string, string>;
  packageSuffix: (tierLabel: string) => string;
  daysDelivery: (days: number) => string;
  revisionsCount: (n: number) => string;
  fundingEscrowBtn: string;
  orderAndPayBtn: (amountFormatted: string) => string;
  orderNote: string;
  noPackagesConfigured: string;
  zeroRiskTitle: string;
  zeroRiskDesc: string;
  ethiopianRailsTitle: string;
  ethiopianRailsDesc: string;
  heroTitle: string;
  heroSubtitle: string;
  trust1Title: string;
  trust1Desc: string;
  trust2Title: string;
  trust2Desc: string;
  trust3Title: string;
  trust3Desc: string;
  navAria: string;
  resetAllServicesTitle: string;
  backAllServicesAria: string;
  servicesCrumb: string;
  selectCategoryAria: string;
  allServices: string;
  clearCategoryTitle: string;
  clearFilterBtn: string;
  servicesCount: (n: number) => string;
  serviceCategoriesAria: string;
  searchPlaceholder: string;
  clearSearchAria: string;
  gigsAvailableCount: (n: number) => string;
  sortAria: string;
  sortOptions: {
    recommended: string;
    rating: string;
    priceAsc: string;
    priceDesc: string;
    delivery: string;
  };
  emptyTitle: string;
  emptyDesc: string;
  resetFiltersBtn: string;
  cardDelivery: (days: number) => string;
  startingAt: string;
  viewPackagesBtn: string;
};

export const GIG_MARKETPLACE_COPY: Record<Language, GigMarketplaceCopy> = {
  en: {
    categories: {
      WEB_APP_DEVELOPMENT: "Web App Development",
      GRAPHIC_DESIGN: "Graphic Design",
      DIGITAL_MARKETING: "Digital Marketing",
      CONTENT_WRITING: "Content Writing",
      TRANSLATION: "Translation",
      DATA_ENTRY: "Data Entry",
      VIDEO_PRODUCTION: "Video Production",
      ACCOUNTING_BOOKKEEPING: "Accounting & Bookkeeping",
      LEGAL_RESEARCH: "Legal Research",
      DATA_ANALYTICS: "Data Analytics",
    },
    loadErrorFallback: "Failed to load gigs.",
    orderPlacedNotice: (amt) =>
      `Order placed and funded (${amt}) via Yekis automated escrow. The freelancer has been notified to begin work.`,
    orderFailedFallback: "Order placement failed.",
    verifiedFreelancerFallback: "Verified Freelancer",
    specialistFallback: "Ethiopian Digital Specialist",
    specialistBioFallback:
      "Professional Ethiopian digital specialist verified on Yekis.",
    backToMarketplace: "Back to Marketplace",
    breadcrumbGigs: "Gigs",
    reviewsCount: (n) => `${n} reviews`,
    turnaroundDays: (days) => `Turnaround: ${days} days`,
    escrowProtected: "Escrow Protected",
    locationEthiopia: "Addis Ababa, Ethiopia",
    responseTimeBadge: "Response time: < 2 hrs",
    completenessLabel: (pct) => `Completeness: ${pct}%`,
    serviceOverviewHeading: "Service Overview",
    requirementsHeading: "What the Freelancer Needs from You",
    requiredTag: "(Required)",
    faqHeading: "Frequently Asked Questions",
    escrowPromiseTitle: "100% Escrow Protection Guarantee",
    escrowPromiseText:
      "Your funds are secured in Yekis automated escrow upon ordering. The freelancer is notified and begins work immediately. Payment is only disbursed to the freelancer once you review and approve the completed deliverables. Supported by standard 7-day cooling-off protection.",
    tiers: { BASIC: "BASIC", STANDARD: "STANDARD", PREMIUM: "PREMIUM" },
    packageSuffix: (tierLabel) => `${tierLabel} Package`,
    daysDelivery: (days) => `${days} Days Delivery`,
    revisionsCount: (n) => `${n} Revisions`,
    fundingEscrowBtn: "Funding Escrow...",
    orderAndPayBtn: (amt) => `Order & Pay ${amt}`,
    orderNote:
      "Instant escrow lock from your Yekis wallet. Direct top-ups available via Telebirr, CBE Birr & M-Pesa.",
    noPackagesConfigured: "No packages currently configured for this gig.",
    zeroRiskTitle: "Zero Risk Escrow",
    zeroRiskDesc: "Funds remain locked until you review the final output.",
    ethiopianRailsTitle: "Ethiopian Banking Rails",
    ethiopianRailsDesc: "Settle seamlessly with local mobile money and banks.",
    heroTitle: "Predefined Gigs, Protected by Escrow",
    heroSubtitle:
      "Browse verified fixed-price gigs from top Ethiopian engineers, designers, writers, and translators. Instant delivery scope, guaranteed turnaround, and automatic escrow protection backed by Telebirr, CBE Birr, and M-Pesa.",
    trust1Title: "100% Escrow Protection",
    trust1Desc:
      "Payment is held in secure trust and only disbursed after your approval.",
    trust2Title: "Direct Ethiopian Rails",
    trust2Desc:
      "Fund orders seamlessly via Telebirr, CBE Birr, and Safaricom M-Pesa.",
    trust3Title: "Guaranteed Turnaround",
    trust3Desc:
      "Pre-agreed milestones, scoped deliverables, and included revisions.",
    navAria: "Category and Service Navigation",
    resetAllServicesTitle: "Reset to all services",
    backAllServicesAria: "Back to all services",
    servicesCrumb: "Services",
    selectCategoryAria: "Select category",
    allServices: "All Services",
    clearCategoryTitle: "Clear selected category filter",
    clearFilterBtn: "Clear filter",
    servicesCount: (n) => `${n} ${n === 1 ? "service" : "services"}`,
    serviceCategoriesAria: "Service categories",
    searchPlaceholder:
      "Search services, skills, or tech (e.g. Telebirr, React, Figma)...",
    clearSearchAria: "Clear search",
    gigsAvailableCount: (n) =>
      `${n} ${n === 1 ? "gig" : "gigs"} available`,
    sortAria: "Sort gigs",
    sortOptions: {
      recommended: "Recommended & Trending",
      rating: "Highest Rated",
      priceAsc: "Price: Low to High",
      priceDesc: "Price: High to Low",
      delivery: "Fastest Turnaround",
    },
    emptyTitle: "No gigs found in this category",
    emptyDesc:
      "Try adjusting your search query or selecting a different service category.",
    resetFiltersBtn: "Reset Filters",
    cardDelivery: (days) => `${days}d delivery`,
    startingAt: "Starting at",
    viewPackagesBtn: "View Packages",
  },
  am: {
    categories: {
      WEB_APP_DEVELOPMENT: "የድር መተግበሪያ ልማት",
      GRAPHIC_DESIGN: "ግራፊክ ዲዛይን",
      DIGITAL_MARKETING: "ዲጂታል ማርኬቲንግ",
      CONTENT_WRITING: "የይዘት ጽሑፍ",
      TRANSLATION: "ትርጉም",
      DATA_ENTRY: "የውሂብ ግቤት",
      VIDEO_PRODUCTION: "የቪዲዮ ፕሮዳክሽን",
      ACCOUNTING_BOOKKEEPING: "ሂሳብ አያያዝ እና ኦዲቲንግ",
      LEGAL_RESEARCH: "የሕግ ምርምር",
      DATA_ANALYTICS: "የውሂብ ትንተና",
    },
    loadErrorFallback: "ጊጎችን መጫን አልተቻለም።",
    orderPlacedNotice: (amt) =>
      `ትዕዛዙ ተሰጥቷል እና (${amt}) በYekis ራስ-ሰር ኤስክሮ ተከፍሏል። ባለሙያው ሥራ እንዲጀምር ማሳወቂያ ተልኳል።`,
    orderFailedFallback: "ትዕዛዝ ማስቀመጥ አልተቻለም።",
    verifiedFreelancerFallback: "የተረጋገጠ ባለሙያ",
    specialistFallback: "የኢትዮጵያ ዲጂታል ባለሙያ",
    specialistBioFallback: "በYekis የተረጋገጠ ባለሙያ የኢትዮጵያ ዲጂታል አገልግሎት ሰጪ።",
    backToMarketplace: "ወደ ገበያ ተመለስ",
    breadcrumbGigs: "ጊጎች",
    reviewsCount: (n) => `${n} ግምገማዎች`,
    turnaroundDays: (days) => `የአቅርቦት ጊዜ፡ ${days} ቀናት`,
    escrowProtected: "በኤስክሮ የተጠበቀ",
    locationEthiopia: "አዲስ አበባ፣ ኢትዮጵያ",
    responseTimeBadge: "የምላሽ ጊዜ፡ < 2 ሰዓት",
    completenessLabel: (pct) => `ሙሉነት፡ ${pct}%`,
    serviceOverviewHeading: "የአገልግሎት አጠቃላይ እይታ",
    requirementsHeading: "ባለሙያው ከእርስዎ የሚፈልጋቸው ነገሮች",
    requiredTag: "(ግዴታ)",
    faqHeading: "ተደጋጋሚ ጥያቄዎች",
    escrowPromiseTitle: "100% የኤስክሮ ጥበቃ ዋስትና",
    escrowPromiseText:
      "ትዕዛዝ ሲሰጡ ገንዘብዎ በYekis ራስ-ሰር ኤስክሮ ይጠበቃል። ባለሙያው ወዲያውኑ ሥራ ይጀምራል። ክፍያ የሚለቀቀው የተጠናቀቀውን ሥራ ገምግመው ሲያጸድቁ ብቻ ነው። በ7 ቀናት የማረጋገጫ ጥበቃ የተደገፈ።",
    tiers: { BASIC: "መሠረታዊ", STANDARD: "መደበኛ", PREMIUM: "ፕሪሚየም" },
    packageSuffix: (tierLabel) => `${tierLabel} ጥቅል`,
    daysDelivery: (days) => `በ${days} ቀናት አቅርቦት`,
    revisionsCount: (n) => `${n} ማሻሻያዎች`,
    fundingEscrowBtn: "ኤስክሮ በመክፈል ላይ...",
    orderAndPayBtn: (amt) => `ይዘዙ እና ${amt} ይክፈሉ`,
    orderNote:
      "ከYekis ቦርሳዎ ፈጣን የኤስክሮ ማስያዣ። በቴሌብር፣ CBE ብር እና M-Pesa ቀጥታ መሙላት ይቻላል።",
    noPackagesConfigured: "ለዚህ ጊግ እስካሁን የተዘጋጁ ጥቅሎች የሉም።",
    zeroRiskTitle: "ያለ ስጋት ኤስክሮ",
    zeroRiskDesc: "የመጨረሻውን ውጤት እስኪገመግሙ ድረስ ገንዘብ ተጠብቆ ይቆያል።",
    ethiopianRailsTitle: "የኢትዮጵያ የባንክ መስመሮች",
    ethiopianRailsDesc: "በአገር ውስጥ ሞባይል ገንዘብ እና ባንኮች ያለችግር ይክፈሉ።",
    heroTitle: "በኤስክሮ የተጠበቁ ዝግጁ አገልግሎቶች",
    heroSubtitle:
      "ከምርጥ የኢትዮጵያ ኢንጂነሮች፣ ዲዛይነሮች፣ ጸሐፊዎች እና ተርጓሚዎች የተረጋገጡ ቋሚ ዋጋ ያላቸውን አገልግሎቶች ያስሱ። በቴሌብር፣ CBE ብር እና M-Pesa የተደገፈ ራስ-ሰር የኤስክሮ ጥበቃ።",
    trust1Title: "100% የኤስክሮ ጥበቃ",
    trust1Desc: "ክፍያው በአስተማማኝ ኤስክሮ ተይዞ ከእርስዎ ፈቃድ በኋላ ብቻ ይለቀቃል።",
    trust2Title: "ቀጥታ የኢትዮጵያ መስመሮች",
    trust2Desc: "ትዕዛዞችን በቴሌብር፣ CBE ብር እና ሳፋሪኮም M-Pesa ይክፈሉ።",
    trust3Title: "የተረጋገጠ የአቅርቦት ጊዜ",
    trust3Desc: "ቀድሞ የተስማሙባቸው ምዕራፎች፣ ግልጽ ውጤቶች እና የተካተቱ ማሻሻያዎች።",
    navAria: "የምድብ እና የአገልግሎት አሰሳ",
    resetAllServicesTitle: "ወደ ሁሉም አገልግሎቶች ዳግም አስጀምር",
    backAllServicesAria: "ወደ ሁሉም አገልግሎቶች ተመለስ",
    servicesCrumb: "አገልግሎቶች",
    selectCategoryAria: "ምድብ ይምረጡ",
    allServices: "ሁሉም አገልግሎቶች",
    clearCategoryTitle: "የተመረጠውን የምድብ ማጣሪያ አጽዳ",
    clearFilterBtn: "ማጣሪያ አጽዳ",
    servicesCount: (n) => `${n} አገልግሎቶች`,
    serviceCategoriesAria: "የአገልግሎት ምድቦች",
    searchPlaceholder: "አገልግሎቶችን፣ ክህሎቶችን ወይም ቴክኖሎጂን ይፈልጉ (ለምሳሌ Telebirr, React, Figma)...",
    clearSearchAria: "ፍለጋ አጽዳ",
    gigsAvailableCount: (n) => `${n} ጊጎች ይገኛሉ`,
    sortAria: "ጊጎችን ደርድር",
    sortOptions: {
      recommended: "የሚመከሩ እና ተወዳጅ",
      rating: "ከፍተኛ ደረጃ ያላቸው",
      priceAsc: "ዋጋ፡ ከዝቅተኛ ወደ ከፍተኛ",
      priceDesc: "ዋጋ፡ ከከፍተኛ ወደ ዝቅተኛ",
      delivery: "በጣም ፈጣን አቅርቦት",
    },
    emptyTitle: "በዚህ ምድብ ውስጥ ምንም ጊግ አልተገኘም",
    emptyDesc: "የፍለጋ ቃልዎን ለማስተካከል ወይም ሌላ የአገልግሎት ምድብ ለመምረጥ ይሞክሩ።",
    resetFiltersBtn: "ማጣሪያዎችን ዳግም አስጀምር",
    cardDelivery: (days) => `በ${days}ቀ አቅርቦት`,
    startingAt: "መነሻ ዋጋ",
    viewPackagesBtn: "ጥቅሎችን ይመልከቱ",
  },
  om: {
    categories: {
      WEB_APP_DEVELOPMENT: "Misooma App Weebii",
      GRAPHIC_DESIGN: "Dizaayinii Giraafiksii",
      DIGITAL_MARKETING: "Maarkeetingii Dijitaalaa",
      CONTENT_WRITING: "Barreessuu Qabiyyee",
      TRANSLATION: "Hiikkaa Afaanii",
      DATA_ENTRY: "Galmee Daataa",
      VIDEO_PRODUCTION: "Oomisha Viidiyoo",
      ACCOUNTING_BOOKKEEPING: "Herregaafi Galmee",
      LEGAL_RESEARCH: "Qorannoo Seeraa",
      DATA_ANALYTICS: "Xiinxala Daataa",
    },
    loadErrorFallback: "Giigota fe'uun hin danda'amne.",
    orderPlacedNotice: (amt) =>
      `Ajajni kennameera, (${amt}) karaa escrow ofumaa Yekis kaffalameera. Ogeessi hojii akka jalqabu beeksifameera.`,
    orderFailedFallback: "Ajaja kennuun hin milkoofne.",
    verifiedFreelancerFallback: "Ogeessa Mirkaneeffame",
    specialistFallback: "Ogeessa Dijitaalaa Itoophiyaa",
    specialistBioFallback: "Ogeessa dijitaalaa Itoophiyaa Yekis irratti mirkaneeffame.",
    backToMarketplace: "Gara Gabaatti Deebi'i",
    breadcrumbGigs: "Giigota",
    reviewsCount: (n) => `Yaada ${n}`,
    turnaroundDays: (days) => `Yeroo dhiyeessaa: guyyaa ${days}`,
    escrowProtected: "Escrown Eegame",
    locationEthiopia: "Finfinnee, Itoophiyaa",
    responseTimeBadge: "Yeroo deebii: < sa'aatii 2",
    completenessLabel: (pct) => `Guutummaa: ${pct}%`,
    serviceOverviewHeading: "Ibsa Tajaajilaa",
    requirementsHeading: "Waan Ogeessi Isin Irraa Barbaadu",
    requiredTag: "(Dirqama)",
    faqHeading: "Gaaffilee Yeroo Hedduu Gaafataman",
    escrowPromiseTitle: "Wabii Eegumsa Escrow 100%",
    escrowPromiseText:
      "Maallaqni keessan yeroo ajajjan escrow ofumaa Yekis keessatti eegama. Ogeessi yeroodhuma sana hojii jalqaba. Kaffaltiin kan gadhiifamu erga hojii xumurame ilaaltanii mirkaneessitanii booda qofa. Eegumsa guyyaa 7n deeggarame.",
    tiers: { BASIC: "BU'UURAA", STANDARD: "IDILEE", PREMIUM: "PIRIIMIYAM" },
    packageSuffix: (tierLabel) => `Paakeejii ${tierLabel}`,
    daysDelivery: (days) => `Dhiyeessa Guyyaa ${days}`,
    revisionsCount: (n) => `Fooyya'iinsa ${n}`,
    fundingEscrowBtn: "Escrow Kaffalaa Jira...",
    orderAndPayBtn: (amt) => `Ajaji & ${amt} Kaffali`,
    orderNote:
      "Boorsaa Yekis keessan irraa qabiinsa escrow battalaa. Telebirr, CBE Birr fi M-Pesa'n guutuun ni danda'ama.",
    noPackagesConfigured: "Giigii kanaaf paakeejiin qophaa'e hin jiru.",
    zeroRiskTitle: "Escrow Sodaa Malee",
    zeroRiskDesc: "Hanga bu'aa dhumaa gamaaggamtanitti maallaqni eegamee tura.",
    ethiopianRailsTitle: "Karaan Baankii Itoophiyaa",
    ethiopianRailsDesc: "Maallaqa mobaayilaafi baankii biyya keessaan salphaatti kaffalaa.",
    heroTitle: "Giigota Qophaa'oo, Escrown Eegaman",
    heroSubtitle:
      "Giigota gatii dhaabbataa mirkaneeffaman injiinaroota, dizaayinaroota, barreessitootaafi hiiktota Itoophiyaa irraa argadhaa. Eegumsa escrow ofumaa Telebirr, CBE Birr fi M-Pesa'n deeggarame.",
    trust1Title: "Eegumsa Escrow 100%",
    trust1Desc: "Kaffaltiin amanamummaan qabamee hayyama keessaniin booda qofa darba.",
    trust2Title: "Karaa Itoophiyaa Kallattii",
    trust2Desc: "Ajajoota Telebirr, CBE Birr fi Safaricom M-Pesa'n kaffalaa.",
    trust3Title: "Yeroo Dhiyeessaa Mirkaneeffame",
    trust3Desc: "Boqonnaa hojii irratti waliigalame, bu'aa ifaafi fooyya'iinsa dabalatu.",
    navAria: "Qajeelcha Ramaddiifi Tajaajilaa",
    resetAllServicesTitle: "Gara tajaajila hundaatti deebisi",
    backAllServicesAria: "Gara tajaajila hundaatti deebi'i",
    servicesCrumb: "Tajaajiloota",
    selectCategoryAria: "Ramaddii filadhu",
    allServices: "Tajaajiloota Hunda",
    clearCategoryTitle: "Calaltuu ramaddii filatame haqi",
    clearFilterBtn: "Calaltuu haqi",
    servicesCount: (n) => `Tajaajila ${n}`,
    serviceCategoriesAria: "Ramaddii tajaajilaa",
    searchPlaceholder:
      "Tajaajiloota, ogummaa ykn teeknoolojii barbaadi (fkn. Telebirr, React, Figma)...",
    clearSearchAria: "Barbaacha haqi",
    gigsAvailableCount: (n) => `Giigota ${n} jiru`,
    sortAria: "Giigota tarreessi",
    sortOptions: {
      recommended: "Kan gorfamanii fi beekamoo",
      rating: "Sadarkaa Ol'aanaa",
      priceAsc: "Gatii: Xiqqaarraa gara Guddaatti",
      priceDesc: "Gatii: Guddaarraa gara Xiqqaatti",
      delivery: "Dhiyeessa Saffisaa",
    },
    emptyTitle: "Ramaddii kana keessatti giigiin hin argamne",
    emptyDesc:
      "Jecha barbaachaa jijjiiruu ykn ramaddii tajaajilaa biraa filachuu yaalaa.",
    resetFiltersBtn: "Calaltuu Deebisi",
    cardDelivery: (days) => `Guyyaa ${days}n`,
    startingAt: "Gatii ka'umsaa",
    viewPackagesBtn: "Paakeejii Ilaali",
  },
  ti: {
    categories: {
      WEB_APP_DEVELOPMENT: "ምዕባለ ዌብ ኣፕ",
      GRAPHIC_DESIGN: "ግራፊክ ዲዛይን",
      DIGITAL_MARKETING: "ዲጂታል ማርኬቲንግ",
      CONTENT_WRITING: "ምጽሓፍ ትሕዝቶ",
      TRANSLATION: "ትርጉም",
      DATA_ENTRY: "ምእታው ዳታ",
      VIDEO_PRODUCTION: "ምድላው ቪድዮ",
      ACCOUNTING_BOOKKEEPING: "ኣካውንቲንግን መዝገብ ሒሳብን",
      LEGAL_RESEARCH: "ሕጋዊ መጽናዕቲ",
      DATA_ANALYTICS: "ትንታነ ዳታ",
    },
    loadErrorFallback: "ጊጋት ምጽዓን ኣይተኻእለን።",
    orderPlacedNotice: (amt) =>
      `ትእዛዝ ተዋሂቡን (${amt}) ብርእሰ-ኤስክሮ Yekis ተኸፊሉን። ክኢላ ስራሕ ክጅምር መፍለጢ ተላኢኹ።`,
    orderFailedFallback: "ትእዛዝ ምሃብ ኣይተኻእለን።",
    verifiedFreelancerFallback: "ዝተረጋገጸ ክኢላ",
    specialistFallback: "ኢትዮጵያዊ ዲጂታል ክኢላ",
    specialistBioFallback: "ኣብ Yekis ዝተረጋገጸ ኢትዮጵያዊ ዲጂታል ክኢላ።",
    backToMarketplace: "ናብ ዕዳጋ ተመለስ",
    breadcrumbGigs: "ጊጋት",
    reviewsCount: (n) => `${n} ግምገማታት`,
    turnaroundDays: (days) => `ግዜ ርኽክብ፡ ${days} መዓልታት`,
    escrowProtected: "ብኤስክሮ ዝተሓለወ",
    locationEthiopia: "ኣዲስ ኣበባ፣ ኢትዮጵያ",
    responseTimeBadge: "ግዜ ምላሽ፡ < 2 ሰዓት",
    completenessLabel: (pct) => `ምሉእነት፡ ${pct}%`,
    serviceOverviewHeading: "ሓፈሻዊ ትርኢት ኣገልግሎት",
    requirementsHeading: "ክኢላ ካባኹም ዝደልዮም ነገራት",
    requiredTag: "(ግዴታ)",
    faqHeading: "ብተደጋጋሚ ዝሕተቱ ሕቶታት",
    escrowPromiseTitle: "100% ውሕስነት ሓለዋ ኤስክሮ",
    escrowPromiseText:
      "ምስ ኣዘዝኩም ገንዘብኩም ኣብ ርእሰ-ኤስክሮ Yekis ይሕሎ። ክኢላ ብቅጽበት ስራሕ ይጅምር። ክፍሊት ዝልቀቕ ዝተዛዘመ ስራሕ ገምጊምኩም ምስ ኣጽደቕኩም ጥራይ እዩ። ብ7-መዓልቲ ሓለዋ ምዝሓል ዝተደገፈ።",
    tiers: { BASIC: "መሰረታዊ", STANDARD: "ስሩዕ", PREMIUM: "ፕሪሚየም" },
    packageSuffix: (tierLabel) => `${tierLabel} ፓኬጅ`,
    daysDelivery: (days) => `ኣብ ${days} መዓልታት ርኽክብ`,
    revisionsCount: (n) => `${n} ምምሕያሻት`,
    fundingEscrowBtn: "ኤስክሮ ይኽፈል ኣሎ...",
    orderAndPayBtn: (amt) => `ኣዝዝን ${amt} ክፈልን`,
    orderNote:
      "ካብ ቦርሳ Yekisኩም ቅጽበታዊ መትሓዚ ኤስክሮ። ብቴሌብር፣ CBE ብርን M-Pesaን ቀጥታ ምምላእ ይከኣል።",
    noPackagesConfigured: "ነዚ ጊግ እዚ ገና ፓኬጃት ኣይተዳለዉን።",
    zeroRiskTitle: "ዘይስግእ ኤስክሮ",
    zeroRiskDesc: "ናይ መወዳእታ ውጽኢት ክሳብ ትግምግሙ ገንዘብ ተዓቂቡ ይጸንሕ።",
    ethiopianRailsTitle: "መስመራት ባንኪ ኢትዮጵያ",
    ethiopianRailsDesc: "ብናይ ውሽጢ ዓዲ ሞባይል ገንዘብን ባንክታትን ብዘይ ጸገም ክፈሉ።",
    heroTitle: "ብኤስክሮ ዝተሓለዉ ድሉዋት ጊጋት",
    heroSubtitle:
      "ካብ ብሉጻት ኢትዮጵያውያን ኢንጂነራት፣ ዲዛይነራት፣ ጸሓፍትን ተርጎምትን ዝተረጋገጹ ቀዋሚ ዋጋ ዘለዎም ኣገልግሎታት ርኣዩ። ብቴሌብር፣ CBE ብርን M-Pesaን ዝተደገፈ ሓለዋ ኤስክሮ።",
    trust1Title: "100% ሓለዋ ኤስክሮ",
    trust1Desc: "ክፍሊት ብውሑስ ተዓቂቡ ድሕሪ ፍቓድኩም ጥራይ ይልቀቕ።",
    trust2Title: "ቀጥታዊ መስመራት ኢትዮጵያ",
    trust2Desc: "ትእዛዛት ብቴሌብር፣ CBE ብርን ሳፋሪኮም M-Pesaን ክፈሉ።",
    trust3Title: "ዝተረጋገጸ ግዜ ርኽክብ",
    trust3Desc: "ቅድሚ ሕጂ ዝተሰማምዑሎም ምዕራፋት፣ ንጹራት ውጽኢታትን ዝተሓወሱ ምምሕያሻትን።",
    navAria: "ዳህሳስ ምድብን ኣገልግሎትን",
    resetAllServicesTitle: "ናብ ኩሎም ኣገልግሎታት ዳግም ጀምር",
    backAllServicesAria: "ናብ ኩሎም ኣገልግሎታት ተመለስ",
    servicesCrumb: "ኣገልግሎታት",
    selectCategoryAria: "ምድብ ምረጽ",
    allServices: "ኩሎም ኣገልግሎታት",
    clearCategoryTitle: "ዝተመርጸ መጻረዪ ምድብ ኣጽሪ",
    clearFilterBtn: "መጻረዪ ኣጽሪ",
    servicesCount: (n) => `${n} ኣገልግሎታት`,
    serviceCategoriesAria: "ምድባት ኣገልግሎት",
    searchPlaceholder:
      "ኣገልግሎታት፣ ክእለታት ወይ ቴክኖሎጂ ድለ (ንኣብነት Telebirr, React, Figma)...",
    clearSearchAria: "ድለያ ኣጽሪ",
    gigsAvailableCount: (n) => `${n} ጊጋት ይርከቡ`,
    sortAria: "ጊጋት ሰርዕ",
    sortOptions: {
      recommended: "ዝምከሩን ህቡባትን",
      rating: "ዝለዓለ ደረጃ ዘለዎም",
      priceAsc: "ዋጋ፡ ካብ ትሑት ናብ ልዑል",
      priceDesc: "ዋጋ፡ ካብ ልዑል ናብ ትሑት",
      delivery: "ዝቀልጠፈ ርኽክብ",
    },
    emptyTitle: "ኣብዚ ምድብ እዚ ዝተረኽበ ጊግ የለን",
    emptyDesc: "ቃል ድለያኹም ክተስተኻኽሉ ወይ ካልእ ምድብ ኣገልግሎት ክትመርጹ ፈትኑ።",
    resetFiltersBtn: "መጻረዪ ዳግም ጀምር",
    cardDelivery: (days) => `ኣብ ${days}መ`,
    startingAt: "መበገሲ ዋጋ",
    viewPackagesBtn: "ፓኬጃት ርአ",
  },
};
