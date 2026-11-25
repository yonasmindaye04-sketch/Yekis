import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Bookmark,
  Share2,
  ArrowRight,
  ChevronLeft,
  X,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  MessageSquare,
  ExternalLink,
  Star,
  CheckCircle,
} from "lucide-react";
import { api } from "./api/client";
import { useI18n } from "./i18n";
import { FEATURED_CAROUSEL_COPY } from "./featuredCarouselCopy";
import { localizeSkillName } from "./lib/skillLabels";

export interface TalentReview {
  name: string;
  stars: number;
  date: string;
  text: string;
}

export interface TalentItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  primarySkill: { id: string; nameEn?: string; nameAm?: string } | null;
  skills?: string[];
  roleTitle?: string;
  ratingAverage: number | null;
  ratingCount?: number;
  totalJobsCompleted: number;
  onTimePercent?: number | string | null;
  hourlyRateETB?: number;
  location?: string;
  languages?: string;
  memberSince?: string;
  verifiedOn?: string;
  kycBadge?: string | null;
  kycTier?: number;
  isAvailableForWork?: boolean;
  responseTime?: string;
  portfolioUrl?: string | null;
  about?: string;
  reviews?: TalentReview[];
  hue?: number;
  isNew?: boolean;
}

const SAVED_TALENTS_KEY = "yekis_saved_talents";

function getSavedTalentIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SAVED_TALENTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistSavedTalentIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_TALENTS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage error
  }
}

// Built-in verified talent profiles (Ethiopian talent showcase matching prototype)
export const DEMO_TALENTS: TalentItem[] = [
  {
    id: "demo-selam",
    displayName: "Selam Tadesse",
    roleTitle: "Content & Translation Specialist",
    hue: 160,
    avatarUrl: null,
    primarySkill: { id: "sk-writing", nameEn: "Content Writing" },
    skills: ["Content Writing", "Translation", "Virtual Assistance"],
    portfolioUrl: "selam.myportfolio.com",
    isNew: true,
    kycBadge: "shield",
    kycTier: 1,
    ratingAverage: null,
    ratingCount: 0,
    totalJobsCompleted: 0,
    onTimePercent: null,
    hourlyRateETB: 850,
    isAvailableForWork: true,
    responseTime: "~1 hr",
    location: "Addis Ababa",
    languages: "Amharic, English",
    memberSince: "Nov 2026",
    verifiedOn: "Nov 12, 2026",
    about:
      "Detail-oriented freelancer focused on clear communication and on-time delivery. I help clients with content creation, English-Amharic translation, and day-to-day business administration. Ready for my first contracts on Yekis.",
    reviews: [],
  },
  {
    id: "demo-dawit",
    displayName: "Dawit Tesfaye",
    roleTitle: "Full-stack Web Developer",
    hue: 210,
    avatarUrl: null,
    primarySkill: { id: "sk-react", nameEn: "React & Node.js" },
    skills: ["React", "Node.js", "REST APIs"],
    portfolioUrl: "dawit.dev",
    isNew: true,
    kycBadge: "shield",
    kycTier: 1,
    ratingAverage: null,
    ratingCount: 0,
    totalJobsCompleted: 0,
    onTimePercent: null,
    hourlyRateETB: 1200,
    isAvailableForWork: true,
    responseTime: "~2 hrs",
    location: "Addis Ababa",
    languages: "Amharic, English",
    memberSince: "Nov 2026",
    verifiedOn: "Nov 10, 2026",
    about:
      "Web developer helping small businesses and startups build fast, modern websites and dashboards. Comfortable across the entire stack — from responsive front-ends to APIs, database design, and cloud deployment.",
    reviews: [],
  },
  {
    id: "demo-hanna",
    displayName: "Hanna Bekele",
    roleTitle: "Senior UI/UX Designer",
    hue: 265,
    avatarUrl: null,
    primarySkill: { id: "sk-design", nameEn: "UI/UX Design" },
    skills: ["Figma", "Design Systems", "Prototyping"],
    portfolioUrl: "hannabekele.design",
    isNew: false,
    kycBadge: "shield",
    kycTier: 2,
    ratingAverage: 4.9,
    ratingCount: 31,
    totalJobsCompleted: 34,
    onTimePercent: "98%",
    hourlyRateETB: 1650,
    isAvailableForWork: true,
    responseTime: "~1 hr",
    location: "Addis Ababa",
    languages: "Amharic, English, French",
    memberSince: "Mar 2025",
    verifiedOn: "Mar 3, 2025",
    about:
      "Product designer with 6+ years of experience shipping fintech and marketplace products. I specialise in design systems and end-to-end user flows — from discovery research to polished, developer-ready Figma handoff.",
    reviews: [
      {
        name: "Liya G.",
        stars: 5,
        date: "Oct 2026",
        text: "Hanna redesigned our entire client dashboard in three weeks. Clear communication, thoughtful questions, and a handoff our developers genuinely enjoyed working from.",
      },
      {
        name: "Samuel K.",
        stars: 5,
        date: "Sep 2026",
        text: "Pixel-perfect work and great product instincts. She suggested several user flow improvements that reduced drop-off.",
      },
    ],
  },
  {
    id: "demo-yonas",
    displayName: "Yonas Alemu",
    roleTitle: "Full-stack Cloud Engineer",
    hue: 25,
    avatarUrl: null,
    primarySkill: { id: "sk-cloud", nameEn: "Cloud & Backend" },
    skills: ["TypeScript", "Next.js", "PostgreSQL"],
    portfolioUrl: "yonasalemu.dev",
    isNew: false,
    kycBadge: "shield",
    kycTier: 2,
    ratingAverage: 4.8,
    ratingCount: 24,
    totalJobsCompleted: 27,
    onTimePercent: "96%",
    hourlyRateETB: 1950,
    isAvailableForWork: true,
    responseTime: "~3 hrs",
    location: "Bahir Dar",
    languages: "Amharic, English",
    memberSince: "Jun 2025",
    verifiedOn: "Jun 14, 2025",
    about:
      "Full-stack engineer building reliable web applications for startups and enterprise teams. I value clean architecture, automated testing, and transparent delivery milestones.",
    reviews: [
      {
        name: "Ruth A.",
        stars: 5,
        date: "Oct 2026",
        text: "Rebuilt our booking engine without a single hour of unexpected downtime. Yonas documents everything and communicates proactively.",
      },
      {
        name: "Michael T.",
        stars: 4,
        date: "Aug 2026",
        text: "Strong engineering skills and fair pricing. Delivered robust database migrations and clear API documentation.",
      },
    ],
  },
];

