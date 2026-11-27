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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "YK";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(talent: TalentItem): string {
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
  onBrowseGigs,
  compact = false,
}: {
  onProfileClick?: (id: string) => void;
  onOpenChat?: (userId: string, userName?: string) => void;
  onBrowseGigs?: () => void;
  compact?: boolean;
}) => {
  const { language } = useI18n();
  const copy = FEATURED_CAROUSEL_COPY[language] ?? FEATURED_CAROUSEL_COPY.en;
  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
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

  // Fetch real featured talent from backend API (no fake fallback)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getFeaturedTalent()
      .then((res) => {
        if (cancelled) return;
        const items = ((res as { items?: any[] })?.items ?? res ?? []) as any[];
        if (!Array.isArray(items) || items.length === 0) {
          setTalents([]);
          setLoading(false);
          return;
        }
        const mapped: TalentItem[] = items.map((t, idx) => {
          const hues = [160, 210, 265, 25, 330, 190];
          const hue = hues[idx % hues.length];
          const jobsCount = typeof t.totalJobsCompleted === "number" ? t.totalJobsCompleted : 0;
          const isNew = !t.ratingAverage || jobsCount === 0;
          const primarySkillName =
            t.roleTitle ||
            t.primarySkill?.nameEn ||
            t.primarySkill?.nameAm ||
            copy.professionalFreelancerFallback;

          return {
            id: t.id || t.userId,
            displayName: t.displayName || copy.verifiedFreelancerFallback,
            avatarUrl: t.avatarUrl || null,
            primarySkill: t.primarySkill || { id: "primary", nameEn: primarySkillName },
            roleTitle: primarySkillName,
            skills:
              Array.isArray(t.skills) && t.skills.length > 0
                ? t.skills
                : [primarySkillName],
            ratingAverage: t.ratingAverage != null ? Number(t.ratingAverage) : null,
            ratingCount: typeof t.ratingCount === "number" ? t.ratingCount : 0,
            totalJobsCompleted: jobsCount,
            onTimePercent: t.onTimePercent ?? null,
            hourlyRateETB: typeof t.hourlyRateETB === "number" ? t.hourlyRateETB : undefined,
            location: t.location || undefined,
            languages: t.languages || undefined,
            memberSince: t.memberSince || undefined,
            verifiedOn: t.verifiedOn || undefined,
            kycBadge: t.kycBadge || undefined,
            kycTier: typeof t.kycTier === "number" ? t.kycTier : undefined,
            isAvailableForWork: t.isAvailableForWork !== false,
            responseTime: t.responseTime || undefined,
            portfolioUrl: t.portfolioUrl || null,
            about: t.bio || t.about || undefined,
            reviews: Array.isArray(t.reviews) ? t.reviews : [],
            hue: t.hue || hue,
            isNew,
          };
        });
        setTalents(mapped);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setTalents([]);
        setError(err instanceof Error && err.message ? err.message : copy.errorTitle);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadNonce, copy.errorTitle, copy.professionalFreelancerFallback, copy.verifiedFreelancerFallback]);

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
    const base =
      activeFilter === "saved"
        ? talents.filter((t) => savedIds.has(t.id))
        : talents;
    return compact ? base.slice(0, 4) : base;
  }, [talents, activeFilter, savedIds, compact]);

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

      {/* Grid / Loading / Error / Empty */}
      {loading ? (
        <div className="ft-empty" role="status" aria-live="polite">
          {copy.loadingLabel}
        </div>
      ) : error ? (
        <div className="ft-empty" role="alert">
          <p style={{ margin: "0 0 10px" }}>{copy.errorTitle}</p>
          <button
            type="button"
            className="ft-btn-primary"
            onClick={() => setReloadNonce((n) => n + 1)}
          >
            {copy.retryBtn}
          </button>
        </div>
      ) : talents.length === 0 ? (
        <div className="ft-empty">
          <strong style={{ display: "block", marginBottom: 4 }}>
            {copy.emptyTalentsTitle}
          </strong>
          <p style={{ margin: "0 0 12px" }}>{copy.emptyTalentsDesc}</p>
          {onBrowseGigs && (
            <button
              type="button"
              className="ft-btn-primary"
              onClick={onBrowseGigs}
            >
              {copy.browseGigsBtn}
            </button>
          )}
        </div>
      ) : displayedTalents.length === 0 ? (
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
                {selectedTalent.location && (
                  <span>
                    <MapPin size={14} /> {selectedTalent.location}
                  </span>
                )}
                {selectedTalent.languages && (
                  <span>
                    <Globe size={14} /> {selectedTalent.languages}
                  </span>
                )}
                {selectedTalent.memberSince && (
                  <span>
                    <Calendar size={14} /> {copy.sincePrefix(selectedTalent.memberSince)}
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
                  <b>{selectedTalent.onTimePercent ?? "—"}</b>
                  <span>{copy.statOnTime}</span>
                </div>
                <div className="ft-stat-box">
                  <b>{selectedTalent.responseTime ?? "—"}</b>
                  <span>{copy.statResponse}</span>
                </div>
              </div>
            </div>

            {/* Modal Detail Grid */}
            <div className="ft-modal-grid">
              {/* Main Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {selectedTalent.about && (
                  <section className="ft-card-box">
                    <h3 className="ft-box-label">{copy.aboutHeading}</h3>
                    <p className="ft-about-text">{selectedTalent.about}</p>
                  </section>
                )}

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
                  {typeof selectedTalent.hourlyRateETB === "number" && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                      <span className="ft-rate-lg">
                        ETB {selectedTalent.hourlyRateETB.toLocaleString()}
                      </span>
                      <span className="ft-rate-unit">{copy.perHourUnit}</span>
                    </div>
                  )}

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
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.onTimePercent ?? "—"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>{copy.responseTimeLabel}</span>
                      <strong style={{ color: "var(--color-text)" }}>{selectedTalent.responseTime ?? "—"}</strong>
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

