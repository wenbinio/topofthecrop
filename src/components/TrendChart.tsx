// One measure, season by season since 2001, for the end of the printout: a dot per season, the usual middle half of
// 2001-2020 shaded, and the last five seasons in dark ink with a line at their middle. That is the comparison behind
// the Why screen's steps (seasonBand and SIGNAL_RULES in src/data/field-rules.js). A season with no data has no dot.
// Plain SVG, no library. Written with AI assistance (Claude, Anthropic).
import type { Lang, Series } from "../data/types";
import { seasonBand } from "../data/field-rules.js";
import { useLang, useT } from "../i18n";

const W = 320;
const H = 132;
const PAD = { left: 40, right: 10, top: 8, bottom: 22 };

function fmt(n: number, digits: number, lang: Lang): string {
  return n.toLocaleString(lang === "it" ? "it-IT" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function TrendChart({ title, years, series, digits }: { title: string; years: number[]; series: Series; digits: number }) {
  const t = useT();
  const lang = useLang();
  const points = years.flatMap((year, i) => {
    const v = series.values[i];
    return v === null || v === undefined ? [] : [{ year, v }];
  });
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
  const unit = series.unit && series.unit !== "NDVI" ? ` ${series.unit}` : "";
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
            <line
              data-testid="trend-now"
              x1={x(recentYears[0]) - 5}
              x2={x(recentYears[recentYears.length - 1]) + 5}
              y1={y(band.now)}
              y2={y(band.now)}
              stroke="currentColor"
              strokeWidth={2}
            />
          </>
        ) : null}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="currentColor" strokeWidth={0.5} opacity={0.4} />
        {ticks.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.65}>
            {yr}
          </text>
        ))}
        {points.map((p) => (
          <circle
            key={p.year}
            cx={x(p.year)}
            cy={y(p.v)}
            r={recent.has(p.year) ? 4 : 3.2}
            fill={recent.has(p.year) ? "currentColor" : "var(--color-ink-soft, #7a7a72)"}
            fillOpacity={recent.has(p.year) ? 1 : 0.55}
            stroke="var(--color-surface, #fff)"
            strokeWidth={1.5}
            data-recent={recent.has(p.year) ? "1" : undefined}
          >
            <title>{`${p.year}: ${fmt(p.v, digits, lang)}${unit}`}</title>
          </circle>
        ))}
      </svg>
      <p className="text-small text-ink-soft font-mono uppercase tracking-wide">{series.source.dataset}</p>
    </figure>
  );
}
