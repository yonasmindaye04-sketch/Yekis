// === IMPORTS ===
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { api } from "./api/client";

/**
 * Where the user lands after a hosted checkout.
 *
 * This page used to sleep three seconds and then render "Payment Complete --
 * your escrow has been funded", unconditionally. It never asked the server
 * anything. That is the single worst thing this screen could get wrong: a user
 * who believes a milestone is funded will start work that is not protected by
 * escrow, and will discover the truth only when the money does not arrive.
 *
 * So: success is shown only when the server says this specific top-up is
 * APPROVED. Everything else is reported as what it actually is -- still
 * waiting, declined, or unconfirmed -- with copy that tells the user what to do
 * next rather than telling them what they want to hear.
 *
 * The provider does not reliably echo the top-up id back on the redirect, so it
 * is stashed when checkout is started and read here as a fallback.
 */

type Outcome = "loading" | "credited" | "pending" | "declined" | "unconfirmed";

const PENDING_KEY = "yekis_pending_topup";

function stashTopUpId(id: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, id);
  } catch {
    // Storage unavailable: the query string may still carry it.
  }
}

export function stashPendingTopUp(id: string) {
  stashTopUpId(id);
}

function readTopUpId(): string | null {
  const fromQuery = new URLSearchParams(window.location.search).get("topUpId");
  if (fromQuery) return fromQuery;
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function clearStash() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clean up.
  }
}

const COPY: Record<Outcome, { title: string; body: string }> = {
  loading: {
    title: "Confirming your payment",
    body: "Waiting for the bank to confirm. This usually takes a few seconds.",
  },
  credited: {
    title: "Payment received",
    body: "Your wallet has been credited and the money is now held in escrow. The freelancer has not been paid until you accept their delivery.",
  },
  pending: {
    title: "We have not received confirmation yet",
    body: "Your bank has not confirmed the payment. This is normal for a few minutes. Your wallet has not been credited, and no money has left your account on our side. Refresh this page in a minute, or check your wallet.",
  },
  declined: {
    title: "Payment declined",
    body: "The bank did not approve this payment, so nothing was charged. Check the payment details and try again, or contact your bank.",
  },
  unconfirmed: {
    title: "We could not confirm this payment",
    body: "We could not reach the server to check the status of this payment. Please do not assume it succeeded. Check your wallet in a few minutes before starting any work.",
  },
};

export function PaymentReturn() {
  const [outcome, setOutcome] = useState<Outcome>("loading");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    const topUpId = readTopUpId();

    // Without an id there is nothing to verify. Saying "we could not confirm"
    // is honest; showing a success screen would be a guess.
    if (!topUpId) {
      setOutcome("unconfirmed");
      return;
    }

    let cancelled = false;
    const deadline = Date.now() + 45_000;

    const check = async () => {
      while (!cancelled && Date.now() < deadline) {
        try {
          const status = await api.getTopUpStatus(topUpId);
          if (cancelled) return;
          setAmount(status.amountMinor);

          if (status.credited) {
            clearStash();
            setOutcome("credited");
            return;
          }
          if (status.status === "REJECTED") {
            clearStash();
            setOutcome("declined");
            return;
          }
          // CHECKOUT_PENDING, PENDING or FLAGGED: still waiting. Keep polling
          // rather than guessing.
        } catch {
          // Network or auth failure. Do not fall through to a success screen.
          if (cancelled) return;
          setOutcome("unconfirmed");
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setOutcome("pending");
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = COPY[outcome];
  const stillWorking = outcome === "loading";

  return (
    <main
      className="welcome-screen"
      style={{ textAlign: "center", paddingTop: "10vh" }}
    >
      <div
        className="glass-card"
        style={{ maxWidth: 440, margin: "0 auto", padding: "40px 20px" }}
      >
        <img
          src="/svgviewer-output.svg"
          alt="Yekis Logo"
          className="platform-logo"
          style={{ margin: "0 auto 28px" }}
        />

        {stillWorking ? (
          <Loader2
            size={48}
            className="lucide-spin"
            style={{ margin: "0 auto 24px", color: "var(--brand-primary)" }}
          />
        ) : outcome === "credited" ? (
          <CheckCircle2
            size={48}
            style={{ margin: "0 auto 24px", color: "var(--success)" }}
          />
        ) : outcome === "declined" ? (
          <XCircle
            size={48}
            style={{ margin: "0 auto 24px", color: "var(--danger)" }}
          />
        ) : (
          <Clock
            size={48}
            style={{ margin: "0 auto 24px", color: "var(--brand-primary)" }}
          />
        )}

        <h2>{copy.title}</h2>
        {amount !== null && (
          <p
            style={{
              fontWeight: 600,
              fontSize: "1.1rem",
              margin: "0 0 8px",
            }}
          >
            ETB {(amount / 100).toLocaleString()}
          </p>
        )}
        <p className="welcome-copy">{copy.body}</p>

        {outcome !== "credited" && (
          <button
            className="btn-secondary"
            style={{
              marginTop: 24,
              width: "100%",
              justifyContent: "center",
            }}
            onClick={() => window.location.reload()}
          >
            Check again
          </button>
        )}

        <button
          className="btn-primary"
          style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <ArrowLeft size={16} /> Return to Workspace
        </button>
      </div>
    </main>
  );
}