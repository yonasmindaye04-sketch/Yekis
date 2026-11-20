import React, { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Check, Image as ImageIcon, Sparkles, SlidersHorizontal } from "lucide-react";

const BANNER_OVERRIDE_PREFIX = "yekis_banner_override_";
export const BANNER_UPDATED_EVENT = "yekis:banner-updated";

export type BannerPresetId =
  | "emerald-canopy"
  | "abyssal-slate"
  | "addis-sunrise"
  | "highland-indigo"
  | "warm-terracotta"
  | "obsidian-grid";

export type BannerObjectPosition = "top" | "center" | "bottom";

export interface StoredBannerOverride {
  mode: "default" | "preset" | "custom";
  presetId?: BannerPresetId;
  bannerUrl?: string | null;
  objectPosition?: BannerObjectPosition;
  updatedAt?: string;
}

export interface BannerPresetDefinition {
  id: BannerPresetId;
  label: string;
  subtitle: string;
  background: string;
}

export const BANNER_PRESETS: BannerPresetDefinition[] = [
  {
    id: "emerald-canopy",
    label: "Emerald Canopy",
    subtitle: "Signature green radial glow",
    background:
      "radial-gradient(125% 170% at 82% -15%, rgba(22, 163, 74, 0.42), transparent 62%), radial-gradient(90% 130% at 15% 110%, rgba(16, 185, 129, 0.22), transparent 58%), linear-gradient(125deg, #0c1f17 0%, #132a20 52%, #0f172a 100%)",
  },
  {
    id: "abyssal-slate",
    label: "Abyssal Slate",
    subtitle: "Deep architectural slate",
    background:
      "radial-gradient(110% 150% at 88% 0%, rgba(56, 189, 248, 0.25), transparent 60%), linear-gradient(130deg, #0f172a 0%, #1e293b 55%, #090d16 100%)",
  },
  {
    id: "addis-sunrise",
    label: "Addis Sunrise",
    subtitle: "Warm gold & highland horizon",
    background:
      "radial-gradient(120% 160% at 80% -10%, rgba(245, 158, 11, 0.38), transparent 60%), radial-gradient(90% 120% at 20% 100%, rgba(22, 163, 74, 0.25), transparent 55%), linear-gradient(125deg, #1c1917 0%, #292524 52%, #0f172a 100%)",
  },
  {
    id: "highland-indigo",
    label: "Highland Indigo",
    subtitle: "Cobalt & twilight dusk",
    background:
      "radial-gradient(115% 150% at 85% -10%, rgba(99, 102, 241, 0.38), transparent 62%), radial-gradient(85% 130% at 10% 100%, rgba(14, 165, 233, 0.22), transparent 55%), linear-gradient(125deg, #0f172a 0%, #1e1b4b 58%, #090d16 100%)",
  },
  {
    id: "warm-terracotta",
    label: "Red Sea Coral",
    subtitle: "Muted bronze & mineral earth",
    background:
      "radial-gradient(120% 160% at 84% -15%, rgba(234, 88, 12, 0.34), transparent 62%), radial-gradient(85% 125% at 15% 105%, rgba(217, 119, 6, 0.2), transparent 58%), linear-gradient(125deg, #1c1412 0%, #2b1d19 54%, #111827 100%)",
  },
  {
    id: "obsidian-grid",
    label: "Obsidian Grid",
    subtitle: "Precision technical blueprint",
    background:
      "linear-gradient(rgba(22, 163, 74, 0.1) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(22, 163, 74, 0.1) 1px, transparent 1px) 0 0 / 24px 24px, radial-gradient(110% 150% at 80% 0%, rgba(22, 163, 74, 0.28), transparent 65%), linear-gradient(120deg, #090d16 0%, #111827 100%)",
  },
];

export const DEFAULT_BANNER_OVERRIDE: StoredBannerOverride = {
  mode: "default",
  presetId: "emerald-canopy",
  bannerUrl: null,
  objectPosition: "center",
};

