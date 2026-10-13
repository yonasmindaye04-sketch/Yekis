// === IMPORTS ===
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  api,
  type Job,
  type MeResponse,
  type Milestone,
  type TopUpRequest,
  type WalletResponse,
} from "./api/client";
import { realtimeSocket } from "./api/socket";
import { LandingPageV2 as LandingPage } from "./LandingPageV2";
import { ChatWorkspace } from "./ChatWorkspace";
import { OpsConsole } from "./pages/ops/OpsConsole";
import { BrowserWallet } from "./BrowserWallet";
import { BrowserVerification } from "./BrowserVerification";
import { NotificationCenter } from "./NotificationCenter";
import {
  ContractsWorkspace,
  DisputesWorkspace,
  JobsWorkspace,
} from "./WorkflowWorkspace";
import {
  LayoutDashboard,
  Briefcase,
  Search,
  FileText,
  Wallet,
  MessageCircle,
  ShieldCheck,
  Scale,
  Settings,
  ChevronDown,
  Plus,
  LogOut,
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  Edit,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  X,
  LifeBuoy,
} from "lucide-react";
import { ProfilePage } from "./ProfilePage";
import { ProfileEditPage } from "./ProfileEditPage";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { FAQPage } from "./FAQPage";
import { FeesPage } from "./FeesPage";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";
import { AboutPage } from "./AboutPage";
import { NotFoundPage } from "./NotFoundPage";
import { ThankYouPage } from "./ThankYouPage";
import { CaseStudiesPage } from "./CaseStudiesPage";
import { CookieBanner } from "./CookieBanner";
import { OnboardingTour } from "./OnboardingTour";
import { MobileCTA } from "./MobileCTA";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { useTheme } from "./theme/ThemeContext";
import "./marketing.css";
import { PageLoadSplash, ScrollEffects } from "./components/motion";
import { initAnalytics, events } from "./analytics";
import { SocialSignInButtons } from "./components/SocialSignInButtons";
import { GigMarketplace } from "./GigMarketplace";
import { GigSellerDashboard } from "./GigSellerDashboard";
import { TelegramAuthPage } from "./pages/TelegramAuthPage";
import "./components/scroll.css";

// === INTERFACES & TYPES ===
/**
 * ADMIN and MEDIATOR are staff: they never reach this workspace, because
 * OpsConsole takes over the whole shell as soon as `user.staffRole` is set.
 * They stay in the union so `capabilitiesFor` can narrow once, and every
 * marketplace workspace then receives the narrower MarketplaceRole.
 */
type PlatformRole = "CLIENT" | "FREELANCER" | "BOTH" | "ADMIN" | "MEDIATOR";

/** What the marketplace workspaces accept (see MarketplaceRole). */
type MarketplaceRole = Extract<PlatformRole, "CLIENT" | "FREELANCER" | "BOTH">;

/**
 * Capabilities, not roles.
 *
 * The backend treats BOTH as a first-class role: POST /jobs and proposals
 * accept CLIENT or BOTH, gig publishing accepts FREELANCER or BOTH, and the
 * ops dashboard counts BOTH in the client *and* freelancer tallies. Asking
 * "what role is this?" therefore forced a BOTH account through every
 * `role === "FREELANCER"` check as false, so the shell offered it nothing a
 * freelancer can do — while the API would have accepted every call.
 *
 * Naming the capability instead makes the dual-role case fall out naturally
 * and reads correctly at each use site: `canHire` is "may fund escrow", not
 * "is a client".
 */
interface PlatformCapabilities {
  /** May post jobs and be the hiring party on a contract. */
  canHire: boolean;
  /** May submit proposals, deliver milestones and publish gigs. */
  canWork: boolean;
  /** Staff land in the Operations Console before any of this renders. */
  isStaff: boolean;
}

function capabilitiesFor(role: PlatformRole): PlatformCapabilities {
  return {
    canHire: role === "CLIENT" || role === "BOTH",
    canWork: role === "FREELANCER" || role === "BOTH",
    isStaff: role === "ADMIN" || role === "MEDIATOR",
  };
}
type View =
  | "overview"
  | "jobs"
  | "gigs"
  | "my-gigs"
  | "contracts"
  | "wallet"
  | "chat"
  | "verification"
  | "cases"
  | "settings"
  | "profile"
  | "profile-edit";
type AuthMode = "login" | "register" | "forgot-password" | "reset-password";
type MarketingPage =
  | "home"
  | "faq"
  | "fees"
  | "privacy"
  | "terms"
  | "about"
  | "case-studies"
  | "404"
  | "thank-you-signup"
  | "thank-you-job-posted"
  | "thank-you-contact"
  | "telegram_auth";

const categoryLabels: Record<string, string> = {
  WEB_APP_DEVELOPMENT: "Web app development",
  GRAPHIC_DESIGN: "Graphic design",
  DIGITAL_MARKETING: "Digital marketing",
  CONTENT_WRITING: "Content writing",
  TRANSLATION: "Translation",
  DATA_ENTRY: "Data entry",
};

const categories = Object.keys(categoryLabels);

// === OVERVIEW INTERACTIVITY (additive helpers) ===
type MetricCardKey = "wallet" | "jobs" | "milestones";
type ActivityFilterKey =
  | "ALL"
  | "AWAITING_FUNDING"
  | "IN_ESCROW"
  | "SUBMITTED"
  | "RELEASED"
  | "DISPUTED";
type ActivityDueWindow = "ANY" | "OVERDUE" | "NEXT_7" | "NEXT_30";
type ActivitySort =
  | "DEFAULT"
  | "DUE_ASC"
  | "DUE_DESC"
  | "AMOUNT_DESC"
  | "AMOUNT_ASC";

const activityFilterLabels: Record<ActivityFilterKey, string> = {
  ALL: "All",
  AWAITING_FUNDING: "Awaiting funding",
  IN_ESCROW: "In escrow",
  SUBMITTED: "Submitted",
  RELEASED: "Released",
  DISPUTED: "Disputed",
};

const activityFilterStates: Record<Exclude<ActivityFilterKey, "ALL">, string[]> =
  {
    AWAITING_FUNDING: ["PAYMENT_PENDING"],
    IN_ESCROW: ["ESCROW_HELD", "WORK_IN_PROGRESS"],
    SUBMITTED: ["SUBMITTED_FOR_REVIEW", "ACCEPTED"],
    RELEASED: ["RELEASED"],
    DISPUTED: ["DISPUTED", "REFUNDED", "PARTIAL_REFUND"],
  };

/* Milestone states where milestone value is locked in escrow */
const ESCROW_SECURED_STATES = [
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
  "SUBMITTED_FOR_REVIEW",
  "ACCEPTED",
];

/* Top-up statuses that have not yet landed in the wallet balance */
const PENDING_TOPUP_STATES = [
  "PENDING",
  "CHECKOUT_PENDING",
  "PENDING_REVIEW",
  "FLAGGED",
];

const moneyETB = (minor: number) => `ETB ${(minor / 100).toLocaleString()}`;
const compactETB = (minor: number) =>
  `ETB ${Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minor / 100)}`;
const dateLabel = (value: string) => new Date(value).toLocaleDateString();
const optionalDateLabel = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

