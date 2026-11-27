import { useEffect, useId, useRef, useState } from "react";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Edit,
  ExternalLink,
  Flag,
  Lock,
  MessageSquare,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { api } from "./api/client";
import { YekisAvatar } from "./components/YekisAvatar";
import { type Language, useI18n } from "./i18n";
import { loadLocalPortfolio } from "./ProfileEditPage";
import { localizeSkillName } from "./lib/skillLabels";
import "./ProfilePage.css";

type ProfilePageCopy = {
  kycTier3: string;
  kycTier2: string;
  kycTier1: string;
  kycVerified: string;
  portfolioPlaceholderFallback: string;
  demoCaseStudy: (name: string) => string;
  demoPortfolioDesc: (url: string) => string;
  earnedNew: string;
  loadErrorGeneric: string;
  privateProfileError: string;
  failedSubmitReport: string;
  messageBtn: string;
  skillsRailAria: string;
  primaryBadge: string;
  noSkillsYet: string;
  verificationLabel: string;
  unverifiedLabel: string;
  availabilityLabel: string;
  unavailableLabel: string;
  limitedTitle: string;
  limitedDesc: string;
  viewProject: string;
  ratingAria: (rating: number) => string;
  responseLabel: string;
  reportModalTitle: string;
  closeDialogAria: string;
  reportSuccess: string;
  doneBtn: string;
  reportPrompt: string;
  reasonLabel: string;
  selectReason: string;
  reasons: {
    FAKE_IDENTITY: string;
    MISLEADING_SKILLS: string;
    OFF_PLATFORM_CONTACT: string;
    OFFENSIVE_CONTENT: string;
    SPAM: string;
    OTHER: string;
  };
  detailsLabel: string;
  detailsPlaceholder: string;
  cancelBtn: string;
  submittingBtn: string;
  submitReportBtn: string;
};

