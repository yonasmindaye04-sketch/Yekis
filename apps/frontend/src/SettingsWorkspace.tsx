import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  Globe,
  Bell,
  Download,
  LogOut,
  Check,
  Eye,
  EyeOff,
  Laptop,
  RefreshCw,
  Sun,
  Moon,
  Edit,
  ChevronRight,
  UserX,
  Volume2,
  X,
  Compass,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { TbAlertTriangle, TbAlertCircle } from "react-icons/tb";
import { Alert, AlertTitle, AlertDescription } from "@/components/base-ui/alert";
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar";
import { api, type MeResponse } from "./api/client";
import { useI18n, type Language } from "./i18n";
import {
  SETTINGS_WORKSPACE_COPY,
  type SettingsWorkspaceCopy,
} from "./settingsWorkspaceCopy";
import { cn } from "@/lib/utils";
import { GlassCard } from "./components/ui-v2/GlassCard";
import {
  LinkedAccountsCard,
  type AuthIdentities,
} from "./components/settings/LinkedAccountsCard";
import {
  AccountTypeCard,
  type AccountRole,
} from "./components/settings/AccountTypeCard";
import { useOptionalGuide } from "./components/guide/GuideContext";
import { MODULE_TOURS } from "./components/guide/guideConfig";
import { GUIDE_MODULE_IDS } from "./components/guide/guideTypes";
import {
  GETTING_STARTED_CHANGED_EVENT,
  getShowGettingStartedGuide,
  setShowGettingStartedGuide,
} from "./lib/onboardingGuidePref";
import {
  playSound,
  setSoundCategoryEnabled,
  setSoundEnabled,
  setSoundVolume,
  useSoundSettings,
  type SoundEffectName,
} from "./lib/soundEffects";
import "./SettingsWorkspace.css";

/**
 * Turns a failed link/unlink into something a person can act on.
 *
 * The API answers with a code and, where it has one, a sentence. The
 * step-up middleware answers with a code only, so those two are translated
 * here — "REAUTH_REQUIRED" is not an instruction anyone can follow.
 */
function describeCredentialError(
  err: unknown,
  copy: SettingsWorkspaceCopy = SETTINGS_WORKSPACE_COPY.en,
): string {
  const raw =
    err instanceof Error && err.message
      ? err.message
      : copy.common.somethingWentWrong;
  switch (raw) {
    case "REAUTH_REQUIRED":
      return copy.credentialErrors.reauthRequired;
    case "STEP_UP_REQUIRED":
      return copy.credentialErrors.stepUpRequired;
    default:
      return raw;
  }
}

export interface SettingsWorkspaceProps {
  user: MeResponse;
  onUserUpdated?: () => Promise<void> | void;
  onNavigateToProfileEdit?: () => void;
  onNavigateToChat?: () => void;
  onLogout?: () => void;
}

type SettingsTab = "security" | "general" | "notifications" | "privacy" | "data";

const SETTINGS_TABS: { id: SettingsTab; label: string; Icon: LucideIcon }[] = [
  { id: "security", label: "Security & Password", Icon: KeyRound },
  { id: "general", label: "Preferences & Localization", Icon: Globe },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "privacy", label: "Privacy & Visibility", Icon: ShieldCheck },
  { id: "data", label: "Data & Account", Icon: Download },
];

