import React, { useEffect, useState, useRef } from 'react';
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

export const FeaturedCarousel = ({ onProfileClick }: { onProfileClick?: (id: string) => void }) => {
  const [talents, setTalents] = useState<any[]>([]);
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
    <div className="relative group py-6">
      <div className="flex justify-between items-center mb-6 px-4">
        <h2 className="text-2xl font-bold text-slate-900">Featured Talent</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')} 
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => scroll('right')} 
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-6 px-4 pb-4 snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {talents.map(talent => (
          <div 
            key={talent.id}
            onClick={() => onProfileClick?.(talent.id)}
            className="flex-none w-64 snap-start bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group/card"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img 
                  src={talent.avatar} 
                  alt={talent.name} 
                  className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md group-hover/card:scale-105 transition-transform" 
                />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                  {talent.kycTier >= 2 ? (
                    <Shield className="w-5 h-5 text-emerald-500" />
                  ) : talent.kycTier === 1 ? (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  ) : null}
                </div>
              </div>
              <h3 className="font-semibold text-lg text-slate-900">{talent.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{talent.primarySkill}</p>
              
              <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-amber-700">{talent.rating}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
