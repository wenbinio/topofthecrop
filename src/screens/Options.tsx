import { useState } from "react";
import { Link } from "react-router-dom";
import type { CropId, Economics, Fact, FieldBundle, Limit, Option } from "../data/types";
import { weakLinks } from "../money/money";
import { LIMITS } from "../data/types";
import { useLang, useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { PlaceholderNote, ScaleBadge, formatNumber } from "../components/FactParts";
import { FieldShape, openRing } from "../components/FieldShape";
import { Fold } from "../components/Fold";
import { HarvestCards } from "../components/HarvestCards";
import { Findings } from "../components/Findings";
import { SoilCard } from "../components/SoilCard";
import { soilSummary } from "../data/soil";
import { CropPlate } from "../components/CropPlate";
import { ChevronIcon, WarnIcon } from "../components/Icons";
import { CropName, Slotted, stripPair, stripsNext } from "../components/Crops";
import { OptionRow } from "../components/OptionRow";
import { LinkButton } from "../components/ui";
import { ReasonList } from "../components/Reasons";
import { reasonsFor } from "../ranking/reasons";
import type { RankedOption } from "../ranking/rank";
import { AreaNote } from "../components/BundleProvider";
import { FARMLAND_NOTE_BELOW } from "../data/caveats";
import { ReadButton } from "../voice/Voice";
import { StripMap } from "../components/StripMap";

/**
 * The plan: one answer, the three harvests, the reasons and how sure the app is, then what to do with it.
 * Everything else (the other choices, the evidence) is a tap away, never on screen by default.
 */
function Recommendation({ best, current, economics }: { best: RankedOption | undefined; current: Option | undefined; economics?: Economics }) {
  const t = useT();
  const lang = useLang();
  const [state] = useAppState();
  if (!best) return null;
  const option = best.option;
  const pair = stripsNext(option);
  const headline = option.isCurrent ? (
    <StayHeadline />
  ) : pair ? (
    <Slotted text={t("options.plantStrips")} slots={{ a: <CropWord crop={pair[0]} />, b: <CropWord crop={pair[1]} /> }} />
  ) : (
    <Slotted text={t("options.plant")} slots={{ crop: <CropWord crop={option.sequence[0]} /> }} />
  );
  const sowNext = option.isCurrent ? "durum" : option.sequence[0];
  const sure = option.facts.income.confidence;
  // When unsure, say which figures are unsure, rather than a general warning.
  const weak = economics && sure === "low" ? weakLinks(option, economics, state.money) : [];
  const parts = new Intl.ListFormat(lang, { type: "conjunction" }).format(weak.map((w) => t(`options.weak.${w.kind}`, { crop: t(`crop.${w.crop}`).toLocaleLowerCase(lang) })));
  return (
    <div className="px-4 pt-3 pb-2" data-testid="recommendation" data-option-id={option.id}>
      <div className="flex items-center gap-3">
        <CropPlate crop={sowNext} big className="w-24 h-24" />
        <div className="flex-1 min-w-0">
          <p className="text-small font-bold uppercase tracking-wider text-wheat-ink">{t("options.kicker")}</p>
          <h1 className="text-head" data-testid="rec-headline">
            {headline}
          </h1>
        </div>
      </div>
      <div className="mt-4" data-testid="rec-harvests">
        <HarvestCards option={option} />
      </div>
      {/* The warnings the farmer's own limits add to the advice (the same marks as on the other choices' rows). */}
      {best.flags.length ? (
        <p className="mt-2 flex flex-wrap gap-2" data-testid="rec-flags">
          {best.flags.map((flag) => (
            <span key={flag} data-testid="flag" className="inline-flex items-center gap-1 px-1 text-small font-bold bg-warn text-on-warn rounded-sm">
              <WarnIcon className="w-3.5 h-3.5" />
              {t(`flag.${flag}`)}
            </span>
          ))}
        </p>
      ) : null}
      <div className="mt-3">
        <ReasonList reasons={reasonsFor(option, current, state.priorities)} option={option} testId="rec-reasons" badges />
      </div>
      {/* One honest line on how sure the app is, right beside the claim, instead of a badge on every row. */}
      <p className="mt-3 px-3 py-2 rounded-box bg-note text-body" data-testid="how-sure" data-confidence={sure}>
        <b>{t("options.sure", { level: t(`confidence.${sure}`).toLocaleLowerCase() })}</b> {weak.length ? <span data-testid="how-sure-weak">{t("options.sureWhy.lowParts", { parts })}</span> : t(`options.sureWhy.${sure}`)}
      </p>
    </div>
  );
}

/** A crop's name inside the headline, in lower case and without its icon: the plate beside the headline is the picture. */
function CropWord({ crop }: { crop: CropId }) {
  const t = useT();
  const lang = useLang();
  return <span data-crop={crop}>{t(`crop.${crop}`).toLocaleLowerCase(lang)}</span>;
}

/** "Keep durum: fits best". */
function StayHeadline() {
  const t = useT();
  return <Slotted text={t("options.stay")} slots={{ crop: <CropWord crop="durum" /> }} />;
}

/** How many other choices show before "More options". */
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
  // The "Other choices" button opens the list below and scrolls to it.
  const [showOthers, setShowOthers] = useState(0);
  const { ranked, removed, repeats, intercrops: waiting } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    lastCrop: state.lastCrop,
    intercrops: state.intercrops,
  });
  const best = ranked[0];
  // The answer is not repeated in the list of other choices.
  const others = ranked.slice(1);
  const hidden = Math.max(0, others.length - SHOWN_OPTIONS);
  const shown = more ? others : others.slice(0, SHOWN_OPTIONS);
  const removedBy: Limit[] = LIMITS.filter((l) => removed.some((r) => r.by.includes(l)));
  const shownFacts: Fact[] = ranked.flatMap((r) => Object.values(r.option.facts));
  // When every option fact shares one scale, one badge on the list stands for all of them.
  const optionScales = new Set(ranked.flatMap((r) => Object.values(r.option.facts).map((f) => f.scale)));
  const sharedScale = optionScales.size === 1 ? [...optionScales][0] : null;
  // When every other choice is as sure (or unsure) as the next, it is said once above the list, not on every row.
  const sures = new Set(others.map((r) => r.option.facts.income.confidence));
  const sharedSure = sures.size === 1 ? [...sures][0] : null;
  const soil = soilSummary(bundle, { weight: state.soilWeight, ph: state.soilPh });
  // Where an intercrop would go on this field: the strip option that pairs the advised crop, else the first one.
  const sowNext = best ? best.option.sequence[0] : undefined;
  const intercrop = best?.option.strips
    ? undefined
    : (bundle.options.find((o) => o.strips && sowNext && stripPair(o)?.includes(sowNext)) ?? bundle.options.find((o) => o.strips));

  return (
    <div className="flex flex-col flex-1">
      {/* Held sideways: the plan on the left, the other choices on the right. */}
      <div data-testid="two-cols" className="flex flex-col phone-land:grid phone-land:grid-cols-2 phone-land:items-start phone-land:gap-x-2">
      <div className="flex flex-col min-w-0">
      <div className="px-4 pt-2 flex items-center gap-2">
        <p className="flex-1 min-w-0 flex items-center justify-center gap-2 text-small font-bold text-ink-soft" data-testid="field-line">
          <FieldShape ring={openRing(bundle.field.outline.coordinates)} className="w-5 h-5 flex-none" />
          <span className="truncate">
            {bundle.field.name} · {formatNumber(bundle.field.areaHa, lang)} ha
          </span>
        </p>
        <ReadButton />
      </div>
      <AreaNote bundle={bundle} />
      {bundle.field.basin && bundle.field.basin.farmlandShare < FARMLAND_NOTE_BELOW ? (
        <p className="px-4 pt-1 flex items-start gap-2 text-small font-bold" data-testid="farmland-note">
          <WarnIcon className="w-4 h-4 flex-none mt-0.5 text-warn" />
          {t("basin.notFarmland")}
        </p>
      ) : null}
      <Recommendation best={best} current={current} economics={bundle.economics} />
      {best?.option.strips ? <StripMap option={best.option} bundle={bundle} /> : null}

      {/* What to do with the plan, as in the storyboard: ask why or look at the other choices, then keep it. */}
      <div className="px-4 pt-2 pb-3 flex flex-col gap-2" data-testid="plan-actions">
        <div className="grid grid-cols-2 gap-2">
          {best ? (
            <LinkButton to={to(`/why/${best.option.id}`)} look="secondary" testId="branch-why" className="min-h-12">
              {t("options.why")}
            </LinkButton>
          ) : null}
          <button
            type="button"
            data-testid="others-button"
            onClick={() => setShowOthers((n) => n + 1)}
            className="tc-tap min-h-12 inline-flex items-center justify-center gap-2 px-3 rounded-box font-bold text-body bg-surface text-ink border-2 border-line-strong"
          >
            {t("options.others", { n: others.length })}
          </button>
        </div>
        <LinkButton to={to("/today")} testId="keep-plan" className="min-h-14 text-big">
          {t("options.keep")}
        </LinkButton>
        <p className="self-center flex flex-wrap items-baseline justify-center gap-x-3 text-body">
          <Link to={to("/adviser")} data-testid="share-plan" className="min-h-11 inline-flex items-center underline underline-offset-4">
            {t("options.share")}
          </Link>
          <span className="text-ink-soft" data-testid="priority-summary">
            {t("options.priorities")}: {state.priorities.map((p, i) => `${i + 1} ${t(`priority.${p}`)}`).join(", ") || t("common.noData")}
          </span>
          <Link to={to("/questions")} data-testid="change-answers" className="min-h-11 inline-flex items-center underline underline-offset-4">
            {t("options.change")}
          </Link>
        </p>
      </div>
      </div>

      <div className="flex flex-col min-w-0 border-t border-line">
      <Fold testId="fold-seen" title={t("options.seen")}>
        <Findings findings={bundle.findings} view={state.view} flowerHigh={bundle.year.flowerHigh} />
      </Fold>
      {soil ? (
        <Fold testId="fold-soil" title={t("soil.title")} summary={t(`soil.weight.${soil.weight}`)}>
          <SoilCard bundle={bundle} view={state.view} bare />
        </Fold>
      ) : null}
      {intercrop || best?.option.strips || waiting.length || state.intercrops ? (
        <Fold testId="fold-intercrop" title={t("strips.where")}>
          {/* Strip intercrops stay out of the ranking until asked for: nobody here has tried them. The switch lives
              here, with the map, so intercropping is one row on the plan screen rather than two. */}
          <button
            type="button"
            role="switch"
            aria-checked={state.intercrops}
            data-testid="intercrops-toggle"
            onClick={() => setState({ intercrops: !state.intercrops })}
            className="tc-tap w-full flex items-center gap-2 px-4 py-2 bg-surface border-y border-line text-left"
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
          {intercrop ? <StripMap option={intercrop} bundle={bundle} /> : null}
          <div className="h-3" />
        </Fold>
      ) : null}
      <Fold
        testId="fold-options"
        openSignal={showOthers}
        title={t("options.others", { n: others.length })}
        summary={sharedScale ? <ScaleBadge scale={sharedScale} /> : null}
      >
      {sharedSure ? (
        <p className="px-4 pb-2 text-small font-bold text-ink-soft" data-testid="others-sure">
          {t("options.othersSure", { level: t(`confidence.${sharedSure}`).toLocaleLowerCase() })}
        </p>
      ) : null}
      <ul className="border-t border-line" data-testid="option-list">
        {shown.map((item) => (
          <OptionRow key={item.option.id} item={item} view={state.view} sharedScale={sharedScale !== null} hideConfidence={sharedSure !== null} />
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
      <div className="px-4 py-2">
        <PlaceholderNote facts={shownFacts} />
      </div>
      </div>
      </div>
    </div>
  );
}
