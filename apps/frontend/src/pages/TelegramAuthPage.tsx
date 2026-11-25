import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { events } from "../analytics";
import { type Language, useI18n } from "../i18n";

/**
 * Standalone Telegram sign-in landing page.
 *
 * Opened when:
 *  1. A user follows the bot's deep link (/start web_auth) from the web
 *  2. The web navigates to /auth/telegram directly
 *  3. A ?tg_code= param is present in the URL (auto-redeems)
 *
 * After successful authentication, calls onAuthed() so the parent app
 * can transition to the authenticated state.
 */
export interface TelegramAuthPageProps {
  onAuthed: () => void;
  botUsername?: string | null;
}

const TELEGRAM_AUTH_COPY: Record<
  Language,
  {
    enterCodePrompt: string;
    redeemFailed: string;
    invalidCode: string;
    tooManyAttempts: string;
    suspended: string;
    title: string;
    subtitleBefore: string;
    subtitleAfter: string;
    signedIn: string;
    placeholder: string;
    inputAria: string;
    verifying: string;
    signIn: string;
    openBot: string;
    expiryNote: string;
  }
> = {
  en: {
    enterCodePrompt: "Please enter the code from the Yekis bot.",
    redeemFailed: "Code redemption failed.",
    invalidCode:
      "That code is invalid or has expired. Open the Yekis bot and send /login to get a fresh code.",
    tooManyAttempts: "Too many attempts. Please wait a few minutes and try again.",
    suspended: "This account is suspended. Please contact support.",
    title: "Sign in with Telegram",
    subtitleBefore: "Open the Yekis bot, send ",
    subtitleAfter: ", then enter your code below.",
    signedIn: "Signed in! Redirecting…",
    placeholder: "Enter code (e.g. AB3D9F2K)",
    inputAria: "Telegram sign-in code",
    verifying: "Verifying…",
    signIn: "Sign in",
    openBot: "Open Yekis Bot",
    expiryNote: "Your code expires in 10 minutes and works once only.",
  },
  am: {
    enterCodePrompt: "እባክዎ ከYeKis ቦት የተሰጠዎትን ኮድ ያስገቡ።",
    redeemFailed: "ኮዱን ማረጋገጥ አልተቻለም።",
    invalidCode:
      "ይህ ኮድ ልክ ያልሆነ ወይም ጊዜው ያለፈበት ነው። የYeKis ቦትን ከፍተው /login በመላክ አዲስ ኮድ ያግኙ።",
    tooManyAttempts: "ብዙ ተደጋጋሚ ሙከራዎች ተደርገዋል። እባክዎ ጥቂት ደቂቃዎች ጠብቀው ይሞክሩ።",
    suspended: "ይህ መለያ ታግዷል። እባክዎ የድጋፍ ክፍሉን ያነጋግሩ።",
    title: "በቴሌግራም ይግቡ",
    subtitleBefore: "የYeKis ቦትን ይክፈቱ፣ ",
    subtitleAfter: " ይላኩ፣ ከዚያ ኮድዎን ከዚህ በታች ያስገቡ።",
    signedIn: "ገብተዋል! በማሸጋገር ላይ…",
    placeholder: "ኮድ ያስገቡ (ለምሳሌ AB3D9F2K)",
    inputAria: "የቴሌግራም መግቢያ ኮድ",
    verifying: "በማረጋገጥ ላይ…",
    signIn: "ግባ",
    openBot: "የYeKis ቦትን ክፈት",
    expiryNote: "ኮድዎ በ10 ደቂቃ ውስጥ ጊዜው ያልፋል እና ለአንድ ጊዜ ብቻ ይሠራል።",
  },
  om: {
    enterCodePrompt: "Maaloo koodii bootii Yekis irraa argattan galchaa.",
    redeemFailed: "Koodii mirkaneessuun hin milkoofne.",
    invalidCode:
      "Koodiin kun dogoggora ykn yeroon isaa darbeera. Bootii Yekis banaatii koodii haaraa argachuuf /login ergaa.",
    tooManyAttempts: "Yaalii baay'ee ta'eera. Maaloo daqiiqaa muraasa eegaatii yaalaa.",
    suspended: "Herregni kun dhorkameera. Maaloo deeggarsa quunnamaa.",
    title: "Telegramiin seeni",
    subtitleBefore: "Bootii Yekis banaa, ",
    subtitleAfter: " ergaatii koodii keessan armaan gaditti galchaa.",
    signedIn: "Seentaniittu! Gara fuula biraatti ce'aa jira…",
    placeholder: "Koodii galchi (fkn AB3D9F2K)",
    inputAria: "Koodii seenumsa Telegram",
    verifying: "Mirkaneessaa jira…",
    signIn: "Seeni",
    openBot: "Bootii Yekis Bani",
    expiryNote: "Koodiin keessan daqiiqaa 10 keessatti darba, si'a tokko qofa hojjeta.",
  },
  ti: {
    enterCodePrompt: "በጃኹም ካብ ቦት YeKis ዝተዋህበኩም ኮድ የእትዉ።",
    redeemFailed: "ምርግጋጽ ኮድ ኣይተሳኸዐን።",
    invalidCode:
      "እዚ ኮድ ግጉይ ወይ ግዜኡ ዝሓለፈ እዩ። ቦት YeKis ከፊትኩም ሓድሽ ኮድ ንምርካብ /login ስደዱ።",
    tooManyAttempts: "ብዙሕ ፈተነታት ተገይሩ። ሒደት ደቓይቕ ጸኒሕኩም እንደገና ፈትኑ።",
    suspended: "እዚ ኣካውንት ተኣጊዱ ኣሎ። በጃኹም ደገፍ ተወከሱ።",
    title: "ብቴሌግራም እቶ",
    subtitleBefore: "ቦት YeKis ክፈቱ፣ ",
    subtitleAfter: " ስደዱ፣ ድሕሪኡ ኮድኩም ኣብ ታሕቲ የእትዉ።",
    signedIn: "ኣቲኹም ኣለኹም! ይሰጋገር ኣሎ…",
    placeholder: "ኮድ የእትዉ (ንኣብነት AB3D9F2K)",
    inputAria: "ኮድ መእተዊ ቴሌግራም",
    verifying: "የረጋግጽ ኣሎ…",
    signIn: "እቶ",
    openBot: "ቦት YeKis ክፈት",
    expiryNote: "ኮድኩም ኣብ ውሽጢ 10 ደቒቕ የብቅዕ፣ ንሓደ ግዜ ጥራይ ድማ ይሰርሕ።",
  },
};

