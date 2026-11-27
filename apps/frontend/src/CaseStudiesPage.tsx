import { useState, useMemo, useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Layers,
  X,
  Briefcase,
  Target,
  Activity,
  Award,
  Sparkles,
} from "lucide-react";
import { useI18n } from "./i18n";
import {
  CASE_STUDIES_COPY,
  DISCIPLINES_BY_LANG,
  getCaseStudies,
  type CaseCategory,
  type CaseStudyItem,
} from "./caseStudiesData";
import {
  ScrollIlluminatedHeadline,
  StickyScrollServicesStage,
  StudioBreadcrumb,
} from "./components/StudioScrollMotion";
import "./landing-v2.css";

type CaseStudiesPageProps = {
  onNavigate: (page: string) => void;
  onStart?: (mode: "login" | "register") => void;
};

/* Interactive 3D Pointer-Tracked Tilt & Magnetic Cursor Pill Surface */
function TiltVisualSurface({
  className,
  children,
  magneticLabel,
  onClick,
  ariaLabel,
}: {
  className: string;
  children: ReactNode;
  magneticLabel?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, cursorX: 0, cursorY: 0, hovered: false });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const rotateY = (relX - 0.5) * 9;
    const rotateX = (0.5 - relY) * 9;
    setTilt({
      rotateX,
      rotateY,
      glareX: relX * 100,
      glareY: relY * 100,
      cursorX: e.clientX - rect.left,
      cursorY: e.clientY - rect.top,
      hovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt((prev) => ({ ...prev, rotateX: 0, rotateY: 0, hovered: false }));
  };

  return (
    <motion.div
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
      }}
      transition={{ type: "spring", stiffness: 240, damping: 22, mass: 0.6 }}
      style={{ cursor: onClick ? "pointer" : undefined }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
      <div
        className="cs-tilt-glare"
        style={{
          background: `radial-gradient(360px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(154, 232, 92, 0.22), transparent 68%)`,
        }}
      />
      <AnimatePresence>
        {magneticLabel && tilt.hovered && (
          <motion.span
            className="cs-work-magnetic-pill"
            initial={{ opacity: 0, scale: 0.78 }}
            animate={{
              opacity: 1,
              scale: 1,
              left: Math.min(Math.max(tilt.cursorX - 64, 14), 240),
              top: Math.min(Math.max(tilt.cursorY - 18, 14), 220),
            }}
            exit={{ opacity: 0, scale: 0.78 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
          >
            <span>{magneticLabel}</span>
            <ArrowUpRight size={13} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* Sculptural 3D-inspired architectural artwork per project card with living continuous motion */
function ProjectSculpturalArt({ variant }: { variant: CaseStudyItem["artVariant"] }) {
  if (variant === "monolith") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 380" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="cs-g1" cx="65%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#6eb83b" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#2e5420" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#14260e" />
          </radialGradient>
          <linearGradient id="cs-step" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5d9c34" />
            <stop offset="100%" stopColor="#1f3b14" />
          </linearGradient>
        </defs>
        <rect width="480" height="380" fill="url(#cs-g1)" />
        {/* Stepped architectural monoliths + levitating translucent vessel */}
        <polygon className="cs-svg-float-alt" points="40,290 130,245 180,270 90,315" fill="url(#cs-step)" opacity="0.95" />
        <polygon className="cs-svg-float" points="120,255 210,210 260,235 170,280" fill="url(#cs-step)" opacity="0.88" />
        <polygon className="cs-svg-float-alt" points="200,220 290,175 340,200 250,245" fill="url(#cs-step)" opacity="0.82" />
        <g className="cs-svg-float">
          <ellipse cx="340" cy="145" rx="64" ry="28" fill="#18320e" stroke="#8ad453" strokeWidth="1.5" opacity="0.85" />
          <path d="M276,145 L276,195 A64,28 0 0,0 404,195 L404,145" fill="rgba(110,184,59,0.28)" stroke="#8ad453" strokeWidth="1.2" />
          <ellipse className="cs-svg-pulse" cx="340" cy="175" rx="58" ry="22" fill="#5ea030" opacity="0.72" />
        </g>
      </svg>
    );
  }
  if (variant === "botanical") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 420" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="cs-g2" cx="50%" cy="42%" r="68%">
            <stop offset="0%" stopColor="#5ea030" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#233d18" />
            <stop offset="100%" stopColor="#0f1d0a" />
          </radialGradient>
        </defs>
        <rect width="480" height="420" fill="url(#cs-g2)" />
        {/* Sculptural disc backdrop + cylindrical pedestal + rotating botanical ring */}
        <circle className="cs-svg-pulse" cx="240" cy="195" r="118" fill="#2c4c1e" stroke="rgba(154,224,99,0.22)" strokeWidth="1.5" />
        <circle className="cs-svg-orbit" cx="240" cy="185" r="58" fill="none" stroke="#6eb83b" strokeWidth="26" strokeDasharray="4 3" opacity="0.92" />
        <circle className="cs-svg-orbit-reverse" cx="240" cy="185" r="58" fill="none" stroke="#a3e668" strokeWidth="14" strokeDasharray="2 5" opacity="0.65" />
        <g className="cs-svg-float">
          <rect x="186" y="255" width="108" height="110" rx="8" fill="#355925" stroke="rgba(163,230,104,0.28)" />
          <ellipse cx="240" cy="255" rx="54" ry="14" fill="#4d7d36" />
        </g>
      </svg>
    );
  }
  if (variant === "acoustic") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 380" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="380" fill="#162912" />
        {[48, 78, 108, 138, 168].map((r, idx) => (
          <circle
            key={r}
            className={idx % 2 === 0 ? "cs-svg-pulse" : "cs-svg-orbit"}
            cx="240"
            cy="190"
            r={r}
            fill="none"
            stroke="#6eb83b"
            strokeWidth={idx === 1 ? "12" : "2"}
            strokeDasharray={idx === 2 ? "8 6" : undefined}
            strokeOpacity={0.85 - idx * 0.14}
          />
        ))}
        <circle className="cs-svg-float" cx="240" cy="190" r="28" fill="#74b843" />
      </svg>
    );
  }
  if (variant === "prism") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 420" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="420" fill="#12210e" />
        <polygon className="cs-svg-float-alt" points="240,68 380,300 100,300" fill="rgba(110,184,59,0.22)" stroke="#74b843" strokeWidth="2" />
        <polygon className="cs-svg-float" points="240,110 340,280 140,280" fill="rgba(110,184,59,0.34)" stroke="#a3e668" strokeWidth="1.5" />
        <circle className="cs-svg-pulse" cx="240" cy="222" r="36" fill="#5ea030" />
      </svg>
    );
  }
  if (variant === "lattice") {
    return (
      <svg className="cs-hero-art-svg" viewBox="0 0 480 380" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="380" fill="#13240f" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            className={i % 2 === 0 ? "cs-svg-float" : "cs-svg-float-alt"}
            x={75 + i * 56}
            y={240 - i * 24}
            width="36"
            height={80 + i * 24}
            rx="4"
            fill={i === 4 ? "#74b843" : "#2f5422"}
            stroke="rgba(163,230,104,0.3)"
          />
        ))}
      </svg>
    );
  }
  return (
    <svg className="cs-hero-art-svg" viewBox="0 0 480 420" preserveAspectRatio="xMidYMid slice">
      <rect width="480" height="420" fill="#101e0c" />
      <rect className="cs-svg-float-alt" x="110" y="85" width="260" height="250" rx="18" fill="#1c3415" stroke="#6eb83b" strokeWidth="2" />
      <circle className="cs-svg-orbit" cx="240" cy="210" r="68" fill="#0d190a" stroke="#8ad453" strokeWidth="3" strokeDasharray="12 6" />
      <circle className="cs-svg-pulse" cx="240" cy="210" r="26" fill="#67ad36" />
    </svg>
  );
}

