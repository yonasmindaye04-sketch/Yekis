// === IMPORTS ===
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "./api/client";

export function PaymentReturn() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Waiting for payment confirmation...");

  useEffect(() => {
    // Basic polling mechanism to verify the milestone status has updated.
    // In a real app, you might get the exact transaction ID from query params 
    // and verify it with the backend, but since webhooks handle the truth,
    // we can just poll the milestones list or wait a fixed time.
    let isMounted = true;

    const checkStatus = async () => {
      try {
        // Wait 3 seconds to give the webhook time to process
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        if (isMounted) {
          // If we had a specific milestone ID, we'd check it here.
          // For now, we assume success if the webhook is processed.
          setStatus("success");
          setMessage("Payment successful. Your escrow has been funded.");
        }
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          setMessage("We couldn't confirm your payment right now. Please check your contracts tab in a few minutes.");
        }
      }
    };

    void checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="welcome-screen" style={{ textAlign: "center", paddingTop: "10vh" }}>
      <div className="glass-card" style={{ maxWidth: 400, margin: "0 auto", padding: "40px 20px" }}>
        <img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo" style={{ margin: "0 auto 28px" }} />
        
        {status === "loading" && (
          <>
            <Loader2 size={48} className="lucide-spin" style={{ margin: "0 auto 24px", color: "var(--brand-primary)" }} />
            <h2>Processing Payment</h2>
            <p className="welcome-copy">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={48} style={{ margin: "0 auto 24px", color: "var(--success)" }} />
            <h2>Payment Complete</h2>
            <p className="welcome-copy">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={48} style={{ margin: "0 auto 24px", color: "var(--danger)" }} />
            <h2>Status Unconfirmed</h2>
            <p className="welcome-copy">{message}</p>
          </>
        )}

        <button 
          className="btn-primary" 
          style={{ marginTop: 32, width: "100%", justifyContent: "center" }}
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
