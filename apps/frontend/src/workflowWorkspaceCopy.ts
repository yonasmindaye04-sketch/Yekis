import { type Language } from "./i18n";

export type WorkflowWorkspaceCopy = {
  common: {
    actionFailed: string;
    categoryPrefix: string;
    deadlinePrefix: string;
    duePrefix: string;
    freelancerFallback: string;
    jobBriefFallback: string;
    resetBtn: string;
    clearSearchBtn: string;
    clearSearchAndFiltersBtn: string;
    daysCount: (n: number) => string;
    daysDelivery: (n: number) => string;
  };
  jobs: {
    validationError: string;
    defaultMilestoneTitle: string;
    proposalSubmitted: string;
    unableToSubmitProposal: string;
    activeBriefsCount: (n: number) => string;
    proposalsCount: (n: number) => string;
    yourPublishedJobsEmpty: string;
    proposalShortlisted: string;
    shortlistBtn: string;
    proposalAccepted: string;
    acceptBtn: string;
    proposalRejected: string;
    rejectProposalAria: string;
    myProposalsDesc: string;
    bidsCount: (n: number) => string;
    browseBriefsDesc: string;
    showingBriefsCount: (shown: number, total: number) => string;
    filterOpenBriefsAria: string;
    searchBriefsAria: string;
    clearSearchAria: string;
    filterCategoryAria: string;
    allCategories: string;
    filterBudgetAria: string;
    budgetAll: string;
    budgetUnder10k: string;
    budget10kTo30k: string;
    budget30kTo75k: string;
    budgetOver75k: string;
    budgetCustom: string;
    minEtbPlaceholder: string;
    minEtbAria: string;
    maxEtbPlaceholder: string;
    maxEtbAria: string;
    filterDeadlineAria: string;
    deadlineAll: string;
    deadline3Days: string;
    deadline7Days: string;
    deadline14Days: string;
    deadline30Days: string;
    resetFiltersBtn: string;
    daysOverdue: (n: number) => string;
    dueToday: string;
    daysLeft: (n: number) => string;
    scopeDeliverablesHeading: string;
    uploadAcceptedLabel: string;
    uploadDropSubtitle: string;
    briefSummaryLabel: string;
    proposalWithdrawn: string;
  };
  contracts: {
    directChatSubject: (title: string) => string;
    milestoneAgreementFallback: string;
    failedOpenChat: string;
    generatedPreviewNotice: (shortId: string) => string;
    disputeDescMinLength: string;
    disputeOpenedSuccess: string;
    kpiTotalContracts: string;
    kpiTotalContractsSub: string;
    kpiAwaitingSignatures: string;
    kpiAwaitingSignaturesSub: string;
    kpiActiveExecuted: string;
    kpiActiveExecutedSub: string;
    kpiCancelledClosed: string;
    kpiCancelledClosedSub: string;
    filterStatusAria: string;
    tabAll: (n: number) => string;
    tabAwaitingSignatures: (n: number) => string;
    tabExecuted: (n: number) => string;
    tabCancelled: (n: number) => string;
    filteredCounts: (milestones: number, contracts: number) => string;
    searchPlaceholder: string;
    searchAria: string;
    clearSearchAria: string;
    emptyNoContracts: string;
    emptyNoMatch: (query: string) => string;
    badgeCancelled: string;
    badgeExecuted: string;
    badgeAwaitingSignatures: string;
    totalValuePrefix: string;
    roleDual: string;
    roleClient: string;
    roleFreelancer: string;
    agreementVersion: (version: string) => string;
    showingMatchingMilestones: (
      visible: number,
      total: number,
      query: string,
    ) => string;
    milestoneCount: (n: number) => string;
    agreementPdfBtn: string;
    manageEscrowBtn: string;
    chatWithFreelancer: string;
    chatWithClient: string;
    agreementSignedSuccess: string;
    acceptAgreementBtn: string;
    clientESignature: string;
    freelancerESignature: string;
    verified: string;
    pending: string;
    escrowFundedSuccess: string;
    fundEscrowBtn: string;
    deliverySubmittedSuccess: string;
    submitDeliveryBtn: string;
    milestoneAcceptedSuccess: string;
    acceptReleaseBtn: string;
    disputeBtn: string;
  };
  escrow: {
    kpiHeldSub: string;
    kpiPendingSub: string;
    kpiReleasedSub: string;
    kpiDisputedSub: string;
    filterMilestonesAria: string;
    tabAllMilestones: (n: number) => string;
    showingCount: (visible: number, total: number) => string;
    searchAria: string;
    clearSearchAria: string;
    clearContractBtn: (shortId: string) => string;
    emptyNoMilestones: string;
    emptyNoMatch: (query: string) => string;
    contractPrefix: string;
    amountPrefix: string;
    hideTaxFeeBtn: string;
    taxFeeSplitBtn: string;
    viewContractBtn: string;
  };
  disputes: {
    categoryLabel: string;
    whatHappenedLabel: string;
    descriptionPlaceholder: string;
    openDisputeBtn: string;
    categories: Record<string, string>;
    stages: Record<string, string>;
    emptyDisputes: string;
    contractDisputeFallback: string;
    negotiationEnds: (dateStr: string) => string;
    movedToEvidenceSuccess: string;
    escalateToEvidenceBtn: string;
    evidencePlaceholder: string;
    evidenceRecordedSuccess: string;
    submitEvidenceBtn: string;
    arbitrationRecordedSuccess: string;
    escalateArbitrationBtn: string;
  };
};

