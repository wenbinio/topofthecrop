// The data team's pictures (DataPics/ in the repo), redrawn from each field's own data for the end of the printout:
// 2024 and 2026 against a usual season (the Year screen's card as bars); hot flowering days now and by 2041-2060
// with how far the climate models disagree; and, for the demo field only, satellite rain against the trial's own
// weather station. Each picture is left out when its figures are missing. Written with AI assistance (Claude, Anthropic).
import type { Fact, FieldBundle } from "../data/types";
import { useLang, useT } from "../i18n";
import { sourceText } from "../i18n/sources";
import { BarChart, formatNumber, type Bar } from "./BarChart";
import { compareRows } from "./SeasonCompare";

// Colours checked with the dataviz palette validator (light surface): grey is the neutral "usual" or "today" bar;
// the others pass colour-blind separation and 3:1 contrast. Red and blue follow DataPics/drought_to_wet_field.png.
const SEASON_COLOR: Record<string, string> = { usual: "#7d8682", 2024: "#c0392b", 2026: "#2470b5" };
const HEAT_COLOR = { today: "#7d7870", middle: "#d4733a", high: "#a83c14" };
const CHECK_COLOR = { station: "#2470b5", satellites: "#c8641e" };

const num = (fact: Fact | undefined): number | null => (fact && typeof fact.value === "number" ? fact.value : null);
const years = (asOf: string | undefined) => (asOf ?? "").replace("-", "–");

/** The three pictures' figures, or null for each one that cannot be drawn for this field. */
export function explainData(bundle: FieldBundle) {
  const data = bundle.fieldData;
  const compared = compareRows(bundle);
  const now = bundle.year.hotDays?.normal?.now;
  const middle = data?.by2050?.ssp245?.hotDays;
  const high = data?.by2050?.ssp585?.hotDays;
  const heat = num(now) !== null && num(middle) !== null && num(high) !== null ? { now: now!, middle: middle!, high: high! } : null;
  const rain = data?.groundCheck?.rain.filter((row) => row.window === "sowing-harvest" && num(row.station) !== null) ?? [];
  const temperature = data?.groundCheck?.temperature ?? [];
  return { compared, heat, rain: rain.length ? rain : null, temperature };
}

export function hasExplainCharts(bundle: FieldBundle): boolean {
  const { compared, heat, rain } = explainData(bundle);
  return Boolean(compared || heat || rain);
}

export function ExplainCharts({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const { compared, heat, rain, temperature } = explainData(bundle);
  // How much cooler ERA5-Land read than the trial's station, season by season (demo field only).
  const cooler = temperature
    .map((row) => (num(row.station) !== null && num(row.era5Land) !== null ? num(row.station)! - num(row.era5Land)! : null))
    .filter((d): d is number => d !== null && d > 0);

  return (
    <div className="space-y-4" data-testid="print-explain">
      {compared ? (
        <section className="break-inside-avoid">
          <h3 className="text-body font-bold">{t("years.title")}</h3>
          <div className="grid grid-cols-1 min-[30rem]:grid-cols-2 print:grid-cols-2 gap-x-4 gap-y-3 mt-1">
            {compared.rows.map(({ key, usual, series }) => {
              const unit = series.unit ?? usual.unit;
              const digits = unit === "NDVI" ? 2 : unit === "%" ? 1 : 0;
              const bars: Bar[] = [
                { key: "usual", label: t("years.usual"), value: num(usual), color: SEASON_COLOR.usual },
                ...compared.shown.map((year) => {
                  const v = series.values[compared.years.indexOf(year)];
                  return { key: String(year), label: String(year), value: typeof v === "number" ? v : null, color: SEASON_COLOR[year] ?? SEASON_COLOR.usual };
                }),
              ];
              return (
                <BarChart key={key} testId="explain-season" title={t(key)} unit={unit === "NDVI" ? "NDVI" : unit} bars={bars} digits={digits} source={series.source.dataset} />
              );
            })}
          </div>
          <p className="mt-1 text-small text-ink-soft">{t("explain.seasonsCaption")}</p>
        </section>
      ) : null}

      {heat || rain ? (
        <div className="grid grid-cols-1 min-[30rem]:grid-cols-2 print:grid-cols-2 gap-x-4 gap-y-4">
          {heat ? (
            <section className="break-inside-avoid">
              <BarChart
                testId="explain-heat"
                title={t("explain.heatTitle")}
                unit={t("explain.days")}
                width={300}
                digits={1}
                minDigits={0}
                bars={[
                  { key: "today", label: `${t("explain.today")}\n${years(heat.now.asOf)}`, value: num(heat.now), color: HEAT_COLOR.today },
                  { key: "middle", label: `${years(heat.middle.asOf)}\n${t("explain.middle")}\nSSP2-4.5`, value: num(heat.middle), range: heat.middle.range, color: HEAT_COLOR.middle },
                  { key: "high", label: `${years(heat.high.asOf)}\n${t("explain.high")}\nSSP5-8.5`, value: num(heat.high), range: heat.high.range, color: HEAT_COLOR.high },
                ]}
                source={[heat.now.source.dataset, heat.middle.source.dataset].map((d) => sourceText(d, lang)).join(" · ")}
              />
              <p className="mt-1 text-small text-ink-soft">
                {t("explain.heatCaption")}
                {heat.now.range
                  ? ` ${t("explain.heatToday", { low: formatNumber(heat.now.range[0], 0, lang), high: formatNumber(heat.now.range[1], 0, lang) })}`
                  : null}
                {cooler.length
                  ? ` ${t("explain.cooler", { low: formatNumber(Math.min(...cooler), 1, lang), high: formatNumber(Math.max(...cooler), 1, lang) })}`
                  : null}
              </p>
            </section>
          ) : null}
          {rain ? (
            <section className="break-inside-avoid">
              <BarChart
                testId="explain-check"
                title={t("explain.checkTitle")}
                unit="mm"
                width={300}
                digits={0}
                bars={rain.flatMap((row) => {
                  const group = t("explain.season", { season: row.season.replace("-", "–") });
                  return [
                    { key: `${row.season}-station`, label: t("explain.station"), value: num(row.station), color: CHECK_COLOR.station, group },
                    { key: `${row.season}-satellites`, label: t("explain.satellites"), value: num(row.satellites), color: CHECK_COLOR.satellites, group },
                  ];
                })}
                source={[rain[0].station.source.dataset, rain[0].satellites.source.dataset].map((d) => sourceText(d, lang)).join(" · ")}
              />
              <p className="mt-1 text-small text-ink-soft">{t("explain.checkCaption")}</p>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
