// One quiet line under a live NASA POWER rain figure, naming the months it left out as impossible
// (POWER_BAD_RAIN_MONTHS in src/weather/weather.ts). Nothing is shown when no month was left out.
// Written with AI assistance (Claude, Anthropic).
import type { Lang } from "../data/types";
import { useLang, useT } from "../i18n";

/** "202510" → "October 2025" (or "ottobre 2025"), joined as a list. */
export function monthList(months: string[], lang: Lang): string {
  const locale = lang === "it" ? "it-IT" : "en-GB"; // British English, as everywhere else: no comma before "and"
  const name = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const names = months.map((m) => name.format(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(4, 6)) - 1, 1)));
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
}

export function LeftOutNote({ months, className = "" }: { months: string[] | undefined; className?: string }) {
  const t = useT();
  const lang = useLang();
  if (!months?.length) return null;
  return (
    <p className={`text-small text-ink-soft ${className}`} data-testid="rain-left-out">
      {t("weather.leftOut", { months: monthList(months, lang) })}
    </p>
  );
}
