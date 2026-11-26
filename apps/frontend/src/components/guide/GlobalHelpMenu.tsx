import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  HelpCircle,
  Info,
  Keyboard,
  MessageSquare,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useGuide } from "./GuideContext";
import {
  HELP_DOC_TOPICS,
  KEYBOARD_SHORTCUTS,
  MODULE_TOURS,
} from "./guideConfig";
import { computeOverlayPosition, type PositionedBox } from "./guideStorage";
import { GUIDE_MODULE_IDS } from "./guideTypes";

/**
 * Helper hook that wires native `<dialog>` open/close state plus light-dismiss
 * pointer-bounds fallback for browsers lacking `<dialog closedby="any">`.
 */
function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute("open", "true");
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);

    const supportsClosedBy = "closedBy" in HTMLDialogElement.prototype;
    let pressedOutside = false;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!supportsClosedBy) pressedOutside = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!supportsClosedBy && pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    if (!supportsClosedBy) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (!supportsClosedBy) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
    };
  }, [onClose]);

  return ref;
}

export function GlobalHelpMenu() {
  const {
    activeModule,
    helpMenuOpen,
    setHelpMenuOpen,
    setExplainPageOpen,
    openDocs,
    setShortcutsOpen,
    currentTourConfig,
    startTour,
    isTourCompleted,
    showFirstVisitWelcome,
    canContactSupport,
    contactSupport,
  } = useGuide();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const [pos, setPos] = useState<PositionedBox>({
    top: 56,
    left: 12,
    placement: "bottom",
    maxWidth: 320,
  });

  const updatePos = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const anchorRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    setPos(
      computeOverlayPosition({
        anchorRect,
        overlaySize: {
          width: menuRect?.width && menuRect.width > 0 ? menuRect.width : 310,
          height: menuRect?.height && menuRect.height > 0 ? menuRect.height : 290,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        preferredPlacement: "bottom",
        offset: 8,
        padding: 12,
        isMobileSheetFallback: false,
      }),
    );
  };

  useLayoutEffect(() => {
    if (helpMenuOpen) updatePos();
  }, [helpMenuOpen]);

  useEffect(() => {
    if (!helpMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setHelpMenuOpen(false);
    };

    const onResizeOrScroll = () => updatePos();

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [helpMenuOpen, setHelpMenuOpen]);

  const currentCompleted = isTourCompleted(activeModule);

  return (
    <div className="yk-guide-header-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="sh-icon-only-btn yk-guide-header-btn"
        aria-label="Open Yekis Guide Help menu"
        aria-expanded={helpMenuOpen}
        aria-controls={helpMenuOpen ? menuId : undefined}
        title="Yekis Guide & Help (?)"
        onClick={() => setHelpMenuOpen((o) => !o)}
      >
        <HelpCircle size={17} aria-hidden="true" />
        {showFirstVisitWelcome && (
          <span className="yk-guide-header-dot" aria-hidden="true" />
        )}
      </button>

      {helpMenuOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="dialog"
          aria-label="Yekis Guide Help options"
          className="yk-guide-menu-panel"
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            maxWidth: `${pos.maxWidth}px`,
          }}
        >
          <div className="yk-guide-menu-head">
            <span className="yk-guide-menu-head-title">Yekis Guide</span>
            <span className="yk-guide-menu-head-module">
              {currentTourConfig.shortLabel}
            </span>
          </div>

          <button
            type="button"
            className="yk-guide-menu-item"
            onClick={() => startTour(activeModule, { fromBeginning: true })}
          >
            <span className="yk-guide-menu-item-icon">
              {currentCompleted ? (
                <RotateCcw size={16} aria-hidden="true" />
              ) : (
                <Compass size={16} aria-hidden="true" />
              )}
            </span>
            <span className="yk-guide-menu-item-body">
              <span className="yk-guide-menu-item-label">
                {currentCompleted ? "Restart Product Tour" : "Take a Product Tour"}
              </span>
              <span className="yk-guide-menu-item-sub">
                Walk through {currentTourConfig.shortLabel} step by step
              </span>
            </span>
            {currentCompleted && (
              <span className="yk-guide-menu-status">Done</span>
            )}
          </button>

          <button
            type="button"
            className="yk-guide-menu-item"
            onClick={() => {
              setHelpMenuOpen(false);
              setExplainPageOpen(true);
            }}
          >
            <span className="yk-guide-menu-item-icon">
              <Info size={16} aria-hidden="true" />
            </span>
            <span className="yk-guide-menu-item-body">
              <span className="yk-guide-menu-item-label">Explain This Page</span>
              <span className="yk-guide-menu-item-sub">
                Summary and key actions for {currentTourConfig.shortLabel}
              </span>
            </span>
          </button>

          <button
            type="button"
            className="yk-guide-menu-item"
            onClick={() => openDocs()}
          >
            <span className="yk-guide-menu-item-icon">
              <BookOpen size={16} aria-hidden="true" />
            </span>
            <span className="yk-guide-menu-item-body">
              <span className="yk-guide-menu-item-label">
                Browse Help Documentation
              </span>
              <span className="yk-guide-menu-item-sub">
                Guides for all 12 modules, escrow, KYC &amp; disputes
              </span>
            </span>
          </button>

          <button
            type="button"
            className="yk-guide-menu-item"
            onClick={() => {
              setHelpMenuOpen(false);
              setShortcutsOpen(true);
            }}
          >
            <span className="yk-guide-menu-item-icon">
              <Keyboard size={16} aria-hidden="true" />
            </span>
            <span className="yk-guide-menu-item-body">
              <span className="yk-guide-menu-item-label">Keyboard Shortcuts</span>
              <span className="yk-guide-menu-item-sub">
                Quick Jump (Ctrl/Cmd+K) &amp; navigation keys
              </span>
            </span>
          </button>

          {canContactSupport && (
            <>
              <hr className="yk-guide-menu-sep" />
              <button
                type="button"
                className="yk-guide-menu-item"
                onClick={contactSupport}
              >
                <span className="yk-guide-menu-item-icon">
                  <MessageSquare size={16} aria-hidden="true" />
                </span>
                <span className="yk-guide-menu-item-body">
                  <span className="yk-guide-menu-item-label">Contact Support</span>
                  <span className="yk-guide-menu-item-sub">
                    Open Yekis Support desk in Messages
                  </span>
                </span>
              </button>
            </>
          )}
        </div>
      )}

      <ExplainThisPageDialog />
      <HelpDocumentationDialog />
      <KeyboardShortcutsDialog />
    </div>
  );
}

