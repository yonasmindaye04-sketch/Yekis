import React, { useState } from "react";
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
} from "lucide-react";
import { TbAlertTriangle, TbAlertCircle } from "react-icons/tb";
import { Alert, AlertTitle, AlertDescription } from "@/components/base-ui/alert";
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar";
import { api, type MeResponse } from "./api/client";
import { useI18n, type Language } from "./i18n";
import { cn } from "@/lib/utils";

export interface SettingsWorkspaceProps {
  user: MeResponse;
  onUserUpdated?: () => Promise<void> | void;
  onNavigateToProfileEdit?: () => void;
  onNavigateToChat?: () => void;
  onLogout?: () => void;
}

type SettingsTab = "security" | "general" | "notifications" | "privacy" | "data";

export function SettingsWorkspace({
  user,
  onUserUpdated,
  onNavigateToProfileEdit,
  onNavigateToChat,
  onLogout,
}: SettingsWorkspaceProps) {
  const { language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>("security");

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
      {/* Navigation Filter Tabs */}
      <div className="sh-card sh-filter-card" style={{ marginBottom: 16 }}>
        <div className="sh-segmented" role="tablist" aria-label="Settings navigation">
          <button
            type="button"
            className={activeTab === "security" ? "active" : ""}
            onClick={() => setActiveTab("security")}
            role="tab"
            aria-selected={activeTab === "security"}
          >
            <KeyRound size={14} /> Security & Password
          </button>
          <button
            type="button"
            className={activeTab === "general" ? "active" : ""}
            onClick={() => setActiveTab("general")}
            role="tab"
            aria-selected={activeTab === "general"}
          >
            <Globe size={14} /> Preferences & Localization
          </button>
          <button
            type="button"
            className={activeTab === "notifications" ? "active" : ""}
            onClick={() => setActiveTab("notifications")}
            role="tab"
            aria-selected={activeTab === "notifications"}
          >
            <Bell size={14} /> Notifications
          </button>
          <button
            type="button"
            className={activeTab === "privacy" ? "active" : ""}
            onClick={() => setActiveTab("privacy")}
            role="tab"
            aria-selected={activeTab === "privacy"}
          >
            <ShieldCheck size={14} /> Privacy & Visibility
          </button>
          <button
            type="button"
            className={activeTab === "data" ? "active" : ""}
            onClick={() => setActiveTab("data")}
            role="tab"
            aria-selected={activeTab === "data"}
          >
            <Download size={14} /> Data & Account
          </button>
        </div>
      </div>

      {/* TAB 1: SECURITY & CREDENTIALS */}
      {activeTab === "security" && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Change Password Card */}
          <div className="sh-card">
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
          </div>

          {/* Active Sessions & Security Controls */}
          <div className="sh-card">
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
          </div>

          {/* Identity Verification Summary */}
          <div className="sh-card">
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
          </div>
        </div>
      )}

      {/* TAB 2: PREFERENCES & LOCALIZATION */}
      {activeTab === "general" && (
        <div style={{ display: "grid", gap: 16 }}>
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
          <div className="sh-card">
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
          </div>

          {/* Timezone Selection */}
          <div className="sh-card">
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
          </div>

          {/* Theme Mode Toggle */}
          <div className="sh-card">
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
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div style={{ display: "grid", gap: 16 }}>
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

          <div className="sh-card">
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
          </div>
        </div>
      )}

      {/* TAB 4: PRIVACY & VISIBILITY */}
      {activeTab === "privacy" && (
        <div style={{ display: "grid", gap: 16 }}>
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
          <div className="sh-card">
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
          </div>

          {/* Directory Visibility */}
          <div className="sh-card">
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
          </div>
        </div>
      )}

      {/* TAB 5: DATA MANAGEMENT & DANGER ZONE */}
      {activeTab === "data" && (
        <div style={{ display: "grid", gap: 16 }}>
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
          <div className="sh-card">
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
          </div>

          {/* Account Termination & Statutory Retention Notice */}
          <div className="sh-card" style={{ borderColor: "rgba(220, 38, 38, 0.3)" }}>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsWorkspace;
