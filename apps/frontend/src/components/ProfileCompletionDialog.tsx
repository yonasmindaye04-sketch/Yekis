import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  FileText,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, type MeResponse } from "../api/client";
import {
  YekisAvatar,
  loadAvatarOverride,
  saveAvatarOverride,
} from "./YekisAvatar";
import { useLocation, useNavigate } from "../router/HashRouter";
import { useI18n } from "../i18n";

interface SkillTaxonomyItem {
  id: string;
  name?: string;
  nameEn?: string;
  nameAm?: string;
}

export interface ProfileCompletionSummary {
  hasCustomPhoto: boolean;
  hasBioAndName: boolean;
  hasRequiredSkills: boolean;
  requiresSkills: boolean;
  missingItems: Array<"photo" | "bio" | "skills">;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
}

/** Compress & square-crop uploaded avatar image to a lightweight JPEG Data URL */
function compressAvatarFile(file: File, maxDim = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please select a valid image file (JPG, PNG, WEBP, or GIF)."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Image must be smaller than 10 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = Math.min(img.width, img.height);
          const sx = Math.max(0, Math.floor((img.width - size) / 2));
          const sy = Math.max(0, Math.floor((img.height - size) / 2));
          const target = Math.min(maxDim, size || maxDim);
          canvas.width = target;
          canvas.height = target;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function evaluateProfileCompletion(params: {
  role: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  primarySkillId?: string | null;
  skillIds?: string[];
}): ProfileCompletionSummary {
  const requiresSkills =
    params.role === "FREELANCER" || params.role === "BOTH";
  const hasCustomPhoto = Boolean(params.avatarUrl && params.avatarUrl.trim().length > 0);
  const hasBioAndName = Boolean(
    params.firstName?.trim() &&
      params.lastName?.trim() &&
      (params.bio?.trim().length ?? 0) >= 20,
  );
  const hasRequiredSkills = requiresSkills
    ? Boolean(params.primarySkillId && (params.skillIds?.length ?? 0) >= 2)
    : true;

  const missingItems: Array<"photo" | "bio" | "skills"> = [];
  if (!hasCustomPhoto) missingItems.push("photo");
  if (!hasBioAndName) missingItems.push("bio");
  if (requiresSkills && !hasRequiredSkills) missingItems.push("skills");

  const totalCount = requiresSkills ? 3 : 2;
  const completedCount = totalCount - missingItems.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    hasCustomPhoto,
    hasBioAndName,
    hasRequiredSkills,
    requiresSkills,
    missingItems,
    completedCount,
    totalCount,
    percentage,
    isComplete: missingItems.length === 0,
  };
}

export interface ProfileCompletionDialogProps {
  user: MeResponse;
  role: "CLIENT" | "FREELANCER" | "BOTH" | "ADMIN" | "MEDIATOR";
  onSaved?: () => void;
  onOpenFullEditor?: () => void;
}

