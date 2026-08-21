import { useEffect, useState } from 'react';
import { Shield, CheckCircle, Star, MapPin, Briefcase, Flag, Calendar, X } from 'lucide-react';

const mockApi = {
  getPublicProfile: async (id: string) => ({
    id,
    displayName: "Abebe Kebede",
    avatar: "https://i.pravatar.cc/300?img=11",
    kycTier: 2,
    isAvailableForWork: true,
    primarySkill: "Full Stack Developer",
    skills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
    bio: "Passionate developer with 5+ years of experience building scalable web applications. I love creating beautiful and intuitive user interfaces.",
    location: "Addis Ababa, Ethiopia",
    memberSince: "2023",
    jobsCompleted: 42,
    earnedRange: "$10k+",
    averageRating: 4.9,
    portfolio: [
      { id: 1, title: "E-commerce App", description: "A complete online store.", image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=500&q=80" },
      { id: 2, title: "Fintech Dashboard", description: "Analytics for finance.", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80" }
    ],
    reviews: [
      { id: 1, rating: 5, author: "Chala M.", comment: "Excellent work, delivered on time!", date: "2 months ago", response: "Thank you, Chala!" }
    ]
  })
};

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  image: string;
}

interface ReviewItem {
  id: number;
  rating: number;
  author: string;
  comment: string;
  date: string;
  response?: string;
}

interface PublicProfileData {
  id: string;
  displayName: string;
  avatar: string;
  kycTier: number;
  isAvailableForWork: boolean;
  primarySkill: string;
  skills: string[];
  bio: string;
  location: string;
  memberSince: string;
  jobsCompleted: number;
  earnedRange?: string;
  averageRating: number;
  portfolio?: PortfolioItem[];
  reviews?: ReviewItem[];
}

export const ProfilePage = ({ userId = "123" }: { userId?: string }) => {
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    mockApi.getPublicProfile(userId).then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="profile-view-page">
      <div className="profile-view-container">
        
        {/* Hero Section */}
        <div className="profile-hero panel">
          <div className="hero-banner"></div>
          <div className="hero-content">
            <div className="hero-top-row">
              <div className="hero-user-info">
                <img src={profile.avatar} alt={profile.displayName} className="hero-avatar" />
                <div className="hero-text">
                  <h1>
                    {profile.displayName}
                    {profile.kycTier >= 2 ? (
                      <Shield className="tier-badge gold" size={24} />
                    ) : profile.kycTier === 1 ? (
                      <CheckCircle className="tier-badge silver" size={24} />
                    ) : null}
                  </h1>
                  <p className="hero-location">
                    <MapPin size={16} /> {profile.location}
                  </p>
                </div>
              </div>
              <div className="hero-actions">
                <button onClick={() => setReportModalOpen(true)} className="btn-secondary report-btn">
                  <Flag size={16} /> Report Profile
                </button>
              </div>
            </div>
            
            <div className="hero-tags">
              <span className="skill-tag primary">
                <Briefcase size={16} /> {profile.primarySkill}
              </span>
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
            {/* Stats */}
            <div className="panel profile-stats">
              <h3>Overview</h3>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label"><Star size={16} className="icon-star" /> Rating</span>
                  <span className="stat-value">{profile.averageRating}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><Briefcase size={16} /> Jobs</span>
                  <span className="stat-value">{profile.jobsCompleted}</span>
                </div>
                {profile.earnedRange && (
                  <div className="stat-item">
                    <span className="stat-label"><strong>$</strong> Earned</span>
                    <span className="stat-value">{profile.earnedRange}</span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-label"><Calendar size={16} /> Member Since</span>
                  <span className="stat-value">{profile.memberSince}</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="panel profile-skills">
              <h3>Skills</h3>
              <div className="tags-list">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className="tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="profile-main">
            {/* Bio */}
            <div className="panel profile-bio">
              <h3>About Me</h3>
              <p>{profile.bio}</p>
            </div>

            {/* Portfolio */}
            {(profile.portfolio?.length ?? 0) > 0 && (
              <div className="panel profile-portfolio">
                <h3>Portfolio</h3>
                <div className="portfolio-grid">
                  {profile.portfolio?.map((item: PortfolioItem) => (
                    <div key={item.id} className="portfolio-card">
                      <div className="portfolio-img-container">
                        <img src={item.image} alt={item.title} />
                      </div>
                      <div className="portfolio-details">
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {(profile.reviews?.length ?? 0) > 0 && (
              <div className="panel profile-reviews">
                <h3>Reviews</h3>
                <div className="reviews-list">
                  {profile.reviews?.map((review: ReviewItem) => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="review-author">
                          <strong>{review.author}</strong>
                          <span>• {review.date}</span>
                        </div>
                        <div className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} className={i < review.rating ? 'filled' : 'empty'} />
                          ))}
                        </div>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                      {review.response && (
                        <div className="review-response">
                          <strong>Response from {profile.displayName}</strong>
                          <p>{review.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Report Profile</h3>
              <button onClick={() => setReportModalOpen(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <p className="modal-desc">Why are you reporting this profile?</p>
            <textarea 
              rows={4} 
              placeholder="Please provide details..."
            ></textarea>
            <div className="modal-actions">
              <button onClick={() => setReportModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => setReportModalOpen(false)} className="btn-danger">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
