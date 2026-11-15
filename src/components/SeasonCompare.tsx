// "2024 and 2026 against a usual season": two recent seasons at the field beside the usual one, from the data
// team's season series (`fieldData.seasons`). 2024 is the drought season in the data team's checks; 2026 was wet.
// An arrow marks a value outside the usual range (10th to 90th percentile, docs/scoring.md). For the demo field it
// also names the seasons the field was much less green than nearby fields (`stressSeasons` in
// src/data/field-rules.js). Every row keeps its dataset, resolution and scale. Written with AI assistance (Claude, Anthropic).
import type { Fact, FieldBundle, Lang, Series } from "../data/types";
import { stressSeasons } from "../data/field-rules.js";
import { useLang, useT } from "../i18n";
import { ScaleBadge } from "./FactParts";

/** The seasons shown beside the usual one, named by harvest year (2024 = the season sown in autumn 2023). */
export const COMPARE_YEARS = [2024, 2026] as const;

/** A number as the farmer reads it: greenness (NDVI) with two decimals, everything else with up to one. */
function figure(n: number, unit: string | undefined, lang: Lang): string {
  const digits = unit === "NDVI" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 1 };
  const number = n.toLocaleString(lang === "it" ? "it-IT" : "en-GB", digits);
  return unit === "mm" ? `${number} mm` : unit === "%" ? `${number}%` : number;
}

/** Below or above the usual range, or null inside it (or when the usual figure has no range). */
export function outsideUsual(value: number, usual: Fact): "lower" | "higher" | null {
  if (!usual.range) return null;
  return value < usual.range[0] ? "lower" : value > usual.range[1] ? "higher" : null;
}

type Row = { key: string; usual: Fact; series: Series };

export function SeasonCompare({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const data = bundle.fieldData;
  if (!data) return null;
  const { years, series } = data.seasons;
  const candidates: [string, Fact | undefined, Series | undefined][] = [
    ["years.rain", bundle.year.rainSeason?.normal.now, series.rainSeason],
    ["years.soil", data.water.soilWaterSpring, series.soilWaterSpring],
    ["years.green", data.greenness.peakGreenness, series.peakGreenness],
    ["years.water", data.water.cropWaterUse, series.cropWaterUse],
  ];
  const rows: Row[] = candidates.flatMap(([key, usual, s]) =>
    usual && s && typeof usual.value === "number" ? [{ key, usual, series: s }] : [],
  );
  const shown = COMPARE_YEARS.filter((year) => years.includes(year));
  if (!rows.length || !shown.length) return null;
  const flagged = stressSeasons(data.seasons);
  // HANDOVER.md, caveat 4: NASA GPM IMERG in Earth Engine ends in September 2025, so 2026 rain is the median of two sources.
  const rainNote = shown.includes(2026) && rows.some((row) => row.key === "years.rain");

  return (
    <section className="mx-4 mb-3 bg-surface border border-line" data-testid="season-compare">
      <h2 className="px-3 pt-3 font-bold text-body">{t("years.title")}</h2>
      <table className="w-full text-body my-2">
        <thead>
          <tr className="text-small">
            <th scope="col" className="px-3">
              <span className="sr-only">{t("years.title")}</span>
            </th>
            <th scope="col" className="text-right px-2 font-bold text-ink-soft">{t("years.usual")}</th>
            {shown.map((year) => (
              <th key={year} scope="col" className="text-right px-2 font-bold">{year}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, usual, series: s }) => (
            <tr key={key} className="border-t border-line align-top">
              <th scope="row" className="text-left font-normal px-3 py-1.5">
                <span className="block">{t(key)}</span>
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <ScaleBadge scale={s.scale} iconOnly />
                  <span className="tc-dataset font-mono text-small uppercase tracking-wide text-ink-soft">
                    {s.source.dataset} · {s.source.resolution}
                  </span>
                </span>
              </th>
              <td className="text-right px-2 py-1.5 whitespace-nowrap text-ink-soft">
                {figure(Number(usual.value), usual.unit, lang)}
                {usual.asOf ? <span className="block text-small">{usual.asOf.replace("-", "–")}</span> : null}
              </td>
              {shown.map((year) => {
                const value = s.values[years.indexOf(year)];
                if (value === null || value === undefined) {
                  return (
                    <td key={year} className="text-right px-2 py-1.5 text-small text-ink-soft">{t("common.noData")}</td>
                  );
                }
                const dir = outsideUsual(value, usual);
                return (
                  <td key={year} className="text-right px-2 py-1.5 whitespace-nowrap font-bold" data-testid={`compare-${key}-${year}`}>
                    {figure(value, s.unit, lang)}
                    {dir ? (
                      <span title={t(`years.${dir}`)}>
                        <span aria-hidden="true"> {dir === "lower" ? "↓" : "↑"}</span>
                        <span className="sr-only"> ({t(`years.${dir}`)})</span>
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 pb-3 flex flex-col gap-1">
        <p className="text-small text-ink-soft">{t("years.arrows")}</p>
        {rainNote ? <p className="text-small text-ink-soft" data-testid="rain-2026-note">{t("years.rain2026")}</p> : null}
        {flagged.length ? (
          <p className="text-body" data-testid="stress-line">
            {t("years.stress", {
              years: new Intl.ListFormat(lang, { type: "conjunction" }).format(flagged.map((f) => String(f.season))),
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
