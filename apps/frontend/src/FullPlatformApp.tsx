// === IMPORTS ===
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  api,
  type ChatConversation,
  type Contract,
  type EscrowFeeConfig,
  type Job,
  type MeResponse,
  type Milestone,
  type TopUpRequest,
  type WalletResponse,
} from "./api/client";
import { realtimeSocket } from "./api/socket";
import {
  markViewNotificationsRead,
  useNotifications,
  useUnreadByView,
} from "./api/notificationFeed";
import {
  getTabSelectionForView,
  type ContractsTabKey,
  type JobsTabKey,
} from "./navigation/workspaceNavigation";
import { LandingPageV2 as LandingPage } from "./LandingPageV2";
import { ChatWorkspace } from "./ChatWorkspace";
import { OpsConsole } from "./pages/ops/OpsConsole";
import { BrowserWallet } from "./BrowserWallet";
import { BrowserVerification } from "./BrowserVerification";
import { NotificationCenter } from "./NotificationCenter";
import { OnboardingVerification } from "./OnboardingVerification";
import {
  ContractsWorkspace,
  DisputesWorkspace,
  EscrowWorkspace,
  JobsWorkspace,
} from "./WorkflowWorkspace";
import {
  LayoutDashboard,
  Briefcase,
  Search,
  FileText,
  FileSignature,
  FileCheck,
  Wallet,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Settings,
  LogOut,
  ArrowLeft,
  User as UserIcon,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Package,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Camera,
} from "lucide-react";
import { ProfilePage } from "./ProfilePage";
import { ProfileEditPage } from "./ProfileEditPage";
import { SettingsWorkspace } from "./SettingsWorkspace";
import {
  YekisAvatar,
  AVATAR_UPDATED_EVENT,
  loadAvatarOverride,
} from "./components/YekisAvatar";
import { ProfileCompletionDialog } from "./components/ProfileCompletionDialog";
import { useLocation, useNavigate } from "./router/HashRouter";
import { FAQPage } from "./FAQPage";
import { FeesPage } from "./FeesPage";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";
import { AboutPage } from "./AboutPage";
import { NotFoundPage } from "./NotFoundPage";
import { ThankYouPage } from "./ThankYouPage";
import { CaseStudiesPage } from "./CaseStudiesPage";
import { CookieBanner } from "./CookieBanner";
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
import { useI18n, isLanguage, type Language } from "./i18n";
import {
  FULL_PLATFORM_CATEGORY_LABELS,
  FULL_PLATFORM_COPY,
} from "./fullPlatformCopy";
import { LanguageSelector } from "./components/LanguageSelector";
import "./components/scroll.css";
import "./styles/shadcn-dashboard.css";
import {
  ShadcnLayoutProvider,
  useShadcnLayout,
  LayoutCustomizerTrigger,
} from "./components/dashboard/ShadcnLayoutContext";
import { MarketplaceShadcnDashboard } from "./components/dashboard/MarketplaceShadcnDashboard";
import { WorkspaceCommandPalette } from "./components/dashboard/WorkspaceCommandPalette";
import "./components/guide/guide.css";
import {
  GuideProvider,
  type DashboardSubViewAction,
} from "./components/guide/GuideContext";
import type { GuideModuleId, GuideRole } from "./components/guide/guideTypes";
import { ProductTourOverlay } from "./components/guide/ProductTourOverlay";
import {
  FirstVisitWelcomeBar,
  GlobalHelpMenu,
} from "./components/guide/GlobalHelpMenu";
import { ContextualHelpTrigger } from "./components/guide/ContextualHelpTrigger";

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
  | "proposals"
  | "gigs"
  | "my-gigs"
  | "contracts"
  | "escrow"
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

export const categoryLabels: Record<string, string> = {
  WEB_APP_DEVELOPMENT: "Web app development",
  GRAPHIC_DESIGN: "Graphic design",
  DIGITAL_MARKETING: "Digital marketing",
  CONTENT_WRITING: "Content writing",
  TRANSLATION: "Translation",
  DATA_ENTRY: "Data entry",
  VIDEO_PRODUCTION: "Video production",
  ACCOUNTING_BOOKKEEPING: "Accounting & bookkeeping",
  LEGAL_RESEARCH: "Legal research",
  DATA_ANALYTICS: "Data analytics",
};

export const categories = Object.keys(categoryLabels);

/**
 * How long the "Finish your profile" reminder waits before it says anything.
 *
 * The banner used to be on screen the moment the workspace loaded, which is
 * the worst moment for it: the person has just arrived, has not looked at
 * anything yet, and a bar about their missing photo is the least useful
 * thing on the page. It now waits until they have actually started moving
 * around the platform — either because they have been in here for a while,
 * or because they have opened a second view — and only then says what is
 * still missing.
 */
const PROFILE_NUDGE_DELAY_MS = 45_000;

/**
 * Where a dismissed reminder is remembered.
 *
 * The dismissal used to last for one page load, so the banner came back on
 * the next visit as if it had never been answered. It is remembered per
 * account now, and forgotten the moment the profile is complete.
 */
const profileNudgeDismissedKey = (userId: string) =>
  `yekis_profile_nudge_dismissed_${userId}`;

// === MAIN COMPONENT ===
function roleLabel(role: PlatformRole, language: Language = "en") {
  /* BOTH previously fell through to "Client", so a dual-role account saw
     "Client workspace" in the shell while being able to do both. */
  const roles = (FULL_PLATFORM_COPY[language] ?? FULL_PLATFORM_COPY.en).roles;
  return roles[role] ?? roles.CLIENT;
}

const navIconMap: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard size={18} />,
  jobs: <Briefcase size={18} />,
  "find-work": <Search size={18} />,
  proposals: <FileCheck size={18} />,
  gigs: <Package size={18} />,
  contracts: <FileSignature size={18} />,
  escrow: <FileText size={18} />,
  wallet: <Wallet size={18} />,
  chat: <MessageCircle size={18} />,
  verification: <ShieldCheck size={18} />,
  cases: <Scale size={18} />,
  profile: <UserIcon size={18} />,
  settings: <Settings size={18} />,
};

/* ── Auth art: continuous irregular pixel field ───────────────────
   One seamless pixel matrix covers the upper and upper-right canopy
   (above the diagonal frontier that clears the Yekis logo and headline).
   Two octaves of deterministic 2D value noise shape organic pixel-art
   clusters, stepped ridges, and scattered outlier pixels on a crisp
   integer grid (`shapeRendering="crispEdges"`), while pointer movement
   writes normalized `--auth-px`/`--auth-py` custom properties for
   compositor-only parallax and scroll timelines drive short viewports. */
const AUTH_PIXEL_COLS = 70;
const AUTH_PIXEL_ROWS = 43;
const AUTH_PIXEL_STEP = 12;
const AUTH_PIXEL_SIZE = 9;
const AUTH_PIXEL_VIEWBOX_W = AUTH_PIXEL_COLS * AUTH_PIXEL_STEP;
const AUTH_PIXEL_VIEWBOX_H = AUTH_PIXEL_ROWS * AUTH_PIXEL_STEP + 4;

interface AuthPixelCell {
  id: number;
  x: number;
  y: number;
  tone: 0 | 1 | 2;
  tier: "dim" | "mid" | "bright";
  animated: boolean;
  delay: number;
}

function authPixelHash(col: number, row: number, seed: number): number {
  let h = (Math.imul(col + 37, 374761393) + Math.imul(row + 91, 668265263) + seed) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function authSmoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function authValueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = authSmoothstep(x - x0);
  const fy = authSmoothstep(y - y0);

  const n00 = authPixelHash(x0, y0, seed);
  const n10 = authPixelHash(x0 + 1, y0, seed);
  const n01 = authPixelHash(x0, y0 + 1, seed);
  const n11 = authPixelHash(x0 + 1, y0 + 1, seed);

  const nx0 = n00 + (n10 - n00) * fx;
  const nx1 = n01 + (n11 - n01) * fx;
  return nx0 + (nx1 - nx0) * fy;
}

/**
 * Diagonal-curved boundary across the art stage matching the upper/right
 * pixel zone: starts below the "Back to Home" control on the left, stays
 * cleanly above the Yekis logo and headline, curves beneath the orbital
 * centerpiece, and reaches roughly mid-height at the right edge.
 */
function getAuthZoneBoundaryRow(u: number): number {
  const anchors: readonly [number, number][] = [
    [0.0, 10.5],
    [0.16, 14.5],
    [0.36, 18.2],
    [0.56, 28.5],
    [0.78, 32.8],
    [1.0, 34.8],
  ];
  let base = anchors[anchors.length - 1][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [u0, r0] = anchors[i];
    const [u1, r1] = anchors[i + 1];
    if (u <= u1) {
      const t = authSmoothstep((u - u0) / (u1 - u0));
      base = r0 + (r1 - r0) * t;
      break;
    }
  }
  const organicWave =
    Math.sin(u * 13.7 + 0.6) * 1.9 +
    Math.sin(u * 29.3 + 1.9) * 1.0 +
    (authValueNoise2D(u * 9.5, 1.3, 0x4b1d) - 0.5) * 2.8;
  return base + organicWave;
}

function buildAuthPixelField(): AuthPixelCell[] {
  const cells: AuthPixelCell[] = [];

  for (let row = 0; row < AUTH_PIXEL_ROWS; row++) {
    for (let col = 0; col < AUTH_PIXEL_COLS; col++) {
      const u = col / (AUTH_PIXEL_COLS - 1);
      const boundaryRow = getAuthZoneBoundaryRow(u);
      if (row > boundaryRow + 1.1) continue;

      const macro = authValueNoise2D(col * 0.14 + 2.4, row * 0.16 + 1.1, 0x3b71);
      const mid = authValueNoise2D(col * 0.27 + 6.8, row * 0.27 + 3.5, 0x8d42);
      const micro = authValueNoise2D(col * 0.48 + 9.4, row * 0.48 + 5.2, 0x7c21);
      const detail = authPixelHash(col, row, 0x2b95);
      const toneNoise = authValueNoise2D(col * 0.24 + 1.2, row * 0.24 + 4.8, 0x51e7);
      const shimmerRoll = authPixelHash(col, row, 0x9e37);

      const edgeRatio = row / Math.max(1, boundaryRow);
      const frontierFade =
        edgeRatio > 0.68
          ? Math.max(0, 1 - (edgeRatio - 0.68) / 0.36)
          : 1;

      const backButtonZone = col < 15 && row < 6;
      const backButtonCalm = backButtonZone ? 0.78 : 1;
      const orbitalBoost = u > 0.48 && edgeRatio < 0.78 ? 0.08 : 0;
      const topCanopyBoost = row <= 4 ? 0.08 : 0;

      const targetDensity =
        (0.51 + orbitalBoost + topCanopyBoost) *
        (0.18 + 0.82 * authSmoothstep(frontierFade)) *
        backButtonCalm;

      const score = macro * 0.36 + mid * 0.26 + micro * 0.18 + detail * 0.20;
      if (score <= 1 - targetDensity) continue;

      const intensityMix = macro * 0.4 + mid * 0.3 + detail * 0.3;
      const tier: AuthPixelCell["tier"] =
        backButtonZone
          ? "dim"
          : intensityMix > 0.72
            ? "bright"
            : intensityMix > 0.44
              ? "mid"
              : "dim";

      const toneRoll = toneNoise * 0.55 + authPixelHash(col, row, 0x6a09) * 0.45;
      const tone: AuthPixelCell["tone"] =
        toneRoll > 0.86 && u > 0.24 ? 2 : toneRoll > 0.62 ? 1 : 0;

      cells.push({
        id: row * AUTH_PIXEL_COLS + col,
        x: col * AUTH_PIXEL_STEP + 1,
        y: row * AUTH_PIXEL_STEP + 1,
        tone,
        tier,
        animated: shimmerRoll > 0.54,
        delay: -Number((shimmerRoll * 9).toFixed(2)),
      });
    }
  }

  return cells;
}

