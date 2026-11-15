// One measure, season by season since 2001, for the end of the printout: a grey line through the seasons, the usual
// middle half of 2001-2020 shaded, and the last five seasons' stretch of the line in dark ink with a dashed line at
// their middle, its figure written beside it. That is the comparison behind the Why screen's steps (seasonBand and SIGNAL_RULES in
// src/data/field-rules.js). A season with no data breaks the line: it is never drawn as zero or joined across.
// Plain SVG, no library. Written with AI assistance (Claude, Anthropic).
import type { Lang, Series } from "../data/types";
import { seasonBand } from "../data/field-rules.js";
import { useLang, useT } from "../i18n";
import { sourceText } from "../i18n/sources";
import { unitText } from "./FactParts";

const W = 320;
const H = 140;
const PAD = { left: 40, right: 36, top: 10, bottom: 22 };

type Point = { year: number; v: number };

function fmt(n: number, digits: number, lang: Lang): string {
  return n.toLocaleString(lang === "it" ? "it-IT" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Seasons with data, in runs: a season with no data ends one run and the next season starts another. */
export function seasonRuns(years: number[], values: (number | null)[]): Point[][] {
  const runs: Point[][] = [[]];
  years.forEach((year, i) => {
    const v = values[i];
    if (v === null || v === undefined || !Number.isFinite(v)) {
      if (runs[runs.length - 1].length) runs.push([]);
    } else runs[runs.length - 1].push({ year, v });
  });
  return runs.filter((run) => run.length > 0);
}

export function TrendChart({ title, years, series, digits }: { title: string; years: number[]; series: Series; digits: number }) {
  const t = useT();
  const lang = useLang();
  const runs = seasonRuns(years, series.values);
  const points = runs.flat();
  if (points.length < 2) return null;
  const band = seasonBand(years, series.values);
  const recent = new Set(band?.recent ?? []);
  const lows = [...points.map((p) => p.v), ...(band ? [band.low] : [])];
  const highs = [...points.map((p) => p.v), ...(band ? [band.high] : [])];
  const [lo, hi] = [Math.min(...lows), Math.max(...highs)];
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
  const [y0, y1] = [lo - pad, hi + pad];
  const [x0, x1] = [years[0], years[years.length - 1]];
  const x = (year: number) => PAD.left + ((year - x0) / Math.max(x1 - x0, 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const path = (run: Point[]) => run.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  // The last five seasons drawn again on top in dark ink, broken where a season has no data.
  const recentRuns = runs.map((run) => run.filter((p) => recent.has(p.year))).filter((run) => run.length > 0);
  const unit = series.unit && series.unit !== "NDVI" ? ` ${unitText(series.unit, t)}` : "";
  const ticks = [x0, ...[2010, 2020].filter((yr) => yr > x0 + 3 && yr < x1 - 3), x1];
  const summary = band
    ? t("trends.summary", {
        title,
        from: x0,
        to: x1,
        low: fmt(band.low, digits, lang),
        high: fmt(band.high, digits, lang),
        now: fmt(band.now, digits, lang),
      })
    : title;
  const recentYears = band?.recent ?? [];
  const nowEnd = recentYears.length ? x(recentYears[recentYears.length - 1]) + 4 : 0;
  const soft = "var(--color-ink-soft, #6b6b63)";

  return (
    <figure className="break-inside-avoid" data-testid="trend-chart">
      <figcaption className="text-small font-bold">
        {title}
        {unit ? <span className="font-normal text-ink-soft">{` (${unit.trim()})`}</span> : null}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {band ? (
          <>
            <rect
              data-testid="trend-band"
              x={PAD.left}
              width={W - PAD.left - PAD.right}
              y={y(band.high)}
              height={Math.max(y(band.low) - y(band.high), 1)}
              fill="var(--color-line, #ddd8cc)"
              opacity={0.7}
            />
            <text x={PAD.left - 4} y={y(band.high) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity={0.65}>
              {fmt(band.high, digits, lang)}
            </text>
            <text x={PAD.left - 4} y={y(band.low) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity={0.65}>
              {fmt(band.low, digits, lang)}
            </text>
          </>
        ) : null}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="currentColor" strokeWidth={0.5} opacity={0.4} />
        {ticks.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.65}>
            {yr}
          </text>
        ))}
        {runs.map((run) =>
          run.length > 1 ? (
            <path
              key={`run-${run[0].year}`}
              data-testid="trend-line"
              d={path(run)}
              fill="none"
              stroke={soft}
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            // A season standing alone between gaps still shows, as a small dot.
            <circle key={`run-${run[0].year}`} data-testid="trend-lone" cx={x(run[0].year)} cy={y(run[0].v)} r={2.5} fill={soft} fillOpacity={0.55} />
          ),
        )}
        {recentRuns.map((run) =>
          run.length > 1 ? (
            <path
              key={`recent-${run[0].year}`}
              data-testid="trend-recent"
              d={path(run)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <circle key={`recent-${run[0].year}`} data-testid="trend-recent" cx={x(run[0].year)} cy={y(run[0].v)} r={3} fill="currentColor" />
          ),
        )}
        {band ? (
          <>
            <line
              data-testid="trend-now"
              x1={x(recentYears[0]) - 4}
              x2={nowEnd}
              y1={y(band.now)}
              y2={y(band.now)}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={nowEnd + 3} y={y(band.now) + 3} fontSize="9" fontWeight="bold" fill="currentColor">
              {fmt(band.now, digits, lang)}
            </text>
          </>
        ) : null}
        {points.map((p) => (
          // An invisible target, larger than the line, so each season's figure shows on hover or long press.
          <circle key={`hit-${p.year}`} data-season={p.year} cx={x(p.year)} cy={y(p.v)} r={7} fill="transparent">
            <title>{`${p.year}: ${fmt(p.v, digits, lang)}${unit}`}</title>
          </circle>
        ))}
      </svg>
      <p className="text-small text-ink-soft font-mono uppercase tracking-wide">{sourceText(series.source.dataset, lang)}</p>
    </figure>
  );
}
