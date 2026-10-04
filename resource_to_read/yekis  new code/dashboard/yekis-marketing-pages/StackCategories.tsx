"use client";

import { useEffect, useRef } from "react";

/* ────────────────────────────────────────────────────────────────────────
   StackCategories — the YEKIS category page as a pinned editorial card
   stack: six wide category cards sit centred in a leaning deck; as you
   scroll, the front card LIFTS up and tilts back off the top while the card
   behind rises and scales into focus.

   · single normalised progress 0→1, one rAF loop, transforms written straight
     to the DOM (no per-frame re-render, no libs)
   · the deck is split into N−1 equal SEGMENTS — one per DEAL. The last card
     is never dealt away: progress 1 ends with card 06 in focus, and the
     "Let's build" outro scrolls in immediately after it (no dead space).
   · active card slides yPercent −50 → −200 and rotateX 0 → 35°; dealt cards
     park at −250 / 35°; waiting cards rise + scale up as the segment runs
   · LOADING BEAT — on mount each card rises out of the bottom of the stage
     (faded, tilted forward, small), staggered front → back, ease-out-expo
   · LIVE MOTION — pointer tilt on the whole deck, scroll-velocity inertia
     (fast scrolls rock the deck back, then it eases home), inner parallax
     between copy + media columns during a deal, floating icons, pulsing
     glows, outro reveal on entry
   · inside the gallery card the route can't scroll → same timeline AUTO-PLAYS
     on a loop (?card). Honours prefers-reduced-motion.
   ──────────────────────────────────────────────────────────────────────── */

const Y_OFFSET = 4; // % each waiting card sits below the one in front
const SCALE_STEP = 0.06; // each waiting card is this much smaller

/* Loading / entrance beat */
const ENTER_Y = 62; // start below centre, off the bottom edge
const ENTER_RX = -16; // tilted forward (opposite of the deal-away tilt)
const ENTER_SCALE = 0.88;
const CARD_MS = 950; // each card's own entrance duration
const STAGGER_MS = 110; // delay between successive cards

/* Live motion */
const TILT_X = 2.6; // deg of rotateX per unit pointer offset
const TILT_Y = 3.4; // deg of rotateY per unit pointer offset
const VEL_KICK = 240; // scroll-delta → deg gain
const VEL_MAX = 6; // clamp on the inertia kick
const PARALLAX = 7; // % the inner columns travel during a deal

type Category = {
  idx: string;
  kicker: string;
  title: string;
  roles: number;
  tag: string;
  bg: string;
  ac: string;
  glow: string;
  icon: keyof typeof ICONS;
};

const ICONS = {
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  palette: (
    <>
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C19.965 6.012 15.463 2 12 2z" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  pen: (
    <>
      <path d="m12 19 7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </>
  ),
  languages: (
    <>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0V5" />
    </>
  ),
};

