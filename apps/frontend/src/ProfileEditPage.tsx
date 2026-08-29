import { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";
import { api } from "./api/client";

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
              <h3>Skills &amp; Expertise</h3>

              <div className="form-group">
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

              <div className="form-group">
                <label>Additional Skills</label>
                <p className="field-hint">
                  Tap to toggle - selected skills are highlighted.
                </p>
                <div className="tags-list">
                  {skillTaxonomy.map((skill) => {
                    const selected = formData.skillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        className={`tag tag-toggle ${selected ? "tag-selected" : ""}`}
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

            <hr />

            <div className="preferences-section">
              <h3>Preferences</h3>

              <div className="preference-item">
                <div className="preference-info">
                  <h4>Available for Work</h4>
                  <p>Show a badge indicating you're accepting new projects</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="isAvailableForWork"
                    checked={!!formData.isAvailableForWork}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="form-group visibility-settings">
                <label>Profile Visibility</label>
                <div className="visibility-options">
                  {["PUBLIC", "PROPOSERS", "PRIVATE"].map((vis) => (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => handleVisibilityChange(vis)}
                      className={`visibility-btn ${formData.profileVisibility === vis ? "active" : ""}`}
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
            {saveError && <span className="report-error">{saveError}</span>}
            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
