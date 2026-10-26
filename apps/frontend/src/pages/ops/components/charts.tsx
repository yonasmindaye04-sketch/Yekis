/* ────────────────────────────────────────────────────────────────────────
   charts.tsx — dependency-free SVG chart components for the Ops Console.
   Same geometry / animations as the HTML prototype: draw-in lines,
   grow-up bars, spin-in donut arcs, hover tooltips via ChartTipContext
   (the shell renders the single floating tooltip element).
   ──────────────────────────────────────────────────────────────────────── */

import { createContext, useContext } from "react";
import type { MouseEvent as RMouseEvent, ReactElement } from "react";
import { fmt, fmtE } from "../opsApi";

/* ── tooltip plumbing ── */
export interface ChartTipApi {
  show: (text: string, x: number, y: number) => void;
  hide: () => void;
}
export const ChartTipContext = createContext<ChartTipApi>({
  show: () => {},
  hide: () => {},
});
export const useChartTip = () => useContext(ChartTipContext);

/** plain helper (NOT a hook — safe inside .map): bind tooltip handlers */
const tipProps = (tip: ChartTipApi, text: string) => ({
  onMouseMove: (e: RMouseEvent) => tip.show(text, e.clientX, e.clientY),
  onMouseLeave: () => tip.hide(),
});

/* ── sparkline (stat cards) ── */
export function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 110;
  const h = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map(
    (v, i) =>
      [
        (i / (data.length - 1)) * w,
        h - 4 - ((v - min) / (max - min || 1)) * (h - 10),
      ] as const,
  );
  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className="draw"
      />
    </svg>
  );
}

function fmtAxisM(v: number, max: number): string {
  if (v === 0) return "0M";
  if (max < 8) return `${v.toFixed(1)}M`;
  return `${v.toFixed(0)}M`;
}

/* ── area / line chart ── */
export interface AreaChartProps {
  labels: string[];
  values: number[]; // ETB millions
  color: string;
  unit?: string;
}
export function AreaChart({ labels, values, color, unit = "ETB" }: AreaChartProps) {
  const tip = useChartTip();
  if (values.length < 2) {
    return <div className="empty">Not enough history to plot yet.</div>;
  }
  const W = 580, H = 195, L = 48, R = 14, T = 14, B = 28;
  const rawMax = Math.max(...values, 0);
  const max = rawMax > 0 ? rawMax * 1.16 : 4;
  const X = (i: number) => L + (i * (W - L - R)) / (values.length - 1);
  const Y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${X(values.length - 1).toFixed(1)} ${H - B} L${X(0).toFixed(1)} ${H - B} Z`;
  const gid = `ops-g${color.slice(1)}`;
  const step = Math.max(1, Math.ceil(labels.length / 7));
  const grid: ReactElement[] = [];
  for (let t = 0; t <= 4; t++) {
    const v = (max * t) / 4;
    const y = Y(v);
    grid.push(
      <g key={t}>
        <line x1={L} y1={y} x2={W - R} y2={y} stroke="#eef1f6" className="ops-gridline" />
        <text x={L - 8} y={y + 4} textAnchor="end" className="ax">
          {fmtAxisM(v, max)}
        </text>
      </g>,
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid}
      {labels.map((l, i) =>
        i % step === 0 || i === labels.length - 1 ? (
          <text key={i} x={X(i)} y={H - 7} textAnchor="middle" className="ax">
            {l}
          </text>
        ) : null,
      )}
      <path d={area} fill={`url(#${gid})`} className="fadeA" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        pathLength={1}
        className="draw"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={X(i)}
          cy={Y(v)}
          r={3.5}
          className="pt"
          stroke={color}
          {...tipProps(tip, `${labels[i]} · ${unit} ${v.toFixed(2)}M`)}
        />
      ))}
    </svg>
  );
}

