// A small bar chart for the printout, drawn like the data team's pictures in DataPics/: bars from zero, the axis
// numbered with light gridlines, each bar's figure written on it, and, where given, a line for a 10th to 90th
// percentile range. Bars can be grouped (two seasons, two bars each). A bar with no data is named "no data", never
// drawn as zero. Plain SVG, no library. Written with AI assistance (Claude, Anthropic).
import type { Lang } from "../data/types";
import { useLang, useT } from "../i18n";

export type Bar = {
  key: string;
  /** Under the bar; "\n" starts a second line. */
  label: string;
  value: number | null;
  color: string;
  range?: [number, number];
  /** Bars next to each other with the same group share a label under them and sit apart from the next group. */
  group?: string;
};

const H = 156;
const PAD = { left: 32, right: 6, top: 10, bottom: 40 };
const GAP = 0.6; // space between groups, in bar slots

export function formatNumber(n: number, digits: number, lang: Lang, minDigits = digits): string {
  return n.toLocaleString(lang === "it" ? "it-IT" : "en-GB", { minimumFractionDigits: minDigits, maximumFractionDigits: digits });
}

/** A round step for the axis: 1, 2, 2.5 or 5 times a power of ten, giving about four gridlines. */
export function niceStep(max: number): number {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

/** White on a dark bar, ink on a light one. */
function onColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.3 ? "#ffffff" : "var(--color-ink, #16201a)";
}

export function BarChart({ title, unit, bars, digits, minDigits = digits, source, width = 240, testId }: {
  title: string;
  unit?: string;
  bars: Bar[];
  /** Decimals on each bar's figure: at most `digits`, at least `minDigits` (4 rather than 4.0). */
  digits: number;
  minDigits?: number;
  source?: string;
  width?: number;
  testId?: string;
}) {
  const t = useT();
  const lang = useLang();
  const top = Math.max(0, ...bars.flatMap((b) => [b.value ?? 0, b.range?.[1] ?? 0]));
  if (!bars.some((b) => b.value !== null)) return null;
  const step = niceStep(top > 0 ? top : 1);
  const yMax = Math.max(step, Math.ceil((top * 1.04) / step) * step);
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const W = width;
  const groupStarts = bars.map((b, i) => i > 0 && b.group !== undefined && b.group !== bars[i - 1].group);
  const gapsBefore = groupStarts.map((_, i) => groupStarts.slice(0, i + 1).filter(Boolean).length);
  const slot = (W - PAD.left - PAD.right) / (bars.length + GAP * gapsBefore[bars.length - 1]);
  const barW = Math.min(slot * 0.7, 54);
  const centre = (i: number) => PAD.left + slot * (i + GAP * gapsBefore[i]) + slot / 2;
  const base = H - PAD.bottom;
  const y = (v: number) => PAD.top + (1 - v / yMax) * (base - PAD.top);
  const value = (v: number) => formatNumber(v, digits, lang, minDigits);
  const stepDigits = Number.isInteger(step) ? 0 : Math.min(2, String(step).split(".")[1]?.length ?? 1);
  const groups = bars.reduce<{ name: string; from: number; to: number }[]>((list, b, i) => {
    if (b.group === undefined) return list;
    const last = list[list.length - 1];
    if (last && last.name === b.group && last.to === i - 1) last.to = i;
    else list.push({ name: b.group, from: i, to: i });
    return list;
  }, []);
  const summary = `${title}: ${bars.map((b) => `${b.label.replace(/\n/g, " ")}${b.group ? ` ${b.group}` : ""} ${b.value === null ? t("common.noData") : value(b.value)}`).join("; ")}`;

  return (
    <figure className="break-inside-avoid" data-testid={testId}>
      <figcaption className="text-small font-bold">
        {title}
        {unit ? <span className="font-normal text-ink-soft">{` (${unit})`}</span> : null}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="currentColor" strokeWidth={0.5} opacity={v === 0 ? 0.5 : 0.15} />
            <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity={0.65}>
              {formatNumber(v, stepDigits, lang, 0)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = centre(i);
          const lines = b.label.split("\n");
          const labelBlock = (
            <text x={cx} y={base + 11} textAnchor="middle" fontSize="9" fill="currentColor">
              {lines.map((line, k) => (
                <tspan key={k} x={cx} dy={k ? 10 : 0} opacity={k ? 0.7 : 1}>
                  {line}
                </tspan>
              ))}
            </text>
          );
          if (b.value === null) {
            return (
              <g key={b.key} data-bar={b.key} data-nodata="1">
                <text x={cx} y={base - 4} textAnchor="middle" fontSize="8.5" fill="currentColor" opacity={0.65}>
                  {t("common.noData")}
                </text>
                {labelBlock}
              </g>
            );
          }
          const x0 = cx - barW / 2;
          const yTop = y(b.value);
          const h = base - yTop;
          const r = Math.max(0, Math.min(3, h / 2, barW / 2));
          const d = `M${x0} ${base} L${x0} ${yTop + r} Q${x0} ${yTop} ${x0 + r} ${yTop} L${x0 + barW - r} ${yTop} Q${x0 + barW} ${yTop} ${x0 + barW} ${yTop + r} L${x0 + barW} ${base} Z`;
          const inside = h >= 20;
          return (
            <g key={b.key} data-bar={b.key}>
              <path d={d} fill={b.color}>
                <title>{`${b.label.replace(/\n/g, " ")}${b.group ? `, ${b.group}` : ""}: ${value(b.value)}${unit ? ` ${unit}` : ""}`}</title>
              </path>
              {b.range ? (
                <g stroke="currentColor" strokeWidth={1.25} opacity={0.85} data-range="1">
                  <line x1={cx} x2={cx} y1={y(b.range[0])} y2={y(b.range[1])} />
                  <line x1={cx - 5} x2={cx + 5} y1={y(b.range[0])} y2={y(b.range[0])} />
                  <line x1={cx - 5} x2={cx + 5} y1={y(b.range[1])} y2={y(b.range[1])} />
                </g>
              ) : null}
              <text
                x={b.range ? cx + barW / 2 - 3 : cx}
                y={inside ? base - h / 2 + 3.5 : yTop - 4}
                textAnchor={b.range ? "end" : "middle"}
                fontSize="10"
                fontWeight="bold"
                fill={inside ? onColor(b.color) : "currentColor"}
              >
                {value(b.value)}
              </text>
              {labelBlock}
            </g>
          );
        })}
        {groups.map((g) => (
          <text key={`${g.name}-${g.from}`} x={(centre(g.from) + centre(g.to)) / 2} y={base + 25} textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor">
            {g.name}
          </text>
        ))}
      </svg>
      {source ? <p className="text-small text-ink-soft font-mono uppercase tracking-wide">{source}</p> : null}
    </figure>
  );
}
