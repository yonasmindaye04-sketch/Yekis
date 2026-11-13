import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { api } from "./api/client";
import { useI18n } from "./i18n";
import "./OnboardingVerification.css";

/**
 * The onboarding OTP step.
 *
 * WHY THIS EXISTS
 * The signup flow used to prove control of the phone number over SMS and
 * nothing else. On a hosted testing environment the SMS provider has no key,
 * so the very first step of the onboarding failed for every new user — the
 * account could not be created at all. The code is now sent over email, which
 * is the channel the deployment can actually deliver, and the step itself is
 * rebuilt around one question: what does the person need to do next?
 *
 * The design rules this component follows:
 *
 *   - The code is requested the moment the step opens. Nobody has to click
 *     "send me a code" and then wonder whether it arrived.
 *   - The target is shown masked. It tells the user WHERE the code went
 *     without printing a full address on a screen someone else can see.
 *   - The expiry is counted down, so "it did not work" has an explanation.
 *   - Wrong code, expired code, too many attempts and undeliverable mail are
 *     four different messages. "Invalid code" for all four is how a user ends
 *     up asking support for something that was never going to work.
 *   - A way back to the details step, because a mistyped address is the most
 *     common reason the code never arrives.
 *
 * What this deliberately does NOT do: block registration on a failure. The
 * backend's attempt caps and per-address throttling are the control; a hard
 * gate with no escape hatch is a support queue, not a security control.
 */

export type VerificationChannel = "email" | "phone";

type Phase = "sending" | "sent" | "verifying" | "verified" | "failed";

export interface OnboardingVerificationProps {
  channel: VerificationChannel;
  /** The raw target used for the API calls — an address or a number. */
  target: string;
  onVerified: () => void;
  /** Return to the details step, e.g. to fix a mistyped address. */
  onBack: () => void;
  /** Escape hatch. Never called on success. */
  onSkip?: () => void;
}

/** `alice@example.com` -> `a***@example.com` */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  return `${local.slice(0, 1)}***${domain}`;
}

/** `+251911223344` -> `+251 *** 344` */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `+${digits.slice(0, 3)} *** ${digits.slice(-3)}`;
}

const RESEND_COOLDOWN_SEC = 60;
const CODE_TTL_MINUTES = 10;

