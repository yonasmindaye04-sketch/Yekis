import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Handshake,
  Landmark,
  Lock,
  Sparkles,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";
import "./OnboardingTour.css";

export type TourRole = "CLIENT" | "FREELANCER" | "BOTH";
export type WalkthroughFlowRole = "CLIENT" | "FREELANCER";

export type TourTab =
  | "overview"
  | "verification"
  | "jobs"
  | "gigs"
  | "contracts"
  | "wallet"
  | "cases"
  | "profile";

export interface TourFacts {
  userId?: string;
  role: TourRole;
  activeMode?: TourRole;
  kycStatus?: string;
  walletBalanceMinor?: number;
  hasFundedMilestone?: boolean;
  hasPostedJob?: boolean;
  hasSubmittedProposal?: boolean;
  hasProfile?: boolean;
}

interface StepDef {
  id: string;
  title: string;
  why: string;
  cta: string;
  tab: TourTab;
  roles: TourRole[];
  done: (f: TourFacts) => boolean | undefined;
}

const STEPS: StepDef[] = [
  {
    id: "verify-identity",
    title: "Verify your identity",
    why: "Clients and freelancers who verify with Fayda ID or a national ID can sign contracts and move money.",
    cta: "Verify now",
    tab: "verification",
    roles: ["CLIENT", "FREELANCER", "BOTH"],
    done: (f) => f.kycStatus === "VERIFIED",
  },
  {
    id: "complete-profile",
    title: "Add your skills and bio",
    why: "A complete profile is the first thing clients look at before reading a proposal.",
    cta: "Edit profile",
    tab: "profile",
    roles: ["FREELANCER", "BOTH"],
    done: (f) => f.hasProfile,
  },
  {
    id: "browse-and-propose",
    title: "Send your first proposal",
    why: "Pick an open job, break the work into milestones, and tell the client how you will deliver.",
    cta: "Browse jobs",
    tab: "jobs",
    roles: ["FREELANCER", "BOTH"],
    done: (f) => f.hasSubmittedProposal,
  },
  {
    id: "post-first-job",
    title: "Post your first job",
    why: "Describe what you need and your budget in ETB. Verified freelancers will send milestone proposals.",
    cta: "Post a job",
    tab: "jobs",
    roles: ["CLIENT", "BOTH"],
    done: (f) => f.hasPostedJob,
  },
  {
    id: "fund-escrow",
    title: "Top up or fund escrow",
    why: "Money stays safe in escrow until you approve the delivered work — via Telebirr, CBE Birr, or bank receipt.",
    cta: "Open wallet",
    tab: "wallet",
    roles: ["CLIENT", "BOTH"],
    done: (f) => (f.walletBalanceMinor ?? 0) > 0 || Boolean(f.hasFundedMilestone),
  },
];

const DISMISS_KEY_PREFIX = "yekis-onboarding-dismissed:";
const COLLAPSE_KEY_PREFIX = "yekis-onboarding-collapsed:";
const WALKTHROUGH_KEY_PREFIX = "yekis_onboarding_v1";
const REPLAY_EVENT = "yekis:replay-onboarding";

function keyFor(prefix: string, userId?: string): string {
  return `${prefix}${userId || "anon"}`;
}

export function walkthroughStorageKey(userId: string | undefined, flowRole: WalkthroughFlowRole): string {
  return `${WALKTHROUGH_KEY_PREFIX}:${userId || "anon"}:${flowRole}`;
}

export interface WalkthroughStateRecord {
  status: "completed" | "skipped";
  version: 1;
  updatedAt: string;
}

export function getWalkthroughSeen(userId: string | undefined, flowRole: WalkthroughFlowRole): boolean {
  try {
    const raw = localStorage.getItem(walkthroughStorageKey(userId, flowRole));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<WalkthroughStateRecord>;
    return parsed.version === 1 && (parsed.status === "completed" || parsed.status === "skipped");
  } catch {
    return false;
  }
}

