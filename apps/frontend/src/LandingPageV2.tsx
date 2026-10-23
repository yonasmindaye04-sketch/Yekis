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
  useInView,
} from "framer-motion";
import {
  Wallet,
  Briefcase,
  CheckCircle,
  Shield,
  ShieldCheck,
  Clock,
  Check,
  Circle,
  CircleDot,
  Eye,
  File,
  MessageSquare,
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
  Lock,
  Zap,
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

function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 0.55,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
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
      const eased = 1 - Math.pow(1 - p, 3);
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

function HeroSection() {
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
        {/* No hero CTAs: the header already carries "Sign in" and
            "Get started", so repeating them here competed with the slogan. */}
        <SpringTitle text={t.marketing.hero.title} settled={settled} />
      </div>
    </section>
  );
}


/* ─────────────────────────────────────────────────
   Stats
───────────────────────────────────────────────── */
function StatsSection() {
  const { t } = useI18n();
  const statCards = [
    {
      Icon: Briefcase,
      tone: "blue" as const,
      to: 12480,
      suffix: "+",
      label: t.marketing.stats.jobsCompleted,
      desc: t.marketing.stats.jobsCompletedDesc,
    },
    {
      Icon: Users,
      tone: "purple" as const,
      to: 3940,
      suffix: "+",
      label: t.marketing.stats.verifiedFreelancers,
      desc: t.marketing.stats.verifiedFreelancersDesc,
    },
    {
      Icon: ShieldCheck,
      tone: "green" as const,
      to: 84.6,
      decimals: 1,
      suffix: "M",
      label: t.marketing.stats.securedEscrow,
      desc: t.marketing.stats.securedEscrowDesc,
    },
    {
      Icon: Zap,
      tone: "amber" as const,
      to: 6.5,
      decimals: 1,
      suffix: " hrs",
      label: t.marketing.stats.avgPayout,
      desc: t.marketing.stats.avgPayoutDesc,
    },
  ];

  return (
    <section className="v2-section-sm v2-stats" aria-label="Platform metrics">
      <div className="v2-stats-spot" aria-hidden="true" />
      <div className="v2-stats-grid" aria-hidden="true" />
      <div className="v2-stats-noise" aria-hidden="true" />

      <div className="v2-container">
        <div className="v2-stats-row">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              className="v2-stat"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: EASE }}
            >
              <article className={`v2-stat-card v2-stat-card--${s.tone}`}>
                <span className="v2-stat-orb" aria-hidden="true" />
                <span className="v2-stat-shine" aria-hidden="true" />

                <div className="v2-stat-inner">
                  <div className="v2-stat-top">
                    <span className="v2-stat-label">{s.label}</span>
                    <span className="v2-stat-ico" aria-hidden="true">
                      <s.Icon size={19} strokeWidth={1.9} />
                    </span>
                  </div>
                  <div className="v2-stat-val">
                    <CountUp to={s.to} decimals={s.decimals ?? 0} suffix={s.suffix ?? ""} />
                  </div>
                  <div className="v2-stat-rule" aria-hidden="true" />
                  <span className="v2-stat-desc">{s.desc}</span>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   Escrow / How it works — slogan, stepper + product stage
   ───────────────────────────────────────────────── */
const ESC_DUR = 4200;

/* Status pill on a product screen. Solid tint, bold ink — never a
   low-opacity wash (see .agents/AGENTS.md). */
function EscBadge({ tone = "green", children }: { tone?: "green" | "gray"; children: React.ReactNode }) {
  return <span className={`esc-badge${tone === "gray" ? " is-gray" : ""}`}>{children}</span>;
}

