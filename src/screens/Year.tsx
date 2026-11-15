import type { FieldBundle, Risk, Scenario } from "../data/types";
import { SCENARIOS } from "../data/types";
import { useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import type { RankedOption } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { CropSequence, OptionName, Slotted } from "../components/Crops";
import { Link } from "react-router-dom";
import { FactButton, PlaceholderNote } from "../components/FactParts";
import { ChevronIcon, DropIcon, HeatIcon } from "../components/Icons";
import { CoverLegend, RiskLegend, YearStrip } from "../components/YearStrip";
import { HotDaysTerm } from "../components/Term";
import { BackButton, BottomBar, LinkButton } from "../components/ui";
import { AreaNote } from "../components/BundleProvider";
import { openRing } from "../components/FieldShape";
import { ForecastNext } from "../components/ForecastNext";
import { SeasonNow } from "../components/SeasonNow";
import { SeasonCompare } from "../components/SeasonCompare";
import { centroid } from "../geo/geometry";

const RISK_ORDER: Risk[] = ["dry", "frost", "heat", "rain"];

/**
 * One kind of year from the weather record (usual, dry, driest): its Oct-May rain and hot flowering days, now and by
 * 2050, and the rotation that fits it best. The farmer chooses nothing: all three are shown.
 */
function YearKind({ bundle, scenario, best }: { bundle: FieldBundle; scenario: Scenario; best: RankedOption | undefined }) {
  const t = useT();
  const hot = bundle.year.hotDays[scenario];
  const rain = bundle.year.rainSeason?.[scenario];
  return (
    <section
      data-testid={`year-${scenario}`}
      className={`mx-4 mt-3 p-3 bg-surface border-l-4 ${scenario === "normal" ? "border-best" : "border-line-strong"}`}
    >
      <h2 className="text-big font-bold">{t(`year.kind.${scenario}`)}</h2>
      <p className="text-small text-ink-soft" data-testid={`def-${scenario}`}>{t(`year.def.${scenario}`)}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 items-center mt-2">
        <span />
        <span className="text-small font-bold text-ink-soft">{t("year.now")}</span>
        <span className="text-small font-bold text-ink-soft">{t("year.by2050")}</span>
        {rain ? (
          <div className="contents" data-testid={`rain-${scenario}`}>
            <span className="flex items-center gap-1.5 text-small font-bold">
              <DropIcon className="w-5 h-5 flex-none" />
              {t("year.rainHead")}
            </span>
            <FactButton fact={rain.now} label={t("year.rainNow")} align="end" />
            <FactButton fact={rain.by2050} label={t("year.rain2050")} align="end" />
          </div>
        ) : null}
        <div className="contents" data-testid={`hot-${scenario}`}>
          <span className="flex items-center gap-1.5 text-small font-bold">
            <HeatIcon className="w-5 h-5 flex-none" />
            {t("year.hotHead")}
          </span>
          <FactButton fact={hot.now} label={t("year.hotNow")} align="end" />
          <FactButton fact={hot.by2050} label={t("year.hot2050")} align="end" />
        </div>
      </div>
      {best ? (
        <div className="mt-2 pt-2 border-t border-line" data-testid={`year-best-${scenario}`} data-option-id={best.option.id}>
          <p className="text-small font-bold uppercase tracking-wider text-ink-soft">{t("year.best")}</p>
          <div className="flex items-center justify-between gap-3 mt-1">
            <OptionName option={best.option} className="text-body font-bold" />
            <CropSequence option={best.option} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function Year({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const to = useTo();
  const [state] = useAppState();
  const bestIn = (scenario: Scenario) =>
    rankOptions({
      options: bundle.options,
      limits: state.limits,
      priorities: state.priorities,
      scenario,
      lastCrop: state.lastCrop,
      intercrops: state.intercrops,
    }).ranked[0];
  const bests = SCENARIOS.map((scenario) => ({ scenario, best: bestIn(scenario) }));
  /** The same rotation first in a usual, a dry and the driest year: the answer holds whatever the weather. */
  const holds = bests[0].best && bests.every((b) => b.best?.option.id === bests[0].best?.option.id) ? bests[0].best : undefined;
  // The month strip shows a usual year.
  const months = bundle.year.months;
  const risks = RISK_ORDER.filter((r) => months.some((m) => m.risks.includes(r)));

  return (
    <div className="flex flex-col flex-1">
      {/* Held sideways: the three kinds of year on the left, the year strip on the right. */}
      <AreaNote bundle={bundle} />
      <div data-testid="two-cols" className="flex flex-col phone-land:grid phone-land:grid-cols-2 phone-land:items-start phone-land:gap-x-2">
      <div className="flex flex-col min-w-0">
      <div className="px-4 pt-4">
        <h1 className="text-big">{t("year.kindsHead")}</h1>
        <p className="text-small text-ink-soft mt-1">{t("year.kindsLead")}</p>
        <p className="flex items-center gap-1.5 text-small mt-1">
          <HeatIcon className="w-5 h-5 flex-none" />
          <HotDaysTerm high={bundle.year.flowerHigh}>{t("year.hotHead")}</HotDaysTerm>
        </p>
        {/* The farmer's own field from space, one clear picture a month (src/screens/Timelapse.tsx). */}
        <Link
          to={to("/timelapse")}
          data-testid="timelapse-link"
          className="mt-1 inline-flex items-center gap-1 min-h-11 font-bold text-body underline underline-offset-4"
        >
          {t("timelapse.title")}
          <ChevronIcon className="w-4 h-4" />
        </Link>
      </div>

      {holds ? (
        <p className="mx-4 mt-3 font-bold" data-testid="year-holds">
          <Slotted text={t("year.holds")} slots={{ option: <OptionName option={holds.option} /> }} />
        </p>
      ) : null}

      <div data-testid="year-kinds">
        {bests.map(({ scenario, best }) => (
          <YearKind key={scenario} bundle={bundle} scenario={scenario} best={best} />
        ))}
      </div>
      </div>
      <div className="flex flex-col min-w-0">

      <SeasonNow centre={centroid(openRing(bundle.field.outline.coordinates))} />
      <ForecastNext centre={centroid(openRing(bundle.field.outline.coordinates))} />

      <div className="px-4 pt-2">
        <h2 className="text-small font-bold mb-1">{t("year.stripHead")}</h2>
        <YearStrip months={months} />
        <div className="mt-2 flex flex-col gap-1">
          <CoverLegend none={months.some((m) => m.cover === "none")} />
          <RiskLegend risks={risks} />
        </div>
      </div>

      {/* min-w-0: lets the card shrink to a narrow phone, so its table scrolls inside it instead of widening the page. */}
      <div className="pt-3 min-w-0">
        <SeasonCompare bundle={bundle} />
      </div>

      <div className="px-4 py-3">
        <PlaceholderNote facts={SCENARIOS.flatMap((s) => [bundle.year.hotDays[s].now, bundle.year.hotDays[s].by2050])} />
      </div>
      </div>
      </div>

      <BottomBar>
        <BackButton to={to("/options")} />
        <LinkButton to={to("/adviser")} className="flex-1">
          {t("year.next")}
        </LinkButton>
      </BottomBar>
    </div>
  );
}