export function setWalkthroughSeen(
  userId: string | undefined,
  flowRole: WalkthroughFlowRole,
  status: "completed" | "skipped",
): void {
  try {
    const record: WalkthroughStateRecord = {
      status,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(walkthroughStorageKey(userId, flowRole), JSON.stringify(record));
  } catch {
    // storage disabled
  }
}

export function resetOnboardingTour(userId?: string): void {
  try {
    localStorage.removeItem(keyFor(DISMISS_KEY_PREFIX, userId));
    localStorage.removeItem(keyFor(COLLAPSE_KEY_PREFIX, userId));
    localStorage.removeItem(walkthroughStorageKey(userId, "FREELANCER"));
    localStorage.removeItem(walkthroughStorageKey(userId, "CLIENT"));
  } catch {
    // storage disabled
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
  }
}

export function triggerOnboardingWalkthrough(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
  }
}

export interface OnboardingTourProps {
  facts: TourFacts;
  onNavigate: (tab: TourTab) => void;
}

interface CardItem {
  id: string;
  headline: string;
  body: string;
  learnMoreLabel: string;
  learnMoreDetail: string;
  badge: string;
  icon: "welcome" | "trust" | "work" | "escrow" | "payout";
}

function CardArtwork({
  icon,
  flowRole,
}: {
  icon: CardItem["icon"];
  flowRole: WalkthroughFlowRole;
}) {
  return (
    <div className={`yk-wt-art yk-wt-art-${icon}`} aria-hidden="true">
      <div className="yk-wt-art-glow" />
      <div className="yk-wt-art-main">
        {icon === "welcome" && <Handshake size={32} strokeWidth={1.8} />}
        {icon === "trust" &&
          (flowRole === "FREELANCER" ? (
            <BadgeCheck size={32} strokeWidth={1.8} />
          ) : (
            <Briefcase size={32} strokeWidth={1.8} />
          ))}
        {icon === "work" &&
          (flowRole === "FREELANCER" ? (
            <Sparkles size={32} strokeWidth={1.8} />
          ) : (
            <FileCheck2 size={32} strokeWidth={1.8} />
          ))}
        {icon === "escrow" && <Lock size={32} strokeWidth={1.8} />}
        {icon === "payout" &&
          (flowRole === "FREELANCER" ? (
            <Wallet size={32} strokeWidth={1.8} />
          ) : (
            <Landmark size={32} strokeWidth={1.8} />
          ))}
      </div>
      <div className="yk-wt-art-Chips">
        {icon === "welcome" && (
          <span className="yk-wt-chip">
            <BadgeCheck size={13} /> Escrow Protected · ETB
          </span>
        )}
        {icon === "trust" &&
          (flowRole === "FREELANCER" ? (
            <span className="yk-wt-chip">
              <UserCheck size={13} /> Fayda ID · 3% Withholding w/ TIN
            </span>
          ) : (
            <span className="yk-wt-chip">
              <Sparkles size={13} /> 0 ETB Posting Fee · Verified Talent
            </span>
          ))}
        {icon === "work" &&
          (flowRole === "FREELANCER" ? (
            <span className="yk-wt-chip">
              <Briefcase size={13} /> Milestone Bids &amp; Fixed-Price Gigs
            </span>
          ) : (
            <span className="yk-wt-chip">
              <FileCheck2 size={13} /> 24h Cooling-Off Window
            </span>
          ))}
        {icon === "escrow" &&
          (flowRole === "FREELANCER" ? (
            <span className="yk-wt-chip">
              <Lock size={13} /> 10% Service Fee · 7-Day Auto-Release
            </span>
          ) : (
            <span className="yk-wt-chip">
              <Lock size={13} /> 0% Client Fee · Telebirr / CBE / M-Pesa
            </span>
          ))}
        {icon === "payout" && (
          <span className="yk-wt-chip">
            <Wallet size={13} /> Instant Wallet &amp; 3-Stage Mediation
          </span>
        )}
      </div>
    </div>
  );
}

