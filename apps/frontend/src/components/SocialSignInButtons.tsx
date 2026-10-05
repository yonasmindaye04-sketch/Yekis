import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { events } from "../analytics";
import { Send, X, ExternalLink } from "lucide-react";

/**
 * Social sign-in and registration buttons for Google / Telegram / Apple.
 * Enables users to easily register or sign in using Google or Telegram.
 *
 * Security:
 *  - Google: Google Identity Services (GIS) ID-token verified server-side against Google JWKS.
 *  - Telegram: Verified server-side via SHA256/HMAC signature check against TELEGRAM_BOT_TOKEN.
 *  - Apple: Verified server-side against Apple JWKS.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getNotDisplayedReason: () => string;
              getSkippedReason: () => string;
            }) => void,
          ) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            user?: { name?: { firstName?: string; lastName?: string } };
          };
        }>;
      };
    };
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("SDK load failed")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error("SDK load failed"));
    document.head.appendChild(s);
  });
}

interface Providers {
  google: boolean;
  apple: boolean;
  telegram: boolean;
}

export interface SocialSignInButtonsProps {
  onAuthed: () => void;
  /* BOTH is selectable at signup and accepted by the OAuth/Telegram provisioning
     paths, so it must be representable here too. */
  role?: "CLIENT" | "FREELANCER" | "BOTH";
}

