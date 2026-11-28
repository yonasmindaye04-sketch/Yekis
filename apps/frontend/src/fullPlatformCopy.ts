import { type Language } from "./i18n";

export const FULL_PLATFORM_CATEGORY_LABELS: Record<Language, Record<string, string>> = {
  en: {
    WEB_APP_DEVELOPMENT: "Web app development",
    GRAPHIC_DESIGN: "Graphic design",
    DIGITAL_MARKETING: "Digital marketing",
    CONTENT_WRITING: "Content writing",
    TRANSLATION: "Translation",
    DATA_ENTRY: "Data entry",
    VIDEO_PRODUCTION: "Video production",
    ACCOUNTING_BOOKKEEPING: "Accounting & bookkeeping",
    LEGAL_RESEARCH: "Legal research",
    DATA_ANALYTICS: "Data analytics",
  },
  am: {
    WEB_APP_DEVELOPMENT: "የድረ-ገጽ እና መተግበሪያ ልማት",
    GRAPHIC_DESIGN: "ግራፊክ ዲዛይን",
    DIGITAL_MARKETING: "ዲጂታል ግብይት",
    CONTENT_WRITING: "የይዘት ጽሑፍ",
    TRANSLATION: "ትርጉም",
    DATA_ENTRY: "የመረጃ ማስገባት",
    VIDEO_PRODUCTION: "የቪዲዮ ዝግጅት",
    ACCOUNTING_BOOKKEEPING: "ሂሳብ እና መዝገብ አያያዝ",
    LEGAL_RESEARCH: "የሕግ ምርምር",
    DATA_ANALYTICS: "የመረጃ ትንተና",
  },
  om: {
    WEB_APP_DEVELOPMENT: "Misooma weeb fi appii",
    GRAPHIC_DESIGN: "Dizaayinii giraafiksii",
    DIGITAL_MARKETING: "Gabaa dijitaalaa",
    CONTENT_WRITING: "Barreessuu qabiyyee",
    TRANSLATION: "Hiikkaa afaanii",
    DATA_ENTRY: "Galchii daataa",
    VIDEO_PRODUCTION: "Qophii viidiyoo",
    ACCOUNTING_BOOKKEEPING: "Herregaa fi galmee qabannaa",
    LEGAL_RESEARCH: "Qorannoo seeraa",
    DATA_ANALYTICS: "Xiinxala daataa",
  },
  ti: {
    WEB_APP_DEVELOPMENT: "ምዕባለ ዌብን ኣፕን",
    GRAPHIC_DESIGN: "ግራፊክ ዲዛይን",
    DIGITAL_MARKETING: "ዲጂታል ዕዳጋ",
    CONTENT_WRITING: "ጽሕፈት ትሕዝቶ",
    TRANSLATION: "ትርጉም",
    DATA_ENTRY: "ምእታው ዳታ",
    VIDEO_PRODUCTION: "ምድላው ቪድዮ",
    ACCOUNTING_BOOKKEEPING: "ሕሳብን ምሓዝ መዝገብን",
    LEGAL_RESEARCH: "ሕጋዊ መጽናዕቲ",
    DATA_ANALYTICS: "ትንተና ዳታ",
  },
};

export type FullPlatformCopy = {
  roles: {
    CLIENT: string;
    FREELANCER: string;
    BOTH: string;
    ADMIN: string;
    MEDIATOR: string;
  };
  directDiscussionWith: (name: string) => string;
  directProjectDiscussion: string;
  passwordResetSent: string;
  passwordResetSuccess: string;
  unableToContinue: string;
  duplicateUserError: string;
  registerPhoneExistsError: string;
  jobErrTitleLength: string;
  jobErrDescLength: string;
  jobErrBudgetRange: string;
  jobErrChooseDeadline: string;
  initialDeliveryMilestone: string;
  unableToPublishJob: string;
  pageTitles: {
    home: string;
    faq: string;
    fees: string;
    privacy: string;
    terms: string;
    about: string;
    caseStudies: string;
    notFound: string;
    thankYouSignup: string;
    thankYouJobPosted: string;
    thankYouContact: string;
    telegramAuth: string;
  };
  switchToDark: string;
  switchToLight: string;
  yekisLogoAlt: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroProof1: string;
  heroProof2: string;
  bothRoleTitle: string;
  loginIdentifierPlaceholder: string;
  emailPlaceholder: string;
  resetTokenPlaceholder: string;
  passwordPlaceholder: string;
  hidePassword: string;
  showPassword: string;
  agreePrefix: string;
  termsLink: string;
  andSeparator: string;
  privacyLink: string;
  customizePrefsTitle: string;
  optionsOpen: string;
  optionsClosed: string;
  optionalPrefsHeading: string;
  optPlatformAlerts: string;
  optMarketing: string;
  optTelemetry: string;
  termsModalTitle: string;
  privacyModalTitle: string;
  closeModalAria: string;
  termsModalIntro: string;
  termsClauses: Array<{ title: string; body: string }>;
  privacyModalIntro: string;
  privacyClauses: Array<{ title: string; body: string }>;
  agreeBtn: string;
  workspaceNavAria: string;
  brandOverviewAria: string;
  closeDrawerAria: string;
  expandSidebarAria: string;
  collapseSidebarAria: string;
  workspaceModeLabel: string;
  openDrawerAria: string;
  goBackAria: string;
  switchModeAria: string;
  switchModeTitle: string;
  viewProfileAria: (roleText: string, email: string) => string;
  openProfileAria: (email: string) => string;
  mobileNavAria: string;
  completeProfileAria: string;
  finishProfileTitle: string;
  percentComplete: (pct: number) => string;
  finishProfileDesc: string;
  viewChecklistBtn: string;
  editProfileBtn: string;
  dismissBannerTitle: string;
  dismissBannerAria: string;
  jobsTitleBoth: string;
  jobsTitleHire: string;
  jobsTitleWork: string;
  jobsDescBoth: string;
  jobsDescHire: string;
  jobsDescWork: string;
  openBriefsCount: (count: number) => string;
  publishBriefTitle: string;
  publishBriefDesc: string;
  escrowProtectedBadge: string;
  briefTitleLabel: string;
  briefTitlePlaceholder: string;
  categoryLabel: string;
  scopeLabel: string;
  scopePlaceholder: string;
  minBudgetLabel: string;
  maxBudgetLabel: string;
  targetDeadlineLabel: string;
  verifyIdentityBtn: string;
  publishBriefBtn: string;
  publishLockedBtn: string;
  jobKycGateTitle: string;
  jobKycGateReview: string;
  jobKycGateAction: string;
  kycStatusVerified: string;
  kycStatusRequired: string;
  kycVerifyTooltip: string;
  kycVerifiedTooltip: string;
  servicesNavLabel: string;
  proposalsTitleBoth: string;
  proposalsTitleHire: string;
  proposalsTitleWork: string;
  proposalsDescBoth: string;
  proposalsDescHire: string;
  proposalsDescWork: string;
  contractsTitle: string;
  contractsDesc: string;
  aaccsaBadge: string;
  escrowDesc: string;
  autoReleaseBadge: string;
  walletTitle: string;
  walletDesc: string;
  casesTitle: string;
  casesDesc: string;
  threeStageEscrowBadge: string;
  jobsTabsAria: string;
  jobsTabMyJobs: string;
  jobsTabFindWork: string;
  jobsTabProposals: string;
  contractsTabsAria: string;
  contractsTabOverview: string;
  contractsTabPayments: string;
  contractsTabDisputes: string;
  accountMenuAria: string;
  signOutLabel: string;
};

