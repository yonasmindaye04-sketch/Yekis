import React, { useEffect, useState } from "react";
import { Blobatar } from "@blobatar/react";

const AVATAR_OVERRIDE_PREFIX = "yekis_avatar_override_";
export const AVATAR_UPDATED_EVENT = "yekis:avatar-updated";

export interface StoredAvatarOverride {
  /** Custom uploaded photo data URL / URL, or null when explicitly reverted to Blobatar */
  avatarUrl?: string | null;
  /** Custom shuffled Blobatar seed */
  seed?: string | null;
  updatedAt?: string;
}

export function loadAvatarOverride(userId?: string | null): StoredAvatarOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = [
      userId ? `${AVATAR_OVERRIDE_PREFIX}${userId}` : null,
      `${AVATAR_OVERRIDE_PREFIX}me`,
    ].filter(Boolean) as string[];
    for (const k of keys) {
      const raw = window.localStorage.getItem(k);
      if (raw) {
        return JSON.parse(raw) as StoredAvatarOverride;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveAvatarOverride(
  userId: string,
  override: StoredAvatarOverride,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredAvatarOverride = {
      ...override,
      updatedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(payload);
    window.localStorage.setItem(`${AVATAR_OVERRIDE_PREFIX}${userId}`, serialized);
    window.localStorage.setItem(`${AVATAR_OVERRIDE_PREFIX}me`, serialized);
    window.dispatchEvent(
      new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { userId, ...payload } }),
    );
  } catch {
    // ignore storage errors
  }
}

export interface YekisAvatarProps {
  /** User's unique ID — preferred deterministic seed for Blobatar */
  userId?: string | null;
  /** Fallback display name or email if userId is unavailable */
  displayName?: string | null;
  email?: string | null;
  /** Explicit seed override if custom seed/shuffle is active */
  seed?: string | null;
  /** Uploaded custom profile picture URL (if present, renders before Blobatar) */
  avatarUrl?: string | null;
  /** If true, uses exact avatarUrl prop without reading stored override (used in live editor preview) */
  disableStoredOverride?: boolean;
  /** Size in pixels (width & height). Defaults to 36px. */
  size?: number;
  /** Animation mode: "hover" (subtle interaction), "always", or false (static) */
  animate?: "hover" | "always" | false;
  /** Custom wrapper CSS class */
  className?: string;
  /** Inline styles for wrapper */
  style?: React.CSSProperties;
  /** Accessibility title / tooltip */
  title?: string;
  /** Border shape */
  shape?: "circle" | "rounded";
  /** Click handler */
  onClick?: () => void;
}

export function YekisAvatar({
  userId,
  displayName,
  email,
  seed: customSeed,
  avatarUrl,
  disableStoredOverride = false,
  size = 36,
  animate = "hover",
  className = "",
  style,
  title,
  shape = "circle",
  onClick,
}: YekisAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [storedOverride, setStoredOverride] = useState<StoredAvatarOverride | null>(() =>
    disableStoredOverride ? null : loadAvatarOverride(userId),
  );

  useEffect(() => {
    if (disableStoredOverride) return;
    setStoredOverride(loadAvatarOverride(userId));
    const handleUpdate = () => {
      setImgError(false);
      setStoredOverride(loadAvatarOverride(userId));
    };
    window.addEventListener(AVATAR_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handleUpdate);
  }, [userId, disableStoredOverride]);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl, storedOverride?.avatarUrl]);

  const effectiveAvatarUrl = disableStoredOverride
    ? avatarUrl
    : avatarUrl !== undefined && avatarUrl !== null
      ? avatarUrl
      : storedOverride && "avatarUrl" in storedOverride
        ? storedOverride.avatarUrl
        : avatarUrl;

  // Recommendation 1: userId is the primary stable seed, falling back to email or displayName
  const seed = (
    customSeed?.trim() ||
    (!disableStoredOverride && storedOverride?.seed?.trim()) ||
    userId?.trim() ||
    email?.trim() ||
    displayName?.trim() ||
    "YekisUser"
  );

  const fallbackTitle = title || displayName || email || "User Avatar";
  const borderRadius = shape === "circle" ? "50%" : "12px";

  // If a valid custom photo is uploaded and has not failed loading
  if (effectiveAvatarUrl && !imgError) {
    return (
      <div
        className={`yk-avatar-wrap ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius,
          overflow: "hidden",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          ...style,
        }}
        onClick={onClick}
        title={fallbackTitle}
      >
        <img
          src={effectiveAvatarUrl}
          alt={fallbackTitle}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }

  // Recommendation 2: Render deterministic Blobatar with subtle hover animation
  return (
    <div
      className={`yk-avatar-wrap yk-blobatar ${className}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        userSelect: "none",
        ...style,
      }}
      onClick={onClick}
      title={fallbackTitle}
      aria-label={fallbackTitle}
    >
      <Blobatar
        name={seed}
        size={size}
        background={false}
        animate={animate === false ? undefined : animate}
        className="yk-blobatar-svg"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
