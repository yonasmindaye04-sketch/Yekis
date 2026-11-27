import { type Language } from "./i18n";

export type SettingsTabId =
  | "security"
  | "general"
  | "notifications"
  | "privacy"
  | "data";

export type SettingsWorkspaceCopy = {
  breadcrumbRoot: string;
  breadcrumbCurrent: string;
  tablistAria: string;
  tabs: Record<SettingsTabId, string>;
  common: {
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    close: string;
    loading: string;
    enabled: string;
    disabled: string;
    verified: string;
    notLinked: string;
    configured: string;
    notSet: string;
    somethingWentWrong: string;
  };
  credentialErrors: {
    reauthRequired: string;
    stepUpRequired: string;
    googlePopupBlocked: string;
    googleVerifyFailed: string;
    googleLinkFailed: string;
    googleUnlinkFailed: string;
    loadIdentitiesFailed: string;
  };
  security: {
    eyebrow: string;
    heading: string;
    lead: string;
    passwordSectionTitle: string;
    passwordSectionDesc: string;
    currentPasswordLabel: string;
    currentPasswordPlaceholder: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    passwordMismatchError: string;
    passwordLengthError: string;
    passwordCurrentRequiredError: string;
    passwordUpdatedSuccess: string;
    passwordUpdateError: string;
    updatePasswordBtn: string;
    updatingPasswordBtn: string;
    linkedAccountsTitle: string;
    linkedAccountsDesc: string;
    passwordMethodLabel: string;
    passwordMethodActiveDesc: string;
    passwordMethodMissingDesc: string;
    emailMethodLabel: string;
    emailNotSet: string;
    googleMethodLabel: string;
    googleNotConfigured: string;
    googleNotConnectedDesc: string;
    googleConnectedDesc: string;
    telegramConnectedDesc: string;
    linkGoogleBtn: string;
    linkingGoogleBtn: string;
    unlinkGoogleBtn: string;
    unlinkingGoogleBtn: string;
    googleUnlinkedSuccess: string;
    googleLinkedSuccess: string;
    telegramMethodLabel: string;
    telegramLinkedDesc: (usernameOrId: string) => string;
    telegramNotLinkedDesc: string;
    emailVerifiedDesc: string;
    emailUnverifiedDesc: string;
    verifyEmailBtn: string;
    emailCodeTitle: string;
    emailCodeSentDesc: (email: string) => string;
    emailCodeLabel: string;
    emailCodeHint: string;
    emailCodeSubmitBtn: string;
    emailCodeSubmittingBtn: string;
    resendCodeBtn: string;
    emailVerifySuccess: string;
    emailVerifyFailed: string;
    connectTelegramBtn: string;
    connectingTelegramBtn: string;
    disconnectTelegramBtn: string;
    telegramWaitingDesc: string;
    telegramConnectedSuccess: string;
    telegramDisconnectedSuccess: string;
    telegramNotConfigured: string;
    sessionsTitle: string;
    sessionsDesc: string;
    revokeSessionsBtn: string;
    revokingSessionsBtn: string;
    sessionsRevokedSuccess: string;
    sessionsRevokeError: string;
    identityTitle: string;
    identityDesc: string;
    kycTierLabel: string;
    kycStatusLabel: string;
    mfaNote: string;
  };
  /**
   * The account-type switch (client / freelancer / both).
   *
   * The role NAMES come from `fullPlatformCopy.ts`, which already carries them
   * in all four languages — a member sees "ባለሙያ" in the sidebar and
   * "ባለሙያ" here, never two words for the same thing.
   */
  accountType: {
    title: string;
    desc: string;
    clientDesc: string;
    freelancerDesc: string;
    bothDesc: string;
    currentLabel: string;
    saveBtn: string;
    savingBtn: string;
    success: (role: string) => string;
    error: string;
    historyNote: string;
  };
  general: {
    eyebrow: string;
    heading: string;
    lead: string;
    languageTitle: string;
    languageDesc: string;
    languageSaved: string;
    languageSaveError: string;
    timezoneTitle: string;
    timezoneDesc: string;
    timezoneLabel: string;
    timezoneSaved: string;
    timezoneSaveError: string;
    appearanceTitle: string;
    appearanceDesc: string;
    lightThemeLabel: string;
    lightThemeDesc: string;
    darkThemeLabel: string;
    darkThemeDesc: string;
    activeBadge: string;
  };
  notifications: {
    eyebrow: string;
    heading: string;
    lead: string;
    platformNotificationsLabel: string;
    platformNotificationsDesc: string;
    marketingCommunicationsLabel: string;
    marketingCommunicationsDesc: string;
    emailDigestNote: string;
    telegramAlertsNote: string;
    savePrefsBtn: string;
    savingPrefsBtn: string;
    prefsSaved: string;
    prefsSaveError: string;
  };
  privacy: {
    eyebrow: string;
    heading: string;
    lead: string;
    publicProfileLabel: string;
    publicProfileDesc: string;
    analyticsConsentLabel: string;
    analyticsConsentDesc: string;
    kycConsentTitle: string;
    kycConsentDesc: string;
    financialConsentTitle: string;
    financialConsentDesc: string;
    savePrivacyBtn: string;
    savingPrivacyBtn: string;
    privacySaved: string;
    privacySaveError: string;
  };
  data: {
    eyebrow: string;
    heading: string;
    lead: string;
    exportTitle: string;
    exportDesc: string;
    exportBtn: string;
    exportingBtn: string;
    exportSuccess: string;
    exportError: string;
    deactivateTitle: string;
    deactivateDesc: string;
    retentionNotice: string;
    openDeactivateBtn: string;
  };
  deactivateDialog: {
    title: string;
    closeAria: string;
    checkingBlockers: string;
    blockersHeading: string;
    blockersIntro: string;
    erasureDoneHeading: string;
    erasureDoneDesc: string;
    retentionSummaryLabel: string;
    warningBanner: string;
    confirmPhraseLabel: string;
    confirmPhrasePlaceholder: string;
    confirmPhraseError: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submitBtn: string;
    submittingBtn: string;
    blockerCheckError: string;
    deactivateError: string;
  };
  kycTiers: Record<string, string>;
  kycStatuses: Record<string, string>;
};