export const WORKFLOW_WORKSPACE_COPY: Record<Language, WorkflowWorkspaceCopy> = {
  en: {
    common: {
      actionFailed: "Action failed.",
      categoryPrefix: "Category",
      deadlinePrefix: "Deadline",
      duePrefix: "Due",
      freelancerFallback: "Freelancer",
      jobBriefFallback: "Job Brief",
      resetBtn: "Reset",
      clearSearchBtn: "Clear search",
      clearSearchAndFiltersBtn: "Clear Search & Filters",
      daysCount: (n) => `${n} days`,
      daysDelivery: (n) => `${n} days delivery`,
    },
    jobs: {
      validationError:
        "Add a detailed cover letter (min 20 chars), valid amount, delivery estimate, and milestone due date.",
      defaultMilestoneTitle: "Project delivery",
      proposalSubmitted: "Proposal submitted.",
      unableToSubmitProposal: "Unable to submit proposal.",
      activeBriefsCount: (n) => `${n} Active Briefs`,
      proposalsCount: (n) => `${n} proposals`,
      yourPublishedJobsEmpty: "Your published jobs will appear here.",
      proposalShortlisted: "Proposal shortlisted.",
      shortlistBtn: "Shortlist",
      proposalAccepted: "Proposal accepted and contract generated.",
      acceptBtn: "Accept",
      proposalRejected: "Proposal rejected.",
      rejectProposalAria: "Reject proposal",
      myProposalsDesc: "Active bids and milestone quotes awaiting client review",
      bidsCount: (n) => `${n} Bids`,
      browseBriefsDesc:
        "Verified Ethiopian clients with milestone-backed escrow budgets",
      showingBriefsCount: (shown, total) =>
        `Showing ${shown} of ${total} briefs`,
      filterOpenBriefsAria: "Filter open job briefs",
      searchBriefsAria: "Search briefs by keyword",
      clearSearchAria: "Clear search query",
      filterCategoryAria: "Filter by category",
      allCategories: "All categories",
      filterBudgetAria: "Filter by budget range",
      budgetAll: "Any budget (ETB)",
      budgetUnder10k: "Under ETB 10,000",
      budget10kTo30k: "ETB 10,000 – 30,000",
      budget30kTo75k: "ETB 30,000 – 75,000",
      budgetOver75k: "ETB 75,000+",
      budgetCustom: "Custom ETB range…",
      minEtbPlaceholder: "Min ETB",
      minEtbAria: "Minimum budget in ETB",
      maxEtbPlaceholder: "Max ETB",
      maxEtbAria: "Maximum budget in ETB",
      filterDeadlineAria: "Filter by deadline proximity",
      deadlineAll: "Any deadline",
      deadline3Days: "Due within 3 days",
      deadline7Days: "Due within 7 days",
      deadline14Days: "Due within 14 days",
      deadline30Days: "Due within 30 days",
      resetFiltersBtn: "Reset filters",
      daysOverdue: (n) => `${n}d overdue`,
      dueToday: "Due today",
      daysLeft: (n) => `${n}d left`,
      scopeDeliverablesHeading: "Scope & Deliverables",
      uploadAcceptedLabel: "PDF, DOCX, PNG, JPG · up to 25 MB each",
      uploadDropSubtitle:
        "Attach supporting portfolios, technical specs, or images",
      briefSummaryLabel: "Brief",
      proposalWithdrawn: "Proposal withdrawn.",
    },
    contracts: {
      directChatSubject: (title) => `Contract: ${title}`,
      milestoneAgreementFallback: "Milestone Agreement",
      failedOpenChat: "Failed to open direct chat",
      generatedPreviewNotice: (shortId) =>
        `Generated bilingual AACCSA agreement preview for contract #${shortId}.`,
      disputeDescMinLength: "Describe the issue in at least 20 characters.",
      disputeOpenedSuccess: "Dispute opened and auto-release timer paused.",
      kpiTotalContracts: "Total Contracts",
      kpiTotalContractsSub: "Bilingual AACCSA service agreements",
      kpiAwaitingSignatures: "Awaiting Signatures",
      kpiAwaitingSignaturesSub: "Pending bilateral e-signature execution",
      kpiActiveExecuted: "Active & Executed",
      kpiActiveExecutedSub: "Legally binding & milestone-backed",
      kpiCancelledClosed: "Cancelled / Closed",
      kpiCancelledClosedSub: "Terminated or cooling-off withdrawn",
      filterStatusAria: "Filter contracts by status",
      tabAll: (n) => `All (${n})`,
      tabAwaitingSignatures: (n) => `Awaiting Signatures (${n})`,
      tabExecuted: (n) => `Executed (${n})`,
      tabCancelled: (n) => `Cancelled (${n})`,
      filteredCounts: (m, c) =>
        `${m} ${m === 1 ? "milestone" : "milestones"} · ${c} ${c === 1 ? "contract" : "contracts"}`,
      searchPlaceholder: "Filter milestones by title or contract ID...",
      searchAria: "Filter milestones by title or contract ID",
      clearSearchAria: "Clear milestone and contract search",
      emptyNoContracts: "No contracts yet. Accepting a proposal creates one here.",
      emptyNoMatch: (q) => `No milestones or contracts match "${q}".`,
      badgeCancelled: "CANCELLED",
      badgeExecuted: "FULLY EXECUTED",
      badgeAwaitingSignatures: "AWAITING SIGNATURES",
      totalValuePrefix: "Total Value",
      roleDual: "Dual-Role Party",
      roleClient: "Your Role: Client",
      roleFreelancer: "Your Role: Freelancer",
      agreementVersion: (version) => `Agreement ${version}`,
      showingMatchingMilestones: (v, total, q) =>
        `Showing ${v} of ${total} ${total === 1 ? "milestone" : "milestones"} matching "${q}"`,
      milestoneCount: (n) => `${n} ${n === 1 ? "Milestone" : "Milestones"}`,
      agreementPdfBtn: "Agreement PDF",
      manageEscrowBtn: "Manage in Escrow Center",
      chatWithFreelancer: "Chat with Freelancer",
      chatWithClient: "Chat with Client",
      agreementSignedSuccess: "Agreement signed and executed.",
      acceptAgreementBtn: "Accept Agreement",
      clientESignature: "Client E-Signature",
      freelancerESignature: "Freelancer E-Signature",
      verified: "Verified",
      pending: "Pending",
      escrowFundedSuccess: "Escrow funded from your wallet. Work can begin!",
      fundEscrowBtn: "Fund Escrow",
      deliverySubmittedSuccess: "Milestone submitted for client QA review.",
      submitDeliveryBtn: "Submit Delivery",
      milestoneAcceptedSuccess: "Milestone accepted and escrow released.",
      acceptReleaseBtn: "Accept & Release Funds",
      disputeBtn: "Dispute",
    },
    escrow: {
      kpiHeldSub: "Locked in milestone escrow vaults",
      kpiPendingSub: "Awaiting client wallet funding",
      kpiReleasedSub: "Disbursed to freelancer wallets",
      kpiDisputedSub: "Frozen pending mediation review",
      filterMilestonesAria: "Filter escrow milestones",
      tabAllMilestones: (n) => `All Milestones (${n})`,
      showingCount: (v, total) => `Showing ${v} of ${total}`,
      searchAria: "Filter escrow milestones by title or contract ID",
      clearSearchAria: "Clear escrow milestone search",
      clearContractBtn: (shortId) => `Clear contract #${shortId}`,
      emptyNoMilestones: "No escrow milestones yet.",
      emptyNoMatch: (q) => `No escrow milestones match "${q}".`,
      contractPrefix: "Contract",
      amountPrefix: "Amount",
      hideTaxFeeBtn: "Hide Tax & Fee",
      taxFeeSplitBtn: "Tax & Fee Split",
      viewContractBtn: "View Contract",
    },
    disputes: {
      categoryLabel: "Category",
      whatHappenedLabel: "What happened?",
      descriptionPlaceholder:
        "Provide factual context and deliverable references...",
      openDisputeBtn: "Open Dispute Case",
      categories: {
        NON_DELIVERY: "Non-delivery",
        LATE_DELIVERY: "Late delivery",
        QUALITY_ISSUE: "Quality issue",
        SCOPE_CREEP: "Scope creep",
        NON_PAYMENT: "Non-payment",
        COMMUNICATION_BREAKDOWN: "Communication breakdown",
      },
      stages: {
        STAGE_1_NEGOTIATION: "Stage 1 · Negotiation",
        STAGE_2_EVIDENCE: "Stage 2 · Evidence",
        STAGE_3_MEDIATION: "Stage 3 · Mediation",
        ARBITRATION: "Arbitration",
        RESOLVED: "Resolved",
      },
      emptyDisputes: "No disputes. Open one from an active milestone when needed.",
      contractDisputeFallback: "Contract dispute",
      negotiationEnds: (d) => `Negotiation window ends ${d}.`,
      movedToEvidenceSuccess: "Dispute moved to Stage 2 Evidence.",
      escalateToEvidenceBtn: "Escalate to Evidence",
      evidencePlaceholder:
        "Submit your written evidence statement or technical verification notes...",
      evidenceRecordedSuccess:
        "Evidence statement recorded for staff mediation.",
      submitEvidenceBtn: "Submit Evidence Statement",
      arbitrationRecordedSuccess:
        "Arbitration escalation recorded for AACCSA filing.",
      escalateArbitrationBtn: "Escalate to AACCSA Arbitration",
    },
  },
  am: {
    common: {
      actionFailed: "ተግባሩ አልተሳካም።",
      categoryPrefix: "ምድብ",
      deadlinePrefix: "የመጨረሻ ቀን",
      duePrefix: "ማለቂያ",
      freelancerFallback: "ባለሙያ",
      jobBriefFallback: "የሥራ ዝርዝር",
      resetBtn: "ዳግም አስጀምር",
      clearSearchBtn: "ፍለጋ አጽዳ",
      clearSearchAndFiltersBtn: "ፍለጋ እና ማጣሪያዎችን አጽዳ",
      daysCount: (n) => `${n} ቀናት`,
      daysDelivery: (n) => `በ${n} ቀናት አቅርቦት`,
    },
    jobs: {
      validationError:
        "ዝርዝር የማመልከቻ ደብዳቤ (ቢያንስ 20 ቁምፊዎች)፣ ትክክለኛ መጠን፣ የመላኪያ ግምት እና የምዕራፍ ማለቂያ ቀን ያክሉ።",
      defaultMilestoneTitle: "የፕሮጀክት አቅርቦት",
      proposalSubmitted: "ፕሮፖዛል ቀርቧል።",
      unableToSubmitProposal: "ፕሮፖዛል ማቅረብ አልተቻለም።",
      activeBriefsCount: (n) => `${n} ንቁ ሥራዎች`,
      proposalsCount: (n) => `${n} ፕሮፖዛሎች`,
      yourPublishedJobsEmpty: "ያሳተሟቸው ሥራዎች እዚህ ይታያሉ።",
      proposalShortlisted: "ፕሮፖዛሉ በአጭር ዝርዝር ተመርጧል።",
      shortlistBtn: "በአጭር ዝርዝር ምረጥ",
      proposalAccepted: "ፕሮፖዛሉ ተቀባይነት አግኝቷል እና ውል ተፈጥሯል።",
      acceptBtn: "ተቀበል",
      proposalRejected: "ፕሮፖዛሉ ውድቅ ተደርጓል።",
      rejectProposalAria: "ፕሮፖዛል ውድቅ አድርግ",
      myProposalsDesc: "የደንበኛ ግምገማ የሚጠብቁ ንቁ ጨረታዎች እና የምዕራፍ ዋጋዎች",
      bidsCount: (n) => `${n} ጨረታዎች`,
      browseBriefsDesc: "በምዕራፍ ኤስክሮ በጀት የተደገፉ የተረጋገጡ የኢትዮጵያ ደንበኞች",
      showingBriefsCount: (shown, total) => `ከ${total} ውስጥ ${shown} ሥራዎች ታይተዋል`,
      filterOpenBriefsAria: "ክፍት ሥራዎችን አጣራ",
      searchBriefsAria: "ሥራዎችን በቁልፍ ቃል ፈልግ",
      clearSearchAria: "የፍለጋ ቃል አጽዳ",
      filterCategoryAria: "በምድብ አጣራ",
      allCategories: "ሁሉም ምድቦች",
      filterBudgetAria: "በበጀት መጠን አጣራ",
      budgetAll: "ማንኛውም በጀት (ETB)",
      budgetUnder10k: "ከ10,000 ETB በታች",
      budget10kTo30k: "10,000 – 30,000 ETB",
      budget30kTo75k: "30,000 – 75,000 ETB",
      budgetOver75k: "75,000+ ETB",
      budgetCustom: "ብጁ የETB ክልል…",
      minEtbPlaceholder: "ዝቅተኛ ETB",
      minEtbAria: "ዝቅተኛ በጀት በETB",
      maxEtbPlaceholder: "ከፍተኛ ETB",
      maxEtbAria: "ከፍተኛ በጀት በETB",
      filterDeadlineAria: "በመጨረሻ ቀን አጣራ",
      deadlineAll: "ማንኛውም የመጨረሻ ቀን",
      deadline3Days: "በ3 ቀናት ውስጥ የሚያልቅ",
      deadline7Days: "በ7 ቀናት ውስጥ የሚያልቅ",
      deadline14Days: "በ14 ቀናት ውስጥ የሚያልቅ",
      deadline30Days: "በ30 ቀናት ውስጥ የሚያልቅ",
      resetFiltersBtn: "ማጣሪያዎችን ዳግም አስጀምር",
      daysOverdue: (n) => `${n}ቀ አልፏል`,
      dueToday: "ዛሬ ያበቃል",
      daysLeft: (n) => `${n}ቀ ይቀራል`,
      scopeDeliverablesHeading: "ወሰን እና የሚቀርቡ ውጤቶች",
      uploadAcceptedLabel: "PDF, DOCX, PNG, JPG · እስከ 25 MB እያንዳንዱ",
      uploadDropSubtitle: "ደጋፊ ፖርትፎሊዮዎችን፣ ቴክኒካዊ መግለጫዎችን ወይም ምስሎችን ያያይዙ",
      briefSummaryLabel: "ሥራ",
      proposalWithdrawn: "ፕሮፖዛል ተሰርዟል።",
    },
    contracts: {
      directChatSubject: (title) => `ውል፡ ${title}`,
      milestoneAgreementFallback: "የምዕራፍ ስምምነት",
      failedOpenChat: "ቀጥታ ውይይት መክፈት አልተቻለም",
      generatedPreviewNotice: (shortId) =>
        `ለውል #${shortId} ባለሁለት ቋንቋ የAACCSA ስምምነት ቅድመ-ዕይታ ተፈጥሯል።`,
      disputeDescMinLength: "ችግሩን ቢያንስ በ20 ቁምፊዎች ይግለጹ።",
      disputeOpenedSuccess: "አለመግባባት ተከፍቷል እና ራስ-ሰር ክፍያ መልቀቂያ ቆሟል።",
      kpiTotalContracts: "ጠቅላላ ውሎች",
      kpiTotalContractsSub: "ባለሁለት ቋንቋ የAACCSA አገልግሎት ስምምነቶች",
      kpiAwaitingSignatures: "ፊርማ የሚጠብቁ",
      kpiAwaitingSignaturesSub: "የሁለትዮሽ ኢ-ፊርማ በመጠበቅ ላይ",
      kpiActiveExecuted: "ንቁ እና የተፈጸሙ",
      kpiActiveExecutedSub: "ሕጋዊ እና በምዕራፍ የተደገፉ",
      kpiCancelledClosed: "የተሰረዙ / የተዘጉ",
      kpiCancelledClosedSub: "የተቋረጡ ወይም በቀዘቀዘ ጊዜ የተሰረዙ",
      filterStatusAria: "ውሎችን በሁኔታ አጣራ",
      tabAll: (n) => `ሁሉም (${n})`,
      tabAwaitingSignatures: (n) => `ፊርማ የሚጠብቁ (${n})`,
      tabExecuted: (n) => `የተፈጸሙ (${n})`,
      tabCancelled: (n) => `የተሰረዙ (${n})`,
      filteredCounts: (m, c) => `${m} ምዕራፎች · ${c} ውሎች`,
      searchPlaceholder: "ምዕራፎችን በርዕስ ወይም በውል መለያ አጣራ...",
      searchAria: "ምዕራፎችን በርዕስ ወይም በውል መለያ አጣራ",
      clearSearchAria: "የምዕራፍ እና የውል ፍለጋ አጽዳ",
      emptyNoContracts: "እስካሁን ውሎች የሉም። ፕሮፖዛልን መቀበል እዚህ ውል ይፈጥራል።",
      emptyNoMatch: (q) => `ከ"${q}" ጋር የሚዛመዱ ምዕራፎች ወይም ውሎች የሉም።`,
      badgeCancelled: "ተሰርዟል",
      badgeExecuted: "ሙሉ በሙሉ ተፈጽሟል",
      badgeAwaitingSignatures: "ፊርማ በመጠበቅ ላይ",
      totalValuePrefix: "ጠቅላላ ዋጋ",
      roleDual: "ባለሁለት-ሚና ወገን",
      roleClient: "የእርስዎ ሚና፡ ደንበኛ",
      roleFreelancer: "የእርስዎ ሚና፡ ባለሙያ",
      agreementVersion: (version) => `ስምምነት ${version}`,
      showingMatchingMilestones: (v, total, q) =>
        `ከ${total} ውስጥ ከ"${q}" ጋር የሚዛመዱ ${v} ምዕራፎች ታይተዋል`,
      milestoneCount: (n) => `${n} ምዕራፎች`,
      agreementPdfBtn: "የስምምነት PDF",
      manageEscrowBtn: "በኤስክሮ ማዕከል አስተዳድር",
      chatWithFreelancer: "ከባለሙያ ጋር ተወያይ",
      chatWithClient: "ከደንበኛ ጋር ተወያይ",
      agreementSignedSuccess: "ስምምነቱ ተፈርሞ ተፈጽሟል።",
      acceptAgreementBtn: "ስምምነቱን ተቀበል",
      clientESignature: "የደንበኛ ኢ-ፊርማ",
      freelancerESignature: "የባለሙያ ኢ-ፊርማ",
      verified: "የተረጋገጠ",
      pending: "በመጠባበቅ ላይ",
      escrowFundedSuccess: "ኤስክሮ ከቦርሳዎ ተከፍሏል። ሥራ ሊጀመር ይችላል!",
      fundEscrowBtn: "ኤስክሮ ክፈል",
      deliverySubmittedSuccess: "ምዕራፉ ለደንበኛ ግምገማ ቀርቧል።",
      submitDeliveryBtn: "አቅርቦት አስረክብ",
      milestoneAcceptedSuccess: "ምዕራፉ ጸድቋል እና የኤስክሮ ገንዘብ ተለቋል።",
      acceptReleaseBtn: "ተቀበል እና ገንዘብ ልቀቅ",
      disputeBtn: "አለመግባባት",
    },
    escrow: {
      kpiHeldSub: "በምዕራፍ ኤስክሮ ካዝና ውስጥ የተያዘ",
      kpiPendingSub: "የደንበኛ ቦርሳ ክፍያ በመጠበቅ ላይ",
      kpiReleasedSub: "ለባለሙያ ቦርሳ የተላለፈ",
      kpiDisputedSub: "የሽምግልና ግምገማ እስኪያልቅ የታገደ",
      filterMilestonesAria: "የኤስክሮ ምዕራፎችን አጣራ",
      tabAllMilestones: (n) => `ሁሉም ምዕራፎች (${n})`,
      showingCount: (v, total) => `ከ${total} ውስጥ ${v} ታይተዋል`,
      searchAria: "የኤስክሮ ምዕራፎችን በርዕስ ወይም በውል መለያ አጣራ",
      clearSearchAria: "የኤስክሮ ምዕራፍ ፍለጋ አጽዳ",
      clearContractBtn: (shortId) => `ውል #${shortId} አጽዳ`,
      emptyNoMilestones: "እስካሁን የኤስክሮ ምዕራፎች የሉም።",
      emptyNoMatch: (q) => `ከ"${q}" ጋር የሚዛመዱ የኤስክሮ ምዕራፎች የሉም።`,
      contractPrefix: "ውል",
      amountPrefix: "መጠን",
      hideTaxFeeBtn: "ግብር እና ክፍያ ደብቅ",
      taxFeeSplitBtn: "የግብር እና ክፍያ ክፍፍል",
      viewContractBtn: "ውል ይመልከቱ",
    },
    disputes: {
      categoryLabel: "ምድብ",
      whatHappenedLabel: "ምን ተከሰተ?",
      descriptionPlaceholder: "ተጨባጭ ዝርዝሮችን እና የሥራ ማስረጃዎችን ያቅርቡ...",
      openDisputeBtn: "የአለመግባባት ጉዳይ ክፈት",
      categories: {
        NON_DELIVERY: "አለማቅረብ",
        LATE_DELIVERY: "የዘገየ አቅርቦት",
        QUALITY_ISSUE: "የጥራት ችግር",
        SCOPE_CREEP: "ከስምምነት ውጪ ተጨማሪ ሥራ",
        NON_PAYMENT: "አለመክፈል",
        COMMUNICATION_BREAKDOWN: "የግንኙነት መቋረጥ",
      },
      stages: {
        STAGE_1_NEGOTIATION: "ደረጃ 1 · ድርድር",
        STAGE_2_EVIDENCE: "ደረጃ 2 · ማስረጃ",
        STAGE_3_MEDIATION: "ደረጃ 3 · ሽምግልና",
        ARBITRATION: "ግልግል",
        RESOLVED: "ተፈቷል",
      },
      emptyDisputes: "ምንም አለመግባባቶች የሉም። አስፈላጊ ሲሆን ከንቁ ምዕራፍ ይክፈቱ።",
      contractDisputeFallback: "የውል አለመግባባት",
      negotiationEnds: (d) => `የድርድር ጊዜ ${d} ያበቃል።`,
      movedToEvidenceSuccess: "አለመግባባቱ ወደ ደረጃ 2 ማስረጃ ተሸጋግሯል።",
      escalateToEvidenceBtn: "ወደ ማስረጃ ደረጃ አሳድግ",
      evidencePlaceholder: "የጽሑፍ ማስረጃዎን ወይም ቴክኒካዊ የማረጋገጫ ማስታወሻዎችዎን ያስገቡ...",
      evidenceRecordedSuccess: "የማስረጃ መግለጫ ለሰራተኞች ሽምግልና ተመዝግቧል።",
      submitEvidenceBtn: "የማስረጃ መግለጫ አስገባ",
      arbitrationRecordedSuccess: "ለAACCSA መዝገብ የግልግል ጥያቄ ተመዝግቧል።",
      escalateArbitrationBtn: "ወደ AACCSA ግልግል አሳድግ",
    },
  },
  om: {
    common: {
      actionFailed: "Tarkaanfiin hin milkoofne.",
      categoryPrefix: "Ramaddii",
      deadlinePrefix: "Daangaa yeroo",
      duePrefix: "Xumura",
      freelancerFallback: "Ogeessa",
      jobBriefFallback: "Ibsa Hojii",
      resetBtn: "Haquu",
      clearSearchBtn: "Barbaacha haqi",
      clearSearchAndFiltersBtn: "Barbaachaafi calaltuu haqi",
      daysCount: (n) => `Guyyaa ${n}`,
      daysDelivery: (n) => `Guyyaa ${n} keessatti`,
    },
    jobs: {
      validationError:
        "Xalayaa dhiyaannaa bal'aa (yoo xiqqaate arfii 20), maallaqa sirrii, tilmaama dhiyeessaafi guyyaa xumuraa boqonnaa hojii galchaa.",
      defaultMilestoneTitle: "Dhiyeessa pirojektii",
      proposalSubmitted: "Yaadni dorgommii dhiyaateera.",
      unableToSubmitProposal: "Yaada dorgommii dhiyeessuun hin danda'amne.",
      activeBriefsCount: (n) => `Ibsa Hojii Banaa ${n}`,
      proposalsCount: (n) => `Yaadota ${n}`,
      yourPublishedJobsEmpty: "Hojiileen isin maxxansitan asitti mul'atu.",
      proposalShortlisted: "Yaadni dorgommii tarree gabaabaa keessa galeera.",
      shortlistBtn: "Tarree gabaabaa",
      proposalAccepted:
        "Yaadni dorgommii fudhatameera, waliigalteenis uumameera.",
      acceptBtn: "Fudhadhu",
      proposalRejected: "Yaadni dorgommii haqameera.",
      rejectProposalAria: "Yaada dorgommii haqi",
      myProposalsDesc:
        "Dorgommiiwwan banaafi gatii boqonnaa hojii gamaaggama maamilaa eegan",
      bidsCount: (n) => `Dorgommii ${n}`,
      browseBriefsDesc:
        "Maamiltoota Itoophiyaa mirkaneeffaman baajata escrow qaban",
      showingBriefsCount: (shown, total) =>
        `Ibsa hojii ${total} keessaa ${shown} mul'isaa jira`,
      filterOpenBriefsAria: "Ibsa hojii banaa calali",
      searchBriefsAria: "Ibsa hojii jecha ijoon barbaadi",
      clearSearchAria: "Jecha barbaachaa haqi",
      filterCategoryAria: "Ramaddiin calali",
      allCategories: "Ramaddii hunda",
      filterBudgetAria: "Baajataan calali",
      budgetAll: "Baajata kamuu (ETB)",
      budgetUnder10k: "ETB 10,000 gadi",
      budget10kTo30k: "ETB 10,000 – 30,000",
      budget30kTo75k: "ETB 30,000 – 75,000",
      budgetOver75k: "ETB 75,000+",
      budgetCustom: "Daangaa ETB dhuunfaa…",
      minEtbPlaceholder: "Min ETB",
      minEtbAria: "Baajata xiqqaataa ETBtiin",
      maxEtbPlaceholder: "Max ETB",
      maxEtbAria: "Baajata guddaa ETBtiin",
      filterDeadlineAria: "Daangaa yeroon calali",
      deadlineAll: "Daangaa yeroo kamuu",
      deadline3Days: "Guyyaa 3 keessatti",
      deadline7Days: "Guyyaa 7 keessatti",
      deadline14Days: "Guyyaa 14 keessatti",
      deadline30Days: "Guyyaa 30 keessatti",
      resetFiltersBtn: "Calaltuu deebisi",
      daysOverdue: (n) => `Guyyaa ${n} darbe`,
      dueToday: "Har'a xumurama",
      daysLeft: (n) => `Guyyaa ${n} hafe`,
      scopeDeliverablesHeading: "Daangaafi Bu'aa Dhiyaatu",
      uploadAcceptedLabel: "PDF, DOCX, PNG, JPG · tokkoon isaa hanga 25 MB",
      uploadDropSubtitle:
        "Poortifooliyoo, ibsa teeknikaa ykn suuraa deeggarsaa qabsiisaa",
      briefSummaryLabel: "Ibsa Hojii",
      proposalWithdrawn: "Yaadni dorgommii deebifameera.",
    },
    contracts: {
      directChatSubject: (title) => `Waliigaltee: ${title}`,
      milestoneAgreementFallback: "Waliigaltee Boqonnaa Hojii",
      failedOpenChat: "Haasaa kallattii banuun hin danda'amne",
      generatedPreviewNotice: (shortId) =>
        "Waliigalteen AACCSA afaan lamaa waliigaltee #" +
        shortId +
        "f qophaa'eera.",
      disputeDescMinLength: "Rakkoo yoo xiqqaate arfiiwwan 20n ibsaa.",
      disputeOpenedSuccess:
        "Falmiin banameera; lakkoofsi yeroo kaffaltii ofumaan gadi lakkisuu dhaabameera.",
      kpiTotalContracts: "Waliigalteewwan Waliigalaa",
      kpiTotalContractsSub: "Waliigaltee tajaajilaa AACCSA afaan lamaa",
      kpiAwaitingSignatures: "Mallattoo Eegaa Jiru",
      kpiAwaitingSignaturesSub: "Raawwii e-mallattoo gama lamaanii eega",
      kpiActiveExecuted: "Banaafi Raawwatame",
      kpiActiveExecutedSub: "Seeraan qabatamaafi boqonnaa hojiin deeggarame",
      kpiCancelledClosed: "Haqame / Cufame",
      kpiCancelledClosedSub: "Kan addaan cite ykn yeroo boqonnaatti haqame",
      filterStatusAria: "Waliigalteewwan haalaan calali",
      tabAll: (n) => `Hunda (${n})`,
      tabAwaitingSignatures: (n) => `Mallattoo Eegaa Jiru (${n})`,
      tabExecuted: (n) => `Raawwatame (${n})`,
      tabCancelled: (n) => `Haqame (${n})`,
      filteredCounts: (m, c) => `Boqonnaa hojii ${m} · Waliigaltee ${c}`,
      searchPlaceholder:
        "Boqonnaa hojii mata duree ykn ID waliigalteetiin calali...",
      searchAria: "Boqonnaa hojii mata duree ykn ID waliigalteetiin calali",
      clearSearchAria: "Barbaacha boqonnaa hojiifi waliigaltee haqi",
      emptyNoContracts:
        "Ammatti waliigalteen hin jiru. Yaada dorgommii fudhachuun asitti tokko uuma.",
      emptyNoMatch: (q) =>
        `Boqonnaan hojii ykn waliigalteen "${q}" wajjin walsimu hin jiru.`,
      badgeCancelled: "HAQAMEERA",
      badgeExecuted: "GUUTUUTTI RAAWWATAME",
      badgeAwaitingSignatures: "MALLATTOO EEGAA JIRA",
      totalValuePrefix: "Gatii Waliigalaa",
      roleDual: "Gahee Lamaa",
      roleClient: "Gahee Keessan: Maamila",
      roleFreelancer: "Gahee Keessan: Ogeessa",
      agreementVersion: (version) => `Waliigaltee ${version}`,
      showingMatchingMilestones: (v, total, q) =>
        `Boqonnaa hojii ${total} keessaa "${q}" wajjin kan walsimu ${v} mul'isaa jira`,
      milestoneCount: (n) => `Boqonnaa Hojii ${n}`,
      agreementPdfBtn: "Waliigaltee PDF",
      manageEscrowBtn: "Giddugala Escrow Keessatti Bulchi",
      chatWithFreelancer: "Ogeessa Wajjin Haasawi",
      chatWithClient: "Maamila Wajjin Haasawi",
      agreementSignedSuccess: "Waliigalteen mallatteeffamee raawwatameera.",
      acceptAgreementBtn: "Waliigaltee Fudhadhu",
      clientESignature: "E-Mallattoo Maamilaa",
      freelancerESignature: "E-Mallattoo Ogeessaa",
      verified: "Mirkaneeffameera",
      pending: "Eegaa jira",
      escrowFundedSuccess:
        "Escrown boorsaa keessan irraa guutameera. Hojiin jalqabuu ni danda'a!",
      fundEscrowBtn: "Escrow Kaffali",
      deliverySubmittedSuccess:
        "Boqonnaan hojii gamaaggama maamilaaf dhiyaateera.",
      submitDeliveryBtn: "Hojii Dhiyeessi",
      milestoneAcceptedSuccess:
        "Boqonnaan hojii fudhatameera, maallaqni escrows gadhiifameera.",
      acceptReleaseBtn: "Fudhadhu & Maallaqa Gadhiisi",
      disputeBtn: "Falmii",
    },
    escrow: {
      kpiHeldSub: "Kuusaa escrow boqonnaa hojii keessatti qabame",
      kpiPendingSub: "Kaffaltii boorsaa maamilaa eegaa jira",
      kpiReleasedSub: "Boorsaa ogeessaatti darbeera",
      kpiDisputedSub: "Hanga araarri xumuramutti dhorkame",
      filterMilestonesAria: "Boqonnaalee hojii escrow calali",
      tabAllMilestones: (n) => `Boqonnaa Hunda (${n})`,
      showingCount: (v, total) => `${total} keessaa ${v} mul'isaa jira`,
      searchAria:
        "Boqonnaa hojii escrow mata duree ykn ID waliigalteetiin calali",
      clearSearchAria: "Barbaacha boqonnaa hojii escrow haqi",
      clearContractBtn: (shortId) => `Waliigaltee #${shortId} haqi`,
      emptyNoMilestones: "Ammatti boqonnaan hojii escrow hin jiru.",
      emptyNoMatch: (q) =>
        `Boqonnaan hojii escrow "${q}" wajjin walsimu hin jiru.`,
      contractPrefix: "Waliigaltee",
      amountPrefix: "Hanga",
      hideTaxFeeBtn: "Gibira & Kaffaltii Dhoksi",
      taxFeeSplitBtn: "Qoodinsa Gibira & Kaffaltii",
      viewContractBtn: "Waliigaltee Ilaali",
    },
    disputes: {
      categoryLabel: "Ramaddii",
      whatHappenedLabel: "Maaltu ta'e?",
      descriptionPlaceholder:
        "Haala qabatamaafi ragaa hojii dhiyaatee kennamaa...",
      openDisputeBtn: "Dhimmicha Falmiif Bani",
      categories: {
        NON_DELIVERY: "Dhiyeessuu dhabuu",
        LATE_DELIVERY: "Turtiidhaan dhiyeessuu",
        QUALITY_ISSUE: "Rakkoo qulqullinaa",
        SCOPE_CREEP: "Daangaa hojii ol dabaluu",
        NON_PAYMENT: "Kaffaltii dhabuu",
        COMMUNICATION_BREAKDOWN: "Addaan cituu qunnamtii",
      },
      stages: {
        STAGE_1_NEGOTIATION: "Sadarkaa 1 · Marii",
        STAGE_2_EVIDENCE: "Sadarkaa 2 · Ragaa",
        STAGE_3_MEDIATION: "Sadarkaa 3 · Araara",
        ARBITRATION: "Murtee Alagaa",
        RESOLVED: "Furmaata Argate",
      },
      emptyDisputes:
        "Falmiin hin jiru. Yeroo barbaachisutti boqonnaa hojii banaa irraa banaa.",
      contractDisputeFallback: "Falmii waliigaltee",
      negotiationEnds: (d) => `Yeroon marii ${d} xumurama.`,
      movedToEvidenceSuccess: "Falmiin gara Sadarkaa 2 Ragaatti darbeera.",
      escalateToEvidenceBtn: "Gara Ragaatti Ol-kaasi",
      evidencePlaceholder:
        "Ibsa ragaa barreeffamaa ykn yaadannoo mirkaneessa teeknikaa galchaa...",
      evidenceRecordedSuccess:
        "Ibsi ragaa araara hojjettootaatiif galmaa'eera.",
      submitEvidenceBtn: "Ibsa Ragaa Dhiyeessi",
      arbitrationRecordedSuccess:
        "Ol-iyyannoon murtee alagaa galmee AACCSAaf galmaa'eera.",
      escalateArbitrationBtn: "Gara Murtee Alagaa AACCSAAtti Ol-iyyadhu",
    },
  },
  ti: {
    common: {
      actionFailed: "ተግባር ኣይተሳኻዕን።",
      categoryPrefix: "ምድብ",
      deadlinePrefix: "መወዳእታ ዕለት",
      duePrefix: "መወዳእታ",
      freelancerFallback: "ክኢላ",
      jobBriefFallback: "ዝርዝር ስራሕ",
      resetBtn: "ዳግም ጀምር",
      clearSearchBtn: "ድለያ ኣጽሪ",
      clearSearchAndFiltersBtn: "ድለያን መጻረይን ኣጽሪ",
      daysCount: (n) => `${n} መዓልታት`,
      daysDelivery: (n) => `ኣብ ${n} መዓልታት ርኽክብ`,
    },
    jobs: {
      validationError:
        "ዝርዝር ደብዳቤ መመልከቲ (ብውሑዱ 20 ፊደላት)፣ ልክዕ መጠን፣ ግምት መረከብን መወዳእታ ዕለት ምዕራፍን ወስኹ።",
      defaultMilestoneTitle: "ኣቕርቦት ፕሮጀክት",
      proposalSubmitted: "ፕሮፖዛል ቀሪቡ።",
      unableToSubmitProposal: "ፕሮፖዛል ምቕራብ ኣይተኻእለን።",
      activeBriefsCount: (n) => `${n} ንጡፋት ስራሕቲ`,
      proposalsCount: (n) => `${n} ፕሮፖዛላት`,
      yourPublishedJobsEmpty: "ዝዘርጋሕኩምዎም ስራሕቲ ኣብዚ ይርኣዩ።",
      proposalShortlisted: "ፕሮፖዛል ኣብ ሓጺር ዝርዝር ተመሪጹ።",
      shortlistBtn: "ኣብ ሓጺር ዝርዝር ምረጽ",
      proposalAccepted: "ፕሮፖዛል ተቐባልነት ረኺቡን ውዕል ተፈጢሩን።",
      acceptBtn: "ተቐበል",
      proposalRejected: "ፕሮፖዛል ተነጺጉ።",
      rejectProposalAria: "ፕሮፖዛል ንጸግ",
      myProposalsDesc: "ግምገማ ዓሚል ዝጽበዩ ንጡፋት ጨረታታትን ዋጋታት ምዕራፍን",
      bidsCount: (n) => `${n} ጨረታታት`,
      browseBriefsDesc: "ብምዕራፍ ኤስክሮ ባጀት ዝተደገፉ ዝተረጋገጹ ኢትዮጵያውያን ዓማዊል",
      showingBriefsCount: (shown, total) => `ካብ ${total} እቶም ${shown} ስራሕቲ ተራእዮም`,
      filterOpenBriefsAria: "ክፉታት ስራሕቲ ኣጻሪ",
      searchBriefsAria: "ስራሕቲ ብመፍትሕ ቃል ድለ",
      clearSearchAria: "ቃል ድለያ ኣጽሪ",
      filterCategoryAria: "ብምድብ ኣጻሪ",
      allCategories: "ኩሎም ምድባት",
      filterBudgetAria: "ብመጠን ባጀት ኣጻሪ",
      budgetAll: "ዝኾነ ባጀት (ETB)",
      budgetUnder10k: "ትሕቲ ETB 10,000",
      budget10kTo30k: "ETB 10,000 – 30,000",
      budget30kTo75k: "ETB 30,000 – 75,000",
      budgetOver75k: "ETB 75,000+",
      budgetCustom: "ዝተፈለየ ETB ደረት…",
      minEtbPlaceholder: "ዝተሓተ ETB",
      minEtbAria: "ዝተሓተ ባጀት ብETB",
      maxEtbPlaceholder: "ዝለዓለ ETB",
      maxEtbAria: "ዝለዓለ ባጀት ብETB",
      filterDeadlineAria: "ብመወዳእታ ዕለት ኣጻሪ",
      deadlineAll: "ዝኾነ መወዳእታ ዕለት",
      deadline3Days: "ኣብ ውሽጢ 3 መዓልታት",
      deadline7Days: "ኣብ ውሽጢ 7 መዓልታት",
      deadline14Days: "ኣብ ውሽጢ 14 መዓልታት",
      deadline30Days: "ኣብ ውሽጢ 30 መዓልታት",
      resetFiltersBtn: "መጻረይ ዳግም ጀምር",
      daysOverdue: (n) => `${n}መ ሓሊፉ`,
      dueToday: "ሎሚ ይውዳእ",
      daysLeft: (n) => `${n}መ ተሪፉ`,
      scopeDeliverablesHeading: "ወሰንን ዝቀርቡ ውጽኢታትን",
      uploadAcceptedLabel: "PDF, DOCX, PNG, JPG · ነፍሲ ወከፍ ክሳብ 25 MB",
      uploadDropSubtitle: "ደጋፊ ፖርትፎሊዮታት፣ ቴክኒካዊ መግለጺታት ወይ ስእልታት ኣተሓሕዙ",
      briefSummaryLabel: "ስራሕ",
      proposalWithdrawn: "ፕሮፖዛል ተመሊሱ።",
    },
    contracts: {
      directChatSubject: (title) => `ውዕል፡ ${title}`,
      milestoneAgreementFallback: "ስምምዕ ምዕራፍ",
      failedOpenChat: "ቀጥታዊ ዕላል ምኽፋት ኣይተኻእለን",
      generatedPreviewNotice: (shortId) =>
        `ንውዕል #${shortId} ብኽልተ ቋንቋ ዝተዳለወ ቅድመ-ትርኢት ስምምዕ AACCSA ተፈጢሩ።`,
      disputeDescMinLength: "ነቲ ጸገም ብውሑዱ ብ20 ፊደላት ግለጹ።",
      disputeOpenedSuccess: "ክርክር ተኸፊቱን ርእሰ-ምልቃቕ ክፍሊት ደው ኢሉን።",
      kpiTotalContracts: "ጠቕላላ ውዕላት",
      kpiTotalContractsSub: "ብኽልተ ቋንቋ ስምምዓት ኣገልግሎት AACCSA",
      kpiAwaitingSignatures: "ክታም ዝጽበዩ",
      kpiAwaitingSignaturesSub: "ናይ ክልተ ወገን ኢ-ክታም ይጽበዩ",
      kpiActiveExecuted: "ንጡፋትን ዝተፈጸሙን",
      kpiActiveExecutedSub: "ሕጋዊን ብምዕራፍ ዝተደገፉን",
      kpiCancelledClosed: "ዝተሰረዙ / ዝተዓጽዉ",
      kpiCancelledClosedSub: "ዝተቋረጹ ወይ ኣብ ግዜ ምዝሓል ዝተመለሱ",
      filterStatusAria: "ውዕላት ብኩነታት ኣጻሪ",
      tabAll: (n) => `ኩሎም (${n})`,
      tabAwaitingSignatures: (n) => `ክታም ዝጽበዩ (${n})`,
      tabExecuted: (n) => `ዝተፈጸሙ (${n})`,
      tabCancelled: (n) => `ዝተሰረዙ (${n})`,
      filteredCounts: (m, c) => `${m} ምዕራፋት · ${c} ውዕላት`,
      searchPlaceholder: "ምዕራፋት ብኣርእስቲ ወይ መለለዪ ውዕል ኣጻሪ...",
      searchAria: "ምዕራፋት ብኣርእስቲ ወይ መለለዪ ውዕል ኣጻሪ",
      clearSearchAria: "ድለያ ምዕራፍን ውዕልን ኣጽሪ",
      emptyNoContracts: "ገና ውዕላት የለዉን። ፕሮፖዛል ምቕባል ኣብዚ ውዕል ይፈጥር።",
      emptyNoMatch: (q) => `ምስ "${q}" ዝሰማምዑ ምዕራፋት ወይ ውዕላት የለዉን።`,
      badgeCancelled: "ተሰሪዙ",
      badgeExecuted: "ብምሉእ ተፈጺሙ",
      badgeAwaitingSignatures: "ክታም ይጽበ",
      totalValuePrefix: "ጠቕላላ ዋጋ",
      roleDual: "ክልተ-ተራ ወገን",
      roleClient: "ተራኹም፡ ዓሚል",
      roleFreelancer: "ተራኹም፡ ክኢላ",
      agreementVersion: (version) => `ስምምዕ ${version}`,
      showingMatchingMilestones: (v, total, q) =>
        `ካብ ${total} ምስ "${q}" ዝሰማምዑ ${v} ምዕራፋት ተራእዮም`,
      milestoneCount: (n) => `${n} ምዕራፋት`,
      agreementPdfBtn: "ስምምዕ PDF",
      manageEscrowBtn: "ኣብ ማእከል ኤስክሮ ኣመሓድር",
      chatWithFreelancer: "ምስ ክኢላ ዕላል ግበር",
      chatWithClient: "ምስ ዓሚል ዕላል ግበር",
      agreementSignedSuccess: "ስምምዕ ተፈሪሙን ተፈጺሙን።",
      acceptAgreementBtn: "ስምምዕ ተቐበል",
      clientESignature: "ኢ-ክታም ዓሚል",
      freelancerESignature: "ኢ-ክታም ክኢላ",
      verified: "ዝተረጋገጸ",
      pending: "ይጽበ ኣሎ",
      escrowFundedSuccess: "ኤስክሮ ካብ ቦርሳኹም ተኸፊሉ። ስራሕ ክጅምር ይኽእል!",
      fundEscrowBtn: "ኤስክሮ ክፈል",
      deliverySubmittedSuccess: "ምዕራፍ ንግምገማ ዓሚል ቀሪቡ።",
      submitDeliveryBtn: "ኣቕርቦት ኣረክብ",
      milestoneAcceptedSuccess: "ምዕራፍ ተቐባልነት ረኺቡን ገንዘብ ኤስክሮ ተለቂቑን።",
      acceptReleaseBtn: "ተቐበልን ገንዘብ ልቀቕን",
      disputeBtn: "ክርክር",
    },
    escrow: {
      kpiHeldSub: "ኣብ ካዝና ኤስክሮ ምዕራፍ ዝተዓቀበ",
      kpiPendingSub: "ክፍሊት ቦርሳ ዓሚል ይጽበ",
      kpiReleasedSub: "ናብ ቦርሳ ክኢላ ዝተላእከ",
      kpiDisputedSub: "ሽምግልና ክሳብ ዝውዳእ ዝተኣገደ",
      filterMilestonesAria: "ምዕራፋት ኤስክሮ ኣጻሪ",
      tabAllMilestones: (n) => `ኩሎም ምዕራፋት (${n})`,
      showingCount: (v, total) => `ካብ ${total} እቶም ${v} ተራእዮም`,
      searchAria: "ምዕራፋት ኤስክሮ ብኣርእስቲ ወይ መለለዪ ውዕል ኣጻሪ",
      clearSearchAria: "ድለያ ምዕራፍ ኤስክሮ ኣጽሪ",
      clearContractBtn: (shortId) => `ውዕል #${shortId} ኣጽሪ`,
      emptyNoMilestones: "ገና ምዕራፋት ኤስክሮ የለዉን።",
      emptyNoMatch: (q) => `ምስ "${q}" ዝሰማምዑ ምዕራፋት ኤስክሮ የለዉን።`,
      contractPrefix: "ውዕል",
      amountPrefix: "መጠን",
      hideTaxFeeBtn: "ግብርን ክፍሊትን ሕባእ",
      taxFeeSplitBtn: "ምምቕራሕ ግብርን ክፍሊትን",
      viewContractBtn: "ውዕል ርአ",
    },
    disputes: {
      categoryLabel: "ምድብ",
      whatHappenedLabel: "እንታይ ተፈጢሩ?",
      descriptionPlaceholder: "ጭቡጥ ዝርዝርን መረዳእታ ኣቕርቦትን ሃቡ...",
      openDisputeBtn: "ጉዳይ ክርክር ክፈት",
      categories: {
        NON_DELIVERY: "ዘይምቅራብ",
        LATE_DELIVERY: "ዝደንጎየ ኣቕርቦት",
        QUALITY_ISSUE: "ጸገም ጽሬት",
        SCOPE_CREEP: "ካብ ስምምዕ ወጻኢ ተወሳኺ ስራሕ",
        NON_PAYMENT: "ዘይምኽፋል",
        COMMUNICATION_BREAKDOWN: "ምቁራጽ ርክብ",
      },
      stages: {
        STAGE_1_NEGOTIATION: "ብርኪ 1 · ድርድር",
        STAGE_2_EVIDENCE: "ብርኪ 2 · መረዳእታ",
        STAGE_3_MEDIATION: "ብርኪ 3 · ሽምግልና",
        ARBITRATION: "ግልግል",
        RESOLVED: "ተፈቲሑ",
      },
      emptyDisputes: "ክርክራት የለዉን። ኣብ ዘድልየሉ እዋን ካብ ንጡፍ ምዕራፍ ክፈቱ።",
      contractDisputeFallback: "ክርክር ውዕል",
      negotiationEnds: (d) => `ግዜ ድርድር ${d} ይውዳእ።`,
      movedToEvidenceSuccess: "ክርክር ናብ ብርኪ 2 መረዳእታ ተሰጋጊሩ።",
      escalateToEvidenceBtn: "ናብ መረዳእታ ኣዕብዮ",
      evidencePlaceholder:
        "ናይ ጽሑፍ መግለጺ መረዳእታኹም ወይ ቴክኒካዊ መረጋገጺ መዘኻኸሪታት የእትዉ...",
      evidenceRecordedSuccess: "መግለጺ መረዳእታ ንሽምግልና ሰራሕተኛታት ተመዝጊቡ።",
      submitEvidenceBtn: "መግለጺ መረዳእታ ኣቅርብ",
      arbitrationRecordedSuccess: "ምዕባይ ናብ ግልግል ንመዝገብ AACCSA ተመዝጊቡ።",
      escalateArbitrationBtn: "ናብ ግልግል AACCSA ኣዕብዮ",
    },
  },
};