export function SocialSignInButtons({ onAuthed, role }: SocialSignInButtonsProps) {
  const [providers, setProviders] = useState<Providers>({
    google: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
    apple: Boolean(import.meta.env.VITE_APPLE_CLIENT_ID),
    // Provisional only: the server is the source of truth for whether a
    // provider can actually verify a credential, and it is asked on mount.
    telegram: true,
  });
  const [botUsername, setBotUsername] = useState<string | null>(
    (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) || null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  // The Login Widget renders an iframe with no error channel. Track whether it
  // actually appeared so we can explain the failure and offer the code path.
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const telegramWidgetRef = useRef<HTMLDivElement>(null);
  const appleNameRef = useRef<
    { firstName?: string; lastName?: string } | undefined
  >(undefined);

  useEffect(() => {
    api
      .getOAuthProviders()
      .then((res) => {
        setProviders({
          google: res.google || Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
          apple: res.apple || Boolean(import.meta.env.VITE_APPLE_CLIENT_ID),
          // Honour the server: with no bot token configured every Telegram
          // credential would fail verification with a 503.
          telegram: res.telegram,
        });
        if (res.telegramBotUsername) setBotUsername(res.telegramBotUsername);
      })
      .catch(() => {
        // Fallback to client-defined env flags
        setProviders({
          google: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
          apple: Boolean(import.meta.env.VITE_APPLE_CLIENT_ID),
          telegram: Boolean(import.meta.env.VITE_TELEGRAM_BOT_USERNAME),
        });
      });
  }, []);

  const finish = useCallback(
    (provider: string) => {
      setBusy(null);
      if (provider === "GOOGLE" || provider === "APPLE" || provider === "TELEGRAM") {
        events.login(
          provider.toLowerCase() as "google" | "apple" | "telegram",
        );
      }
      onAuthed();
    },
    [onAuthed],
  );

  const handle = useCallback(
    async (
      provider: "GOOGLE" | "APPLE" | "TELEGRAM",
      fn: () => Promise<{ accessToken: string; refreshToken?: string | null }>,
    ) => {
      setBusy(provider);
      setError(null);
      try {
        const session = await fn();
        api.setSession(session);
        finish(provider);
      } catch (err) {
        setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
      } finally {
        setBusy(null);
      }
    },
    [finish],
  );

  // ---- Google GIS setup ----
  useEffect(() => {
    if (!providers.google) return;
    let cancelled = false;

    (async () => {
      try {
        await loadScript(
          "https://accounts.google.com/gsi/client",
          "google-gsi-client",
        );
        if (cancelled || !window.google) return;

        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
          string | undefined;
        if (!clientId) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) =>
            void handle("GOOGLE", async () => {
              return api.loginWithGoogleOAuth(response.credential, role);
            }),
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            type: "icon",
            shape: "circle",
            size: "large",
          });
        }
      } catch {
        /* button fallback SVG remains visible */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [providers.google, handle, role]);

  const startGoogle = () => {
    if (busy) return;
    setError(null);

    // If Google GIS prompt is initialized, open account chooser
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          setError("Google Sign-In is blocked or unconfigured on this origin.");
        }
      });
    } else {
      setError("Loading Google Sign-In, please try again in a moment.");
    }
  };

  // ---- Telegram Widget in Modal setup ----
  //
  // Why this is defensive rather than "append the script and hope":
  //  1. `window.onTelegramAuth` must exist BEFORE the widget script executes,
  //     because Telegram invokes it via the data-onauth attribute. Installing
  //     it inside this effect and deleting it on cleanup raced with React
  //     StrictMode's double-invoke in development, leaving the callback gone
  //     while the widget iframe was live — a button that silently did nothing.
  //  2. telegram-widget.js replaces its own <script> with an iframe. Re-opening
  //     the modal must not append a duplicate, and the script must only be
  //     inserted once per page.
  //  3. If the domain is not registered with @BotFather via /setdomain, or
  //     telegram.org is blocked, the widget renders nothing and there is no
  //     error event. We poll for the iframe so the user gets told, and the
  //     one-time code path below becomes the visible fallback.
  useEffect(() => {
    if (!showTelegramModal || !botUsername) return;

    if (!window.onTelegramAuth) {
      window.onTelegramAuth = (user: Record<string, unknown>) => {
        setShowTelegramModal(false);
        void handle("TELEGRAM", async () => {
          const res = await api.loginWithTelegram(user, role);
          return { accessToken: res.accessToken, refreshToken: res.refreshToken };
        });
      };
    }

    const container = telegramWidgetRef.current;
    if (!container) return;

    // Only inject once; the widget script self-replaces with an iframe.
    if (!document.querySelector("script[data-telegram-login]")) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "10");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.onerror = () => setWidgetFailed(true);
      container.appendChild(script);
    }

    // Surface the silent failure modes instead of showing an empty box.
    let waited = 0;
    const poll = window.setInterval(() => {
      waited += 250;
      if (container.querySelector("iframe")) {
        window.clearInterval(poll);
      } else if (waited >= 5000) {
        window.clearInterval(poll);
        setWidgetFailed(true);
      }
    }, 250);

    return () => window.clearInterval(poll);
  }, [showTelegramModal, botUsername, handle, role]);

  const startTelegram = () => {
    if (busy) return;
    setError(null);
    setWidgetFailed(false);
    setCodeInput("");

    // If running inside Telegram MiniApp, authenticate seamlessly
    const miniAppInitData = window.Telegram?.WebApp?.initData;
    if (miniAppInitData) {
      void handle("TELEGRAM", async () => {
        const res = await api.loginWithTelegram(miniAppInitData, role);
        return { accessToken: res.accessToken, refreshToken: res.refreshToken };
      });
      return;
    }

    // On standard web browser, open the Telegram auth modal. The code path
    // inside works even with no bot handle configured, so only block when
    // there is neither a widget nor a way to reach the bot.
    if (!botUsername) {
      setShowTelegramModal(true);
      setWidgetFailed(true);
      return;
    }
    setShowTelegramModal(true);
  };

  /** Redeems the one-time code the bot mints via /login. */
  const submitTelegramCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setError("Enter the code the bot gave you.");
        return;
      }
      setError(null);
      setBusy("TELEGRAM");
      try {
        const session = await api.loginWithTelegramCode(trimmed);
        api.setSession(session);
        setShowTelegramModal(false);
        finish("TELEGRAM");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "That code could not be redeemed. Send /login to the bot for a new one.",
        );
      } finally {
        setBusy(null);
      }
    },
    [finish],
  );

  // Arriving from the bot's "Sign in on the web" button carries the code in the
  // URL, so the member never has to type it. Strip it from the address bar so
  // a refresh does not replay a spent code.
  // On failure, open the modal so the user sees the error and has a path to retry.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("tg_code");
    if (!code) return;

    params.delete("tg_code");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );

    // Pre-fill the code input so the user can see what was attempted
    setCodeInput(code.toUpperCase());

    const tryRedeem = async () => {
      try {
        await submitTelegramCode(code);
      } catch {
        // submitTelegramCode already sets the error state. Open the modal so
        // the user sees the message and has a path to get a new code.
        setShowTelegramModal(true);
        setWidgetFailed(true);
      }
    };
    void tryRedeem();
  }, [submitTelegramCode]);

  // When the page is loaded with ?tg_auth in the URL (set by the bot's
  // "Continue with Telegram" flow), auto-open the Telegram modal so the
  // user immediately sees where to enter their code.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("tg_auth")) return;
    params.delete("tg_auth");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    setShowTelegramModal(true);
    setWidgetFailed(true); // go straight to code-entry — most reliable path
  }, []);

  const startApple = () =>
    handle("APPLE", async () => {
      const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as
        string | undefined;
      if (!clientId) throw new Error("Apple sign-in is not configured.");
      await loadScript(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
        "apple-id-sdk",
      );
      const redirectUri = `${window.location.origin}/auth/apple/callback`;
      window.AppleID!.auth.init({
        clientId,
        scope: "name email",
        redirectURI: redirectUri,
        usePopup: true,
      });
      const res = await window.AppleID!.auth.signIn();
      appleNameRef.current = res.authorization.user?.name;
      return api.loginWithAppleOAuth(
        res.authorization.id_token,
        appleNameRef.current?.firstName,
        appleNameRef.current?.lastName,
      );
    });

  const hasAnyProvider = providers.google || providers.telegram || providers.apple;
  if (!hasAnyProvider) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginTop: 10,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--color-text-secondary)",
          fontSize: "0.78rem",
          fontWeight: 500,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        <span>Or {role ? `register as ${role.toLowerCase()} with` : "continue with"}</span>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* ── GOOGLE BUTTON (Always visible, with official Google SVG logo + GIS layer) ── */}
        {providers.google && (
          <button
            type="button"
            onClick={startGoogle}
            disabled={busy !== null}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              cursor: busy !== null ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              padding: 0,
            }}
            aria-label="Sign in or register with Google"
            title="Google"
          >
            {/* Visual 4-color Google Icon (Always rendered) */}
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

            {/* Google GIS Overlay (Catches direct clicks when Google GIS iframe succeeds) */}
            <div
              ref={googleBtnRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0.001,
                overflow: "hidden",
                cursor: "pointer",
                zIndex: 2,
              }}
            />
          </button>
        )}

        {/* ── TELEGRAM BUTTON (Replaces Facebook with official Telegram icon) ── */}
        {providers.telegram && (
          <button
            type="button"
            onClick={startTelegram}
            disabled={busy !== null}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: busy !== null ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              padding: 0,
              transition: "transform 0.15s ease",
            }}
            aria-label="Sign in or register with Telegram"
            title="Telegram"
          >
            {/* Official Telegram Paper Airplane Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#24A1DE">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
            </svg>
          </button>
        )}

        {/* ── APPLE BUTTON ── */}
        {providers.apple && (
          <button
            type="button"
            onClick={startApple}
            disabled={busy !== null}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: busy !== null ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              padding: 0,
            }}
            aria-label="Sign in or register with Apple"
            title="Apple"
          >
            <svg width="18" height="18" viewBox="0 0 384 512" fill="#000000">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "var(--color-error-text)",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {/* ── TELEGRAM AUTH MODAL ── */}
      {showTelegramModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowTelegramModal(false)}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              width: "min(100%, 420px)",
              padding: "24px 28px",
              boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowTelegramModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                padding: 4,
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: "rgba(36, 161, 222, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
                color: "#24A1DE",
              }}
            >
              <Send size={28} />
            </div>

            <h3 style={{ margin: "0 0 6px 0", color: "var(--color-text)", fontSize: "1.2rem" }}>
              Continue with Telegram
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>
              {role
                ? `Register your new Yekis ${role.toLowerCase()} account via Telegram.`
                : "Sign in with your verified Telegram identity."}
            </p>

            {/* ── PATH 1: official Telegram Login Widget ── */}
            {botUsername && !widgetFailed && (
              <>
                <div
                  ref={telegramWidgetRef}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    minHeight: 44,
                    marginBottom: 18,
                    width: "100%",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    margin: "4px 0 16px 0",
                    color: "var(--color-text-tertiary)",
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                  <span>OR</span>
                  <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                </div>
              </>
            )}

            {/* ── PATH 2: get a code from the bot ──
                Always available. This is the only path that works when the
                Login Widget cannot render: the site domain must be registered
                with @BotFather via /setdomain, and telegram.org itself is
                blocked by some networks and ad blockers. */}
            {botUsername && (
              <a
                href={`https://t.me/${botUsername}?start=web_auth`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  textDecoration: "none",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  width: "100%",
                  marginBottom: 14,
                }}
              >
                <ExternalLink size={16} /> Open @{botUsername} for a sign-in code
              </a>
            )}

            {widgetFailed && (
              <p
                style={{
                  margin: "0 0 14px 0",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "var(--color-text)",
                  fontSize: "0.8rem",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                The Telegram sign-in button could not load. This usually means
                this domain is not registered with @BotFather, or your network
                blocks telegram.org.
                <br />
                <strong>Use a code instead:</strong> open the bot above, press
                Start, then send <code>/login</code> and enter the code here.
              </p>
            )}

            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    void submitTelegramCode(codeInput);
                  }
                }}
                placeholder="Enter code from the bot"
                aria-label="Telegram sign-in code"
                autoComplete="one-time-code"
                spellCheck={false}
                maxLength={16}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "0.9rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void submitTelegramCode(codeInput);
                }}
                disabled={busy !== null || !codeInput.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: busy !== null ? "#9ca3af" : "#24A1DE",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor:
                    busy !== null || !codeInput.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {busy === "TELEGRAM" ? "Verifying…" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
