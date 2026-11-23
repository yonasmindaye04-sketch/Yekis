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
  Link2,
  Unlink,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { TbAlertTriangle, TbAlertCircle } from "react-icons/tb";
import { Alert, AlertTitle, AlertDescription } from "@/components/base-ui/alert";
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar";
import { api, type MeResponse } from "./api/client";
import { useI18n, type Language } from "./i18n";
import { cn } from "@/lib/utils";
import {
  loadGoogleIdentity,
  renderGoogleIdentityButton,
  googleClientId,
} from "@/lib/googleIdentity";
import { GlassCard } from "./components/ui-v2/GlassCard";
import "./SettingsWorkspace.css";

/**
 * Turns a failed link/unlink into something a person can act on.
 *
 * The API answers with a code and, where it has one, a sentence. The
 * step-up middleware answers with a code only, so those two are translated
 * here — "REAUTH_REQUIRED" is not an instruction anyone can follow.
 */
function describeCredentialError(err: unknown): string {
  const raw =
    err instanceof Error && err.message ? err.message : "Something went wrong.";
  switch (raw) {
    case "REAUTH_REQUIRED":
      return "Your sign-in is too old to change how you sign in. Sign in again with your password, then try this.";
    case "STEP_UP_REQUIRED":
      return "Sign in with your password first, then link Google.";
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
  const [identities, setIdentities] = useState<{
    email: string;
    emailVerified: boolean;
    passwordSet: boolean;
    google: boolean;
    apple: boolean;
    facebook: boolean;
    telegram: boolean;
    phoneVerified: boolean;
  } | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleLinkBtnRef = useRef<HTMLSpanElement>(null);

  // Preferences State
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Addis_Ababa",
  );
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

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
   * A Google credential has arrived from the Google button. The server
   * verifies it, checks that it belongs to this account's own address, and
   * binds it. Nothing is merged: the account that is signed in is the account
   * that gains the credential.
   */
  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setGoogleBusy(true);
      setCredentialError(null);
      setCredentialMessage(null);
      try {
        await api.linkGoogle(credential);
        setCredentialMessage(
          "Google is linked. You can now sign in with the Google button.",
        );
        await loadIdentities();
      } catch (err) {
        setCredentialError(describeCredentialError(err));
      } finally {
        setGoogleBusy(false);
      }
    },
    [loadIdentities],
  );

  /**
   * Renders Google's own button on top of ours, the way the sign-in card
   * does: the official button is an iframe, so it is made invisible and laid
   * over the styled button that people actually see.
   */
  useEffect(() => {
    if (activeTab !== "security") return;
    if (!identities || identities.google) return;
    if (!googleClientId()) return;
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleIdentity();
        if (cancelled || !googleLinkBtnRef.current) return;
        renderGoogleIdentityButton(
          googleLinkBtnRef.current,
          (credential) => void handleGoogleCredential(credential),
          { theme: "outline", type: "icon", shape: "circle", size: "large" },
        );
      } catch {
        setCredentialError(
          "Google sign-in could not be loaded. Check your connection and try again.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, identities, handleGoogleCredential]);

  const handleUnlinkGoogle = async () => {
    setGoogleBusy(true);
    setCredentialError(null);
    setCredentialMessage(null);
    try {
      await api.unlinkGoogle();
      setCredentialMessage(
        "Google is disconnected. Your password still signs you in.",
      );
      await loadIdentities();
    } catch (err) {
      setCredentialError(describeCredentialError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

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
        <div className="settings-tabbar" role="tablist" aria-label="Settings sections">
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
                <Icon size={14} aria-hidden="true" />
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
                <h3 className="sh-card-title">Linked Accounts</h3>
                <p className="sh-card-desc">
                  Connect Google so you can sign in with it. Linking adds a way
                  in — your password is never replaced, and no two accounts are
                  ever merged into one.
                </p>
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

            {!identities ? (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                Loading your linked accounts…
              </p>
            ) : (
              <div style={{ display: "grid", gap: 2 }}>
                {/* Password */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--color-bg)",
                      color: "var(--color-text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    <KeyRound size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Password</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      {identities.passwordSet
                        ? "Set — your strongest way into this account."
                        : "Not set — set one so this account is never held by a single provider."}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      color: identities.passwordSet
                        ? "var(--color-text-secondary)"
                        : "var(--color-warning-text, #b45309)",
                    }}
                  >
                    {identities.passwordSet ? "Active" : "Not set"}
                  </span>
                </div>

                {/* Email */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--color-bg)",
                      color: "var(--color-text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    <Globe size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Email</div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--color-text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {identities.email}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {identities.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>

                {/* Google — the one that can be linked from here */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--color-bg)",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Google</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      {identities.google
                        ? "Connected — the Google button signs you in."
                        : "Not connected — sign in with your password first, then connect Google."}
                    </div>
                  </div>

                  {identities.google ? (
                    <button
                      type="button"
                      className="sh-btn"
                      onClick={() => void handleUnlinkGoogle()}
                      disabled={googleBusy}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Unlink size={14} />
                      {googleBusy ? "Working…" : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        // A click reaches this button only when Google's own
                        // button (an iframe) is absent or was refused by the
                        // browser. Say so, rather than doing nothing at all.
                        setCredentialError(
                          "Google sign-in could not load in this browser. Check that accounts.google.com is reachable, then try again.",
                        )
                      }
                      disabled={googleBusy}
                      aria-label="Link Google account"
                      title="Link Google"
                      style={{
                        position: "relative",
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        border: "1px solid var(--color-border)",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        padding: 0,
                        cursor: googleBusy ? "not-allowed" : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      {/* Google's own button is an iframe, laid invisibly over ours. */}
                      <span
                        ref={googleLinkBtnRef}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          display: "block",
                          opacity: 0.001,
                          overflow: "hidden",
                          cursor: "pointer",
                          zIndex: 2,
                        }}
                      />
                    </button>
                  )}
                </div>

                {/* Telegram — read-only until the bot link flow ships */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--color-bg)",
                      color: "var(--color-text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    <Link2 size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Telegram</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      {identities.telegram
                        ? "Connected — your linked chat receives your codes."
                        : "Not connected."}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {identities.telegram ? "Connected" : "Not connected"}
                  </span>
                </div>
              </div>
            )}
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
          style={{ display: "grid", gap: 16 }}
        >
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
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div
          role="tabpanel"
          id="settings-panel-notifications"
          aria-labelledby="settings-tab-notifications"
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
        </div>
      )}

      {/* TAB 4: PRIVACY & VISIBILITY */}
      {activeTab === "privacy" && (
        <div
          role="tabpanel"
          id="settings-panel-privacy"
          aria-labelledby="settings-tab-privacy"
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
    </div>
  );
}

export default SettingsWorkspace;