export function OnboardingTour({ facts, onNavigate }: OnboardingTourProps) {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();

  const defaultFlowRole: WalkthroughFlowRole = useMemo(() => {
    const mode = facts.activeMode || facts.role;
    return mode === "FREELANCER" ? "FREELANCER" : "CLIENT";
  }, [facts.activeMode, facts.role]);

  const [flowRole, setFlowRole] = useState<WalkthroughFlowRole>(defaultFlowRole);
  const [modalOpen, setModalOpen] = useState<boolean>(() => !getWalkthroughSeen(facts.userId, defaultFlowRole));
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [expandedDetail, setExpandedDetail] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Sync flowRole if activeMode changes and modal hasn't been seen for that role
  useEffect(() => {
    setFlowRole(defaultFlowRole);
  }, [defaultFlowRole]);

  // Listen for replay event from Settings or Topbar button
  useEffect(() => {
    const handleReplay = () => {
      setDismissed(false);
      setCollapsed(false);
      setStepIdx(0);
      setExpandedDetail(false);
      setModalOpen(true);
    };
    window.addEventListener(REPLAY_EVENT, handleReplay);
    return () => window.removeEventListener(REPLAY_EVENT, handleReplay);
  }, []);

  const cards: CardItem[] = useMemo(() => {
    const copy = flowRole === "FREELANCER" ? t.onboarding.freelancer : t.onboarding.client;
    return [
      {
        id: "c1",
        headline: copy.c1Headline,
        body: copy.c1Body,
        learnMoreLabel: copy.c1LearnMore,
        learnMoreDetail: copy.c1Detail,
        badge: "01 / 05",
        icon: "welcome",
      },
      {
        id: "c2",
        headline: copy.c2Headline,
        body: copy.c2Body,
        learnMoreLabel: copy.c2LearnMore,
        learnMoreDetail: copy.c2Detail,
        badge: "02 / 05",
        icon: "trust",
      },
      {
        id: "c3",
        headline: copy.c3Headline,
        body: copy.c3Body,
        learnMoreLabel: copy.c3LearnMore,
        learnMoreDetail: copy.c3Detail,
        badge: "03 / 05",
        icon: "work",
      },
      {
        id: "c4",
        headline: copy.c4Headline,
        body: copy.c4Body,
        learnMoreLabel: copy.c4LearnMore,
        learnMoreDetail: copy.c4Detail,
        badge: "04 / 05",
        icon: "escrow",
      },
      {
        id: "c5",
        headline: copy.c5Headline,
        body: copy.c5Body,
        learnMoreLabel: copy.c5LearnMore,
        learnMoreDetail: copy.c5Detail,
        badge: "05 / 05",
        icon: "payout",
      },
    ];
  }, [flowRole, t]);

  const currentCard = cards[stepIdx] ?? cards[0];
  const isLastCard = stepIdx === cards.length - 1;

  const handleSkip = () => {
    setWalkthroughSeen(facts.userId, flowRole, "skipped");
    setModalOpen(false);
  };

  const handleCompletePrimary = () => {
    setWalkthroughSeen(facts.userId, flowRole, "completed");
    setModalOpen(false);
    onNavigate(flowRole === "FREELANCER" ? "profile" : "jobs");
  };

  const handleCompleteSecondary = () => {
    setWalkthroughSeen(facts.userId, flowRole, "completed");
    setModalOpen(false);
    onNavigate(flowRole === "FREELANCER" ? "jobs" : "gigs");
  };

  const goNext = () => {
    if (stepIdx < cards.length - 1) {
      setDirection(1);
      setExpandedDetail(false);
      setStepIdx((i) => i + 1);
    }
  };

  const goBack = () => {
    if (stepIdx > 0) {
      setDirection(-1);
      setExpandedDetail(false);
      setStepIdx((i) => i - 1);
    }
  };

  // Keyboard navigation + focus trap inside modal
  useEffect(() => {
    if (!modalOpen) return;
    const node = modalRef.current;
    const focusables = node?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (stepIdx < cards.length - 1) goNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (stepIdx > 0) goBack();
        return;
      }
      if (e.key === "Tab" && node) {
        const list = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, stepIdx, cards.length, flowRole]);

  // Checklist bar state
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(keyFor(DISMISS_KEY_PREFIX, facts.userId)) === "1";
    } catch {
      return false;
    }
  });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(keyFor(COLLAPSE_KEY_PREFIX, facts.userId)) === "1";
    } catch {
      return false;
    }
  });

  const steps = useMemo(
    () =>
      STEPS.filter(
        (s) => s.roles.includes(facts.role) && s.done(facts) !== undefined,
      ),
    [facts],
  );

  const completed = steps.filter((s) => s.done(facts) === true).length;
  const total = steps.length;
  const allDone = total > 0 && completed === total;
  const nextStep = steps.find((s) => !s.done(facts));

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(keyFor(DISMISS_KEY_PREFIX, facts.userId), "1");
    } catch {
      // storage disabled
    }
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(keyFor(COLLAPSE_KEY_PREFIX, facts.userId), next ? "1" : "0");
    } catch {
      // storage disabled
    }
  };

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const stepAnnouncement = t.onboarding.stepLabel
    .replace("{current}", String(stepIdx + 1))
    .replace("{total}", String(cards.length));

  const copyForRole = flowRole === "FREELANCER" ? t.onboarding.freelancer : t.onboarding.client;

  return (
    <>
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="yk-wt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={handleSkip}
          >
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descId}
              className="yk-wt-modal"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
                touchStartX.current = null;
                if (deltaX < -50 && stepIdx < cards.length - 1) {
                  goNext();
                } else if (deltaX > 50 && stepIdx > 0) {
                  goBack();
                }
              }}
            >
              {/* Screen-reader live region */}
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {stepAnnouncement}: {currentCard.headline}
              </div>

              {/* Top Header Bar */}
              <div className="yk-wt-header">
                <div className="yk-wt-header-left">
                  <span className="yk-wt-step-pill">{stepAnnouncement}</span>
                  {facts.role === "BOTH" && (
                    <div className="yk-wt-role-switch" role="tablist" aria-label="Select onboarding role guide">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={flowRole === "FREELANCER"}
                        className={flowRole === "FREELANCER" ? "active" : ""}
                        onClick={() => {
                          setFlowRole("FREELANCER");
                          setStepIdx(0);
                          setExpandedDetail(false);
                        }}
                      >
                        {t.onboarding.freelancerRoleTab}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={flowRole === "CLIENT"}
                        className={flowRole === "CLIENT" ? "active" : ""}
                        onClick={() => {
                          setFlowRole("CLIENT");
                          setStepIdx(0);
                          setExpandedDetail(false);
                        }}
                      >
                        {t.onboarding.clientRoleTab}
                      </button>
                    </div>
                  )}
                </div>

                <div className="yk-wt-header-right">
                  <LanguageSelector variant="dropdown" />
                  <button
                    type="button"
                    className="yk-wt-skip-btn"
                    onClick={handleSkip}
                    aria-label={t.onboarding.skipBtn}
                  >
                    {t.onboarding.skipBtn} <X size={15} />
                  </button>
                </div>
              </div>

              {/* Animated Card Body */}
              <div className="yk-wt-card-stage">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={`${flowRole}-${currentCard.id}`}
                    custom={direction}
                    initial={
                      prefersReducedMotion
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: direction > 0 ? 32 : -32 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0, x: 0 }
                        : { opacity: 0, x: direction > 0 ? -32 : 32 }
                    }
                    transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
                    className="yk-wt-card-content"
                  >
                    <CardArtwork icon={currentCard.icon} flowRole={flowRole} />

                    <h2 id={titleId} className="yk-wt-headline">
                      {currentCard.headline}
                    </h2>

                    <p id={descId} className="yk-wt-body">
                      {currentCard.body}
                    </p>

                    <div className="yk-wt-learn-wrap">
                      <button
                        type="button"
                        className="yk-wt-learn-toggle"
                        aria-expanded={expandedDetail}
                        onClick={() => setExpandedDetail((v) => !v)}
                      >
                        <span>
                          {expandedDetail ? t.onboarding.closeLearnMore : currentCard.learnMoreLabel}
                        </span>
                        {expandedDetail ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      {expandedDetail && (
                        <div className="yk-wt-learn-drawer">
                          <p>{currentCard.learnMoreDetail}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress Dots & Navigation Footer */}
              <div className="yk-wt-footer">
                <div className="yk-wt-dots" role="tablist" aria-label="Onboarding steps">
                  {cards.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === stepIdx}
                      aria-label={`${t.onboarding.stepLabel
                        .replace("{current}", String(idx + 1))
                        .replace("{total}", String(cards.length))}: ${c.headline}`}
                      className={`yk-wt-dot ${idx === stepIdx ? "active" : idx < stepIdx ? "done" : ""}`}
                      onClick={() => {
                        setDirection(idx > stepIdx ? 1 : -1);
                        setExpandedDetail(false);
                        setStepIdx(idx);
                      }}
                    />
                  ))}
                </div>

                <div className="yk-wt-nav-btns">
                  {stepIdx > 0 ? (
                    <button type="button" className="yk-wt-btn-secondary" onClick={goBack}>
                      <ArrowLeft size={16} />
                      <span>{t.onboarding.backBtn}</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  {!isLastCard ? (
                    <button type="button" className="yk-wt-btn-primary" onClick={goNext}>
                      <span>{t.onboarding.nextBtn}</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="yk-wt-final-actions">
                      <button
                        type="button"
                        className="yk-wt-btn-ghost"
                        onClick={handleCompleteSecondary}
                      >
                        {copyForRole.finalSecondaryCta}
                      </button>
                      <button
                        type="button"
                        className="yk-wt-btn-primary"
                        onClick={handleCompletePrimary}
                      >
                        <span>{copyForRole.finalPrimaryCta}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact checklist bar shown when not dismissed */}
      {!dismissed && total > 0 && !allDone && (
        <section className="onboarding-tour" aria-label="Getting started guide">
          <header className="onboarding-tour__head">
            <div className="onboarding-tour__title">
              <span className="onboarding-tour__badge">
                {completed}/{total}
              </span>
              <div>
                <strong>Get started on Yekis</strong>
                <p>
                  {nextStep
                    ? `Next up: ${nextStep.title.toLowerCase()}`
                    : "Finish these quick steps to unlock the full workspace."}
                </p>
              </div>
            </div>

            <div className="onboarding-tour__bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>

            <div className="onboarding-tour__controls">
              <button
                type="button"
                className="onboarding-tour__guide-btn"
                onClick={() => {
                  setStepIdx(0);
                  setExpandedDetail(false);
                  setModalOpen(true);
                }}
              >
                {t.onboarding.openGuideBtn}
              </button>
              <button
                type="button"
                className="onboarding-tour__icon-btn"
                onClick={toggleCollapse}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Show steps" : "Hide steps"}
                title={collapsed ? "Show steps" : "Hide steps"}
              >
                {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              <button
                type="button"
                className="onboarding-tour__icon-btn"
                onClick={dismiss}
                aria-label="Dismiss getting started guide"
                title="Dismiss guide"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {!collapsed && (
            <ol className="onboarding-tour__list">
              {steps.map((step, idx) => {
                const isDone = step.done(facts) === true;
                const isNext = !isDone && step.id === nextStep?.id;
                return (
                  <li
                    key={step.id}
                    className={`onboarding-tour__step ${isDone ? "is-done" : ""} ${isNext ? "is-next" : ""}`}
                  >
                    <span className="onboarding-tour__marker" aria-hidden="true">
                      {isDone ? <Check size={14} /> : idx + 1}
                    </span>
                    <div className="onboarding-tour__body">
                      <strong>{step.title}</strong>
                      <p>{step.why}</p>
                    </div>
                    {isDone ? (
                      <span className="onboarding-tour__done-pill">Done</span>
                    ) : (
                      <button
                        type="button"
                        className={isNext ? "btn-primary" : "btn-ghost"}
                        onClick={() => onNavigate(step.tab)}
                      >
                        {step.cta} <ArrowRight size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </>
  );
}