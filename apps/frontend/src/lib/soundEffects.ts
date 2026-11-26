/* ────────────────────────────────────────────────────────────────────────
   soundEffects.ts — Web Audio API sound effects engine & preferences store.

   Zero external audio files: synthesizes warm, subtle UI & event tones
   on demand using Web Audio API oscillators with smooth attack/decay
   envelopes, rate-limiting, autoplay-safe lazy AudioContext initialization,
   and Telegram Mini App HapticFeedback pairing.
   ──────────────────────────────────────────────────────────────────────── */

import { useSyncExternalStore } from "react";
import { getTelegramWebApp } from "../telegram/webApp";

export type SoundEffectName =
  | "notification"
  | "messageReceived"
  | "messageSent"
  | "success"
  | "payment"
  | "warning"
  | "error"
  | "click";

export type SoundCategory = "notifications" | "messages" | "interactions";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  categories: Record<SoundCategory, boolean>;
}

const STORAGE_KEY = "yekis-sound-settings";

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.45,
  categories: {
    notifications: true,
    messages: true,
    interactions: true,
  },
};

const SOUND_CATEGORY: Record<SoundEffectName, SoundCategory> = {
  notification: "notifications",
  warning: "notifications",
  messageReceived: "messages",
  messageSent: "messages",
  success: "interactions",
  payment: "interactions",
  error: "interactions",
  click: "interactions",
};

const MIN_INTERVAL_MS: Record<SoundEffectName, number> = {
  notification: 450,
  warning: 450,
  messageReceived: 350,
  messageSent: 100,
  success: 200,
  payment: 300,
  error: 250,
  click: 60,
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function readStoredSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_SETTINGS.enabled,
      volume:
        typeof parsed.volume === "number"
          ? clampVolume(parsed.volume)
          : DEFAULT_SETTINGS.volume,
      categories: {
        notifications:
          typeof parsed.categories?.notifications === "boolean"
            ? parsed.categories.notifications
            : DEFAULT_SETTINGS.categories.notifications,
        messages:
          typeof parsed.categories?.messages === "boolean"
            ? parsed.categories.messages
            : DEFAULT_SETTINGS.categories.messages,
        interactions:
          typeof parsed.categories?.interactions === "boolean"
            ? parsed.categories.interactions
            : DEFAULT_SETTINGS.categories.interactions,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let currentSettings: SoundSettings = readStoredSettings();
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function persistSettings(next: SoundSettings): void {
  currentSettings = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota or private-mode errors
    }
  }
  emitChange();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      currentSettings = readStoredSettings();
      emitChange();
    }
  });
}

export function getSoundSettings(): SoundSettings {
  return currentSettings;
}

export function setSoundEnabled(enabled: boolean): void {
  if (currentSettings.enabled === enabled) return;
  persistSettings({ ...currentSettings, enabled });
}

export function toggleSoundEnabled(): boolean {
  const nextEnabled = !currentSettings.enabled;
  persistSettings({ ...currentSettings, enabled: nextEnabled });
  if (nextEnabled) {
    playSound("click", { forceCategory: true });
  }
  return nextEnabled;
}

export function setSoundVolume(volume: number): void {
  const clamped = clampVolume(volume);
  if (currentSettings.volume === clamped) return;
  persistSettings({ ...currentSettings, volume: clamped });
}

export function setSoundCategoryEnabled(
  category: SoundCategory,
  enabled: boolean,
): void {
  if (currentSettings.categories[category] === enabled) return;
  persistSettings({
    ...currentSettings,
    categories: {
      ...currentSettings.categories,
      [category]: enabled,
    },
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook returning live-synced sound preferences. */
export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribe, getSoundSettings, getSoundSettings);
}

/* ── Web Audio Synthesis ───────────────────────────────────────────────── */

let audioCtx: AudioContext | null = null;
let unlockAttached = false;
const lastPlayedAt = new Map<SoundEffectName, number>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      audioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function attachUnlockListeners(): void {
  if (typeof window === "undefined" || unlockAttached) return;
  unlockAttached = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("pointerdown", unlock, {
    once: true,
    passive: true,
    capture: true,
  });
  window.addEventListener("keydown", unlock, {
    once: true,
    passive: true,
    capture: true,
  });
}

if (typeof window !== "undefined") {
  attachUnlockListeners();
}

interface ToneStep {
  freq: number;
  endFreq?: number;
  delay: number; // seconds from start
  duration: number; // seconds
  gain: number; // relative 0..1
  type?: OscillatorType;
}

function playTones(
  ctx: AudioContext,
  masterVolume: number,
  steps: ToneStep[],
): void {
  const now = ctx.currentTime;
  // Cap peak gain at 0.32 so even 100% volume stays refined and non-harsh.
  const scaledMaster = masterVolume * 0.32;
  if (scaledMaster <= 0.001) return;

  for (const step of steps) {
    const startTime = now + step.delay;
    const stopTime = startTime + step.duration;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = step.type ?? "sine";
    osc.frequency.setValueAtTime(step.freq, startTime);
    if (step.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, step.endFreq),
        stopTime,
      );
    }

    const peak = Math.max(0.0002, step.gain * scaledMaster);
    const attack = Math.min(0.012, step.duration * 0.25);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(stopTime + 0.015);
  }
}