/* ---- 01 · Fund ---- */
function EscScreenFund() {
  return (
    <div className="esc-p">
      <div className="esc-p-head">
        <span className="esc-p-label">Project budget</span>
        <EscBadge><Lock size={14} />Locked in escrow</EscBadge>
      </div>
      <p className="esc-amount">$2,400<span>.00</span></p>
      <div className="esc-card">
        <div className="esc-row">
          <span className="esc-ic"><Wallet size={20} /></span>
          <span className="esc-txt">
            <b>Escrow vault</b>
            <small>Held safely &mdash; never sent until you approve</small>
          </span>
          <span className="esc-val">100%</span>
        </div>
        <div className="esc-bar" style={{ "--esc-w": "100%" } as React.CSSProperties}><i /></div>
        <div className="esc-row esc-row-sub">
          <span>Deposit &middot; Visa &bull;&bull; 4021</span>
          <span className="esc-val">$2,400.00</span>
        </div>
      </div>
      <div className="esc-chips">
        <span className="esc-chip"><Lock size={14} />Balance locked</span>
        <span className="esc-chip"><ShieldCheck size={14} />Protection on</span>
      </div>
    </div>
  );
}

/* ---- 02 · Work ---- */
function EscScreenWork() {
  return (
    <div className="esc-p">
      <div className="esc-p-head">
        <span className="esc-p-label">Milestones</span>
        <EscBadge><Briefcase size={14} />Milestone 2 of 3</EscBadge>
      </div>
      <div className="esc-mlist">
        <div className="esc-mrow">
          <span className="esc-st is-done"><Check size={15} strokeWidth={3} /></span>
          <span className="esc-txt">
            <b>Brand identity</b>
            <small>Approved &middot; delivered Mar 6</small>
          </span>
        </div>
        <div className="esc-mrow">
          <span className="esc-st is-now"><CircleDot size={15} /></span>
          <span className="esc-txt">
            <b>Website build</b>
            <small>Submitted for review &middot; deliverables &amp; notes attached</small>
            <span className="esc-files">
              <span className="esc-file"><File size={12} />homepage.fig</span>
              <span className="esc-file"><File size={12} />style-guide.pdf</span>
            </span>
          </span>
        </div>
        <div className="esc-mrow">
          <span className="esc-st is-wait"><Circle size={15} /></span>
          <span className="esc-txt">
            <b>Launch support</b>
            <small>Queued &middot; starts after this approval</small>
          </span>
        </div>
      </div>
      <div className="esc-person">
        <span className="esc-avatar">AK</span>
        <span className="esc-txt">
          <b>Ana Kova&#269;</b>
          <small>Freelancer &middot; designer &amp; developer</small>
        </span>
        <span className="esc-online"><i />online</span>
      </div>
    </div>
  );
}

/* ---- 03 · Approve ---- */
function EscScreenApprove() {
  return (
    <div className="esc-p">
      <div className="esc-p-head">
        <span className="esc-p-label">Review delivery</span>
        <EscBadge><CheckCircle size={14} />Ready to approve</EscBadge>
      </div>
      <div className="esc-card esc-preview">
        <span className="esc-thumb"><Eye size={24} /></span>
        <span className="esc-txt">
          <b>Website build &mdash; v2</b>
          <small>&ldquo;Final homepage, style guide and handoff docs. Staging link is in the notes &mdash; ready whenever you are.&rdquo; &middot; Ana</small>
        </span>
      </div>
      <div className="esc-actions">
        <button type="button" className="esc-btn">
          Approve &amp; release $800 <ArrowRight size={16} />
        </button>
        <button type="button" className="esc-btn is-ghost">Request changes</button>
      </div>
      <div className="esc-count">
        <Clock size={16} />
        Auto-release in 5 days if you do nothing
        <span className="esc-bar" style={{ "--esc-w": "22%" } as React.CSSProperties}><i /></span>
      </div>
    </div>
  );
}

