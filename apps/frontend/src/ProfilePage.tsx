import React, { useEffect, useState } from 'react';
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

export const ProfilePage = ({ userId = "123" }: { userId?: string }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    mockApi.getPublicProfile(userId).then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-16 mb-4">
              <div className="flex items-end space-x-5">
                <img src={profile.avatar} alt={profile.displayName} className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover" />
                <div className="pb-2">
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    {profile.displayName}
                    {profile.kycTier >= 2 ? (
                      <Shield className="w-6 h-6 text-emerald-500" />
                    ) : profile.kycTier === 1 ? (
                      <CheckCircle className="w-6 h-6 text-blue-500" />
                    ) : null}
                  </h1>
                  <p className="text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" /> {profile.location}
                  </p>
                </div>
              </div>
              <div className="pb-2 flex gap-3">
                <button 
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Report Profile
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                <Briefcase className="w-4 h-4" /> {profile.primarySkill}
              </span>
              {profile.isAvailableForWork && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available for work
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-8 lg:col-span-1">
            {/* Stats */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Rating</span>
                  <span className="font-semibold text-slate-900">{profile.averageRating}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Jobs</span>
                  <span className="font-semibold text-slate-900">{profile.jobsCompleted}</span>
                </div>
                {profile.earnedRange && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-2"><span className="font-serif font-bold text-slate-400">$</span> Earned</span>
                    <span className="font-semibold text-slate-900">{profile.earnedRange}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Member Since</span>
                  <span className="font-semibold text-slate-900">{profile.memberSince}</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-default">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">About Me</h3>
              <p className="text-slate-600 leading-relaxed">
                {profile.bio}
              </p>
            </div>

            {/* Portfolio */}
            {profile.portfolio?.length > 0 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Portfolio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {profile.portfolio.map((item: any) => (
                    <div key={item.id} className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-all">
                      <div className="h-48 overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-4 bg-slate-50">
                        <h4 className="font-semibold text-slate-900">{item.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {profile.reviews?.length > 0 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Reviews</h3>
                <div className="space-y-6">
                  {profile.reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{review.author}</span>
                          <span className="text-sm text-slate-400">• {review.date}</span>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600">{review.comment}</p>
                      {review.response && (
                        <div className="mt-3 bg-slate-50 p-4 rounded-xl ml-4 border-l-2 border-indigo-200">
                          <p className="text-sm font-medium text-slate-900 mb-1">Response from {profile.displayName}</p>
                          <p className="text-sm text-slate-600">{review.response}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Report Profile</h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-500 mb-4">Why are you reporting this profile?</p>
            <textarea 
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
              rows={4} 
              placeholder="Please provide details..."
            ></textarea>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