const PROFILE_PAGE_COPY: Record<Language, ProfilePageCopy> = {
  en: {
    kycTier3: "Fayda Tier 3 Verified",
    kycTier2: "Fayda Tier 2 Verified",
    kycTier1: "Fayda Tier 1 Verified",
    kycVerified: "Identity Verified",
    portfolioPlaceholderFallback: "P",
    demoCaseStudy: (name) => `${name} Case Study`,
    demoPortfolioDesc: (url) => `Published portfolio project at ${url}`,
    earnedNew: "New",
    loadErrorGeneric: "Could not load this profile.",
    privateProfileError: "This profile is private.",
    failedSubmitReport: "Failed to submit report",
    messageBtn: "Message",
    skillsRailAria: "Skills and credentials",
    primaryBadge: "Primary",
    noSkillsYet: "No skills listed yet.",
    verificationLabel: "Verification",
    unverifiedLabel: "Unverified",
    availabilityLabel: "Availability",
    unavailableLabel: "Unavailable",
    limitedTitle: "Limited Profile View",
    limitedDesc: "This member limits full bio, portfolio, and contract history to clients they submit proposals to or collaborate with under an active contract.",
    viewProject: "View project",
    ratingAria: (rating) => `${rating} out of 5 stars`,
    responseLabel: "Response",
    reportModalTitle: "Report Profile",
    closeDialogAria: "Close dialog",
    reportSuccess: "Thank you. Our compliance team will review your report.",
    doneBtn: "Done",
    reportPrompt: "Why are you reporting this profile?",
    reasonLabel: "Reason",
    selectReason: "Select a reason...",
    reasons: {
      FAKE_IDENTITY: "Fake identity or impersonation",
      MISLEADING_SKILLS: "Misleading skills or portfolio",
      OFF_PLATFORM_CONTACT: "Off-platform payment or contact request",
      OFFENSIVE_CONTENT: "Offensive or inappropriate content",
      SPAM: "Spam or deceptive behavior",
      OTHER: "Other",
    },
    detailsLabel: "Details",
    detailsPlaceholder: "Please provide specific details (at least 5 characters)...",
    cancelBtn: "Cancel",
    submittingBtn: "Submitting...",
    submitReportBtn: "Submit Report",
  },
  am: {
    kycTier3: "ፋይዳ ደረጃ 3 የተረጋገጠ",
    kycTier2: "ፋይዳ ደረጃ 2 የተረጋገጠ",
    kycTier1: "ፋይዳ ደረጃ 1 የተረጋገጠ",
    kycVerified: "ማንነት የተረጋገጠ",
    portfolioPlaceholderFallback: "P",
    demoCaseStudy: (name) => `የ${name} የሥራ ምሳሌ`,
    demoPortfolioDesc: (url) => `የታተመ የፖርትፎሊዮ ፕሮጀክት በ${url}`,
    earnedNew: "አዲስ",
    loadErrorGeneric: "ይህን መገለጫ መጫን አልተቻለም።",
    privateProfileError: "ይህ መገለጫ የግል ነው።",
    failedSubmitReport: "ሪፖርቱን መላክ አልተቻለም",
    messageBtn: "መልዕክት",
    skillsRailAria: "ክህሎቶች እና ማስረጃዎች",
    primaryBadge: "ዋና",
    noSkillsYet: "እስካሁን ምንም ክህሎት አልተዘረዘረም።",
    verificationLabel: "ማረጋገጫ",
    unverifiedLabel: "ያልተረጋገጠ",
    availabilityLabel: "ዝግጁነት",
    unavailableLabel: "ዝግጁ አይደለም",
    limitedTitle: "ውስን የመገለጫ ዕይታ",
    limitedDesc: "ይህ አባል ሙሉ መግለጫ፣ ፖርትፎሊዮ እና የውል ታሪክን የሚያሳየው የሥራ ሐሳብ ለላከላቸው ወይም ንቁ ውል ላላቸው ደንበኞች ብቻ ነው።",
    viewProject: "ፕሮጀክቱን ይመልከቱ",
    ratingAria: (rating) => `ከ5 ኮከቦች ${rating}`,
    responseLabel: "ምላሽ",
    reportModalTitle: "መገለጫ ሪፖርት ያድርጉ",
    closeDialogAria: "መስኮቱን ዝጋ",
    reportSuccess: "እናመሰግናለን። የተገዢነት ቡድናችን ሪፖርትዎን ይገመግማል።",
    doneBtn: "ተከናውኗል",
    reportPrompt: "ይህን መገለጫ ለምን ሪፖርት ያደርጋሉ?",
    reasonLabel: "ምክንያት",
    selectReason: "ምክንያት ይምረጡ...",
    reasons: {
      FAKE_IDENTITY: "ሐሰተኛ ማንነት ወይም ማስመሰል",
      MISLEADING_SKILLS: "አሳሳች ክህሎቶች ወይም ፖርትፎሊዮ",
      OFF_PLATFORM_CONTACT: "ከመድረክ ውጭ ክፍያ ወይም መገናኛ መጠየቅ",
      OFFENSIVE_CONTENT: "አስነዋሪ ወይም ተገቢ ያልሆነ ይዘት",
      SPAM: "ስፓም ወይም አታላይ ባህሪ",
      OTHER: "ሌላ",
    },
    detailsLabel: "ዝርዝሮች",
    detailsPlaceholder: "እባክዎ ግልጽ ዝርዝሮችን ያቅርቡ (ቢያንስ 5 ፊደላት)...",
    cancelBtn: "ሰርዝ",
    submittingBtn: "በማቅረብ ላይ...",
    submitReportBtn: "ሪፖርት ላክ",
  },
  om: {
    kycTier3: "Fayda Sadarkaa 3 Mirkanaa'e",
    kycTier2: "Fayda Sadarkaa 2 Mirkanaa'e",
    kycTier1: "Fayda Sadarkaa 1 Mirkanaa'e",
    kycVerified: "Eenyummaan Mirkanaa'eera",
    portfolioPlaceholderFallback: "P",
    demoCaseStudy: (name) => `Qorannoo Hojii ${name}`,
    demoPortfolioDesc: (url) => `Pirojektii poortifooliyoo maxxanfame: ${url}`,
    earnedNew: "Haaraa",
    loadErrorGeneric: "Piroofaayilii kana fe'uun hin danda'amne.",
    privateProfileError: "Piroofaayiliin kun dhuunfaa dha.",
    failedSubmitReport: "Gabaasa erguun hin danda'amne",
    messageBtn: "Ergaa",
    skillsRailAria: "Ogummaalee fi ragaalee",
    primaryBadge: "Ijoo",
    noSkillsYet: "Ogummaan tokkollee ammaaf hin tarreeffamne.",
    verificationLabel: "Mirkaneessa",
    unverifiedLabel: "Hin mirkanoofne",
    availabilityLabel: "Qophii ta'uu",
    unavailableLabel: "Qophii miti",
    limitedTitle: "Ilaalcha Piroofaayilii Daangeffame",
    limitedDesc: "Miseensi kun ibsa guutuu, poortifooliyoo fi seenaa waliigaltee maamiltoota yaada hojii ergeef ykn waliigaltee hojiirra jiru waliin qabu qofaaf daangessa.",
    viewProject: "Pirojektii ilaali",
    ratingAria: (rating) => `Urjii 5 keessaa ${rating}`,
    responseLabel: "Deebii",
    reportModalTitle: "Piroofaayilii Gabaasi",
    closeDialogAria: "Foddaa cufi",
    reportSuccess: "Galatoomaa. Gareen seera-kabachiisaa keenya gabaasa keessan ni ilaala.",
    doneBtn: "Xumurame",
    reportPrompt: "Piroofaayilii kana maaliif gabaastu?",
    reasonLabel: "Sababa",
    selectReason: "Sababa filadhaa...",
    reasons: {
      FAKE_IDENTITY: "Eenyummaa sobaa ykn fakkeessuu",
      MISLEADING_SKILLS: "Ogummaa ykn poortifooliyoo dogoggorsaa",
      OFF_PLATFORM_CONTACT: "Gaaffii kaffaltii ykn qunnamtii waltajjii alaa",
      OFFENSIVE_CONTENT: "Qabiyyee arrabsoo ykn hin malle",
      SPAM: "Isppaamii ykn amala gowwoomsaa",
      OTHER: "Kan biraa",
    },
    detailsLabel: "Bal'ina",
    detailsPlaceholder: "Maaloo bal'ina addaa kennaa (xiqqaate arfiilee 5)...",
    cancelBtn: "Haqi",
    submittingBtn: "Ergaa jira...",
    submitReportBtn: "Gabaasa Ergi",
  },
  ti: {
    kycTier3: "ፋይዳ ደረጃ 3 ዝተረጋገጸ",
    kycTier2: "ፋይዳ ደረጃ 2 ዝተረጋገጸ",
    kycTier1: "ፋይዳ ደረጃ 1 ዝተረጋገጸ",
    kycVerified: "መንነት ዝተረጋገጸ",
    portfolioPlaceholderFallback: "P",
    demoCaseStudy: (name) => `ኣብነት ስራሕ ${name}`,
    demoPortfolioDesc: (url) => `ዝተሓትመ ፕሮጀክት ፖርትፎልዮ ኣብ ${url}`,
    earnedNew: "ሓድሽ",
    loadErrorGeneric: "ነዚ ፕሮፋይል ምጽዓን ኣይተኻእለን።",
    privateProfileError: "እዚ ፕሮፋይል ብሕታዊ እዩ።",
    failedSubmitReport: "ጸብጻብ ምልኣኽ ኣይተኻእለን",
    messageBtn: "መልእኽቲ",
    skillsRailAria: "ክእለታትን መረጋገጺታትን",
    primaryBadge: "ቀንዲ",
    noSkillsYet: "ክሳብ ሕጂ ዝተዘርዘረ ክእለት የለን።",
    verificationLabel: "ምርግጋጽ",
    unverifiedLabel: "ዘይተረጋገጸ",
    availabilityLabel: "ድሉውነት",
    unavailableLabel: "ድሉው ኣይኮነን",
    limitedTitle: "ውሱን ርኢት ፕሮፋይል",
    limitedDesc: "እዚ ኣባል ሙሉእ መግለጺ፣ ፖርትፎልዮን ታሪኽ ውዕልን ንዝለኣኸሎም እማመ ወይ ንጡፍ ውዕል ንዘለዎም ዓማዊል ጥራይ ይውስን።",
    viewProject: "ፕሮጀክት ርአ",
    ratingAria: (rating) => `ካብ 5 ኮኾብ ${rating}`,
    responseLabel: "ምላሽ",
    reportModalTitle: "ፕሮፋይል ጸብጽብ",
    closeDialogAria: "መስኮት ዕጾ",
    reportSuccess: "የቐንየልና። ጉጅለ ተገዛእነትና ጸብጻብኩም ክግምግሞ እዩ።",
    doneBtn: "ተዛዚሙ",
    reportPrompt: "ነዚ ፕሮፋይል ስለምንታይ ትጽብጽብዎ?",
    reasonLabel: "ምኽንያት",
    selectReason: "ምኽንያት ምረጹ...",
    reasons: {
      FAKE_IDENTITY: "ናይ ሓሶት መንነት ወይ ምምሳል",
      MISLEADING_SKILLS: "ዘደናግሩ ክእለታት ወይ ፖርትፎልዮ",
      OFF_PLATFORM_CONTACT: "ካብ መድረኽ ወጻኢ ክፍሊት ወይ ርክብ ምሕታት",
      OFFENSIVE_CONTENT: "ጸያፍ ወይ ዘይግቡእ ትሕዝቶ",
      SPAM: "ስፓም ወይ መታለሊ ጠባይ",
      OTHER: "ካልእ",
    },
    detailsLabel: "ዝርዝራት",
    detailsPlaceholder: "በጃኹም ንጹር ዝርዝራት ሃቡ (ብውሑዱ 5 ፊደላት)...",
    cancelBtn: "ሰርዝ",
    submittingBtn: "የቕርብ ኣሎ...",
    submitReportBtn: "ጸብጻብ ስደድ",
  },
};