export function FirstVisitWelcomeBar() {
  const {
    showFirstVisitWelcome,
    activeModule,
    startTour,
    dismissFirstVisitWelcome,
    setExplainPageOpen,
  } = useGuide();

  if (!showFirstVisitWelcome) return null;

  return (
    <div
      className="yk-guide-welcome-bar"
      role="region"
      aria-label="Yekis Guide onboarding prompt"
    >
      <div className="yk-guide-welcome-copy">
        <Compass size={18} className="yk-guide-welcome-icon" aria-hidden="true" />
        <div className="yk-guide-welcome-text">
          <strong>New to the Yekis workspace?</strong>
          <span>
            Take a quick interactive tour of your Dashboard, Escrow charts, and Pipeline tools anytime.
          </span>
        </div>
      </div>

      <div className="yk-guide-welcome-actions">
        <button
          type="button"
          className="sh-btn sh-btn-secondary"
          onClick={() => setExplainPageOpen(true)}
        >
          Explain This Page
        </button>
        <button
          type="button"
          className="sh-btn sh-btn-primary"
          onClick={() => startTour(activeModule, { fromBeginning: true })}
        >
          Take a Product Tour
        </button>
        <button
          type="button"
          className="sh-icon-only-btn"
          onClick={dismissFirstVisitWelcome}
          aria-label="Dismiss welcome guide"
          title="Dismiss"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ExplainThisPageDialog() {
  const {
    activeModule,
    currentTourConfig,
    explainPageOpen,
    setExplainPageOpen,
    startTour,
    openDocs,
    isTourCompleted,
  } = useGuide();

  const titleId = useId();
  const dialogRef = useNativeDialog(explainPageOpen, () =>
    setExplainPageOpen(false),
  );
  const completed = isTourCompleted(activeModule);

  return (
    <dialog
      ref={dialogRef}
      className="yk-guide-dialog is-compact"
      closedby="any"
      aria-labelledby={titleId}
    >
      <div className="yk-guide-dialog-head">
        <div>
          <p className="yk-guide-dialog-eyebrow">Explain This Page</p>
          <h1 id={titleId} className="yk-guide-dialog-title">
            {currentTourConfig.title}
          </h1>
        </div>
        <button
          type="button"
          className="sh-icon-only-btn"
          onClick={() => setExplainPageOpen(false)}
          aria-label="Close page explanation"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="yk-guide-dialog-body">
        <div className="yk-help-popover-block">
          <span className="yk-guide-docs-subhead">What this module does</span>
          <p className="yk-tour-desc">{currentTourConfig.summary}</p>
        </div>

        <div className="yk-help-popover-block">
          <span className="yk-guide-docs-subhead">When to use it</span>
          <p className="yk-tour-desc">{currentTourConfig.whenToUse}</p>
        </div>

        <div className="yk-help-popover-block">
          <span className="yk-guide-docs-subhead">Key actions here</span>
          <ul className="yk-guide-explain-list">
            {currentTourConfig.keyActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="yk-guide-dialog-foot">
        <button
          type="button"
          className="sh-btn sh-btn-secondary"
          onClick={() => {
            const doc = HELP_DOC_TOPICS.find((t) => t.module === activeModule);
            openDocs(doc?.id ?? null);
          }}
        >
          <BookOpen size={14} aria-hidden="true" />
          <span>Full Documentation</span>
        </button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => setExplainPageOpen(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-primary"
            onClick={() => startTour(activeModule, { fromBeginning: true })}
          >
            <Compass size={14} aria-hidden="true" />
            <span>{completed ? "Restart Tour" : "Start Interactive Tour"}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

function HelpDocumentationDialog() {
  const {
    docsOpen,
    closeDocs,
    activeDocTopicId,
    openDocs,
    startTour,
    navigateToModule,
    isTourCompleted,
    resetAllProgress,
    progress,
  } = useGuide();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(
    activeDocTopicId ?? HELP_DOC_TOPICS[0].id,
  );
  const titleId = useId();
  const dialogRef = useNativeDialog(docsOpen, closeDocs);

  useEffect(() => {
    if (activeDocTopicId) {
      setSelectedId(activeDocTopicId);
    }
  }, [activeDocTopicId]);

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_DOC_TOPICS;
    return HELP_DOC_TOPICS.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        topic.summary.toLowerCase().includes(q) ||
        topic.category.toLowerCase().includes(q) ||
        topic.howItWorks.some((line) => line.toLowerCase().includes(q)),
    );
  }, [query]);

  const currentTopic =
    filteredTopics.find((t) => t.id === selectedId) ??
    filteredTopics[0] ??
    HELP_DOC_TOPICS[0];

  const completedCount = GUIDE_MODULE_IDS.filter((id) =>
    isTourCompleted(id),
  ).length;

  return (
    <dialog
      ref={dialogRef}
      className="yk-guide-dialog"
      closedby="any"
      aria-labelledby={titleId}
    >
      <div className="yk-guide-dialog-head">
        <div>
          <p className="yk-guide-dialog-eyebrow">
            Yekis Guide · {completedCount} of {GUIDE_MODULE_IDS.length} Tours Completed
          </p>
          <h1 id={titleId} className="yk-guide-dialog-title">
            Help Documentation
          </h1>
        </div>
        <button
          type="button"
          className="sh-icon-only-btn"
          onClick={closeDocs}
          aria-label="Close help documentation"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="yk-guide-dialog-body">
        <div className="yk-guide-docs-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, escrow rules, Telebirr, KYC, disputes..."
            aria-label="Search help documentation"
          />
        </div>

        <div className="yk-guide-docs-grid">
          <nav className="yk-guide-docs-nav" aria-label="Help documentation topics">
            {filteredTopics.length === 0 ? (
              <p className="yk-tour-desc">No topics match &ldquo;{query}&rdquo;.</p>
            ) : (
              filteredTopics.map((topic) => {
                const tourDone = Boolean(progress.completedTours[topic.module]);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={`yk-guide-docs-nav-btn ${
                      currentTopic.id === topic.id ? "active" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(topic.id);
                      openDocs(topic.id);
                    }}
                  >
                    <strong>{MODULE_TOURS[topic.module].shortLabel}</strong>
                    <span>
                      {topic.category}
                      {tourDone ? " · Tour completed" : ""}
                    </span>
                  </button>
                );
              })
            )}
          </nav>

          {currentTopic && (
            <article className="yk-guide-docs-article">
              <div>
                <p className="yk-guide-dialog-eyebrow">{currentTopic.category}</p>
                <h2>{currentTopic.title}</h2>
                <p style={{ marginTop: 6 }}>{currentTopic.summary}</p>
              </div>

              <div>
                <h3 className="yk-guide-docs-subhead">How it works</h3>
                <ul className="yk-guide-explain-list" style={{ marginTop: 6 }}>
                  {currentTopic.howItWorks.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>

              {currentTopic.tips.length > 0 && (
                <div>
                  <h3 className="yk-guide-docs-subhead">Best practices</h3>
                  <ul className="yk-guide-explain-list" style={{ marginTop: 6 }}>
                    {currentTopic.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                <button
                  type="button"
                  className="sh-btn sh-btn-primary"
                  onClick={() => startTour(currentTopic.module, { fromBeginning: true })}
                >
                  <Compass size={14} aria-hidden="true" />
                  <span>
                    {isTourCompleted(currentTopic.module)
                      ? `Restart ${MODULE_TOURS[currentTopic.module].shortLabel} Tour`
                      : `Start ${MODULE_TOURS[currentTopic.module].shortLabel} Tour`}
                  </span>
                </button>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => {
                    closeDocs();
                    navigateToModule(currentTopic.module);
                  }}
                >
                  <span>Open {MODULE_TOURS[currentTopic.module].shortLabel}</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </article>
          )}
        </div>
      </div>

      <div className="yk-guide-dialog-foot">
        <button
          type="button"
          className="sh-btn sh-btn-secondary"
          onClick={() => void resetAllProgress()}
        >
          <RotateCcw size={13} aria-hidden="true" />
          <span>Reset Onboarding Progress</span>
        </button>
        <button
          type="button"
          className="sh-btn sh-btn-secondary"
          onClick={closeDocs}
        >
          Close
        </button>
      </div>
    </dialog>
  );
}

function KeyboardShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useGuide();
  const titleId = useId();
  const dialogRef = useNativeDialog(shortcutsOpen, () =>
    setShortcutsOpen(false),
  );

  return (
    <dialog
      ref={dialogRef}
      className="yk-guide-dialog is-compact"
      closedby="any"
      aria-labelledby={titleId}
    >
      <div className="yk-guide-dialog-head">
        <div>
          <p className="yk-guide-dialog-eyebrow">Yekis Guide</p>
          <h1 id={titleId} className="yk-guide-dialog-title">
            Keyboard Shortcuts
          </h1>
        </div>
        <button
          type="button"
          className="sh-icon-only-btn"
          onClick={() => setShortcutsOpen(false)}
          aria-label="Close keyboard shortcuts"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="yk-guide-dialog-body">
        <div className="yk-shortcut-list">
          {KEYBOARD_SHORTCUTS.map((sc) => (
            <div key={sc.id} className="yk-shortcut-row">
              <div className="yk-shortcut-desc">
                <strong>{sc.description}</strong>
                <span>{sc.scope}</span>
              </div>
              <div className="yk-shortcut-keys">
                {sc.keys.map((k) => (
                  <kbd key={k} className="sh-kbd">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="yk-guide-dialog-foot">
        <span className="yk-tour-step-count">
          Tip: Press ? outside text inputs to toggle the Help menu.
        </span>
        <button
          type="button"
          className="sh-btn sh-btn-primary"
          onClick={() => setShortcutsOpen(false)}
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}
