import { useEffect, useState } from "react";
import {
  Shield,
  CheckCircle,
  Star,
  Briefcase,
  Flag,
  Calendar,
  X,
} from "lucide-react";
import { api } from "./api/client";
import { YekisAvatar } from "./components/YekisAvatar";
import { useI18n } from "./i18n";
import { loadLocalPortfolio } from "./ProfileEditPage";
import "./ProfilePage.css";

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
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
}

interface PublicProfileData {
  id: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isAvailableForWork?: boolean;
  primarySkillId?: string | null;
  skills: SkillRef[];
  portfolio: PortfolioItem[];
  kyc: { tier: string; status: string; badgeType: string | null } | null;
  stats: {
    jobsCompleted: number;
    rating: { average: number | null; count: number };
    earnedRange: string;
    memberSince: string;
  };
  isOwnProfile: boolean;
  canViewFullProfile: boolean;
}

export const ProfilePage = ({ userId = "me" }: { userId?: string }) => {
  const { t, language: lang } = useI18n();
  const pr = t.workspace.profile;
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
        setProfile(profileRes as unknown as PublicProfileData);
        const r = reviewsRes as { items?: ReviewItem[] } | ReviewItem[] | null;
        setReviews(Array.isArray(r) ? r : (r?.items ?? []));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not load this profile.";
        setLoadError(
          message.toLowerCase().includes("private")
            ? "This profile is private."
            : message,
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="profile-view-page">
        <div className="profile-view-container">
          <div className="panel" style={{ padding: 28 }}>
            <div className="sh-skeleton" style={{ height: 26, width: "38%", marginBottom: 12 }} />
            <div className="sh-skeleton" style={{ height: 14, width: "60%", marginBottom: 20 }} />
            <div className="sh-skeleton" style={{ height: 110, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }
  if (loadError) return <div className="profile-error">{loadError}</div>;
  if (!profile) return null;

  const skillName = (s: SkillRef) =>
    (lang === "am" && s.nameAm) || s.nameEn || s.name || s.id;
  const primarySkill = profile.skills.find(
    (s) => s.id === profile.primarySkillId,
  );
  const memberSinceYear = profile.stats?.memberSince
    ? new Date(profile.stats.memberSince).getFullYear()
    : null;

  const localPortfolio = loadLocalPortfolio(profile.id);
  const fallbackPortfolio =
    localPortfolio.length > 0 ? localPortfolio : loadLocalPortfolio("me");
  const effectivePortfolio: PortfolioItem[] =
    (profile.portfolio?.length ?? 0) > 0
      ? profile.portfolio
      : profile.isOwnProfile || userId === "me"
        ? fallbackPortfolio
        : [];

  const submitReport = async () => {
    setReportError(null);
    setReportSending(true);
    try {
      await api.reportProfile(
        profile.id,
        reportReason || "Other",
        reportDetails,
      );
      setReportDone(true);
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Failed to submit report",
      );
    } finally {
      setReportSending(false);
    }
  };

  return (
    <div className="profile-view-page">
      <div className="profile-view-container">
        {/* Hero */}
        <div className="profile-hero panel">
          <div className="hero-banner"></div>
          <div className="hero-content">
            <div className="hero-top-row">
              <div className="hero-user-info">
                <YekisAvatar
                  userId={userId}
                  displayName={profile.displayName}
                  avatarUrl={profile.avatarUrl}
                  size={96}
                  animate="hover"
                  className="hero-avatar"
                />
                <div className="hero-text">
                  <h1>
                    {profile.displayName}
                    {profile.kyc?.status === "VERIFIED" &&
                      profile.kyc.tier === "TIER_3" && (
                        <Shield className="tier-badge gold" size={24} />
                      )}
                    {profile.kyc?.status === "VERIFIED" &&
                      profile.kyc.tier === "TIER_2" && (
                        <Shield className="tier-badge gold" size={24} />
                      )}
                    {profile.kyc?.status === "VERIFIED" &&
                      profile.kyc.tier === "TIER_1" && (
                        <CheckCircle className="tier-badge silver" size={24} />
                      )}
                  </h1>
                  {primarySkill && (
                    <p className="hero-location">
                      <Briefcase size={16} /> {skillName(primarySkill)}
                    </p>
                  )}
                </div>
              </div>
              {!profile.isOwnProfile && (
                <div className="hero-actions">
                  <button
                    onClick={() => {
                      setReportModalOpen(true);
                      setReportDone(false);
                    }}
                    className="report-btn"
                  >
                    <Flag size={16} /> {pr.reportProfileBtn}
                  </button>
                </div>
              )}
            </div>

            <div className="hero-tags">
              {profile.isAvailableForWork && (
                <span className="availability-badge">
                  <span className="dot"></span> {pr.availableForWorkTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-grid">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="panel profile-stats">
              <h3>{pr.overviewTitle}</h3>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label">
                    <Star size={16} className="icon-star" /> {pr.ratingLabel}
                  </span>
                  <span className="stat-value sh-mono">
                    {profile.stats?.rating?.average ?? "-"}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">
                    <Briefcase size={16} /> {pr.jobsLabel}
                  </span>
                  <span className="stat-value sh-mono">
                    {profile.stats?.jobsCompleted ?? 0}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">
                    <strong>ETB</strong> {pr.earnedLabel}
                  </span>
                  <span className="stat-value sh-mono">
                    {profile.stats?.earnedRange ?? "-"}
                  </span>
                </div>
                {memberSinceYear && (
                  <div className="stat-item">
                    <span className="stat-label">
                      <Calendar size={16} /> {pr.memberSinceLabel}
                    </span>
                    <span className="stat-value sh-mono">{memberSinceYear}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="panel profile-skills">
              <h3>{pr.skillsTitle}</h3>
              <div className="tags-list">
                {profile.skills.map((s) => (
                  <span key={s.id} className="tag">
                    {skillName(s)}
                  </span>
                ))}
                {profile.skills.length === 0 && (
                  <span className="tag">No skills listed yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="profile-main">
            <div className="panel profile-bio">
              <h3>{pr.aboutMeTitle}</h3>
              <p>{profile.bio || pr.noBioYet}</p>
            </div>

            <div className="panel profile-portfolio">
              <h3>{pr.portfolioTitle}</h3>
              {effectivePortfolio.length > 0 ? (
                <div className="portfolio-grid">
                  {effectivePortfolio.map((item) => (
                    <div key={item.id} className="portfolio-card">
                      <div className="portfolio-img-container">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} />
                        ) : (
                          <div className="portfolio-img-placeholder">
                            {item.title.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="portfolio-details">
                        <h4>{item.title}</h4>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "0.86rem" }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--color-text)" }}>
                    {pr.noPortfolioYet}
                  </p>
                  <p style={{ margin: 0 }}>{pr.noPortfolioHint}</p>
                </div>
              )}
            </div>

            {reviews.length > 0 && (
              <div className="panel profile-reviews">
                <h3>
                  {pr.reviewsTitle} ({reviews.length})
                </h3>
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < review.rating ? "filled" : "empty"}
                            />
                          ))}
                        </div>
                        {review.createdAt && (
                          <span className="review-date sh-mono">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {review.comment && (
                        <p className="review-comment">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report modal */}
      {reportModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Report Profile</h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="close-btn"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            {reportDone ? (
              <p className="modal-desc">
                Thank you. Our compliance team will review your report.
              </p>
            ) : (
              <>
                <p className="modal-desc">
                  Why are you reporting this profile?
                </p>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="">Select a reason...</option>
                  <option value="Fraud or scam">Fraud or scam</option>
                  <option value="Impersonation">Impersonation</option>
                  <option value="Inappropriate content">
                    Inappropriate content
                  </option>
                  <option value="Off-platform payment request">
                    Off-platform payment request
                  </option>
                  <option value="Other">Other</option>
                </select>
                <textarea
                  rows={4}
                  placeholder="Please provide details..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                ></textarea>
                {reportError && <p className="report-error">{reportError}</p>}
                <div className="modal-actions">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void submitReport()}
                    disabled={
                      reportSending ||
                      !reportReason ||
                      reportDetails.trim().length < 5
                    }
                    className="btn-danger"
                  >
                    {reportSending ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
