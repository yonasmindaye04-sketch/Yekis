// === IMPORTS ===
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Info,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import {
  api,
  type TopUpRequest,
  type TransactionMovement,
  type WalletResponse,
} from "./api/client";
import { events } from "./analytics";
import { stashPendingTopUp } from "./PaymentReturn";
import { isTelegramMiniApp } from "./telegram/webApp";
import {
  FiscalDocumentSheet,
  type FiscalDocumentData,
} from "./components/FiscalDocumentModal";
import { TbFileAlert, TbAlertCircle } from "react-icons/tb";
import { Alert, AlertTitle, AlertDescription } from "@/components/base-ui/alert";
import { Avatar, AvatarFallback } from "@/components/base-ui/avatar";
import { cn } from "@/lib/utils";
import { FileUploader } from "@/components/ui/file-upload-1";

export type PaymentRail = "TELEBIRR" | "CBE_BIRR" | "M_PESA";

interface ActiveCheckoutSession {
  topUpId: string;
  provider: PaymentRail;
  amountEtb: number;
  redirectUrl: string | null;
  providerTransactionId: string | null;
  status: "CHECKOUT_PENDING" | "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
  isSimulating: boolean;
  actionError: string;
}

const PROVIDER_LABELS: Record<PaymentRail, string> = {
  TELEBIRR: "Telebirr",
  CBE_BIRR: "CBE Birr",
  M_PESA: "Safaricom M-Pesa",
};

const PROVIDER_LOGOS: Record<PaymentRail, string> = {
  TELEBIRR: "/payment/Telebirr.png",
  CBE_BIRR: "/payment/cbe payment.jpg",
  M_PESA: "/payment/mpesa.svg",
};

