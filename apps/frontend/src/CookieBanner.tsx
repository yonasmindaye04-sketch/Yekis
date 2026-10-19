import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";
import { initAnalytics } from "./analytics";
import { useI18n } from "./i18n";
import "./CookieBanner.css";

interface ConsentState {
  necessary: true; // Always true, not toggleable
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("yekis_consent");
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    // If consent exists, initialize analytics if permitted
    initAnalytics();
  }, []);

  const saveConsent = (analyticsVal: boolean, marketingVal: boolean) => {
    const consent: ConsentState = {
      necessary: true,
      analytics: analyticsVal,
      marketing: marketingVal,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("yekis_consent", JSON.stringify(consent));
    setVisible(false);
    if (analyticsVal) initAnalytics();
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner-content">
        <div className="cookie-banner-header">
          <div className="cookie-banner-icon">
            <Shield size={20} />
          </div>
          <div>
            <h3>{t.marketing.cookie.title}</h3>
            <p>
              {t.marketing.cookie.description}
            </p>
          </div>
          <button
            className="cookie-close"
            onClick={() => saveConsent(false, false)}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        {showDetails && (
          <div className="cookie-details">
            <div className="cookie-category">
              <div className="cookie-category-header">
                <strong>{t.marketing.cookie.essential}</strong>
                <span className="cookie-always-on">Always on</span>
              </div>
              <p>
                Required for the site to function. Includes KYC data processing
                consent (required for platform use, not toggleable).
              </p>
            </div>
            <div className="cookie-category">
              <div className="cookie-category-header">
                <strong>{t.marketing.cookie.analytics}</strong>
                <label className="cookie-toggle">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                  />
                  <span className="cookie-toggle-slider" />
                </label>
              </div>
              <p>
                Helps us understand how visitors use the site so we can improve
                it.
              </p>
            </div>
            <div className="cookie-category">
              <div className="cookie-category-header">
                <strong>{t.marketing.cookie.marketing}</strong>
                <label className="cookie-toggle">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                  <span className="cookie-toggle-slider" />
                </label>
              </div>
              <p>
                Used to show you relevant content and measure campaign
                effectiveness.
              </p>
            </div>
          </div>
        )}

        <div className="cookie-actions">
          {!showDetails && (
            <button
              className="cookie-btn-details"
              onClick={() => setShowDetails(true)}
            >
              {t.marketing.cookie.manage}
            </button>
          )}
          {showDetails && (
            <button
              className="cookie-btn-save"
              onClick={() => saveConsent(analytics, marketing)}
            >
              {t.marketing.cookie.save}
            </button>
          )}
          <button
            className="cookie-btn-accept"
            onClick={() => saveConsent(true, true)}
          >
            {t.marketing.cookie.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