// Shape mirrors backend profile.service.ts getPublicProfile()
interface SkillRef {
  id: string;
  nameEn?: string;
  nameAm?: string;
  name?: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  projectUrl?: string | null;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  reviewerName?: string | null;
  response?: string | null;
}

interface PublicProfileData {
  id: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isAvailableForWork?: boolean;
  primarySkillId?: string | null;
  skills: SkillRef[];
  portfolio?: PortfolioItem[];
  kyc?: { tier: string; status: string; badgeType: string | null } | null;
  stats?: {
    jobsCompleted: number;
    rating: { average: number | null; count: number };
    earnedRange: string;
    memberSince: string;
  };
  isOwnProfile: boolean;
  canViewFullProfile: boolean;
}

function isValidHttpUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatKycTierLabel(tier: string, language: Language = "en"): string {
  const c = PROFILE_PAGE_COPY[language] ?? PROFILE_PAGE_COPY.en;
  switch (tier) {
    case "TIER_3":
      return c.kycTier3;
    case "TIER_2":
      return c.kycTier2;
    case "TIER_1":
      return c.kycTier1;
    default:
      return c.kycVerified;
  }
}

function PortfolioThumbnail({
  src,
  title,
  fallbackChar = "P",
}: {
  src?: string | null;
  title: string;
  fallbackChar?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="pv-portfolio-placeholder" aria-hidden="true">
        <span>{title.trim().charAt(0).toUpperCase() || fallbackChar}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className="pv-portfolio-img"
      onError={() => setFailed(true)}
    />
  );
}