const sectionRevealVariants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function CaseStudiesPage({ onNavigate, onStart }: CaseStudiesPageProps) {
  const { t, language } = useI18n();
  const copy = CASE_STUDIES_COPY[language] ?? CASE_STUDIES_COPY.en;
  const CASE_STUDIES = useMemo(() => getCaseStudies(language), [language]);
  const DISCIPLINES = useMemo(
    () => DISCIPLINES_BY_LANG[language] ?? DISCIPLINES_BY_LANG.en,
    [language],
  );
  const [activeCategory, setActiveCategory] = useState<CaseCategory>("ALL");
  const [activeDiscipline, setActiveDiscipline] = useState<Exclude<CaseCategory, "ALL">>("ENGINEERING");
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [activeSpread, setActiveSpread] = useState<"all" | "1" | "2" | "3" | "4">("all");

  const selectedStudy = useMemo(
    () => (selectedStudyId ? CASE_STUDIES.find((s) => s.id === selectedStudyId) ?? null : null),
    [selectedStudyId, CASE_STUDIES],
  );

  const worksSectionRef = useRef<HTMLElement | null>(null);
  const spread1Ref = useRef<HTMLDivElement | null>(null);
  const spread2Ref = useRef<HTMLDivElement | null>(null);
  const spread3Ref = useRef<HTMLDivElement | null>(null);
  const spread4Ref = useRef<HTMLDivElement | null>(null);

  const categories = copy.categories;

  const filteredStudies = useMemo(() => {
    if (activeCategory === "ALL") return CASE_STUDIES;
    return CASE_STUDIES.filter((item) => item.category === activeCategory);
  }, [activeCategory, CASE_STUDIES]);

  /* Lock background scroll when the Editorial Dossier modal is open */
  useEffect(() => {
    if (!selectedStudy) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStudyId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedStudy]);

  const openStudyDossier = (study: CaseStudyItem) => {
    setActiveSpread("all");
    setSelectedStudyId(study.id);
  };

  const cycleStudyDossier = (dir: -1 | 1) => {
    if (!selectedStudy) return;
    const idx = CASE_STUDIES.findIndex((s) => s.id === selectedStudy.id);
    const nextIdx = (idx + dir + CASE_STUDIES.length) % CASE_STUDIES.length;
    setActiveSpread("all");
    setSelectedStudyId(CASE_STUDIES[nextIdx].id);
  };

  const jumpToSpread = (spread: "1" | "2" | "3" | "4") => {
    setActiveSpread("all");
    window.setTimeout(() => {
      const target =
        spread === "1"
          ? spread1Ref.current
          : spread === "2"
            ? spread2Ref.current
            : spread === "3"
              ? spread3Ref.current
              : spread4Ref.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  const handleStartProject = () => {
    setSelectedStudyId(null);
    if (onStart) {
      onStart("register");
    } else {
      onNavigate("home");
    }
  };

  /* Build animated SVG polyline coordinates for Spread 2 Historical Trend Chart */
  const renderTrendChart = (study: CaseStudyItem) => {
    const w = 320;
    const h = 120;
    const padX = 24;
    const padY = 16;
    const toPoints = (arr: number[]) =>
      arr
        .map((v, idx) => {
          const x = padX + (idx / (arr.length - 1)) * (w - padX * 2);
          const y = h - padY - (v / 100) * (h - padY * 2);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.5, 1].map((tVal, i) => {
          const y = padY + tVal * (h - padY * 2);
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={w - padX}
              y2={y}
              stroke="#dcdcd4"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}
        {/* Baseline */}
        <polyline
          fill="none"
          stroke="#9ca39e"
          strokeWidth="1.75"
          strokeDasharray="4 3"
          points={toPoints(study.chartBefore)}
        />
        {/* Animated Post-Yekis Escrow Trajectory */}
        <motion.polyline
          key={study.id}
          fill="none"
          stroke="#141715"
          strokeWidth="2.4"
          points={toPoints(study.chartAfter)}
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.95, ease: "easeOut" }}
        />
        {study.chartAfter.map((v, idx) => {
          const x = padX + (idx / (study.chartAfter.length - 1)) * (w - padX * 2);
          const y = h - padY - (v / 100) * (h - padY * 2);
          return (
            <motion.circle
              key={`${study.id}-${idx}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="#f5c518"
              stroke="#141715"
              strokeWidth="1.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + idx * 0.12, type: "spring", stiffness: 320, damping: 18 }}
            />
          );
        })}
      </svg>
    );
  };

  const dossierModal = (
    <AnimatePresence>
      {selectedStudy && (
        <motion.div
          key="cs-dossier-backdrop"
          className="cs-dossier-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cs-dossier-modal-title"
          onClick={() => setSelectedStudyId(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Top Dossier Control Bar */}
          <motion.div
            className="cs-dossier-topbar"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: 4,
                  background: "#f5c518",
                  color: "#141715",
                  letterSpacing: "0.1em",
                }}
              >
                {copy.modal.dossierPrefix}{selectedStudy.index}
              </span>
              <strong id="cs-dossier-modal-title" style={{ fontSize: 14.5, color: "#ffffff" }}>
                {selectedStudy.clientShort} &middot; {selectedStudy.city}
              </strong>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
                <button
                  type="button"
                  className="cs-dossier-spread-tab"
                  onClick={() => cycleStudyDossier(-1)}
                  aria-label={copy.modal.prevAria}
                  title={copy.modal.prevAria}
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  type="button"
                  className="cs-dossier-spread-tab"
                  onClick={() => cycleStudyDossier(1)}
                  aria-label={copy.modal.nextAria}
                  title={copy.modal.nextAria}
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Spread Switcher Tabs */}
            <div className="cs-dossier-spread-tabs" role="tablist" aria-label={copy.modal.spreadTabsAria}>
              {copy.modal.tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSpread === tab.id}
                  className={`cs-dossier-spread-tab ${activeSpread === tab.id ? "is-active" : ""}`}
                  onClick={() => setActiveSpread(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudyId(null)}
              aria-label={copy.modal.closeAria}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#ffffff",
                width: 38,
                height: 38,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </motion.div>

          {/* Stacked Two-Page Book Spreads Canvas with Smooth Page-Flip / Slide Transitions */}
          <div className="cs-dossier-scroll-canvas" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="popLayout">
              {/* ── SPREAD 01: Client Mandate (p. 02) + Table of Contents & Executive Summary (p. 03) ── */}
              {(activeSpread === "all" || activeSpread === "1") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-1`}
                  className="cs-book-spread"
                  ref={spread1Ref}
                  aria-label={copy.modal.spread1Aria}
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 02 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.clientMandateTitle}</h3>
                        <span className="cs-page-num">p. 02</span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "150px 1fr",
                          gap: 20,
                          marginTop: 22,
                          alignItems: "start",
                        }}
                      >
                        {/* Portrait / Monogram Card with Gold Badge matching Image 1 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          <div
                            style={{
                              position: "relative",
                              background: "#e4e5e0",
                              height: 156,
                              display: "grid",
                              placeItems: "center",
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "#f5c518",
                              }}
                            />
                            <div
                              style={{
                                width: 68,
                                height: 68,
                                borderRadius: "50%",
                                background: "#141715",
                                color: "#f5c518",
                                display: "grid",
                                placeItems: "center",
                                fontFamily: "var(--v2-font-head)",
                                fontWeight: 900,
                                fontSize: 24,
                              }}
                            >
                              SAMPLE
                            </div>
                          </div>
                          <div className="cs-gold-box" style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>
                              Sample workflow
                            </div>
                            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85, lineHeight: 1.35 }}>
                              {selectedStudy.quoteRole}
                            </div>
                          </div>
                        </div>

                        {/* Highlighted Workflow Summary */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
                            <span className="cs-gold-strip">
                              Sample escrow workflow — {selectedStudy.methodologyNote}
                            </span>
                          </p>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                              {copy.modal.contractScopeTitle}
                            </div>
                            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#3d423f", margin: 0 }}>
                              {selectedStudy.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.escrowRailPrefix} {selectedStudy.rail.toUpperCase()}</span>
                      <span>{copy.modal.cityPrefix} {selectedStudy.city.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Right Page: p. 03 — Table of Contents + Executive Summary */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.tocSummaryTitle}</h3>
                        <span className="cs-page-num">p. 03</span>
                      </div>

                      {/* Clickable Numbered TOC matching Image 1 */}
                      <div className="cs-toc-grid" style={{ marginTop: 16, marginBottom: 20 }}>
                        {copy.modal.tocRows.map((item) => (
                          <button
                            key={item.num}
                            type="button"
                            className="cs-toc-row"
                            onClick={() => jumpToSpread(item.spread)}
                          >
                            <span className="cs-toc-num">{item.num}</span>
                            <span className="cs-toc-line" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Gold Executive Summary Block matching Image 1 */}
                      <div className="cs-gold-box" style={{ marginBottom: 18 }}>
                        <div
                          style={{
                            fontFamily: "var(--v2-font-head)",
                            fontWeight: 800,
                            fontSize: 15,
                            marginBottom: 8,
                          }}
                        >
                          {copy.modal.execSummaryTitle}
                        </div>
                        <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                          {selectedStudy.executiveSummary}
                        </p>
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                          {copy.modal.contractConclusionsTitle}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12, lineHeight: 1.55, color: "#3d423f" }}>
                          <p style={{ margin: 0 }}>
                            <strong>{copy.modal.conclusion1Title}</strong>{" "}
                            {copy.modal.conclusion1Body(selectedStudy.budgetEtb)}
                          </p>
                          <p style={{ margin: 0 }}>
                            <strong>{copy.modal.conclusion2Title}</strong>{" "}
                            {copy.modal.conclusion2Body(
                              selectedStudy.outcomeMetric,
                              selectedStudy.timeline,
                              selectedStudy.milestoneCount,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.categoryPrefix} {selectedStudy.categoryLabel.toUpperCase()}</span>
                      <span>{copy.modal.totalPrefix} {selectedStudy.budgetEtb}</span>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* ── SPREAD 02: Background Information (p. 04) + Problem Statement (p. 05) ── */}
              {(activeSpread === "all" || activeSpread === "2") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-2`}
                  className="cs-book-spread"
                  ref={spread2Ref}
                  aria-label={copy.modal.spread2Aria}
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.45, delay: activeSpread === "all" ? 0.06 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 04 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.bgInfoTitle}</h3>
                        <span className="cs-page-num">p. 04</span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 18,
                          marginTop: 18,
                          marginBottom: 20,
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#6e736f", textTransform: "uppercase" }}>
                            {copy.modal.opBaselineLabel}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, margin: "4px 0 6px" }}>
                            {copy.modal.histContextTitle}
                          </div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, color: "#3d423f", margin: 0 }}>
                            {selectedStudy.historicalContext}
                          </p>
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#6e736f", textTransform: "uppercase" }}>
                            {copy.modal.marketLandscapeLabel}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, margin: "4px 0 6px" }}>
                            {copy.modal.industryOverviewTitle}
                          </div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, color: "#3d423f", margin: 0 }}>
                            {selectedStudy.industryOverview}
                          </p>
                        </div>
                      </div>

                      {/* Animated SVG Line Chart matching Image 1 Spread 3 Left Page */}
                      <div
                        style={{
                          background: "#f3f3ee",
                          border: "1px solid #e2e2dc",
                          borderRight: "6px solid #f5c518",
                          padding: "14px 16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                            fontSize: 11.5,
                            fontWeight: 800,
                          }}
                        >
                          <span>{copy.modal.chartTitle}</span>
                          <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#555a56" }}>
                            {copy.modal.chartIndexLabel}
                          </span>
                        </div>
                        {renderTrendChart(selectedStudy)}
                        <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 11, fontFamily: "var(--v2-font-mono)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <i style={{ width: 8, height: 8, background: "#f5c518", border: "1px solid #141715", display: "inline-block" }} />
                            {copy.modal.chartLegendAfter}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#6e736f" }}>
                            <i style={{ width: 8, height: 8, background: "#9ca39e", display: "inline-block" }} />
                            {copy.modal.chartLegendBefore}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.baselineAuditFoot}</span>
                      <span>{copy.modal.verifiedFoot}</span>
                    </div>
                  </div>

                  {/* Right Page: p. 05 — Problem Statement */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.problemStatementTitle}</h3>
                        <span className="cs-page-num">p. 05</span>
                      </div>

                      {/* 3 Vertical-Rule Pillars matching Image 1 */}
                      <div className="cs-problem-pillars" style={{ marginTop: 20, marginBottom: 20 }}>
                        {selectedStudy.problemPillars.map((p, idx) => (
                          <div key={p.label} className="cs-problem-pillar">
                            <span style={{ color: "#141715", display: "inline-flex", alignItems: "center", gap: 6 }}>
                              {idx === 0 ? <Target size={16} /> : idx === 1 ? <Layers size={16} /> : <Activity size={16} />}
                              <strong style={{ fontSize: 12, textTransform: "lowercase" }}>{p.label}</strong>
                            </span>
                            <p style={{ fontSize: 11.5, lineHeight: 1.55, color: "#3d423f", margin: 0 }}>
                              {p.detail}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Full-Width Gold Horizontal Bar matching Image 1 */}
                      <motion.div
                        className="cs-gold-bar"
                        style={{ marginBottom: 20, transformOrigin: "left" }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
                        <div
                          style={{
                            background: "#141715",
                            color: "#f4f7f4",
                            padding: 18,
                            borderBottom: "5px solid #f5c518",
                          }}
                        >
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, color: "#f5c518", letterSpacing: "0.1em" }}>
                            {copy.modal.keyBottleneck}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6, lineHeight: 1.35 }}>
                            {selectedStudy.editorialHeadline}
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#292e2b", margin: "0 0 10px" }}>
                            {copy.modal.problemRiskParagraph}
                          </p>
                          <span className="cs-gold-strip" style={{ fontSize: 12 }}>
                            {copy.modal.problemRiskQuote}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.diagnosticFoot}</span>
                      <span>{selectedStudy.milestoneCount} {copy.modal.tranchesDefinedSuffix}</span>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* ── SPREAD 03: Methodology (p. 06) + Findings (p. 07) ── */}
              {(activeSpread === "all" || activeSpread === "3") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-3`}
                  className="cs-book-spread"
                  ref={spread3Ref}
                  aria-label={copy.modal.spread3Aria}
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.48, delay: activeSpread === "all" ? 0.12 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 06 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.methodologyTitle}</h3>
                        <span className="cs-page-num">p. 06</span>
                      </div>

                      <div className="cs-gold-box" style={{ marginTop: 18, marginBottom: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>
                          {copy.modal.protocolTitle}
                        </div>
                        <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                          {selectedStudy.methodologyNote}
                        </p>
                      </div>

                      {/* Data Collection Process & Year Callout matching Image 1 Spread 4 Left */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "center" }}>
                        <div style={{ border: "1px solid #141715", padding: 12 }}>
                          <div style={{ fontFamily: "var(--v2-font-mono)", fontSize: 10.5, fontWeight: 800, marginBottom: 8 }}>
                            {copy.modal.verificationMetricsTitle}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dfdfd9", fontSize: 12 }}>
                            <span>{copy.modal.metricLocked}</span>
                            <strong>100% ({selectedStudy.budgetEtb})</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dfdfd9", fontSize: 12 }}>
                            <span>{copy.modal.metricFirstPass}</span>
                            <strong>{copy.modal.metricApproved}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
                            <span>{copy.modal.metricRail}</span>
                            <strong>{selectedStudy.rail}</strong>
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontFamily: "var(--v2-font-head)",
                              fontSize: 34,
                              fontWeight: 900,
                              lineHeight: 1,
                              color: "#141715",
                            }}
                          >
                            {selectedStudy.timeline}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 12.5, marginTop: 6 }}>
                            {copy.modal.qaApproachTitle}
                          </div>
                          <p style={{ fontSize: 11.5, lineHeight: 1.55, color: "#3d423f", margin: "4px 0 0" }}>
                            {copy.modal.qaApproachBody}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.protocolFoot}</span>
                      <span>{copy.modal.zeroDisputesFoot}</span>
                    </div>
                  </div>

                  {/* Right Page: p. 07 — Findings */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.findingsTitle}</h3>
                        <span className="cs-page-num">p. 07</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 16, marginBottom: 16 }}>
                        <span
                          style={{
                            fontFamily: "var(--v2-font-head)",
                            fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)",
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            lineHeight: 1,
                            color: "#141715",
                          }}
                        >
                          {selectedStudy.findingsHeadline}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#292e2b" }}>
                          {selectedStudy.findingsSub}
                        </span>
                      </div>

                      {/* 3 Gold Data Analysis KPI Cards matching Image 1 Spread 4 Right */}
                      <div style={{ fontWeight: 800, fontSize: 12.5, marginBottom: 8 }}>
                        {copy.modal.breakdownTitle}
                      </div>
                      <div className="cs-findings-kpi-grid" style={{ marginBottom: 18 }}>
                        <div className="cs-findings-kpi">
                          <span style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", textTransform: "uppercase" }}>
                            {copy.modal.kpiEscrowed}
                          </span>
                          <strong style={{ fontSize: 16, fontFamily: "var(--v2-font-head)", fontWeight: 900 }}>
                            {selectedStudy.budgetEtb}
                          </strong>
                        </div>
                        <div className="cs-findings-kpi">
                          <span style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", textTransform: "uppercase" }}>
                            {copy.modal.kpiReleased}
                          </span>
                          <strong style={{ fontSize: 16, fontFamily: "var(--v2-font-head)", fontWeight: 900 }}>
                            {selectedStudy.milestoneCount} / {selectedStudy.milestoneCount}
                          </strong>
                        </div>
                        <div className="cs-findings-kpi">
                          <span style={{ fontSize: 10.5, fontFamily: "var(--v2-font-mono)", textTransform: "uppercase" }}>
                            {copy.modal.kpiPayoutSpeed}
                          </span>
                          <strong style={{ fontSize: 16, fontFamily: "var(--v2-font-head)", fontWeight: 900 }}>
                            {copy.modal.kpiPayoutVal}
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "0.38fr 0.62fr", gap: 14 }}>
                        <div className="cs-gold-box" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                            {copy.modal.resultsObsTitle}
                          </div>
                          <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0 }}>
                            {selectedStudy.outcomeMetric} {copy.modal.resultsObsSuffix}
                          </p>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.65, color: "#292e2b" }}>
                          {copy.modal.findingsBullets(selectedStudy.milestoneCount).map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.outcomeFootPrefix} {selectedStudy.outcomeMetric.toUpperCase()}</span>
                      <span>{copy.modal.verified100Foot}</span>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* ── SPREAD 04: Solutions & Milestone Ledger (p. 08) + Conclusion (p. 09) ── */}
              {(activeSpread === "all" || activeSpread === "4") && (
                <motion.article
                  key={`${selectedStudy.id}-spread-4`}
                  className="cs-book-spread"
                  ref={spread4Ref}
                  aria-label={copy.modal.spread4Aria}
                  initial={{ opacity: 0, y: 36, rotateX: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.5, delay: activeSpread === "all" ? 0.18 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Left Page: p. 08 */}
                  <div className="cs-book-page cs-book-page--left">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.solutionsTitle}</h3>
                        <span className="cs-page-num">p. 08</span>
                      </div>

                      {/* Animated Radial Progress Rings matching Image 1 Spread 5 Left */}
                      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16, marginBottom: 18, flexWrap: "wrap" }}>
                        {[
                          { pct: "100%", label: copy.modal.ringApproved, dash: 113 },
                          { pct: "95%", label: copy.modal.ringNetPayout, dash: 107 },
                        ].map((ring) => (
                          <div key={ring.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <svg width="46" height="46" viewBox="0 0 46 46">
                              <circle cx="23" cy="23" r="18" fill="none" stroke="#e2e2dc" strokeWidth="5" />
                              <motion.circle
                                key={`${selectedStudy.id}-${ring.label}`}
                                cx="23"
                                cy="23"
                                r="18"
                                fill="none"
                                stroke="#f5c518"
                                strokeWidth="5"
                                strokeDasharray="113"
                                initial={{ strokeDashoffset: 113 }}
                                animate={{ strokeDashoffset: 113 - ring.dash }}
                                transition={{ duration: 0.9, ease: "easeOut" }}
                                strokeLinecap="round"
                              />
                              <text
                                x="23"
                                y="26"
                                textAnchor="middle"
                                fontSize="9.5"
                                fontWeight="800"
                                fill="#141715"
                              >
                                {ring.pct}
                              </text>
                            </svg>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#141715" }}>{ring.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Complete Milestone Tranche Ledger Table */}
                      <table className="cs-ledger-table">
                        <thead>
                          <tr>
                            <th>{copy.modal.thDeliverable}</th>
                            <th>{copy.modal.thWindow}</th>
                            <th>{copy.modal.thTranche}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudy.milestones.map((ms) => (
                            <tr key={ms.title}>
                              <td style={{ fontWeight: 700 }}>{ms.title}</td>
                              <td style={{ fontFamily: "var(--v2-font-mono)", color: "#555a56" }}>{ms.duration}</td>
                              <td style={{ fontFamily: "var(--v2-font-mono)", fontWeight: 800 }}>{ms.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.allTranchesFoot(selectedStudy.milestoneCount)}</span>
                      <span>{copy.modal.totalPrefix} {selectedStudy.budgetEtb}</span>
                    </div>
                  </div>

                  {/* Right Page: p. 09 — Conclusion & Launch Action */}
                  <div className="cs-book-page">
                    <div>
                      <div className="cs-page-head">
                        <h3 className="cs-page-title">{copy.modal.conclusionTitle}</h3>
                        <span className="cs-page-num">p. 09</span>
                      </div>

                      {/* Gold Quotation Callout Box matching Image 1 Spread 5 Right */}
                      <div className="cs-gold-box" style={{ marginTop: 18, marginBottom: 20 }}>
                        <div style={{ fontFamily: "var(--v2-font-head)", fontSize: 22, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
                          &ldquo;
                        </div>
                        <p style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.55, margin: 0 }}>
                          {selectedStudy.quote}
                        </p>
                        <div style={{ fontSize: 11, marginTop: 6, fontFamily: "var(--v2-font-mono)" }}>
                          Sample workflow · {selectedStudy.quoteRole}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "1.5px solid #141715",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Award size={14} />
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{copy.modal.finalThoughtsTitle}</div>
                            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#3d423f", margin: "2px 0 0" }}>
                              {selectedStudy.finalThought}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "1.5px solid #141715",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Sparkles size={14} />
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{copy.modal.futureTitle}</div>
                            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#3d423f", margin: "2px 0 0" }}>
                              {selectedStudy.futureImplication}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleStartProject}
                          style={{
                            background: "#141715",
                            color: "#f5c518",
                            border: "none",
                            borderRadius: 6,
                            padding: "11px 18px",
                            fontFamily: "var(--v2-font-head)",
                            fontWeight: 800,
                            fontSize: 13.5,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>{copy.modal.postSimilar}</span>
                          <ArrowUpRight size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudyId(null);
                            onNavigate("fees");
                          }}
                          style={{
                            background: "transparent",
                            color: "#141715",
                            border: "1.5px solid #141715",
                            borderRadius: 6,
                            padding: "10px 16px",
                            fontFamily: "var(--v2-font-head)",
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          {copy.calculateFees}
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 14,
                        borderTop: "1px solid #dfdfd9",
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        color: "#555a56",
                      }}
                    >
                      <span>{copy.modal.dossierFoot}</span>
                      <span>{copy.modal.endReportFoot}</span>
                    </div>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="yk-v2 yk-v2-subpage yk-cs-studio">
      {/* ── SECTION 1: Dark Studio Hero (Pure Visual Attraction & Motion) ── */}
      <section className="cs-hero-band" aria-label={copy.heroSectionAria}>
        <div className="cs-band-inner">
          <StudioBreadcrumb
            items={[
              {
                label: copy.breadcrumbHome,
                onClick: () => onNavigate("home"),
              },
              {
                label: copy.breadcrumbCases,
                onClick:
                  activeCategory !== "ALL"
                    ? () => setActiveCategory("ALL")
                    : undefined,
                active: activeCategory === "ALL",
              },
              ...(activeCategory !== "ALL"
                ? [
                    {
                      code: activeCategory,
                      label: `${copy.filterPrefix} ${
                        categories.find((c) => c.id === activeCategory)?.label ?? activeCategory
                      }`,
                      active: true,
                    },
                  ]
                : []),
            ]}
            rightMeta={
              <div className="cs-studio-band-pills">
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate("fees")}
                >
                  <span>{copy.feesTag}</span>
                  <span>{copy.feesLabel}</span>
                </button>
                <button
                  type="button"
                  className="cs-studio-band-pill"
                  onClick={() => onNavigate("about")}
                >
                  <span>{copy.studioTag}</span>
                  <span>{copy.aboutLabel}</span>
                </button>
              </div>
            }
          />
          <motion.div
            className="cs-hero-top"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="cs-hero-display">
              {copy.heroPrefix}{" "}
              <motion.span
                className="cs-hero-brace"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 16 }}
              >
                &#123;
              </motion.span>
              {copy.heroBraceWord}
              <motion.span
                className="cs-hero-brace"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.26, type: "spring", stiffness: 260, damping: 16 }}
              >
                &#125;
              </motion.span>
              <br />
              <motion.span
                className="cs-hero-arrow"
                initial={{ x: -18, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.34, duration: 0.5 }}
              >
                &rarr;
              </motion.span>
              {copy.heroSuffix}
            </h1>
          </motion.div>

          {/* Pure Visual 3D Sculptural Diptych Frames with Living Motion & Hover-Only Pill */}
          <motion.div
            className="cs-hero-diptych"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltVisualSurface
              className="cs-hero-art-frame"
              onClick={() => openStudyDossier(CASE_STUDIES[0])}
              ariaLabel={copy.hoverAria01}
            >
              <svg className="cs-hero-art-svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="hero-orb-1" cx="44%" cy="38%" r="54%">
                    <stop offset="0%" stopColor="#9ae85c" />
                    <stop offset="48%" stopColor="#4f9428" />
                    <stop offset="100%" stopColor="#081106" />
                  </radialGradient>
                  <radialGradient id="hero-Stage-Glow-1" cx="50%" cy="54%" r="58%">
                    <stop offset="0%" stopColor="rgba(116,184,67,0.34)" />
                    <stop offset="100%" stopColor="rgba(7,10,8,0)" />
                  </radialGradient>
                </defs>
                <rect width="600" height="380" fill="#080d09" />
                <circle className="cs-svg-pulse" cx="300" cy="200" r="210" fill="url(#hero-Stage-Glow-1)" />
                {/* Architectural Isometric Plinth */}
                <polygon
                  className="cs-svg-float-alt"
                  points="95,215 300,105 505,215 300,325"
                  fill="#111c13"
                  stroke="rgba(138,212,83,0.28)"
                  strokeWidth="1.5"
                />
                {/* Recessed Well & Orbital Ring */}
                <ellipse
                  className="cs-svg-orbit"
                  cx="300"
                  cy="212"
                  rx="132"
                  ry="68"
                  fill="none"
                  stroke="rgba(154,232,92,0.24)"
                  strokeWidth="1.5"
                  strokeDasharray="8 6"
                />
                <ellipse cx="300" cy="212" rx="108" ry="56" fill="#060a07" stroke="rgba(116,184,67,0.22)" />
                {/* Levitating Emerald Sphere */}
                <circle className="cs-svg-float" cx="300" cy="184" r="64" fill="url(#hero-orb-1)" />
              </svg>
              <span className="cs-hero-hover-pill">
                <span>{copy.hoverDossier01}</span>
                <ArrowUpRight size={13} />
              </span>
            </TiltVisualSurface>

            <TiltVisualSurface
              className="cs-hero-art-frame"
              onClick={() => openStudyDossier(CASE_STUDIES[1])}
              ariaLabel={copy.hoverAria02}
            >
              <svg className="cs-hero-art-svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="hero-orb-2" cx="42%" cy="38%" r="55%">
                    <stop offset="0%" stopColor="#a3e668" />
                    <stop offset="56%" stopColor="#35681c" />
                    <stop offset="100%" stopColor="#070d08" />
                  </radialGradient>
                  <linearGradient id="hero-ribbon-2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#5ea030" />
                    <stop offset="100%" stopColor="#172d11" />
                  </linearGradient>
                </defs>
                <rect width="600" height="380" fill="#080d09" />
                {/* Fluid Sculptural Ribbon */}
                <path
                  className="cs-svg-float-alt"
                  d="M70,325 C155,175 260,115 340,260 C412,360 492,195 545,82"
                  fill="none"
                  stroke="url(#hero-ribbon-2)"
                  strokeWidth="38"
                  strokeLinecap="round"
                />
                {/* Rotating Torus Ring */}
                <circle
                  className="cs-svg-orbit"
                  cx="412"
                  cy="134"
                  r="56"
                  fill="none"
                  stroke="url(#hero-orb-2)"
                  strokeWidth="22"
                  strokeDasharray="180 28"
                />
                {/* Isometric Pedestal + Levitating Sphere */}
                <polygon
                  className="cs-svg-float"
                  points="210,278 330,234 420,278 300,322"
                  fill="#142215"
                  stroke="rgba(138,212,83,0.3)"
                />
                <circle className="cs-svg-float" cx="315" cy="238" r="30" fill="url(#hero-orb-2)" />
              </svg>
              <span className="cs-hero-hover-pill">
                <span>{copy.hoverDossier02}</span>
                <ArrowUpRight size={13} />
              </span>
            </TiltVisualSurface>
          </motion.div>

          <motion.div
            className="cs-hero-foot"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <p className="cs-hero-tagline">
              {copy.heroTagline}
            </p>
            <button
              type="button"
              className="cs-scroll-pill"
              onClick={() => worksSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              {copy.scrollPill}
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: Crisp White { PROOF } Manifesto Band (Image 2 Second Band) ── */}
      <section className="cs-manifesto-band" aria-label={copy.manifestoAria}>
        <div className="cs-band-inner">
          <motion.div
            className="cs-manifesto-grid"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            {/* Giant Sculptural { PROOF } Emblem with Breathing Motion */}
            <motion.div
              className="cs-brace-emblem"
              aria-hidden="true"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="cs-brace-emblem-char">&#123;</span>
              <span className="cs-brace-emblem-word">{copy.proofBraceWord}</span>
              <span className="cs-brace-emblem-char">&#125;</span>
            </motion.div>

            <div>
              <ScrollIlluminatedHeadline segments={copy.proofSegments} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: Warm Alabaster { SELECTED WORK } Staggered Showcase (Image 2 Third Band) ── */}
      <section className="cs-works-band" ref={worksSectionRef} aria-label={copy.worksAria}>
        <div className="cs-band-inner">
          <motion.div
            className="cs-works-topbar"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <span className="cs-kicker" style={{ color: "#0e1410" }}>
              {copy.selectedWorkKicker}
            </span>

            <div className="cs-works-tabs" role="tablist" aria-label={copy.filterAria}>
              {categories.map((cat) => {
                const count =
                  cat.id === "ALL"
                    ? CASE_STUDIES.length
                    : CASE_STUDIES.filter((s) => s.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`cs-works-tab ${activeCategory === cat.id ? "is-active" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Staggered 2-Column Asymmetric Project Cards with Layout & 3D Tilt */}
          <motion.div className="cs-stagger-grid" layout>
            <AnimatePresence mode="popLayout">
              {filteredStudies.map((study, idx) => (
                <motion.div
                  key={study.id}
                  layout
                  className="cs-work-item"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.55, delay: (idx % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <article
                    className="cs-work-card"
                    onClick={() => openStudyDossier(study)}
                  >
                    <TiltVisualSurface
                      className="cs-work-visual"
                      magneticLabel={copy.openDossierPill}
                    >
                      <ProjectSculpturalArt variant={study.artVariant} />
                      <div className="cs-work-visual-top">
                        <span>&#123; {study.index} &middot; {study.categoryLabel} &#125;</span>
                        <span>{study.budgetEtb}</span>
                      </div>
                      <div className="cs-work-visual-bottom">
                        <span
                          style={{
                            background: "rgba(9, 16, 6, 0.72)",
                            padding: "5px 10px",
                            borderRadius: 4,
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          {study.milestoneCount} {copy.milestonesLabel} · {study.rail}
                        </span>
                        <span
                          style={{
                            background: "#f5c518",
                            color: "#141715",
                            fontWeight: 800,
                            padding: "5px 10px",
                            borderRadius: 4,
                          }}
                        >
                          {copy.openDossierBtn}
                        </span>
                      </div>
                    </TiltVisualSurface>

                    <h3 className="cs-work-headline">{study.editorialHeadline}</h3>

                    <div className="cs-work-meta">
                      <span>
                        {copy.clientPrefix}{" "}
                        <button
                          type="button"
                          className="cs-work-company-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudyDossier(study);
                          }}
                        >
                          {study.clientShort}
                        </button>{" "}
                        &middot; {study.city}
                      </span>
                      <span style={{ fontFamily: "var(--v2-font-mono)", fontSize: 12 }}>
                        {study.milestoneCount} {copy.milestonesLabel} &middot; {study.timeline}
                      </span>
                    </div>
                  </article>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="cs-works-footer-row">
            <button
              type="button"
              className="cs-see-all-btn"
              onClick={() => openStudyDossier(filteredStudies[0] ?? CASE_STUDIES[0])}
            >
              <span>{copy.openFullDossier} &#123;0{CASE_STUDIES.length}&#125;</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Sticky Scroll-Pinned { SERVICES } 3-Column Stage ── */}
      <section className="cs-services-band" aria-label={copy.servicesAria}>
        <StickyScrollServicesStage
          kicker={copy.servicesKicker}
          activeId={activeDiscipline}
          onSelect={(id) => setActiveDiscipline(id as Exclude<CaseCategory, "ALL">)}
          items={DISCIPLINES.map((disc) => {
            const featuredStudy =
              CASE_STUDIES.find((s) => s.id === disc.featuredStudyId) ?? CASE_STUDIES[0];
            return {
              id: disc.id,
              title: disc.title,
              topChip: featuredStudy.clientShort,
              kickerBadge: featuredStudy.outcomeMetric,
              artNode: <ProjectSculpturalArt variant={featuredStudy.artVariant} />,
              rows: [
                { label: copy.rowEscrowRange, badge: disc.escrowRange },
                { label: copy.rowSettlement, badge: disc.rails },
                { label: copy.rowTranches, badge: disc.avgTranches.toUpperCase() },
              ],
              onCardClick: () => openStudyDossier(featuredStudy),
            };
          })}
        />
      </section>

      {/* ── SECTION 6: Dark Obsidian Studio CTA Band (Image 2 Bottom Band) ── */}
      <section className="cs-outro-band" aria-label={copy.outroAria}>
        <div className="cs-band-inner">
          <motion.div
            className="cs-outro-grid"
            variants={sectionRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div>
              <h2 className="cs-outro-title">
                {copy.outroTitleLine1}
                <br />
                {copy.outroTitleLine2}
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(244,247,244,0.72)", maxWidth: 460, marginBottom: 28 }}>
                {copy.outroSubtitle}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  onClick={handleStartProject}
                >
                  <Briefcase size={17} />
                  <span>{t.marketing.cta.postJob}</span>
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-secondary"
                  onClick={() => onNavigate("fees")}
                >
                  <Wallet size={17} />
                  <span>{copy.calculateFees}</span>
                </button>
              </div>
            </div>

            <motion.div
              className="cs-outro-brace-stage"
              animate={{ scale: [1, 1.025, 1] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="cs-outro-giant-brace" aria-hidden="true">&#123;</span>
              <button
                type="button"
                className="cs-outro-pill-btn"
                onClick={handleStartProject}
              >
                {copy.outroPillEmail}
              </button>
              <span className="cs-outro-giant-brace" aria-hidden="true">&#125;</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Render Two-Page Editorial Dossier Viewer at document.body level */}
      {typeof document !== "undefined"
        ? createPortal(dossierModal, document.body)
        : dossierModal}
    </div>
  );
}
