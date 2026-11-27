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
  attentionReviewAction: string;
  attentionFundAction: string;
  attentionInspectAction: string;
  attentionDeliverAction: string;
  needActionCount: (n: number) => string;
  pendingTopUpBanner: (amountEtb: string, count: number) => string;
  openWalletBtn: string;
  firstRun: {
    ariaLabel: string;
    progressLabel: (done: number, total: number) => string;
    heading: string;
    subtitle: string;
    howEscrowBtn: string;
    hideGuideBtn: string;
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
    verifyFirstBtn: "Verify first",
    browseGigsBtn: "Browse gigs",
    updatedAtPrefix: "Updated",
    retryBtn: "Retry",
    attentionTitle: "Needs your attention",
    attentionDesc: "Milestones waiting on funding, deliverable review, or submission.",
    attentionSubmittedReason: "Submitted for review",
    attentionOverdueFundingReason: "Overdue · awaiting funding",
    attentionFundingReason: "Awaiting funding",
    attentionOverdueReason: (d) => `Overdue (due ${d})`,
    attentionOverdueDeliveryReason: (d) => `Overdue delivery (due ${d})`,
    attentionDeliveryReadyReason: "Funded in escrow — ready for delivery",
    attentionReviewAction: "Review & Release",
    attentionFundAction: "Fund Milestone",
    attentionInspectAction: "Inspect in Escrow",
    attentionDeliverAction: "Submit Delivery",
    needActionCount: (n) => `${n} need action`,
    pendingTopUpBanner: (etb, count) =>
      `ETB ${etb} pending verification (${count} top-up request${count > 1 ? "s" : ""})`,
    openWalletBtn: "Open Wallet",
    firstRun: {
      ariaLabel: "Getting started checklist",
      progressLabel: (done, total) => `Getting started · ${done} of ${total} completed`,
      heading: "Your first protected hire on Yekis",
      subtitle: "Follow these steps to verify your account, agree clear milestones, and keep funds protected until delivery.",
      howEscrowBtn: "How escrow protects you",
      hideGuideBtn: "Hide guide",
      doneLabel: "Done",
      steps: {
        kycTitle: "Verify identity",
        kycVerifiedHint: "Identity verified — brief publishing is unlocked.",
        kycReviewHint: "Verification submitted and under staff review.",
        kycRejectedHint: "Previous submission needed updates. Resubmit your KYC details.",
        kycDefaultHint: "Required before you publish your first hiring brief.",
        kycActionStatus: "View KYC status",
        kycActionVerify: "Verify identity",
        briefTitle: "Post your first brief",
        briefReadyHint: "Describe your scope, milestone budget, and deadline in ETB.",
        briefLockedHint: "Unlocks as soon as KYC verification is complete.",
        briefAction: "Post job brief",
        fundsTitle: "Add funds (before you hire)",
        fundsPendingHint: (etb) => `ETB ${etb} top-up is pending verification.`,
        fundsDefaultHint: "Top up via Manual Transfer or Instant Checkout so milestones can be funded smoothly.",
        fundsAction: "Open Wallet",
        proposalsTitle: "Review proposals",
        proposalsHint: "Compare freelancer quotes, timelines, and proposed milestones, then create a contract.",
        proposalsAction: "Review proposals",
        fundMilestoneTitle: "Fund your first milestone",
        fundMilestoneHint: "Lock milestone funds in protected escrow. Money only releases when you approve delivery.",
        fundMilestoneAction: "Open Escrow Center",
      },
      escrowDialogTitle: "How Yekis escrow protects you",
      escrowBullet1Title: "1. You control every payout.",
      escrowBullet1Body: "Funding a milestone moves ETB into protected escrow — freelancers cannot withdraw it until you review and approve the deliverable.",
      escrowBullet2Title: "2. ETB 0 client fee.",
      escrowBullet2Body: "You pay the agreed milestone amount with zero client surcharge; platform fees are deducted solely from freelancer payouts.",
      escrowBullet3Title: "3. Built-in dispute protection before release.",
      escrowBullet3Body: "If work stalls or diverges from your agreed scope while a milestone is funded, open a dispute in Escrow Center before releasing payment.",
      gotItBtn: "Got it",
      closeAria: "Close dialog",
    },
  },
  am: {
    verifyFirstBtn: "መጀመሪያ ያረጋግጡ",
    browseGigsBtn: "ጊጎችን ያስሱ",
    updatedAtPrefix: "የታደሰው",
    retryBtn: "እንደገና ሞክር",
    attentionTitle: "ትኩረት የሚፈልጉ ጉዳዮች",
    attentionDesc: "ክፍያ፣ የስራ ግምገማ ወይም ማስረከብ የሚጠብቁ ምዕራፎች።",
    attentionSubmittedReason: "ለግምገማ ቀርቧል",
    attentionOverdueFundingReason: "ጊዜው አልፏል · ክፍያ በመጠባበቅ ላይ",
    attentionFundingReason: "ክፍያ በመጠባበቅ ላይ",
    attentionOverdueReason: (d) => `ጊዜው አልፏል (ማለቂያ ${d})`,
    attentionOverdueDeliveryReason: (d) => `ማስረከቢያው አልፏል (ማለቂያ ${d})`,
    attentionDeliveryReadyReason: "በኤስክሮው ተይዟል — ለማስረከብ ዝግጁ",
    attentionReviewAction: "ገምግም እና ልቀቅ",
    attentionFundAction: "ምዕራፉን ክፈል",
    attentionInspectAction: "በኤስክሮው ይመልከቱ",
    attentionDeliverAction: "ውጤት አስረክብ",
    needActionCount: (n) => `${n} እርምጃ ያስፈልጋቸዋል`,
    pendingTopUpBanner: (etb, count) =>
      `${etb} ብር ማረጋገጫ በመጠባበቅ ላይ (${count} ጥያቄ)`,
    openWalletBtn: "ዋሌት ክፈት",
    firstRun: {
      ariaLabel: "መጀመሪያ መመሪያ",
      progressLabel: (done, total) => `መጀመሪያ · ${done} ከ ${total} ተጠናቋል`,
      heading: "በYeKis የመጀመሪያ የተጠበቀ ቅጥርዎ",
      subtitle: "ማንነትዎን ለማረጋገጥ፣ ግልጽ ምዕራፎችን ለመስማማት እና ገንዘብን በኤስክሮው ለመጠበቅ እነዚህን ደረጃዎች ይከተሉ።",
      howEscrowBtn: "ኤስክሮው እንዴት ይጠብቅዎታል",
      hideGuideBtn: "መመሪያውን ደብቅ",
      doneLabel: "ተጠናቋል",
      steps: {
        kycTitle: "ማንነትን ያረጋግጡ",
        kycVerifiedHint: "ማንነትዎ ተረጋግጧል — ስራ መለጠፍ ተከፍቷል።",
        kycReviewHint: "ማረጋገጫው ተልኳል እና በባለሙያ እየተገመገመ ነው።",
        kycRejectedHint: "ያለፈው ማመልከቻ ማስተካከያ ያስፈልገዋል። እባክዎ እንደገና ያስገቡ።",
        kycDefaultHint: "የመጀመሪያ ስራዎን ከመለጠፍዎ በፊት አስፈላጊ ነው።",
        kycActionStatus: "የKYC ሁኔታን ይመልከቱ",
        kycActionVerify: "ማንነትን ያረጋግጡ",
        briefTitle: "የመጀመሪያ ስራዎን ይለጥፉ",
        briefReadyHint: "የስራውን ወሰን፣ የምዕራፍ በጀት እና ቀነ-ገደብ በብር ይግለጹ።",
        briefLockedHint: "KYC ማረጋገጫ እንደተጠናቀቀ ይከፈታል።",
        briefAction: "ስራ ለጥፍ",
        fundsTitle: "ገንዘብ ያስገቡ (ከመቅጠርዎ በፊት)",
        fundsPendingHint: (etb) => `${etb} ብር ማረጋገጫ በመጠባበቅ ላይ ነው።`,
        fundsDefaultHint: "ምዕራፎችን በቀላሉ ለመክፈል በማንዋል ዝውውር ወይም ቼክአውት ገንዘብ ያስገቡ።",
        fundsAction: "ዋሌት ክፈት",
        proposalsTitle: "ፕሮፖዛሎችን ይገምግሙ",
        proposalsHint: "የባለሙያዎችን ዋጋ እና የጊዜ ሰሌዳ ያነጻጽሩና ውል ይፍጠሩ።",
        proposalsAction: "ፕሮፖዛሎችን ይመልከቱ",
        fundMilestoneTitle: "የመጀመሪያውን ምዕራፍ ይክፈሉ",
        fundMilestoneHint: "ገንዘብን በኤስክሮው ይቆልፉ፤ ገንዘቡ የሚለቀቀው ስራውን ሲያጸድቁ ብቻ ነው።",
        fundMilestoneAction: "ኤስክሮው ማዕከል ክፈት",
      },
      escrowDialogTitle: "YeKis ኤስክሮው እንዴት ይጠብቅዎታል",
      escrowBullet1Title: "1. እያንዳንዱን ክፍያ እርስዎ ይቆጣጠራሉ።",
      escrowBullet1Body: "ምዕራፍን መክፈል ገንዘቡን በኤስክሮው ያስቀምጣል — ስራውን መርምረው እስኪያጸድቁ ድረስ ባለሙያው ማውጣት አይችልም።",
      escrowBullet2Title: "2. ለደንበኛ 0 ብር ክፍያ።",
      escrowBullet2Body: "የተስማሙበትን መጠን ያለምንም ተጨማሪ የደንበኛ ክፍያ ይከፍላሉ።",
      escrowBullet3Title: "3. ከመለቀቁ በፊት የክርክር ጥበቃ።",
      escrowBullet3Body: "ስራው ከተስማሙት ውጭ ከሆነ ገንዘቡን ከመልቀቅዎ በፊት ክርክር መክፈት ይችላሉ።",
      gotItBtn: "ገባኝ",
      closeAria: "መስኮቱን ዝጋ",
    },
  },
  om: {
    verifyFirstBtn: "Dura mirkaneessi",
    browseGigsBtn: "Giigii sakatta'i",
    updatedAtPrefix: "Haaromfame",
    retryBtn: "Irra deebi'i yaali",
    attentionTitle: "Xiyyeeffannoo barbaada",
    attentionDesc: "Marsaawwan kaffaltii, gamaaggama ykn dhiyeessii eeggatan.",
    attentionSubmittedReason: "Gamaaggamaaf dhiyaate",
    attentionOverdueFundingReason: "Yeroon darbe · kaffaltii eeggata",
    attentionFundingReason: "Kaffaltii eeggata",
    attentionOverdueReason: (d) => `Yeroon darbe (${d})`,
    attentionOverdueDeliveryReason: (d) => `Dhiyeessiin darbe (${d})`,
    attentionDeliveryReadyReason: "Escrow keessatti qabame — dhiyeessuuf qophii",
    attentionReviewAction: "Gamaaggami & Gadhiisi",
    attentionFundAction: "Boqonnaa Kaffali",
    attentionInspectAction: "Escrow keessatti ilaali",
    attentionDeliverAction: "Bu'aa dhiyeessi",
    needActionCount: (n) => `gocha ${n} barbaada`,
    pendingTopUpBanner: (etb, count) =>
      `ETB ${etb} mirkaneeffannaa eeggata (${count} gaaffii)`,
    openWalletBtn: "Boorsaa Bani",
    firstRun: {
      ariaLabel: "Qajeelfama jalqabaa",
      progressLabel: (done, total) => `Jalqaba · ${done} keessaa ${total} xumurame`,
      heading: "Qaxarrii eegumsaa jalqabaa kee YeKis irratti",
      subtitle: "Eenyummaa mirkaneessuu fi maallaqa escrow keessatti eeguuf tarkaanfilee kana hordofi.",
      howEscrowBtn: "Escrow akkamitti si eega",
      hideGuideBtn: "Qajeelfama dhoksi",
      doneLabel: "Xumurame",
      steps: {
        kycTitle: "Eenyummaa mirkaneessi",
        kycVerifiedHint: "Eenyummaan mirkanaa'eera — hojii maxxansuun banameera.",
        kycReviewHint: "Mirkaneessi ergamee gamaaggamaa jira.",
        kycRejectedHint: "Galmeen duraanii sirreeffama barbaada. Irra deebi'ii ergi.",
        kycDefaultHint: "Hojii kee jalqabaa maxxansuun dura barbaachisaadha.",
        kycActionStatus: "Haala KYC ilaali",
        kycActionVerify: "Eenyummaa mirkaneessi",
        briefTitle: "Hojii jalqabaa maxxansi",
        briefReadyHint: "Bal'ina hojii, baajata marsaa fi daangaa yeroo ETBn ibsi.",
        briefLockedHint: "Akkuma KYC xumurameen ni banama.",
        briefAction: "Hojii maxxansi",
        fundsTitle: "Maallaqa dabali (osoo hin qaxarin)",
        fundsPendingHint: (etb) => `ETB ${etb} mirkaneeffannaa eeggata.`,
        fundsDefaultHint: "Boqonnaawwan salphaatti kaffaluuf dursii boorsaa kee guuti.",
        fundsAction: "Boorsaa Bani",
        proposalsTitle: "Yaadota dorgommii ilaali",
        proposalsHint: "Gatii fi yeroo hojjettoota bilisaa walbira qabii waliigaltee uumi.",
        proposalsAction: "Yaadota ilaali",
        fundMilestoneTitle: "Marsaa jalqabaa kaffali",
        fundMilestoneHint: "Maallaqni escrow keessatti hidhamee tura; hojii mirkaneessitu qofa gadhiifama.",
        fundMilestoneAction: "Wiirtuu Escrow Bani",
      },
      escrowDialogTitle: "YeKis Escrow akkamitti si eega",
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
  ti: {
    verifyFirstBtn: "ቅድም ኣረጋግጽ",
    browseGigsBtn: "ጊጋት ድለ",
    updatedAtPrefix: "ዝተሓደሰ",
    retryBtn: "ከም ብሓድሽ ፈትን",
    attentionTitle: "ቆላሕታ ዘድልዮም",
    attentionDesc: "ክፍሊት፣ ገምጋም ወይ ምርካብ ዝጽበዩ ብርክታት ስራሕ።",
    attentionSubmittedReason: "ንገምጋም ቀሪቡ",
    attentionOverdueFundingReason: "ግዜኡ ሓሊፉ · ክፍሊት ይጽበ",
    attentionFundingReason: "ክፍሊት ይጽበ",
    attentionOverdueReason: (d) => `ግዜኡ ሓሊፉ (${d})`,
    attentionOverdueDeliveryReason: (d) => `ምርካብ ሓሊፉ (${d})`,
    attentionDeliveryReadyReason: "ኣብ ኤስክሮው ተዓጽዩ — ንምርካብ ድሉው",
    attentionReviewAction: "ገምግምን ፍኖን",
    attentionFundAction: "ብርኪ ክፈል",
    attentionInspectAction: "ኣብ ኤስክሮው ርአ",
    attentionDeliverAction: "ውጽኢት ኣረክብ",
    needActionCount: (n) => `${n} ስጉምቲ የድሊ`,
    pendingTopUpBanner: (etb, count) =>
      `${etb} ብር መረጋገጺ ይጽበ (${count} ሕቶ)`,
    openWalletBtn: "ቦርሳ ክፈት",
    firstRun: {
      ariaLabel: "መምርሒ መጀመርታ",
      progressLabel: (done, total) => `መጀመርታ · ${done} ካብ ${total} ተዛዚሙ`,
      heading: "ኣብ YeKis ናይ መጀመርታ ውሑስ ምቑጻር",
      subtitle: "መንነት ንምርግጋጽ፣ ንጹራት ብርክታት ንምስምማዕን ገንዘብ ኣብ ኤስክሮው ንምዕቃብን ነዞም ስጉምታት ሰዓብ።",
      howEscrowBtn: "ኤስክሮው ከመይ ይሕልወካ",
      hideGuideBtn: "መምርሒ ሕባእ",
      doneLabel: "ተዛዚሙ",
      steps: {
        kycTitle: "መንነት ኣረጋግጽ",
        kycVerifiedHint: "መንነት ተረጋጊጹ — ስራሕ ምልጣፍ ተኸፊቱ።",
        kycReviewHint: "መረጋገጺ ተላኢኹ ኣብ ትሕቲ ገምጋም ኣሎ።",
        kycRejectedHint: "ዝሓለፈ ሕቶ ምትዕርራይ የድልዮ። ከም ብሓድሽ ስደድ።",
        kycDefaultHint: "ናይ መጀመርታ ስራሕ ቅድሚ ምልጣፍካ የድሊ።",
        kycActionStatus: "ኩነታት KYC ርአ",
        kycActionVerify: "መንነት ኣረጋግጽ",
        briefTitle: "ናይ መጀመርታ ስራሕ ለጥፍ",
        briefReadyHint: "ዝርዝር ስራሕ፣ ባጀትን ደረት ግዜን ብብር ግለጽ።",
        briefLockedHint: "KYC ምስ ተረጋገጸ ብቐጥታ ይኽፈት።",
        briefAction: "ስራሕ ለጥፍ",
        fundsTitle: "ገንዘብ ወስኽ (ቅድሚ ምቑጻር)",
        fundsPendingHint: (etb) => `${etb} ብር መረጋገጺ ይጽበ ኣሎ።`,
        fundsDefaultHint: "ብርክታት ብቐሊሉ ንምኽፋል ቅድሚኡ ቦርሳኻ ምላእ።",
        fundsAction: "ቦርሳ ክፈት",
        proposalsTitle: "ፕሮፖዛላት ገምግም",
        proposalsHint: "ዋጋታትን ግዜን ኣነጻጺርካ ውዕል ፍጠር።",
        proposalsAction: "ፕሮፖዛላት ርአ",
        fundMilestoneTitle: "ናይ መጀመርታ ብርኪ ክፈል",
        fundMilestoneHint: "ገንዘብ ኣብ ኤስክሮው ይዕቆብ፤ ውጽኢት ምስ ኣጽደቕካ ጥራይ ይልቀቕ።",
        fundMilestoneAction: "ማእከል ኤስክሮው ክፈት",
      },
      escrowDialogTitle: "YeKis ኤስክሮው ከመይ ይሕልወካ",
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
