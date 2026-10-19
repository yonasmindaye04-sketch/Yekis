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
import { PhoneVerification } from "./PhoneVerification";
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
  LogOut,
  ArrowLeft,
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ProfilePage } from "./ProfilePage";
import { ProfileEditPage } from "./ProfileEditPage";
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
import { useI18n, isLanguage } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";
import "./components/scroll.css";
import "./styles/shadcn-dashboard.css";
import {
  ShadcnLayoutProvider,
  useShadcnLayout,
  LayoutCustomizerTrigger,
  type DemoWorkspaceMode,
} from "./components/dashboard/ShadcnLayoutContext";
import { MarketplaceShadcnDashboard } from "./components/dashboard/MarketplaceShadcnDashboard";
import { WorkspaceCommandPalette } from "./components/dashboard/WorkspaceCommandPalette";

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
  return (
    <ShadcnLayoutProvider>
      <FullPlatformAppInner />
    </ShadcnLayoutProvider>
  );
}

function FullPlatformAppInner() {
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarVariant,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useShadcnLayout();
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
  /**
   * Opens the SMS confirmation step. Set when the user submits the register form
   * with a usable Ethiopian number, and cleared on either outcome so the submit
   * button is not left permanently disabled.
   */
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  /**
   * Onboarding-tour signals. `null` means "not known yet", which is
   * deliberately different from 0: the tour hides a step it cannot evaluate, so
   * an unanswered request produces no step rather than a step that says the user
   * has done nothing.
   */
  const [myJobCount, setMyJobCount] = useState<number | null>(null);
  const [myProposalCount, setMyProposalCount] = useState<number | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState<number | null>(
    null,
  );
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
  /* Overview interactivity state */
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeLive, setRealtimeLive] = useState(false);
  /* Dual-role ("BOTH") accounts can toggle between combined, client, or freelancer workspace views */
  const [dualRoleMode, setDualRoleMode] = useState<"CLIENT" | "FREELANCER" | "BOTH">("BOTH");

  const switchDualRoleMode = (mode: DemoWorkspaceMode) => {
    if (user?.role !== "BOTH") return;
    if (mode === "CLIENT" || mode === "FREELANCER" || mode === "BOTH") {
      setDualRoleMode(mode);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("yekis_offline_demo_session_v1");
    }
    // Auto-resume active session on visit without prompting to re-register
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("yekis-api-token")
        : null;
    if (token && token.startsWith("demo-")) {
      api.clearToken();
    } else if (token) {
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
    const [
      meResult,
      walletResult,
      jobsResult,
      milestonesResult,
      topUpsResult,
      // Only for the onboarding tour. Without these three the tour can evaluate
      // just half its steps, and it hides the rest rather than showing steps
      // nobody can complete. They are additive and allSettled, so a failure here
      // degrades the guide instead of breaking the workspace load.
      myJobsResult,
      myProposalsResult,
      completenessResult,
    ] = await Promise.allSettled([
      api.getMe(),
      api.getWallet(),
      api.getJobs({ status: "OPEN" }),
      api.getMilestones(),
      api.getTopUpRequests(),
      api.getMyJobs(),
      api.getMyProposals(),
      api.getProfileCompleteness(),
    ]);
    if (meResult.status === "rejected") throw meResult.reason;
    setUser(meResult.value);
    if (isLanguage(meResult.value?.languagePreference)) {
      setLanguage(meResult.value.languagePreference);
    }
    if (walletResult.status === "fulfilled") setWallet(walletResult.value);
    if (jobsResult.status === "fulfilled") setJobs(jobsResult.value.jobs);
    if (milestonesResult.status === "fulfilled")
    setMilestones(milestonesResult.value);
    if (topUpsResult.status === "fulfilled") setTopUps(topUpsResult.value);
    // Left as-is when the call fails: the tour then hides the affected step,
    // which is better than asserting the user has not done it.
    if (myJobsResult.status === "fulfilled") setMyJobCount(myJobsResult.value.length);
    if (myProposalsResult.status === "fulfilled")
    setMyProposalCount(myProposalsResult.value.length);
    if (completenessResult.status === "fulfilled")
    setProfileCompleteness(completenessResult.value.profileCompleteness);
    setLastUpdatedAt(new Date());
  };

  // Ref-synced alias so the polling/socket effect can stay keyed on [user]
  // exactly like the pre-existing mount effect above (no new hook deps).
  const loadWorkspaceRef = useRef(loadWorkspace);
  useEffect(() => {
    loadWorkspaceRef.current = loadWorkspace;
  });

  // Near-real-time overview: instant reload on notify:* socket events (the
  // same events the NotificationCenter already listens to) plus a light 60s
  // poll that pauses while the tab is hidden. No new backend endpoints.
  useEffect(() => {
    if (!user) return;
    const reload = () => {
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
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 60_000);
    return () => {
      notifyEvents.forEach((event) => realtimeSocket.off(event, reload));
      offStatus();
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
      // Confirm the number before the account exists, which is why the backend
      // endpoints are unauthenticated. A number we have not verified is the
      // payout destination, so this is a money-safety step, not a nicety.
      // Skip for now is always available: a hard gate with no escape hatch is a
      // support queue rather than a security control.
      if (/\+?251[1-9]\d{8}/.test(phone.replace(/\s/g, ""))) {
        setShowPhoneVerification(true);
        setError("");
        return;
      }
      await api.register({
          email,
          phone,
          password,
          role,
          dateOfBirth,
          languagePreference: language || "en",
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
    setDualRoleMode("BOTH");
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
      await loadWorkspace();
      events.jobPosted();
      setJobTitle("");
      setJobDescription("");
      setJobBudgetMin("");
      setJobBudgetMax("");
      setJobDeadline("");
      setJobError("");
      setJobErrorNextAction(null);
      setView("jobs");
    } catch (err) {
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

  const basePlatformRole = (user?.role as PlatformRole) || "CLIENT";
  const platformRole: PlatformRole =
    basePlatformRole === "BOTH" ? dualRoleMode : basePlatformRole;

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
      // undefined, not false, while the answer is unknown -- the tour drops any
      // step whose predicate returns undefined.
      hasPostedJob: myJobCount === null ? undefined : myJobCount > 0,
      hasSubmittedProposal:
      myProposalCount === null ? undefined : myProposalCount > 0,
      // Completeness is a percentage. Anything below half-built still counts as
      // unfinished; a bare account sitting at 0 is not "profile complete".
      hasProfile:
      profileCompleteness === null ? undefined : profileCompleteness >= 60,
    }),
    [
      user?.role,
      user?.kyc?.status,
      wallet.balanceMinor,
      milestones,
      myJobCount,
      myProposalCount,
      profileCompleteness,
    ],
  );
  const { canHire, canWork, isStaff } = capabilitiesFor(platformRole);
  /* Staff are redirected into OpsConsole before render, so narrowing here is
     safe and keeps every workspace prop free of impossible ADMIN values. */
  const marketplaceRole: MarketplaceRole = isStaff
    ? "CLIENT"
    : (platformRole as MarketplaceRole);

  const navItems = useMemo(() => {
    const jobsLabel = canWork ? (canHire ? `${t.nav.findWork} / ${t.nav.postJob}` : t.nav.findWork) : t.nav.jobs;
    const jobsIconKey = canWork ? "find-work" : "jobs";
    const common = [
      { view: "overview" as View, iconKey: "overview", label: t.nav.dashboard },
      { view: "jobs" as View, iconKey: jobsIconKey, label: jobsLabel },
      { view: "gigs" as View, iconKey: "gigs", label: "Gigs" },
      { view: "contracts" as View, iconKey: "contracts", label: t.nav.escrow },
      { view: "wallet" as View, iconKey: "wallet", label: t.nav.wallet },
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
          { view: "cases" as View, iconKey: "cases", label: t.nav.disputes },
          {
            view: "verification" as View,
            iconKey: "verification",
            label: t.nav.kyc,
          },
        ];
  }, [platformRole, t]);

  if (user?.staffRole) {
    return (
      <OpsConsole
        user={user}
        onExit={logout}
      />
    );
  }

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
        <MarketingHeader
          onNavigate={handleNavigate}
          onStart={handleStart}
        />
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
            <ArrowLeft size={17} /> {t.nav.backToHome}
          </button>
          <div className="auth-header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageSelector variant="dropdown" />
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
          {authMode === "register" && showPhoneVerification && (
            <PhoneVerification
              phone={phone}
              onVerified={() => setShowPhoneVerification(false)}
              onSkip={() => setShowPhoneVerification(false)}
            />
          )}
          <button
            className="btn-primary wide"
            disabled={
              isLoading ||
              (authMode === "register" && (!termsAccepted || showPhoneVerification))
            }
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
    <div
      className={`platform-shell sh-shell sh-workspace-shell sh-variant-${sidebarVariant}${sidebarCollapsed ? " sh-collapsed sh-sidebar-collapsed" : ""}`}
    >
      <aside className="platform-sidebar">
        <div className="sidebar-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/svgviewer-output.svg"
              alt="Yekis Logo"
              className="platform-logo small"
            />
            {!sidebarCollapsed && <strong>Yekis</strong>}
          </div>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        </div>
        <div className="sidebar-role">
          <span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span>
          {!sidebarCollapsed && (
            <span>
              <strong>{roleLabel(platformRole)}</strong>
              <small>{user.email}</small>
            </span>
          )}
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={view === item.view ? "active" : ""}
              onClick={() => setView(item.view)}
              title={item.label}
            >
              <span className="nav-icon">{navIconMap[item.iconKey]}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          className={`sidebar-settings ${view === "settings" ? "active" : ""}`}
          onClick={() => setView("settings")}
          title="Settings"
        >
          <Settings size={16} /> <span className="nav-label">{t.nav.settings}</span>
        </button>
      </aside>

      <main className="platform-main">
        <OnboardingTour
          facts={tourFacts}
          onNavigate={(tab) => setView(tab as View)}
        />
        <header className="platform-topbar sh-topbar">
          <div className="sh-topbar-left">
            <button
              type="button"
              className="sh-icon-only-btn"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
            <div className="sh-breadcrumb">
              <span className="sh-breadcrumb-muted">
                {roleLabel(platformRole)} Workspace
              </span>
              <span className="sh-breadcrumb-sep">/</span>
              <strong className="sh-breadcrumb-current">
                {view === "overview"
                  ? "Dashboard Overview"
                  : navItems.find((item) => item.view === view)?.label ||
                    "Settings"}
              </strong>
            </div>
          </div>

          <div
            className="topbar-actions sh-topbar-right"
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <WorkspaceCommandPalette
              onNavigateView={(v) => setView(v as View)}
              onSwitchRoleMode={basePlatformRole === "BOTH" ? switchDualRoleMode : undefined}
              currentRole={platformRole}
            />

            {basePlatformRole === "BOTH" && (
              <select
                className="sh-select"
                value={dualRoleMode}
                onChange={(e) =>
                  switchDualRoleMode(e.target.value as DemoWorkspaceMode)
                }
                aria-label="Switch workspace mode"
                title="Switch between Client and Freelancer modes"
              >
                <option value="BOTH">Mode: Client &amp; Freelancer</option>
                <option value="CLIENT">Mode: Client (Hiring)</option>
                <option value="FREELANCER">Mode: Freelancer (Work)</option>
              </select>
            )}

            <LayoutCustomizerTrigger />
            <LanguageSelector variant="dropdown" />
            <button
              type="button"
              className="sh-icon-only-btn theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <NotificationCenter onNavigate={(v) => setView(v as View)} />
            <button className="user-menu" onClick={logout} title="Sign out">
              <span className="avatar">
                {user.email.slice(0, 1).toUpperCase()}
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        {view === "overview" && (
          <div className="sh-workspace-view">
            <MarketplaceShadcnDashboard
              wallet={wallet}
              jobs={jobs}
              milestones={milestones}
              topUps={topUps}
              canHire={canHire}
              canWork={canWork}
              isRefreshing={isRefreshing}
              onRefresh={() => void refreshDashboard()}
              onNavigateView={(v) => setView(v as View)}
              onSelectProfile={(id) => {
                setViewUserId(id);
                setView("profile");
              }}
            />

            <div className="overview-meta" style={{ padding: "0 24px 28px", maxWidth: 1440, margin: "0 auto" }}>
              <span
                className={realtimeLive ? "live-dot on" : "live-dot"}
                aria-hidden="true"
              />
              <span className="overview-meta-text sh-mono">
                {realtimeLive ? "Realtime socket connected" : "Auto-sync every 60s"} · Updated{" "}
                {lastUpdatedAt
                  ? lastUpdatedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "…"}
              </span>
              <button
                type="button"
                className="sh-icon-only-btn compact"
                onClick={() => void refreshDashboard()}
                disabled={isRefreshing}
                aria-label="Refresh dashboard data"
                title="Refresh dashboard data"
              >
                <RefreshCw
                  size={13}
                  className={isRefreshing ? "refresh-spin" : undefined}
                />
              </button>
            </div>
          </div>
        )}

        {view === "jobs" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {canHire && canWork
                    ? "Marketplace Briefs & Proposals"
                    : canHire
                      ? "Job Postings & Talent Pipeline"
                      : "Browse Open Marketplace Briefs"}
                </h2>
                <p className="sh-card-desc">
                  {canHire && canWork
                    ? "Take on open escrow-backed opportunities, or post a brief and manage your own talent pipeline."
                    : canHire
                      ? "Publish structured milestone briefs and shortlist verified Ethiopian freelancers."
                      : "Apply to milestone-funded opportunities across Ethiopia's verified marketplace."}
                </p>
              </div>
              <span className="sh-kbd">{jobs.length} Open Briefs</span>
            </div>

            {canHire && (
              <form className="sh-card job-form" onSubmit={submitJob}>
                <div className="sh-card-header">
                  <div>
                    <h3 className="sh-card-title">Publish New Job Brief</h3>
                    <p className="sh-card-desc">
                      Define project scope, ETB budget range, and target milestone delivery date
                    </p>
                  </div>
                  <span className="sh-kbd">Escrow Protected</span>
                </div>
                <div className="form-grid">
                  <label style={{ gridColumn: "span 2" }}>
                    Brief Title
                    <input
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                      placeholder="e.g., Telebirr H5 Merchant Checkout & Reconciliation API"
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
                    Scope & Deliverable Specification
                    <textarea
                      value={jobDescription}
                      onChange={(event) =>
                        setJobDescription(event.target.value)
                      }
                      placeholder="Describe the outcome, acceptance criteria, and milestone deliverables (min 20 characters)."
                      minLength={20}
                      required
                    />
                  </label>
                  <label>
                    Minimum Budget (ETB)
                    <input
                      type="number"
                      value={jobBudgetMin}
                      onChange={(event) => setJobBudgetMin(event.target.value)}
                      placeholder="45000"
                      required
                    />
                  </label>
                  <label>
                    Maximum Budget (ETB)
                    <input
                      type="number"
                      value={jobBudgetMax}
                      onChange={(event) => setJobBudgetMax(event.target.value)}
                      placeholder="85000"
                      required
                    />
                  </label>
                  <label>
                    Target Deadline
                    <input
                      type="date"
                      value={jobDeadline}
                      onChange={(event) => setJobDeadline(event.target.value)}
                      required
                    />
                  </label>
                </div>
                {jobError && (
                  <div className="form-error" style={{ marginTop: 8 }}>
                    {jobError}
                    {jobErrorNextAction === "verification" && (
                      <button
                        type="button"
                        className="sh-btn sh-btn-secondary"
                        style={{ marginTop: 10 }}
                        onClick={() => setView("verification")}
                      >
                        Verify your identity
                      </button>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="sh-btn sh-btn-primary"
                    disabled={isLoading}
                  >
                    Publish Job Brief
                  </button>
                </div>
              </form>
            )}
            <JobsWorkspace
              role={marketplaceRole}
              openJobs={jobs}
              onChanged={loadWorkspace}
            />
          </section>
        )}

        {view === "gigs" && (
          <section className="sh-dashboard-wrap">
            <GigMarketplace />
          </section>
        )}
        {view === "my-gigs" && (
          <section className="sh-dashboard-wrap">
            <GigSellerDashboard />
          </section>
        )}

        {view === "contracts" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Contracts & Escrow Milestones
                </h2>
                <p className="sh-card-desc">
                  Execute bilingual AACCSA agreements, fund escrow vaults, submit deliverables, and release verified payouts.
                </p>
              </div>
              <span className="sh-kbd">AACCSA Standard v2.4</span>
            </div>
            <ContractsWorkspace userId={user.id} onChanged={loadWorkspace} />
          </section>
        )}

        {view === "wallet" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Escrow Wallet & Payment Rails
                </h2>
                <p className="sh-card-desc">
                  Fund escrow or withdraw settled earnings via Telebirr, CBE Birr, and Safaricom M-Pesa.
                </p>
              </div>
              <span className="sh-kbd sh-mono">
                ETB {(wallet.balanceMinor / 100).toLocaleString()}
              </span>
            </div>
            <BrowserWallet
              wallet={wallet}
              topUps={topUps}
              onChanged={loadWorkspace}
              role={marketplaceRole}
            />
          </section>
        )}

        {view === "chat" && (
          <section className="sh-dashboard-wrap chat-page-container">
            <ChatWorkspace
              user={user}
              userId={user.id}
              role={marketplaceRole === "BOTH" ? "FREELANCER" : marketplaceRole}
              onNavigateToContracts={() => setView("contracts")}
            />
          </section>
        )}

        {view === "verification" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Identity & Fayda eKYC Verification
                </h2>
                <p className="sh-card-desc">
                  Manage your Fayda National ID tier and instant payout readiness.
                </p>
              </div>
              <span className="sh-kbd">
                {user.kyc?.tier ?? "TIER_2"} · {user.kyc?.status ?? "VERIFIED"}
              </span>
            </div>
            <BrowserVerification />
          </section>
        )}

        {view === "cases" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Dispute Resolution & Mediation Center
                </h2>
                <p className="sh-card-desc">
                  Negotiate milestone adjustments, submit immutable evidence, and track staff mediation or AACCSA arbitration.
                </p>
              </div>
              <span className="sh-kbd">3-Stage Escrow Protection</span>
            </div>
            <DisputesWorkspace />
          </section>
        )}

        {view === "profile" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Public Marketplace Profile
                </h2>
                <p className="sh-card-desc">
                  Verified credentials, portfolio highlights, and completed contract history.
                </p>
              </div>
              <button
                className="sh-btn sh-btn-secondary"
                onClick={() => setView("profile-edit")}
              >
                <Edit size={14} /> Edit Profile
              </button>
            </div>
            <ProfilePage userId={viewUserId || user.id} />
          </section>
        )}

        {view === "profile-edit" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Edit Marketplace Profile
                </h2>
                <p className="sh-card-desc">
                  Update your bio, skills, hourly rate, and verification portfolio.
                </p>
              </div>
              <button
                className="sh-btn sh-btn-secondary"
                onClick={() => setView("profile")}
              >
                <ArrowLeft size={14} /> Back to Profile
              </button>
            </div>
            <ProfileEditPage />
          </section>
        )}

        {view === "settings" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  Workspace & Account Settings
                </h2>
                <p className="sh-card-desc">
                  Account credentials, active role capabilities, and direct support access.
                </p>
              </div>
              <span className="sh-kbd">{user.ucid ?? "YEK-USER"}</span>
            </div>
            <div className="sh-card settings-list">
              <div className="sh-kv-row">
                <span>Account Email</span>
                <strong className="sh-mono">{user.email}</strong>
              </div>
              <div className="sh-kv-row">
                <span>Active Workspace Role</span>
                <strong>{roleLabel(platformRole)}</strong>
              </div>
              <div className="sh-kv-row">
                <span>KYC Verification Status</span>
                <span className="sh-status-inline emerald">
                  {user.kyc?.tier ?? "TIER_2"} ({user.kyc?.status ?? "VERIFIED"})
                </span>
              </div>
              <div className="sh-kv-row">
                <span>Customer Support Desk</span>
                <span>Get real-time assistance with Telebirr/CBE payments, jobs, or disputes.</span>
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 12 }}>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => setView("chat")}
                >
                  <LifeBuoy size={14} /> Chat with Support
                </button>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={logout}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
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
