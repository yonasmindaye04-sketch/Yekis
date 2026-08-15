import { useEffect, useState } from 'react';
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
  updateProfile: async () => { return true; }
};

interface ProfileEditData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  primarySkill?: string;
  skills?: string[];
  isAvailableForWork?: boolean;
  visibility?: string;
  avatar?: string;
  profileCompleteness?: number;
  [key: string]: string | string[] | boolean | number | undefined;
}

export const ProfileEditPage = () => {
  const [formData, setFormData] = useState<ProfileEditData>({});
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

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-container">
        
        <div className="profile-edit-header">
          <h1>Edit Profile</h1>
          <div className="completeness-indicator">
            <span>Profile Completeness</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${formData.profileCompleteness || 0}%` }}
              ></div>
            </div>
            <strong>{formData.profileCompleteness}%</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-edit-form panel">
          <div className="form-content">
            
            <div className="avatar-section">
              <div className="avatar-upload">
                <img 
                  src={formData.avatar} 
                  alt="Avatar preview" 
                />
                <div className="avatar-overlay">
                  <Camera size={24} />
                </div>
                <input type="file" accept="image/*" />
              </div>
              <div className="avatar-info">
                <h3>Profile Picture</h3>
                <p>Upload a professional headshot. PNG or JPG under 5MB.</p>
              </div>
            </div>

            <hr />

            <div className="form-grid">
              <div className="form-group">
                <label>First Name</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Professional Bio</label>
              <textarea 
                name="bio" 
                value={formData.bio} 
                onChange={handleChange}
                rows={4}
                placeholder="Tell clients about your expertise..."
              />
            </div>

            <hr />

            <div className="skills-section">
              <h3>Skills & Expertise</h3>
              
              <div className="form-group">
                <label>Primary Skill</label>
                <select 
                  name="primarySkill"
                  value={formData.primarySkill}
                  onChange={handleChange}
                >
                  <option value="">Select your main expertise</option>
                  {skills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Secondary Skills</label>
                <div className="tags-list">
                  {formData.skills?.map((skill: string) => (
                    <span key={skill} className="tag">
                      {skill}
                      <button type="button" onClick={() => removeSecondarySkill(skill)}>&times;</button>
                    </span>
                  ))}
                </div>
                <div className="add-skill-input">
                  <input 
                    type="text" 
                    value={newSkill} 
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSecondarySkill())}
                    placeholder="e.g. Graphic Design"
                  />
                  <button type="button" onClick={addSecondarySkill} className="btn-secondary">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <hr />

            <div className="preferences-section">
              <h3>Preferences</h3>
              
              <div className="preference-item">
                <div className="preference-info">
                  <h4>Available for Work</h4>
                  <p>Show a badge indicating you're accepting new projects</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" name="isAvailableForWork" checked={formData.isAvailableForWork} onChange={handleChange} />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="form-group visibility-settings">
                <label>Profile Visibility</label>
                <div className="visibility-options">
                  {['PUBLIC', 'PROPOSERS', 'PRIVATE'].map(vis => (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => handleVisibilityChange(vis)}
                      className={`visibility-btn ${formData.visibility === vis ? 'active' : ''}`}
                    >
                      {vis.charAt(0) + vis.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
          
          <div className="form-actions">
            {saveSuccess && (
              <span className="success-msg">
                <Check size={16} /> Saved successfully
              </span>
            )}
            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