export const SETTINGS_WORKSPACE_COPY: Record<Language, SettingsWorkspaceCopy> = {
  en: {
    breadcrumbRoot: "Workspace",
    breadcrumbCurrent: "Account Settings",
    tablistAria: "Settings sections",
    tabs: {
      security: "Security & Password",
      general: "Preferences & Localization",
      notifications: "Notifications",
      privacy: "Privacy & Visibility",
      data: "Data & Account",
    },
    common: {
      save: "Save changes",
      saving: "Saving...",
      saved: "Saved",
      cancel: "Cancel",
      close: "Close",
      loading: "Loading...",
      enabled: "Enabled",
      disabled: "Disabled",
      verified: "Verified",
      notLinked: "Not linked",
      configured: "Configured",
      notSet: "Not set",
      somethingWentWrong: "Something went wrong.",
    },
    credentialErrors: {
      reauthRequired:
        "Your sign-in is too old to change how you sign in. Sign in again with your password, then try this.",
      stepUpRequired: "Sign in with your password first, then link Google.",
      googlePopupBlocked:
        "Google sign-in popup could not open. Allow popups or try again.",
      googleVerifyFailed: "Could not verify your Google account.",
      googleLinkFailed: "Failed to link Google account.",
      googleUnlinkFailed: "Failed to unlink Google account.",
      loadIdentitiesFailed: "Could not load linked sign-in methods.",
    },
    security: {
      eyebrow: "Access & credentials",
      heading: "Security & Password",
      lead: "Manage your sign-in credentials, linked accounts, and active sessions across devices.",
      passwordSectionTitle: "Change Password",
      passwordSectionDesc:
        "Use a strong password of at least 10 characters that you do not reuse elsewhere.",
      currentPasswordLabel: "Current password",
      currentPasswordPlaceholder: "Enter current password",
      newPasswordLabel: "New password",
      newPasswordPlaceholder: "At least 10 characters",
      confirmPasswordLabel: "Confirm new password",
      confirmPasswordPlaceholder: "Repeat new password",
      passwordMismatchError: "New password and confirmation do not match.",
      passwordLengthError: "New password must be at least 10 characters.",
      passwordCurrentRequiredError: "Enter your current password.",
      passwordUpdatedSuccess: "Password updated successfully.",
      passwordUpdateError: "Failed to update password.",
      updatePasswordBtn: "Update password",
      updatingPasswordBtn: "Updating...",
      linkedAccountsTitle: "Linked Sign-In Methods",
      linkedAccountsDesc:
        "Keep at least one verified sign-in method active so you never lose access to your escrow account.",
      passwordMethodLabel: "Password login",
      passwordMethodActiveDesc: "Password authentication is active on this account.",
      passwordMethodMissingDesc:
        "No password set yet. Add a password above before removing federated providers.",
      emailMethodLabel: "Primary email",
      emailNotSet: "No verified email on file",
      googleMethodLabel: "Google",
      googleNotConfigured: "Google sign-in is not configured in this environment.",
      googleNotConnectedDesc:
        "Not connected — sign in with your password first, then connect Google.",
      googleConnectedDesc:
        "Connected — the Google button signs you in.",
      telegramConnectedDesc:
        "Connected — your linked chat receives your codes.",
      linkGoogleBtn: "Link Google account",
      linkingGoogleBtn: "Linking Google...",
      unlinkGoogleBtn: "Unlink Google",
      unlinkingGoogleBtn: "Unlinking...",
      googleUnlinkedSuccess: "Google account unlinked.",
      googleLinkedSuccess: "Google account linked successfully.",
      telegramMethodLabel: "Telegram",
      telegramLinkedDesc: (id) => `Connected via Telegram (${id}).`,
      telegramNotLinkedDesc:
        "Not connected — connect your Telegram chat here and the bot confirms it for you.",
      emailVerifiedDesc:
        "Verified — this address receives your receipts and security notices.",
      emailUnverifiedDesc:
        "Not verified — verify it so password recovery and payouts reach you.",
      verifyEmailBtn: "Verify email",
      emailCodeTitle: "Verify this email address",
      emailCodeSentDesc: (email) =>
        `We sent a 6-digit code to ${email}. Enter it below.`,
      emailCodeLabel: "6-digit code",
      emailCodeHint:
        "The code expires in 10 minutes. Check your inbox and the spam folder.",
      emailCodeSubmitBtn: "Confirm code",
      emailCodeSubmittingBtn: "Confirming...",
      resendCodeBtn: "Send a new code",
      emailVerifySuccess: "Email address verified.",
      emailVerifyFailed:
        "That code is not valid. Request a new one and try again.",
      connectTelegramBtn: "Connect Telegram",
      connectingTelegramBtn: "Waiting for Telegram...",
      disconnectTelegramBtn: "Disconnect",
      telegramWaitingDesc:
        "Press Start in the bot chat that just opened — this page updates by itself.",
      telegramConnectedSuccess: "Telegram is now connected to your account.",
      telegramDisconnectedSuccess:
        "Telegram is disconnected. Your password still signs you in.",
      telegramNotConfigured:
        "Telegram sign-in is not configured on this deployment.",
      sessionsTitle: "Active Sessions & Devices",
      sessionsDesc:
        "Sign out all other browser and Mini App sessions if you suspect unauthorized access.",
      revokeSessionsBtn: "Revoke all other sessions",
      revokingSessionsBtn: "Revoking sessions...",
      sessionsRevokedSuccess:
        "All other sessions have been signed out. Only this session remains active.",
      sessionsRevokeError: "Failed to revoke sessions.",
      identityTitle: "Identity & Multi-Factor Status",
      identityDesc:
        "Ethiopian telecom OTP verification and National ID (Fayda) checks protect withdrawals and disputes.",
      kycTierLabel: "Verification tier",
      kycStatusLabel: "KYC status",
      mfaNote:
        "Withdrawals above standard thresholds require fresh SMS or Telegram OTP confirmation.",
    },
    accountType: {
      title: "Account Type",
      desc: "How you work on Yekis. You can change this whenever your intention changes — your contracts, proposals and wallet stay exactly where they are.",
      clientDesc:
        "Hire talent: post jobs, review proposals, fund escrow and approve deliveries.",
      freelancerDesc:
        "Take work: browse jobs, submit proposals, deliver milestones and get paid.",
      bothDesc: "Hire talent and take work on the same account.",
      currentLabel: "Current",
      saveBtn: "Change account type",
      savingBtn: "Saving...",
      success: (role) => `Your account type is now ${role}.`,
      error: "Could not change your account type.",
      historyNote:
        "Contracts and jobs keep the account type you held when they were created.",
    },
    general: {
      eyebrow: "Regional preferences",
      heading: "Preferences & Localization",
      lead: "Choose your interface language, timezone for deadlines, and visual theme.",
      languageTitle: "Interface Language",
      languageDesc:
        "Changes all platform menus, notifications, and workspace forms immediately.",
      languageSaved: "Language preference saved.",
      languageSaveError: "Failed to save language preference.",
      timezoneTitle: "Timezone",
      timezoneDesc:
        "Used for milestone deadlines, escrow schedules, and ledger timestamps.",
      timezoneLabel: "Display timezone",
      timezoneSaved: "Timezone preference saved.",
      timezoneSaveError: "Failed to save timezone.",
      appearanceTitle: "Display Appearance",
      appearanceDesc:
        "Switch between Daybreak Ivory and Obsidian Dark across all workspace screens.",
      lightThemeLabel: "Light Mode",
      lightThemeDesc: "High-contrast warm ivory workspace",
      darkThemeLabel: "Dark Mode",
      darkThemeDesc: "Low-glare slate surface for night work",
      activeBadge: "Active",
    },
    notifications: {
      eyebrow: "Alerts & digests",
      heading: "Notifications",
      lead: "Control how Yekis updates you about proposals, escrow funding, and messages.",
      platformNotificationsLabel: "Platform & Escrow Notifications",
      platformNotificationsDesc:
        "Essential alerts for milestone deliveries, escrow funding, disputes, and security checks.",
      marketingCommunicationsLabel: "Product Updates & Marketplace Tips",
      marketingCommunicationsDesc:
        "Occasional announcements about new skills categories, fee updates, and guides.",
      emailDigestNote:
        "Transactional receipts and statutory dispute notices continue to be delivered regardless of marketing settings.",
      telegramAlertsNote:
        "Linked Telegram accounts receive real-time alerts for funded milestones and chat messages.",
      savePrefsBtn: "Save notification preferences",
      savingPrefsBtn: "Saving...",
      prefsSaved: "Notification preferences updated.",
      prefsSaveError: "Failed to update notification preferences.",
    },
    privacy: {
      eyebrow: "Visibility & consents",
      heading: "Privacy & Visibility",
      lead: "Review statutory data processing consents and control marketplace profile visibility.",
      publicProfileLabel: "Public Marketplace Directory",
      publicProfileDesc:
        "Allow verified clients and talent directory searches to discover your public profile.",
      analyticsConsentLabel: "Product Analytics & Telemetry",
      analyticsConsentDesc:
        "Help improve Yekis matching and load speed through anonymized usage telemetry.",
      kycConsentTitle: "Identity & AML/KYC Verification Processing",
      kycConsentDesc:
        "Required for verified freelancer payouts and high-value client contracts under Ethiopian financial regulations.",
      financialConsentTitle: "Escrow Ledger & Tax Record Processing",
      financialConsentDesc:
        "Required for Telebirr, CBE Birr, M-Pesa settlements and statutory withholding receipts.",
      savePrivacyBtn: "Save privacy preferences",
      savingPrivacyBtn: "Saving...",
      privacySaved: "Privacy preferences saved.",
      privacySaveError: "Failed to save privacy preferences.",
    },
    data: {
      eyebrow: "PDPP & data rights",
      heading: "Data & Account",
      lead: "Export a portable copy of your platform records or permanently deactivate your account.",
      exportTitle: "Export Personal Data Archive",
      exportDesc:
        "Download a machine-readable JSON archive containing your profile, contracts, proposals, wallet entries, and consent logs.",
      exportBtn: "Download JSON Archive",
      exportingBtn: "Preparing export...",
      exportSuccess: "Data archive downloaded.",
      exportError: "Could not generate data export.",
      deactivateTitle: "Deactivate & Erase Account",
      deactivateDesc:
        "Close your marketplace account once all active contracts, disputes, and wallet balances are cleared.",
      retentionNotice:
        "Ethiopian commercial & tax law requires immutable escrow ledger and fiscal receipt records to be retained for 10 years, while personal profile fields are erased or anonymized.",
      openDeactivateBtn: "Review account deactivation",
    },
    deactivateDialog: {
      title: "Deactivate Yekis Account",
      closeAria: "Close deactivation dialog",
      checkingBlockers: "Checking active contracts, disputes, and wallet balances...",
      blockersHeading: "Action required before deactivation",
      blockersIntro:
        "Resolve the following open items before this account can be closed:",
      erasureDoneHeading: "Account deactivated",
      erasureDoneDesc:
        "Your personal profile has been anonymized and active sessions have been signed out.",
      retentionSummaryLabel: "Statutory financial retention",
      warningBanner:
        "This action permanently closes your Yekis account. Type DEACTIVATE below to confirm.",
      confirmPhraseLabel: "Type DEACTIVATE to confirm",
      confirmPhrasePlaceholder: "DEACTIVATE",
      confirmPhraseError: "Please type DEACTIVATE in uppercase to confirm.",
      reasonLabel: "Reason for leaving (optional)",
      reasonPlaceholder: "Tell us what could have worked better...",
      passwordLabel: "Confirm with your password (if set)",
      passwordPlaceholder: "Current account password",
      submitBtn: "Permanently deactivate account",
      submittingBtn: "Deactivating account...",
      blockerCheckError: "Could not check account deactivation eligibility.",
      deactivateError: "Account deactivation failed.",
    },
    kycTiers: {
      UNVERIFIED: "Unverified",
      BASIC: "Basic",
      FAYDA_VERIFIED: "Fayda Verified",
      BUSINESS_VERIFIED: "Business Verified",
    },
    kycStatuses: {
      NOT_SUBMITTED: "Not submitted",
      PENDING: "Under review",
      APPROVED: "Approved",
      REJECTED: "Action needed",
    },
  },
  am: {
    breadcrumbRoot: "የሥራ ቦታ",
    breadcrumbCurrent: "የመለያ ቅንብሮች",
    tablistAria: "የቅንብሮች ክፍሎች",
    tabs: {
      security: "ደህንነት እና የይለፍ ቃል",
      general: "ምርጫዎች እና ቋንቋ",
      notifications: "ማሳወቂያዎች",
      privacy: "ግላዊነት እና ታይነት",
      data: "ውሂብ እና መለያ",
    },
    common: {
      save: "ለውጦችን አስቀምጥ",
      saving: "በማስቀመጥ ላይ...",
      saved: "ተቀምጧል",
      cancel: "ሰርዝ",
      close: "ዝጋ",
      loading: "በመጫን ላይ...",
      enabled: "ነቅቷል",
      disabled: "ተሰናክሏል",
      verified: "የተረጋገጠ",
      notLinked: "አልተገናኘም",
      configured: "ተዋቅሯል",
      notSet: "አልተዘጋጀም",
      somethingWentWrong: "ችግር ተከስቷል።",
    },
    credentialErrors: {
      reauthRequired:
        "የመግቢያ ክፍለ ጊዜዎ የመግቢያ ዘዴን ለመቀየር ቆይቷል። በይለፍ ቃልዎ እንደገና ይግቡና ይሞክሩ።",
      stepUpRequired: "መጀመሪያ በይለፍ ቃልዎ ይግቡና ከዚያ Googleን ያገናኙ።",
      googlePopupBlocked:
        "የGoogle መግቢያ መስኮት ሊከፈት አልቻለም። ብቅ-ባዮችን ይፍቀዱ ወይም እንደገና ይሞክሩ።",
      googleVerifyFailed: "የGoogle መለያዎን ማረጋገጥ አልተቻለም።",
      googleLinkFailed: "የGoogle መለያን ማገናኘት አልተቻለም።",
      googleUnlinkFailed: "የGoogle መለያን ማላቀቅ አልተቻለም።",
      loadIdentitiesFailed: "የተገናኙ የመግቢያ ዘዴዎችን መጫን አልተቻለም።",
    },
    security: {
      eyebrow: "መዳረሻ እና ማረጋገጫዎች",
      heading: "ደህንነት እና የይለፍ ቃል",
      lead: "የመግቢያ ማረጋገጫዎችዎን፣ የተገናኙ መለያዎችዎን እና ንቁ ክፍለ ጊዜዎችዎን ያስተዳድሩ።",
      passwordSectionTitle: "የይለፍ ቃል ቀይር",
      passwordSectionDesc:
        "ሌላ ቦታ ያልተጠቀሙበትን ቢያንስ 10 ቁምፊዎች ያሉት ጠንካራ የይለፍ ቃል ይጠቀሙ።",
      currentPasswordLabel: "የአሁኑ የይለፍ ቃል",
      currentPasswordPlaceholder: "የአሁኑን የይለፍ ቃል ያስገቡ",
      newPasswordLabel: "አዲስ የይለፍ ቃል",
      newPasswordPlaceholder: "ቢያንስ 10 ቁምፊዎች",
      confirmPasswordLabel: "አዲሱን የይለፍ ቃል ያረጋግጡ",
      confirmPasswordPlaceholder: "አዲሱን የይለፍ ቃል ይድገሙ",
      passwordMismatchError: "አዲሱ የይለፍ ቃል እና ማረጋገጫው አይዛመዱም።",
      passwordLengthError: "አዲሱ የይለፍ ቃል ቢያንስ 10 ቁምፊዎች መሆን አለበት።",
      passwordCurrentRequiredError: "የአሁኑን የይለፍ ቃልዎን ያስገቡ።",
      passwordUpdatedSuccess: "የይለፍ ቃል በተሳካ ሁኔታ ተዘምኗል።",
      passwordUpdateError: "የይለፍ ቃልን ማዘመን አልተቻለም።",
      updatePasswordBtn: "የይለፍ ቃል አዘምን",
      updatingPasswordBtn: "በማዘመን ላይ...",
      linkedAccountsTitle: "የተገናኙ የመግቢያ ዘዴዎች",
      linkedAccountsDesc:
        "የኤስክሮ መለያዎን መዳረሻ እንዳያጡ ቢያንስ አንድ የተረጋገጠ የመግቢያ ዘዴ ንቁ ያድርጉ።",
      passwordMethodLabel: "በይለፍ ቃል መግባት",
      passwordMethodActiveDesc: "በዚህ መለያ ላይ የይለፍ ቃል ማረጋገጫ ንቁ ነው።",
      passwordMethodMissingDesc:
        "ገና የይለፍ ቃል አልተዘጋጀም። ውጫዊ መለያዎችን ከማላቀቅዎ በፊት ከላይ የይለፍ ቃል ያዘጋጁ።",
      emailMethodLabel: "ዋና ኢሜይል",
      emailNotSet: "የተረጋገጠ ኢሜይል የለም",
      googleMethodLabel: "Google",
      googleNotConfigured: "በዚህ አካባቢ የGoogle መግቢያ አልተዋቀረም።",
      googleNotConnectedDesc:
        "አልተገናኝም — በይለፍ ቃልዎ ይግቡና ከዚያ Googleን ያገናኙ።",
      googleConnectedDesc:
        "ተገናኝቷል — የGoogle አዝላክ እርስዎን ይግባል።",
      telegramConnectedDesc:
        "ተገናኝቷል — የተገናኘው የትዕግር አስገዳይ ኮዶችዎን ይቀበላል።",
      linkGoogleBtn: "የGoogle መለያ አገናኝ",
      linkingGoogleBtn: "Googleን በማገናኘት ላይ...",
      unlinkGoogleBtn: "Googleን አላቅቅ",
      unlinkingGoogleBtn: "በማላቀቅ ላይ...",
      googleUnlinkedSuccess: "የGoogle መለያ ተላቅቋል።",
      googleLinkedSuccess: "የGoogle መለያ በተሳካ ሁኔታ ተገናኝቷል።",
      telegramMethodLabel: "Telegram",
      telegramLinkedDesc: (id) => `በTelegram ተገናኝቷል (${id})።`,
      telegramNotLinkedDesc:
        "አልተገናኝም — የTelegram ውይይትዎን እዚህ ያገናኙ፤ በቦት ውስጥ ለእርስዎ ያረጋግጦታል።",
      emailVerifiedDesc:
        "ተረጋገጧል — ይህ አድራሻ የክፍያ ደብዳቤና የደህንነት ማስጠንቀቂያ ይቀበላል።",
      emailUnverifiedDesc:
        "አልተረጋገጧም — ልስጋና መልስ እንዲደርስዎና ክፍያ እንዲደርስዎ ያረጋግጡ።",
      verifyEmailBtn: "ኢሜይልን አረጋግጥ",
      emailCodeTitle: "ይህን ኢሜይል አድራሻ አረጋግጥ",
      emailCodeSentDesc: (email) =>
        `ወደ ${email} 6 አሃዝ ኮድ አላንድ። ከታች ያስገቡ።`,
      emailCodeLabel: "6 አሃዝ ኮድ",
      emailCodeHint:
        "ኮዱ በ10 ደቂቃ ያበቃል። የኢሜይል ያሳውቀያዎንና የስፓም አድራሻ ይመልከቱ።",
      emailCodeSubmitBtn: "ኮዱን አረጋግጥ",
      emailCodeSubmittingBtn: "በማረጋገጥ ላይ...",
      resendCodeBtn: "አዲስ ኮድ ላክ",
      emailVerifySuccess: "የኢሜይል አድራሻ ተረጋገጧል።",
      emailVerifyFailed: "ኮዱ ትክክል አይደለም። አዲስ ኮድ ይጠይቁ እና እንደገና ይሞክሩ።",
      connectTelegramBtn: "Telegram አገናኝ",
      connectingTelegramBtn: "Telegram በመጠበቅ ላይ...",
      disconnectTelegramBtn: "አላቅቅ",
      telegramWaitingDesc:
        "በተከፈተው የቦት ውይይት ውስጥ Start ይጫኑ — ይህ ገጹ በራሱ ይዘምናል።",
      telegramConnectedSuccess: "Telegram ከአሁን ወደ መለያዎ ተገናኝቷል።",
      telegramDisconnectedSuccess:
        "Telegram ተቋርጧል። የይለፍ ቃልዎ አሁገው ይግባል።",
      telegramNotConfigured:
        "በዚህ አገልግሎት ላይ የTelegram መግቢያ አልተዋቀረም።",
      sessionsTitle: "ንቁ ክፍለ ጊዜዎች እና መሣሪያዎች",
      sessionsDesc:
        "ያልተፈቀደ መዳረሻ ከጠረጠሩ ሁሉንም ሌሎች የአሳሽ እና የMini App ክፍለ ጊዜዎች ያስወጡ።",
      revokeSessionsBtn: "ሁሉንም ሌሎች ክፍለ ጊዜዎች ሰርዝ",
      revokingSessionsBtn: "ክፍለ ጊዜዎችን በመሰረዝ ላይ...",
      sessionsRevokedSuccess:
        "ሁሉም ሌሎች ክፍለ ጊዜዎች ወጥተዋል። ይህ ክፍለ ጊዜ ብቻ ንቁ ሆኖ ይቀጥላል።",
      sessionsRevokeError: "ክፍለ ጊዜዎችን መሰረዝ አልተቻለም።",
      identityTitle: "ማንነት እና ባለብዙ-ደረጃ ማረጋገጫ",
      identityDesc:
        "የኢትዮጵያ ቴሌኮም OTP ማረጋገጫ እና የፋይዳ ብሔራዊ መታወቂያ ገንዘብ ማውጣትን እና አለመግባባቶችን ይጠብቃሉ።",
      kycTierLabel: "የማረጋገጫ ደረጃ",
      kycStatusLabel: "የKYC ሁኔታ",
      mfaNote:
        "ከመደበኛ ገደብ በላይ ገንዘብ ማውጣት አዲስ የSMS ወይም የTelegram OTP ማረጋገጫ ይጠይቃል።",
    },
    accountType: {
      title: "የመለያ አይነት",
      desc: "በYekis የሚጠቀሙት መንገድ። ይህ አመለስዎ ሲቀየር በማንኛውንም ጊዜ መቀየርዎ ይችላሉ — ግንባቶችዎ፣ ጥቆማዎችዎና ቦርሳዎ በቦት አይንረሱም።",
      clientDesc:
        "ባለሙያ መለማመል፦ ስራ ማውባት፣ ጥቆማ ማገምገም፣ escrow ማስደርስና ማጽደቅ ያረጋግጡ።",
      freelancerDesc:
        "ስራ መውራል፦ ስራዎች ማየት፣ ጥቆማ ማስገባት፣ ደረጃ ማስተላለፍና ክፍያ መቀበል።",
      bothDesc: "በአንድ መለያ ባለሙያ መለማመልና ስራ መውራል።",
      currentLabel: "አሁን",
      saveBtn: "የመለያ አይነትን ቀይር",
      savingBtn: "በመቀመር ላይ...",
      success: (role) => `የመለያዎ አይነት አሁን ${role} ነው።`,
      error: "የመለያ አይነቱን መቀየር አልተቻለም።",
      historyNote:
        "ግንባቶችና ስራዎች በተፈጠሩበት ጊዜ ያንተነውን የመለያ አይነት ይዘጋጣሉ።",
    },
    general: {
      eyebrow: "የአካባቢ ምርጫዎች",
      heading: "ምርጫዎች እና ቋንቋ",
      lead: "የበይነገጽ ቋንቋዎን፣ የቀነ-ገደቦችን የሰዓት ሰቅ እና የገጽታ መልክ ይምረጡ።",
      languageTitle: "የበይነገጽ ቋንቋ",
      languageDesc:
        "ሁሉንም የመድረክ ሜኑዎች፣ ማሳወቂያዎች እና የሥራ ቅጾች ወዲያውኑ ይለውጣል።",
      languageSaved: "የቋንቋ ምርጫ ተቀምጧል።",
      languageSaveError: "የቋንቋ ምርጫን ማስቀመጥ አልተቻለም።",
      timezoneTitle: "የሰዓት ሰቅ",
      timezoneDesc:
        "ለምዕራፍ ቀነ-ገደቦች፣ ለኤስክሮ መርሐ ግብሮች እና ለመዝገብ ሰዓቶች ጥቅም ላይ ይውላል።",
      timezoneLabel: "የማሳያ ሰዓት ሰቅ",
      timezoneSaved: "የሰዓት ሰቅ ምርጫ ተቀምጧል።",
      timezoneSaveError: "የሰዓት ሰቅን ማስቀመጥ አልተቻለም።",
      appearanceTitle: "የማሳያ ገጽታ",
      appearanceDesc:
        "በሁሉም የሥራ ቦታ ገጾች ላይ በቀን ብርሃን እና በጨለማ ገጽታ መካከል ይቀያይሩ።",
      lightThemeLabel: "ብርሃን ገጽታ",
      lightThemeDesc: "ግልጽ የቀን ብርሃን የሥራ ቦታ",
      darkThemeLabel: "ጨለማ ገጽታ",
      darkThemeDesc: "ለምሽት ሥራ ምቹ የሆነ ጨለማ ገጽታ",
      activeBadge: "ንቁ",
    },
    notifications: {
      eyebrow: "ማንቂያዎች እና ማጠቃለያዎች",
      heading: "ማሳወቂያዎች",
      lead: "Yekis ስለ ፕሮፖዛሎች፣ የኤስክሮ ክፍያ እና መልዕክቶች እንዴት እንደሚያሳውቅዎ ይቆጣጠሩ።",
      platformNotificationsLabel: "የመድረክ እና የኤስክሮ ማሳወቂያዎች",
      platformNotificationsDesc:
        "ለምዕራፍ አቅርቦቶች፣ የኤስክሮ ክፍያ፣ አለመግባባቶች እና የደህንነት ማረጋገጫዎች አስፈላጊ ማንቂያዎች።",
      marketingCommunicationsLabel: "የምርት ዝማኔዎች እና የገበያ ምክሮች",
      marketingCommunicationsDesc:
        "ስለ አዲስ የክህሎት ምድቦች፣ የክፍያ ዝማኔዎች እና መመሪያዎች አልፎ አልፎ የሚላኩ ማስታወቂያዎች።",
      emailDigestNote:
        "የግብይት ደረሰኞች እና ሕጋዊ የአለመግባባት ማስታወቂያዎች የግብይት መልዕክት ምርጫ ምንም ይሁን ምን መድረሳቸውን ይቀጥላሉ።",
      telegramAlertsNote:
        "የተገናኙ የTelegram መለያዎች ለተከፈለባቸው ምዕራፎች እና የውይይት መልዕክቶች ፈጣን ማንቂያ ይቀበላሉ።",
      savePrefsBtn: "የማሳወቂያ ምርጫዎችን አስቀምጥ",
      savingPrefsBtn: "በማስቀመጥ ላይ...",
      prefsSaved: "የማሳወቂያ ምርጫዎች ተዘምነዋል።",
      prefsSaveError: "የማሳወቂያ ምርጫዎችን ማዘመን አልተቻለም።",
    },
    privacy: {
      eyebrow: "ታይነት እና ፈቃዶች",
      heading: "ግላዊነት እና ታይነት",
      lead: "ሕጋዊ የውሂብ ማቀነባበሪያ ፈቃዶችን ይገምግሙ እና የመገለጫዎን ታይነት ይቆጣጠሩ።",
      publicProfileLabel: "የሕዝብ የገበያ ማውጫ",
      publicProfileDesc:
        "የተረጋገጡ ደንበኞች እና የፍለጋ ውጤቶች የሕዝብ መገለጫዎን እንዲያገኙ ይፍቀዱ።",
      analyticsConsentLabel: "የምርት ትንታኔ እና ቴሌሜትሪ",
      analyticsConsentDesc:
        "በማይታወቅ የአጠቃቀም መረጃ የYekis ማዛመጃን እና ፍጥነትን ለማሻሻል ያግዙ።",
      kycConsentTitle: "የማንነት እና የKYC ማረጋገጫ ሂደት",
      kycConsentDesc:
        "በኢትዮጵያ የፋይናንስ ደንቦች መሠረት ለተረጋገጡ ክፍያዎች እና ከፍተኛ ዋጋ ላላቸው ውሎች ያስፈልጋል።",
      financialConsentTitle: "የኤስክሮ መዝገብ እና የግብር መረጃ ሂደት",
      financialConsentDesc:
        "ለቴሌብር፣ CBE ብር፣ M-Pesa ክፍያዎች እና ሕጋዊ የግብር ደረሰኞች ያስፈልጋል።",
      savePrivacyBtn: "የግላዊነት ምርጫዎችን አስቀምጥ",
      savingPrivacyBtn: "በማስቀመጥ ላይ...",
      privacySaved: "የግላዊነት ምርጫዎች ተቀምጠዋል።",
      privacySaveError: "የግላዊነት ምርጫዎችን ማስቀመጥ አልተቻለም።",
    },
    data: {
      eyebrow: "የግል ውሂብ ጥበቃ መብቶች",
      heading: "ውሂብ እና መለያ",
      lead: "የመድረክ መዝገቦችዎን ቅጂ ያውርዱ ወይም መለያዎን በቋሚነት ያሰናክሉ።",
      exportTitle: "የግል ውሂብ ማህደር ላክ",
      exportDesc:
        "መገለጫዎን፣ ውሎችዎን፣ ፕሮፖዛሎችዎን፣ የቦርሳ መዝገቦችዎን እና የፈቃድ ምዝግብ ማስታወሻዎችን የያዘ የJSON ፋይል ያውርዱ።",
      exportBtn: "የJSON ማህደር አውርድ",
      exportingBtn: "በማዘጋጀት ላይ...",
      exportSuccess: "የውሂብ ማህደር ወርዷል።",
      exportError: "የውሂብ ወደ ውጭ መላክን መፍጠር አልተቻለም።",
      deactivateTitle: "መለያን አሰናክል እና ሰርዝ",
      deactivateDesc:
        "ሁሉም ንቁ ውሎች፣ አለመግባባቶች እና የቦርሳ ቀሪ ሂሳቦች ከተጠናቀቁ በኋላ መለያዎን ይዝጉ።",
      retentionNotice:
        "የኢትዮጵያ የንግድ እና የግብር ሕግ የኤስክሮ እና የፋይናንስ ደረሰኝ መዝገቦች ለ10 ዓመታት እንዲቆዩ ያዛል፤ የግል መገለጫ መረጃዎች ግን ይሰረዛሉ።",
      openDeactivateBtn: "የመለያ መዝጊያ ግምገማ ክፈት",
    },
    deactivateDialog: {
      title: "የYekis መለያን አሰናክል",
      closeAria: "የመዝጊያ መስኮቱን ዝጋ",
      checkingBlockers: "ንቁ ውሎችን፣ አለመግባባቶችን እና የቦርሳ ቀሪ ሂሳብን በመፈተሽ ላይ...",
      blockersHeading: "ከመዘጋቱ በፊት እርምጃ ያስፈልጋል",
      blockersIntro: "ይህ መለያ ከመዘጋቱ በፊት የሚከተሉትን ጉዳዮች ይጨርሱ፦",
      erasureDoneHeading: "መለያው ተሰናክሏል",
      erasureDoneDesc:
        "የግል መገለጫዎ ስም-አልባ ተደርጓል እና ሁሉም ንቁ ክፍለ ጊዜዎች ተዘግተዋል።",
      retentionSummaryLabel: "ሕጋዊ የፋይናንስ መዝገብ ጥበቃ",
      warningBanner:
        "ይህ እርምጃ የYekis መለያዎን በቋሚነት ይዘጋል። ለማረጋገጥ ከታች DEACTIVATE ብለው ይጻፉ።",
      confirmPhraseLabel: "ለማረጋገጥ DEACTIVATE ይጻፉ",
      confirmPhrasePlaceholder: "DEACTIVATE",
      confirmPhraseError: "እባክዎ ለማረጋገጥ DEACTIVATE በትልቅ ፊደል ይጻፉ።",
      reasonLabel: "የመውጣት ምክንያት (አማራጭ)",
      reasonPlaceholder: "ምን ቢሻሻል እንደሚመርጡ ይንገሩን...",
      passwordLabel: "በይለፍ ቃልዎ ያረጋግጡ (ካለ)",
      passwordPlaceholder: "የአሁኑ የመለያ ይለፍ ቃል",
      submitBtn: "መለያውን በቋሚነት አሰናክል",
      submittingBtn: "በማሰናከል ላይ...",
      blockerCheckError: "የመለያ መዝጊያ ብቁነትን መፈተሽ አልተቻለም።",
      deactivateError: "መለያውን ማሰናከል አልተቻለም።",
    },
    kycTiers: {
      UNVERIFIED: "ያልተረጋገጠ",
      BASIC: "መሠረታዊ",
      FAYDA_VERIFIED: "በፋይዳ የተረጋገጠ",
      BUSINESS_VERIFIED: "ንግድ የተረጋገጠ",
    },
    kycStatuses: {
      NOT_SUBMITTED: "አልቀረበም",
      PENDING: "በግምገማ ላይ",
      APPROVED: "ጸድቋል",
      REJECTED: "እርምጃ ያስፈልጋል",
    },
  },
  om: {
    breadcrumbRoot: "Bakka hojii",
    breadcrumbCurrent: "Qindaa'ina herregaa",
    tablistAria: "Kutaalee qindaa'inaa",
    tabs: {
      security: "Nageenyaafi jecha darbii",
      general: "Filannoowwaniifi afaan",
      notifications: "Beeksisa",
      privacy: "Dhuunfaafi mul'ina",
      data: "Daataafi herrega",
    },
    common: {
      save: "Jijjiirama olkaa'i",
      saving: "Olkaa'aa jira...",
      saved: "Olkaa'ameera",
      cancel: "Haqi",
      close: "Cufi",
      loading: "Fe'aa jira...",
      enabled: "Banaa",
      disabled: "Cufaa",
      verified: "Mirkaneeffameera",
      notLinked: "Wal hin qabanne",
      configured: "Qophaa'eera",
      notSet: "Hin qophoofne",
      somethingWentWrong: "Dogoggorri uumameera.",
    },
    credentialErrors: {
      reauthRequired:
        "Seensi keessan mala seensaa jijjiiruuf tureera. Jecha darbii keessaniin deebi'aatii seenaa yaalaa.",
      stepUpRequired:
        "Dura jecha darbii keessaniin seenaa, sana booda Google walqabsiisaa.",
      googlePopupBlocked:
        "Foddaan seensaa Google banamuu hin dandeenye. Pop-up hayyamaa ykn irra deebi'aa yaalaa.",
      googleVerifyFailed: "Herrega Google keessan mirkaneessuun hin danda'amne.",
      googleLinkFailed: "Herrega Google walqabsiisuun hin milkoofne.",
      googleUnlinkFailed: "Herrega Google addaan kutuun hin milkoofne.",
      loadIdentitiesFailed: "Maloota seensaa walqabatan fe'uun hin danda'amne.",
    },
    security: {
      eyebrow: "Seensaafi ragaa",
      heading: "Nageenyaafi jecha darbii",
      lead: "Ragaa seensaa, herregota walqabataniifi yeroo seensaa banaa ta'an bulchaa.",
      passwordSectionTitle: "Jecha darbii jijjiiri",
      passwordSectionDesc:
        "Jecha darbii jabaa qubeewwan yoo xiqqaate 10 qabuufi bakka biraatti hin fayyadamne fayyadamaa.",
      currentPasswordLabel: "Jecha darbii ammaa",
      currentPasswordPlaceholder: "Jecha darbii ammaa galchi",
      newPasswordLabel: "Jecha darbii haaraa",
      newPasswordPlaceholder: "Yoo xiqqaate arfiiwwan 10",
      confirmPasswordLabel: "Jecha darbii haaraa mirkaneessi",
      confirmPasswordPlaceholder: "Jecha darbii haaraa irra deebi'i",
      passwordMismatchError: "Jechi darbii haaraafi mirkaneessi wal hin simne.",
      passwordLengthError:
        "Jechi darbii haaraan yoo xiqqaate qubeewwan 10 ta'uu qaba.",
      passwordCurrentRequiredError: "Jecha darbii ammaa keessan galchaa.",
      passwordUpdatedSuccess: "Jechi darbii milkaa'inaan haaromfameera.",
      passwordUpdateError: "Jecha darbii haaromsuun hin milkoofne.",
      updatePasswordBtn: "Jecha darbii haaromsi",
      updatingPasswordBtn: "Haaromsaa jira...",
      linkedAccountsTitle: "Maloota Seensaa Walqabatan",
      linkedAccountsDesc:
        "Carraa herrega escrow keessanii akka hin dhabne yoo xiqqaate mala seensaa mirkaneeffame tokko banaa tursiisaa.",
      passwordMethodLabel: "Seensa jecha darbiin",
      passwordMethodActiveDesc:
        "Mirkaneessi jecha darbii herrega kana irratti ni hojjeta.",
      passwordMethodMissingDesc:
        "Jechi darbii ammaaf hin qophoofne. Mala alaa haquun dura olitti jecha darbii qopheessaa.",
      emailMethodLabel: "Imeelii ijoo",
      emailNotSet: "Imeeliin mirkaneeffame hin jiru",
      googleMethodLabel: "Google",
      googleNotConfigured: "Seensi Google naannoo kanatti hin qindaa'ine.",
      googleNotConnectedDesc:
        "Hin walqabane — jecha darbiin keessan seenuu, sana booda Google walqabsiisaa.",
      googleConnectedDesc:
        "Walqabateera — banoo Google keessan sii seenaa.",
      telegramConnectedDesc:
        "Walqabateera — karaa Telegram walqabate qabiyyee keessan ni gaafata.",
      linkGoogleBtn: "Herrega Google walqabsiisi",
      linkingGoogleBtn: "Google walqabsiisaa jira...",
      unlinkGoogleBtn: "Google addaan kuti",
      unlinkingGoogleBtn: "Addaan kutaa jira...",
      googleUnlinkedSuccess: "Herregni Google addaan citeera.",
      googleLinkedSuccess: "Herregni Google milkaa'inaan walqabateera.",
      telegramMethodLabel: "Telegram",
      telegramLinkedDesc: (id) => `Karaa Telegram walqabateera (${id}).`,
      telegramNotLinkedDesc:
        "Hin walqabne — karaa Telegram keessan kana walqabsiisaa; baraan keessatti mirkaneessuu ni qophaa'a.",
      emailVerifiedDesc:
        "Mirkaneessame — isa kanaan ragaa galmaa'aan kenneeffataa fiiqan qabeenyuu seeraa dabarsuu ni gaafataa.",
      emailUnverifiedDesc:
        "Hin mirkaneessne — akkuma kennuu dheebiinsuu dheebiifamuufi imeelii mirkaneessi.",
      verifyEmailBtn: "Imeelii mirkaneessi",
      emailCodeTitle: "Imeelii kana mirkaneessi",
      emailCodeSentDesc: (email) =>
        `Koodii digdii lamaatama ${email}itti ergame. Koodicha armaan gadii galmaa'i.`,
      emailCodeLabel: "Koodii digdii lamaatama",
      emailCodeHint:
        "Koodichi daqiiqaa kudii keessatti xumurama. Sanduuqa koodii keessoo baafadhu.",
      emailCodeSubmitBtn: "Koodicha mirkaneessi",
      emailCodeSubmittingBtn: "Mirkaneessuun jira...",
      resendCodeBtn: "Koodii haaraa erga",
      emailVerifySuccess: "Imeelii mirkaneessame.",
      emailVerifyFailed:
        "Koodichi dogogora. Koodii haaraa gaafadhu irra deebi'aa.",
      connectTelegramBtn: "Telegram walqabsi",
      connectingTelegramBtn: "Telegram eegamaa jira...",
      disconnectTelegramBtn: "Citee",
      telegramWaitingDesc:
        "Baraa Telegram keessatti Start tuqa — kaan page ofi.",
      telegramConnectedSuccess: "Telegram amma herrega keessaa waliin walqabateera.",
      telegramDisconnectedSuccess:
        "Telegram citeera. Jecha darbiin keessatti darbee.",
      telegramNotConfigured: "Seensi Telegram naannoo kanaatti hin qindaa'ine.",
      sessionsTitle: "Yeroowwan Seensaa Banaafi Meeshaalee",
      sessionsDesc:
        "Seensa hayyama hin qabne yoo shakkitan seensota browser fi Mini App biroo hunda cufaa.",
      revokeSessionsBtn: "Seensota biroo hunda cufi",
      revokingSessionsBtn: "Cufaa jira...",
      sessionsRevokedSuccess:
        "Seensonni biroon hundi bahaniiru. Seensa kana qofatu banaadha.",
      sessionsRevokeError: "Seensota cufuun hin milkoofne.",
      identityTitle: "Eenyummaafi Haala Mirkaneessaa",
      identityDesc:
        "Mirkaneessi OTP teeleeqomii Itoophiyaafi Fayda ID baasiifi falmii ni eegu.",
      kycTierLabel: "Sadarkaa mirkaneessaa",
      kycStatusLabel: "Haala KYC",
      mfaNote:
        "Baasiin daangaa idilee ol ta'e mirkaneessa OTP SMS ykn Telegram haaraa gaafata.",
    },
    accountType: {
      title: "Gosaa Herrega",
      desc: "Yekis keessatti ati itti fayyadamuu. Yeroo kamiyyuu jijjiiruuf danda'a — galmeen keessan, proposal keessan qabiyyee keessan haaruu hin fudgnu.",
      clientDesc:
        "Ogeeyyoo shaaxuuf: hojii banaatii, proposali ilaalii, escrow dhaansiifi kennuu hojii raawvatii.",
      freelancerDesc:
        "Hojii raawvatuf: hojii dubbifadhu, proposali kennuu, marz baayyifadhu qabiyyee argadhu.",
      bothDesc: "Ogeeyyoo shaaxuufi hojii raawvatuf herrega tokkoon.",
      currentLabel: "Amma",
      saveBtn: "Gosaa herregaa jijjiiri",
      savingBtn: "Haaromsaa jira...",
      success: (role) => `Gosaa herrega keessan amma ${role} ta'eera.`,
      error: "Gosaa herregaa jijjiiruun hin milkoofne.",
      historyNote:
        "Galmeen fi hojiin gosaa herrega yoo jiraan yoo ${role} ta'eedha qophaa'e.",
    },
    general: {
      eyebrow: "Filannoo naannoo",
      heading: "Filannoowwaniifi afaan",
      lead: "Afaan fuulaa, sa'aatii daangaa yeroofi bifa mul'ataa filadhaa.",
      languageTitle: "Afaan Fuulaa",
      languageDesc:
        "Menyuuwwan waltajjii, beeksisotaafi unkaalee hojii hunda yeroodhuma sana jijjiira.",
      languageSaved: "Filannoon afaanii olkaa'ameera.",
      languageSaveError: "Filannoo afaanii olkaa'uun hin danda'amne.",
      timezoneTitle: "Naannoo Sa'aatii",
      timezoneDesc:
        "Daangaa yeroo boqonnaa hojii, sagantaa escrow fi galmeewwan yeroo irratti fayyada.",
      timezoneLabel: "Sa'aatii mul'atu",
      timezoneSaved: "Filannoon sa'aatii olkaa'ameera.",
      timezoneSaveError: "Naannoo sa'aatii olkaa'uun hin danda'amne.",
      appearanceTitle: "Bifa Mul'ataa",
      appearanceDesc:
        "Fuula hojii hunda irratti ifaafi dukkana gidduutti jijjiiraa.",
      lightThemeLabel: "Bifa Ifaa",
      lightThemeDesc: "Bakka hojii ifaa qulqulluu",
      darkThemeLabel: "Bifa Dukkanaa",
      darkThemeDesc: "Hojii halkaniif mijataa",
      activeBadge: "Hojirra",
    },
    notifications: {
      eyebrow: "Beeksisotaafi cuunfaa",
      heading: "Beeksisa",
      lead: "Akkaataa Yekis yaada dorgommii, maallaqa escrow fi ergaa itti isin beeksisu to'adhaa.",
      platformNotificationsLabel: "Beeksisa Waltajjiifi Escrow",
      platformNotificationsDesc:
        "Beeksisota barbaachisoo dhiyeessa boqonnaa hojii, maallaqa escrow, falmiifi nageenyaa.",
      marketingCommunicationsLabel: "Haaromsa Oomishaafi Gorsa Gabaa",
      marketingCommunicationsDesc:
        "Beeksisota darbee darbee ramaddii ogummaa haaraa, kaffaltiifi qajeelfamoota irratti ergaman.",
      emailDigestNote:
        "Nagaheewwan daldalaafi beeksisni falmii seeraa filannoo beeksisa daldalaa malee ergamuun isaanii itti fufa.",
      telegramAlertsNote:
        "Herregni Telegram walqabatan boqonnaawwan kaffalamanii fi ergaawwan haasaaf beeksisa battalaa ni argatu.",
      savePrefsBtn: "Filannoo beeksisaa olkaa'i",
      savingPrefsBtn: "Olkaa'aa jira...",
      prefsSaved: "Filannoon beeksisaa haaromfameera.",
      prefsSaveError: "Filannoo beeksisaa haaromsuun hin milkoofne.",
    },
    privacy: {
      eyebrow: "Mul'inaafi hayyama",
      heading: "Dhuunfaafi mul'ina",
      lead: "Hayyama seeraa qindeessa daataa ilaalaa; mul'ina piroofaayilii keessanii to'adhaa.",
      publicProfileLabel: "Galmee Gabaa Hawaasaa",
      publicProfileDesc:
        "Maamiltoonni mirkaneeffamaniifi barbaadni waltajjii piroofaayila keessan akka argatan hayyamaa.",
      analyticsConsentLabel: "Xiinxala Oomishaafi Telemetry",
      analyticsConsentDesc:
        "Daataa fayyadamaa eenyummaa hin ibsineen wal-qunnamtii Yekis fooyyessuuf gargaaraa.",
      kycConsentTitle: "Qindeessa Mirkaneessa Eenyummaafi KYC",
      kycConsentDesc:
        "Akkaataa seera faayinaansii Itoophiyaatti kaffaltii ogeessaafi waliigaltee gurguddoof barbaachisa.",
      financialConsentTitle: "Qindeessa Galmee Escrow fi Gibiraa",
      financialConsentDesc:
        "Kaffaltii Telebirr, CBE Birr, M-Pesa fi nagahee gibiraa seeraaf barbaachisa.",
      savePrivacyBtn: "Filannoo dhuunfaa olkaa'i",
      savingPrivacyBtn: "Olkaa'aa jira...",
      privacySaved: "Filannoon dhuunfaa olkaa'ameera.",
      privacySaveError: "Filannoo dhuunfaa olkaa'uun hin danda'amne.",
    },
    data: {
      eyebrow: "Mirga eegumsa daataa",
      heading: "Daataafi herrega",
      lead: "Garagalcha galmeewwan keessanii buufadhaa ykn herrega keessan dhaabbataan cufaa.",
      exportTitle: "Kuusaa Daataa Dhuunfaa Baasi",
      exportDesc:
        "Faayilii JSON piroofaayilii, waliigaltee, yaada dorgommii, herrega boorsaa fi galmee hayyamaa qabate buufadhaa.",
      exportBtn: "Kuusaa JSON Buufadhu",
      exportingBtn: "Qopheessaa jira...",
      exportSuccess: "Kuusaan daataa buufameera.",
      exportError: "Daataa baasuun hin danda'amne.",
      deactivateTitle: "Herrega Cufiifi Haqi",
      deactivateDesc:
        "Waliigalteewwan banaa, falmiifi herregni boorsaa hundi erga xumuramanii booda herrega keessan cufaa.",
      retentionNotice:
        "Seerri daldalaafi gibira Itoophiyaa galmeewwan escrow fi nagaheewwan waggaa 10f akka turan ni dirqisiisa; odeeffannoon piroofaayilii dhuunfaa garuu ni haqama.",
      openDeactivateBtn: "Cufinsa herregaa gamaaggami",
    },
    deactivateDialog: {
      title: "Herrega Yekis Cufi",
      closeAria: "Foddaa cufinsa herregaa cufi",
      checkingBlockers:
        "Waliigalteewwan banaa, falmiifi herrega boorsaa sakatta'aa jira...",
      blockersHeading: "Cufuun dura tarkaanfii barbaachisa",
      blockersIntro: "Herregni kun osoo hin cufamin dhimma armaan gadii xumuraa:",
      erasureDoneHeading: "Herregni cufameera",
      erasureDoneDesc:
        "Piroofaayiliin dhuunfaa keessan maqaa-maleessa ta'eera; seensonni banaa hundi cufamaniiru.",
      retentionSummaryLabel: "Eegumsa galmee faayinaansii seeraa",
      warningBanner:
        "Tarkaanfiin kun herrega Yekis keessan dhaabbataan cufa. Mirkaneessuuf gadiitti DEACTIVATE barreessaa.",
      confirmPhraseLabel: "Mirkaneessuuf DEACTIVATE barreessi",
      confirmPhrasePlaceholder: "DEACTIVATE",
      confirmPhraseError:
        "Maaloo mirkaneessuuf qubee guddaan DEACTIVATE barreessaa.",
      reasonLabel: "Sababa bahinsaa (filannoo)",
      reasonPlaceholder: "Maal fooyyessuu akka dandeenyu nutti himaa...",
      passwordLabel: "Jecha darbii keessaniin mirkaneessaa (yoo jiraate)",
      passwordPlaceholder: "Jecha darbii herregaa ammaa",
      submitBtn: "Herrega dhaabbataan cufi",
      submittingBtn: "Herrega cufaa jira...",
      blockerCheckError: "Ulaagaa cufinsa herregaa sakatta'uun hin danda'amne.",
      deactivateError: "Herrega cufuun hin milkoofne.",
    },
    kycTiers: {
      UNVERIFIED: "Hin mirkanoofne",
      BASIC: "Bu'uuraa",
      FAYDA_VERIFIED: "Faydaan Mirkaneeffame",
      BUSINESS_VERIFIED: "Daldalli Mirkaneeffame",
    },
    kycStatuses: {
      NOT_SUBMITTED: "Hin dhiyaanne",
      PENDING: "Gamaaggama irra",
      APPROVED: "Mirkaneeffameera",
      REJECTED: "Tarkaanfii barbaachisa",
    },
  },
  ti: {
    breadcrumbRoot: "ቦታ ስራሕ",
    breadcrumbCurrent: "ቅንብራት ሕሳብ",
    tablistAria: "ክፍልታት ቅንብር",
    tabs: {
      security: "ድሕነትን መሕለፊ ቃልን",
      general: "ምርጫታትን ቋንቋን",
      notifications: "መፍለጢታት",
      privacy: "ውልቃዊነትን ተራእዮነትን",
      data: "ዳታን ሕሳብን",
    },
    common: {
      save: "ለውጥታት ዓቅብ",
      saving: "ይዕቀብ ኣሎ...",
      saved: "ተዓቂቡ",
      cancel: "ስርዝ",
      close: "ዕጸው",
      loading: "ይጽዕን ኣሎ...",
      enabled: "ተኸፊቱ",
      disabled: "ተዓጽዩ",
      verified: "ዝተረጋገጸ",
      notLinked: "ኣይተኣሳሰረን",
      configured: "ተዳልዩ",
      notSet: "ኣይተዳለወን",
      somethingWentWrong: "ጸገም ተፈጢሩ።",
    },
    credentialErrors: {
      reauthRequired:
        "መእተዊ ክፍለ ግዜኹም ኣገባብ መእተዊ ንምቕያር ነዊሕ ገይሩ እዩ። ብመሕለፊ ቃልኩም እንደገና እተዉ እሞ ፈትኑ።",
      stepUpRequired:
        "ቅድም ብመሕለፊ ቃልኩም እተዉ፣ ድሕሪኡ Google ኣተኣሳስሩ።",
      googlePopupBlocked:
        "መስኮት መእተዊ Google ክኽፈት ኣይከኣለን። ብቕ-ባያት ፍቐዱ ወይ እንደገና ፈትኑ።",
      googleVerifyFailed: "ሕሳብ Googleኹም ምርግጋጽ ኣይተኻእለን።",
      googleLinkFailed: "ሕሳብ Google ምትእስሳር ኣይተኻእለን።",
      googleUnlinkFailed: "ሕሳብ Google ምፍላይ ኣይተኻእለን።",
      loadIdentitiesFailed: "ዝተኣሳሰሩ መንገድታት መእተዊ ምጽዓን ኣይተኻእለን።",
    },
    security: {
      eyebrow: "መእተውን መረጋገጺታትን",
      heading: "ድሕነትን መሕለፊ ቃልን",
      lead: "መረጋገጺታት መእተዊ፣ ዝተኣሳሰሩ ሕሳባትን ንጡፋት ክፍለ ግዜታትን ኣመሓድሩ።",
      passwordSectionTitle: "መሕለፊ ቃል ቀይር",
      passwordSectionDesc:
        "ኣብ ካልእ ቦታ ዘይተጠቐምኩምሉ ብውሑዱ 10 ፊደላት ዘለዎ ጽኑዕ መሕለፊ ቃል ተጠቐሙ።",
      currentPasswordLabel: "ናይ ሕጂ መሕለፊ ቃል",
      currentPasswordPlaceholder: "ናይ ሕጂ መሕለፊ ቃል የእትዉ",
      newPasswordLabel: "ሓድሽ መሕለፊ ቃል",
      newPasswordPlaceholder: "ብውሑዱ 10 ፊደላት",
      confirmPasswordLabel: "ሓድሽ መሕለፊ ቃል ኣረጋግጽ",
      confirmPasswordPlaceholder: "ሓድሽ መሕለፊ ቃል ድገም",
      passwordMismatchError: "ሓድሽ መሕለፊ ቃልን መረጋገጽን ኣይሰማምዑን።",
      passwordLengthError: "ሓድሽ መሕለፊ ቃል ብውሑዱ 10 ፊደላት ክኸውን ኣለዎ።",
      passwordCurrentRequiredError: "ናይ ሕጂ መሕለፊ ቃልኩም የእትዉ።",
      passwordUpdatedSuccess: "መሕለፊ ቃል ብዓወት ተሓዲሱ።",
      passwordUpdateError: "መሕለፊ ቃል ምሕዳስ ኣይተኻእለን።",
      updatePasswordBtn: "መሕለፊ ቃል ኣሐድስ",
      updatingPasswordBtn: "ይሕደስ ኣሎ...",
      linkedAccountsTitle: "ዝተኣሳሰሩ መንገድታት መእተዊ",
      linkedAccountsDesc:
        "መእተዊ ሕሳብ ኤስክሮኹም ከይትስእኑ ብውሑዱ ሓደ ዝተረጋገጸ መንገዲ መእተዊ ንጡፍ ግበሩ።",
      passwordMethodLabel: "ብመሕለፊ ቃል መእተዊ",
      passwordMethodActiveDesc:
        "ኣብዚ ሕሳብ እዚ መረጋገጺ መሕለፊ ቃል ንጡፍ እዩ።",
      passwordMethodMissingDesc:
        "ገና መሕለፊ ቃል ኣይተዳለወን። ደጋዊ መንገድታት ቅድሚ ምፍላይኩም ኣብ ላዕሊ መሕለፊ ቃል ኣዳልዉ።",
      emailMethodLabel: "ቀንዲ ኢመይል",
      emailNotSet: "ዝተረጋገጸ ኢመይል የለን",
      googleMethodLabel: "Google",
      googleNotConfigured: "ኣብዚ ከባቢ መእተዊ Google ኣይተዳለወን።",
      googleNotConnectedDesc:
        "አልተገናኝም — በይለፍ ቃልዎ ይግቡና ከዚያ Google ያገናኙ።",
      googleConnectedDesc:
        "ተገናኝቷል — የGoogle አዝላክ እርስዎን ይግባል።",
      telegramConnectedDesc:
        "ተገናኝቷል — የተገናኘው የTelegram ውይይት ኮዶችዎን ይቀበላል።",
      linkGoogleBtn: "ሕሳብ Google ኣተኣሳስር",
      linkingGoogleBtn: "Google ይተኣሳሰር ኣሎ...",
      unlinkGoogleBtn: "Google ፍለ",
      unlinkingGoogleBtn: "ይፍለ ኣሎ...",
      googleUnlinkedSuccess: "ሕሳብ Google ተፈልዩ።",
      googleLinkedSuccess: "ሕሳብ Google ብዓወት ተኣሳሲሩ።",
      telegramMethodLabel: "Telegram",
      telegramLinkedDesc: (id) => `ብTelegram ተኣሳሲሩ (${id})።`,
      telegramNotLinkedDesc:
        "አልተገናኝም — የTelegram ውይይትዎን እዚህ ያገናኙ፤ በቦት ውስጥ ለእርስዎ ያረጋግጦታለ።",
      emailVerifiedDesc:
        "ጸድቆ! — ይህ አድራሻ የክፍያ ደረሰኝና የደህንነት ማስጠንቀቂያ ይቀበላል።",
      emailUnverifiedDesc:
        "አልተረጋገጧም — የይለፍ ቃል ማስረጃና ክፍያ እንዲደርስዎ ያረጋግጡ።",
      verifyEmailBtn: "ኢመይል ኣረጋግጥ",
      emailCodeTitle: "ይህን ኢመይል አድራሻ ኣረጋግጥ",
      emailCodeSentDesc: (email) =>
        `ወደ ${email} 6 ቁጥር ኮድ አላንድ። ከታች ወጥም።`,
      emailCodeLabel: "6 ቁጥር ኮድ",
      emailCodeHint:
        "ኮዱ በ10 ደቂቃ ያበቃል። ካሳንድና አስፖጅ ጊዜዎችዎን ይመልከቱ።",
      emailCodeSubmitBtn: "ኮዱን ኣረጋግጥ",
      emailCodeSubmittingBtn: "በማረጋገጥ ላይ...",
      resendCodeBtn: "አዲስ ኮድ ላክ",
      emailVerifySuccess: "የኢመይል አድራሻ ተረጋገጧል።",
      emailVerifyFailed: "ኮዱ ትክክል አይደለም። አዲስ ኮድ ይጠይቁ።",
      connectTelegramBtn: "Telegram ኣሳስር",
      connectingTelegramBtn: "Telegram በመጠበቅ ላይ...",
      disconnectTelegramBtn: "አላቅቅ",
      telegramWaitingDesc:
        "በተከፈተው የቦት ውይይት ውስጥ Start ይጫኑ — ይህ ገጹ በራሱ ይዘምናል።",
      telegramConnectedSuccess: "Telegram ከአሁን ወደ መለያዎ ተገናኝቷል።",
      telegramDisconnectedSuccess:
        "Telegram ተቋርጧል። የይለፍ ቃልዎ አሁገው ይግባል።",
      telegramNotConfigured:
        "በዚህ አገልግሎት ላይ የTelegram መግቢያ አልተዋቀረም።",
      sessionsTitle: "ንጡፋት ክፍለ ግዜታትን መሳርሒታትን",
      sessionsDesc:
        "ዘይተፈቕደ መእተዊ እንተጠርጢርኩም ኩሎም ካልኦት ክፍለ ግዜታት መርበብን Mini Appን ኣውጽኡ።",
      revokeSessionsBtn: "ኩሎም ካልኦት ክፍለ ግዜታት ስርዝ",
      revokingSessionsBtn: "ይስረዝ ኣሎ...",
      sessionsRevokedSuccess:
        "ኩሎም ካልኦት ክፍለ ግዜታት ወጺኦም እዮም። እዚ ክፍለ ግዜ ጥራይ ንጡፍ ኮይኑ ይቕጽል።",
      sessionsRevokeError: "ክፍለ ግዜታት ምስራዝ ኣይተኻእለን።",
      identityTitle: "መንነትን ብዙሕ-ብርኪ መረጋገጽን",
      identityDesc:
        "መረጋገጺ OTP ቴሌኮም ኢትዮጵያን ሃገራዊ መታወቂያ ፋይዳን ምውጻእ ገንዘብን ክርክራትን ይሕልዉ።",
      kycTierLabel: "ደረጃ መረጋገጺ",
      kycStatusLabel: "ኩነታት KYC",
      mfaNote:
        "ካብ ስሩዕ ደረት ንላዕሊ ምውጻእ ገንዘብ ሓድሽ መረጋገጺ OTP ብSMS ወይ Telegram ይሓትት።",
    },
    accountType: {
      title: "የመለያ ዓይነት",
      desc: "በYekis የሚጠቀሙት መንገድ። ይህን በማንኛውንም ጊዜ መቀየር ይችላሉ — ግንባቶችዎ፣ ጥቆማዎችዎና ቦርሳዎ በቦት አይንረሱም።",
      clientDesc:
        "ባለሙያ መለማመል፦ ስራ ማውባት፣ ጥቆማ ማገምገም፣ escrow ማስደርስና ማጽደቅ ያረጋግጡ።",
      freelancerDesc:
        "ስራ መውራል፦ ስራዎች ማየት፣ ጥቆማ ማስገባት፣ ደረጃ ማስተላለፍና ክፍያ መቀበል።",
      bothDesc: "በአንድ መለያ ባለሙያ መለማመልና ስራ መውራል።",
      currentLabel: "አሁን",
      saveBtn: "የመለያ ዓይነት ቀይር",
      savingBtn: "በመቀመር ላይ...",
      success: (role) => `የመለያዎ ዓይነት አሁን ${role} ነው።`,
      error: "የመለያ ዓይነቱን መቀየር አልተቻለም።",
      historyNote:
        "ግንባቶችና ስራዎች በተፈጠሩበት ጊዜ ያንተነውን የመለያ ዓይነት ይዘጋጣሉ።",
    },
    general: {
      eyebrow: "ምርጫታት ከባቢ",
      heading: "ምርጫታትን ቋንቋን",
      lead: "ቋንቋ ገጽኩም፣ ናይ ደረት ግዜ ሰዓት ሰቕን ትርኢት ገጽን ምረጹ።",
      languageTitle: "ቋንቋ ገጽ",
      languageDesc:
        "ኩሎም ሜኑታት መድረኽ፣ መፍለጢታትን ቅጥዕታት ስራሕን ብቅጽበት ይቅይር።",
      languageSaved: "ምርጫ ቋንቋ ተዓቂቡ።",
      languageSaveError: "ምርጫ ቋንቋ ምዕቃብ ኣይተኻእለን።",
      timezoneTitle: "ሰዓት ሰቕ",
      timezoneDesc:
        "ንደረት ግዜ ምዕራፋት፣ መደባት ኤስክሮን ሰዓታት መዝገብን የገልግል።",
      timezoneLabel: "ሰዓት ሰቕ መርኣዪ",
      timezoneSaved: "ምርጫ ሰዓት ሰቕ ተዓቂቡ።",
      timezoneSaveError: "ሰዓት ሰቕ ምዕቃብ ኣይተኻእለን።",
      appearanceTitle: "ትርኢት መርኣዪ",
      appearanceDesc:
        "ኣብ ኩሎም ገጻት ስራሕ ኣብ መንጎ ብርሃንን ጸልማትን ቀይሩ።",
      lightThemeLabel: "ብርሃን ገጽ",
      lightThemeDesc: "ንጹር ናይ መዓልቲ ቦታ ስራሕ",
      darkThemeLabel: "ጸልማት ገጽ",
      darkThemeDesc: "ንናይ ለይቲ ስራሕ ምቹእ ጸልማት ገጽ",
      activeBadge: "ንጡፍ",
    },
    notifications: {
      eyebrow: "መጠንቀቕታታትን ጽሟቕን",
      heading: "መፍለጢታት",
      lead: "Yekis ብዛዕባ ፕሮፖዛላት፣ ክፍሊት ኤስክሮን መልእኽትታትን ከመይ ከፍልጠኩም ከም ዘለዎ ተቆጻጸሩ።",
      platformNotificationsLabel: "መፍለጢታት መድረኽን ኤስክሮን",
      platformNotificationsDesc:
        "ንኣቕርቦት ምዕራፍ፣ ክፍሊት ኤስክሮ፣ ክርክራትን ድሕነትን ኣገደስቲ መጠንቀቕታታት።",
      marketingCommunicationsLabel: "ዝማነታት ፍርያትን ምኽርታት ዕዳጋን",
      marketingCommunicationsDesc:
        "ብዛዕባ ሓደስቲ ምድባት ክእለት፣ ዝማነ ክፍሊትን መምርሒታትን ሓሓሊፎም ዝለኣኹ መፍለጢታት።",
      emailDigestNote:
        "ቅብሊታት ግብይትን ሕጋዊ መፍለጢታት ክርክርን ብዘየገድስ ምርጫ ማርኬቲንግ ምልኣኾም ይቕጽሉ።",
      telegramAlertsNote:
        "ዝተኣሳሰሩ ሕሳባት Telegram ንዝተኸፍሉ ምዕራፋትን መልእኽትታት ዕላልን ቅጽበታዊ መፍለጢ ይቕበሉ።",
      savePrefsBtn: "ምርጫታት መፍለጢ ዓቅብ",
      savingPrefsBtn: "ይዕቀብ ኣሎ...",
      prefsSaved: "ምርጫታት መፍለጢ ተሓዲሶም።",
      prefsSaveError: "ምርጫታት መፍለጢ ምሕዳስ ኣይተኻእለን።",
    },
    privacy: {
      eyebrow: "ተራእዮነትን ፍቓዳትን",
      heading: "ውልቃዊነትን ተራእዮነትን",
      lead: "ሕጋዊ ፍቓዳት መስርሕ ዳታ ገምግሙ እሞ ተራእዮነት መግለጺኹም ተቆጻጸሩ።",
      publicProfileLabel: "ህዝባዊ መዝገብ ዕዳጋ",
      publicProfileDesc:
        "ዝተረጋገጹ ዓማዊልን ድሌታት ዕዳጋን ህዝባዊ መግለጺኹም ክረኽብዎ ፍቐዱ።",
      analyticsConsentLabel: "ትንታነ ፍርያትን ቴሌሜትርን",
      analyticsConsentDesc:
        "ብዘይተፈለየ ሓበሬታ ኣጠቓቕማ ምትእስሳርን ቅልጣፈን Yekis ንምምሕያሽ ሓግዙ።",
      kycConsentTitle: "መስርሕ መረጋገጺ መንነትን KYCን",
      kycConsentDesc:
        "ብመሰረት ሕጊ ፋይናንስ ኢትዮጵያ ንዝተረጋገጹ ክፍሊታትን ዓበይቲ ውዕላትን የድሊ።",
      financialConsentTitle: "መስርሕ መዝገብ ኤስክሮን ግብርን",
      financialConsentDesc:
        "ንክፍሊታት ቴሌብር፣ CBE ብር፣ M-Pesaን ሕጋዊ ቅብሊታት ግብርን የድሊ።",
      savePrivacyBtn: "ምርጫታት ውልቃዊነት ዓቅብ",
      savingPrivacyBtn: "ይዕቀብ ኣሎ...",
      privacySaved: "ምርጫታት ውልቃዊነት ተዓቂቦም።",
      privacySaveError: "ምርጫታት ውልቃዊነት ምዕቃብ ኣይተኻእለን።",
    },
    data: {
      eyebrow: "መሰላት ሓለዋ ዳታ",
      heading: "ዳታን ሕሳብን",
      lead: "ቅዳሕ መዝገባትኩም ኣውርዱ ወይ ሕሳብኩም ንሓዋሩ ኣሰናኽሉ።",
      exportTitle: "ውልቃዊ ማህደር ዳታ ኣውጽእ",
      exportDesc:
        "መግለጺኹም፣ ውዕላትኩም፣ ፕሮፖዛላትኩም፣ መዝገብ ቦርሳኹምን መዝገብ ፍቓድኩምን ዝሓዘ ፋይል JSON ኣውርዱ።",
      exportBtn: "ማህደር JSON ኣውርድ",
      exportingBtn: "ይዳሎ ኣሎ...",
      exportSuccess: "ማህደር ዳታ ወሪዱ።",
      exportError: "መውጽኢ ዳታ ምፍጣር ኣይተኻእለን።",
      deactivateTitle: "ሕሳብ ኣሰናኽልን ሰርዝን",
      deactivateDesc:
        "ኩሎም ንጡፋት ውዕላት፣ ክርክራትን ቀሪ ሂሳብ ቦርሳን ምስ ተወድኡ ሕሳብኩም ዕጸዉ።",
      retentionNotice:
        "ሕጊ ንግድን ግብርን ኢትዮጵያ መዝገባት ኤስክሮን ቅብሊታትን ን10 ዓመታት ክዕቀቡ ይእዝዝ፤ ውልቃዊ መግለጺ ሓበሬታ ግን ይስረዝ።",
      openDeactivateBtn: "ምዕጻው ሕሳብ ገምግም",
    },
    deactivateDialog: {
      title: "ሕሳብ Yekis ኣሰናኽል",
      closeAria: "መስኮት ምዕጻው ሕሳብ ዕጸው",
      checkingBlockers:
        "ንጡፋት ውዕላት፣ ክርክራትን ቀሪ ቦርሳን ይምርመር ኣሎ...",
      blockersHeading: "ቅድሚ ምዕጻው ስጉምቲ የድሊ",
      blockersIntro: "እዚ ሕሳብ ቅድሚ ምዕጻዉ ነዞም ዝስዕቡ ወድኡ፦",
      erasureDoneHeading: "ሕሳብ ተዓጽዩ",
      erasureDoneDesc:
        "ውልቃዊ መግለጺኹም ስም-ኣልቦ ተገይሩን ኩሎም ንጡፋት ክፍለ ግዜታት ወጺኦምን እዮም።",
      retentionSummaryLabel: "ሕጋዊ ሓለዋ መዝገብ ፋይናንስ",
      warningBanner:
        "እዚ ስጉምቲ እዚ ሕሳብ Yekisኩም ንሓዋሩ ይዓጽዎ። ንምርግጋጽ ኣብ ታሕቲ DEACTIVATE ጽሓፉ።",
      confirmPhraseLabel: "ንምርግጋጽ DEACTIVATE ጽሓፍ",
      confirmPhrasePlaceholder: "DEACTIVATE",
      confirmPhraseError: "በጃኹም ንምርግጋጽ ብዓብዪ ፊደል DEACTIVATE ጽሓፉ።",
      reasonLabel: "ምኽንያት ምውጻእ (ኣማራጺ)",
      reasonPlaceholder: "እንታይ ክመሓየሽ ከም ዝኽእል ንገሩና...",
      passwordLabel: "ብመሕለፊ ቃልኩም ኣረጋግጹ (እንተሃልዩ)",
      passwordPlaceholder: "ናይ ሕጂ መሕለፊ ቃል ሕሳብ",
      submitBtn: "ሕሳብ ንሓዋሩ ኣሰናኽል",
      submittingBtn: "ሕሳብ ይዕጸው ኣሎ...",
      blockerCheckError: "ብቕዓት ምዕጻው ሕሳብ ምምርማር ኣይተኻእለን።",
      deactivateError: "ሕሳብ ምዕጻው ኣይተኻእለን።",
    },
    kycTiers: {
      UNVERIFIED: "ዘይተረጋገጸ",
      BASIC: "መሰረታዊ",
      FAYDA_VERIFIED: "ብፋይዳ ዝተረጋገጸ",
      BUSINESS_VERIFIED: "ንግዲ ዝተረጋገጸ",
    },
    kycStatuses: {
      NOT_SUBMITTED: "ኣይቀረበን",
      PENDING: "ኣብ ግምገማ",
      APPROVED: "ጸዲቑ",
      REJECTED: "ስጉምቲ የድሊ",
    },
  },
};
