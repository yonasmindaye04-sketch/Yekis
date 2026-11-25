/**
 * LandingPageV2.tsx
 *
 * New design built on the design/landing-v2 branch.
 * Drops in as a drop-in replacement for <LandingPage> — same props shape.
 * Uses Framer Motion for all animations. Completely isolated in .yk-v2 scope.
 * Does NOT modify any existing file.
 */
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Briefcase,
  CheckCircle,
  Shield,
  ShieldCheck,
  ArrowUp,
  ArrowUpRight,
  Award,
  WalletCards,
  Star,
  BadgeCheck,
} from "lucide-react";
import { LandingSupportChat } from "./components/LandingSupportChat";
import { HandWrittenTitle } from "./components/HandWrittenTitle";
import { ProximityPopTitle } from "./components/ProximityPopTitle";
import { events } from "./analytics";
import { useI18n } from "./i18n";
import { FooterV2 } from "./MarketingFooter";
import {
  ESCROW_STEP_ROWS_BY_LANG,
  getLandingReviews,
  LANDING_V2_EXTRA,
  type MemberReview,
} from "./landingV2Copy";
import "./landing-v2.css";

/* ─────────────────────────────────────────────────
   Types
───────────────────────────────────────────────── */
type LandingPageV2Props = {
  onStart: (mode: "login" | "register") => void;
  onNavigate: (page: string) => void;
};

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* avatar gradient pairs, drawn from the V2 palette */
const REVIEW_TONES: Record<MemberReview["tone"], [string, string]> = {
  1: ["var(--v2-primary)", "var(--v2-teal)"],
  2: ["var(--v2-teal)", "var(--v2-primary)"],
  3: ["var(--v2-violet)", "var(--v2-primary)"],
  4: ["var(--v2-primary)", "var(--v2-violet)"],
  5: ["var(--v2-teal)", "var(--v2-violet)"],
};

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useSectionVisible(
  ref: React.RefObject<HTMLElement | null>,
  rootMargin = "160px 0px",
  threshold = 0.01,
  once = false
) {
  const [visible, setVisible] = useState(() => (typeof window === "undefined" ? true : prefersReduced()));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold, once]);

  return visible;
}

/* ─────────────────────────────────────────────────
   Toast bus (isolated to V2)
───────────────────────────────────────────────── */
let toastSeq = 0;
const ToastBus = {
  subs: new Set<(item: { id: number; message: string }) => void>(),
  push(message: string) {
    const id = ++toastSeq;
    this.subs.forEach((fn) => fn({ id, message }));
  },
  subscribe(fn: (item: { id: number; message: string }) => void) {
    this.subs.add(fn);
    return () => { this.subs.delete(fn); };
  },
};

