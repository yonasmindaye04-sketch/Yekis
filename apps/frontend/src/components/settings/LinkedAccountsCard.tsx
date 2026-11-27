import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../api/client";
import type { SettingsWorkspaceCopy } from "../../settingsWorkspaceCopy";
import {
  loadGoogleIdentity,
  renderGoogleIdentityButton,
  googleClientId,
} from "../../lib/googleIdentity";

/**
 * The Linked Accounts card.
 *
 * WHY IT IS A REGISTRY AND NOT FOUR HAND-WRITTEN ROWS
 * The card used to be one hand-written block per provider, which meant every
 * new provider needed a new block, a new status string, a new button and a
 * new error message. The rows are now produced from one list, and each entry
 * declares the FLOW it uses to connect:
 *
 *   "none"          — the provider is not connectable from here (password).
 *   "email_code"    — a one-time code is sent to the address on the account.
 *   "google_oauth"  — the provider's own button renders a signed credential.
 *   "telegram_link" — a deep link into the Telegram bot confirms the link.
 *
 * Adding a provider is now one entry in `LINKED_PROVIDERS` plus, at most, one
 * new flow renderer. The row, the status pill, the busy state, the error copy
 * and the accessibility wiring are shared.
 *
 * WHAT THE CARD NEVER DOES
 * It never MERGES two accounts. Connecting a provider adds a second way in to
 * the account that is already signed in; the server refuses a credential that
 * already belongs to somebody else.
 */

/** What this account can sign in with. Booleans only — no provider ids. */
export interface AuthIdentities {
  email: string;
  emailVerified: boolean;
  passwordSet: boolean;
  google: boolean;
  apple: boolean;
  facebook: boolean;
  telegram: boolean;
  phoneVerified: boolean;
}

type ProviderFlow = "none" | "email_code" | "google_oauth" | "telegram_link";

interface ProviderDef {
  /** Stable key for the flow renderers and for React keys. */
  id: "password" | "email" | "google" | "telegram";
  label: string;
  Icon: LucideIcon;
  flow: ProviderFlow;
}

/** Google's own mark — the multi-colour G is a brand asset, not a theme one. */
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
  );
}

/**
 * The provider list.
 *
 * Adding a provider means adding one line here. The label is the provider's
 * own name (it is a brand, so it is never translated); everything else —
 * status, descriptions, buttons — comes from the settings copy.
 */
const LINKED_PROVIDERS: ProviderDef[] = [
  { id: "password", label: "Password", Icon: KeyRound, flow: "none" },
  { id: "email", label: "Email", Icon: Mail, flow: "email_code" },
  { id: "google", label: "Google", Icon: ShieldCheck, flow: "google_oauth" },
  { id: "telegram", label: "Telegram", Icon: Send, flow: "telegram_link" },
];

/** How long the dashboard waits for the bot to confirm a Telegram link. */
const TELEGRAM_POLL_INTERVAL_MS = 2000;
const TELEGRAM_POLL_ATTEMPTS = 45; // 90 seconds — the session lives 5 minutes.

export interface LinkedAccountsCardProps {
  identities: AuthIdentities | null;
  copy: SettingsWorkspaceCopy;
  /** Re-reads the identity list from the server. */
  onRefresh: () => Promise<void> | void;
  /** A neutral, successful outcome worth telling the member about. */
  onSuccess: (message: string) => void;
  /** Something failed; the member is told what to do about it. */
  onError: (message: string) => void;
  /** Turns a server error code into a sentence a person can act on. */
  describeError: (err: unknown) => string;
}