export function TelegramAuthPage({ onAuthed, botUsername }: TelegramAuthPageProps) {
  const { language } = useI18n();
  const copy = TELEGRAM_AUTH_COPY[language] ?? TELEGRAM_AUTH_COPY.en;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const redeemCode = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) {
      setError(copy.enterCodePrompt);
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const session = await api.loginWithTelegramCode(trimmed);
      api.setSession(session);
      events.login("telegram");
      setStatus("success");
      setTimeout(onAuthed, 400);
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : copy.redeemFailed;
      if (msg.includes("INVALID_CODE") || msg.includes("invalid or has expired")) {
        setError(copy.invalidCode);
      } else if (msg.includes("TOO_MANY_ATTEMPTS")) {
        setError(copy.tooManyAttempts);
      } else if (msg.includes("suspended")) {
        setError(copy.suspended);
      } else {
        setError(msg);
      }
    }
  }, [copy, onAuthed]);

  // Auto-redeem a code that arrived in the URL (?tg_code=XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("tg_code");
    if (!urlCode) return;

    params.delete("tg_code");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );

    setCode(urlCode.toUpperCase());
    void redeemCode(urlCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void redeemCode(code);
  };

  const botLink = botUsername
    ? `https://t.me/${botUsername}?start=web_auth`
    : null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "min(100%, 400px)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          textAlign: "center",
        }}
      >
        {/* Telegram icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(36, 161, 222, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#24A1DE">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--color-text)",
            }}
          >
            {copy.title}
          </h1>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            {copy.subtitleBefore}
            <code>/login</code>
            {copy.subtitleAfter}
          </p>
        </div>

        {/* Success */}
        {status === "success" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#22c55e",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {copy.signedIn}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "var(--color-text)",
              fontSize: "0.85rem",
              textAlign: "left",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Code entry form */}
        {status !== "success" && (
          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={copy.placeholder}
              aria-label={copy.inputAria}
              autoComplete="one-time-code"
              spellCheck={false}
              maxLength={16}
              disabled={status === "loading"}
              style={{
                width: "100%",
                padding: "13px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: "1.05rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textAlign: "center",
                fontWeight: 600,
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading" || !code.trim()}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: status === "loading" || !code.trim() ? "#9ca3af" : "#24A1DE",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: status === "loading" || !code.trim() ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {status === "loading" ? copy.verifying : copy.signIn}
            </button>
          </form>
        )}

        {/* Bot link */}
        {botLink && status !== "success" && (
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: "#24A1DE",
              fontWeight: 600,
              fontSize: "0.88rem",
              textDecoration: "none",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {copy.openBot}
          </a>
        )}

        <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "0.78rem" }}>
          {copy.expiryNote}
        </p>
      </div>
    </div>
  );
}
