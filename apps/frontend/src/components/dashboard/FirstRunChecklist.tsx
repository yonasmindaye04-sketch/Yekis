import { useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  ShieldCheck,
  ArrowRight,
  Compass,
  Info,
  X,
} from "lucide-react";
import { useI18n } from "../../i18n";
import { DASHBOARD_EXTRAS_COPY } from "./dashboardExtrasCopy";

export interface FirstRunChecklistProps {
  kycVerified: boolean;
  kycStatus?: string;
  hasBriefs: boolean;
  hasFundsOrPending: boolean;
  hasPendingTopUpOnly: boolean;
  pendingTopUpEtb: number;
  hasProposals: boolean;
  hasFundedMilestone: boolean;
  onNavigateView: (view: string) => void;
  onOpenEscrow: () => void;
  onHideChecklist: () => void;
}

interface ChecklistStep {
  id: string;
  order: number;
  title: string;
  hint: string;
  done: boolean;
  pending?: boolean;
  pendingLabel?: string;
  locked: boolean;
  unlockLabel?: string;
  onUnlock?: () => void;
  actionLabel: string;
  onAction: () => void;
}

export function FirstRunChecklist({
  kycVerified,
  kycStatus,
  hasBriefs,
  hasFundsOrPending,
  hasPendingTopUpOnly,
  pendingTopUpEtb,
  hasProposals,
  hasFundedMilestone,
  onNavigateView,
  onOpenEscrow,
  onHideChecklist,
}: FirstRunChecklistProps) {
  const { language } = useI18n();
  const extra = DASHBOARD_EXTRAS_COPY[language] ?? DASHBOARD_EXTRAS_COPY.en;
  const copy = extra.firstRun;
  const s = copy.steps;

  const [escrowModalOpen, setEscrowModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (escrowModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!escrowModalOpen && dialog.open) {
      dialog.close();
    }
  }, [escrowModalOpen]);

  const kycUnderReview = !kycVerified && kycStatus === "UNDER_REVIEW";
  const kycHint = kycVerified
    ? s.kycVerifiedHint
    : kycUnderReview
      ? s.kycReviewHint
      : kycStatus === "REJECTED"
        ? s.kycRejectedHint
        : s.kycDefaultHint;

  // Step 3 is never marked Done while only an unapproved pending top-up exists.
  const fundsConfirmed = hasFundsOrPending && !hasPendingTopUpOnly;

  const steps: ChecklistStep[] = [
    {
      id: "kyc",
      order: 1,
      title: s.kycTitle,
      hint: kycHint,
      done: kycVerified,
      pending: kycUnderReview,
      pendingLabel: kycUnderReview ? extra.underReviewBadge : undefined,
      locked: false,
      actionLabel: kycUnderReview ? s.kycActionStatus : s.kycActionVerify,
      onAction: () => onNavigateView("verification"),
    },
    {
      id: "brief",
      order: 2,
      title: s.briefTitle,
      hint: kycVerified ? s.briefReadyHint : s.briefLockedHint,
      done: hasBriefs,
      locked: !kycVerified,
      unlockLabel: !kycVerified ? s.briefUnlockLink : undefined,
      onUnlock: !kycVerified ? () => onNavigateView("verification") : undefined,
      actionLabel: s.briefAction,
      onAction: () => onNavigateView("jobs"),
    },
    {
      id: "funds",
      order: 3,
      title: s.fundsTitle,
      hint: hasPendingTopUpOnly
        ? s.fundsPendingHint(pendingTopUpEtb.toLocaleString())
        : s.fundsDefaultHint,
      done: fundsConfirmed,
      pending: hasPendingTopUpOnly,
      pendingLabel: hasPendingTopUpOnly ? extra.waitingApprovalBadge : undefined,
      locked: false,
      actionLabel: s.fundsAction,
      onAction: () => onNavigateView("wallet"),
    },
    {
      id: "proposals",
      order: 4,
      title: s.proposalsTitle,
      hint: s.proposalsHint,
      done: hasProposals,
      locked: false,
      actionLabel: s.proposalsAction,
      onAction: () => onNavigateView("proposals"),
    },
    {
      id: "fund-milestone",
      order: 5,
      title: s.fundMilestoneTitle,
      hint: s.fundMilestoneHint,
      done: hasFundedMilestone,
      locked: false,
      actionLabel: s.fundMilestoneAction,
      onAction: onOpenEscrow,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;

  return (
    <section className="sh-card sh-first-run-card" aria-label={copy.ariaLabel}>
      <div className="sh-first-run-head">
        <div>
          <div className="sh-first-run-eyebrow">
            <Compass size={15} aria-hidden="true" />
            <span>{copy.progressLabel(completedCount, steps.length)}</span>
          </div>
          <h3 className="sh-card-title" style={{ marginTop: 4 }}>
            {copy.heading}
          </h3>
          <p className="sh-card-desc">{copy.subtitle}</p>
        </div>

        <div className="sh-first-run-links">
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => setEscrowModalOpen(true)}
          >
            <Info size={14} aria-hidden="true" /> {copy.howEscrowBtn}
          </button>
          <button
            type="button"
            className="sh-text-action"
            onClick={() => onNavigateView("gigs")}
          >
            {extra.browseGigsBtn} <ArrowRight size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sh-row-action-btn"
            onClick={onHideChecklist}
          >
            {copy.hideGuideBtn}
          </button>
        </div>
      </div>

      <ol className="sh-first-run-steps">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`sh-first-run-step ${step.done ? "is-done" : ""} ${step.pending ? "is-pending" : ""} ${step.locked ? "is-locked" : ""}`}
          >
            <div className="sh-first-run-step-icon" aria-hidden="true">
              {step.done ? (
                <CheckCircle2 size={18} />
              ) : step.pending ? (
                <Clock size={17} />
              ) : step.locked ? (
                <Lock size={16} />
              ) : (
                <Circle size={17} />
              )}
            </div>
            <div className="sh-first-run-step-body">
              <div className="sh-first-run-step-title">
                <span className="sh-first-run-step-num sh-tabular">{step.order}.</span>{" "}
                <span>{step.title}</span>
                {step.done && (
                  <span className="sh-first-run-done-label">
                    <CheckCircle2 size={13} aria-hidden="true" /> {copy.doneLabel}
                  </span>
                )}
                {!step.done && step.pending && step.pendingLabel && (
                  <span className="sh-first-run-pending-label">
                    <Clock size={13} aria-hidden="true" /> {step.pendingLabel}
                  </span>
                )}
              </div>
              <p className="sh-first-run-step-hint">
                {step.hint}
              </p>
              {step.locked && step.unlockLabel && step.onUnlock && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="sh-btn sh-btn-secondary sh-unlock-btn"
                    onClick={step.onUnlock}
                  >
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>{step.unlockLabel}</span>
                  </button>
                </div>
              )}
            </div>
            {!step.done && (
              <button
                type="button"
                className={step.locked ? "sh-btn sh-btn-secondary" : "sh-row-action-btn"}
                disabled={step.locked}
                onClick={step.onAction}
              >
                {step.actionLabel} <ArrowRight size={12} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ol>

      <dialog
        ref={dialogRef}
        className="sh-confirm-dialog"
        aria-labelledby={dialogTitleId}
        onCancel={(e) => {
          e.preventDefault();
          setEscrowModalOpen(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) setEscrowModalOpen(false);
        }}
      >
        <div className="sh-dialog-surface">
          <div className="sh-card-header" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} style={{ color: "var(--color-primary-text-link, var(--color-primary))" }} aria-hidden="true" />
              <h3 id={dialogTitleId} className="sh-card-title">
                {copy.escrowDialogTitle}
              </h3>
            </div>
            <button
              type="button"
              className="sh-icon-only-btn"
              aria-label={copy.closeAria}
              onClick={() => setEscrowModalOpen(false)}
            >
              <X size={15} />
            </button>
          </div>
          <div style={{ display: "grid", gap: 10, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            <p style={{ margin: 0 }}>
              <strong>{copy.escrowBullet1Title}</strong> {copy.escrowBullet1Body}
            </p>
            <p style={{ margin: 0 }}>
              <strong>{copy.escrowBullet2Title}</strong> {copy.escrowBullet2Body}
            </p>
            <p style={{ margin: 0 }}>
              <strong>{copy.escrowBullet3Title}</strong> {copy.escrowBullet3Body}
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => setEscrowModalOpen(false)}
            >
              {copy.gotItBtn}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