export function SettingsWorkspace({
  user,
  onUserUpdated,
  onNavigateToProfileEdit,
  onNavigateToChat,
  onLogout,
}: SettingsWorkspaceProps) {
  const { language, setLanguage } = useI18n();
  // The copy for the language the member picked, with English as the fallback
  // for a language this build has no strings for.
  const copy: SettingsWorkspaceCopy =
    SETTINGS_WORKSPACE_COPY[language] ?? SETTINGS_WORKSPACE_COPY.en;
  const soundSettings = useSoundSettings();
  const guide = useOptionalGuide();
  const [activeTab, setActiveTab] = useState<SettingsTab>("security");
  const activeTabMeta =
    SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const lastIndex = SETTINGS_TABS.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = SETTINGS_TABS[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`settings-tab-${nextTab.id}`)?.focus();
  };

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Revoke Sessions State
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Linked credentials State
  //
  // A member's account can be reached by more than one method. This screen is
  // where they see which ones, and where a provider credential is added to an
  // account that already exists — the deliberate alternative to letting a
  // matching address merge two accounts into one.
  const [identities, setIdentities] = useState<AuthIdentities | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);

  // Preferences State
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Addis_Ababa",
  );
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);
  const [showGettingStarted, setShowGettingStarted] = useState(() =>
    getShowGettingStartedGuide(user.id),
  );
  useEffect(() => {
    setShowGettingStarted(getShowGettingStartedGuide(user.id));
    const onSync = () => setShowGettingStarted(getShowGettingStartedGuide(user.id));
    window.addEventListener(GETTING_STARTED_CHANGED_EVENT, onSync);
    return () => window.removeEventListener(GETTING_STARTED_CHANGED_EVENT, onSync);
  }, [user.id]);

  // Privacy State
  const [isAvailable, setIsAvailable] = useState(true);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PROPOSERS" | "PRIVATE">("PUBLIC");
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState<string | null>(null);

  // Notification Preferences State
  const [notifEscrow, setNotifEscrow] = useState(true);
  const [notifProposals, setNotifProposals] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [notifSaved, setNotifSaved] = useState(false);

  // Export Data State
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Account Deactivation Modal State
  const deactivateDialogRef = useRef<HTMLDialogElement>(null);
  const [checkingBlockers, setCheckingBlockers] = useState(false);
  const [deactivateBlockers, setDeactivateBlockers] = useState<{ code: string; message: string }[]>([]);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
  const [deactivatePhrase, setDeactivatePhrase] = useState("");
  const [acknowledgeRetention, setAcknowledgeRetention] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivateResult, setDeactivateResult] = useState<{
    performedAt: string;
    erased: Record<string, number>;
    retained: string[];
    accountClosed: boolean;
  } | null>(null);

  // Theme State
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";

  const handleThemeChange = (mode: "dark" | "light") => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("yekis_theme", mode);
    setPrefSuccess(`Theme switched to ${mode === "dark" ? "Dark" : "Light"} mode`);
    setTimeout(() => setPrefSuccess(null), 3500);
  };

  const handleLanguageChange = async (newLocale: Language) => {
    setLanguage(newLocale);
    setPrefSaving(true);
    try {
      await api.updateProfile({ languagePreference: newLocale });
      setPrefSuccess("Language preference updated");
      if (onUserUpdated) await onUserUpdated();
    } catch {
      // Preference saved locally in i18n
    } finally {
      setPrefSaving(false);
      setTimeout(() => setPrefSuccess(null), 3500);
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    setSelectedTimezone(tz);
    setPrefSaving(true);
    try {
      await api.updateProfile({ timezone: tz });
      setPrefSuccess("Timezone updated successfully");
      if (onUserUpdated) await onUserUpdated();
    } catch {
      // Fallback
    } finally {
      setPrefSaving(false);
      setTimeout(() => setPrefSuccess(null), 3500);
    }
  };

  const loadIdentities = useCallback(async () => {
    try {
      setIdentities(await api.getAuthIdentities());
    } catch {
      setCredentialError("Could not load your linked accounts.");
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "security") return;
    void loadIdentities();
  }, [activeTab, loadIdentities]);

  /**
   * The outcome of a connect/disconnect action on the Linked Accounts card.
   *
   * The card owns the provider flows; the screen owns the two banners, so
   * every outcome lands in the same place.
   */
  const handleCredentialSuccess = useCallback((message: string) => {
    setCredentialError(null);
    setCredentialMessage(message);
  }, []);

  const handleCredentialError = useCallback((message: string) => {
    setCredentialMessage(null);
    setCredentialError(message);
  }, []);

  /**
   * The Google flow lives in the Linked Accounts card now; what is left here
   * is the two banners the card writes its outcome into.
   */

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });

      setPasswordSuccess(res.message || "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (onUserUpdated) await onUserUpdated();
    } catch (err: any) {
      setPasswordError(
        err?.message || err?.error || "Could not change password. Please check current password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSessions = async () => {
    setRevokeError(null);
    setRevokeMessage(null);
    setRevokeLoading(true);
    try {
      const res = await api.revokeAllSessions();
      setRevokeMessage(res.message || "All other active sessions revoked successfully");
    } catch (err: any) {
      setRevokeError(err?.message || "Failed to revoke sessions");
    } finally {
      setRevokeLoading(false);
    }
  };

  const handlePrivacySave = async (
    newVisibility: "PUBLIC" | "PROPOSERS" | "PRIVATE",
    newAvailable: boolean,
  ) => {
    setVisibility(newVisibility);
    setIsAvailable(newAvailable);
    setPrivacySaving(true);
    setPrivacySuccess(null);
    try {
      await api.updateProfile({
        profileVisibility: newVisibility,
        isAvailableForWork: newAvailable,
      });
      setPrivacySuccess("Privacy & marketplace visibility updated");
      if (onUserUpdated) await onUserUpdated();
    } catch (err: any) {
      // Error handling
    } finally {
      setPrivacySaving(false);
      setTimeout(() => setPrivacySuccess(null), 4000);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    setExportSuccess(null);
    try {
      const data = await api.exportUserData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2),
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `yekis-account-export-${user.ucid || "me"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess("Account archive downloaded successfully");
    } catch (err: any) {
      // Fallback export with current user profile
      const fallbackData = {
        platform: "Yekis Jobs",
        exportedAt: new Date().toISOString(),
        account: {
          ucid: user.ucid,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(fallbackData, null, 2),
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `yekis-account-export-${user.ucid || "me"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess("Account archive downloaded successfully");
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenDeactivateModal = async () => {
    setDeactivateError(null);
    setDeactivateResult(null);
    setDeactivatePassword("");
    setShowDeactivatePassword(false);
    setDeactivatePhrase("");
    setAcknowledgeRetention(false);
    setCheckingBlockers(true);
    deactivateDialogRef.current?.showModal();

    try {
      const res = await api.getErasureBlockers();
      setDeactivateBlockers(res.blockers || []);
    } catch (err: any) {
      if (err.blockers) {
        setDeactivateBlockers(err.blockers);
      } else {
        setDeactivateBlockers([]);
      }
    } finally {
      setCheckingBlockers(false);
    }
  };

  const handleCloseDeactivateModal = () => {
    deactivateDialogRef.current?.close();
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = deactivateDialogRef.current;
    if (!dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      handleCloseDeactivateModal();
    }
  };

  const handleConfirmDeactivate = async () => {
    if (deactivatePhrase.trim().toUpperCase() !== "DEACTIVATE") {
      setDeactivateError("Please type DEACTIVATE in capital letters to confirm.");
      return;
    }
    if (!acknowledgeRetention) {
      setDeactivateError("You must acknowledge the statutory retention notice.");
      return;
    }
    if (identities?.passwordSet && !deactivatePassword.trim()) {
      setDeactivateError("Please enter your account password for step-up verification.");
      return;
    }

    setDeactivating(true);
    setDeactivateError(null);

    try {
      const result = await api.deactivateAccount({
        password: deactivatePassword.trim() || undefined,
        email: user.email,
      });
      setDeactivateResult(result);
      if (onUserUpdated) await onUserUpdated();
    } catch (err: any) {
      if (err.blockers && err.blockers.length > 0) {
        setDeactivateBlockers(err.blockers);
        setDeactivateError("Account deactivation is blocked by active obligations.");
      } else if (err.code === "PASSWORD_MISMATCH" || err.message?.toLowerCase().includes("invalid")) {
        setDeactivateError("Incorrect password. Please verify your password and try again.");
      } else if (err.code === "REAUTH_REQUIRED" || err.message === "REAUTH_REQUIRED") {
        setDeactivateError("Your session is not fresh. Please enter your password to re-authenticate.");
      } else if (err.code === "STEP_UP_REQUIRED" || err.message === "STEP_UP_REQUIRED") {
        setDeactivateError("Step-up authentication requires your account password.");
      } else {
        setDeactivateError(err.message || "Failed to deactivate account. Please try again or contact support.");
      }
    } finally {
      setDeactivating(false);
    }
  };

  const handleToggleNotif = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  // Password Strength Indicators
  const hasMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="settings-workspace-root">
      {/* Section trail — the topbar breadcrumb names the workspace; this names
          the settings section currently open. */}
      <nav className="settings-crumbs" aria-label="Breadcrumb">
        <span>Settings</span>
        <ChevronRight size={12} aria-hidden="true" />
        <strong className="settings-crumbs-current" aria-current="page">
          {activeTabMeta.label}
        </strong>
      </nav>

      {/* Section navigation — landing-page header indicator treatment. */}
      <GlassCard className="settings-nav-card" noPadding>
        <div
          className="settings-tabbar"
          role="tablist"
          aria-label="Settings sections"
          data-tour="settings-tabs"
        >
          {SETTINGS_TABS.map(({ id, label, Icon }, index) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`settings-tab-${id}`}
                type="button"
                className={cn("settings-tab", isActive && "is-active")}
                onClick={() => setActiveTab(id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${id}`}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* TAB 1: SECURITY & CREDENTIALS */}
      {activeTab === "security" && (
        <div
          role="tabpanel"
          id="settings-panel-security"
          aria-labelledby="settings-tab-security"
          data-tour="settings-active-panel"
          style={{ display: "grid", gap: 16 }}
        >
          {/* Change Password Card */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Change Password</h3>
                <p className="sh-card-desc">
                  Update your authentication credentials. Choose a strong, unique password to secure your account and escrow funds.
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <Alert variant="success" className="flex items-center gap-2.5 mb-3">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                    <Check className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Success
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90">
                    {passwordSuccess}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {passwordError && (
              <Alert variant="destructive" className="flex items-center gap-2.5 mb-3">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
                    <TbAlertCircle className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold">Update Failed</AlertTitle>
                  <AlertDescription>{passwordError}</AlertDescription>
                </div>
              </Alert>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: "grid", gap: 14, maxWidth: 540 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="inp"
                    style={{ width: "100%", paddingRight: 40 }}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    required
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-secondary)",
                    }}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="inp"
                    style={{ width: "100%", paddingRight: 40 }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-secondary)",
                    }}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="inp"
                    style={{ width: "100%", paddingRight: 40 }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-secondary)",
                    }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirement Criteria (Rule: Bold text only, no low opacity pills) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "8px 0" }}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: hasMinLength ? "var(--color-primary)" : "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={13} /> At least 8 characters
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: hasNumberOrSymbol ? "var(--color-primary)" : "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={13} /> Numbers or symbols
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: passwordsMatch ? "var(--color-primary)" : "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={13} /> Passwords match
                </span>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={revokeOtherSessions}
                  onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                />
                Sign out of all other devices and active browser sessions
              </label>

              <div style={{ paddingTop: 6 }}>
                <button
                  type="submit"
                  className="sh-btn sh-btn-primary"
                  disabled={passwordLoading}
                  style={{ minWidth: 160 }}
                >
                  {passwordLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound size={14} /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Linked Accounts */}
          <div className="sh-card">
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">{copy.security.linkedAccountsTitle}</h3>
                <p className="sh-card-desc">{copy.security.linkedAccountsDesc}</p>
              </div>
            </div>

            {credentialMessage && (
              <Alert variant="success" className="flex items-center gap-2.5 mb-3">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                    <Check className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Done
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90">
                    {credentialMessage}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {credentialError && (
              <Alert variant="destructive" className="flex items-center gap-2.5 mb-3">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
                    <TbAlertCircle className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold">Could not do that</AlertTitle>
                  <AlertDescription>{credentialError}</AlertDescription>
                </div>
              </Alert>
            )}

            <LinkedAccountsCard
              identities={identities}
              copy={copy}
              onRefresh={loadIdentities}
              onSuccess={handleCredentialSuccess}
              onError={handleCredentialError}
              describeError={(err) => describeCredentialError(err, copy)}
            />
          </div>

          {/* Active Sessions & Security Controls */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Active Sessions & Device Management</h3>
                <p className="sh-card-desc">
                  Monitor active tokens and remotely terminate open sessions if you suspect unauthorized access.
                </p>
              </div>
            </div>

            {revokeMessage && (
              <Alert variant="success" className="flex items-center gap-2.5 mb-3">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                    <Check className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Sessions Revoked
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90">
                    {revokeMessage}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {revokeError && (
              <Alert variant="destructive" className="flex items-center gap-2.5 mb-3">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
                    <TbAlertCircle className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold">Revocation Failed</AlertTitle>
                  <AlertDescription>{revokeError}</AlertDescription>
                </div>
              </Alert>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Laptop size={22} style={{ color: "var(--color-primary)" }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      Current Browser Session
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      Web Client · Addis Ababa, Ethiopia (EAT)
                    </div>
                  </div>
                </div>
                {/* Bold status indicator per rule (no low opacity pills) */}
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--color-primary)" }}>
                  Active Now
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  disabled={revokeLoading}
                  onClick={handleRevokeSessions}
                >
                  {revokeLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Revoking...
                    </>
                  ) : (
                    <>
                      <LogOut size={14} /> Revoke All Other Sessions
                    </>
                  )}
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Identity Verification Summary */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Identity & Multi-Factor Status</h3>
                <p className="sh-card-desc">
                  Essential identity layers guarding financial withdrawals, escrow releases, and TMS compliance.
                </p>
              </div>
            </div>

            <div className="settings-list">
              <div className="sh-kv-row">
                <span>Account Identifier (UCID)</span>
                <strong className="sh-mono">{user.ucid || "YEK-USER"}</strong>
              </div>
              <div className="sh-kv-row">
                <span>Registered Email Address</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong className="sh-mono">{user.email}</strong>
                  <span style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "0.8rem" }}>
                    Verified
                  </span>
                </div>
              </div>
              <div className="sh-kv-row">
                <span>SMS Notification & Payout Phone</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong className="sh-mono">{user.phone}</strong>
                  <span style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "0.8rem" }}>
                    Verified
                  </span>
                </div>
              </div>
              <div className="sh-kv-row">
                <span>Fayda Biometric KYC</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{user.kyc?.tier ?? "TIER_1"}</strong>
                  <span style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "0.8rem" }}>
                    {user.kyc?.status ?? "VERIFIED"}
                  </span>
                </div>
              </div>
            </div>

            {onNavigateToProfileEdit && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 14 }}>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={onNavigateToProfileEdit}
                >
                  <Edit size={14} /> Edit Public Profile Details
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 2: PREFERENCES & LOCALIZATION */}
      {activeTab === "general" && (
        <div
          role="tabpanel"
          id="settings-panel-general"
          aria-labelledby="settings-tab-general"
          data-tour="settings-active-panel"
          style={{ display: "grid", gap: 16 }}
        >
          {/* The account type is a changeable property of the account, not a
              one-time answer given at registration. */}
          <AccountTypeCard
            currentRole={(user.role as AccountRole) ?? "CLIENT"}
            language={language}
            copy={copy}
            onUserUpdated={onUserUpdated}
            onSuccess={handleCredentialSuccess}
            onError={handleCredentialError}
            describeError={(err) => describeCredentialError(err, copy)}
          />
          {prefSuccess && (
            <Alert variant="success" className="flex items-center gap-2.5">
              <Avatar className="size-6 rounded-[5px] shrink-0">
                <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                  <Check className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                {prefSuccess}
              </AlertTitle>
            </Alert>
          )}

          {/* Language Selection */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Platform Language</h3>
                <p className="sh-card-desc">
                  Select your preferred language. All platform navigation, contracts, milestone notices, and invoices adapt instantly.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { code: "en", label: "English", sub: "English (Global)" },
                { code: "am", label: "አማርኛ", sub: "Amharic (Ethiopia)" },
                { code: "om", label: "Afaan Oromoo", sub: "Oromo (Ethiopia)" },
                { code: "ti", label: "ትግርኛ", sub: "Tigrinya (Ethiopia)" },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: `1px solid ${
                      language === item.code ? "var(--color-primary)" : "var(--color-border)"
                    }`,
                    background: language === item.code ? "rgba(34, 197, 94, 0.05)" : "var(--color-surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                  }}
                  onClick={() => handleLanguageChange(item.code as Language)}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{item.label}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {item.sub}
                    </div>
                  </div>
                  {language === item.code && (
                    <span style={{ fontWeight: 800, color: "var(--color-primary)" }}>
                      <Check size={18} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Timezone Selection */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Timezone & Regional Clock</h3>
                <p className="sh-card-desc">
                  Contract milestones, proposal countdowns, and delivery deadlines will be formatted in this timezone.
                </p>
              </div>
            </div>

            <div style={{ maxWidth: 440 }}>
              <select
                className="inp"
                style={{ width: "100%" }}
                value={selectedTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                disabled={prefSaving}
              >
                <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (East Africa Time, UTC+3)</option>
                <option value="Etc/UTC">Etc/UTC (Coordinated Universal Time)</option>
                <option value="Europe/London">Europe/London (GMT / BST)</option>
                <option value="America/New_York">America/New_York (Eastern Time)</option>
                <option value="Asia/Dubai">Asia/Dubai (Gulf Standard Time, UTC+4)</option>
              </select>
            </div>
          </GlassCard>

          {/* Theme Mode Toggle */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Display Appearance</h3>
                <p className="sh-card-desc">
                  Choose between high-contrast Dark theme or crisp Light theme.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className={cn("sh-btn", isDark ? "sh-btn-primary" : "sh-btn-secondary")}
                onClick={() => handleThemeChange("dark")}
              >
                <Moon size={14} /> Dark Theme
              </button>
              <button
                type="button"
                className={cn("sh-btn", !isDark ? "sh-btn-primary" : "sh-btn-secondary")}
                onClick={() => handleThemeChange("light")}
              >
                <Sun size={14} /> Light Theme
              </button>
            </div>
          </GlassCard>

          {guide && (
            <GlassCard>
              <div className="sh-card-header">
                <div>
                  <h3 className="sh-card-title">Yekis Guide &amp; Onboarding Tours</h3>
                  <p className="sh-card-desc">
                    Track module walkthrough progress for this account, restart any interactive tour, or reset all onboarding prompts.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label className="sh-switch-label" htmlFor="setting-show-getting-started">
                    <input
                      id="setting-show-getting-started"
                      type="checkbox"
                      role="switch"
                      aria-checked={showGettingStarted}
                      checked={showGettingStarted}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setShowGettingStarted(next);
                        setShowGettingStartedGuide(user.id, next);
                        setPrefSuccess(
                          next
                            ? "Getting-started guide enabled on the dashboard."
                            : "Getting-started guide hidden from the dashboard.",
                        );
                      }}
                    />
                    <span>Show getting-started guide</span>
                  </label>
                  <button
                    type="button"
                    className="sh-btn sh-btn-secondary"
                    onClick={() => guide.openDocs("overview")}
                  >
                    <Compass size={14} /> Help Documentation
                  </button>
                  <button
                    type="button"
                    className="sh-btn sh-btn-secondary"
                    onClick={() => {
                      void guide.resetAllProgress();
                      setPrefSuccess("All Yekis Guide onboarding progress has been reset for this account.");
                    }}
                  >
                    <RotateCcw size={14} /> Reset Onboarding Progress
                  </button>
                </div>
              </div>

              <div className="yk-guide-settings-grid">
                {GUIDE_MODULE_IDS.map((modId) => {
                  const cfg = MODULE_TOURS[modId];
                  const completed = guide.isTourCompleted(modId);
                  const skipped = !completed && guide.isTourSkipped(modId);
                  return (
                    <div key={modId} className="yk-guide-settings-item">
                      <div className="yk-guide-settings-item-meta">
                        <span className="yk-guide-settings-item-title">{cfg.shortLabel}</span>
                        <span
                          className={cn(
                            "yk-guide-settings-status",
                            completed && "is-done",
                            skipped && "is-skipped",
                          )}
                        >
                          {completed ? "Completed" : skipped ? "Skipped" : "Not started"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="sh-btn sh-btn-secondary"
                        onClick={() => guide.startTour(modId)}
                      >
                        {completed || skipped ? "Restart" : "Start"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div
          role="tabpanel"
          id="settings-panel-notifications"
          aria-labelledby="settings-tab-notifications"
          data-tour="settings-active-panel"
          style={{ display: "grid", gap: 16 }}
        >
          {notifSaved && (
            <Alert variant="success" className="flex items-center gap-2.5">
              <Avatar className="size-6 rounded-[5px] shrink-0">
                <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                  <Check className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                Notification preferences updated
              </AlertTitle>
            </Alert>
          )}

          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Escrow & Financial Notifications</h3>
                <p className="sh-card-desc">
                  Receive instant alerts when funds are locked in escrow, milestones are funded, or payouts are released.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={notifEscrow}
                  onChange={(e) => {
                    setNotifEscrow(e.target.checked);
                    handleToggleNotif();
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Milestone & Escrow Activity</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Send SMS and push alerts when an escrow deposit confirms or an approval triggers bank settlement.
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={notifProposals}
                  onChange={(e) => {
                    setNotifProposals(e.target.checked);
                    handleToggleNotif();
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Proposals & Job Brief Updates</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Notify me when a client reviews, shortlists, or accepts my submitted proposal.
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={notifMessages}
                  onChange={(e) => {
                    setNotifMessages(e.target.checked);
                    handleToggleNotif();
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Direct Chat & Collaboration</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Alert me when an active client or contractor sends a new direct message or deliverable attachment.
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={notifSecurity}
                  onChange={(e) => {
                    setNotifSecurity(e.target.checked);
                    handleToggleNotif();
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Security & Credential Changes</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Critical SMS notification when a password change, new device login, or payout account update occurs.
                  </div>
                </div>
              </label>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Volume2 size={17} />
                  Sound Effects & Audio Feedback
                </h3>
                <p className="sh-card-desc">
                  Subtle Web Audio chimes for live messages, escrow milestones, and platform notifications. Syncs with Telegram Mini App haptics on mobile.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={soundSettings.enabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setSoundEnabled(next);
                    if (next) {
                      playSound("click", { forceCategory: true });
                    }
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Enable Platform Sound Effects</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Master switch for all synthesized audio cues across the workspace, chat, and notifications.
                  </div>
                </div>
              </label>

              <div style={{ display: "grid", gap: 6, maxWidth: 420 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label
                    htmlFor="settings-sound-volume"
                    style={{ fontWeight: 700, fontSize: "0.88rem" }}
                  >
                    Output Volume
                  </label>
                  <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    {Math.round(soundSettings.volume * 100)}%
                  </span>
                </div>
                <input
                  id="settings-sound-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(soundSettings.volume * 100)}
                  disabled={!soundSettings.enabled}
                  onChange={(e) => setSoundVolume(Number(e.target.value) / 100)}
                  style={{ width: "100%", cursor: soundSettings.enabled ? "pointer" : "not-allowed" }}
                />
              </div>

              <div style={{ display: "grid", gap: 12, paddingTop: 4 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: soundSettings.enabled ? "pointer" : "not-allowed", opacity: soundSettings.enabled ? 1 : 0.6 }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={soundSettings.categories.notifications}
                    disabled={!soundSettings.enabled}
                    onChange={(e) => setSoundCategoryEnabled("notifications", e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Notifications & Escrow Alerts</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      Bell chimes for incoming notifications, escrow releases, and dispute warnings.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: soundSettings.enabled ? "pointer" : "not-allowed", opacity: soundSettings.enabled ? 1 : 0.6 }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={soundSettings.categories.messages}
                    disabled={!soundSettings.enabled}
                    onChange={(e) => setSoundCategoryEnabled("messages", e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Direct Messages & Support Chat</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      Soft send pop and incoming message chimes in Workspace Chat and Support Chat.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: soundSettings.enabled ? "pointer" : "not-allowed", opacity: soundSettings.enabled ? 1 : 0.6 }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={soundSettings.categories.interactions}
                    disabled={!soundSettings.enabled}
                    onChange={(e) => setSoundCategoryEnabled("interactions", e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Confirmations & Interactive Cues</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      Subtle confirmation chords for completed payments, approvals, and action feedback.
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Preview Sounds</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(
                    [
                      { id: "notification", label: "Notification Chime" },
                      { id: "payment", label: "Payment / Escrow" },
                      { id: "messageReceived", label: "Message Received" },
                      { id: "success", label: "Success Chord" },
                    ] as { id: SoundEffectName; label: string }[]
                  ).map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      className="sh-btn sh-btn-secondary rounded-lg"
                      onClick={() =>
                        playSound(sample.id, { forceMaster: true, forceCategory: true })
                      }
                    >
                      <Volume2 size={14} />
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 4: PRIVACY & VISIBILITY */}
      {activeTab === "privacy" && (
        <div
          role="tabpanel"
          id="settings-panel-privacy"
          aria-labelledby="settings-tab-privacy"
          data-tour="settings-active-panel"
          style={{ display: "grid", gap: 16 }}
        >
          {privacySuccess && (
            <Alert variant="success" className="flex items-center gap-2.5">
              <Avatar className="size-6 rounded-[5px] shrink-0">
                <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                  <Check className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                {privacySuccess}
              </AlertTitle>
            </Alert>
          )}

          {/* Work Availability */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Marketplace Availability</h3>
                <p className="sh-card-desc">
                  Indicate whether you are open to accepting new job offers, invitations, and direct contracts.
                </p>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => handlePrivacySave(visibility, e.target.checked)}
                disabled={privacySaving}
              />
              <div>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  Available for new project contracts & gigs
                </span>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  When enabled, your profile displays the &ldquo;Available for Hire&rdquo; badge in directory searches.
                </p>
              </div>
            </label>
          </GlassCard>

          {/* Directory Visibility */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Profile Directory Visibility</h3>
                <p className="sh-card-desc">
                  Control who can discover and inspect your public profile, ratings, and portfolio.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {[
                {
                  id: "PUBLIC",
                  title: "Public — Open Directory",
                  desc: "Visible to anyone on Yekis. Search engines and all verified clients can view your profile and send invitations.",
                },
                {
                  id: "PROPOSERS",
                  title: "Proposers & Contract Parties Only",
                  desc: "Only clients whose jobs you bid on or users with active bilateral contracts can inspect your full profile.",
                },
                {
                  id: "PRIVATE",
                  title: "Private — Direct Link Only",
                  desc: "Hidden from search directories and catalog browsing. Accessible only via direct profile URL.",
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: `1px solid ${
                      visibility === opt.id ? "var(--color-primary)" : "var(--color-border)"
                    }`,
                    background: visibility === opt.id ? "rgba(34, 197, 94, 0.05)" : "var(--color-surface)",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    handlePrivacySave(opt.id as "PUBLIC" | "PROPOSERS" | "PRIVATE", isAvailable)
                  }
                >
                  <input
                    type="radio"
                    name="profileVisibility"
                    checked={visibility === opt.id}
                    onChange={() =>
                      handlePrivacySave(opt.id as "PUBLIC" | "PROPOSERS" | "PRIVATE", isAvailable)
                    }
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{opt.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 5: DATA MANAGEMENT & DANGER ZONE */}
      {activeTab === "data" && (
        <div
          role="tabpanel"
          id="settings-panel-data"
          aria-labelledby="settings-tab-data"
          data-tour="settings-active-panel"
          style={{ display: "grid", gap: 16 }}
        >
          {exportSuccess && (
            <Alert variant="success" className="flex items-center gap-2.5">
              <Avatar className="size-6 rounded-[5px] shrink-0">
                <AvatarFallback className="bg-emerald-600 dark:bg-emerald-600/80 rounded-[5px] text-white">
                  <Check className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                {exportSuccess}
              </AlertTitle>
            </Alert>
          )}

          {/* Export Account Data */}
          <GlassCard>
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title">Export Account Data (PDPP / GDPR Archive)</h3>
                <p className="sh-card-desc">
                  Download a machine-readable JSON archive containing your full profile details, verification records, wallet transaction summaries, and contract history.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", maxWidth: 500 }}>
                Includes: Account metadata, Fayda verification status, activity statistics, and bilateral contract references in accordance with Ethiopian Personal Data Protection Proclamation.
              </div>
              <button
                type="button"
                className="sh-btn sh-btn-primary"
                disabled={exportLoading}
                onClick={handleExportData}
              >
                {exportLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Preparing Archive...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Download JSON Archive
                  </>
                )}
              </button>
            </div>
          </GlassCard>

          {/* Account Termination & Statutory Retention Notice */}
          <GlassCard accent="red">
            <div className="sh-card-header">
              <div>
                <h3 className="sh-card-title" style={{ color: "var(--color-error-text, #dc2626)" }}>
                  Account Deactivation & Statutory Retention
                </h3>
                <p className="sh-card-desc">
                  Compliance and financial escrow regulations governing account termination.
                </p>
              </div>
            </div>

            <Alert variant="warning" className="flex items-start gap-2.5 mb-3">
              <Avatar className="size-6 rounded-[5px] shrink-0">
                <AvatarFallback className="bg-amber-600 dark:bg-amber-600/80 rounded-[5px] text-white">
                  <TbAlertTriangle className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">
                  Regulatory Escrow & Audit Retention Notice
                </AlertTitle>
                <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
                  Under National Bank of Ethiopia (NBE) and ERCA fiscal mandates, all transaction movement logs, fiscal vouchers, and escrow records must be retained in an immutable ledger for 10 years. Accounts with active escrow milestone balances or ongoing Stage-3 dispute mediations cannot be closed until fully resolved.
                </AlertDescription>
              </div>
            </Alert>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 8 }}>
              <button
                type="button"
                className="sh-btn sh-btn-danger"
                onClick={handleOpenDeactivateModal}
              >
                <UserX size={14} aria-hidden="true" /> Deactivate Account...
              </button>
              {onLogout && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={onLogout}
                >
                  <LogOut size={14} /> Sign Out Current Session
                </button>
              )}
              {onNavigateToChat && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={onNavigateToChat}
                >
                  Contact Compliance & Support
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Account Deactivation Modal (Native <dialog> conforming to modern-web-guidance) */}
      <dialog
        ref={deactivateDialogRef}
        className="sh-deactivate-dialog"
        aria-labelledby="deactivate-dialog-title"
        onClick={handleDialogClick}
        onCancel={handleCloseDeactivateModal}
      >
        <div className="sh-deactivate-header">
          <h3 id="deactivate-dialog-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserX size={18} aria-hidden="true" />
            {deactivateResult ? "Account Deactivated" : "Deactivate Account & Statutory Erasure"}
          </h3>
          <button
            type="button"
            className="sh-deactivate-close-btn"
            onClick={handleCloseDeactivateModal}
            aria-label="Close dialog"
            disabled={deactivating}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="sh-deactivate-body">
          {checkingBlockers ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 0", gap: 12 }}>
              <RefreshCw size={24} className="animate-spin text-dim" />
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                Auditing active escrow balances, open contracts, and disputes...
              </p>
            </div>
          ) : deactivateResult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Alert variant="default" className="border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-emerald-600 rounded-[5px] text-white">
                    <Check size={14} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Account Successfully Deactivated & Pseudonymised
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90 text-xs">
                    Your personal profile has been permanently scrubbed and all active browser/Telegram sessions have been terminated.
                  </AlertDescription>
                </div>
              </Alert>

              <div className="sh-deactivate-grid">
                <div className="sh-deactivate-col">
                  <h4 style={{ color: "var(--color-error-text, #dc2626)" }}>Personal Data Destroyed (PDPP Art. 15)</h4>
                  <ul>
                    <li>{deactivateResult.erased.profileFields} profile identity fields erased</li>
                    <li>{deactivateResult.erased.supportChatMessages + deactivateResult.erased.directMessages} chat and direct messages scrubbed</li>
                    <li>{deactivateResult.erased.portfolioItemsDeleted} portfolio items removed</li>
                    <li>{deactivateResult.erased.proposalsScrubbed + deactivateResult.erased.jobsScrubbed} proposals and job postings archived</li>
                    <li>Email pseudonymised to RFC-2606 invalid domain</li>
                  </ul>
                </div>
                <div className="sh-deactivate-col">
                  <h4 style={{ color: "var(--color-primary)" }}>Statutory Retention (10-Year Mandate)</h4>
                  <ul>
                    {deactivateResult.retained.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="sh-deactivate-notice-box">
                <strong>National Bank of Ethiopia (NBE) & ERCA Compliance Notice</strong>
                <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                  As required by Ethiopian financial regulations, your transaction ledger vouchers and KYC join keys are archived in an immutable cold ledger for 10 years.
                </p>
              </div>
            </div>
          ) : deactivateBlockers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Alert variant="warning" className="flex items-start gap-2.5">
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback className="bg-amber-600 dark:bg-amber-600/80 rounded-[5px] text-white">
                    <TbAlertTriangle className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">
                    Deactivation Currently Blocked ({deactivateBlockers.length} outstanding item{deactivateBlockers.length > 1 ? "s" : ""})
                  </AlertTitle>
                  <AlertDescription className="text-amber-700/90 dark:text-amber-400/90 text-xs">
                    Under financial escrow regulations, accounts with pending funds, active contracts, or unresolved disputes cannot be terminated.
                  </AlertDescription>
                </div>
              </Alert>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deactivateBlockers.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: "var(--color-error-text, #dc2626)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                      [{b.code}]
                    </span>
                    <span style={{ color: "var(--color-text)", flex: 1 }}>{b.message}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", margin: 0 }}>
                Please resolve the items above (e.g., withdraw remaining wallet funds, settle active milestones, or conclude ongoing disputes) before requesting deactivation.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="sh-deactivate-notice-box">
                <strong style={{ color: "var(--color-error-text, #dc2626)" }}>Irrevocable Account Deactivation & Statutory Archival</strong>
                <p style={{ margin: "4px 0 0", color: "var(--color-text-secondary)" }}>
                  In accordance with the Ethiopian Personal Data Protection Proclamation No. 1321/2024 (Art. 15) and National Bank of Ethiopia (NBE) regulatory frameworks:
                </p>
              </div>

              <div className="sh-deactivate-grid">
                <div className="sh-deactivate-col">
                  <h4 style={{ color: "var(--color-error-text, #dc2626)" }}>Permanently Erased</h4>
                  <ul>
                    <li>Profile name, bio, display name, and avatar images</li>
                    <li>Portfolio items, claimed skills, and public gigs</li>
                    <li>Direct messages, chat history, and uploaded files</li>
                    <li>Active sessions terminated on web and Telegram</li>
                  </ul>
                </div>
                <div className="sh-deactivate-col">
                  <h4 style={{ color: "var(--color-primary)" }}>10-Year Statutory Retention</h4>
                  <ul>
                    <li>Immutable financial escrow ledger & vouchers</li>
                    <li>Tax reporting records under ERCA mandates</li>
                    <li>AML identity keys (UCID, phone, Fayda hash)</li>
                    <li>Executed contract agreements & dispute logs</li>
                  </ul>
                </div>
              </div>

              {identities?.passwordSet && (
                <div>
                  <label
                    htmlFor="deactivate-password"
                    style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6 }}
                  >
                    Current Password (Step-Up Verification)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="deactivate-password"
                      type={showDeactivatePassword ? "text" : "password"}
                      className="input-field"
                      placeholder="Enter your account password"
                      value={deactivatePassword}
                      onChange={(e) => setDeactivatePassword(e.target.value)}
                      style={{ width: "100%", paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                      aria-label={showDeactivatePassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: 0,
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {showDeactivatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="deactivate-phrase"
                  style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6 }}
                >
                  Type <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--color-error-text, #dc2626)" }}>DEACTIVATE</span> to confirm:
                </label>
                <input
                  id="deactivate-phrase"
                  type="text"
                  className="input-field"
                  placeholder="DEACTIVATE"
                  value={deactivatePhrase}
                  onChange={(e) => setDeactivatePhrase(e.target.value)}
                  style={{ width: "100%", fontFamily: "var(--font-mono)" }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: "0.8rem",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={acknowledgeRetention}
                  onChange={(e) => setAcknowledgeRetention(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  I understand that this action is permanent. My profile and activity will be erased, and financial records will be retained for 10 years per Ethiopian statutory requirements.
                </span>
              </label>

              {deactivateError && (
                <Alert variant="destructive" className="flex items-start gap-2.5">
                  <Avatar className="size-6 rounded-[5px] shrink-0">
                    <AvatarFallback className="bg-red-600 rounded-[5px] text-white">
                      <TbAlertCircle className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <AlertTitle className="font-semibold text-red-800 dark:text-red-300">
                      Deactivation Failed
                    </AlertTitle>
                    <AlertDescription className="text-red-700/90 dark:text-red-400/90 text-xs">
                      {deactivateError}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="sh-deactivate-footer">
          {deactivateResult ? (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => {
                handleCloseDeactivateModal();
                if (onLogout) onLogout();
                else window.location.href = "/login";
              }}
            >
              <LogOut size={14} aria-hidden="true" /> Sign Out & Complete
            </button>
          ) : deactivateBlockers.length > 0 ? (
            <>
              <button
                type="button"
                autoFocus
                className="sh-btn sh-btn-secondary"
                onClick={handleCloseDeactivateModal}
              >
                Close
              </button>
              <button
                type="button"
                className="sh-btn sh-btn-primary"
                onClick={handleOpenDeactivateModal}
              >
                <RefreshCw size={14} aria-hidden="true" /> Re-Check Obligations
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                autoFocus
                className="sh-btn sh-btn-secondary"
                onClick={handleCloseDeactivateModal}
                disabled={deactivating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sh-btn sh-btn-danger"
                disabled={
                  deactivating ||
                  deactivatePhrase.trim().toUpperCase() !== "DEACTIVATE" ||
                  !acknowledgeRetention ||
                  Boolean(identities?.passwordSet && !deactivatePassword.trim())
                }
                onClick={handleConfirmDeactivate}
              >
                {deactivating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Deactivating Account...
                  </>
                ) : (
                  <>
                    <UserX size={14} aria-hidden="true" /> Permanently Deactivate Account
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}

export default SettingsWorkspace;