const EXTRA_DEMO_TALENTS: TalentItem[] = [
  {
    id: "demo-meron",
    displayName: "Meron Haile",
    roleTitle: "Video Editor & Motion Designer",
    hue: 330,
    avatarUrl: null,
    primarySkill: { id: "sk-video", nameEn: "Video Production" },
    skills: ["Premiere Pro", "After Effects", "Motion Graphics"],
    portfolioUrl: "meronhaile.studio",
    isNew: false,
    kycBadge: "shield",
    kycTier: 1,
    ratingAverage: 4.7,
    ratingCount: 18,
    totalJobsCompleted: 19,
    onTimePercent: "95%",
    hourlyRateETB: 1400,
    isAvailableForWork: true,
    responseTime: "~4 hrs",
    location: "Addis Ababa",
    languages: "Amharic, English",
    memberSince: "Jan 2026",
    verifiedOn: "Jan 8, 2026",
    about:
      "Video editor for commercial brands, event producers, and creators. Short-form reels, product teasers, and high-production company overviews with crisp pacing, clear audio, and cinematic color grading.",
    reviews: [],
  },
  {
    id: "demo-abel",
    displayName: "Abel Girma",
    roleTitle: "Data Analyst & BI Specialist",
    hue: 190,
    avatarUrl: null,
    primarySkill: { id: "sk-data", nameEn: "Data Analytics" },
    skills: ["Python", "SQL", "Power BI"],
    portfolioUrl: "abelgirma.data",
    isNew: false,
    kycBadge: "shield",
    kycTier: 2,
    ratingAverage: 5.0,
    ratingCount: 36,
    totalJobsCompleted: 41,
    onTimePercent: "100%",
    hourlyRateETB: 1550,
    isAvailableForWork: true,
    responseTime: "~1 hr",
    location: "Hawassa",
    languages: "Amharic, English",
    memberSince: "Feb 2025",
    verifiedOn: "Feb 20, 2025",
    about:
      "I turn complex spreadsheets and operational databases into clear visual decisions. Custom dashboards, automated reporting pipelines, and KPI tracking that non-technical leadership teams can easily act upon.",
    reviews: [],
  },
];