const AUTH_PIXEL_FIELD = buildAuthPixelField();

function AuthVisualAnimation() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      frame = 0;
      stage.style.setProperty("--auth-px", px.toFixed(3));
      stage.style.setProperty("--auth-py", py.toFixed(3));
    };

    const queue = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const inside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
      if (!inside) {
        if (px === 0 && py === 0) return;
        px = 0;
        py = 0;
        queue();
        return;
      }
      px = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
      );
      py = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
      );
      queue();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div className="auth-vis" aria-hidden="true" ref={stageRef}>
      <div className="auth-vis-aurora auth-vis-aurora-a" />
      <div className="auth-vis-aurora auth-vis-aurora-b" />
      <div className="auth-vis-mesh" />
      <div className="auth-vis-sweep" />
      <div className="auth-vis-orbit">
        <span className="auth-vis-orbit-ring" />
        <span className="auth-vis-orbit-ring auth-vis-orbit-ring-inner" />
        <span className="auth-vis-orbit-arc" />
        <span className="auth-vis-orbit-spin">
          <span className="auth-vis-orbit-satellite" />
        </span>
        <span className="auth-vis-orbit-spin auth-vis-orbit-spin-inner">
          <span className="auth-vis-orbit-satellite auth-vis-orbit-satellite-small" />
        </span>
        <span className="auth-vis-orbit-core" />
      </div>

      <svg
        className="auth-vis-pixel-field"
        viewBox={`0 0 ${AUTH_PIXEL_VIEWBOX_W} ${AUTH_PIXEL_VIEWBOX_H}`}
        preserveAspectRatio="xMidYMin meet"
        shapeRendering="crispEdges"
      >
        {AUTH_PIXEL_FIELD.map((cell) => (
          <rect
            key={cell.id}
            x={cell.x}
            y={cell.y}
            width={AUTH_PIXEL_SIZE}
            height={AUTH_PIXEL_SIZE}
            className={`auth-vis-pixel auth-vis-pixel-tone-${cell.tone} auth-vis-pixel-${cell.tier}${
              cell.animated ? " is-animated" : ""
            }`}
            style={
              cell.animated
                ? ({ "--auth-delay": `${cell.delay}s` } as CSSProperties)
                : undefined
            }
          />
        ))}
      </svg>

      <span className="auth-vis-cursor" />
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
  const copy = FULL_PLATFORM_COPY[language] ?? FULL_PLATFORM_COPY.en;
  const localizedCategoryLabels =
    FULL_PLATFORM_CATEGORY_LABELS[language] ?? FULL_PLATFORM_CATEGORY_LABELS.en;
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarVariant,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    setDashboardVariant,
    setOpsSubTab,
  } = useShadcnLayout();
  const hashLocation = useLocation();
  const hashNavigate = useNavigate();
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
   * The onboarding OTP step. `null` means the details form is showing; a
   * channel means the code-entry step has taken over the panel.
   *
   * Email is the default channel because it is the one a hosted environment
   * can actually deliver: the SMS provider has no key on a test deployment,
   * and the signup used to dead-end on its first step for exactly that
   * reason. Which channels are live is decided by the server, not guessed
   * here — see `GET /auth/verification/channels`.
   */
  const [onboardingChannel, setOnboardingChannel] = useState<
    "email" | "phone" | null
  >(null);
  /**
   * The channel capabilities, fetched once. Kept in state so switching to the
   * code-entry step and back does not re-ask the server.
   */
  const [verificationChannels, setVerificationChannels] = useState<{
    email: { available: boolean; label: string };
    phone: { available: boolean; label: string };
  } | null>(null);
  /**
   * Profile-completeness signal. `null` means "not known yet", which is
   * deliberately different from 0 so the completion nudge can wait instead of
   * telling a user with a full profile that they have done nothing.
   */
  const [profileCompleteness, setProfileCompleteness] = useState<number | null>(
    null,
  );
  const [profileNudgeDismissed, setProfileNudgeDismissed] = useState(false);
  /**
   * Whether the reminder is allowed to speak yet.
   *
   * It is not allowed to speak the moment the workspace loads — it waits
   * until the person has been here a while or has opened a second view (see
   * `PROFILE_NUDGE_DELAY_MS`). A new account is taken to the profile
   * section directly instead, so it never has to be told at all.
   */
  const [profileNudgeArmed, setProfileNudgeArmed] = useState(false);
  /**
   * The views this session has opened.
   *
   * Two or more means the person has started moving around the platform,
   * which is what arms the reminder.
   */
  const visitedViewsRef = useRef<Set<View>>(new Set());
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarVersion((v) => v + 1);
    window.addEventListener(AVATAR_UPDATED_EVENT, onAvatarUpdated);
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, onAvatarUpdated);
  }, []);
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
  const [jobsTab, setJobsTab] = useState<JobsTabKey>("jobs");
  const [contractsTab, setContractsTab] = useState<ContractsTabKey>("overview");
  /**
   * Whose profile the workspace is showing.
   *
   * `null` is my own profile. Anything else is somebody else's, and the
   * shell has to know which: the breadcrumb must not say "My Profile" over
   * another person's page, and "Edit Profile" must not be offered on a page
   * that is not mine — clicking it would open the editor for *my* profile
   * while the screen showed theirs.
   */
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  /**
   * The name of the profile on screen, once it has loaded.
   *
   * It arrives from the profile itself (`ProfilePage` reports what it
   * fetched), so it is right for every path that can open a profile — the
   * featured carousel, the gig seller, a chat partner — and not only for the
   * ones that happen to know the name already.
   */
  const [viewedProfileName, setViewedProfileName] = useState<string | null>(
    null,
  );

  // Navigation history tracking for the universal back button
  interface ViewHistoryEntry {
    view: View;
    viewUserId: string | null;
  }
  const [viewHistory, setViewHistory] = useState<ViewHistoryEntry[]>([]);
  const isBackNavRef = useRef(false);
  const prevViewRef = useRef<ViewHistoryEntry>({ view: "overview", viewUserId: null });

  useEffect(() => {
    if (isBackNavRef.current) {
      isBackNavRef.current = false;
      prevViewRef.current = { view, viewUserId };
      return;
    }
    const prev = prevViewRef.current;
    if (prev.view !== view || prev.viewUserId !== viewUserId) {
      setViewHistory((h) => [...h, prev]);
      prevViewRef.current = { view, viewUserId };
      if (typeof window !== "undefined") {
        try {
          window.history.pushState(
            { yekisView: view, viewUserId },
            "",
            window.location.pathname,
          );
        } catch {
          // ignore history push errors
        }
      }
    }
  }, [view, viewUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.yekisView) {
        isBackNavRef.current = true;
        setView(e.state.yekisView as View);
        setViewUserId(e.state.viewUserId ?? null);
        setViewHistory((h) => (h.length > 0 ? h.slice(0, -1) : []));
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleUniversalBack = useCallback(() => {
    if (viewHistory.length > 0) {
      const previous = viewHistory[viewHistory.length - 1];
      setViewHistory((h) => h.slice(0, -1));
      isBackNavRef.current = true;
      prevViewRef.current = previous;
      setViewUserId(previous.viewUserId);
      setView(previous.view);
      if (typeof window !== "undefined") {
        try {
          window.history.replaceState(
            { yekisView: previous.view, viewUserId: previous.viewUserId },
            "",
            window.location.pathname,
          );
        } catch {
          // ignore
        }
      }
    } else if (view !== "overview") {
      isBackNavRef.current = true;
      prevViewRef.current = { view: "overview", viewUserId: null };
      setViewUserId(null);
      setView("overview");
      if (typeof window !== "undefined") {
        try {
          window.history.replaceState(
            { yekisView: "overview", viewUserId: null },
            "",
            window.location.pathname,
          );
        } catch {
          // ignore
        }
      }
    } else {
      window.history.back();
    }
  }, [viewHistory, view]);
  const [focusContractId, setFocusContractId] = useState<string | null>(null);
  const [focusChatConversationId, setFocusChatConversationId] = useState<string | null>(null);
  const [marketingPage, setMarketingPage] = useState<MarketingPage>("home");
  const [jobs, setJobs] = useState<Job[]>([]);
  /** The caller's own posted briefs — the hiring side of the workspace. */
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [feeConfig, setFeeConfig] = useState<EscrowFeeConfig | null>(null);
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
  const [, setRealtimeLive] = useState(false);
  /* Dual-role ("BOTH") accounts switch cleanly between Client and Freelancer workspaces */
  const [dualRoleMode, setDualRoleMode] = useState<"CLIENT" | "FREELANCER">(() => {
    if (typeof window === "undefined") return "CLIENT";
    const stored = window.localStorage.getItem("yekis_dual_role_mode");
    if (stored === "BOTH") {
      window.localStorage.setItem("yekis_dual_role_mode", "CLIENT");
      return "CLIENT";
    }
    return stored === "FREELANCER" ? "FREELANCER" : "CLIENT";
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobileViewport(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileDrawerOpen]);

  const switchDualRoleMode = (mode: "CLIENT" | "FREELANCER") => {
    if (user?.role !== "BOTH") return;
    if (mode === "CLIENT" || mode === "FREELANCER") {
      setDualRoleMode(mode);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("yekis_dual_role_mode", mode);
      }
    }
  };

  /**
   * Opens MY profile.
   *
   * Every entry point that means "my profile" goes through here: the
   * sidebar item, the avatar in the topbar, the chip at the foot of the
   * sidebar, the command palette and the end of a registration. They used
   * to call `setView("profile")` directly, which kept whatever profile was
   * last opened — so clicking "My Profile" after looking at somebody else
   * showed that person again, and the workspace was left counting somebody
   * else's page as yours.
   */
  const openMyProfile = () => {
    setViewUserId(null);
    setViewedProfileName(null);
    setView("profile");
  };

  /**
   * Opens somebody else's profile.
   *
   * The name is not known here — it arrives from the profile itself once it
   * has loaded — so it is cleared here and set again by `ProfilePage`.
   */
  const openProfileOf = (userId: string) => {
    setViewUserId(userId);
    setViewedProfileName(null);
    setView("profile");
  };

  /**
   * Opens or creates a direct chat conversation with a specific user and navigates to the chat workspace.
   */
  const openChatWithUser = async (recipientId: string, recipientName?: string) => {
    try {
      const directConv = await api.createDirectConversation(
        recipientId,
        recipientName ? copy.directDiscussionWith(recipientName) : copy.directProjectDiscussion,
      );
      if (directConv?.id) {
        setFocusChatConversationId(directConv.id);
      }
      setView("chat");
    } catch {
      // If direct conversation creation fails, navigate to chat
      setView("chat");
    }
  };

  /**
   * The workspace's own navigation.
   *
   * "profile" always means MY profile, whoever was last opened.
   */
  const navigateToView = (next: View) => {
    const tabSelection = getTabSelectionForView(next);
    if (tabSelection.jobsTab) setJobsTab(tabSelection.jobsTab);
    if (tabSelection.contractsTab) setContractsTab(tabSelection.contractsTab);
    if (next === "profile") {
      openMyProfile();
      return;
    }
    setView(next);
  };

  /**
   * True when the profile on screen is the signed-in person's own.
   *
   * It is the shell's own answer, not the profile's: the shell knows which
   * id it asked for, and the profile can be private, missing or slow.
   */
  const viewingOwnProfile = !viewUserId || viewUserId === user?.id;


  const isAuthenticatedRef = useRef(Boolean(user));
  const languageSyncedForUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    isAuthenticatedRef.current = Boolean(user);
  }, [user]);

  useEffect(() => {
    return api.onUnauthorized(() => {
      if (!isAuthenticatedRef.current) return;
      languageSyncedForUserIdRef.current = null;
      realtimeSocket.disconnect();
      setUser(null);
      setWallet({ balanceMinor: 0 });
      setTopUps([]);
      setMilestones([]);
      setJobs([]);
      setView("overview");
      setShowLanding(false);
      setAuthMode("login");
      setError("Your session expired. Please sign in again to continue.");
    });
  }, []);

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
    //
    // The token is scrubbed out of the address bar immediately afterwards. A
    // reset token sitting in the URL leaks through the history entry, through
    // the Referer header of any third-party request the page makes (the page
    // loads telegram.org/js/telegram-web-app.js), and through any screenshot
    // or support ticket that includes the URL.
    if (window.location.pathname === "/reset-password") {
      const urlToken = new URLSearchParams(window.location.search).get("token");
      if (urlToken) {
        setResetToken(urlToken);
        setAuthMode("reset-password");
        setShowLanding(false);
        window.history.replaceState(null, "", "/reset-password");
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
      myJobsResult,
      milestonesResult,
      contractsResult,
      conversationsResult,
      topUpsResult,
      completenessResult,
      feeConfigResult,
    ] = await Promise.allSettled([
      api.getMe(),
      api.getWallet(),
      api.getJobFeed(),
      api.getMyJobs(),
      api.getMilestones(),
      api.getContracts(),
      api.getChatConversations(),
      api.getTopUpRequests(),
      api.getProfileCompleteness(),
      api.getEscrowFeeConfig(),
    ]);
    if (meResult.status === "rejected") throw meResult.reason;
    const me = meResult.value;
    setUser(me);
    if (languageSyncedForUserIdRef.current !== me.id) {
      languageSyncedForUserIdRef.current = me.id;
      if (isLanguage(me?.languagePreference)) {
        setLanguage(me.languagePreference);
      }
    }
    if (walletResult.status === "fulfilled") setWallet(walletResult.value);
    if (jobsResult.status === "fulfilled") setJobs(jobsResult.value.jobs);
    if (myJobsResult.status === "fulfilled") setMyJobs(myJobsResult.value);
    if (milestonesResult.status === "fulfilled")
      setMilestones(milestonesResult.value);
    if (contractsResult.status === "fulfilled")
      setContracts(contractsResult.value);
    if (conversationsResult.status === "fulfilled")
      setConversations(conversationsResult.value);
    if (topUpsResult.status === "fulfilled") setTopUps(topUpsResult.value);
    if (completenessResult.status === "fulfilled")
      setProfileCompleteness(completenessResult.value.profileCompleteness);
    if (feeConfigResult.status === "fulfilled") setFeeConfig(feeConfigResult.value);
    setLastUpdatedAt(new Date());
  };

  // Ref-synced alias so the polling/socket effect can stay keyed on [user]
  // exactly like the pre-existing mount effect above (no new hook deps).
  const loadWorkspaceRef = useRef(loadWorkspace);
  useEffect(() => {
    loadWorkspaceRef.current = loadWorkspace;
  });

  /**
   * The account in the workspace, by id.
   *
   * The effects below key on this rather than on the whole `user` object,
   * because `loadWorkspace` replaces that object every 60 seconds — keying
   * on it would restart the waiting timer on every poll.
   */
  const currentUserId = user?.id;

  /**
   * When the profile reminder may speak.
   *
   * Two ways to earn it, and both mean the same thing: the person is
   * actually using the platform. Either they have been in here for a while
   * (`PROFILE_NUDGE_DELAY_MS`), or they have opened three or more views —
   * they are moving around, and now is the moment to tell them what is still
   * missing.
   *
   * Three, not two: a new account lands on the profile section by itself, so
   * two views is what every new account sees before it has done anything.
   * That is the checklist's job, not the banner's.
   */
  useEffect(() => {
    if (!currentUserId) return;
    visitedViewsRef.current.add(view);
    if (visitedViewsRef.current.size >= 3) setProfileNudgeArmed(true);
  }, [currentUserId, view]);

  useEffect(() => {
    if (!currentUserId || profileNudgeArmed) return;
    const timer = window.setTimeout(() => {
      setProfileNudgeArmed(true);
    }, PROFILE_NUDGE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentUserId, profileNudgeArmed]);

  /**
   * A dismissed reminder stays dismissed — for this account, across page
   * loads — until the profile is complete. It used to last for a single page
   * load, so the banner came back on the next visit as if it had never been
   * answered.
   */
  useEffect(() => {
    if (!currentUserId) return;
    setProfileNudgeDismissed(
      window.localStorage.getItem(profileNudgeDismissedKey(currentUserId)) ===
        "1",
    );
  }, [currentUserId]);

  const dismissProfileNudge = () => {
    setProfileNudgeDismissed(true);
    if (currentUserId) {
      window.localStorage.setItem(profileNudgeDismissedKey(currentUserId), "1");
    }
  };

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

  /**
   * Which verification channel can actually deliver a code right now.
   *
   * The server decides, from its own configuration: a host with no SMTP key
   * cannot send an email and a host with no SMS key cannot send a text. Asking
   * the server is the difference between a signup that works and a signup
   * that offers a code which never arrives.
   *
   * Email is preferred. `User.email` is the login identifier and the
   * destination of every transactional mail, so proving the address is a
   * takeover-prevention control in its own right — and it is the channel a
   * test deployment can actually deliver.
   *
   * The answer is cached: the capabilities of a running server do not change
   * between two clicks of the same form.
   *
   * A failed lookup falls back to email rather than to "no channel". The
   * lookup is a hint, not a gate: if it cannot be answered, the code request
   * itself is the thing that knows whether a code can be delivered, and its
   * answer is the real one. Falling back to "no channel" here would register
   * an unproven address silently; falling back to email sends the user to
   * the step that tells the truth.
   */
  const resolveVerificationChannel = async (): Promise<
    "email" | "phone" | null
  > => {
    let channels = verificationChannels;
    if (!channels) {
      try {
        channels = await api.getVerificationChannels();
        setVerificationChannels(channels);
      } catch {
        if (email.trim()) return "email";
        return null;
      }
    }
    if (channels.email.available && email.trim()) return "email";
    if (
      channels.phone.available &&
      /^\+?251[1-9]\d{8}$/.test(phone.replace(/\s/g, ""))
    ) {
      return "phone";
    }
    return null;
  };

  /**
   * Creates the account and signs the user in.
   *
   * Split out of `submitAuth` because the account is now created AFTER the
   * onboarding code is proven. The code has to be verified while the account
   * does not exist yet — that is what lets registration attach the proof to
   * the new row.
   */
  const completeRegistration = async () => {
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
    const session = await api.login(email, password);
    api.setSession(session);
    // Analytics: mark the auth visit completed before the user state flips
    // (the abandonment effect's cleanup reads this flag on logout/exit).
    if (authVisitRef.current) authVisitRef.current.completed = true;
    events.signupCompleted(
      role === "CLIENT" ? "client" : role === "BOTH" ? "both" : "freelancer",
    );
    setProfileNudgeDismissed(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("yekis_new_user_nudge_me", "1");
      // The account is new, so a dismissal from a previous life on this
      // device must not silence the reminder that is about to be shown.
      window.localStorage.removeItem(
        profileNudgeDismissedKey(session.user.id),
      );
    }
    await loadWorkspace();

    // Take a new account straight to the profile section, with the checklist
    // open.
    //
    // The platform is going to keep asking for a photo, a name and a bio
    // until they are there, so it asks now — while the account is brand new
    // and the person has not done anything else yet. The reminder banner
    // waits until they have started moving around; this does not, because
    // this is the moment it is relevant.
    openMyProfile();
    hashNavigate("/profile", {
      replace: true,
      state: { ...hashLocation.state, showProfileCompletion: true },
    });
  };

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    // Registration answers 202 for both new and existing accounts, so the
    // follow-up sign-in is the only thing that can tell the user apart. A
    // failed sign-in after registering must not disclose whether the account
    // already existed.
    const wasRegistering = authMode === "register";
    try {
      if (authMode === "forgot-password") {
        await api.requestPasswordReset(email);
        setSuccessMessage(copy.passwordResetSent);
        setAuthMode("reset-password");
        return;
      }
      if (authMode === "reset-password") {
        await api.resetPassword(resetToken, password);
        setSuccessMessage(copy.passwordResetSuccess);
        setAuthMode("login");
        setPassword("");
        return;
      }
      if (authMode === "register") {
        // The onboarding step. The code is proven BEFORE the account exists,
        // which is why the backend endpoints are unauthenticated, and the
        // proof is attached to the new row at registration.
        //
        // A hard gate with no escape hatch is a support queue rather than a
        // security control, so the step keeps a way through — and when no
        // channel can deliver at all, registration proceeds without it.
        const channel = await resolveVerificationChannel();
        if (channel) {
          setOnboardingChannel(channel);
          setError("");
          return;
        }
        await completeRegistration();
        return;
      }
      const session = await api.login(email, password);
      api.setSession(session);
      // Analytics: mark the auth visit completed before the user state flips
      // (the abandonment effect's cleanup reads this flag on logout/exit).
      if (authVisitRef.current) authVisitRef.current.completed = true;
      events.login("email");
      await loadWorkspace();
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unableToContinue;
      setError(
        message === "DUPLICATE_USER"
          ? copy.duplicateUserError
          : wasRegistering && message === "INVALID_CREDENTIALS"
            ? copy.registerPhoneExistsError
            : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.clearToken();
    languageSyncedForUserIdRef.current = null;
    realtimeSocket.disconnect();
    setUser(null);
    setPassword("");
    setResetToken("");
    setDualRoleMode("CLIENT");
    setView("overview");
    // The next person to sign in on this device must not land on the
    // profile the last one was looking at.
    setViewUserId(null);
    setViewedProfileName(null);
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
        throw new Error(copy.jobErrTitleLength);
      if (jobDescription.trim().length < 20)
        throw new Error(copy.jobErrDescLength);
      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min <= 0 ||
        max < min
      )
        throw new Error(copy.jobErrBudgetRange);
      if (!jobDeadline) throw new Error(copy.jobErrChooseDeadline);
      await api.createJob({
        title: jobTitle,
        category: jobCategory,
        description: jobDescription,
        budgetMin: { amountMinor: min, currency: "ETB" },
        budgetMax: { amountMinor: max, currency: "ETB" },
        proposedMilestones: [
          {
            title: copy.initialDeliveryMilestone,
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
        withAction instanceof Error ? withAction.message : copy.unableToPublishJob,
      );
      setJobErrorNextAction(
        withAction?.nextAction?.type === "KYC" ? "verification" : null,
      );
      setError(err instanceof Error ? err.message : copy.unableToPublishJob);
    } finally {
      setIsLoading(false);
    }
  };

  const basePlatformRole = (user?.role as PlatformRole) || "CLIENT";
  const platformRole: PlatformRole =
    basePlatformRole === "BOTH" ? dualRoleMode : basePlatformRole;

  const activeAvatarOverride = useMemo(
    () => loadAvatarOverride(user?.id),
    [user?.id, avatarVersion],
  );
  const effectiveUserAvatarUrl =
    activeAvatarOverride && "avatarUrl" in activeAvatarOverride
      ? activeAvatarOverride.avatarUrl
      : user?.avatarUrl ?? null;

  /**
   * A finished profile ends the reminder for good.
   *
   * The dismissal is remembered, so it has to be forgotten when the reason
   * for the reminder disappears — otherwise an account that later filled its
   * profile in would still be carrying "do not remind me" forever.
   */
  useEffect(() => {
    if (!currentUserId) return;
    const complete =
      Boolean(effectiveUserAvatarUrl) &&
      profileCompleteness !== null &&
      profileCompleteness >= 85;
    if (!complete) return;
    window.localStorage.removeItem(profileNudgeDismissedKey(currentUserId));
  }, [currentUserId, effectiveUserAvatarUrl, profileCompleteness]);

  const { canHire, canWork, isStaff } = capabilitiesFor(platformRole);
  /* Staff are redirected into OpsConsole before render, so narrowing here is
     safe and keeps every workspace prop free of impossible ADMIN values. */
  const marketplaceRole: MarketplaceRole = isStaff
    ? "CLIENT"
    : (platformRole as MarketplaceRole);

  /* ── Sidebar activity dots ───────────────────────────────────────────────
     A tab lights a dot when something in it has not been looked at yet.
     Two signals feed it:

     1. Unread notifications routed to that view. The bell and the dots read
        one shared feed (api/notificationFeed.ts), so the badge on the bell
        and the dot on the tab can never disagree about what is unread.
     2. New briefs on the Jobs tab. The backend has no "a brief was
        published" notification type, so a per-user watermark of the newest
        brief the person has already seen stands in for one.

     Opening a view IS looking at it: its notifications are marked read and
     its watermark moves forward. So the dot always means "not looked at yet",
     never "something happened at some point". */
  const notifications = useNotifications(Boolean(user));
  const unreadByView = useUnreadByView(Boolean(user));

  /**
   * The newest brief this person has already been shown.
   *
   * The backend has no notification type for "a new brief was published", so
   * the Jobs tab tracks it on the client: a per-user timestamp of the newest
   * brief that was on screen when the person last looked. Anything published
   * after that is a brief they have not seen.
   */
  const jobsSeenKey = user?.id ? `yekis:jobs-seen-at:${user.id}` : null;
  const [jobsSeenAt, setJobsSeenAt] = useState<number | null>(null);

  useEffect(() => {
    if (!jobsSeenKey) {
      setJobsSeenAt(null);
      return;
    }
    const raw = window.localStorage.getItem(jobsSeenKey);
    const parsed = raw === null ? Number.NaN : Number(raw);
    setJobsSeenAt(Number.isFinite(parsed) ? parsed : null);
  }, [jobsSeenKey]);

  /** The publication time of the newest brief on the board. */
  const newestBriefAt = useMemo(() => {
    let newest = 0;
    for (const job of jobs) {
      const ts = job.createdAt ? Date.parse(job.createdAt) : Number.NaN;
      if (Number.isFinite(ts) && ts > newest) newest = ts;
    }
    return newest;
  }, [jobs]);

  useEffect(() => {
    if (!jobsSeenKey || !canWork) return;
    // On the Jobs tab the briefs are on screen, so the watermark moves up to
    // the newest one. Anywhere else a missing watermark is seeded once with
    // the newest brief, so the briefs that were already published do not
    // light the tab up on the first visit.
    if (view !== "jobs" && jobsSeenAt !== null) return;
    const next = newestBriefAt || Date.now();
    window.localStorage.setItem(jobsSeenKey, String(next));
    setJobsSeenAt(next);
  }, [canWork, jobsSeenAt, jobsSeenKey, newestBriefAt, view]);

  /**
   * How many briefs are newer than the watermark — the Jobs tab's dot.
   *
   * Only for people who work. A hiring-only account does not browse the
   * board for opportunities, so a brief appearing there is not news to them,
   * and their own briefs are excluded from the count as well.
   */
  const newBriefsCount = useMemo(() => {
    if (!canWork || jobsSeenAt === null || view === "jobs") return 0;
    let count = 0;
    for (const job of jobs) {
      if (job.clientId && job.clientId === user?.id) continue;
      const ts = job.createdAt ? Date.parse(job.createdAt) : Number.NaN;
      if (Number.isFinite(ts) && ts > jobsSeenAt) count += 1;
    }
    return count;
  }, [canWork, jobs, jobsSeenAt, user?.id, view]);

  /** How much unlooked-at activity a sidebar tab is holding. */
  const navActivityCount = (tabView: string): number =>
    tabView === "jobs" ? newBriefsCount : (unreadByView[tabView] ?? 0);

  // Opening a view IS looking at it: its notifications are marked read, so
  // the dot means "not looked at yet" rather than "something happened once".
  useEffect(() => {
    if (!user) return;
    void markViewNotificationsRead(view, notifications);
  }, [notifications, user, view]);

  type SidebarNavItem = {
    view: View;
    iconKey: string;
    label: string;
    group: "HIRE" | "MONEY" | "TALK" | "ACCOUNT";
  };

  const unreadMessagesCount = useMemo(
    () => conversations.filter((c) => c.unread).length,
    [conversations],
  );

  const clientHasActivity = useMemo(
    () =>
      myJobs.length > 0 ||
      contracts.length > 0 ||
      milestones.length > 0 ||
      topUps.some((t) => t.status === "APPROVED"),
    [contracts.length, milestones.length, myJobs.length, topUps],
  );

  const isZeroStateClientHome =
    view === "overview" && canHire && !canWork && !clientHasActivity;

  const navItems = useMemo<SidebarNavItem[]>(() => {
    const jobsLabel = canWork ? t.nav.findWork : t.nav.jobs;
    const jobsIconKey = canWork ? "find-work" : "jobs";
    const servicesLabel = !canWork && canHire ? copy.servicesNavLabel : t.workspace.nav.gigs;
    const hireItems: SidebarNavItem[] = [
      { view: "overview", iconKey: "overview", label: t.nav.dashboard, group: "HIRE" },
      { view: "jobs", iconKey: jobsIconKey, label: jobsLabel, group: "HIRE" },
      { view: "proposals", iconKey: "proposals", label: t.nav.proposals, group: "HIRE" },
      { view: "gigs", iconKey: "gigs", label: servicesLabel, group: "HIRE" },
      ...(canWork
        ? [{ view: "my-gigs" as View, iconKey: "gigs", label: t.workspace.nav.myGigs, group: "HIRE" as const }]
        : []),
      { view: "contracts", iconKey: "contracts", label: t.nav.contracts, group: "HIRE" },
    ];
    const moneyItems: SidebarNavItem[] = [
      { view: "escrow", iconKey: "escrow", label: t.nav.escrow, group: "MONEY" },
      { view: "wallet", iconKey: "wallet", label: t.nav.wallet, group: "MONEY" },
    ];
    const talkItems: SidebarNavItem[] = [
      { view: "chat", iconKey: "chat", label: t.workspace.nav.chat, group: "TALK" },
      {
        view: "cases",
        iconKey: "cases",
        label: isStaff ? t.workspace.nav.cases : t.nav.disputes,
        group: "TALK",
      },
    ];
    const accountItems: SidebarNavItem[] = [
      { view: "profile", iconKey: "profile", label: t.workspace.nav.profile, group: "ACCOUNT" },
      ...(!isStaff
        ? [{ view: "verification" as View, iconKey: "verification", label: t.nav.kyc, group: "ACCOUNT" as const }]
        : []),
      { view: "settings", iconKey: "settings", label: t.nav.settings, group: "ACCOUNT" },
    ];

    return [...hireItems, ...moneyItems, ...talkItems, ...accountItems];
  }, [canWork, isStaff, t]);

  const navGroupLabels: Record<"HIRE" | "MONEY" | "TALK" | "ACCOUNT", string> = {
    HIRE: canWork && !canHire ? "Work" : "Hire",
    MONEY: "Money",
    TALK: "Talk",
    ACCOUNT: "Account",
  };

  const mobileBottomNavItems = useMemo(() => {
    const preferred: View[] =
      canWork && !canHire
        ? ["overview", "jobs", "contracts", "wallet"]
        : ["overview", "jobs", "escrow", "wallet"];
    return preferred
      .map((v) => navItems.find((item) => item.view === v))
      .filter((item): item is SidebarNavItem => Boolean(item));
  }, [canHire, canWork, navItems]);

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
      home: copy.pageTitles.home,
      faq: copy.pageTitles.faq,
      fees: copy.pageTitles.fees,
      privacy: copy.pageTitles.privacy,
      terms: copy.pageTitles.terms,
      about: copy.pageTitles.about,
      "case-studies": copy.pageTitles.caseStudies,
      "404": copy.pageTitles.notFound,
      "thank-you-signup": copy.pageTitles.thankYouSignup,
      "thank-you-job-posted": copy.pageTitles.thankYouJobPosted,
      "thank-you-contact": copy.pageTitles.thankYouContact,
      telegram_auth: copy.pageTitles.telegramAuth,
    };
    document.title = pageTitles[marketingPage] || pageTitles.home;

    return (
      <>
        <MarketingHeader
          onNavigate={handleNavigate}
          onStart={handleStart}
          currentPage={marketingPage}
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
          <CaseStudiesPage onNavigate={handleNavigate} onStart={handleStart} />
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
                theme === "light" ? copy.switchToDark : copy.switchToLight
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
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
            alt={copy.yekisLogoAlt}
            className="platform-logo"
            style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 8 }}
          />
          <p className="eyebrow">{copy.heroEyebrow}</p>
          <h1>{copy.heroTitle}</h1>
          <p>
            {copy.heroSubtitle}
          </p>
          <div className="auth-proof">
            <span>01</span>
            <strong>{copy.heroProof1}</strong>
          </div>
          <div className="auth-proof">
            <span>02</span>
            <strong>{copy.heroProof2}</strong>
          </div>
          <AuthVisualAnimation />
        </div>
        {onboardingChannel ? (
          <div className="auth-panel">
            <div className="auth-panel-header">
              <div>
                <p className="eyebrow">{t.workspace.onboarding.stepsLabel}</p>
                <h2>{t.workspace.auth.createTitle}</h2>
              </div>
            </div>
            <OnboardingVerification
              channel={onboardingChannel}
              target={onboardingChannel === "email" ? email : phone}
              onVerified={() => {
                // The account is created only after the code is proven, so the
                // proof can be attached to the new row.
                setIsLoading(true);
                setError("");
                void completeRegistration()
                  .catch((err) => {
                    const code = (err as { code?: string })?.code ?? "";
                    const message =
                      err instanceof Error ? err.message : copy.unableToContinue;
                    if (code === "EMAIL_IN_USE" || code === "PHONE_IN_USE") {
                      setOnboardingChannel(null);
                      setError(message);
                      return;
                    }
                    setError(
                      message === "INVALID_CREDENTIALS"
                        ? copy.registerPhoneExistsError
                        : message,
                    );
                  })
                  .finally(() => setIsLoading(false));
              }}
              onAlreadyRegistered={(msg) => {
                setOnboardingChannel(null);
                setError(msg);
              }}
              onBack={() => {
                setOnboardingChannel(null);
                setError("");
              }}
              onSkip={() => {
                // The escape hatch: a hard gate with no way through is a
                // support queue rather than a security control.
                setOnboardingChannel(null);
                setError("");
                setIsLoading(true);
                void completeRegistration()
                  .catch((err) => {
                    const message =
                      err instanceof Error ? err.message : copy.unableToContinue;
                    setError(message);
                  })
                  .finally(() => setIsLoading(false));
              }}
            />
            {error && <div className="form-error">{error}</div>}
          </div>
        ) : (
        <form className="auth-panel" onSubmit={submitAuth}>
          <div className="auth-panel-header">
            <div>
              <p className="eyebrow">
                {authMode === "login"
                  ? t.workspace.auth.welcomeBack
                  : authMode === "forgot-password"
                    ? t.workspace.auth.recoverAccount
                    : authMode === "reset-password"
                      ? t.workspace.auth.setNewPassword
                      : t.workspace.auth.getStarted}
              </p>
              <h2>
                {authMode === "login"
                  ? t.workspace.auth.signInTitle
                  : authMode === "forgot-password"
                    ? t.workspace.auth.forgotTitle
                    : authMode === "reset-password"
                      ? t.workspace.auth.resetTitle
                      : t.workspace.auth.createTitle}
              </h2>
            </div>
          </div>
          {authMode === "register" && (
            <div className="segmented-control" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <button
                type="button"
                className={role === "CLIENT" ? "selected" : ""}
                onClick={() => setRole("CLIENT")}
              >
                {t.workspace.roles.client}
              </button>
              <button
                type="button"
                className={role === "FREELANCER" ? "selected" : ""}
                onClick={() => setRole("FREELANCER")}
              >
                {t.workspace.roles.freelancer}
              </button>
              <button
                type="button"
                className={role === "BOTH" ? "selected" : ""}
                onClick={() => setRole("BOTH")}
                title={copy.bothRoleTitle}
              >
                {t.workspace.roles.both}
              </button>
            </div>
          )}
          {(authMode === "login" ||
            authMode === "register" ||
            authMode === "forgot-password") && (
            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              {authMode === "login"
                ? `${t.workspace.auth.emailLabel} / ${t.workspace.auth.phoneLabel}`
                : t.workspace.auth.emailLabel}
              <input
                // The sign-in field takes an address OR a number: the API
                // accepts either as the identifier, and the backend
                // normalises a number to +251… before it looks the account
                // up. `type="email"` refused a number in the browser's own
                // validation, so the request never left the page.
                type={authMode === "login" ? "text" : "email"}
                autoComplete={authMode === "login" ? "username" : "email"}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={
                  authMode === "login"
                    ? copy.loginIdentifierPlaceholder
                    : copy.emailPlaceholder
                }
                required
                style={{ padding: "8px 12px", marginTop: "3px", fontSize: "0.88rem", borderRadius: "8px" }}
              />
            </label>
          )}
          {authMode === "register" && (
            <div
              className="auth-row-split"
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gap: "10px",
                marginTop: "4px",
              }}
            >
              <label style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600 }}>
                {t.workspace.auth.phoneLabel}
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+251911223344"
                  required
                  style={{ padding: "8px 12px", marginTop: "3px", fontSize: "0.88rem", borderRadius: "8px" }}
                />
              </label>
              <label style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600 }}>
                {t.workspace.auth.dobLabel}
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
              {t.workspace.auth.resetTokenLabel}
              <input
                type="text"
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                placeholder={copy.resetTokenPlaceholder}
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
                  {authMode === "reset-password"
                    ? t.workspace.auth.newPasswordLabel
                    : t.workspace.auth.passwordLabel}
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
                    {t.workspace.auth.forgotPasswordBtn}
                  </button>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={copy.passwordPlaceholder}
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
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
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
                    {copy.agreePrefix}
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
                      {copy.termsLink}
                    </button>
                    {copy.andSeparator}
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
                      {copy.privacyLink}
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
                  title={copy.customizePrefsTitle}
                >
                  {showCookiePrefs ? copy.optionsOpen : copy.optionsClosed}
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
                    {copy.optionalPrefsHeading}
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
                    <span>{copy.optPlatformAlerts}</span>
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
                    <span>{copy.optMarketing}</span>
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
                    <span>{copy.optTelemetry}</span>
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
          {authMode === "register" && (
            <p className="auth-verify-hint">
              {t.workspace.onboarding.verifyHint}
            </p>
          )}
          <button
            className="btn-primary wide"
            disabled={isLoading || (authMode === "register" && !termsAccepted)}
            style={{ marginTop: "14px", padding: "11px", fontSize: "0.92rem" }}
          >
            {isLoading
              ? t.marketing.auth.pleaseWait
              : authMode === "login"
                ? t.marketing.auth.signIn
                : authMode === "forgot-password"
                  ? t.workspace.auth.requestResetBtn
                  : authMode === "reset-password"
                    ? t.workspace.auth.setPasswordBtn
                    : t.marketing.auth.createAccount}
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
              setOnboardingChannel(null);
            }}
          >
            {authMode === "login"
              ? t.marketing.auth.newToYekis
              : t.marketing.auth.alreadyAccount}
          </button>
        </form>
        )}

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
                  {legalModal === "terms" ? copy.termsModalTitle : copy.privacyModalTitle}
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
                  aria-label={copy.closeModalAria}
                >
                  <X size={20} />
                </button>
              </div>

              {legalModal === "terms" ? (
                <div style={{ fontSize: "0.86rem", lineHeight: 1.55, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0 }}>{copy.termsModalIntro}</p>
                  {copy.termsClauses.map((clause) => (
                    <div key={clause.title}>
                      <strong style={{ color: "var(--color-text)" }}>{clause.title}</strong>
                      <p style={{ margin: "2px 0 0" }}>{clause.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.86rem", lineHeight: 1.55, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0 }}>{copy.privacyModalIntro}</p>
                  {copy.privacyClauses.map((clause) => (
                    <div key={clause.title}>
                      <strong style={{ color: "var(--color-text)" }}>{clause.title}</strong>
                      <p style={{ margin: "2px 0 0" }}>{clause.body}</p>
                    </div>
                  ))}
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
                  {copy.agreeBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  const activeGuideModule: GuideModuleId =
    view === "my-gigs"
      ? "gigs"
      : view === "profile-edit"
        ? "profile"
        : view === "jobs" && jobsTab === "proposals"
          ? "proposals"
          : view === "contracts" && contractsTab === "payments"
            ? "escrow"
            : view === "contracts" && contractsTab === "disputes"
              ? "cases"
              : view;
  const activeGuideRole: GuideRole =
    platformRole === "FREELANCER" ? "FREELANCER" : "CLIENT";

  const handlePrepareDashboardSubView = (action: DashboardSubViewAction) => {
    if (action === "dashboard-analytics") {
      setDashboardVariant("dashboard-1");
      return;
    }
    setDashboardVariant("dashboard-2");
    if (action === "dashboard-table") setOpsSubTab("table");
    if (action === "dashboard-kanban") setOpsSubTab("kanban");
    if (action === "dashboard-calendar") setOpsSubTab("calendar");
  };

  const handleContactSupportFromGuide = () => {
    setMobileDrawerOpen(false);
    setView("chat");
  };

  return (
    <GuideProvider
      userId={user?.id ?? null}
      tenantId={user?.id ?? null}
      activeModule={activeGuideModule}
      role={activeGuideRole}
      onNavigateModule={(mod) => navigateToView(mod as View)}
      onPrepareDashboardSubView={handlePrepareDashboardSubView}
      onContactSupport={handleContactSupportFromGuide}
    >
      <div
        className={`platform-shell sh-shell sh-workspace-shell sh-variant-${sidebarVariant}${sidebarCollapsed && !isMobileViewport ? " sh-collapsed sh-sidebar-collapsed" : ""}`}
      >
      {mobileDrawerOpen && (
        <div
          className="sh-mobile-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        id="workspace-mobile-drawer"
        className={`platform-sidebar${mobileDrawerOpen ? " mobile-open" : ""}`}
        aria-label={copy.workspaceNavAria}
      >
        <div className="sidebar-brand-row">
          <button
            type="button"
            className="sidebar-brand"
            onClick={() => {
              setView("overview");
              setMobileDrawerOpen(false);
            }}
            title={copy.brandOverviewAria}
            aria-label={copy.brandOverviewAria}
          >
            <img
              src="/svgviewer-output.svg"
              alt={copy.yekisLogoAlt}
              className="sidebar-brand-logo"
              referrerPolicy="no-referrer"
            />
            {(!sidebarCollapsed || isMobileViewport) && (
              <strong className="sidebar-brand-name">Yekis</strong>
            )}
          </button>
          {/* Sidebar toggle lives here — collapses on desktop, closes drawer on mobile */}
          <button
            type="button"
            className="sh-icon-only-btn sidebar-brand-toggle"
            onClick={() =>
              isMobileViewport
                ? setMobileDrawerOpen(false)
                : toggleSidebarCollapsed()
            }
            aria-expanded={isMobileViewport ? mobileDrawerOpen : !sidebarCollapsed}
            aria-controls="workspace-mobile-drawer"
            title={
              isMobileViewport
                ? copy.closeDrawerAria
                : sidebarCollapsed
                  ? copy.expandSidebarAria
                  : copy.collapseSidebarAria
            }
            aria-label={
              isMobileViewport
                ? copy.closeDrawerAria
                : sidebarCollapsed
                  ? copy.expandSidebarAria
                  : copy.collapseSidebarAria
            }
          >
            {isMobileViewport ? (
              <X size={16} />
            ) : sidebarCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>
        {isMobileViewport && basePlatformRole === "BOTH" && (
          <div className="sh-mobile-drawer-role-switch">
            <span className="sh-customizer-label">{copy.workspaceModeLabel}</span>
            <div className="sh-segmented" role="group" aria-label={copy.switchModeAria} style={{ width: "100%" }}>
              <button
                type="button"
                className={`sh-seg-btn ${dualRoleMode === "CLIENT" ? "active" : ""}`}
                aria-pressed={dualRoleMode === "CLIENT"}
                style={{ flex: 1 }}
                onClick={() => switchDualRoleMode("CLIENT")}
              >
                {t.workspace.roles.modeClient}
              </button>
              <button
                type="button"
                className={`sh-seg-btn ${dualRoleMode === "FREELANCER" ? "active" : ""}`}
                aria-pressed={dualRoleMode === "FREELANCER"}
                style={{ flex: 1 }}
                onClick={() => switchDualRoleMode("FREELANCER")}
              >
                {t.workspace.roles.modeFreelancer}
              </button>
            </div>
          </div>
        )}
        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {(["HIRE", "MONEY", "TALK", "ACCOUNT"] as const).map((groupKey) => {
            const groupItems = navItems.filter((item) => item.group === groupKey);
            if (groupItems.length === 0) return null;
            return (
              <div key={groupKey} className="sidebar-nav-group">
                {(!sidebarCollapsed || isMobileViewport) && (
                  <div className="sidebar-group-label">
                    {navGroupLabels[groupKey]}
                  </div>
                )}
                {groupItems.map((item) => {
                  const activity = navActivityCount(item.view);
                  const activityLabel =
                    activity > 0
                      ? t.workspace.nav.newActivity.replace("{count}", String(activity))
                      : "";
                  return (
                    <button
                      key={item.view}
                      type="button"
                      className={
                        view === item.view &&
                        !(item.view === "profile" && !viewingOwnProfile)
                          ? "active"
                          : ""
                      }
                      onClick={() => {
                        if (item.view === "profile") {
                          openMyProfile();
                        } else {
                          setView(item.view);
                        }
                        setMobileDrawerOpen(false);
                      }}
                      title={activityLabel ? `${item.label} — ${activityLabel}` : item.label}
                      aria-label={
                        activityLabel ? `${item.label} — ${activityLabel}` : undefined
                      }
                    >
                      <span className="nav-icon">
                        {navIconMap[item.iconKey]}
                        {activity > 0 && <span className="nav-dot" aria-hidden="true" />}
                      </span>
                      <span className="nav-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot workspace-sidebar-foot">
          <div className="user-chip">
            <button
              type="button"
              className="user-chip-main"
              onClick={() => {
                openMyProfile();
                setMobileDrawerOpen(false);
              }}
              title={`${roleLabel(platformRole, language)} — ${user.email}`}
              aria-label={copy.viewProfileAria(roleLabel(platformRole, language), user.email ?? "")}
            >
              <span className="avatar yk-chip-avatar">
                <YekisAvatar
                  userId={user.id}
                  email={user.email}
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                  size={34}
                  animate="hover"
                />
              </span>
              {(!sidebarCollapsed || isMobileViewport) && (
                <span className="user-chip-id">
                  <span className="nm">
                    {user.displayName?.trim() || roleLabel(platformRole, language)}
                  </span>
                  <span
                    className="em"
                    title={
                      user.email
                        ? `${roleLabel(platformRole, language)} · ${user.email}`
                        : roleLabel(platformRole, language)
                    }
                  >
                    {user.email || roleLabel(platformRole, language)}
                  </span>
                </span>
              )}
            </button>
            {(!sidebarCollapsed || isMobileViewport) && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  logout();
                }}
                title={t.nav.signOut}
                aria-label={t.nav.signOut}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="platform-main">
        <header className="platform-topbar sh-topbar">
          <div className="sh-topbar-left">
            {/* Mobile drawer control; desktop collapse/expand stays in the sidebar brand row */}
            {isMobileViewport && (
              <button
                type="button"
                className="sh-icon-only-btn sh-topbar-menu-btn"
                onClick={() => setMobileDrawerOpen((prev) => !prev)}
                aria-expanded={mobileDrawerOpen}
                aria-controls="workspace-mobile-drawer"
                title={copy.openDrawerAria}
                aria-label={copy.openDrawerAria}
              >
                <Menu size={17} />
              </button>
            )}
            {/* Show back button and breadcrumb only on detail sub-views */}
            {((view === "profile" && !viewingOwnProfile) ||
              view === "profile-edit") && (
              <button
                type="button"
                className="sh-icon-only-btn sh-topbar-back-btn"
                onClick={handleUniversalBack}
                title={copy.goBackAria}
                aria-label={copy.goBackAria}
              >
                <ArrowLeft size={17} />
              </button>
            )}
            <div className="sh-breadcrumb">
              {((view === "profile" && !viewingOwnProfile) ||
                view === "profile-edit") && (
                <>
                  <span className="sh-breadcrumb-muted">
                    {roleLabel(platformRole, language)} {t.workspace.nav.workspaceLabel}
                  </span>
                  <span className="sh-breadcrumb-sep">/</span>
                </>
              )}
              <strong className="sh-breadcrumb-current">
                {view === "overview"
                  ? t.workspace.nav.overview
                  : view === "profile" && !viewingOwnProfile
                    ? viewedProfileName || t.workspace.profile.memberProfileLabel
                    : view === "profile-edit"
                      ? t.workspace.profile.editHeading
                      : navItems.find((item) => item.view === view)?.label ||
                        t.nav.settings}
              </strong>
            </div>
          </div>

          <div
            className="topbar-actions sh-topbar-right"
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <WorkspaceCommandPalette
              onNavigateView={(v) => navigateToView(v as View)}
              onSwitchRoleMode={basePlatformRole === "BOTH" ? switchDualRoleMode : undefined}
              currentRole={platformRole}
            />

            {basePlatformRole === "BOTH" && (
              <div
                className="sh-segmented"
                role="group"
                aria-label={copy.switchModeAria}
                title={copy.switchModeTitle}
              >
                <button
                  type="button"
                  className={`sh-seg-btn ${dualRoleMode === "CLIENT" ? "active" : ""}`}
                  aria-pressed={dualRoleMode === "CLIENT"}
                  onClick={() => switchDualRoleMode("CLIENT")}
                >
                  {t.workspace.roles.modeClient}
                </button>
                <button
                  type="button"
                  className={`sh-seg-btn ${dualRoleMode === "FREELANCER" ? "active" : ""}`}
                  aria-pressed={dualRoleMode === "FREELANCER"}
                  onClick={() => switchDualRoleMode("FREELANCER")}
                >
                  {t.workspace.roles.modeFreelancer}
                </button>
              </div>
            )}

            <LanguageSelector variant="dropdown" />
            <button
              type="button"
              className="sh-icon-only-btn theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? copy.switchToDark
                  : copy.switchToLight
              }
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <NotificationCenter onNavigate={(v) => navigateToView(v as View)} />
            <GlobalHelpMenu />
            <span
              className={`sh-kyc-header-link sh-kyc-plain-status ${
                user.kyc?.status === "VERIFIED" ? "is-verified" : "is-required"
              }`}
              title={
                user.kyc?.status === "VERIFIED"
                  ? copy.kycVerifiedTooltip
                  : copy.kycVerifyTooltip
              }
            >
              {user.kyc?.status === "VERIFIED" ? (
                <ShieldCheck size={14} aria-hidden="true" />
              ) : (
                <ShieldAlert size={14} aria-hidden="true" />
              )}
              <span>
                {user.kyc?.status === "VERIFIED"
                  ? copy.kycStatusVerified
                  : copy.kycStatusRequired}
              </span>
            </span>
            <button
              type="button"
              className="user-menu"
              onClick={openMyProfile}
              title={`${user.displayName?.trim() || roleLabel(platformRole, language)} — ${user.email}`}
              aria-label={copy.openProfileAria(user.email ?? "")}
            >
              <span className="avatar yk-topbar-avatar">
                <YekisAvatar
                  userId={user.id}
                  email={user.email}
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                  size={32}
                  animate="hover"
                />
              </span>
            </button>
          </div>
        </header>

        {/*
          The reminder banner.

          It waits on purpose: it only appears once the person has been in
          the platform a while or has opened a second view, so it never
          greets someone who has just arrived and has not looked at anything
          yet. It also stays out of the profile section itself — that is
          where the work is done, and a banner about it there is noise.
        */}
        {view !== "profile-edit" &&
          view !== "profile" &&
          profileNudgeArmed &&
          !profileNudgeDismissed &&
          (!effectiveUserAvatarUrl ||
            (profileCompleteness !== null && profileCompleteness < 85)) && (
            <div className="sh-profile-setup-banner" role="region" aria-label={copy.completeProfileAria}>
              <div className="sh-profile-setup-left">
                <div className="sh-profile-setup-avatar-wrap">
                  <YekisAvatar
                    userId={user.id}
                    email={user.email}
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                    size={44}
                    animate="hover"
                  />
                  <span className="sh-profile-setup-cam" aria-hidden="true">
                    <Camera size={12} />
                  </span>
                </div>
                <div className="sh-profile-setup-copy">
                  <div className="sh-profile-setup-title-row">
                    <strong>{copy.finishProfileTitle}</strong>
                    <span className="sh-profile-setup-badge sh-mono">
                      {copy.percentComplete(profileCompleteness ?? user.profileCompleteness ?? 75)}
                    </span>
                  </div>
                  <p>
                    {copy.finishProfileDesc}
                  </p>
                </div>
              </div>
              <div className="sh-profile-setup-actions">
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() =>
                    hashNavigate(`/${view}`, {
                      replace: true,
                      state: {
                        ...hashLocation.state,
                        showProfileCompletion: true,
                      },
                    })
                  }
                >
                  {copy.viewChecklistBtn}
                </button>
                <button
                  type="button"
                  className="sh-btn sh-btn-primary"
                  onClick={() => setView("profile-edit")}
                >
                  <Camera size={14} /> {copy.editProfileBtn}
                </button>
                <button
                  type="button"
                  className="sh-icon-only-btn"
                  onClick={dismissProfileNudge}
                  title={copy.dismissBannerTitle}
                  aria-label={copy.dismissBannerAria}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

        {!isZeroStateClientHome && <FirstVisitWelcomeBar />}

        <ProfileCompletionDialog
          user={user}
          role={platformRole}
          onSaved={() => void loadWorkspace()}
          onOpenFullEditor={() => setView("profile-edit")}
        />

        {view === "overview" && (
          <div className="sh-workspace-view">
            <MarketplaceShadcnDashboard
              userId={user.id}
              kycVerified={user.kyc?.status === "VERIFIED"}
              kycStatus={user.kyc?.status ?? "NOT_STARTED"}
              proposalsCount={myJobs.reduce((sum, j) => sum + (j.proposalsCount ?? 0), 0)}
              unreadMessagesCount={unreadMessagesCount}
              lastUpdatedAt={lastUpdatedAt}
              workspaceError={error || null}
              wallet={wallet}
              jobs={jobs}
              myJobs={myJobs}
              contracts={contracts}
              milestones={milestones}
              topUps={topUps}
              feeConfig={feeConfig}
              canHire={canHire}
              canWork={canWork}
              viewerRole={
                platformRole === "ADMIN"
                  ? "ADMIN"
                  : canHire && !canWork
                    ? "CLIENT"
                    : "FREELANCER"
              }
              isRefreshing={isRefreshing}
              onRefresh={() => void refreshDashboard()}
              onNavigateView={(v) => navigateToView(v as View)}
              onOpenEscrow={(milestoneId) => {
                if (milestoneId) {
                  const found = milestones.find((m) => m.id === milestoneId);
                  setFocusContractId(found?.contractId ?? null);
                } else {
                  setFocusContractId(null);
                }
                setView("escrow");
              }}
              onOpenContract={(contractId) => {
                setFocusContractId(contractId || null);
                setView("contracts");
              }}
              onFundMilestone={async (milestoneId) => {
                await api.fundMilestoneFromWallet(milestoneId);
                await loadWorkspace();
              }}
              onSelectProfile={(id) => openProfileOf(id)}
              onOpenChat={(id, name) => void openChatWithUser(id, name)}
            />
          </div>
        )}

        {(view === "jobs" || view === "proposals") && (() => {
          const activeJobsTab: JobsTabKey =
            view === "proposals" ? "proposals" : jobsTab;
          const proposalsCount = myJobs.reduce(
            (sum, j) => sum + (j.proposalsCount ?? 0),
            0,
          );
          const selectJobsTab = (nextTab: JobsTabKey) => {
            setJobsTab(nextTab);
            if (view === "proposals") setView("jobs");
          };
          const handleJobsTabKeyDown = (
            event: React.KeyboardEvent<HTMLDivElement>,
          ) => {
            if (
              event.key === "ArrowRight" ||
              event.key === "ArrowLeft" ||
              event.key === "Home" ||
              event.key === "End"
            ) {
              event.preventDefault();
              const nextTab: JobsTabKey =
                event.key === "Home"
                  ? "jobs"
                  : event.key === "End"
                    ? "proposals"
                    : activeJobsTab === "jobs"
                      ? "proposals"
                      : "jobs";
              selectJobsTab(nextTab);
              const nextId =
                nextTab === "jobs" ? "jobs-tab-overview" : "jobs-tab-proposals";
              document.getElementById(nextId)?.focus();
            }
          };
          return (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {activeJobsTab === "proposals"
                    ? canHire && canWork
                      ? copy.proposalsTitleBoth
                      : canHire
                        ? copy.proposalsTitleHire
                        : copy.proposalsTitleWork
                    : canHire && canWork
                      ? copy.jobsTitleBoth
                      : canHire
                        ? copy.jobsTitleHire
                        : copy.jobsTitleWork}
                </h2>
                <p className="sh-card-desc">
                  {activeJobsTab === "proposals"
                    ? canHire && canWork
                      ? copy.proposalsDescBoth
                      : canHire
                        ? copy.proposalsDescHire
                        : copy.proposalsDescWork
                    : canHire && canWork
                      ? copy.jobsDescBoth
                      : canHire
                        ? copy.jobsDescHire
                        : copy.jobsDescWork}
                </p>
              </div>
              <span className="sh-kbd">{copy.openBriefsCount(jobs.length)}</span>
            </div>

            <div
              className="sh-workspace-tablist"
              role="tablist"
              aria-label={copy.jobsTabsAria}
              onKeyDown={handleJobsTabKeyDown}
            >
              <button
                type="button"
                id="jobs-tab-overview"
                role="tab"
                aria-selected={activeJobsTab === "jobs"}
                tabIndex={activeJobsTab === "jobs" ? 0 : -1}
                className="sh-workspace-tab"
                onClick={() => selectJobsTab("jobs")}
              >
                <span>
                  {canHire ? copy.jobsTabMyJobs : copy.jobsTabFindWork}
                </span>
              </button>
              <button
                type="button"
                id="jobs-tab-proposals"
                role="tab"
                aria-selected={activeJobsTab === "proposals"}
                tabIndex={activeJobsTab === "proposals" ? 0 : -1}
                className="sh-workspace-tab"
                onClick={() => selectJobsTab("proposals")}
              >
                <span>{copy.jobsTabProposals}</span>
                {(proposalsCount > 0 || (unreadByView.proposals ?? 0) > 0) && (
                  <span className="sh-workspace-tab-count">
                    ({Math.max(proposalsCount, unreadByView.proposals ?? 0)})
                  </span>
                )}
              </button>
            </div>

            {activeJobsTab === "jobs" ? (
              <div
                role="tabpanel"
                aria-labelledby="jobs-tab-overview"
                className="sh-workspace-tabpanel"
              >
                {canHire && (
                  <form
                    className="sh-card job-form"
                    onSubmit={submitJob}
                    data-tour="jobs-publish-form"
                  >
                    <div className="sh-card-header">
                      <div>
                        <div className="yk-help-heading-row">
                          <h3 className="sh-card-title">{copy.publishBriefTitle}</h3>
                          <ContextualHelpTrigger helpId="jobs-brief-publishing" />
                        </div>
                        <p className="sh-card-desc">
                          {copy.publishBriefDesc}
                        </p>
                      </div>
                      <span className="sh-kbd">{copy.escrowProtectedBadge}</span>
                    </div>
                    {user.kyc?.status !== "VERIFIED" && (
                      <div className="sh-pending-banner" role="alert" style={{ marginBottom: 14 }}>
                        <ShieldCheck size={16} />
                        <span style={{ flex: 1 }}>
                          <strong>{copy.jobKycGateTitle}</strong>{" "}
                          {user.kyc?.status === "UNDER_REVIEW"
                            ? copy.jobKycGateReview
                            : copy.jobKycGateAction}
                        </span>
                        <button
                          type="button"
                          className="sh-btn sh-btn-secondary"
                          onClick={() => navigateToView("verification")}
                        >
                          {copy.verifyIdentityBtn}
                        </button>
                      </div>
                    )}
                    <div className="form-grid">
                      <label className="form-span-2">
                        {copy.briefTitleLabel}
                        <input
                          value={jobTitle}
                          onChange={(event) => setJobTitle(event.target.value)}
                          placeholder={copy.briefTitlePlaceholder}
                          required
                        />
                      </label>
                      <label>
                        {copy.categoryLabel}
                        <select
                          value={jobCategory}
                          onChange={(event) => setJobCategory(event.target.value)}
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {localizedCategoryLabels[category] ?? categoryLabels[category]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="form-wide">
                        {copy.scopeLabel}
                        <textarea
                          value={jobDescription}
                          onChange={(event) =>
                            setJobDescription(event.target.value)
                          }
                          placeholder={copy.scopePlaceholder}
                          minLength={20}
                          required
                        />
                      </label>
                      <label>
                        {copy.minBudgetLabel}
                        <input
                          type="number"
                          value={jobBudgetMin}
                          onChange={(event) => setJobBudgetMin(event.target.value)}
                          placeholder="45000"
                          required
                        />
                      </label>
                      <label>
                        {copy.maxBudgetLabel}
                        <input
                          type="number"
                          value={jobBudgetMax}
                          onChange={(event) => setJobBudgetMax(event.target.value)}
                          placeholder="85000"
                          required
                        />
                      </label>
                      <label>
                        {copy.targetDeadlineLabel}
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
                            onClick={() => navigateToView("verification")}
                          >
                            {copy.verifyIdentityBtn}
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="sh-btn sh-btn-primary"
                        disabled={isLoading || user.kyc?.status !== "VERIFIED"}
                      >
                        {user.kyc?.status === "VERIFIED"
                          ? copy.publishBriefBtn
                          : copy.publishLockedBtn}
                      </button>
                    </div>
                  </form>
                )}
                <JobsWorkspace
                  role={marketplaceRole}
                  openJobs={jobs}
                  onChanged={loadWorkspace}
                  categories={categories}
                  categoryLabels={localizedCategoryLabels}
                  section="jobs"
                  onBrowseJobs={() => selectJobsTab("jobs")}
                  onOpenChat={(id, name) => void openChatWithUser(id, name)}
                />
              </div>
            ) : (
              <div
                role="tabpanel"
                aria-labelledby="jobs-tab-proposals"
                className="sh-workspace-tabpanel"
              >
                <JobsWorkspace
                  role={marketplaceRole}
                  openJobs={jobs}
                  onChanged={loadWorkspace}
                  categories={categories}
                  categoryLabels={localizedCategoryLabels}
                  section="proposals"
                  onBrowseJobs={() => selectJobsTab("jobs")}
                  onOpenChat={(id, name) => void openChatWithUser(id, name)}
                />
              </div>
            )}
          </section>
          );
        })()}

        {view === "gigs" && (
          <section className="sh-dashboard-wrap">
            <GigMarketplace
              onOpenChat={(id, name) => void openChatWithUser(id, name)}
            />
          </section>
        )}
        {view === "my-gigs" && (
          <section className="sh-dashboard-wrap">
            <GigSellerDashboard />
          </section>
        )}

        {(view === "contracts" || view === "escrow" || view === "cases") && (() => {
          const activeContractsTab: ContractsTabKey =
            view === "escrow"
              ? "payments"
              : view === "cases"
                ? "disputes"
                : contractsTab;
          const selectContractsTab = (nextTab: ContractsTabKey) => {
            setContractsTab(nextTab);
            if (view === "escrow" || view === "cases") {
              setView("contracts");
            }
          };
          const handleContractsTabKeyDown = (
            event: React.KeyboardEvent<HTMLDivElement>,
          ) => {
            const order: ContractsTabKey[] = ["overview", "payments", "disputes"];
            const currentIdx = order.indexOf(activeContractsTab);
            let nextIdx = -1;
            if (event.key === "ArrowRight") nextIdx = (currentIdx + 1) % order.length;
            if (event.key === "ArrowLeft")
              nextIdx = (currentIdx - 1 + order.length) % order.length;
            if (event.key === "Home") nextIdx = 0;
            if (event.key === "End") nextIdx = order.length - 1;
            if (nextIdx >= 0) {
              event.preventDefault();
              const nextTab = order[nextIdx];
              selectContractsTab(nextTab);
              document.getElementById(`contracts-tab-${nextTab}`)?.focus();
            }
          };
          return (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <div className="yk-help-heading-row">
                  <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                    {activeContractsTab === "payments"
                      ? t.escrow.title
                      : activeContractsTab === "disputes"
                        ? copy.casesTitle
                        : copy.contractsTitle}
                  </h2>
                  {activeContractsTab === "disputes" && (
                    <ContextualHelpTrigger helpId="disputes-resolution" />
                  )}
                </div>
                <p className="sh-card-desc">
                  {activeContractsTab === "payments"
                    ? copy.escrowDesc
                    : activeContractsTab === "disputes"
                      ? copy.casesDesc
                      : copy.contractsDesc}
                </p>
              </div>
              <span className="sh-kbd">
                {activeContractsTab === "payments"
                  ? copy.autoReleaseBadge
                  : activeContractsTab === "disputes"
                    ? copy.threeStageEscrowBadge
                    : copy.aaccsaBadge}
              </span>
            </div>

            <div
              className="sh-workspace-tablist"
              role="tablist"
              aria-label={copy.contractsTabsAria}
              onKeyDown={handleContractsTabKeyDown}
            >
              <button
                type="button"
                id="contracts-tab-overview"
                role="tab"
                aria-selected={activeContractsTab === "overview"}
                tabIndex={activeContractsTab === "overview" ? 0 : -1}
                className="sh-workspace-tab"
                onClick={() => selectContractsTab("overview")}
              >
                <span>{copy.contractsTabOverview}</span>
              </button>
              <button
                type="button"
                id="contracts-tab-payments"
                role="tab"
                aria-selected={activeContractsTab === "payments"}
                tabIndex={activeContractsTab === "payments" ? 0 : -1}
                className="sh-workspace-tab"
                onClick={() => selectContractsTab("payments")}
              >
                <span>{copy.contractsTabPayments}</span>
                {(unreadByView.escrow ?? 0) > 0 && (
                  <span className="sh-workspace-tab-count">
                    ({unreadByView.escrow})
                  </span>
                )}
              </button>
              <button
                type="button"
                id="contracts-tab-disputes"
                role="tab"
                aria-selected={activeContractsTab === "disputes"}
                tabIndex={activeContractsTab === "disputes" ? 0 : -1}
                className="sh-workspace-tab"
                onClick={() => selectContractsTab("disputes")}
              >
                <span>{copy.contractsTabDisputes}</span>
                {(unreadByView.cases ?? 0) > 0 && (
                  <span className="sh-workspace-tab-count">
                    ({unreadByView.cases})
                  </span>
                )}
              </button>
            </div>

            {activeContractsTab === "overview" && (
              <div
                role="tabpanel"
                aria-labelledby="contracts-tab-overview"
                className="sh-workspace-tabpanel"
              >
                <ContractsWorkspace
                  userId={user.id}
                  onChanged={loadWorkspace}
                  focusContractId={focusContractId}
                  feeConfig={feeConfig}
                  onOpenEscrow={(contractId) => {
                    setFocusContractId(contractId || null);
                    selectContractsTab("payments");
                  }}
                  onOpenChat={(conversationId) => {
                    setFocusChatConversationId(conversationId);
                    navigateToView("chat");
                  }}
                />
              </div>
            )}

            {activeContractsTab === "payments" && (
              <div
                role="tabpanel"
                aria-labelledby="contracts-tab-payments"
                className="sh-workspace-tabpanel"
              >
                <EscrowWorkspace
                  userId={user.id}
                  onChanged={loadWorkspace}
                  focusContractId={focusContractId}
                  feeConfig={feeConfig}
                  onOpenContract={(contractId) => {
                    if (!contractId) {
                      setFocusContractId(null);
                    } else {
                      setFocusContractId(contractId);
                      selectContractsTab("overview");
                    }
                  }}
                />
              </div>
            )}

            {activeContractsTab === "disputes" && (
              <div
                role="tabpanel"
                aria-labelledby="contracts-tab-disputes"
                className="sh-workspace-tabpanel"
              >
                <DisputesWorkspace />
              </div>
            )}
          </section>
          );
        })()}

        {view === "wallet" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {copy.walletTitle}
                </h2>
                <p className="sh-card-desc">
                  {copy.walletDesc}
                </p>
              </div>
              <span className="sh-kbd sh-tabular">
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
              initialConversationId={focusChatConversationId}
            />
          </section>
        )}

        {view === "verification" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {t.workspace.kycFlow.verifyHeading}
                </h2>
                <p className="sh-card-desc">
                  {t.workspace.kycFlow.progressionTitle}
                </p>
              </div>
              <span className="sh-kbd">
                {(t.workspace.statuses as Record<string, string>)[user.kyc?.tier ?? "TIER_2"] ?? user.kyc?.tier ?? "TIER_2"}{" "}
                ·{" "}
                {(t.workspace.statuses as Record<string, string>)[user.kyc?.status ?? "VERIFIED"] ?? user.kyc?.status ?? "VERIFIED"}
              </span>
            </div>
            <BrowserVerification />
          </section>
        )}

        {view === "profile" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {viewingOwnProfile
                    ? t.workspace.profile.publicHeading
                    : viewedProfileName || t.workspace.profile.memberProfileLabel}
                </h2>
                <p className="sh-card-desc">
                  {t.workspace.profile.publicDesc}
                </p>
              </div>
            </div>
            <ProfilePage
              userId={viewUserId || user.id}
              onProfileLoaded={(loaded) =>
                // A profile with no display name reports an empty string.
                // Keep that out of the heading, so the generic label stands
                // in until the person has a name.
                setViewedProfileName(loaded.displayName || null)
              }
              onOpenChat={(id, name) => void openChatWithUser(id, name)}
              onEditProfile={
                viewingOwnProfile ? () => setView("profile-edit") : undefined
              }
            />
          </section>
        )}

        {view === "profile-edit" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {t.workspace.profile.editHeading}
                </h2>
                <p className="sh-card-desc">
                  {t.workspace.profile.editDesc}
                </p>
              </div>
              <button
                className="sh-btn sh-btn-secondary"
                onClick={openMyProfile}
              >
                <ArrowLeft size={14} /> {t.workspace.profile.backToProfileBtn}
              </button>
            </div>
            <ProfileEditPage
              role={platformRole}
              onSaved={() => void loadWorkspace()}
            />
          </section>
        )}

        {view === "settings" && (
          <section className="sh-dashboard-wrap">
            <div className="sh-card-header">
              <div>
                <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
                  {t.workspace.settings.title}
                </h2>
                <p className="sh-card-desc">
                  {t.workspace.settings.desc}
                </p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                data-tour="settings-layout-customizer"
              >
                <LayoutCustomizerTrigger />
                <span className="sh-kbd">{user.ucid ?? "YEK-USER"}</span>
              </div>
            </div>
            <SettingsWorkspace
              user={user}
              onUserUpdated={() => void loadWorkspace()}
              onNavigateToProfileEdit={() => setView("profile-edit")}
              onNavigateToChat={() => setView("chat")}
              onLogout={logout}
            />
          </section>
        )}
      </main>

      <nav className="platform-mobile-nav" aria-label={copy.mobileNavAria}>
        {mobileBottomNavItems.map((item) => {
          // The same dot the sidebar shows, so the thumb-zone bar and the
          // drawer never disagree about what is waiting.
          const activity = navActivityCount(item.view);
          const activityLabel =
            activity > 0
              ? t.workspace.nav.newActivity.replace("{count}", String(activity))
              : "";
          return (
            <button
              key={item.view}
              type="button"
              className={view === item.view && !mobileDrawerOpen ? "active" : ""}
              onClick={() => {
                setView(item.view);
                setMobileDrawerOpen(false);
              }}
              aria-label={
                activityLabel ? `${item.label} — ${activityLabel}` : undefined
              }
            >
              <span className="nav-mobile-icon">
                {navIconMap[item.iconKey]}
                {activity > 0 && <span className="nav-dot" aria-hidden="true" />}
              </span>
              <small>{item.label}</small>
            </button>
          );
        })}
        <button
          type="button"
          className={mobileDrawerOpen ? "active" : ""}
          onClick={() => setMobileDrawerOpen((o) => !o)}
          aria-expanded={mobileDrawerOpen}
          aria-controls="workspace-mobile-drawer"
        >
          <span>
            <Menu size={18} />
          </span>
          <small>{t.workspace.nav.menu}</small>
        </button>
      </nav>
      <ProductTourOverlay />
    </div>
    </GuideProvider>
  );
}
