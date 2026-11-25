import { type Language } from "./i18n";
import type { MiniMeTone } from "./api/client";

export type ChatWorkspaceCopy = {
  failedLoadMessages: string;
  participantFallback: string;
  escrowContractFallback: string;
  recommendedReplyLabel: string;
  alternativeReplyLabel: string;
  followUpReplyLabel: string;
  failedSummarize: string;
  failedExtractDeal: string;
  circumventionNotice: string;
  attachmentFallback: string;
  failedSendMessage: string;
  recipientRequiredError: string;
  failedCreateConversation: string;
  messagesHeading: string;
  subtitleFreelancer: string;
  subtitleClient: string;
  newChatBtnTitle: string;
  newChatBtn: string;
  searchPlaceholder: string;
  filterAll: string;
  filterDirect: string;
  filterSupport: string;
  emptySupport: string;
  emptyFreelancer: string;
  emptyDefault: string;
  ctaSupport: string;
  ctaClient: string;
  ctaDefault: string;
  yekisSupportName: string;
  supportBadge: string;
  roles: Record<string, string>;
  backToConversationsTitle: string;
  typingWord: string;
  officialSupportSub: string;
  onlineSuffix: string;
  summarizeTitle: string;
  threadSummaryBtn: string;
  extractDealClientTitle: string;
  extractDealDefaultTitle: string;
  extractDealBtn: string;
  supportDeskTitle: string;
  directWorkspaceTitle: string;
  supportDeskDesc: string;
  directWorkspaceClientDesc: string;
  directWorkspaceFreelancerDesc: string;
  youLabel: string;
  miniMeLabel: string;
  miniMeGroundedPrefix: (title: string) => string;
  miniMeDefaultNote: string;
  draftingReplies: string;
  sendImmediatelyTitle: string;
  quickSendAria: (label: string) => string;
  hoverPreviewHint: string;
  adjustToneTitle: string;
  tuneCustom: string;
  tuneDefault: string;
  tones: Record<MiniMeTone, string>;
  regenerateTitle: string;
  miniMeMenuTitle: string;
  closeMiniMeAria: string;
  replyToneAria: string;
  refineDraftPlaceholder: string;
  customPromptPlaceholder: string;
  clearCustomTitle: string;
  applyBtn: string;
  safetyNoticeTitle: string;
  composerSupportPlaceholder: string;
  composerDefaultPlaceholder: string;
  attachTitle: string;
  sendMessageTitle: string;
  fileReadyFallback: string;
  removeAttachmentTitle: string;
  noActiveFreelancerTitle: string;
  noActiveClientTitle: string;
  noActiveFreelancerDesc: string;
  noActiveClientDesc: string;
  startNewConvBtn: string;
  summaryModalTitle: string;
  analyzingContext: string;
  topicLabel: string;
  keyRequirementsLabel: string;
  agreedBudgetLabel: string;
  pendingFinalQuote: string;
  estimatedTimelineLabel: string;
  recommendedActionLabel: string;
  noSummaryYet: string;
  closeBtn: string;
  dealModalTitle: string;
  extractingDeal: string;
  confidenceLabel: (conf: string) => string;
  escrowReady: string;
  requiresAlignment: string;
  suggestedTitleLabel: string;
  suggestedBudgetLabel: string;
  estimatedDurationLabel: string;
  daysSuffix: (days: number) => string;
  dealDisclaimer: string;
  noDealExtracted: string;
  cancelBtn: string;
  goToContractsBtn: string;
  newConvModalTitle: string;
  directMessageTab: string;
  supportTicketTab: string;
  recipientClientLabel: string;
  recipientFreelancerLabel: string;
  recipientClientPlaceholder: string;
  recipientFreelancerPlaceholder: string;
  subjectLabel: string;
  subjectSupportPlaceholder: string;
  subjectClientPlaceholder: string;
  subjectFreelancerPlaceholder: string;
  creatingBtn: string;
  startChatBtn: string;
};