export function getDemoTalentById(id: string): TalentItem | undefined {
  return DEMO_TALENTS.find((t) => t.id === id) || EXTRA_DEMO_TALENTS.find((t) => t.id === id);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(talent: TalentItem): string {
  if (talent.id === "demo-selam" || talent.displayName.includes("Selam")) return "#6366f1";
  if (talent.id === "demo-dawit" || talent.displayName.includes("Dawit")) return "#84cc16";
  if (talent.id === "demo-hanna" || talent.displayName.includes("Hanna")) return "#8b5cf6";
  if (talent.id === "demo-yonas" || talent.displayName.includes("Yonas")) return "#65a30d";
  if (talent.id === "demo-meron" || talent.displayName.includes("Meron")) return "#ec4899";
  if (talent.id === "demo-abel" || talent.displayName.includes("Abel")) return "#06b6d4";
  if (talent.hue) return `hsl(${talent.hue}, 65%, 45%)`;
  return "#6366f1";
}

// Clean Ethiopian Flag Icon (SVG clip path, no emoji)
export const EthiopianFlagIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-label="Ethiopia" style={{ display: "inline-block", flexShrink: 0 }}>
    <defs>
      <clipPath id="ethClipShared">
        <circle cx="12" cy="12" r="11" />
      </clipPath>
    </defs>
    <g clipPath="url(#ethClipShared)">
      <rect width="24" height="8" fill="#2f9e44" />
      <rect width="24" height="8" y="8" fill="#fcc419" />
      <rect width="24" height="8" y="16" fill="#e03131" />
      <circle cx="12" cy="12" r="5.4" fill="#1971c2" />
      <path
        d="M12 8.8l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"
        fill="#fcc419"
      />
    </g>
  </svg>
);

