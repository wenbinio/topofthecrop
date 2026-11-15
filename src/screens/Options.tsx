import { useState } from "react";
import { Link } from "react-router-dom";
import type { CropId, Fact, FieldBundle, Limit, Option } from "../data/types";
import { LIMITS } from "../data/types";
import { useLang, useT } from "../i18n";
import { resolveMoney } from "../money/money";
import { rankOptions } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { PlaceholderNote, ScaleBadge, YoursTag, formatNumber } from "../components/FactParts";
import { FieldShape, openRing } from "../components/FieldShape";
import { Findings } from "../components/Findings";
import { SoilCard } from "../components/SoilCard";
import { Fold } from "../components/Fold";
import { CropPlate } from "../components/CropPlate";
import { soilSummary } from "../data/soil";
import { ChevronIcon, EuroIcon, WarnIcon } from "../components/Icons";
import { CropName, Slotted, stripsNext } from "../components/Crops";
import { PriorityHelp } from "../components/Term";
import { OptionRow } from "../components/OptionRow";
import { BackButton, BottomBar, LinkButton } from "../components/ui";
import { PriorityChips, ReasonList } from "../components/Reasons";
import { reasonsFor } from "../ranking/reasons";
import type { RankedOption } from "../ranking/rank";
import { SETTINGS_PATH, settingsFrom } from "./settings/path";
import { AreaNote } from "../components/BundleProvider";
import { FARMLAND_NOTE_BELOW } from "../data/caveats";
import { ReadButton } from "../voice/Voice";

/** What to plant next and why, in a few plain lines. */
function Recommendation({ best, current, simple }: { best: RankedOption | undefined; current: Option | undefined; simple: boolean }) {
  const t = useT();
  const [state] = useAppState();
  if (!best) return null;
  const option = best.option;
  const pair = stripsNext(option);
  const headline = option.isCurrent ? (
    <StayHeadline />
  ) : pair ? (
    <Slotted text={t("options.plantStrips")} slots={{ a: <CropName crop={pair[0]} lower />, b: <CropName crop={pair[1]} lower /> }} />
  ) : (
    <Slotted text={t("options.plant")} slots={{ crop: <CropName crop={option.sequence[0]} lower /> }} />
  );
  const sowNext = option.isCurrent ? "durum" : option.sequence[0];
  return (
    <div className="px-4 pt-4 pb-1" data-testid="recommendation" data-option-id={option.id}>
      <div className="flex items-start gap-3">
        <CropPlate crop={sowNext} big className="w-24 h-24" />
        <h1 className={`flex-1 min-w-0 ${simple ? "text-head" : "text-big"}`} data-testid="rec-headline">
          {headline}
        </h1>
        <ReadButton />
      </div>
      <div className="mt-2">
        <ReasonList reasons={reasonsFor(option, current, state.priorities)} option={option} testId="rec-reasons" />
      </div>
      <p className="mt-2 text-small text-ink-soft">{t("options.adviser")}</p>
    </div>
  );
}

/** "Keep durum: fits best", with durum's icon. */
function StayHeadline() {
  const t = useT();
  return <Slotted text={t("options.stay")} slots={{ crop: <CropName crop="durum" lower /> }} />;
}

/** How many rows show before "More options". */
export const SHOWN_OPTIONS = 4;

/** One line per crop left out because it was just grown. */
export function RepeatLines({ repeats }: { repeats: Option[] }) {
  const t = useT();
  const crops = [...new Set(repeats.map((o) => o.sequence[0]))] as CropId[];
  return (
    <>
      {crops.map((crop) => (
        <p key={crop} className="px-4 py-2 flex items-start gap-2 text-body font-bold" data-testid="left-out">
          <WarnIcon className="w-5 h-5 flex-none mt-0.5 text-warn" />
          <span>
            <Slotted text={t("options.repeat")} slots={{ crop: <CropName crop={crop} /> }} />
          </span>
        </p>
      ))}
    </>
  );
}

