import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useGuide } from "./GuideContext";
import { MODULE_TOURS } from "./guideConfig";
import {
  computeOverlayPosition,
  findTourTargetElement,
  type PositionedBox,
  type RectLike,
} from "./guideStorage";

const SPOTLIGHT_PAD = 6;

export function ProductTourOverlay() {
  const {
    activeTour,
    activeModule,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
  } = useGuide();

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const [targetRect, setTargetRect] = useState<RectLike | null>(null);
  const [tooltipPos, setTooltipPos] = useState<PositionedBox>({
    top: 24,
    left: 24,
    placement: "center",
    maxWidth: 360,
  });

  const currentStep = activeTour ? activeTour.steps[activeTour.stepIndex] : null;
  const totalSteps = activeTour ? activeTour.steps.length : 0;
  const isLastStep = Boolean(
    activeTour && activeTour.stepIndex >= totalSteps - 1,
  );
  const moduleConfig = activeTour
    ? MODULE_TOURS[activeTour.moduleId] ?? MODULE_TOURS.overview
    : null;

  const measureAndPosition = useCallback(() => {
    if (!activeTour || !currentStep || typeof window === "undefined") return;

    const targetEl = findTourTargetElement(currentStep.target);
    let nextAnchor: RectLike | null = null;
    if (targetEl) {
      const r = targetEl.getBoundingClientRect();
      nextAnchor = {
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    }

    setTargetRect(nextAnchor);

    const ttRect = tooltipRef.current?.getBoundingClientRect();
    const nextPos = computeOverlayPosition({
      anchorRect: nextAnchor,
      overlaySize: {
        width: ttRect?.width && ttRect.width > 0 ? ttRect.width : 352,
        height: ttRect?.height && ttRect.height > 0 ? ttRect.height : 220,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      preferredPlacement: currentStep.placement ?? "auto",
      offset: 14,
      padding: 12,
      isMobileSheetFallback: true,
    });
    setTooltipPos(nextPos);
  }, [activeTour, currentStep]);

  // Resolve target (with brief retry for module/tab transitions), scroll into view,
  // and skip missing optional targets gracefully.
  useEffect(() => {
    if (!activeTour || !currentStep) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let skipTimer: number | undefined;
    let retryTimer: number | undefined;

    const attachToElement = (el: HTMLElement) => {
      try {
        el.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
      } catch {
        // Ignore in non-browser JSDOM environments
      }
      measureAndPosition();
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => measureAndPosition());
        resizeObserver.observe(el);
      }
    };

    const tryLocate = (attempt: number) => {
      if (cancelled) return;
      const el = findTourTargetElement(currentStep.target);
      if (el) {
        attachToElement(el);
        return;
      }

      if (attempt < 3) {
        retryTimer = window.setTimeout(() => tryLocate(attempt + 1), 80);
        return;
      }

      if (currentStep.optional && totalSteps > 1 && activeTour.stepIndex < totalSteps - 1) {
        skipTimer = window.setTimeout(() => {
          if (!cancelled) nextStep();
        }, 0);
        return;
      }

      // Non-optional or final step without mounted target -> show centered card
      measureAndPosition();
    };

    tryLocate(0);

    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        const el = findTourTargetElement(currentStep.target);
        if (el) {
          measureAndPosition();
        }
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    const onViewportChange = () => measureAndPosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      cancelled = true;
      if (skipTimer !== undefined) window.clearTimeout(skipTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [
    activeTour,
    activeModule,
    currentStep,
    totalSteps,
    measureAndPosition,
    nextStep,
  ]);

  // Re-measure after tooltip renders
  useLayoutEffect(() => {
    if (!activeTour || !currentStep) return;
    measureAndPosition();
  }, [activeTour?.stepIndex, activeTour?.moduleId, measureAndPosition, activeTour, currentStep]);

  // Move keyboard focus into tooltip on step change
  useEffect(() => {
    if (!activeTour) return;
    const raf = window.requestAnimationFrame(() => {
      tooltipRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeTour?.stepIndex, activeTour?.moduleId, activeTour]);

  // Tour keyboard controls (Esc, Left, Right)
  useEffect(() => {
    if (!activeTour) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        skipTour();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isLastStep) finishTour();
        else nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeTour.stepIndex > 0) prevStep();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeTour, isLastStep, nextStep, prevStep, skipTour, finishTour]);

  if (!activeTour || !currentStep || !moduleConfig) return null;

  const progressPct = Math.round(
    ((activeTour.stepIndex + 1) / Math.max(1, totalSteps)) * 100,
  );

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const spotTop = targetRect ? Math.max(0, targetRect.top - SPOTLIGHT_PAD) : 0;
  const spotLeft = targetRect ? Math.max(0, targetRect.left - SPOTLIGHT_PAD) : 0;
  const spotBottom = targetRect
    ? Math.min(vh, targetRect.bottom + SPOTLIGHT_PAD)
    : 0;
  const spotRight = targetRect
    ? Math.min(vw, targetRect.right + SPOTLIGHT_PAD)
    : 0;
  const spotW = Math.max(0, spotRight - spotLeft);
  const spotH = Math.max(0, spotBottom - spotTop);

  return (
    <div className="yk-tour-layer" aria-live="polite">
      {/* Subtle 4-pane cutout backdrop so highlighted UI remains crisp & unblurred */}
      {targetRect && spotW > 0 && spotH > 0 ? (
        <>
          <div
            className="yk-tour-backdrop-pane"
            style={{ top: 0, left: 0, right: 0, height: `${spotTop}px` }}
            aria-hidden="true"
          />
          <div
            className="yk-tour-backdrop-pane"
            style={{
              top: `${spotTop}px`,
              left: 0,
              width: `${spotLeft}px`,
              height: `${spotH}px`,
            }}
            aria-hidden="true"
          />
          <div
            className="yk-tour-backdrop-pane"
            style={{
              top: `${spotTop}px`,
              left: `${spotRight}px`,
              right: 0,
              height: `${spotH}px`,
            }}
            aria-hidden="true"
          />
          <div
            className="yk-tour-backdrop-pane"
            style={{
              top: `${spotBottom}px`,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            aria-hidden="true"
          />
          <div
            className="yk-tour-spotlight-ring"
            style={{
              top: `${spotTop}px`,
              left: `${spotLeft}px`,
              width: `${spotW}px`,
              height: `${spotH}px`,
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="yk-tour-backdrop-full" aria-hidden="true" />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="yk-tour-tooltip"
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
          maxWidth: `${tooltipPos.maxWidth}px`,
        }}
      >
        <div className="yk-tour-head">
          <div className="yk-tour-meta">
            <span className="yk-tour-module-tag">{moduleConfig.shortLabel}</span>
            <span className="yk-tour-step-count sh-mono">
              Step {activeTour.stepIndex + 1} of {totalSteps}
            </span>
          </div>
          <button
            type="button"
            className="yk-help-popover-close"
            onClick={skipTour}
            aria-label="Close product tour"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="yk-tour-progress-track" aria-hidden="true">
          <div
            className="yk-tour-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <h3 id={titleId} className="yk-tour-title">
          {currentStep.title}
        </h3>

        <p id={descId} className="yk-tour-desc">
          {currentStep.description}
        </p>

        {currentStep.whyItMatters && (
          <p className="yk-tour-why">{currentStep.whyItMatters}</p>
        )}

        <div className="yk-tour-foot">
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={skipTour}
          >
            Skip
          </button>

          <div className="yk-tour-foot-right">
            {activeTour.stepIndex > 0 && (
              <button
                type="button"
                className="sh-btn sh-btn-secondary"
                onClick={prevStep}
              >
                <ArrowLeft size={13} aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                className="sh-btn sh-btn-primary"
                onClick={finishTour}
              >
                <Check size={13} aria-hidden="true" />
                <span>Finish</span>
              </button>
            ) : (
              <button
                type="button"
                className="sh-btn sh-btn-primary"
                onClick={nextStep}
              >
                <span>Next</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
