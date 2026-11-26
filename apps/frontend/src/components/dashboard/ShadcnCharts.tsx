import { useMemo, useState, useId } from "react";
import type { Milestone, TopUpRequest } from "../../api/client";
import type { TimeRangeKey, TimeSeriesPoint } from "./dashboardData";
import { FUNDED_ESCROW_STATES } from "./dashboardData";
import { GlassCard } from "../ui-v2/GlassCard";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";
import { ContextualHelpTrigger } from "../guide/ContextualHelpTrigger";


const DAY_MS = 86_400_000;

type RailBucket = "telebirrETB" | "cbeBirrETB" | "mpesaETB";

/**
 * Maps a stored rail onto the three rails the platform settles on.
 *
 * Only TELEBIRR, CBE Birr and M-Pesa are ever written to a payment record:
 * the escrow funding service has clients for exactly those three. Anything
 * else (including a null rail, which means the money came from the caller's
 * own wallet balance) has no rail to report and is returned as null so it is
 * never attributed to a rail it did not travel over.
 */
function railBucket(
  rail: string | null | undefined,
): RailBucket | null {
  switch ((rail || "").toUpperCase()) {
    case "TELEBIRR":
      return "telebirrETB";
    case "CBE_BIRR":
    case "CBE":
    case "BANK":
    case "CBE_BANK":
      return "cbeBirrETB";
    case "M_PESA":
    case "MPESA":
    case "SAFARICOM":
      return "mpesaETB";
    default:
      return null;
  }
}

/**
 * Builds the workspace cash-flow / settlement series from the caller's own
 * records.
 *
 * This used to end with a "realistic" synthetic curve: a floor of ETB 48,000,
 * a hand-tuned profile per range and a rail split that was a fixed
 * percentage of the total. A brand-new account therefore saw a populated
 * chart describing activity that never happened to them.
 *
 * Now every bucket is the sum of real movements inside that bucket and
 * nothing else:
 *   - escrow inflow  = milestones whose escrow was funded (`fundedAt`)
 *   - payout released = milestones that were released (`releasedAt`)
 *   - rail volume    = escrow funding by rail + approved wallet top-ups by rail
 *
 * A bucket with no activity is zero. The chart renders an empty state instead
 * of a curve.
 */
export function buildLiveTimeSeries(
  range: TimeRangeKey,
  milestones: Milestone[] = [],
  topUps: TopUpRequest[] = [],
  overrideSeries?: TimeSeriesPoint[],
): TimeSeriesPoint[] {
  if (overrideSeries && overrideSeries.length > 0) {
    return overrideSeries;
  }

  const now = Date.now();
  const bucketCount =
    range === "7d" ? 7 : range === "30d" ? 8 : range === "90d" ? 9 : 12;
  const spanDays =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const stepMs = (spanDays * DAY_MS) / bucketCount;
  const startMs = now - spanDays * DAY_MS;

  const buckets: TimeSeriesPoint[] = Array.from({ length: bucketCount }, (_, i) => {
    const bucketDate = new Date(startMs + (i + 1) * stepMs);
    const label =
      range === "12m"
        ? bucketDate.toLocaleDateString("en-US", { month: "short" })
        : range === "7d"
          ? bucketDate.toLocaleDateString("en-US", { weekday: "short" })
          : bucketDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      label,
      escrowInflowETB: 0,
      payoutReleasedETB: 0,
      telebirrETB: 0,
      cbeBirrETB: 0,
      mpesaETB: 0,
      milestonesCompleted: 0,
    };
  });

  /** -1 when the timestamp is missing or falls outside the window. */
  const placeInBucket = (isoDate: string | null | undefined): number => {
    if (!isoDate) return -1;
    const ts = new Date(isoDate).getTime();
    if (!Number.isFinite(ts)) return -1;
    if (ts < startMs || ts > now) return -1;
    const idx = Math.floor((ts - startMs) / stepMs);
    return Math.max(0, Math.min(bucketCount - 1, idx));
  };

  for (const ms of milestones) {
    const etb = Math.round((ms.amountMinor || 0) / 100);

    if (FUNDED_ESCROW_STATES.has(ms.escrowState)) {
      const idx = placeInBucket(ms.fundedAt);
      if (idx >= 0) {
        buckets[idx].escrowInflowETB += etb;
        const bucket = railBucket(ms.paymentRail);
        if (bucket) buckets[idx][bucket] += etb;
      }
    }

    if (ms.escrowState === "RELEASED") {
      const idx = placeInBucket(ms.releasedAt);
      if (idx >= 0) {
        buckets[idx].payoutReleasedETB += etb;
        buckets[idx].milestonesCompleted += 1;
      }
    }
  }

  for (const t of topUps) {
    if (t.status !== "APPROVED") continue;
    const idx = placeInBucket(t.createdAt);
    if (idx < 0) continue;
    const etb = Math.round((t.amountMinor || 0) / 100);
    const bucket = railBucket(t.provider ?? t.paymentMethod);
    if (bucket) buckets[idx][bucket] += etb;
  }

  return buckets;
}