export default function Options({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const to = useTo();
  const [state, setState] = useAppState();
  const current = bundle.options.find((o) => o.isCurrent);
  const [more, setMore] = useState(false);
  const { ranked, removed, repeats, intercrops: waiting } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    lastCrop: state.lastCrop,
    intercrops: state.intercrops,
  });
  const hidden = Math.max(0, ranked.length - SHOWN_OPTIONS);
  const shown = more ? ranked : ranked.slice(0, SHOWN_OPTIONS);
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
  const soil = soilSummary(bundle);

  return (
    <div className="flex flex-col flex-1">
      {/* Held sideways: the advice and priorities on the left, what was seen and the options on the right. */}
      <div data-testid="two-cols" className="flex flex-col phone-land:grid phone-land:grid-cols-2 phone-land:items-start phone-land:gap-x-2">
      <div className="flex flex-col min-w-0">
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
        </div>
      )}

      <AreaNote bundle={bundle} />
      {bundle.field.basin && bundle.field.basin.farmlandShare < FARMLAND_NOTE_BELOW ? (
        <p className="px-4 pt-1 flex items-start gap-2 text-small font-bold" data-testid="farmland-note">
          <WarnIcon className="w-4 h-4 flex-none mt-0.5 text-warn" />
          {t("basin.notFarmland")}
        </p>
      ) : null}
      <Recommendation best={best} current={current} simple={simple} />
      </div>
      <div className="flex flex-col min-w-0">

      {/* One answer above; everything else is a row the farmer may open, none of which they must. */}
      <p className="px-4 pt-4 pb-2 text-small font-bold uppercase tracking-wider text-ink-soft">{t("options.moreHead")}</p>
      <div className="border-t border-line" data-testid="branches">
      {best ? (
        <Link
          to={to(`/why/${best.option.id}`)}
          data-testid="branch-why"
          className="tc-tap flex items-center gap-3 px-4 py-2 bg-surface border-b border-line font-bold text-body"
        >
          <span className="flex-1">{t("why.h.suggested")}</span>
          <ChevronIcon className="w-5 h-5 flex-none text-ink-soft" />
        </Link>
      ) : null}
      <Fold
        testId="fold-options"
        title={t("options.others", { n: Math.max(0, ranked.length - 1) })}
        summary={sharedScale ? <ScaleBadge scale={sharedScale} /> : null}
      >
      <ul className="border-t border-line" data-testid="option-list">
        {shown.map((item) => (
          <OptionRow key={item.option.id} item={item} view={state.view} sharedScale={sharedScale !== null} />
        ))}
        {hidden ? (
          <li>
            <button
              type="button"
              aria-expanded={more}
              data-testid="more-options"
              onClick={() => setMore((m) => !m)}
              className="tc-tap w-full flex items-center gap-2 px-4 bg-surface border-b border-line font-bold text-body text-left"
            >
              <span className="flex-1">{more ? t("options.fewer") : t("options.more", { n: hidden })}</span>
              <ChevronIcon className={`tc-turn w-5 h-5 flex-none text-ink-soft ${more ? "-rotate-90" : "rotate-90"}`} />
            </button>
          </li>
        ) : null}
        {/* Strip intercrops stay out of the ranking until asked for: nobody here has tried them. */}
        {waiting.length || state.intercrops ? (
          <li>
            <button
              type="button"
              role="switch"
              aria-checked={state.intercrops}
              data-testid="intercrops-toggle"
              onClick={() => setState({ intercrops: !state.intercrops })}
              className="tc-tap w-full flex items-center gap-2 px-4 py-2 bg-surface border-b border-line text-left"
            >
              <span className="flex-1">
                <span className="block font-bold text-body">{t("options.intercrops")}</span>
                <span className="block text-small text-ink-soft">{t("options.intercropsMeans")}</span>
              </span>
              <span
                aria-hidden="true"
                className={`tc-knob flex-none w-11 h-6 rounded-full border-2 border-line-strong flex items-center px-0.5 ${state.intercrops ? "bg-primary" : "bg-surface"}`}
              >
                <span className={`tc-knob w-4 h-4 rounded-full ${state.intercrops ? "bg-surface translate-x-5" : "bg-line-strong translate-x-0"}`} />
              </span>
            </button>
          </li>
        ) : null}
      </ul>
      {removed.length > 0 ? (
        <p className="px-4 py-3 flex items-start gap-2 text-body font-bold" data-testid="ruled-out">
          <WarnIcon className="w-5 h-5 flex-none mt-0.5 text-warn" />
          {t("options.ruledOut", {
            n: removed.length,
            limits: removedBy.map((l) => t(`limit.${l}`)).join(", "),
          })}
        </p>
      ) : null}
      {repeats.length ? <RepeatLines repeats={repeats} /> : null}
      </Fold>
      <Fold
        testId="fold-priorities"
        title={t("options.priorities")}
        summary={<span data-testid="priority-summary">{state.priorities.map((p, i) => `${i + 1} ${t(`priority.${p}`)}`).join(", ")}</span>}
      >
        <div className="px-4 pb-3">
          <PriorityHelp>
            <p className="text-small font-bold text-ink-soft">{t("q.priorities")}</p>
          </PriorityHelp>
          <PriorityChips chosen={state.priorities} onChange={(priorities) => setState({ priorities })} />
        </div>
      </Fold>
      <Fold testId="fold-seen" title={t("options.seen")}>
        <Findings findings={bundle.findings} view={state.view} flowerHigh={bundle.year.flowerHigh} />
      </Fold>
      {soil ? (
        <Fold testId="fold-soil" title={t("soil.title")} summary={t(`soil.weight.${soil.weight}`)}>
          <SoilCard bundle={bundle} view={state.view} bare />
        </Fold>
      ) : null}
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
      </div>
      <div className="px-4 py-2">
        <PlaceholderNote facts={shownFacts} />
      </div>
      </div>
      </div>

      <BottomBar>
        <BackButton to={to("/questions")} />
        <LinkButton to={to("/year")} className="flex-1">
          {t("options.next")}
        </LinkButton>
      </BottomBar>
    </div>
  );
}
