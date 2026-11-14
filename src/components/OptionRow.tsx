import { Link } from "react-router-dom";
import type { View } from "../data/types";
import { useLang, useT } from "../i18n";
import type { RankedOption } from "../ranking/rank";
import { useTo } from "../state/useAppState";
import { CropSequence, optionCrop } from "./Crops";
import { ConfidenceWord, LevelMeter, ScaleBadge, isLevel, unitText, valueText } from "./FactParts";
import { ChevronIcon, DropIcon, NitrogenIcon, RiskShieldIcon, SupportIcon, WarnIcon } from "./Icons";
import type { Fact } from "../data/types";

function Metric({ fact, label, Icon, showScale }: { fact: Fact; label: string; Icon: typeof DropIcon; showScale: boolean }) {
  const t = useT();
  const lang = useLang();
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      {/* When the four facts do not share one scale, each number carries its own mark. */}
      {showScale ? <ScaleBadge scale={fact.scale} iconOnly /> : null}
      <Icon className="w-4 h-4" />
      {isLevel(fact.value) ? (
        <LevelMeter level={fact.value} label={label} />
      ) : (
        <span className="font-bold text-body" aria-label={`${label}: ${valueText(fact, t, lang)} ${unitText(fact.unit, t)}`}>
          {valueText(fact, t, lang)}
        </span>
      )}
    </span>
  );
}

/** One ranked rotation: crop icons with years, income per year, water, nitrogen, risk, tags. */
export function OptionRow({ item, view, sharedScale = false }: { item: RankedOption; view: View; sharedScale?: boolean }) {
  const t = useT();
  const lang = useLang();
  const to = useTo();
  const { option, best, flags } = item;
  const { income, water, nitrogen, risk } = option.facts;
  const simple = view === "simple";

  return (
    <li data-testid="option-row" data-option-id={option.id} className={best ? "bg-surface border-l-4 border-best" : "bg-surface border-l-4 border-surface"}>
      <Link to={to(`/why/${option.id}`)} className="flex items-stretch gap-2 px-3 py-3 border-b border-line" aria-label={`${t(`crop.${optionCrop(option)}`)}. ${t("options.openWhy")}`}>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span className={`font-bold ${simple ? "text-big" : "text-body"}`}>{t(`crop.${optionCrop(option)}`)}</span>
              {best ? (
                <span data-testid="tag-best" className="px-1.5 bg-best text-on-best text-small font-bold rounded-sm">
                  {t("options.best")}
                </span>
              ) : null}
              {option.isCurrent ? (
                <span data-testid="tag-current" className="px-1.5 border border-line-strong text-small font-bold rounded-sm">
                  {t("options.current")}
                </span>
              ) : null}
            </div>
            <span className="text-right whitespace-nowrap" aria-label={`${t("fact.income")}: ${valueText(income, t, lang)} ${unitText(income.unit, t)}${t("unit.perYear")}`}>
              <span className={`font-bold ${simple ? "text-head" : "text-big"}`}>{valueText(income, t, lang)}</span>
              <span className="text-small font-bold"> {unitText(income.unit, t)}{t("unit.perYear")}</span>
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <CropSequence option={option} size={simple ? "lg" : "md"} />
            {simple ? (
              <span className="inline-flex items-center gap-1 pb-1 font-bold text-body" title={t("fact.risk")}>
                <RiskShieldIcon className="w-5 h-5" />
                <span className="sr-only">{t("fact.risk")}: </span>
                {valueText(risk, t, lang)}
              </span>
            ) : (
              <span className="flex items-center gap-3 pb-1">
                <Metric fact={water} label={t("fact.water")} Icon={DropIcon} showScale={!sharedScale} />
                <Metric fact={nitrogen} label={t("fact.nitrogen")} Icon={NitrogenIcon} showScale={!sharedScale} />
                <Metric fact={risk} label={t("fact.risk")} Icon={RiskShieldIcon} showScale={!sharedScale} />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <ConfidenceWord confidence={income.confidence} />
            {sharedScale ? null : <ScaleBadge scale={income.scale} />}
            {option.supportTag ? (
              <span className="inline-flex items-center gap-1 px-1 text-small font-bold border border-line-strong rounded-sm" title={t("options.supportLong")}>
                <SupportIcon className="w-4 h-4" />
                <span className="sr-only">{t("options.supportLong")}</span>
                €
              </span>
            ) : null}
            {flags.map((flag) => (
              <span key={flag} data-testid="flag" className="inline-flex items-center gap-1 px-1 text-small font-bold bg-warn text-on-warn rounded-sm">
                <WarnIcon className="w-3.5 h-3.5" />
                {t(`flag.${flag}`)}
              </span>
            ))}
          </div>
        </div>
        <ChevronIcon className="w-5 h-5 self-center flex-none text-ink-soft" />
      </Link>
    </li>
  );
}
