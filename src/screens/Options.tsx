import { Link } from "react-router-dom";
import type { Fact, FieldBundle, Limit, Option } from "../data/types";
import { LIMITS } from "../data/types";
import { useLang, useT } from "../i18n";
import { resolveMoney } from "../money/money";
import { rankOptions } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { PlaceholderNote, ScaleBadge, YoursTag, formatNumber } from "../components/FactParts";
import { FieldShape, openRing } from "../components/FieldShape";
import { Findings } from "../components/Findings";
import { ChevronIcon, EuroIcon, WarnIcon } from "../components/Icons";
import { OptionRow } from "../components/OptionRow";
import { YearStrip } from "../components/YearStrip";
import { BottomBar, LinkButton, SectionTitle } from "../components/ui";
import { PriorityChips, ReasonList } from "../components/Reasons";
import { reasonsFor } from "../ranking/reasons";
import type { RankedOption } from "../ranking/rank";
import { SETTINGS_PATH, settingsFrom } from "./Settings";

/** What to plant next and why, in a few plain lines. */
function Recommendation({ best, current, simple }: { best: RankedOption | undefined; current: Option | undefined; simple: boolean }) {
  const t = useT();
  const lang = useLang();
  const [state] = useAppState();
  if (!best) return null;
  const option = best.option;
  const headline = option.isCurrent
    ? t("options.stay")
    : t("options.plant", { crop: t(`crop.${option.sequence[0]}`).toLocaleLowerCase(lang) });
  return (
    <div className="px-4 pt-4 pb-1" data-testid="recommendation" data-option-id={option.id}>
      <h1 className={simple ? "text-head" : "text-big"} data-testid="rec-headline">
        {headline}
      </h1>
      <div className="mt-2">
        <ReasonList reasons={reasonsFor(option, current, state.priorities)} option={option} testId="rec-reasons" />
      </div>
      <p className="mt-2 text-small text-ink-soft">{t("options.adviser")}</p>
    </div>
  );
}

export default function Options({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const to = useTo();
  const [state, setState] = useAppState();
  const current = bundle.options.find((o) => o.isCurrent);
  const { ranked, removed } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    scenario: state.scenario,
  });
  const removedBy: Limit[] = LIMITS.filter((l) => removed.some((r) => r.by.includes(l)));
  const shownFacts: Fact[] = [
    ...bundle.findings.map((f) => f.fact),
    ...ranked.flatMap((r) => Object.values(r.option.facts)),
  ];
  const best = ranked[0];
  // When every option fact shares one scale, one badge on the list stands for all of them.
  const optionScales = new Set(ranked.flatMap((r) => Object.values(r.option.facts).map((f) => f.scale)));
  const sharedScale = optionScales.size === 1 ? [...optionScales][0] : null;
  const simple = state.view === "simple";

  return (
    <div className="flex flex-col flex-1">
      {simple ? null : (
        <div className="px-4 pt-3 pb-3 bg-surface border-b border-line">
          <div className="flex items-center gap-3">
            <FieldShape ring={openRing(bundle.field.outline.coordinates)} className="w-12 h-12 flex-none" />
            <div className="min-w-0">
              <p className="text-big font-bold">{bundle.field.name}</p>
              <p className="text-small font-bold text-ink-soft">
                {formatNumber(bundle.field.areaHa, lang)} ha
              </p>
            </div>
          </div>
          <div className="mt-2">
            <YearStrip months={bundle.year.months} risks={false} compact />
          </div>
        </div>
      )}

      <Recommendation best={best} current={current} simple={simple} />
      <div className="px-4 pt-2">
        <p className="text-small font-bold text-ink-soft mb-1">{t("options.priorities")}</p>
        <PriorityChips chosen={state.priorities} onChange={(priorities) => setState({ priorities })} />
      </div>

      <SectionTitle>{t("options.seen")}</SectionTitle>
      <Findings findings={bundle.findings} view={state.view} />

      <SectionTitle>
        <span className="flex items-center justify-between">
          {t("options.list")}
          {sharedScale ? <ScaleBadge scale={sharedScale} /> : null}
        </span>
      </SectionTitle>
      <ul className="border-t border-line" data-testid="option-list">
        {ranked.map((item) => (
          <OptionRow key={item.option.id} item={item} view={state.view} sharedScale={sharedScale !== null} />
        ))}
      </ul>
      {bundle.economics ? (
        <Link
          to={to(SETTINGS_PATH)}
          state={settingsFrom("/options", null)}
          data-testid="money-row"
          className="flex items-center gap-3 min-h-11 px-4 py-2 bg-surface border-b border-line font-bold text-body"
        >
          <EuroIcon className="w-5 h-5 flex-none" />
          <span className="flex-1">{t("settings.title")}</span>
          {resolveMoney(bundle.economics, state.money).edited || state.extras.length ? <YoursTag /> : null}
          <ChevronIcon className="w-5 h-5 flex-none text-ink-soft" />
        </Link>
      ) : null}
      {removed.length > 0 ? (
        <p className="px-4 py-3 flex items-start gap-2 text-body font-bold" data-testid="ruled-out">
          <WarnIcon className="w-5 h-5 flex-none mt-0.5 text-warn" />
          {t("options.ruledOut", {
            n: removed.length,
            limits: removedBy.map((l) => t(`limit.${l}`)).join(", "),
          })}
        </p>
      ) : null}
      <div className="px-4 py-2">
        <PlaceholderNote facts={shownFacts} />
      </div>

      <BottomBar>
        <LinkButton to={to("/year")} className="flex-1">
          {t("options.next")}
        </LinkButton>
      </BottomBar>
    </div>
  );
}
