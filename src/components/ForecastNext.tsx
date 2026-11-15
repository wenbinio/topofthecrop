// "Next 7 days": forecast rain day by day and the coldest night at the field, from MET Norway's open forecast.
// It loads on its own and never blocks the screen. A web page cannot read the phone's own weather app, so the
// block ends with a link that opens the full forecast for the same place. Written with AI assistance (Claude, Anthropic).
import { useEffect, useState } from "react";
import type { Lang, LngLat } from "../data/types";
import { useLang, useT } from "../i18n";
import type { Forecast } from "../weather/forecast";
import { FORECAST_RULES, fetchForecast, fullForecastUrl, summariseForecast } from "../weather/forecast";
import { ScaleBadge, formatNumber } from "./FactParts";
import { FrostIcon, RainIcon } from "./Icons";
import { shortDate } from "./SeasonNow";
import { SectionTitle } from "./ui";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; data: Forecast };

const locale = (lang: Lang) => (lang === "it" ? "it-IT" : "en-GB");
/** "Tue" / "mar", from YYYY-MM-DD. */
export function weekday(isoDate: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { weekday: "short", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function ForecastNext({ centre }: { centre: LngLat }) {
  const t = useT();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const lon = centre[0].toFixed(2);
  const lat = centre[1].toFixed(2);

  useEffect(() => {
    let live = true;
    setLoad({ status: "loading" });
    fetchForecast([Number(lon), Number(lat)])
      .then((json) => summariseForecast(json))
      .then(
        (data) => live && setLoad({ status: "ready", data }),
        () => live && setLoad({ status: "error" }),
      );
    return () => {
      live = false;
    };
  }, [lon, lat, attempt]);

  return (
    <section data-testid="forecast-next" className="print:hidden">
      <SectionTitle>{t("forecast.title", { n: FORECAST_RULES.days })}</SectionTitle>
      {load.status === "loading" ? (
        <p className="px-4 pb-3 text-body text-ink-soft" role="status">
          {t("forecast.loading")}
        </p>
      ) : null}
      {load.status === "error" ? (
        <p className="px-4 pb-3 text-body text-ink-soft" data-testid="forecast-error">
          {t("forecast.error")}{" "}
          <button type="button" className="underline font-bold min-h-11" onClick={() => setAttempt((n) => n + 1)}>
            {t("season.retry")}
          </button>
        </p>
      ) : null}
      {load.status === "ready" ? <Ready data={load.data} /> : null}
      <p className="px-4 pb-3 text-small">
        <a href={fullForecastUrl(centre)} target="_blank" rel="noreferrer" className="underline font-bold" data-testid="forecast-full">
          {t("forecast.full")}
        </a>
      </p>
    </section>
  );
}

function Ready({ data }: { data: Forecast }) {
  const t = useT();
  const lang = useLang();
  const day = (isoDate: string) => `${weekday(isoDate, lang)} ${shortDate(isoDate, lang)}`;
  return (
    <div className="mx-4 mb-2 bg-surface border border-line">
      <div className="flex items-start gap-3 px-3 py-3">
        <RainIcon className="w-8 h-8 flex-none mt-1" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-body">{t("forecast.rain")}</p>
          <p className="text-small text-ink-soft" data-testid="forecast-most">
            {data.wettest ? t("forecast.most", { day: day(data.wettest.date), mm: formatNumber(Math.round(data.wettest.rainMm), lang) }) : t("forecast.none")}
          </p>
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap" data-testid="forecast-rain">
            <span className="text-head">{formatNumber(Number(data.rain.value), lang)}</span>
            <span className="text-small font-bold"> mm</span>
          </p>
          <ScaleBadge scale={data.rain.scale} />
        </div>
      </div>
      {/* one cell per day: the day's name over its rain in mm */}
      <ol className="grid grid-flow-col auto-cols-fr border-t border-line text-center" data-testid="forecast-days">
        {data.days.map((d) => (
          <li key={d.date} className="py-2 border-l border-line first:border-l-0">
            <span className="block text-small font-bold text-ink-soft">{weekday(d.date, lang)}</span>
            <span className={`block text-body ${d.rainMm >= 5 ? "font-bold" : ""}`}>{formatNumber(Math.round(d.rainMm), lang)}</span>
          </li>
        ))}
      </ol>
      <p className="px-3 py-2 border-t border-line text-body flex flex-wrap items-center gap-x-2" data-testid="forecast-coldest">
        <span>
          <span className="font-bold">{t("forecast.coldest")}</span> {formatNumber(Number(data.coldest.fact.value), lang)} °C · {day(data.coldest.date)}
        </span>
        {data.frost ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-line-strong rounded-sm text-small font-bold" data-testid="forecast-frost">
            <FrostIcon className="w-4 h-4" />
            {t("forecast.frost")}
          </span>
        ) : null}
      </p>
      <p className="px-3 pb-2 text-small text-ink-soft">{t("forecast.note")}</p>
      <p className="px-3 pb-2 text-small font-bold text-ink-soft">
        <a href="https://api.met.no/doc/License" target="_blank" rel="noreferrer" className="underline">
          {t("forecast.credit")}
        </a>{" "}
        · {t("forecast.updated", { date: shortDate(data.updated.slice(0, 10), lang) })}
      </p>
    </div>
  );
}
