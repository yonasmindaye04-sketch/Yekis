// === IMPORTS ===
import { useState } from "react";
import { Check, Upload, WalletCards } from "lucide-react";
import { api, type TopUpRequest, type WalletResponse } from "./api/client";

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
  const [topUpRail, setTopUpRail] = useState<"TELEBIRR" | "CBE_BIRR">(
    "TELEBIRR",
  );
  const [withdrawRail, setWithdrawRail] = useState<"TELEBIRR" | "CBE_BIRR">(
    "TELEBIRR",
  );
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutIdentifier, setPayoutIdentifier] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpMethod, setTopUpMethod] = useState<"INSTANT" | "MANUAL">("INSTANT");

  const setSuccess = (msg: string) => {
    setMessage(msg);
    setMessageIsError(false);
  };
  const setError = (msg: string) => {
    setMessage(msg);
    setMessageIsError(true);
  };

  const submitCheckoutTopUp = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const { redirectUrl } = await api.initiateCheckoutTopUp(
        Math.round(amountNum * 100),
        "TELEBIRR"
      );
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Failed to initiate top-up"}`);
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
                : "CBE account number"}
              <input
                value={payoutIdentifier}
                onChange={(e) => setPayoutIdentifier(e.target.value)}
                placeholder={withdrawRail === "TELEBIRR" ? "+251911…" : "1000…"}
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
              <div className="browser-topup-fields">
                <p style={{ gridColumn: "1 / -1", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Pay with Telebirr online. Your wallet will be credited automatically.
                </p>
                <label style={{ gridColumn: "1 / -1" }}>
                  Amount to add (ETB)
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                </label>
                <button
                  className="btn-primary"
                  style={{ gridColumn: "1 / -1", justifyContent: "center" }}
                  disabled={isSubmitting}
                  onClick={() => void submitCheckoutTopUp()}
                >
                  <img src="/payment/Telebirr.png" alt="" style={{ width: 24, height: 24, objectFit: "contain", marginRight: 8, background: "#fff", borderRadius: 4 }} />
                  {isSubmitting ? "Starting checkout..." : "Pay with Telebirr"}
                </button>
              </div>
            ) : (
              <>
                <p className="wallet-help">
                  Send money to your selected account, then upload the receipt for
                  staff approval.
                </p>
                <div className="payment-grid">
                  <button
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
                        width: "70px",
                        height: "70px",
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
                        width: "70px",
                        height: "70px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="payment-account-text">
                      <strong>CBE Bank</strong>
                      <span>Yekis top-up account</span>
                      <code>1000 223 344</code>
                    </div>
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
                      placeholder="e.g. TB-12345"
                    />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Receipt Image
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
                  {isSubmitting ? "Submitting..." : "Submit for approval"}
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

      {/* Recent top-ups */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Recent top-ups</h2>
        </div>
        {topUps.length === 0 ? (
          <p className="empty-state">No top-ups submitted yet.</p>
        ) : (
          topUps.map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <strong>ETB {(item.amountMinor / 100).toLocaleString()}</strong>
                <span>
                  {item.provider} · {item.referenceNumber}
                </span>
              </div>
              <span className="status-pill">
                {item.status.replace("_", " ")}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
