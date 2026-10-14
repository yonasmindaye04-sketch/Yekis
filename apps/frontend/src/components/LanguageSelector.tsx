import { useState, useRef, useEffect } from "react";
import { Languages, Check, ChevronDown } from "lucide-react";
import { useI18n, SUPPORTED_LANGUAGES } from "../i18n";
import "./LanguageSelector.css";

interface LanguageSelectorProps {
  variant?: "dropdown" | "segmented";
  className?: string;
}

export function LanguageSelector({ variant = "dropdown", className = "" }: LanguageSelectorProps) {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (variant === "segmented") {
    return (
      <div className={`yk-lang-segmented ${className}`} role="group" aria-label="Select language">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === language;
          return (
            <button
              key={lang.code}
              type="button"
              className={`yk-lang-segmented-btn ${isActive ? "is-active" : ""}`}
              onClick={() => setLanguage(lang.code)}
              aria-pressed={isActive}
              title={`${lang.name} (${lang.nativeName})`}
            >
              {lang.short}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`yk-lang-dropdown-container ${className}`} ref={containerRef}>
      <button
        type="button"
        className="yk-lang-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Change language, current: ${currentLang.nativeName}`}
      >
        <Languages size={17} className="yk-lang-icon" />
        <span className="yk-lang-trigger-label">{currentLang.short}</span>
        <ChevronDown size={14} className={`yk-lang-chevron ${isOpen ? "is-open" : ""}`} />
      </button>

      {isOpen && (
        <ul className="yk-lang-menu" role="listbox" aria-label="Available languages">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <li key={lang.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`yk-lang-option ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                >
                  <span className="yk-lang-names">
                    <strong className="yk-lang-native">{lang.nativeName}</strong>
                    <span className="yk-lang-english">{lang.name}</span>
                  </span>
                  {isSelected && <Check size={16} className="yk-lang-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
