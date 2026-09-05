import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

/**
 * Social sign-in buttons for Google / Apple / Facebook.
 * Renders ONLY providers the backend reports as configured (via
 * /auth/oauth/providers) - no dead buttons, no unverified fallbacks.
 *
 * Flows:
 *  - Google: Google Identity Services (GIS) - loads the script when the
 *    provider is configured, prompts the account chooser, and returns a
 *    Google-signed id_token which the backend verifies against JWKS.
 *  - Apple: Sign in with Apple JS SDK - returns an identity_token verified
 *    against Apple's JWKS.
 *  - Facebook: FB SDK v19 login - returns an access token verified server-
 *    side via Graph debug_token.
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
    FB?: {
      init: (config: {
        appId: string;
        cookie: boolean;
        version: string;
      }) => void;
      login: (
        cb: (response: { authResponse?: { accessToken: string } }) => void,
        opts: { scope: string },
      ) => void;
    };
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
  facebook: boolean;
  telegram: boolean;
}

export function SocialSignInButtons({ onAuthed }: { onAuthed: () => void }) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  // Apple hands the user's name ONLY on first consent - stash it between the
  // SDK response and the backend call.
  const appleNameRef = useRef<
    { firstName?: string; lastName?: string } | undefined
  >(undefined);

  useEffect(() => {
    api
      .getOAuthProviders()
      .then(setProviders)
      .catch(() =>
        setProviders({
          google: false,
          apple: false,
          facebook: false,
          telegram: false,
        }),
      );
  }, []);

  const finish = useCallback(
    (provider: string) => {
      setBusy(null);
      if (provider === "google") {
        // GIS button flow re-renders on its own; nothing else needed.
      }
      onAuthed();
    },
    [onAuthed],
  );

  const handle = useCallback(
    async (
      provider: "GOOGLE" | "APPLE" | "FACEBOOK",
      fn: () => Promise<{ accessToken: string; refreshToken: string }>,
    ) => {
      setBusy(provider);
      setError(null);
      try {
        const session = await fn();
        api.setSession(session);
        finish(provider);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Social sign-in failed");
      } finally {
        setBusy(null);
      }
    },
    [finish],
  );

  // ---- Google GIS setup ----
  useEffect(() => {
    if (providers?.google !== true) return;
    let cancelled = false;

    (async () => {
      try {
        await loadScript(
          "https://accounts.google.com/gsi/client",
          "google-gsi-client",
        );
        if (cancelled || !window.google || !googleBtnRef.current) return;

        // Client id comes from the backend availability probe? No - GIS needs
        // it client-side; read from Vite env (same value as backend's
        // GOOGLE_CLIENT_ID, set in apps/frontend/.env).
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
          string | undefined;
        if (!clientId) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) =>
            void handle("GOOGLE", async () => {
              return api.loginWithGoogleOAuth(response.credential);
            }),
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          type: "icon",
          shape: "circle",
          size: "large",
        });
      } catch {
        /* button simply won't render */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [providers?.google, handle]);

  if (!providers) return null;
  const any = providers.google || providers.apple || providers.facebook;
  if (!any) return null;

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

  const startFacebook = () =>
    handle("FACEBOOK", async () => {
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
      if (!appId) throw new Error("Facebook sign-in is not configured.");
      await loadScript(
        "https://connect.facebook.net/en_US/sdk.js",
        "facebook-sdk",
      );
      window.FB!.init({ appId, cookie: true, version: "v19.0" });
      await new Promise<void>((resolve, reject) => {
        window.FB!.login(
          (response) => {
            if (response.authResponse?.accessToken) resolve();
            else reject(new Error("Facebook sign-in was cancelled."));
          },
          { scope: "email,public_profile" },
        );
      });
      // FB.login's callback already resolved; grab token via a second login
      // is not needed - but the SDK doesn't hand it back synchronously here,
      // so re-fetch via a fresh login promise wrapper.
      const accessToken = await new Promise<string>((resolve) => {
        window.FB!.login(
          (response) => resolve(response.authResponse?.accessToken ?? ""),
          { scope: "email,public_profile" },
        );
      });
      if (!accessToken) throw new Error("Facebook sign-in was cancelled.");
      return api.loginWithFacebookOAuth(accessToken);
    });

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
      {any && (
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
          <div
            style={{ flex: 1, height: 1, background: "var(--color-border)" }}
          />
          <span>Or continue with</span>
          <div
            style={{ flex: 1, height: 1, background: "var(--color-border)" }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {providers.google && (
          <div
            ref={googleBtnRef}
            style={{ display: "flex", justifyContent: "center" }}
          />
        )}

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
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            aria-label="Sign in with Apple"
          >
            <svg width="18" height="18" viewBox="0 0 384 512" fill="#000000">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
          </button>
        )}

        {providers.facebook && (
          <button
            type="button"
            onClick={startFacebook}
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
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            aria-label="Sign in with Facebook"
          >
            <svg width="18" height="18" viewBox="0 0 320 512" fill="#1877F2">
              <path d="M279.1 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.4 0 225.4 0c-73.22 0-121.1 44.38-121.1 124.7v70.62H22.89V288h81.39v224h100.2V288z" />
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
    </div>
  );
}