/* Compact div-based bar chart: theme-token colors only, no layout drift */
function MiniBarChart({
  data,
  caption,
  formatValue,
}: {
  data: { key: string; label: string; value: number }[];
  caption: string;
  formatValue: (value: number) => string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((entry) => entry.value));
  return (
    <div className="mini-chart-wrap">
      <p className="mini-chart-caption">{caption}</p>
      <div
        className="mini-chart"
        role="img"
        aria-label={`${caption}. Peak month ${formatValue(max)}.`}
      >
        {data.map((entry) => (
          <div
            className="mini-chart-bar"
            key={entry.key}
            title={`${entry.label}: ${formatValue(entry.value)}`}
          >
            <span className="mini-chart-value">{formatValue(entry.value)}</span>
            <div
              className="mini-chart-fill"
              style={{
                height: `${Math.max(4, Math.round((entry.value / max) * 100))}%`,
              }}
            />
            <span className="mini-chart-label">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===
function roleLabel(role: PlatformRole) {
  /* BOTH previously fell through to "Client", so a dual-role account saw
     "Client workspace" in the shell while being able to do both. */
  return role === "FREELANCER"
    ? "Freelancer"
    : role === "BOTH"
      ? "Client & Freelancer"
      : role === "ADMIN"
        ? "Operations"
        : role === "MEDIATOR"
          ? "Mediator"
          : "Client";
}

const navIconMap: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard size={18} />,
  jobs: <Briefcase size={18} />,
  "find-work": <Search size={18} />,
  gigs: <Package size={18} />,
  contracts: <FileText size={18} />,
  wallet: <Wallet size={18} />,
  chat: <MessageCircle size={18} />,
  verification: <ShieldCheck size={18} />,
  cases: <Scale size={18} />,
  profile: <UserIcon size={18} />,
};

function AuthVisualAnimation() {
  return (
    <div className="auth-vis" aria-hidden="true">
      {/* Soft gradient accent */}
      <div className="auth-vis-glow" />

      {/* Dot grid texture */}
      <svg className="auth-vis-dots" viewBox="0 0 200 200">
        {Array.from({ length: 100 }, (_, i) => {
          const col = i % 10;
          const row = Math.floor(i / 10);
          return (
            <circle
              key={i}
              cx={col * 22 + 5}
              cy={row * 22 + 5}
              r="1.2"
              fill="var(--color-text-secondary)"
              opacity="0.18"
            />
          );
        })}
      </svg>

      {/* Metrics row — 3 key indicators */}
      <div className="auth-vis-metrics">
        <div className="auth-vis-metric" style={{ animationDelay: "0.4s" }}>
          <span className="auth-vis-metric-num">2,400+</span>
          <span className="auth-vis-metric-label">Contracts signed</span>
        </div>
        <div className="auth-vis-metric-divider" />
        <div className="auth-vis-metric" style={{ animationDelay: "0.7s" }}>
          <span className="auth-vis-metric-num">ETB 12M+</span>
          <span className="auth-vis-metric-label">Secured in escrow</span>
        </div>
        <div className="auth-vis-metric-divider" />
        <div className="auth-vis-metric" style={{ animationDelay: "1.0s" }}>
          <span className="auth-vis-metric-num">98%</span>
          <span className="auth-vis-metric-label">Payout success rate</span>
        </div>
      </div>

      {/* Live activity feed — staggered slide-ins */}
      <div className="auth-vis-feed">
        <div className="auth-vis-feed-item" style={{ animationDelay: "1.2s" }}>
          <div className="auth-vis-feed-icon green" />
          <div className="auth-vis-feed-body">
            <strong>Milestone delivered</strong>
            <span>UI Design — ETB 18,000</span>
          </div>
          <span className="auth-vis-feed-time">2m ago</span>
        </div>
        <div className="auth-vis-feed-item" style={{ animationDelay: "1.8s" }}>
          <div className="auth-vis-feed-icon blue" />
          <div className="auth-vis-feed-body">
            <strong>Contract signed</strong>
            <span>Mobile App Development</span>
          </div>
          <span className="auth-vis-feed-time">8m ago</span>
        </div>
        <div className="auth-vis-feed-item" style={{ animationDelay: "2.4s" }}>
          <div className="auth-vis-feed-icon green" />
          <div className="auth-vis-feed-body">
            <strong>Escrow funded</strong>
            <span>ETB 24,500 locked</span>
          </div>
          <span className="auth-vis-feed-time">14m ago</span>
        </div>
      </div>

      {/* Trust badges row */}
      <div className="auth-vis-trust">
        <div className="auth-vis-trust-badge" style={{ animationDelay: "2.8s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Held while you review</span>
        </div>
        <div className="auth-vis-trust-badge" style={{ animationDelay: "3.1s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>KYC verified</span>
        </div>
        <div className="auth-vis-trust-badge" style={{ animationDelay: "3.4s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <span>Telebirr &amp; CBE</span>
        </div>
      </div>
    </div>
  );
}

export function FullPlatformApp() {
  const { theme, toggleTheme } = useTheme();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [showLanding, setShowLanding] = useState(true);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+251");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  /* The auth form's role choice. BOTH is selectable — the backend accepts it in
   RegisterInput and treats it as a client and a freelancer. */
  const [role, setRole] = useState<"CLIENT" | "FREELANCER" | "BOTH">("CLIENT");
  const [dateOfBirth, setDateOfBirth] = useState("2000-01-01");
  const [resetToken, setResetToken] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Granular PDPP consents (Master Design §12.2) — optional purposes default
  // unticked (no pre-ticked boxes); required purposes are implied by the
  // terms checkbox + mandatory kyc/financial literals sent on register.
  const [consentNotifications, setConsentNotifications] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentAnalytics, setConsentAnalytics] = useState(false);
  const [showCookiePrefs, setShowCookiePrefs] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  // F-02: the job-post form renders its own error so a KYC refusal is visible
  // and actionable, instead of vanishing.
  const [jobError, setJobError] = useState("");
  const [jobErrorNextAction, setJobErrorNextAction] = useState<string | null>(null);
  const [view, setView] = useState<View>("overview");
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [marketingPage, setMarketingPage] = useState<MarketingPage>("home");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [wallet, setWallet] = useState<WalletResponse>({ balanceMinor: 0 });
  const [topUps, setTopUps] = useState<TopUpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCategory, setJobCategory] = useState(categories[0]);
  const [jobDescription, setJobDescription] = useState("");
  const [jobBudgetMin, setJobBudgetMin] = useState("");
  const [jobBudgetMax, setJobBudgetMax] = useState("");
  const [jobDeadline, setJobDeadline] = useState("");
  /* Overview interactivity state (additive — defaults preserve prior behavior) */
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<MetricCardKey | null>(
    null,
  );
  const [activityFilter, setActivityFilter] = useState<ActivityFilterKey>("ALL");
  const [activityDueWindow, setActivityDueWindow] =
    useState<ActivityDueWindow>("ANY");
  const [activitySort, setActivitySort] = useState<ActivitySort>("DEFAULT");
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // Auto-resume active session on visit without prompting to re-register
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("yekis-api-token")
        : null;
    if (token) {
      loadWorkspace()
        .then(() => {
          setShowLanding(false);
        })
        .catch(() => {
          api.clearToken();
        });
    }

    // Deep link from the password-reset email: /reset-password?token=...
    // Land the user directly on the reset form with the token prefilled.
    if (window.location.pathname === "/reset-password") {
      const urlToken = new URLSearchParams(window.location.search).get("token");
      if (urlToken) {
        setResetToken(urlToken);
        setAuthMode("reset-password");
        setShowLanding(false);
      }
    }

    // Telegram dedicated auth page (/auth/telegram)
    if (window.location.pathname === "/auth/telegram") {
      setMarketingPage("telegram_auth" as MarketingPage);
    }
  }, []);

  // === Analytics: boot + SPA page-view tracking ===
  // initAnalytics() is gated internally: production build only, a configured
  // VITE_GA_MEASUREMENT_ID, and analytics cookie consent (CookieBanner).
  useEffect(() => {
    initAnalytics();
  }, []);

  // Manual page_view on every client-side "route" change. The SPA keeps router
  // state in React instead of the URL, so we hook these state transitions and
  // report virtual paths ("/", "/faq", "/auth/register", "/app/wallet", ...).
  useEffect(() => {
    if (user?.staffRole) return; // staff dashboards are not part of the funnel
    if (!user && showLanding) {
      events.pageView(marketingPage === "home" ? "/" : `/${marketingPage}`);
    } else if (!user) {
      events.pageView(`/auth/${authMode}`);
    } else {
      events.pageView(`/app/${view}`);
    }
  }, [user, showLanding, marketingPage, authMode, view]);

  // Auth funnel: signup_started fires each time the register form becomes
  // visible (role is read from the entry render; later role toggles re-run
  // this effect only when authMode/showLanding/user changed — the guard
  // below prevents double-counting within one register-mode visit).
  const signupTrackedRef = useRef(false);
  useEffect(() => {
    if (!user && !showLanding && authMode === "register") {
      if (!signupTrackedRef.current) {
        signupTrackedRef.current = true;
        events.signupStarted({
          method: "email",
          user_type: role === "CLIENT" ? "client" : "freelancer",
        });
      }
    } else {
      signupTrackedRef.current = false;
    }
  }, [user, showLanding, authMode, role]);

  // Auth funnel: auth_abandoned fires if the auth screen closes (back to
  // landing / unmount) without a completed sign-in or sign-up.
  const authVisitRef = useRef<{ flow: AuthMode; completed: boolean } | null>(
    null,
  );
  useEffect(() => {
    if (user || showLanding) return;
    authVisitRef.current = { flow: authMode, completed: false };
    return () => {
      const visit = authVisitRef.current;
      authVisitRef.current = null;
      if (visit && !visit.completed) events.authAbandoned(visit.flow);
    };
    // Only keyed on entering/leaving the auth screen; mode switches are
    // tracked by the effect below so the abandonment flow stays current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showLanding]);

  useEffect(() => {
    if (authVisitRef.current) authVisitRef.current.flow = authMode;
  }, [authMode]);

  const loadWorkspace = async () => {
    const [meResult, walletResult, jobsResult, milestonesResult, topUpsResult] =
      await Promise.allSettled([
        api.getMe(),
        api.getWallet(),
        api.getJobs({ status: "OPEN" }),
        api.getMilestones(),
        api.getTopUpRequests(),
      ]);
    if (meResult.status === "rejected") throw meResult.reason;
    setUser(meResult.value);
    if (walletResult.status === "fulfilled") setWallet(walletResult.value);
    if (jobsResult.status === "fulfilled") setJobs(jobsResult.value.jobs);
    if (milestonesResult.status === "fulfilled")
      setMilestones(milestonesResult.value);
    if (topUpsResult.status === "fulfilled") setTopUps(topUpsResult.value);
    setLastUpdatedAt(new Date());
  };

  // Ref-synced alias so the polling/socket effect can stay keyed on [user]
  // exactly like the pre-existing mount effect above (no new hook deps).
  const loadWorkspaceRef = useRef(loadWorkspace);
  useEffect(() => {
    loadWorkspaceRef.current = loadWorkspace;
  });

  // "Now" reference for due-window filters. Updated on each poll tick and on
  // filter changes (event handlers) instead of during render, keeping render
  // pure for the compiler-checked lint rules.
  const [nowMs, setNowMs] = useState(0);

  // Near-real-time overview: instant reload on notify:* socket events (the
  // same events the NotificationCenter already listens to) plus a light 60s
  // poll that pauses while the tab is hidden. No new backend endpoints.
  useEffect(() => {
    if (!user) return;
    const reload = () => {
      setNowMs(Date.now());
      void loadWorkspaceRef.current().catch(() => {
        /* transient failures leave the last successful snapshot on screen */
      });
    };
    const notifyEvents = [
      "notify:escrow-funded",
      "notify:milestone-submitted",
      "notify:escrow-released",
      "notify:dispute-raised",
      "notify:dispute-resolved",
      "notify:auto-release-warning",
      "notify:gig-order-funded",
      "notify:gig-delivery-submitted",
      "notify:gig-order-completed",
    ];
    realtimeSocket.connect();
    notifyEvents.forEach((event) => realtimeSocket.on(event, reload));
    const offStatus = realtimeSocket.onStatusChange(setRealtimeLive);
    const startTimer = window.setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 60_000);
    return () => {
      notifyEvents.forEach((event) => realtimeSocket.off(event, reload));
      offStatus();
      window.clearTimeout(startTimer);
      window.clearInterval(timer);
    };
  }, [user]);

  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await loadWorkspace();
    } catch {
      /* session failures are surfaced by the initial load flow */
    } finally {
      setIsRefreshing(false);
    }
  };

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      if (authMode === "forgot-password") {
        await api.requestPasswordReset(email);
        setSuccessMessage(
          "If an account exists, a reset token has been sent to your email.",
        );
        setAuthMode("reset-password");
        return;
      }
      if (authMode === "reset-password") {
        await api.resetPassword(resetToken, password);
        setSuccessMessage("Password reset successful. You can now log in.");
        setAuthMode("login");
        setPassword("");
        return;
      }
      if (authMode === "register") {
        await api.register({
          email,
          phone,
          password,
          role,
          dateOfBirth,
          languagePreference: "en",
          consents: {
            kycDataProcessing: true,
            financialDataProcessing: true,
            platformNotifications: consentNotifications,
            marketingCommunications: consentMarketing,
            analytics: consentAnalytics,
          },
        });
      }
      const session = await api.login(email, password);
      api.setSession(session);
      // Analytics: mark the auth visit completed before the user state flips
      // (the abandonment effect's cleanup reads this flag on logout/exit).
      if (authVisitRef.current) authVisitRef.current.completed = true;
      if (authMode === "register") {
        events.signupCompleted(
          role === "CLIENT" ? "client" : role === "BOTH" ? "both" : "freelancer",
        );
      } else {
        events.login("email");
      }
      await loadWorkspace();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to continue";
      setError(
        message === "DUPLICATE_USER"
          ? "This email or phone already has an account. Switch to Sign in."
          : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setPassword("");
    setResetToken("");
    setView("overview");
    setShowLanding(true);
  };

  const submitJob = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const min = Math.round(Number(jobBudgetMin) * 100);
      const max = Math.round(Number(jobBudgetMax) * 100);
      if (jobTitle.trim().length < 5)
        throw new Error("Job title must be at least 5 characters.");
      if (jobDescription.trim().length < 20)
        throw new Error("Description must be at least 20 characters.");
      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min <= 0 ||
        max < min
      )
        throw new Error(
          "Enter valid budgets; maximum must be greater than or equal to minimum.",
        );
      if (!jobDeadline) throw new Error("Choose a deadline.");
      await api.createJob({
        title: jobTitle,
        category: jobCategory,
        description: jobDescription,
        budgetMin: { amountMinor: min, currency: "ETB" },
        budgetMax: { amountMinor: max, currency: "ETB" },
        proposedMilestones: [
          {
            title: "Initial delivery",
            amount: { amountMinor: max, currency: "ETB" },
            dueDate: jobDeadline,
          },
        ],
        deadline: jobDeadline,
      });
      events.jobPosted();
      setJobTitle("");
      setJobDescription("");
      setJobBudgetMin("");
      setJobBudgetMax("");
      setJobDeadline("");
      await loadWorkspace();
      setJobError("");
      setJobErrorNextAction(null);
      setView("jobs");
    } catch (err) {
      // F-02: this form had no error surface at all — a KYC 403 was silently
      // discarded and the user saw nothing after tapping Publish.
      const withAction = err as Error & { nextAction?: { type: string; path: string } };
      setJobError(
        withAction instanceof Error ? withAction.message : "Unable to publish job",
      );
      setJobErrorNextAction(
        withAction?.nextAction?.type === "KYC" ? "verification" : null,
      );
      setError(err instanceof Error ? err.message : "Unable to publish job");
    } finally {
      setIsLoading(false);
    }
  };

  const platformRole = (user?.role as PlatformRole) || "CLIENT";

  // Onboarding facts, built only from state this screen has actually loaded.
  // The workspace fetches /auth/me, /wallet, open jobs and the caller's
  // milestones; nothing here is inferred from a signal that means something
  // else. `jobs` is deliberately NOT used as "has posted a job" -- it holds
  // OPEN jobs, so any listing would make the step look complete for a user who
  // has never posted anything. Steps needing data this screen does not load are
  // left out of the tour rather than hardcoded to false, which would render a
  // step the user could never tick off.
  const tourFacts = useMemo(
    () => ({
      role: (user?.role as "CLIENT" | "FREELANCER" | "BOTH") || "CLIENT",
      kycStatus: user?.kyc?.status ?? "PENDING",
      walletBalanceMinor: wallet.balanceMinor ?? 0,
      hasFundedMilestone: milestones.some((m) => m.escrowState !== "PAYMENT_PENDING"),
    }),
    [user?.role, user?.kyc?.status, wallet.balanceMinor, milestones],
  );
  const { canHire, canWork, isStaff } = capabilitiesFor(platformRole);
  /* Staff are redirected into OpsConsole before render, so narrowing here is
     safe and keeps every workspace prop free of impossible ADMIN values. */
  const marketplaceRole: MarketplaceRole = isStaff
    ? "CLIENT"
    : (platformRole as MarketplaceRole);

  // === OVERVIEW DERIVED DATA (computed from already-loaded workspace state) ===
  const activeMilestones = useMemo(
    () => milestones.filter((m) => m.escrowState !== "RELEASED"),
    [milestones],
  );
  const escrowSecuredMinor = useMemo(
    () =>
      milestones
        .filter((m) => ESCROW_SECURED_STATES.includes(m.escrowState))
        .reduce((sum, m) => sum + m.amountMinor, 0),
    [milestones],
  );
  const contractsInvolved = useMemo(
    () => new Set(milestones.map((m) => m.contractId)).size,
    [milestones],
  );
  const milestoneStateSummary = useMemo(() => {
    const summary = new Map<string, { count: number; totalMinor: number }>();
    for (const m of milestones) {
      const entry = summary.get(m.escrowState) ?? { count: 0, totalMinor: 0 };
      entry.count += 1;
      entry.totalMinor += m.amountMinor;
      summary.set(m.escrowState, entry);
    }
    return [...summary.entries()];
  }, [milestones]);
  const escrowByDueMonth = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const m of milestones) {
      const due = new Date(m.dueDate);
      if (Number.isNaN(due.getTime())) continue;
      const key = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) ?? 0) + m.amountMinor);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => ({
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString([], {
          month: "short",
          year: "2-digit",
        }),
        value,
      }));
  }, [milestones]);
  const topUpStats = useMemo(() => {
    const pending = topUps.filter((t) => PENDING_TOPUP_STATES.includes(t.status));
    const approved = topUps.filter((t) => t.status === "APPROVED");
    const sum = (list: TopUpRequest[]) =>
      list.reduce((total, t) => total + t.amountMinor, 0);
    const dates = topUps.map((t) => t.createdAt).sort();
    return {
      pendingCount: pending.length,
      pendingMinor: sum(pending),
      approvedCount: approved.length,
      approvedMinor: sum(approved),
      lastCreatedAt: dates.length ? dates[dates.length - 1] : null,
    };
  }, [topUps]);
  const jobStats = useMemo(() => {
    const byCategory = new Map<string, number>();
    let minMinor = 0;
    let maxMinor = 0;
    let soonestDeadline: string | null = null;
    for (const job of jobs) {
      byCategory.set(job.category, (byCategory.get(job.category) ?? 0) + 1);
      minMinor += job.budgetMinMinor;
      maxMinor += job.budgetMaxMinor;
      if (!soonestDeadline || job.deadline < soonestDeadline)
        soonestDeadline = job.deadline;
    }
    return {
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      minMinor,
      maxMinor,
      soonestDeadline,
    };
  }, [jobs]);
  const filteredMilestones = useMemo(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = nowMs;
    let list = milestones;
    if (activityFilter !== "ALL") {
      const states = activityFilterStates[activityFilter];
      list = list.filter((m) => states.includes(m.escrowState));
    }
    if (activityDueWindow !== "ANY" && now > 0) {
      list = list.filter((m) => {
        const due = new Date(m.dueDate).getTime();
        if (Number.isNaN(due)) return false;
        if (activityDueWindow === "OVERDUE")
          return due < now && m.escrowState !== "RELEASED";
        if (activityDueWindow === "NEXT_7")
          return due >= now && due <= now + 7 * DAY_MS;
        return due >= now && due <= now + 30 * DAY_MS;
      });
    }
    if (activitySort !== "DEFAULT") {
      const sorted = [...list];
      sorted.sort((a, b) => {
        const dueA = new Date(a.dueDate).getTime();
        const dueB = new Date(b.dueDate).getTime();
        if (activitySort === "DUE_ASC") return dueA - dueB;
        if (activitySort === "DUE_DESC") return dueB - dueA;
        if (activitySort === "AMOUNT_DESC") return b.amountMinor - a.amountMinor;
      return a.amountMinor - b.amountMinor;
    });
      list = sorted;
    }
    return list;
  }, [milestones, activityFilter, activityDueWindow, activitySort, nowMs]);

  const toggleMetric = (key: MetricCardKey) =>
    setExpandedMetric((current) => (current === key ? null : key));
  const onMetricKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    key: MetricCardKey,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleMetric(key);
    }
  };

  const navItems = useMemo(() => {
    const jobsLabel = canWork ? (canHire ? "Find work / Post" : "Find work") : "Jobs";
    const jobsIconKey = canWork ? "find-work" : "jobs";
    const common = [
      { view: "overview" as View, iconKey: "overview", label: "Overview" },
      { view: "jobs" as View, iconKey: jobsIconKey, label: jobsLabel },
      { view: "gigs" as View, iconKey: "gigs", label: "Gigs" },
      { view: "contracts" as View, iconKey: "contracts", label: "Contracts" },
      { view: "wallet" as View, iconKey: "wallet", label: "Wallet" },
      { view: "chat" as View, iconKey: "chat", label: "Chat" },
      { view: "profile" as View, iconKey: "profile", label: "Profile" },
    ];
    // Anyone who can work can also sell, so they get a seller surface alongside
    // the marketplace. Hiring-only accounts see the marketplace alone.
    const sellerNav = canWork
      ? [{ view: "my-gigs" as View, iconKey: "gigs", label: "My Gigs" }]
      : [];

    return isStaff
      ? [...common, ...sellerNav, { view: "cases" as View, iconKey: "cases", label: "Cases" }]
      : [
          ...common,
          ...sellerNav,
          { view: "cases" as View, iconKey: "cases", label: "Disputes" },
          {
            view: "verification" as View,
            iconKey: "verification",
            label: "Verification",
          },
        ];
  }, [platformRole]);

  if (user?.staffRole) return <OpsConsole user={user} onExit={logout} />;

  if (!user && showLanding) {
    const handleNavigate = (page: string) => {
      setMarketingPage(page as MarketingPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const handleStart = (mode: "login" | "register") => {
      setAuthMode(mode);
      setShowLanding(false);
    };

    // Update document title per marketing page (Item 20: unique page titles)
    const pageTitles: Record<MarketingPage, string> = {
      home: "Yekis — Ethiopia's Freelance Marketplace with milestone payments held until approval",
      faq: "FAQ — Yekis",
      fees: "Pricing & Fees — Yekis",
      privacy: "Privacy Policy — Yekis",
      terms: "Terms of Service — Yekis",
      about: "About — Yekis",
      "case-studies": "Case Studies — Yekis",
      "404": "Page Not Found — Yekis",
      "thank-you-signup": "Welcome to Yekis!",
      "thank-you-job-posted": "Job Posted — Yekis",
      "thank-you-contact": "Message Sent — Yekis",
      telegram_auth: "Sign in with Telegram — Yekis",
    };
    document.title = pageTitles[marketingPage] || pageTitles.home;

    return (
      <>
        <MarketingHeader onNavigate={handleNavigate} onStart={handleStart} />
        <ScrollEffects />
        {marketingPage === "home" && (
          <>
            <PageLoadSplash />
            <LandingPage onStart={handleStart} onNavigate={handleNavigate} />
          </>
        )}
        {marketingPage === "faq" && (
          <FAQPage onNavigate={handleNavigate} onStart={handleStart} />
        )}
        {marketingPage === "fees" && (
          <FeesPage onNavigate={handleNavigate} onStart={handleStart} />
        )}
        {marketingPage === "privacy" && (
          <PrivacyPage onNavigate={handleNavigate} />
        )}
        {marketingPage === "terms" && <TermsPage onNavigate={handleNavigate} />}
        {marketingPage === "about" && (
          <AboutPage onNavigate={handleNavigate} onStart={handleStart} />
        )}
        {marketingPage === "case-studies" && (
          <CaseStudiesPage onNavigate={handleNavigate} />
        )}
        {marketingPage === "404" && (
          <NotFoundPage onNavigate={handleNavigate} onStart={handleStart} />
        )}
        {marketingPage === "thank-you-signup" && (
          <ThankYouPage
            action="signup"
            onNavigate={handleNavigate}
            onStart={handleStart}
          />
        )}
        {marketingPage === "thank-you-job-posted" && (
          <ThankYouPage
            action="job-posted"
            onNavigate={handleNavigate}
            onStart={handleStart}
          />
        )}
        {marketingPage === "thank-you-contact" && (
          <ThankYouPage
            action="contact"
            onNavigate={handleNavigate}
            onStart={handleStart}
          />
        )}
        {marketingPage !== "home" && (
          <MarketingFooter onNavigate={handleNavigate} />
        )}
        <CookieBanner />
        <MobileCTA onStart={handleStart} />
      </>
    );
  }

  if (marketingPage === "telegram_auth") {
    return (
      <TelegramAuthPage
        onAuthed={() => {
          if (authVisitRef.current) authVisitRef.current.completed = true;
          void loadWorkspace().then(() => setShowLanding(false));
        }}
        botUsername={import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined}
      />
    );
  }

  if (!user) {
    return (
      <main className="platform-auth">
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 24,
            right: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            className="auth-back"
            style={{ position: "static" }}
            onClick={() => {
              setShowLanding(true);
              setError("");
              setSuccessMessage("");
            }}
          >
            <ArrowLeft size={17} /> Back to Yekis
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
        <div className="platform-auth-art">
          <img
            src="/svgviewer-output.svg"
            alt="Yekis Logo"
            className="platform-logo"
            style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 8 }}
          />
          <p className="eyebrow">Yekis jobs</p>
          <h1>Work with clarity.</h1>
          <p>
            Find trusted talent, manage milestone work, and keep payments
            visible from brief to delivery.
          </p>
          <div className="auth-proof">
            <span>01</span>
            <strong>Jobs, contracts, and escrow in one workspace.</strong>
          </div>
          <div className="auth-proof">
            <span>02</span>
            <strong>Built for Ethiopian clients and freelancers.</strong>
          </div>
          <AuthVisualAnimation />
        </div>
        <form className="auth-panel" onSubmit={submitAuth}>
          <div className="auth-panel-header">
            <div>
              <p className="eyebrow">
                {authMode === "login"
                  ? "Welcome back"
                  : authMode === "forgot-password"
                    ? "Recover account"
                    : authMode === "reset-password"
                      ? "Set new password"
                      : "Get started"}
              </p>
              <h2>
                {authMode === "login"
                  ? "Sign in to Yekis"
                  : authMode === "forgot-password"
                    ? "Forgot password"
                    : authMode === "reset-password"
                      ? "Reset password"
                      : "Create an account"}
              </h2>
            </div>
          </div>
          {authMode === "register" && (
            <div className="segmented-control">
              <button
                type="button"
                className={role === "CLIENT" ? "selected" : ""}
                onClick={() => setRole("CLIENT")}
              >
                Client
              </button>
              <button
                type="button"
                className={role === "FREELANCER" ? "selected" : ""}
                onClick={() => setRole("FREELANCER")}
              >
                Freelancer
              </button>
              <button
                type="button"
                className={role === "BOTH" ? "selected" : ""}
                onClick={() => setRole("BOTH")}
                title="Hire talent and take on work with one account"
              >
                Both
              </button>
            </div>
          )}
          {(authMode === "login" ||
            authMode === "register" ||
            authMode === "forgot-password") && (
            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                style={{ padding: "8px 12px", marginTop: "3px", fontSize: "0.88rem", borderRadius: "8px" }}
              />
            </label>
          )}
          {authMode === "register" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gap: "10px",
                marginTop: "4px",
              }}
            >
              <label style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600 }}>
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+251911223344"
                  required
                  style={{ padding: "8px 12px", marginTop: "3px", fontSize: "0.88rem", borderRadius: "8px" }}
                />
              </label>
              <label style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600 }}>
                Date of birth
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  required
                  style={{ padding: "8px 12px", marginTop: "3px", fontSize: "0.88rem", borderRadius: "8px" }}
                />
              </label>
            </div>
          )}
          {authMode === "reset-password" && (
            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              Reset token
              <input
                type="text"
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                placeholder="Enter reset token"
                required
                style={{ padding: "8px 12px", marginTop: "3px", fontSize: "0.88rem", borderRadius: "8px" }}
              />
            </label>
          )}
          {(authMode === "login" ||
            authMode === "register" ||
            authMode === "reset-password") && (
            <div style={{ marginTop: "6px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <label
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {authMode === "reset-password" ? "New password" : "Password"}
                </label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("forgot-password");
                      setError("");
                      setSuccessMessage("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--color-primary)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  minLength={
                    authMode === "register" || authMode === "reset-password"
                      ? 10
                      : undefined
                  }
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    paddingRight: "40px",
                    paddingLeft: "12px",
                    paddingTop: "9px",
                    paddingBottom: "9px",
                    margin: 0,
                    fontSize: "0.88rem",
                    borderRadius: "8px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
          {authMode === "register" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 8,
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: "0.82rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <label
                  htmlFor="termsCheck"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    margin: 0,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  <input
                    id="termsCheck"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    required
                    style={{
                      accentColor: "var(--color-primary)",
                      flexShrink: 0,
                      margin: 0,
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                    }}
                  />
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModal("terms");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: "inherit",
                      }}
                    >
                      Terms
                    </button>
                    {" & "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModal("privacy");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: "inherit",
                      }}
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowCookiePrefs(!showCookiePrefs)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "2px 6px",
                    color: "var(--color-primary)",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                  title="Customize privacy & notification preferences"
                >
                  {showCookiePrefs ? "Options ▲" : "Options ▾"}
                </button>
              </div>

              {showCookiePrefs && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: "0.76rem",
                    color: "var(--color-text-secondary)",
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                    Optional privacy & notification preferences:
                  </span>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      margin: 0,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={consentNotifications}
                      onChange={(e) => setConsentNotifications(e.target.checked)}
                      style={{
                        accentColor: "var(--color-primary)",
                        width: 14,
                        height: 14,
                        margin: 0,
                      }}
                    />
                    <span>Platform alerts (milestones & escrow updates)</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      margin: 0,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={consentMarketing}
                      onChange={(e) => setConsentMarketing(e.target.checked)}
                      style={{
                        accentColor: "var(--color-primary)",
                        width: 14,
                        height: 14,
                        margin: 0,
                      }}
                    />
                    <span>Marketing communications</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      margin: 0,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={consentAnalytics}
                      onChange={(e) => setConsentAnalytics(e.target.checked)}
                      style={{
                        accentColor: "var(--color-primary)",
                        width: 14,
                        height: 14,
                        margin: 0,
                      }}
                    />
                    <span>Anonymized product telemetry</span>
                  </label>
                </div>
              )}
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          {successMessage && (
            <div
              className="form-success"
              style={{
                padding: "12px",
                background: "var(--color-primary-light)",
                color: "var(--color-primary)",
                borderRadius: "8px",
                fontSize: "0.82rem",
                border: "1px solid var(--color-primary)",
              }}
            >
              {successMessage}
            </div>
          )}
          <button
            className="btn-primary wide"
            disabled={isLoading || (authMode === "register" && !termsAccepted)}
            style={{ marginTop: "14px", padding: "11px", fontSize: "0.92rem" }}
          >
            {isLoading
              ? "Please wait..."
              : authMode === "login"
                ? "Sign in"
                : authMode === "forgot-password"
                  ? "Request reset link"
                  : authMode === "reset-password"
                    ? "Set password"
                    : "Create account"}
          </button>
          {(authMode === "login" || authMode === "register") && (
            <SocialSignInButtons
              role={authMode === "register" ? role : undefined}
              onAuthed={() => {
                // Analytics: OAuth success completes the auth visit (the
                // provider-specific "login" event fires in SocialSignInButtons).
                if (authVisitRef.current) authVisitRef.current.completed = true;
                void loadWorkspace().then(() => setShowLanding(false));
              }}
            />
          )}
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setError("");
              setSuccessMessage("");
            }}
          >
            {authMode === "login"
              ? "New to Yekis? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </form>

        {legalModal && (
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
              zIndex: 100,
              padding: "20px",
            }}
            onClick={() => setLegalModal(null)}
          >
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                width: "min(100%, 580px)",
                maxHeight: "82vh",
                overflowY: "auto",
                padding: "24px 28px",
                boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "12px",
                  marginBottom: "16px",
                }}
              >
                <strong style={{ fontSize: "1.15rem", color: "var(--color-text)" }}>
                  {legalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
                </strong>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  style={{
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
              </div>

              {legalModal === "terms" ? (
                <div style={{ fontSize: "0.86rem", lineHeight: 1.55, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0 }}>
                    Welcome to <strong>Yekis Jobs</strong>. By creating an account or using the platform, you agree to these fundamental marketplace standards:
                  </p>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>1. Escrow Protection</strong>
                    <p style={{ margin: "2px 0 0" }}>Clients deposit milestone funds into secure escrow before work begins. Funds are disbursed upon milestone approval.</p>
                  </div>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>2. Dispute Mediation</strong>
                    <p style={{ margin: "2px 0 0" }}>Disputes are resolved through fair evidence submission, staff mediation, and AACCSA arbitration standards.</p>
                  </div>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>3. Identity Verification (KYC)</strong>
                    <p style={{ margin: "2px 0 0" }}>Users agree to verify identity via Fayda / Ethiopian National ID before initiating withdrawals, ensuring a trusted marketplace.</p>
                  </div>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>4. Fee Attribution</strong>
                    <p style={{ margin: "2px 0 0" }}>Platform commissions and Telebirr/CBE payment rail charges adhere to the posted transparent fee schedule.</p>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.86rem", lineHeight: 1.55, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0 }}>
                    <strong>Yekis Jobs</strong> values your confidentiality and complies with the Ethiopian Personal Data Protection Proclamation:
                  </p>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>1. Data Collection & Purpose</strong>
                    <p style={{ margin: "2px 0 0" }}>We collect phone numbers, emails, and KYC identification strictly to safeguard payments and satisfy AML/CTF statutory compliance.</p>
                  </div>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>2. Bank-Grade Encryption</strong>
                    <p style={{ margin: "2px 0 0" }}>All identification documents and transaction records are encrypted at rest and in transit.</p>
                  </div>
                  <div>
                    <strong style={{ color: "var(--color-text)" }}>3. No Third-Party Selling</strong>
                    <p style={{ margin: "2px 0 0" }}>Your personal data is never sold or shared with third-party marketing networks.</p>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setTermsAccepted(true);
                    setLegalModal(null);
                  }}
                  style={{ padding: "8px 18px", fontSize: "0.88rem" }}
                >
                  I Understand & Agree
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="sidebar-brand">
          <img
            src="/svgviewer-output.svg"
            alt="Yekis Logo"
            className="platform-logo small"
          />
          <strong>Yekis</strong>
        </div>
        <div className="sidebar-role">
          <span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{roleLabel(platformRole)}</strong>
            <small>{user.email}</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={view === item.view ? "active" : ""}
              onClick={() => setView(item.view)}
            >
              <span className="nav-icon">{navIconMap[item.iconKey]}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          className="sidebar-settings"
          onClick={() => setView("settings")}
        >
          <Settings size={16} /> <span className="nav-label">Settings</span>
        </button>
      </aside>

      <main className="platform-main">
        <OnboardingTour
          facts={tourFacts}
          onNavigate={(tab) => setView(tab as View)}
        />
        <header className="platform-topbar">
          <div>
            <span className="eyebrow">{roleLabel(platformRole)} workspace</span>
            <h1>
              {view === "overview"
                ? "Good morning"
                : navItems.find((item) => item.view === view)?.label ||
                  "Settings"}
            </h1>
          </div>
          <div
            className="topbar-actions"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <button
              type="button"
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {/* Clicking a notification takes the user to the view it came from. */}
            <NotificationCenter onNavigate={(v) => setView(v as View)} />
            <button className="user-menu" onClick={logout}>
              <span className="avatar">
                {user.email.slice(0, 1).toUpperCase()}
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        {view === "overview" && (
          <section className="platform-content">
            <div className="overview-hero">
              <div>
                <p className="eyebrow">Your work, in one view</p>
                <h2>
                  {canHire && canWork
                    ? "Hire and get hired."
                    : canWork
                      ? "Make your next move count."
                      : canHire
                        ? "Turn your brief into progress."
                        : "Keep every review moving."}
                </h2>
                <p>
                  {canHire && canWork
                    ? "Post a brief when you need work done, and take on projects when you have the capacity — both from one desk."
                    : canWork
                      ? "Find relevant work and keep delivery, verification, and payout status close at hand."
                      : canHire
                        ? "Post a clear job, compare proposals, and fund milestones with confidence."
                        : "Monitor receipts, identity checks, escrow, and open cases from one desk."}
                </p>
              </div>
              {/* A dual-role account gets both calls to action; they lead to
                  different forms on the same page, so one is not redundant. */}
              {canHire && (
                <button className="btn-primary" onClick={() => setView("jobs")}>
                  Post a job <Plus size={16} />
                </button>
              )}
              {canWork && (
                <button
                  className={canHire ? "btn-secondary" : "btn-primary"}
                  onClick={() => setView("jobs")}
                >
                  Find work <Search size={16} />
                </button>
              )}
            </div>

            {/* Live data status + manual refresh (near-real-time, no new endpoints) */}
            <div className="overview-meta">
              <span
                className={realtimeLive ? "live-dot on" : "live-dot"}
                aria-hidden="true"
              />
              <span className="overview-meta-text">
                {realtimeLive ? "Live" : "Auto-refresh every 60s"} · Updated{" "}
                {lastUpdatedAt
                  ? lastUpdatedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "…"}
              </span>
              <button
                type="button"
                className="icon-button refresh-button"
                onClick={() => void refreshDashboard()}
                disabled={isRefreshing}
                aria-label="Refresh dashboard data"
                title="Refresh dashboard data"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? "refresh-spin" : undefined}
                />
              </button>
            </div>

            {/* Recommended briefs — shown to anyone who can take work, which includes
                dual-role accounts. */}
            {canWork ? (
              <div className="featured-jobs-section" style={{ margin: "24px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                      Recommended for you
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.86rem", color: "var(--color-text-secondary)" }}>
                      Open briefs matching verified Ethiopian talent
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: "0.82rem", padding: "6px 14px", height: "auto", minHeight: "34px" }}
                    onClick={() => setView("jobs")}
                  >
                    View all opportunities <ArrowRight size={14} />
                  </button>
                </div>
                {jobs.filter((job) => job.status === "OPEN").length === 0 ? (
                  <p className="empty-state">No open jobs at the moment. Check back soon.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {jobs
                      .filter((job) => job.status === "OPEN")
                      .slice(0, 3)
                      .map((job) => (
                        <article
                          key={job.id}
                          className="panel"
                          style={{
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: 12,
                            borderRadius: "14px",
                            border: "1px solid var(--color-border)",
                            transition: "all 0.18s ease",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span className="status-pill">Open</span>
                              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                ETB {(job.budgetMinMinor / 100).toLocaleString()} – {(job.budgetMaxMinor / 100).toLocaleString()}
                              </span>
                            </div>
                            <h3 style={{ fontSize: "1.02rem", fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
                              {job.title}
                            </h3>
                            <p style={{ fontSize: "0.86rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.45 }}>
                              {job.description.substring(0, 110)}...
                            </p>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
                            <small style={{ color: "var(--color-text-tertiary)", fontSize: "0.78rem" }}>
                              Due {new Date(job.deadline).toLocaleDateString()}
                            </small>
                            <button
                              className="btn-primary"
                              style={{ fontSize: "0.8rem", padding: "5px 12px", minHeight: "32px" }}
                              onClick={() => setView("jobs")}
                            >
                              View Brief
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <FeaturedCarousel
                onProfileClick={(id) => {
                  setViewUserId(id);
                  setView("profile");
                }}
              />
            )}

            <div className="platform-metrics">
              <article
                className="metric-card"
                role="button"
                tabIndex={0}
                aria-expanded={expandedMetric === "wallet"}
                onClick={() => toggleMetric("wallet")}
                onKeyDown={(event) => onMetricKeyDown(event, "wallet")}
              >
                <small>Wallet balance</small>
                <strong>
                  ETB {(wallet.balanceMinor / 100).toLocaleString()}
                </strong>
                <span>Available balance</span>
                <ChevronDown className="metric-chev" size={16} aria-hidden="true" />
                {expandedMetric === "wallet" && (
                  <div
                    className="metric-breakdown"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="metric-breakdown-row">
                      <span>Pending top-ups</span>
                      <strong>
                        {topUpStats.pendingCount} ·{" "}
                        {moneyETB(topUpStats.pendingMinor)}
                      </strong>
                    </div>
                    <div className="metric-breakdown-row">
                      <span>Approved top-ups</span>
                      <strong>
                        {topUpStats.approvedCount} ·{" "}
                        {moneyETB(topUpStats.approvedMinor)}
                      </strong>
                    </div>
                    <div className="metric-breakdown-row">
                      <span>Last top-up</span>
                      <strong>
                        {topUpStats.lastCreatedAt
                          ? dateLabel(topUpStats.lastCreatedAt)
                          : "—"}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="metric-action"
                      onClick={() => setView("wallet")}
                    >
                      Open wallet <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </article>
              <article
                className="metric-card"
                role="button"
                tabIndex={0}
                aria-expanded={expandedMetric === "jobs"}
                onClick={() => toggleMetric("jobs")}
                onKeyDown={(event) => onMetricKeyDown(event, "jobs")}
              >
                <small>Open jobs</small>
                <strong>{jobs.length}</strong>
                <span>Matching opportunities</span>
                <ChevronDown className="metric-chev" size={16} aria-hidden="true" />
                {expandedMetric === "jobs" && (
                  <div
                    className="metric-breakdown"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {jobStats.byCategory.length === 0 ? (
                      <span className="metric-breakdown-empty">
                        No open jobs right now.
                      </span>
                    ) : (
                      <>
                        {jobStats.byCategory.map(([category, count]) => (
                          <div className="metric-breakdown-row" key={category}>
                            <span>
                              {categoryLabels[category] ??
                                category.replaceAll("_", " ")}
                            </span>
                            <strong>
                              {count} {count === 1 ? "job" : "jobs"}
                            </strong>
                          </div>
                        ))}
                        <div className="metric-breakdown-row">
                          <span>Combined budgets</span>
                          <strong>
                            {moneyETB(jobStats.minMinor)} –{" "}
                            {moneyETB(jobStats.maxMinor)}
                          </strong>
                        </div>
                        <div className="metric-breakdown-row">
                          <span>Soonest deadline</span>
                          <strong>
                            {jobStats.soonestDeadline
                              ? dateLabel(jobStats.soonestDeadline)
                              : "—"}
                          </strong>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      className="metric-action"
                      onClick={() => setView("jobs")}
                    >
                      {canWork ? "Find work" : "View jobs"} <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </article>
              <article
                className="metric-card"
                role="button"
                tabIndex={0}
                aria-expanded={expandedMetric === "milestones"}
                onClick={() => toggleMetric("milestones")}
                onKeyDown={(event) => onMetricKeyDown(event, "milestones")}
              >
                <small>Active milestones</small>
                <strong>{activeMilestones.length}</strong>
                <span>Across your contracts</span>
                <ChevronDown className="metric-chev" size={16} aria-hidden="true" />
                {expandedMetric === "milestones" && (
                  <div
                    className="metric-breakdown"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="metric-breakdown-row">
                      <span>ETB secured in escrow</span>
                      <strong>{moneyETB(escrowSecuredMinor)}</strong>
                    </div>
                    <div className="metric-breakdown-row">
                      <span>Contracts involved</span>
                      <strong>{contractsInvolved}</strong>
                    </div>
                    {milestoneStateSummary.map(([state, info]) => (
                      <div className="metric-breakdown-row" key={state}>
                        <span>{state.replaceAll("_", " ")}</span>
                        <strong>
                          {info.count} · {moneyETB(info.totalMinor)}
                        </strong>
                      </div>
                    ))}
                    <MiniBarChart
                      data={escrowByDueMonth}
                      caption="Milestone value by due month"
                      formatValue={compactETB}
                    />
                    <button
                      type="button"
                      className="metric-action"
                      onClick={() => setView("contracts")}
                    >
                      View contracts <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </article>
            </div>

            <div className="platform-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent activity</h2>
                  <button onClick={() => setView("contracts")}>
                    View contracts
                  </button>
                </div>
                {milestones.length === 0 ? (
                  <p className="empty-state">
                    Your active contracts will appear here.
                  </p>
                ) : (
                  <>
                    <div className="feed-controls">
                      <div
                        className="feed-chips"
                        role="group"
                        aria-label="Filter activity by type"
                      >
                        {(
                          Object.keys(activityFilterLabels) as ActivityFilterKey[]
                        )
                          .filter(
                            (key) =>
                              key === "ALL" ||
                              milestones.some((m) =>
                                activityFilterStates[
                                  key as Exclude<ActivityFilterKey, "ALL">
                                ].includes(m.escrowState),
                              ),
                          )
                          .map((key) => (
                            <button
                              type="button"
                              key={key}
                              className={
                                activityFilter === key
                                  ? "feed-chip active"
                                  : "feed-chip"
                              }
                              onClick={() => setActivityFilter(key)}
                            >
                              {activityFilterLabels[key]}
                            </button>
                          ))}
                      </div>
                      <div className="feed-selects">
                        <select
                          className="feed-select"
                          value={activityDueWindow}
                          onChange={(event) => {
                            setNowMs(Date.now());
                            setActivityDueWindow(
                              event.target.value as ActivityDueWindow,
                            );
                          }}
                          aria-label="Filter by due date"
                        >
                          <option value="ANY">Any due date</option>
                          <option value="OVERDUE">Overdue</option>
                          <option value="NEXT_7">Due in 7 days</option>
                          <option value="NEXT_30">Due in 30 days</option>
                        </select>
                        <select
                          className="feed-select"
                          value={activitySort}
                          onChange={(event) =>
                            setActivitySort(event.target.value as ActivitySort)
                          }
                          aria-label="Sort activity"
                        >
                          <option value="DEFAULT">Default order</option>
                          <option value="DUE_ASC">Due soonest</option>
                          <option value="DUE_DESC">Due latest</option>
                          <option value="AMOUNT_DESC">
                            Amount high to low
                          </option>
                          <option value="AMOUNT_ASC">Amount low to high</option>
                        </select>
                        {(activityFilter !== "ALL" ||
                          activityDueWindow !== "ANY") && (
                          <span className="feed-count">
                            {filteredMilestones.length} of {milestones.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {filteredMilestones.length === 0 ? (
                      <p className="empty-state">
                        No milestones match these filters.
                      </p>
                    ) : (
                      filteredMilestones.slice(0, 4).map((milestone) => {
                        const activityExpanded =
                          expandedActivityId === milestone.id;
                        return (
                          <div className="activity-item" key={milestone.id}>
                            <button
                              type="button"
                              className="activity-row"
                              aria-expanded={activityExpanded}
                              onClick={() =>
                                setExpandedActivityId(
                                  activityExpanded ? null : milestone.id,
                                )
                              }
                            >
                              <span className="activity-dot" />
                              <span>
                                <strong>{milestone.title}</strong>
                                <small>
                                  {milestone.escrowState.replaceAll("_", " ")}
                                </small>
                              </span>
                              <b>
                                ETB{" "}
                                {(
                                  milestone.amountMinor / 100
                                ).toLocaleString()}
                              </b>
                              <ChevronDown
                                className="row-chev"
                                size={14}
                                aria-hidden="true"
                              />
                            </button>
                            {activityExpanded && (
                              <div className="activity-detail">
                                <div className="activity-detail-row">
                                  <span>Milestone</span>
                                  <strong className="mono">
                                    #{milestone.id.slice(0, 8)}
                                  </strong>
                                </div>
                                <div className="activity-detail-row">
                                  <span>Status</span>
                                  <strong>
                                    {milestone.escrowState.replaceAll("_", " ")}
                                  </strong>
                                </div>
                                <div className="activity-detail-row">
                                  <span>Due date</span>
                                  <strong>{dateLabel(milestone.dueDate)}</strong>
                                </div>
                                <div className="activity-detail-row">
                                  <span>Submitted</span>
                                  <strong>
                                    {optionalDateLabel(milestone.submittedAt)}
                                  </strong>
                                </div>
                                <div className="activity-detail-row">
                                  <span>Auto-release</span>
                                  <strong>
                                    {optionalDateLabel(milestone.autoReleaseAt)}
                                  </strong>
                                </div>
                                <div className="activity-detail-row">
                                  <span>Released</span>
                                  <strong>
                                    {optionalDateLabel(milestone.releasedAt)}
                                  </strong>
                                </div>
                                <div className="activity-detail-row">
                                  <span>Amount</span>
                                  <strong>
                                    ETB{" "}
                                    {(
                                      milestone.amountMinor / 100
                                    ).toLocaleString()}
                                  </strong>
                                </div>
                                <button
                                  type="button"
                                  className="metric-action"
                                  onClick={() => setView("contracts")}
                                >
                                  Open in Contracts <ArrowRight size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Next step</h2>
                </div>
                {/* Verification is only a step for someone who earns. Someone who can both
                    hire and work needs funding first, because that is what
                    blocks escrow — KYC is still required either way. */}
                <div className="next-step">
                  <span className="step-number">1</span>
                  <div>
                    <strong>
                      {canHire && canWork
                        ? "Add funds to your wallet"
                        : canWork
                          ? "Complete Fayda verification"
                          : "Add funds to your wallet"}
                    </strong>
                    <p>
                      {canHire && canWork
                        ? "Fund escrow before you hire. Verification unlocks your own payouts."
                        : canWork
                          ? "Unlock payout access after manual review."
                          : "Upload a Telebirr or CBE receipt for approval."}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setView(canWork && !canHire ? "verification" : "wallet")
                    }
                  >
                    Open
                  </button>
                </div>
              </section>
            </div>
          </section>
        )}

        {view === "jobs" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>
                  {canHire && canWork
                    ? "Find work and post a brief"
                    : canHire
                      ? "Job postings"
                      : "Find work"}
                </h2>
                <p>
                  {canHire && canWork
                    ? "Take on open opportunities, or post a brief and manage your own talent pipeline."
                    : canHire
                      ? "Create a clear brief and manage the talent pipeline."
                      : "Browse open opportunities across the marketplace."}
                </p>
              </div>
            </div>
            {canHire && (
              <form className="panel job-form" onSubmit={submitJob}>
                <h3>New job brief</h3>
                <div className="form-grid">
                  <label style={{ gridColumn: "span 2" }}>
                    Title
                    <input
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                      placeholder="What do you need done?"
                      required
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={jobCategory}
                      onChange={(event) => setJobCategory(event.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {categoryLabels[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-wide">
                    Description
                    <textarea
                      value={jobDescription}
                      onChange={(event) =>
                        setJobDescription(event.target.value)
                      }
                      placeholder="Describe the outcome, scope, and expectations."
                      minLength={20}
                      required
                    />
                  </label>
                  <label>
                    Minimum budget
                    <input
                      type="number"
                      value={jobBudgetMin}
                      onChange={(event) => setJobBudgetMin(event.target.value)}
                      placeholder="ETB"
                      required
                    />
                  </label>
                  <label>
                    Maximum budget
                    <input
                      type="number"
                      value={jobBudgetMax}
                      onChange={(event) => setJobBudgetMax(event.target.value)}
                      placeholder="ETB"
                      required
                    />
                  </label>
                  <label>
                    Deadline
                    <input
                      type="date"
                      value={jobDeadline}
                      onChange={(event) => setJobDeadline(event.target.value)}
                      required
                    />
                  </label>
                </div>
                {jobError && (
                  <div className="form-error" style={{ marginTop: 14 }}>
                    {jobError}
                    {/* F-02: the KYC gate returns nextAction; offer the step
                        instead of leaving the user at a dead end. */}
                    {jobErrorNextAction === "verification" && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginTop: 10 }}
                        onClick={() => setView("verification")}
                      >
                        Verify your identity
                      </button>
                    )}
                  </div>
                )}
                <button
                  className="btn-primary"
                  style={{ marginTop: 18, width: "fit-content" }}
                  disabled={isLoading}
                >
                  Publish job
                </button>
              </form>
            )}
            <JobsWorkspace
              role={marketplaceRole}
              openJobs={jobs}
              onChanged={loadWorkspace}
            />
          </section>
        )}

        {view === "gigs" && <GigMarketplace />}
        {view === "my-gigs" && <GigSellerDashboard />}

        {view === "contracts" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>Contracts and milestones</h2>
                <p>
                  Sign agreements, fund escrow, submit work, and release
                  completed milestones.
                </p>
              </div>
            </div>
            <ContractsWorkspace userId={user.id} onChanged={loadWorkspace} />
          </section>
        )}

        {view === "wallet" && (
          <section className="platform-content">
            <BrowserWallet
              wallet={wallet}
              topUps={topUps}
              onChanged={loadWorkspace}
              role={marketplaceRole}
            />
          </section>
        )}

        {view === "chat" && (
          <section className="platform-content chat-page-container">
            <ChatWorkspace
              user={user}
              userId={user.id}
              role={marketplaceRole === "BOTH" ? "FREELANCER" : marketplaceRole}
              onNavigateToContracts={() => setView("contracts")}
            />
          </section>
        )}

        {view === "verification" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>Verification</h2>
                <p>Manage your identity and payout readiness.</p>
              </div>
            </div>
            <BrowserVerification />
          </section>
        )}

        {view === "cases" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>Disputes</h2>
                <p>
                  Negotiate, submit evidence, and track mediation or
                  arbitration.
                </p>
              </div>
            </div>
            <DisputesWorkspace />
          </section>
        )}

        {view === "profile" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>Profile</h2>
                <p>View user profile details.</p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setView("profile-edit")}
              >
                <Edit size={16} /> Edit Profile
              </button>
            </div>
            <ProfilePage userId={viewUserId || user.id} />
          </section>
        )}

        {view === "profile-edit" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>Edit Profile</h2>
                <p>Update your public profile details.</p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setView("profile")}
              >
                <ArrowLeft size={16} /> Back to Profile
              </button>
            </div>
            <ProfileEditPage />
          </section>
        )}

        {view === "settings" && (
          <section className="platform-content">
            <div className="content-toolbar">
              <div>
                <h2>Settings</h2>
                <p>Account preferences and access.</p>
              </div>
            </div>
            <div className="panel settings-list">
              <div>
                <strong>Account email</strong>
                <span>{user.email}</span>
              </div>
              <div>
                <strong>Workspace role</strong>
                <span>{roleLabel(platformRole)}</span>
              </div>
              <div>
                <strong>Customer Support</strong>
                <span>Get real-time assistance with payments, jobs, or disputes.</span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setView("chat")}
                style={{ width: "fit-content", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <LifeBuoy size={16} /> Chat with Support
              </button>
              <button className="btn-secondary" onClick={logout}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </section>
        )}
      </main>

      <nav className="platform-mobile-nav">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={view === item.view ? "active" : ""}
            onClick={() => setView(item.view)}
          >
            <span>{navIconMap[item.iconKey]}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
