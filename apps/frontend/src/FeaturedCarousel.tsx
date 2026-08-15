import { useEffect, useState, useRef } from 'react';
import { Star, Shield, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const mockApi = {
  getFeaturedTalent: async () => [
    { id: "1", name: "Sara T.", primarySkill: "UI/UX Designer", avatar: "https://i.pravatar.cc/150?img=5", rating: 4.9, kycTier: 2 },
    { id: "2", name: "Dawit M.", primarySkill: "Frontend Dev", avatar: "https://i.pravatar.cc/150?img=12", rating: 4.8, kycTier: 1 },
    { id: "3", name: "Helen B.", primarySkill: "Backend Dev", avatar: "https://i.pravatar.cc/150?img=9", rating: 5.0, kycTier: 2 },
    { id: "4", name: "Yared K.", primarySkill: "Mobile Dev", avatar: "https://i.pravatar.cc/150?img=11", rating: 4.7, kycTier: 0 },
    { id: "5", name: "Selam W.", primarySkill: "Data Scientist", avatar: "https://i.pravatar.cc/150?img=20", rating: 4.9, kycTier: 2 },
  ]
};

interface Talent {
  id: string;
  name: string;
  primarySkill: string;
  avatar: string;
  rating: number;
  kycTier: number;
}

export const FeaturedCarousel = ({ onProfileClick }: { onProfileClick?: (id: string) => void }) => {
  const [talents, setTalents] = useState<Talent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mockApi.getFeaturedTalent().then(setTalents);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!talents.length) return null;

  return (
    <div className="carousel-section">
      <div className="carousel-header">
        <h2>Featured Talent</h2>
        <div className="carousel-controls">
          <button onClick={() => scroll('left')} className="carousel-btn">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => scroll('right')} className="carousel-btn">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="carousel-list">
        {talents.map(talent => (
          <div 
            key={talent.id}
            onClick={() => onProfileClick?.(talent.id)}
            className="carousel-card"
          >
            <div className="carousel-avatar-wrap">
              <img src={talent.avatar} alt={talent.name} />
              <div className={`carousel-badge ${talent.kycTier >= 2 ? 'tier-2' : talent.kycTier === 1 ? 'tier-1' : 'tier-0'}`}>
                {talent.kycTier >= 2 ? (
                  <Shield size={20} />
                ) : talent.kycTier === 1 ? (
                  <CheckCircle size={20} />
                ) : null}
              </div>
            </div>
            <h3 className="carousel-name">{talent.name}</h3>
            <p className="carousel-skill">{talent.primarySkill}</p>
            
            <div className="carousel-rating">
              <Star size={14} />
              <span>{talent.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