export function ProfileCompletionDialog({
  user,
  role,
  onSaved,
  onOpenFullEditor,
}: ProfileCompletionDialogProps) {
  const { language: lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const isOpen = Boolean(location.state?.showProfileCompletion);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarSeed, setAvatarSeed] = useState<string>(user.id || "me");
  const [primarySkillId, setPrimarySkillId] = useState<string>("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillTaxonomyItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  /** Controls the mobile bottom-sheet expansion state (collapsed docked bar by default on mobile) */
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoSectionRef = useRef<HTMLDivElement | null>(null);
  const bioSectionRef = useRef<HTMLDivElement | null>(null);
  const skillsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingProfile(true);
    setSaveError(null);
    setSaveSuccess(false);
    setMobileSheetOpen(false);

    const storedOverride = loadAvatarOverride(user.id);
    if (storedOverride?.seed) {
      setAvatarSeed(storedOverride.seed);
    } else {
      setAvatarSeed(user.id || "me");
    }

    Promise.all([
      api.getPublicProfile(user.id).catch(() => null),
      api.getSkills().catch(() => []),
    ])
      .then(([profileRes, skillsRes]) => {
        if (cancelled) return;
        const p = (profileRes ?? {}) as {
          firstName?: string | null;
          lastName?: string | null;
          bio?: string | null;
          avatarUrl?: string | null;
          primarySkillId?: string | null;
          skills?: Array<{ id: string }>;
        };

        const resolvedAvatar =
          storedOverride && "avatarUrl" in storedOverride
            ? (storedOverride.avatarUrl ?? null)
            : (p.avatarUrl ?? user.avatarUrl ?? null);

        setFirstName(p.firstName ?? user.firstName ?? "");
        setLastName(p.lastName ?? user.lastName ?? "");
        setBio(p.bio ?? "");
        setAvatarUrl(resolvedAvatar);
        setPrimarySkillId(p.primarySkillId ?? "");
        setSkillIds((p.skills ?? []).map((s) => s.id));

        const s = skillsRes as
          | { items?: SkillTaxonomyItem[] }
          | SkillTaxonomyItem[]
          | null;
        setSkillsCatalog(Array.isArray(s) ? s : (s?.items ?? []));
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user.id, user.firstName, user.lastName, user.avatarUrl]);

  const closeDialog = () => {
    navigate(location.pathname || "/overview", {
      replace: true,
      state: {
        ...location.state,
        showProfileCompletion: false,
      },
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileSheetOpen) {
          setMobileSheetOpen(false);
        } else {
          closeDialog();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const summary = useMemo(
    () =>
      evaluateProfileCompletion({
        role,
        avatarUrl,
        firstName,
        lastName,
        bio,
        primarySkillId,
        skillIds,
      }),
    [role, avatarUrl, firstName, lastName, bio, primarySkillId, skillIds],
  );

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressAvatarFile(file);
      setAvatarUrl(compressedDataUrl);
      saveAvatarOverride(user.id, {
        avatarUrl: compressedDataUrl,
        seed: avatarSeed,
      });
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Could not process image.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRevertToBlobatar = () => {
    setPhotoError(null);
    setAvatarUrl(null);
    saveAvatarOverride(user.id, { avatarUrl: null, seed: avatarSeed });
  };

  const toggleSkill = (id: string) => {
    setSkillIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      if (!primarySkillId && next.length > 0) {
        setPrimarySkillId(next[0]);
      } else if (primarySkillId === id && !next.includes(id)) {
        setPrimarySkillId(next[0] ?? "");
      }
      return next;
    });
  };

  const handlePrimarySkillSelect = (id: string) => {
    setPrimarySkillId(id);
    if (id && !skillIds.includes(id)) {
      setSkillIds((prev) => [...prev, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const ensuredSkillIds =
        primarySkillId && !skillIds.includes(primarySkillId)
          ? [primarySkillId, ...skillIds]
          : skillIds;

      saveAvatarOverride(user.id, {
        avatarUrl: avatarUrl ?? null,
        seed: avatarSeed,
      });

      await api.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        bio: bio.trim(),
        primarySkillId: primarySkillId || undefined,
        skillIds: ensuredSkillIds,
        avatarUrl: avatarUrl ?? null,
      });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`yekis_new_user_nudge_${user.id}`);
        window.localStorage.removeItem("yekis_new_user_nudge_me");
      }
      setSaveSuccess(true);
      onSaved?.();
      setTimeout(() => {
        closeDialog();
      }, 450);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to save profile updates.",
      );
    } finally {
      setSaving(false);
    }
  };

  const skillLabel = (s: SkillTaxonomyItem) =>
    (lang === "am" && s.nameAm) || s.nameEn || s.name || s.id;

  const liveDisplayName =
    `${firstName.trim()} ${lastName.trim()}`.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Your Full Name";

  const primarySkillObj = skillsCatalog.find((s) => s.id === primarySkillId);
  const selectedSkillObjects = skillsCatalog.filter((s) =>
    skillIds.includes(s.id),
  );

  return (
    <div
      className="sh-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-dialog-title"
      onClick={closeDialog}
    >
      <div
        className="sh-profile-completion-dialog sh-pcd-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sh-pcd-header">
          <div className="sh-pcd-header-left">
            <span className="sh-pcd-eyebrow">Profile setup</span>
            <h2 id="profile-completion-dialog-title" className="sh-pcd-title">
              Complete your profile
            </h2>
            <p className="sh-pcd-subtitle">
              Add a photo and a few details so clients and collaborators
              know who they are working with.
            </p>
          </div>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={closeDialog}
            aria-label="Close profile setup"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="sh-pcd-checklist-bar">
          <div className="sh-pcd-progress-row">
            <span className="sh-pcd-progress-label">
              {summary.completedCount} of {summary.totalCount} complete
            </span>
            <span className="sh-pcd-progress-pct sh-mono">
              {summary.percentage}%
            </span>
          </div>
          <div className="sh-pcd-meter-track">
            <div
              className="sh-pcd-meter-fill"
              style={{ width: `${summary.percentage}%` }}
            />
          </div>

          <div className="sh-pcd-checklist-items">
            <button
              type="button"
              className={`sh-pcd-check-pill ${summary.hasCustomPhoto ? "done" : "missing"}`}
              onClick={() => {
                setMobileSheetOpen(false);
                photoSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }}
            >
              <span className="sh-pcd-check-icon">
                {summary.hasCustomPhoto ? (
                  <Check size={12} />
                ) : (
                  <Circle size={12} />
                )}
              </span>
              <span className="sh-pcd-check-name">Profile photo</span>
              <small>{summary.hasCustomPhoto ? "Added" : "Required"}</small>
            </button>

            <button
              type="button"
              className={`sh-pcd-check-pill ${summary.hasBioAndName ? "done" : "missing"}`}
              onClick={() => {
                setMobileSheetOpen(false);
                bioSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }}
            >
              <span className="sh-pcd-check-icon">
                {summary.hasBioAndName ? (
                  <Check size={12} />
                ) : (
                  <Circle size={12} />
                )}
              </span>
              <span className="sh-pcd-check-name">Name &amp; bio</span>
              <small>{summary.hasBioAndName ? "Added" : "Required"}</small>
            </button>

            {summary.requiresSkills && (
              <button
                type="button"
                className={`sh-pcd-check-pill ${summary.hasRequiredSkills ? "done" : "missing"}`}
                onClick={() => {
                  setMobileSheetOpen(false);
                  skillsSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
              >
                <span className="sh-pcd-check-icon">
                  {summary.hasRequiredSkills ? (
                    <Check size={12} />
                  ) : (
                    <Circle size={12} />
                  )}
                </span>
                <span className="sh-pcd-check-name">Skills</span>
                <small>
                  {summary.hasRequiredSkills
                    ? `${skillIds.length} selected`
                    : "Choose 2+"}
                </small>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="sh-pcd-form">
          <div className="sh-pcd-scroll-area">
            {loadingProfile ? (
              <div className="sh-pcd-loading">
                <div className="sh-skeleton" style={{ height: 76, width: "100%" }} />
                <div className="sh-skeleton" style={{ height: 140, width: "100%" }} />
              </div>
            ) : (
              <div className="sh-pcd-split-grid">
                <div className="sh-pcd-editor-col">
                  <section ref={photoSectionRef} className="sh-pcd-section">
                    <div className="sh-pcd-section-head">
                      <div className="sh-pcd-section-title">
                        <Camera size={16} />
                        <h3>Profile photo</h3>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={handlePhotoUpload}
                    />

                    <div className="sh-pcd-avatar-row">
                      <div className="sh-pcd-avatar-preview">
                        <YekisAvatar
                          userId={user.id}
                          seed={avatarSeed}
                          avatarUrl={avatarUrl}
                          disableStoredOverride={true}
                          size={72}
                          animate="hover"
                        />
                        <button
                          type="button"
                          className="sh-pcd-avatar-cam-btn"
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload custom profile picture"
                          aria-label="Upload custom profile picture"
                        >
                          <Camera size={13} />
                        </button>
                      </div>

                      <div className="sh-pcd-avatar-controls">
                        <div className="sh-pcd-btn-group">
                          <button
                            type="button"
                            className="sh-btn sh-btn-primary"
                            disabled={uploadingPhoto}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload size={14} />
                            {uploadingPhoto
                              ? "Processing..."
                              : summary.hasCustomPhoto
                                ? "Change photo"
                                : "Upload photo"}
                          </button>

                          {summary.hasCustomPhoto ? (
                            <button
                              type="button"
                              className="sh-btn sh-btn-secondary"
                              onClick={handleRevertToBlobatar}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="sh-btn sh-btn-secondary"
                              onClick={() => {
                                const base =
                                  avatarSeed.split("#")[0] || user.id || "Yekis";
                                const nextSeed = `${base}#v${Math.floor(Math.random() * 10000)}`;
                                setAvatarSeed(nextSeed);
                                saveAvatarOverride(user.id, {
                                  avatarUrl: null,
                                  seed: nextSeed,
                                });
                              }}
                            >
                              <RefreshCw size={14} /> Shuffle
                            </button>
                          )}
                        </div>
                        <p className="sh-pcd-hint">
                          JPG, PNG or WEBP, up to 10 MB. Without a photo, we
                          use a generated avatar.
                        </p>
                        {photoError && (
                          <p className="sh-pcd-error-inline">{photoError}</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section ref={bioSectionRef} className="sh-pcd-section">
                    <div className="sh-pcd-section-head">
                      <div className="sh-pcd-section-title">
                        <FileText size={16} />
                        <h3>Name &amp; bio</h3>
                      </div>
                    </div>

                    <div className="sh-pcd-grid-2">
                      <label className="sh-pcd-field">
                        <span>First name</span>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Dawit"
                          required
                        />
                      </label>
                      <label className="sh-pcd-field">
                        <span>Last name</span>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Mekonnen"
                          required
                        />
                      </label>
                    </div>

                    <label className="sh-pcd-field sh-pcd-field-bio">
                      <span className="sh-pcd-field-row">
                        <span>Bio</span>
                        <small className={bio.trim().length >= 20 ? "ok" : ""}>
                          {Math.min(20, bio.trim().length)}/20
                        </small>
                      </span>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={
                          role === "CLIENT"
                            ? "What does your company hire for?"
                            : "What do you do, and what are you known for?"
                        }
                      />
                    </label>
                  </section>

                  {summary.requiresSkills && (
                    <section ref={skillsSectionRef} className="sh-pcd-section">
                      <div className="sh-pcd-section-head">
                        <div className="sh-pcd-section-title">
                          <Briefcase size={16} />
                          <h3>Skills</h3>
                        </div>
                      </div>

                      <label className="sh-pcd-field">
                        <span>Primary skill</span>
                        <select
                          value={primarySkillId}
                          onChange={(e) =>
                            handlePrimarySkillSelect(e.target.value)
                          }
                        >
                          <option value="">Select your primary skill</option>
                          {skillsCatalog.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skillLabel(skill)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="sh-pcd-field">
                        <span>Additional skills</span>
                        <p className="sh-pcd-hint">
                          Select at least two. Click a skill to add or remove it.
                        </p>
                        <div className="sh-pcd-skill-tags">
                          {skillsCatalog.map((skill) => {
                            const active = skillIds.includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                type="button"
                                className={`sh-pcd-skill-tag ${active ? "active" : ""}`}
                                onClick={() => toggleSkill(skill.id)}
                              >
                                {active && <Check size={11} />}
                                {skillLabel(skill)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {mobileSheetOpen && (
                  <div
                    className="sh-pcd-sheet-scrim"
                    onClick={() => setMobileSheetOpen(false)}
                    aria-hidden="true"
                  />
                )}

                <aside
                  className={`sh-pcd-preview-col ${mobileSheetOpen ? "sheet-open" : "sheet-collapsed"}`}
                  aria-label="Profile preview"
                >
                  <div
                    className="sh-pcd-sheet-bar"
                    onClick={() => setMobileSheetOpen((v) => !v)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={mobileSheetOpen}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMobileSheetOpen((v) => !v);
                      }
                    }}
                  >
                    <div className="sh-pcd-sheet-pill" aria-hidden="true" />
                    <div className="sh-pcd-sheet-bar-row">
                      <span className="sh-pcd-sheet-bar-title">
                        Profile preview
                      </span>
                      <span className="sh-pcd-sheet-toggle-chip">
                        {mobileSheetOpen ? (
                          <>
                            Hide <ChevronDown size={13} />
                          </>
                        ) : (
                          <>
                            Show <ChevronUp size={13} />
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="sh-pcd-preview-head">
                    <span>Preview</span>
                    <small>Public profile</small>
                  </div>

                  <div className="sh-pcd-preview-card">
                    <div className="sh-pcd-preview-banner" />

                    <div className="sh-pcd-preview-body">
                      <div className="sh-pcd-preview-identity">
                        <div className="sh-pcd-preview-avatar-ring">
                          <YekisAvatar
                            userId={user.id}
                            seed={avatarSeed}
                            avatarUrl={avatarUrl}
                            disableStoredOverride={true}
                            size={64}
                            animate="hover"
                          />
                        </div>
                        <div className="sh-pcd-preview-name-wrap">
                          <div className="sh-pcd-preview-name-row">
                            <strong className="sh-pcd-preview-name">
                              {liveDisplayName}
                            </strong>
                            {user.kyc?.tier && (
                              <span
                                className="sh-pcd-preview-kyc"
                                title="Identity verified"
                              >
                                <ShieldCheck size={12} />
                                Verified
                              </span>
                            )}
                          </div>
                          <span className="sh-pcd-preview-headline">
                            {primarySkillObj
                              ? skillLabel(primarySkillObj)
                              : role === "CLIENT"
                                ? "Client · Ethiopia"
                                : "Freelancer · Ethiopia"}
                          </span>
                        </div>
                      </div>

                      <div className="sh-pcd-preview-block">
                        <div className="sh-pcd-preview-block-head">
                          <span>About</span>
                        </div>
                        {bio.trim() ? (
                          <p className="sh-pcd-preview-bio-text">{bio.trim()}</p>
                        ) : (
                          <p className="sh-pcd-preview-bio-placeholder">
                            Your bio will appear here.
                          </p>
                        )}
                      </div>

                      {(summary.requiresSkills ||
                        selectedSkillObjects.length > 0) && (
                        <div className="sh-pcd-preview-block">
                          <div className="sh-pcd-preview-block-head">
                            <span>Skills</span>
                            <small>
                              {selectedSkillObjects.length} selected
                            </small>
                          </div>
                          {selectedSkillObjects.length > 0 ? (
                            <div className="sh-pcd-preview-skills">
                              {selectedSkillObjects.map((sk) => {
                                const isPrimary = sk.id === primarySkillId;
                                return (
                                  <span
                                    key={sk.id}
                                    className={`sh-pcd-preview-skill-chip ${isPrimary ? "primary" : ""}`}
                                  >
                                    {isPrimary && <Star size={10} />}
                                    {skillLabel(sk)}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="sh-pcd-preview-bio-placeholder">
                              Selected skills will appear here.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="sh-pcd-preview-foot">
                        {role === "CLIENT"
                          ? "Escrow-protected hiring"
                          : "Available for milestone work"}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {saveError && <div className="sh-pcd-alert-error">{saveError}</div>}
            {saveSuccess && (
              <div className="sh-pcd-alert-success">
                <CheckCircle2 size={15} /> Profile saved. Updating your
                workspace...
              </div>
            )}
          </div>

          <div className="sh-pcd-footer">
            <div className="sh-pcd-footer-left">
              <button
                type="button"
                className="sh-pcd-text-btn"
                onClick={closeDialog}
              >
                Skip for now
              </button>
              {onOpenFullEditor && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => {
                    closeDialog();
                    onOpenFullEditor();
                  }}
                >
                  <ExternalLink size={13} /> Full profile editor
                </button>
              )}
            </div>

            <button
              type="submit"
              className="sh-btn sh-btn-primary"
              disabled={saving || loadingProfile}
            >
              <Save size={14} />
              {saving
                ? "Saving..."
                : summary.isComplete
                  ? "Save and finish"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