export const ProfilePage = ({
  userId = "me",
  onProfileLoaded,
  onOpenChat,
  onEditProfile,
}: {
  userId?: string;
  /**
   * Reports who was loaded.
   *
   * The shell needs it to say the person's name instead of "My Profile" over
   * somebody else's page. It is a callback rather than a prop the shell
   * passes down, because only the profile knows the name it fetched.
   */
  onProfileLoaded?: (profile: { id: string; displayName: string }) => void;
  onOpenChat?: (userId: string, userName?: string) => void;
  onEditProfile?: () => void;
}) => {
  const { t, language: lang } = useI18n();
  const pr = t.workspace.profile;
  const copy = PROFILE_PAGE_COPY[lang] ?? PROFILE_PAGE_COPY.en;
  const uid = useId();

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const reportDialogRef = useRef<HTMLDialogElement | null>(null);

  /**
   * The callback in a ref, so a new function identity on every render does
   * not re-fetch the profile.
   */
  const onProfileLoadedRef = useRef(onProfileLoaded);
  useEffect(() => {
    onProfileLoadedRef.current = onProfileLoaded;
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      api.getPublicProfile(userId),
      api.getReviews(userId).catch(() => []),
    ])
      .then(([profileRes, reviewsRes]) => {
        if (cancelled) return;
        const loaded = profileRes as unknown as PublicProfileData;
        setProfile(loaded);
        onProfileLoadedRef.current?.({
          id: loaded.id,
          displayName: loaded.displayName,
        });
        const r = reviewsRes as { items?: ReviewItem[] } | ReviewItem[] | null;
        setReviews(Array.isArray(r) ? r : (r?.items ?? []));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : copy.loadErrorGeneric;
        setLoadError(
          message.toLowerCase().includes("private")
            ? copy.privateProfileError
            : message,
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [copy.loadErrorGeneric, copy.privateProfileError, lang, userId]);

  // Native <dialog> modal lifecycle + Safari light-dismiss fallback (when closedBy is missing)
  useEffect(() => {
    const dialog = reportDialogRef.current;
    if (!dialog) return;

    if (reportModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!reportModalOpen && dialog.open) {
      dialog.close();
    }
  }, [reportModalOpen]);

  useEffect(() => {
    const dialog = reportDialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setReportModalOpen(false);
    };
    dialog.addEventListener("close", handleClose);

    // Fallback light dismiss when <dialog closedby="any"> is unsupported
    const supportsClosedBy = "closedBy" in HTMLDialogElement.prototype;
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!supportsClosedBy) pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (!supportsClosedBy && pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    if (!supportsClosedBy) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (!supportsClosedBy) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="profile-view-page">
        <div className="pv-skeleton-wrap">
          <div className="pv-masthead">
            <div className="pv-identity">
              <div
                className="sh-skeleton"
                style={{ width: 88, height: 88, borderRadius: "50%" }}
              />
              <div style={{ display: "grid", gap: 8, flex: 1, maxWidth: 300 }}>
                <div className="sh-skeleton" style={{ height: 24, width: "65%" }} />
                <div className="sh-skeleton" style={{ height: 15, width: "45%" }} />
              </div>
            </div>
          </div>
          <div className="pv-board">
            <div className="pv-rail">
              <div className="sh-skeleton" style={{ height: 120, width: "100%" }} />
            </div>
            <div className="pv-canvas">
              <div className="sh-skeleton" style={{ height: 90, width: "100%" }} />
              <div className="sh-skeleton" style={{ height: 150, width: "100%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="profile-error" role="alert">
        {loadError}
      </div>
    );
  }
  if (!profile) return null;

  const skillName = (s: SkillRef) => localizeSkillName(s, lang);
  const primarySkill = profile.skills.find(
    (s) => s.id === profile.primarySkillId,
  );
  const orderedSkills = primarySkill
    ? [
        primarySkill,
        ...profile.skills.filter((s) => s.id !== primarySkill.id),
      ]
    : profile.skills;

  const memberSinceYear = profile.stats?.memberSince
    ? new Date(profile.stats.memberSince).getFullYear()
    : null;

  const localPortfolio = loadLocalPortfolio(profile.id);
  const fallbackPortfolio =
    localPortfolio.length > 0 ? localPortfolio : loadLocalPortfolio("me");
  const serverPortfolio = profile.portfolio ?? [];
  const effectivePortfolio: PortfolioItem[] =
    serverPortfolio.length > 0
      ? serverPortfolio
      : profile.isOwnProfile || userId === "me"
        ? fallbackPortfolio
        : [];

  const isKycVerified = profile.kyc?.status === "VERIFIED";
  const isHighTierKyc =
    isKycVerified &&
    (profile.kyc?.tier === "TIER_2" || profile.kyc?.tier === "TIER_3");

  const openReportDialog = () => {
    setReportDone(false);
    setReportError(null);
    setReportReason("");
    setReportDetails("");
    setReportModalOpen(true);
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);
    setReportSending(true);
    try {
      await api.reportProfile(
        profile.id,
        reportReason || "OTHER",
        reportDetails.trim(),
      );
      setReportDone(true);
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : copy.failedSubmitReport,
      );
    } finally {
      setReportSending(false);
    }
  };

  const ratingAverage = profile.stats?.rating?.average ?? null;
  const ratingCount = profile.stats?.rating?.count ?? 0;

  return (
    <div className="profile-view-page">
      {/* ── Top Board Identity Masthead (Directly on Website Background Board) ── */}
      <header className="pv-masthead" data-tour="profile-masthead">
        <div className="pv-identity">
          <YekisAvatar
            userId={profile.id || userId}
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
            size={88}
            animate="hover"
            className="pv-avatar"
          />

          <div className="pv-identity-copy">
            <div className="pv-name-row">
              <h1 className="pv-name">{profile.displayName}</h1>
              {isKycVerified && profile.kyc && (
                <span
                  className={`pv-kyc-status ${isHighTierKyc ? "is-gold" : "is-verified"}`}
                >
                  {isHighTierKyc ? (
                    <ShieldCheck size={16} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  )}
                  <span>{formatKycTierLabel(profile.kyc.tier, lang)}</span>
                </span>
              )}
            </div>

            <div className="pv-submeta">
              {primarySkill && (
                <span className="pv-primary-role">
                  <Briefcase size={15} aria-hidden="true" />
                  <span>{skillName(primarySkill)}</span>
                </span>
              )}
              {profile.isAvailableForWork && (
                <span className="pv-availability-text">
                  {pr.availableForWorkTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.canViewFullProfile && profile.stats && (
          <dl className="pv-kpi-strip" aria-label={pr.overviewTitle}>
            <div className="pv-kpi-cell">
              <dt>{pr.ratingLabel}</dt>
              <dd className="sh-mono">
                <Star
                  size={15}
                  className={ratingAverage !== null ? "icon-star" : "pv-muted-icon"}
                  aria-hidden="true"
                />
                <span>
                  {ratingAverage !== null ? ratingAverage.toFixed(1) : "—"}
                </span>
                {ratingCount > 0 && (
                  <span className="pv-kpi-sub">({ratingCount})</span>
                )}
              </dd>
            </div>

            <div className="pv-kpi-cell">
              <dt>{pr.jobsLabel}</dt>
              <dd className="sh-mono">{profile.stats.jobsCompleted ?? 0}</dd>
            </div>

            <div className="pv-kpi-cell">
              <dt>{pr.earnedLabel}</dt>
              <dd className="sh-mono">{profile.stats.earnedRange ?? "—"}</dd>
            </div>

            <div className="pv-kpi-cell">
              <dt>{pr.memberSinceLabel}</dt>
              <dd className="sh-mono">{memberSinceYear ?? "—"}</dd>
            </div>
          </dl>
        )}

        {((profile.isOwnProfile && onEditProfile) || !profile.isOwnProfile) && (
          <div className="pv-actions">
            {profile.isOwnProfile && onEditProfile ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="sh-btn sh-btn-secondary pv-action-btn pv-edit-btn"
              >
                <Edit size={15} aria-hidden="true" />
                <span>{pr.editProfileBtn}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenChat?.(profile.id, profile.displayName)}
                  className="sh-btn sh-btn-primary rounded-lg pv-action-btn"
                >
                  <MessageSquare size={15} aria-hidden="true" />
                  <span>{copy.messageBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={openReportDialog}
                  className="report-btn rounded-lg pv-action-btn"
                >
                  <Flag size={15} aria-hidden="true" />
                  <span>{pr.reportProfileBtn}</span>
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── Two-Column Board Content Grid (Aligned with ProfileEditPage) ── */}
      <div className="pv-board">
        {/* Left Column: Skills & Trust Metadata */}
        <aside className="pv-rail" aria-label={copy.skillsRailAria} data-tour="profile-skills-rail">
          <section className="pv-rail-section" aria-labelledby={`${uid}-skills`}>
            <div className="pv-section-head">
              <h2 id={`${uid}-skills`} className="pv-rail-heading">
                {pr.skillsTitle}
              </h2>
              {orderedSkills.length > 0 && (
                <span className="pv-section-count sh-mono">
                  {orderedSkills.length}
                </span>
              )}
            </div>

            {orderedSkills.length > 0 ? (
              <ul className="pv-skills-list">
                {orderedSkills.map((s) => {
                  const isPrimary = s.id === profile.primarySkillId;
                  return (
                    <li
                      key={s.id}
                      className={`pv-skill-chip ${isPrimary ? "is-primary" : ""}`}
                    >
                      <span>{skillName(s)}</span>
                      {isPrimary && (
                        <span className="pv-skill-primary-note">{copy.primaryBadge}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="pv-empty-note">{copy.noSkillsYet}</p>
            )}
          </section>

          <hr className="pv-rail-rule" />

          <section className="pv-rail-section" aria-labelledby={`${uid}-creds`}>
            <h2 id={`${uid}-creds`} className="pv-rail-heading">
              {pr.overviewTitle}
            </h2>

            <dl className="pv-meta-rows">
              <div className="pv-meta-row">
                <dt>{copy.verificationLabel}</dt>
                <dd
                  className={`pv-meta-status ${isKycVerified ? "is-verified" : ""}`}
                >
                  {isKycVerified && profile.kyc
                    ? formatKycTierLabel(profile.kyc.tier, lang)
                    : copy.unverifiedLabel}
                </dd>
              </div>

              <div className="pv-meta-row">
                <dt>{copy.availabilityLabel}</dt>
                <dd
                  className={`pv-meta-status ${profile.isAvailableForWork ? "is-open" : ""}`}
                >
                  {profile.isAvailableForWork
                    ? pr.availableForWorkTitle
                    : copy.unavailableLabel}
                </dd>
              </div>

              {memberSinceYear && (
                <div className="pv-meta-row">
                  <dt>
                    <Calendar size={14} aria-hidden="true" />
                    <span>{pr.memberSinceLabel}</span>
                  </dt>
                  <dd className="sh-mono">{memberSinceYear}</dd>
                </div>
              )}

              {profile.canViewFullProfile && (
                <div className="pv-meta-row">
                  <dt>{pr.reviewsTitle}</dt>
                  <dd className="sh-mono">{reviews.length}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>

        {/* Right Column: Bio, Portfolio Showcase, and Client Reviews */}
        <div className="pv-canvas" data-tour="profile-canvas">
          {!profile.canViewFullProfile ? (
            <section className="pv-section">
              <div className="pv-restricted-notice">
                <Lock size={18} aria-hidden="true" />
                <div>
                  <h2 className="pv-section-title">{copy.limitedTitle}</h2>
                  <p className="pv-section-desc">
                    {copy.limitedDesc}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* About Me */}
              <section className="pv-section" aria-labelledby={`${uid}-about`}>
                <h2 id={`${uid}-about`} className="pv-section-title">
                  {pr.aboutMeTitle}
                </h2>
                <p className={`pv-bio-prose ${!profile.bio ? "is-empty" : ""}`}>
                  {profile.bio || pr.noBioYet}
                </p>
              </section>

              <hr className="pv-section-rule" />

              {/* Portfolio Projects */}
              <section
                className="pv-section"
                aria-labelledby={`${uid}-portfolio`}
              >
                <div className="pv-section-head">
                  <h2 id={`${uid}-portfolio`} className="pv-section-title">
                    {pr.portfolioTitle}
                  </h2>
                  {effectivePortfolio.length > 0 && (
                    <span className="pv-section-count sh-mono">
                      {effectivePortfolio.length}
                    </span>
                  )}
                </div>

                {effectivePortfolio.length > 0 ? (
                  <div className="pv-portfolio-grid">
                    {effectivePortfolio.map((item) => (
                      <article key={item.id} className="pv-portfolio-item">
                        <div className="pv-portfolio-media">
                          <PortfolioThumbnail
                            src={item.thumbnailUrl}
                            title={item.title}
                            fallbackChar={copy.portfolioPlaceholderFallback}
                          />
                        </div>
                        <div className="pv-portfolio-body">
                          <h3 className="pv-portfolio-title">{item.title}</h3>
                          {item.description && (
                            <p className="pv-portfolio-desc">
                              {item.description}
                            </p>
                          )}
                          {isValidHttpUrl(item.projectUrl) && (
                            <a
                              href={item.projectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pv-portfolio-link"
                            >
                              <span>{copy.viewProject}</span>
                              <ExternalLink size={13} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="pv-empty-portfolio">
                    <strong>{pr.noPortfolioYet}</strong>
                    <p>{pr.noPortfolioHint}</p>
                  </div>
                )}
              </section>

              {reviews.length > 0 && (
                <>
                  <hr className="pv-section-rule" />

                  <section
                    className="pv-section"
                    aria-labelledby={`${uid}-reviews`}
                  >
                    <div className="pv-section-head">
                      <h2 id={`${uid}-reviews`} className="pv-section-title">
                        {pr.reviewsTitle}
                      </h2>
                      <span className="pv-section-count sh-mono">
                        {reviews.length}
                      </span>
                    </div>

                    <ul className="pv-reviews-list">
                      {reviews.map((review) => (
                        <li key={review.id} className="pv-review-item">
                          <div className="pv-review-header">
                            <div
                              className="review-rating"
                              role="img"
                              aria-label={copy.ratingAria(review.rating)}
                            >
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={15}
                                  aria-hidden="true"
                                  className={
                                    i < review.rating ? "filled" : "empty"
                                  }
                                />
                              ))}
                            </div>
                            <div className="pv-review-meta">
                              {review.reviewerName && (
                                <strong className="pv-reviewer-name">
                                  {review.reviewerName}
                                </strong>
                              )}
                              {review.createdAt && (
                                <time
                                  className="review-date sh-mono"
                                  dateTime={review.createdAt}
                                >
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString()}
                                </time>
                              )}
                            </div>
                          </div>

                          {review.comment && (
                            <p className="pv-review-comment">
                              {review.comment}
                            </p>
                          )}

                          {review.response && (
                            <div className="pv-review-response">
                              <strong>{copy.responseLabel}</strong>
                              <p>{review.response}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Native <dialog> Report Profile Modal */}
      <dialog
        ref={reportDialogRef}
        className="pv-report-dialog"
        aria-labelledby={`${uid}-report-title`}
        {...({ closedby: "any" } as Record<string, string>)}
      >
        <div className="pv-dialog-header">
          <h2 id={`${uid}-report-title`}>{copy.reportModalTitle}</h2>
          <button
            type="button"
            onClick={() => reportDialogRef.current?.close()}
            className="close-btn"
            aria-label={copy.closeDialogAria}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {reportDone ? (
          <div className="pv-dialog-body">
            <p className="modal-desc" role="status">
              {copy.reportSuccess}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => reportDialogRef.current?.close()}
                className="btn-primary rounded-lg"
                autoFocus
              >
                {copy.doneBtn}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitReport} className="pv-dialog-body">
            <p className="modal-desc">
              {copy.reportPrompt}
            </p>

            <div className="pv-dialog-field">
              <label htmlFor={`${uid}-report-reason`}>{copy.reasonLabel}</label>
              <select
                id={`${uid}-report-reason`}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
                autoFocus
              >
                <option value="">{copy.selectReason}</option>
                <option value="FAKE_IDENTITY">
                  {copy.reasons.FAKE_IDENTITY}
                </option>
                <option value="MISLEADING_SKILLS">
                  {copy.reasons.MISLEADING_SKILLS}
                </option>
                <option value="OFF_PLATFORM_CONTACT">
                  {copy.reasons.OFF_PLATFORM_CONTACT}
                </option>
                <option value="OFFENSIVE_CONTENT">
                  {copy.reasons.OFFENSIVE_CONTENT}
                </option>
                <option value="SPAM">{copy.reasons.SPAM}</option>
                <option value="OTHER">{copy.reasons.OTHER}</option>
              </select>
            </div>

            <div className="pv-dialog-field">
              <label htmlFor={`${uid}-report-details`}>{copy.detailsLabel}</label>
              <textarea
                id={`${uid}-report-details`}
                rows={4}
                maxLength={1000}
                required
                minLength={5}
                placeholder={copy.detailsPlaceholder}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>

            {reportError && (
              <p className="report-error" role="alert">
                {reportError}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => reportDialogRef.current?.close()}
                className="btn-secondary rounded-lg"
              >
                {copy.cancelBtn}
              </button>
              <button
                type="submit"
                disabled={
                  reportSending ||
                  !reportReason ||
                  reportDetails.trim().length < 5
                }
                className="btn-danger rounded-lg"
              >
                {reportSending ? copy.submittingBtn : copy.submitReportBtn}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
};
