import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Briefcase,
  FileText,
  ShieldCheck,
  Eye,
  Star,
  ChevronDown,
  ChevronUp,
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

const FIRST_LOGIN_CHECKED_PREFIX = "yekis_first_login_profile_checked_";

export function hasCompletedFirstLoginCheck(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${FIRST_LOGIN_CHECKED_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markFirstLoginCheckHandled(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${FIRST_LOGIN_CHECKED_PREFIX}${userId}`, "1");
  } catch {
    // ignore storage errors
  }
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
    markFirstLoginCheckHandled(user.id);
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

      markFirstLoginCheckHandled(user.id);
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

  const roleBadgeText =
    role === "FREELANCER"
      ? "Freelancer"
      : role === "BOTH"
        ? "Client & Freelancer"
        : "Client";

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
        {/* Pinned Header */}
        <div className="sh-pcd-header">
          <div className="sh-pcd-header-left">
            <span className="sh-pcd-eyebrow">
              <Sparkles size={13} />
              {location.state?.fromFirstLogin
                ? "Welcome to Yekis · First-Login Setup"
                : "Profile Trust & Readiness Checklist"}
            </span>
            <h2 id="profile-completion-dialog-title" className="sh-pcd-title">
              Complete your marketplace profile
            </h2>
            <p className="sh-pcd-subtitle">
              New accounts start with a generated Blobatar. Upload a custom profile picture and complete the checklist — watch your live client preview update in real time.
            </p>
          </div>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={closeDialog}
            aria-label="Close profile completion dialog"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Pinned Checklist Progress Bar & Interactive Pills */}
        <div className="sh-pcd-checklist-bar">
          <div className="sh-pcd-progress-row">
            <span className="sh-pcd-progress-label">
              Checklist Progress:{" "}
              <strong>
                {summary.completedCount} of {summary.totalCount} completed
              </strong>
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
              {summary.hasCustomPhoto ? (
                <CheckCircle2 size={15} className="sh-pcd-icon-done" />
              ) : (
                <Circle size={15} className="sh-pcd-icon-missing" />
              )}
              <div className="sh-pcd-check-text">
                <strong>Profile Picture</strong>
                <small>
                  {summary.hasCustomPhoto
                    ? "Custom photo uploaded"
                    : "Missing · Using default Blobatar"}
                </small>
              </div>
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
              {summary.hasBioAndName ? (
                <CheckCircle2 size={15} className="sh-pcd-icon-done" />
              ) : (
                <Circle size={15} className="sh-pcd-icon-missing" />
              )}
              <div className="sh-pcd-check-text">
                <strong>Full Name &amp; Bio</strong>
                <small>
                  {summary.hasBioAndName
                    ? "Name & bio ready"
                    : "Missing · Min 20 chars bio"}
                </small>
              </div>
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
                {summary.hasRequiredSkills ? (
                  <CheckCircle2 size={15} className="sh-pcd-icon-done" />
                ) : (
                  <Circle size={15} className="sh-pcd-icon-missing" />
                )}
                <div className="sh-pcd-check-text">
                  <strong>Skills &amp; Expertise</strong>
                  <small>
                    {summary.hasRequiredSkills
                      ? `${skillIds.length} skills selected`
                      : "Missing · Pick primary + 2 skills"}
                  </small>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Form Container with Dedicated Scrollable Split-Grid & Pinned Footer */}
        <form onSubmit={handleSave} className="sh-pcd-form">
          <div className="sh-pcd-scroll-area">
            {loadingProfile ? (
              <div style={{ display: "grid", gap: 12, padding: "12px 0" }}>
                <div className="sh-skeleton" style={{ height: 76, width: "100%" }} />
                <div className="sh-skeleton" style={{ height: 140, width: "100%" }} />
              </div>
            ) : (
              <div className="sh-pcd-split-grid">
                {/* LEFT COLUMN: Checklist Editor */}
                <div className="sh-pcd-editor-col">
                  {/* 1. Profile Picture Section */}
                  <div ref={photoSectionRef} className="sh-pcd-section">
                    <div className="sh-pcd-section-head">
                      <div className="sh-pcd-section-title">
                        <Camera size={15} />
                        <span>1. Profile Picture</span>
                      </div>
                      <span
                        className={`sh-pcd-status-tag ${summary.hasCustomPhoto ? "done" : "pending"}`}
                      >
                        {summary.hasCustomPhoto
                          ? "Custom Photo Active"
                          : "Default Blobatar (Upload Recommended)"}
                      </span>
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
                                ? "Change Photo"
                                : "Upload Profile Picture"}
                          </button>

                          {summary.hasCustomPhoto ? (
                            <button
                              type="button"
                              className="sh-btn sh-btn-secondary"
                              onClick={handleRevertToBlobatar}
                            >
                              <Trash2 size={14} /> Use Default Blobatar
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
                              <RefreshCw size={14} /> Shuffle Blobatar
                            </button>
                          )}
                        </div>
                        <p className="sh-pcd-hint">
                          Blobatars are generated automatically for new users or anyone who prefers not to upload a photo. Upload a JPG, PNG, or WEBP image anytime.
                        </p>
                        {photoError && (
                          <p className="sh-pcd-error-inline">{photoError}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Full Name & Bio Section */}
                  <div ref={bioSectionRef} className="sh-pcd-section">
                    <div className="sh-pcd-section-head">
                      <div className="sh-pcd-section-title">
                        <FileText size={15} />
                        <span>2. Full Name &amp; Professional Bio</span>
                      </div>
                      <span
                        className={`sh-pcd-status-tag ${summary.hasBioAndName ? "done" : "pending"}`}
                      >
                        {summary.hasBioAndName
                          ? "Completed"
                          : `${Math.min(20, bio.trim().length)}/20 min bio chars`}
                      </span>
                    </div>

                    <div className="sh-pcd-grid-2">
                      <label className="sh-pcd-field">
                        <span>First Name</span>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g., Dawit"
                          required
                        />
                      </label>
                      <label className="sh-pcd-field">
                        <span>Last Name</span>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g., Mekonnen"
                          required
                        />
                      </label>
                    </div>

                    <label className="sh-pcd-field" style={{ marginTop: 10 }}>
                      <span>
                        {role === "CLIENT"
                          ? "Company / Hiring Bio (min 20 characters)"
                          : "Professional Bio & Experience (min 20 characters)"}
                      </span>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={
                          role === "CLIENT"
                            ? "Describe your organization or the types of projects you hire for on Yekis..."
                            : "Summarize your core stack, Ethiopian industry experience, and how you deliver milestone work..."
                        }
                      />
                    </label>
                  </div>

                  {/* 3. Skills Section (Freelancer & Dual-Role) */}
                  {summary.requiresSkills && (
                    <div ref={skillsSectionRef} className="sh-pcd-section">
                      <div className="sh-pcd-section-head">
                        <div className="sh-pcd-section-title">
                          <Briefcase size={15} />
                          <span>3. Core Skills &amp; Expertise</span>
                        </div>
                        <span
                          className={`sh-pcd-status-tag ${summary.hasRequiredSkills ? "done" : "pending"}`}
                        >
                          {summary.hasRequiredSkills
                            ? `${skillIds.length} Selected`
                            : "Select Primary + 2 Skills"}
                        </span>
                      </div>

                      <label className="sh-pcd-field">
                        <span>Primary Specialization</span>
                        <select
                          value={primarySkillId}
                          onChange={(e) =>
                            handlePrimarySkillSelect(e.target.value)
                          }
                        >
                          <option value="">Choose your primary skill...</option>
                          {skillsCatalog.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skillLabel(skill)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="sh-pcd-field" style={{ marginTop: 10 }}>
                        <span>Select at least 2 skills (click to toggle)</span>
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
                                {active && <UserCheck size={12} />}
                                {skillLabel(skill)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Bottom-Sheet Scrim Backdrop */}
                {mobileSheetOpen && (
                  <div
                    className="sh-pcd-sheet-scrim"
                    onClick={() => setMobileSheetOpen(false)}
                    aria-hidden="true"
                  />
                )}

                {/* RIGHT COLUMN (Sticky on Desktop / Docked Bottom-Sheet on Mobile) */}
                <aside
                  className={`sh-pcd-preview-col ${mobileSheetOpen ? "sheet-open" : "sheet-collapsed"}`}
                  aria-label="Live Profile Preview"
                >
                  {/* Mobile Bottom-Sheet Grab Handle & Docked Mini-Bar */}
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
                      <div className="sh-pcd-sheet-bar-left">
                        <YekisAvatar
                          userId={user.id}
                          seed={avatarSeed}
                          avatarUrl={avatarUrl}
                          disableStoredOverride={true}
                          size={28}
                          animate={false}
                        />
                        <div className="sh-pcd-sheet-bar-meta">
                          <strong>{liveDisplayName}</strong>
                          <span>
                            Live Preview · {summary.percentage}% ready
                          </span>
                        </div>
                      </div>
                      <span className="sh-pcd-sheet-toggle-chip">
                        <Eye size={13} />
                        {mobileSheetOpen ? (
                          <>
                            Collapse <ChevronDown size={13} />
                          </>
                        ) : (
                          <>
                            Preview Card <ChevronUp size={13} />
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Sticky Header */}
                  <div className="sh-pcd-preview-top">
                    <div className="sh-pcd-preview-badge">
                      <Eye size={13} />
                      <span>Live Profile Preview</span>
                    </div>
                    <span className="sh-pcd-preview-live-dot">
                      <span className="dot" /> Updates in real time
                    </span>
                  </div>

                  {/* Preview Card Content */}
                  <div className="sh-pcd-preview-card">
                    <div className="sh-pcd-preview-banner">
                      <span className="sh-pcd-preview-role-pill">
                        {roleBadgeText}
                      </span>
                      <span className="sh-pcd-preview-avatar-mode">
                        {summary.hasCustomPhoto
                          ? "Custom Photo"
                          : "Default Blobatar"}
                      </span>
                    </div>

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
                            <span
                              className="sh-pcd-preview-kyc"
                              title="Fayda Identity Verified"
                            >
                              <ShieldCheck size={14} />
                              {user.kyc?.tier ?? "TIER_2"}
                            </span>
                          </div>
                          <span className="sh-pcd-preview-headline">
                            <Briefcase size={12} />
                            {primarySkillObj
                              ? skillLabel(primarySkillObj)
                              : role === "CLIENT"
                                ? "Verified Escrow Client · Ethiopia"
                                : "Select your primary specialization"}
                          </span>
                          <div className="sh-pcd-preview-avail-row">
                            <span className="sh-pcd-preview-avail-pill">
                              <span className="avail-dot" />
                              {role === "CLIENT"
                                ? "Escrow Protected Hiring"
                                : "Available for Milestone Work"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live Bio Block */}
                      <div className="sh-pcd-preview-block">
                        <div className="sh-pcd-preview-block-head">
                          <span>About</span>
                          <small
                            className={
                              bio.trim().length >= 20 ? "ready" : "pending"
                            }
                          >
                            {bio.trim().length >= 20
                              ? "Ready for clients"
                              : `${bio.trim().length}/20 chars`}
                          </small>
                        </div>
                        {bio.trim() ? (
                          <p className="sh-pcd-preview-bio-text">{bio.trim()}</p>
                        ) : (
                          <p className="sh-pcd-preview-bio-placeholder">
                            Start typing your bio on the left to preview how your introduction looks to clients and counterparties...
                          </p>
                        )}
                      </div>

                      {/* Live Skills Block */}
                      {(summary.requiresSkills ||
                        selectedSkillObjects.length > 0) && (
                        <div className="sh-pcd-preview-block">
                          <div className="sh-pcd-preview-block-head">
                            <span>Verified Skills &amp; Stack</span>
                            <small
                              className={
                                summary.hasRequiredSkills ? "ready" : "pending"
                              }
                            >
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
                                    {isPrimary && <Star size={11} />}
                                    {skillLabel(sk)}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="sh-pcd-preview-bio-placeholder">
                              Choose your primary specialization and at least 2 skills to showcase on your public card.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Trust Readiness Footer inside Preview Card */}
                      <div className="sh-pcd-preview-trust-foot">
                        <div className="sh-pcd-preview-trust-top">
                          <span>Client Impression Readiness</span>
                          <strong className="sh-mono">
                            {summary.percentage}%
                          </strong>
                        </div>
                        <div className="sh-pcd-preview-trust-tags">
                          <span
                            className={`sh-pcd-mini-tag ${summary.hasCustomPhoto ? "ok" : "warn"}`}
                          >
                            {summary.hasCustomPhoto ? "✓ Photo" : "○ Photo"}
                          </span>
                          <span
                            className={`sh-pcd-mini-tag ${summary.hasBioAndName ? "ok" : "warn"}`}
                          >
                            {summary.hasBioAndName ? "✓ Name & Bio" : "○ Name & Bio"}
                          </span>
                          {summary.requiresSkills && (
                            <span
                              className={`sh-pcd-mini-tag ${summary.hasRequiredSkills ? "ok" : "warn"}`}
                            >
                              {summary.hasRequiredSkills
                                ? "✓ Skills"
                                : "○ Skills"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {saveError && <div className="sh-pcd-alert-error">{saveError}</div>}
            {saveSuccess && (
              <div className="sh-pcd-alert-success">
                <CheckCircle2 size={15} /> Profile updated! Syncing workspace...
              </div>
            )}
          </div>

          {/* Pinned Footer Actions */}
          <div className="sh-pcd-footer">
            <div className="sh-pcd-footer-left">
              <button
                type="button"
                className="sh-btn sh-btn-secondary"
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
                  <ExternalLink size={13} /> Full Profile Editor
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
                ? "Saving Profile..."
                : summary.isComplete
                  ? "Save & Complete Profile"
                  : "Save Progress"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
