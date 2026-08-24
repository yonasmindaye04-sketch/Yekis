import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("yekis-theme") as Theme | null;
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("yekis-theme", theme);

    if (typeof window !== "undefined" && (window as unknown as { Telegram?: { WebApp?: { setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } } })?.Telegram?.WebApp) {
      const wa = (window as unknown as { Telegram: { WebApp: { setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } } }).Telegram.WebApp;
      wa.setHeaderColor?.(theme === "dark" ? "#0b1116" : "#ffffff");
      wa.setBackgroundColor?.(theme === "dark" ? "#0b1116" : "#fafafa");
    }
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "light" ? "dark" : "light"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}