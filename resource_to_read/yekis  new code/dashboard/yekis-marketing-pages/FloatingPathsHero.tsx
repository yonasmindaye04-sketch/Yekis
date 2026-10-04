import React, { useEffect, useState } from 'react';

type Props = { className?: string };

export const FloatingPathsHero: React.FC<Props> = ({ className }) => {
  const layerRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLElement>(null);
  const pathsARef = React.useRef<HTMLDivElement>(null);
  const pathsBRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('yekis-theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('yekis-theme', theme); } catch (e) {}
  }, [theme]);

  // 36 sweeping curves per layer, mirrored twice. Each path drifts on ONE
  // seamless linear loop (dash period = pathLength), desynced with negative
  // delays: continuous, unidirectional, no flicker, no snap.
  const build = (el: HTMLDivElement | null, position: number) => {
    if (!el) return;
    const NS = 'http://www.w3.org/2000/svg';
    el.innerHTML = '';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 696 316');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 36; i++){
      const a = 380 - i * 5 * position, b = 189 + i * 6;
      const c = 312 - i * 5 * position, e = 216 - i * 6;
      const f = 152 - i * 5 * position, g = 343 - i * 6;
      const h = 616 - i * 5 * position, k = 470 - i * 6;
      const m = 684 - i * 5 * position, n = 875 - i * 6;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d',
        'M-' + a + ' -' + b +
        ' C-' + a + ' -' + b + ' -' + c + ' ' + e + ' ' + f + ' ' + g +
        ' C' + h + ' ' + k + ' ' + m + ' ' + n + ' ' + m + ' ' + n);
      p.setAttribute('pathLength', '1');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', (0.5 + i * 0.03).toFixed(2));
      p.setAttribute('stroke-opacity', Math.min(0.1 + i * 0.025, 0.85).toFixed(3));
      p.setAttribute('stroke-linecap', 'round');
      p.style.setProperty('--fd', (9 + ((i * 7) % 8)) + 's');   // flow speed
      p.style.setProperty('--dl', (-((i * 13) % 17)) + 's');    // desync phase
      svg.appendChild(p);
    }
    el.appendChild(svg);
  };

  // hand the title's transform over to the hover transition once the
  // entrance spring has finished (a filled animation would outrank it)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settle = () => titleRef.current?.classList.add('settled');
    if (reduced){ settle(); return; }
    const t = window.setTimeout(settle, 2200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => { build(pathsARef.current, 1); build(pathsBRef.current, -1); }, []);

  // gentle pointer parallax: path field drifts with the cursor, hero leans back
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    let tx = 0, ty = 0, sx = 0, sy = 0, raf = 0;
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
    };
    const loop = () => {
      sx += (tx - sx) * 0.045;
      sy += (ty - sy) * 0.045;
      if (layerRef.current)
        layerRef.current.style.transform =
          'translate3d(' + (sx * 14).toFixed(2) + 'px,' + (sy * 10).toFixed(2) + 'px,0)';
      if (heroRef.current)
        heroRef.current.style.transform =
          'translate3d(' + (sx * -6).toFixed(2) + 'px,' + (sy * -4).toFixed(2) + 'px,0)';
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, {passive:true});
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  const letters = [
    {ch:'F', d:'0s', i:0}, {ch:'i', d:'.035s', i:1}, {ch:'n', d:'.07s', i:2}, {ch:'d', d:'.105s', i:3},
    {ch:'t', d:'.12s', i:4}, {ch:'h', d:'.155s', i:5}, {ch:'e', d:'.19s', i:6},
    {ch:'r', d:'.24s', i:7}, {ch:'i', d:'.275s', i:8}, {ch:'g', d:'.31s', i:9}, {ch:'h', d:'.345s', i:10}, {ch:'t', d:'.38s', i:11},
    {ch:'e', d:'.36s', i:12}, {ch:'x', d:'.395s', i:13}, {ch:'p', d:'.43s', i:14}, {ch:'e', d:'.465s', i:15}, {ch:'r', d:'.5s', i:16}, {ch:'t', d:'.535s', i:17}, {ch:'i', d:'.57s', i:18}, {ch:'s', d:'.605s', i:19}, {ch:'e', d:'.64s', i:20}, {ch:'.', d:'.675s', i:21},
  ];
  const words = [4, 3, 5, 10];

  return (
    <main className={'fp-page' + (className ? ' ' + className : '')} data-theme={theme}>
      <button
        className="theme-toggle"
        type="button"
        aria-label="Toggle colour theme"
        onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      >
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        )}
      </button>

      <div className="fp-glow fp-glow-one"></div>
      <div className="fp-glow fp-glow-two"></div>

      <div className="fp-paths-layer" ref={layerRef}>
        <div className="floating-paths fp-a" ref={pathsARef}></div>
        <div className="floating-paths fp-b" ref={pathsBRef}></div>
      </div>

      <section className="fp-hero" ref={heroRef}>
        <h1 className="fp-title" ref={titleRef} aria-label="Find the right expertise.">
          {(() => {
            let idx = 0;
            return words.map((count, w) => (
              <span className="fp-word" key={w}>
                {letters.slice(idx, (idx += count)).map((l, li) => (
                  <span className="fp-letter" key={li} style={{['--d' as any]: l.d, ['--i' as any]: l.i}}>
                    {l.ch}
                  </span>
                ))}
              </span>
            ));
          })()}
        </h1>
        <div className="fp-cta">
          <a className="fp-btn" href="#">Get started</a>
          <a className="fp-ghost" href="#">Browse categories</a>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;700;900&display=swap');

        .fp-page{
          --bg:#070908;
          --ink:#f2f5f4;
          --muted:#98a2a0;
          --green:#22c55e;
          --btn-ink:#06110a;
          --lime:#a3e635;
          --purple:#a78bfa;
          --pop-glow:rgba(167,139,250,.55);
          --path-a:#34d399;
          --path-b:#a3e635;
          --glow-1:rgba(34,197,94,.15);
          --glow-2:rgba(163,230,53,.10);
          --line:rgba(255,255,255,.22);
          --chip:rgba(255,255,255,.04);
          --stagger:35ms;
          --spring:cubic-bezier(.34,1.56,.64,1);

          position:relative;width:100%;min-height:100svh;overflow:hidden;
          display:grid;place-items:center;
          background:var(--bg);color:var(--ink);
          font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;
          transition:background .45s ease,color .45s ease;
        }
        .fp-page[data-theme="light"]{
          --bg:#f4f5f1;
          --ink:#121612;
          --muted:#5b655d;
          --green:#16a34a;
          --btn-ink:#ffffff;
          --lime:#4d7c0f;
          --purple:#7c3aed;
          --pop-glow:rgba(124,58,237,.35);
          --path-a:#059669;
          --path-b:#65a30d;
          --glow-1:rgba(34,197,94,.16);
          --glow-2:rgba(101,163,13,.12);
          --line:rgba(0,0,0,.22);
          --chip:rgba(0,0,0,.04);
        }
        .fp-page ::selection{background:var(--lime);color:var(--bg)}

        .theme-toggle{
          position:fixed;top:1.4rem;right:1.6rem;z-index:10;
          width:44px;height:44px;border-radius:50%;
          border:1px solid var(--line);background:var(--chip);
          backdrop-filter:blur(6px);display:grid;place-items:center;
          cursor:pointer;color:var(--ink);
          transition:border-color .3s,transform .4s var(--spring),background .45s ease;
        }
        .theme-toggle:hover{transform:rotate(18deg) scale(1.08);border-color:var(--lime)}
        .theme-toggle svg{width:18px;height:18px;stroke:currentColor;fill:none;
          stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

        .fp-glow{position:absolute;border-radius:50%;pointer-events:none;
          width:72vmax;height:72vmax}
        .fp-glow-one{top:-28vmax;left:-22vmax;
          background:radial-gradient(circle,var(--glow-1),transparent 60%);
          animation:fp-drift 18s ease-in-out infinite alternate}
        .fp-glow-two{bottom:-32vmax;right:-24vmax;
          background:radial-gradient(circle,var(--glow-2),transparent 60%);
          animation:fp-drift 22s ease-in-out -9s infinite alternate-reverse}
        @keyframes fp-drift{
          from{transform:translate3d(0,0,0) scale(1)}
          to{transform:translate3d(6vmax,4vmax,0) scale(1.16)}
        }

        .fp-paths-layer{position:absolute;inset:-3rem;will-change:transform}
        .floating-paths{position:absolute;inset:0;transition:color .45s ease}
        .fp-a{color:var(--path-a)}
        .fp-b{color:var(--path-b);transform:scaleX(-1)}
        .floating-paths svg{width:100%;height:100%;display:block}
        .floating-paths path{
          stroke-dasharray:.32 .68;
          animation:fp-flow var(--fd) linear var(--dl) infinite;
        }
        @keyframes fp-flow{to{stroke-dashoffset:-1}}

        .fp-hero{position:relative;z-index:2;text-align:center;padding:2rem 6vw;max-width:980px}
        .fp-title{
          margin:0;perspective:900px;
          font-family:'Big Shoulders Display',sans-serif;font-weight:900;
          text-transform:uppercase;line-height:1.1;letter-spacing:.005em;
          font-size:clamp(3rem,9.5vw,9rem);
          cursor:default;user-select:none;
        }
        .fp-word{display:inline-block;white-space:nowrap;margin-right:.28em}
        .fp-letter{
          display:inline-block;opacity:0;transform-origin:50% 100%;
          will-change:transform;
          animation:fp-letter .9s var(--spring) var(--d) forwards;
          transition:
            transform .55s var(--spring),
            color .3s ease,
            text-shadow .3s ease;
          transition-delay:calc(var(--i) * var(--stagger));
        }
        @keyframes fp-letter{
          from{opacity:0;transform:translateY(90px) rotateX(-60deg)}
          to{opacity:1;transform:none}
        }
        .fp-title.settled .fp-letter{animation:none;opacity:1;transform:none}
        .fp-title:hover .fp-letter{
          transform:translateY(-.18em) scale(1.22);
          color:var(--purple);
          text-shadow:0 0 28px var(--pop-glow);
        }

        .fp-cta{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:2.6rem}
        .fp-btn{
          animation:fp-up .9s ease .9s both;border:none;cursor:pointer;
          display:inline-flex;align-items:center;justify-content:center;
          background:var(--green);color:var(--btn-ink);border-radius:10px;
          font-family:'DM Mono',monospace;font-weight:500;font-size:.8rem;letter-spacing:.08em;
          padding:.95rem 1.8rem;text-decoration:none;
          transition:transform .25s var(--spring),box-shadow .25s,filter .25s;
        }
        .fp-btn:hover{transform:translateY(-2px);filter:brightness(1.1);
          box-shadow:0 12px 40px -12px rgba(34,197,94,.55)}
        .fp-ghost{
          animation:fp-up .9s ease 1.02s both;
          display:inline-flex;align-items:center;padding:.95rem 1.7rem;border-radius:10px;
          border:1px solid var(--line);color:var(--ink);text-decoration:none;
          font-family:'DM Mono',monospace;font-size:.8rem;letter-spacing:.08em;
          transition:border-color .25s,transform .25s var(--spring);
        }
        .fp-ghost:hover{border-color:var(--lime);transform:translateY(-2px)}
        @keyframes fp-up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}

        @media (prefers-reduced-motion:reduce){
          .fp-letter{animation:none;opacity:1;transform:none;transition:color .2s ease,text-shadow .2s ease}
          .fp-title:hover .fp-letter{transform:none}
          .fp-btn,.fp-ghost{animation:none;opacity:1;transform:none}
          .fp-glow{animation:none}
          .theme-toggle{transition:border-color .3s}
          .floating-paths path{animation:none;stroke-dasharray:none;opacity:.55}
        }
      `}</style>
    </main>
  );
};

export default FloatingPathsHero;