const CARDS: Category[] = [
  { idx: "01", kicker: "01 / Engineering", title: "Web & App Development", roles: 148, tag: "Full-stack · Mobile · API", bg: "#123f36", ac: "#5eead4", glow: "rgba(94,234,212,.20)", icon: "code" },
  { idx: "02", kicker: "02 / Design", title: "Graphic Design & Branding", roles: 96, tag: "Identity · Print · UI", bg: "#332a5e", ac: "#b7a4fb", glow: "rgba(183,164,251,.20)", icon: "palette" },
  { idx: "03", kicker: "03 / Marketing", title: "Digital Marketing", roles: 74, tag: "SEO · Social · Paid", bg: "#3c4510", ac: "#d3f16a", glow: "rgba(211,241,106,.18)", icon: "megaphone" },
  { idx: "04", kicker: "04 / Content", title: "Content & Copywriting", roles: 61, tag: "Editorial · UX · Scripts", bg: "#0f3e3d", ac: "#6ee7d8", glow: "rgba(110,231,216,.20)", icon: "pen" },
  { idx: "05", kicker: "05 / Language", title: "Amharic / English Translation", roles: 53, tag: "Localisation · Subtitling", bg: "#401d52", ac: "#e0aaff", glow: "rgba(224,170,255,.20)", icon: "languages" },
  { idx: "06", kicker: "06 / Data", title: "Data Processing", roles: 88, tag: "Annotation · ETL · QA", bg: "#423610", ac: "#fde047", glow: "rgba(253,224,71,.18)", icon: "database" },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

// ~6s reveal + ~1s hold; the gallery reloads the iframe on the same beat.
const LOOP_MS = 7000;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default function StackCategories() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const curRef = useRef<HTMLElement | null>(null);
  const countRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const outroRef = useRef<HTMLElement | null>(null);
  const isCard =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("card");

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const copies = cards.map((c) => c.querySelector(".stk-copy") as HTMLElement);
    const medias = cards.map((c) => c.querySelector(".stk-media") as HTMLElement);
    const total = cards.length;
    // One segment per DEAL (total − 1): the last card is never dealt away,
    // so p = 1 ends with card 06 in focus and the outro right behind it.
    const segment = 1 / (total - 1);
    const introTotal = (total - 1) * STAGGER_MS + CARD_MS;
    const easeOutExpo = (t: number) => {
      t = clamp(t, 0, 1);
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    // Deck pose for card i at normalised progress p (written into `out`).
    const pose = { y: 0, rx: 0, sc: 1, t: 0 };
    const deckPose = (i: number, p: number) => {
      const active = Math.min(Math.floor(p / segment), total - 1);
      const segP = clamp((p - active * segment) / segment, 0, 1);
      if (i < active) {
        pose.y = -250; pose.rx = 35; pose.sc = 1; pose.t = 1;
      } else if (i === active) {
        pose.y = lerp(-50, -200, segP); pose.rx = lerp(0, 35, segP); pose.sc = 1; pose.t = segP;
      } else {
        const behind = i - active;
        pose.y = -50 + (behind - segP) * Y_OFFSET;
        pose.rx = 0;
        pose.sc = 1 - (behind - segP) * SCALE_STEP;
        pose.t = 0;
      }
      return active;
    };

    // Write the deck: blend entrance pose → deck pose by the intro ease,
    // plus the inner-column parallax for the card currently dealing.
    const render = (p: number, elapsed: number) => {
      let active = 0;
      cards.forEach((card, i) => {
        active = deckPose(i, p);
        const e =
          elapsed >= introTotal
            ? 1
            : easeOutExpo((elapsed - i * STAGGER_MS) / CARD_MS);
        const y = lerp(ENTER_Y, pose.y, e);
        const rx = lerp(ENTER_RX, pose.rx, e);
        const sc = lerp(ENTER_SCALE, pose.sc, e);
        card.style.opacity = clamp(e * 1.6, 0, 1).toFixed(3);
        card.style.transform = `translate(-50%, ${y.toFixed(
          2
        )}%) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        const t = pose.t * e; // parallax rides in with the entrance
        copies[i].style.transform = `translate3d(0,${(t * -PARALLAX).toFixed(2)}%,0)`;
        medias[i].style.transform = `translate3d(0,${(t * PARALLAX).toFixed(2)}%,0) scale(${(1 - t * 0.05).toFixed(3)})`;
      });
      if (curRef.current)
        curRef.current.textContent = String(active + 1).padStart(2, "0");
      if (countRef.current)
        countRef.current.classList.toggle("on", elapsed >= introTotal);
    };

    // Scroll cue: meaningless in the gallery embed (no scroll there).
    const cueEl = cueRef.current;
    if (isCard && cueEl) cueEl.style.display = "none";
    const cueCheck = () => {
      if (cueEl) cueEl.classList.toggle("hide", window.scrollY > 60);
    };

    // Outro reveal once it scrolls into view.
    const outroEl = outroRef.current;
    let io: IntersectionObserver | undefined;
    if (outroEl) {
      if (reduced || !("IntersectionObserver" in window)) {
        outroEl.classList.add("on");
      } else {
        io = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                outroEl.classList.add("on");
                io?.disconnect();
              }
            });
          },
          { threshold: 0.35 }
        );
        io.observe(outroEl);
      }
    }

    if (reduced) {
      render(0, Infinity); // skip entrance + motion, show the settled deck
      if (cueEl) {
        cueEl.classList.add("on"); // static cue, no pulse
        cueCheck();
        window.addEventListener("scroll", cueCheck, { passive: true });
      }
      return () => {
        io?.disconnect();
        window.removeEventListener("scroll", cueCheck);
      };
    }

    // Hide the deck for the very first frame so nothing flashes pre-intro.
    cards.forEach((c) => {
      c.style.opacity = "0";
    });

    // Pointer tilt targets (−1…1), smoothed in the loop.
    let tx = 0, ty = 0, sx = 0, sy = 0;
    const pinEl = pinRef.current;
    const onMove = (e: PointerEvent) => {
      if (!pinEl) return;
      const r = pinEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      tx = 0; ty = 0;
    };
    pinEl?.addEventListener("pointermove", onMove);
    pinEl?.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const introStart = performance.now();
    let lastP = 0, vel = 0;

    const motion = (p: number) => {
      // scroll inertia: quick scrolls rock the deck back, then it eases home
      vel = lerp(vel, clamp((p - lastP) * VEL_KICK, -VEL_MAX, VEL_MAX), 0.12);
      lastP = p;
      // smoothed pointer tilt
      sx = lerp(sx, tx, 0.06);
      sy = lerp(sy, ty, 0.06);
      if (stageRef.current)
        stageRef.current.style.transform = `rotateX(${(vel - sy * TILT_X).toFixed(2)}deg) rotateY(${(sx * TILT_Y).toFixed(2)}deg)`;
    };

    if (isCard) {
      // No scroll inside the card — auto-play the timeline on a loop,
      // starting once the entrance beat has finished.
      const loopStart = introStart + introTotal;
      const tick = (now: number) => {
        let p = 0;
        if (now >= loopStart) {
          const t = ((now - loopStart) % LOOP_MS) / LOOP_MS;
          const revealEnd = 6000 / LOOP_MS; // ease through reveal, hold last frame
          p = t < revealEnd ? t / revealEnd : 1;
        }
        motion(p);
        render(clamp(p, 0, 1), now - introStart);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        io?.disconnect();
        pinEl?.removeEventListener("pointermove", onMove);
        pinEl?.removeEventListener("pointerleave", onLeave);
      };
    }

    // Standalone: drive by the pinned wrapper's scroll position.
    const wrap = document.getElementById("stk-wrap");
    const tick = (now: number) => {
      let p = 0;
      if (wrap) {
        const top = wrap.getBoundingClientRect().top;
        const span = wrap.offsetHeight - window.innerHeight;
        p = clamp(-top / span, 0, 1);
      }
      motion(p);
      render(p, now - introStart);
      // scroll cue: fade in once the deck has settled, slip away on first scroll
      if (cueRef.current) {
        cueRef.current.classList.toggle("on", now - introStart >= introTotal);
        cueRef.current.classList.toggle("hide", p > 0.02);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      pinEl?.removeEventListener("pointermove", onMove);
      pinEl?.removeEventListener("pointerleave", onLeave);
    };
  }, [isCard]);

  // Identical markup on server + client (no isCard branch in the tree, so no
  // hydration mismatch): the pinned deck sits first so the gallery card shows
  // it straight away; isCard only swaps the effect's driver (auto-play vs.
  // scroll). The outro below gives the standalone page somewhere to scroll to.
  return (
    <div className="stk-root">
      <StyleTag />

      <div id="stk-wrap" className="stk-wrap">
        <section className="stk-pin" ref={pinRef as React.RefObject<HTMLElement>}>
          <div className="stk-stage" ref={stageRef}>
            {CARDS.map((c, i) => (
              <div
                key={c.idx}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="stk-card"
                style={
                  {
                    background: c.bg,
                    zIndex: CARDS.length - i,
                    opacity: 0, // hidden until the entrance beat writes it
                    "--ac": c.ac,
                    "--glow": c.glow,
                  } as React.CSSProperties
                }
              >
                <div className="stk-col stk-copy">
                  <div>
                    <p className="k">{c.kicker}</p>
                    <h2>{c.title}</h2>
                  </div>
                  <div className="row">
                    <span className="roles">{c.roles} open roles</span>
                    <span className="chip">
                      <Arrow />
                    </span>
                  </div>
                </div>
                <div className="stk-col stk-media">
                  <span className="tag">{c.tag}</span>
                  <span className="ic">
                    <Icon name={c.icon} />
                  </span>
                  <p className="num">{c.idx}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="stk-count" ref={countRef}>
            <b ref={curRef as React.RefObject<HTMLSpanElement>}>01</b> / 0{CARDS.length}
          </div>
          <div className="stk-scroll" ref={cueRef} aria-hidden="true">
            <span className="circle">
              <span className="ring" />
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7 7" />
              </svg>
            </span>
            <span className="lbl">Scroll</span>
          </div>
        </section>
      </div>

      <section className="stk-flat stk-outro" ref={outroRef as React.RefObject<HTMLElement>}>
        <h1 className="stk-rv"><span>Let&rsquo;s build.</span></h1>
        <p className="stk-sub">
          Post a role in minutes, or join the talent pool &mdash; Ethiopia&rsquo;s
          digital workforce is one deck away.
        </p>
        <div className="stk-cta">
          <a className="stk-btn" href="#">Get started</a>
          <a className="stk-ghost" href="#">Sign in</a>
        </div>
      </section>
    </div>
  );
}

function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;700;800;900&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

      .stk-root{position:relative;width:100%;background:#0a0c0d;color:#f2f5f4;
        font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
      .stk-root *,.stk-root *::before,.stk-root *::after{box-sizing:border-box;}
      .stk-root ::selection{background:#a3e635;color:#0a0c0d;}

      /* 5 deals × ~140svh + 100svh pinned = 800svh */
      .stk-wrap{position:relative;width:100%;height:800svh;}
      .stk-pin{position:sticky;top:0;width:100%;height:100svh;overflow:hidden;perspective:1200px;
        background:radial-gradient(90% 70% at 50% 110%,rgba(34,197,94,.07),transparent 60%),#0a0c0d;}
      .stk-stage{position:absolute;inset:0;will-change:transform;}

      .stk-card{position:absolute;top:50%;left:50%;width:66%;height:62%;display:flex;gap:1.4rem;padding:2.4rem;
        border-radius:1.2rem;color:#fff;transform-origin:center bottom;will-change:transform,opacity;
        backface-visibility:hidden;border:1px solid rgba(255,255,255,.09);
        box-shadow:0 40px 90px -40px rgba(0,0,0,.75);}
      .stk-col{flex:1;height:100%;min-width:0;will-change:transform;}
      .stk-copy{display:flex;flex-direction:column;justify-content:space-between;padding:.4rem;}
      .stk-copy .k{margin:0;font-family:'DM Mono',monospace;font-size:.8rem;letter-spacing:.2em;
        text-transform:uppercase;opacity:.8;}
      .stk-copy h2{margin:.6rem 0 0;font-family:'Big Shoulders Display',sans-serif;font-weight:800;
        text-transform:uppercase;line-height:.88;letter-spacing:0;font-size:clamp(2.4rem,4.8vw,4.8rem);}
      .stk-copy .row{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
      .stk-copy .roles{font-family:'DM Mono',monospace;font-size:.8rem;letter-spacing:.08em;opacity:.85;}
      .stk-card .chip{width:42px;height:42px;border-radius:50%;flex:none;
        border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);display:grid;place-items:center;
        transition:transform .3s cubic-bezier(.16,1,.3,1),background .3s;}
      .stk-card:hover .chip{transform:translateX(4px);background:rgba(255,255,255,.14);}
      .stk-card .chip svg{width:16px;height:16px;stroke:#fff;}
      .stk-media{position:relative;border-radius:.9rem;overflow:hidden;border:1px solid rgba(255,255,255,.08);
        background:repeating-linear-gradient(-45deg,rgba(255,255,255,.045) 0 1px,transparent 1px 12px),
          rgba(0,0,0,.30);}
      /* pulsing accent glow */
      .stk-media::after{content:'';position:absolute;inset:0;pointer-events:none;
        background:radial-gradient(120% 90% at 72% 18%,var(--glow),transparent 62%);
        animation:stk-pulse 5.5s ease-in-out infinite;}
      @keyframes stk-pulse{0%,100%{opacity:.4}50%{opacity:.95}}
      .stk-card:nth-child(2) .stk-media::after{animation-delay:-.9s}
      .stk-card:nth-child(3) .stk-media::after{animation-delay:-1.8s}
      .stk-card:nth-child(4) .stk-media::after{animation-delay:-2.7s}
      .stk-card:nth-child(5) .stk-media::after{animation-delay:-3.6s}
      .stk-card:nth-child(6) .stk-media::after{animation-delay:-4.5s}
      .stk-media .num{position:absolute;right:.4rem;bottom:-1.2rem;margin:0;font-family:'Big Shoulders Display',sans-serif;
        font-weight:900;line-height:.8;font-size:clamp(6rem,13vw,12rem);color:transparent;
        -webkit-text-stroke:2px rgba(255,255,255,.26);}
      .stk-media .ic{position:absolute;inset:0;display:grid;place-items:center;}
      /* icons float gently, out of phase with each other */
      .stk-media .ic svg{width:32%;height:auto;stroke:var(--ac);stroke-width:1.3;
        filter:drop-shadow(0 6px 24px var(--glow));fill:none;stroke-linecap:round;stroke-linejoin:round;
        animation:stk-float 7s ease-in-out infinite;}
      @keyframes stk-float{0%,100%{transform:translateY(-5px)}50%{transform:translateY(7px)}}
      .stk-card:nth-child(2) .ic svg{animation-delay:-1.2s}
      .stk-card:nth-child(3) .ic svg{animation-delay:-2.3s}
      .stk-card:nth-child(4) .ic svg{animation-delay:-3.5s}
      .stk-card:nth-child(5) .ic svg{animation-delay:-4.6s}
      .stk-card:nth-child(6) .ic svg{animation-delay:-5.8s}
      .stk-media .tag{position:absolute;top:1rem;left:1rem;z-index:1;font-family:'DM Mono',monospace;font-size:.66rem;
        letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.62);}

      .stk-count{position:absolute;right:2rem;bottom:1.8rem;z-index:40;font-family:'DM Mono',monospace;
        font-size:.74rem;letter-spacing:.2em;color:#98a2a0;
        opacity:0;transition:opacity .6s ease .2s;}
      .stk-count.on{opacity:1;}
      .stk-count b{color:#a3e635;font-weight:500;}

      /* scroll-down cue, bottom-centre of the pinned stage */
      .stk-scroll{position:absolute;left:50%;bottom:2rem;z-index:45;pointer-events:none;
        display:flex;flex-direction:column;align-items:center;gap:.55rem;
        transform:translate(-50%,0);
        opacity:0;transition:opacity .5s ease,transform .5s cubic-bezier(.16,1,.3,1);}
      .stk-scroll.on{opacity:1;}
      .stk-scroll.on.hide{opacity:0;transform:translate(-50%,14px);}
      .stk-scroll .circle{position:relative;width:46px;height:46px;border-radius:50%;
        border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.04);
        backdrop-filter:blur(4px);display:grid;place-items:center;}
      /* expanding ping ring */
      .stk-scroll .ring{position:absolute;inset:-1px;border-radius:50%;
        border:1px solid rgba(163,230,53,.55);animation:stk-ring 2.4s ease-out infinite;}
      @keyframes stk-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.55);opacity:0}}
      .stk-scroll .circle svg{width:16px;height:16px;stroke:#a3e635;stroke-width:2;fill:none;
        stroke-linecap:round;stroke-linejoin:round;
        animation:stk-drip 1.6s cubic-bezier(.4,0,.2,1) infinite;}
      @keyframes stk-drip{0%{transform:translateY(-4px);opacity:0}30%{opacity:1}100%{transform:translateY(6px);opacity:0}}
      .stk-scroll .lbl{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.34em;
        text-transform:uppercase;color:rgba(255,255,255,.55);}

      .stk-flat{position:relative;width:100%;min-height:100svh;overflow:hidden;display:flex;
        flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:5rem 6vw;}
      .stk-flat h1{margin:0;font-family:'Big Shoulders Display',sans-serif;font-weight:900;text-transform:uppercase;
        line-height:.92;letter-spacing:.005em;font-size:clamp(3.6rem,12vw,12rem);color:#fff;}
      .stk-rv{overflow:hidden;}
      .stk-rv span{display:inline-block;transform:translateY(115%);
        transition:transform 1s cubic-bezier(.16,1,.3,1);}
      .stk-outro.on .stk-rv span{transform:translateY(0);}
      .stk-sub{color:#98a2a0;font-size:clamp(1rem,1.4vw,1.15rem);max-width:52ch;margin:1.4rem auto 2.6rem;line-height:1.6;}
      .stk-outro .stk-sub,.stk-outro .stk-cta{opacity:0;transform:translateY(26px);
        transition:opacity .8s ease .3s,transform .8s cubic-bezier(.16,1,.3,1) .3s;}
      .stk-outro.on .stk-sub,.stk-outro.on .stk-cta{opacity:1;transform:none;}
      .stk-cta{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;}
      .stk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;background:#22c55e;color:#06110a;
        border:none;cursor:pointer;font-family:'DM Mono',monospace;font-weight:500;font-size:.78rem;letter-spacing:.08em;
        padding:.85rem 1.5rem;border-radius:10px;text-decoration:none;transition:transform .2s,filter .2s;}
      .stk-btn:hover{transform:translateY(-1px);filter:brightness(1.08);}
      .stk-ghost{display:inline-flex;align-items:center;padding:.85rem 1.6rem;border-radius:10px;
        border:1px solid rgba(255,255,255,.22);color:#f2f5f4;text-decoration:none;
        font-family:'DM Mono',monospace;font-size:.78rem;letter-spacing:.08em;
        transition:border-color .2s,transform .2s;}
      .stk-ghost:hover{border-color:rgba(255,255,255,.5);transform:translateY(-1px);}
      .stk-outro{background:#060807;}

      @media (max-width:1000px){
        .stk-card{width:calc(100% - 2.4rem);height:78%;flex-direction:column;padding:1.5rem;gap:1rem;}
        .stk-copy h2{font-size:clamp(2rem,9vw,3.2rem);}
        .stk-media .num{font-size:5rem;bottom:-.6rem;}
        .stk-media .ic svg{width:26%;}
        .stk-count{right:1.2rem;bottom:1rem;}
        .stk-scroll{bottom:1rem;gap:.4rem;}
        .stk-scroll .circle{width:40px;height:40px;}
      }
      @media (prefers-reduced-motion:reduce){
        .stk-btn:hover,.stk-ghost:hover{transform:none;}
        .stk-count,.stk-rv span,.stk-outro .stk-sub,.stk-outro .stk-cta{transition:none;}
        .stk-rv span{transform:none;}
        .stk-outro .stk-sub,.stk-outro .stk-cta{opacity:1;transform:none;}
        .stk-media::after,.stk-media .ic svg{animation:none;}
        .stk-scroll{transition:none;}
        .stk-scroll .ring,.stk-scroll .circle svg{animation:none;}
        .stk-scroll .circle svg{transform:none;opacity:1;}
      }
    `}</style>
  );
}
