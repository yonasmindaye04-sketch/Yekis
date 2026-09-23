// === IMPORTS ===
import { useState, useEffect, useCallback } from "react";
import { useTelegramMiniApp } from "./telegram/useTelegramMiniApp";
import {
  api,
  type TelegramAuthResponse,
  type TopUpRequest,
  type Milestone,
  type Job,
  type MeResponse,
} from "./api/client";
import { FullPlatformApp } from "./FullPlatformApp";
import {
  Home,
  Search,
  Briefcase,
  Wallet,
  UserCircle,
  ArrowLeft,
  PlusCircle,
  User,
  Briefcase as BriefcaseIcon,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  X,
  Paperclip,
} from "lucide-react";
import { PaymentReturn } from "./PaymentReturn";
import { useTheme } from "./theme/ThemeContext";
import "./telegram/miniApp.css";

// === INTERFACES & TYPES ===
type Role = "CLIENT" | "FREELANCER" | "ADMIN";
type Tab = "home" | "jobs" | "escrow" | "wallet" | "kyc" | "disputes";
type KycStatus = "NOT_SUBMITTED" | "UNDER_REVIEW" | "APPROVED";

const getDefaultMilestoneDueDate = (): string =>
  new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

const paymentAccounts = {
  TELEBIRR: {
    label: "Telebirr",
    accountName: "Yekis Jobs",
    accountNumber: "0910 011 818",
    image: "/payment/Telebirr.png",
    imgStyle: {
      width: "70px",
      height: "70px",
      objectFit: "contain",
      borderRadius: "8px",
      flexShrink: 0,
    } as React.CSSProperties,
  },
  CBE_BIRR: {
    label: "CBE Bank",
    accountName: "Yekis Jobs",
    accountNumber: "1000 223 344",
    image: "/payment/cbe payment.jpg",
    imgStyle: {
      width: "70px",
      height: "70px",
      objectFit: "cover",
      borderRadius: "8px",
      flexShrink: 0,
    } as React.CSSProperties,
  },
  M_PESA: {
    label: "Safaricom M-Pesa",
    accountName: "Yekis Jobs",
    accountNumber: "0777 011 818 (Till: 882199)",
    image: "/payment/mpesa.svg",
    imgStyle: {
      width: "70px",
      height: "70px",
      objectFit: "contain",
      borderRadius: "8px",
      flexShrink: 0,
    } as React.CSSProperties,
  },
};

const roleOptions: {
  role: Role;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    role: "FREELANCER",
    title: "I want to work",
    description:
      "Browse Ethiopian gigs, submit bids, and receive escrow-guaranteed payouts.",
    icon: <User size={24} />,
  },
  {
    role: "CLIENT",
    title: "I need work done",
    description:
      "Post a job, hire verified talent, and protect payments with milestone escrow.",
    icon: <BriefcaseIcon size={24} />,
  },
];

function formatRole(role: Role) {
  return role === "FREELANCER"
    ? "Freelancer"
    : role === "ADMIN"
      ? "Team workspace"
      : "Client";
}

function normalizeEthiopianPhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("251") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+251${digits.slice(1)}`;
  }
  if (digits.startsWith("9") && digits.length === 9) {
    return `+251${digits}`;
  }
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  return digits ? `+251${digits}` : trimmed;
}

export function App() {
  const { theme, toggleTheme } = useTheme();
  const telegram = useTelegramMiniApp();

  const [telegramSession, setTelegramSession] =
    useState<TelegramAuthResponse | null>(null);
  const [userProfile, setUserProfile] = useState<MeResponse | null>(null);
  const [telegramAuthStatus, setTelegramAuthStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [telegramAuthError, setTelegramAuthError] = useState("");

  // Mobile Auth states
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [mobileAuthMode, setMobileAuthMode] = useState<"signin" | "signup">(
    "signin",
  );
  const [mobilePhone, setMobilePhone] = useState("");
  const [mobilePassword, setMobilePassword] = useState("");
  const [mobileRole, setMobileRole] = useState<"CLIENT" | "FREELANCER">(
    "FREELANCER",
  );

  const [role, setRole] = useState<Role>(() => {
    const savedRole = window.localStorage.getItem("yekis-role");
    return savedRole === "FREELANCER" || savedRole === "ADMIN"
      ? savedRole
      : "CLIENT";
  });
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [walletBalance, setWalletBalance] = useState(0);
  const [kycStatus, setKycStatus] = useState<KycStatus>("NOT_SUBMITTED");
  const [faydaIdNumber, setFaydaIdNumber] = useState("");
  const [faydaIdPhoto, setFaydaIdPhoto] = useState<File | null>(null);
  const [selfieWithIdPhoto, setSelfieWithIdPhoto] = useState<File | null>(null);
  const [topUpMethod, setTopUpMethod] = useState<"INSTANT" | "MANUAL">("INSTANT");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpRail, setTopUpRail] = useState<"TELEBIRR" | "CBE_BIRR" | "M_PESA">("TELEBIRR");
  const [checkoutRail, setCheckoutRail] = useState<"TELEBIRR" | "CBE_BIRR" | "M_PESA">("TELEBIRR");
  const [checkoutFallback, setCheckoutFallback] = useState<{
    amount: string;
    provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
    reason: string;
  } | null>(null);
  const [attachingReceiptTopUpId, setAttachingReceiptTopUpId] = useState<string | null>(null);
  const [attachRefNumber, setAttachRefNumber] = useState("");
  const [attachReceiptFile, setAttachReceiptFile] = useState<File | null>(null);
  const [topUpReference, setTopUpReference] = useState("");
  const [topUpReceipt, setTopUpReceipt] = useState<File | null>(null);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    category: "WEB_APP_DEVELOPMENT",
    description: "",
    budgetMin: "",
    budgetMax: "",
    deadline: getDefaultMilestoneDueDate(),
  });

  const [jobDetail, setJobDetail] = useState<{ isOpen: boolean; job: Job | null }>({
    isOpen: false,
    job: null,
  });

  // Proposal modal state
  const [proposalModal, setProposalModal] = useState<{
    isOpen: boolean;
    jobId: string;
    jobTitle: string;
    amountEtb: string;
    days: string;
    coverLetter: string;
    attachments: File[];
  }>({
    isOpen: false,
    jobId: "",
    jobTitle: "",
    amountEtb: "",
    days: "7",
    coverLetter: "",
    attachments: [],
  });

  const [telebirrModal, setTelebirrModal] = useState<{
    isOpen: boolean;
    redirectUrl: string | null;
    topUpId: string | null;
    amount: number;
    provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
    isSimulating: boolean;
  }>({
    isOpen: false,
    redirectUrl: null,
    topUpId: null,
    amount: 0,
    provider: "TELEBIRR",
    isSimulating: false,
  });

  const fetchWallet = async () => {
    try {
      setWalletBalance((await api.getWallet()).balanceMinor / 100);
    } catch {
      /* session may be demo */
    }
  };
  const fetchKycStatus = async () => {
    try {
      const status = await api.getKycStatus();
      setKycStatus(
        status.status === "VERIFIED"
          ? "APPROVED"
          : status.status === "UNDER_REVIEW"
            ? "UNDER_REVIEW"
            : "NOT_SUBMITTED",
      );
    } catch {
      /* session may be demo */
    }
  };
  const fetchTopUpRequests = async () => {
    try {
      const data = await api.getTopUpRequests();
      setTopUpRequests(Array.isArray(data) ? data : []);
    } catch {
      setTopUpRequests([]);
    }
  };
  const fetchMilestones = async () => {
    try {
      const data = await api.getMilestones();
      setMilestones(Array.isArray(data) ? data : []);
    } catch {
      setMilestones([]);
    }
  };
  const fetchJobs = async () => {
    try {
      const data = await api.getJobs({ status: "OPEN" });
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      setJobs([]);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUserProfile(me);
      if (
        me.role === "ADMIN" ||
        me.role === "FREELANCER" ||
        me.role === "CLIENT"
      ) {
        setRole(me.role as Role);
        window.localStorage.setItem("yekis-role", me.role);
      }
    } catch {
      // ignore
    }
    await Promise.allSettled([
      fetchWallet(),
      fetchKycStatus(),
      fetchTopUpRequests(),
      fetchMilestones(),
      fetchJobs(),
    ]);
  }, []);

  // Auto-resume existing session on mount
  useEffect(() => {
    const token = window.localStorage.getItem("yekis-api-token");
    if (!token) return;
    api.setToken(token);
    api
      .getMe()
      .then((me) => {
        setUserProfile(me);
        const backendRole = me.role === "ADMIN" ? "ADMIN" : (me.role as Role);
        setRole(backendRole);
        window.localStorage.setItem("yekis-role", backendRole);
        setTelegramAuthStatus("ready");
        loadData();
      })
      .catch(() => {
        api.clearToken();
      });
  }, [loadData]);

  // Universal back handler
  const handleUniversalBack = useCallback(() => {
    if (proposalModal.isOpen) {
      setProposalModal((prev) => ({ ...prev, isOpen: false }));
    } else if (telegramAuthStatus !== "ready") {
      setShowMobileLogin(false);
      setTelegramAuthError("");
    } else if (showJobForm) {
      setShowJobForm(false);
    } else if (activeTab !== "home") {
      setActiveTab("home");
    }
  }, [activeTab, proposalModal.isOpen, showJobForm, telegramAuthStatus]);

  // Hook into Telegram WebApp Native Back Button
  useEffect(() => {
    const backButton = telegram.backButton;
    if (!backButton) return;

    const canGoBack =
      proposalModal.isOpen ||
      (telegramAuthStatus !== "ready" && showMobileLogin) ||
      (telegramAuthStatus === "ready" && (activeTab !== "home" || showJobForm));

    if (canGoBack) {
      backButton.show();
      backButton.onClick(handleUniversalBack);
      return () => {
        backButton.offClick(handleUniversalBack);
        backButton.hide();
      };
    } else {
      backButton.hide();
    }
  }, [
    handleUniversalBack,
    proposalModal.isOpen,
    showJobForm,
    showMobileLogin,
    telegram.backButton,
    telegramAuthStatus,
    activeTab,
  ]);

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
      const session = await api.loginWithTelegram(
        telegram.initData,
        selectedRole,
      );
      setTelegramSession(session);
      const backendRole =
        session.user.role === "ADMIN" ? "ADMIN" : selectedRole;
      setRole(backendRole);
      window.localStorage.setItem("yekis-role", backendRole);
      api.setSession(session);
      setTelegramAuthStatus("ready");
      await loadData();
    } catch (err) {
      setTelegramAuthStatus("error");
      const msg =
        err instanceof Error ? err.message : "Sign-in could not be completed";
      if (
        msg.includes("TELEGRAM_BOT_TOKEN") ||
        msg.includes("TELEGRAM_NOT_CONFIGURED")
      ) {
        setTelegramAuthError(
          "TELEGRAM_BOT_TOKEN is missing or empty in your environment. Add your bot token to apps/backend/.env and restart the backend server.",
        );
      } else if (
        msg.includes("signature is invalid") ||
        msg.includes("TELEGRAM_AUTH_FAILED")
      ) {
        setTelegramAuthError(
          "Telegram signature mismatch: Ensure the TELEGRAM_BOT_TOKEN belongs to the exact bot opening this Mini App.",
        );
      } else {
        setTelegramAuthError(`${msg}. Try again or use mobile sign in.`);
      }
    }
  };

  const handleMobileAuth = async () => {
    if (!mobilePhone.trim() || !mobilePassword.trim()) {
      alert("Please enter both phone number and password.");
      return;
    }
    const normalizedPhone = normalizeEthiopianPhone(mobilePhone);
    setTelegramAuthStatus("loading");
    setTelegramAuthError("");

    try {
      if (mobileAuthMode === "signup") {
        const dummyEmail = `user.${normalizedPhone.replace(/\D/g, "")}@yekis.local`;
        await api.register({
          phone: normalizedPhone,
          email: dummyEmail,
          password: mobilePassword,
          role: mobileRole,
          languagePreference: "en",
          dateOfBirth: "1995-01-01",
          consents: {
            kycDataProcessing: true,
            financialDataProcessing: true,
            platformNotifications: false,
            marketingCommunications: false,
            analytics: false,
          },
        });
      }

      const res = await api.loginWithMobile({
        identifier: normalizedPhone,
        password: mobilePassword,
      });

      api.setSession(res);
      const me = await api.getMe();
      setUserProfile(me);
      const backendRole = me.role === "ADMIN" ? "ADMIN" : (me.role as Role);
      setRole(backendRole);
      window.localStorage.setItem("yekis-role", backendRole);
      setTelegramAuthStatus("ready");
      await loadData();
    } catch (err) {
      setTelegramAuthStatus("error");
      const raw = err instanceof Error ? err.message : "Login failed";
      if (raw.includes("INVALID_CREDENTIALS") || raw.includes("401")) {
        setTelegramAuthError(
          "Invalid phone number or password. Please check your credentials.",
        );
      } else if (raw.includes("DUPLICATE_USER") || raw.includes("409")) {
        setTelegramAuthError(
          "An account with this phone number already exists. Please switch to Sign In.",
        );
      } else {
        setTelegramAuthError(raw);
      }
    }
  };

  const handleSignOut = () => {
    api.clearToken();
    setTelegramSession(null);
    setUserProfile(null);
    setTelegramAuthStatus("idle");
    setShowMobileLogin(false);
    setActiveTab("home");
    setShowJobForm(false);
  };

  const handleSwitchRole = (newRole: Role) => {
    setRole(newRole);
    window.localStorage.setItem("yekis-role", newRole);
    setActiveTab("home");
    setShowJobForm(false);
  };

  const switchToManualFallback = (p: "TELEBIRR" | "CBE_BIRR" | "M_PESA", amt?: string) => {
    setTopUpMethod("MANUAL");
    setTopUpRail(p);
    if (amt) setTopUpAmount(amt);
    setCheckoutFallback(null);
  };

  const submitCheckoutTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setIsLoading(true);
    setCheckoutFallback(null);
    try {
      const { redirectUrl, topUpId } = await api.initiateCheckoutTopUp(
        Math.round(amount * 100),
        checkoutRail,
      );

      setTelebirrModal({
        isOpen: true,
        redirectUrl: redirectUrl || null,
        topUpId: topUpId || null,
        amount,
        provider: checkoutRail,
        isSimulating: false,
      });

      if (redirectUrl) {
        const tg = window.Telegram?.WebApp;
        if (tg && typeof tg.openLink === "function") {
          tg.openLink(redirectUrl);
        } else {
          window.open(redirectUrl, "_blank");
        }
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : "Payment gateway request failed";
      setCheckoutFallback({
        amount: topUpAmount.trim(),
        provider: checkoutRail,
        reason: errText,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAttachReceipt = async () => {
    if (!attachingReceiptTopUpId || !attachRefNumber.trim() || !attachReceiptFile) {
      alert("Please enter the reference number and attach the transfer receipt.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("referenceNumber", attachRefNumber.trim());
      formData.append("receipt", attachReceiptFile);
      await api.attachTopUpReceipt(attachingReceiptTopUpId, formData);
      setAttachingReceiptTopUpId(null);
      setAttachRefNumber("");
      setAttachReceiptFile(null);
      await Promise.all([fetchTopUpRequests(), fetchWallet()]);
      alert("Receipt attached successfully! Staff will review and credit your wallet.");
    } catch (err) {
      alert(`Error attaching receipt: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const submitTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0 || !topUpReference || !topUpReceipt) {
      alert("Enter the amount sent, reference number, and receipt.");
      return;
    }
    setIsLoading(true);
    try {
      // Backend contract (topups.routes.ts): provider | amountMinor | referenceNumber | receipt file.
      // The old field names here (amountEtb/rail/senderName/senderReference) never matched and
      // would have been silently dropped by the server's validation.
      const formData = new FormData();
      formData.append("provider", topUpRail);
      formData.append("amountMinor", String(Math.round(amount * 100)));
      formData.append("referenceNumber", topUpReference);
      formData.append("receipt", topUpReceipt);
      await api.createTopUpRequest(formData);
      setTopUpAmount("");
      setTopUpReference("");
      setTopUpReceipt(null);
      await Promise.all([fetchTopUpRequests(), fetchWallet()]);
      alert("Top-up submitted for approval.");
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to submit top-up"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const submitKyc = async () => {
    if (
      faydaIdNumber.trim().length < 6 ||
      !faydaIdPhoto ||
      !selfieWithIdPhoto
    ) {
      alert("Add your Fayda ID number, ID photo, and selfie holding the ID.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("faydaIdNumber", faydaIdNumber.trim());
      formData.append("idPhoto", faydaIdPhoto);
      formData.append("selfieWithId", selfieWithIdPhoto);
      await api.submitFreelancerFaydaSelfie(formData);
      setFaydaIdNumber("");
      setFaydaIdPhoto(null);
      setSelfieWithIdPhoto(null);
      setKycStatus("UNDER_REVIEW");
      await fetchKycStatus();
      alert("Your Fayda review has been submitted.");
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to submit KYC"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (
      !jobForm.title.trim() ||
      !jobForm.description.trim() ||
      !jobForm.budgetMin ||
      !jobForm.budgetMax
    ) {
      alert("Please fill in all required job fields.");
      return;
    }
    setIsLoading(true);
    try {
      await api.createJob({
        ...jobForm,
        budgetMin: {
          amountMinor: Number(jobForm.budgetMin) * 100,
          currency: "ETB",
        },
        budgetMax: {
          amountMinor: Number(jobForm.budgetMax) * 100,
          currency: "ETB",
        },
        proposedMilestones: [
          {
            title: "Final Delivery",
            amount: {
              amountMinor: Number(jobForm.budgetMax) * 100,
              currency: "ETB",
            },
            dueDate: jobForm.deadline,
          },
        ],
      });
      setShowJobForm(false);
      setJobForm({
        title: "",
        category: "WEB_APP_DEVELOPMENT",
        description: "",
        budgetMin: "",
        budgetMax: "",
        deadline: getDefaultMilestoneDueDate(),
      });
      await fetchJobs();
      alert("Job created successfully!");
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to create job"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFundMilestone = async (milestoneId: string) => {
    setIsLoading(true);
    try {
      await api.fundMilestoneFromWallet(milestoneId);
      await fetchMilestones();
      await fetchWallet();
      alert("Milestone funded successfully into escrow!");
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to fund milestone. Check wallet balance."}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    if (
      !confirm(
        "Are you sure you want to approve this delivery and release escrow payment to the freelancer?",
      )
    )
      return;
    setIsLoading(true);
    try {
      await api.acceptMilestone(milestoneId);
      await fetchMilestones();
      await fetchWallet();
      alert("Milestone accepted and escrow funds released!");
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to release milestone"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDeliverable = async (milestoneId: string) => {
    setIsLoading(true);
    try {
      await api.submitMilestone(milestoneId);
      alert(
        "Deliverables submitted! The client has been notified to review and release funds.",
      );
      await fetchMilestones();
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to submit deliverables"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProposal = (job: Job) => {
    setJobDetail({ isOpen: false, job: null });
    setProposalModal({
      isOpen: true,
      jobId: job.id,
      jobTitle: job.title,
      amountEtb: String(job.budgetMaxMinor / 100),
      days: "7",
      coverLetter: "",
      attachments: [],
    });
  };

  const handleSendProposal = async () => {
    if (proposalModal.coverLetter.trim().length < 20) {
      alert("Please enter a cover letter of at least 20 characters explaining your approach.");
      return;
    }
    const amount = Number(proposalModal.amountEtb);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount in ETB.");
      return;
    }
    setIsLoading(true);
    try {
      const attachmentPaths: string[] = [];
      for (const file of proposalModal.attachments) {
        const result = await api.uploadProposalAttachment(proposalModal.jobId, file);
        attachmentPaths.push(result.path);
      }

      await api.submitProposal({
        jobId: proposalModal.jobId,
        coverLetter: proposalModal.coverLetter.trim(),
        quotedAmountMinor: Math.round(amount * 100),
        estimatedDays: Number(proposalModal.days) || 7,
        milestoneBreakdown: [
          {
            title: "Milestone Delivery",
            amountMinor: Math.round(amount * 100),
            dueDate: getDefaultMilestoneDueDate(),
          },
        ],
        attachmentPaths,
      });
      setProposalModal({
        isOpen: false,
        jobId: "",
        jobTitle: "",
        amountEtb: "",
        days: "7",
        coverLetter: "",
        attachments: [],
      });
      alert("Proposal submitted successfully!");
      await fetchJobs();
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to submit proposal"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Derived display flags
  const isPaymentReturn = window.location.pathname === "/payment/return";
  const isNonTelegram = !telegram.isTelegram;

  if (isPaymentReturn) {
    return <PaymentReturn />;
  }

  if (isNonTelegram) {
    return <FullPlatformApp />;
  }

  if (telegramAuthStatus !== "ready") {
    return (
      <main className="welcome-screen">
        <div className="welcome-screen-inner">
          {showMobileLogin && (
            <div className="welcome-topbar" style={{ marginBottom: "14px" }}>
              <button
                className="back-btn"
                onClick={() => {
                  setShowMobileLogin(false);
                  setTelegramAuthError("");
                }}
                aria-label="Back"
              >
                <ArrowLeft size={16} /> <span>Back</span>
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img
                src="/svgviewer-output.svg"
                alt="Yekis Logo"
                className="platform-logo"
                style={{ width: "44px", height: "44px", flexShrink: 0 }}
              />
              <div>
                <p
                  className="eyebrow"
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "0.75rem",
                    letterSpacing: "0.06em",
                  }}
                >
                  YEKIS JOBS
                </p>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.65rem",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Work that moves forward.
                </h1>
              </div>
            </div>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              style={{ flexShrink: 0 }}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          <p
            className="welcome-copy"
            style={{
              fontSize: "0.92rem",
              lineHeight: 1.5,
              margin: "0 0 24px 0",
              color: "var(--color-text-secondary)",
            }}
          >
            A trusted Ethiopian workspace for finding talent, delivering work,
            and keeping every payment clear.
          </p>

          <div
            style={{
              display: "flex",
              width: "100%",
              background: "var(--color-bg-elevated)",
              padding: 5,
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 9,
                border: "none",
                background: !showMobileLogin
                  ? "var(--color-primary)"
                  : "transparent",
                color: !showMobileLogin
                  ? "#ffffff"
                  : "var(--color-text-secondary)",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => {
                setShowMobileLogin(false);
                setTelegramAuthError("");
              }}
            >
              Telegram Login
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 9,
                border: "none",
                background: showMobileLogin
                  ? "var(--color-primary)"
                  : "transparent",
                color: showMobileLogin
                  ? "#ffffff"
                  : "var(--color-text-secondary)",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => {
                setShowMobileLogin(true);
                setTelegramAuthError("");
              }}
            >
              Mobile Phone
            </button>
          </div>
          {telegram.unsafeUser && !showMobileLogin && (
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "10px 16px",
                background: "var(--color-bg-elevated)",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
                marginBottom: "22px",
                boxSizing: "border-box",
              }}
            >
              <CheckCircle2
                size={18}
                style={{ color: "var(--color-primary)", flexShrink: 0 }}
              />
              <div
                style={{
                  textAlign: "left",
                  fontSize: "0.88rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span>
                  Verified Telegram:{" "}
                  <strong style={{ color: "var(--color-text)" }}>
                    {telegram.unsafeUser.first_name}{" "}
                    {telegram.unsafeUser.last_name || ""}
                  </strong>
                </span>
              </div>
            </div>
          )}
          {telegramAuthStatus === "loading" && (
            <div
              className="role-card selected"
              style={{ width: "100%", textAlign: "center", padding: "20px" }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                Securing your session...
              </p>
            </div>
          )}
          {telegramAuthError && (
            <div
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid #ef4444",
                borderRadius: "10px",
                color: "#ef4444",
                fontSize: "0.82rem",
                marginBottom: "16px",
                textAlign: "left",
              }}
            >
              <strong>Authentication notice:</strong>
              <p style={{ margin: "4px 0 0 0", lineHeight: 1.4 }}>
                {telegramAuthError}
              </p>
            </div>
          )}
          {!showMobileLogin ? (
            <div
              className="role-options"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                width: "100%",
              }}
            >
              {roleOptions.map((option) => (
                <button
                  className="role-card"
                  key={option.role}
                  onClick={() => startSession(option.role)}
                  disabled={telegramAuthStatus === "loading"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px 18px",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "16px",
                    textAlign: "left",
                    width: "100%",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(34, 197, 94, 0.12)",
                      color: "var(--color-primary)",
                      flexShrink: 0,
                    }}
                  >
                    {option.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "1.05rem",
                        color: "var(--color-text)",
                        marginBottom: "5px",
                      }}
                    >
                      {option.title}
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.86rem",
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.45,
                      }}
                    >
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                textAlign: "left",
                background: "var(--color-bg-elevated)",
                padding: "18px",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <strong
                  style={{ fontSize: "1rem", color: "var(--color-text)" }}
                >
                  {mobileAuthMode === "signin"
                    ? "Sign In with Mobile"
                    : "Create Mobile Account"}
                </strong>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={() =>
                    setMobileAuthMode(
                      mobileAuthMode === "signin" ? "signup" : "signin",
                    )
                  }
                >
                  {mobileAuthMode === "signin"
                    ? "Need an account? Sign up"
                    : "Have an account? Sign in"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "0.82rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Ethiopian Phone Number
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    placeholder="0911223344 or +251..."
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "0.82rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Password / PIN
                  <input
                    type="password"
                    value={mobilePassword}
                    onChange={(e) => setMobilePassword(e.target.value)}
                    placeholder="Enter password"
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                  />
                </label>

                {mobileAuthMode === "signup" && (
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      fontSize: "0.82rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Account Role
                    <select
                      value={mobileRole}
                      onChange={(e) =>
                        setMobileRole(e.target.value as "CLIENT" | "FREELANCER")
                      }
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                      }}
                    >
                      <option value="FREELANCER">
                        Freelancer (Work & Earn)
                      </option>
                      <option value="CLIENT">Client (Hire & Pay Escrow)</option>
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: "8px", width: "100%" }}
                  onClick={handleMobileAuth}
                  disabled={telegramAuthStatus === "loading"}
                >
                  {telegramAuthStatus === "loading"
                    ? "Verifying..."
                    : mobileAuthMode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  const navItems: { tab: Tab; icon: React.ReactNode; label: string }[] =
    role === "FREELANCER"
      ? [
          { tab: "home", icon: <Home size={20} />, label: "Home" },
          { tab: "jobs", icon: <Search size={20} />, label: "Find work" },
          { tab: "escrow", icon: <Briefcase size={20} />, label: "Contracts" },
          { tab: "wallet", icon: <Wallet size={20} />, label: "Wallet" },
          { tab: "kyc", icon: <UserCircle size={20} />, label: "Profile" },
        ]
      : role === "ADMIN"
        ? [
            { tab: "home", icon: <Home size={20} />, label: "Overview" },
            { tab: "escrow", icon: <Briefcase size={20} />, label: "Escrow" },
            {
              tab: "disputes",
              icon: <ShieldAlert size={20} />,
              label: "Cases",
            },
            { tab: "kyc", icon: <UserCircle size={20} />, label: "Team" },
          ]
        : [
            { tab: "home", icon: <Home size={20} />, label: "Home" },
            {
              tab: "jobs",
              icon: <PlusCircle size={20} />,
              label: "Post a job",
            },
            {
              tab: "escrow",
              icon: <Briefcase size={20} />,
              label: "Contracts",
            },
            { tab: "wallet", icon: <Wallet size={20} />, label: "Wallet" },
            { tab: "kyc", icon: <UserCircle size={20} />, label: "Profile" },
          ];

  const displayName =
    userProfile?.phone ||
    userProfile?.email ||
    telegramSession?.telegram.firstName ||
    "Account";

  return (
    <div className="platform-shell mini-platform-shell">
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
          <span className="avatar">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>{formatRole(role)}</strong>
            <small>{displayName}</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.tab}
              className={activeTab === item.tab ? "active" : ""}
              onClick={() => {
                setActiveTab(item.tab);
                setShowJobForm(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="platform-main">
        <header className="platform-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(activeTab !== "home" || showJobForm || proposalModal.isOpen) && (
              <button
                className="icon-button back-btn"
                aria-label="Go back"
                onClick={handleUniversalBack}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <span className="eyebrow">{formatRole(role)} workspace</span>
              <h1 style={{ fontSize: "1.25rem", margin: 0 }}>
                {showJobForm
                  ? "New Job Brief"
                  : proposalModal.isOpen
                    ? "Submit Proposal"
                    : activeTab === "home"
                      ? "Good day"
                      : navItems.find((item) => item.tab === activeTab)
                          ?.label || "Yekis"}
              </h1>
            </div>
          </div>
          <div
            className="topbar-actions"
            style={{ gap: 10, alignItems: "center" }}
          >
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="user-menu" onClick={() => setActiveTab("kyc")}>
              <span className="avatar">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span>Profile</span>
            </button>
          </div>
        </header>

        {/* Job Detail View */}
        {jobDetail.isOpen && jobDetail.job && (
          <section className="platform-content">
            <section className="panel job-detail-panel">
              <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Job Details</h2>
                <button
                  style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}
                  onClick={() => setJobDetail({ isOpen: false, job: null })}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ marginTop: 16 }}>
                <h2>{jobDetail.job.title}</h2>
                <div className="job-meta">
                  <span className="status-pill">Open</span>
                  <span>Budget: ETB {(jobDetail.job.budgetMinMinor / 100).toLocaleString()} – {(jobDetail.job.budgetMaxMinor / 100).toLocaleString()}</span>
                  <span>Deadline: {new Date(jobDetail.job.deadline).toLocaleDateString()}</span>
                </div>
                <h4>Description</h4>
                <p>{jobDetail.job.description}</p>
                {jobDetail.job.proposedMilestones && (
                  <>
                    <h4>Proposed Milestones</h4>
                    <pre style={{ background: "var(--color-bg-subtle)", padding: 12, borderRadius: 8, fontSize: "0.85rem", overflow: "auto", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(jobDetail.job.proposedMilestones, null, 2)}
                    </pre>
                  </>
                )}
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  className="btn-primary"
                  onClick={() => handleOpenProposal(jobDetail.job!)}
                >
                  Apply Now
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setJobDetail({ isOpen: false, job: null })}
                >
                  Back
                </button>
              </div>
            </section>
          </section>
        )}

        {/* Telebirr Top-Up Pop-Up / Modal */}
        {telebirrModal.isOpen && (
          <section className="platform-content">
            <section className="panel" style={{ maxWidth: 480, margin: "0 auto" }}>
              <div
                className="panel-heading"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={
                      telebirrModal.provider === "TELEBIRR"
                        ? "/payment/Telebirr.png"
                        : telebirrModal.provider === "CBE_BIRR"
                          ? "/payment/cbe payment.jpg"
                          : "/payment/mpesa.svg"
                    }
                    alt={
                      telebirrModal.provider === "TELEBIRR"
                        ? "Telebirr"
                        : telebirrModal.provider === "CBE_BIRR"
                          ? "CBE Birr"
                          : "M-Pesa"
                    }
                    style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, background: "#fff" }}
                  />
                  <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
                    {telebirrModal.provider === "TELEBIRR"
                      ? "Telebirr Checkout"
                      : telebirrModal.provider === "CBE_BIRR"
                        ? "CBE Birr Checkout"
                        : "M-Pesa Checkout"}
                  </h2>
                </div>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                  onClick={() => setTelebirrModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    background: "var(--color-bg)",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      Top-up Amount
                    </span>
                    <strong style={{ display: "block", fontSize: "1.4rem", color: "var(--color-primary)" }}>
                      ETB {telebirrModal.amount.toLocaleString()}
                    </strong>
                  </div>
                  <span
                    style={{
                      background: "rgba(34, 197, 94, 0.12)",
                      color: "var(--color-primary)",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    Instant Checkout
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.5,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0" }}>
                    {telebirrModal.provider === "TELEBIRR"
                      ? "Telebirr"
                      : telebirrModal.provider === "CBE_BIRR"
                        ? "CBE Birr"
                        : "Safaricom M-Pesa"}{" "}
                    payment gateway was launched in your browser. Complete the payment there, or use sandbox simulation below:
                  </p>
                  {import.meta.env.DEV && (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>
                      <strong>Note for Dev/Testing:</strong> In sandbox environments, entering real customer numbers may fail. Click <strong>Simulate Instant Payment</strong> below to approve without sandbox phone numbers.
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {telebirrModal.redirectUrl && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        const tg = window.Telegram?.WebApp;
                        if (tg && typeof tg.openLink === "function") {
                          tg.openLink(telebirrModal.redirectUrl!);
                        } else {
                          window.open(telebirrModal.redirectUrl!, "_blank");
                        }
                      }}
                    >
                      Re-open {telebirrModal.provider === "TELEBIRR" ? "Telebirr" : telebirrModal.provider === "CBE_BIRR" ? "CBE Birr" : "M-Pesa"} Paygate
                    </button>
                  )}

                  {/* Dev-only: the backend disables this endpoint in production.
                      Hidden from production builds so real users never see a
                      "get free money" button. */}
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: "100%", justifyContent: "center" }}
                      disabled={telebirrModal.isSimulating}
                      onClick={async () => {
                        if (!telebirrModal.topUpId) return;
                        setTelebirrModal((prev) => ({ ...prev, isSimulating: true }));
                        try {
                          await api.simulateTopUpSuccess(telebirrModal.topUpId);
                          alert(`Success! ETB ${telebirrModal.amount.toLocaleString()} credited to your wallet.`);
                          setTelebirrModal((prev) => ({ ...prev, isOpen: false, isSimulating: false }));
                          await fetchWallet();
                          await fetchTopUpRequests();
                        } catch (err) {
                          alert(`Simulation error: ${err instanceof Error ? err.message : "Failed"}`);
                          setTelebirrModal((prev) => ({ ...prev, isSimulating: false }));
                        }
                      }}
                    >
                      {telebirrModal.isSimulating ? "Processing..." : "Simulate Instant Payment (Sandbox)"}
                    </button>
                  )}

                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "8px",
                    }}
                    onClick={() => setTelebirrModal((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Close
                  </button>
                </div>
              </div>
            </section>
          </section>
        )}

        {/* Manual Verification Receipt Attachment Modal */}
        {attachingReceiptTopUpId && (
          <section className="platform-content">
            <section className="panel" style={{ maxWidth: 480, margin: "0 auto" }}>
              <div
                className="panel-heading"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <p className="eyebrow" style={{ margin: "0 0 2px 0" }}>Manual Fallback</p>
                  <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Attach Payment Receipt</h3>
                </div>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                  onClick={() => setAttachingReceiptTopUpId(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 14 }}>
                If your automated payment was completed or delayed, submit your reference number and receipt here. Our operations team will promptly review and credit your balance.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  Transaction Reference Number
                  <input
                    value={attachRefNumber}
                    onChange={(e) => setAttachRefNumber(e.target.value)}
                    placeholder="e.g. TB-12345 or CBE-REF"
                  />
                </label>

                <label>
                  Receipt File (Image or PDF)
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setAttachReceiptFile(e.target.files?.[0] || null)}
                  />
                </label>

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={submitAttachReceipt}
                    disabled={isLoading}
                  >
                    {isLoading ? "Submitting..." : "Submit to Staff Queue"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setAttachingReceiptTopUpId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </section>
        )}

        {/* Proposal Submission Modal */}
        {proposalModal.isOpen && (
          <section className="platform-content">
            <section className="panel job-form">
              <div
                className="panel-heading"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2>Send Proposal</h2>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setProposalModal((prev) => ({ ...prev, isOpen: false }))
                  }
                >
                  <X size={20} />
                </button>
              </div>
              <div
                style={{
                  padding: "8px 0 14px",
                  borderBottom: "1px solid var(--color-border)",
                  marginBottom: 16,
                }}
              >
                <span className="eyebrow">Target Job</span>
                <h3 style={{ margin: "4px 0 0", color: "var(--color-text)" }}>
                  {proposalModal.jobTitle}
                </h3>
              </div>
              <div className="form-grid">
                <label>
                  Your Quote (ETB)
                  <input
                    type="number"
                    value={proposalModal.amountEtb}
                    onChange={(e) =>
                      setProposalModal((prev) => ({
                        ...prev,
                        amountEtb: e.target.value,
                      }))
                    }
                    placeholder="e.g. 15000"
                    required
                  />
                </label>
                <label>
                  Estimated Timeline (Days)
                  <input
                    type="number"
                    value={proposalModal.days}
                    onChange={(e) =>
                      setProposalModal((prev) => ({
                        ...prev,
                        days: e.target.value,
                      }))
                    }
                    placeholder="e.g. 7"
                    required
                  />
                </label>
                <label className="form-wide">
                  Cover Letter & Approach
                  <textarea
                    rows={4}
                    value={proposalModal.coverLetter}
                    onChange={(e) =>
                      setProposalModal((prev) => ({
                        ...prev,
                        coverLetter: e.target.value,
                      }))
                    }
                    onFocus={() => {
                      if (window.Telegram?.WebApp) {
                        window.Telegram.WebApp.expand();
                      }
                    }}
                    autoComplete="off"
                    placeholder="Explain your relevant experience, milestone breakdown, and timeline..."
                    required
                  />
                </label>
              </div>

              <div className="proposal-attachments form-wide">
                <label className="file-upload-btn">
                  <Paperclip size={16} /> Attach Files
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        setProposalModal(prev => ({
                          ...prev,
                          attachments: [...prev.attachments, ...Array.from(e.target.files!)]
                        }));
                      }
                    }}
                  />
                </label>
                {proposalModal.attachments.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {proposalModal.attachments.map((file, idx) => (
                      <span key={idx} className="attachment-chip">
                        {file.name}
                        <button
                          type="button"
                          onClick={() => setProposalModal(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== idx)
                          }))}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={handleSendProposal}
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Send Proposal"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setProposalModal((prev) => ({ ...prev, isOpen: false }))
                  }
                >
                  Cancel
                </button>
              </div>
            </section>
          </section>
        )}

        {showJobForm && !proposalModal.isOpen && !jobDetail.isOpen ? (
          <section className="platform-content">
            <section className="panel job-form">
              <div className="panel-heading">
                <h2>Create Job Brief</h2>
              </div>
              <div className="form-grid">
                <label>
                  Title
                  <input
                    value={jobForm.title}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, title: e.target.value })
                    }
                    placeholder="e.g. Need a modern mobile UI design"
                    required
                  />
                </label>
                <label>
                  Category
                  <select
                    value={jobForm.category}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, category: e.target.value })
                    }
                  >
                    <option value="WEB_APP_DEVELOPMENT">
                      Web App Development
                    </option>
                    <option value="GRAPHIC_DESIGN">Graphic Design</option>
                    <option value="DIGITAL_MARKETING">Digital Marketing</option>
                    <option value="CONTENT_WRITING">Content Writing</option>
                    <option value="TRANSLATION">Translation</option>
                    <option value="DATA_ENTRY">Data Entry</option>
                  </select>
                </label>
                <label className="form-wide">
                  Description
                  <textarea
                    rows={4}
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, description: e.target.value })
                    }
                    placeholder="Describe the outcome, expectations, and deliverables..."
                    required
                  />
                </label>
                <label>
                  Min Budget (ETB)
                  <input
                    type="number"
                    value={jobForm.budgetMin}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, budgetMin: e.target.value })
                    }
                    placeholder="e.g. 5000"
                    required
                  />
                </label>
                <label>
                  Max Budget (ETB)
                  <input
                    type="number"
                    value={jobForm.budgetMax}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, budgetMax: e.target.value })
                    }
                    placeholder="e.g. 15000"
                    required
                  />
                </label>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={handleCreateJob}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Publish Job"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowJobForm(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </section>
        ) : (
          !proposalModal.isOpen && !jobDetail.isOpen && (
            <>
              {activeTab === "home" && (
                <section className="platform-content">
                  <div className="overview-hero">
                    <div>
                      <p className="eyebrow">
                        {role === "ADMIN"
                          ? "Operations desk"
                          : "Good to have you here"}
                      </p>
                      <h2>
                        {role === "FREELANCER"
                          ? "Find your next win"
                          : role === "ADMIN"
                            ? "Keep the marketplace moving"
                            : "Build something great"}
                      </h2>
                      <p>
                        {role === "FREELANCER"
                          ? "Browse work that matches your skills and keep delivery on track."
                          : role === "ADMIN"
                            ? "Review activity, protect payments, and support both sides."
                            : "Turn a clear brief into work you are proud of."}
                      </p>
                    </div>
                    {role === "CLIENT" && (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setActiveTab("jobs");
                          setShowJobForm(true);
                        }}
                      >
                        Post a job <PlusCircle size={16} />
                      </button>
                    )}
                    {role === "FREELANCER" && (
                      <button
                        className="btn-primary"
                        onClick={() => setActiveTab("jobs")}
                      >
                        Find work <Search size={16} />
                      </button>
                    )}
                  </div>

                  <div className="platform-metrics">
                    <article className="metric-card">
                      <small>Wallet balance</small>
                      <strong>ETB {walletBalance.toLocaleString()}</strong>
                      <span>Approved funds</span>
                    </article>
                    <article className="metric-card">
                      <small>
                        {role === "ADMIN" ? "Needs review" : "Active work"}
                      </small>
                      <strong>
                        {role === "ADMIN"
                          ? topUpRequests.filter(
                              (item) => item.status === "PENDING_REVIEW",
                            ).length
                          : milestones.filter(
                              (item) => item.escrowState !== "RELEASED",
                            ).length}
                      </strong>
                      <span>
                        {role === "ADMIN" ? "Receipts in queue" : "Milestones"}
                      </span>
                    </article>
                    <article className="metric-card">
                      <small>Open jobs</small>
                      <strong>{jobs.length}</strong>
                      <span>Opportunities</span>
                    </article>
                  </div>

                  <section className="panel profile-wallet-card">
                    <div>
                      <p className="eyebrow">Wallet</p>
                      <h2>ETB {walletBalance.toLocaleString()}</h2>
                      <p>Secure Ethiopian escrow and instant wallet ledger.</p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => setActiveTab("wallet")}
                    >
                      Open wallet <Wallet size={16} />
                    </button>
                  </section>

                  <div className="platform-grid">
                    {role === "CLIENT" && (
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Your workspace</h2>
                          <button onClick={() => setActiveTab("escrow")}>
                            See all
                          </button>
                        </div>
                        <div className="quick-grid">
                          <button
                            onClick={() => {
                              setActiveTab("jobs");
                              setShowJobForm(true);
                            }}
                          >
                            <span>
                              <PlusCircle size={20} />
                            </span>
                            <strong>Post a job</strong>
                            <small>Start a brief</small>
                          </button>
                          <button onClick={() => setActiveTab("wallet")}>
                            <span>
                              <Wallet size={20} />
                            </span>
                            <strong>Add funds</strong>
                            <small>Upload a receipt</small>
                          </button>
                        </div>
                      </section>
                    )}
                    {role === "FREELANCER" && (
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Next steps</h2>
                        </div>
                        <div className="list-card">
                          <button onClick={() => setActiveTab("jobs")}>
                            <span className="list-icon">
                              <Search size={20} />
                            </span>
                            <span>
                              <strong>Browse open jobs</strong>
                              <small>
                                {jobs.length || "New"} opportunities waiting
                              </small>
                            </span>
                            <b>›</b>
                          </button>
                          <button onClick={() => setActiveTab("kyc")}>
                            <span className="list-icon">
                              <UserCircle size={20} />
                            </span>
                            <span>
                              <strong>Complete identity review</strong>
                              <small>
                                {kycStatus === "APPROVED"
                                  ? "Verified for payouts"
                                  : "Fayda review required for payouts"}
                              </small>
                            </span>
                            <b>›</b>
                          </button>
                        </div>
                      </section>
                    )}
                    {role === "ADMIN" && (
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Review queue</h2>
                          <button onClick={() => setActiveTab("wallet")}>
                            Open queue
                          </button>
                        </div>
                        <div className="list-card">
                          <button onClick={() => setActiveTab("wallet")}>
                            <span className="list-icon">
                              <Wallet size={20} />
                            </span>
                            <span>
                              <strong>Top-up receipts</strong>
                              <small>
                                {
                                  topUpRequests.filter(
                                    (item) => item.status === "PENDING_REVIEW",
                                  ).length
                                }{" "}
                                pending approval
                              </small>
                            </span>
                            <b>›</b>
                          </button>
                          <button onClick={() => setActiveTab("kyc")}>
                            <span className="list-icon">
                              <UserCircle size={20} />
                            </span>
                            <span>
                              <strong>Identity reviews</strong>
                              <small>Fayda ID and selfie submissions</small>
                            </span>
                            <b>›</b>
                          </button>
                        </div>
                      </section>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "jobs" && (
                <section className="platform-content">
                  <div className="content-toolbar">
                    <div>
                      <h2>
                        {role === "CLIENT" ? "Job postings" : "Find work"}
                      </h2>
                      <p>
                        {role === "CLIENT"
                          ? "Share your brief and let the right freelancer come to you."
                          : "Browse open opportunities across the marketplace."}
                      </p>
                    </div>
                    {role === "CLIENT" && (
                      <button
                        className="btn-primary"
                        onClick={() => setShowJobForm(true)}
                      >
                        Create job brief <PlusCircle size={16} />
                      </button>
                    )}
                  </div>
                  <div className="job-list">
                    {jobs.length === 0 ? (
                      <p className="empty-state">
                        No open jobs at the moment. Check back soon.
                      </p>
                    ) : (
                      jobs.map((job) => (
                        <article className="job-platform-card" key={job.id}>
                          <div>
                            <span className="status-pill">Open</span>
                            <h3>{job.title}</h3>
                            <p>{job.description}</p>
                            <small>
                              Budget: ETB{" "}
                              {(job.budgetMinMinor / 100).toLocaleString()} –{" "}
                              {(job.budgetMaxMinor / 100).toLocaleString()}
                            </small>
                          </div>
                          {role === "FREELANCER" && (
                            <button
                              className="btn-primary"
                              onClick={() => handleOpenProposal(job)}
                              disabled={isLoading}
                            >
                              Send proposal
                            </button>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </section>
              )}

              {activeTab === "escrow" && (
                <section className="platform-content">
                  <div className="content-toolbar">
                    <div>
                      <h2>
                        {role === "CLIENT" ? "Your contracts" : "Your work"}
                      </h2>
                      <p>
                        Track milestone delivery, escrow funding, and payouts.
                      </p>
                    </div>
                  </div>
                  <div className="contract-table">
                    <div className="table-head">
                      <span>Milestone</span>
                      <span>Amount</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>
                    {milestones.length === 0 ? (
                      <p className="empty-state">
                        No milestones yet. Your active contracts will appear
                        here.
                      </p>
                    ) : (
                      milestones.map((milestone) => (
                        <div className="table-row" key={milestone.id}>
                          <strong>{milestone.title}</strong>
                          <span>
                            ETB {(milestone.amountMinor / 100).toLocaleString()}
                          </span>
                          <span className="status-pill">
                            {milestone.escrowState.replaceAll("_", " ")}
                          </span>
                          <span>
                            {milestone.escrowState === "PAYMENT_PENDING" &&
                              role === "CLIENT" && (
                                <button
                                  className="btn-primary"
                                  onClick={() =>
                                    handleFundMilestone(milestone.id)
                                  }
                                  disabled={isLoading}
                                >
                                  Fund Escrow
                                </button>
                              )}
                            {milestone.escrowState === "FUNDED" &&
                              role === "FREELANCER" && (
                                <button
                                  className="btn-primary"
                                  onClick={() =>
                                    handleSubmitDeliverable(milestone.id)
                                  }
                                  disabled={isLoading}
                                >
                                  Submit Work
                                </button>
                              )}
                            {milestone.escrowState === "SUBMITTED_FOR_REVIEW" &&
                              role === "CLIENT" && (
                                <button
                                  className="btn-primary"
                                  onClick={() =>
                                    handleReleaseMilestone(milestone.id)
                                  }
                                  disabled={isLoading}
                                >
                                  Accept & Release
                                </button>
                              )}
                            {milestone.escrowState === "RELEASED" && (
                              <span
                                style={{
                                  color: "var(--color-primary)",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                }}
                              >
                                Completed
                              </span>
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {activeTab === "wallet" && (
                <section className="platform-content">
                  <div className="wallet-hero">
                    <div>
                      <p className="eyebrow">Available balance</p>
                      <strong>ETB {walletBalance.toLocaleString()}</strong>
                      <span>Approved funds</span>
                    </div>
                  </div>
                  <div className="platform-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Add Funds</h2>
                      </div>
                      <div className="tabs" style={{ marginBottom: 16 }}>
                        <button
                          className={topUpMethod === "INSTANT" ? "active" : ""}
                          onClick={() => setTopUpMethod("INSTANT")}
                        >
                          Instant Checkout
                        </button>
                        <button
                          className={topUpMethod === "MANUAL" ? "active" : ""}
                          onClick={() => setTopUpMethod("MANUAL")}
                        >
                          Manual Transfer
                        </button>
                      </div>

                      {topUpMethod === "INSTANT" ? (
                        <>
                          <p style={{ marginBottom: 14, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            Pay with instant mobile checkout. Your wallet will be credited automatically.
                          </p>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 8,
                              marginBottom: 16,
                            }}
                          >
                            <button
                              type="button"
                              className={checkoutRail === "TELEBIRR" ? "payment-account selected" : "payment-account"}
                              style={{ padding: "8px 6px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                              onClick={() => {
                                setCheckoutRail("TELEBIRR");
                                setCheckoutFallback(null);
                              }}
                            >
                              <img src="/payment/Telebirr.png" alt="Telebirr" style={{ width: 36, height: 36, objectFit: "contain" }} />
                              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Telebirr</span>
                            </button>
                            <button
                              type="button"
                              className={checkoutRail === "CBE_BIRR" ? "payment-account selected" : "payment-account"}
                              style={{ padding: "8px 6px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                              onClick={() => {
                                setCheckoutRail("CBE_BIRR");
                                setCheckoutFallback(null);
                              }}
                            >
                              <img src="/payment/cbe payment.jpg" alt="CBE Birr" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
                              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>CBE Birr</span>
                            </button>
                            <button
                              type="button"
                              className={checkoutRail === "M_PESA" ? "payment-account selected" : "payment-account"}
                              style={{ padding: "8px 6px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                              onClick={() => {
                                setCheckoutRail("M_PESA");
                                setCheckoutFallback(null);
                              }}
                            >
                              <img src="/payment/mpesa.svg" alt="M-Pesa" style={{ width: 36, height: 36, objectFit: "contain" }} />
                              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>M-Pesa</span>
                            </button>
                          </div>

                          <label>
                            Amount to add (ETB)
                            <input
                              value={topUpAmount}
                              onChange={(event) => setTopUpAmount(event.target.value)}
                              inputMode="decimal"
                              placeholder="e.g. 1000"
                            />
                          </label>

                          {checkoutFallback && (
                            <div
                              style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 8,
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                              }}
                            >
                              <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "#dc2626", fontWeight: 600 }}>
                                Gateway unreachable: {checkoutFallback.reason}
                              </p>
                              <p style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                Don't let an API outage stop you! Switch to manual verification to transfer directly and attach your receipt for immediate staff credit.
                              </p>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "8px 12px" }}
                                onClick={() => switchToManualFallback(checkoutFallback.provider, checkoutFallback.amount)}
                              >
                                Switch to Manual Verification →
                              </button>
                            </div>
                          )}

                          <button
                            className="btn-primary"
                            style={{ marginTop: 16, width: "100%", display: "flex", justifyContent: "center" }}
                            onClick={submitCheckoutTopUp}
                            disabled={isLoading}
                          >
                            <img
                              src={
                                checkoutRail === "TELEBIRR"
                                  ? "/payment/Telebirr.png"
                                  : checkoutRail === "CBE_BIRR"
                                    ? "/payment/cbe payment.jpg"
                                    : "/payment/mpesa.svg"
                              }
                              alt=""
                              style={{ width: 24, height: 24, objectFit: "contain", marginRight: 8, background: "#fff", borderRadius: 4 }}
                            />
                            {isLoading
                              ? "Starting checkout..."
                              : `Pay with ${checkoutRail === "TELEBIRR" ? "Telebirr" : checkoutRail === "CBE_BIRR" ? "CBE Birr" : "M-Pesa"}`}
                          </button>
                        </>
                      ) : (
                        <>
                          <p
                            style={{
                              marginBottom: 14,
                              color: "var(--text-secondary)",
                              fontSize: "0.85rem",
                            }}
                          >
                            Send money to one of the accounts below, then upload
                            your receipt for approval.
                          </p>
                          <div className="payment-grid">
                            {Object.entries(paymentAccounts).map(
                              ([key, account]) => (
                                <button
                                  className={
                                    topUpRail === key
                                      ? "payment-account selected"
                                      : "payment-account"
                                  }
                                  key={key}
                                  onClick={() =>
                                    setTopUpRail(key as "TELEBIRR" | "CBE_BIRR" | "M_PESA")
                                  }
                                >
                                  <img
                                    src={account.image}
                                    alt={account.label}
                                    style={account.imgStyle}
                                  />
                                  <div className="payment-account-text">
                                    <strong>{account.label}</strong>
                                    <span>{account.accountName}</span>
                                    <code>{account.accountNumber}</code>
                                  </div>
                                </button>
                              ),
                            )}
                          </div>
                          <label>
                            Amount sent (ETB)
                            <input
                              value={topUpAmount}
                              onChange={(event) =>
                                setTopUpAmount(event.target.value)
                              }
                              inputMode="decimal"
                              placeholder="e.g. 5000"
                            />
                          </label>
                          <label>
                            Transaction/reference number
                            <input
                              value={topUpReference}
                              onChange={(event) =>
                                setTopUpReference(event.target.value)
                              }
                              placeholder="e.g. TB-12345"
                            />
                          </label>
                          <label>
                            Receipt image
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(event) =>
                                setTopUpReceipt(event.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                          <button
                            className="btn-primary"
                            style={{ marginTop: 16 }}
                            onClick={submitTopUp}
                            disabled={isLoading}
                          >
                            {isLoading ? "Submitting..." : "Submit for approval"}
                          </button>
                        </>
                      )}
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Recent top-ups</h2>
                      </div>
                      <div className="list-card" style={{ marginTop: 14 }}>
                        {topUpRequests.length === 0 ? (
                          <p className="empty-state">
                            No top-ups submitted yet.
                          </p>
                        ) : (
                          topUpRequests.map((request) => (
                            <div className="list-row" key={request.id} style={{ alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                              <div style={{ flex: 1 }}>
                                <strong>
                                  ETB{" "}
                                  {(request.amountMinor / 100).toLocaleString()}
                                </strong>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                  {request.provider === "TELEBIRR"
                                    ? "Telebirr"
                                    : request.provider === "CBE_BIRR"
                                      ? "CBE Bank"
                                      : "Safaricom M-Pesa"}{" "}
                                  · {request.referenceNumber}
                                </div>
                                {request.status === "CHECKOUT_PENDING" && (
                                  <div style={{ marginTop: 6 }}>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                                      onClick={() => {
                                        setAttachingReceiptTopUpId(request.id);
                                        setAttachRefNumber(request.referenceNumber || "");
                                      }}
                                    >
                                      Attach receipt for verification
                                    </button>
                                  </div>
                                )}
                              </div>
                              <span className="status-pill">
                                {request.status.replace("_", " ")}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </section>
              )}

              {activeTab === "kyc" && (
                <section className="platform-content">
                  <div className="platform-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Account Details</h2>
                      </div>
                      <div
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid var(--color-border)",
                          marginBottom: 14,
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: "0.85rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Identifier
                        </p>
                        <strong>
                          {userProfile?.email?.endsWith("@yekis.local")
                            ? `Telegram Account (${telegram.unsafeUser?.username ? `@${telegram.unsafeUser.username}` : telegram.unsafeUser?.first_name || "Verified"})`
                            : userProfile?.phone ||
                              userProfile?.email ||
                              displayName}
                        </strong>
                        {userProfile?.ucid && (
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "0.8rem",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            UCID: {userProfile.ucid}
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.85rem",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            Current Workspace Role
                          </p>
                          <strong style={{ color: "var(--color-primary)" }}>
                            {formatRole(role)}
                          </strong>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            onClick={() =>
                              handleSwitchRole(
                                role === "FREELANCER" ? "CLIENT" : "FREELANCER",
                              )
                            }
                          >
                            <RefreshCw size={12} style={{ marginRight: 4 }} />
                            Switch to{" "}
                            {role === "FREELANCER" ? "Client" : "Freelancer"}
                          </button>
                          <button
                            className="btn-secondary"
                            style={{
                              padding: "6px 12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            onClick={handleSignOut}
                          >
                            <LogOut size={14} /> <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Identity Verification</h2>
                      </div>
                      <p
                        style={{
                          marginBottom: 14,
                          color: "var(--text-secondary)",
                          fontSize: "0.85rem",
                        }}
                      >
                        Submit your Fayda ID and a selfie holding it to unlock
                        instant withdrawals.
                      </p>
                      <label>
                        Fayda ID number
                        <input
                          value={faydaIdNumber}
                          onChange={(event) =>
                            setFaydaIdNumber(event.target.value)
                          }
                          placeholder="Enter your Fayda ID number"
                        />
                      </label>
                      <label>
                        Fayda ID photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setFaydaIdPhoto(event.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      <label>
                        Selfie holding Fayda ID
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setSelfieWithIdPhoto(
                              event.target.files?.[0] ?? null,
                            )
                          }
                        />
                      </label>
                      <button
                        className="btn-primary"
                        style={{ marginTop: 16 }}
                        onClick={submitKyc}
                        disabled={isLoading}
                      >
                        {isLoading ? "Submitting..." : "Submit for review"}
                      </button>
                    </section>

                    <section className="panel status-card">
                      <div>
                        <small>Verification status</small>
                        <strong>{kycStatus.replace("_", " ")}</strong>
                      </div>
                      <span
                        className="status-pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {kycStatus === "APPROVED" && <CheckCircle2 size={14} />}{" "}
                        {kycStatus}
                      </span>
                    </section>
                  </div>
                </section>
              )}

              {activeTab === "disputes" && (
                <section className="platform-content">
                  <div className="panel">
                    <div className="panel-heading">
                      <h2>Dispute Resolution</h2>
                    </div>
                    <p
                      style={{
                        marginBottom: 14,
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Milestones in dispute are reviewed by impartial Yekis
                      mediators using contract terms and timeline evidence.
                    </p>
                    <div className="contract-table" style={{ marginTop: 16 }}>
                      {milestones.filter((m) => m.escrowState === "DISPUTED")
                        .length === 0 ? (
                        <p className="empty-state">
                          No active disputes on your account.
                        </p>
                      ) : (
                        milestones
                          .filter((m) => m.escrowState === "DISPUTED")
                          .map((m) => (
                            <div className="table-row" key={m.id}>
                              <strong>{m.title}</strong>
                              <span>
                                ETB {(m.amountMinor / 100).toLocaleString()}
                              </span>
                              <span
                                className="status-pill"
                                style={{
                                  background: "rgba(239, 68, 68, 0.15)",
                                  color: "#ef4444",
                                }}
                              >
                                Disputed
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </section>
              )}
            </>
          )
        )}
      </main>
      <nav className="platform-mobile-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.tab}
            className={activeTab === item.tab ? "active" : ""}
            onClick={() => {
              setActiveTab(item.tab);
              setShowJobForm(false);
              setProposalModal((prev) => ({ ...prev, isOpen: false }));
            }}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
