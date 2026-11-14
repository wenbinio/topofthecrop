import type { Cover, Month, Risk } from "../data/types";
import { useT } from "../i18n";
import { RiskIcon } from "./Icons";
import { LegendExplain, coverLine } from "./Term";

/** Calendar month numbers in strip order: October first. */
export const STRIP_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const COVER_CLASS: Record<Cover, string> = {
  green: "tc-cover-green",
  part: "tc-cover-part",
  bare: "tc-cover-bare",
  // No greenness data: plain, with a dashed edge, never shown as bare.
  none: "bg-surface border-dashed",
};

/** Twelve months from October: cover by colour and pattern, risk icons under each month. */
export function YearStrip({ months, risks = true, compact = false }: { months: Month[]; risks?: boolean; compact?: boolean }) {
  const t = useT();
  return (
    <div className="w-full" data-testid="year-strip">
      <ol className="grid grid-cols-12 gap-0.5">
        {months.map((m, i) => {
          const month = STRIP_MONTHS[i];
          const label = `${t(`monthName.${month}`)}: ${t(`cover.${m.cover}`)}${
            m.risks.length ? ", " + m.risks.map((r) => t(`risk.${r}`)).join(", ") : ""
          }`;
          return (
            <li key={i} className="flex flex-col items-center" aria-label={label}>
              <span className={`block w-full ${compact ? "h-3" : "h-9"} border border-line-strong ${COVER_CLASS[m.cover]}`} />
              <span className="text-small font-bold text-ink-soft leading-tight" aria-hidden="true">
                {t(`month.${month}`)}
              </span>
              {risks ? (
                <span className="flex flex-col items-center gap-0.5 min-h-5 text-risk" aria-hidden="true">
                  {m.risks.map((r) => (
                    <RiskIcon key={r} risk={r} className="w-5 h-5" />
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Green, patchy, bare: tap or hover says what each means (satellite greenness, NASA MODIS). */
export function CoverLegend({ none = false }: { none?: boolean }) {
  const t = useT();
  const covers: Cover[] = none ? ["green", "part", "bare", "none"] : ["green", "part", "bare"];
  return (
    <LegendExplain
      testId="cover-legend"
      items={covers.map((c) => ({
        id: c,
        label: t(`cover.${c}`),
        line: coverLine(t, c),
        mark: <span className={`inline-block w-4 h-4 border border-line-strong ${COVER_CLASS[c]}`} aria-hidden="true" />,
      }))}
    />
  );
}

/** The risk icons shown this year; tap or hover says what each means. */
export function RiskLegend({ risks }: { risks: Risk[] }) {
  const t = useT();
  return (
    <LegendExplain
      testId="risk-legend"
      items={risks.map((r) => ({
        id: r,
        label: t(`risk.${r}`),
        line: t(`risk.${r}.def`),
        mark: <RiskIcon risk={r} className="w-5 h-5" />,
      }))}
    />
  );
}
