import type { FieldBundle, Risk } from "../data/types";
import { SCENARIOS } from "../data/types";
import { useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { CropName, CropSequence, optionCrop } from "../components/Crops";
import { FactButton, PlaceholderNote } from "../components/FactParts";
import { HeatIcon } from "../components/Icons";
import { CoverLegend, RiskLegend, YearStrip } from "../components/YearStrip";
import { HotDaysTerm } from "../components/Term";
import { BackButton, BottomBar, LinkButton } from "../components/ui";

const RISK_ORDER: Risk[] = ["dry", "frost", "heat", "rain"];

export default function Year({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const to = useTo();
  const [state, setState] = useAppState();
  const hot = bundle.year.hotDays[state.scenario];
  const { ranked } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    scenario: state.scenario,
    lastCrop: state.lastCrop,
  });
  const best = ranked[0];
  const index = SCENARIOS.indexOf(state.scenario);
  // The slider changes the risk icons too, when the bundle carries them for that stop.
  const scenarioRisks = bundle.year.risksByScenario?.[state.scenario];
  const months = scenarioRisks
    ? bundle.year.months.map((m, i) => ({ ...m, risks: scenarioRisks[i] ?? m.risks }))
    : bundle.year.months;
  const risks = RISK_ORDER.filter((r) => months.some((m) => m.risks.includes(r)));

  return (
    <div className="flex flex-col flex-1">
      {/* Held sideways: the hot days, slider and best fit on the left, the year strip on the right. */}
      <div data-testid="two-cols" className="flex flex-col phone-land:grid phone-land:grid-cols-2 phone-land:items-start phone-land:gap-x-2">
      <div className="flex flex-col min-w-0">
      <div className="px-4 pt-4">
        <h1 className="text-big flex items-center gap-2">
          <HeatIcon className="w-6 h-6 flex-none" />
          <HotDaysTerm high={bundle.year.flowerHigh}>{t("year.hotHead")}</HotDaysTerm>
        </h1>
        <div className="flex items-start gap-6 mt-1" data-testid="hot-days">
          <div>
            <FactButton fact={hot.now} label={t("year.hotNow")} big />
            <p className="text-small font-bold text-ink-soft">{t("year.now")}</p>
          </div>
          <div>
            <FactButton fact={hot.by2050} label={t("year.hot2050")} big />
            <p className="text-small font-bold text-ink-soft">{t("year.by2050")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <label htmlFor="scenario" className="block font-bold text-body">
          {t("year.slider")}
        </label>
        <input
          id="scenario"
          type="range"
          min={0}
          max={SCENARIOS.length - 1}
          step={1}
          value={index}
          aria-valuetext={t(`scenario.${state.scenario}`)}
          onChange={(e) => setState({ scenario: SCENARIOS[Number(e.target.value)] ?? "normal" })}
          className="w-full h-11"
        />
        <div className="grid grid-cols-3 text-small font-bold" aria-hidden="true">
          {SCENARIOS.map((s, i) => (
            <span key={s} className={`${i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"} ${s === state.scenario ? "text-ink" : "text-ink-soft"}`}>
              {t(`scenario.${s}`)}
            </span>
          ))}
        </div>
      </div>

      {best ? (
        <div className="mx-4 mt-4 p-3 bg-surface border-l-4 border-best" data-testid="year-best" data-option-id={best.option.id}>
          <p className="text-small font-bold uppercase tracking-wider text-ink-soft">{t("year.best")}</p>
          <div className="flex items-center justify-between gap-3 mt-1">
            <CropName crop={optionCrop(best.option)} className="text-big font-bold" />
            <CropSequence option={best.option} />
          </div>
        </div>
      ) : null}
      </div>
      <div className="flex flex-col min-w-0">

      <div className="px-4 pt-5">
        <h2 className="sr-only">{t("year.title")}</h2>
        <YearStrip months={months} />
        <div className="mt-2 flex flex-col gap-1">
          <CoverLegend />
          <RiskLegend risks={risks} />
        </div>
      </div>

      <div className="px-4 py-3">
        <PlaceholderNote facts={[hot.now, hot.by2050]} />
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
