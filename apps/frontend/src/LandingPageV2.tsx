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
import { events } from "./analytics";
import { useI18n } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";
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


type ReviewSource = "google" | "trustpilot";

type MemberReview = {
  source: ReviewSource;
  rating: number;
  quote: string;
  name: string;
  meta: string;
  when: string;
  tone: 1 | 2 | 3 | 4 | 5;
};

const REVIEWS: MemberReview[] = [
  {
    source: "google",
    rating: 5,
    quote:
      "As a freelancer in Bahir Dar, getting paid used to be the hardest part. Now funds land in my wallet the moment the client approves.",
    name: "Abel T.",
    meta: "Full-stack developer",
    when: "2 weeks ago",
    tone: 1,
  },
  {
    source: "trustpilot",
    rating: 5,
    quote:
      "Escrow on every contract means I never chase invoices again. The payout to my local bank is quicker than my old platform ever managed.",
    name: "Meron G.",
    meta: "Brand designer · Addis Ababa",
    when: "a month ago",
    tone: 2,
  },
  {
    source: "google",
    rating: 4,
    quote:
      "Clear milestones, clear fees, no surprises. Support answered my payout question in Amharic within the hour — that meant a lot.",
    name: "Dawit B.",
    meta: "Mobile developer",
    when: "3 weeks ago",
    tone: 3,
  },
  {
    source: "trustpilot",
    rating: 5,
    quote:
      "We hired three developers through YEKIS last quarter. Approving a milestone releases payment instantly; our contractors stopped asking about delays.",
    name: "Hanna L.",
    meta: "Startup founder",
    when: "2 months ago",
    tone: 4,
  },
  {
    source: "google",
    rating: 5,
    quote:
      "The wallet view is the best part — pending, escrowed and released amounts at a glance. Invoicing used to take me a whole evening.",
    name: "Samuel K.",
    meta: "Data analyst · Hawassa",
    when: "a week ago",
    tone: 5,
  },
  {
    source: "trustpilot",
    rating: 5,
    quote:
      "Dispute handling was fair and fast when scope changed mid-project. Both sides saw exactly what was agreed in the milestone trail.",
    name: "Lidia F.",
    meta: "Content strategist",
    when: "3 months ago",
    tone: 1,
  },
  {
    source: "google",
    rating: 5,
    quote:
      "I switched from Upwork because the fees were eating me alive. YEKIS is transparent about what I pay and clients see the same numbers.",
    name: "Yonas M.",
    meta: "DevOps engineer",
    when: "5 days ago",
    tone: 2,
  },
  {
    source: "trustpilot",
    rating: 4,
    quote:
      "Onboarding my studio took one afternoon. Contracts, escrow and payouts in one place — my accountant is happier too.",
    name: "Betty A.",
    meta: "Studio owner · Mekelle",
    when: "6 weeks ago",
    tone: 3,
  },
  {
    source: "google",
    rating: 5,
    quote:
      "Client approved at 9pm, money was in my wallet before I closed the laptop. That has never happened to me on any other platform.",
    name: "Kalid H.",
    meta: "Flutter developer",
    when: "4 days ago",
    tone: 4,
  },
  {
    source: "google",
    rating: 5,
    quote:
      "I funded escrow on a Friday and the first milestone was approved by Tuesday. No chasing, no awkward money conversations.",
    name: "Hanna G.",
    meta: "Founder, import & retail",
    when: "3 days ago",
    tone: 5,
  },
  {
    source: "trustpilot",
    rating: 5,
    quote:
      "We had one disagreement about scope. Support reviewed the brief and messages and settled it in two days — fairly.",
    name: "Sara M.",
    meta: "Marketing lead, NGO",
    when: "1 month ago",
    tone: 1,
  },
  {
    source: "google",
    rating: 5,
    quote:
      "Milestones, invoices and payouts live in the same tab now. My clients see exactly where every birr is sitting.",
    name: "Nardos A.",
    meta: "Backend engineer · Dire Dawa",
    when: "2 weeks ago",
    tone: 2,
  },
];

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
  amount = 0.08,
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
      ? { opacity: 0, x: -18 }
      : dir === "right"
        ? { opacity: 0, x: 18 }
        : dir === "zoom"
          ? { opacity: 0, scale: 0.97 }
          : { opacity: 0, y: 16 };
  return (
    <motion.div
      className={className}
      style={style}
      initial={hidden}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.26, delay: Math.min(delay, 0.06), ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* Per-letter spring title with hover "pop" (Floating Paths hero) */
function SpringTitle({
  text,
  settled,
  className,
}: {
  text: string;
  settled: boolean;
  className?: string;
}) {
  const words = text.split(" ");
  let idx = 0;
  return (
    <h1
      className={`v2-hero-title${settled ? " settled" : ""}${className ? ` ${className}` : ""}`}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span className="v2-word" key={`${word}-${wi}`} aria-hidden="true">
          {word.split("").map((ch) => {
            const myIdx = idx++;
            return (
              <span
                className="v2-letter"
                key={`${ch}-${myIdx}`}
                style={
                  {
                    "--d": `${(myIdx * 0.007).toFixed(3)}s`,
                    "--i": myIdx,
                  } as React.CSSProperties
                }
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
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
  return (
    <span style={{ display: "flex", gap: 3, color: "var(--v2-primary)" }} aria-label={`${rating} out of 5`}>
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
  const layerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(prefersReduced);

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
    <section className="v2-hero" id="top">
      {/* ambient glow orbs */}
      <div className="v2-fp-glow v2-fp-glow-one" />
      <div className="v2-fp-glow v2-fp-glow-two" />

      {/* floating path field */}
      <div className="v2-fp-layer" ref={layerRef}>
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* hero content */}
      <div className="v2-hero-inner" ref={innerRef}>
        {/* Dynamic Spring Title */}
        <SpringTitle text={t.marketing.hero.title} settled={settled} />

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
        bold: "Deposit · Visa •• 4021",
        small: "$2,400.00 reserved for milestone 2 of 4",
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
        small: "homepage-v2.fig · copy-deck.pdf · launch-notes.md",
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
        bold: "$2,400.00 released to @dana",
        small: "One tap — funds leave escrow instantly",
        d: ".5s",
      },
      {
        bold: "Receipt issued automatically",
        small: "Payout record saved to both sides",
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
        bold: "Support mediates with evidence",
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
  const { t } = useI18n();
  const stageRef = useRef<HTMLElement>(null);
  const wordRefs = useRef<(HTMLElement | null)[]>([]);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isCard =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("card");

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

    let raf = 0;

    if (isCard) {
      const LOOP_MS = 6000;
      const start = performance.now();
      const autoTick = (now: number) => {
        const t = ((now - start) % LOOP_MS) / LOOP_MS;
        const step = Math.min(N - 1, Math.floor(t * N));
        apply(step);
        raf = requestAnimationFrame(autoTick);
      };
      raf = requestAnimationFrame(autoTick);
      return () => cancelAnimationFrame(raf);
    }

    const progress = () => {
      const rect = stage.getBoundingClientRect();
      const total = stage.offsetHeight - window.innerHeight;
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
      return total > 0 ? passed / total : 0;
    };

    const tick = () => {
      apply(Math.min(N - 1, Math.floor(progress() * N + 1e-4)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isCard]);

  return (
    <>
      <EscrowSvgDefs />
      <section
        ref={stageRef}
        className="stage"
        id="how-it-works"
        aria-label="How YEKIS works, step by step"
      >
        <div className="stage-pin" id="pin">
          <div ref={(el) => { glowRefs.current[0] = el; }} className="glow g1 on" />
          <div ref={(el) => { glowRefs.current[1] = el; }} className="glow g2" />
          <div ref={(el) => { glowRefs.current[2] = el; }} className="glow g3" />
          <div ref={(el) => { glowRefs.current[3] = el; }} className="glow g4" />

          <div className="cols">
            {/* LEFT : bold topic */}
            <div className="col-left">
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
                    {s.rows.map((r, ri) => (
                      <li
                        key={`row-${ri}`}
                        className="st"
                        style={{ "--d": r.d } as React.CSSProperties}
                      >
                        <div>
                          <b>{r.bold}</b>
                          <small>{r.small}</small>
                        </div>
                      </li>
                    ))}
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
  return (
    <section id="fees">
      <HandWrittenTitle
        eyebrow="Yekis Jobs"
        title="Make ideas visible."
        subtitle="Where verified Ethiopian talent and ambitious teams build together — protected by escrow from day one."
      />
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Categories — pinned editorial card stack
───────────────────────────────────────────────── */
const STK_Y_OFFSET = 5; // % each waiting card sits below the one in front
const STK_SCALE_STEP = 0.075; // each waiting card is this much smaller
const STK_LOOP_MS = 7000;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

function CategoriesSection({ onStart }: { onStart: (m: "login" | "register") => void }) {
  const { t } = useI18n();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);

  const isCard =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("card");

  const cards = [
    {
      kicker: t.marketing.categories.c1Class,
      title: `${t.marketing.categories.c1Title1} ${t.marketing.categories.c1Title2}`,
      img: "/stack/img-1.jpg",
      bg: "#c75a35",
    },
    {
      kicker: t.marketing.categories.c2Class,
      title: `${t.marketing.categories.c2Title1} ${t.marketing.categories.c2Title2}`,
      img: "/stack/img-2.jpg",
      bg: "#1f4d4a",
    },
    {
      kicker: t.marketing.categories.c3Class,
      title: `${t.marketing.categories.c3Title1} ${t.marketing.categories.c3Title2}`,
      img: "/stack/img-3.jpg",
      bg: "#2d2a66",
    },
    {
      kicker: t.marketing.categories.c4Class,
      title: `${t.marketing.categories.c4Title1} ${t.marketing.categories.c4Title2}`,
      img: "/stack/img-4.jpg",
      bg: "#0e3f36",
    },
    {
      kicker: t.marketing.categories.c5Class,
      title: `${t.marketing.categories.c5Title1} ${t.marketing.categories.c5Title2}`,
      img: "/stack/img-5.jpg",
      bg: "#4a224f",
    },
    {
      kicker: t.marketing.categories.c6Class,
      title: `${t.marketing.categories.c6Title1} ${t.marketing.categories.c6Title2}`,
      img: "/stack/img-6.jpg",
      bg: "#1a1613",
    },
  ];

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const cardEls = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const total = cardEls.length;
    if (total === 0) return;
    const segment = 1 / total;
    const outro = outroRef.current;

    // Write the deck for a given normalised progress p∈[0,1].
    const render = (p: number) => {
      const active = Math.min(Math.floor(p / segment), total - 1);
      const segP = (p - active * segment) / segment;

      cardEls.forEach((card, i) => {
        let y: number;
        let rx: number;
        let scale: number;
        if (i < active) {
          y = -250;
          rx = 35;
          scale = 1;
        } else if (i === active) {
          y = lerp(-50, -200, segP);
          rx = lerp(0, 35, segP);
          scale = 1;
        } else {
          const behind = i - active;
          y = -50 + (behind - segP) * STK_Y_OFFSET;
          rx = 0;
          scale = 1 - (behind - segP) * STK_SCALE_STEP;
        }
        card.style.transform = `translate(-50%, ${y}%) rotateX(${rx.toFixed(
          2
        )}deg) scale(${scale.toFixed(3)})`;
      });
    };

    if (reduced) {
      render(0);
      outro?.classList.add("is-active");
      return;
    }

    let raf = 0;

    if (isCard) {
      // No scroll inside the card — auto-play the timeline on a loop.
      const start = performance.now();
      const tick = (now: number) => {
        const t = ((now - start) % STK_LOOP_MS) / STK_LOOP_MS;
        // ease through the reveal (first ~0.86), then hold on the last frame
        const revealEnd = 6000 / STK_LOOP_MS;
        const p = t < revealEnd ? t / revealEnd : 1;
        render(clamp(p, 0, 1));
        if (p >= 0.96) {
          outro?.classList.add("is-active");
        } else {
          outro?.classList.remove("is-active");
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    // IntersectionObserver triggers word loading animation as outro enters
    let io: IntersectionObserver | null = null;
    if (outro && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              outro.classList.add("is-active");
            } else if (entry.boundingClientRect.top > (window.innerHeight || 800)) {
              outro.classList.remove("is-active");
            }
          });
        },
        { threshold: 0.15 }
      );
      io.observe(outro);
    }

    // Standalone: drive by the pinned wrapper's scroll position.
    let autoScrolled = false;
    const wrap = wrapRef.current || document.getElementById("stk-wrap");
    const tick = () => {
      if (wrap) {
        const top = wrap.getBoundingClientRect().top;
        const span = wrap.offsetHeight - window.innerHeight;
        const p = clamp(-top / span, 0, 1);
        render(p);

        // Bring the "Let's Build" section automatically with clean motion when the cards finish dealing
        if (p >= 0.96 && !autoScrolled && outro) {
          autoScrolled = true;
          outro.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (p < 0.82) {
          autoScrolled = false;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (io) io.disconnect();
    };
  }, [isCard, cards.length]);

  const stage = (
    <div className="stk-stage">
      {cards.map((c, i) => (
        <div
          key={c.kicker}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="stk-card"
          style={{ background: c.bg, zIndex: cards.length - i, cursor: "pointer" }}
          onClick={() => onStart("register")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onStart("register");
            }
          }}
          aria-label={`Browse ${c.kicker}: ${c.title}`}
        >
          <div className="stk-col stk-copy">
            <p>{c.kicker}</p>
            <h2>{c.title}</h2>
          </div>
          <div className="stk-col stk-media">
            <div
              className="stk-img"
              style={{ backgroundImage: `url(${c.img})` }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="v2-section stk-root" id="categories" style={{ paddingTop: 20, paddingBottom: 0 }}>
      {/* section header */}
      <div className="v2-container">
        <Reveal delay={0.05}><h2 className="v2-sec-title">{t.marketing.categories.title}</h2></Reveal>
        <Reveal delay={0.1}>
          <p className="v2-sec-sub" style={{ marginBottom: 38 }}>
            {t.marketing.categories.subtitle}
          </p>
        </Reveal>
      </div>

      <div id="stk-wrap" className="stk-wrap" ref={wrapRef}>
        <section className="stk-pin">
          <div className="stk-chrome">
            <span className="stk-mark">Yekis®</span>
            <span className="stk-tag">Stack · Scroll</span>
          </div>
          {stage}
        </section>
      </div>

      <section
        id="stk-outro"
        className="stk-flat stk-outro"
        ref={outroRef}
        role="complementary"
        aria-label="Call to action"
      >
        <div className="stk-outro-ambient" aria-hidden="true" />

        <h1
          className="stk-outro-title"
          aria-label={t.marketing.categories.outroTitle || "Let's Build"}
        >
          {(t.marketing.categories.outroTitle || "Let's Build").split(" ").map((word, wi, arr) => (
            <span key={`${word}-${wi}`} className="stk-word-wrap" aria-hidden="true">
              <span
                className="stk-word"
                style={{ "--wi": wi, "--total": arr.length } as React.CSSProperties}
              >
                {word}
              </span>
              {wi < arr.length - 1 && <span className="stk-word-space">&nbsp;</span>}
            </span>
          ))}
        </h1>

        <div className="stk-load-bar" aria-hidden="true">
          <div className="stk-load-bar-fill" />
        </div>

        <p className="stk-outro-sub">
          {t.marketing.categories.outroSubtitle}
        </p>

        <div className="stk-cta-row">
          <button className="stk-outro-btn" onClick={() => onStart("register")}>
            {t.nav.getStarted}
          </button>
          <button className="stk-outro-ghost" onClick={() => onStart("login")}>
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
            <BadgeCheck size={13} aria-label="Verified member" />
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
  const { t } = useI18n();
  const columns = useMemo(() => {
    const cols: MemberReview[][] = [[], [], []];
    REVIEWS.forEach((r, i) => cols[i % cols.length].push(r));
    return cols;
  }, []);

  return (
    <section className="v2-section v2-testi" aria-labelledby="v2-testi-title">
      <div className="v2-testi-aurora" aria-hidden="true" />
      <div className="v2-container">
        <div className="v2-center">
          <Reveal delay={0.06}>
            <h2 className="v2-sec-title" id="v2-testi-title">
              {t.marketing.testimonials.title}
            </h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="v2-sec-sub v2-testi-sub">
              {t.marketing.testimonials.subtitle}
            </p>
          </Reveal>
        </div>

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

        <p className="v2-testi-hint">{t.marketing.testimonials.hint}</p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   About / Studio — editorial split layout
───────────────────────────────────────────────── */
function AboutSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useI18n();
  const aboutFeatures = [
    { n: "01", title: t.marketing.about.feature1Title, body: t.marketing.about.feature1Desc },
    { n: "02", title: t.marketing.about.feature2Title, body: t.marketing.about.feature2Desc },
    { n: "03", title: t.marketing.about.feature3Title, body: t.marketing.about.feature3Desc },
  ];

  return (
    <section className="v2-section v2-about" id="about" aria-labelledby="v2-about-title" style={{ paddingTop: 10 }}>
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

            {/* Right: editorial workspace image */}
            <div className="v2-about-visual">
              <img
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1400"
                alt="Freelancers and a client collaborating around a shared workspace"
                loading="eager"
                fetchPriority="high"
              />
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
    <section className="v2-faq" id="faq" ref={sectionRef} aria-labelledby="v2-faq-title">
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

  /* the spotlight gradient follows the pointer across the panel */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onMove = (e: PointerEvent) => {
      const r = panel.getBoundingClientRect();
      if (!r.width || !r.height) return;
      panel.style.setProperty(
        "--mouse-x",
        `${((e.clientX - r.left) / r.width) * 100}%`,
      );
      panel.style.setProperty(
        "--mouse-y",
        `${((e.clientY - r.top) / r.height) * 100}%`,
      );
    };
    const onLeave = () => {
      panel.style.setProperty("--mouse-x", "50%");
      panel.style.setProperty("--mouse-y", "0%");
    };
    panel.addEventListener("pointermove", onMove);
    panel.addEventListener("pointerleave", onLeave);
    return () => {
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section
      className="v2-outro-cta"
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
          aria-label="Back to top"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────
   Footer — frosted card over a panel, giant word below
───────────────────────────────────────────────── */
function FooterV2({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t } = useI18n();

  const NAV_COLS = [
    {
      heading: t.marketing.footer.platform,
      links: [
        { label: t.marketing.footer.faq, page: "faq" },
        { label: t.marketing.footer.fees, page: "fees" },
        { label: t.marketing.footer.caseStudies, page: "case-studies" },
      ],
    },
    {
      heading: t.marketing.footer.company,
      links: [
        { label: t.marketing.footer.about, page: "about" },
        { label: t.marketing.footer.contactSupport, href: "mailto:support@yekis.com" },
      ],
    },
    {
      heading: t.marketing.footer.legal,
      links: [
        { label: t.marketing.footer.privacy, page: "privacy" },
        { label: t.marketing.footer.terms, page: "terms" },
      ],
    },
  ];

  const SOCIAL = [
    {
      label: "TikTok",
      href: "#",
      svg: '<path fill="currentColor" d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.68 5.68 0 0 0-.77-.05A5.68 5.68 0 1 0 15.54 15.3V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z"/>',
    },
    {
      label: "Telegram",
      href: "https://t.me/yekis_channel",
      svg: '<path fill="currentColor" d="M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19L6.06 13.1l-4.65-1.45c-1.01-.32-1.03-1.01.21-1.5l18.17-7c.84-.31 1.58.2 1.15 1.44Z"/>',
    },
    {
      label: "Instagram",
      href: "#",
      svg: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/>',
    },
    {
      label: "Facebook",
      href: "#",
      svg: '<path fill="currentColor" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z"/>',
    },
  ];

  const year = new Date().getFullYear();

  /* reveal the card + giant word the moment they scroll into view */
  const areaRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const area = areaRef.current;
    const card = area?.querySelector<HTMLElement>(".v2-footer-card");
    const word = area?.querySelector<HTMLElement>(".v2-footer-word");
    if (!area || !card || !word) return;
    if (prefersReduced() || !("IntersectionObserver" in window)) {
      card.classList.add("is-visible");
      area.classList.add("is-visible");
      return;
    }

    /* the card fades up on its own threshold; the wordmark pops separately so
       the animation is never missed above the fold */
    const cardIO = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("is-visible");
          cardIO.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    cardIO.observe(card);

    const wordIO = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          area.classList.add("is-visible");
          wordIO.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    wordIO.observe(word);

    return () => {
      cardIO.disconnect();
      wordIO.disconnect();
    };
  }, []);

  return (
    <footer className="v2-footer-area" id="yk-footer" ref={areaRef}>
      <div className="v2-footer-divider" aria-hidden />

      <span className="v2-footer-glow v2-footer-glow-l" aria-hidden />
      <span className="v2-footer-glow v2-footer-glow-r" aria-hidden />

      <div className="v2-footer-card">
        <div className="v2-footer-top">
          {/* Brand column */}
          <div className="v2-footer-lead">
            <button
              className="v2-footer-logo"
              onClick={() => onNavigate("home")}
              aria-label="Go to homepage"
            >
              <span className="v2-footer-symbol" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path d="M5 4l7 9v7" />
                  <path d="M19 4l-7 9" />
                </svg>
              </span>
              <span>Yekis</span>
            </button>
            <p className="v2-footer-desc">
              {t.marketing.footer.desc}
            </p>
            <nav className="v2-footer-social" aria-label="Social links">
              {SOCIAL.map(({ label, href, svg }) => (
                <a
                  key={label}
                  href={href}
                  title={label}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
                </a>
              ))}
            </nav>
          </div>

          {/* Nav columns */}
          <div className="v2-footer-nav">
            {NAV_COLS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h4>{col.heading}</h4>
                <div className="v2-footer-nav-links">
                  {col.links.map((lk) =>
                    "href" in lk ? (
                      <a key={lk.label} href={lk.href}>
                        {lk.label}
                      </a>
                    ) : (
                      <button key={lk.label} onClick={() => onNavigate(lk.page!)}>
                        {lk.label}
                      </button>
                    ),
                  )}
                </div>
              </nav>
            ))}
          </div>
        </div>

        <div className="v2-footer-rule" aria-hidden />

        {/* Bottom bar */}
        <div className="v2-footer-base">
          <div className="v2-footer-meta">
            <p>
              &copy; {year} Yekis &mdash; Addis Ababa &middot; {t.marketing.footer.copyright}
            </p>
            <span className="v2-footer-escrow">
              <ShieldCheck />
              {t.marketing.footer.escrowNote}
            </span>
          </div>
          <div className="v2-footer-legal">
            <LanguageSelector variant="segmented" />
            <button onClick={() => onNavigate("privacy")}>{t.marketing.footer.privacy}</button>
            <button onClick={() => onNavigate("terms")}>{t.marketing.footer.terms}</button>
          </div>
        </div>
      </div>

      <div className="v2-footer-word" aria-hidden>
        Yekis
      </div>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Yekis",
            url: "https://yekis.com",
            logo: "https://yekis.com/svgviewer-output.svg",
            description:
              "Ethiopia's freelance marketplace. Fund a milestone, review the work, release payment.",
            sameAs: ["https://t.me/yekis_channel", "https://t.me/yekis_group"],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              availableLanguage: ["English", "Amharic"],
            },
          }),
        }}
      />
    </footer>
  );
}

/* ─────────────────────────────────────────────────
   Root export
───────────────────────────────────────────────── */
export function LandingPageV2({ onStart, onNavigate }: LandingPageV2Props) {
  return (
    <div className="yk-v2">
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
