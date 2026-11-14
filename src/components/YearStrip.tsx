import type { Cover, Month, Risk } from "../data/types";
import { useT } from "../i18n";
import { RiskIcon } from "./Icons";

/** Calendar month numbers in strip order: October first. */
export const STRIP_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const COVER_CLASS: Record<Cover, string> = {
  green: "tc-cover-green",
  part: "tc-cover-part",
  bare: "tc-cover-bare",
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

export function CoverLegend() {
  const t = useT();
  const covers: Cover[] = ["green", "part", "bare"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small font-bold">
      {covers.map((c) => (
        <li key={c} className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-4 h-4 border border-line-strong ${COVER_CLASS[c]}`} aria-hidden="true" />
          {t(`cover.${c}`)}
        </li>
      ))}
    </ul>
  );
}

export function RiskLegend({ risks }: { risks: Risk[] }) {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small font-bold">
      {risks.map((r) => (
        <li key={r} className="inline-flex items-center gap-1">
          <RiskIcon risk={r} className="w-5 h-5" />
          {t(`risk.${r}`)}
        </li>
      ))}
    </ul>
  );
}
