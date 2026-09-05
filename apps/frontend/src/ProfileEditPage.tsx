import { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";
import { api } from "./api/client";
import "./ProfilePage.css";

interface SkillTaxonomy {
  id: string;
  nameEn?: string;
  nameAm?: string;
}

interface ProfileFormState {
  firstName?: string;
  lastName?: string;
  bio?: string;
  primarySkillId?: string | null;
  skillIds: string[];
  isAvailableForWork?: boolean;
  profileVisibility?: string;
  avatarUrl?: string | null;
  profileCompleteness?: number;
}

export const ProfileEditPage = () => {
  const [formData, setFormData] = useState<ProfileFormState>({ skillIds: [] });
  const [skillTaxonomy, setSkillTaxonomy] = useState<SkillTaxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Resolve own id first (the edit page edits the signed-in user), then
    // pull the full public-profile projection which carries names/bio/skills.
    api
      .getMe()
      .then((me) =>
        Promise.all([
          api.getPublicProfile(me.id),
          api.getSkills().catch(() => []),
        ]).then(([profileRes, skillsRes]) => ({ me, profileRes, skillsRes })),
      )
      .then(({ profileRes, skillsRes }) => {
        if (cancelled) return;
        const p = profileRes as {
          firstName?: string;
          lastName?: string;
          bio?: string;
          primarySkillId?: string | null;
          skills?: { id: string }[];
          isAvailableForWork?: boolean;
          avatarUrl?: string | null;
          profileCompleteness?: number;
        };

        setFormData({
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          bio: p.bio ?? "",
          primarySkillId: p.primarySkillId ?? "",
          skillIds: (p.skills ?? []).map((s) => s.id),
          isAvailableForWork: p.isAvailableForWork ?? false,
          profileVisibility: "PUBLIC", // not exposed by public projection; user re-picks if needed
          avatarUrl: p.avatarUrl ?? null,
          profileCompleteness: p.profileCompleteness,
        });

        const s = skillsRes as
          { items?: SkillTaxonomy[] } | SkillTaxonomy[] | null;
        setSkillTaxonomy(Array.isArray(s) ? s : (s?.items ?? []));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load your profile.",
          );
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleVisibilityChange = (val: string) => {
    setFormData({ ...formData, profileVisibility: val });
  };

  const toggleSkill = (id: string) => {
    const current = formData.skillIds ?? [];
    setFormData({
      ...formData,
      skillIds: current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        primarySkillId: formData.primarySkillId || undefined,
        skillIds: formData.skillIds,
        isAvailableForWork: formData.isAvailableForWork,
        profileVisibility: formData.profileVisibility,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save changes",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (loadError) return <div className="profile-error">{loadError}</div>;

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-container">
        <div className="completeness-card">
          <div className="completeness-info">
            <strong>Profile Completeness</strong>
            <span>Complete your profile to build trust and win higher-value contracts</span>
          </div>
          <div className="completeness-meter">
            <div className="completeness-bar">
              <div
                className="completeness-fill"
                style={{ width: `${formData.profileCompleteness || 0}%` }}
              />
            </div>
            <span className="completeness-pct">{formData.profileCompleteness || 0}%</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-edit-form panel">
          {/* Section 1: Personal Details */}
          <div className="form-section">
            <h3 className="form-section-title">Personal Details</h3>
            <div className="form-row-2col">
              <div className="form-field">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="First name"
                />
              </div>
              <div className="form-field">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="form-field">
              <label>Professional Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                placeholder="Tell clients about your expertise, background, and what makes your work exceptional..."
              />
            </div>
          </div>

          <hr className="form-divider" />

          {/* Section 2: Skills & Expertise */}
          <div className="form-section">
            <h3 className="form-section-title">Skills &amp; Expertise</h3>
            <p className="form-section-desc">
              Highlight your core specializations so clients can discover you for relevant projects.
            </p>

            <div className="form-field">
              <label>Primary Skill</label>
              <select
                name="primarySkillId"
                value={formData.primarySkillId ?? ""}
                onChange={handleChange}
              >
                <option value="">Select your main expertise</option>
                {skillTaxonomy.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.nameEn ?? skill.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Additional Skills</label>
              <p className="form-section-desc">
                Tap to toggle – selected skills are highlighted.
              </p>
              <div className="skills-tags-container">
                {skillTaxonomy.map((skill) => {
                  const selected = formData.skillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className={`tag-toggle-btn ${selected ? "selected" : ""}`}
                      onClick={() => toggleSkill(skill.id)}
                    >
                      {skill.nameEn ?? skill.id}
                    </button>
                  );
                })}
                {skillTaxonomy.length === 0 && (
                  <span className="tag">No skills available</span>
                )}
              </div>
            </div>
          </div>

          <hr className="form-divider" />

          {/* Section 3: Preferences */}
          <div className="form-section">
            <h3 className="form-section-title">Preferences</h3>
            <p className="form-section-desc">
              Manage your marketplace availability and client visibility options.
            </p>

            <div className="preference-card">
              <div className="preference-text">
                <strong>Available for Work</strong>
                <span>Show an active badge indicating you're accepting new projects</span>
              </div>
              <label className="switch-control">
                <input
                  type="checkbox"
                  name="isAvailableForWork"
                  checked={!!formData.isAvailableForWork}
                  onChange={handleChange}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="visibility-group">
              <label style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                Profile Visibility
              </label>
              <div className="visibility-pills">
                {[
                  { id: "PUBLIC", label: "Public", desc: "Visible to all clients across the marketplace" },
                  { id: "PROPOSERS", label: "Clients Only", desc: "Visible only when you submit proposals" },
                  { id: "PRIVATE", label: "Private", desc: "Hidden from search; only visible in active contracts" },
                ].map((vis) => (
                  <button
                    key={vis.id}
                    type="button"
                    onClick={() => handleVisibilityChange(vis.id)}
                    className={`visibility-pill-btn ${formData.profileVisibility === vis.id ? "active" : ""}`}
                  >
                    <strong>{vis.label}</strong>
                    <small>{vis.desc}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions-bar">
            <div>
              {saveSuccess && (
                <span className="save-status-msg">
                  <Check size={16} /> Saved successfully
                </span>
              )}
              {saveError && <span className="save-error-msg">{saveError}</span>}
            </div>
            <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: 160 }}>
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
