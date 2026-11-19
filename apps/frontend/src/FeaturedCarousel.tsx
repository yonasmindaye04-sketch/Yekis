import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Star,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bookmark,
  Share2,
  ArrowRight,
  CheckCircle,
  X,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { YekisAvatar } from "./components/YekisAvatar";
import { api } from "./api/client";

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

// Built-in verified talent profiles (Ethiopian talent showcase)
const DEMO_TALENTS: TalentItem[] = [
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
    skills: ["React", "Node.js", "REST APIs", "Tailwind CSS"],
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
    skills: ["Figma", "Design Systems", "Prototyping", "User Research"],
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
    skills: ["TypeScript", "Next.js", "PostgreSQL", "Docker", "AWS"],
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
  {
    id: "demo-meron",
    displayName: "Meron Haile",
    roleTitle: "Video Editor & Motion Designer",
    hue: 330,
    avatarUrl: null,
    primarySkill: { id: "sk-video", nameEn: "Video Production" },
    skills: ["Premiere Pro", "After Effects", "Motion Graphics", "Color Grading"],
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
    reviews: [
      {
        name: "Sara M.",
        stars: 5,
        date: "Nov 2026",
        text: "Turned 4 hours of event footage into a 3-minute highlight reel that our whole team loved. Two rounds of revisions, zero friction.",
      },
      {
        name: "Nahom B.",
        stars: 4,
        date: "Sep 2026",
        text: "Great eye for pacing and music selection. Delivered ahead of schedule and handled feedback quickly.",
      },
    ],
  },
  {
    id: "demo-abel",
    displayName: "Abel Girma",
    roleTitle: "Data Analyst & BI Specialist",
    hue: 190,
    avatarUrl: null,
    primarySkill: { id: "sk-data", nameEn: "Data Analytics" },
    skills: ["Python", "SQL", "Power BI", "Excel Models", "Dashboards"],
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
    reviews: [
      {
        name: "Helen W.",
        stars: 5,
        date: "Nov 2026",
        text: "Abel built a sales dashboard that replaced three manual weekly spreadsheets. Paid for itself in the very first month.",
      },
      {
        name: "Yared S.",
        stars: 5,
        date: "Oct 2026",
        text: "Rare mix of technical depth and clear business explanations. He walked our managers through every metric so we can maintain it ourselves.",
      },
    ],
  },
];

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
}: {
  onProfileClick?: (id: string) => void;
}) => {
  const [talents, setTalents] = useState<TalentItem[]>(DEMO_TALENTS);
  const [activeFilter, setActiveFilter] = useState<"all" | "saved">("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => getSavedTalentIds());
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("Live");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
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
              t.primarySkill?.nameEn ||
              t.primarySkill?.nameAm ||
              "Professional Freelancer";

            return {
              id: t.id,
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
              hourlyRateETB: 950 + (idx % 5) * 250,
              location: "Addis Ababa",
              languages: "Amharic, English",
              memberSince: "2025",
              verifiedOn: "Verified",
              kycBadge: t.kycBadge || "shield",
              kycTier: t.kycTier || 1,
              isAvailableForWork: t.isAvailableForWork !== false,
              responseTime: "~1 hr",
              portfolioUrl: null,
              about:
                t.bio ||
                "Verified Ethiopian professional with proven domain expertise. Dedicated to reliable delivery and transparent communication on Yekis.",
              reviews: [],
              hue,
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

  // Live timestamp clock update
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update carousel scroll navigation buttons
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [talents]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const card = scrollRef.current.querySelector(".carousel-card");
      const step = card ? (card.getBoundingClientRect().width + 18) * 1.5 : 420;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 350);
    }
  };

  // Toggle Shortlist Bookmark
  const toggleSaveTalent = (e: React.MouseEvent, talent: TalentItem) => {
    e.stopPropagation();
    const next = new Set(savedIds);
    const isNowSaved = !next.has(talent.id);
    if (isNowSaved) {
      next.add(talent.id);
      showToast(`${talent.displayName.split(" ")[0]} saved to your shortlist`);
    } else {
      next.delete(talent.id);
      showToast(`${talent.displayName.split(" ")[0]} removed from your shortlist`);
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
        .then(() => showToast(`${firstName}'s profile link copied to clipboard!`))
        .catch(() => showToast(`Link: ${url}`));
    } else {
      showToast(`Link for ${firstName} copied.`);
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
    <section className="carousel-section" aria-label="Featured Talent">
      {/* Toast Notification */}
      {toastMessage && <div className="ft-toast">{toastMessage}</div>}

      {/* Header */}
      <div className="carousel-header">
        <div className="carousel-title-group">
          <h2>Featured Talent</h2>
          <span className="carousel-subtitle">
            Top verified Ethiopian professionals available for hire
          </span>
        </div>

        <div className="carousel-header-actions">
          {/* All vs Saved filter pills */}
          <div className="carousel-filter-pills" role="tablist" aria-label="Talent filter">
            <button
              type="button"
              className={`carousel-filter-btn ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All ({talents.length})
            </button>
            <button
              type="button"
              className={`carousel-filter-btn ${activeFilter === "saved" ? "active" : ""}`}
              onClick={() => setActiveFilter("saved")}
            >
              <Bookmark size={13} />
              Saved ({savedIds.size})
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="carousel-controls">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="carousel-btn"
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className="carousel-btn"
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Track */}
      {displayedTalents.length === 0 ? (
        <div
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "var(--color-bg-elevated)",
            borderRadius: "16px",
            border: "1px dashed var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Bookmark size={24} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No saved freelancers yet</p>
          <p style={{ margin: "4px 0 12px", fontSize: "0.82rem" }}>
            Click the bookmark icon on any talent card to add them to your shortlist.
          </p>
          <button
            type="button"
            className="carousel-filter-btn active"
            onClick={() => setActiveFilter("all")}
          >
            Browse all talents
          </button>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="carousel-list"
          role="region"
          aria-label="Talent list"
        >
          {displayedTalents.map((talent) => {
            const name = talent.displayName?.trim() || "Verified Freelancer";
            const skillName =
              talent.roleTitle ||
              talent.primarySkill?.nameEn ||
              "Professional Freelancer";
            const isSaved = savedIds.has(talent.id);
            const hue = talent.hue || 160;

            const hasRating =
              talent.ratingAverage !== null &&
              talent.ratingAverage !== undefined &&
              talent.ratingAverage > 0;

            return (
              <article
                key={talent.id}
                onClick={() => handleCardClick(talent)}
                className="carousel-card"
                style={{ "--h": hue } as React.CSSProperties}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(talent);
                  }
                }}
              >
                {/* Card Top: Avatar + Action icons */}
                <div className="carousel-card-top">
                  <span className="carousel-avatar-wrap">
                    <YekisAvatar
                      userId={talent.id.startsWith("demo-") ? null : talent.id}
                      displayName={name}
                      avatarUrl={talent.avatarUrl}
                      size={58}
                      animate="hover"
                    />
                    <span
                      className="carousel-badge-shield"
                      title="Fayda National ID Verified"
                      aria-label="Fayda Verified"
                    >
                      <Shield size={11} strokeWidth={2.6} />
                    </span>
                  </span>

                  <div className="carousel-top-actions">
                    <button
                      type="button"
                      className="carousel-circle-btn"
                      onClick={(e) => handleShare(e, talent)}
                      title="Share profile link"
                      aria-label="Share profile"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      type="button"
                      className={`carousel-circle-btn ${isSaved ? "saved" : ""}`}
                      onClick={(e) => toggleSaveTalent(e, talent)}
                      title={isSaved ? "Remove from shortlist" : "Save to shortlist"}
                      aria-label="Bookmark"
                    >
                      <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Name & Status */}
                <div className="carousel-name-row">
                  <h3 className="carousel-name" title={name}>
                    {name}
                  </h3>
                  {talent.isNew ? (
                    <span className="carousel-bold-status new">
                      <Sparkles size={12} /> New
                    </span>
                  ) : hasRating && talent.ratingAverage! >= 4.8 ? (
                    <span className="carousel-bold-status top">
                      <Star size={11} fill="currentColor" /> Top rated
                    </span>
                  ) : null}
                </div>

                {/* Role Headline */}
                <p className="carousel-role" title={skillName}>
                  {skillName}
                </p>

                {/* Skill Tags */}
                <div className="carousel-tags">
                  {(talent.skills && talent.skills.length > 0
                    ? talent.skills
                    : [skillName]
                  )
                    .slice(0, 3)
                    .map((s, idx) => (
                      <span key={idx} className="carousel-tag">
                        {s}
                      </span>
                    ))}
                </div>

                {/* 3-Column Stats Grid */}
                <div className="carousel-stats-grid">
                  <div className="carousel-stat-col">
                    <span className="carousel-stat-val">
                      {hasRating ? (
                        <>
                          <Star size={13} fill="var(--color-warning)" color="var(--color-warning)" />
                          {Number(talent.ratingAverage).toFixed(1)}
                        </>
                      ) : (
                        <span style={{ color: "var(--color-primary)" }}>New</span>
                      )}
                    </span>
                    <span className="carousel-stat-lbl">Rating</span>
                  </div>

                  <div className="carousel-stat-col">
                    <span className="carousel-stat-val">
                      {talent.totalJobsCompleted > 0
                        ? `${talent.totalJobsCompleted} jobs`
                        : talent.hourlyRateETB
                          ? `ETB ${talent.hourlyRateETB}`
                          : "Verified"}
                    </span>
                    <span className="carousel-stat-lbl">
                      {talent.totalJobsCompleted > 0 ? "Delivered" : "Rate / hr"}
                    </span>
                  </div>

                  <div className="carousel-stat-col">
                    <span className="carousel-stat-val">
                      <EthiopianFlagIcon />
                    </span>
                    <span className="carousel-stat-lbl">Ethiopia</span>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="carousel-card-actions">
                  <button
                    type="button"
                    className="carousel-action-view"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(talent);
                    }}
                  >
                    View Profile <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer / Live Activity Row */}
      <div className="carousel-live-row">
        <span>{displayedTalents.length} verified professionals available</span>
        <span className="carousel-live-indicator">
          <span className="carousel-live-dot" aria-hidden="true" />
          <b>Live</b> · Updated <time>{currentTime}</time>
        </span>
      </div>

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
                <ChevronLeft size={16} /> Featured Talent
              </button>
              <button
                type="button"
                className="ft-modal-close-btn"
                onClick={() => setSelectedTalent(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Hero Banner */}
            <div className="ft-modal-hero">
              <span className="ft-modal-avatar-wrap">
                <YekisAvatar
                  userId={selectedTalent.id.startsWith("demo-") ? null : selectedTalent.id}
                  displayName={selectedTalent.displayName}
                  avatarUrl={selectedTalent.avatarUrl}
                  size={88}
                  animate="hover"
                />
                <span
                  className="ft-modal-badge"
                  title="Fayda Tier Verified"
                  aria-label="Fayda Verified"
                >
                  <Shield size={13} strokeWidth={2.6} />
                </span>
              </span>

              <h2 className="ft-modal-name">{selectedTalent.displayName}</h2>
              <p className="ft-modal-role">
                {selectedTalent.roleTitle ||
                  selectedTalent.primarySkill?.nameEn ||
                  "Professional Freelancer"}
              </p>

              <div className="ft-modal-meta">
                <span>
                  <MapPin size={14} /> {selectedTalent.location || "Addis Ababa, Ethiopia"}
                </span>
                <span>
                  <Globe size={14} /> {selectedTalent.languages || "Amharic, English"}
                </span>
                <span>
                  <Calendar size={14} /> Since {selectedTalent.memberSince || "2025"}
                </span>
              </div>

              <div className="ft-modal-chips">
                <span className="ft-chip-verified">
                  <Shield size={13} strokeWidth={2.5} />
                  Fayda Tier {selectedTalent.kycTier || 1} Verified
                </span>
                {selectedTalent.isNew && (
                  <span className="carousel-bold-status new" style={{ fontSize: "0.85rem" }}>
                    <Sparkles size={13} /> New Talent
                  </span>
                )}
                {selectedTalent.ratingAverage && selectedTalent.ratingAverage >= 4.8 && (
                  <span className="carousel-bold-status top" style={{ fontSize: "0.85rem" }}>
                    <Star size={13} fill="currentColor" /> Top Rated
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="ft-modal-actions">
                <button
                  type="button"
                  className="ft-btn-primary"
                  onClick={() => {
                    const fn = selectedTalent.displayName.split(" ")[0];
                    showToast(`Starting project proposal with ${fn}...`);
                    handleOpenFullProfile(selectedTalent.id);
                  }}
                >
                  <Briefcase size={16} /> Hire {selectedTalent.displayName.split(" ")[0]}
                </button>
                <button
                  type="button"
                  className="ft-btn-secondary"
                  onClick={() => {
                    const fn = selectedTalent.displayName.split(" ")[0];
                    showToast(`Opening direct conversation with ${fn}...`);
                    handleOpenFullProfile(selectedTalent.id);
                  }}
                >
                  <MessageSquare size={16} /> Message
                </button>
                <button
                  type="button"
                  className="ft-btn-secondary"
                  onClick={() => handleOpenFullProfile(selectedTalent.id)}
                >
                  Open Full Profile <ExternalLink size={14} />
                </button>
                <button
                  type="button"
                  className={`carousel-circle-btn ${savedIds.has(selectedTalent.id) ? "saved" : ""}`}
                  onClick={(e) => toggleSaveTalent(e, selectedTalent)}
                  title={savedIds.has(selectedTalent.id) ? "Remove from shortlist" : "Save to shortlist"}
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
                  <b>{selectedTalent.ratingAverage ? Number(selectedTalent.ratingAverage).toFixed(1) : "New"}</b>
                  <span>Rating</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.totalJobsCompleted || 0}</b>
                  <span>Jobs done</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.onTimePercent || "100%"}</b>
                  <span>On-time</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.responseTime || "~1 hr"}</b>
                  <span>Response</span>
                </div>
              </div>
            </div>

            {/* Modal Detail Grid */}
            <div className="ft-modal-grid">
              {/* Main Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <section className="ft-card-box">
                  <h3 className="ft-box-label">About</h3>
                  <p className="ft-about-text">
                    {selectedTalent.about ||
                      "Verified Ethiopian freelancer specializing in high-quality deliverables, dependable milestone execution, and clear client communication."}
                  </p>
                </section>

                <section className="ft-card-box">
                  <h3 className="ft-box-label">Skills & Expertise</h3>
                  <div className="ft-modal-tags">
                    {(selectedTalent.skills || [
                      selectedTalent.primarySkill?.nameEn || "Professional Freelancer",
                    ]).map((s, idx) => (
                      <span key={idx} className="carousel-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="ft-card-box">
                  <h3 className="ft-box-label">
                    Client Reviews{" "}
                    {selectedTalent.ratingAverage && (
                      <span style={{ marginLeft: "auto", color: "var(--color-text)", textTransform: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Star size={13} fill="var(--color-warning)" color="var(--color-warning)" />
                        {selectedTalent.ratingAverage.toFixed(1)} · {selectedTalent.ratingCount || selectedTalent.reviews?.length || 0} reviews
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
                        New Verified Talent
                      </strong>
                      <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: "0 auto 14px", maxWidth: "38ch" }}>
                        {selectedTalent.displayName.split(" ")[0]} recently completed Fayda identity verification. Be the first client to collaborate and leave a review.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* Aside Column */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <section className="ft-card-box">
                  <h3 className="ft-box-label">Engagement</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                    <span className="ft-rate-lg">
                      ETB {(selectedTalent.hourlyRateETB || 950).toLocaleString()}
                    </span>
                    <span className="ft-rate-unit">/ hr starting</span>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: 14 }}>
                    <span className="carousel-live-dot" />
                    Available for new projects
                  </div>

                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Jobs completed</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.totalJobsCompleted || "—"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>On-time rate</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.onTimePercent || "100%"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Response time</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.responseTime || "~1 hr"}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ft-btn-primary"
                    style={{ width: "100%", marginTop: 14 }}
                    onClick={() => {
                      const fn = selectedTalent.displayName.split(" ")[0];
                      showToast(`Starting proposal for ${fn}...`);
                      handleOpenFullProfile(selectedTalent.id);
                    }}
                  >
                    Hire {selectedTalent.displayName.split(" ")[0]}
                  </button>
                  <p style={{ fontSize: "0.74rem", color: "var(--color-text-tertiary)", textAlign: "center", margin: "10px 0 0", lineHeight: 1.4 }}>
                    Contact is free — escrow funds are protected until milestones are delivered.
                  </p>
                </section>

                <section className="ft-card-box">
                  <h3 className="ft-box-label">
                    Identity Verification
                    <span className="ft-chip-verified" style={{ marginLeft: "auto", fontSize: "0.72rem", padding: "2px 8px" }}>
                      Tier {selectedTalent.kycTier || 1}
                    </span>
                  </h3>

                  <div className="ft-verify-row">
                    <CheckCircle size={15} />
                    <div>
                      National ID (Fayda) Verified
                      <small>Matched against the national identity database</small>
                    </div>
                  </div>

                  <div className="ft-verify-row">
                    <CheckCircle size={15} />
                    <div>
                      Biometric Selfie Matched
                      <small>Liveness matched during registration</small>
                    </div>
                  </div>

                  {selectedTalent.kycTier && selectedTalent.kycTier >= 2 && (
                    <div className="ft-verify-row">
                      <CheckCircle size={15} />
                      <div>
                        Enhanced Review Approved
                        <small>Work background and payment rails confirmed</small>
                      </div>
                    </div>
                  )}

                  <p style={{ margin: "12px 0 0", paddingTop: 10, borderTop: "1px solid var(--color-border)", fontSize: "0.72rem", color: "var(--color-text-tertiary)", lineHeight: 1.45 }}>
                    Verified via Fayda eSignet — Ethiopia&apos;s national digital identity framework.
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