const SOUND_RECIPES: Record<SoundEffectName, ToneStep[]> = {
  // Warm, clear bell chime (A5 + soft E6 shimmer)
  notification: [
    { freq: 880, delay: 0, duration: 0.19, gain: 0.48, type: "sine" },
    { freq: 1318.51, delay: 0.07, duration: 0.24, gain: 0.32, type: "sine" },
  ],
  // Soft ascending two-note chat chime (E5 -> G#5)
  messageReceived: [
    { freq: 659.25, delay: 0, duration: 0.11, gain: 0.42, type: "sine" },
    { freq: 830.61, delay: 0.07, duration: 0.18, gain: 0.45, type: "sine" },
  ],
  // Crisp upward pop for outgoing message
  messageSent: [
    {
      freq: 440,
      endFreq: 660,
      delay: 0,
      duration: 0.075,
      gain: 0.32,
      type: "sine",
    },
  ],
  // Uplifting major triad arpeggio (C5 -> E5 -> G5)
  success: [
    { freq: 523.25, delay: 0, duration: 0.11, gain: 0.4, type: "sine" },
    { freq: 659.25, delay: 0.065, duration: 0.12, gain: 0.42, type: "sine" },
    { freq: 783.99, delay: 0.13, duration: 0.22, gain: 0.46, type: "sine" },
  ],
  // Rewarding escrow / payment confirmation chime (G5 -> B5 -> D6)
  payment: [
    { freq: 783.99, delay: 0, duration: 0.11, gain: 0.38, type: "triangle" },
    { freq: 987.77, delay: 0.07, duration: 0.12, gain: 0.4, type: "sine" },
    { freq: 1174.66, delay: 0.14, duration: 0.26, gain: 0.46, type: "sine" },
  ],
  // Gentle non-jarring two-tone alert (D5 -> C5)
  warning: [
    { freq: 587.33, delay: 0, duration: 0.13, gain: 0.36, type: "triangle" },
    { freq: 523.25, delay: 0.11, duration: 0.18, gain: 0.32, type: "triangle" },
  ],
  // Soft muted double-pulse (A3 -> F3)
  error: [
    { freq: 220, delay: 0, duration: 0.11, gain: 0.34, type: "triangle" },
    { freq: 174.61, delay: 0.09, duration: 0.16, gain: 0.32, type: "triangle" },
  ],
  // Ultra-subtle tactile tick for switches/buttons
  click: [
    {
      freq: 760,
      endFreq: 420,
      delay: 0,
      duration: 0.022,
      gain: 0.2,
      type: "sine",
    },
  ],
};

function triggerTelegramHaptic(name: SoundEffectName): void {
  const haptic = getTelegramWebApp()?.HapticFeedback;
  if (!haptic) return;
  try {
    if (name === "success" || name === "payment") {
      haptic.notificationOccurred("success");
    } else if (name === "warning") {
      haptic.notificationOccurred("warning");
    } else if (name === "error") {
      haptic.notificationOccurred("error");
    } else if (name === "notification" || name === "messageReceived") {
      haptic.impactOccurred("medium");
    } else {
      haptic.impactOccurred("light");
    }
  } catch {
    // Ignore on unsupported Telegram WebApp versions
  }
}

export interface PlaySoundOptions {
  /** Bypass category mute (used when previewing a sound in Settings). */
  forceCategory?: boolean;
  /** Bypass master mute (used when previewing a sound in Settings). */
  forceMaster?: boolean;
}

/**
 * Plays a named UI/event sound effect if enabled and within rate limits.
 * Safe to call anywhere — never throws if Web Audio is unavailable or suspended.
 */
export function playSound(
  name: SoundEffectName,
  options: PlaySoundOptions = {},
): void {
  const settings = currentSettings;
  if (!options.forceMaster && !settings.enabled) return;
  const category = SOUND_CATEGORY[name];
  if (!options.forceCategory && !settings.categories[category]) return;
  if (!options.forceMaster && settings.volume <= 0) return;

  const nowMs = Date.now();
  const minInterval = MIN_INTERVAL_MS[name];
  const prevMs = lastPlayedAt.get(name) ?? 0;
  if (!options.forceMaster && nowMs - prevMs < minInterval) return;
  lastPlayedAt.set(name, nowMs);

  triggerTelegramHaptic(name);

  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = options.forceMaster
    ? Math.max(0.35, settings.volume)
    : settings.volume;

  const dispatch = () => {
    try {
      playTones(ctx, volume, SOUND_RECIPES[name]);
    } catch {
      // Ignore synthesis errors
    }
  };

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(() => {
        if (ctx.state === "running") dispatch();
      })
      .catch(() => {});
    return;
  }

  dispatch();
}

/** Maps backend `notify:*` event names or notification `type` strings to a sound. */
export function playSoundForNotificationEvent(eventOrType: string): void {
  const normalized = eventOrType.toLowerCase();
  if (
    normalized.includes("escrow-funded") ||
    normalized.includes("escrow-released") ||
    normalized.includes("gig-order-funded") ||
    normalized.includes("gig-order-completed") ||
    normalized.includes("payout") ||
    normalized.includes("payment")
  ) {
    playSound("payment");
    return;
  }
  if (
    normalized.includes("dispute-raised") ||
    normalized.includes("auto-release-warning") ||
    normalized.includes("warning")
  ) {
    playSound("warning");
    return;
  }
  if (normalized.includes("dispute-resolved")) {
    playSound("success");
    return;
  }
  playSound("notification");
}
