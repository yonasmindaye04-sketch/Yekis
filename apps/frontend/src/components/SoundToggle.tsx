import { Volume2, VolumeX } from "lucide-react";
import { toggleSoundEnabled, useSoundSettings } from "../lib/soundEffects";

interface SoundToggleProps {
  className?: string;
  size?: number;
}

/**
 * Accessible header/toolbar button to mute or unmute platform sound effects.
 */
export function SoundToggle({
  className = "sh-icon-only-btn",
  size = 16,
}: SoundToggleProps) {
  const { enabled } = useSoundSettings();
  const label = enabled
    ? "Mute platform sound effects"
    : "Enable platform sound effects";

  return (
    <button
      type="button"
      className={className}
      onClick={() => toggleSoundEnabled()}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
    >
      {enabled ? <Volume2 size={size} /> : <VolumeX size={size} />}
    </button>
  );
}
