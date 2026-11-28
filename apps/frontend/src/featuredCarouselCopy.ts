import { type Language } from "./i18n";

export type FeaturedCarouselCopy = {
  sectionAria: string;
  heading: string;
  subtitle: string;
  filterAria: string;
  tabAll: string;
  tabSaved: string;
  emptySaved: string;
  loadingLabel: string;
  emptyTalentsTitle: string;
  emptyTalentsDesc: string;
  browseGigsBtn: string;
  errorTitle: string;
  retryBtn: string;
  gridAria: string;
  verifiedFreelancerFallback: string;
  professionalFreelancerFallback: string;
  verifiedTalentSkillFallback: string;
  verifiedTitle: string;
  shareAria: (name: string) => string;
  saveAria: (name: string) => string;
  savedToast: (firstName: string) => string;
  removedToast: (firstName: string) => string;
  linkCopiedToast: (firstName: string) => string;
  linkFallbackToast: (url: string) => string;
  linkCopiedGenericToast: (firstName: string) => string;
  badgeNew: string;
  badgeTopRated: string;
  jobsDelivered: (n: number) => string;
  statusAvailable: string;
  viewProfileBtn: string;
  countFooter: (count: number, savedOnly: boolean) => string;
  modalBackBtn: string;
  modalCloseAria: string;
  locationDefault: string;
  languagesDefault: string;
  sincePrefix: (dateStr: string) => string;
  startingProposalToast: (firstName: string) => string;
  openingChatToast: (firstName: string) => string;
  hireBtn: (firstName: string) => string;
  messageBtn: string;
  openFullProfileBtn: string;
  removeShortlistTitle: string;
  saveShortlistTitle: string;
  statNew: string;
  statRating: string;
  statJobsDone: string;
  statOnTime: string;
  statResponse: string;
  aboutHeading: string;
  aboutFallback: string;
  skillsHeading: string;
  reviewsHeading: string;
  reviewsCount: (n: number) => string;
  newVerifiedTalentTitle: string;
  newVerifiedTalentDesc: (firstName: string) => string;
  engagementHeading: string;
  perHourUnit: string;
  perHourShort: string;
  availableNewProjects: string;
  jobsCompletedLabel: string;
  onTimeRateLabel: string;
  responseTimeLabel: string;
  escrowNote: string;
  identityVerificationHeading: string;
  tierBadge: (tier: number) => string;
  faydaVerifiedTitle: string;
  faydaVerifiedDesc: string;
  biometricMatchedTitle: string;
  biometricMatchedDesc: string;
  enhancedApprovedTitle: string;
  enhancedApprovedDesc: string;
  faydaFootnote: string;
  ethiopiaAria: string;
};

