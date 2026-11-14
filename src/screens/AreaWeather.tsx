import { useEffect, useState } from "react";
import type { AreaWeather as AreaWeatherData, Fact } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { areaHa, centroid } from "../geo/geometry";
import { useLang, useT } from "../i18n";
import { useAppState, useGo, useTo } from "../state/useAppState";
import { fetchPower, summarise } from "../weather/weather";
import { useBundle } from "../components/BundleProvider";
import { DatasetLabel, ScaleBadge, formatNumber, rangeText, unitText, valueText } from "../components/FactParts";
import { FieldShape } from "../components/FieldShape";
import { DropIcon, FrostIcon, HeatIcon } from "../components/Icons";
import { HOT_DAY_LABELS, HotDaysTerm } from "../components/Term";
import { BackButton, BottomBar, Button, Headline } from "../components/ui";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; data: AreaWeatherData };

function WeatherRow({ fact, Icon }: { fact: Fact; Icon: typeof HeatIcon }) {
  const t = useT();
  const lang = useLang();
  const range = rangeText(fact, lang);
  return (
    <li className="flex items-start gap-3 px-4 py-3 border-b border-line">
      <Icon className="w-8 h-8 flex-none mt-1" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-body">
          {fact.label && HOT_DAY_LABELS.includes(fact.label) ? <HotDaysTerm>{t(fact.label)}</HotDaysTerm> : t(fact.label ?? "")}
        </p>
        {range ? (
          <p className="text-small text-ink-soft">
            {t("common.range")} {range} {unitText(fact.unit, t)}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <p className="whitespace-nowrap">
          <span className="text-head">{valueText(fact, t, lang)}</span>
          <span className="text-small font-bold"> {unitText(fact.unit, t)}</span>
        </p>
        <ScaleBadge scale={fact.scale} />
      </div>
    </li>
  );
}

export default function AreaWeather() {
  const t = useT();
  const lang = useLang();
  const go = useGo();
  const to = useTo();
  const [state] = useAppState();
  const bundle = useBundle();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const outline = state.outline;
  const key = outline ? outline.map((p) => p.join(",")).join(";") : "";

  useEffect(() => {
    if (!outline) return;
    let live = true;
    setLoad({ status: "loading" });
    fetchPower(centroid(outline))
      .then((daily) => summarise(daily))
      .then(
        (data) => live && setLoad({ status: "ready", data }),
        () => live && setLoad({ status: "error" }),
      );
    return () => {
      live = false;
    };
    // `key` stands for the outline's content.
  }, [key, attempt]);

  function toDemo() {
    go("/questions", {
      fieldId: DEMO_FIELD_ID,
      outline: null,
      lastCrop: bundle.status === "ready" ? bundle.bundle.lastCrop.crop : state.lastCrop,
    });
  }

  if (!outline) return null;

  return (
    <div className="flex flex-col flex-1">
      <Headline sub={`${t("scale.fieldLong")} · ${formatNumber(Math.round(areaHa(outline) * 10) / 10, lang)} ha`}>
        <span className="flex items-center gap-3">
          <FieldShape ring={outline} className="w-11 h-11 flex-none" />
          {t("area.title")}
        </span>
      </Headline>

      {load.status === "loading" ? (
        <p className="px-4 py-6 text-big" role="status">
          {t("area.loading")}
        </p>
      ) : null}

      {load.status === "error" ? (
        <div className="px-4 py-4 flex flex-col gap-3" role="alert">
          <p className="text-big font-bold" data-testid="weather-error">
            {t("area.error")}
          </p>
          <Button onClick={() => setAttempt((n) => n + 1)}>{t("common.retry")}</Button>
          <Button look="secondary" onClick={toDemo}>
            {t("area.demo")}
          </Button>
        </div>
      ) : null}

      {load.status === "ready" ? (
        <>
          <p className="px-4 pb-2 text-small font-bold text-ink-soft flex flex-wrap gap-x-2">
            {t("area.years")}
            {/* This screen is nothing but NASA numbers, so the source stays visible and linked in both views. */}
            <a href={load.data.hotDaysAtFlowering.source.url} target="_blank" rel="noreferrer" className="underline">
              <DatasetLabel fact={load.data.hotDaysAtFlowering} always />
            </a>
          </p>
          <ul className="bg-surface border-t border-line">
            <WeatherRow fact={load.data.hotDaysAtFlowering} Icon={HeatIcon} />
            <WeatherRow fact={load.data.autumnRain} Icon={DropIcon} />
            <WeatherRow fact={load.data.lateFrostDays} Icon={FrostIcon} />
          </ul>
          <div className="px-4 py-4 flex flex-col gap-3">
            <p className="text-body">{t("area.demoOnly")}</p>
            <Button onClick={toDemo}>{t("area.demo")}</Button>
          </div>
        </>
      ) : null}
      <BottomBar>
        <BackButton to={to("/")} />
      </BottomBar>
    </div>
  );
}