export const FULL_PLATFORM_COPY: Record<Language, FullPlatformCopy> = {
  en: {
    roles: {
      CLIENT: "Client",
      FREELANCER: "Freelancer",
      BOTH: "Client & Freelancer",
      ADMIN: "Operations",
      MEDIATOR: "Mediator",
    },
    directDiscussionWith: (name) => `Direct discussion with ${name}`,
    directProjectDiscussion: "Direct Project Discussion",
    passwordResetSent: "If an account exists, a reset token has been sent to your email.",
    passwordResetSuccess: "Password reset successful. You can now log in.",
    unableToContinue: "Unable to continue",
    duplicateUserError: "This email or phone already has an account. Switch to Sign in.",
    registerPhoneExistsError:
      "We could not create the account. If that phone number is already registered, sign in with the email address you used the first time — or use a different number.",
    jobErrTitleLength: "Job title must be at least 5 characters.",
    jobErrDescLength: "Description must be at least 20 characters.",
    jobErrBudgetRange: "Enter valid budgets; maximum must be greater than or equal to minimum.",
    jobErrChooseDeadline: "Choose a deadline.",
    initialDeliveryMilestone: "Initial delivery",
    unableToPublishJob: "Unable to publish job",
    pageTitles: {
      home: "Yekis — Ethiopia's Freelance Marketplace with milestone payments held until approval",
      faq: "FAQ — Yekis",
      fees: "Pricing & Fees — Yekis",
      privacy: "Privacy Policy — Yekis",
      terms: "Terms of Service — Yekis",
      about: "About — Yekis",
      caseStudies: "Case Studies — Yekis",
      notFound: "Page Not Found — Yekis",
      thankYouSignup: "Welcome to Yekis!",
      thankYouJobPosted: "Job Posted — Yekis",
      thankYouContact: "Message Sent — Yekis",
      telegramAuth: "Sign in with Telegram — Yekis",
    },
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    yekisLogoAlt: "Yekis Logo",
    heroEyebrow: "Yekis jobs",
    heroTitle: "Work with clarity.",
    heroSubtitle:
      "Find trusted talent, manage milestone work, and keep payments visible from job post to delivery.",
    heroProof1: "Jobs, contracts, and escrow in one workspace.",
    heroProof2: "Built for Ethiopian clients and freelancers.",
    bothRoleTitle: "Hire talent and take on work with one account",
    loginIdentifierPlaceholder: "you@example.com or 0911223344",
    emailPlaceholder: "you@example.com",
    resetTokenPlaceholder: "Enter reset token",
    passwordPlaceholder: "Your password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    agreePrefix: "I agree to the ",
    termsLink: "Terms",
    andSeparator: " & ",
    privacyLink: "Privacy Policy",
    customizePrefsTitle: "Customize privacy & notification preferences",
    optionsOpen: "Options ▲",
    optionsClosed: "Options ▾",
    optionalPrefsHeading: "Optional privacy & notification preferences:",
    optPlatformAlerts: "Platform alerts (milestones & escrow updates)",
    optMarketing: "Marketing communications",
    optTelemetry: "Anonymized product telemetry",
    termsModalTitle: "Terms of Service",
    privacyModalTitle: "Privacy Policy",
    closeModalAria: "Close",
    termsModalIntro:
      "Welcome to Yekis Jobs. By creating an account or using the platform, you agree to these fundamental marketplace standards:",
    termsClauses: [
      {
        title: "1. Escrow Protection",
        body: "Clients deposit milestone funds into secure escrow before work begins. Funds are disbursed upon milestone approval.",
      },
      {
        title: "2. Dispute Mediation",
        body: "Disputes are resolved through fair evidence submission, staff mediation, and AACCSA arbitration standards.",
      },
      {
        title: "3. Identity Verification (KYC)",
        body: "Users agree to verify identity via Fayda / Ethiopian National ID before initiating withdrawals, ensuring a trusted marketplace.",
      },
      {
        title: "4. Fee Attribution",
        body: "Platform commissions and Telebirr/CBE payment rail charges adhere to the posted transparent fee schedule.",
      },
    ],
    privacyModalIntro:
      "Yekis Jobs values your confidentiality and complies with the Ethiopian Personal Data Protection Proclamation:",
    privacyClauses: [
      {
        title: "1. Data Collection & Purpose",
        body: "We collect phone numbers, emails, and KYC identification strictly to safeguard payments and satisfy AML/CTF statutory compliance.",
      },
      {
        title: "2. Bank-Grade Encryption",
        body: "All identification documents and transaction records are encrypted at rest and in transit.",
      },
      {
        title: "3. No Third-Party Selling",
        body: "Your personal data is never sold or shared with third-party marketing networks.",
      },
    ],
    agreeBtn: "I Understand & Agree",
    workspaceNavAria: "Workspace navigation",
    brandOverviewAria: "Yekis — Go to Dashboard Overview",
    closeDrawerAria: "Close navigation drawer",
    expandSidebarAria: "Expand sidebar",
    collapseSidebarAria: "Collapse sidebar",
    workspaceModeLabel: "Workspace Mode",
    openDrawerAria: "Open navigation drawer",
    goBackAria: "Go back",
    switchModeAria: "Switch workspace mode",
    switchModeTitle: "Switch between Client and Freelancer modes",
    viewProfileAria: (roleText, email) => `View profile — signed in as ${roleText} (${email})`,
    openProfileAria: (email) => `Open profile (${email})`,
    mobileNavAria: "Primary mobile navigation",
    completeProfileAria: "Complete your profile",
    finishProfileTitle: "Finish your profile",
    percentComplete: (pct) => `${pct}% complete`,
    finishProfileDesc:
      "Add a photo and a short bio so clients and collaborators know who they are working with.",
    viewChecklistBtn: "View checklist",
    editProfileBtn: "Edit profile",
    dismissBannerTitle: "Dismiss — it will not come back until your profile is complete",
    dismissBannerAria: "Dismiss profile setup banner",
    jobsTitleBoth: "Marketplace Jobs & Your Posts",
    jobsTitleHire: "Jobs & Talent Pipeline",
    jobsTitleWork: "Browse Open Jobs",
    jobsDescBoth:
      "Take on open escrow-backed opportunities, or post a job and manage your own talent pipeline.",
    jobsDescHire: "Post structured milestone jobs and shortlist verified Ethiopian freelancers.",
    jobsDescWork: "Apply to milestone-funded opportunities across Ethiopia's verified marketplace.",
    openBriefsCount: (n) => `${n} Open Jobs`,
    publishBriefTitle: "Post a Job",
    publishBriefDesc: "Define project scope, ETB budget range, and target milestone delivery date",
    escrowProtectedBadge: "Escrow Protected",
    briefTitleLabel: "Job Title",
    briefTitlePlaceholder: "e.g., Telebirr H5 Merchant Checkout & Reconciliation API",
    categoryLabel: "Category",
    scopeLabel: "Scope & Deliverable Specification",
    scopePlaceholder: "Describe the outcome, acceptance criteria, and milestone deliverables (min 20 characters).",
    minBudgetLabel: "Minimum Budget (ETB)",
    maxBudgetLabel: "Maximum Budget (ETB)",
    targetDeadlineLabel: "Target Deadline",
    verifyIdentityBtn: "Verify your identity",
    publishBriefBtn: "Post Job",
    publishLockedBtn: "Verify identity first",
    jobKycGateTitle: "Identity verification required before posting a job.",
    jobKycGateReview: "Your KYC verification is under staff review. Posting unlocks once approved — we will notify you.",
    jobKycGateAction: "Verify your identity first so freelancers know jobs come from verified clients.",
    kycStatusVerified: "KYC: Verified",
    kycStatusRequired: "KYC: Required",
    kycVerifyTooltip: "Complete identity verification",
    kycVerifiedTooltip: "Identity verified",
    servicesNavLabel: "Services",
    proposalsTitleBoth: "Proposals You Sent & Received",
    proposalsTitleHire: "Talent Pipeline",
    proposalsTitleWork: "My Submitted Proposals",
    proposalsDescBoth: "Track the bids you have sent, and review the proposals that came in against your own jobs.",
    proposalsDescHire: "Review incoming proposals, shortlist candidates, and generate escrow contracts.",
    proposalsDescWork: "Track the milestone quotes you have sent and the client's decision on each one.",
    contractsTitle: "Contracts & Service Agreements",
    contractsDesc:
      "Review and sign bilingual AACCSA agreements, inspect bilateral e-signatures, and download executed contract PDFs.",
    aaccsaBadge: "AACCSA Standard v2.4",
    escrowDesc:
      "Fund milestone escrow vaults, submit deliverables for review, approve payouts, and inspect withholding tax breakdowns.",
    autoReleaseBadge: "7-Day Auto-Release Protection",
    walletTitle: "Escrow Wallet & Payment Rails",
    walletDesc: "Fund escrow or withdraw settled earnings via Telebirr, CBE Birr, and Safaricom M-Pesa.",
    casesTitle: "Dispute Resolution & Mediation Center",
    casesDesc:
      "Negotiate milestone adjustments, submit immutable evidence, and track staff mediation or AACCSA arbitration.",
    threeStageEscrowBadge: "3-Stage Escrow Protection",
    jobsTabsAria: "Jobs sections",
    jobsTabMyJobs: "My jobs",
    jobsTabFindWork: "Find work",
    jobsTabProposals: "Proposals",
    contractsTabsAria: "Contracts sections",
    contractsTabOverview: "Overview",
    contractsTabPayments: "Payments",
    contractsTabDisputes: "Disputes",
    accountMenuAria: "Account menu",
    signOutLabel: "Sign out",
  },
  am: {
    roles: {
      CLIENT: "ደንበኛ",
      FREELANCER: "ባለሙያ",
      BOTH: "ደንበኛ እና ባለሙያ",
      ADMIN: "ኦፕሬሽንስ",
      MEDIATOR: "አሸማጋይ",
    },
    directDiscussionWith: (name) => `ከ${name} ጋር ቀጥታ ውይይት`,
    directProjectDiscussion: "ቀጥታ የፕሮጀክት ውይይት",
    passwordResetSent: "መለያው ካለ፣ የይለፍ ቃል መልሶ ማግኛ ኮድ ወደ ኢሜይልዎ ተልኳል።",
    passwordResetSuccess: "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል። አሁን መግባት ይችላሉ።",
    unableToContinue: "መቀጠል አልተቻለም",
    duplicateUserError: "ይህ ኢሜይል ወይም ስልክ ቀድሞውኑ መለያ አለው። ወደ ግባ ይቀይሩ።",
    registerPhoneExistsError:
      "መለያውን መፍጠር አልተቻለም። ያ ስልክ ቁጥር ቀድሞ ተመዝግቦ ከሆነ፣ መጀመሪያ የተጠቀሙበትን ኢሜይል ተጠቅመው ይግቡ — ወይም ሌላ ቁጥር ይጠቀሙ።",
    jobErrTitleLength: "የሥራው ርዕስ ቢያንስ 5 ፊደላት መሆን አለበት።",
    jobErrDescLength: "መግለጫው ቢያንስ 20 ፊደላት መሆን አለበት።",
    jobErrBudgetRange: "ትክክለኛ በጀት ያስገቡ፤ ከፍተኛው በጀት ከዝቅተኛው በላይ ወይም እኩል መሆን አለበት።",
    jobErrChooseDeadline: "የማጠናቀቂያ ቀን ይምረጡ።",
    initialDeliveryMilestone: "የመጀመሪያ አቅርቦት",
    unableToPublishJob: "ሥራውን ማተም አልተቻለም",
    pageTitles: {
      home: "YeKis — ክፍያ በምዕራፍ እስኪጸድቅ በኤስክሮ የሚያዝ የኢትዮጵያ የፍሪላንስ ገበያ ቦታ",
      faq: "ተደጋጋሚ ጥያቄዎች — YeKis",
      fees: "ክፍያዎች እና ዋጋ — YeKis",
      privacy: "የግላዊነት ፖሊሲ — YeKis",
      terms: "የአገልግሎት ውሎች — YeKis",
      about: "ስለ እኛ — YeKis",
      caseStudies: "የሥራ ምሳሌዎች — YeKis",
      notFound: "ገጹ አልተገኘም — YeKis",
      thankYouSignup: "ወደ YeKis እንኳን በደህና መጡ!",
      thankYouJobPosted: "ሥራው ተለጥፏል — YeKis",
      thankYouContact: "መልዕክት ተልኳል — YeKis",
      telegramAuth: "በቴሌግራም ይግቡ — YeKis",
    },
    switchToDark: "ወደ ጨለማ ገጽታ ቀይር",
    switchToLight: "ወደ ብርሃን ገጽታ ቀይር",
    yekisLogoAlt: "የYeKis አርማ",
    heroEyebrow: "YeKis ሥራዎች",
    heroTitle: "በግልጽነት ይሥሩ።",
    heroSubtitle: "የታመኑ ባለሙያዎችን ያግኙ፣ የምዕራፍ ሥራዎችን ያስተዳድሩ፣ ክፍያዎችንም ከጅማሬ እስከ መጨረሻ በግልጽ ይከታተሉ።",
    heroProof1: "ሥራዎች፣ ውሎች እና ኤስክሮ በአንድ የሥራ ቦታ።",
    heroProof2: "ለኢትዮጵያውያን ደንበኞች እና ባለሙያዎች የተገነባ።",
    bothRoleTitle: "በአንድ መለያ ባለሙያ ይቅጠሩ እንዲሁም ሥራ ይሥሩ",
    loginIdentifierPlaceholder: "you@example.com ወይም 0911223344",
    emailPlaceholder: "you@example.com",
    resetTokenPlaceholder: "የመልሶ ማግኛ ኮድ ያስገቡ",
    passwordPlaceholder: "የይለፍ ቃልዎ",
    hidePassword: "የይለፍ ቃል ደብቅ",
    showPassword: "የይለፍ ቃል አሳይ",
    agreePrefix: "በ",
    termsLink: "ውሎች",
    andSeparator: " እና ",
    privacyLink: "የግላዊነት ፖሊሲ",
    customizePrefsTitle: "የግላዊነት እና የማሳወቂያ ምርጫዎችን ያስተካክሉ",
    optionsOpen: "አማራጮች ▲",
    optionsClosed: "አማራጮች ▾",
    optionalPrefsHeading: "አማራጭ የግላዊነት እና የማሳወቂያ ምርጫዎች፡",
    optPlatformAlerts: "የመድረክ ማሳወቂያዎች (የምዕራፍ እና የኤስክሮ ዝማኔዎች)",
    optMarketing: "የግብይት መልዕክቶች",
    optTelemetry: "ስም-አልባ የምርት አጠቃቀም መረጃ",
    termsModalTitle: "የአገልግሎት ውሎች",
    privacyModalTitle: "የግላዊነት ፖሊሲ",
    closeModalAria: "ዝጋ",
    termsModalIntro:
      "ወደ YeKis ሥራዎች እንኳን በደህና መጡ። መለያ በመፍጠር ወይም መድረኩን በመጠቀም እነዚህን መሠረታዊ የገበያ ቦታ ደንቦች ይቀበላሉ፡",
    termsClauses: [
      {
        title: "1. የኤስክሮ ጥበቃ",
        body: "ሥራ ከመጀመሩ በፊት ደንበኞች የምዕራፍ ገንዘብን በተጠበቀ ኤስክሮ ውስጥ ያስገባሉ። ገንዘቡ ምዕራፉ ሲጸድቅ ይለቀቃል።",
      },
      {
        title: "2. የክርክር ሽምግልና",
        body: "አለመግባባቶች በፍትሐዊ የማስረጃ አቀራረብ፣ በባለሙያዎች ሽምግልና እና በAACCSA የግልግል ደረጃዎች ይፈታሉ።",
      },
      {
        title: "3. የማንነት ማረጋገጫ (KYC)",
        body: "ተጠቃሚዎች የታመነ የገበያ ቦታን ለማረጋገጥ ገንዘብ ከማውጣታቸው በፊት በፋይዳ / በኢትዮጵያ ብሔራዊ መታወቂያ ማንነታቸውን ለማረጋገጥ ይስማማሉ።",
      },
      {
        title: "4. የክፍያ እና ኮሚሽን አወሳሰን",
        body: "የመድረክ ኮሚሽኖች እና የቴሌብር/CBE የክፍያ መስመር ክፍያዎች በግልጽ በተለጠፈው የክፍያ መርሐ-ግብር መሠረት ይከፈላሉ።",
      },
    ],
    privacyModalIntro:
      "YeKis ሥራዎች ምስጢራዊነትዎን ያከብራል እንዲሁም የኢትዮጵያን የግል መረጃ ጥበቃ አዋጅ ያከብራል፡",
    privacyClauses: [
      {
        title: "1. የመረጃ አሰባሰብ እና ዓላማ",
        body: "ክፍያዎችን ለመጠበቅ እና የAML/CTF ሕጋዊ ግዴታዎችን ለማሟላት ብቻ የስልክ ቁጥሮችን፣ ኢሜይሎችን እና የKYC መታወቂያ መረጃዎችን እንሰበስባለን።",
      },
      {
        title: "2. የባንክ ደረጃ ምስጠራ",
        body: "ሁሉም የመታወቂያ ሰነዶች እና የግብይት መዝገቦች በማከማቻም ሆነ በማስተላለፍ ላይ የተመሰጠሩ ናቸው።",
      },
      {
        title: "3. ለሶስተኛ ወገን አለመሸጥ",
        body: "የግል መረጃዎ ለሶስተኛ ወገን የግብይት አውታሮች በጭራሽ አይሸጥም ወይም አይጋራም።",
      },
    ],
    agreeBtn: "ተረድቻለሁ እና እስማማለሁ",
    workspaceNavAria: "የሥራ ቦታ አሰሳ",
    brandOverviewAria: "YeKis — ወደ ዳሽቦርድ አጠቃላይ እይታ ሂድ",
    closeDrawerAria: "የአሰሳ መሳቢያ ዝጋ",
    expandSidebarAria: "የጎን አሞሌ ዘርጋ",
    collapseSidebarAria: "የጎን አሞሌ ሰብስብ",
    workspaceModeLabel: "የሥራ ቦታ ሁኔታ",
    openDrawerAria: "የአሰሳ መሳቢያ ክፈት",
    goBackAria: "ወደ ኋላ ተመለስ",
    switchModeAria: "የሥራ ቦታ ሁኔታ ቀይር",
    switchModeTitle: "በደንበኛ እና በባለሙያ ሁኔታዎች መካከል ይቀይሩ",
    viewProfileAria: (roleText, email) => `መገለጫ ይመልከቱ — እንደ ${roleText} ገብተዋል (${email})`,
    openProfileAria: (email) => `መገለጫ ክፈት (${email})`,
    mobileNavAria: "ዋና የሞባይል አሰሳ",
    completeProfileAria: "መገለጫዎን ያጠናቅቁ",
    finishProfileTitle: "መገለጫዎን ያጠናቅቁ",
    percentComplete: (pct) => `${pct}% ተጠናቋል`,
    finishProfileDesc: "ደንበኞች እና ተባባሪዎች ከማን ጋር እንደሚሠሩ እንዲያውቁ ፎቶ እና አጭር መግለጫ ያክሉ።",
    viewChecklistBtn: "ዝርዝሩን ይመልከቱ",
    editProfileBtn: "መገለጫ አርትዕ",
    dismissBannerTitle: "አስወግድ — መገለጫዎ እስኪጠናቀቅ ድረስ አይመለስም",
    dismissBannerAria: "የመገለጫ ማጠናቀቂያ ማስታወቂያውን ዝጋ",
    jobsTitleBoth: "የገበያ ቦታ ሥራዎች እና የእርስዎ ልጥፎች",
    jobsTitleHire: "ሥራዎች እና የባለሙያዎች ዝርዝር",
    jobsTitleWork: "ክፍት ሥራዎችን ያስሱ",
    jobsDescBoth: "በኤስክሮ የተደገፉ ክፍት ዕድሎችን ይቀበሉ ወይም ሥራ ለጥፈው የራስዎን ቡድን ያስተዳድሩ።",
    jobsDescHire: "የተዋቀሩ የምዕራፍ ሥራዎችን ይለጥፉ እና የተረጋገጡ ኢትዮጵያውያን ባለሙያዎችን ይምረጡ።",
    jobsDescWork: "በኢትዮጵያ በተረጋገጠ የገበያ ቦታ ላይ በምዕራፍ ለሚከፈሉ ዕድሎች ያመልክቱ።",
    openBriefsCount: (n) => `${n} ክፍት ሥራዎች`,
    publishBriefTitle: "አዲስ ሥራ ይለጥፉ",
    publishBriefDesc: "የፕሮጀክቱን ወሰን፣ የብር በጀት ክልል እና የምዕራፍ ማስረከቢያ ቀንን ይግለጹ",
    escrowProtectedBadge: "በኤስክሮ የተጠበቀ",
    briefTitleLabel: "የሥራ ርዕስ",
    briefTitlePlaceholder: "ለምሳሌ፡ የቴሌብር H5 ነጋዴ ክፍያ እና ማስታረቂያ API",
    categoryLabel: "ዘርፍ",
    scopeLabel: "ወሰን እና የሚቀርብ ሥራ መግለጫ",
    scopePlaceholder: "ውጤቱን፣ የመቀበያ መስፈርቶችን እና የምዕራፍ ውጤቶችን ይግለጹ (ቢያንስ 20 ፊደላት)።",
    minBudgetLabel: "ዝቅተኛ በጀት (ብር)",
    maxBudgetLabel: "ከፍተኛ በጀት (ብር)",
    targetDeadlineLabel: "የታለመ የማጠናቀቂያ ቀን",
    verifyIdentityBtn: "ማንነትዎን ያረጋግጡ",
    publishBriefBtn: "ሥራ ይለጥፉ",
    publishLockedBtn: "መጀመሪያ ማንነትዎን ያረጋግጡ",
    jobKycGateTitle: "ሥራ ከመለጠፍዎ በፊት የማንነት ማረጋገጫ ያስፈልጋል።",
    jobKycGateReview: "የKYC ማረጋገጫዎ በባለሙያ እየተገመገመ ነው። ሲጸድቅ መለጠፍ ይከፈታል — እናሳውቅዎታለን።",
    jobKycGateAction: "ባለሙያዎች ሥራው ከተረጋገጠ ደንበኛ መሆኑን እንዲያውቁ መጀመሪያ ማንነትዎን ያረጋግጡ።",
    kycStatusVerified: "ማንነት፡ ተረጋግጧል",
    kycStatusRequired: "ማንነት፡ ያስፈልጋል",
    kycVerifyTooltip: "የማንነት ማረጋገጫን ያጠናቅቁ",
    kycVerifiedTooltip: "ማንነት ተረጋግጧል",
    servicesNavLabel: "አገልግሎቶች",
    proposalsTitleBoth: "የላኳቸው እና የተቀበሏቸው የሥራ ሐሳቦች",
    proposalsTitleHire: "የባለሙያዎች ዝርዝር",
    proposalsTitleWork: "ያቀረብኳቸው የሥራ ሐሳቦች",
    proposalsDescBoth: "የላኳቸውን ጨረታዎች ይከታተሉ እንዲሁም በእርስዎ ዝርዝሮች ላይ የመጡትን ሐሳቦች ይገምግሙ።",
    proposalsDescHire: "የመጡ የሥራ ሐሳቦችን ይገምግሙ፣ እጩዎችን ይምረጡ እና የኤስክሮ ውሎችን ያዘጋጁ።",
    proposalsDescWork: "የላኳቸውን የምዕራፍ ዋጋ ግምቶች እና የደንበኛውን ውሳኔ ይከታተሉ።",
    contractsTitle: "ውሎች እና የአገልግሎት ስምምነቶች",
    contractsDesc: "ባለሁለት ቋንቋ የAACCSA ስምምነቶችን ይገምግሙና ይፈርሙ፣ ፊርማዎችን ያረጋግጡ፣ PDF ውሎችን ያውርዱ።",
    aaccsaBadge: "AACCSA መደበኛ v2.4",
    escrowDesc: "የምዕራፍ ኤስክሮ ካዝናዎችን ይሙሉ፣ ሥራ ለግምገማ ያቅርቡ፣ ክፍያ ያጽድቁ እና የግብር ዝርዝርን ይመልከቱ።",
    autoReleaseBadge: "የ7-ቀን ራስ-ሰር ክፍያ ጥበቃ",
    walletTitle: "የኤስክሮ ቦርሳ እና የክፍያ መስመሮች",
    walletDesc: "በቴሌብር፣ በCBE ብር እና በሳፋሪኮም M-Pesa ኤስክሮ ይሙሉ ወይም የተጣራ ገቢዎን ያውጡ።",
    casesTitle: "የክርክር አፈታት እና የሽምግልና ማዕከል",
    casesDesc: "የምዕራፍ ማስተካከያዎችን ይደራደሩ፣ የማይለወጡ ማስረጃዎችን ያቅርቡ እና የሽምግልና ሂደትን ይከታተሉ።",
    threeStageEscrowBadge: "ባለ 3-ደረጃ የኤስክሮ ጥበቃ",
    jobsTabsAria: "የሥራ ክፍሎች",
    jobsTabMyJobs: "የእኔ ሥራዎች",
    jobsTabFindWork: "ሥራ ፈልግ",
    jobsTabProposals: "ፕሮፖዛሎች",
    contractsTabsAria: "የውል ክፍሎች",
    contractsTabOverview: "አጠቃላይ እይታ",
    contractsTabPayments: "ክፍያዎች",
    contractsTabDisputes: "ክርክሮች",
    accountMenuAria: "የመለያ ዝርዝር",
    signOutLabel: "ውጣ",
  },
  om: {
    roles: {
      CLIENT: "Maamila",
      FREELANCER: "Ogeessa",
      BOTH: "Maamila fi Ogeessa",
      ADMIN: "Hojiiwwan",
      MEDIATOR: "Jaarsa Araaraa",
    },
    directDiscussionWith: (name) => `Marii kallattii ${name} waliin`,
    directProjectDiscussion: "Marii Pirojektii Kallattii",
    passwordResetSent: "Herregni yoo jiraate, koodiin deebisuu gara imeelii keessaniitti ergameera.",
    passwordResetSuccess: "Jechi icciitii milkaa'inaan jijjiirameera. Amma seenuu dandeessu.",
    unableToContinue: "Itti fufuun hin danda'amne",
    duplicateUserError: "Imeeliin ykn bilbilli kun duraan herrega qaba. Gara seenuutti jijjiiraa.",
    registerPhoneExistsError:
      "Herregicha uumuun hin danda'amne. Lakkoofsi bilbilaa sun duraan galmaa'eera yoo ta'e, imeelii yeroo jalqabaa fayyadamtanuun seenaa — ykn lakkoofsa biraa fayyadamaa.",
    jobErrTitleLength: "Matadureen hojii yoo xiqqaate arfiilee 5 qabaachuu qaba.",
    jobErrDescLength: "Ibsichi yoo xiqqaate arfiilee 20 qabaachuu qaba.",
    jobErrBudgetRange: "Baajata sirrii galchaa; baajatni olaanaan kan gadi aanaa ol ykn walqixa ta'uu qaba.",
    jobErrChooseDeadline: "Guyyaa xumuraa filadhaa.",
    initialDeliveryMilestone: "Dhiyeessii jalqabaa",
    unableToPublishJob: "Hojicha maxxansuun hin danda'amne",
    pageTitles: {
      home: "YeKis — Gabaa Hojii Itoophiyaa kaffaltiin boqonnaa hanga mirkanaa'utti eegamu",
      faq: "Gaaffilee Yeroo Baay'ee — YeKis",
      fees: "Gatii fi Kaffaltii — YeKis",
      privacy: "Imaammata Icciitii — YeKis",
      terms: "Waliigaltee Tajaajilaa — YeKis",
      about: "Waa'ee Keenya — YeKis",
      caseStudies: "Qorannoowwan Hojii — YeKis",
      notFound: "Fuulli Hin Argamne — YeKis",
      thankYouSignup: "Gara YeKis Baga Nagaan Dhuftan!",
      thankYouJobPosted: "Hojiin Maxxanfameera — YeKis",
      thankYouContact: "Ergaan Ergameera — YeKis",
      telegramAuth: "Telegram'n Seenaa — YeKis",
    },
    switchToDark: "Gara haala dukkanaa'aatti jijjiiri",
    switchToLight: "Gara haala ifaatti jijjiiri",
    yekisLogoAlt: "Asxaa YeKis",
    heroEyebrow: "Hojiiwwan YeKis",
    heroTitle: "Ifatti hojjedhaa.",
    heroSubtitle:
      "Ogeeyyii amanamoo argadhaa, hojii boqonnaa bulchaa, kaffaltiiwwan jalqabaa hanga xumuraatti ifatti hordofaa.",
    heroProof1: "Hojiiwwan, waliigaltee fi iskuuroon bakka hojii tokko keessatti.",
    heroProof2: "Maamiltootaa fi ogeeyyii Itoophiyaaf kan ijaarame.",
    bothRoleTitle: "Herrega tokkoon ogeessa qaxaraa fi hojii hojjedhaa",
    loginIdentifierPlaceholder: "you@example.com ykn 0911223344",
    emailPlaceholder: "you@example.com",
    resetTokenPlaceholder: "Koodii deebisuu galchaa",
    passwordPlaceholder: "Jecha icciitii keessan",
    hidePassword: "Jecha icciitii dhoksi",
    showPassword: "Jecha icciitii mul'isi",
    agreePrefix: "Ani ",
    termsLink: "Waliigaltee",
    andSeparator: " fi ",
    privacyLink: "Imaammata Icciitii",
    customizePrefsTitle: "Filannoowwan icciitii fi beeksisaa sirreessaa",
    optionsOpen: "Filannoowwan ▲",
    optionsClosed: "Filannoowwan ▾",
    optionalPrefsHeading: "Filannoowwan icciitii fi beeksisaa dirqama hin taane:",
    optPlatformAlerts: "Beeksisoota waltajjii (odeeffannoo boqonnaa fi iskuuroo)",
    optMarketing: "Ergaawwan gabaa",
    optTelemetry: "Daataa itti fayyadamaa maqaa hin qabne",
    termsModalTitle: "Waliigaltee Tajaajilaa",
    privacyModalTitle: "Imaammata Icciitii",
    closeModalAria: "Cufi",
    termsModalIntro:
      "Gara Hojiiwwan YeKis baga nagaan dhuftan. Herrega uumuun ykn waltajjii kana fayyadamuun ulaagaalee gabaa bu'uuraa kana ni fudhattu:",
    termsClauses: [
      {
        title: "1. Eegumsa Iskuuroo",
        body: "Maamiltoonni hojiin osoo hin jalqabin maallaqa boqonnaa gara iskuuroo eegamaa keessa kaa'u. Maallaqichi yammuu boqonnaan mirkanaa'u gadhiifama.",
      },
      {
        title: "2. Araara Waldiddaa",
        body: "Waldiddaawwan dhiyeessii ragaa haqa qabeessaa, jaarsummaa hojjettootaa fi sadarkaa araaraa AACCSA'n furamu.",
      },
      {
        title: "3. Mirkaneessa Eenyummaa (KYC)",
        body: "Fayyadamtoonni maallaqa baasuuf osoo hin gaafatin dura Fayda / Waraqaa Eenyummaa Biyyaalessaa Itoophiyaatiin eenyummaa isaanii mirkaneessuuf waliigalu.",
      },
      {
        title: "4. Qoodinsa Kaffaltii",
        body: "Koomishiiniin waltajjii fi kaffaltiin karaa Telebirr/CBE tarree kaffaltii ifatti maxxanfame hordofa.",
      },
    ],
    privacyModalIntro:
      "Hojiiwwan YeKis icciitii keessan ni kabaja akkasumas Labsii Eegumsa Daataa Dhuunfaa Itoophiyaa ni eega:",
    privacyClauses: [
      {
        title: "1. Walitti Qabiinsa Daataa fi Kaayyoo",
        body: "Lakkoofsota bilbilaa, imeelii fi eenyummaa KYC kaffaltii eeguuf fi dirqama seeraa AML/CTF guutuuf qofa walitti qabna.",
      },
      {
        title: "2. Icciiteessuu Sadarkaa Baankii",
        body: "Sanadoonni eenyummaa fi galmeewwan kaffaltii hundi kuusaa fi daddabarsa irratti icciiteeffamaniiru.",
      },
      {
        title: "3. Qaama Sadaffaatti Gurguruu Dhiisuu",
        body: "Daataan dhuunfaa keessan qaama sadaffaa gabaa kamiyyuu hin gurguramu ykn hin qoodamu.",
      },
    ],
    agreeBtn: "Hubadheera, Waliigaleeras",
    workspaceNavAria: "Qajeelfama bakka hojii",
    brandOverviewAria: "YeKis — Gara Ilaalcha Daashboordii deemi",
    closeDrawerAria: "Qajeelfama cufi",
    expandSidebarAria: "Saayidbaarii bal'isi",
    collapseSidebarAria: "Saayidbaarii dhiphisi",
    workspaceModeLabel: "Haala Bakka Hojii",
    openDrawerAria: "Qajeelfama bani",
    goBackAria: "Duubatti deebi'i",
    switchModeAria: "Haala bakka hojii jijjiiri",
    switchModeTitle: "Haala Maamila fi Ogeessa gidduutti jijjiiri",
    viewProfileAria: (roleText, email) => `Piroofaayilii ilaali — akka ${roleText}'tti seenteerta (${email})`,
    openProfileAria: (email) => `Piroofaayilii bani (${email})`,
    mobileNavAria: "Qajeelfama mobaayilaa ijoo",
    completeProfileAria: "Piroofaayilii keessan xumuraa",
    finishProfileTitle: "Piroofaayilii keessan xumuraa",
    percentComplete: (pct) => `%${pct} xumurameera`,
    finishProfileDesc: "Maamiltoonni fi tumsaan eenyu waliin akka hojjetan akka beekaniif suuraa fi ibsa gabaabaa dabalaa.",
    viewChecklistBtn: "Tarree mirkaneessaa ilaali",
    editProfileBtn: "Piroofaayilii gulaali",
    dismissBannerTitle: "Balleessi — hanga piroofaayiliin kee guutamutti hin deebi'u",
    dismissBannerAria: "Beeksisa qophii piroofaayilii cufi",
    jobsTitleBoth: "Hojiiwwan Gabaa fi Maxxansa Keessan",
    jobsTitleHire: "Hojiiwwan fi Tarree Ogeeyyii",
    jobsTitleWork: "Hojiiwwan Banaa Sakatta'aa",
    jobsDescBoth: "Carraawwan iskuuroon deeggaraman fudhadhaa, ykn hojii maxxansaatii garee keessan bulchaa.",
    jobsDescHire: "Hojiiwwan boqonnaa qindaa'aa maxxansaatii ogeeyyii Itoophiyaa mirkanaa'an filadhaa.",
    jobsDescWork: "Carraawwan boqonnaadhaan kaffalaman irratti iyyadhaa.",
    openBriefsCount: (n) => `Hojii Banaa ${n}`,
    publishBriefTitle: "Hojii Haaraa Maxxansi",
    publishBriefDesc: "Daangaa pirojektii, baajata ETB fi guyyaa boqonnaan itti dhiyaatu ibsaa",
    escrowProtectedBadge: "Iskuuroodhaan Eegame",
    briefTitleLabel: "Mataduree Hojii",
    briefTitlePlaceholder: "fkn., Telebirr H5 Merchant Checkout & Reconciliation API",
    categoryLabel: "Ramaddii",
    scopeLabel: "Daangaa fi Ibsa Bu'aa Hojii",
    scopePlaceholder: "Bu'aa eegamu, ulaagaa fudhatamaa fi dhiyeessii boqonnaa ibsaa (xiqqaate arfiilee 20).",
    minBudgetLabel: "Baajata Xiqqaa (ETB)",
    maxBudgetLabel: "Baajata Guddaa (ETB)",
    targetDeadlineLabel: "Guyyaa Xumuraa Karoorfame",
    verifyIdentityBtn: "Eenyummaa keessan mirkaneessaa",
    publishBriefBtn: "Hojii Maxxansi",
    publishLockedBtn: "Dura eenyummaa mirkaneessi",
    jobKycGateTitle: "Hojii maxxansuuf dura mirkaneessi eenyummaa barbaachisa.",
    jobKycGateReview: "Mirkaneessi KYC keessan gamaaggamamaa jira. Yeroo mirkanaa'u ni banama — isin beeksifna.",
    jobKycGateAction: "Ogeeyyiin hojichi maamila mirkanaa'e irraa dhufuu isaa akka beekan dura eenyummaa keessan mirkaneessaa.",
    kycStatusVerified: "KYC: Mirkanaa'e",
    kycStatusRequired: "KYC: Barbaachisaa",
    kycVerifyTooltip: "Mirkaneessa eenyummaa xumuraa",
    kycVerifiedTooltip: "Eenyummaan mirkanaa'eera",
    servicesNavLabel: "Tajaajiloota",
    proposalsTitleBoth: "Yaada Hojii Ergitan fi Argattan",
    proposalsTitleHire: "Tarree Ogeeyyii",
    proposalsTitleWork: "Yaada Hojii Ani Erge",
    proposalsDescBoth: "Dorgommii ergitan hordofaa, yaada ibsa keessaniif dhiyaate ilaalaa.",
    proposalsDescHire: "Yaadota dhiyaatan ilaalaa, kaadhimamtoota filadhaa, waliigaltee iskuuroo uumaa.",
    proposalsDescWork: "Gatii boqonnaa ergitanii fi murtoo maamila tokkoon tokkoo irraa eegamu hordofaa.",
    contractsTitle: "Waliigalteewwanii fi Sanadoota Tajaajilaa",
    contractsDesc: "Waliigaltee AACCSA afaan lamaan ilaalaa mallatteessaa, mallattoo e-signature gama lamaan sakatta'aa, PDF buufadhaa.",
    aaccsaBadge: "Sadarkaa AACCSA v2.4",
    escrowDesc: "Kuusaa iskuuroo boqonnaa guutaa, bu'aa hojii gamaaggamaaf ergaa, kaffaltii mirkaneessaa, ibsa gibiraa ilaalaa.",
    autoReleaseBadge: "Eegumsa Gadhiisii Ofumaan Guyyaa-7",
    walletTitle: "Waletii Iskuuroo fi Karaalee Kaffaltii",
    walletDesc: "Telebirr, CBE Birr fi Safaricom M-Pesa tiin iskuuroo guutaa ykn galii mirkanaa'e baasaa.",
    casesTitle: "Wiirtuu Furmaata Waldiddaa fi Araaraa",
    casesDesc: "Sirreeffama boqonnaa irratti mari'adhaa, ragaa hin jijjiiramne dhiyeessaa, jaarsummaa hojjettootaa ykn araara AACCSA hordofaa.",
    threeStageEscrowBadge: "Eegumsa Iskuuroo Sadarkaa-3",
    jobsTabsAria: "Kutaalee hojii",
    jobsTabMyJobs: "Hojiiwwan koo",
    jobsTabFindWork: "Hojii barbaadi",
    jobsTabProposals: "Yaadolee",
    contractsTabsAria: "Kutaalee waliigaltee",
    contractsTabOverview: "Ilaalcha waliigalaa",
    contractsTabPayments: "Kaffaltiiwwan",
    contractsTabDisputes: "Falmiiwwan",
    accountMenuAria: "Baafata herregaa",
    signOutLabel: "Bahi",
  },
  ti: {
    roles: {
      CLIENT: "ዓሚል",
      FREELANCER: "ክኢላ",
      BOTH: "ዓሚልን ክኢላን",
      ADMIN: "ኦፕሬሽንስ",
      MEDIATOR: "ሽማግለ",
    },
    directDiscussionWith: (name) => `ቀጥታዊ ዘተ ምስ ${name}`,
    directProjectDiscussion: "ቀጥታዊ ዘተ ፕሮጀክት",
    passwordResetSent: "ኣካውንት እንተሃልዩ፣ ኮድ መመለሲ መሕለፊ ቃል ናብ ኢሜይልኩም ተላኢኹ ኣሎ።",
    passwordResetSuccess: "መሕለፊ ቃል ብዓወት ተቐይሩ ኣሎ። ሕጂ ክትኣትዉ ትኽእሉ ኢኹም።",
    unableToContinue: "ምቕጻል ኣይተኻእለን",
    duplicateUserError: "እዚ ኢሜይል ወይ ስልኪ ድሮ ኣካውንት ኣለዎ። ናብ ምእታው ቀይሩ።",
    registerPhoneExistsError:
      "ነቲ ኣካውንት ክንፈጥሮ ኣይከኣልናን። እቲ ቁጽሪ ስልኪ ድሮ ተመዝጊቡ እንተኾይኑ፣ መጀመርታ ዝተጠቐምኩምሉ ኢሜይል ተጠቒምኩም እተዉ — ወይ ካልእ ቁጽሪ ተጠቐሙ።",
    jobErrTitleLength: "ኣርእስቲ ስራሕ ብውሑዱ 5 ፊደላት ክኸውን ኣለዎ።",
    jobErrDescLength: "መግለጺ ብውሑዱ 20 ፊደላት ክኸውን ኣለዎ።",
    jobErrBudgetRange: "ቅኑዕ ባጀት የእትዉ፤ ዝለዓለ ባጀት ካብቲ ዝተሓተ ዝበለጸ ወይ ማዕረ ክኸውን ኣለዎ።",
    jobErrChooseDeadline: "ናይ መወዳእታ ዕለት ምረጹ።",
    initialDeliveryMilestone: "መጀመርታ ርክክብ",
    unableToPublishJob: "ነቲ ስራሕ ምሕታም ኣይተኻእለን",
    pageTitles: {
      home: "YeKis — ክፍሊት ምዕራፍ ክሳብ ዝጸድቕ ብኤስክሮ ዝተሓዝ ናይ ኢትዮጵያ ፍሪላንስ ዕዳጋ",
      faq: "ብተደጋጋሚ ዝሕተቱ ሕቶታት — YeKis",
      fees: "ክፍሊታትን ዋጋን — YeKis",
      privacy: "ፖሊሲ ብሕትውና — YeKis",
      terms: "ውዕላት ኣገልግሎት — YeKis",
      about: "ብዛዕባና — YeKis",
      caseStudies: "መጽናዕቲ ኣብነታት — YeKis",
      notFound: "ገጽ ኣይተረኽበን — YeKis",
      thankYouSignup: "ናብ YeKis እንቋዕ ብደሓን መጻእኩም!",
      thankYouJobPosted: "ስራሕ ተለጢፉ — YeKis",
      thankYouContact: "መልእኽቲ ተላኢኹ — YeKis",
      telegramAuth: "ብቴሌግራም እተዉ — YeKis",
    },
    switchToDark: "ናብ ጸልማት ቅዲ ቀይር",
    switchToLight: "ናብ ብርሃን ቅዲ ቀይር",
    yekisLogoAlt: "ኣርማ YeKis",
    heroEyebrow: "ስራሕቲ YeKis",
    heroTitle: "ብንጹርነት ስርሑ።",
    heroSubtitle: "ዝተኣመኑ ክኢላታት ርኸቡ፣ ስራሕ ምዕራፋት ኣመሓድሩ፣ ክፍሊታት ካብ መጀመርታ ክሳብ መወዳእታ ብግልጺ ተኸታተሉ።",
    heroProof1: "ስራሕቲ፣ ውዕላትን ኤስክሮን ኣብ ሓደ ናይ ስራሕ ቦታ።",
    heroProof2: "ንኢትዮጵያውያን ዓማዊልን ክኢላታትን ዝተሃንጸ።",
    bothRoleTitle: "ብሓደ ኣካውንት ክኢላ ቁጸሩ ከምኡ'ውን ስራሕ ስርሑ",
    loginIdentifierPlaceholder: "you@example.com ወይ 0911223344",
    emailPlaceholder: "you@example.com",
    resetTokenPlaceholder: "ኮድ መመለሲ የእትዉ",
    passwordPlaceholder: "መሕለፊ ቃልኩም",
    hidePassword: "መሕለፊ ቃል ሕባእ",
    showPassword: "መሕለፊ ቃል ኣርኢ",
    agreePrefix: "ኣብ ",
    termsLink: "ውዕላት",
    andSeparator: " ከምኡ'ውን ",
    privacyLink: "ፖሊሲ ብሕትውና",
    customizePrefsTitle: "ምርጫታት ብሕትውናን መፍለጢን ኣተዓራርዩ",
    optionsOpen: "ኣማራጺታት ▲",
    optionsClosed: "ኣማራጺታት ▾",
    optionalPrefsHeading: "ኣማራጺ ምርጫታት ብሕትውናን መፍለጢን፡",
    optPlatformAlerts: "መፍለጢታት መድረኽ (ሓበሬታ ምዕራፍን ኤስክሮን)",
    optMarketing: "መልእኽትታት ዕዳጋ",
    optTelemetry: "ስም-ኣልቦ ሓበሬታ ኣጠቓቕማ",
    termsModalTitle: "ውዕላት ኣገልግሎት",
    privacyModalTitle: "ፖሊሲ ብሕትውና",
    closeModalAria: "ዕጾ",
    termsModalIntro:
      "ናብ ስራሕቲ YeKis እንቋዕ ብደሓን መጻእኩም። ኣካውንት ብምፍጣር ወይ ነዚ መድረኽ ብምጥቃም ነዞም መሰረታውያን መለክዒታት ዕዳጋ ትቕበሉ፡",
    termsClauses: [
      {
        title: "1. ሓለዋ ኤስክሮ",
        body: "ስራሕ ቅድሚ ምጅማሩ ዓማዊል ገንዘብ ምዕራፍ ናብ ውሑስ ኤስክሮ የእትዉ። እቲ ገንዘብ ምዕራፍ ምስ ጸደቐ ይልቀቕ።",
      },
      {
        title: "2. ሽምግልና ክርክር",
        body: "ዘይምርድዳኣት ብፍትሓዊ ምቕራብ መርትዖ፣ ብሽምግልና ሰራሕተኛታትን ብመለክዒታት ግልግል AACCSAን ይፍታሕ።",
      },
      {
        title: "3. ምርግጋጽ መንነት (KYC)",
        body: "ተጠቀምቲ ዝተኣመነ ዕዳጋ ንምርግጋጽ ገንዘብ ቅድሚ ምውጽኦም ብፋይዳ / ብሃገራዊ መንነት ኢትዮጵያ መንነቶም ከረጋግጹ ይሰማምዑ።",
      },
      {
        title: "4. ኣመዳድባ ክፍሊት",
        body: "ኮሚሽን መድረኽን ክፍሊት መስመራት ቴሌብር/CBEን በቲ ብግልጺ ዝተለጠፈ ሰሌዳ ክፍሊት መሰረት ይፍጸሙ።",
      },
    ],
    privacyModalIntro:
      "ስራሕቲ YeKis ምስጢራውነትኩም የኽብር ከምኡ'ውን ኣዋጅ ሓለዋ ውልቃዊ ዳታ ኢትዮጵያ የኽብር፡",
    privacyClauses: [
      {
        title: "1. ኣተኣኻኽባ ዳታን ዕላማን",
        body: "ክፍሊታት ንምሕላውን ሕጋዊ ግዴታታት AML/CTF ንምምላእን ጥራይ ቁጽርታት ስልኪ፣ ኢሜይላትን መንነት KYCን ንእክብ።",
      },
      {
        title: "2. ምስጢራዊነት ብደረጃ ባንክ",
        body: "ኩሎም ሰነዳት መንነትን መዝገባት ግብይትን ኣብ መኽዘንን መስመር ምትሕልላፍን ብምስጢር ዝተዓቀቡ እዮም።",
      },
      {
        title: "3. ንሳልሳይ ወገን ዘይምሻጥ",
        body: "ውልቃዊ ዳታኹም ንሳልሳይ ወገን መርበባት ዕዳጋ ፈጺሙ ኣይሽየጥን ወይ ኣይካፈልን።",
      },
    ],
    agreeBtn: "ተረዲኡኒ እዩ፣ ተሰማሚዐ'ውን",
    workspaceNavAria: "ዳህሳስ ቦታ ስራሕ",
    brandOverviewAria: "YeKis — ናብ ሓፈሻዊ ዳሽቦርድ ኪድ",
    closeDrawerAria: "መሳቢ ዳህሳስ ዕጾ",
    expandSidebarAria: "ጎናዊ ኣሞሌ ዘርግሕ",
    collapseSidebarAria: "ጎናዊ ኣሞሌ ኣጽብብ",
    workspaceModeLabel: "ኩነታት ቦታ ስራሕ",
    openDrawerAria: "መሳቢ ዳህሳስ ክፈት",
    goBackAria: "ንድሕሪት ተመለስ",
    switchModeAria: "ኩነታት ቦታ ስራሕ ቀይር",
    switchModeTitle: "ኣብ መንጎ ኩነታት ዓሚልን ክኢላን ቀይሩ",
    viewProfileAria: (roleText, email) => `ፕሮፋይል ርአ — ከም ${roleText} ኣቲኹም ኣለኹም (${email})`,
    openProfileAria: (email) => `ፕሮፋይል ክፈት (${email})`,
    mobileNavAria: "ቀንዲ ዳህሳስ ሞባይል",
    completeProfileAria: "ፕሮፋይልኩም ዛዝሙ",
    finishProfileTitle: "ፕሮፋይልኩም ዛዝሙ",
    percentComplete: (pct) => `${pct}% ተዛዚሙ`,
    finishProfileDesc: "ዓማዊልን መሻርኽትን ምስ መን ከም ዝሰርሑ ምእንቲ ክፈልጡ ስእልን ሓጺር መግለጽን ወስኹ።",
    viewChecklistBtn: "ዝርዝር ምርግጋጽ ርአ",
    editProfileBtn: "ፕሮፋይል ኣርትዕ",
    dismissBannerTitle: "ኣወግድ — ፕሮፋይልኩም ክሳብ ዝዛዘም ኣይምለስን እዩ",
    dismissBannerAria: "መፍለጢ ምድላው ፕሮፋይል ዕጾ",
    jobsTitleBoth: "ስራሕቲ ዕዳጋን ልጥፋትኩምን",
    jobsTitleHire: "ስራሕትን መስመር ክኢላታትን",
    jobsTitleWork: "ክፉታት ስራሕቲ ዳህስሱ",
    jobsDescBoth: "ብኤስክሮ ዝተሓገዙ ክፉታት ዕድላት ውሰዱ ወይ ስራሕ ለጢፍኩም ጉጅለኹም ኣመሓድሩ።",
    jobsDescHire: "ዝተዋደዱ ናይ ምዕራፍ ስራሕቲ ለጥፉ ከምኡ'ውን ዝተረጋገጹ ኢትዮጵያውያን ክኢላታት ምረጹ።",
    jobsDescWork: "ኣብ ዝተረጋገጸ ዕዳጋ ኢትዮጵያ ብምዕራፍ ንዝኽፈሉ ዕድላት ኣመልክቱ።",
    openBriefsCount: (n) => `${n} ክፉታት ስራሕቲ`,
    publishBriefTitle: "ሓድሽ ስራሕ ለጥፉ",
    publishBriefDesc: "ወሰን ፕሮጀክት፣ ደረት ባጀት ብር ከምኡ'ውን ዕለት ርክክብ ምዕራፍ ግለጹ",
    escrowProtectedBadge: "ብኤስክሮ ዝተሓለወ",
    briefTitleLabel: "ኣርእስቲ ስራሕ",
    briefTitlePlaceholder: "ንኣብነት፡ Telebirr H5 Merchant Checkout & Reconciliation API",
    categoryLabel: "ዓውዲ",
    scopeLabel: "ዝርዝር ወሰንን ዝቐርብ ውጽኢትን",
    scopePlaceholder: "ውጽኢት፣ መለክዒታት ተቐባልነትን ዝቐርቡ ምዕራፋትን ግለጹ (ብውሑዱ 20 ፊደላት)።",
    minBudgetLabel: "ዝተሓተ ባጀት (ብር)",
    maxBudgetLabel: "ዝለዓለ ባጀት (ብር)",
    targetDeadlineLabel: "ዝተተለመ ዕለት መወዳእታ",
    verifyIdentityBtn: "መንነትኩም ኣረጋግጹ",
    publishBriefBtn: "ስራሕ ለጥፍ",
    publishLockedBtn: "መጀመርታ መንነትኩም ኣረጋግጹ",
    jobKycGateTitle: "ስራሕ ቅድሚ ምልጣፍኩም ምርግጋጽ መንነት የድሊ።",
    jobKycGateReview: "ምርግጋጽ KYCኩም ብሰራሕተኛታት ይምርመር ኣሎ። ምስ ጸደቐ ክኽፈት እዩ — ክንሕብረኩም ኢና።",
    jobKycGateAction: "ክኢላታት ስራሕ ካብ ዝተረጋገጸ ዓሚል ከም ዝመጸ ክፈልጡ መጀመርታ መንነትኩም ኣረጋግጹ።",
    kycStatusVerified: "KYC: ተረጋጊጹ",
    kycStatusRequired: "KYC: የድሊ",
    kycVerifyTooltip: "ምርግጋጽ መንነት ዛዝሙ",
    kycVerifiedTooltip: "መንነት ተረጋጊጹ",
    servicesNavLabel: "ኣገልግሎታት",
    proposalsTitleBoth: "ዝለኣኽኩምዎምን ዝተቐበልኩምዎምን እማመታት",
    proposalsTitleHire: "መስመር ክኢላታት",
    proposalsTitleWork: "ዝለኣኽክዎም እማመታት",
    proposalsDescBoth: "ዝለኣኽኩምዎም ውድድራት ተኸታተሉ፣ ናብ ስራሕኩም ዝመጹ እማመታት'ውን ገምግሙ።",
    proposalsDescHire: "ዝመጹ እማመታት ገምግሙ፣ ሕጹያት ምረጹ፣ ውዕላት ኤስክሮ ፍጠሩ።",
    proposalsDescWork: "ዝለኣኽኩምዎም ዋጋታት ምዕራፍን ውሳነ ዓሚልን ተኸታተሉ።",
    contractsTitle: "ውዕላትን ስምምዓት ኣገልግሎትን",
    contractsDesc: "ብክልተ ቋንቋ ዝተዳለዉ ስምምዓት AACCSA ገምግሙን ፈርሙን፣ ኤሌክትሮኒካዊ ፊርማታት መርምሩ፣ PDF ውዕል ኣውርዱ።",
    aaccsaBadge: "AACCSA መደበኛ v2.4",
    escrowDesc: "ካዝና ኤስክሮ ምዕራፋት ምልኡ፣ ዝተሰርሐ ስራሕ ንግምገማ ኣቕርቡ፣ ክፍሊት ኣጽድቑ፣ ዝርዝር ግብሪ ርኣዩ።",
    autoReleaseBadge: "ሓለዋ ርእሰ-ምልቃቕ 7-መዓልቲ",
    walletTitle: "ዋሌት ኤስክሮን መስመራት ክፍሊትን",
    walletDesc: "ብቴሌብር፣ CBE ብርን ሳፋሪኮም M-Pesaን ኤስክሮ ምልኡ ወይ ዝጸደቐ ኣታዊ ኣውጽኡ።",
    casesTitle: "ማእከል ምፍታሕ ክርክርን ሽምግልናን",
    casesDesc: "ኣብ ምትዕርራይ ምዕራፍ ተዘራረቡ፣ ዘይቅየር መርትዖ ኣቕርቡ፣ ሽምግልና ወይ ግልግል AACCSA ተኸታተሉ።",
    threeStageEscrowBadge: "ሓለዋ ኤስክሮ በዓል 3-ደረጃ",
    jobsTabsAria: "ክፋላት ስራሕ",
    jobsTabMyJobs: "ስራሕተይ",
    jobsTabFindWork: "ስራሕ ድለ",
    jobsTabProposals: "ፕሮፖዛላት",
    contractsTabsAria: "ክፋላት ውዕል",
    contractsTabOverview: "ሓፈሻዊ ትርኢት",
    contractsTabPayments: "ክፍሊታት",
    contractsTabDisputes: "ክርክራት",
    accountMenuAria: "ዝርዝር ኣካውንት",
    signOutLabel: "ውጻእ",
  },
};
