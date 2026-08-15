// Consent-aware GA4 analytics for Yekis marketing site
// Only loads gtag.js AFTER user consents to analytics cookies

const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO: Replace with real GA4 ID

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  
  // Check if user has consented to analytics
  const consent = localStorage.getItem('yekis_consent');
  if (!consent) return;
  
  try {
    const parsed = JSON.parse(consent);
    if (!parsed.analytics) return;
  } catch {
    return;
  }
  
  // Load gtag.js dynamically
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  
  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure',
  });
  
  initialized = true;
}

// Track custom conversion events
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>): void {
  if (!initialized) return;
  if (typeof (window as any).gtag !== 'function') return;
  (window as any).gtag('event', eventName, params);
}

// Predefined conversion events
export const events = {
  signupStarted: () => trackEvent('signup_started'),
  signupCompleted: () => trackEvent('signup_completed'),
  jobPosted: () => trackEvent('job_posted'),
  proposalSubmitted: () => trackEvent('proposal_submitted'),
  ctaClicked: (label: 'hire' | 'work') => trackEvent('cta_clicked', { cta_label: label }),
  languageChanged: (lang: 'en' | 'am') => trackEvent('language_changed', { language: lang }),
  faqExpanded: (question: string) => trackEvent('faq_expanded', { question }),
  pageView: (pageName: string) => trackEvent('page_view', { page_name: pageName }),
};