// === MAIN COMPONENT ===
export function BrowserWallet({
  wallet,
  topUps,
  onChanged,
  role,
}: {
  wallet: WalletResponse;
  topUps: TopUpRequest[];
  onChanged: () => Promise<void>;
  /* "BOTH" is a real UserRole: a dual-role account can hold a wallet as the
     funding party on one contract while receiving payouts on another, so both
     panels apply and neither may be keyed off `role === "FREELANCER"`. */
  role: "CLIENT" | "FREELANCER" | "BOTH";
}) {
  const [checkoutRail, setCheckoutRail] = useState<PaymentRail>("TELEBIRR");
  const [topUpRail, setTopUpRail] = useState<PaymentRail>("CBE_BIRR");
  const [withdrawRail, setWithdrawRail] = useState<PaymentRail>("TELEBIRR");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState("");
  const [topUpMessageIsError, setTopUpMessageIsError] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [withdrawMessageIsError, setWithdrawMessageIsError] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutIdentifier, setPayoutIdentifier] = useState("");
  // Two-factor approval for the payout. The code is requested only once the
  // amount and destination are on screen, so it is checked against something
  // the user is actually looking at.
  const [withdrawOtp, setWithdrawOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  // Anyone who can fund escrow needs the top-up panel open by default, which
  // now includes dual-role accounts. Defaulting this off for BOTH left them
  // unable to add funds without first opening the panel.
  const [showTopUp, setShowTopUp] = useState(role !== "FREELANCER");
  const [topUpMethod, setTopUpMethod] = useState<"INSTANT" | "MANUAL">("MANUAL");

  // Active checkout session modal & live status polling
  const [activeCheckout, setActiveCheckout] = useState<ActiveCheckoutSession | null>(null);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isCheckingCheckoutStatus, setIsCheckingCheckoutStatus] = useState(false);
  const checkoutDialogRef = useRef<HTMLDialogElement | null>(null);
  const checkoutDialogTitleId = useId();
  const pointerDownOutsideRef = useRef(false);
  const recentTopUpRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Manual verification fallback when API call fails
  const [checkoutFallback, setCheckoutFallback] = useState<{
    amount: string;
    provider: PaymentRail;
  } | null>(null);

  // Manual attachment on existing checkout
  const [attachingTopUpId, setAttachingTopUpId] = useState<string | null>(null);
  const [attachRef, setAttachRef] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [isAttachingSubmitting, setIsAttachingSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [copiedTxField, setCopiedTxField] = useState<string | null>(null);
  const [activeFiscalDoc, setActiveFiscalDoc] =
    useState<FiscalDocumentData | null>(null);

  // --- Transaction Movements & Ledger State ---
  const [movements, setMovements] = useState<TransactionMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<TransactionMovement | null>(null);
  const [movementCategoryFilter, setMovementCategoryFilter] = useState<
    "ALL" | "IN" | "OUT" | "PAYOUT" | "TOP_UP" | "ESCROW_LOCK"
  >("ALL");
  const [movementStatusFilter, setMovementStatusFilter] = useState<string>("ALL");
  const [movementSearchQuery, setMovementSearchQuery] = useState("");

  const loadMovements = useCallback(async () => {
    setIsLoadingMovements(true);
    try {
      const res = await api.getTransactionMovements();
      setMovements(res.movements || []);
    } catch {
      // Retain existing state on transient network error
    } finally {
      setIsLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const setTopUpSuccess = (msg: string) => {
    setTopUpMessage(msg);
    setTopUpMessageIsError(false);
  };
  const setTopUpError = (msg: string) => {
    setTopUpMessage(msg);
    setTopUpMessageIsError(true);
  };
  const setWithdrawSuccess = (msg: string) => {
    setWithdrawMessage(msg);
    setWithdrawMessageIsError(false);
  };
  const setWithdrawError = (msg: string) => {
    setWithdrawMessage(msg);
    setWithdrawMessageIsError(true);
  };

  const openCheckoutLink = (url: string) => {
    const tg = window.Telegram?.WebApp;
    if (isTelegramMiniApp() && tg && typeof tg.openLink === "function") {
      tg.openLink(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const syncCheckoutStatus = useCallback(
    async (topUpId: string) => {
      setIsCheckingCheckoutStatus(true);
      try {
        const res = await api.getTopUpStatus(topUpId);
        const resolvedStatus = res.credited ? "APPROVED" : res.status;
        setActiveCheckout((prev) =>
          prev && prev.topUpId === topUpId
            ? {
                ...prev,
                status: resolvedStatus,
                providerTransactionId: res.providerTransactionId ?? prev.providerTransactionId,
                actionError: "",
              }
            : prev,
        );
        if (resolvedStatus === "APPROVED") {
          setTopUpSuccess(
            `ETB ${(res.amountMinor / 100).toLocaleString()} credited to your wallet.`,
          );
          setAmount("");
          await Promise.all([onChanged(), loadMovements()]);
        } else if (resolvedStatus === "REJECTED") {
          setTopUpError(
            "This payment was declined or expired. Check Recent top-ups or try again.",
          );
          await Promise.all([onChanged(), loadMovements()]);
        } else if (resolvedStatus === "PENDING" || resolvedStatus === "FLAGGED") {
          await Promise.all([onChanged(), loadMovements()]);
        }
        return resolvedStatus;
      } catch (err) {
        setActiveCheckout((prev) =>
          prev && prev.topUpId === topUpId
            ? {
                ...prev,
                actionError:
                  err instanceof Error
                    ? err.message
                    : "Could not refresh payment status.",
              }
            : prev,
        );
        return null;
      } finally {
        setIsCheckingCheckoutStatus(false);
      }
    },
    [loadMovements, onChanged],
  );

  // Open or close the native <dialog> via showModal() / close() so top-layer,
  // Esc handling, inert background, and focus return are managed by the browser.
  useEffect(() => {
    const dialog = checkoutDialogRef.current;
    if (!dialog) return;
    if (isCheckoutDialogOpen && activeCheckout) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isCheckoutDialogOpen, activeCheckout]);

  // Poll pending checkout status briefly so mock auto-approval or returning
  // webhook settlement updates the UI automatically without getting stuck.
  const activeCheckoutTopUpId = activeCheckout?.topUpId ?? null;
  const activeCheckoutStatus = activeCheckout?.status ?? null;
  useEffect(() => {
    if (!activeCheckoutTopUpId || activeCheckoutStatus !== "CHECKOUT_PENDING") return;
    let cancelled = false;
    let attempts = 0;

    const timer = window.setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      void syncCheckoutStatus(activeCheckoutTopUpId).then((nextStatus) => {
        if (nextStatus && nextStatus !== "CHECKOUT_PENDING") {
          window.clearInterval(timer);
        }
      });
      if (attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeCheckoutTopUpId, activeCheckoutStatus, syncCheckoutStatus]);

  const closeCheckoutDialog = () => {
    checkoutDialogRef.current?.close();
    setIsCheckoutDialogOpen(false);
  };

  const handleCheckoutDialogClose = () => {
    setIsCheckoutDialogOpen(false);
    if (activeCheckout?.status === "CHECKOUT_PENDING") {
      setTopUpSuccess(
        "Checkout session is awaiting completion. Open instructions below or attach your receipt in Recent top-ups.",
      );
    }
  };

  const isPointOutsideDialog = (
    e: React.PointerEvent<HTMLDialogElement>,
    dialog: HTMLDialogElement,
  ) => {
    const r = dialog.getBoundingClientRect();
    return (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    );
  };

  const handleCheckoutDialogPointerDown = (
    e: React.PointerEvent<HTMLDialogElement>,
  ) => {
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const dialog = checkoutDialogRef.current;
    if (!dialog) return;
    pointerDownOutsideRef.current = isPointOutsideDialog(e, dialog);
  };

  const handleCheckoutDialogPointerUp = (
    e: React.PointerEvent<HTMLDialogElement>,
  ) => {
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const dialog = checkoutDialogRef.current;
    const wasOutside = pointerDownOutsideRef.current;
    pointerDownOutsideRef.current = false;
    if (wasOutside && dialog && isPointOutsideDialog(e, dialog)) {
      closeCheckoutDialog();
    }
  };

  const openCheckoutInstructionsForRow = (item: TopUpRequest) => {
    const rail: PaymentRail =
      item.provider === "CBE_BIRR"
        ? "CBE_BIRR"
        : item.provider === "M_PESA"
          ? "M_PESA"
          : "TELEBIRR";
    setActiveCheckout({
      topUpId: item.id,
      provider: rail,
      amountEtb: item.amountMinor / 100,
      redirectUrl: null,
      providerTransactionId: item.providerTransactionId ?? null,
      status: "CHECKOUT_PENDING",
      isSimulating: false,
      actionError: "",
    });
    setIsCheckoutDialogOpen(true);
  };

  const handleSimulateCheckoutSuccess = async () => {
    if (!activeCheckout) return;
    const targetId = activeCheckout.topUpId;
    setActiveCheckout((prev) =>
      prev && prev.topUpId === targetId
        ? { ...prev, isSimulating: true, actionError: "" }
        : prev,
    );
    try {
      await api.simulateTopUpSuccess(targetId);
      setActiveCheckout((prev) =>
        prev && prev.topUpId === targetId
          ? { ...prev, status: "APPROVED", isSimulating: false, actionError: "" }
          : prev,
      );
      setTopUpSuccess(
        `ETB ${activeCheckout.amountEtb.toLocaleString()} credited to your wallet.`,
      );
      setAmount("");
      await Promise.all([onChanged(), loadMovements()]);
    } catch (err) {
      setActiveCheckout((prev) =>
        prev && prev.topUpId === targetId
          ? {
              ...prev,
              isSimulating: false,
              actionError:
                err instanceof Error
                  ? err.message
                  : "Sandbox simulation failed.",
            }
          : prev,
      );
    }
  };

  const switchCheckoutToAttachReceipt = (topUpId: string) => {
    closeCheckoutDialog();
    setAttachingTopUpId(topUpId);
    setTopUpMessage("");
    window.requestAnimationFrame(() => {
      recentTopUpRowRefs.current[topUpId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const copyAccountToClipboard = (acc: string, label: string) => {
    void navigator.clipboard.writeText(acc);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const copyTxFieldToClipboard = (val: string, key: string) => {
    void navigator.clipboard.writeText(val);
    setCopiedTxField(key);
    setTimeout(() => setCopiedTxField(null), 2500);
  };

  const switchToManualFallback = (p: PaymentRail, amt?: string) => {
    setTopUpMethod("MANUAL");
    setTopUpRail(p);
    if (amt) setAmount(amt);
    setCheckoutFallback(null);
    setTopUpMessage("");
  };

  /**
   * Choosing a rail on the Instant Checkout tab.
   *
   * Telebirr has an approved merchant API and can be checked out against.
   * CBE Birr and M-Pesa do NOT: the backend refuses their checkout with
   * PROVIDER_NOT_AVAILABLE, because they have no approved merchant API yet.
   *
   * Offering a button that can only fail was the old behaviour. Those two
   * rails are approved collection rails and are handled MANUALLY, so choosing
   * one goes straight to the manual transfer flow with that rail's
   * instructions -- which is how the money actually moves today.
   */
  const chooseCheckoutRail = (rail: PaymentRail) => {
    if (rail === "TELEBIRR") {
      setCheckoutRail(rail);
      setCheckoutFallback(null);
      return;
    }
    setTopUpMethod("MANUAL");
    setTopUpRail(rail);
    setCheckoutFallback(null);
  };

  const submitCheckoutTopUp = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setTopUpError("Please enter a valid amount.");
      return;
    }
    setIsSubmitting(true);
    setTopUpMessage("");
    setCheckoutFallback(null);

    const amountMinor = Math.round(amountNum * 100);

    try {
      const { redirectUrl, topUpId, providerTransactionId } =
        await api.initiateCheckoutTopUp(amountMinor, checkoutRail);

      if (topUpId) stashPendingTopUp(topUpId);

      setActiveCheckout({
        topUpId,
        provider: checkoutRail,
        amountEtb: amountNum,
        redirectUrl: redirectUrl || null,
        providerTransactionId: providerTransactionId || null,
        status: "CHECKOUT_PENDING",
        isSimulating: false,
        actionError: "",
      });
      setIsCheckoutDialogOpen(true);

      if (redirectUrl) {
        openCheckoutLink(redirectUrl);
      }

      await Promise.all([onChanged(), loadMovements()]);
    } catch (err) {
      const apiErr = err as Error & { status?: number; code?: string };
      const msg = apiErr instanceof Error ? apiErr.message : "Checkout initiation failed.";
      const isAuthFailure =
        apiErr?.status === 401 ||
        /missing or malformed authorization|invalid or expired token|session_revoked/i.test(msg);

      if (isAuthFailure) {
        setTopUpError("Your session expired. Please sign in again to continue.");
        return;
      }

      setTopUpError(msg);
      const isClientPolicyError =
        apiErr?.code === "VALIDATION_ERROR" || apiErr?.code === "UNSUPPORTED_PROVIDER";
      if (!isClientPolicyError) {
        setCheckoutFallback({
          amount,
          provider: checkoutRail,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTopUp = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setTopUpError("Please enter a valid amount.");
      return;
    }
    if (!reference.trim()) {
      setTopUpError("Please enter the transaction or reference number.");
      return;
    }
    if (!receipt) {
      setTopUpError("Please upload your transfer receipt image or PDF.");
      return;
    }

    setIsSubmitting(true);
    setTopUpMessage("");

    try {
      const formData = new FormData();
      formData.append("amountMinor", String(Math.round(amountNum * 100)));
      formData.append("provider", topUpRail);
      formData.append("referenceNumber", reference.trim());
      formData.append("receipt", receipt);

      await api.createTopUpRequest(formData);

      setTopUpSuccess(
        "Top-up submitted. Once staff verify the transfer, funds will appear in your balance.",
      );
      setAmount("");
      setReference("");
      setReceipt(null);
      await Promise.all([onChanged(), loadMovements()]);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachReceipt = async (topUpId: string) => {
    if (!attachRef.trim()) {
      setTopUpError("Enter the transaction or reference code.");
      return;
    }
    if (!attachFile) {
      setTopUpError("Please select a receipt file.");
      return;
    }

    setIsAttachingSubmitting(true);
    setTopUpMessage("");

    try {
      const formData = new FormData();
      formData.append("referenceNumber", attachRef.trim());
      formData.append("receipt", attachFile);

      await api.attachTopUpReceipt(topUpId, formData);

      setTopUpSuccess("Receipt submitted for staff verification. Status updated to Pending.");
      setAttachingTopUpId(null);
      setAttachRef("");
      setAttachFile(null);
      await Promise.all([onChanged(), loadMovements()]);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Failed to attach receipt.");
    } finally {
      setIsAttachingSubmitting(false);
    }
  };

  /**
   * Sends the SMS approval code for this payout.
   *
   * The code proves the person holding the phone approved this specific
   * payout. Without it a stolen session could move money straight to an
   * attacker's number.
   */
  const sendWithdrawalOtp = async () => {
    setIsSendingOtp(true);
    setWithdrawMessage("");
    try {
      const challenge = await api.requestWithdrawalOtp();
      setOtpRequested(true);
      setDevOtpCode(challenge.devCode ?? null);
      setWithdrawSuccess(
        "We sent a 6-digit approval code to the phone number on your account.",
      );
    } catch (err) {
      setWithdrawError(
        err instanceof Error
          ? err.message
          : "Could not send the approval code. Try again in a moment.",
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const withdraw = async () => {
    const amountNum = Number(withdrawAmount);
    const amountMinor = Math.round(amountNum * 100);

    if (
      !amountNum ||
      amountMinor <= 0 ||
      !payoutIdentifier.trim()
    ) {
      setWithdrawError(
        "Enter a withdrawal amount and your payout phone or account number.",
      );
      return;
    }

    if (amountMinor > wallet.balanceMinor) {
      setWithdrawError("Withdrawal amount exceeds your available balance.");
      return;
    }

    if (!/^\d{6}$/.test(withdrawOtp.trim())) {
      setWithdrawError("Enter the 6-digit approval code we sent you.");
      return;
    }

    setIsSubmitting(true);
    setWithdrawMessage("");

    try {
      const result = await api.withdrawWallet({
        amountMinor,
        provider: withdrawRail,
        payoutAccountIdentifier: payoutIdentifier.trim(),
        otpCode: withdrawOtp.trim(),
      });

      if (result.error === "HELD_FOR_REVIEW") {
        setWithdrawError(
          "Withdrawal held for compliance review. Your balance was not debited.",
        );
      } else if (result.error === "ACTIVE_CONTRACT_BLOCKS_WITHDRAWAL") {
        setWithdrawError(
          result.message ??
            "You cannot withdraw while you have active contracts or open disputes. Wait for them to complete first.",
        );
      } else {
        setWithdrawAmount("");
        setPayoutIdentifier("");
        setWithdrawOtp("");
        setOtpRequested(false);
        setDevOtpCode(null);
        events.payoutRequested();
        setWithdrawSuccess(
          `Withdrawal request recorded for ETB ${amountNum.toLocaleString()}. Funds will be sent to your account upon staff settlement.`,
        );
      }
      await Promise.all([onChanged(), loadMovements()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed.";
      setWithdrawError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFiscalDocForMovement = (m: TransactionMovement) => {
    const isIncome = m.category === "PAYOUT" || m.direction === "IN";
    setActiveFiscalDoc({
      docType: isIncome ? "FREELANCER_VOUCHER" : "CLIENT_INVOICE",
      serialNumber: `YKS-TX-${m.id.slice(-6).toUpperCase()}`,
      principalEtb: Math.round(m.netAmountMinor / 100),
      rail: m.paymentRail === "CBE_BIRR" ? "CBE_BIRR" : m.paymentRail === "M_PESA" ? "M_PESA" : "TELEBIRR",
      providerReference: m.reference || m.id,
      contractRef: m.contractId ? `#${m.contractId.slice(0, 8).toUpperCase()}` : undefined,
      milestoneTitle: m.milestoneTitle || m.title,
      clientName: m.counterpartyRole === "CLIENT" ? m.counterpartyName : undefined,
      freelancerName: m.counterpartyRole === "FREELANCER" ? m.counterpartyName : undefined,
      issuedAtIso: m.date,
      statusLabel: m.status === "COMPLETED" ? "SETTLED" : m.status.replace("_", " "),
      includeVat15: false,
      includeWithholding: false,
      hasVerifiedTin: true,
    });
  };

  // Metrics calculation
  const completedMovements = movements.filter((m) => m.status === "COMPLETED");
  const totalInflowMinor = completedMovements
    .filter((m) => m.direction === "IN")
    .reduce((sum, m) => sum + m.netAmountMinor, 0);
  const totalOutflowMinor = completedMovements
    .filter((m) => m.direction === "OUT")
    .reduce((sum, m) => sum + m.netAmountMinor, 0);
  const pendingCount = movements.filter(
    (m) => m.status === "PENDING" || m.status === "PROCESSING",
  ).length;

  // Filtered movements calculation
  const filteredMovements = movements.filter((m) => {
    if (movementCategoryFilter === "IN" && m.direction !== "IN") return false;
    if (movementCategoryFilter === "OUT" && m.direction !== "OUT") return false;
    if (movementCategoryFilter === "PAYOUT" && m.category !== "PAYOUT") return false;
    if (movementCategoryFilter === "TOP_UP" && m.category !== "TOP_UP") return false;
    if (
      movementCategoryFilter === "ESCROW_LOCK" &&
      m.category !== "ESCROW_LOCK" &&
      m.category !== "MILESTONE_RELEASE"
    )
      return false;

    if (movementStatusFilter !== "ALL" && m.status !== movementStatusFilter) return false;

    if (movementSearchQuery.trim()) {
      const q = movementSearchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description.toLowerCase().includes(q);
      const matchRef = (m.reference || "").toLowerCase().includes(q);
      const matchAcc = (m.accountIdentifier || "").toLowerCase().includes(q);
      const matchContract = (m.contractTitle || "").toLowerCase().includes(q);
      const matchCounterparty = (m.counterpartyName || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchRef && !matchAcc && !matchContract && !matchCounterparty) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="browser-wallet-stack">
      {/* Balance hero — shown to all */}
      <section className="wallet-hero">
        <div>
          <p className="eyebrow">Available balance</p>
          <strong>ETB {(wallet.balanceMinor / 100).toLocaleString()}</strong>
          <span>
            {role === "FREELANCER"
              ? "Updated from released milestones and approved top-ups."
              : role === "BOTH"
                ? "Funds escrow when you hire, and receives released milestones when you work."
                : "Updated from approved top-ups. Deducted when contracts are funded."}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setActiveFiscalDoc({
                docType:
                  role === "FREELANCER"
                    ? "FREELANCER_VOUCHER"
                    : "CLIENT_INVOICE",
                principalEtb:
                  Number(withdrawAmount) > 0
                    ? Number(withdrawAmount)
                    : Number(amount) > 0
                      ? Number(amount)
                      : Math.max(25000, Math.round(wallet.balanceMinor / 100)),
                rail:
                  role === "FREELANCER" ? withdrawRail : checkoutRail,
                includeVat15: true,
                includeWithholding: true,
                hasVerifiedTin: true,
              })
            }
          >
            <FileText size={15} />
            <span>
              {role === "FREELANCER"
                ? "Payout & Tax Voucher"
                : "Invoice & Escrow Receipt"}
            </span>
          </button>
          <WalletCards size={36} />
        </div>
      </section>

      {/* Payouts: anyone who can earn can withdraw. Dual-role accounts included */}
      {role !== "CLIENT" && (
        <section className="panel withdraw-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Verified payout</p>
              <h2>Withdraw earnings</h2>
            </div>
            <WalletCards size={22} />
          </div>

          {/* Provider selector */}
          <p className="wallet-help">Choose where to receive your payout:</p>
          <div className="payment-grid payment-grid-3 withdraw-payment-grid">
            <button
              type="button"
              className={
                withdrawRail === "TELEBIRR"
                  ? "payment-account withdraw-account selected"
                  : "payment-account withdraw-account"
              }
              onClick={() => setWithdrawRail("TELEBIRR")}
            >
              <img
                src="/payment/Telebirr.png"
                alt="Telebirr"
                style={{
                  width: "40px",
                  height: "40px",
                  objectFit: "contain",
                  borderRadius: "6px",
                  flexShrink: 0,
                }}
              />
              <div className="payment-account-text">
                <strong>Telebirr</strong>
                <span>Send to phone number</span>
              </div>
            </button>
            <button
              type="button"
              className={
                withdrawRail === "CBE_BIRR"
                  ? "payment-account withdraw-account selected"
                  : "payment-account withdraw-account"
              }
              onClick={() => setWithdrawRail("CBE_BIRR")}
            >
              <img
                src="/payment/cbe payment.jpg"
                alt="CBE Bank"
                style={{
                  width: "40px",
                  height: "40px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  flexShrink: 0,
                }}
              />
              <div className="payment-account-text">
                <strong>CBE Bank</strong>
                <span>Send to account number</span>
              </div>
            </button>
            <button
              type="button"
              className={
                withdrawRail === "M_PESA"
                  ? "payment-account withdraw-account selected"
                  : "payment-account withdraw-account"
              }
              onClick={() => setWithdrawRail("M_PESA")}
            >
              <img
                src="/payment/mpesa.svg"
                alt="Safaricom M-Pesa"
                style={{
                  width: "40px",
                  height: "40px",
                  objectFit: "contain",
                  borderRadius: "6px",
                  flexShrink: 0,
                }}
              />
              <div className="payment-account-text">
                <strong>Safaricom M-Pesa</strong>
                <span>Send to Safaricom phone</span>
              </div>
            </button>
          </div>

          <div className="browser-topup-fields withdraw-fields">
            <label>
              Amount (ETB)
              <input
                type="number"
                min="1"
                max={wallet.balanceMinor / 100}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="ETB"
              />
            </label>
            <label>
              {withdrawRail === "TELEBIRR"
                ? "Telebirr phone number"
                : withdrawRail === "M_PESA"
                ? "M-Pesa phone number"
                : "CBE account number"}
              <input
                value={payoutIdentifier}
                onChange={(e) => setPayoutIdentifier(e.target.value)}
                placeholder={
                  withdrawRail === "TELEBIRR"
                    ? "+251911…"
                    : withdrawRail === "M_PESA"
                    ? "+251711…"
                    : "1000…"
                }
              />
            </label>
          </div>

          {/* Two-factor approval. A withdrawal moves money to a phone number,
              which is exactly what a stolen session would want to do — so the
              code is required, not optional. */}
          <div className="browser-topup-fields withdraw-fields">
            <label>
              Approval code
              <input
                value={withdrawOtp}
                onChange={(e) => setWithdrawOtp(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            </label>
            <div className="withdraw-otp-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={isSendingOtp || isSubmitting}
                onClick={() => void sendWithdrawalOtp()}
              >
                {isSendingOtp
                  ? "Sending..."
                  : otpRequested
                    ? "Resend code"
                    : "Send code"}
              </button>
              {devOtpCode && (
                <span className="withdraw-otp-dev">
                  Dev code: {devOtpCode}
                </span>
              )}
            </div>
          </div>

          {withdrawMessage && (
            <Alert variant={withdrawMessageIsError ? "destructive" : "success"} className="flex items-center gap-2.5 my-2.5"
            >
              <Avatar className="size-6 rounded-[5px] shrink-0">
                <AvatarFallback
                  className={cn(
                    "rounded-[5px] text-white",
                    withdrawMessageIsError
                      ? "bg-destructive dark:bg-destructive/60"
                      : "bg-emerald-600 dark:bg-emerald-600/80"
                  )}
                >
                  {withdrawMessageIsError ? (
                    <TbAlertCircle className="size-3.5" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <AlertTitle className="text-sm font-medium">{withdrawMessage}</AlertTitle>
            </Alert>
          )}

          <button
            className="btn-primary"
            disabled={
              isSubmitting ||
              wallet.balanceMinor <= 0 ||
              !/^\d{6}$/.test(withdrawOtp.trim())
            }
            onClick={() => void withdraw()}
          >
            {isSubmitting ? "Processing..." : "Request withdrawal"}
          </button>
        </section>
      )}

      {/* Top-Up — shown to all roles */}
      <section className="panel browser-topup-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Add funds</p>
            <h2>Top up your wallet</h2>
          </div>
          <button
            className="btn-icon"
            aria-expanded={showTopUp}
            aria-label={showTopUp ? "Hide top-up options" : "Show top-up options"}
            onClick={() => setShowTopUp((s) => !s)}
          >
            <Upload size={18} />
          </button>
        </div>
        {showTopUp && (
          <>
            <div className="tabs tx-tab-group" role="tablist" aria-label="Top-up method" style={{ marginBottom: 16 }}>
              <button
                type="button"
                role="tab"
                id="topup-tab-instant"
                aria-selected={topUpMethod === "INSTANT"}
                className={`tx-tab-btn ${topUpMethod === "INSTANT" ? "active" : ""}`}
                onClick={() => setTopUpMethod("INSTANT")}
              >
                Instant Checkout
              </button>
              <button
                type="button"
                role="tab"
                id="topup-tab-manual"
                aria-selected={topUpMethod === "MANUAL"}
                className={`tx-tab-btn ${topUpMethod === "MANUAL" ? "active" : ""}`}
                onClick={() => setTopUpMethod("MANUAL")}
              >
                Manual Transfer
              </button>
            </div>

            {topUpMethod === "INSTANT" ? (
              <div className="bw-instant-checkout">
                <p className="wallet-help" style={{ margin: 0 }}>
                  Select a payment gateway. Telebirr checks out automatically; CBE Birr and
                  M-Pesa are handled manually and open the transfer instructions.
                </p>

                <div className="payment-grid payment-grid-3">
                  <button
                    type="button"
                    className={
                      checkoutRail === "TELEBIRR"
                        ? "payment-account selected"
                        : "payment-account"
                    }
                    onClick={() => {
                      setCheckoutRail("TELEBIRR");
                      setCheckoutFallback(null);
                    }}
                  >
                    <img
                      src="/payment/Telebirr.png"
                      alt="Telebirr"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>Telebirr</strong>
                      <span>Instant C2B</span>
                      <code>Auto checkout</code>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseCheckoutRail("CBE_BIRR")}
                    title="CBE Birr has no automated checkout yet, so it is handled manually: transfer to the account below and upload your receipt."
                    className="payment-account"
                  >
                    <img
                      src="/payment/cbe payment.jpg"
                      alt="CBE Birr"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>CBE Birr</strong>
                      <span>Commercial Bank of Ethiopia</span>
                      <code>Manual transfer</code>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseCheckoutRail("M_PESA")}
                    title="M-Pesa has no automated checkout yet, so it is handled manually: transfer to the account below and upload your receipt."
                    className="payment-account"
                  >
                    <img
                      src="/payment/mpesa.svg"
                      alt="Safaricom M-Pesa"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>Safaricom M-Pesa</strong>
                      <span>Mobile money rail</span>
                      <code>Manual transfer</code>
                    </div>
                  </button>
                </div>

                <div className="browser-topup-fields">
                  <label style={{ margin: 0 }}>
                    Amount to add (ETB)
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1000"
                    />
                  </label>
                  <div className="bw-instant-info-card">
                    <strong>Telebirr Instant C2B Checkout</strong>
                    <span>
                      Creates an automated payment session in ETB and credits your wallet as soon as Telebirr confirms payment.
                    </span>
                  </div>
                </div>

                {checkoutFallback && (
                  <Alert variant="destructive" className="bw-gateway-alert flex flex-col items-stretch gap-3 p-4 my-1">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-6 rounded-[5px] shrink-0">
                        <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
                          <TbFileAlert className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <AlertTitle className="text-sm font-semibold text-destructive leading-snug">
                        Automated Gateway Issue — Manual Verification Available
                      </AlertTitle>
                    </div>
                    <AlertDescription className="text-sm leading-relaxed text-foreground/90">
                      Automatic {checkoutFallback.provider === "TELEBIRR" ? "Telebirr" : checkoutFallback.provider === "CBE_BIRR" ? "CBE Birr" : "Safaricom M-Pesa"} checkout could not be completed. Check Recent top-ups before retrying so you don’t accidentally pay twice. You can also use manual verification and submit your receipt.
                    </AlertDescription>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: "0.84rem", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        onClick={() => switchToManualFallback(checkoutFallback.provider, checkoutFallback.amount)}
                      >
                        Switch to Manual Verification <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "0.84rem", padding: "8px 14px" }}
                        onClick={() => setCheckoutFallback(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </Alert>
                )}

                <div className="bw-instant-actions">
                  <button
                    className="btn-primary"
                    style={{ justifyContent: "center" }}
                    disabled={isSubmitting}
                    onClick={() => void submitCheckoutTopUp()}
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
                      style={{
                        width: 20,
                        height: 20,
                        objectFit: "contain",
                        marginRight: 6,
                        background: "#fff",
                        borderRadius: 4,
                      }}
                    />
                    {isSubmitting
                      ? "Starting checkout..."
                      : checkoutRail === "TELEBIRR"
                      ? "Pay with Telebirr"
                      : checkoutRail === "CBE_BIRR"
                      ? "Pay with CBE Birr"
                      : "Pay with M-Pesa"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="wallet-help">
                  Send money to the platform account below, then upload the receipt for staff verification:
                </p>
                <div className="payment-grid payment-grid-3">
                  <button
                    type="button"
                    className={
                      topUpRail === "TELEBIRR"
                        ? "payment-account selected"
                        : "payment-account"
                    }
                    onClick={() => setTopUpRail("TELEBIRR")}
                  >
                    <img
                      src="/payment/Telebirr.png"
                      alt="Telebirr"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>Telebirr</strong>
                      <span>Yekis top-up account</span>
                      <code>0910 011 818</code>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={
                      topUpRail === "CBE_BIRR"
                        ? "payment-account selected"
                        : "payment-account"
                    }
                    onClick={() => setTopUpRail("CBE_BIRR")}
                  >
                    <img
                      src="/payment/cbe payment.jpg"
                      alt="CBE Bank"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>CBE Bank</strong>
                      <span>Commercial Bank of Ethiopia</span>
                      <code>1000300802428</code>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={
                      topUpRail === "M_PESA"
                        ? "payment-account selected"
                        : "payment-account"
                    }
                    onClick={() => setTopUpRail("M_PESA")}
                  >
                    <img
                      src="/payment/mpesa.svg"
                      alt="Safaricom M-Pesa"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>Safaricom M-Pesa</strong>
                      <span>Till 882199 / Phone</span>
                      <code>0716 356 515</code>
                    </div>
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--color-bg-subtle)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                  }}
                >
                  <span>
                    Selected: <strong>{topUpRail === "TELEBIRR" ? "Telebirr (0910 011 818)" : topUpRail === "CBE_BIRR" ? "CBE Bank (1000300802428)" : "M-Pesa (0716 356 515 - Till 882199)"}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "0.76rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() =>
                      copyAccountToClipboard(
                        topUpRail === "TELEBIRR" ? "0910011818" : topUpRail === "CBE_BIRR" ? "1000300802428" : "0716356515",
                        topUpRail,
                      )
                    }
                  >
                    <Copy size={12} />
                    {copiedAccount === topUpRail ? "Copied!" : "Copy account"}
                  </button>
                </div>

                <div className="browser-topup-fields">
                  <label>
                    Amount sent (ETB)
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                    />
                  </label>
                  <label>
                    Transaction/reference number
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={
                        topUpRail === "TELEBIRR"
                          ? "e.g. TB-12345 or receipt number"
                          : topUpRail === "M_PESA"
                          ? "e.g. SD98A7B6C or M-Pesa SMS code"
                          : "e.g. FT26081... or CBE receipt ref"
                      }
                    />
                  </label>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FileUploader
                      compact
                      showCard={false}
                      showHeader={false}
                      maxFiles={1}
                      accept="image/*,.pdf"
                      label="Receipt image or document (PDF/Photo)"
                      acceptedLabel="JPG, PNG, WebP or PDF · up to 10 MB"
                      dropSubtitle="Upload a clear photo or PDF of your transfer receipt"
                      maxSizeMB={10}
                      value={receipt}
                      onFileSelect={(file) => setReceipt(file)}
                      showFooter={false}
                      showEncryptionBadge={true}
                    />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ marginTop: 16 }}
                  disabled={isSubmitting}
                  onClick={() => void submitTopUp()}
                >
                  {isSubmitting ? "Submitting..." : "Submit for staff approval"}
                </button>
              </>
            )}

            {topUpMessage && (
              <Alert variant={topUpMessageIsError ? "destructive" : "success"} className="flex flex-wrap items-center gap-2.5 my-2.5"
              >
                <Avatar className="size-6 rounded-[5px] shrink-0">
                  <AvatarFallback
                    className={cn(
                      "rounded-[5px] text-white",
                      topUpMessageIsError
                        ? "bg-destructive dark:bg-destructive/60"
                        : "bg-emerald-600 dark:bg-emerald-600/80"
                    )}
                  >
                    {topUpMessageIsError ? (
                      <TbAlertCircle className="size-3.5" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <AlertTitle className="flex-1 min-w-0 text-sm font-medium">{topUpMessage}</AlertTitle>
                {activeCheckout && activeCheckout.status === "CHECKOUT_PENDING" && !isCheckoutDialogOpen && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "0.78rem", padding: "5px 10px" }}
                    onClick={() => setIsCheckoutDialogOpen(true)}
                  >
                    View instructions
                  </button>
                )}
              </Alert>
            )}
          </>
        )}
      </section>

      {/* Recent top-ups with manual verification action on stalled checkouts */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Top-up audit log</p>
            <h2>Recent top-ups</h2>
          </div>
          <Clock size={20} />
        </div>
        {topUps.length === 0 ? (
          <p className="empty-state">No top-ups submitted yet.</p>
        ) : (
          topUps.map((item) => {
            const isPendingCheckout = item.status === "CHECKOUT_PENDING";
            const isAttaching = attachingTopUpId === item.id;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  recentTopUpRowRefs.current[item.id] = el;
                }}
                style={{
                  display: "grid",
                  gap: 8,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div className="list-row" style={{ padding: 0, border: 0 }}>
                  <div>
                    <strong>ETB {(item.amountMinor / 100).toLocaleString()}</strong>
                    <span>
                      {item.provider} · {item.referenceNumber || item.providerTransactionId || "Awaiting confirmation"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      className={`status-pill ${
                        item.status === "APPROVED"
                          ? "success"
                          : item.status === "REJECTED"
                          ? "danger"
                          : item.status === "CHECKOUT_PENDING"
                          ? "warning"
                          : ""
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                    {isPendingCheckout && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                          onClick={() => openCheckoutInstructionsForRow(item)}
                        >
                          Complete checkout
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                          onClick={() => setAttachingTopUpId(isAttaching ? null : item.id)}
                        >
                          {isAttaching ? "Cancel" : "Attach receipt"}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                      onClick={() =>
                        setActiveFiscalDoc({
                          docType: "CLIENT_INVOICE",
                          serialNumber: `YKS-INV-${item.id.slice(-5).toUpperCase()}`,
                          principalEtb: Math.round(item.amountMinor / 100),
                          rail:
                            item.provider === "CBE_BIRR"
                              ? "CBE_BIRR"
                              : item.provider === "M_PESA"
                                ? "M_PESA"
                                : "TELEBIRR",
                          providerReference:
                            item.referenceNumber ||
                            item.providerTransactionId ||
                            "PENDING-REF",
                          issuedAtIso: item.createdAt,
                          statusLabel:
                            item.status === "APPROVED"
                              ? "ESCROW FUNDED"
                              : item.status.replace("_", " "),
                          includeVat15: true,
                          includeWithholding: true,
                          hasVerifiedTin: true,
                        })
                      }
                    >
                      <FileText size={13} style={{ marginRight: 4 }} />
                      Receipt
                    </button>
                  </div>
                </div>

                {isAttaching && (
                  <div
                    style={{
                      background: "var(--color-bg-subtle)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px dashed var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)" }}>
                        Submit Provider Receipt for Staff Verification
                      </h4>
                      <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                        If your automated checkout didn’t complete automatically, submit your provider transaction reference code and receipt photo below for manual verification:
                      </p>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 4, color: "var(--color-text)" }}>
                        Transaction / Reference Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TB-12345 or CBE-REF"
                        value={attachRef}
                        onChange={(e) => setAttachRef(e.target.value)}
                        style={{ fontSize: "0.82rem", padding: "8px 12px", width: "100%", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-elevated)", color: "var(--color-text)" }}
                      />
                    </div>

                    <FileUploader
                      compact
                      showCard={false}
                      showHeader={false}
                      maxFiles={1}
                      accept="image/*,.pdf"
                      label="Receipt image or document (PDF/Photo)"
                      acceptedLabel="JPG, PNG, WebP or PDF · up to 10 MB"
                      dropSubtitle="Upload a clear photo or PDF of your provider receipt"
                      maxSizeMB={10}
                      value={attachFile}
                      onFileSelect={(file) => setAttachFile(file)}
                      showFooter={false}
                      showEncryptionBadge={true}
                    />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                        onClick={() => {
                          setAttachingTopUpId(null);
                          setAttachRef("");
                          setAttachFile(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: "0.82rem", padding: "6px 18px" }}
                        disabled={isAttachingSubmitting || !attachRef.trim() || !attachFile}
                        onClick={() => void handleAttachReceipt(item.id)}
                      >
                        {isAttachingSubmitting ? "Submitting..." : "Submit for Staff Verification"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* =========================================================================
          Transaction Movements & Payout Details Section
          ========================================================================= */}
      <section className="tx-movements-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 4px 0" }}>Ledger Statement & Activity</p>
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Transaction Movement Details</h2>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => void loadMovements()}
            disabled={isLoadingMovements}
          >
            <RefreshCw size={14} className={isLoadingMovements ? "spin" : ""} />
            <span>{isLoadingMovements ? "Refreshing..." : "Refresh Statement"}</span>
          </button>
        </div>

        {/* KPI Overview Grid */}
        <div className="tx-kpi-grid">
          <div className="tx-kpi-card">
            <span className="tx-kpi-label">Total Inflow (Credits)</span>
            <span className="tx-kpi-val inflow">
              + ETB {(totalInflowMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="tx-kpi-card">
            <span className="tx-kpi-label">Total Outflow (Debits)</span>
            <span className="tx-kpi-val outflow">
              - ETB {(totalOutflowMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="tx-kpi-card">
            <span className="tx-kpi-label">Pending Settlements</span>
            <span className="tx-kpi-val" style={{ color: pendingCount > 0 ? "var(--color-warning-text, #f59e0b)" : "var(--color-text-secondary)" }}>
              {pendingCount} {pendingCount === 1 ? "transaction" : "transactions"}
            </span>
          </div>
          <div className="tx-kpi-card">
            <span className="tx-kpi-label">Total Movement Count</span>
            <span className="tx-kpi-val">
              {movements.length}
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="tx-filter-container">
          <div className="tx-filter-row">
            <div className="tx-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search movements by title, reference, or counterparty..."
                value={movementSearchQuery}
                onChange={(e) => setMovementSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                aria-label="Filter transactions by status"
                value={movementStatusFilter}
                onChange={(e) => setMovementStatusFilter(e.target.value)}
                style={{
                  height: 38,
                  fontSize: "0.82rem",
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-subtle)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending Verification</option>
                <option value="PROCESSING">Processing</option>
                <option value="REJECTED">Rejected / Failed</option>
              </select>
            </div>
          </div>

          <div className="tx-tab-group" role="tablist" aria-label="Filter transactions by category">
            <button
              type="button"
              role="tab"
              aria-selected={movementCategoryFilter === "ALL"}
              className={`tx-tab-btn ${movementCategoryFilter === "ALL" ? "active" : ""}`}
              onClick={() => setMovementCategoryFilter("ALL")}
            >
              All Movements ({movements.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={movementCategoryFilter === "IN"}
              className={`tx-tab-btn ${movementCategoryFilter === "IN" ? "active" : ""}`}
              onClick={() => setMovementCategoryFilter("IN")}
            >
              <ArrowDownLeft size={13} aria-hidden="true" /> Money In (+{movements.filter((m) => m.direction === "IN").length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={movementCategoryFilter === "OUT"}
              className={`tx-tab-btn ${movementCategoryFilter === "OUT" ? "active" : ""}`}
              onClick={() => setMovementCategoryFilter("OUT")}
            >
              <ArrowUpRight size={13} aria-hidden="true" /> Money Out (-{movements.filter((m) => m.direction === "OUT").length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={movementCategoryFilter === "PAYOUT"}
              className={`tx-tab-btn ${movementCategoryFilter === "PAYOUT" ? "active" : ""}`}
              onClick={() => setMovementCategoryFilter("PAYOUT")}
            >
              Payouts ({movements.filter((m) => m.category === "PAYOUT").length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={movementCategoryFilter === "TOP_UP"}
              className={`tx-tab-btn ${movementCategoryFilter === "TOP_UP" ? "active" : ""}`}
              onClick={() => setMovementCategoryFilter("TOP_UP")}
            >
              Top-Ups ({movements.filter((m) => m.category === "TOP_UP").length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={movementCategoryFilter === "ESCROW_LOCK"}
              className={`tx-tab-btn ${movementCategoryFilter === "ESCROW_LOCK" ? "active" : ""}`}
              onClick={() => setMovementCategoryFilter("ESCROW_LOCK")}
            >
              Escrow ({movements.filter((m) => m.category === "ESCROW_LOCK" || m.category === "MILESTONE_RELEASE").length})
            </button>
          </div>
        </div>

        {/* Movements Stream Table */}
        {isLoadingMovements && movements.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--color-text-secondary)" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px auto", display: "block" }} />
            <p style={{ margin: 0, fontSize: "0.88rem" }}>Loading transaction movements & ledger entries...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div style={{ padding: "36px 16px", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: 10 }}>
            <p className="empty-state" style={{ margin: 0 }}>
              {movements.length === 0
                ? "No transaction movements recorded yet. Activity will appear as you fund milestones, top up, or receive payouts."
                : "No movements match the active filters."}
            </p>
          </div>
        ) : (
          <div className="tx-table">
            {filteredMovements.map((item) => {
              const isInflow = item.direction === "IN";
              const isPending = item.status === "PENDING" || item.status === "PROCESSING";
              const isRejected = item.status === "REJECTED" || item.status === "FAILED";
              const topUpId = item.id.startsWith("topup-") ? item.id.replace("topup-", "") : null;
              const isAttaching = topUpId ? attachingTopUpId === topUpId : false;

              return (
                <div key={item.id} style={{ display: "grid", gap: 8 }}>
                  <div className="tx-row">
                    {/* Direction Icon Circle */}
                    <div
                      className={`tx-icon-circle ${
                        isRejected
                          ? "rejected"
                          : isPending
                          ? "pending"
                          : isInflow
                          ? "inflow"
                          : "outflow"
                      }`}
                    >
                      {isRejected ? (
                        <ShieldAlert size={18} />
                      ) : isPending ? (
                        <Clock size={18} />
                      ) : isInflow ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>

                    {/* Metadata & Title Column */}
                    <div className="tx-meta-col">
                      <div className="tx-title-row">
                        <strong className="tx-title">{item.title}</strong>
                        {item.paymentRail && (
                          <span className="sh-kbd sh-mono" style={{ fontSize: "0.72rem" }}>
                            {item.paymentRail}
                          </span>
                        )}
                        {item.reference && (
                          <span className="sh-kbd sh-mono" style={{ fontSize: "0.72rem" }}>
                            #{item.reference.length > 20 ? item.reference.slice(0, 18) + "…" : item.reference}
                          </span>
                        )}
                      </div>
                      <div className="tx-subtitle">
                        <span>{new Date(item.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {item.counterpartyName && (
                          <>
                            <span>·</span>
                            <span>
                              {item.counterpartyRole === "CLIENT" ? "Client: " : item.counterpartyRole === "FREELANCER" ? "Freelancer: " : "Party: "}
                              <strong>{item.counterpartyName}</strong>
                            </span>
                          </>
                        )}
                        {item.contractTitle && (
                          <>
                            <span>·</span>
                            <span>Contract: <strong>{item.contractTitle}</strong></span>
                          </>
                        )}
                        {item.accountIdentifier && (
                          <>
                            <span>·</span>
                            <span className="sh-mono">Acc: {item.accountIdentifier}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`sh-status-inline ${
                          item.status === "COMPLETED"
                            ? "emerald"
                            : item.status === "PENDING"
                            ? "amber"
                            : item.status === "PROCESSING"
                            ? "blue"
                            : "crimson"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Amount & Actions Column */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div className="tx-amount-col">
                        <strong className={`tx-amount ${isInflow ? "inflow" : "outflow"}`}>
                          {isInflow ? "+" : "-"} ETB {(item.netAmountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <span className="tx-amount-sub">
                          {item.feeMinor > 0
                            ? `Fee: ETB ${(item.feeMinor / 100).toLocaleString()}`
                            : item.category === "ESCROW_LOCK"
                            ? "Escrow deposit"
                            : isInflow
                            ? "Net credited"
                            : "Disbursed"}
                        </span>
                      </div>

                      <div className="tx-actions-col">
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
                          onClick={() => setSelectedMovement(item)}
                          title="View complete transaction breakdown"
                        >
                          <Info size={13} />
                          <span>Details</span>
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
                          onClick={() => openFiscalDocForMovement(item)}
                          title="View official Ethiopian tax invoice / receipt voucher"
                        >
                          <FileText size={13} />
                          <span>Receipt</span>
                        </button>
                        {topUpId && item.status === "PENDING" && item.description.includes("checkout") && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.78rem", padding: "5px 8px" }}
                            onClick={() => setAttachingTopUpId(isAttaching ? null : topUpId)}
                          >
                            {isAttaching ? "Cancel" : "Attach receipt"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attachment Form for Checkout Pending Top-Ups */}
                  {isAttaching && topUpId && (
                    <div
                      style={{
                        background: "var(--color-bg-subtle)",
                        padding: 16,
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        marginTop: 10,
                        border: "1px dashed var(--color-border)",
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text)" }}>
                          Attach Provider Receipt
                        </h4>
                        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          Payment didn't clear automatically? Attach your receipt and reference code below for manual staff approval.
                        </p>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 4, color: "var(--color-text)" }}>
                          Transaction / Reference Code
                        </label>
                        <input
                          placeholder="e.g. TB-12345 or transaction reference"
                          value={attachRef}
                          onChange={(e) => setAttachRef(e.target.value)}
                          style={{ fontSize: "0.82rem", padding: "8px 12px", width: "100%", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-elevated)", color: "var(--color-text)" }}
                        />
                      </div>

                      <FileUploader
                        compact
                        showCard={false}
                        showHeader={false}
                        maxFiles={1}
                        accept="image/*,.pdf"
                        label="Receipt image or document (PDF/Photo)"
                        acceptedLabel="JPG, PNG, WebP or PDF · up to 10 MB"
                        dropSubtitle="Upload a clear photo or PDF of your provider receipt"
                        maxSizeMB={10}
                        value={attachFile}
                        onFileSelect={(file) => setAttachFile(file)}
                        showFooter={false}
                        showEncryptionBadge={true}
                      />

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                          onClick={() => {
                            setAttachingTopUpId(null);
                            setAttachRef("");
                            setAttachFile(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: "0.82rem", padding: "6px 18px" }}
                          disabled={isAttachingSubmitting || !attachRef.trim() || !attachFile}
                          onClick={() => void handleAttachReceipt(topUpId)}
                        >
                          {isAttachingSubmitting ? "Submitting..." : "Submit for Staff Verification"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          Transaction Movement Detail Modal / Drawer (Excel Spreadsheet Styled)
          ========================================================================= */}
      {selectedMovement && (
        <div
          className="excel-sheet-backdrop"
          onClick={() => setSelectedMovement(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-detail-title"
        >
          <div
            className="excel-sheet-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="excel-sheet-wrap">
              {/* Printable Excel-Styled Detail Sheet Card */}
              <article className="excel-sheet-card yk-fiscal-sheet">
                {/* Document Top Bar with Actions (Integrated inside card) */}
                <div className="excel-sheet-top-bar no-print">
                  <div className="excel-sheet-top-left">
                    <span className="excel-sheet-top-badge">
                      <FileText size={13} />
                      Movement Breakdown · ዝርዝር
                    </span>
                    <span className="sh-kbd" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                      #{selectedMovement.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      {selectedMovement.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="excel-sheet-top-actions">
                    <button
                      type="button"
                      className="excel-btn-action"
                      onClick={() => copyTxFieldToClipboard(selectedMovement.id, "id")}
                      title="Copy Movement ID"
                    >
                      {copiedTxField === "id" ? <Check size={14} style={{ color: "var(--color-primary)" }} /> : <Copy size={14} />}
                      <span>{copiedTxField === "id" ? "Copied ID" : "Copy ID"}</span>
                    </button>
                    <button
                      type="button"
                      className="excel-btn-action is-primary"
                      onClick={() => window.print()}
                      title="Print or Save PDF"
                    >
                      <Printer size={14} />
                      <span>Print / Save PDF</span>
                    </button>
                    <button
                      type="button"
                      className="excel-btn-close"
                      onClick={() => setSelectedMovement(null)}
                      aria-label="Close details"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Header */}
                <header className="excel-header">
                  <div className="excel-header-left">
                    <h1 id="tx-detail-title" className="excel-doc-title">
                      INVOICE
                    </h1>
                    <div className="excel-doc-subtitle">
                      Transaction Movement Detail &amp; Breakdown · የእንቅስቃሴ ዝርዝር መረጃ
                    </div>
                  </div>

                  <div className="excel-header-right">
                    <div className="excel-company-name">
                      Yekis Technologies PLC · ዬኪስ ቴክኖሎጂስ ኃ/የተ/የግ/ማ
                    </div>
                    <div className="excel-company-tagline">
                      Custodial Escrow &amp; Digital Work Marketplace · አዲስ አበባ፣ ኢትዮጵያ
                    </div>
                    <div className="excel-company-details">
                      ERCA Platform TIN: <strong>0078492104</strong> · VAT Reg: <strong>ETH-VAT-99201</strong> · Addis Ababa, Ethiopia
                    </div>
                  </div>
                </header>

                {/* Unified Metadata Block (Single Wide Box) */}
                <section className="excel-meta-wide-box">
                  <div className="excel-meta-wide-col excel-meta-wide-left">
                    <span className="excel-meta-box-label">To:</span>
                    <div className="excel-meta-recipient-name">
                      {selectedMovement.counterpartyName || "Platform User"}
                    </div>
                    <div className="excel-meta-recipient-sub">
                      {selectedMovement.counterpartyRole
                        ? `${selectedMovement.counterpartyRole} Party`
                        : (selectedMovement.direction === "IN" ? "Client Party" : "Freelancer Party")}
                    </div>
                    <div className="excel-meta-line" style={{ marginTop: 4 }}>
                      <span>Destination / Account:</span>
                      <strong>{selectedMovement.accountIdentifier || "Platform Wallet Vault"}</strong>
                    </div>
                    <div className="excel-meta-line">
                      <span>Direction:</span>
                      <strong style={{ color: selectedMovement.direction === "IN" ? "var(--color-primary)" : "var(--color-text)" }}>
                        {selectedMovement.direction === "IN" ? "Credit (Money In)" : "Debit (Money Out)"}
                      </strong>
                    </div>
                  </div>

                  <div className="excel-meta-wide-col excel-meta-wide-right">
                    <div className="excel-meta-line">
                      <span>Date:</span>
                      <strong>{new Date(selectedMovement.date).toISOString().slice(0, 10)}</strong>
                    </div>
                    <div className="excel-meta-line">
                      <span>Invoice #:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                        #{selectedMovement.id.slice(0, 8).toUpperCase()}
                      </strong>
                    </div>
                    <div className="excel-meta-line">
                      <span>Customer ID:</span>
                      <strong style={{ fontFamily: "var(--font-mono)" }}>
                        {selectedMovement.contractId
                          ? `#${selectedMovement.contractId.slice(0, 8).toUpperCase()}`
                          : `#${selectedMovement.id.slice(-6).toUpperCase()}`}
                      </strong>
                    </div>
                    <div className="excel-meta-line">
                      <span>Status:</span>
                      <strong
                        className={`excel-status-bold ${
                          selectedMovement.status === "COMPLETED"
                            ? "completed"
                            : selectedMovement.status === "PENDING"
                            ? "pending"
                            : selectedMovement.status === "PROCESSING"
                            ? "processing"
                            : "rejected"
                        }`}
                      >
                        {selectedMovement.status}
                      </strong>
                    </div>
                  </div>
                </section>

                {/* 7-Column Metadata Band */}
                <section className="excel-band-wrap">
                  <table className="excel-band-table">
                    <thead>
                      <tr>
                        <th>Party / Initiator</th>
                        <th>Job / Contract</th>
                        <th>Payment Rail</th>
                        <th>Terms</th>
                        <th>Value Date</th>
                        <th>Settlement Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedMovement.counterpartyName || "Yekis Settlement Engine"}</td>
                        <td>{selectedMovement.contractTitle || selectedMovement.title}</td>
                        <td>{selectedMovement.paymentRail || "Internal Platform Escrow"}</td>
                        <td>{selectedMovement.direction === "IN" ? "Escrow Deposit (Credit)" : "Disbursal (Debit)"}</td>
                        <td>{new Date(selectedMovement.date).toISOString().slice(0, 10)}</td>
                        <td>Instant Settlement</td>
                        <td>
                          <strong
                            className={`excel-status-bold ${
                              selectedMovement.status === "COMPLETED"
                                ? "completed"
                                : selectedMovement.status === "PENDING"
                                ? "pending"
                                : selectedMovement.status === "PROCESSING"
                                ? "processing"
                                : "rejected"
                            }`}
                          >
                            {selectedMovement.status}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Line Items Table */}
                <section className="excel-table-wrap">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th style={{ width: "6%" }}>Qty</th>
                        <th style={{ width: "12%" }}>Item #</th>
                        <th style={{ width: "42%" }}>Description</th>
                        <th style={{ width: "14%" }}>Custom column</th>
                        <th style={{ width: "12%" }} className="num-col">Unit price</th>
                        <th style={{ width: "10%" }} className="num-col">Discount</th>
                        <th style={{ width: "14%" }} className="num-col">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>#{selectedMovement.id.slice(0, 8).toUpperCase()}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                            {selectedMovement.title}
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                            {selectedMovement.description}
                          </div>
                        </td>
                        <td style={{ color: "var(--color-text-secondary)" }}>
                          {selectedMovement.category.replace(/_/g, " ")}
                        </td>
                        <td className="num-col">
                          ETB {(selectedMovement.amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="num-col">
                          {selectedMovement.feeMinor > 0
                            ? `ETB ${(selectedMovement.feeMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "0"}
                        </td>
                        <td className="num-col" style={{ fontWeight: 700 }}>
                          ETB {(selectedMovement.netAmountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Totals Box (CSV Rows 25-30, Right Aligned Stacked Calculation) */}
                <section className="excel-totals-wrap">
                  <table className="excel-totals-table">
                    <tbody>
                      <tr>
                        <td>Total Discount:</td>
                        <td>
                          ETB {(selectedMovement.feeMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td>Subtotal:</td>
                        <td>
                          ETB {(selectedMovement.amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td>Sales tax:</td>
                        <td>ETB 0.00</td>
                      </tr>
                      <tr className="excel-totals-grand">
                        <td>Total:</td>
                        <td>
                          ETB {(selectedMovement.netAmountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Sign-off Footer (CSV Row 34: Thank you for your business!) */}
                <footer className="excel-signoff">
                  <div className="excel-thank-you">
                    Thank you for your business! · ስለመረጡን እናመሰግናለን!
                  </div>
                  <div className="excel-signoff-meta">
                    <span>ID: #{selectedMovement.id.slice(0, 12).toUpperCase()}</span>
                    <span>·</span>
                    <span>Rail Ref: {selectedMovement.reference || "N/A"}</span>
                  </div>
                </footer>

                {/* Actions Footer */}
                <div className="excel-actions-bar no-print">
                  <button
                    type="button"
                    className="excel-btn-action is-primary"
                    style={{ padding: "8px 18px" }}
                    onClick={() => {
                      const m = selectedMovement;
                      setSelectedMovement(null);
                      openFiscalDocForMovement(m);
                    }}
                  >
                    <FileText size={15} />
                    <span>View Official Fiscal Receipt / Voucher</span>
                  </button>
                  <button
                    type="button"
                    className="excel-btn-action"
                    style={{ padding: "8px 18px" }}
                    onClick={() => setSelectedMovement(null)}
                  >
                    Close
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      )}

      {/* Official Fiscal Document / Receipt Sheet Modal */}
      {activeFiscalDoc && (
        <FiscalDocumentSheet
          mode="modal"
          interactiveControls={false}
          data={activeFiscalDoc}
          onClose={() => setActiveFiscalDoc(null)}
        />
      )}

      {/* Checkout Instructions Modal (native <dialog> with showModal(), light dismiss, and scroll containment) */}
      <dialog
        ref={checkoutDialogRef}
        className="bw-checkout-dialog"
        aria-labelledby={checkoutDialogTitleId}
        {...({ closedby: "any" } as Record<string, string>)}
        onClose={handleCheckoutDialogClose}
        onPointerDown={handleCheckoutDialogPointerDown}
        onPointerUp={handleCheckoutDialogPointerUp}
      >
        {activeCheckout && (
          <div className="bw-checkout-shell">
            <div className="bw-checkout-header">
              <div className="bw-checkout-title-group">
                <img
                  src={PROVIDER_LOGOS[activeCheckout.provider]}
                  alt={PROVIDER_LABELS[activeCheckout.provider]}
                  className="bw-checkout-logo"
                />
                <h1 id={checkoutDialogTitleId}>
                  {PROVIDER_LABELS[activeCheckout.provider]} Checkout
                </h1>
              </div>
              <button
                type="button"
                className="bw-checkout-close-btn"
                aria-label="Close checkout instructions"
                onClick={closeCheckoutDialog}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="bw-checkout-body">
              <div className="bw-checkout-summary">
                <div>
                  <span className="bw-checkout-label">Top-up amount</span>
                  <strong className="bw-checkout-amount">
                    ETB {activeCheckout.amountEtb.toLocaleString()}
                  </strong>
                </div>
                <span
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "bw-checkout-status",
                    activeCheckout.status === "APPROVED"
                      ? "is-approved"
                      : activeCheckout.status === "REJECTED"
                        ? "is-rejected"
                        : activeCheckout.status === "PENDING"
                          ? "is-pending"
                          : "is-awaiting",
                  )}
                >
                  {activeCheckout.status === "APPROVED"
                    ? "Credited to wallet"
                    : activeCheckout.status === "REJECTED"
                      ? "Declined"
                      : activeCheckout.status === "PENDING"
                        ? "Pending staff review"
                        : "Awaiting confirmation"}
                </span>
              </div>

              {activeCheckout.providerTransactionId && (
                <div className="bw-checkout-ref-row">
                  <span>Session reference</span>
                  <code className="sh-mono">{activeCheckout.providerTransactionId}</code>
                </div>
              )}

              {activeCheckout.status === "APPROVED" ? (
                <div className="bw-checkout-note">
                  <p>
                    <strong>Payment confirmed.</strong> ETB {activeCheckout.amountEtb.toLocaleString()} has been added to your available wallet balance and is ready to fund escrow milestones.
                  </p>
                </div>
              ) : activeCheckout.status === "REJECTED" ? (
                <div className="bw-checkout-note">
                  <p>
                    This payment session did not complete and no funds were added to your wallet. You can start a new checkout or transfer manually and submit your receipt.
                  </p>
                </div>
              ) : activeCheckout.status === "PENDING" ? (
                <div className="bw-checkout-note">
                  <p>
                    Your transfer receipt was received and is waiting in the staff verification queue.
                  </p>
                </div>
              ) : activeCheckout.redirectUrl ? (
                <div className="bw-checkout-note">
                  <p>Complete your payment using the instructions below:</p>
                  <ol className="bw-checkout-steps">
                    <li>
                      Use <strong>Open {PROVIDER_LABELS[activeCheckout.provider]} Paygate</strong> below if the gateway window did not open automatically.
                    </li>
                    <li>
                      Authorize the transfer on the paygate screen. This window checks for confirmation automatically.
                    </li>
                    <li>
                      If the gateway times out or you already transferred directly, attach your transfer receipt below.
                    </li>
                  </ol>
                </div>
              ) : import.meta.env.DEV ? (
                <div className="bw-checkout-note">
                  <p>
                    Telebirr live gateway credentials are not configured in this local environment, so a sandbox checkout session was created without a redirect URL.
                  </p>
                  <ol className="bw-checkout-steps">
                    <li>
                      Click <strong>Simulate Instant Payment (Sandbox)</strong> below to settle this test top-up and credit your wallet immediately.
                    </li>
                    <li>
                      Or click <strong>Attach Transfer Receipt</strong> to upload a receipt and test the manual staff review queue.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="bw-checkout-note">
                  <p>
                    The payment gateway did not return a hosted checkout link for this session. Complete your top-up manually:
                  </p>
                  <ol className="bw-checkout-steps">
                    <li>
                      Transfer <strong>ETB {activeCheckout.amountEtb.toLocaleString()}</strong> to Yekis Telebirr account <strong>0910 011 818</strong> (or switch to Manual Transfer for CBE Bank / M-Pesa).
                    </li>
                    <li>
                      Click <strong>Attach Transfer Receipt</strong> below to submit your transaction reference and receipt photo for staff approval.
                    </li>
                  </ol>
                </div>
              )}

              {activeCheckout.actionError && (
                <Alert variant="destructive" className="flex items-center gap-2.5">
                  <Avatar className="size-6 rounded-[5px] shrink-0">
                    <AvatarFallback className="bg-destructive dark:bg-destructive/60 rounded-[5px] text-white">
                      <TbAlertCircle className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <AlertTitle>{activeCheckout.actionError}</AlertTitle>
                </Alert>
              )}
            </div>

            <div className="bw-checkout-footer">
              {activeCheckout.status === "APPROVED" || activeCheckout.status === "PENDING" ? (
                <button
                  type="button"
                  autoFocus
                  className="btn-primary"
                  onClick={closeCheckoutDialog}
                >
                  Done
                </button>
              ) : activeCheckout.status === "REJECTED" ? (
                <>
                  <button
                    type="button"
                    autoFocus
                    className="btn-secondary"
                    onClick={closeCheckoutDialog}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const amt = String(activeCheckout.amountEtb);
                      const prov = activeCheckout.provider;
                      closeCheckoutDialog();
                      switchToManualFallback(prov, amt);
                    }}
                  >
                    Use Manual Transfer
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    autoFocus={!import.meta.env.DEV && !activeCheckout.redirectUrl}
                    className="btn-secondary"
                    onClick={closeCheckoutDialog}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isCheckingCheckoutStatus || activeCheckout.isSimulating}
                    onClick={() => void syncCheckoutStatus(activeCheckout.topUpId)}
                  >
                    {isCheckingCheckoutStatus ? "Checking..." : "Check Status"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={activeCheckout.isSimulating}
                    onClick={() => switchCheckoutToAttachReceipt(activeCheckout.topUpId)}
                  >
                    Attach Transfer Receipt
                  </button>
                  {activeCheckout.redirectUrl && (
                    <a
                      href={activeCheckout.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <span>Open {PROVIDER_LABELS[activeCheckout.provider]} Paygate</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      autoFocus={!activeCheckout.redirectUrl}
                      className="btn-primary"
                      disabled={activeCheckout.isSimulating}
                      onClick={() => void handleSimulateCheckoutSuccess()}
                    >
                      {activeCheckout.isSimulating
                        ? "Processing..."
                        : "Simulate Instant Payment (Sandbox)"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
