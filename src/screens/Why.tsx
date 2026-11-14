import { Link, useLocation, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import type { Economics, Fact, FieldBundle, Option } from "../data/types";
import { optionMoney } from "../money/money";
import { buildPath } from "../ranking/diagnose";
import { rankOptions } from "../ranking/rank";
import { reasonsFor } from "../ranking/reasons";
import { ReasonList } from "../components/Reasons";
import { useLang, useT } from "../i18n";
import { useAppState, useTo } from "../state/useAppState";
import { CropName, CropSequence, Slotted, optionCrop } from "../components/Crops";
import { ConfidenceWord, PlaceholderNote, ScaleBadge, YoursTag, formatNumber, rangeText, unitText, valueText } from "../components/FactParts";
import { BackIcon, ChevronIcon, FindingIcon } from "../components/Icons";
import { HOT_DAY_LABELS, HotDaysTerm, RichText, Term } from "../components/Term";
import { BottomBar, LinkButton } from "../components/ui";
import { SETTINGS_PATH, settingsFrom } from "./Settings";

/** A fact in full: label, value, range, scale badge, dataset and resolution, date, confidence. */
export function FactRow({ fact, perYear = false, flowerHigh }: { fact: Fact; perYear?: boolean; flowerHigh?: FieldBundle["year"]["flowerHigh"] }) {
  const t = useT();
  const lang = useLang();
  const range = rangeText(fact, lang);
  const unit = `${unitText(fact.unit, t)}${perYear ? t("unit.perYear") : ""}`;
  return (
    <li className="py-2 border-b border-line last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body">
          {fact.label && HOT_DAY_LABELS.includes(fact.label) ? (
            <HotDaysTerm high={flowerHigh}>{t(fact.label)}</HotDaysTerm>
          ) : fact.label ? (
            <RichText text={t(fact.label)} />
          ) : null}
        </span>
        <span className="text-right whitespace-nowrap">
          <span className="text-big font-bold">{valueText(fact, t, lang)}</span>
          {unit ? <span className="text-small font-bold"> {unit}</span> : null}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-ink-soft">
        <ScaleBadge scale={fact.scale} long />
        {range ? (
          <span>
            {t("common.range")} {range}
          </span>
        ) : null}
        {fact.edited ? (
          <YoursTag />
        ) : fact.source.url ? (
          <a href={fact.source.url} target="_blank" rel="noreferrer" className="font-mono uppercase underline">
            {fact.source.dataset} · {fact.source.resolution}
          </a>
        ) : (
          <span className="font-mono uppercase">
            {fact.source.dataset} · {fact.source.resolution}
          </span>
        )}
        {fact.asOf ? <span>{t("common.asOf", { date: fact.asOf })}</span> : null}
        <span className="inline-flex items-center gap-1">
          <Term id="confidence" />
          <ConfidenceWord confidence={fact.confidence} />
        </span>
        {fact.placeholder ? <span className="font-bold text-warn">*</span> : null}
      </div>
    </li>
  );
}

/** The sums behind the income figure, year by year, on one hectare. */
function MoneyWorking({ option, economics }: { option: Option; economics: Economics }) {
  const t = useT();
  const lang = useLang();
  const to = useTo();
  const [state] = useAppState();
  const { pathname } = useLocation();
  const money = optionMoney(option, economics, state.money, state.extras);
  const n = (v: number) => formatNumber(Math.round(v), lang);
  return (
    <div className="py-2" data-testid="money-working">
      <p className="flex flex-wrap items-center justify-between gap-2 text-small font-bold text-ink-soft">
        <span>{t("money.working")} · €/ha</span>
        <ScaleBadge scale={option.facts.income.scale} long />
      </p>
      <table className="w-full mt-1 text-small border-collapse">
        <thead>
          <tr className="text-left border-b border-line">
            <th className="py-1 pr-1 font-bold">{t("money.year")}</th>
            <th className="py-1 px-1 font-bold text-right">{t("money.sales")}</th>
            <th className="py-1 px-1 font-bold text-right">{t("money.costs")}</th>
            <th className="py-1 px-1 font-bold text-right">{t("money.support")}</th>
            <th className="py-1 pl-1 font-bold text-right">{t("money.total")}</th>
          </tr>
        </thead>
        <tbody>
          {money.years.map((y, i) => (
            <tr key={i} className="border-b border-line">
              <td className="py-1 pr-1">
                <CropName crop={y.crop} iconClassName="w-4 h-4" wrap />
                <span className="block text-ink-soft">{option.firstHarvestYear + i}</span>
              </td>
              <td className="py-1 px-1 text-right">{n(y.sales)}</td>
              <td className="py-1 px-1 text-right">−{n(y.costs)}</td>
              <td className="py-1 px-1 text-right">{n(y.support.reduce((sum, s) => sum + s.amount, 0))}</td>
              <td className="py-1 pl-1 text-right font-bold">{n(y.margin)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="py-1 pr-1 font-bold">
              {t("money.perYear")}
            </td>
            <td className="py-1 pl-1 text-right font-bold">{n(money.perYear)}</td>
          </tr>
        </tbody>
      </table>
      <Link
        to={to(SETTINGS_PATH)}
        state={settingsFrom(pathname, null)}
        data-testid="money-change"
        className="mt-1 inline-flex items-center gap-1 min-h-11 font-bold text-body underline underline-offset-4"
      >
        {t("money.change")}
        <ChevronIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 pt-4">
      <h2 className="text-big mb-1 pb-1 border-b-2 border-line-strong">{title}</h2>
      {children}
    </section>
  );
}

export default function Why({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const to = useTo();
  const [state] = useAppState();
  const { optionId } = useParams();
  const option = bundle.options.find((o) => o.id === optionId);

  const back = (
    <Link to={to("/options")} className="inline-flex items-center gap-1 min-h-11 px-3 font-bold text-body">
      <BackIcon className="w-5 h-5" />
      {t("why.back")}
    </Link>
  );

  if (!option) {
    return (
      <div className="flex flex-col flex-1">
        {back}
        <p className="px-4 py-4 text-big">{t("why.notFound")}</p>
      </div>
    );
  }

  const { ranked, removed, repeats } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    scenario: state.scenario,
    lastCrop: state.lastCrop,
  });
  const repeated = repeats.some((o) => o.id === option.id);
  const item = ranked.find((r) => r.option.id === option.id);
  // A shared link can open an option the farmer's limits have ruled out; say so before anything else.
  const ruledOutBy = removed.find((r) => r.option.id === option.id)?.by ?? [];
  const finding = bundle.findings.find((f) => f.addressedBy.includes(option.id)) ?? bundle.findings[0];
  const path = finding ? buildPath(finding, state.limits, state.priorities) : [];
  const facts = option.facts;
  // The income benefit repeats the income figure; with economics that figure is worked out
  // from the farmer's prices, so show the worked-out one rather than the bundle's stale copy.
  const benefits = option.why.benefits.map((f) =>
    bundle.economics && f.label === "benefit.income" ? { ...facts.income, label: f.label } : f,
  );
  const allFacts = [...Object.values(facts), ...option.why.evidence, ...benefits, ...(finding ? [finding.fact] : [])];

  return (
    <div className="flex flex-col flex-1">
      {back}
      <div className="px-4 pb-2 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-head">
            <CropName crop={optionCrop(option)} />
          </h1>
          <p className="flex flex-wrap gap-2 mt-1">
            {item?.best ? (
              <span className="px-1.5 bg-best text-on-best text-small font-bold rounded-sm">{t("options.best")}</span>
            ) : null}
            {option.isCurrent ? (
              <span className="px-1.5 border border-line-strong text-small font-bold rounded-sm">{t("options.current")}</span>
            ) : null}
            {option.supportTag ? <span className="text-small font-bold">{t("options.supportLong")}</span> : null}
          </p>
        </div>
        <CropSequence option={option} size="lg" />
      </div>
      {ruledOutBy.length > 0 ? (
        <p role="alert" data-testid="why-ruled-out" className="mx-4 mb-2 px-3 py-2 bg-warn text-on-warn font-bold text-body rounded-sm">
          {t("why.ruledOut", { limits: ruledOutBy.map((l) => t(`limit.${l}`)).join(", ") })}
        </p>
      ) : null}
      {repeated ? (
        <p role="alert" data-testid="why-left-out" className="mx-4 mb-2 px-3 py-2 bg-warn text-on-warn font-bold text-body rounded-sm">
          <Slotted text={t("options.repeat")} slots={{ crop: <CropName crop={option.sequence[0]} /> }} />
        </p>
      ) : null}

      <Section title={t("why.numbers")}>
        <ul>
          <FactRow fact={facts.income} perYear />
        </ul>
        {bundle.economics ? <MoneyWorking option={option} economics={bundle.economics} /> : null}
        <ul>
          <FactRow fact={facts.water} />
          <FactRow fact={facts.nitrogen} />
          <FactRow fact={facts.risk} />
        </ul>
      </Section>

      <Section title={t("why.h.suggested")}>
        <div className="my-2">
          <ReasonList
            reasons={reasonsFor(option, bundle.options.find((o) => o.isCurrent), state.priorities)}
            option={option}
            testId="why-reasons"
          />
        </div>
        <ol className="flex flex-col gap-1 my-2" data-testid="why-path">
          {path.map((key, i) => (
            <li key={i} className="flex gap-2 text-body">
              <span className="flex-none w-6 h-6 mt-0.5 rounded-full border-2 border-line-strong text-small font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span>
                <RichText text={t(key)} />
              </span>
            </li>
          ))}
        </ol>
        <p className="text-body py-2">
          <RichText text={t(option.why.suggested)} />
        </p>
      </Section>

      <Section title={t("why.h.evidence")}>
        {finding ? (
          <div className="flex gap-2 py-2">
            <FindingIcon titleKey={finding.title} className="w-6 h-6 flex-none" />
            <p className="text-body">
              <span className="font-bold">{t(finding.title)}.</span> {t(finding.detail)}
            </p>
          </div>
        ) : null}
        <ul>
          {finding ? <FactRow fact={finding.fact} flowerHigh={bundle.year.flowerHigh} /> : null}
          {option.why.evidence.map((f, i) => (
            <FactRow key={i} fact={f} flowerHigh={bundle.year.flowerHigh} />
          ))}
        </ul>
      </Section>

      <Section title={t("why.h.benefits")}>
        <ul>
          {benefits.map((f, i) => (
            <FactRow key={i} fact={f} perYear={f.label === "benefit.income"} />
          ))}
        </ul>
      </Section>

      <Section title={t("why.h.unknowns")}>
        <ul className="list-disc pl-5 py-1 text-body">
          {option.why.unknowns.map((k) => (
            <li key={k} className="py-0.5">
              {t(k)}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("why.h.check")}>
        <ul className="list-disc pl-5 py-1 text-body">
          {option.why.checkLocally.map((k) => (
            <li key={k} className="py-0.5">
              {t(k)}
            </li>
          ))}
        </ul>
      </Section>

      <div className="px-4 py-3">
        <PlaceholderNote facts={allFacts} />
      </div>

      <BottomBar>
        <LinkButton to={to("/year")} className="flex-1">
          {t("options.next")}
        </LinkButton>
      </BottomBar>
    </div>
  );
}
