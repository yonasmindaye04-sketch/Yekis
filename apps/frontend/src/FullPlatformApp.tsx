// === IMPORTS ===
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type Job, type MeResponse, type Milestone, type TopUpRequest, type WalletResponse } from "./api/client";
import { LandingPage } from "./LandingPage";
import { SupportChat } from "./SupportChat";
import { StaffDashboard } from "./StaffDashboard";
import { BrowserWallet } from "./BrowserWallet";
import { BrowserVerification } from "./BrowserVerification";
import { NotificationCenter } from "./NotificationCenter";
import { ContractsWorkspace, DisputesWorkspace, JobsWorkspace } from "./WorkflowWorkspace";
import {
  LayoutDashboard, Briefcase, Search, FileText, Wallet, MessageCircle,
  ShieldCheck, Scale, Settings, ChevronDown, Plus,
  LogOut, ArrowLeft, User as UserIcon, Edit
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
import { MobileCTA } from "./MobileCTA";
import "./marketing.css";


// === INTERFACES & TYPES ===
type PlatformRole = "CLIENT" | "FREELANCER" | "ADMIN" | "MEDIATOR";
type View = "overview" | "jobs" | "contracts" | "wallet" | "chat" | "verification" | "cases" | "settings" | "profile" | "profile-edit";
type AuthMode = "login" | "register" | "forgot-password" | "reset-password";
type MarketingPage = "home" | "faq" | "fees" | "privacy" | "terms" | "about" | "case-studies" | "404" | "thank-you-signup" | "thank-you-job-posted" | "thank-you-contact";

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
  return role === "FREELANCER" ? "Freelancer" : role === "ADMIN" ? "Operations" : role === "MEDIATOR" ? "Mediator" : "Client";
}

const navIconMap: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard size={18} />,
  jobs: <Briefcase size={18} />,
  "find-work": <Search size={18} />,
  contracts: <FileText size={18} />,
  wallet: <Wallet size={18} />,
  chat: <MessageCircle size={18} />,
  verification: <ShieldCheck size={18} />,
  cases: <Scale size={18} />,
  profile: <UserIcon size={18} />,
};