export const FEATURED_CAROUSEL_COPY: Record<Language, FeaturedCarouselCopy> = {
  en: {
    sectionAria: "Featured Talent",
    heading: "Featured Talent",
    subtitle: "Verified Ethiopian professionals available for hire",
    filterAria: "Talent filter",
    tabAll: "All",
    tabSaved: "Saved",
    emptySaved:
      "No saved professionals yet. Use the bookmark icon to save a profile.",
    loadingLabel: "Loading verified freelancers...",
    emptyTalentsTitle: "No verified freelancers listed yet",
    emptyTalentsDesc: "Verified freelancers will appear here as they join.",
    browseGigsBtn: "Browse Services",
    errorTitle: "Could not load featured talent right now.",
    retryBtn: "Retry",
    gridAria: "Featured professionals",
    verifiedFreelancerFallback: "Verified Freelancer",
    professionalFreelancerFallback: "Professional Freelancer",
    verifiedTalentSkillFallback: "Verified Talent",
    verifiedTitle: "Verified",
    shareAria: (name) => `Share ${name}`,
    saveAria: (name) => `Save ${name}`,
    savedToast: (first) => `${first} saved to your shortlist`,
    removedToast: (first) => `${first} removed from your shortlist`,
    linkCopiedToast: (first) => `${first}'s profile link copied to clipboard!`,
    linkFallbackToast: (url) => `Link: ${url}`,
    linkCopiedGenericToast: (first) => `Link for ${first} copied.`,
    badgeNew: "New",
    badgeTopRated: "Top rated",
    jobsDelivered: (n) => `${n} jobs delivered`,
    statusAvailable: "Available",
    viewProfileBtn: "View profile",
    countFooter: (count, savedOnly) =>
      `${count} ${savedOnly ? "saved" : "featured"} professional${count === 1 ? "" : "s"}`,
    modalBackBtn: "Featured Talent",
    modalCloseAria: "Close modal",
    locationDefault: "Addis Ababa, Ethiopia",
    languagesDefault: "Amharic, English",
    sincePrefix: (d) => `Since ${d}`,
    startingProposalToast: (first) => `Starting project proposal with ${first}...`,
    openingChatToast: (first) => `Opening direct conversation with ${first}...`,
    hireBtn: (first) => `Hire ${first}`,
    messageBtn: "Message",
    openFullProfileBtn: "Open Full Profile",
    removeShortlistTitle: "Remove from shortlist",
    saveShortlistTitle: "Save to shortlist",
    statNew: "New",
    statRating: "Rating",
    statJobsDone: "Jobs done",
    statOnTime: "On-time",
    statResponse: "Response",
    aboutHeading: "About",
    aboutFallback:
      "Verified Ethiopian freelancer specializing in high-quality deliverables, dependable milestone execution, and clear client communication.",
    skillsHeading: "Skills & Expertise",
    reviewsHeading: "Client Reviews",
    reviewsCount: (n) => `${n} reviews`,
    newVerifiedTalentTitle: "New Verified Talent",
    newVerifiedTalentDesc: (first) =>
      `${first} recently completed Fayda identity verification. Be the first client to collaborate and leave a review.`,
    engagementHeading: "Engagement",
    perHourUnit: "/ hr starting",
    perHourShort: "/hr",
    availableNewProjects: "Available for new projects",
    jobsCompletedLabel: "Jobs completed",
    onTimeRateLabel: "On-time rate",
    responseTimeLabel: "Response time",
    escrowNote:
      "Contact is free — escrow funds are protected until milestones are delivered.",
    identityVerificationHeading: "Identity Verification",
    tierBadge: (tier) => `Tier ${tier}`,
    faydaVerifiedTitle: "National ID (Fayda) Verified",
    faydaVerifiedDesc: "Matched against the national identity database",
    biometricMatchedTitle: "Biometric Selfie Matched",
    biometricMatchedDesc: "Liveness matched during registration",
    enhancedApprovedTitle: "Enhanced Review Approved",
    enhancedApprovedDesc: "Work background and payment rails confirmed",
    faydaFootnote:
      "Verified via Fayda eSignet — Ethiopia's national digital identity framework.",
    ethiopiaAria: "Ethiopia",
  },
  am: {
    sectionAria: "ተለይተው የቀረቡ ባለሙያዎች",
    heading: "ተለይተው የቀረቡ ባለሙያዎች",
    subtitle: "ለቅጥር ዝግጁ የሆኑ የተረጋገጡ የኢትዮጵያ ባለሙያዎች",
    filterAria: "የባለሙያዎች ማጣሪያ",
    tabAll: "ሁሉም",
    tabSaved: "የተቀመጡ",
    emptySaved: "እስካሁን የተቀመጡ ባለሙያዎች የሉም። መገለጫ ለማስቀመጥ የዕልባት አዶውን ይጠቀሙ።",
    loadingLabel: "የተረጋገጡ ባለሙያዎችን በመጫን ላይ...",
    emptyTalentsTitle: "ገና የተረጋገጡ ባለሙያዎች አልተዘረዘሩም",
    emptyTalentsDesc: "የተረጋገጡ ባለሙያዎች ሲቀላቀሉ እዚህ ይታያሉ።",
    browseGigsBtn: "አገልግሎቶችን ያስሱ",
    errorTitle: "ባለሙያዎችን መጫን አልተቻለም።",
    retryBtn: "እንደገና ሞክር",
    gridAria: "ተለይተው የቀረቡ ባለሙያዎች",
    verifiedFreelancerFallback: "የተረጋገጠ ባለሙያ",
    professionalFreelancerFallback: "ሙያዊ ባለሙያ",
    verifiedTalentSkillFallback: "የተረጋገጠ ክህሎት",
    verifiedTitle: "የተረጋገጠ",
    shareAria: (name) => `${name}ን አጋራ`,
    saveAria: (name) => `${name}ን አስቀምጥ`,
    savedToast: (first) => `${first} በአጭር ዝርዝርዎ ተቀምጧል`,
    removedToast: (first) => `${first} ከአጭር ዝርዝርዎ ተወግዷል`,
    linkCopiedToast: (first) => `የ${first} መገለጫ አገናኝ ተቀድቷል!`,
    linkFallbackToast: (url) => `አገናኝ፡ ${url}`,
    linkCopiedGenericToast: (first) => `የ${first} አገናኝ ተቀድቷል።`,
    badgeNew: "አዲስ",
    badgeTopRated: "ከፍተኛ ደረጃ",
    jobsDelivered: (n) => `${n} ሥራዎች ተጠናቅቀዋል`,
    statusAvailable: "ዝግጁ",
    viewProfileBtn: "መገለጫ ይመልከቱ",
    countFooter: (count, savedOnly) =>
      `${count} ${savedOnly ? "የተቀመጡ" : "ተለይተው የቀረቡ"} ባለሙያዎች`,
    modalBackBtn: "ተለይተው የቀረቡ ባለሙያዎች",
    modalCloseAria: "መስኮቱን ዝጋ",
    locationDefault: "አዲስ አበባ፣ ኢትዮጵያ",
    languagesDefault: "አማርኛ፣ እንግሊዝኛ",
    sincePrefix: (d) => `ከ${d} ጀምሮ`,
    startingProposalToast: (first) => `ከ${first} ጋር የፕሮጀክት ፕሮፖዛል በመጀመር ላይ...`,
    openingChatToast: (first) => `ከ${first} ጋር ቀጥታ ውይይት በመክፈት ላይ...`,
    hireBtn: (first) => `${first}ን ቅጠር`,
    messageBtn: "መልዕክት",
    openFullProfileBtn: "ሙሉ መገለጫ ክፈት",
    removeShortlistTitle: "ከአጭር ዝርዝር አስወግድ",
    saveShortlistTitle: "በአጭር ዝርዝር አስቀምጥ",
    statNew: "አዲስ",
    statRating: "ደረጃ",
    statJobsDone: "የተጠናቀቁ ሥራዎች",
    statOnTime: "በሰዓቱ",
    statResponse: "ምላሽ",
    aboutHeading: "ስለ ባለሙያው",
    aboutFallback:
      "ጥራት ያለው ውጤት፣ አስተማማኝ የምዕራፍ አፈጻጸም እና ግልጽ የደንበኛ ግንኙነት ላይ የተካነ የተረጋገጠ የኢትዮጵያ ባለሙያ።",
    skillsHeading: "ክህሎቶች እና እውቀት",
    reviewsHeading: "የደንበኛ ግምገማዎች",
    reviewsCount: (n) => `${n} ግምገማዎች`,
    newVerifiedTalentTitle: "አዲስ የተረጋገጠ ባለሙያ",
    newVerifiedTalentDesc: (first) =>
      `${first} በቅርቡ የፋይዳ ማንነት ማረጋገጫ አጠናቋል። በመጀመሪያ አብረው ይሥሩ እና ግምገማ ይስጡ።`,
    engagementHeading: "ውል እና ክፍያ",
    perHourUnit: "/ ሰዓት መነሻ",
    perHourShort: "/ሰዓት",
    availableNewProjects: "ለአዲስ ፕሮጀክቶች ዝግጁ",
    jobsCompletedLabel: "የተጠናቀቁ ሥራዎች",
    onTimeRateLabel: "በሰዓቱ የማድረስ መጠን",
    responseTimeLabel: "የምላሽ ጊዜ",
    escrowNote: "መገናኘት ነፃ ነው — ምዕራፎች እስኪደርሱ የኤስክሮ ገንዘብ የተጠበቀ ነው።",
    identityVerificationHeading: "የማንነት ማረጋገጫ",
    tierBadge: (tier) => `ደረጃ ${tier}`,
    faydaVerifiedTitle: "ብሔራዊ መታወቂያ (ፋይዳ) የተረጋገጠ",
    faydaVerifiedDesc: "ከብሔራዊ የማንነት መረጃ ቋት ጋር ተመሳክሯል",
    biometricMatchedTitle: "ባዮሜትሪክ ሰልፊ ተመሳክሯል",
    biometricMatchedDesc: "በምዝገባ ወቅት የሕይወት ማረጋገጫ ተረጋግጧል",
    enhancedApprovedTitle: "የላቀ ግምገማ ጸድቋል",
    enhancedApprovedDesc: "የሥራ ዳራ እና የክፍያ መስመሮች ተረጋግጠዋል",
    faydaFootnote: "በፋይዳ eSignet — የኢትዮጵያ ብሔራዊ ዲጂታል ማንነት ማዕቀፍ የተረጋገጠ።",
    ethiopiaAria: "ኢትዮጵያ",
  },
  om: {
    sectionAria: "Ogeeyyii Filatamoo",
    heading: "Ogeeyyii Filatamoo",
    subtitle: "Ogeeyyii Itoophiyaa mirkaneeffaman qacarriif qophaa'an",
    filterAria: "Calaltuu ogeeyyii",
    tabAll: "Hunda",
    tabSaved: "Olkaa'aman",
    emptySaved:
      "Ammatti ogeeyyiin olkaa'aman hin jiran. Piroofaayila olkaa'uuf mallattoo bookmark fayyadamaa.",
    loadingLabel: "Ogeeyyii mirkaneeffaman fe'aa jira...",
    emptyTalentsTitle: "Ammatti ogeessi mirkaneeffame hin tarreeffamne",
    emptyTalentsDesc: "Ogeeyyiin mirkaneeffaman yeroo dabalaman asitti mul'atu.",
    browseGigsBtn: "Tajaajiloota Ilaali",
    errorTitle: "Yeroo ammaa ogeeyyii filatamoo fe'uun hin danda'amne.",
    retryBtn: "Irra deebi'ii yaali",
    gridAria: "Ogeeyyii filatamoo",
    verifiedFreelancerFallback: "Ogeessa Mirkaneeffame",
    professionalFreelancerFallback: "Ogeessa Ogummaa",
    verifiedTalentSkillFallback: "Ogummaa Mirkaneeffame",
    verifiedTitle: "Mirkaneeffameera",
    shareAria: (name) => `${name} qoodi`,
    saveAria: (name) => `${name} olkaa'i`,
    savedToast: (first) => `${first} tarree gabaabaa keessatti olkaa'ameera`,
    removedToast: (first) => `${first} tarree gabaabaa keessaa haqameera`,
    linkCopiedToast: (first) => `Geessituun piroofaayilii ${first} waraabameera!`,
    linkFallbackToast: (url) => `Geessituu: ${url}`,
    linkCopiedGenericToast: (first) => `Geessituun ${first} waraabameera.`,
    badgeNew: "Haaraa",
    badgeTopRated: "Sadarkaa ol'aanaa",
    jobsDelivered: (n) => `Hojiilee ${n} xumuraman`,
    statusAvailable: "Qophaa'aa",
    viewProfileBtn: "Piroofaayila ilaali",
    countFooter: (count, savedOnly) =>
      `Ogeeyyii ${savedOnly ? "olkaa'aman" : "filatamoo"} ${count}`,
    modalBackBtn: "Ogeeyyii Filatamoo",
    modalCloseAria: "Foddaa cufi",
    locationDefault: "Finfinnee, Itoophiyaa",
    languagesDefault: "Afaan Amaaraa, Ingiliffa",
    sincePrefix: (d) => `${d} irraa`,
    startingProposalToast: (first) => `${first} waliin yaada pirojektii jalqabaa jira...`,
    openingChatToast: (first) => `${first} waliin haasaa kallattii banaa jira...`,
    hireBtn: (first) => `${first} Qacari`,
    messageBtn: "Ergaa",
    openFullProfileBtn: "Piroofaayila Guutuu Bani",
    removeShortlistTitle: "Tarree gabaabaa keessaa baasi",
    saveShortlistTitle: "Tarree gabaabaa keessatti olkaa'i",
    statNew: "Haaraa",
    statRating: "Madaallii",
    statJobsDone: "Hojiilee xumuraman",
    statOnTime: "Yeroon",
    statResponse: "Deebii",
    aboutHeading: "Waa'ee Ogeessaa",
    aboutFallback:
      "Ogeessa Itoophiyaa mirkaneeffame qulqullina hojii, raawwii boqonnaa hojiifi qunnamtii ifa irratti xiyyeeffate.",
    skillsHeading: "Ogummaafi Beekumsa",
    reviewsHeading: "Yaada Maamiltootaa",
    reviewsCount: (n) => `Yaada ${n}`,
    newVerifiedTalentTitle: "Ogeessa Haaraa Mirkaneeffame",
    newVerifiedTalentDesc: (first) =>
      `${first} dhiyeenya mirkaneessa eenyummaa Fayda xumureera. Maamila jalqabaa ta'aatii waliin hojjedhaa.`,
    engagementHeading: "Qindaa'ina Hojii",
    perHourUnit: "/ sa'aatii irraa",
    perHourShort: "/sa'aa",
    availableNewProjects: "Pirojektii haaraaf qophaa'aa",
    jobsCompletedLabel: "Hojiilee xumuraman",
    onTimeRateLabel: "Yeroon dhiyeessuu",
    responseTimeLabel: "Yeroo deebii",
    escrowNote: "Qunnamtiin bilisaa — hanga boqonnaan hojii dhiyaatutti maallaqni escrow eegama.",
    identityVerificationHeading: "Mirkaneessa Eenyummaa",
    tierBadge: (tier) => `Sadarkaa ${tier}`,
    faydaVerifiedTitle: "Waraqaa Eenyummaa Biyyaalessaa (Fayda)",
    faydaVerifiedDesc: "Kuusaa eenyummaa biyyaalessaa waliin mirkaneeffame",
    biometricMatchedTitle: "Selfie Baayomeetirikii Mirkanaa'e",
    biometricMatchedDesc: "Yeroo galmee lubbu-qabeenyummaan mirkanaa'e",
    enhancedApprovedTitle: "Gamaaggamni Olaanaan Mirkaneeffame",
    enhancedApprovedDesc: "Seenaan hojiifi karaan kaffaltii mirkanaa'e",
    faydaFootnote:
      "Karaa Fayda eSignet — sirna eenyummaa dijitaalaa Itoophiyaan mirkaneeffame.",
    ethiopiaAria: "Itoophiyaa",
  },
  ti: {
    sectionAria: "ፍሉያት ክኢላታት",
    heading: "ፍሉያት ክኢላታት",
    subtitle: "ንቆጻርነት ድሉዋት ዝኾኑ ዝተረጋገጹ ኢትዮጵያውያን ክኢላታት",
    filterAria: "መጻረዪ ክኢላታት",
    tabAll: "ኩሎም",
    tabSaved: "ዝተዓቀቡ",
    emptySaved:
      "ገና ዝተዓቀቡ ክኢላታት የለዉን። መግለጺ ንምዕቃብ ምልክት ዕልባት ተጠቐሙ።",
    loadingLabel: "ዝተረጋገጹ ክኢላታት ይጽዕን ኣሎ...",
    emptyTalentsTitle: "ገና ዝተረጋገጹ ክኢላታት ኣይተዘርዘሩን",
    emptyTalentsDesc: "ዝተረጋገጹ ክኢላታት ክጽንበሩ ከለዉ ኣብዚ ክርኣዩ እዮም።",
    browseGigsBtn: "ኣገልግሎታት ዳህስስ",
    errorTitle: "ሕጂ ፍሉያት ክኢላታት ምጽዓን ኣይተኻእለን።",
    retryBtn: "ዳግማይ ፈትን",
    gridAria: "ፍሉያት ክኢላታት",
    verifiedFreelancerFallback: "ዝተረጋገጸ ክኢላ",
    professionalFreelancerFallback: "ሞያዊ ክኢላ",
    verifiedTalentSkillFallback: "ዝተረጋገጸ ክእለት",
    verifiedTitle: "ዝተረጋገጸ",
    shareAria: (name) => `ን${name} ኣካፍል`,
    saveAria: (name) => `ን${name} ዓቅብ`,
    savedToast: (first) => `${first} ኣብ ሓጺር ዝርዝርኩም ተዓቂቡ`,
    removedToast: (first) => `${first} ካብ ሓጺር ዝርዝርኩም ተኣልዩ`,
    linkCopiedToast: (first) => `ሊንክ መግለጺ ${first} ተቐዲሑ!`,
    linkFallbackToast: (url) => `ሊንክ፡ ${url}`,
    linkCopiedGenericToast: (first) => `ሊንክ ${first} ተቐዲሑ።`,
    badgeNew: "ሓድሽ",
    badgeTopRated: "ዝለዓለ ደረጃ",
    jobsDelivered: (n) => `${n} ስራሕቲ ተዛዚሞም`,
    statusAvailable: "ድሉው",
    viewProfileBtn: "መግለጺ ርአ",
    countFooter: (count, savedOnly) =>
      `${count} ${savedOnly ? "ዝተዓቀቡ" : "ፍሉያት"} ክኢላታት`,
    modalBackBtn: "ፍሉያት ክኢላታት",
    modalCloseAria: "መስኮት ዕጸው",
    locationDefault: "ኣዲስ ኣበባ፣ ኢትዮጵያ",
    languagesDefault: "ኣምሓርኛ፣ እንግሊዝኛ",
    sincePrefix: (d) => `ካብ ${d}`,
    startingProposalToast: (first) => `ምስ ${first} ፕሮፖዛል ፕሮጀክት ይጅምር ኣሎ...`,
    openingChatToast: (first) => `ምስ ${first} ቀጥታዊ ዕላል ይኽፈት ኣሎ...`,
    hireBtn: (first) => `ን${first} ቁጸር`,
    messageBtn: "መልእኽቲ",
    openFullProfileBtn: "ምሉእ መግለጺ ክፈት",
    removeShortlistTitle: "ካብ ሓጺር ዝርዝር ኣውጽእ",
    saveShortlistTitle: "ኣብ ሓጺር ዝርዝር ዓቅብ",
    statNew: "ሓድሽ",
    statRating: "ደረጃ",
    statJobsDone: "ዝተዛዘሙ ስራሕቲ",
    statOnTime: "ብሰዓቱ",
    statResponse: "ምላሽ",
    aboutHeading: "ብዛዕባ ክኢላ",
    aboutFallback:
      "ጽሬት ዘለዎ ውጽኢት፣ እሙን ኣፈጻጽማ ምዕራፍን ንጹር ርክብ ዓሚልን ዘለዎ ዝተረጋገጸ ኢትዮጵያዊ ክኢላ።",
    skillsHeading: "ክእለታትን ብቕዓትን",
    reviewsHeading: "ግምገማታት ዓሚል",
    reviewsCount: (n) => `${n} ግምገማታት`,
    newVerifiedTalentTitle: "ሓድሽ ዝተረጋገጸ ክኢላ",
    newVerifiedTalentDesc: (first) =>
      `${first} ኣብ ቀረባ እዋን መረጋገጺ መንነት ፋይዳ ወዲኡ። ቀዳማይ ዓሚል ኮይንኩም ብሓባር ስርሑን ግምገማ ሃቡን።`,
    engagementHeading: "ውዕልን ክፍሊትን",
    perHourUnit: "/ ሰዓት መበገሲ",
    perHourShort: "/ሰዓት",
    availableNewProjects: "ንሓደስቲ ፕሮጀክታት ድሉው",
    jobsCompletedLabel: "ዝተዛዘሙ ስራሕቲ",
    onTimeRateLabel: "ብሰዓቱ ምቕራብ",
    responseTimeLabel: "ግዜ ምላሽ",
    escrowNote: "ርክብ ነጻ እዩ — ምዕራፋት ክሳብ ዝቀርቡ ገንዘብ ኤስክሮ ይሕሎ።",
    identityVerificationHeading: "መረጋገጺ መንነት",
    tierBadge: (tier) => `ብርኪ ${tier}`,
    faydaVerifiedTitle: "ሃገራዊ መታወቂያ (ፋይዳ) ዝተረጋገጸ",
    faydaVerifiedDesc: "ምስ ሃገራዊ መዝገብ መንነት ተረጋጊጹ",
    biometricMatchedTitle: "ባዮሜትሪክ ሰልፊ ተመሳሲሉ",
    biometricMatchedDesc: "ኣብ እዋን ምዝገባ ብህይወት ተረጋጊጹ",
    enhancedApprovedTitle: "ዝለዓለ ግምገማ ጸዲቑ",
    enhancedApprovedDesc: "ድሕረ-ባይታ ስራሕን መስመራት ክፍሊትን ተረጋጊጾም",
    faydaFootnote: "ብፋይዳ eSignet — ሃገራዊ ዲጂታላዊ መንነት ኢትዮጵያ ዝተረጋገጸ።",
    ethiopiaAria: "ኢትዮጵያ",
  },
};
