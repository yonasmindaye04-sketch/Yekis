import { useEffect, useState } from 'react';
import { Shield, CheckCircle, Star, Briefcase, Flag, Calendar, X } from 'lucide-react';
import { api } from './api/client';
import './ProfilePage.css';

// Shape mirrors backend profile.service.ts getPublicProfile()
interface SkillRef {
  id: string;
  nameEn?: string;
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
        setReviews(Array.isArray(r) ? r : r?.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load this profile.";
        setLoadError(message.toLowerCase().includes("private") ? "This profile is private." : message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <div className="loading-spinner">Loading profile...</div>;
  if (loadError) return <div className="profile-error">{loadError}</div>;
  if (!profile) return null;

  const skillName = (s: SkillRef) => s.nameEn ?? s.name ?? s.id;
  const primarySkill = profile.skills.find((s) => s.id === profile.primarySkillId);
  const memberSinceYear = profile.stats?.memberSince
    ? new Date(profile.stats.memberSince).getFullYear()
    : null;

  const submitReport = async () => {
    setReportError(null);
    setReportSending(true);
    try {
      await api.reportProfile(profile.id, reportReason || "Other", reportDetails);
      setReportDone(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to submit report");
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
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="hero-avatar" />
                ) : (
                  <div className="hero-avatar hero-avatar-fallback">
                    {(profile.displayName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hero-text">
                  <h1>
                    {profile.displayName}
                    {profile.kyc?.status === "VERIFIED" && profile.kyc.tier === "TIER_3" && (
                      <Shield className="tier-badge gold" size={24} />
                    )}
                    {profile.kyc?.status === "VERIFIED" && profile.kyc.tier === "TIER_2" && (
                      <Shield className="tier-badge gold" size={24} />
                    )}
                    {profile.kyc?.status === "VERIFIED" && profile.kyc.tier === "TIER_1" && (
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
                  <button onClick={() => { setReportModalOpen(true); setReportDone(false); }} className="report-btn">
                    <Flag size={16} /> Report Profile
                  </button>
                </div>
              )}
            </div>

            <div className="hero-tags">
              {profile.isAvailableForWork && (
                <span className="availability-badge">
                  <span className="dot"></span> Available for work
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-grid">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="panel profile-stats">
              <h3>Overview</h3>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label"><Star size={16} className="icon-star" /> Rating</span>
                  <span className="stat-value">{profile.stats?.rating?.average ?? "-"}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><Briefcase size={16} /> Jobs</span>
                  <span className="stat-value">{profile.stats?.jobsCompleted ?? 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><strong>$</strong> Earned</span>
                  <span className="stat-value">{profile.stats?.earnedRange ?? "-"}</span>
                </div>
                {memberSinceYear && (
                  <div className="stat-item">
                    <span className="stat-label"><Calendar size={16} /> Member Since</span>
                    <span className="stat-value">{memberSinceYear}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="panel profile-skills">
              <h3>Skills</h3>
              <div className="tags-list">
                {profile.skills.map((s) => (
                  <span key={s.id} className="tag">{skillName(s)}</span>
                ))}
                {profile.skills.length === 0 && <span className="tag">No skills listed yet</span>}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="profile-main">
            <div className="panel profile-bio">
              <h3>About Me</h3>
              <p>{profile.bio || "No bio provided yet."}</p>
            </div>

            {(profile.portfolio?.length ?? 0) > 0 && (
              <div className="panel profile-portfolio">
                <h3>Portfolio</h3>
                <div className="portfolio-grid">
                  {profile.portfolio.map((item) => (
                    <div key={item.id} className="portfolio-card">
                      <div className="portfolio-img-container">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} />
                        ) : (
                          <div className="portfolio-img-placeholder">{item.title.charAt(0)}</div>
                        )}
                      </div>
                      <div className="portfolio-details">
                        <h4>{item.title}</h4>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <div className="panel profile-reviews">
                <h3>Reviews ({reviews.length})</h3>
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < review.rating ? "filled" : "empty"} />
                          ))}
                        </div>
                        {review.createdAt && (
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {review.comment && <p className="review-comment">{review.comment}</p>}
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
              <button onClick={() => setReportModalOpen(false)} className="close-btn" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {reportDone ? (
              <p className="modal-desc">Thank you. Our compliance team will review your report.</p>
            ) : (
              <>
                <p className="modal-desc">Why are you reporting this profile?</p>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                  <option value="">Select a reason...</option>
                  <option value="Fraud or scam">Fraud or scam</option>
                  <option value="Impersonation">Impersonation</option>
                  <option value="Inappropriate content">Inappropriate content</option>
                  <option value="Off-platform payment request">Off-platform payment request</option>
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
                  <button onClick={() => setReportModalOpen(false)} className="btn-secondary">Cancel</button>
                  <button
                    onClick={() => void submitReport()}
                    disabled={reportSending || !reportReason || reportDetails.trim().length < 5}
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