export function FullPlatformApp() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [showLanding, setShowLanding] = useState(true);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+251");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CLIENT" | "FREELANCER">("CLIENT");
  const [dateOfBirth, setDateOfBirth] = useState("2000-01-01");
  const [resetToken, setResetToken] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
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


  const loadWorkspace = async () => {
    const [meResult, walletResult, jobsResult, milestonesResult, topUpsResult] = await Promise.allSettled([
      api.getMe(), api.getWallet(), api.getJobs({ status: "OPEN" }), api.getMilestones(), api.getTopUpRequests(),
    ]);
    if (meResult.status === "rejected") throw meResult.reason;
    setUser(meResult.value);
    if (walletResult.status === "fulfilled") setWallet(walletResult.value);
    if (jobsResult.status === "fulfilled") setJobs(jobsResult.value.jobs);
    if (milestonesResult.status === "fulfilled") setMilestones(milestonesResult.value);
    if (topUpsResult.status === "fulfilled") setTopUps(topUpsResult.value);
  };

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setSuccessMessage(""); setIsLoading(true);
    try {
      if (authMode === "forgot-password") {
        await api.requestPasswordReset(email);
        setSuccessMessage("If an account exists, a reset token has been sent to your email (check terminal in dev).");
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
        await api.register({ email, phone, password, role, dateOfBirth, languagePreference: "en", consents: { kycDataProcessing: true, marketingCommunications: false, analytics: false } });
      }
      const session = await api.login(email, password);
      api.setToken(session.accessToken);
      await loadWorkspace();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to continue";
      setError(message === "DUPLICATE_USER" ? "This email or phone already has an account. Switch to Sign in." : message);
    }
    finally { setIsLoading(false); }
  };

  const logout = () => { api.setToken(null); setUser(null); setPassword(""); setResetToken(""); setView("overview"); setShowLanding(true); };

  const submitJob = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setIsLoading(true);
    try {
      const min = Math.round(Number(jobBudgetMin) * 100); const max = Math.round(Number(jobBudgetMax) * 100);
      if (jobTitle.trim().length < 5) throw new Error("Job title must be at least 5 characters.");
      if (jobDescription.trim().length < 20) throw new Error("Description must be at least 20 characters.");
      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) throw new Error("Enter valid budgets; maximum must be greater than or equal to minimum.");
      if (!jobDeadline) throw new Error("Choose a deadline.");
      await api.createJob({ title: jobTitle, category: jobCategory, description: jobDescription, budgetMin: { amountMinor: min, currency: "ETB" }, budgetMax: { amountMinor: max, currency: "ETB" }, proposedMilestones: [{ title: "Initial delivery", amount: { amountMinor: max, currency: "ETB" }, dueDate: jobDeadline }], deadline: jobDeadline });
      setJobTitle(""); setJobDescription(""); setJobBudgetMin(""); setJobBudgetMax(""); setJobDeadline(""); await loadWorkspace(); setView("jobs");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to publish job"); }
    finally { setIsLoading(false); }
  };

  const platformRole = (user?.role as PlatformRole) || "CLIENT";
  const navItems = useMemo(() => {
    const jobsLabel = platformRole === "FREELANCER" ? "Find work" : "Jobs";
    const jobsIconKey = platformRole === "FREELANCER" ? "find-work" : "jobs";
    const common = [
      { view: "overview" as View, iconKey: "overview", label: "Overview" },
      { view: "jobs" as View, iconKey: jobsIconKey, label: jobsLabel },
      { view: "contracts" as View, iconKey: "contracts", label: "Contracts" },
      { view: "wallet" as View, iconKey: "wallet", label: "Wallet" },
      { view: "chat" as View, iconKey: "chat", label: "Chat" },
      { view: "profile" as View, iconKey: "profile", label: "Profile" },
    ];
    return platformRole === "ADMIN" || platformRole === "MEDIATOR"
      ? [...common, { view: "cases" as View, iconKey: "cases", label: "Cases" }]
      : [...common, { view: "cases" as View, iconKey: "cases", label: "Disputes" }, { view: "verification" as View, iconKey: "verification", label: "Verification" }];
  }, [platformRole]);

  if (user?.staffRole) return <StaffDashboard user={user} onLogout={logout} />;

  if (!user && showLanding) {
    const handleNavigate = (page: string) => {
      setMarketingPage(page as MarketingPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleStart = (mode: "login" | "register") => {
      setAuthMode(mode);
      setShowLanding(false);
    };

    // Update document title per marketing page (Item 20: unique page titles)
    const pageTitles: Record<MarketingPage, string> = {
      home: "Yekis — Ethiopia's Escrow-Protected Freelance Marketplace",
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
    };
    document.title = pageTitles[marketingPage] || pageTitles.home;

    return (
      <>
        {marketingPage === "home" && <LandingPage onStart={handleStart} onNavigate={handleNavigate} />}
        {marketingPage === "faq" && <FAQPage onNavigate={handleNavigate} onStart={handleStart} />}
        {marketingPage === "fees" && <FeesPage onNavigate={handleNavigate} onStart={handleStart} />}
        {marketingPage === "privacy" && <PrivacyPage onNavigate={handleNavigate} />}
        {marketingPage === "terms" && <TermsPage onNavigate={handleNavigate} />}
        {marketingPage === "about" && <AboutPage onNavigate={handleNavigate} onStart={handleStart} />}
        {marketingPage === "case-studies" && <CaseStudiesPage onNavigate={handleNavigate} />}
        {marketingPage === "404" && <NotFoundPage onNavigate={handleNavigate} onStart={handleStart} />}
        {marketingPage === "thank-you-signup" && <ThankYouPage action="signup" onNavigate={handleNavigate} onStart={handleStart} />}
        {marketingPage === "thank-you-job-posted" && <ThankYouPage action="job-posted" onNavigate={handleNavigate} onStart={handleStart} />}
        {marketingPage === "thank-you-contact" && <ThankYouPage action="contact" onNavigate={handleNavigate} onStart={handleStart} />}
        <CookieBanner />
        <MobileCTA onStart={handleStart} />
      </>
    );
  }

  if (!user) {
return <main className="platform-auth"><button type="button" className="auth-back" onClick={() => { setShowLanding(true); setError(""); setSuccessMessage(""); }}><ArrowLeft size={17} /> Back to Yekis</button><div className="platform-auth-art"><img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo" /><p className="eyebrow">Yekis jobs</p><h1>Work with clarity.</h1><p>Find trusted talent, manage milestone work, and keep payments visible from brief to delivery.</p><div className="auth-proof"><span>01</span><strong>Jobs, contracts, and escrow in one workspace.</strong></div><div className="auth-proof"><span>02</span><strong>Built for Ethiopian clients and freelancers.</strong></div></div><form className="auth-panel" onSubmit={submitAuth}><div className="auth-panel-header"><div><p className="eyebrow">{authMode === "login" ? "Welcome back" : authMode === "forgot-password" ? "Recover account" : authMode === "reset-password" ? "Set new password" : "Create your workspace"}</p><h2>{authMode === "login" ? "Sign in to Yekis" : authMode === "forgot-password" ? "Forgot password" : authMode === "reset-password" ? "Reset password" : "Start with Yekis"}</h2></div><img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo small" /></div>{authMode === "register" && <div className="segmented-control"><button type="button" className={role === "CLIENT" ? "selected" : ""} onClick={() => setRole("CLIENT")}>Client</button><button type="button" className={role === "FREELANCER" ? "selected" : ""} onClick={() => setRole("FREELANCER")}>Freelancer</button></div>}{(authMode === "login" || authMode === "register" || authMode === "forgot-password") && <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}{authMode === "register" && <label>Ethiopian phone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+251911223344" required /></label>}{authMode === "reset-password" && <label>Reset token<input type="text" value={resetToken} onChange={(event) => setResetToken(event.target.value)} placeholder="Enter reset token" required /></label>}{(authMode === "login" || authMode === "register" || authMode === "reset-password") && <label>{authMode === "reset-password" ? "New Password" : "Password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" minLength={authMode === "register" || authMode === "reset-password" ? 10 : undefined} required /></label>}{authMode === "register" && <label>Date of birth<input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required /></label>}{error && <div className="form-error">{error}</div>}{successMessage && <div className="form-success" style={{ padding: "12px", background: "#18272f", color: "#d8f36b", borderRadius: "8px", fontSize: "0.82rem", border: "1px solid #384b55" }}>{successMessage}</div>}<button className="btn-primary wide" disabled={isLoading}>{isLoading ? "Please wait..." : authMode === "login" ? "Sign in" : authMode === "forgot-password" ? "Request reset link" : authMode === "reset-password" ? "Set password" : "Create account"}</button>{authMode === "login" && <button type="button" className="auth-switch" onClick={() => { setAuthMode("forgot-password"); setError(""); setSuccessMessage(""); }} style={{ marginTop: "-8px", marginBottom: "8px" }}>Forgot your password?</button>}<button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setError(""); setSuccessMessage(""); }}>{authMode === "login" ? "New to Yekis? Create an account" : "Already have an account? Sign in"}</button><p className="auth-footnote">Telegram users can use the Mini App for a faster passwordless entry.</p></form></main>;
  }

return <div className="platform-shell"><aside className="platform-sidebar"><div className="sidebar-brand"><img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo small" /><strong>Yekis</strong></div><div className="sidebar-role"><span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span><span><strong>{roleLabel(platformRole)}</strong><small>{user.email}</small></span></div><nav className="sidebar-nav">{navItems.map((item) => <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => setView(item.view)}><span className="nav-icon">{navIconMap[item.iconKey]}</span><span className="nav-label">{item.label}</span></button>)}</nav><button className="sidebar-settings" onClick={() => setView("settings")}><Settings size={16} /> <span className="nav-label">Settings</span></button></aside><main className="platform-main"><header className="platform-topbar"><div><span className="eyebrow">{roleLabel(platformRole)} workspace</span><h1>{view === "overview" ? "Good morning" : navItems.find((item) => item.view === view)?.label || "Settings"}</h1></div><div className="topbar-actions"><NotificationCenter /><button className="user-menu" onClick={logout}><span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span><ChevronDown size={14} /></button></div></header>
      {view === "overview" && <section className="platform-content"><div className="overview-hero"><div><p className="eyebrow">Your work, in one view</p><h2>{platformRole === "FREELANCER" ? "Make your next move count." : platformRole === "CLIENT" ? "Turn your brief into progress." : "Keep every review moving."}</h2><p>{platformRole === "FREELANCER" ? "Find relevant work and keep delivery, verification, and payout status close at hand." : platformRole === "CLIENT" ? "Post a clear job, compare proposals, and fund milestones with confidence." : "Monitor receipts, identity checks, escrow, and open cases from one desk."}</p></div>{platformRole === "CLIENT" && <button className="btn-primary" onClick={() => setView("jobs")}>Post a job <Plus size={16} /></button>}{platformRole === "FREELANCER" && <button className="btn-primary" onClick={() => setView("jobs")}>Find work <Search size={16} /></button>}</div><FeaturedCarousel /><div className="platform-metrics"><article><small>Wallet balance</small><strong>ETB {(wallet.balanceMinor / 100).toLocaleString()}</strong><span>Available balance</span></article><article><small>Open jobs</small><strong>{jobs.length}</strong><span>Matching opportunities</span></article><article><small>Active milestones</small><strong>{milestones.filter((milestone) => milestone.escrowState !== "RELEASED").length}</strong><span>Across your contracts</span></article></div><div className="platform-grid"><section className="panel"><div className="panel-heading"><h2>Recent activity</h2><button onClick={() => setView("contracts")}>View contracts</button></div>{milestones.length === 0 ? <p className="empty-state">Your active contracts will appear here.</p> : milestones.slice(0, 4).map((milestone) => <div className="activity-row" key={milestone.id}><span className="activity-dot" /><span><strong>{milestone.title}</strong><small>{milestone.escrowState.replaceAll("_", " ")}</small></span><b>ETB {(milestone.amountMinor / 100).toLocaleString()}</b></div>)}</section><section className="panel"><div className="panel-heading"><h2>Next step</h2></div><div className="next-step"><span className="step-number">1</span><div><strong>{platformRole === "FREELANCER" ? "Complete Fayda verification" : "Add funds to your wallet"}</strong><p>{platformRole === "FREELANCER" ? "Unlock payout access after manual review." : "Upload a Telebirr or CBE receipt for approval."}</p></div><button onClick={() => setView(platformRole === "FREELANCER" ? "verification" : "wallet")}>Open</button></div></section></div></section>}
      {view === "jobs" && <section className="platform-content"><div className="content-toolbar"><div><h2>{platformRole === "CLIENT" ? "Job postings" : "Find work"}</h2><p>{platformRole === "CLIENT" ? "Create a clear brief and manage the talent pipeline." : "Browse open opportunities across the marketplace."}</p></div></div>{platformRole === "CLIENT" && <form className="panel job-form" onSubmit={submitJob}><h3>New job brief</h3><div className="form-grid"><label>Title<input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="What do you need done?" required /></label><label>Category<select value={jobCategory} onChange={(event) => setJobCategory(event.target.value)}>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label><label className="form-wide">Description<textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Describe the outcome, scope, and expectations." minLength={20} required /></label><label>Minimum budget<input type="number" value={jobBudgetMin} onChange={(event) => setJobBudgetMin(event.target.value)} placeholder="ETB" required /></label><label>Maximum budget<input type="number" value={jobBudgetMax} onChange={(event) => setJobBudgetMax(event.target.value)} placeholder="ETB" required /></label><label>Deadline<input type="date" value={jobDeadline} onChange={(event) => setJobDeadline(event.target.value)} required /></label></div><button className="btn-primary" disabled={isLoading}>Publish job</button></form>}<JobsWorkspace role={platformRole as "CLIENT" | "FREELANCER"} openJobs={jobs} onChanged={loadWorkspace} /></section>}
      {view === "contracts" && <section className="platform-content"><div className="content-toolbar"><div><h2>Contracts and milestones</h2><p>Sign agreements, fund escrow, submit work, and release completed milestones.</p></div></div><ContractsWorkspace role={platformRole as "CLIENT" | "FREELANCER"} onChanged={loadWorkspace} /></section>}
      {view === "wallet" && <section className="platform-content"><BrowserWallet wallet={wallet} topUps={topUps} onChanged={loadWorkspace} role={platformRole as "CLIENT" | "FREELANCER"} /></section>}
      {view === "chat" && <section className="platform-content"><div className="content-toolbar"><div><h2>Support chat</h2><p>Get help with jobs, contracts, payments, verification, or disputes.</p></div></div><SupportChat userId={user.id} /></section>}
      {view === "verification" && <section className="platform-content"><div className="content-toolbar"><div><h2>Verification</h2><p>Manage your identity and payout readiness.</p></div></div><BrowserVerification /></section>}
      {view === "cases" && <section className="platform-content"><div className="content-toolbar"><div><h2>Disputes</h2><p>Negotiate, submit evidence, and track mediation or arbitration.</p></div></div><DisputesWorkspace /></section>}
      {view === "profile" && <section className="platform-content">
        <div className="content-toolbar"><div><h2>Profile</h2><p>View user profile details.</p></div><button className="btn-secondary" onClick={() => setView("profile-edit")}><Edit size={16} /> Edit Profile</button></div>
        <ProfilePage userId={viewUserId || user.id} />
      </section>}
      {view === "profile-edit" && <section className="platform-content">
        <div className="content-toolbar"><div><h2>Edit Profile</h2><p>Update your public profile details.</p></div><button className="btn-secondary" onClick={() => setView("profile")}><ArrowLeft size={16} /> Back to Profile</button></div>
        <ProfileEditPage />
      </section>}
      {view === "settings" && <section className="platform-content"><div className="content-toolbar"><div><h2>Settings</h2><p>Account preferences and access.</p></div></div><div className="panel settings-list"><div><strong>Account email</strong><span>{user.email}</span></div><div><strong>Workspace role</strong><span>{roleLabel(platformRole)}</span></div><button className="btn-secondary" onClick={logout}><LogOut size={16} /> Sign out</button></div></section>}
    </main><nav className="platform-mobile-nav">{navItems.map((item) => <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => setView(item.view)}><span>{navIconMap[item.iconKey]}</span><small>{item.label}</small></button>)}</nav></div>;
}
