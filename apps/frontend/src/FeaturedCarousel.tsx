import { useEffect, useState, useRef } from "react";
import {
  Star,
  Shield,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

import { api } from "./api/client";

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
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth / 2
          : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!talents.length) return null;

  return (
    <div className="carousel-section">
      <div className="carousel-header">
        <h2>Featured Talent</h2>
        <div className="carousel-controls">
          <button onClick={() => scroll("left")} className="carousel-btn">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => scroll("right")} className="carousel-btn">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="carousel-list">
        {talents.map((talent) => (
          <div
            key={talent.id}
            onClick={() => onProfileClick?.(talent.id)}
            className="carousel-card"
          >
            <div className="carousel-avatar-wrap">
              {talent.avatarUrl ? (
                <img src={talent.avatarUrl} alt={talent.displayName} />
              ) : (
                <div className="carousel-avatar-fallback">
                  {(talent.displayName || "?").charAt(0)}
                </div>
              )}
              <div
                className={`carousel-badge ${talent.kycBadge === "shield" ? "tier-2" : "tier-1"}`}
              >
                {talent.kycBadge === "shield" ? (
                  <Shield size={20} />
                ) : (
                  <CheckCircle size={20} />
                )}
              </div>
            </div>
            <h3 className="carousel-name">{talent.displayName}</h3>
            <p className="carousel-skill">
              {talent.primarySkill?.nameEn ?? ""}
            </p>

            <div className="carousel-rating">
              <Star size={14} />
              <span>{talent.ratingAverage ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
