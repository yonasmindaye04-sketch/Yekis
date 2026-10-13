import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Compass, X } from "lucide-react";
import "./OnboardingTour.css";

/**
 * A first-run tour for people who have just created an account.
 *
 * Why this is data-driven rather than a screenshot tour: the "Next step" card on
 * the overview was hardcoded. It always showed step 1 and the same text per
 * role, so a fully verified, funded freelancer was still told to add funds to
 * their wallet. Here every step carries its own completion predicate, so the
 * tour and the checklist below it are computed from the same function and cannot
 * disagree with each other or with reality.
 *
 * Progress is stored locally. There is no server-side onboarding record, so a
 * user who clears site data sees the tour again -- deliberate, because this is
 * help, not a gate.
 */

export type TourStepId =
  | "verify"
  | "wallet"
  | "profile"
  | "jobs"
  | "first-action"
  | "escrow";

export type UserRole = "CLIENT" | "FREELANCER" | "BOTH";

export interface TourFacts {
  role: UserRole;
  kycStatus: string;
  walletBalanceMinor: number;
  /**
   * True once the user has a milestone that is funded or beyond. Derived from
   * the milestones this screen already loads.
   */
  hasFundedMilestone: boolean;
  /**
   * Optional signals. A screen that cannot answer these simply leaves them out
   * and the matching steps are hidden -- a step that can never be completed is
   * worse than no step at all, so nothing is ever hardcoded to false.
   */
  hasProfile?: boolean;
  hasPostedJob?: boolean;
  hasSubmittedProposal?: boolean;
}

interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** Which nav tab this step is about, so the tour can point somewhere real. */
  target: string;
  /**
   * True when there is genuinely nothing left to do on this step.
   * `unknown` means the host screen cannot answer, and the step is hidden.
   */
  done: (f: TourFacts) => boolean | undefined;
}

const COMMON_STEPS: TourStep[] = [
  {
    id: "verify",
    title: "Verify your identity",
    body: "Upload your Fayda ID once. Verification is what unlocks proposals, posting jobs and taking money out of your wallet, so it is the first thing to get out of the way.",
    target: "verification",
    done: (f) => f.kycStatus === "VERIFIED",
  },
  {
    id: "wallet",
    title: "Add money to your wallet",
    body: "Your wallet is what funds escrow and receives payouts. You can pay by Telebirr checkout or upload a transfer receipt, and support checks it by hand.",
    target: "wallet",
    done: (f) => f.walletBalanceMinor > 0,
  },
];

const CLIENT_STEPS: TourStep[] = [
  {
    id: "jobs",
    title: "Post your first job",
    body: "Describe what you need, set a budget in ETB and a deadline. Freelancers can only bid on jobs they can see, so an empty marketplace means no bids.",
    target: "jobs",
    done: (f) => f.hasPostedJob,
  },
];

const FREELANCER_STEPS: TourStep[] = [
  {
    id: "first-action",
    title: "Send your first proposal",
    body: "Browse open jobs and send a proposal with what you would do, your price and how long it takes. Shortlist and chat open up once a proposal is in.",
    target: "jobs",
    done: (f) => f.hasSubmittedProposal,
  },
  {
    id: "escrow",
    title: "How escrow protects you",
    body: "When a client accepts your proposal they fund the milestone from their wallet before work starts. The money is held by Yekis, not by the client, and it is released when they accept your delivery. You are not chasing invoices.",
    target: "contracts",
    done: (f) => f.hasFundedMilestone,
  },
];

const PROFILE_STEP: TourStep = {
  id: "profile",
  title: "Fill in your profile",
  body: "A photo, a short bio and your skills are what clients look at before they send you a job. An empty profile gets passed over.",
  target: "profile-edit",
  done: (f) => f.hasProfile,
};

/** Drops any step whose completion the host screen cannot determine. */
function answerable(steps: TourStep[], facts: TourFacts): TourStep[] {
  return steps.filter((s) => s.done(facts) !== undefined);
}

/** The steps for this user, in order. Deduped because both role lists can name the same target. */
export function stepsForRole(role: UserRole, facts?: TourFacts): TourStep[] {
  const steps =
    role === "CLIENT"
      ? [...COMMON_STEPS, ...CLIENT_STEPS]
      : role === "FREELANCER"
        ? [...COMMON_STEPS, ...FREELANCER_STEPS]
        : [...COMMON_STEPS, ...CLIENT_STEPS, ...FREELANCER_STEPS, PROFILE_STEP];

  const deduped: TourStep[] = [];
  const seen = new Set<string>();
  for (const s of steps) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    deduped.push(s);
  }

  return facts ? answerable(deduped, facts) : deduped;
}

