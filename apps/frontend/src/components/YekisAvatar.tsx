import React, { useState } from "react";
import { Blobatar } from "@blobatar/react";

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
  size = 36,
  animate = "hover",
  className = "",
  style,
  title,
  shape = "circle",
  onClick,
}: YekisAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Recommendation 1: userId is the primary stable seed, falling back to email or displayName
  const seed = (
    customSeed?.trim() ||
    userId?.trim() ||
    email?.trim() ||
    displayName?.trim() ||
    "YekisUser"
  );

  const fallbackTitle = title || displayName || email || "User Avatar";
  const borderRadius = shape === "circle" ? "50%" : "12px";

  // If a valid custom photo is uploaded and has not failed loading
  if (avatarUrl && !imgError) {
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
          src={avatarUrl}
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