/* ---- 04 · Protected ---- */
const ESC_CASES = [
  { Icon: File, title: "Brief & scope uploaded", meta: "Mar 2 \u00b7 09:14" },
  { Icon: MessageSquare, title: "Thread: scope change agreed", meta: "Mar 9 \u00b7 16:40 \u00b7 both parties confirmed" },
  { Icon: CheckCircle, title: "Delivery v2 received", meta: "Mar 14 \u00b7 11:02" },
];

function EscScreenProtected() {
  return (
    <div className="esc-p">
      <div className="esc-p-head">
        <span className="esc-p-label">Resolution center</span>
        <EscBadge><ShieldCheck size={14} />Mediation open</EscBadge>
      </div>
      <div className="esc-card esc-flush">
        <div className="esc-row">
          <span className="esc-ic"><Shield size={20} /></span>
          <span className="esc-txt">
            <b>Evidence&#8209;backed review</b>
            <small>Every file, message and approval is time&#8209;stamped and attached to this case.</small>
          </span>
        </div>
      </div>
      <div className="esc-tl">
        {ESC_CASES.map((c) => (
          <div key={c.title} className="esc-tl-item">
            <span className="esc-ic is-gray"><c.Icon size={16} /></span>
            <span className="esc-txt">
              <b>{c.title}</b>
              <small>{c.meta}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="esc-person">
        <span className="esc-avatar">YS</span>
        <span className="esc-txt">
          <b>YEKIS Support</b>
          <small>Mediator assigned &middot; replies in under 24h</small>
        </span>
      </div>
    </div>
  );
}

const ESC_SCREENS = [EscScreenFund, EscScreenWork, EscScreenApprove, EscScreenProtected];

function EscrowSection() {
  const { t } = useI18n();
  const moduleRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const seen = useInView(moduleRef, { amount: 0.25 });

  const steps = [
    {
      n: "01",
      tone: "blue" as const,
      Icon: Wallet,
      title: t.marketing.escrow.step1Title,
      body: t.marketing.escrow.step1Desc,
    },
    {
      n: "02",
      tone: "purple" as const,
      Icon: Briefcase,
      title: t.marketing.escrow.step2Title,
      body: t.marketing.escrow.step2Desc,
    },
    {
      n: "03",
      tone: "green" as const,
      Icon: CheckCircle,
      title: t.marketing.escrow.step3Title,
      body: t.marketing.escrow.step3Desc,
    },
    {
      n: "04",
      tone: "amber" as const,
      Icon: ShieldCheck,
      title: t.marketing.escrow.step4Title,
      body: t.marketing.escrow.step4Desc,
    },
  ];

  /* honour a mid-session motion preference change */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* autoplay — only once the module is on screen, and never under
     reduced motion or while the pointer/focus is inside it */
  useEffect(() => {
    if (still || !seen || paused) return;
    const interval = window.setInterval(() => setActive((i) => (i + 1) % steps.length), ESC_DUR);
    return () => window.clearInterval(interval);
  }, [still, seen, paused, active, steps.length]);

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = active + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = steps.length - 1;
    else return;
    e.preventDefault();
    const i = (next + steps.length) % steps.length;
    setActive(i);
    tabRefs.current[i]?.focus();
  };

  return (
    <section className="v2-section" id="how-it-works">
      <div className="v2-container">
        <div
          ref={moduleRef}
          className={`esc-module${paused ? " is-paused" : ""}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
          }}
        >
          <Reveal className="esc-slogan-wrap">
            <h2 className="esc-slogan">{t.marketing.escrow.slogan}</h2>
          </Reveal>

          <div
            className="esc-steps"
            role="tablist"
            aria-label="How YEKIS works, four steps"
            onKeyDown={onKey}
          >
            {steps.map((s, i) => (
              <div
                key={s.n}
                className={`esc-step-wrap${i === active ? " is-active" : ""}`}
              >
                <button
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`esc-tab-${i}`}
                  aria-selected={i === active}
                  aria-controls={`esc-panel-${i}`}
                  tabIndex={i === active ? 0 : -1}
                  className={`esc-step v2-stat-card--${s.tone}${i === active ? " is-active" : ""}`}
                  onClick={() => setActive(i)}
                >
                  <span className="v2-stat-orb" aria-hidden="true" />
                  <span className="v2-stat-shine" aria-hidden="true" />
                  <span className="esc-step-inner">
                    <span className="esc-step-top">
                      <span className="esc-step-label">STEP {s.n}</span>
                      <span className="esc-step-ico" aria-hidden="true">
                        <s.Icon size={19} strokeWidth={1.9} />
                      </span>
                    </span>
                    <span className="esc-step-h">
                      {s.title}
                      <i className="esc-step-live" />
                    </span>
                    <span className="esc-step-rule" aria-hidden="true" />
                    <span className="esc-step-p">{s.body}</span>
                  </span>
                  <span className="esc-step-track"><i /></span>
                </button>
              </div>
            ))}
          </div>

          <div className="esc-stage">
            <div className="esc-chrome" aria-hidden="true">
              <span className="esc-dots"><i /><i /><i /></span>
              <span className="esc-url">app.yekis.com / escrow / <b>YK-2481</b></span>
              <span className="esc-chrome-gap" />
            </div>
            <div className="esc-app">
              {ESC_SCREENS.map((Screen, i) => (
                <div
                  key={steps[i].n}
                  id={`esc-panel-${i}`}
                  role="tabpanel"
                  aria-labelledby={`esc-tab-${i}`}
                  inert={i !== active}
                  className={`esc-panel${i === active ? " is-active" : ""}`}
                >
                  <Screen />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
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
   Categories — pinned scroll-stack deck
───────────────────────────────────────────────── */
function CategoriesSection({ onStart }: { onStart: (m: "login" | "register") => void }) {
  const { t } = useI18n();
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
    const ENTER_Y    = 24, ENTER_RX = -6, ENTER_SCALE = 0.94;
    const CARD_MS    = 260, STAGGER_MS = 30;
    const TILT_X = 2.0, TILT_Y = 2.6;
    const PARALLAX   = 5;
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
        card.style.opacity   = clamp(e * 1.8, 0, 1).toFixed(3);
        card.style.transform = `translate(-50%, ${y.toFixed(2)}%) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        const t = pose.t * e;
        copies[i].style.transform = `translate3d(0,${(t * -PARALLAX).toFixed(2)}%,0)`;
        medias[i].style.transform = `translate3d(0,${(t * PARALLAX).toFixed(2)}%,0) scale(${(1 - t * 0.04).toFixed(3)})`;
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
          { threshold: 0.12 },
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

    let tx = 0, ty = 0;
    const updateDeck = () => {
      rafRef.current = 0;
      const rect = wrap!.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const span = Math.max(1, wrap!.offsetHeight - window.innerHeight);
      const p    = clamp(-rect.top / span, 0, 1);
      stage!.style.transform =
        `rotateX(${(-ty * TILT_X).toFixed(2)}deg) rotateY(${(tx * TILT_Y).toFixed(2)}deg)`;
      render(p, Infinity);
      countEl!.classList.add("on");
      cue!.classList.add("on");
      cue!.classList.toggle("hide", p > 0.02);
    };

    const scheduleUpdate = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateDeck);
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = pin.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      scheduleUpdate();
    };
    const onLeave = () => { tx = 0; ty = 0; scheduleUpdate(); };

    render(0, Infinity);
    countEl.classList.add("on");
    cue.classList.add("on");
    updateDeck();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    pin.addEventListener("pointermove", onMove, { passive: true });
    pin.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", scheduleUpdate);
      pin.removeEventListener("pointermove", onMove);
      pin.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const deckCards = [
    {
      cardClass: "stk-card--1",
      klass: t.marketing.categories.c1Class,
      titleL1: t.marketing.categories.c1Title1,
      titleL2: t.marketing.categories.c1Title2,
      roles: t.marketing.categories.c1Roles,
      tag: t.marketing.categories.c1Tag,
      Icon: Code,
    },
    {
      cardClass: "stk-card--2",
      klass: t.marketing.categories.c2Class,
      titleL1: t.marketing.categories.c2Title1,
      titleL2: t.marketing.categories.c2Title2,
      roles: t.marketing.categories.c2Roles,
      tag: t.marketing.categories.c2Tag,
      Icon: Palette,
    },
    {
      cardClass: "stk-card--3",
      klass: t.marketing.categories.c3Class,
      titleL1: t.marketing.categories.c3Title1,
      titleL2: t.marketing.categories.c3Title2,
      roles: t.marketing.categories.c3Roles,
      tag: t.marketing.categories.c3Tag,
      Icon: Megaphone,
    },
    {
      cardClass: "stk-card--4",
      klass: t.marketing.categories.c4Class,
      titleL1: t.marketing.categories.c4Title1,
      titleL2: t.marketing.categories.c4Title2,
      roles: t.marketing.categories.c4Roles,
      tag: t.marketing.categories.c4Tag,
      Icon: PenTool,
    },
    {
      cardClass: "stk-card--5",
      klass: t.marketing.categories.c5Class,
      titleL1: t.marketing.categories.c5Title1,
      titleL2: t.marketing.categories.c5Title2,
      roles: t.marketing.categories.c5Roles,
      tag: t.marketing.categories.c5Tag,
      Icon: Languages,
    },
    {
      cardClass: "stk-card--6",
      klass: t.marketing.categories.c6Class,
      titleL1: t.marketing.categories.c6Title1,
      titleL2: t.marketing.categories.c6Title2,
      roles: t.marketing.categories.c6Roles,
      tag: t.marketing.categories.c6Tag,
      Icon: Database,
    },
  ];

  return (
    <section className="v2-section" id="categories" style={{ paddingTop: 20, paddingBottom: 0 }}>
      {/* section header */}
      <div className="v2-container">
        <Reveal delay={0.05}><h2 className="v2-sec-title">{t.marketing.categories.title}</h2></Reveal>
        <Reveal delay={0.1}>
          <p className="v2-sec-sub" style={{ marginBottom: 38 }}>
            {t.marketing.categories.subtitle}
          </p>
        </Reveal>
      </div>

      {/* pinned deck — 800svh scroll space */}
      <div className="stk-wrap" ref={wrapRef}>
        <div className="stk-pin" ref={pinRef}>
          <div className="stk-stage" ref={stageRef}>
            {deckCards.map((card, i) => (
              <div
                key={card.cardClass}
                className={`stk-card ${card.cardClass}`}
                style={{ zIndex: deckCards.length - i }}
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
            <b ref={curRef}>01</b> / {String(deckCards.length).padStart(2, "0")}
          </div>

          {/* scroll cue */}
          <div className="stk-scroll" ref={cueRef} aria-hidden="true">
            <span className="stk-circle">
              <span className="stk-ring" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
              </svg>
            </span>
            <span className="lbl">{t.marketing.categories.scrollCue}</span>
          </div>
        </div>
      </div>

      {/* outro — always-dark "Let's build." panel */}
      <div className="stk-flat stk-outro" ref={outroRef} role="complementary" aria-label="Call to action">
        <h1 className="stk-rv"><span>{t.marketing.categories.outroTitle}</span></h1>
        <p className="stk-outro-sub">
          {t.marketing.categories.outroSubtitle}
        </p>
        <div className="stk-cta-row">
          <button className="stk-outro-btn" onClick={() => onStart("register")}>{t.nav.getStarted}</button>
          <button className="stk-outro-ghost" onClick={() => onStart("login")}>{t.nav.signIn}</button>
        </div>
      </div>
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
      <HeroSection />


      {/* Stats */}
      <StatsSection />

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
