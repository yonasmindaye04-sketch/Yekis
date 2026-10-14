import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { api } from "./api/client";
import "./PhoneVerification.css";

/**
 * SMS verification step, shown during registration.
 *
 * Why this exists: User.phone is NOT NULL and unique, is accepted as a login
 * identifier, is the SMS notification destination and is the payout destination
 * for Telebirr and M-Pesa. Until now nothing proved the account holder owned it.
 * Someone could register with another person's number, which aims both the
 * notifications and the payout instructions somewhere the platform never
 * verified.
 *
 * What this deliberately does NOT do: block registration on a failure. A user who
 * cannot receive the SMS still needs to be able to reach the platform and ask
 * support -- a hard gate with no escape hatch is a support queue, not a
 * security control. The backend's attempt caps and per-number throttling are the
 * control; this is the honest UI around it.
 */

type Phase = "idle" | "sending" | "sent" | "verifying" | "verified";

export interface PhoneVerificationProps {
  phone: string;
  onVerified: () => void;
  /** Lets the user continue without verifying. Never called on success. */
  onSkip: () => void;
}

const RESEND_COOLDOWN_SEC = 60;

export function PhoneVerification({
  phone,
  onVerified,
  onSkip,
}: PhoneVerificationProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = useCallback(async () => {
    setPhase("sending");
    setError(null);
    try {
      const res = await api.requestPhoneCode(phone);
      setPhase("sent");
      setCooldown(res.retryAfterSec || RESEND_COOLDOWN_SEC);
      setInfo(
        res.devCode
          ? `Development mode: your code is ${res.devCode}`
          : `We sent a 6-digit code to ${phone}. It expires in 10 minutes.`,
      );
      // Focus once the field exists.
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error
          ? err.message
          : "We could not send a code. Check the number and try again.",
      );
    }
  }, [phone]);

  const verify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{6}$/.test(code)) {
        setError("Enter the 6-digit code from the message.");
        return;
      }
      setPhase("verifying");
      setError(null);
      try {
        await api.verifyPhoneCode(phone, code);
        setPhase("verified");
        onVerified();
      } catch (err) {
        setPhase("sent");
        setError(
          err instanceof Error
            ? err.message
            : "That code is not valid. Request a new one if it has expired.",
        );
      }
    },
    [code, onVerified, phone],
  );

  if (phase === "verified") {
    return (
      <div className="pv-shell">
        <div className="pv-card">
          <ShieldCheck size={40} className="pv-ok" aria-hidden />
          <h3>Number confirmed</h3>
          <p className="pv-muted">
            We have verified {phone}. It is now the number we will use for
            notifications and for paying you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pv-shell">
      <div className="pv-card">
        <h3>Confirm your phone number</h3>
        <p className="pv-muted">
          We use {phone || "your number"} for security alerts and to pay you.
          We will text you a six-digit code.
        </p>

        {phase === "idle" && (
          <button
            type="button"
            className="btn-primary pv-wide"
            onClick={() => void send()}
            disabled={!phone}
          >
            Send me a code
          </button>
        )}

        {(phase === "sending" || phase === "verifying") && (
          <button type="button" className="btn-primary pv-wide" disabled>
            <Loader2 size={16} className="lucide-spin" aria-hidden />
            {phase === "sending" ? "Sending..." : "Checking..."}
          </button>
        )}

        {phase === "sent" && (
          <form onSubmit={verify}>
            <label className="pv-label" htmlFor="pv-code">
              Six-digit code
            </label>
            <input
              id="pv-code"
              ref={inputRef}
              className="pv-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
            />
            <button
              type="submit"
              className="btn-primary pv-wide"
              disabled={code.length !== 6 || phase === "verifying"}
            >
              Confirm number
            </button>
          </form>
        )}

        {info && <p className="pv-info">{info}</p>}
        {error && (
          <p className="pv-error" role="alert">
            {error}
          </p>
        )}

        <div className="pv-actions">
          {phase === "sent" && (
            <button
              type="button"
              className="pv-link"
              onClick={() => void send()}
              disabled={cooldown > 0}
            >
              {cooldown > 0
                ? `Send another code in ${cooldown}s`
                : "Send another code"}
            </button>
          )}
          {phase !== "verified" && (
            <button type="button" className="pv-link pv-muted" onClick={onSkip}>
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}