function Toasts() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  useEffect(() => {
    const off = ToastBus.subscribe((item) => {
      setItems((prev) => [...prev.slice(-2), item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, 2800);
    });
    return off;
  }, []);
  return (
    <div className="yk-v2-toast-stack" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="yk-v2-toast"
            initial={{ opacity: 0, y: 26, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <span className="v2-toast-dot">
              <CheckCircle size={16} />
            </span>
            <span>{item.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Motion primitives
───────────────────────────────────────────────── */
function Reveal({
  children,
  dir = "up",
  delay = 0,
  className,
  amount = 0.1,
  style,
}: {
  children: React.ReactNode;
  dir?: "up" | "left" | "right" | "zoom";
  delay?: number;
  className?: string;
  amount?: number;
  style?: React.CSSProperties;
}) {
  const hidden =
    dir === "left"
      ? { opacity: 0, x: -28 }
      : dir === "right"
        ? { opacity: 0, x: 28 }
        : dir === "zoom"
          ? { opacity: 0, y: 18, scale: 0.96 }
          : { opacity: 0, y: 28 };
  return (
    <motion.div
      className={className}
      style={style}
      initial={hidden}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.52, delay: Math.min(delay, 0.14), ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* Per-letter title with interactive proximity pop animation */
function SpringTitle({
  text,
  settled,
  className,
  stageRef,
}: {
  text: string;
  settled: boolean;
  className?: string;
  stageRef?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <ProximityPopTitle
      text={text}
      settled={settled}
      className={className}
      stageRef={stageRef}
    />
  );
}


/* Avatar */
function V2Avatar({
  name,
  size = 62,
  h1 = "var(--v2-primary)",
  h2 = "var(--v2-teal)",
  radius = 18,
}: {
  name: string;
  size?: number;
  h1?: string;
  h2?: string;
  radius?: number;
}) {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="v2-avatar"
      style={
        {
          width: size,
          height: size,
          borderRadius: radius,
          fontSize: size * 0.36,
          "--v2-a1": h1,
          "--v2-a2": h2,
        } as React.CSSProperties
      }
    >
      <span>{initials}</span>
    </div>
  );
}

/* Stars */
function V2Stars({ rating, s = 13 }: { rating: number; s?: number }) {
  const { language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  return (
    <span style={{ display: "flex", gap: 3, color: "var(--v2-primary)" }} aria-label={extra.ratingAria(rating)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={s} style={{ opacity: i < Math.round(rating) ? 1 : 0.26 }} fill="currentColor" stroke="none" />
      ))}
    </span>
  );
}


/* ─────────────────────────────────────────────────
   Hero Section — Floating Paths
   Pure-CSS animated SVG path field (36 curves × 2 mirrored
   layers on a seamless dash-offset loop), spring letter title
   with hover "pop", and a gentle pointer parallax.
───────────────────────────────────────────────── */

/* 36 sweeping curves per layer; `position` mirrors the second layer.
   One animation only: a seamless linear dash-offset drift (dash period
   equals pathLength), desynced with negative delays — continuous,
   unidirectional, no flicker, no snap. */
function FloatingPaths({ position }: { position: 1 | -1 }) {
  const paths = useMemo(
    () =>
      Array.from({ length: 18 }, (_, idx) => {
        const i = idx * 2;
        const a = 380 - i * 5 * position, b = 189 + i * 6;
        const c = 312 - i * 5 * position, e = 216 - i * 6;
        const f = 152 - i * 5 * position, g = 343 - i * 6;
        const h = 616 - i * 5 * position, k = 470 - i * 6;
        const m = 684 - i * 5 * position, n = 875 - i * 6;
        return {
          d: `M-${a} -${b} C-${a} -${b} -${c} ${e} ${f} ${g} C${h} ${k} ${m} ${n} ${m} ${n}`,
          w: (0.55 + i * 0.03).toFixed(2),
          o: Math.min(0.14 + i * 0.025, 0.85).toFixed(3),
          fd: `${5 + ((idx * 5) % 5)}s`,
          dl: `${-((idx * 7) % 11)}s`,
        };
      }),
    [position],
  );
  return (
    <div className={`v2-fp ${position === 1 ? "v2-fp-a" : "v2-fp-b"}`} aria-hidden="true">
      <svg viewBox="0 0 696 316" preserveAspectRatio="xMidYMid slice" fill="none">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            pathLength={1}
            stroke="currentColor"
            strokeWidth={p.w}
            strokeOpacity={p.o}
            strokeLinecap="round"
            style={{ "--fd": p.fd, "--dl": p.dl } as React.CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}

function HeroSection({ onStart }: { onStart?: (mode: "login" | "register") => void }) {
  const { t } = useI18n();
  const heroRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(prefersReduced);
  const heroInView = useSectionVisible(heroRef, "180px 0px");

  useEffect(() => {
    if (settled) return;
    const timer = window.setTimeout(() => setSettled(true), 450);
    return () => window.clearTimeout(timer);
  }, [settled]);

  /* On-demand pointer parallax (zero idle CPU/GPU loop when not moving cursor) */
  useEffect(() => {
    if (prefersReduced()) return;
    const layer = layerRef.current;
    const inner = innerRef.current;
    if (!layer || !inner) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (window.scrollY > window.innerHeight) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const tx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ty = (e.clientY / window.innerHeight - 0.5) * 2;
        layer.style.transform = `translate3d(${(tx * 10).toFixed(1)}px,${(ty * 7).toFixed(1)}px,0)`;
        inner.style.transform = `translate3d(${(tx * -4).toFixed(1)}px,${(ty * -3).toFixed(1)}px,0)`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section className={`v2-hero${heroInView ? " v2-inview" : ""}`} id="top" ref={heroRef}>
      <div className="v2-hero-backdrop" aria-hidden="true">
        {/* ambient glow orbs */}
        <div className="v2-fp-glow v2-fp-glow-one" />
        <div className="v2-fp-glow v2-fp-glow-two" />

        {/* floating path field */}
        <div className="v2-fp-layer" ref={layerRef}>
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* hero content */}
      <div className="v2-hero-inner" ref={innerRef}>
        {/* Dynamic Spring Title */}
        <SpringTitle text={t.marketing.hero.title} settled={settled} stageRef={heroRef} />

        {/* Grounded Subheadline (Zero AI Slop) */}
        <p className="v2-hero-sub">
          {t.marketing.hero.subheadline ||
            "Hire verified Ethiopian developers, designers, and specialists with milestone escrow. Your funds stay locked safely until you review and approve the delivery."}
        </p>

        {/* Action Buttons */}
        <div className="v2-hero-actions">
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            onClick={() => onStart?.("register")}
          >
            <span>{t.marketing.hero.ctaHire || "Post a Job"}</span>
            <ArrowUpRight size={17} aria-hidden="true" />
            <span className="v2-shine" />
          </button>
          <a href="#how-it-works" className="v2-btn v2-btn-secondary">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>{t.marketing.trustRail.milestoneEscrow || "Milestone escrow"}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   "PAY FOR RESULTS, NOT PROMISES." — scroll-driven section
   Sticky full-screen stage, 4 steps: Fund / Work / Approve / Protected
   LEFT  = bold topic word  → changes FIRST (line-mask reveal)
   RIGHT = details with big free-floating 3D icons → FOLLOWS with a delay
   ───────────────────────────────────────────────── */
function EscrowSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {/* FUND */}
        <symbol id="yk-i-wallet" viewBox="0 0 64 64">
          <circle cx="24" cy="14" r="8" fill="var(--i1)" />
          <circle cx="36" cy="11" r="8" fill="var(--i2)" />
          <rect x="6" y="16" width="52" height="38" rx="11" fill="var(--i2)" />
          <rect x="6" y="44" width="52" height="10" rx="5" fill="#000" opacity=".16" />
          <rect x="32" y="28" width="26" height="15" rx="7.5" fill="var(--i3)" />
          <circle cx="45" cy="35.5" r="3.6" fill="var(--i1)" />
          <ellipse cx="21" cy="24" rx="11" ry="4.5" fill="#fff" opacity=".3" />
        </symbol>
        {/* WORK */}
        <symbol id="yk-i-folder" viewBox="0 0 64 64">
          <path d="M8 20a6 6 0 0 1 6-6h11l6 6h19a6 6 0 0 1 6 6v5H8z" fill="var(--i3)" />
          <rect x="21" y="21" width="24" height="14" rx="2.5" fill="#fff" opacity=".88" />
          <rect x="25" y="25" width="16" height="2.4" rx="1.2" fill="var(--i3)" opacity=".55" />
          <rect x="25" y="29.5" width="11" height="2.4" rx="1.2" fill="var(--i3)" opacity=".55" />
          <path d="M8 29h48v17a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="var(--i2)" />
          <path d="M8 46v0a6 6 0 0 0 6 6h32a6 6 0 0 0 6-6v-2H8z" fill="#000" opacity=".16" />
          <ellipse cx="22" cy="34" rx="12" ry="3.4" fill="#fff" opacity=".3" />
        </symbol>
        {/* APPROVE */}
        <symbol id="yk-i-bolt" viewBox="0 0 64 64">
          <path d="M38 9L18 39h12l-4 22 22-32H34z" fill="var(--i3)" />
          <path d="M34 5L14 35h12l-4 22 22-32H30z" fill="var(--i2)" />
          <path d="M34 5L14 35h6L40 8z" fill="#fff" opacity=".32" />
        </symbol>
        {/* PROTECTED */}
        <symbol id="yk-i-shield" viewBox="0 0 64 64">
          <path d="M32 5l21 7.5V28c0 13.5-9 21.5-21 27.5C20 49.5 11 41.5 11 28V12.5z" fill="var(--i2)" />
          <path d="M11 33c2.5 10.5 10 17 21 22.5 11-5.5 18.5-12 21-22.5-7 8.5-35 8.5-42 0z" fill="#000" opacity=".16" />
          <path d="M32 5l21 7.5v5.5L11 18v-5.5z" fill="#fff" opacity=".22" />
          <path d="M23 29.5l7 7 12-13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
        </symbol>
      </defs>
    </svg>
  );
}

const ESCROW_STEPS = [
  {
    n: "01",
    wordKey: "step1Title" as const,
    defaultWord: "Fund",
    wc: "#3f8ef0",
    iconId: "yk-i-wallet",
    i1: "#bcd9ff",
    i2: "#3f8ef0",
    i3: "#1d5fc0",
    rows: [
      {
        bold: "Balance locked in escrow",
        small: "Held safely — never sent until you approve",
        d: ".5s",
      },
      {
        bold: "Deposit · Telebirr 0911 ••• 421",
        small: "ETB 96,000 reserved for milestone 2 of 4",
        d: ".6s",
      },
      {
        bold: "Protection on",
        small: "Active from the second the deposit lands",
        d: ".7s",
      },
    ],
  },
  {
    n: "02",
    wordKey: "step2Title" as const,
    defaultWord: "Work",
    wc: "#a06bf5",
    iconId: "yk-i-folder",
    i1: "#e6d1ff",
    i2: "#a06bf5",
    i3: "#7a3fd0",
    rows: [
      {
        bold: "3 deliverables uploaded",
        small: "addis-cafe-menu.fig · launch-poster.pdf · amharic-copy.docx",
        d: ".5s",
      },
      {
        bold: "Review notes attached",
        small: "Context for every file, so feedback stays sharp",
        d: ".6s",
      },
      {
        bold: "48h review window",
        small: "Gentle reminders if a review goes quiet",
        d: ".7s",
      },
    ],
  },
  {
    n: "03",
    wordKey: "step3Title" as const,
    defaultWord: "Approve",
    wc: "#2fce77",
    iconId: "yk-i-bolt",
    i1: "#b9f6d0",
    i2: "#2fce77",
    i3: "#128a4d",
    rows: [
      {
        bold: "ETB 96,000 released to Selam T.",
        small: "One tap — paid straight to her Telebirr wallet",
        d: ".5s",
      },
      {
        bold: "Receipt issued automatically",
        small: "Telebirr receipt saved for both sides",
        d: ".6s",
      },
      {
        bold: "0-day wait",
        small: "No invoices, no chasing, no awkward emails",
        d: ".7s",
      },
    ],
  },
  {
    n: "04",
    wordKey: "step4Title" as const,
    defaultWord: "Protected",
    wc: "#f0b429",
    iconId: "yk-i-shield",
    i1: "#fdeaa8",
    i2: "#f0b429",
    i3: "#b4690e",
    rows: [
      {
        bold: "Yekis mediates with evidence",
        small: "Brief, versions and messages auto-collected",
        d: ".5s",
      },
      {
        bold: "Full audit trail",
        small: "Every revision and message, time-stamped",
        d: ".6s",
      },
      {
        bold: "Partial release only when fair",
        small: "Money moves exactly as the resolution says",
        d: ".7s",
      },
    ],
  },
];

function EscrowSection() {
  const { t, language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  const localizedRows = ESCROW_STEP_ROWS_BY_LANG[language] ?? ESCROW_STEP_ROWS_BY_LANG.en;
  const stageRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLElement | null)[]>([]);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stageInView = useSectionVisible(stageRef, "180px 0px");

  const isCard =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("card");

  /* Shrink each step word just enough to fit the column, so "Approve",
     "Protected" and their translations are never clipped by .mask. */
  useLayoutEffect(() => {
    const left = leftRef.current;
    if (!left) return;

    let alive = true;

    const fitWords = () => {
      if (!alive) return;
      left.querySelectorAll<HTMLElement>(".word").forEach((word) => {
        const mask = word.querySelector<HTMLElement>(".mask");
        const inner = word.querySelector<HTMLElement>(".mask-in");
        if (!mask || !inner) return;
        word.style.setProperty("--word-fit", "1");
        const available = mask.clientWidth;
        const natural = inner.scrollWidth;
        if (!available || !natural) return;
        const fit = natural > available ? (available / natural) * 0.98 : 1;
        word.style.setProperty("--word-fit", fit.toFixed(4));
      });
    };

    fitWords();
    const observer = new ResizeObserver(fitWords);
    observer.observe(left);
    document.fonts?.ready.then(fitWords).catch(() => {});

    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [t]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const words = wordRefs.current.filter(Boolean) as HTMLElement[];
    const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
    const ghosts = ghostRefs.current.filter(Boolean) as HTMLElement[];
    const glows = glowRefs.current.filter(Boolean) as HTMLElement[];
    const N = words.length;
    if (N === 0) return;

    let current = -1;

    const apply = (step: number) => {
      if (step === current) return;
      current = step;
      const setPos = (el: HTMLElement, i: number) => {
        el.dataset.pos = i === step ? "active" : i < step ? "past" : "future";
      };
      words.forEach(setPos);
      panels.forEach(setPos);
      ghosts.forEach(setPos);
      glows.forEach((g, i) => g.classList.toggle("on", i === step));
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      apply(0);
      return;
    }

    if (isCard) {
      let raf = 0;
      const LOOP_MS = 6000;
      const start = performance.now();
      const autoTick = (now: number) => {
        const tVal = ((now - start) % LOOP_MS) / LOOP_MS;
        const step = Math.min(N - 1, Math.floor(tVal * N));
        apply(step);
        raf = requestAnimationFrame(autoTick);
      };
      raf = requestAnimationFrame(autoTick);
      return () => cancelAnimationFrame(raf);
    }

    let stageTop = 0;
    let totalScrollable = 1;
    let raf = 0;

    const measure = () => {
      stageTop = stage.getBoundingClientRect().top + window.scrollY;
      totalScrollable = Math.max(1, stage.offsetHeight - window.innerHeight);
    };

    const updateFromScroll = () => {
      raf = 0;
      const passed = Math.min(Math.max(window.scrollY - stageTop, 0), totalScrollable);
      const p = passed / totalScrollable;
      apply(Math.min(N - 1, Math.floor(p * N + 1e-4)));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(updateFromScroll);
    };

    const onResize = () => {
      measure();
      updateFromScroll();
    };

    measure();
    updateFromScroll();

    let ro: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(onResize);
      ro.observe(stage);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [isCard]);

  return (
    <>
      <EscrowSvgDefs />
      <section
        ref={stageRef}
        className={`stage${stageInView ? " v2-inview" : ""}`}
        id="how-it-works"
        aria-label={extra.escrowAria}
      >
        <div className="stage-pin" id="pin">
          <div className="stage-glows" aria-hidden="true">
            <div ref={(el) => { glowRefs.current[0] = el; }} className="glow g1 on" />
            <div ref={(el) => { glowRefs.current[1] = el; }} className="glow g2" />
            <div ref={(el) => { glowRefs.current[2] = el; }} className="glow g3" />
            <div ref={(el) => { glowRefs.current[3] = el; }} className="glow g4" />
          </div>

          <div className="cols">
            {/* LEFT : bold topic */}
            <div className="col-left" ref={leftRef}>
              {ESCROW_STEPS.map((s, i) => (
                <div
                  key={`ghost-${s.n}`}
                  ref={(el) => { ghostRefs.current[i] = el; }}
                  className="ghost"
                  data-pos={i === 0 ? "active" : "future"}
                >
                  {s.n}
                </div>
              ))}

              {ESCROW_STEPS.map((s, i) => {
                const word = t.marketing.escrow[s.wordKey] || s.defaultWord;
                return (
                  <article
                    key={`word-${s.n}`}
                    ref={(el) => { wordRefs.current[i] = el; }}
                    className="word"
                    data-pos={i === 0 ? "active" : "future"}
                    style={{ "--wc": s.wc } as React.CSSProperties}
                  >
                    <span className="mask">
                      <span className="mask-in">
                        {word}
                        <i className="dot" />
                      </span>
                    </span>
                  </article>
                );
              })}
            </div>

            {/* RIGHT : details with 3D icons */}
            <div className="col-right">
              {ESCROW_STEPS.map((s, i) => (
                <article
                  key={`panel-${s.n}`}
                  ref={(el) => { panelRefs.current[i] = el; }}
                  className="stage-panel"
                  data-pos={i === 0 ? "active" : "future"}
                  style={{
                    "--i1": s.i1,
                    "--i2": s.i2,
                    "--i3": s.i3,
                  } as React.CSSProperties}
                >
                  <div className="hero st" style={{ "--d": ".34s" } as React.CSSProperties}>
                    <span className="float">
                      <svg className="hero-icon" viewBox="0 0 64 64">
                        <use href={`#${s.iconId}`} />
                      </svg>
                    </span>
                  </div>
                  <ul className="rows">
                    {s.rows.map((r, ri) => {
                      const rowCopy = localizedRows[i]?.[ri] ?? r;
                      return (
                        <li
                          key={`row-${ri}`}
                          className="st"
                          style={{ "--d": r.d } as React.CSSProperties}
                        >
                          <div>
                            <b>{rowCopy.bold}</b>
                            <small>{rowCopy.small}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────
   Fees
───────────────────────────────────────────────── */
function FeesSection() {
  const { language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  const feesRef = useRef<HTMLElement>(null);
  const feesInView = useSectionVisible(feesRef, "180px 0px");

  return (
    <section
      id="fees"
      ref={feesRef}
      className={`v2-fees-section${feesInView ? " v2-inview" : ""}`}
    >
      <Reveal dir="zoom" amount={0.14}>
        <HandWrittenTitle
          eyebrow={extra.feesEyebrow}
          title={extra.feesTitle}
          subtitle={extra.feesSubtitle}
        />
      </Reveal>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Categories — pinned editorial card stack
   ───────────────────────────────────────────────── */
const STK_Y_OFFSET = 3.2;
const STK_SCALE_STEP = 0.06;
const STK_ENTER_Y = 62;
const STK_ENTER_RX = -16;
const STK_ENTER_SCALE = 0.88;
const STK_CARD_MS = 950;
const STK_STAGGER_MS = 110;
const STK_TILT_X = 2.6;
const STK_TILT_Y = 3.4;
const STK_VEL_KICK = 240;
const STK_VEL_MAX = 6;
const STK_PARALLAX = 7;
const STK_CARD_LOOP_MS = 7000;
const STK_CARD_REVEAL_MS = 6000;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
const easeOutExpo = (t: number) => {
  const c = clamp(t, 0, 1);
  return c >= 1 ? 1 : 1 - Math.pow(2, -10 * c);
};

function CategoriesSection({ onStart }: { onStart: (m: "login" | "register") => void }) {
  const { t, language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  const rootRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLElement>(null);
  const catInView = useSectionVisible(rootRef, "240px 0px");

  const [activeIndex, setActiveIndex] = useState(0);
  const [hudOn, setHudOn] = useState(false);
  const [isReduced, setIsReduced] = useState(prefersReduced);

  const isCard =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("card");

  const cards = useMemo(
    () => [
      {
        num: "01",
        category: "Engineering",
        kicker: t.marketing.categories.c1Class || "01 / Engineering",
        title1: t.marketing.categories.c1Title1 || "Web & App",
        title2: t.marketing.categories.c1Title2 || "Development",
        roles: t.marketing.categories.c1Roles || "148 open roles",
        tag: t.marketing.categories.c1Tag || "Full\u2011stack \u00b7 Mobile \u00b7 API",
        bg: "#123f36",
        ac: "#5eead4",
        glow: "rgba(94,234,212,.20)",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        ),
      },
      {
        num: "02",
        category: "Design",
        kicker: t.marketing.categories.c2Class || "02 / Design",
        title1: t.marketing.categories.c2Title1 || "Graphic Design",
        title2: t.marketing.categories.c2Title2 || "& Branding",
        roles: t.marketing.categories.c2Roles || "96 open roles",
        tag: t.marketing.categories.c2Tag || "Identity \u00b7 Print \u00b7 UI",
        bg: "#332a5e",
        ac: "#b7a4fb",
        glow: "rgba(183,164,251,.20)",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" />
            <circle cx="17.5" cy="10.5" r=".5" />
            <circle cx="8.5" cy="7.5" r=".5" />
            <circle cx="6.5" cy="12.5" r=".5" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C19.965 6.012 15.463 2 12 2z" />
          </svg>
        ),
      },
      {
        num: "03",
        category: "Marketing",
        kicker: t.marketing.categories.c3Class || "03 / Marketing",
        title1: t.marketing.categories.c3Title1 || "Digital",
        title2: t.marketing.categories.c3Title2 || "Marketing",
        roles: t.marketing.categories.c3Roles || "74 open roles",
        tag: t.marketing.categories.c3Tag || "SEO \u00b7 Social \u00b7 Paid",
        bg: "#3c4510",
        ac: "#d3f16a",
        glow: "rgba(211,241,106,.18)",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </svg>
        ),
      },
      {
        num: "04",
        category: "Content",
        kicker: t.marketing.categories.c4Class || "04 / Content",
        title1: t.marketing.categories.c4Title1 || "Content &",
        title2: t.marketing.categories.c4Title2 || "Copywriting",
        roles: t.marketing.categories.c4Roles || "61 open roles",
        tag: t.marketing.categories.c4Tag || "Editorial \u00b7 UX \u00b7 Scripts",
        bg: "#0f3e3d",
        ac: "#6ee7d8",
        glow: "rgba(110,231,216,.20)",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19 7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        ),
      },
      {
        num: "05",
        category: "Language",
        kicker: t.marketing.categories.c5Class || "05 / Language",
        title1: t.marketing.categories.c5Title1 || "Amharic / English",
        title2: t.marketing.categories.c5Title2 || "Translation",
        roles: t.marketing.categories.c5Roles || "53 open roles",
        tag: t.marketing.categories.c5Tag || "Localisation \u00b7 Subtitling",
        bg: "#401d52",
        ac: "#e0aaff",
        glow: "rgba(224,170,255,.20)",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 8 6 6" />
            <path d="m4 14 6-6 2-3" />
            <path d="M2 5h12" />
            <path d="M7 2h1" />
            <path d="m22 22-5-10-5 10" />
            <path d="M14 18h6" />
          </svg>
        ),
      },
      {
        num: "06",
        category: "Data",
        kicker: t.marketing.categories.c6Class || "06 / Data",
        title1: t.marketing.categories.c6Title1 || "Data",
        title2: t.marketing.categories.c6Title2 || "Processing",
        roles: t.marketing.categories.c6Roles || "88 open roles",
        tag: t.marketing.categories.c6Tag || "Annotation \u00b7 ETL \u00b7 QA",
        bg: "#423610",
        ac: "#fde047",
        glow: "rgba(253,224,71,.18)",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14a9 3 0 0 0 18 0V5" />
            <path d="M3 12a9 3 0 0 0 18 0V5" />
          </svg>
        ),
      },
    ],
    [t]
  );

  const total = cards.length;
  const segment = 1 / Math.max(1, total - 1);

  const goToCard = (i: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
    const span = Math.max(1, wrap.offsetHeight - window.innerHeight);
    const p = i >= total - 1 ? 1 : i === 0 ? 0 : Math.min(1, i * segment + 0.002);
    window.scrollTo({
      top: wrapTop + p * span,
      behavior: prefersReduced() ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    const reduced = prefersReduced();
    setIsReduced(reduced);

    const wrap = wrapRef.current;
    const pin = pinRef.current;
    const stage = stageRef.current;
    const outro = outroRef.current;
    const cardEls = cardRefs.current.filter(Boolean) as HTMLElement[];
    const copyEls = copyRefs.current.filter(Boolean) as HTMLElement[];
    const mediaEls = mediaRefs.current.filter(Boolean) as HTMLElement[];

    if (!wrap || !pin || !stage || cardEls.length === 0) return;

    const introTotal = (total - 1) * STK_STAGGER_MS + STK_CARD_MS;
    let wrapTop = 0;
    let span = 1;
    let pinLeft = 0;
    let pinTop = 0;
    let pinWidth = 1;
    let pinHeight = 1;

    const measure = () => {
      wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      span = Math.max(1, wrap.offsetHeight - window.innerHeight);
      const pr = pin.getBoundingClientRect();
      pinLeft = pr.left + window.scrollX;
      pinTop = pr.top + window.scrollY;
      pinWidth = Math.max(1, pr.width);
      pinHeight = Math.max(1, pr.height);
    };
    measure();

    let ro: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(measure);
      ro.observe(wrap);
    }
    window.addEventListener("resize", measure, { passive: true });

    const deckPose = (
      i: number,
      p: number,
      out: { y: number; rx: number; sc: number; t: number }
    ) => {
      const active = Math.min(Math.floor(p / segment), total - 1);
      const segP = clamp((p - active * segment) / segment, 0, 1);
      if (i < active) {
        out.y = -250;
        out.rx = 35;
        out.sc = 1;
        out.t = 1;
        return active;
      }
      if (i === active) {
        out.y = lerp(-50, -200, segP);
        out.rx = lerp(0, 35, segP);
        out.sc = 1;
        out.t = segP;
        return active;
      }
      const behind = i - active;
      out.y = -50 + (behind - segP) * STK_Y_OFFSET;
      out.rx = 0;
      out.sc = 1 - (behind - segP) * STK_SCALE_STEP;
      out.t = 0;
      return active;
    };

    const pose = { y: 0, rx: 0, sc: 1, t: 0 };
    const render = (p: number, elapsed: number) => {
      let active = 0;
      cardEls.forEach((card, i) => {
        active = deckPose(i, p, pose);
        const e =
          elapsed >= introTotal
            ? 1
            : easeOutExpo((elapsed - i * STK_STAGGER_MS) / STK_CARD_MS);
        const y = lerp(STK_ENTER_Y, pose.y, e);
        const rx = lerp(STK_ENTER_RX, pose.rx, e);
        const sc = lerp(STK_ENTER_SCALE, pose.sc, e);
        card.style.opacity = clamp(e * 1.6, 0, 1).toFixed(3);
        card.style.transform = `translate3d(-50%, ${y.toFixed(2)}%, 0) rotateX(${rx.toFixed(
          2
        )}deg) scale(${sc.toFixed(3)})`;
        const tVal = pose.t * e;
        if (copyEls[i]) {
          copyEls[i].style.transform = `translate3d(0,${(tVal * -STK_PARALLAX).toFixed(2)}%,0)`;
        }
        if (mediaEls[i]) {
          mediaEls[i].style.transform = `translate3d(0,${(tVal * STK_PARALLAX).toFixed(
            2
          )}%,0) scale(${(1 - tVal * 0.05).toFixed(3)})`;
        }
      });
      return active;
    };

    let lastActive = -1;
    let didHudOn = false;

    const syncHud = (active: number) => {
      if (active !== lastActive) {
        lastActive = active;
        setActiveIndex(active);
      }
    };

    const progressFromScroll = () => clamp((window.scrollY - wrapTop) / span, 0, 1);

    let outroIO: IntersectionObserver | null = null;
    if (outro) {
      if (reduced || isCard) {
        outro.classList.add("is-active");
      } else if ("IntersectionObserver" in window) {
        outroIO = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                outro.classList.add("is-active");
              } else if (en.boundingClientRect.top > (window.innerHeight || 800)) {
                outro.classList.remove("is-active");
              }
            });
          },
          { threshold: 0.15 }
        );
        outroIO.observe(outro);
      } else {
        outro.classList.add("is-active");
      }
    }

    if (reduced) {
      const staticRender = () => {
        const p = isCard ? 0 : progressFromScroll();
        const active = render(p, Infinity);
        syncHud(active);
        if (!didHudOn) {
          didHudOn = true;
          setHudOn(true);
        }
      };
      staticRender();
      if (!isCard) window.addEventListener("scroll", staticRender, { passive: true });
      return () => {
        window.removeEventListener("resize", measure);
        if (!isCard) window.removeEventListener("scroll", staticRender);
        if (ro) ro.disconnect();
        if (outroIO) outroIO.disconnect();
      };
    }

    cardEls.forEach((c) => {
      c.style.opacity = "0";
    });

    let tx = 0;
    let ty = 0;
    let sx = 0;
    let sy = 0;
    let isNear = true;
    let raf = 0;

    let introStarted = isCard || wrap.getBoundingClientRect().top <= window.innerHeight * 0.92;
    let introStart = introStarted ? performance.now() : 0;

    const cardStart = performance.now();
    let lastP = progressFromScroll();
    let lastRenderedP = -1;
    let vel = 0;

    const loop = (now: number) => {
      raf = 0;
      if (!isCard && !isNear) return;

      if (!introStarted && window.scrollY + window.innerHeight * 0.95 >= wrapTop) {
        introStarted = true;
        introStart = now;
      }

      const elapsed = introStarted ? Math.max(0, now - introStart) : 0;
      let p: number;
      if (isCard) {
        const loopT = ((now - cardStart) % STK_CARD_LOOP_MS) / STK_CARD_LOOP_MS;
        const revealEnd = STK_CARD_REVEAL_MS / STK_CARD_LOOP_MS;
        p = loopT < revealEnd ? loopT / revealEnd : 1;
      } else {
        p = progressFromScroll();
      }

      vel = lerp(vel, clamp((p - lastP) * STK_VEL_KICK, -STK_VEL_MAX, STK_VEL_MAX), 0.14);
      lastP = p;
      sx = lerp(sx, tx, 0.09);
      sy = lerp(sy, ty, 0.09);

      const tiltX = vel - sy * STK_TILT_X;
      const tiltY = sx * STK_TILT_Y;
      stage.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

      const introRunning = introStarted && elapsed < introTotal;
      if (introRunning || Math.abs(p - lastRenderedP) > 1e-5) {
        lastRenderedP = p;
        const active = render(p, elapsed);
        syncHud(active);
      }

      if (elapsed >= introTotal && !didHudOn) {
        didHudOn = true;
        setHudOn(true);
      }

      const settled =
        !isCard &&
        (!introStarted || elapsed >= introTotal) &&
        Math.abs(vel) < 0.015 &&
        Math.abs(sx - tx) < 0.002 &&
        Math.abs(sy - ty) < 0.002 &&
        Math.abs(p - progressFromScroll()) < 1e-5;

      if (!settled) {
        raf = requestAnimationFrame(loop);
      } else {
        vel = 0;
        sx = tx;
        sy = ty;
        stage.style.transform = `rotateX(${(-sy * STK_TILT_X).toFixed(2)}deg) rotateY(${(
          sx * STK_TILT_Y
        ).toFixed(2)}deg)`;
      }
    };

    const ensureLoop = () => {
      if (!raf && (isCard || isNear)) {
        raf = requestAnimationFrame(loop);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const pinViewportTop = pinTop - window.scrollY;
      tx = ((e.clientX + window.scrollX - pinLeft) / pinWidth - 0.5) * 2;
      ty = ((e.clientY - pinViewportTop) / pinHeight - 0.5) * 2;
      ensureLoop();
    };
    const onPointerLeave = () => {
      tx = 0;
      ty = 0;
      ensureLoop();
    };

    let wrapIO: IntersectionObserver | null = null;
    if (!isCard && "IntersectionObserver" in window) {
      wrapIO = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            isNear = en.isIntersecting;
            if (en.isIntersecting) {
              if (!introStarted) {
                introStarted = true;
                introStart = performance.now();
              }
              ensureLoop();
            }
          }
        },
        { rootMargin: "250px 0px", threshold: 0.01 }
      );
      wrapIO.observe(wrap);
    }

    const onScroll = () => ensureLoop();

    if (!isCard) {
      window.addEventListener("scroll", onScroll, { passive: true });
      pin.addEventListener("pointermove", onPointerMove, { passive: true });
      pin.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }

    // Initial render so cards are positioned properly at current scroll offset
    const initActive = render(lastP, introStarted ? 0 : 0);
    syncHud(initActive);
    if (isNear || isCard) ensureLoop();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      if (!isCard) {
        window.removeEventListener("scroll", onScroll);
        pin.removeEventListener("pointermove", onPointerMove);
        pin.removeEventListener("pointerleave", onPointerLeave);
      }
      if (ro) ro.disconnect();
      if (wrapIO) wrapIO.disconnect();
      if (outroIO) outroIO.disconnect();
    };
  }, [isCard, segment, total]);

  const outroWords = useMemo(
    () => (t.marketing.categories.outroTitle || "Let's Build").split(" "),
    [t.marketing.categories.outroTitle]
  );

  return (
    <section
      ref={rootRef}
      className={`v2-section stk-root${catInView ? " v2-inview" : ""}`}
      id="categories"
      aria-label={extra.categoriesAria}
    >
      <div className="v2-container stk-section-head">
        <Reveal delay={0.04}>
          <h2 className="v2-sec-title">{t.marketing.categories.title}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="v2-sec-sub">{t.marketing.categories.subtitle}</p>
        </Reveal>
      </div>

      <div id="stk-wrap" className="stk-wrap" ref={wrapRef}>
        <section className="stk-pin" ref={pinRef} aria-label={extra.cardDeckAria}>
          <div className="stk-stage" ref={stageRef}>
            {cards.map((c, i) => {
              const isActive = isReduced || activeIndex === i;
              const categoryName = c.kicker.includes("/")
                ? c.kicker.split("/").slice(1).join("/").trim()
                : c.kicker;
              return (
                <article
                  key={c.num}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="stk-card"
                  data-category={c.category}
                  style={
                    {
                      background: c.bg,
                      "--ac": c.ac,
                      "--glow": c.glow,
                      zIndex: total - i,
                    } as React.CSSProperties
                  }
                  role="button"
                  tabIndex={isActive ? 0 : -1}
                  aria-hidden={isActive ? "false" : "true"}
                  aria-label={extra.browseCategoryAria(categoryName, c.title1, c.title2)}
                  onClick={() => onStart("register")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onStart("register");
                    }
                  }}
                >
                  <div
                    className="stk-col stk-copy"
                    ref={(el) => {
                      copyRefs.current[i] = el;
                    }}
                  >
                    <div>
                      <p className="k">{c.kicker}</p>
                      <h2>
                        {c.title1}
                        <br />
                        {c.title2}
                      </h2>
                    </div>
                    <div className="row">
                      <span className="roles">{c.roles}</span>
                      <span className="chip" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div
                    className="stk-col stk-media"
                    ref={(el) => {
                      mediaRefs.current[i] = el;
                    }}
                    aria-hidden="true"
                  >
                    <span className="tag">{c.tag}</span>
                    <span className="ic">{c.icon}</span>
                    <p className="num">{c.num}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={`stk-hud-right${hudOn ? " on" : ""}`}>
            <nav className="stk-dots" aria-label={extra.jumpToCategoryAria}>
              {cards.map((c, i) => {
                const categoryName = c.kicker.includes("/")
                  ? c.kicker.split("/").slice(1).join("/").trim()
                  : c.kicker;
                return (
                  <button
                    key={c.num}
                    type="button"
                    className="stk-dot"
                    title={`${c.title1} ${c.title2}`}
                    aria-label={extra.jumpToItemAria(categoryName)}
                    aria-current={activeIndex === i ? "true" : undefined}
                    onClick={() => goToCard(i)}
                  />
                );
              })}
            </nav>
            <div className="stk-count" aria-live="polite">
              <b>{String(activeIndex + 1).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}
            </div>
          </div>
        </section>
      </div>

      <section
        id="stk-outro"
        className="stk-flat stk-outro"
        ref={outroRef}
        role="complementary"
        aria-label={extra.ctaAria}
      >
        <div className="stk-outro-ambient" aria-hidden="true" />

        <h1
          className="stk-outro-title"
          aria-label={t.marketing.categories.outroTitle || "Let's Build"}
        >
          {outroWords.map((word, wi) => (
            <span key={`${word}-${wi}`} className="stk-word-wrap" aria-hidden="true">
              <span
                className="stk-word"
                style={{ "--wi": wi, "--total": outroWords.length } as React.CSSProperties}
              >
                {word}
              </span>
              {wi < outroWords.length - 1 && <span className="stk-word-space">&nbsp;</span>}
            </span>
          ))}
        </h1>

        <div className="stk-load-bar" aria-hidden="true">
          <div className="stk-load-bar-fill" />
        </div>

        <p className="stk-outro-sub">{t.marketing.categories.outroSubtitle}</p>

        <div className="stk-cta-row">
          <button
            className="stk-outro-btn"
            type="button"
            onClick={() => onStart("register")}
          >
            {t.nav.getStarted}
          </button>
          <button
            className="stk-outro-ghost"
            type="button"
            onClick={() => onStart("login")}
          >
            {t.nav.signIn}
          </button>
        </div>
      </section>
    </section>
  );
}


/* ─────────────────────────────────────────────────
   Testimonials — vertical review marquee
───────────────────────────────────────────────── */
const MARQUEE_DURATIONS = ["22s", "26s", "20s"];

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function TrustpilotMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill="#00b67a" />
      <path
        fill="#fff"
        d="M12 5.1l1.99 4.46 4.79.41-3.65 3.13 1.09 4.71L12 15.52l-4.22 2.29 1.09-4.71-3.65-3.13 4.79-.41L12 5.1z"
      />
    </svg>
  );
}

function ReviewCard({ review }: { review: MemberReview }) {
  const { language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  const [a1, a2] = REVIEW_TONES[review.tone];
  return (
    <article className="v2-testi-card">
      <span className="v2-testi-sheen" aria-hidden="true" />
      <div className="v2-testi-top">
        <V2Stars rating={review.rating} s={14} />
        <span className="v2-testi-src">
          {review.source === "google" ? <GoogleMark /> : <TrustpilotMark />}
          {review.source === "google" ? "Google" : "Trustpilot"}
        </span>
      </div>
      <blockquote className="v2-testi-text">&ldquo;{review.quote}&rdquo;</blockquote>
      <div className="v2-testi-who">
        <V2Avatar name={review.name} size={40} radius={12} h1={a1} h2={a2} />
        <div className="v2-testi-id">
          <span className="v2-testi-name">
            {review.name}
            <BadgeCheck size={13} aria-label={extra.verifiedMemberAria} />
          </span>
          <span className="v2-testi-meta">
            {review.meta} · {review.when}
          </span>
        </div>
      </div>
    </article>
  );
}

function TestimonialsSection() {
  const { t, language } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useSectionVisible(sectionRef, "180px 0px");
  const columns = useMemo(() => {
    const reviews = getLandingReviews(language);
    const cols: MemberReview[][] = [[], [], []];
    reviews.forEach((r, i) => cols[i % cols.length].push(r));
    return cols;
  }, [language]);

  return (
    <section
      ref={sectionRef}
      className={`v2-section v2-testi${inView ? " v2-inview" : ""}`}
      aria-labelledby="v2-testi-title"
    >
      <div className="v2-testi-aurora" aria-hidden="true" />
      <div className="v2-container">
        <div className="v2-center">
          <Reveal delay={0.04}>
            <h2 className="v2-sec-title" id="v2-testi-title">
              {t.marketing.testimonials.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="v2-sec-sub v2-testi-sub">
              {t.marketing.testimonials.subtitle}
            </p>
          </Reveal>
        </div>

        <Reveal dir="up" amount={0.08} delay={0.08}>
          <div className="v2-testi-marquee">
            {columns.map((col, i) => (
              <div
                className={`v2-testi-col c${i + 1}${i === 1 ? " rev" : ""}`}
                key={`col-${i}`}
                style={{ "--v2-dur": MARQUEE_DURATIONS[i] } as React.CSSProperties}
              >
                <div className="v2-testi-track">
                  <div className="v2-testi-copy">
                    {col.map((r) => (
                      <ReviewCard key={r.name} review={r} />
                    ))}
                  </div>
                  <div className="v2-testi-copy" aria-hidden="true">
                    {col.map((r) => (
                      <ReviewCard key={`${r.name}-loop`} review={r} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <p className="v2-testi-hint">{t.marketing.testimonials.hint}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   About / Studio — editorial split layout
───────────────────────────────────────────────── */
function AboutSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t, language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  const aboutFeatures = [
    { n: "01", title: t.marketing.about.feature1Title, body: t.marketing.about.feature1Desc },
    { n: "02", title: t.marketing.about.feature2Title, body: t.marketing.about.feature2Desc },
    { n: "03", title: t.marketing.about.feature3Title, body: t.marketing.about.feature3Desc },
  ];

  return (
    <section className="v2-section v2-about" id="about" aria-labelledby="v2-about-title">
      <div className="v2-container">
        <Reveal amount={0.15}>
          <div className="v2-about-panel">
            {/* Left: copy + highlights */}
            <div className="v2-about-content">
              <span className="v2-about-eyebrow">{t.marketing.about.eyebrow}</span>

              <h2 className="v2-about-title" id="v2-about-title">
                {t.marketing.about.title1}
                <br />
                {t.marketing.about.title2}
              </h2>

              <p className="v2-about-intro">
                {t.marketing.about.intro}
              </p>

              <div className="v2-about-features">
                {aboutFeatures.map((feature) => (
                  <article className="v2-about-feature" key={feature.n}>
                    <span className="v2-about-feature-num" aria-hidden="true">{feature.n}</span>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.body}</p>
                    </div>
                  </article>
                ))}
              </div>

              <button className="v2-btn v2-btn-primary v2-about-btn" onClick={() => onNavigate("about")}>
                <span className="v2-shine" />
                <span>{t.marketing.about.btn}</span>
                <ArrowUpRight size={16} className="v2-about-btn-arrow" />
              </button>
            </div>

            {/* Right: Lottie business handshake & escrow payment animation */}
            <div
              className="v2-about-visual"
              aria-label={extra.aboutVideoAria}
            >
              <video
                className="v2-about-lottie-video"
                autoPlay
                loop
                muted
                playsInline
                poster="/lottie/escrow-deal.gif"
                aria-label={extra.aboutVideoAria}
              >
                <source src="/lottie/escrow-deal.webm" type="video/webm" />
                <img
                  src="/lottie/escrow-deal.gif"
                  alt={extra.aboutVideoAria}
                  loading="eager"
                  className="v2-about-lottie-fallback"
                />
              </video>
              <div className="v2-about-visual-bar">
                <span>{t.marketing.about.visualEscrow}</span>
                <span>{t.marketing.about.visualKyc}</span>
                <span>{t.marketing.about.visualMediation}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   FAQ
───────────────────────────────────────────────── */
function FAQSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const faqVisible = useSectionVisible(sectionRef, "0px 0px", 0.12, true);
  const faqInView = useSectionVisible(sectionRef, "160px 0px");

  /* rows are flattened on the way in so one index drives the whole list —
     the open state, the --i stagger and the filter all key off it */
  const rows = useMemo(() => {
    const groups = [
      {
        cat: t.marketing.faq.trustTitle,
        items: [
          { q: t.marketing.faq.q1, a: t.marketing.faq.a1 },
          { q: t.marketing.faq.q2, a: t.marketing.faq.a2 },
          { q: t.marketing.faq.q3, a: t.marketing.faq.a3 },
        ],
      },
      {
        cat: t.marketing.faq.startTitle,
        items: [
          { q: t.marketing.faq.q5, a: t.marketing.faq.a5 },
          { q: t.marketing.faq.q7, a: t.marketing.faq.a7, link: "fees" },
          { q: t.marketing.faq.q8, a: t.marketing.faq.a8 },
        ],
      },
      {
        cat: t.marketing.faq.paidTitle,
        items: [
          { q: t.marketing.faq.q9, a: t.marketing.faq.a9 },
          { q: t.marketing.faq.q11, a: t.marketing.faq.a11 },
        ],
      },
    ];
    const out: {
      key: string;
      g: number;
      cat?: string;
      q?: string;
      a?: string;
      link?: string;
    }[] = [];
    groups.forEach((g, gi) => {
      out.push({ key: `cat-${gi}`, g: gi, cat: g.cat });
      g.items.forEach((it, ii) => {
        out.push({ key: `q-${gi}-${ii}`, g: gi, q: it.q, a: it.a, link: it.link });
      });
    });
    return out;
  }, [t]);

  const [openKey, setOpenKey] = useState<string | null>("q-0-0");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  const needle = query.trim().toLowerCase();
  const matched = useMemo(
    () =>
      rows.filter((r) => {
        if (r.cat) return false;
        if (!needle) return true;
        return `${r.q} ${r.a}`.toLowerCase().includes(needle);
      }),
    [rows, needle]
  );
  /* a category marker only rides along while its group still has a hit */
  const visible = useMemo(() => {
    const live = new Set(matched.map((r) => r.g));
    return rows.filter((r) => (r.cat ? live.has(r.g) : matched.includes(r)));
  }, [rows, matched]);
  const shown = matched.length;

  /* "/" focuses the filter from anywhere on the page */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = (key: string, question: string) => {
    if (openKey !== key) events.faqExpanded(question);
    setOpenKey(openKey === key ? null : key);
  };

  /* every visible non-category row, numbered for the entrance stagger */
  let i = 0;

  return (
    <section
      className={`v2-faq${faqVisible ? " is-visible" : ""}${faqInView ? " v2-inview" : ""}`}
      id="faq"
      ref={sectionRef}
      aria-labelledby="v2-faq-title"
    >
      {/* ambient motion layer */}
      <div className="v2-faq-blobs" aria-hidden="true">
        <span className="v2-faq-blob b1" />
        <span className="v2-faq-blob b2" />
        <span className="v2-faq-blob b3" />
      </div>

      <div className="v2-faq-leaves" aria-hidden="true">
        <span className="v2-faq-leaf l1">
          <svg width="22" height="30" viewBox="0 0 24 32">
            <path d="M12 1C20 9 22 20 12 31C2 20 4 9 12 1Z" fill="var(--v2-primary)" opacity=".55" />
            <path d="M12 6V27" stroke="var(--v2-primary-ink)" strokeWidth="1.2" opacity=".6" />
          </svg>
        </span>
        <span className="v2-faq-leaf l2">
          <svg width="16" height="22" viewBox="0 0 24 32">
            <path d="M12 1C20 9 22 20 12 31C2 20 4 9 12 1Z" fill="var(--v2-primary)" opacity=".45" />
          </svg>
        </span>
        <span className="v2-faq-leaf l3">
          <svg width="20" height="27" viewBox="0 0 24 32">
            <path d="M12 1C20 9 22 20 12 31C2 20 4 9 12 1Z" fill="var(--v2-primary)" opacity=".35" />
            <path d="M12 6V27" stroke="var(--v2-bg2)" strokeWidth="1.1" opacity=".5" />
          </svg>
        </span>
        <span className="v2-faq-leaf l4">
          <svg width="14" height="19" viewBox="0 0 24 32">
            <path d="M12 1C20 9 22 20 12 31C2 20 4 9 12 1Z" fill="var(--v2-primary)" opacity=".4" />
          </svg>
        </span>
        <span className="v2-faq-leaf l5">
          <svg width="18" height="25" viewBox="0 0 24 32">
            <path d="M12 1C20 9 22 20 12 31C2 20 4 9 12 1Z" fill="var(--v2-primary)" opacity=".45" />
            <path d="M12 6V27" stroke="var(--v2-primary-ink)" strokeWidth="1.1" opacity=".55" />
          </svg>
        </span>
      </div>

      <div className="v2-faq-card">
        {/* LEFT : search + wordmark */}
        <div className="v2-faq-left">
          <div className="v2-faq-searchrow">
            <svg className="v2-faq-lens" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.2" cy="10.2" r="7.2" />
              <line x1="15.6" y1="15.6" x2="21.5" y2="21.5" />
            </svg>
            <label className="v2-faq-search">
              <input
                ref={inputRef}
                type="search"
                placeholder={t.marketing.faq.searchPlaceholder}
                aria-label={t.marketing.faq.searchPlaceholder}
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setTick((n) => n + 1);
                }}
              />
              <kbd>/</kbd>
            </label>
          </div>

          <h2 className="v2-faq-title" id="v2-faq-title">
            <span>F</span>
            <span>A</span>
            <span>Q</span>
            <span className="v2-faq-dot" aria-hidden="true" />
          </h2>

          <p className="v2-faq-tag">{t.marketing.faq.subtitle}</p>

          {/* arc divider */}
          <div className="v2-faq-arcwrap" aria-hidden="true">
            <svg viewBox="0 0 200 620" preserveAspectRatio="none">
              <motion.path
                d="M8 6 C 196 150, 196 470, 8 614"
                initial={{ pathLength: prefersReduced() ? 1 : 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: 0.04, ease: EASE }}
              />
            </svg>
            <span className="v2-faq-arcdot" />
          </div>
        </div>

        {/* RIGHT : questions */}
        <div className="v2-faq-right">
          {shown === 0 ? (
            <p className="v2-faq-empty" aria-live="polite">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21v-8M12 13c0-4 3-7 7-7 0 4-3 7-7 7ZM12 13c0-4-3-7-7-7 0 4 3 7 7 7Z" />
              </svg>
              <br />
              {t.marketing.faq.noResults}
            </p>
          ) : (
            <ul className="v2-faq-list" key={tick}>
              {visible.map((r) => {
                if (r.cat) {
                  return (
                    <li key={r.key} className="v2-faq-cat" style={{ ["--i" as string]: i++ }}>
                      <span className="v2-faq-catname">{r.cat}</span>
                    </li>
                  );
                }
                const isOpen = openKey === r.key;
                return (
                  <li
                    key={r.key}
                    className={isOpen ? "open" : ""}
                    style={{ ["--i" as string]: i++ }}
                  >
                    <button
                      className="v2-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => toggle(r.key!, r.q!)}
                    >
                      <span>{r.q}</span>
                      <span className="v2-faq-chip">
                        <svg viewBox="0 0 14 14" aria-hidden="true">
                          <path d="M7 2v10M3 8.5 7 12l4-3.5" />
                        </svg>
                      </span>
                    </button>
                    <div className="v2-faq-a">
                      <div>
                        <p>
                          {r.a}
                          {r.link === "fees" && (
                            <button
                              className="v2-faq-link"
                              onClick={() => onNavigate("fees")}
                            >
                              {t.marketing.faq.viewFees}
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Final CTA — pointer-tracked spotlight panel
───────────────────────────────────────────────── */
function FinalCTASection({ onStart }: { onStart: (m: "login" | "register") => void }) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLElement | null>(null);
  const ctaVisible = useSectionVisible(panelRef, "0px 0px", 0.14, true);
  const ctaInView = useSectionVisible(panelRef, "160px 0px");

  /* the spotlight gradient follows the pointer across the panel */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let raf = 0;
    let lastX = 0;
    let lastY = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = panel.getBoundingClientRect();
        if (!r.width || !r.height) return;
        panel.style.setProperty(
          "--mouse-x",
          `${((lastX - r.left) / r.width) * 100}%`,
        );
        panel.style.setProperty(
          "--mouse-y",
          `${((lastY - r.top) / r.height) * 100}%`,
        );
      });
    };
    const onLeave = () => {
      panel.style.setProperty("--mouse-x", "50%");
      panel.style.setProperty("--mouse-y", "0%");
    };
    panel.addEventListener("pointermove", onMove, { passive: true });
    panel.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section
      className={`v2-outro-cta${ctaVisible ? " is-visible" : ""}${ctaInView ? " v2-inview" : ""}`}
      id="ready"
      ref={panelRef}
      aria-labelledby="ready-heading"
    >
      <span className="v2-outro-ambient" aria-hidden />
      <span className="v2-outro-light v2-outro-light-a" aria-hidden />
      <span className="v2-outro-light v2-outro-light-b" aria-hidden />
      <span className="v2-outro-noise" aria-hidden />

      <span className="v2-outro-float v2-outro-float-a" aria-hidden>
        <Shield />
      </span>
      <span className="v2-outro-float v2-outro-float-b" aria-hidden>
        <WalletCards />
      </span>

      <div className="v2-outro-cta-inner">
        <h2 id="ready-heading">{t.marketing.cta.title}</h2>
        <p>
          {t.marketing.cta.subtitle}
        </p>
        <div className="v2-outro-actions">
          <button
            className="v2-outro-btn v2-outro-btn-primary"
            onClick={() => onStart("register")}
          >
            <span className="v2-outro-shine" aria-hidden />
            <Briefcase />
            <span>{t.marketing.cta.postJob}</span>
          </button>
          <button
            className="v2-outro-btn v2-outro-btn-ghost"
            onClick={() => onStart("register")}
          >
            <Award />
            <span>{t.marketing.cta.findWork}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Back to Top
───────────────────────────────────────────────── */
function BackToTop() {
  const { language } = useI18n();
  const extra = LANDING_V2_EXTRA[language] ?? LANDING_V2_EXTRA.en;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className="yk-v2-to-top"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" })}
          aria-label={extra.backToTopAria}
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────
   Shared scroll-reactive ambient background layer
───────────────────────────────────────────────── */
function ScrollAmbientCanvas({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="v2-ambient-canvas" ref={canvasRef} aria-hidden="true">
      <span className="v2-ambient-orb v2-ambient-orb-1" />
      <span className="v2-ambient-orb v2-ambient-orb-2" />
      <span className="v2-ambient-orb v2-ambient-orb-3" />
      <span className="v2-ambient-wash" />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Root export
───────────────────────────────────────────────── */
export function LandingPageV2({ onStart, onNavigate }: LandingPageV2Props) {
  const ambientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ambientRef.current;
    if (!canvas) return;

    const setVars = (p: number) => {
      const clamped = Math.max(0, Math.min(1, p));
      const x1 = Math.sin(clamped * Math.PI * 2.2) * 14;
      const y1 = Math.cos(clamped * Math.PI * 1.6) * 10 - clamped * 10;
      const x2 = Math.cos(clamped * Math.PI * 1.8) * -15;
      const y2 = Math.sin(clamped * Math.PI * 2.0) * 11 + clamped * 8;
      const x3 = Math.sin(clamped * Math.PI * 2.6 + 1.1) * 12;
      const y3 = Math.cos(clamped * Math.PI * 2.1 + 0.6) * -9;
      const wy = clamped * 32 - 16;

      const em = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(clamped * Math.PI * 1.7 - 0.3));
      const tl = 0.52 + 0.48 * (0.5 + 0.5 * Math.cos(clamped * Math.PI * 2.4));
      const vl = 0.36 + 0.54 * (0.5 + 0.5 * Math.sin(clamped * Math.PI * 3.0 + 0.8));

      canvas.style.setProperty("--amb-x1", `${x1.toFixed(2)}vw`);
      canvas.style.setProperty("--amb-y1", `${y1.toFixed(2)}vh`);
      canvas.style.setProperty("--amb-x2", `${x2.toFixed(2)}vw`);
      canvas.style.setProperty("--amb-y2", `${y2.toFixed(2)}vh`);
      canvas.style.setProperty("--amb-x3", `${x3.toFixed(2)}vw`);
      canvas.style.setProperty("--amb-y3", `${y3.toFixed(2)}vh`);
      canvas.style.setProperty("--amb-wy", `${wy.toFixed(2)}vh`);
      canvas.style.setProperty("--amb-em", em.toFixed(3));
      canvas.style.setProperty("--amb-tl", tl.toFixed(3));
      canvas.style.setProperty("--amb-vl", vl.toFixed(3));
    };

    if (prefersReduced()) {
      setVars(0.15);
      return;
    }

    let curP = 0;
    let targetP = 0;
    let maxScroll = 1;
    let raf = 0;

    const measureBounds = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetP = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    };

    const tick = () => {
      raf = 0;
      const diff = targetP - curP;
      if (Math.abs(diff) < 0.0005) {
        curP = targetP;
        setVars(curP);
        return;
      }
      curP += diff * 0.1;
      setVars(curP);
      raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      targetP = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      measureBounds();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    measureBounds();
    curP = targetP;
    setVars(curP);

    let ro: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(onResize);
      ro.observe(document.documentElement);
    }
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="yk-v2">
      {/* Shared scroll-reactive background canvas */}
      <ScrollAmbientCanvas canvasRef={ambientRef} />

      {/* Hero */}
      <HeroSection onStart={onStart} />

      {/* How it works / Escrow */}
      <EscrowSection />

      {/* Fees */}
      <FeesSection />

      {/* Categories */}
      <CategoriesSection onStart={onStart} />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* About / Studio split */}
      <AboutSection onNavigate={onNavigate} />

      {/* FAQ */}
      <FAQSection onNavigate={onNavigate} />

      {/* Final CTA */}
      <FinalCTASection onStart={onStart} />

      {/* Footer */}
      <FooterV2 onNavigate={onNavigate} />

      {/* Utilities */}
      <BackToTop />
      <Toasts />

      {/* Floating guest support chat */}
      <LandingSupportChat />
    </div>
  );
}