export function loadBannerOverride(
  userId?: string | null,
): StoredBannerOverride {
  if (typeof window === "undefined") return DEFAULT_BANNER_OVERRIDE;
  try {
    const keys = [
      userId ? `${BANNER_OVERRIDE_PREFIX}${userId}` : null,
      `${BANNER_OVERRIDE_PREFIX}me`,
    ].filter(Boolean) as string[];
    for (const k of keys) {
      const raw = window.localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredBannerOverride>;
        return {
          mode: parsed.mode || "default",
          presetId: parsed.presetId || "emerald-canopy",
          bannerUrl: parsed.bannerUrl ?? null,
          objectPosition: parsed.objectPosition || "center",
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_BANNER_OVERRIDE;
}

export function saveBannerOverride(
  userId: string,
  override: StoredBannerOverride,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredBannerOverride = {
      ...override,
      updatedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(payload);
    window.localStorage.setItem(`${BANNER_OVERRIDE_PREFIX}${userId}`, serialized);
    window.localStorage.setItem(`${BANNER_OVERRIDE_PREFIX}me`, serialized);
    window.dispatchEvent(
      new CustomEvent(BANNER_UPDATED_EVENT, { detail: { userId, ...payload } }),
    );
  } catch {
    // ignore storage errors
  }
}

/** Resize and compress an uploaded banner image into a wide landscape JPEG data URL */
export function compressBannerImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 420,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(
        new Error(
          "Please choose a valid image file (JPG, PNG, WEBP, or GIF).",
        ),
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Banner image must be smaller than 10 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, maxWidth / (img.width || maxWidth));
          const targetW = Math.max(1, Math.round((img.width || maxWidth) * scale));
          const targetH = Math.min(
            maxHeight,
            Math.max(1, Math.round((img.height || maxHeight) * scale)),
          );
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // Draw scaled full width, centered vertically if taller than target aspect
          const scaledFullH = Math.round((img.height || targetH) * scale);
          const offsetY = Math.round((targetH - scaledFullH) / 2);
          ctx.drawImage(img, 0, offsetY, targetW, scaledFullH);
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

interface ProfileBannerSurfaceProps {
  userId?: string | null;
  override?: StoredBannerOverride;
  disableStoredOverride?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const ProfileBannerSurface: React.FC<ProfileBannerSurfaceProps> = ({
  userId,
  override: explicitOverride,
  disableStoredOverride = false,
  className = "",
  children,
}) => {
  const [stored, setStored] = useState<StoredBannerOverride>(() =>
    disableStoredOverride ? DEFAULT_BANNER_OVERRIDE : loadBannerOverride(userId),
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (disableStoredOverride) return;
    setStored(loadBannerOverride(userId));
    const handleUpdate = () => {
      setImgError(false);
      setStored(loadBannerOverride(userId));
    };
    window.addEventListener(BANNER_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(BANNER_UPDATED_EVENT, handleUpdate);
  }, [userId, disableStoredOverride]);

  const active = explicitOverride ?? stored;

  useEffect(() => {
    setImgError(false);
  }, [active.bannerUrl, active.mode]);

  const preset =
    BANNER_PRESETS.find((p) => p.id === active.presetId) ?? BANNER_PRESETS[0];

  const showCustomImage =
    active.mode === "custom" && Boolean(active.bannerUrl) && !imgError;

  const backgroundStyle =
    active.mode === "preset" ? { background: preset.background } : undefined;

  return (
    <div
      className={`hero-banner ${active.mode === "preset" ? `preset-${preset.id}` : ""} ${className}`}
      style={backgroundStyle}
    >
      {showCustomImage && active.bannerUrl && (
        <img
          src={active.bannerUrl}
          alt="Profile cover banner"
          referrerPolicy="no-referrer"
          className="hero-banner-img"
          style={{
            objectPosition: `center ${active.objectPosition || "center"}`,
          }}
          onError={() => setImgError(true)}
        />
      )}
      <div className="hero-banner-scrim" aria-hidden="true" />
      {children}
    </div>
  );
};

interface ProfileBannerStudioProps {
  value: StoredBannerOverride;
  onChange: (next: StoredBannerOverride) => void;
  onClose?: () => void;
  compact?: boolean;
}

export const ProfileBannerStudio: React.FC<ProfileBannerStudioProps> = ({
  value,
  onChange,
  onClose,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await compressBannerImage(file);
      onChange({
        ...value,
        mode: "custom",
        bannerUrl: dataUrl,
        objectPosition: value.objectPosition || "center",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not process banner image.",
      );
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = (presetId: BannerPresetId) => {
    setError(null);
    onChange({
      ...value,
      mode: "preset",
      presetId,
    });
  };

  const handlePositionChange = (pos: BannerObjectPosition) => {
    onChange({
      ...value,
      objectPosition: pos,
    });
  };

  const handleReset = () => {
    setError(null);
    onChange({
      mode: "default",
      presetId: "emerald-canopy",
      bannerUrl: null,
      objectPosition: "center",
    });
  };

  const isCustomActive = value.mode === "custom" && Boolean(value.bannerUrl);

  return (
    <div className={`banner-studio-panel ${compact ? "compact" : ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="banner-studio-header">
        <div className="banner-studio-title-wrap">
          <strong className="banner-studio-title">
            Cover Banner Customization
          </strong>
          <span className="banner-studio-subtitle">
            Upload a wide cover photo (recommended 1280×320) or pick a curated theme for your profile header card.
          </span>
        </div>

        <div className="banner-studio-actions">
          <button
            type="button"
            className="btn-primary banner-action-btn"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            <span>
              {uploading
                ? "Processing cover..."
                : isCustomActive
                  ? "Replace Cover Photo"
                  : "Upload Cover Photo"}
            </span>
          </button>

          {value.mode !== "default" && (
            <button
              type="button"
              className="btn-secondary banner-action-btn"
              onClick={handleReset}
            >
              <Trash2 size={14} />
              <span>Reset Default</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="btn-secondary banner-action-btn"
              onClick={onClose}
            >
              <Check size={14} />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>

      {isCustomActive && (
        <div className="banner-alignment-bar">
          <span className="banner-alignment-label">
            <SlidersHorizontal size={13} /> Image Vertical Focus:
          </span>
          <div className="banner-alignment-group">
            {(["top", "center", "bottom"] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                className={`banner-align-btn ${(value.objectPosition || "center") === pos ? "active" : ""}`}
                onClick={() => handlePositionChange(pos)}
              >
                {pos === "top" ? "Top" : pos === "center" ? "Center" : "Bottom"}
              </button>
            ))}
          </div>
          {value.bannerUrl && (
            <span className="banner-custom-active-note">
              <ImageIcon size={13} /> Custom cover image active
            </span>
          )}
        </div>
      )}

      <div className="banner-presets-section">
        <div className="banner-presets-label">
          <Sparkles size={13} /> Curated Theme Presets
        </div>
        <div className="banner-presets-grid">
          {BANNER_PRESETS.map((preset) => {
            const isSelected =
              value.mode === "preset" && value.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`banner-preset-swatch ${isSelected ? "selected" : ""}`}
                onClick={() => selectPreset(preset.id)}
                title={`${preset.label} — ${preset.subtitle}`}
              >
                <span
                  className="banner-preset-preview"
                  style={{ background: preset.background }}
                >
                  {isSelected && (
                    <span className="banner-preset-check">
                      <Check size={12} />
                    </span>
                  )}
                </span>
                <span className="banner-preset-name">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="banner-studio-error">{error}</div>}
    </div>
  );
};
