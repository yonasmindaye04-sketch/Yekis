// === IMPORTS ===
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Upload,
  WalletCards,
} from "lucide-react";
import { api, type TopUpRequest, type WalletResponse } from "./api/client";
import { events } from "./analytics";

export type PaymentRail = "TELEBIRR" | "CBE_BIRR" | "M_PESA";

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
  role: "CLIENT" | "FREELANCER";
}) {
  const [checkoutRail, setCheckoutRail] = useState<PaymentRail>("TELEBIRR");
  const [topUpRail, setTopUpRail] = useState<PaymentRail>("TELEBIRR");
  const [withdrawRail, setWithdrawRail] = useState<PaymentRail>("TELEBIRR");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutIdentifier, setPayoutIdentifier] = useState("");
  const [showTopUp, setShowTopUp] = useState(role === "CLIENT");
  const [topUpMethod, setTopUpMethod] = useState<"INSTANT" | "MANUAL">("INSTANT");

  // Manual verification fallback when API call fails
  const [checkoutFallback, setCheckoutFallback] = useState<{
    amount: string;
    provider: PaymentRail;
    reason: string;
  } | null>(null);

  // Manual attachment on existing checkout
  const [attachingTopUpId, setAttachingTopUpId] = useState<string | null>(null);
  const [attachRef, setAttachRef] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [isAttachingSubmitting, setIsAttachingSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const setSuccess = (msg: string) => {
    setMessage(msg);
    setMessageIsError(false);
  };
  const setError = (msg: string) => {
    setMessage(msg);
    setMessageIsError(true);
  };

  const copyAccountToClipboard = (acc: string, label: string) => {
    void navigator.clipboard.writeText(acc);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const switchToManualFallback = (p: PaymentRail, amt?: string) => {
    setTopUpMethod("MANUAL");
    setTopUpRail(p);
    if (amt) setAmount(amt);
    setCheckoutFallback(null);
    setMessage("");
  };

  const submitCheckoutTopUp = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    setCheckoutFallback(null);
    try {
      const { redirectUrl } = await api.initiateCheckoutTopUp(
        Math.round(amountNum * 100),
        checkoutRail,
      );
      if (redirectUrl) {
        const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (url: string) => void } } })?.Telegram?.WebApp;
        if (tg && typeof tg.openLink === "function") {
          tg.openLink(redirectUrl);
        } else {
          window.location.href = redirectUrl;
        }
      } else {
        const providerNames = { TELEBIRR: "Telebirr", CBE_BIRR: "CBE Birr", M_PESA: "M-Pesa" };
        setMessage(`${providerNames[checkoutRail]} payment initiated! Your balance will be credited upon confirmation.`);
        setTimeout(() => {
          void onChanged();
        }, 1500);
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : "Payment gateway request failed";
      setError(`Automated checkout failed: ${errText}`);
      setCheckoutFallback({
        amount: amount.trim(),
        provider: checkoutRail,
        reason: errText,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTopUp = async () => {
    if (!amount || !reference || !receipt) {
      setError(
        "Please fill in the amount, reference number, and attach a receipt.",
      );
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("amountMinor", (Number(amount) * 100).toString());
      data.append("provider", topUpRail);
      data.append("referenceNumber", reference);
      data.append("receipt", receipt);
      await api.createTopUpRequest(data);
      setAmount("");
      setReference("");
      setReceipt(null);
      setSuccess(
        "Top-up submitted for staff approval. Your balance will update once approved.",
      );
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit top-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachReceipt = async (topUpId: string) => {
    if (!attachRef.trim() || !attachFile) {
      setError("Please provide the transaction reference number and attach a receipt.");
      return;
    }
    setIsAttachingSubmitting(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("referenceNumber", attachRef.trim());
      data.append("receipt", attachFile);
      await api.attachTopUpReceipt(topUpId, data);
      setAttachingTopUpId(null);
      setAttachRef("");
      setAttachFile(null);
      setSuccess(
        "Receipt attached! Your request has been moved to pending staff verification.",
      );
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach receipt");
    } finally {
      setIsAttachingSubmitting(false);
    }
  };

  const withdraw = async () => {
    const amountMinor = Math.round(Number(withdrawAmount) * 100);
    if (
      !Number.isFinite(amountMinor) ||
      amountMinor <= 0 ||
      !payoutIdentifier.trim()
    ) {
      setError(
        "Enter a withdrawal amount and your payout phone or account number.",
      );
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await api.withdrawWallet({
        amountMinor,
        provider: withdrawRail,
        payoutAccountIdentifier: payoutIdentifier.trim(),
      });
      if (result.error === "HELD_FOR_REVIEW") {
        setError(
          "Withdrawal held for compliance review. Your balance was not debited.",
        );
      } else if (result.error === "ACTIVE_CONTRACT_BLOCKS_WITHDRAWAL") {
        setError(
          result.message ??
            "You cannot withdraw while you have active contracts or open disputes. Wait for them to complete first.",
        );
      } else {
        setWithdrawAmount("");
        setPayoutIdentifier("");
        // Analytics: payout entered the settlement pipeline (completion is
        // tracked as payout_completed when staff confirms settlement).
        events.payoutRequested();
        setSuccess(
          "Withdrawal request recorded. Funds will be sent to your account.",
        );
      }
      await onChanged();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to request withdrawal";
      // Handle the contract-blocks-withdrawal error from the API
      if (msg.includes("active contracts") || msg.includes("open dispute")) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="browser-wallet-stack">
      {/* Balance hero — shown to all */}
      <section className="wallet-hero">
        <div>
          <p className="eyebrow">Available balance</p>
          <strong>ETB {(wallet.balanceMinor / 100).toLocaleString()}</strong>
          <span>
            {role === "CLIENT"
              ? "Updated from approved top-ups. Deducted when contracts are funded."
              : "Updated from released milestones and approved top-ups."}
          </span>
        </div>
        <WalletCards size={36} />
      </section>

      {/* Freelancer: Withdraw Earnings */}
      {role === "FREELANCER" && (
        <section className="panel withdraw-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Tier 2 payout</p>
              <h2>Withdraw earnings</h2>
            </div>
            <WalletCards size={22} />
          </div>

          {/* Provider selector */}
          <p className="wallet-help">Choose where to receive your payout:</p>
          <div className="payment-grid">
            <button
              className={
                withdrawRail === "TELEBIRR"
                  ? "payment-account selected"
                  : "payment-account"
              }
              onClick={() => setWithdrawRail("TELEBIRR")}
            >
              <img
                src="/payment/Telebirr.png"
                alt="Telebirr"
                style={{
                  width: "70px",
                  height: "70px",
                  objectFit: "contain",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              />
              <div className="payment-account-text">
                <strong>Telebirr</strong>
                <span>Send to phone number</span>
              </div>
            </button>
            <button
              className={
                withdrawRail === "CBE_BIRR"
                  ? "payment-account selected"
                  : "payment-account"
              }
              onClick={() => setWithdrawRail("CBE_BIRR")}
            >
              <img
                src="/payment/cbe payment.jpg"
                alt="CBE Bank"
                style={{
                  width: "70px",
                  height: "70px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              />
              <div className="payment-account-text">
                <strong>CBE Bank</strong>
                <span>Send to account number</span>
              </div>
            </button>
            <button
              className={
                withdrawRail === "M_PESA"
                  ? "payment-account selected"
                  : "payment-account"
              }
              onClick={() => setWithdrawRail("M_PESA")}
            >
              <img
                src="/payment/mpesa.svg"
                alt="Safaricom M-Pesa"
                style={{
                  width: "70px",
                  height: "70px",
                  objectFit: "contain",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              />
              <div className="payment-account-text">
                <strong>Safaricom M-Pesa</strong>
                <span>Send to Safaricom phone</span>
              </div>
            </button>
          </div>

          <div className="browser-topup-fields">
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

          {message && (
            <p
              className={
                messageIsError ? "wallet-message error" : "wallet-message"
              }
            >
              {!messageIsError && <Check size={16} />}
              {message}
            </p>
          )}

          <button
            className="btn-primary"
            disabled={isSubmitting || wallet.balanceMinor <= 0}
            onClick={() => void withdraw()}
          >
            {isSubmitting ? "Processing..." : "Request withdrawal"}
          </button>
        </section>
      )}

      {/* Top-Up — shown to all roles (freelancers can also hire) */}
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
              <div style={{ maxWidth: 540, display: "grid", gap: 14 }}>
                <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.86rem" }}>
                  Select an automated payment gateway. Your wallet will be credited automatically.
                </p>

                <div className="payment-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
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
                    style={{ padding: "10px 8px", flexDirection: "column", textAlign: "center", gap: 6 }}
                  >
                    <img
                      src="/payment/Telebirr.png"
                      alt="Telebirr"
                      style={{
                        width: "44px",
                        height: "44px",
                        objectFit: "contain",
                        borderRadius: "6px",
                      }}
                    />
                    <div className="payment-account-text" style={{ textAlign: "center" }}>
                      <strong>Telebirr</strong>
                      <span style={{ fontSize: "0.72rem" }}>Instant C2B</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={
                      checkoutRail === "CBE_BIRR"
                        ? "payment-account selected"
                        : "payment-account"
                    }
                    onClick={() => {
                      setCheckoutRail("CBE_BIRR");
                      setCheckoutFallback(null);
                    }}
                    style={{ padding: "10px 8px", flexDirection: "column", textAlign: "center", gap: 6 }}
                  >
                    <img
                      src="/payment/cbe payment.jpg"
                      alt="CBE Birr"
                      style={{
                        width: "44px",
                        height: "44px",
                        objectFit: "cover",
                        borderRadius: "6px",
                      }}
                    />
                    <div className="payment-account-text" style={{ textAlign: "center" }}>
                      <strong>CBE Birr</strong>
                      <span style={{ fontSize: "0.72rem" }}>Bank gateway</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={
                      checkoutRail === "M_PESA"
                        ? "payment-account selected"
                        : "payment-account"
                    }
                    onClick={() => {
                      setCheckoutRail("M_PESA");
                      setCheckoutFallback(null);
                    }}
                    style={{ padding: "10px 8px", flexDirection: "column", textAlign: "center", gap: 6 }}
                  >
                    <img
                      src="/payment/mpesa.svg"
                      alt="M-Pesa"
                      style={{
                        width: "44px",
                        height: "44px",
                        objectFit: "contain",
                        borderRadius: "6px",
                      }}
                    />
                    <div className="payment-account-text" style={{ textAlign: "center" }}>
                      <strong>M-Pesa</strong>
                      <span style={{ fontSize: "0.72rem" }}>Safaricom STK</span>
                    </div>
                  </button>
                </div>

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

                {/* Manual verification fallback card shown if automated checkout API fails */}
                {checkoutFallback && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.28)",
                      borderRadius: 10,
                      padding: "14px 16px",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ color: "#ef4444", fontSize: "0.9rem", display: "block" }}>
                          Automated Gateway Issue — Manual Verification Available
                        </strong>
                        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                          The automated gateway for {checkoutFallback.provider === "TELEBIRR" ? "Telebirr" : checkoutFallback.provider === "CBE_BIRR" ? "CBE Birr" : "Safaricom M-Pesa"} is temporarily unreachable. You don't have to wait or suffer! Switch to manual verification to transfer directly and submit your receipt for prompt staff credit.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: "0.82rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() => switchToManualFallback(checkoutFallback.provider, checkoutFallback.amount)}
                      >
                        Switch to Manual Verification <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                        onClick={() => setCheckoutFallback(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{ justifyContent: "center", marginTop: 4, width: "100%" }}
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
                      width: 24,
                      height: 24,
                      objectFit: "contain",
                      marginRight: 8,
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
            ) : (
              <>
                <p className="wallet-help">
                  Send money to the platform account below, then upload the receipt for staff verification:
                </p>
                <div className="payment-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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
                      <code>1000 223 344</code>
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
                      <code>0777 011 818</code>
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
                    Selected: <strong>{topUpRail === "TELEBIRR" ? "Telebirr (0910 011 818)" : topUpRail === "CBE_BIRR" ? "CBE Bank (1000 223 344)" : "M-Pesa (0777 011 818 - Till 882199)"}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "0.76rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() =>
                      copyAccountToClipboard(
                        topUpRail === "TELEBIRR" ? "0910011818" : topUpRail === "CBE_BIRR" ? "1000223344" : "0777011818",
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
                  <label style={{ gridColumn: "1 / -1" }}>
                    Receipt image or document (PDF/Photo)
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setReceipt(e.target.files?.[0] || null)
                      }
                    />
                  </label>
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

            {message && (
              <p
                className={
                  messageIsError ? "wallet-message error" : "wallet-message"
                }
              >
                {!messageIsError && <Check size={16} />}
                {message}
              </p>
            )}
          </>
        )}
      </section>

      {/* Recent top-ups with manual verification action on stalled checkouts */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Recent top-ups</h2>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                        onClick={() => setAttachingTopUpId(isAttaching ? null : item.id)}
                      >
                        {isAttaching ? "Cancel" : "Attach receipt"}
                      </button>
                    )}
                  </div>
                </div>

                {isAttaching && (
                  <div
                    style={{
                      background: "var(--color-bg-subtle)",
                      padding: 12,
                      borderRadius: 8,
                      display: "grid",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      Payment didn't clear automatically? Attach your receipt and reference code below for manual staff approval.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input
                        placeholder="Transaction / reference code"
                        value={attachRef}
                        onChange={(e) => setAttachRef(e.target.value)}
                        style={{ fontSize: "0.82rem" }}
                      />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
                        style={{ fontSize: "0.82rem" }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: "fit-content", fontSize: "0.82rem", padding: "6px 14px" }}
                      disabled={isAttachingSubmitting || !attachRef.trim() || !attachFile}
                      onClick={() => void handleAttachReceipt(item.id)}
                    >
                      {isAttachingSubmitting ? "Submitting..." : "Submit for Staff Verification"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
