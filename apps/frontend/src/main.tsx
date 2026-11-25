// === IMPORTS ===
import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./telegram/miniApp.css";
import "./website-icons.css";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider, useI18n, type Language } from "./i18n";
import { HashRouter } from "./router/HashRouter";
import App from "./App.tsx";

const CRASH_COPY: Record<
  Language,
  { eyebrow: string; title: string; body: string; reload: string }
> = {
  en: {
    eyebrow: "Yekis jobs",
    title: "The workspace needs a refresh.",
    body: "The workspace hit an unexpected error. Reload the page and try the action again.",
    reload: "Reload Yekis",
  },
  am: {
    eyebrow: "YeKis ሥራዎች",
    title: "ገጹን እንደገና መጫን ያስፈልጋል።",
    body: "ያልተጠበቀ ስህተት አጋጥሟል። ገጹን እንደገና ይጫኑ እና እርምጃውን ደግመው ይሞክሩ።",
    reload: "YeKisን ዳግም ጫን",
  },
  om: {
    eyebrow: "Hojiiwwan Yekis",
    title: "Bakki hojii haarawoomfamuu qaba.",
    body: "Dogoggorri hin eegamne mudateera. Fuula kana irra deebi'ii fe'iitii ammas yaali.",
    reload: "Yekis irra deebi'ii fe'i",
  },
  ti: {
    eyebrow: "ስራሕቲ YeKis",
    title: "መድረኽ ዳግም ምጽዓን የድልዮ።",
    body: "ዘይተጸበናዮ ጌጋ ኣጋጢሙ። ነቲ ገጽ ዳግም ጽዒንኩም እንደገና ፈትኑ።",
    reload: "YeKis ዳግም ጽዓን",
  },
};

function CrashFallbackView({ error }: { error: Error }) {
  const { language } = useI18n();
  const copy = CRASH_COPY[language] ?? CRASH_COPY.en;
  return (
    <main className="crash-screen">
      <img
        src="/svgviewer-output.svg"
        alt="Yekis"
        className="platform-logo"
        style={{ marginBottom: "28px" }}
      />
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <code>{error.message}</code>
      <button
        className="btn-primary"
        onClick={() => window.location.reload()}
      >
        {copy.reload}
      </button>
    </main>
  );
}

// === MAIN COMPONENT ===
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Mini App render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <CrashFallbackView error={this.state.error} />;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </LanguageProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
);

// Telegram Mini App bootstrap.
//
// This used to live as an inline <script> block in index.html. Moving it into
// the module keeps index.html free of inline script, which is what lets the
// production Content-Security-Policy keep `script-src` strict — no
// 'unsafe-inline', no 'unsafe-eval'. The SDK itself is still loaded from
// telegram.org via a <script src> tag, which the CSP allow-lists.
//
// The ordering is safe: the SDK tag in index.html is a classic (non-async,
// non-defer) script, so it has already executed by the time this module runs.
try {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.ready();
    webApp.expand();
  }
} catch (e) {
  console.error("Telegram WebApp init error", e);
}