/** The first step this user has not finished, or null when they are complete. */
export function nextStepFor(facts: TourFacts): TourStep | null {
  return stepsForRole(facts.role, facts).find((s) => !s.done(facts)) ?? null;
}

const STORAGE_KEY = "yekis_onboarding_v1";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY}_done`) === "1";
  } catch {
    // Private browsing / storage disabled: show the tour rather than hide help.
    return false;
  }
}

function markDone() {
  try {
    localStorage.setItem(`${STORAGE_KEY}_done`, "1");
  } catch {
    // Nothing to do; the tour simply reappears next time.
  }
}

export interface OnboardingTourProps {
  facts: TourFacts;
  /** Navigate to a nav tab, e.g. "wallet". */
  onNavigate: (tab: string) => void;
  /** Rendered when the user wants the tour gone for good. */
  onDismiss?: () => void;
}

export function OnboardingTour({ facts, onNavigate, onDismiss }: OnboardingTourProps) {
  const steps = useMemo(() => stepsForRole(facts.role, facts), [facts]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const isDone = useCallback((s: TourStep) => s.done(facts) === true, [facts]);
  const remaining = steps.filter((s) => !isDone(s));
  const next = remaining[0] ?? null;
  const completedCount = steps.length - remaining.length;
  const allDone = remaining.length === 0;

  // Open once, a moment after landing, so it does not collide with the page
  // settling. Never re-opens on its own after that.
  useEffect(() => {
    if (readDismissed() || allDone) return;
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [allDone]);

  const close = useCallback(() => {
    setOpen(false);
    markDone();
    onDismiss?.();
  }, [onDismiss]);

  const goTo = useCallback(
    (target: string) => {
      setOpen(false);
      onNavigate(target);
    },
    [onNavigate],
  );

  if (allDone && !open) return null;

  // Collapsed state: the persistent "what next" reminder.
  if (!open) {
    return (
      <div className="onk-collapsed" role="status">
        <div className="onk-collapsed-text">
          <strong>
            {next ? next.title : "Setup complete"}
          </strong>
          <span>
            {next
              ? `Step ${completedCount + 1} of ${steps.length}`
              : "Everything is set up."}
          </span>
        </div>
        <button
          type="button"
          className="onk-btn onk-btn-primary"
          onClick={() => (next ? goTo(next.target) : setOpen(true))}
        >
          {next ? "Continue setup" : "Review steps"}
          <ArrowRight size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="onk-btn onk-btn-ghost"
          onClick={close}
          aria-label="Dismiss the setup guide"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
    );
  }

  const step = steps[Math.min(index, steps.length - 1)];

  return (
    <div className="onk-overlay" role="dialog" aria-modal="false" aria-label="Setup guide">
      <div className="onk-card">
        <div className="onk-head">
          <Compass size={18} aria-hidden />
          <span className="onk-progress">
            Step {index + 1} of {steps.length}
          </span>
          <button
            type="button"
            className="onk-btn onk-btn-ghost onk-close"
            onClick={close}
            aria-label="Close the setup guide"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="onk-dots" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={
                i === index
                  ? "onk-dot onk-dot-active"
                  : isDone(s)
                    ? "onk-dot onk-dot-done"
                    : "onk-dot"
              }
            />
          ))}
        </div>

        <h3 className="onk-title">{step.title}</h3>
        <p className="onk-body">{step.body}</p>

        <div className="onk-actions">
          <button
            type="button"
            className="onk-btn onk-btn-primary"
            onClick={() => goTo(step.target)}
          >
            Go there
            <ArrowRight size={15} aria-hidden />
          </button>
          {index < steps.length - 1 && (
            <button
              type="button"
              className="onk-btn onk-btn-ghost"
              onClick={() => setIndex((i) => i + 1)}
            >
              Next
            </button>
          )}
          {index > 0 && (
            <button
              type="button"
              className="onk-btn onk-btn-ghost"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
          )}
        </div>

        <ul className="onk-checklist">
          {steps.map((s, i) => (
            <li key={s.id} className={i === index ? "onk-li onk-li-current" : "onk-li"}>
              <span className="onk-li-mark" aria-hidden>
                {isDone(s) ? <Check size={13} /> : null}
              </span>
              <button
                type="button"
                className="onk-li-label"
                onClick={() => {
                  setIndex(i);
                  if (isDone(s)) goTo(s.target);
                }}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}