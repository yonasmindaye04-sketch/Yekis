import type { Language } from "../../i18n";

export interface DashboardExtrasCopy {
  verifyFirstBtn: string;
  browseGigsBtn: string;
  updatedAtPrefix: string;
  retryBtn: string;
  attentionTitle: string;
  attentionDesc: string;
  attentionSubmittedReason: string;
  attentionOverdueFundingReason: string;
  attentionFundingReason: string;
  attentionOverdueReason: (dateStr: string) => string;
  attentionOverdueDeliveryReason: (dateStr: string) => string;
  attentionDeliveryReadyReason: string;
  attentionProposalsReason: (count: number) => string;
  attentionContractSignReason: string;
  attentionAutoReleaseCountdown: (days: number) => string;
  attentionAutoReleaseSoon: string;
  attentionUnreadMessagesTitle: string;
  attentionUnreadMessagesReason: (count: number) => string;
  attentionReviewProposalsAction: string;
  attentionSignContractAction: string;
  attentionOpenMessagesAction: string;
  attentionReviewAction: string;
  attentionFundAction: string;
  attentionInspectAction: string;
  attentionDeliverAction: string;
  needActionCount: (n: number) => string;
  pendingTopUpBanner: (amountEtb: string, count: number) => string;
  pendingApprovalNotificationNote: string;
  waitingApprovalBadge: string;
  underReviewBadge: string;
  openWalletBtn: string;
  activeContractsTitle: string;
  activeContractsDesc: string;
  viewContractsBtn: string;
  viewPaymentsBtn: string;
  openJobsTitle: string;
  openJobsDesc: string;
  proposalsCountLabel: (n: number) => string;
  progressMilestones: (done: number, total: number) => string;
  nextStepPrefix: string;
  dueDateLabel: (dateStr: string) => string;
  nextStepSignContract: string;
  nextStepFundMilestone: string;
  nextStepReviewDelivery: string;
  nextStepWorkInProgress: string;
  nextStepResolveDispute: string;
  nextStepCompleted: string;
  insightsTitle: string;
  insightsDesc: string;
  firstRun: {
    ariaLabel: string;
    progressLabel: (done: number, total: number) => string;
    heading: string;
    subtitle: string;
    howEscrowBtn: string;
    hideGuideBtn: string;
    showGuideBtn: string;
    doneLabel: string;
    steps: {
      kycTitle: string;
      kycVerifiedHint: string;
      kycReviewHint: string;
      kycRejectedHint: string;
      kycDefaultHint: string;
      kycActionStatus: string;
      kycActionVerify: string;
      briefTitle: string;
      briefReadyHint: string;
      briefLockedHint: string;
      briefUnlockLink: string;
      briefAction: string;
      fundsTitle: string;
      fundsPendingHint: (etb: string) => string;
      fundsDefaultHint: string;
      fundsAction: string;
      proposalsTitle: string;
      proposalsHint: string;
      proposalsAction: string;
      fundMilestoneTitle: string;
      fundMilestoneHint: string;
      fundMilestoneAction: string;
    };
    escrowDialogTitle: string;
    escrowBullet1Title: string;
    escrowBullet1Body: string;
    escrowBullet2Title: string;
    escrowBullet2Body: string;
    escrowBullet3Title: string;
    escrowBullet3Body: string;
    gotItBtn: string;
    closeAria: string;
  };
}