export function OnboardingVerification({
  channel,
  target,
  onVerified,
  onBack,
  onSkip,
}: OnboardingVerificationProps) {
  const { t } = useI18n();
  const ob = t.workspace.onboarding;

  const [phase, setPhase] = useState<Phase>("sending");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_MINUTES * 60);
  const inputRef = useRef<HTMLInputElement>(null);
  // React 19 runs effects twice under StrictMode in development. Without this
  // guard the code is requested twice on mount, and the second request eats the
  // resend cooldown for a request the user never made.
  const requestedRef = useRef(false);

  const masked =
    channel === "email" ? maskEmail(target) : maskPhone(target);

  const isEmail = channel === "email";

  const send = useCallback(async () => {
    setPhase("sending");
    setError(null);
    setCode("");
    try {
      const res = isEmail
        ? await api.requestEmailCode(target)
        : await api.requestPhoneCode(target);
      setPhase("sent");
      setCooldown(res.retryAfterSec || RESEND_COOLDOWN_SEC);
      setSecondsLeft(CODE_TTL_MINUTES * 60);
      setDevCode(res.devCode ?? null);
      // Focus once the field exists.
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setPhase("failed");
      setError(describeSendError(err, ob, masked));
    }
    // `ob` and `masked` are derived from props and the translation table; the
    // request itself only depends on the channel and the target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmail, target]);

  // Request the code as soon as the step opens.
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    void send();
  }, [send]);

  // Resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Expiry countdown. The code lives for ten minutes; showing the remainder
  // turns "the code did not work" into "the code expired", which are very
  // different things for the person in front of the form.
  useEffect(() => {
    if (phase !== "sent") return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const verify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{6}$/.test(code)) {
        setError(ob.errorInvalid);
        return;
      }
      setPhase("verifying");
      setError(null);
      try {
        if (isEmail) {
          await api.verifyEmailCode(target, code);
        } else {
          await api.verifyPhoneCode(target, code);
        }
        setPhase("verified");
        onVerified();
      } catch (err) {
        setPhase("sent");
        setError(describeVerifyError(err, ob));
        // An expired code cannot be rescued by another guess, so the resend
        // becomes available immediately rather than after the cooldown.
        if (errorCode(err) === "CODE_EXPIRED") setCooldown(0);
      }
    },
    [code, isEmail, ob, onVerified, target],
  );

  if (phase === "verified") {
    return (
      <div className="ob-shell">
        <div className="ob-card">
          <ShieldCheck size={40} className="ob-ok" aria-hidden />
          <h3>{isEmail ? ob.emailConfirmedTitle : ob.phoneConfirmedTitle}</h3>
          <p className="ob-muted">
            {isEmail
              ? ob.emailConfirmedDesc.replace("{target}", masked)
              : ob.phoneConfirmedDesc.replace("{target}", masked)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-shell">
      <div className="ob-card">
        <ol className="ob-steps" aria-label={ob.stepsLabel}>
          <li className="ob-step ob-step-done">
            <span className="ob-step-dot" aria-hidden />
            {ob.stepDetails}
          </li>
          <li className="ob-step ob-step-current" aria-current="step">
            <span className="ob-step-dot" aria-hidden />
            {isEmail ? ob.stepEmail : ob.stepPhone}
          </li>
        </ol>

        <div className="ob-heading">
          {isEmail ? (
            <Mail size={22} className="ob-icon" aria-hidden />
          ) : (
            <MessageSquare size={22} className="ob-icon" aria-hidden />
          )}
          <div>
            <h3>{isEmail ? ob.emailTitle : ob.phoneTitle}</h3>
            <p className="ob-muted">
              {(isEmail ? ob.emailSubtitle : ob.phoneSubtitle)
                .replace("{target}", masked)
                .replace("{minutes}", String(CODE_TTL_MINUTES))}
            </p>
          </div>
        </div>

        {phase === "sending" && (
          <div className="ob-status" role="status">
            <Loader2 size={16} className="lucide-spin" aria-hidden />
            {ob.sendingBtn}
          </div>
        )}

        {phase === "failed" && (
          <>
            <div className="ob-alert ob-alert-error" role="alert">
              <TriangleAlert size={16} className="ob-alert-icon" aria-hidden />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="btn-primary ob-wide"
              onClick={() => void send()}
            >
              <RefreshCw size={15} aria-hidden />
              {ob.retryBtn}
            </button>
          </>
        )}

        {(phase === "sent" || phase === "verifying") && (
          <form onSubmit={verify}>
            <label className="ob-label" htmlFor="ob-code">
              {ob.codeLabel}
            </label>
            <input
              id="ob-code"
              ref={inputRef}
              className="ob-input"
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
            <div className="ob-expiry">
              {ob.expiresIn
                .replace("{minutes}", String(Math.floor(secondsLeft / 60)).padStart(2, "0"))
                .replace("{seconds}", String(secondsLeft % 60).padStart(2, "0"))}
            </div>
            <button
              type="submit"
              className="btn-primary ob-wide"
              disabled={code.length !== 6 || phase === "verifying"}
            >
              {phase === "verifying" ? (
                <>
                  <Loader2 size={15} className="lucide-spin" aria-hidden />
                  {ob.checkingBtn}
                </>
              ) : (
                ob.verifyBtn
              )}
            </button>
          </form>
        )}

        {devCode && (
          <div className="ob-alert ob-alert-info" role="status">
            <Info size={16} className="ob-alert-icon" aria-hidden />
            <span>{ob.devCode.replace("{code}", devCode)}</span>
          </div>
        )}

        {error && phase !== "failed" && (
          <div className="ob-alert ob-alert-error" role="alert">
            <TriangleAlert size={16} className="ob-alert-icon" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="ob-actions">
          {phase === "sent" && (
            <button
              type="button"
              className="ob-link"
              onClick={() => void send()}
              disabled={cooldown > 0}
            >
              {cooldown > 0
                ? ob.resendIn.replace("{sec}", String(cooldown))
                : ob.resendNow}
            </button>
          )}
          <button type="button" className="ob-link" onClick={onBack}>
            <ArrowLeft size={13} aria-hidden />
            {isEmail ? ob.changeEmail : ob.changePhone}
          </button>
          {onSkip && (
            <button type="button" className="ob-link ob-muted" onClick={onSkip}>
              {ob.skipBtn}
            </button>
          )}
        </div>

        <p className="ob-hint">{ob.notFoundHint}</p>
      </div>
    </div>
  );
}

/** The API error code, when the server sent one. */
function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function describeSendError(
  err: unknown,
  ob: ReturnType<typeof useI18n>["t"]["workspace"]["onboarding"],
  masked: string,
): string {
  const code = errorCode(err);
  if (code === "EMAIL_UNAVAILABLE" || code === "SMS_UNAVAILABLE") {
    return ob.errorDelivery.replace("{target}", masked);
  }
  if (code === "RATE_LIMITED") return ob.errorRateLimited;
  if (err instanceof Error && err.message) return err.message;
  return ob.errorGeneric;
}

function describeVerifyError(
  err: unknown,
  ob: ReturnType<typeof useI18n>["t"]["workspace"]["onboarding"],
): string {
  const code = errorCode(err);
  if (code === "CODE_EXPIRED") return ob.errorExpired;
  if (code === "TOO_MANY_ATTEMPTS") return ob.errorTooManyAttempts;
  if (code === "RATE_LIMITED") return ob.errorRateLimited;
  if (code === "INVALID_CODE") return ob.errorInvalid;
  if (err instanceof Error && err.message) return err.message;
  return ob.errorGeneric;
}