export const CHAT_WORKSPACE_COPY: Record<Language, ChatWorkspaceCopy> = {
  en: {
    failedLoadMessages: "Failed to load messages",
    participantFallback: "Participant",
    escrowContractFallback: "Escrow Contract",
    recommendedReplyLabel: "Recommended Reply",
    alternativeReplyLabel: "Alternative",
    followUpReplyLabel: "Follow-Up",
    failedSummarize: "Failed to summarize chat",
    failedExtractDeal: "Failed to extract deal terms",
    circumventionNotice:
      "Escrow Safety Notice: Direct contact details or off-platform payment terms detected. Direct transactions void escrow insurance, dispute resolution, and AML statutory protections. Keep communication and payments strictly on Yekis.",
    attachmentFallback: "Attachment",
    failedSendMessage: "Failed to send message",
    recipientRequiredError:
      "Recipient User ID or Email is required for direct chat",
    failedCreateConversation: "Failed to create conversation",
    messagesHeading: "Messages",
    subtitleFreelancer: "Client conversations & proposals",
    subtitleClient: "Your project discussions",
    newChatBtnTitle: "Start new conversation",
    newChatBtn: "New",
    searchPlaceholder: "Search conversations...",
    filterAll: "All",
    filterDirect: "Direct",
    filterSupport: "Support",
    emptySupport: "No support tickets found",
    emptyFreelancer: "No client conversations found",
    emptyDefault: "No conversations found",
    ctaSupport: "Contact Support",
    ctaClient: "Message a Freelancer",
    ctaDefault: "Start a Conversation",
    yekisSupportName: "Yekis Support",
    supportBadge: "SUPPORT",
    roles: {
      CLIENT: "CLIENT",
      FREELANCER: "FREELANCER",
      BOTH: "BOTH",
      ADMIN: "ADMIN",
    },
    backToConversationsTitle: "Back to conversations",
    typingWord: "typing",
    officialSupportSub: "Official Support",
    onlineSuffix: "Online",
    summarizeTitle: "Mini-Me: Summarize Thread",
    threadSummaryBtn: "Thread Summary",
    extractDealClientTitle: "Mini-Me: Extract milestone terms & create contract",
    extractDealDefaultTitle: "Mini-Me: Extract Deal Terms",
    extractDealBtn: "Extract Deal",
    supportDeskTitle: "Yekis Support Desk",
    directWorkspaceTitle: "Direct Workspace",
    supportDeskDesc:
      "Have questions about payments, disputes, or account verification? Our support team is here to help.",
    directWorkspaceClientDesc:
      "Negotiate deliverables, discuss milestones, or clarify requirements with this freelancer. Payment is held while you review the work.",
    directWorkspaceFreelancerDesc:
      "Discuss project details, propose milestones, and align with your client. Payment is released when you approve the work, or after the review window if you do not respond.",
    youLabel: "You",
    miniMeLabel: "Mini-Me",
    miniMeGroundedPrefix: (title) => `Grounded in ${title}`,
    miniMeDefaultNote: "Mini-Me context-aware reply suggestions",
    draftingReplies: "Drafting replies...",
    sendImmediatelyTitle: "Send immediately",
    quickSendAria: (label) => `Quick send: ${label}`,
    hoverPreviewHint: "Click to edit · Send icon to send",
    adjustToneTitle:
      "Adjust reply tone or guide Mini-Me with a custom instruction",
    tuneCustom: "Custom",
    tuneDefault: "Tune",
    tones: {
      PROFESSIONAL: "Professional",
      FRIENDLY: "Friendly",
      NEGOTIATION: "Negotiation",
      CONCISE: "Concise",
    },
    regenerateTitle: "Regenerate Mini-Me suggestions",
    miniMeMenuTitle: "Mini-Me Tone & Prompt",
    closeMiniMeAria: "Close Mini-Me menu",
    replyToneAria: "Reply tone",
    refineDraftPlaceholder: "Refine current draft (e.g., 'Make firmer')...",
    customPromptPlaceholder:
      "Custom instruction (e.g., 'Ask for CBE receipt')...",
    clearCustomTitle: "Clear custom instruction",
    applyBtn: "Apply",
    safetyNoticeTitle: "Platform Safety Notice",
    composerSupportPlaceholder:
      "Describe your question or issue... (Enter to send)",
    composerDefaultPlaceholder:
      "Type a message or click a Mini-Me suggestion above to edit... (Enter to send)",
    attachTitle: "Attach document or image",
    sendMessageTitle: "Send message",
    fileReadyFallback: "File attached ready to send",
    removeAttachmentTitle: "Remove attachment",
    noActiveFreelancerTitle: "Freelancer Messages Workspace",
    noActiveClientTitle: "Client Messages Workspace",
    noActiveFreelancerDesc:
      "Select a conversation from the left to collaborate with clients, negotiate milestones, or reach official support.",
    noActiveClientDesc:
      "Select a conversation from the left to discuss project terms with freelancers, or start a new support inquiry.",
    startNewConvBtn: "Start New Conversation",
    summaryModalTitle: "Mini-Me Thread Digest",
    analyzingContext:
      "Analyzing conversation context & extracting key terms...",
    topicLabel: "Topic",
    keyRequirementsLabel: "Key Requirements",
    agreedBudgetLabel: "Agreed Budget",
    pendingFinalQuote: "Pending final quote",
    estimatedTimelineLabel: "Estimated Timeline",
    recommendedActionLabel: "Recommended Next Action",
    noSummaryYet: "No summary could be generated yet.",
    closeBtn: "Close",
    dealModalTitle: "Mini-Me Deal Terms Extractor",
    extractingDeal: "Extracting contract deliverables & pricing...",
    confidenceLabel: (conf) => `Confidence: ${conf}`,
    escrowReady: "Escrow Ready",
    requiresAlignment: "Requires Further Alignment",
    suggestedTitleLabel: "Suggested Milestone Title",
    suggestedBudgetLabel: "Suggested Budget",
    estimatedDurationLabel: "Estimated Duration",
    daysSuffix: (days) => `${days} Days`,
    dealDisclaimer:
      "Review terms before initiating escrow funding. Yekis holds funds in trust until delivery acceptance.",
    noDealExtracted: "No deal terms could be extracted from this conversation.",
    cancelBtn: "Cancel",
    goToContractsBtn: "Go to Contracts & Escrow",
    newConvModalTitle: "Start New Conversation",
    directMessageTab: "Direct Message",
    supportTicketTab: "Support Ticket",
    recipientClientLabel: "Freelancer Email or User ID",
    recipientFreelancerLabel: "Client Email or User ID",
    recipientClientPlaceholder: "e.g. freelancer@domain.com or user ID",
    recipientFreelancerPlaceholder: "e.g. client@domain.com or user ID",
    subjectLabel: "Subject / Topic",
    subjectSupportPlaceholder:
      "e.g. Payment inquiry, verification help, or dispute",
    subjectClientPlaceholder: "e.g. Mobile App Frontend Milestones",
    subjectFreelancerPlaceholder: "e.g. Milestone proposal & deliverables",
    creatingBtn: "Creating...",
    startChatBtn: "Start Chat",
  },
  am: {
    failedLoadMessages: "መልዕክቶችን መጫን አልተቻለም",
    participantFallback: "ተሳታፊ",
    escrowContractFallback: "የኤስክሮ ውል",
    recommendedReplyLabel: "የሚመከር ምላሽ",
    alternativeReplyLabel: "አማራጭ",
    followUpReplyLabel: "ተከታታይ",
    failedSummarize: "ውይይቱን ማጠቃለል አልተቻለም",
    failedExtractDeal: "የስምምነት ቃሎችን ማውጣት አልተቻለም",
    circumventionNotice:
      "የኤስክሮ ደህንነት ማስታወቂያ፡ ቀጥታ የመገናኛ አድራሻዎች ወይም ከመድረክ ውጪ የክፍያ ቃሎች ተገኝተዋል። ከYekis ውጪ የሚደረግ ግብይት የኤስክሮ ዋስትናን እና የሕግ ጥበቃን ያሳጣል። ግንኙነትን እና ክፍያን በYekis ብቻ ያድርጉ።",
    attachmentFallback: "ተያያዥ ፋይል",
    failedSendMessage: "መልዕክት መላክ አልተቻለም",
    recipientRequiredError: "ለቀጥታ ውይይት የተቀባዩ መለያ ወይም ኢሜይል ያስፈልጋል",
    failedCreateConversation: "ውይይት መፍጠር አልተቻለም",
    messagesHeading: "መልዕክቶች",
    subtitleFreelancer: "የደንበኛ ውይይቶች እና ፕሮፖዛሎች",
    subtitleClient: "የፕሮጀክት ውይይቶችዎ",
    newChatBtnTitle: "አዲስ ውይይት ጀምር",
    newChatBtn: "አዲስ",
    searchPlaceholder: "ውይይቶችን ይፈልጉ...",
    filterAll: "ሁሉም",
    filterDirect: "ቀጥታ",
    filterSupport: "ድጋፍ",
    emptySupport: "ምንም የድጋፍ ጥያቄዎች አልተገኙም",
    emptyFreelancer: "ምንም የደንበኛ ውይይቶች አልተገኙም",
    emptyDefault: "ምንም ውይይቶች አልተገኙም",
    ctaSupport: "ድጋፍን ያግኙ",
    ctaClient: "ለባለሙያ መልዕክት ይላኩ",
    ctaDefault: "ውይይት ጀምር",
    yekisSupportName: "Yekis ድጋፍ",
    supportBadge: "ድጋፍ",
    roles: {
      CLIENT: "ደንበኛ",
      FREELANCER: "ባለሙያ",
      BOTH: "ሁለቱም",
      ADMIN: "አስተዳዳሪ",
    },
    backToConversationsTitle: "ወደ ውይይቶች ተመለስ",
    typingWord: "በመጻፍ ላይ",
    officialSupportSub: "ይፋዊ ድጋፍ",
    onlineSuffix: "መስመር ላይ",
    summarizeTitle: "Mini-Me፡ ውይይቱን አጠቃልል",
    threadSummaryBtn: "የውይይት ማጠቃለያ",
    extractDealClientTitle: "Mini-Me፡ የምዕራፍ ቃሎችን አውጣ እና ውል ፍጠር",
    extractDealDefaultTitle: "Mini-Me፡ የስምምነት ቃሎችን አውጣ",
    extractDealBtn: "ስምምነት አውጣ",
    supportDeskTitle: "የYekis ድጋፍ ማዕከል",
    directWorkspaceTitle: "ቀጥታ የሥራ ቦታ",
    supportDeskDesc:
      "ስለ ክፍያዎች፣ አለመግባባቶች ወይም የመለያ ማረጋገጫ ጥያቄዎች አሉዎት? የድጋፍ ቡድናችን ለመርዳት እዚህ አለ።",
    directWorkspaceClientDesc:
      "ከዚህ ባለሙያ ጋር ስለሚቀርቡ ውጤቶች ይደራደሩ፣ ምዕራፎችን ይወያዩ ወይም መስፈርቶችን ያብራሩ። ሥራውን እስኪገመግሙ ድረስ ክፍያው ይያዛል።",
    directWorkspaceFreelancerDesc:
      "የፕሮጀክት ዝርዝሮችን ይወያዩ፣ ምዕራፎችን ያቅርቡ እና ከደንበኛዎ ጋር ይስማሙ። ሥራው ሲጸድቅ ክፍያው ይለቀቃል።",
    youLabel: "እርስዎ",
    miniMeLabel: "Mini-Me",
    miniMeGroundedPrefix: (title) => `በ${title} ላይ የተመሠረተ`,
    miniMeDefaultNote: "Mini-Me አውድ-ተኮር የምላሽ ጥቆማዎች",
    draftingReplies: "ምላሾችን በማዘጋጀት ላይ...",
    sendImmediatelyTitle: "ወዲያውኑ ላክ",
    quickSendAria: (label) => `ፈጣን መላክ፡ ${label}`,
    hoverPreviewHint: "ለማስተካከል ጠቅ ያድርጉ · ለመላክ የመላኪያ አዶውን ይጫኑ",
    adjustToneTitle: "የምላሽ ቃና ያስተካክሉ ወይም ለMini-Me ብጁ መመሪያ ይስጡ",
    tuneCustom: "ብጁ",
    tuneDefault: "አስተካክል",
    tones: {
      PROFESSIONAL: "ሙያዊ",
      FRIENDLY: "ወዳጃዊ",
      NEGOTIATION: "ድርድር",
      CONCISE: "አጭር",
    },
    regenerateTitle: "የMini-Me ጥቆማዎችን እንደገና አመንጭ",
    miniMeMenuTitle: "የMini-Me ቃና እና መመሪያ",
    closeMiniMeAria: "የMini-Me ሜኑ ዝጋ",
    replyToneAria: "የምላሽ ቃና",
    refineDraftPlaceholder: "ረቂቁን ያሻሽሉ (ለምሳሌ 'የበለጠ ጠንካራ አድርገው')...",
    customPromptPlaceholder: "ብጁ መመሪያ (ለምሳሌ 'የCBE ደረሰኝ ጠይቅ')...",
    clearCustomTitle: "ብጁ መመሪያ አጽዳ",
    applyBtn: "ተግብር",
    safetyNoticeTitle: "የመድረክ ደህንነት ማስታወቂያ",
    composerSupportPlaceholder: "ጥያቄዎን ወይም ችግርዎን ይግለጹ... (ለመላክ Enter ይጫኑ)",
    composerDefaultPlaceholder:
      "መልዕክት ይጻፉ ወይም ከላይ ያለውን የMini-Me ጥቆማ ይምረጡ... (ለመላክ Enter)",
    attachTitle: "ሰነድ ወይም ምስል አያይዝ",
    sendMessageTitle: "መልዕክት ላክ",
    fileReadyFallback: "ፋይል ለመላክ ተያይዟል",
    removeAttachmentTitle: "ተያያዥ ፋይል አስወግድ",
    noActiveFreelancerTitle: "የባለሙያ መልዕክቶች ቦታ",
    noActiveClientTitle: "የደንበኛ መልዕክቶች ቦታ",
    noActiveFreelancerDesc:
      "ከደንበኞች ጋር ለመተባበር፣ ምዕራፎችን ለመደራደር ወይም ድጋፍን ለማግኘት ከግራ በኩል ውይይት ይምረጡ።",
    noActiveClientDesc:
      "ከባለሙያዎች ጋር የፕሮጀክት ውሎችን ለመወያየት ወይም የድጋፍ ጥያቄ ለመጀመር ከግራ በኩል ውይይት ይምረጡ።",
    startNewConvBtn: "አዲስ ውይይት ጀምር",
    summaryModalTitle: "የMini-Me ውይይት ማጠቃለያ",
    analyzingContext: "የውይይቱን አውድ በመተንተን እና ዋና ቃሎችን በማውጣት ላይ...",
    topicLabel: "ርዕስ",
    keyRequirementsLabel: "ዋና መስፈርቶች",
    agreedBudgetLabel: "የተስማማበት በጀት",
    pendingFinalQuote: "የመጨረሻ ዋጋ በመጠባበቅ ላይ",
    estimatedTimelineLabel: "የተገመተ የጊዜ ሰሌዳ",
    recommendedActionLabel: "የሚመከር ቀጣይ እርምጃ",
    noSummaryYet: "ገና ማጠቃለያ መፍጠር አልተቻለም።",
    closeBtn: "ዝጋ",
    dealModalTitle: "የMini-Me ስምምነት አውጪ",
    extractingDeal: "የውል ውጤቶችን እና ዋጋን በማውጣት ላይ...",
    confidenceLabel: (conf) => `እርግጠኝነት፡ ${conf}`,
    escrowReady: "ለኤስክሮ ዝግጁ",
    requiresAlignment: "ተጨማሪ ስምምነት ያስፈልጋል",
    suggestedTitleLabel: "የተጠቆመ የምዕራፍ ርዕስ",
    suggestedBudgetLabel: "የተጠቆመ በጀት",
    estimatedDurationLabel: "የተገመተ ቆይታ",
    daysSuffix: (days) => `${days} ቀናት`,
    dealDisclaimer:
      "የኤስክሮ ክፍያ ከመጀመርዎ በፊት ውሎችን ይገምግሙ። Yekis አቅርቦቱ እስኪጸድቅ ገንዘቡን በአደራ ይይዛል።",
    noDealExtracted: "ከዚህ ውይይት የስምምነት ቃሎችን ማውጣት አልተቻለም።",
    cancelBtn: "ሰርዝ",
    goToContractsBtn: "ወደ ውሎች እና ኤስክሮ ሂድ",
    newConvModalTitle: "አዲስ ውይይት ጀምር",
    directMessageTab: "ቀጥታ መልዕክት",
    supportTicketTab: "የድጋፍ ትኬት",
    recipientClientLabel: "የባለሙያ ኢሜይል ወይም መለያ",
    recipientFreelancerLabel: "የደንበኛ ኢሜይል ወይም መለያ",
    recipientClientPlaceholder: "ለምሳሌ freelancer@domain.com ወይም መለያ",
    recipientFreelancerPlaceholder: "ለምሳሌ client@domain.com ወይም መለያ",
    subjectLabel: "ርዕስ / ጉዳይ",
    subjectSupportPlaceholder: "ለምሳሌ የክፍያ ጥያቄ፣ የማረጋገጫ እርዳታ ወይም አለመግባባት",
    subjectClientPlaceholder: "ለምሳሌ የሞባይል መተግበሪያ ምዕራፎች",
    subjectFreelancerPlaceholder: "ለምሳሌ የምዕራፍ ፕሮፖዛል እና ውጤቶች",
    creatingBtn: "በመፍጠር ላይ...",
    startChatBtn: "ውይይት ጀምር",
  },
  om: {
    failedLoadMessages: "Ergaawwan fe'uun hin danda'amne",
    participantFallback: "Hirmaataa",
    escrowContractFallback: "Waliigaltee Escrow",
    recommendedReplyLabel: "Deebii Gorfame",
    alternativeReplyLabel: "Filannoo Biraa",
    followUpReplyLabel: "Hordoffii",
    failedSummarize: "Haasaa cuunfuun hin danda'amne",
    failedExtractDeal: "Haala waliigaltee baasuun hin danda'amne",
    circumventionNotice:
      "Hubachiisa Nageenya Escrow: Odeeffannoon qunnamtii kallattii ykn kaffaltiin waltajjiin alaa argameera. Daldalli alaa wabii escrow, furmaata falmiifi eegumsa seeraa ni haqa. Qunnamtiifi kaffaltii Yekis qofa irratti godhaa.",
    attachmentFallback: "Miiltoo",
    failedSendMessage: "Ergaa erguun hin danda'amne",
    recipientRequiredError:
      "Haasaa kallattiif ID fayyadamaa ykn imeeliin fudhattuu barbaachisa",
    failedCreateConversation: "Haasaa uumuun hin danda'amne",
    messagesHeading: "Ergaawwan",
    subtitleFreelancer: "Haasaa maamilaafi yaadota",
    subtitleClient: "Marii pirojektii keessan",
    newChatBtnTitle: "Haasaa haaraa jalqabi",
    newChatBtn: "Haaraa",
    searchPlaceholder: "Haasaa barbaadi...",
    filterAll: "Hunda",
    filterDirect: "Kallattii",
    filterSupport: "Deeggarsa",
    emptySupport: "Tikeetiin deeggarsaa hin argamne",
    emptyFreelancer: "Haasaan maamilaa hin argamne",
    emptyDefault: "Haasaan hin argamne",
    ctaSupport: "Deeggarsa Qunnami",
    ctaClient: "Ogeessatti Ergi",
    ctaDefault: "Haasaa Jalqabi",
    yekisSupportName: "Deeggarsa Yekis",
    supportBadge: "DEEGGARSA",
    roles: {
      CLIENT: "MAAMILA",
      FREELANCER: "OGEESSA",
      BOTH: "LACHUU",
      ADMIN: "BULCHAA",
    },
    backToConversationsTitle: "Gara haasaatti deebi'i",
    typingWord: "barreessaa jira",
    officialSupportSub: "Deeggarsa Idilee",
    onlineSuffix: "Toora irra",
    summarizeTitle: "Mini-Me: Haasaa Cuunfi",
    threadSummaryBtn: "Cuunfaa Haasaa",
    extractDealClientTitle: "Mini-Me: Haala boqonnaa baasiifi waliigaltee uumi",
    extractDealDefaultTitle: "Mini-Me: Haala Waliigaltee Baasi",
    extractDealBtn: "Waliigaltee Baasi",
    supportDeskTitle: "Giddugala Deeggarsa Yekis",
    directWorkspaceTitle: "Bakka Hojii Kallattii",
    supportDeskDesc:
      "Waa'ee kaffaltii, falmii ykn mirkaneessa herregaa gaaffii qabduu? Gareen deeggarsa keenyaa isin gargaaruuf as jira.",
    directWorkspaceClientDesc:
      "Ogeessa kana waliin bu'aa hojii irratti mari'adhaa, boqonnaalee hojii qopheessaa. Hanga hojii gamaaggamtanitti maallaqni ni qabama.",
    directWorkspaceFreelancerDesc:
      "Bal'ina pirojektii irratti mari'adhaa, boqonnaalee hojii dhiyeessaa. Hojichi yoo mirkaneeffame kaffaltiin ni gadhiifama.",
    youLabel: "Isin",
    miniMeLabel: "Mini-Me",
    miniMeGroundedPrefix: (title) => `${title} irratti hundaa'e`,
    miniMeDefaultNote: "Yaada deebii Mini-Me haala irratti hundaa'e",
    draftingReplies: "Deebii qopheessaa jira...",
    sendImmediatelyTitle: "Battalumatti ergi",
    quickSendAria: (label) => `Ariitiin ergi: ${label}`,
    hoverPreviewHint: "Gulaaluuf cuqaasi · Erguuf mallattoo ergii tuqi",
    adjustToneTitle: "Haala deebii sirreessi ykn qajeelfama dhuunfaa Mini-Me kenni",
    tuneCustom: "Dhuunfaa",
    tuneDefault: "Sirreessi",
    tones: {
      PROFESSIONAL: "Ogummaa",
      FRIENDLY: "Michummaa",
      NEGOTIATION: "Marii",
      CONCISE: "Gabaabaa",
    },
    regenerateTitle: "Yaadota Mini-Me irra deebi'ii uumi",
    miniMeMenuTitle: "Haalaafi Qajeelfama Mini-Me",
    closeMiniMeAria: "Menyuu Mini-Me cufi",
    replyToneAria: "Haala deebii",
    refineDraftPlaceholder: "Wixinee fooyyessi (fkn. 'Cimsi')...",
    customPromptPlaceholder: "Qajeelfama dhuunfaa (fkn. 'Nagahee CBE gaafadhu')...",
    clearCustomTitle: "Qajeelfama dhuunfaa haqi",
    applyBtn: "Hojiirra Oolchi",
    safetyNoticeTitle: "Hubachiisa Nageenya Waltajjii",
    composerSupportPlaceholder: "Gaaffii ykn rakkoo keessan ibsaa... (Erguuf Enter)",
    composerDefaultPlaceholder:
      "Ergaa barreessaa ykn yaada Mini-Me olii cuqaasaa... (Erguuf Enter)",
    attachTitle: "Sanada ykn suuraa qabsiisi",
    sendMessageTitle: "Ergaa ergi",
    fileReadyFallback: "Faayiliin ergamuuf qophaa'eera",
    removeAttachmentTitle: "Miiltoo haqi",
    noActiveFreelancerTitle: "Bakka Ergaawwan Ogeessaa",
    noActiveClientTitle: "Bakka Ergaawwan Maamilaa",
    noActiveFreelancerDesc:
      "Maamiltoota waliin hojjechuuf, boqonnaa hojii irratti mari'achuuf ykn deeggarsa argachuuf bitaa irraa haasaa filadhaa.",
    noActiveClientDesc:
      "Ogeeyyii waliin haala pirojektii mari'achuuf ykn gaaffii deeggarsaa jalqabuuf bitaa irraa haasaa filadhaa.",
    startNewConvBtn: "Haasaa Haaraa Jalqabi",
    summaryModalTitle: "Cuunfaa Haasaa Mini-Me",
    analyzingContext: "Haala haasaa xiinxalaafi jechoota ijoo baasaa jira...",
    topicLabel: "Mata duree",
    keyRequirementsLabel: "Ulaagaalee Ijoo",
    agreedBudgetLabel: "Baajata Irratti Waliigalame",
    pendingFinalQuote: "Gatii dhumaa eegaa jira",
    estimatedTimelineLabel: "Yeroo Tilmaamame",
    recommendedActionLabel: "Tarkaanfii Itti Aanu Gorfame",
    noSummaryYet: "Ammatti cuunfaan uumamuu hin dandeenye.",
    closeBtn: "Cufi",
    dealModalTitle: "Baastuu Haala Waliigaltee Mini-Me",
    extractingDeal: "Bu'aa hojiifi gatii waliigaltee baasaa jira...",
    confidenceLabel: (conf) => `Amantummaa: ${conf}`,
    escrowReady: "Escrowf Qophaa'aa",
    requiresAlignment: "Marii Dabalataa Barbaada",
    suggestedTitleLabel: "Mata Duree Boqonnaa Hojii Gorfame",
    suggestedBudgetLabel: "Baajata Gorfame",
    estimatedDurationLabel: "Turtii Tilmaamame",
    daysSuffix: (days) => `Guyyaa ${days}`,
    dealDisclaimer:
      "Kaffaltii escrow jalqabuun dura haala waliigaltee ilaalaa. Yekis hanga hojiin fudhatamutti maallaqa ni eega.",
    noDealExtracted: "Haasaa kana irraa haalli waliigaltee argamuu hin dandeenye.",
    cancelBtn: "Haqi",
    goToContractsBtn: "Gara Waliigaltee & Escrow Deemi",
    newConvModalTitle: "Haasaa Haaraa Jalqabi",
    directMessageTab: "Ergaa Kallattii",
    supportTicketTab: "Tikeetii Deeggarsaa",
    recipientClientLabel: "Imeelii ykn ID Ogeessaa",
    recipientFreelancerLabel: "Imeelii ykn ID Maamilaa",
    recipientClientPlaceholder: "fkn. ogeessa@domain.com ykn ID",
    recipientFreelancerPlaceholder: "fkn. maamila@domain.com ykn ID",
    subjectLabel: "Mata duree / Dhimma",
    subjectSupportPlaceholder: "fkn. Gaaffii kaffaltii, mirkaneessa ykn falmii",
    subjectClientPlaceholder: "fkn. Boqonnaa App Mobaayilaa",
    subjectFreelancerPlaceholder: "fkn. Yaada boqonnaa hojiifi bu'aawwan",
    creatingBtn: "Uumaa jira...",
    startChatBtn: "Haasaa Jalqabi",
  },
  ti: {
    failedLoadMessages: "መልእኽትታት ምጽዓን ኣይተኻእለን",
    participantFallback: "ተሳታፊ",
    escrowContractFallback: "ውዕል ኤስክሮ",
    recommendedReplyLabel: "ዝተመከረ መልሲ",
    alternativeReplyLabel: "ኣማራጺ",
    followUpReplyLabel: "ተኸታታሊ",
    failedSummarize: "ዕላል ምጽማቕ ኣይተኻእለን",
    failedExtractDeal: "ውዕላዊ ቃላት ምውጻእ ኣይተኻእለን",
    circumventionNotice:
      "መጠንቀቕታ ድሕነት ኤስክሮ፡ ቀጥታዊ ኣድራሻ ርክብ ወይ ካብ መድረኽ ወጻኢ ቃላት ክፍሊት ተረኺቦም። ካብ Yekis ወጻኢ ዝግበር ግብይት ውሕስነት ኤስክሮን ሕጋዊ ሓለዋን የጥፍእ። ርክብን ክፍሊትን ኣብ Yekis ጥራይ ግበሩ።",
    attachmentFallback: "ተተሓሒዙ ፋይል",
    failedSendMessage: "መልእኽቲ ምልኣኽ ኣይተኻእለን",
    recipientRequiredError: "ንቀጥታዊ ዕላል መለለዪ ወይ ኢመይል ተቀባሊ የድሊ",
    failedCreateConversation: "ዕላል ምፍጣር ኣይተኻእለን",
    messagesHeading: "መልእኽትታት",
    subtitleFreelancer: "ዕላላት ዓሚልን ፕሮፖዛላትን",
    subtitleClient: "ምይይጣት ፕሮጀክትኹም",
    newChatBtnTitle: "ሓድሽ ዕላል ጀምር",
    newChatBtn: "ሓድሽ",
    searchPlaceholder: "ዕላላት ድለ...",
    filterAll: "ኩሉ",
    filterDirect: "ቀጥታዊ",
    filterSupport: "ደገፍ",
    emptySupport: "ዝተረኽበ ትኬት ደገፍ የለን",
    emptyFreelancer: "ዝተረኽበ ዕላል ዓሚል የለን",
    emptyDefault: "ዝተረኽበ ዕላል የለን",
    ctaSupport: "ደገፍ ርኸብ",
    ctaClient: "ንክኢላ መልእኽቲ ልኣኽ",
    ctaDefault: "ዕላል ጀምር",
    yekisSupportName: "ደገፍ Yekis",
    supportBadge: "ደገፍ",
    roles: {
      CLIENT: "ዓሚል",
      FREELANCER: "ክኢላ",
      BOTH: "ክልቲኡ",
      ADMIN: "ኣመሓዳሪ",
    },
    backToConversationsTitle: "ናብ ዕላላት ተመለስ",
    typingWord: "ይጽሕፍ ኣሎ",
    officialSupportSub: "ወግዓዊ ደገፍ",
    onlineSuffix: "ኣብ መስመር",
    summarizeTitle: "Mini-Me፡ ዕላል ጽመቕ",
    threadSummaryBtn: "ጽሟቕ ዕላል",
    extractDealClientTitle: "Mini-Me፡ ቃላት ምዕራፍ ኣውጽእን ውዕል ፍጠርን",
    extractDealDefaultTitle: "Mini-Me፡ ቃላት ውዕል ኣውጽእ",
    extractDealBtn: "ውዕል ኣውጽእ",
    supportDeskTitle: "ማእከል ደገፍ Yekis",
    directWorkspaceTitle: "ቀጥታዊ ቦታ ስራሕ",
    supportDeskDesc:
      "ብዛዕባ ክፍሊታት፣ ክርክራት ወይ ምርግጋጽ ሕሳብ ሕቶታት ኣለዉኹም? ጉጅለ ደገፍና ንምሕጋዝ ኣብዚ ኣሎ።",
    directWorkspaceClientDesc:
      "ምስዚ ክኢላ ብዛዕባ ውጽኢት ተደራደሩ፣ ምዕራፋት ተመያየጡ ወይ መስፈርትታት ኣነጽሩ። ስራሕ ክሳብ ትግምግሙ ክፍሊት ይሕሎ።",
    directWorkspaceFreelancerDesc:
      "ዝርዝራት ፕሮጀክት ተመያየጡ፣ ምዕራፋት ኣቅርቡን ምስ ዓሚልኩም ተሰማምዑን። ስራሕ ምስ ጸደቐ ክፍሊት ይልቀቕ።",
    youLabel: "ንስኹም",
    miniMeLabel: "Mini-Me",
    miniMeGroundedPrefix: (title) => `ኣብ ${title} ዝተመስረተ`,
    miniMeDefaultNote: "Mini-Me ብዓውዲ ዝተደገፉ ሓሳባት መልሲ",
    draftingReplies: "መልስታት ይዳለዉ ኣለዉ...",
    sendImmediatelyTitle: "ብቅጽበት ልኣኽ",
    quickSendAria: (label) => `ቅልጡፍ ምልኣኽ፡ ${label}`,
    hoverPreviewHint: "ንምስትኽኻል ጠውቑ · ንምልኣኽ ምልክት ምልኣኽ ጸቅጡ",
    adjustToneTitle: "ቃና መልሲ ኣስተኻኽል ወይ ንMini-Me ብጁ መምርሒ ሃብ",
    tuneCustom: "ብጁ",
    tuneDefault: "ኣስተኻኽል",
    tones: {
      PROFESSIONAL: "ሞያዊ",
      FRIENDLY: "ምሕዝነታዊ",
      NEGOTIATION: "ድርድር",
      CONCISE: "ሓጺር",
    },
    regenerateTitle: "ሓሳባት Mini-Me እንደገና ፍጠር",
    miniMeMenuTitle: "ቃናን መምርሕን Mini-Me",
    closeMiniMeAria: "ሜኑ Mini-Me ዕጸው",
    replyToneAria: "ቃና መልሲ",
    refineDraftPlaceholder: "ረቂቕ ኣመሓይሽ (ንኣብነት 'ዝያዳ ጽኑዕ ግበሮ')...",
    customPromptPlaceholder: "ብጁ መምርሒ (ንኣብነት 'ቅብሊት CBE ሕተት')...",
    clearCustomTitle: "ብጁ መምርሒ ኣጽሪ",
    applyBtn: "ተግብር",
    safetyNoticeTitle: "መጠንቀቕታ ድሕነት መድረኽ",
    composerSupportPlaceholder: "ሕቶኹም ወይ ጸገምኩም ግለጹ... (ንምልኣኽ Enter)",
    composerDefaultPlaceholder:
      "መልእኽቲ ጽሓፉ ወይ ኣብ ላዕሊ ዘሎ ሓሳብ Mini-Me ምረጹ... (ንምልኣኽ Enter)",
    attachTitle: "ሰነድ ወይ ስእሊ ኣተሓሕዝ",
    sendMessageTitle: "መልእኽቲ ልኣኽ",
    fileReadyFallback: "ፋይል ንምልኣኽ ተዳልዩ",
    removeAttachmentTitle: "ተተሓሒዙ ፋይል ኣወግድ",
    noActiveFreelancerTitle: "ቦታ መልእኽትታት ክኢላ",
    noActiveClientTitle: "ቦታ መልእኽትታት ዓሚል",
    noActiveFreelancerDesc:
      "ምስ ዓማዊል ንምትሕብባር፣ ምዕራፋት ንምድርዳር ወይ ደገፍ ንምርካብ ካብ ጸጋም ዕላል ምረጹ።",
    noActiveClientDesc:
      "ምስ ክኢላታት ቃላት ፕሮጀክት ንምምይያጥ ወይ ሓድሽ ሕቶ ደገፍ ንምጅማር ካብ ጸጋም ዕላል ምረጹ።",
    startNewConvBtn: "ሓድሽ ዕላል ጀምር",
    summaryModalTitle: "ጽሟቕ ዕላል Mini-Me",
    analyzingContext: "ዓውዲ ዕላል ይትንትንን ቀንዲ ቃላት የውጽእን ኣሎ...",
    topicLabel: "ኣርእስቲ",
    keyRequirementsLabel: "ቀንዲ መስፈርትታት",
    agreedBudgetLabel: "ዝተሰማምዓሉ ባጀት",
    pendingFinalQuote: "ናይ መወዳእታ ዋጋ ይጽበ",
    estimatedTimelineLabel: "ዝተገመተ ግዜ",
    recommendedActionLabel: "ዝምከር ቀጻሊ ስጉምቲ",
    noSummaryYet: "ገና ጽሟቕ ክፍጠር ኣይከኣለን።",
    closeBtn: "ዕጸው",
    dealModalTitle: "መውጽኢ ቃላት ውዕል Mini-Me",
    extractingDeal: "ውጽኢታት ውዕልን ዋጋን የውጽእ ኣሎ...",
    confidenceLabel: (conf) => `እምነት፡ ${conf}`,
    escrowReady: "ንኤስክሮ ድሉው",
    requiresAlignment: "ተወሳኺ ምርድዳእ የድሊ",
    suggestedTitleLabel: "ዝተመከረ ኣርእስቲ ምዕራፍ",
    suggestedBudgetLabel: "ዝተመከረ ባጀት",
    estimatedDurationLabel: "ዝተገመተ ጻንሒት",
    daysSuffix: (days) => `${days} መዓልታት`,
    dealDisclaimer:
      "ክፍሊት ኤስክሮ ቅድሚ ምጅማርኩም ቃላት ገምግሙ። Yekis ክሳብ ርኽክብ ዝጸድቕ ገንዘብ ብሓላፍነት ይሕዝ።",
    noDealExtracted: "ካብዚ ዕላል ቃላት ውዕል ክውጻእ ኣይተኻእለን።",
    cancelBtn: "ስርዝ",
    goToContractsBtn: "ናብ ውዕላትን ኤስክሮን ኪድ",
    newConvModalTitle: "ሓድሽ ዕላል ጀምር",
    directMessageTab: "ቀጥታዊ መልእኽቲ",
    supportTicketTab: "ትኬት ደገፍ",
    recipientClientLabel: "ኢመይል ወይ መለለዪ ክኢላ",
    recipientFreelancerLabel: "ኢመይል ወይ መለለዪ ዓሚል",
    recipientClientPlaceholder: "ንኣብነት freelancer@domain.com ወይ መለለዪ",
    recipientFreelancerPlaceholder: "ንኣብነት client@domain.com ወይ መለለዪ",
    subjectLabel: "ኣርእስቲ / ጉዳይ",
    subjectSupportPlaceholder: "ንኣብነት ሕቶ ክፍሊት፣ ሓገዝ መረጋገጺ ወይ ክርክር",
    subjectClientPlaceholder: "ንኣብነት ምዕራፋት ሞባይል ኣፕ",
    subjectFreelancerPlaceholder: "ንኣብነት ፕሮፖዛል ምዕራፍን ውጽኢታትን",
    creatingBtn: "ይፍጠር ኣሎ...",
    startChatBtn: "ዕላል ጀምር",
  },
};
