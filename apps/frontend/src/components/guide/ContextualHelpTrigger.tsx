import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, HelpCircle, X } from "lucide-react";
import { useOptionalGuide } from "./GuideContext";
import { CONTEXTUAL_HELP_ITEMS } from "./guideConfig";
import { computeOverlayPosition, type PositionedBox } from "./guideStorage";
import type { ContextualHelpItem } from "./guideTypes";

interface ContextualHelpTriggerProps {
  /** Key in CONTEXTUAL_HELP_ITEMS. */
  helpId: string;
  /** Optional inline override if rendering outside the registry. */
  item?: ContextualHelpItem;
  className?: string;
}

export function ContextualHelpTrigger({
  helpId,
  item,
  className = "",
}: ContextualHelpTriggerProps) {
  const guide = useOptionalGuide();
  const resolved = item ?? guide?.getContextualHelp(helpId) ?? CONTEXTUAL_HELP_ITEMS[helpId];

  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = Boolean(guide);
  const open = isControlled
    ? guide!.activeContextualHelpId === helpId
    : localOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (guide) {
        guide.setActiveContextualHelpId(next ? helpId : null);
      } else {
        setLocalOpen(next);
      }
    },
    [guide, helpId],
  );

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();
  const titleId = useId();

  const [pos, setPos] = useState<PositionedBox>({
    top: 12,
    left: 12,
    placement: "bottom",
    maxWidth: 320,
  });

  const updatePosition = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const anchorRect = triggerRef.current.getBoundingClientRect();
    const popRect = popoverRef.current?.getBoundingClientRect();
    const next = computeOverlayPosition({
      anchorRect,
      overlaySize: {
        width: popRect?.width && popRect.width > 0 ? popRect.width : 310,
        height: popRect?.height && popRect.height > 0 ? popRect.height : 210,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      preferredPlacement: "bottom",
      offset: 8,
      padding: 12,
      isMobileSheetFallback: false,
    });
    setPos(next);
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onViewportChange = () => updatePosition();

    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, setOpen]);

  if (!resolved) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`yk-help-trigger ${className}`.trim()}
        aria-label={`Help: ${resolved.featureName}`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
          }
        }}
      >
        <HelpCircle size={14} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-labelledby={titleId}
          className="yk-help-popover"
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            maxWidth: `${pos.maxWidth}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="yk-help-popover-head">
            <h4 id={titleId} className="yk-help-popover-title">
              {resolved.featureName}
            </h4>
            <button
              type="button"
              className="yk-help-popover-close"
              aria-label={`Close ${resolved.featureName} help`}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="yk-help-popover-block">
            <span className="yk-help-popover-label">What it does</span>
            <p className="yk-help-popover-text">{resolved.whatItDoes}</p>
          </div>

          <div className="yk-help-popover-block">
            <span className="yk-help-popover-label">Why it is useful</span>
            <p className="yk-help-popover-text">{resolved.whyItIsUseful}</p>
          </div>

          {resolved.docTopicId && guide && (
            <div className="yk-help-popover-foot">
              <button
                type="button"
                className="yk-help-doc-link"
                onClick={() => {
                  setOpen(false);
                  guide.openDocs(resolved.docTopicId);
                }}
              >
                <span>View detailed guide</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