export const DASHBOARD_EXTRAS_COPY: Record<Language, DashboardExtrasCopy> = {
  en: {
    verifyFirstBtn: "Verify identity",
    browseGigsBtn: "Browse services",
    updatedAtPrefix: "Updated",
    retryBtn: "Retry",
    attentionTitle: "Needs your attention",
    attentionDesc: "Actions sorted by urgency — proposals, signatures, funding, deliveries, and messages.",
    attentionSubmittedReason: "Delivery ready for review",
    attentionOverdueFundingReason: "Overdue · awaiting payment",
    attentionFundingReason: "Awaiting your payment",
    attentionOverdueReason: (d) => `Overdue (due ${d})`,
    attentionOverdueDeliveryReason: (d) => `Overdue delivery (due ${d})`,
    attentionDeliveryReadyReason: "Funded in escrow — ready for delivery",
    attentionProposalsReason: (n) => `${n} ${n === 1 ? "proposal" : "proposals"} waiting for your review`,
    attentionContractSignReason: "Contract awaiting your signature",
    attentionAutoReleaseCountdown: (days) => `Auto-releases in ${days} ${days === 1 ? "day" : "days"}`,
    attentionAutoReleaseSoon: "Auto-releases in < 24 hours",
    attentionUnreadMessagesTitle: "Unread messages",
    attentionUnreadMessagesReason: (n) => `${n} unread ${n === 1 ? "conversation" : "conversations"}`,
    attentionReviewProposalsAction: "Review proposals",
    attentionSignContractAction: "Sign contract",
    attentionOpenMessagesAction: "Open Messages",
    attentionReviewAction: "Review delivery",
    attentionFundAction: "Fund milestone",
    attentionInspectAction: "View payments",
    attentionDeliverAction: "Submit delivery",
    needActionCount: (n) => `${n} need action`,
    pendingTopUpBanner: (etb, count) =>
      `ETB ${etb} waiting for approval (${count} top-up request${count > 1 ? "s" : ""}) — we will notify you once reviewed.`,
    pendingApprovalNotificationNote: "We will notify you once reviewed.",
    waitingApprovalBadge: "Waiting for approval",
    underReviewBadge: "Under review",
    openWalletBtn: "Open Wallet",
    activeContractsTitle: "Active contracts",
    activeContractsDesc: "Track progress, next steps, and upcoming due dates across your hires.",
    viewContractsBtn: "View your contracts",
    viewPaymentsBtn: "View payments",
    openJobsTitle: "Your open jobs",
    openJobsDesc: "Jobs you posted and incoming freelancer proposals.",
    proposalsCountLabel: (n) => `${n} ${n === 1 ? "proposal" : "proposals"}`,
    progressMilestones: (done, total) => `${done} of ${total} milestones completed`,
    nextStepPrefix: "Next step",
    dueDateLabel: (d) => `Next due ${d}`,
    nextStepSignContract: "Sign contract to unlock milestone funding",
    nextStepFundMilestone: "Fund next milestone in Payments",
    nextStepReviewDelivery: "Review submitted delivery",
    nextStepWorkInProgress: "Freelancer is working on current milestone",
    nextStepResolveDispute: "Respond in dispute mediation",
    nextStepCompleted: "All milestones settled",
    insightsTitle: "Insights",
    insightsDesc: "Cashflow and payments by method",
    firstRun: {
      ariaLabel: "Getting started checklist",
      progressLabel: (done, total) => `Getting started · ${done} of ${total} completed`,
      heading: "Your first protected hire on Yekis",
      subtitle: "Follow these steps to verify your account, agree clear milestones, and keep funds protected until delivery.",
      howEscrowBtn: "How escrow protects you",
      hideGuideBtn: "Hide guide",
      showGuideBtn: "Show getting started checklist",
      doneLabel: "Done",
      steps: {
        kycTitle: "Verify identity",
        kycVerifiedHint: "Identity verified — posting jobs is unlocked.",
        kycReviewHint: "Verification submitted for review. We will notify you once reviewed.",
        kycRejectedHint: "Previous submission needed updates. Resubmit your KYC details.",
        kycDefaultHint: "Required before you post your first job.",
        kycActionStatus: "View KYC status",
        kycActionVerify: "Verify identity",
        briefTitle: "Post a job",
        briefReadyHint: "Describe your scope, milestone budget, and deadline in ETB.",
        briefLockedHint: "Unlocks once your identity is verified.",
        briefUnlockLink: "Verify identity to unlock",
        briefAction: "Post a job",
        fundsTitle: "Add funds (before you hire)",
        fundsPendingHint: (etb) => `ETB ${etb} top-up submitted. We will notify you once approved.`,
        fundsDefaultHint: "Top up via Manual Transfer or Instant Checkout so milestones can be funded smoothly.",
        fundsAction: "Open Wallet",
        proposalsTitle: "Review proposals",
        proposalsHint: "Compare freelancer quotes, timelines, and proposed milestones, then create a contract.",
        proposalsAction: "Review proposals",
        fundMilestoneTitle: "Fund your first milestone",
        fundMilestoneHint: "Lock milestone funds in protected escrow. Money only releases when you approve delivery.",
        fundMilestoneAction: "View payments",
      },
      escrowDialogTitle: "How Yekis escrow protects you",
      escrowBullet1Title: "1. You control every payout.",
      escrowBullet1Body: "Funding a milestone moves ETB into protected escrow — freelancers cannot withdraw it until you review and approve the deliverable.",
      escrowBullet2Title: "2. ETB 0 client fee.",
      escrowBullet2Body: "You pay the agreed milestone amount with zero client surcharge; platform fees are deducted solely from freelancer payouts.",
      escrowBullet3Title: "3. Built-in dispute protection before release.",
      escrowBullet3Body: "If work stalls or diverges from your agreed scope while a milestone is funded, open a dispute before releasing payment.",
      gotItBtn: "Got it",
      closeAria: "Close dialog",
    },
  },
  // Machine-translated strings — flagged for native Amharic review
  am: {
    verifyFirstBtn: "ማንነትን ያረጋግጡ",
    browseGigsBtn: "አገልግሎቶችን ያስሱ",
    updatedAtPrefix: "የታደሰው",
    retryBtn: "እንደገና ሞክር",
    attentionTitle: "ትኩረት የሚፈልጉ ጉዳዮች",
    attentionDesc: "በቅድሚያ የተደረደሩ ተግባራት — ፕሮፖዛሎች፣ ፊርማዎች፣ ክፍያዎች፣ ግምገማዎች እና መልዕክቶች።",
    attentionSubmittedReason: "የቀረበ ሥራ ግምገማ ይጠብቃል",
    attentionOverdueFundingReason: "ጊዜው አልፏል · ክፍያ በመጠባበቅ ላይ",
    attentionFundingReason: "ክፍያ በመጠባበቅ ላይ",
    attentionOverdueReason: (d) => `ጊዜው አልፏል (ማለቂያ ${d})`,
    attentionOverdueDeliveryReason: (d) => `ማስረከቢያው አልፏል (ማለቂያ ${d})`,
    attentionDeliveryReadyReason: "በኤስክሮው ተይዟል — ለማስረከብ ዝግጁ",
    attentionProposalsReason: (n) => `${n} ፕሮፖዛሎች ግምገማዎን ይጠብቃሉ`,
    attentionContractSignReason: "ውል ፊርማዎን ይጠብቃል",
    attentionAutoReleaseCountdown: (days) => `በ${days} ቀናት ውስጥ በራስ-ሰር ይለቀቃል`,
    attentionAutoReleaseSoon: "ከ24 ሰዓት በታች በራስ-ሰር ይለቀቃል",
    attentionUnreadMessagesTitle: "ያልተነበቡ መልዕክቶች",
    attentionUnreadMessagesReason: (n) => `${n} ያልተነበቡ ውይይቶች`,
    attentionReviewProposalsAction: "ፕሮፖዛሎችን ይገምግሙ",
    attentionSignContractAction: "ውል ይፈርሙ",
    attentionOpenMessagesAction: "መልዕክቶችን ይክፈቱ",
    attentionReviewAction: "ሥራውን ይገምግሙ",
    attentionFundAction: "ምዕራፉን ይክፈሉ",
    attentionInspectAction: "ክፍያዎችን ይመልከቱ",
    attentionDeliverAction: "ውጤት አስረክብ",
    needActionCount: (n) => `${n} እርምጃ ያስፈልጋቸዋል`,
    pendingTopUpBanner: (etb, count) =>
      `${etb} ብር ማረጋገጫ በመጠባበቅ ላይ (${count} ጥያቄ) — ሲገመገም እናሳውቅዎታለን።`,
    pendingApprovalNotificationNote: "ሲገመገም እናሳውቅዎታለን።",
    waitingApprovalBadge: "ማረጋገጫ በመጠባበቅ ላይ",
    underReviewBadge: "በግምገማ ላይ",
    openWalletBtn: "ዋሌት ክፈት",
    activeContractsTitle: "ንቁ ውሎች",
    activeContractsDesc: "በቅጥርዎ ውስጥ ያሉ የሥራ ሂደቶችን፣ ቀጣይ እርምጃዎችን እና ቀነ-ገደቦችን ይከታተሉ።",
    viewContractsBtn: "ውሎችዎን ይመልከቱ",
    viewPaymentsBtn: "ክፍያዎችን ይመልከቱ",
    openJobsTitle: "ክፍት ሥራዎችዎ",
    openJobsDesc: "የለጠፏቸው ሥራዎች እና የመጡ ፕሮፖዛሎች።",
    proposalsCountLabel: (n) => `${n} ፕሮፖዛሎች`,
    progressMilestones: (done, total) => `${done} ከ ${total} ምዕራፎች ተጠናቀዋል`,
    nextStepPrefix: "ቀጣይ እርምጃ",
    dueDateLabel: (d) => `ቀጣይ ማለቂያ ${d}`,
    nextStepSignContract: "ምዕራፍ ለመክፈል ውሉን ይፈርሙ",
    nextStepFundMilestone: "ቀጣዩን ምዕራፍ በክፍያዎች ውስጥ ይክፈሉ",
    nextStepReviewDelivery: "የቀረበውን ሥራ ይገምግሙ",
    nextStepWorkInProgress: "ባለሙያው በአሁኑ ምዕራፍ ላይ እየሠራ ነው",
    nextStepResolveDispute: "በክርክር ሽምግልና ላይ ምላሽ ይስጡ",
    nextStepCompleted: "ሁሉም ምዕራፎች ተከፍለዋል",
    insightsTitle: "ትንታኔዎች",
    insightsDesc: "የገንዘብ ፍሰት እና ክፍያዎች በዘዴ",
    firstRun: {
      ariaLabel: "መጀመሪያ መመሪያ",
      progressLabel: (done, total) => `መጀመሪያ · ${done} ከ ${total} ተጠናቋል`,
      heading: "በYekis የመጀመሪያ የተጠበቀ ቅጥርዎ",
      subtitle: "ማንነትዎን ለማረጋገጥ፣ ግልጽ ምዕራፎችን ለመስማማት እና ገንዘብን በኤስክሮው ለመጠበቅ እነዚህን ደረጃዎች ይከተሉ።",
      howEscrowBtn: "ኤስክሮው እንዴት ይጠብቅዎታል",
      hideGuideBtn: "መመሪያውን ደብቅ",
      showGuideBtn: "የመጀመሪያ መመሪያውን አሳይ",
      doneLabel: "ተጠናቋል",
      steps: {
        kycTitle: "ማንነትን ያረጋግጡ",
        kycVerifiedHint: "ማንነትዎ ተረጋግጧል — ሥራ መለጠፍ ተከፍቷል።",
        kycReviewHint: "ማረጋገጫው ለግምገማ ቀርቧል። ሲገመገም እናሳውቅዎታለን።",
        kycRejectedHint: "ያለፈው ማመልከቻ ማስተካከያ ያስፈልገዋል። እባክዎ እንደገና ያስገቡ።",
        kycDefaultHint: "የመጀመሪያ ሥራዎን ከመለጠፍዎ በፊት አስፈላጊ ነው።",
        kycActionStatus: "የKYC ሁኔታን ይመልከቱ",
        kycActionVerify: "ማንነትን ያረጋግጡ",
        briefTitle: "ሥራ ይለጥፉ",
        briefReadyHint: "የሥራውን ወሰን፣ የምዕራፍ በጀት እና ቀነ-ገደብ በብር ይግለጹ።",
        briefLockedHint: "ማንነትዎ ሲረጋገጥ ይከፈታል።",
        briefUnlockLink: "ለመክፈት ማንነትን ያረጋግጡ",
        briefAction: "ሥራ ይለጥፉ",
        fundsTitle: "ገንዘብ ያስገቡ (ከመቅጠርዎ በፊት)",
        fundsPendingHint: (etb) => `${etb} ብር መሙላት ቀርቧል። ሲጸድቅ እናሳውቅዎታለን።`,
        fundsDefaultHint: "ምዕራፎችን በቀላሉ ለመክፈል በማንዋል ዝውውር ወይም ቼክአውት ገንዘብ ያስገቡ።",
        fundsAction: "ዋሌት ክፈት",
        proposalsTitle: "ፕሮፖዛሎችን ይገምግሙ",
        proposalsHint: "የባለሙያዎችን ዋጋ እና የጊዜ ሰሌዳ ያነጻጽሩና ውል ይፍጠሩ።",
        proposalsAction: "ፕሮፖዛሎችን ይመልከቱ",
        fundMilestoneTitle: "የመጀመሪያውን ምዕራፍ ይክፈሉ",
        fundMilestoneHint: "ገንዘብን በኤስክሮው ይቆልፉ፤ ገንዘቡ የሚለቀቀው ሥራውን ሲያጸድቁ ብቻ ነው።",
        fundMilestoneAction: "ክፍያዎችን ይመልከቱ",
      },
      escrowDialogTitle: "Yekis ኤስክሮው እንዴት ይጠብቅዎታል",
      escrowBullet1Title: "1. እያንዳንዱን ክፍያ እርስዎ ይቆጣጠራሉ።",
      escrowBullet1Body: "ምዕራፍን መክፈል ገንዘቡን በኤስክሮው ያስቀምጣል — ሥራውን መርምረው እስኪያጸድቁ ድረስ ባለሙያው ማውጣት አይችልም።",
      escrowBullet2Title: "2. ለደንበኛ 0 ብር ክፍያ።",
      escrowBullet2Body: "የተስማሙበትን መጠን ያለምንም ተጨማሪ የደንበኛ ክፍያ ይከፍላሉ።",
      escrowBullet3Title: "3. ከመለቀቁ በፊት የክርክር ጥበቃ።",
      escrowBullet3Body: "ሥራው ከተስማሙት ውጭ ከሆነ ገንዘቡን ከመልቀቅዎ በፊት ክርክር መክፈት ይችላሉ።",
      gotItBtn: "ገባኝ",
      closeAria: "መስኮቱን ዝጋ",
    },
  },
  // Machine-translated strings — flagged for native Afaan Oromoo review
  om: {
    verifyFirstBtn: "Eenyummaa mirkaneessi",
    browseGigsBtn: "Tajaajiloota sakatta'i",
    updatedAtPrefix: "Haaromfame",
    retryBtn: "Irra deebi'i yaali",
    attentionTitle: "Xiyyeeffannoo barbaada",
    attentionDesc: "Gochaalee ariitiidhaan tartiibeffaman — piropoozaalota, mallattoo, kaffaltii fi ergaawwan.",
    attentionSubmittedReason: "Bu'aan hojii gamaaggama eeggata",
    attentionOverdueFundingReason: "Yeroon darbe · kaffaltii eeggata",
    attentionFundingReason: "Kaffaltii keessan eeggata",
    attentionOverdueReason: (d) => `Yeroon darbe (${d})`,
    attentionOverdueDeliveryReason: (d) => `Dhiyeessiin darbe (${d})`,
    attentionDeliveryReadyReason: "Escrow keessatti qabame — dhiyeessuuf qophii",
    attentionProposalsReason: (n) => `Piropoozaala ${n} gamaaggama keessan eeggata`,
    attentionContractSignReason: "Waliigalteen mallattoo keessan eeggata",
    attentionAutoReleaseCountdown: (days) => `Guyyaa ${days} keessatti ofumaan gadhiifama`,
    attentionAutoReleaseSoon: "Sa'aatii 24 gadi keessatti ofumaan gadhiifama",
    attentionUnreadMessagesTitle: "Ergaawwan hin dubbifamne",
    attentionUnreadMessagesReason: (n) => `Haasawa hin dubbifamne ${n}`,
    attentionReviewProposalsAction: "Piropoozaalota ilaali",
    attentionSignContractAction: "Waliigaltee mallatteessi",
    attentionOpenMessagesAction: "Ergaawwan bani",
    attentionReviewAction: "Bu'aa hojii ilaali",
    attentionFundAction: "Boqonnaa kaffali",
    attentionInspectAction: "Kaffaltiiwwan ilaali",
    attentionDeliverAction: "Bu'aa dhiyeessi",
    needActionCount: (n) => `gocha ${n} barbaada`,
    pendingTopUpBanner: (etb, count) =>
      `ETB ${etb} hayyama eeggata (gaaffii ${count}) — yeroo ilaalamu isin beeksifna.`,
    pendingApprovalNotificationNote: "Yeroo ilaalamu isin beeksifna.",
    waitingApprovalBadge: "Hayyama eeggata",
    underReviewBadge: "Gamaaggamaa jira",
    openWalletBtn: "Boorsaa Bani",
    activeContractsTitle: "Waliigalteewwan si'aayoo",
    activeContractsDesc: "Adeemsa, tarkaanfii itti aanuufi guyyaa xumuraa qaxarrii keessanii hordofaa.",
    viewContractsBtn: "Waliigalteewwan keessan ilaalaa",
    viewPaymentsBtn: "Kaffaltiiwwan ilaalaa",
    openJobsTitle: "Hojiiwwan keessan banaa",
    openJobsDesc: "Hojiiwwan maxxansitanii fi piropoozaalota dhiyaatan.",
    proposalsCountLabel: (n) => `Piropoozaala ${n}`,
    progressMilestones: (done, total) => `Boqonnaa ${total} keessaa ${done} xumurameera`,
    nextStepPrefix: "Tarkaanfii itti aanu",
    dueDateLabel: (d) => `Guyyaa itti aanu ${d}`,
    nextStepSignContract: "Boqonnaa kaffaluuf waliigaltee mallatteessaa",
    nextStepFundMilestone: "Boqonnaa itti aanu Kaffaltii keessatti kaffalaa",
    nextStepReviewDelivery: "Bu'aa dhiyaate gamaaggamaa",
    nextStepWorkInProgress: "Ogeessi boqonnaa ammaa hojjechaa jira",
    nextStepResolveDispute: "Araara waldiddaa irratti deebii kennaa",
    nextStepCompleted: "Boqonnaawwan hundi kaffalamaniiru",
    insightsTitle: "Xiinxala",
    insightsDesc: "Sochii maallaqaa fi kaffaltiiwwan karaadhaan",
    firstRun: {
      ariaLabel: "Qajeelfama jalqabaa",
      progressLabel: (done, total) => `Jalqaba · ${done} keessaa ${total} xumurame`,
      heading: "Qaxarrii eegumsaa jalqabaa kee Yekis irratti",
      subtitle: "Eenyummaa mirkaneessuu fi maallaqa escrow keessatti eeguuf tarkaanfilee kana hordofi.",
      howEscrowBtn: "Escrow akkamitti si eega",
      hideGuideBtn: "Qajeelfama dhoksi",
      showGuideBtn: "Qajeelfama jalqabaa agarsiisi",
      doneLabel: "Xumurame",
      steps: {
        kycTitle: "Eenyummaa mirkaneessi",
        kycVerifiedHint: "Eenyummaan mirkanaa'eera — hojii maxxansuun banameera.",
        kycReviewHint: "Mirkaneessi gamaaggamaaf ergameera. Yeroo ilaalamu isin beeksifna.",
        kycRejectedHint: "Galmeen duraanii sirreeffama barbaada. Irra deebi'ii ergi.",
        kycDefaultHint: "Hojii kee jalqabaa maxxansuun dura barbaachisaadha.",
        kycActionStatus: "Haala KYC ilaali",
        kycActionVerify: "Eenyummaa mirkaneessi",
        briefTitle: "Hojii maxxansi",
        briefReadyHint: "Bal'ina hojii, baajata marsaa fi daangaa yeroo ETBn ibsi.",
        briefLockedHint: "Akkuma eenyummaan kee mirkanaa'een ni banama.",
        briefUnlockLink: "Banuuf eenyummaa mirkaneessi",
        briefAction: "Hojii maxxansi",
        fundsTitle: "Maallaqa dabali (osoo hin qaxarin)",
        fundsPendingHint: (etb) => `Daballiin ETB ${etb} ergameera. Yeroo hayyamamu isin beeksifna.`,
        fundsDefaultHint: "Boqonnaawwan salphaatti kaffaluuf dursii boorsaa kee guuti.",
        fundsAction: "Boorsaa Bani",
        proposalsTitle: "Yaadota dorgommii ilaali",
        proposalsHint: "Gatii fi yeroo hojjettoota bilisaa walbira qabii waliigaltee uumi.",
        proposalsAction: "Yaadota ilaali",
        fundMilestoneTitle: "Marsaa jalqabaa kaffali",
        fundMilestoneHint: "Maallaqni escrow keessatti hidhamee tura; hojii mirkaneessitu qofa gadhiifama.",
        fundMilestoneAction: "Kaffaltiiwwan ilaali",
      },
      escrowDialogTitle: "Yekis Escrow akkamitti si eega",
      escrowBullet1Title: "1. Kaffaltii hunda atuu to'atta.",
      escrowBullet1Body: "Kaffaltiin marsaa escrow keessa tura — hanga bu'aa hojii mirkaneessitutti hin baafamu.",
      escrowBullet2Title: "2. Kaffaltii tajaajilaa maamilaa ETB 0.",
      escrowBullet2Body: "Hanga waliigalame qofa kaffalta; kaffaltiin tajaajilaa hojjetaarraa hir'ata.",
      escrowBullet3Title: "3. Eegumsa falmii gadhiisuun dura.",
      escrowBullet3Body: "Hojiin waliigalteen yoo wal hin simne gadhiisuun dura falmii banuu dandeessa.",
      gotItBtn: "Hubadhe",
      closeAria: "Cufi",
    },
  },
  // Machine-translated strings — flagged for native Tigrigna review
  ti: {
    verifyFirstBtn: "መንነት ኣረጋግጽ",
    browseGigsBtn: "ኣገልግሎታት ድለ",
    updatedAtPrefix: "ዝተሓደሰ",
    retryBtn: "ከም ብሓድሽ ፈትን",
    attentionTitle: "ቆላሕታ ዘድልዮም",
    attentionDesc: "ብቅድምነት ዝተሰርዑ ተግባራት — ፕሮፖዛላት፣ ፊርማታት፣ ክፍሊት፣ ገምጋምን መልእኽትታትን።",
    attentionSubmittedReason: "ዝቐረበ ስራሕ ገምጋም ይጽበ",
    attentionOverdueFundingReason: "ግዜኡ ሓሊፉ · ክፍሊት ይጽበ",
    attentionFundingReason: "ክፍሊትኩም ይጽበ",
    attentionOverdueReason: (d) => `ግዜኡ ሓሊፉ (${d})`,
    attentionOverdueDeliveryReason: (d) => `ምርካብ ሓሊፉ (${d})`,
    attentionDeliveryReadyReason: "ኣብ ኤስክሮው ተዓጽዩ — ንምርካብ ድሉው",
    attentionProposalsReason: (n) => `${n} ፕሮፖዛላት ገምጋምኩም ይጽበዩ`,
    attentionContractSignReason: "ውዕል ፊርማኹም ይጽበ ኣሎ",
    attentionAutoReleaseCountdown: (days) => `ኣብ ${days} መዓልታት ብርእሱ ይልቀቕ`,
    attentionAutoReleaseSoon: "ኣብ ትሕቲ 24 ሰዓት ብርእሱ ይልቀቕ",
    attentionUnreadMessagesTitle: "ዘይተነበቡ መልእኽትታት",
    attentionUnreadMessagesReason: (n) => `${n} ዘይተነበቡ ዝርርባት`,
    attentionReviewProposalsAction: "ፕሮፖዛላት ገምግም",
    attentionSignContractAction: "ውዕል ፈርም",
    attentionOpenMessagesAction: "መልእኽትታት ክፈት",
    attentionReviewAction: "ስራሕ ገምግም",
    attentionFundAction: "ብርኪ ክፈል",
    attentionInspectAction: "ክፍሊታት ርአ",
    attentionDeliverAction: "ውጽኢት ኣረክብ",
    needActionCount: (n) => `${n} ስጉምቲ የድሊ`,
    pendingTopUpBanner: (etb, count) =>
      `${etb} ብር ፍቓድ ይጽበ ኣሎ (${count} ሕቶ) — ምስ ተገምገመ ክንሕብረኩም ኢና።`,
    pendingApprovalNotificationNote: "ምስ ተገምገመ ክንሕብረኩም ኢና።",
    waitingApprovalBadge: "ፍቓድ ይጽበ ኣሎ",
    underReviewBadge: "ኣብ ትሕቲ ገምጋም",
    openWalletBtn: "ቦርሳ ክፈት",
    activeContractsTitle: "ንጡፋት ውዕላት",
    activeContractsDesc: "ኣብ ቆጽራኹም ዘሎ ምዕባለ፣ ቀጻሊ ስጉምትን ዕለታት ምርካብን ተኸታተሉ።",
    viewContractsBtn: "ውዕላትኩም ርኣዩ",
    viewPaymentsBtn: "ክፍሊታት ርኣዩ",
    openJobsTitle: "ክፉታት ስራሕትኹም",
    openJobsDesc: "ዝለጠፍኩምዎም ስራሕትን ዝመጹ ፕሮፖዛላትን።",
    proposalsCountLabel: (n) => `${n} ፕሮፖዛላት`,
    progressMilestones: (done, total) => `${done} ካብ ${total} ብርክታት ተዛዚሞም`,
    nextStepPrefix: "ቀጻሊ ስጉምቲ",
    dueDateLabel: (d) => `ቀጻሊ ዕለት ${d}`,
    nextStepSignContract: "ክፍሊት ብርኪ ንምኽፋት ውዕል ፈርሙ",
    nextStepFundMilestone: "ቀጻሊ ብርኪ ኣብ ክፍሊታት ክፈሉ",
    nextStepReviewDelivery: "ዝቐረበ ስራሕ ገምግሙ",
    nextStepWorkInProgress: "ክኢላ ኣብ ናይ ሕጂ ብርኪ ይሰርሕ ኣሎ",
    nextStepResolveDispute: "ኣብ ሽምግልና ክትዕ ምላሽ ሃቡ",
    nextStepCompleted: "ኩሎም ብርክታት ተኸፊሎም",
    insightsTitle: "ትንታነታት",
    insightsDesc: "ዋሕዚ ገንዘብን ክፍሊታትን ብኣገባብ",
    firstRun: {
      ariaLabel: "መምርሒ መጀመርታ",
      progressLabel: (done, total) => `መጀመርታ · ${done} ካብ ${total} ተዛዚሙ`,
      heading: "ኣብ Yekis ናይ መጀመርታ ውሑስ ምቑጻር",
      subtitle: "መንነት ንምርግጋጽ፣ ንጹራት ብርክታት ንምስምማዕን ገንዘብ ኣብ ኤስክሮው ንምዕቃብን ነዞም ስጉምታት ሰዓብ።",
      howEscrowBtn: "ኤስክሮው ከመይ ይሕልወካ",
      hideGuideBtn: "መምርሒ ሕባእ",
      showGuideBtn: "መምርሒ መጀመርታ ኣርኢ",
      doneLabel: "ተዛዚሙ",
      steps: {
        kycTitle: "መንነት ኣረጋግጽ",
        kycVerifiedHint: "መንነት ተረጋጊጹ — ስራሕ ምልጣፍ ተኸፊቱ።",
        kycReviewHint: "መረጋገጺ ንገምጋም ተላኢኹ ኣሎ። ምስ ተገምገመ ክንሕብረኩም ኢና።",
        kycRejectedHint: "ዝሓለፈ ሕቶ ምትዕርራይ የድልዮ። ከም ብሓድሽ ስደድ።",
        kycDefaultHint: "ናይ መጀመርታ ስራሕ ቅድሚ ምልጣፍካ የድሊ።",
        kycActionStatus: "ኩነታት KYC ርአ",
        kycActionVerify: "መንነት ኣረጋግጽ",
        briefTitle: "ስራሕ ለጥፍ",
        briefReadyHint: "ዝርዝር ስራሕ፣ ባጀትን ደረት ግዜን ብብር ግለጽ።",
        briefLockedHint: "መንነትካ ምስ ተረጋገጸ ብቐጥታ ይኽፈት።",
        briefUnlockLink: "ንምኽፋት መንነት ኣረጋግጽ",
        briefAction: "ስራሕ ለጥፍ",
        fundsTitle: "ገንዘብ ወስኽ (ቅድሚ ምቑጻር)",
        fundsPendingHint: (etb) => `${etb} ብር ምምላእ ተላኢኹ። ምስ ጸደቐ ክንሕብረኩም ኢና።`,
        fundsDefaultHint: "ብርክታት ብቐሊሉ ንምኽፋል ቅድሚኡ ቦርሳኻ ምላእ።",
        fundsAction: "ቦርሳ ክፈት",
        proposalsTitle: "ፕሮፖዛላት ገምግም",
        proposalsHint: "ዋጋታትን ግዜን ኣነጻጺርካ ውዕል ፍጠር።",
        proposalsAction: "ፕሮፖዛላት ርአ",
        fundMilestoneTitle: "ናይ መጀመርታ ብርኪ ክፈል",
        fundMilestoneHint: "ገንዘብ ኣብ ኤስክሮው ይዕቆብ፤ ውጽኢት ምስ ኣጽደቕካ ጥራይ ይልቀቕ።",
        fundMilestoneAction: "ክፍሊታት ርአ",
      },
      escrowDialogTitle: "Yekis ኤስክሮው ከመይ ይሕልወካ",
      escrowBullet1Title: "1. ነፍሲ ወከፍ ክፍሊት ንስኻ ትቆጻጸሮ።",
      escrowBullet1Body: "ብርኪ ምኽፋል ገንዘብ ኣብ ኤስክሮው ይዓጽዎ — ውጽኢት ስራሕ ክሳብ እተጽድቕ ክወጽእ ኣይክእልን።",
      escrowBullet2Title: "2. ንዓሚል 0 ብር ክፍሊት።",
      escrowBullet2Body: "ዝተሰማማዕካሉ መጠን ጥራይ ትኸፍል፤ ክፍሊት መድረኽ ካብ ሰራሕተኛ ጥራይ ይቕነስ።",
      escrowBullet3Title: "3. ቅድሚ ምልቃቕ ውሕስነት ክትዕ።",
      escrowBullet3Body: "ስራሕ ምስ ውዕል እንተዘይተሰማሚዑ ቅድሚ ምልቃቕ ክፍሊት ክትዕ ክፈት።",
      gotItBtn: "ተረዲኡኒ",
      closeAria: "ዕጸው",
    },
  },
};
