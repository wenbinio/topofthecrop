// "This season so far": rain since 1 September at the field, against the same weeks in earlier years, live from
// NASA POWER. Shown wherever a field is chosen. It loads on its own and never blocks the screen: if NASA does not
// answer, one quiet line says so. Written with AI assistance (Claude, Anthropic).
import { useEffect, useState } from "react";
import type { Lang, LngLat } from "../data/types";
import { useLang, useT } from "../i18n";
import type { SeasonWeather, Standing } from "../weather/season";
import { fetchSeasonRain, summariseSeason } from "../weather/season";
import { DatasetLabel, ScaleBadge, formatNumber, rangeText } from "./FactParts";
import { LeftOutNote } from "./LeftOutNote";
import { DropIcon, DryIcon, RainIcon } from "./Icons";
import { SectionTitle } from "./ui";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; data: SeasonWeather };

const STANDING_ICON: Record<Standing, typeof DropIcon> = { drier: DryIcon, usual: DropIcon, wetter: RainIcon };

/** "12 Nov" / "12 nov", from YYYY-MM-DD. */
export function shortDate(isoDate: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

export function SeasonNow({ centre }: { centre: LngLat }) {
  const t = useT();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  // NASA POWER's grid is far coarser than two decimals, so nearby points share one answer.
  const lon = centre[0].toFixed(2);
  const lat = centre[1].toFixed(2);

  useEffect(() => {
    let live = true;
    setLoad({ status: "loading" });
    const today = new Date();
    fetchSeasonRain([Number(lon), Number(lat)], today)
      .then((rain) => summariseSeason(rain, today))
      .then(
        (data) => live && setLoad({ status: "ready", data }),
        () => live && setLoad({ status: "error" }),
      );
    return () => {
      live = false;
    };
  }, [lon, lat, attempt]);

  return (
    <section data-testid="season-now" className="print:hidden">
      <SectionTitle>{t("season.title")}</SectionTitle>
      {load.status === "loading" ? (
        <p className="px-4 pb-3 text-body text-ink-soft" role="status">
          {t("area.loading")}
        </p>
      ) : null}
      {load.status === "error" ? (
        <p className="px-4 pb-3 text-body text-ink-soft" data-testid="season-error">
          {t("season.error")}{" "}
          <button type="button" className="underline font-bold min-h-11" onClick={() => setAttempt((n) => n + 1)}>
            {t("season.retry")}
          </button>
        </p>
      ) : null}
      {load.status === "ready" ? <Ready data={load.data} /> : null}
    </section>
  );
}

function Ready({ data }: { data: SeasonWeather }) {
  const t = useT();
  const lang = useLang();
  const Icon = STANDING_ICON[data.standing];
  const usualRange = rangeText(data.usual, lang);
  const last = data.lastGoodRain;
  return (
    <div className="mx-4 mb-3 bg-surface border border-line">
      <div className="flex items-start gap-3 px-3 py-3 border-b border-line">
        <Icon className="w-8 h-8 flex-none mt-1" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-body">{t("season.rain")}</p>
          <p className="text-small text-ink-soft" data-testid="season-usual">
            {t("season.usualLine", { n: formatNumber(Number(data.usual.value), lang) })}
            {usualRange ? ` (${t("common.range")} ${usualRange})` : ""}
          </p>
          <p className="mt-1 inline-block px-2 py-0.5 border-2 border-line-strong rounded-sm text-small font-bold" data-testid="season-standing">
            {t(`season.${data.standing}`)}
          </p>
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap" data-testid="season-rain">
            <span className="text-head">{formatNumber(Number(data.rain.value), lang)}</span>
            <span className="text-small font-bold"> mm</span>
          </p>
          <ScaleBadge scale={data.rain.scale} />
        </div>
      </div>
      <p className="px-3 py-2 text-body" data-testid="season-last">
        <span className="font-bold">{t("season.lastRain")}</span>{" "}
        {last ? t("season.lastRainOn", { date: shortDate(last.date, lang), mm: formatNumber(last.mm, lang) }) : t("season.lastRainNone")}
      </p>
      <p className="px-3 pb-2 text-small font-bold text-ink-soft flex flex-wrap gap-x-2">
        {t("season.span", { from: shortDate(data.from, lang), to: shortDate(data.to, lang) })}
        <a href={data.rain.source.url} target="_blank" rel="noreferrer" className="underline">
          <DatasetLabel fact={data.rain} always />
        </a>
      </p>
      <LeftOutNote months={data.rainLeftOut} className="px-3 pb-2" />
    </div>
  );
}