/* ── grouped bar chart ── */
export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}
export function BarChart({ labels, series }: { labels: string[]; series: BarSeries[] }) {
  const tip = useChartTip();
  if (labels.length < 1 || series.every((s) => s.values.length < 1)) {
    return <div className="empty">Not enough history to plot yet.</div>;
  }
  const W = 580, H = 195, L = 48, R = 14, T = 14, B = 28;
  const rawMax = Math.max(...series.flatMap((s) => s.values), 0);
  const max = rawMax > 0 ? rawMax * 1.16 : 4;
  const gw = (W - L - R) / labels.length;
  const bw = Math.min(24, Math.max(8, (gw - 16) / series.length));
  const grid: ReactElement[] = [];
  for (let t = 0; t <= 4; t++) {
    const v = (max * t) / 4;
    const y = T + (1 - t / 4) * (H - T - B);
    grid.push(
      <g key={t}>
        <line x1={L} y1={y} x2={W - R} y2={y} stroke="#eef1f6" className="ops-gridline" />
        <text x={L - 8} y={y + 4} textAnchor="end" className="ax">
          {fmtAxisM(v, max)}
        </text>
      </g>,
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {grid}
      {labels.map((lb, i) => {
        const cx = L + gw * i + gw / 2;
        return (
          <g key={lb}>
            <text x={cx} y={H - 7} textAnchor="middle" className="ax">
              {lb}
            </text>
            {series.map((s, si) => {
              const v = s.values[i] ?? 0;
              const bh = Math.max(v > 0 ? 3 : 0, (v / max) * (H - T - B));
              const x =
                cx - (series.length * bw + 5 * (series.length - 1)) / 2 + si * (bw + 5);
              return (
                <rect
                  key={s.name}
                  x={x}
                  y={H - B - bh}
                  width={bw}
                  height={bh}
                  rx={3}
                  fill={s.color}
                  className="bar"
                  style={{ animationDelay: `${(i * series.length + si) * 45}ms` }}
                  {...tipProps(tip, `${lb} · ${s.name}: ETB ${v.toFixed(2)}M`)}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ── donut (amounts in minor units) ── */
export interface DonutSeg {
  label: string;
  value: number;
  color: string;
}
export function Donut({ segs, centerSub }: { segs: DonutSeg[]; centerSub: string }) {
  const tip = useChartTip();
  if (segs.length === 0) return <div className="empty">Nothing to split yet.</div>;
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const R = 54;
  const C = 2 * Math.PI * R;
  /* Arc start offsets, computed up front so render stays side-effect free. */
  const offsets = segs.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + (segs[i - 1].value / total) * C);
    return acc;
  }, []);
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut">
        {segs.map((s, i) => {
          const len = (s.value / total) * C;
          return (
            <circle
              key={s.label}
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={16}
              strokeDasharray={`${len.toFixed(1)} ${(C - len).toFixed(1)}`}
              strokeDashoffset={-offsets[i]}
              transform="rotate(-90 70 70)"
              className="dseg"
              {...tipProps(
                tip,
                `${s.label}: ${fmt(s.value)} · ${Math.round((s.value / total) * 100)}%`,
              )}
            />
          );
        })}
        <text x={70} y={66} textAnchor="middle" className="d-num">
          {fmtE(total)}
        </text>
        <text x={70} y={82} textAnchor="middle" className="ax">
          {centerSub}
        </text>
      </svg>
      <div className="legend">
        {segs.map((s) => (
          <div className="lg-row" key={s.label}>
            <span className="lg-dot" style={{ background: s.color }} />
            <span className="lg-l">{s.label}</span>
            <b>{fmtE(s.value)}</b>
            <span className="lg-p">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── horizontal workload / category bars (counts) ── */
export interface HBarRow {
  label: string;
  value: number;
  color: string;
  meta?: string;
}
export function HBars({ rows }: { rows: HBarRow[] }) {
  if (rows.length === 0) return <div className="empty">Nothing to compare yet.</div>;
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  return (
    <div className="hbars">
      {rows.map((r, i) => (
        <div className="hb-row" key={r.label}>
          <div className="hb-top">
            <span className="hb-l">{r.label}</span>
            <b className="hb-v">
              {r.value}
              {r.meta ? <span className="hb-m"> {r.meta}</span> : null}
            </b>
          </div>
          <div className="hb-track">
            <div
              className="hb-fill"
              style={{
                width: `${((r.value / max) * 100).toFixed(1)}%`,
                background: r.color,
                animationDelay: `${i * 70}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartLegend({ series }: { series: { name: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <span className="cl-item" key={s.name}>
          <span className="lg-dot" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}
