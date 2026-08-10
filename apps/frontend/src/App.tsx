// === IMPORTS ===
import { useState, useEffect } from "react";
import { useTelegramMiniApp } from "./telegram/useTelegramMiniApp";
import { api, type TelegramAuthResponse, type TopUpRequest, type Milestone, type Job } from "./api/client";
import { FullPlatformApp } from "./FullPlatformApp";
import { Home, Search, Briefcase, Wallet, UserCircle, ShieldAlert, ArrowLeft, PlusCircle, User, Briefcase as BriefcaseIcon } from "lucide-react";


// === INTERFACES & TYPES ===
type Role = "CLIENT" | "FREELANCER" | "ADMIN";
type Tab = "home" | "jobs" | "escrow" | "wallet" | "kyc" | "disputes";
type KycStatus = "NOT_SUBMITTED" | "UNDER_REVIEW" | "APPROVED";


// === MAIN COMPONENT ===
const getDefaultMilestoneDueDate = (): string =>
  new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

const paymentAccounts = {
  TELEBIRR: { label: "Telebirr", accountName: "Yekis Jobs", accountNumber: "09 00 000 000" },
  CBE_BIRR: { label: "CBE Bank", accountName: "Yekis Jobs", accountNumber: "1000 0000 0000 0000" },
};

const roleOptions: { role: Role; title: string; description: string; icon: React.ReactNode }[] = [
  { role: "FREELANCER", title: "I want to work", description: "Find jobs, send proposals, and track your earnings.", icon: <User size={24} /> },
  { role: "CLIENT", title: "I need work done", description: "Post a job, hire talent, and manage contracts.", icon: <BriefcaseIcon size={24} /> },
];

function formatRole(role: Role) {
  return role === "FREELANCER" ? "Freelancer" : role === "ADMIN" ? "Team workspace" : "Client";
}