/** True when the window holds at least one real escrow movement. */
export function hasCashflowActivity(points: TimeSeriesPoint[]): boolean {
  return points.some(
    (p) => p.escrowInflowETB > 0 || p.payoutReleasedETB > 0,
  );
}

/** True when the window holds at least one real rail movement. */
export function hasRailActivity(points: TimeSeriesPoint[]): boolean {
  return points.some(
    (p) => p.telebirrETB > 0 || p.cbeBirrETB > 0 || p.mpesaETB > 0,
  );
}

interface CashflowChartProps {
  range: TimeRangeKey;
  onRangeChange: (r: TimeRangeKey) => void;
  milestones?: Milestone[];
  topUps?: TopUpRequest[];
  series?: TimeSeriesPoint[];
}

export function InteractiveCashflowAreaChart({
  range,
  onRangeChange,
  milestones,
  topUps,
  series,
}: CashflowChartProps) {
  const points = useMemo(
    () => buildLiveTimeSeries(range, milestones, topUps, series),
    [range, milestones, topUps, series],
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showInflow, setShowInflow] = useState(true);
  const [showReleased, setShowReleased] = useState(true);
  const uid = useId().replace(/:/g, "");
  const { t, language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).charts;
  const dChart = t.workspace.dashboard;
  const isEmpty = !hasCashflowActivity(points);

  const width = 680;
  const height = 228;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(
    1,
    ...points.map((p) =>
      Math.max(
        showInflow ? p.escrowInflowETB : 0,
        showReleased ? p.payoutReleasedETB : 0,
      ),
    ),
  );

  const xAt = (i: number) =>
    padL + (i / Math.max(1, points.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - v / maxVal) * plotH;

  const buildSmoothPath = (vals: number[]) => {
    if (vals.length === 0) return "";
    const coords = vals.map((v, i) => [xAt(i), yAt(v)] as const);
    let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const [x0, y0] = coords[i];
      const [x1, y1] = coords[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  };

  const inflowVals = points.map((p) => p.escrowInflowETB);
  const releasedVals = points.map((p) => p.payoutReleasedETB);

  const inflowLine = buildSmoothPath(inflowVals);
  const inflowArea = `${inflowLine} L ${xAt(points.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const releasedLine = buildSmoothPath(releasedVals);
  const releasedArea = `${releasedLine} L ${xAt(points.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const totalInflow = inflowVals.reduce((a, b) => a + b, 0);
  const totalReleased = releasedVals.reduce((a, b) => a + b, 0);

  const formatCompactETB = (val: number) => {
    if (val >= 1_000_000) return `ETB ${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `ETB ${(val / 1_000).toFixed(0)}K`;
    return `ETB ${val}`;
  };

  const activePoint = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];

  return (
    <GlassCard className="sh-card" data-tour="dashboard-cashflow-chart">
      <div className="sh-card-header">
        <div>
          <div className="yk-help-heading-row">
            <h3 className="sh-card-title">{copy.cashflowTitle}</h3>
            <ContextualHelpTrigger helpId="dashboard-cashflow" />
          </div>
          <p className="sh-card-desc">
            {copy.cashflowDesc}
          </p>
        </div>
        <div className="sh-segmented" role="group" aria-label={copy.windowAria}>
          {(["7d", "30d", "90d", "12m"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`sh-seg-btn ${range === r ? "active" : ""}`}
              onClick={() => onRangeChange(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="sh-chart-empty" role="status">
          <strong>{dChart.chartEmptyTitle}</strong>
          <span>{dChart.chartEmptyDesc}</span>
        </div>
      ) : (
        <>
      {/* Summary & interactive series toggles */}
      <div className="sh-chart-summary-bar">
        <button
          type="button"
          className={`sh-series-toggle ${showInflow ? "active" : "muted"}`}
          onClick={() => {
            if (showInflow && !showReleased) return;
            setShowInflow(!showInflow);
          }}
        >
          <span className="sh-series-swatch emerald" />
          <span className="sh-series-meta">
            <small>{copy.escrowFunded(range.toUpperCase())}</small>
            <strong className="sh-mono">ETB {totalInflow.toLocaleString()}</strong>
          </span>
        </button>

        <button
          type="button"
          className={`sh-series-toggle ${showReleased ? "active" : "muted"}`}
          onClick={() => {
            if (showReleased && !showInflow) return;
            setShowReleased(!showReleased);
          }}
        >
          <span className="sh-series-swatch teal" />
          <span className="sh-series-meta">
            <small>{copy.releasedToTalent(range.toUpperCase())}</small>
            <strong className="sh-mono">ETB {totalReleased.toLocaleString()}</strong>
          </span>
        </button>

        <div className="sh-chart-live-readout">
          <small>{hoverIdx !== null ? copy.periodLabel(activePoint.label) : copy.latestLabel(activePoint.label)}</small>
          <span className="sh-mono">
            {copy.inPrefix} ETB {activePoint.escrowInflowETB.toLocaleString()} · {copy.outPrefix} ETB{" "}
            {activePoint.payoutReleasedETB.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="sh-svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="sh-chart-svg"
          role="img"
          aria-label={copy.cashflowSvgAria}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`inflow-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`released-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = padT + (1 - step) * plotH;
            const val = Math.round(maxVal * step);
            return (
              <g key={step}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="var(--ops-border, var(--color-border))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  strokeWidth="1"
                />
                <text
                  x={padL - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="sh-svg-axis-text"
                >
                  {formatCompactETB(val).replace("ETB ", "")}
                </text>
              </g>
            );
          })}

          {/* Area & Line Series */}
          {showInflow && (
            <>
              <path d={inflowArea} fill={`url(#inflow-${uid})`} />
              <path
                d={inflowLine}
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </>
          )}

          {showReleased && (
            <>
              <path d={releasedArea} fill={`url(#released-${uid})`} />
              <path
                d={releasedLine}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Hover Vertical Crosshair */}
          {hoverIdx !== null && (
            <line
              x1={xAt(hoverIdx)}
              x2={xAt(hoverIdx)}
              y1={padT}
              y2={padT + plotH}
              stroke="var(--color-primary)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points & Hit Columns */}
          {points.map((pt, i) => {
            const x = xAt(i);
            const yIn = yAt(pt.escrowInflowETB);
            const yOut = yAt(pt.payoutReleasedETB);
            const colW = plotW / Math.max(1, points.length);
            const isHovered = hoverIdx === i;
            return (
              <g key={pt.label}>
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  className="sh-svg-axis-text"
                >
                  {pt.label}
                </text>
                {showInflow && (
                  <circle
                    cx={x}
                    cy={yIn}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#16a34a"
                    stroke="var(--color-bg-elevated)"
                    strokeWidth="1.5"
                  />
                )}
                {showReleased && (
                  <circle
                    cx={x}
                    cy={yOut}
                    r={isHovered ? 4 : 2}
                    fill="#0d9488"
                    stroke="var(--color-bg-elevated)"
                    strokeWidth="1.5"
                  />
                )}
                <rect
                  x={x - colW / 2}
                  y={padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
        </>
      )}
    </GlassCard>
  );
}

export function InteractiveRailVelocityBarChart({
  range,
  milestones,
  topUps,
  series,
}: {
  range: TimeRangeKey;
  milestones?: Milestone[];
  topUps?: TopUpRequest[];
  series?: TimeSeriesPoint[];
}) {
  const points = useMemo(
    () =>
      series && series.length > 0
        ? series
        : buildLiveTimeSeries(range, milestones, topUps),
    [series, range, milestones, topUps],
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { t, language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).charts;
  const dChart = t.workspace.dashboard;
  const isEmpty = !hasRailActivity(points);

  const width = 440;
  const height = 228;
  const padL = 44;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxTotal = Math.max(
    1,
    ...points.map((p) => p.telebirrETB + p.cbeBirrETB + p.mpesaETB),
  );

  const active = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];

  return (
    <GlassCard className="sh-card" data-tour="dashboard-rail-mix">
      <div className="sh-card-header">
        <div>
          <div className="yk-help-heading-row">
            <h3 className="sh-card-title">{copy.railMixTitle}</h3>
            <ContextualHelpTrigger helpId="dashboard-rail-mix" />
          </div>
          <p className="sh-card-desc">
            {copy.railMixDesc(range.toUpperCase())}
          </p>
        </div>
        <span className="sh-mono sh-text-muted" style={{ fontSize: "0.76rem" }}>
          {copy.milestonesSettled(active.milestonesCompleted)}
        </span>
      </div>

      {isEmpty ? (
        <div className="sh-chart-empty" role="status">
          <strong>{dChart.chartEmptyTitle}</strong>
          <span>{dChart.chartRailEmptyDesc}</span>
        </div>
      ) : (
        <>
      <div className="sh-rail-legend-row">
        <span className="sh-rail-legend-item">
          <i style={{ background: "#16a34a" }} /> Telebirr:{" "}
          <b className="sh-mono">ETB {active.telebirrETB.toLocaleString()}</b>
        </span>
        <span className="sh-rail-legend-item">
          <i style={{ background: "#0d9488" }} /> CBE Birr:{" "}
          <b className="sh-mono">ETB {active.cbeBirrETB.toLocaleString()}</b>
        </span>
        <span className="sh-rail-legend-item">
          <i style={{ background: "#64748b" }} /> M-Pesa:{" "}
          <b className="sh-mono">ETB {active.mpesaETB.toLocaleString()}</b>
        </span>
      </div>

      <div className="sh-svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="sh-chart-svg"
          role="img"
          aria-label={copy.railSvgAria}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {[0, 0.5, 1].map((step) => {
            const y = padT + (1 - step) * plotH;
            const val = Math.round((maxTotal * step) / 1000);
            return (
              <g key={step}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="var(--ops-border, var(--color-border))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="sh-svg-axis-text"
                >
                  {val}K
                </text>
              </g>
            );
          })}

          {points.map((pt, i) => {
            const slotW = plotW / points.length;
            const barW = Math.min(28, slotW * 0.56);
            const x = padL + i * slotW + (slotW - barW) / 2;

            const hTele = (pt.telebirrETB / maxTotal) * plotH;
            const hCbe = (pt.cbeBirrETB / maxTotal) * plotH;
            const hMpesa = (pt.mpesaETB / maxTotal) * plotH;

            const yTele = padT + plotH - hTele;
            const yCbe = yTele - hCbe;
            const yMpesa = yCbe - hMpesa;

            return (
              <g
                key={pt.label}
                onMouseEnter={() => setHoverIdx(i)}
                style={{ cursor: "pointer" }}
                opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.65}
              >
                <rect
                  x={x}
                  y={yTele}
                  width={barW}
                  height={Math.max(2, hTele)}
                  fill="#16a34a"
                  rx="2"
                />
                <rect
                  x={x}
                  y={yCbe}
                  width={barW}
                  height={Math.max(2, hCbe)}
                  fill="#0d9488"
                />
                <rect
                  x={x}
                  y={yMpesa}
                  width={barW}
                  height={Math.max(2, hMpesa)}
                  fill="#64748b"
                  rx="2"
                />
                <text
                  x={x + barW / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className="sh-svg-axis-text"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
        </>
      )}
    </GlassCard>
  );
}
