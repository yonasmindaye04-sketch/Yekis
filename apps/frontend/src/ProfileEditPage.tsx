import React, { useEffect, useState } from 'react';
import { Camera, Save, Check } from 'lucide-react';

const mockApi = {
  getPublicProfile: async () => ({
    firstName: "Abebe",
    lastName: "Kebede",
    bio: "Passionate developer with 5+ years of experience building scalable web applications. I love creating beautiful and intuitive user interfaces.",
    primarySkill: "Full Stack Developer",
    skills: ["React", "TypeScript", "Node.js"],
    isAvailableForWork: true,
    visibility: "PUBLIC",
    avatar: "https://i.pravatar.cc/300?img=11",
    profileCompleteness: 85
  }),
  getSkills: async () => ["Full Stack Developer", "Frontend Developer", "Backend Developer", "UI/UX Designer", "Product Manager"],
  updateProfile: async (data: any) => { return true; }
};

export const ProfileEditPage = () => {
  const [formData, setFormData] = useState<any>({});
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    Promise.all([
      mockApi.getPublicProfile(),
      mockApi.getSkills()
    ]).then(([profileData, skillsData]) => {
      setFormData(profileData);
      setSkills(skillsData);
      setLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleVisibilityChange = (val: string) => {
    setFormData({ ...formData, visibility: val });
  };

  const addSecondarySkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill] });
      setNewSkill("");
    }
  };

  const removeSecondarySkill = (skillToRemove: string) => {
    setFormData({ 
      ...formData, 
      skills: formData.skills.filter((s: string) => s !== skillToRemove) 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await mockApi.updateProfile(formData);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Edit Profile</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500">Profile Completeness</span>
            <div className="w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                style={{ width: `${formData.profileCompleteness || 0}%` }}
              ></div>
            </div>
            <span className="text-sm font-bold text-indigo-600">{formData.profileCompleteness}%</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 space-y-8">
            
            {/* Avatar section */}
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer">
                <img 
                  src={formData.avatar} 
                  alt="Avatar preview" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 group-hover:border-indigo-100 transition-colors"
                />
                <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Profile Picture</h3>
                <p className="text-sm text-slate-500">Upload a professional headshot. PNG or JPG under 5MB.</p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">First Name</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Last Name</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Professional Bio</label>
              <textarea 
                name="bio" 
                value={formData.bio} 
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
                placeholder="Tell clients about your expertise..."
              />
            </div>

            <hr className="border-slate-100" />

            {/* Skills */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-900">Skills & Expertise</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Primary Skill</label>
                <select 
                  name="primarySkill"
                  value={formData.primarySkill}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">Select your main expertise</option>
                  {skills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Secondary Skills</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.skills?.map((skill: string) => (
                    <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                      {skill}
                      <button type="button" onClick={() => removeSecondarySkill(skill)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newSkill} 
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSecondarySkill())}
                    placeholder="e.g. Graphic Design"
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="button" onClick={addSecondarySkill} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Settings */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-900">Preferences</h3>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-medium text-slate-900">Available for Work</h4>
                  <p className="text-sm text-slate-500">Show a badge indicating you're accepting new projects</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isAvailableForWork" checked={formData.isAvailableForWork} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Profile Visibility</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['PUBLIC', 'PROPOSERS', 'PRIVATE'].map(vis => (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => handleVisibilityChange(vis)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.visibility === vis 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {vis.charAt(0) + vis.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
          
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
            {saveSuccess && (
              <span className="text-emerald-600 flex items-center gap-1.5 text-sm font-medium">
                <Check className="w-4 h-4" /> Saved successfully
              </span>
            )}
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