export function App() {
  const telegram = useTelegramMiniApp();

  const [telegramSession, setTelegramSession] = useState<TelegramAuthResponse | null>(null);
  const [telegramAuthStatus, setTelegramAuthStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [telegramAuthError, setTelegramAuthError] = useState("");
  
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [mobilePhone, setMobilePhone] = useState("");
  const [mobilePassword, setMobilePassword] = useState("");

  const [role, setRole] = useState<Role>(() => {
    const savedRole = window.localStorage.getItem("yekis-role");
    return savedRole === "FREELANCER" || savedRole === "ADMIN" ? savedRole : "CLIENT";
  });
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [walletBalance, setWalletBalance] = useState(0);
  const [kycStatus, setKycStatus] = useState<KycStatus>("NOT_SUBMITTED");
  const [faydaIdNumber, setFaydaIdNumber] = useState("");
  const [faydaIdPhoto, setFaydaIdPhoto] = useState<File | null>(null);
  const [selfieWithIdPhoto, setSelfieWithIdPhoto] = useState<File | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpRail, setTopUpRail] = useState<"TELEBIRR" | "CBE_BIRR">("TELEBIRR");
  const [topUpReference, setTopUpReference] = useState("");
  const [topUpReceipt, setTopUpReceipt] = useState<File | null>(null);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", category: "WEB_APP_DEVELOPMENT", description: "", budgetMin: "", budgetMax: "", deadline: getDefaultMilestoneDueDate() });

  const fetchWallet = async () => { try { setWalletBalance((await api.getWallet()).balanceMinor / 100); } catch { /* session may be demo */ } };
  const fetchKycStatus = async () => { try { const status = await api.getKycStatus(); setKycStatus(status.status === "VERIFIED" ? "APPROVED" : status.status === "UNDER_REVIEW" ? "UNDER_REVIEW" : "NOT_SUBMITTED"); } catch { /* session may be demo */ } };
  const fetchTopUpRequests = async () => { try { const data = await api.getTopUpRequests(); setTopUpRequests(Array.isArray(data) ? data : []); } catch { setTopUpRequests([]); } };
  const fetchMilestones = async () => { try { const data = await api.getMilestones(); setMilestones(Array.isArray(data) ? data : []); } catch { setMilestones([]); } };
  const fetchJobs = async () => { try { const data = await api.getJobs({ status: "OPEN" }); setJobs(Array.isArray(data.jobs) ? data.jobs : []); } catch { setJobs([]); } };

  useEffect(() => {
    const backButton = telegram.backButton;
    if (backButton) {
      if (activeTab !== "home" && telegramAuthStatus === "ready") {
        backButton.show();
        const callback = () => { setActiveTab("home"); setShowJobForm(false); };
        backButton.onClick(callback);
        return () => { backButton.offClick(callback); backButton.hide(); };
      } else {
        backButton.hide();
      }
    }
  }, [activeTab, telegram.backButton, telegramAuthStatus]);

  const loadData = async () => {
    await Promise.all([fetchWallet(), fetchKycStatus(), fetchTopUpRequests(), fetchMilestones(), fetchJobs()]);
  };

  const startSession = async (selectedRole: Role) => {
    setRole(selectedRole);
    window.localStorage.setItem("yekis-role", selectedRole);
    setTelegramAuthError("");
    
    if (!telegram.isTelegram || !telegram.initData) {
      setShowMobileLogin(true);
      return;
    }

    setTelegramAuthStatus("loading");
    try {
      const session = await api.loginWithTelegram(telegram.initData, selectedRole);
      setTelegramSession(session);
      const backendRole = session.user.role === "ADMIN" ? "ADMIN" : selectedRole;
      setRole(backendRole);
      window.localStorage.setItem("yekis-role", backendRole);
      api.setToken(session.accessToken);
      setTelegramAuthStatus("ready");
      await loadData();
    } catch (err) {
      setTelegramAuthStatus("error");
      setTelegramAuthError(err instanceof Error ? `${err.message}. Try again, or restart the backend if the problem continues.` : "Try again, or restart the backend if the problem continues.");
    }
  };

  const handleMobileLogin = async () => {
    if (!mobilePhone || !mobilePassword) { alert("Enter phone and password"); return; }
    setTelegramAuthStatus("loading");
    try {
      const res = await api.loginWithMobile({ phone: mobilePhone.startsWith("+") ? mobilePhone : `+251${mobilePhone}`, password: mobilePassword });
      api.setToken(res.accessToken);
      const me = await api.getMe();
      const backendRole = me.role === "ADMIN" ? "ADMIN" : (me.role as Role);
      setRole(backendRole);
      window.localStorage.setItem("yekis-role", backendRole);
      setTelegramAuthStatus("ready");
      await loadData();
    } catch (err) {
      setTelegramAuthStatus("error");
      setTelegramAuthError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const submitTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0 || !topUpReference || !topUpReceipt) { alert("Enter the amount sent, reference number, and receipt."); return; }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("amountEtb", String(amount));
      formData.append("rail", topUpRail);
      formData.append("senderName", telegramSession?.telegram.firstName || "Telegram User");
      formData.append("senderReference", topUpReference);
      formData.append("receipt", topUpReceipt);
      await api.createTopUpRequest(formData);
      setTopUpAmount(""); setTopUpReference(""); setTopUpReceipt(null);
      await Promise.all([fetchTopUpRequests(), fetchWallet()]);
      alert("Top-up submitted for approval.");
    } catch (err) { alert(`Error: ${err instanceof Error ? err.message : "Failed to submit top-up"}`); }
    finally { setIsLoading(false); }
  };

  const submitKyc = async () => {
    if (faydaIdNumber.trim().length < 6 || !faydaIdPhoto || !selfieWithIdPhoto) { alert("Add your Fayda ID number, ID photo, and selfie holding the ID."); return; }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("faydaIdNumber", faydaIdNumber.trim()); formData.append("idPhoto", faydaIdPhoto); formData.append("selfieWithId", selfieWithIdPhoto);
      await api.submitFreelancerFaydaSelfie(formData);
      setFaydaIdNumber(""); setFaydaIdPhoto(null); setSelfieWithIdPhoto(null); setKycStatus("UNDER_REVIEW"); await fetchKycStatus();
      alert("Your Fayda review has been submitted.");
    } catch (err) { alert(`Error: ${err instanceof Error ? err.message : "Failed to submit KYC"}`); }
    finally { setIsLoading(false); }
  };

  const handleCreateJob = async () => {
    setIsLoading(true);
    try {
      await api.createJob({
        ...jobForm,
        budgetMin: { amountMinor: Number(jobForm.budgetMin) * 100, currency: "ETB" },
        budgetMax: { amountMinor: Number(jobForm.budgetMax) * 100, currency: "ETB" },
        proposedMilestones: [{ title: "Final Delivery", amount: { amountMinor: Number(jobForm.budgetMax) * 100, currency: "ETB" }, dueDate: jobForm.deadline }]
      });
      setShowJobForm(false);
      await fetchJobs();
      alert("Job created successfully!");
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to create job"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFundMilestone = async (milestoneId: string) => {
    setIsLoading(true); try { await api.fundMilestoneFromWallet(milestoneId); await fetchMilestones(); await fetchWallet(); setActiveTab("wallet"); }
    catch (err) { alert(`Error: ${err instanceof Error ? err.message : "Failed to fund milestone"}`); } finally { setIsLoading(false); }
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    setIsLoading(true); try { await api.acceptMilestone(milestoneId); await fetchMilestones(); await fetchWallet(); }
    catch (err) { alert(`Error: ${err instanceof Error ? err.message : "Failed to release milestone"}`); } finally { setIsLoading(false); }
  };

  const handleSubmitProposal = async (jobId: string) => {
    const coverLetter = prompt("Enter your cover letter:"); if (!coverLetter) return;
    setIsLoading(true);
    try { await api.submitProposal({ jobId, coverLetter, quotedAmountMinor: 1000000, estimatedDays: 7, milestoneBreakdown: [{ title: "Milestone 1", amountMinor: 1000000, dueDate: getDefaultMilestoneDueDate() }] }); alert("Proposal submitted!"); }
    catch (err) { alert(`Error: ${err instanceof Error ? err.message : "Failed to submit proposal"}`); } finally { setIsLoading(false); }
  };

  if (!telegram.isTelegram) return <FullPlatformApp />;
  
  if (telegramAuthStatus !== "ready") {
    return (
      <main className="welcome-screen">
        <img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo" style={{ marginBottom: "28px" }} />
        <p className="eyebrow">Yekis jobs</p>
        <h1>Work that moves forward.</h1>
        <p className="welcome-copy">A trusted Ethiopian workspace for finding talent, delivering work, and keeping every payment clear.</p>
        <div className="welcome-rule"><span /> <small>How will you use Yekis?</small> <span /></div>
        
        {!showMobileLogin ? (
          <>
            <div className="role-picker">
              {roleOptions.map((option) => (
                <button className="role-choice" key={option.role} onClick={() => startSession(option.role)} disabled={telegramAuthStatus === "loading"}>
                  <span className="role-icon">{option.icon}</span><span><strong>{option.title}</strong><small>{option.description}</small></span><b>›</b>
                </button>
              ))}
            </div>
            <p className="welcome-note">Sign in or create your account with Telegram. No separate password needed.</p>
            <button className="text-button" onClick={() => setShowMobileLogin(true)}>Use mobile number instead</button>
          </>
        ) : (
          <div className="glass-card" style={{ marginTop: 24 }}>
            <h2>Mobile Sign In</h2>
            <label>Phone Number<input value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} placeholder="+251911..." /></label>
            <label>Password<input type="password" value={mobilePassword} onChange={e => setMobilePassword(e.target.value)} placeholder="••••••••" /></label>
            <button className="btn-primary" onClick={handleMobileLogin} disabled={telegramAuthStatus === "loading"}>Sign In</button>
            <button className="text-button" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowMobileLogin(false)}>Back to Role Selection</button>
          </div>
        )}

        {telegramAuthStatus === "error" && <div className="auth-error" role="alert"><strong>Sign-in could not be completed</strong><span>{telegramAuthError}</span><button className="text-button" onClick={() => { setTelegramAuthStatus("idle"); setTelegramAuthError(""); }}>Try again</button></div>}
      </main>
    );
  }

  const navItems: { tab: Tab; icon: React.ReactNode; label: string }[] = role === "FREELANCER"
    ? [{ tab: "home", icon: <Home size={20} />, label: "Home" }, { tab: "jobs", icon: <Search size={20} />, label: "Find work" }, { tab: "escrow", icon: <Briefcase size={20} />, label: "My work" }, { tab: "wallet", icon: <Wallet size={20} />, label: "Wallet" }, { tab: "kyc", icon: <UserCircle size={20} />, label: "Profile" }]
    : role === "ADMIN"
      ? [{ tab: "home", icon: <Home size={20} />, label: "Overview" }, { tab: "escrow", icon: <Briefcase size={20} />, label: "Escrow" }, { tab: "disputes", icon: <ShieldAlert size={20} />, label: "Cases" }, { tab: "kyc", icon: <UserCircle size={20} />, label: "Team" }]
      : [{ tab: "home", icon: <Home size={20} />, label: "Home" }, { tab: "jobs", icon: <PlusCircle size={20} />, label: "Post a job" }, { tab: "escrow", icon: <Briefcase size={20} />, label: "Contracts" }, { tab: "wallet", icon: <Wallet size={20} />, label: "Wallet" }, { tab: "kyc", icon: <UserCircle size={20} />, label: "Profile" }];

  return (
    <div className="platform-shell mini-platform-shell">
      <aside className="platform-sidebar">
        <div className="sidebar-brand"><img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo small" /><strong>Yekis</strong></div>
        <div className="sidebar-role"><span className="avatar">{telegramSession?.telegram.firstName?.slice(0, 1).toUpperCase() || "Y"}</span><span><strong>{formatRole(role)}</strong><small>{telegramSession?.telegram.firstName || "User"}</small></span></div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button key={item.tab} className={activeTab === item.tab ? "active" : ""} onClick={() => { setActiveTab(item.tab); setShowJobForm(false); }}>
              <span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="platform-main">
        <header className="platform-topbar">
          <div>
            <span className="eyebrow">{formatRole(role)} workspace</span>
            <h1>{activeTab === "home" ? "Good morning" : navItems.find((item) => item.tab === activeTab)?.label || "Yekis"}</h1>
          </div>
          <div className="topbar-actions">
            {activeTab !== "home" && !telegram.isTelegram && (
              <button className="icon-button" aria-label="Go back" onClick={() => { setActiveTab("home"); setShowJobForm(false); }}><ArrowLeft size={18} /></button>
            )}
            <button className="user-menu" onClick={() => setActiveTab("kyc")}>
              <span className="avatar">{telegramSession?.telegram.firstName?.slice(0, 1).toUpperCase() || "Y"}</span>
              <span>Profile</span>
            </button>
          </div>
        </header>

        {showJobForm ? (
          <section className="platform-content">
            <section className="panel job-form">
              <div className="panel-heading"><h2>Create Job Brief</h2></div>
              <div className="form-grid">
                <label>Title<input value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} placeholder="e.g. Need a logo design" /></label>
                <label>Category
                  <select value={jobForm.category} onChange={e => setJobForm({...jobForm, category: e.target.value})}>
                    <option value="WEB_APP_DEVELOPMENT">Web App Development</option>
                    <option value="GRAPHIC_DESIGN">Graphic Design</option>
                    <option value="DIGITAL_MARKETING">Digital Marketing</option>
                    <option value="CONTENT_WRITING">Content Writing</option>
                    <option value="TRANSLATION">Translation</option>
                    <option value="DATA_ENTRY">Data Entry</option>
                  </select>
                </label>
                <label className="form-wide">Description<textarea rows={4} value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} placeholder="Describe what you need..." /></label>
                <label>Min Budget (ETB)<input type="number" value={jobForm.budgetMin} onChange={e => setJobForm({...jobForm, budgetMin: e.target.value})} placeholder="0" /></label>
                <label>Max Budget (ETB)<input type="number" value={jobForm.budgetMax} onChange={e => setJobForm({...jobForm, budgetMax: e.target.value})} placeholder="0" /></label>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={handleCreateJob} disabled={isLoading}>{isLoading ? "Creating..." : "Post Job"}</button>
                <button className="btn-secondary" onClick={() => setShowJobForm(false)}>Cancel</button>
              </div>
            </section>
          </section>
        ) : (
          <>
            {activeTab === "home" && <section className="platform-content">
              <div className="overview-hero">
                <div>
                  <p className="eyebrow">{role === "ADMIN" ? "Operations desk" : "Good to have you here"}</p>
                  <h2>{role === "FREELANCER" ? "Find your next win" : role === "ADMIN" ? "Keep the marketplace moving" : "Build something great"}</h2>
                  <p>{role === "FREELANCER" ? "Browse work that matches your skills and keep delivery on track." : role === "ADMIN" ? "Review activity, protect payments, and support both sides." : "Turn a clear brief into work you are proud of."}</p>
                </div>
                {role === "CLIENT" && <button className="btn-primary" onClick={() => { setActiveTab("jobs"); setShowJobForm(true); }}>Post a new job <PlusCircle size={16} /></button>}
                {role === "FREELANCER" && <button className="btn-primary" onClick={() => setActiveTab("jobs")}>Find work <Search size={16} /></button>}
              </div>

              <div className="platform-metrics">
                <article className="metric-card"><small>Wallet balance</small><strong>ETB {walletBalance.toLocaleString()}</strong><span>Approved funds</span></article>
                <article className="metric-card"><small>{role === "ADMIN" ? "Needs review" : "Active work"}</small><strong>{role === "ADMIN" ? topUpRequests.filter((item) => item.status === "PENDING_REVIEW").length : milestones.filter((item) => item.escrowState !== "RELEASED").length}</strong><span>{role === "ADMIN" ? "Receipts in queue" : "Milestones"}</span></article>
                <article className="metric-card"><small>Open jobs</small><strong>{jobs.length}</strong><span>Opportunities</span></article>
              </div>

              <section className="panel profile-wallet-card"><div><p className="eyebrow">Wallet</p><h2>ETB {walletBalance.toLocaleString()}</h2><p>Approved funds and receipt-based top-ups.</p></div><button className="btn-primary" onClick={() => setActiveTab("wallet")}>Open wallet <Wallet size={16} /></button></section><div className="platform-grid">
                {role === "CLIENT" && <section className="panel"><div className="panel-heading"><h2>Your workspace</h2><button onClick={() => setActiveTab("escrow")}>See all</button></div><div className="quick-grid"><button onClick={() => { setActiveTab("jobs"); setShowJobForm(true); }}><span><PlusCircle size={20}/></span><strong>Post a job</strong><small>Start a brief</small></button><button onClick={() => setActiveTab("wallet")}><span><Wallet size={20}/></span><strong>Add funds</strong><small>Upload a receipt</small></button></div></section>}
                {role === "FREELANCER" && <section className="panel"><div className="panel-heading"><h2>Next steps</h2></div><div className="list-card"><button onClick={() => setActiveTab("jobs")}><span className="list-icon"><Search size={20}/></span><span><strong>Browse open jobs</strong><small>{jobs.length || "New"} opportunities waiting</small></span><b>›</b></button><button onClick={() => setActiveTab("kyc")}><span className="list-icon"><UserCircle size={20}/></span><span><strong>Complete your profile</strong><small>{kycStatus === "APPROVED" ? "Payouts enabled" : "Fayda review required for payouts"}</small></span><b>›</b></button></div></section>}
                {role === "ADMIN" && <section className="panel"><div className="panel-heading"><h2>Review queue</h2><button onClick={() => setActiveTab("wallet")}>Open queue</button></div><div className="list-card"><button onClick={() => setActiveTab("wallet")}><span className="list-icon"><Wallet size={20}/></span><span><strong>Top-up receipts</strong><small>{topUpRequests.filter((item) => item.status === "PENDING_REVIEW").length} pending approval</small></span><b>›</b></button><button onClick={() => setActiveTab("kyc")}><span className="list-icon"><UserCircle size={20}/></span><span><strong>Identity reviews</strong><small>Fayda ID and selfie submissions</small></span><b>›</b></button></div></section>}
              </div>
            </section>}

            {activeTab === "jobs" && <section className="platform-content">
              <div className="content-toolbar">
                <div><h2>{role === "CLIENT" ? "Job postings" : "Find work"}</h2><p>{role === "CLIENT" ? "Share your brief and let the right freelancer come to you." : "Browse open opportunities across the marketplace."}</p></div>
                {role === "CLIENT" && <button className="btn-primary" onClick={() => setShowJobForm(true)}>Create job brief <PlusCircle size={16} /></button>}
              </div>
              <div className="job-list">
                {jobs.length === 0 ? <p className="empty-state">No open jobs at the moment. Check back soon.</p> : jobs.map((job) => <article className="job-platform-card" key={job.id}><div><span className="status-pill">Open</span><h3>{job.title}</h3><p>{job.description}</p><small>ETB {(job.budgetMinMinor / 100).toLocaleString()} – {(job.budgetMaxMinor / 100).toLocaleString()}</small></div>{role === "FREELANCER" && <button className="btn-primary" onClick={() => handleSubmitProposal(job.id)} disabled={isLoading}>Send proposal</button>}</article>)}
              </div>
            </section>}

            {activeTab === "escrow" && <section className="platform-content">
              <div className="content-toolbar"><div><h2>{role === "CLIENT" ? "Your contracts" : "Your work"}</h2><p>Track delivery, funding, and release decisions.</p></div></div>
              <div className="contract-table">
                <div className="table-head"><span>Milestone</span><span>Amount</span><span>Status</span><span>Action</span></div>
                {milestones.length === 0 ? <p className="empty-state">No milestones yet. Your active work will appear here.</p> : milestones.map((milestone) => <div className="table-row" key={milestone.id}><strong>{milestone.title}</strong><span>ETB {(milestone.amountMinor / 100).toLocaleString()}</span><span className="status-pill">{milestone.escrowState.replaceAll("_", " ")}</span><span>{milestone.escrowState === "PAYMENT_PENDING" && role === "CLIENT" && <button className="btn-primary" onClick={() => handleFundMilestone(milestone.id)} disabled={isLoading}>Fund</button>}{milestone.escrowState === "SUBMITTED_FOR_REVIEW" && role === "CLIENT" && <button className="btn-primary" onClick={() => handleReleaseMilestone(milestone.id)} disabled={isLoading}>Release</button>}</span></div>)}
              </div>
            </section>}

            {activeTab === "wallet" && <section className="platform-content">
              <div className="wallet-hero"><div><p className="eyebrow">Available balance</p><strong>ETB {walletBalance.toLocaleString()}</strong><span>Approved funds</span></div></div>
              <div className="platform-grid">
                <section className="panel">
                  <div className="panel-heading"><h2>Add Funds</h2></div>
                  <p style={{marginBottom: 14, color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Send money to one of the accounts below, then upload your receipt for approval.</p>
                  <div className="payment-grid">{Object.entries(paymentAccounts).map(([key, account]) => <button className={topUpRail === key ? "payment-account selected" : "payment-account"} key={key} onClick={() => setTopUpRail(key as "TELEBIRR" | "CBE_BIRR")}><strong>{account.label}</strong><span>{account.accountName}</span><code>{account.accountNumber}</code></button>)}</div>
                  <label>Amount sent<input value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} inputMode="decimal" placeholder="e.g. 5000" /></label>
                  <label>Transaction/reference number<input value={topUpReference} onChange={(event) => setTopUpReference(event.target.value)} placeholder="e.g. TB-12345" /></label>
                  <label>Receipt image<input type="file" accept="image/*,.pdf" onChange={(event) => setTopUpReceipt(event.target.files?.[0] ?? null)} /></label>
                  <button className="btn-primary" style={{marginTop: 16}} onClick={submitTopUp} disabled={isLoading}>{isLoading ? "Submitting..." : "Submit for approval"}</button>
                </section>
                <section className="panel">
                  <div className="panel-heading"><h2>Recent top-ups</h2></div>
                  <div className="list-card" style={{marginTop: 14}}>
                    {topUpRequests.length === 0 ? <p className="empty-state">No top-ups submitted yet.</p> : topUpRequests.map((request) => <div className="list-row" key={request.id}><div><strong>ETB {(request.amountMinor / 100).toLocaleString()}</strong><span>{request.rail === "TELEBIRR" ? "Telebirr" : "CBE Bank"} · {request.senderReference}</span></div><span className="status-pill">{request.status.replace("_", " ")}</span></div>)}
                  </div>
                </section>
              </div>
            </section>}

            {activeTab === "kyc" && <section className="platform-content">
              <div className="platform-grid">
                <section className="panel">
                  <div className="panel-heading"><h2>Freelancer verification</h2></div>
                  <p style={{marginBottom: 14, color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Submit your Fayda ID and a selfie holding it. No business registration is required.</p>
                  <label>Fayda ID number<input value={faydaIdNumber} onChange={(event) => setFaydaIdNumber(event.target.value)} placeholder="Enter your Fayda ID number" /></label>
                  <label>Fayda ID photo<input type="file" accept="image/*" onChange={(event) => setFaydaIdPhoto(event.target.files?.[0] ?? null)} /></label>
                  <label>Selfie holding Fayda ID<input type="file" accept="image/*" onChange={(event) => setSelfieWithIdPhoto(event.target.files?.[0] ?? null)} /></label>
                  <button className="btn-primary" style={{marginTop: 16}} onClick={submitKyc} disabled={isLoading}>{isLoading ? "Submitting..." : "Submit for review"}</button>
                </section>
                <section className="panel status-card">
                  <div><small>Verification status</small><strong>{kycStatus.replace("_", " ")}</strong></div>
                  <span className="status-pill">{kycStatus}</span>
                </section>
              </div>
            </section>}

            {activeTab === "disputes" && <section className="platform-content">
              <div className="panel">
                <div className="panel-heading"><h2>Case center</h2></div>
                <p style={{marginBottom: 14, color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Keep evidence, delivery notes, receipts, and approvals inside the workspace so a mediator can review the full timeline.</p>
                <button className="btn-primary">Open a case <PlusCircle size={16} /></button>
              </div>
            </section>}
          </>
        )}
      </main>
      <nav className="platform-mobile-nav" aria-label="Main navigation">
        {navItems.map((item) => <button key={item.tab} className={activeTab === item.tab ? "active" : ""} onClick={() => { setActiveTab(item.tab); setShowJobForm(false); }}><span>{item.icon}</span><small>{item.label}</small></button>)}
      </nav>
    </div>
  );
}

export default App;