export function LinkedAccountsCard({
  identities,
  copy,
  onRefresh,
  onSuccess,
  onError,
  describeError,
}: LinkedAccountsCardProps) {
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  // ---- Email verification -------------------------------------------------
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeError, setEmailCodeError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // ---- Telegram linking --------------------------------------------------
  const [telegramPending, setTelegramPending] = useState(false);
  const [telegramSid, setTelegramSid] = useState<string | null>(null);
  const [telegramBotUrl, setTelegramBotUrl] = useState<string | null>(null);

  // ---- Google ------------------------------------------------------------
  const googleLinkBtnRef = useRef<HTMLSpanElement>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const s = copy.security;

  // Focus the code field as soon as the panel opens, so a keyboard user is
  // already where the action is.
  useEffect(() => {
    if (emailPanelOpen) emailInputRef.current?.focus();
  }, [emailPanelOpen]);

  /**
   * Google's own button renders a signed credential. It is laid invisibly over
   * the styled button the member actually sees, exactly like the sign-in card.
   */
  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setGoogleBusy(true);
      try {
        await api.linkGoogle(credential);
        onSuccess(s.googleLinkedSuccess);
        await onRefresh();
      } catch (err) {
        onError(describeError(err));
      } finally {
        setGoogleBusy(false);
      }
    },
    [describeError, onError, onRefresh, onSuccess, s.googleLinkedSuccess],
  );

  useEffect(() => {
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
        onError(copy.credentialErrors.googlePopupBlocked);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identities, handleGoogleCredential, onError, copy.credentialErrors.googlePopupBlocked]);

  const handleUnlinkGoogle = async () => {
    setGoogleBusy(true);
    try {
      await api.unlinkGoogle();
      onSuccess(s.googleUnlinkedSuccess);
      await onRefresh();
    } catch (err) {
      onError(describeError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  // ---- Email: send a code -------------------------------------------------

  const sendEmailCode = useCallback(async () => {
    setEmailBusy(true);
    setEmailCodeError(null);
    try {
      await api.startAccountEmailVerification();
      setEmailCodeSent(true);
      setEmailPanelOpen(true);
      emailInputRef.current?.focus();
    } catch (err) {
      setEmailCodeError(describeError(err));
    } finally {
      setEmailBusy(false);
    }
  }, [describeError]);

  const handleVerifyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = emailCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setEmailCodeError(s.emailVerifyFailed);
      return;
    }
    setEmailBusy(true);
    setEmailCodeError(null);
    try {
      await api.checkAccountEmailVerification(code);
      setEmailPanelOpen(false);
      setEmailCode("");
      setEmailCodeSent(false);
      onSuccess(s.emailVerifySuccess);
      await onRefresh();
    } catch (err) {
      setEmailCodeError(describeError(err));
    } finally {
      setEmailBusy(false);
    }
  };

  // ---- Telegram: deep link into the bot -----------------------------------

  const handleConnectTelegram = async () => {
    setBusyProvider("telegram");
    setTelegramBotUrl(null);
    // The window is opened SYNCHRONOUSLY, before the await. A pop-up opened
    // after an await is blocked by every browser that blocks pop-ups, and the
    // member would be told to "open the bot" with no way to do it.
    //
    // `noopener` is NOT passed in the feature string: a browser that honours
    // it returns `null` for the new window, and the handle is what carries
    // the bot link. The opener is severed by hand instead, because the
    // destination is somebody else's site.
    const win = window.open("about:blank", "_blank");
    if (win) {
      win.opener = null;
    }
    try {
      const { sid, botUrl } = await api.startTelegramLink();
      setTelegramSid(sid);
      setTelegramBotUrl(botUrl);
      if (win) {
        win.location.href = botUrl;
      }
      setTelegramPending(true);
    } catch (err) {
      // Do not leave an empty tab behind when the handshake could not start.
      win?.close();
      const message = describeError(err);
      onError(
        message === "TELEGRAM_NOT_CONFIGURED" ? s.telegramNotConfigured : message,
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDisconnectTelegram = async () => {
    setBusyProvider("telegram");
    try {
      await api.unlinkTelegram();
      onSuccess(s.telegramDisconnectedSuccess);
      await onRefresh();
    } catch (err) {
      onError(describeError(err));
    } finally {
      setBusyProvider(null);
    }
  };

  // Poll the server until the bot confirms the link (or the session dies).
  useEffect(() => {
    if (!telegramPending || !telegramSid) return;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      try {
        const result = await api.getTelegramLinkStatus(telegramSid);
        if (cancelled) return;
        if (result.status === "linked") {
          setTelegramPending(false);
          onSuccess(s.telegramConnectedSuccess);
          await onRefresh();
          return;
        }
        if (result.status === "expired") {
          setTelegramPending(false);
          onError(s.telegramNotLinkedDesc);
          return;
        }
      } catch {
        // A transient failure is not a verdict: keep polling until the
        // attempt budget runs out.
      }
      if (attempts >= TELEGRAM_POLL_ATTEMPTS) {
        setTelegramPending(false);
        onError(s.telegramNotLinkedDesc);
      }
    };

    const timer = window.setInterval(() => void tick(), TELEGRAM_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramPending, telegramSid]);

  if (!identities) {
    return (
      <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
        {copy.common.loading}
      </p>
    );
  }

  const renderStatusPill = (text: string, tone: "ok" | "warn" | "muted") => (
    <span
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        border: "1px solid var(--color-border)",
        color:
          tone === "ok"
            ? "var(--color-success-text, #15803d)"
            : tone === "warn"
              ? "var(--color-warning-text, #b45309)"
              : "var(--color-text-secondary)",
      }}
    >
      {text}
    </span>
  );

  const providerRows: {
    def: ProviderDef;
    description: string;
    status: { text: string; tone: "ok" | "warn" | "muted" };
    action: React.ReactNode;
  }[] = [];

  for (const def of LINKED_PROVIDERS) {
    if (def.id === "password") {
      providerRows.push({
        def,
        description: identities.passwordSet
          ? s.passwordMethodActiveDesc
          : s.passwordMethodMissingDesc,
        status: identities.passwordSet
          ? { text: copy.common.enabled, tone: "ok" }
          : { text: copy.common.notSet, tone: "warn" },
        action: null,
      });
      continue;
    }

    if (def.id === "email") {
      providerRows.push({
        def,
        description: identities.email
          ? identities.emailVerified
            ? s.emailVerifiedDesc
            : s.emailUnverifiedDesc
          : s.emailNotSet,
        status: identities.emailVerified
          ? { text: copy.common.verified, tone: "ok" }
          : { text: copy.common.notLinked, tone: "warn" },
        action: identities.emailVerified ? null : (
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => void sendEmailCode()}
            disabled={emailBusy}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ShieldCheck size={14} />
            {emailBusy ? copy.common.loading : s.verifyEmailBtn}
          </button>
        ),
      });
      continue;
    }

    if (def.id === "google") {
      providerRows.push({
        def,
        description: identities.google
          ? s.googleConnectedDesc
          : s.googleNotConnectedDesc,
        status: identities.google
          ? { text: copy.common.enabled, tone: "ok" }
          : { text: copy.common.notLinked, tone: "muted" },
        action: identities.google ? (
          <button
            type="button"
            className="sh-btn"
            onClick={() => void handleUnlinkGoogle()}
            disabled={googleBusy}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Unlink size={14} />
            {googleBusy ? s.linkingGoogleBtn : s.unlinkGoogleBtn}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              // A click reaches this button only when Google's own button
              // (an iframe) is absent or was refused by the browser. Say so,
              // rather than doing nothing at all.
              onError(copy.credentialErrors.googlePopupBlocked)
            }
            disabled={googleBusy}
            aria-label={s.linkGoogleBtn}
            title={s.linkGoogleBtn}
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
            <GoogleMark />
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
        ),
      });
      continue;
    }

    // Telegram
    providerRows.push({
      def,
      description: identities.telegram
        ? s.telegramConnectedDesc
        : s.telegramNotLinkedDesc,
      status: identities.telegram
        ? { text: copy.common.enabled, tone: "ok" }
        : { text: copy.common.notLinked, tone: "muted" },
      action: identities.telegram ? (
        <button
          type="button"
          className="sh-btn"
          onClick={() => void handleDisconnectTelegram()}
          disabled={busyProvider === "telegram"}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Unlink size={14} />
          {busyProvider === "telegram" ? copy.common.loading : s.disconnectTelegramBtn}
        </button>
      ) : (
        <button
          type="button"
          className="sh-btn sh-btn-secondary"
          onClick={() => void handleConnectTelegram()}
          disabled={busyProvider === "telegram" || telegramPending}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Send size={14} />
          {telegramPending
            ? s.connectingTelegramBtn
            : busyProvider === "telegram"
              ? copy.common.loading
              : s.connectTelegramBtn}
        </button>
      ),
    });
  }

  return (
    <div style={{ display: "grid", gap: 2 }}>
      {providerRows.map((row, index) => (
        <React.Fragment key={row.def.id}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderBottom:
                index === providerRows.length - 1
                  ? "none"
                  : "1px solid var(--color-border)",
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
              {row.def.id === "google" ? <GoogleMark /> : <row.def.Icon size={16} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{row.def.label}</div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.def.id === "email" && identities.email
                  ? `${identities.email} — ${row.description}`
                  : row.description}
              </div>
            </div>
            {renderStatusPill(row.status.text, row.status.tone)}
            {row.action}
          </div>

          {row.def.id === "email" && emailPanelOpen && (
            <form
              onSubmit={handleVerifyEmail}
              style={{
                display: "grid",
                gap: 8,
                padding: "12px 0 16px",
                borderBottom: "1px solid var(--color-border)",
                maxWidth: 460,
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{s.emailCodeTitle}</div>
              {/* The hint sits ABOVE the input so the mobile keyboard and the
                  autofill popover can never cover it. */}
              <p
                id="linked-email-code-hint"
                style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}
              >
                {emailCodeSent
                  ? s.emailCodeSentDesc(identities.email)
                  : s.emailCodeLabel}
              </p>
              <label
                htmlFor="linked-email-code"
                style={{ fontSize: "0.78rem", fontWeight: 700 }}
              >
                {s.emailCodeLabel}
              </label>
              <input
                id="linked-email-code"
                ref={emailInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                aria-invalid={emailCodeError ? "true" : "false"}
                aria-describedby={
                  emailCodeError ? "linked-email-code-error" : "linked-email-code-hint"
                }
                style={{
                  width: 190,
                  minHeight: 40,
                  padding: "8px 12px",
                  fontSize: "1rem",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  letterSpacing: "0.3em",
                  borderRadius: 8,
                  border: `1px solid ${
                    emailCodeError ? "var(--color-error-border, #dc2626)" : "var(--color-border)"
                  }`,
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
              {emailCodeError && (
                <p
                  id="linked-email-code-error"
                  role="alert"
                  style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--color-error-text, #b91c1c)",
                  }}
                >
                  {emailCodeError}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="submit"
                  className="sh-btn sh-btn-primary"
                  disabled={emailBusy}
                >
                  <Check size={14} />
                  {emailBusy ? s.emailCodeSubmittingBtn : s.emailCodeSubmitBtn}
                </button>
                <button
                  type="button"
                  className="sh-btn"
                  onClick={() => void sendEmailCode()}
                  disabled={emailBusy}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={14} />
                  {s.resendCodeBtn}
                </button>
                <button
                  type="button"
                  className="sh-btn"
                  onClick={() => {
                    setEmailPanelOpen(false);
                    setEmailCodeError(null);
                    setEmailCodeSent(false);
                    setEmailCode("");
                  }}
                  disabled={emailBusy}
                >
                  {copy.common.cancel}
                </button>
              </div>
            </form>
          )}

          {row.def.id === "telegram" && telegramPending && (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: "grid",
                gap: 8,
                padding: "12px 0 16px",
                borderBottom: "1px solid var(--color-border)",
                fontSize: "0.8rem",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>{s.telegramWaitingDesc}</span>
              {telegramBotUrl && (
                <a
                  href={telegramBotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sh-btn sh-btn-secondary"
                  style={{ justifySelf: "start" }}
                >
                  {s.connectTelegramBtn}
                </a>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
