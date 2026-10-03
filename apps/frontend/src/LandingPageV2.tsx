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
  useCallback,
} from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useInView,
} from "framer-motion";
import {
  Wallet,
  Briefcase,
  CheckCircle,
  Shield,
  ShieldCheck,
  MessageCircle,
  Clock,
  Code,
  Palette,
  Megaphone,
  PenTool,
  Languages,
  Database,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Users,
  Award,
  WalletCards,
  Fingerprint,
  Lock,
  Zap,
  Globe,
  Star,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { LandingSupportChat } from "./components/LandingSupportChat";
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

const HERO_TITLE = "Find the right expertise.";



const STEPS = [
  {
    n: "01",
    Icon: Wallet,
    title: "Fund",
    body: "You deposit the agreed amount into escrow before work starts. It is held safely and never sent until you approve.",
  },
  {
    n: "02",
    Icon: Briefcase,
    title: "Work",
    body: "The freelancer completes the milestone and submits deliverables, files and notes for your review.",
  },
  {
    n: "03",
    Icon: CheckCircle,
    title: "Approve",
    body: "Satisfied with the delivery? Approve it and funds release instantly into the freelancer's wallet.",
  },
  {
    n: "04",
    Icon: Shield,
    title: "Protected",
    body: "Need revisions or hit a problem? Support mediates with clear evidence for a fair resolution.",
  },
];


const TESTIMONIALS = [
  {
    q: "I funded escrow on a Friday and the first milestone was approved by Tuesday. No chasing, no awkward money conversations.",
    name: "Hanna G.",
    role: "Founder, import & retail",
    tone: "a",
  },
  {
    q: "As a freelancer in Bahir Dar, getting paid used to be the hardest part. Now funds land in my wallet the moment the client approves.",
    name: "Abel T.",
    role: "Full-stack developer",
    tone: "b",
  },
  {
    q: "We had one disagreement about scope. Support reviewed the brief and messages and settled it in two days — fairly.",
    name: "Sara M.",
    role: "Marketing lead, NGO",
    tone: "c",
  },
];

const ABOUT_FEATURES = [
  {
    n: "01",
    title: "Verified identities",
    body: "Freelancers verify with the Ethiopian National ID (Fayda), so you always know exactly who you are hiring.",
  },
  {
    n: "02",
    title: "Milestone escrow protection",
    body: "Funds stay locked in escrow and only release when you inspect and approve each delivered milestone.",
  },
];

const FAQS = [
  {
    cat: "Trusting the platform",
    items: [
      {
        q: "Is my money actually safe?",
        a: "Yes. When you fund a job, your payment goes into escrow — held separately from Yekis's own operating funds — not directly to the freelancer. It only releases when you approve the work, or automatically after 5 days if you don't respond. If something's wrong, raise it before approving and the payment stays held while we help sort it out.",
      },
      {
        q: "What if the freelancer disappears after I pay?",
        a: "Your money is still sitting safely in escrow — it was never sent to them. If a freelancer goes silent, raise it with our team and we'll help resolve it, which can include a full refund.",
      },
      {
        q: "What if we disagree about the work?",
        a: "Most disagreements get sorted directly between you and the freelancer within a short window. If you can't agree, our team reviews both sides — the original brief, the delivered work and your messages — and decides: release, refund, or split fairly.",
      },
    ],
  },
  {
    cat: "Getting started",
    items: [
      {
        q: "Why do I need to verify my identity (KYC)?",
        a: "It protects everyone. Verification is how we confirm the person you hire, or the client you work for, is really who they claim to be. Basic verification is quick and unlocks browsing and posting.",
      },
      {
        q: "What are the fees?",
        a: "Yekis takes a small percentage of each completed job, split between client and freelancer — never charged upfront, only when a payment actually releases.",
      },
    ],
  },
  {
    cat: "Getting paid",
    items: [
      {
        q: "When do I actually get paid?",
        a: "The moment a client approves your work (or after the 5-day auto-release window), funds move into your Yekis wallet immediately. From there you can withdraw to Telebirr or your bank account.",
      },
      {
        q: "Is there a minimum withdrawal amount?",
        a: "A small minimum applies per withdrawal to keep payment-rail costs sensible. The exact figure is shown in your wallet before you confirm.",
      },
    ],
  },
];

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
  amount = 0.2,
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
      ? { opacity: 0, x: -46 }
      : dir === "right"
        ? { opacity: 0, x: 46 }
        : dir === "zoom"
          ? { opacity: 0, scale: 0.93 }
          : { opacity: 0, y: 38 };
  return (
    <motion.div
      className={className}
      style={style}
      initial={hidden}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.9,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReduced()) {
      setVal(to);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
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
                    "--d": `${(myIdx * 0.035).toFixed(3)}s`,
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

/* Escrow vault illustration */
function EscrowVault() {
  const rings = [1, 2, 3];
  const orbs = [
    { c: "var(--v2-primary)", dur: 16, inset: "6%", dir: 1 },
    { c: "var(--v2-teal)", dur: 22, inset: "20%", dir: -1 },
    { c: "var(--v2-violet)", dur: 28, inset: "33%", dir: 1 },
  ];
  return (
    <div className="v2-vault">
      {rings.map((r) => (
        <motion.div
          key={r}
          className={`v2-vault-ring r${r}`}
          animate={{ rotate: r % 2 ? 360 : -360 }}
          transition={{ duration: 26 + r * 9, repeat: Infinity, ease: "linear" }}
        />
      ))}
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="v2-orb"
          style={{ inset: o.inset }}
          animate={{ rotate: o.dir * 360 }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "linear" }}
        >
          <i style={{ background: o.c, boxShadow: `0 0 14px 2px ${o.c}` }} />
        </motion.div>
      ))}
      <motion.div
        className="v2-vault-core"
        animate={{ y: [0, -10, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{ textAlign: "center" }}>
          <Lock size={42} />
          <b>ESCROW</b>
        </div>
      </motion.div>
      <motion.div className="v2-vault-chip v2-vc1" animate={{ y: [0, -9, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <Wallet size={15} /> Balance locked
      </motion.div>
      <motion.div className="v2-vault-chip v2-vc2" animate={{ y: [0, 10, 0] }} transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}>
        <CheckCircle size={15} /> Milestone 2 of 3 approved
      </motion.div>
      <motion.div className="v2-vault-chip v2-vc3" animate={{ y: [0, -7, 0] }} transition={{ duration: 8.2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}>
        <Clock size={15} /> Auto-release in 5 days
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Scroll Progress Bar
───────────────────────────────────────────────── */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      className="yk-v2-scroll-bar"
      style={{ scaleX }}
    />
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
      Array.from({ length: 36 }, (_, i) => {
        const a = 380 - i * 5 * position, b = 189 + i * 6;
        const c = 312 - i * 5 * position, e = 216 - i * 6;
        const f = 152 - i * 5 * position, g = 343 - i * 6;
        const h = 616 - i * 5 * position, k = 470 - i * 6;
        const m = 684 - i * 5 * position, n = 875 - i * 6;
        return {
          d: `M-${a} -${b} C-${a} -${b} -${c} ${e} ${f} ${g} C${h} ${k} ${m} ${n} ${m} ${n}`,
          w: (0.5 + i * 0.03).toFixed(2),
          o: Math.min(0.1 + i * 0.025, 0.85).toFixed(3),
          fd: `${9 + ((i * 7) % 8)}s`,   // flow speed
          dl: `${-((i * 13) % 17)}s`,    // desync phase
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

function HeroSection({ onStart }: { onStart: (m: "login" | "register") => void }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(prefersReduced);

  /* hand the title's transform over to the hover transition once the
     entrance spring has finished (a filled animation would outrank it) */
  useEffect(() => {
    if (settled) return;
    const t = window.setTimeout(() => setSettled(true), 2200);
    return () => window.clearTimeout(t);
  }, [settled]);

  /* gentle pointer parallax: path field drifts with the cursor, hero leans back */
  useEffect(() => {
    if (prefersReduced()) return;
    const layer = layerRef.current;
    const inner = innerRef.current;
    if (!layer || !inner) return;
    let tx = 0, ty = 0, sx = 0, sy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const loop = () => {
      sx += (tx - sx) * 0.045;
      sy += (ty - sy) * 0.045;
      layer.style.transform = `translate3d(${(sx * 14).toFixed(2)}px,${(sy * 10).toFixed(2)}px,0)`;
      inner.style.transform = `translate3d(${(sx * -6).toFixed(2)}px,${(sy * -4).toFixed(2)}px,0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
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
        <SpringTitle text={HERO_TITLE} settled={settled} />
        <div className="v2-hero-actions">
          <button className="v2-btn v2-btn-primary" onClick={() => onStart("register")}>
            <span className="v2-shine" />
            <Briefcase size={17} /> Get started
          </button>
          <button
            className="v2-btn v2-btn-secondary"
            onClick={() =>
              document
                .getElementById("categories")
                ?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" })
            }
          >
            <LayoutGrid size={17} /> Browse categories
          </button>
        </div>
      </div>
    </section>
  );
}


/* ─────────────────────────────────────────────────
   Stats
───────────────────────────────────────────────── */
function StatsSection() {
  const items = [
    { Icon: Briefcase, to: 12480, suffix: "+", label: "Jobs completed" },
    { Icon: Users, to: 3940, suffix: "+", label: "Verified freelancers" },
    { Icon: ShieldCheck, to: 84.6, decimals: 1, suffix: "M", label: "Secured in escrow (ETB)" },
    { Icon: Zap, to: 6.5, decimals: 1, suffix: " hrs", label: "Avg. payout time" },
  ];
  return (
    <div className="v2-container" style={{ paddingTop: 56 }}>
      <Reveal>
        <div className="v2-stats-band">
          {items.map((s, i) => (
            <motion.div
              key={s.label}
              className="v2-stat"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
            >
              <span className="v2-stat-ico">
                <s.Icon size={26} />
              </span>
              <div className="v2-stat-val">
                <CountUp to={s.to} decimals={s.decimals ?? 0} suffix={s.suffix ?? ""} />
              </div>
              <div className="v2-stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Escrow / How it Works — pinned scroll board
   ───────────────────────────────────────────────── */
const PIN_CARDS = [
  { left: 24, top: 13, rot: -7, rotM: -2,   swd: "0s",    cls: "esc-card--1" },
  { left: 58, top: 24, rot: 6,  rotM: 1.5,  swd: "-1.6s", cls: "esc-card--2" },
  { left: 22, top: 49, rot: -5, rotM: -1.5, swd: "-3.1s", cls: "esc-card--3" },
  { left: 58, top: 62, rot: 7,  rotM: 2,    swd: "-4.4s", cls: "esc-card--4" },
];

const PIN_NOTES = [
  { left: 76, top: 13, rot: 3,  swd: "-0.8s", cls: "esc-note--1", Icon: Wallet,     text: "Balance locked",            dot: "#e11d48" },
  { left: 5,  top: 35, rot: -4, swd: "-2.2s", cls: "esc-note--2", Icon: CheckCircle, text: "Milestone 2 of 3 approved", dot: "#2563eb" },
  { left: 6,  top: 86, rot: 2,  swd: "-3.6s", cls: "esc-note--3", Icon: Clock,       text: "Auto\u2011release in 5 days", dot: "#059669" },
];

/* dashed connectors, drawn in a 0-100 board space between card corners */
const PIN_WIRES = [
  "M46 40 C 50 37, 54 32, 58 27",
  "M57 44 C 53 47, 48 50, 45 52",
  "M45 53 C 49 58, 53 63, 57 68",
];

/* scroll-progress windows: cards drop in → wires draw → notes pop */
const PIN_CARD_AT = [0, 0.24, 0.48, 0.72];
const PIN_CARD_WIN = 0.2;
const PIN_WIRE_AT = [0.16, 0.4, 0.64];
const PIN_WIRE_WIN = 0.16;
const PIN_NOTE_AT = [0.3, 0.56, 0.8];

const escClamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const escMix = (a: number, b: number, t: number) => a + (b - a) * t;
const escBackOut = (t: number) => {
  t = escClamp(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function EscrowSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cueRef   = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pinRefs  = useRef<(HTMLSpanElement | null)[]>([]);
  const wireRefs = useRef<(SVGPathElement | null)[]>([]);
  const wireLen  = useRef<number[]>([]);
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pRef     = useRef(0);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 32, mass: 0.4 });

  /* each connector reveals by sliding its own dash window, so the mask
     paths need their real length — `pathLength` is not honoured by
     stroke-dashoffset in Blink, hence the measurement instead. The band
     is sized in board units (see .esc-wire-mask) for the same reason. */
  useEffect(() => {
    wireRefs.current.forEach((path, i) => {
      if (!path) return;
      const len = path.getTotalLength();
      wireLen.current[i] = len;
      path.style.strokeDasharray = `${len} ${len}`;
      path.style.strokeDashoffset = String(len);
    });
  }, []);

  const paint = useCallback((p: number, introT: number) => {
    for (let i = 0; i < STEPS.length; i++) {
      const card = cardRefs.current[i];
      if (!card) continue;
      const t = Math.max(escClamp((p - PIN_CARD_AT[i]) / PIN_CARD_WIN), i === 0 ? introT : 0);
      const e = escBackOut(t);
      card.style.opacity = String(escClamp(t * 2.2));
      card.style.transform =
        `translateY(${escMix(-70, 0, e).toFixed(2)}px) ` +
        `rotate(${(PIN_CARDS[i].rot + escMix(-9, 0, e)).toFixed(2)}deg) ` +
        `scale(${escMix(0.86, 1, e).toFixed(3)})`;
      const pin = pinRefs.current[i];
      if (pin) {
        const pe = escBackOut((t - 0.3) / 0.5);
        pin.style.transform = `translateX(-50%) translateY(${escMix(-24, 0, pe).toFixed(2)}px)`;
      }
    }
    for (let i = 0; i < PIN_WIRES.length; i++) {
      const wire = wireRefs.current[i];
      const len = wireLen.current[i];
      if (!wire || !len) continue;
      const t = Math.max(escClamp((p - PIN_WIRE_AT[i]) / PIN_WIRE_WIN), i === 0 ? introT * 0.6 : 0);
      wire.style.strokeDashoffset = (len * (1 - t)).toFixed(2);
    }
    for (let i = 0; i < PIN_NOTES.length; i++) {
      const note = noteRefs.current[i];
      if (!note) continue;
      note.style.opacity = String(escClamp((p - PIN_NOTE_AT[i]) / 0.06));
      const e = escBackOut((p - PIN_NOTE_AT[i]) / 0.12);
      note.style.transform = `rotate(${PIN_NOTES[i].rot}deg) scale(${escMix(0.7, 1, e).toFixed(3)})`;
    }
    stageRef.current?.style.setProperty("--esc-bgY", `${(p * -70).toFixed(1)}px`);
    cueRef.current?.classList.toggle("esc-cue-off", p > 0.02);
  }, []);

  useMotionValueEvent(progress, "change", (p) => {
    pRef.current = p;
    paint(p, 1);
  });

  useEffect(() => {
    const still  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    if (still || narrow) {
      paint(1, 1);
      return;
    }
    const intro = animate(0, 1, {
      duration: 0.95,
      ease: [0.34, 1.56, 0.64, 1],
      onUpdate: (v) => paint(pRef.current, v),
    });
    return () => intro.stop();
  }, [paint]);

  return (
    <section className="v2-section" id="how-it-works">
      {/* intro band — static, sits above the pinned board */}
      <div className="v2-container">
        <div className="v2-escrow-wrap">
          <div>
            <Reveal><span className="v2-eyebrow"><Shield size={14} /> How your payment is protected</span></Reveal>
            <Reveal delay={0.06}><h2 className="v2-sec-title">Clear money. Clear evidence. Clear next steps.</h2></Reveal>
            <Reveal delay={0.12}><p className="v2-sec-sub">Every payment follows four transparent steps — guaranteed protection for clients and freelancers.</p></Reveal>
            <Reveal delay={0.18}>
              <div style={{ marginTop: 26 }}>
                <button className="v2-link-btn" onClick={() => onNavigate("faq")}>
                  See how disputes get resolved <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal dir="zoom" delay={0.1}>
            <EscrowVault />
          </Reveal>
        </div>
      </div>

      {/* pinned board — 480svh of scroll space */}
      <div className="esc-wrap" ref={wrapRef}>
        <div className="esc-pin" ref={stageRef}>
          <svg className="esc-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {PIN_WIRES.map((d, i) => (
                <mask
                  key={`m${i}`}
                  id={`esc-wm${i + 1}`}
                  className="esc-wire-mask"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                >
                  <path ref={(el) => { wireRefs.current[i] = el; }} d={d} />
                </mask>
              ))}
            </defs>
            {PIN_WIRES.map((d, i) => (
              <path key={`w${i}`} className="esc-wire" d={d} mask={`url(#esc-wm${i + 1})`} />
            ))}
          </svg>

          {STEPS.map((s, i) => (
            <div
              key={s.n}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`esc-card ${PIN_CARDS[i].cls}`}
              style={
                {
                  left: `${PIN_CARDS[i].left}%`,
                  top: `${PIN_CARDS[i].top}%`,
                  "--esc-rot": `${PIN_CARDS[i].rot}deg`,
                  "--esc-rotm": `${PIN_CARDS[i].rotM}deg`,
                  "--esc-swd": PIN_CARDS[i].swd,
                } as React.CSSProperties
              }
            >
              <div className="esc-card-in">
                <div className="esc-sway">
                  <div className="esc-card-body">
                    <span className="esc-pin-svg" ref={(el) => { pinRefs.current[i] = el; }} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 21v-6" stroke="var(--esc-pin-head)" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 3h8l-1.2 7.2a3 3 0 0 1-2 2.4h-1.6a3 3 0 0 1-2-2.4L8 3z" fill="var(--esc-pin-head)" />
                        <circle cx="12" cy="4" r="2.4" fill="var(--esc-pin-dot)" />
                      </svg>
                    </span>
                    <div className="esc-tint">
                      <div className="esc-num-row">
                        <span className="esc-num">{s.n}</span>
                        <span className="esc-ic"><s.Icon size={20} /></span>
                      </div>
                      <h3>{s.title}</h3>
                      <p>{s.body}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {PIN_NOTES.map((nt, i) => (
            <div
              key={nt.text}
              ref={(el) => { noteRefs.current[i] = el; }}
              className={`esc-note ${nt.cls}`}
              style={
                {
                  left: `${nt.left}%`,
                  top: `${nt.top}%`,
                  "--esc-swd": nt.swd,
                } as React.CSSProperties
              }
            >
              <svg className="esc-note-pin" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="5" fill={nt.dot} />
              </svg>
              <span className="esc-note-in">
                <nt.Icon size={15} className="esc-note-ic" />
                {nt.text}
              </span>
            </div>
          ))}

          <div className="esc-cue" ref={cueRef} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
            Scroll
          </div>
        </div>
      </div>

      {/* footnote — static band below the pinned board */}
      <div className="v2-container">
        <p className="esc-foot">Every step is recorded and time-stamped so both sides have complete peace of mind.</p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Fees
───────────────────────────────────────────────── */
function FeesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.35 });
  return (
    <section className="v2-section" id="fees" style={{ paddingTop: 0 }}>
      <div className="v2-container">
        <Reveal dir="zoom">
          <div className="v2-fees-card" ref={ref}>
            <span className="v2-eyebrow"><TrendingUp size={14} /> Transparent fees</span>
            <h2 className="v2-sec-title" style={{ maxWidth: 620 }}>One small percentage. Only when work pays out.</h2>
            <p className="v2-sec-sub">Nothing is charged upfront. Fees are split between client and freelancer at the moment escrow releases.</p>
            <div className="v2-fee-bar">
              <motion.div className="v2-fee-seg a" initial={{ width: 0 }} animate={seen ? { width: "12%" } : {}} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}>5%</motion.div>
              <motion.div className="v2-fee-seg b" initial={{ width: 0 }} animate={seen ? { width: "16%" } : {}} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}>7%</motion.div>
              <motion.div className="v2-fee-seg c" initial={{ width: 0 }} animate={seen ? { width: "72%" } : {}} transition={{ duration: 1.1, ease: EASE, delay: 0.42 }}>88% → talent</motion.div>
            </div>
            <div className="v2-fee-legend">
              <span><i style={{ background: "var(--v2-teal)" }} />Client fee</span>
              <span><i style={{ background: "var(--v2-violet)" }} />Freelancer fee</span>
              <span><i style={{ background: "var(--v2-border2)" }} />Goes to the freelancer</span>
            </div>
            <p style={{ marginTop: 20, color: "var(--v2-text2)", fontSize: 13.5 }}>
              <WalletCards size={15} style={{ verticalAlign: "text-bottom", marginRight: 7, color: "var(--v2-primary)" }} />
              Deposits and withdrawals via Telebirr or CBE — no hidden wire charges.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Pinned scroll-stack deck data
───────────────────────────────────────────────── */
const DECK_CARDS = [
  {
    cardClass: "stk-card--1",
    klass: "01 / Engineering",
    titleL1: "Web & App",
    titleL2: "Development",
    roles: "148 open roles",
    tag: "Full\u2011stack · Mobile · API",
    Icon: Code,
  },
  {
    cardClass: "stk-card--2",
    klass: "02 / Design",
    titleL1: "Graphic Design",
    titleL2: "& Branding",
    roles: "96 open roles",
    tag: "Identity · Print · UI",
    Icon: Palette,
  },
  {
    cardClass: "stk-card--3",
    klass: "03 / Marketing",
    titleL1: "Digital",
    titleL2: "Marketing",
    roles: "74 open roles",
    tag: "SEO · Social · Paid",
    Icon: Megaphone,
  },
  {
    cardClass: "stk-card--4",
    klass: "04 / Content",
    titleL1: "Content &",
    titleL2: "Copywriting",
    roles: "61 open roles",
    tag: "Editorial · UX · Scripts",
    Icon: PenTool,
  },
  {
    cardClass: "stk-card--5",
    klass: "05 / Language",
    titleL1: "Amharic / English",
    titleL2: "Translation",
    roles: "53 open roles",
    tag: "Localisation · Subtitling",
    Icon: Languages,
  },
  {
    cardClass: "stk-card--6",
    klass: "06 / Data",
    titleL1: "Data",
    titleL2: "Processing",
    roles: "88 open roles",
    tag: "Annotation · ETL · QA",
    Icon: Database,
  },
] as const;

/* ─────────────────────────────────────────────────
   Categories — pinned scroll-stack deck
───────────────────────────────────────────────── */
function CategoriesSection({ onStart }: { onStart: (m: "login" | "register") => void }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const pinRef   = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const curRef   = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const cueRef   = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    const wrap    = wrapRef.current;
    const pin     = pinRef.current;
    const stage   = stageRef.current;
    const cur     = curRef.current;
    const countEl = countRef.current;
    const cue     = cueRef.current;
    if (!wrap || !pin || !stage || !cur || !countEl || !cue) return;

    const cards  = Array.from(stage.querySelectorAll<HTMLElement>(".stk-card"));
    const copies = cards.map((c) => c.querySelector<HTMLElement>(".stk-copy")!);
    const medias = cards.map((c) => c.querySelector<HTMLElement>(".stk-media")!);
    const total  = cards.length;
    const segment = 1 / (total - 1);

    const Y_OFFSET   = 4;
    const SCALE_STEP = 0.06;
    const ENTER_Y    = 62, ENTER_RX = -16, ENTER_SCALE = 0.88;
    const CARD_MS    = 950, STAGGER_MS = 110;
    const TILT_X = 2.6, TILT_Y = 3.4;
    const VEL_KICK = 240, VEL_MAX = 6;
    const PARALLAX   = 7;
    const introTotal = (total - 1) * STAGGER_MS + CARD_MS;
    const reduced    = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
    const easeOutExpo = (t: number) => {
      t = clamp(t, 0, 1);
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const pose = { y: 0, rx: 0, sc: 1, t: 0 };

    function deckPose(i: number, p: number): number {
      const active = Math.min(Math.floor(p / segment), total - 1);
      const segP   = clamp((p - active * segment) / segment, 0, 1);
      if (i < active) {
        pose.y = -250; pose.rx = 35; pose.sc = 1; pose.t = 1;
        return active;
      }
      if (i === active) {
        pose.y  = lerp(-50, -200, segP);
        pose.rx = lerp(0, 35, segP);
        pose.sc = 1;
        pose.t  = segP;
        return active;
      }
      const behind = i - active;
      pose.y  = -50 + (behind - segP) * Y_OFFSET;
      pose.rx = 0;
      pose.sc = 1 - (behind - segP) * SCALE_STEP;
      pose.t  = 0;
      return active;
    }

    function render(p: number, elapsed: number) {
      let active = 0;
      cards.forEach((card, i) => {
        active = deckPose(i, p);
        const e  = elapsed >= introTotal ? 1 : easeOutExpo((elapsed - i * STAGGER_MS) / CARD_MS);
        const y  = lerp(ENTER_Y, pose.y, e);
        const rx = lerp(ENTER_RX, pose.rx, e);
        const sc = lerp(ENTER_SCALE, pose.sc, e);
        card.style.opacity   = clamp(e * 1.6, 0, 1).toFixed(3);
        card.style.transform = `translate(-50%, ${y.toFixed(2)}%) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        const t = pose.t * e;
        copies[i].style.transform = `translate3d(0,${(t * -PARALLAX).toFixed(2)}%,0)`;
        medias[i].style.transform = `translate3d(0,${(t * PARALLAX).toFixed(2)}%,0) scale(${(1 - t * 0.05).toFixed(3)})`;
      });
      cur!.textContent = String(active + 1).padStart(2, "0");
    }

    /* outro reveal via IntersectionObserver */
    const outro = outroRef.current;
    if (outro) {
      if (reduced) {
        outro.classList.add("on");
      } else if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting) { outro.classList.add("on"); io.disconnect(); }
            });
          },
          { threshold: 0.35 },
        );
        io.observe(outro);
      } else {
        outro.classList.add("on");
      }
    }

    /* reduced-motion: settle immediately, no rAF */
    if (reduced) {
      render(0, Infinity);
      countEl.classList.add("on");
      cue.classList.add("on");
      const cueCheck = () => cue.classList.toggle("hide", window.scrollY > 60);
      cueCheck();
      window.addEventListener("scroll", cueCheck, { passive: true });
      return () => window.removeEventListener("scroll", cueCheck);
    }

    /* hide cards before the entrance beat */
    cards.forEach((c) => { c.style.opacity = "0"; });

    let tx = 0, ty = 0, sx = 0, sy = 0;
    const onMove = (e: PointerEvent) => {
      const r = pin.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    pin.addEventListener("pointermove", onMove);
    pin.addEventListener("pointerleave", onLeave);

    const introStart = performance.now();
    let lastP = 0, vel = 0;

    function loop(now: number) {
      const elapsed = now - introStart;
      const top  = wrap!.getBoundingClientRect().top;
      const span = wrap!.offsetHeight - window.innerHeight;
      const p    = clamp(-top / span, 0, 1);

      vel  = lerp(vel, clamp((p - lastP) * VEL_KICK, -VEL_MAX, VEL_MAX), 0.12);
      lastP = p;
      sx    = lerp(sx, tx, 0.06);
      sy    = lerp(sy, ty, 0.06);

      stage!.style.transform =
        `rotateX(${(vel - sy * TILT_X).toFixed(2)}deg) rotateY(${(sx * TILT_Y).toFixed(2)}deg)`;

      render(p, elapsed);
      if (elapsed >= introTotal) countEl!.classList.add("on");
      cue!.classList.toggle("on",   elapsed >= introTotal);
      cue!.classList.toggle("hide", p > 0.02);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      pin.removeEventListener("pointermove", onMove);
      pin.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section className="v2-section" id="categories" style={{ paddingTop: 20, paddingBottom: 0 }}>
      {/* section header */}
      <div className="v2-container">
        <Reveal><span className="v2-eyebrow"><Sparkles size={14} /> Browse by category</span></Reveal>
        <Reveal delay={0.05}><h2 className="v2-sec-title">Find the right expertise.</h2></Reveal>
        <Reveal delay={0.1}>
          <p className="v2-sec-sub" style={{ marginBottom: 38 }}>
            Six launch categories covering Ethiopia&rsquo;s most in-demand digital skills.
          </p>
        </Reveal>
      </div>

      {/* pinned deck — 800svh scroll space */}
      <div className="stk-wrap" ref={wrapRef}>
        <div className="stk-pin" ref={pinRef}>
          <div className="stk-stage" ref={stageRef}>
            {DECK_CARDS.map((card, i) => (
              <div
                key={card.cardClass}
                className={`stk-card ${card.cardClass}`}
                style={{ zIndex: DECK_CARDS.length - i }}
              >
                {/* copy column */}
                <div className="stk-col stk-copy">
                  <div>
                    <p className="k">{card.klass}</p>
                    <h2>
                      {card.titleL1}
                      <br />
                      {card.titleL2}
                    </h2>
                  </div>
                  <div className="row">
                    <span className="roles">{card.roles}</span>
                    <button
                      className="stk-chip"
                      onClick={() => onStart("register")}
                      aria-label={`Browse ${card.klass}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* media column */}
                <div className="stk-col stk-media">
                  <span className="tag">{card.tag}</span>
                  <span className="ic">
                    <card.Icon size={64} strokeWidth={1.3} />
                  </span>
                  <p className="num">{String(i + 1).padStart(2, "0")}</p>
                </div>
              </div>
            ))}
          </div>

          {/* deck counter */}
          <div className="stk-count" ref={countRef}>
            <b ref={curRef}>01</b> / {String(DECK_CARDS.length).padStart(2, "0")}
          </div>

          {/* scroll cue */}
          <div className="stk-scroll" ref={cueRef} aria-hidden="true">
            <span className="stk-circle">
              <span className="stk-ring" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
              </svg>
            </span>
            <span className="lbl">Scroll</span>
          </div>
        </div>
      </div>

      {/* outro — always-dark "Let's build." panel */}
      <div className="stk-flat stk-outro" ref={outroRef} role="complementary" aria-label="Call to action">
        <h1 className="stk-rv"><span>Let&rsquo;s build.</span></h1>
        <p className="stk-outro-sub">
          Post a role in minutes, or join the talent pool &mdash; Ethiopia&rsquo;s digital workforce is one deck away.
        </p>
        <div className="stk-cta-row">
          <button className="stk-outro-btn" onClick={() => onStart("register")}>Get started</button>
          <button className="stk-outro-ghost" onClick={() => onStart("login")}>Sign in</button>
        </div>
      </div>
    </section>
  );
}


/* ─────────────────────────────────────────────────
   Testimonials
───────────────────────────────────────────────── */
function TestimonialsSection() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReduced()) return;
    const id = window.setInterval(() => {
      setDir(1);
      setIdx((v) => (v + 1) % TESTIMONIALS.length);
    }, 6200);
    return () => window.clearInterval(id);
  }, [paused]);

  const go = (n: number) => { setDir(n > idx ? 1 : -1); setIdx(n); };
  const cur = TESTIMONIALS[idx];
  const h1 = cur.tone === "a" ? "var(--v2-primary)" : cur.tone === "b" ? "var(--v2-teal)" : "var(--v2-violet)";
  const h2 = cur.tone === "a" ? "var(--v2-teal)" : cur.tone === "b" ? "var(--v2-violet)" : "var(--v2-primary)";

  return (
    <section className="v2-section" style={{ paddingTop: 10 }}>
      <div className="v2-container" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="v2-center" style={{ marginBottom: 34 }}>
          <Reveal><span className="v2-eyebrow"><MessageCircle size={14} /> What members say</span></Reveal>
          <Reveal delay={0.06}><h2 className="v2-sec-title">Trust, in their words.</h2></Reveal>
        </div>
        <div className="v2-testi-stage">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.blockquote
              key={idx}
              className="v2-testi-card"
              custom={dir}
              initial={{ opacity: 0, x: dir * 70, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: dir * -70, scale: 0.98 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <span className="v2-testi-quote">"</span>
              <p>{cur.q}</p>
              <div className="v2-testi-who">
                <V2Avatar name={cur.name} size={46} radius={14} h1={h1} h2={h2} />
                <div><b>{cur.name}</b><span>{cur.role}</span></div>
                <V2Stars rating={5} />
              </div>
            </motion.blockquote>
          </AnimatePresence>
        </div>
        <div className="v2-testi-nav">
          <motion.button
            className="v2-icon-btn"
            style={{ width: 38, height: 38 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setDir(-1); setIdx((v) => (v - 1 + TESTIMONIALS.length) % TESTIMONIALS.length); }}
            aria-label="Previous"
          >
            <ChevronLeft size={17} />
          </motion.button>
          {TESTIMONIALS.map((_, n) => (
            <button key={n} className={`v2-tdot${n === idx ? " on" : ""}`} onClick={() => go(n)} aria-label={`Testimonial ${n + 1}`} />
          ))}
          <motion.button
            className="v2-icon-btn"
            style={{ width: 38, height: 38 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setDir(1); setIdx((v) => (v + 1) % TESTIMONIALS.length); }}
            aria-label="Next"
          >
            <ChevronRight size={17} />
          </motion.button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   About / Studio — editorial split layout
───────────────────────────────────────────────── */
function AboutSection({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <section className="v2-section v2-about" id="about" aria-labelledby="v2-about-title" style={{ paddingTop: 10 }}>
      <div className="v2-container">
        <Reveal amount={0.15}>
          <div className="v2-about-panel">
            {/* Left: copy + highlights */}
            <div className="v2-about-content">
              <span className="v2-about-eyebrow">Ethiopia's escrow-protected marketplace</span>

              <h2 className="v2-about-title" id="v2-about-title">
                Great work deserves
                <br />
                guaranteed payment.
              </h2>

              <p className="v2-about-intro">
                Yekis connects Ethiopian businesses with verified freelance talent —
                and keeps every payment locked in escrow until the work is delivered
                and approved. No chasing invoices, no awkward money conversations.
                Just clear rules both sides can trust.
              </p>

              <div className="v2-about-features">
                {ABOUT_FEATURES.map((feature) => (
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
                <span>More about Yekis</span>
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
                <span>Escrow</span>
                <span>Fayda KYC</span>
                <span>Mediation</span>
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
function FAQSection() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return FAQS.map((cat) => ({
      cat: cat.cat,
      items: cat.items.filter((it) => {
        if (!needle) return true;
        return `${it.q} ${it.a}`.toLowerCase().includes(needle);
      }),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <section className="v2-section" id="faq">
      <div className="v2-container">
        <div className="v2-center" style={{ marginBottom: 40 }}>
          <Reveal><span className="v2-eyebrow"><MessageCircle size={14} /> FAQ</span></Reveal>
          <Reveal delay={0.06}><h2 className="v2-sec-title">Frequently asked questions</h2></Reveal>
          <Reveal delay={0.12}><p className="v2-sec-sub" style={{ margin: "0 auto" }}>Straight answers about money, verification and disputes.</p></Reveal>
        </div>

        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 14, background: "var(--v2-surface)", border: "1px solid var(--v2-border)", marginBottom: 24, maxWidth: 640, margin: "0 auto 24px" }}>
            <Search size={17} color="var(--v2-text2)" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--v2-text)", fontSize: 14.5, fontFamily: "inherit" }}
            />
            <AnimatePresence>
              {q && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setQ("")}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--v2-text2)" }}
                >
                  <X size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </Reveal>

        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {groups.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 34, textAlign: "center", color: "var(--v2-text2)", border: "1px dashed var(--v2-border)", borderRadius: 14, fontSize: 14.5 }}>
              No question matches that. Try "escrow", "withdraw" or "KYC".
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {groups.map((g) => (
                <motion.div key={g.cat} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: EASE }} layout style={{ marginBottom: 30 }}>
                  <h3 style={{ fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--v2-primary)", marginBottom: 14, fontWeight: 700 }}>{g.cat}</h3>
                  {g.items.map((it) => {
                    const isOpen = openKey === it.q;
                    return (
                      <div key={it.q} style={{ borderBottom: "1px solid var(--v2-border)" }}>
                        <button
                          onClick={() => setOpenKey(isOpen ? null : it.q)}
                          aria-expanded={isOpen}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "19px 4px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: isOpen ? "var(--v2-primary)" : "var(--v2-text)", fontSize: 16, fontWeight: 600, fontFamily: "var(--v2-font-head)", transition: "color 0.3s" }}
                        >
                          <span>{it.q}</span>
                          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.35 }} style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 9, background: isOpen ? "var(--v2-primary)" : "var(--v2-surface)", color: isOpen ? "var(--v2-primary-ink)" : "var(--v2-text2)", border: `1px solid ${isOpen ? "transparent" : "var(--v2-border)"}`, flexShrink: 0 }}>
                            <ChevronDown size={15} />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.42, ease: EASE }} style={{ overflow: "hidden" }}>
                              <p style={{ padding: "0 4px 22px", fontSize: 14.8, lineHeight: 1.72, color: "var(--v2-text2)" }}>{it.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </AnimatePresence>
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
        <p className="v2-outro-kicker">
          <Sparkles />
          Ready to start?
        </p>
        <h2 id="ready-heading">Put your next project in motion.</h2>
        <p>
          Post a job or join as a freelancer with full escrow protection from
          start to finish.
        </p>
        <div className="v2-outro-actions">
          <button
            className="v2-outro-btn v2-outro-btn-primary"
            onClick={() => onStart("register")}
          >
            <span className="v2-outro-shine" aria-hidden />
            <Briefcase />
            <span>Post a job</span>
          </button>
          <button
            className="v2-outro-btn v2-outro-btn-ghost"
            onClick={() => onStart("register")}
          >
            <Award />
            <span>Find work</span>
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
  const NAV_COLS = [
    {
      heading: "Platform",
      links: [
        { label: "FAQ", page: "faq" },
        { label: "Fees", page: "fees" },
        { label: "Case Studies", page: "case-studies" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About Us", page: "about" },
        { label: "Contact Support", href: "mailto:support@yekis.com" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy Policy", page: "privacy" },
        { label: "Terms of Service", page: "terms" },
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
              Yekis connects Ethiopia&rsquo;s digital talent with clients
              worldwide &mdash; every contract escrow&#8209;protected, every
              milestone evidenced, from first brief to final payout.
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
              &copy; {year} Yekis &mdash; Addis Ababa &middot; Made for
              Ethiopia&rsquo;s digital workforce.
            </p>
            <span className="v2-footer-escrow">
              <ShieldCheck />
              Payments secured by Yekis Escrow
            </span>
          </div>
          <div className="v2-footer-legal">
            <span className="v2-footer-lang">EN / አማ</span>
            <button onClick={() => onNavigate("privacy")}>Privacy Policy</button>
            <button onClick={() => onNavigate("terms")}>Terms of Service</button>
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
              "Ethiopia's escrow-protected freelance marketplace. Post work, pay into escrow, get your result or your money back.",
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
      {/* Scroll progress bar */}
      <ScrollProgressBar />

      {/* Hero */}
      <HeroSection onStart={onStart} />


      {/* Stats */}
      <StatsSection />

      {/* How it works / Escrow */}
      <EscrowSection onNavigate={onNavigate} />

      {/* Fees */}
      <FeesSection />

      {/* Categories */}
      <CategoriesSection onStart={onStart} />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* About / Studio split */}
      <AboutSection onNavigate={onNavigate} />

      {/* FAQ */}
      <FAQSection />

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