export const FeaturedCarousel = ({
  onProfileClick,
  onOpenChat,
}: {
  onProfileClick?: (id: string) => void;
  onOpenChat?: (userId: string, userName?: string) => void;
}) => {
  const { language } = useI18n();
  const copy = FEATURED_CAROUSEL_COPY[language] ?? FEATURED_CAROUSEL_COPY.en;
  const [talents, setTalents] = useState<TalentItem[]>(DEMO_TALENTS);
  const [activeFilter, setActiveFilter] = useState<"all" | "saved">("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => getSavedTalentIds());
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Fetch real featured talent from backend API
  useEffect(() => {
    let cancelled = false;
    api
      .getFeaturedTalent()
      .then((res) => {
        if (cancelled) return;
        const items = ((res as { items?: any[] })?.items ?? res ?? []) as any[];
        if (Array.isArray(items) && items.length > 0) {
          const mapped: TalentItem[] = items.map((t, idx) => {
            const hues = [160, 210, 265, 25, 330, 190];
            const hue = hues[idx % hues.length];
            const isNew = !t.ratingAverage || t.totalJobsCompleted === 0;
            const primarySkillName =
              t.roleTitle ||
              t.primarySkill?.nameEn ||
              t.primarySkill?.nameAm ||
              "Professional Freelancer";

            return {
              id: t.id || t.userId || `featured-${idx}`,
              displayName: t.displayName || "Verified Freelancer",
              avatarUrl: t.avatarUrl || null,
              primarySkill: t.primarySkill || { id: "primary", nameEn: primarySkillName },
              roleTitle: primarySkillName,
              skills:
                Array.isArray(t.skills) && t.skills.length > 0
                  ? t.skills
                  : [primarySkillName, "Verified Talent"],
              ratingAverage: t.ratingAverage ? Number(t.ratingAverage) : null,
              ratingCount: t.ratingCount || 0,
              totalJobsCompleted: t.totalJobsCompleted || 0,
              onTimePercent: t.totalJobsCompleted > 0 ? "98%" : null,
              hourlyRateETB: t.hourlyRateETB || 950 + (idx % 5) * 250,
              location: t.location || "Addis Ababa",
              languages: t.languages || "Amharic, English",
              memberSince: t.memberSince || "2025",
              verifiedOn: t.verifiedOn || "Verified",
              kycBadge: t.kycBadge || "shield",
              kycTier: t.kycTier || 1,
              isAvailableForWork: t.isAvailableForWork !== false,
              responseTime: t.responseTime || "~1 hr",
              portfolioUrl: t.portfolioUrl || null,
              about:
                t.bio ||
                t.about ||
                "Verified Ethiopian professional with proven domain expertise. Dedicated to reliable delivery and transparent communication on Yekis.",
              reviews: t.reviews || [],
              hue: t.hue || hue,
              isNew,
            };
          });
          setTalents(mapped);
        }
      })
      .catch(() => {
        // Fall back to DEMO_TALENTS on API failure or empty response
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Toggle Shortlist Bookmark
  const toggleSaveTalent = (e: React.MouseEvent, talent: TalentItem) => {
    e.stopPropagation();
    const next = new Set(savedIds);
    const isNowSaved = !next.has(talent.id);
    if (isNowSaved) {
      next.add(talent.id);
      showToast(copy.savedToast(talent.displayName.split(" ")[0]));
    } else {
      next.delete(talent.id);
      showToast(copy.removedToast(talent.displayName.split(" ")[0]));
    }
    setSavedIds(next);
    persistSavedTalentIds(next);
  };

  // Quick share profile link
  const handleShare = (e: React.MouseEvent, talent: TalentItem) => {
    e.stopPropagation();
    const firstName = talent.displayName.split(" ")[0];
    const url = typeof window !== "undefined" ? window.location.href : "https://yekis.et";
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast(copy.linkCopiedToast(firstName)))
        .catch(() => showToast(copy.linkFallbackToast(url)));
    } else {
      showToast(copy.linkCopiedGenericToast(firstName));
    }
  };

  // Filtered talent list
  const displayedTalents = useMemo(() => {
    if (activeFilter === "saved") {
      return talents.filter((t) => savedIds.has(t.id));
    }
    return talents;
  }, [talents, activeFilter, savedIds]);

  // Open modal or full profile
  const handleCardClick = (talent: TalentItem) => {
    setSelectedTalent(talent);
  };

  const handleOpenFullProfile = (talentId: string) => {
    setSelectedTalent(null);
    if (onProfileClick) {
      onProfileClick(talentId);
    }
  };

  return (
    <section className="ft-wrap" aria-label={copy.sectionAria}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ft-toast show" role="status">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="ft-head">
        <div>
          <h2 className="ft-title">{copy.heading}</h2>
          <p className="ft-sub">{copy.subtitle}</p>
        </div>

        <div className="ft-controls">
          <div className="ft-tabs" role="tablist" aria-label={copy.filterAria}>
            <button
              type="button"
              className={`ft-tab ${activeFilter === "all" ? "active" : ""}`}
              role="tab"
              aria-selected={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            >
              {copy.tabAll} <span>({talents.length})</span>
            </button>
            <button
              type="button"
              className={`ft-tab ${activeFilter === "saved" ? "active" : ""}`}
              role="tab"
              aria-selected={activeFilter === "saved"}
              onClick={() => setActiveFilter("saved")}
            >
              <Bookmark size={12} strokeWidth={2} />
              {copy.tabSaved} <span>({savedIds.size})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {displayedTalents.length === 0 ? (
        <div className="ft-empty">{copy.emptySaved}</div>
      ) : (
        <section className="ft-grid" aria-label={copy.gridAria}>
          {displayedTalents.map((talent) => {
            const name = talent.displayName?.trim() || copy.verifiedFreelancerFallback;
            const role =
              talent.roleTitle ||
              talent.primarySkill?.nameEn ||
              copy.professionalFreelancerFallback;
            const isSaved = savedIds.has(talent.id);
            const initials = getInitials(name);
            const avatarBg = getAvatarColor(talent);
            const skills = (
              talent.skills && talent.skills.length > 0
                ? talent.skills
                : [role]
            ).slice(0, 3);
            const isNew = talent.isNew || talent.totalJobsCompleted === 0;
            const isTopRated = !isNew && (talent.ratingAverage ?? 0) >= 4.8;
            const isAvailable = talent.totalJobsCompleted <= 0;
            const statusText = !isAvailable
              ? copy.jobsDelivered(talent.totalJobsCompleted)
              : copy.statusAvailable;

            return (
              <article
                key={talent.id}
                className="ft-card"
                data-id={talent.id}
                onClick={() => handleCardClick(talent)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(talent);
                  }
                }}
              >
                <div className="ft-card-top">
                  <div className="ft-avatar" style={{ backgroundColor: avatarBg }}>
                    {initials}
                    <span className="check" title={copy.verifiedTitle}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                  </div>
                  <div className="ft-actions">
                    <button
                      type="button"
                      className="ft-mini"
                      onClick={(e) => handleShare(e, talent)}
                      aria-label={copy.shareAria(name)}
                    >
                      <Share2 size={13} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="ft-mini"
                      onClick={(e) => toggleSaveTalent(e, talent)}
                      aria-pressed={isSaved}
                      aria-label={copy.saveAria(name)}
                    >
                      <Bookmark
                        size={13}
                        strokeWidth={2}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>

                <h3 className="ft-card-name">
                  {name}{" "}
                  {isNew ? (
                    <span className="ft-badge new">{copy.badgeNew}</span>
                  ) : isTopRated ? (
                    <span className="ft-badge top">{copy.badgeTopRated}</span>
                  ) : null}
                </h3>

                <p className="ft-role">{role}</p>

                <p className="ft-skills">
                  {skills.map((skill, idx) => (
                    <React.Fragment key={skill}>
                      {idx > 0 && <span className="dot">·</span>}
                      {localizeSkillName(skill, language)}
                    </React.Fragment>
                  ))}
                </p>

                <div className="ft-foot">
                  <span className={`ft-status ${isAvailable ? "" : "neutral"}`}>
                    <span className="dot" />
                    {statusText}
                  </span>
                  <button
                    type="button"
                    className="ft-view"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(talent);
                    }}
                  >
                    {copy.viewProfileBtn} <ArrowRight size={13} strokeWidth={2} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Count footer */}
      <p className="ft-count">
        {copy.countFooter(displayedTalents.length, activeFilter === "saved")}
      </p>

      {/* Quick-View Profile Modal (Functional inspection) */}
      {selectedTalent && (
        <div
          className="ft-modal-backdrop"
          onClick={() => setSelectedTalent(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ft-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ "--h": selectedTalent.hue || 160 } as React.CSSProperties}
          >
            {/* Modal Header */}
            <div className="ft-modal-header">
              <button
                type="button"
                className="ft-modal-back-btn"
                onClick={() => setSelectedTalent(null)}
              >
                <ChevronLeft size={16} /> {copy.modalBackBtn}
              </button>
              <button
                type="button"
                className="ft-modal-close-btn"
                onClick={() => setSelectedTalent(null)}
                aria-label={copy.modalCloseAria}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Hero Banner */}
            <div className="ft-modal-hero">
              <span className="ft-modal-avatar-wrap">
                <div
                  className="ft-avatar"
                  style={{
                    width: 72,
                    height: 72,
                    fontSize: 24,
                    backgroundColor: getAvatarColor(selectedTalent),
                  }}
                >
                  {getInitials(selectedTalent.displayName)}
                  <span
                    className="check"
                    title={copy.verifiedTitle}
                    style={{ width: 22, height: 22, right: -3, bottom: -3 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 12, height: 12 }}>
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                </div>
              </span>

              <h2 className="ft-modal-name">{selectedTalent.displayName}</h2>
              <p className="ft-modal-role">
                {selectedTalent.roleTitle ||
                  selectedTalent.primarySkill?.nameEn ||
                  copy.professionalFreelancerFallback}
              </p>

              <div className="ft-modal-meta">
                <span>
                  <MapPin size={14} /> {selectedTalent.location || copy.locationDefault}
                </span>
                <span>
                  <Globe size={14} /> {selectedTalent.languages || copy.languagesDefault}
                </span>
                <span>
                  <Calendar size={14} /> {copy.sincePrefix(selectedTalent.memberSince || "2025")}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="ft-modal-actions">
                <button
                  type="button"
                  className="ft-btn-primary"
                  onClick={() => {
                    const fn = selectedTalent.displayName.split(" ")[0];
                    showToast(copy.startingProposalToast(fn));
                    const id = selectedTalent.id;
                    const name = selectedTalent.displayName;
                    setSelectedTalent(null);
                    if (onOpenChat) {
                      onOpenChat(id, name);
                    } else {
                      handleOpenFullProfile(id);
                    }
                  }}
                >
                  <Briefcase size={16} /> {copy.hireBtn(selectedTalent.displayName.split(" ")[0])}
                </button>
                <button
                  type="button"
                  className="ft-btn-secondary"
                  onClick={() => {
                    const fn = selectedTalent.displayName.split(" ")[0];
                    showToast(copy.openingChatToast(fn));
                    const id = selectedTalent.id;
                    const name = selectedTalent.displayName;
                    setSelectedTalent(null);
                    if (onOpenChat) {
                      onOpenChat(id, name);
                    } else {
                      handleOpenFullProfile(id);
                    }
                  }}
                >
                  <MessageSquare size={16} /> {copy.messageBtn}
                </button>
                <button
                  type="button"
                  className="ft-btn-secondary"
                  onClick={() => handleOpenFullProfile(selectedTalent.id)}
                >
                  {copy.openFullProfileBtn} <ExternalLink size={14} />
                </button>
                <button
                  type="button"
                  className={`carousel-circle-btn ${savedIds.has(selectedTalent.id) ? "saved" : ""}`}
                  onClick={(e) => toggleSaveTalent(e, selectedTalent)}
                  title={savedIds.has(selectedTalent.id) ? copy.removeShortlistTitle : copy.saveShortlistTitle}
                  style={{ width: 44, height: 44 }}
                >
                  <Bookmark
                    size={16}
                    fill={savedIds.has(selectedTalent.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>

              {/* Stat Strip */}
              <div className="ft-statstrip">
                <div className="ft-stat-box">
                  <b>{selectedTalent.ratingAverage ? Number(selectedTalent.ratingAverage).toFixed(1) : copy.statNew}</b>
                  <span>{copy.statRating}</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.totalJobsCompleted || 0}</b>
                  <span>{copy.statJobsDone}</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.onTimePercent || "100%"}</b>
                  <span>{copy.statOnTime}</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.responseTime || "~1 hr"}</b>
                  <span>{copy.statResponse}</span>
                </div>
              </div>
            </div>

            {/* Modal Detail Grid */}
            <div className="ft-modal-grid">
              {/* Main Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <section className="ft-card-box">
                  <h3 className="ft-box-label">{copy.aboutHeading}</h3>
                  <p className="ft-about-text">
                    {selectedTalent.about || copy.aboutFallback}
                  </p>
                </section>

                <section className="ft-card-box">
                  <h3 className="ft-box-label">{copy.skillsHeading}</h3>
                  <div className="ft-modal-tags">
                    {(selectedTalent.skills || [
                      selectedTalent.primarySkill?.nameEn || copy.professionalFreelancerFallback,
                    ]).map((s, idx) => (
                      <span key={idx} className="carousel-tag">
                        {localizeSkillName(s, language)}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="ft-card-box">
                  <h3 className="ft-box-label">
                    {copy.reviewsHeading}{" "}
                    {selectedTalent.ratingAverage && (
                      <span style={{ marginLeft: "auto", color: "var(--color-text)", textTransform: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Star size={13} fill="var(--color-warning)" color="var(--color-warning)" />
                        {selectedTalent.ratingAverage.toFixed(1)} · {copy.reviewsCount(selectedTalent.ratingCount || selectedTalent.reviews?.length || 0)}
                      </span>
                    )}
                  </h3>

                  {selectedTalent.reviews && selectedTalent.reviews.length > 0 ? (
                    <div>
                      {selectedTalent.reviews.map((r, idx) => (
                        <div key={idx} className="ft-review-item">
                          <span className="ft-review-av">
                            {r.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="ft-review-body">
                            <div className="ft-review-head">
                              <span className="ft-review-name">{r.name}</span>
                              <span className="ft-review-stars">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    fill={i < r.stars ? "var(--color-warning)" : "none"}
                                    color="var(--color-warning)"
                                    style={{ opacity: i < r.stars ? 1 : 0.3 }}
                                  />
                                ))}
                              </span>
                              <span className="ft-review-date">{r.date}</span>
                            </div>
                            <p className="ft-review-text">{r.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "16px 8px 8px" }}>
                      <CheckCircle
                        size={28}
                        style={{ margin: "0 auto 8px", color: "var(--color-primary)", opacity: 0.8 }}
                      />
                      <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: 4 }}>
                        {copy.newVerifiedTalentTitle}
                      </strong>
                      <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: "0 auto 14px", maxWidth: "38ch" }}>
                        {copy.newVerifiedTalentDesc(selectedTalent.displayName.split(" ")[0])}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* Aside Column */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <section className="ft-card-box">
                  <h3 className="ft-box-label">{copy.engagementHeading}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                    <span className="ft-rate-lg">
                      ETB {(selectedTalent.hourlyRateETB || 950).toLocaleString()}
                    </span>
                    <span className="ft-rate-unit">{copy.perHourUnit}</span>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: 14 }}>
                    <span className="carousel-live-dot" />
                    {copy.availableNewProjects}
                  </div>

                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>{copy.jobsCompletedLabel}</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.totalJobsCompleted || "—"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>{copy.onTimeRateLabel}</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.onTimePercent || "100%"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>{copy.responseTimeLabel}</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.responseTime || "~1 hr"}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ft-btn-primary"
                    style={{ width: "100%", marginTop: 14 }}
                    onClick={() => {
                      const fn = selectedTalent.displayName.split(" ")[0];
                      showToast(copy.startingProposalToast(fn));
                      const id = selectedTalent.id;
                      const name = selectedTalent.displayName;
                      setSelectedTalent(null);
                      if (onOpenChat) {
                        onOpenChat(id, name);
                      } else {
                        handleOpenFullProfile(id);
                      }
                    }}
                  >
                    {copy.hireBtn(selectedTalent.displayName.split(" ")[0])}
                  </button>
                  <p style={{ fontSize: "0.74rem", color: "var(--color-text-tertiary)", textAlign: "center", margin: "10px 0 0", lineHeight: 1.4 }}>
                    {copy.escrowNote}
                  </p>
                </section>

                <section className="ft-card-box">
                  <h3 className="ft-box-label">
                    {copy.identityVerificationHeading}
                    <span className="ft-bold-verified" style={{ marginLeft: "auto", fontSize: "0.76rem" }}>
                      {copy.tierBadge(selectedTalent.kycTier || 1)}
                    </span>
                  </h3>

                  <div className="ft-verify-row">
                    <CheckCircle size={15} />
                    <div>
                      {copy.faydaVerifiedTitle}
                      <small>{copy.faydaVerifiedDesc}</small>
                    </div>
                  </div>

                  <div className="ft-verify-row">
                    <CheckCircle size={15} />
                    <div>
                      {copy.biometricMatchedTitle}
                      <small>{copy.biometricMatchedDesc}</small>
                    </div>
                  </div>

                  {selectedTalent.kycTier && selectedTalent.kycTier >= 2 && (
                    <div className="ft-verify-row">
                      <CheckCircle size={15} />
                      <div>
                        {copy.enhancedApprovedTitle}
                        <small>{copy.enhancedApprovedDesc}</small>
                      </div>
                    </div>
                  )}

                  <p style={{ margin: "12px 0 0", paddingTop: 10, borderTop: "1px solid var(--color-border)", fontSize: "0.72rem", color: "var(--color-text-tertiary)", lineHeight: 1.45 }}>
                    {copy.faydaFootnote}
                  </p>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

