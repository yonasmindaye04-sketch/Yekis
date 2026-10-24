import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

export interface CountUpMetricItem {
  prefix?: string;
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
}

export interface StickyStackCardRow {
  label: string;
  badge: string;
}

export interface StickyStackItem {
  id: string;
  title: string;
  kickerBadge: string;
  topChip: string;
  artNode: React.ReactNode;
  rows: StickyStackCardRow[];
  onCardClick?: () => void;
}

function ScrubWord({
  word,
  highlight,
  progress,
  range,
}: {
  word: string;
  highlight?: boolean;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const y = useTransform(progress, range, [6, 0]);

  return (
    <motion.span
      style={{ opacity, y, display: "inline-block", marginRight: "0.26em" }}
      className={highlight ? "cs-green-highlight" : undefined}
    >
      {word}
    </motion.span>
  );
}

/**
 * Scroll-scrubbed word-by-word illuminated headline (cnrres.co.kr style).
 * Replaces dense manifesto sub-paragraphs with kinetic typography.
 */
export function ScrollIlluminatedHeadline({
  segments,
}: {
  segments: { text: string; highlight?: boolean }[];
}) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 88%", "end 45%"],
  });

  const words = segments.flatMap((seg) =>
    seg.text
      .trim()
      .split(/\s+/)
      .map((w) => ({ word: w, highlight: seg.highlight }))
  );

  return (
    <h2 ref={containerRef} className="cs-manifesto-title" style={{ marginBottom: 28 }}>
      {words.map((item, idx) => {
        const start = idx / words.length;
        const end = Math.min(1, start + 1.6 / words.length);
        return (
          <ScrubWord
            key={`${item.word}-${idx}`}
            word={item.word}
            highlight={item.highlight}
            progress={scrollYProgress}
            range={[start, end]}
          />
        );
      })}
    </h2>
  );
}

function SingleCounter({ item }: { item: CountUpMetricItem }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let rafId = 0;
    const duration = 1100;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayVal(item.value * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inView, item.value]);

  const formatted =
    item.decimals && item.decimals > 0
      ? displayVal.toFixed(item.decimals)
      : Math.round(displayVal).toLocaleString();

  return (
    <motion.div
      ref={ref}
      className="cs-scroll-kpi-pill"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="cs-scroll-kpi-num">
        {item.prefix ?? ""}
        {formatted}
        {item.suffix ?? ""}
      </div>
      <div className="cs-scroll-kpi-label">{item.label}</div>
    </motion.div>
  );
}

/**
 * Bold self-counting numerical strip that replaces small text paragraphs.
 */
export function AnimatedCountUpStrip({ metrics }: { metrics: CountUpMetricItem[] }) {
  return (
    <div className="cs-scroll-kpi-strip">
      {metrics.map((m) => (
        <SingleCounter key={m.label} item={m} />
      ))}
    </div>
  );
}

/**
 * Scroll-linked parallax & scale wrapper for the 2-frame pure-visual Hero Diptych.
 */
export function ScrollParallaxDiptych({
  leftFrame,
  rightFrame,
}: {
  leftFrame: React.ReactNode;
  rightFrame: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 15%"],
  });

  const leftY = useTransform(scrollYProgress, [0, 1], [18, -22]);
  const rightY = useTransform(scrollYProgress, [0, 1], [36, -38]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1.0, 1.03]);

  return (
    <div ref={ref} className="cs-hero-diptych">
      <motion.div style={{ y: leftY, scale }}>{leftFrame}</motion.div>
      <motion.div style={{ y: rightY, scale }}>{rightFrame}</motion.div>
    </div>
  );
}

/**
 * Sticky scroll-pinned 3-column { STACK } stage inspired by cnrres.co.kr.
 * - Scrolling down automatically steps through items 01..0N.
 * - Clicking or hovering any item also switches immediately.
 * - Enforces proper 3-column alignment (Col 1: Kicker + Progress, Col 2: { Title } Stack, Col 3: Fluted Card).
 * - Zero tiny sentences inside the card and zero paragraphs below the card.
 */
export function StickyScrollServicesStage({
  kicker,
  items,
  activeId,
  onSelect,
}: {
  kicker: string;
  items: StickyStackItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(0.999, latest));
    const idx = Math.floor(clamped * items.length);
    const targetItem = items[idx];
    if (targetItem && targetItem.id !== activeId) {
      onSelect(targetItem.id);
    }
  });

  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === activeId)
  );
  const currentItem = items[activeIndex] ?? items[0];

  const progressHeight = useTransform(scrollYProgress, [0, 1], ["15%", "100%"]);

  return (
    <div ref={trackRef} className="cs-sticky-services-track">
      <div className="cs-sticky-services-pin">
        <div className="cs-band-inner">
          <div className="cs-services-grid">
            {/* Column 1 (160px): Kicker + Scroll Step Counter + Vertical Scrub Bar */}
            <div className="cs-services-col-kicker">
              <span className="cs-kicker" style={{ color: "#0e1410" }}>
                {kicker}
              </span>

              <div className="cs-scroll-step-indicator">
                <span className="cs-scroll-step-num">
                  0{activeIndex + 1} / 0{items.length}
                </span>
                <div className="cs-scroll-step-rail">
                  <motion.div className="cs-scroll-step-fill" style={{ height: progressHeight }} />
                </div>
              </div>
            </div>

            {/* Column 2 (1fr): Clean Single-Line { } Stack */}
            <div className="cs-services-stack" role="tablist">
              {items.map((item, idx) => {
                const isSelected = item.id === currentItem.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`cs-service-item ${isSelected ? "is-active" : ""}`}
                    onMouseEnter={() => onSelect(item.id)}
                    onClick={() => onSelect(item.id)}
                    whileHover={{ x: 8 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  >
                    <span className="cs-service-idx">0{idx + 1}</span>
                    {isSelected && <span className="cs-service-brace">{"{"}</span>}
                    <span className="cs-service-label-text">{item.title}</span>
                    {isSelected && <span className="cs-service-brace">{"}"}</span>}
                  </motion.button>
                );
              })}
            </div>

            {/* Column 3 (390px): Pure-Visual Fluted Green Card (Bold stats only, no paragraphs) */}
            <div className="cs-service-preview">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItem.id}
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.96 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="cs-fluted-card"
                    onClick={currentItem.onCardClick}
                    role={currentItem.onCardClick ? "button" : undefined}
                    tabIndex={currentItem.onCardClick ? 0 : undefined}
                  >
                    {/* Top Compact Badge Row */}
                    <div className="cs-fluted-top-row">
                      <span className="cs-fluted-chip">{currentItem.topChip}</span>
                      <span className="cs-fluted-gold-badge">{currentItem.kickerBadge}</span>
                    </div>

                    {/* Pure 3D Sculptural Visual Stage */}
                    <div className="cs-fluted-art-stage">{currentItem.artNode}</div>

                    {/* 3 Clean Bold Key-Value Stat Pills (Zero tiny sentences) */}
                    <div className="cs-fluted-stat-list">
                      {currentItem.rows.map((row) => (
                        <div key={row.label} className="cs-fluted-stat-row">
                          <span className="cs-fluted-stat-label">{row.label}</span>
                          <span className="cs-fluted-stat-badge">{row.badge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
