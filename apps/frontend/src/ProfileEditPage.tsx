import { useEffect, useState } from "react";
import { Save, Check, RefreshCw, Plus, Trash2 } from "lucide-react";
import { api, type UpdateProfilePayload } from "./api/client";
import { YekisAvatar } from "./components/YekisAvatar";
import { useI18n } from "./i18n";
import "./ProfilePage.css";

interface SkillTaxonomy {
  id: string;
  nameEn?: string;
  nameAm?: string;
}

export interface PortfolioProjectDraft {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

const PORTFOLIO_STORAGE_PREFIX = "yekis_portfolio_";

export function loadLocalPortfolio(userId: string): PortfolioProjectDraft[] {
  try {
    const raw = localStorage.getItem(`${PORTFOLIO_STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPortfolio(
  userId: string,
  items: PortfolioProjectDraft[],
): void {
  try {
    localStorage.setItem(
      `${PORTFOLIO_STORAGE_PREFIX}${userId}`,
      JSON.stringify(items),
    );
  } catch {
    // ignore storage errors
  }
}

interface ProfileFormState {
  firstName?: string;
  lastName?: string;
  bio?: string;
  primarySkillId?: string | null;
  skillIds: string[];
  isAvailableForWork?: boolean;
  /** Narrowed to the API's enum so an arbitrary string cannot reach PATCH. */
  profileVisibility?: UpdateProfilePayload["profileVisibility"];
  avatarUrl?: string | null;
  profileCompleteness?: number;
}

export const ProfileEditPage = () => {
  const { t, language: lang } = useI18n();
  const pr = t.workspace.profile;
  const [userId, setUserId] = useState<string>("me");
  const [formData, setFormData] = useState<ProfileFormState>({ skillIds: [] });
  const [portfolioItems, setPortfolioItems] = useState<PortfolioProjectDraft[]>([]);
  const [avatarSeed, setAvatarSeed] = useState<string>("");
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
      .then(({ me, profileRes, skillsRes }) => {
        if (cancelled) return;
        setUserId(me.id);
        setAvatarSeed(me.id);
        const p = profileRes as {
          firstName?: string;
          lastName?: string;
          bio?: string;
          primarySkillId?: string | null;
          skills?: { id: string }[];
          portfolio?: Array<{
            id: string;
            title: string;
            description?: string | null;
            thumbnailUrl?: string | null;
          }>;
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
          profileVisibility: "PUBLIC",
          avatarUrl: p.avatarUrl ?? null,
          profileCompleteness: p.profileCompleteness,
        });

        const serverPortfolio: PortfolioProjectDraft[] = (p.portfolio ?? []).map(
          (item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? "",
            thumbnailUrl: item.thumbnailUrl ?? "",
          }),
        );
        const localPortfolio = loadLocalPortfolio(me.id);
        setPortfolioItems(
          localPortfolio.length > 0 ? localPortfolio : serverPortfolio,
        );

        const s = skillsRes as
          | { items?: SkillTaxonomy[] }
          | SkillTaxonomy[]
          | null;
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

  const handleVisibilityChange = (
    val: NonNullable<UpdateProfilePayload["profileVisibility"]>,
  ) => {
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

  const addPortfolioProject = () => {
    setPortfolioItems((prev) => [
      ...prev,
      {
        id: `pf-${Date.now()}`,
        title: "",
        description: "",
        thumbnailUrl: "",
      },
    ]);
  };

  const updatePortfolioProject = (
    id: string,
    field: keyof Omit<PortfolioProjectDraft, "id">,
    value: string,
  ) => {
    setPortfolioItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removePortfolioProject = (id: string) => {
    setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const cleanedPortfolio = portfolioItems
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          description: item.description.trim(),
          thumbnailUrl: item.thumbnailUrl.trim(),
        }))
        .filter((item) => item.title.length > 0);

      saveLocalPortfolio(userId, cleanedPortfolio);
      if (userId !== "me") {
        saveLocalPortfolio("me", cleanedPortfolio);
      }

      await api.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        primarySkillId: formData.primarySkillId || undefined,
        skillIds: formData.skillIds,
        isAvailableForWork: formData.isAvailableForWork,
        profileVisibility: formData.profileVisibility,
      });
      setPortfolioItems(cleanedPortfolio);
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

  if (loading) {
    return (
      <div className="profile-edit-page">
        <div className="profile-edit-container">
          <div className="panel" style={{ padding: 28 }}>
            <div className="sh-skeleton" style={{ height: 22, width: "42%", marginBottom: 12 }} />
            <div className="sh-skeleton" style={{ height: 14, width: "68%", marginBottom: 24 }} />
            <div className="sh-skeleton" style={{ height: 120, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }
  if (loadError) return <div className="profile-error">{loadError}</div>;

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-container">
        <div className="completeness-card">
          <div className="completeness-info">
            <strong>{pr.completenessTitle}</strong>
            <span>{pr.completenessDesc}</span>
          </div>
          <div className="completeness-meter">
            <div className="completeness-bar">
              <div
                className="completeness-fill"
                style={{ width: `${formData.profileCompleteness || 0}%` }}
              />
            </div>
            <span className="completeness-pct sh-mono">
              {formData.profileCompleteness || 0}%
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-edit-form panel">
          {/* Section 0: Profile Character (Blobatar) */}
          <div className="form-section">
            <h3 className="form-section-title">{pr.avatarTitle}</h3>
            <p className="form-section-desc">{pr.avatarDesc}</p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <YekisAvatar
                seed={avatarSeed}
                avatarUrl={formData.avatarUrl}
                size={84}
                animate="hover"
                className="hero-avatar"
              />
              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const base = avatarSeed.split("#")[0] || "Yekis";
                    setAvatarSeed(`${base}#v${Math.floor(Math.random() * 10000)}`);
                  }}
                >
                  <RefreshCw size={15} />
                  {pr.shuffleAvatarBtn}
                </button>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginTop: 6,
                  }}
                >
                  {pr.shuffleAvatarHint}
                </div>
              </div>
            </div>
          </div>

          <hr className="form-divider" />

          {/* Section 1: Personal Details */}
          <div className="form-section">
            <h3 className="form-section-title">{pr.personalDetailsTitle}</h3>
            <div className="form-row-2col">
              <div className="form-field">
                <label>{pr.firstNameLabel}</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder={pr.firstNameLabel}
                />
              </div>
              <div className="form-field">
                <label>{pr.lastNameLabel}</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder={pr.lastNameLabel}
                />
              </div>
            </div>

            <div className="form-field">
              <label>{pr.bioLabel}</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                placeholder={pr.bioPlaceholder}
              />
            </div>
          </div>

          <hr className="form-divider" />

          {/* Section 2: Skills & Expertise */}
          <div className="form-section">
            <h3 className="form-section-title">{pr.skillsTitle}</h3>
            <p className="form-section-desc">{pr.skillsDesc}</p>

            <div className="form-field">
              <label>{pr.primarySkillLabel}</label>
              <select
                name="primarySkillId"
                value={formData.primarySkillId ?? ""}
                onChange={handleChange}
              >
                <option value="">{pr.selectPrimarySkill}</option>
                {skillTaxonomy.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {(lang === "am" && skill.nameAm) || skill.nameEn || skill.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>{pr.additionalSkillsLabel}</label>
              <p className="form-section-desc">{pr.additionalSkillsDesc}</p>
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
                      {(lang === "am" && skill.nameAm) || skill.nameEn || skill.id}
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

          {/* Section 2B: Portfolio Projects (FR-08) */}
          <div className="form-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 className="form-section-title">{pr.portfolioTitle}</h3>
                <p className="form-section-desc">{pr.portfolioDesc}</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={addPortfolioProject}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={15} /> {pr.addPortfolioBtn}
              </button>
            </div>

            {portfolioItems.length === 0 ? (
              <div
                style={{
                  padding: "18px",
                  borderRadius: 12,
                  border: "1px dashed var(--color-border-strong)",
                  background: "var(--color-bg-subtle)",
                  marginTop: 10,
                }}
              >
                <strong style={{ display: "block", fontSize: "0.9rem" }}>
                  {pr.noPortfolioYet}
                </strong>
                <p
                  style={{
                    margin: "4px 0 12px",
                    fontSize: "0.82rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {pr.noPortfolioHint}
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addPortfolioProject}
                >
                  <Plus size={14} /> {pr.addPortfolioBtn}
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                {portfolioItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg-subtle)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span className="status-pill info">
                        #{idx + 1} · {pr.portfolioTitle}
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removePortfolioProject(item.id)}
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          minHeight: 36,
                        }}
                      >
                        <Trash2 size={14} /> {pr.removeProjectBtn}
                      </button>
                    </div>
                    <div className="form-field">
                      <label>{pr.projectTitleLabel}</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updatePortfolioProject(item.id, "title", e.target.value)
                        }
                        placeholder={pr.projectTitlePlaceholder}
                      />
                    </div>
                    <div className="form-field">
                      <label>{pr.projectDescLabel}</label>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) =>
                          updatePortfolioProject(
                            item.id,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder={pr.projectDescPlaceholder}
                      />
                    </div>
                    <div className="form-field">
                      <label>{pr.projectThumbLabel}</label>
                      <input
                        type="url"
                        value={item.thumbnailUrl}
                        onChange={(e) =>
                          updatePortfolioProject(
                            item.id,
                            "thumbnailUrl",
                            e.target.value,
                          )
                        }
                        placeholder={pr.projectThumbPlaceholder}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="form-divider" />

          {/* Section 3: Preferences */}
          <div className="form-section">
            <h3 className="form-section-title">{pr.preferencesTitle}</h3>
            <p className="form-section-desc">{pr.preferencesDesc}</p>

            <div className="preference-card">
              <div className="preference-text">
                <strong>{pr.availableForWorkTitle}</strong>
                <span>{pr.availableForWorkDesc}</span>
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
              <label
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  margin: 0,
                }}
              >
                {pr.visibilityLabel}
              </label>
              <div className="visibility-pills">
                {(
                  [
                    {
                      id: "PUBLIC",
                      label: pr.visPublic,
                      desc: pr.visPublicDesc,
                    },
                    {
                      id: "PROPOSERS",
                      label: pr.visProposers,
                      desc: pr.visProposersDesc,
                    },
                    {
                      id: "PRIVATE",
                      label: pr.visPrivate,
                      desc: pr.visPrivateDesc,
                    },
                  ] as const
                ).map((vis) => (
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
                  <Check size={16} /> {pr.savedMsg}
                </span>
              )}
              {saveError && <span className="save-error-msg">{saveError}</span>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ minWidth: 160 }}
            >
              <Save size={16} />
              {saving ? pr.savingBtn : pr.saveChangesBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

