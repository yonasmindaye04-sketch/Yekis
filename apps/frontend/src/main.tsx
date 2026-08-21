// === IMPORTS ===
import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './telegram/miniApp.css'
import './website-icons.css'
import { ThemeProvider } from './theme/ThemeContext'
import App from './App.tsx'


// === MAIN COMPONENT ===
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Mini App render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="crash-screen">
          <img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo" style={{ marginBottom: "28px" }} />
          <p className="eyebrow">Yekis jobs</p>
          <h1>The workspace needs a refresh.</h1>
          <p>The Mini App hit an unexpected error. Reload it and try the action again.</p>
          <code>{this.state.error.message}</code>
          <button className="btn-primary" onClick={() => window.location.reload()}>Reload Yekis</button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
