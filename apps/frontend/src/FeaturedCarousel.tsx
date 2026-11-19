import { useEffect, useState, useRef } from "react";
import {
  Star,
  Shield,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { YekisAvatar } from "./components/YekisAvatar";
import { api } from "./api/client";

// Shape mirrors backend featured.service.ts buildFeaturedCard()
interface Talent {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  primarySkill: { id: string; nameEn?: string } | null;
  ratingAverage: number | null;
  totalJobsCompleted: number;
  kycBadge: string | null;
}

export const FeaturedCarousel = ({
  onProfileClick,
}: {
  onProfileClick?: (id: string) => void;
}) => {
  const [talents, setTalents] = useState<Talent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getFeaturedTalent()
      .then((res) =>
        setTalents(
          ((res as { items?: Talent[] })?.items ?? res ?? []) as Talent[],
        ),
      )
      .catch(() => setTalents([])); // carousel is decorative - fail silently
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = Math.max(220, clientWidth * 0.75);
      const scrollTo =
        direction === "left"
          ? scrollLeft - scrollAmount
          : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!talents.length) return null;

  return (
    <section className="carousel-section" aria-label="Featured Talent">
      <div className="carousel-header">
        <div className="carousel-title-group">
          <h2>Featured Talent</h2>
          <span className="carousel-subtitle">Top verified professionals available for hire</span>
        </div>
        <div className="carousel-controls">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="carousel-btn"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="carousel-btn"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="carousel-list" role="region" aria-label="Talent list">
        {talents.map((talent) => {
          const name = talent.displayName?.trim() || "Verified Freelancer";
          const skillName =
            talent.primarySkill?.nameEn?.trim() || "Professional Freelancer";
          const hasRating =
            talent.ratingAverage !== null &&
            talent.ratingAverage !== undefined &&
            talent.ratingAverage > 0;

          return (
            <div
              key={talent.id}
              onClick={() => onProfileClick?.(talent.id)}
              className="carousel-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onProfileClick?.(talent.id);
                }
              }}
            >
              <div className="carousel-avatar-wrap">
                <YekisAvatar
                  userId={talent.id}
                  displayName={name}
                  avatarUrl={talent.avatarUrl}
                  size={72}
                  animate="hover"
                />
                {talent.kycBadge && (
                  <div
                    className={`carousel-badge ${talent.kycBadge === "shield" ? "tier-2" : "tier-1"}`}
                    title={talent.kycBadge === "shield" ? "Identity Verified" : "Verified"}
                    aria-label={talent.kycBadge === "shield" ? "Identity Verified" : "Verified"}
                  >
                    {talent.kycBadge === "shield" ? (
                      <Shield size={12} strokeWidth={2.5} />
                    ) : (
                      <CheckCircle size={12} strokeWidth={2.5} />
                    )}
                  </div>
                )}
              </div>

              <div className="carousel-info">
                <h3 className="carousel-name" title={name}>
                  {name}
                </h3>
                <p className="carousel-skill" title={skillName}>
                  {skillName}
                </p>

                <div className="carousel-meta">
                  <div className="carousel-rating">
                    {hasRating ? (
                      <>
                        <Star size={12} className="carousel-star filled" />
                        <span className="carousel-rating-num">
                          {Number(talent.ratingAverage).toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} className="carousel-star-new" />
                        <span className="carousel-new-label">New Talent</span>
                      </>
                    )}
                  </div>

                  {talent.totalJobsCompleted > 0 && (
                    <>
                      <span className="carousel-meta-divider" aria-hidden="true">•</span>
                      <span className="carousel-jobs">
                        {talent.totalJobsCompleted} {talent.totalJobsCompleted === 1 ? "job" : "jobs"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="carousel-view-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onProfileClick?.(talent.id);
                }}
              >
                View Profile
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
