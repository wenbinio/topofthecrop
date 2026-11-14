import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { Economics, Fact, FieldBundle } from "../data/types";
import { cropFigures, economicsCrops, resolveMoney } from "../money/money";
import { useLang, useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { shareLink, useAppState, useTo } from "../state/useAppState";
import { CropName, PaidIn, Slotted, optionCrop } from "../components/Crops";
import { PlaceholderNote, ScaleBadge, YoursTag, formatNumber, rangeText, unitText, valueText } from "../components/FactParts";
import { BackIcon, CropIcon, PrintIcon } from "../components/Icons";
import { Button } from "../components/ui";
import { unknownsFor } from "../data/caveats";

function Block({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-3 break-inside-avoid">
      <h2 className="text-body font-bold border-b-2 border-line-strong mb-1">{title}</h2>
      {children}
    </section>
  );
}

function FactText({ fact, perYear = false }: { fact: Fact; perYear?: boolean }) {
  const t = useT();
  const lang = useLang();
  const range = rangeText(fact, lang);
  return (
    <span>
      <b>
        {valueText(fact, t, lang)} {unitText(fact.unit, t)}
        {perYear ? t("unit.perYear") : ""}
      </b>
      {range ? ` (${range})` : ""} <ScaleBadge scale={fact.scale} />
      {fact.edited ? (
        <>
          {" "}
          <YoursTag />
        </>
      ) : null}
    </span>
  );
}

/** The prices and support the income figures were worked out with, and which the farmer changed. */
function MoneyUsed({ economics }: { economics: Economics }) {
  const t = useT();
  const lang = useLang();
  const [state] = useAppState();
  const r = resolveMoney(economics, state.money);
  const changed = (edited: boolean) => (edited ? ` · ${t("print.changed")}` : "");
  return (
    <Block title={t("print.money")}>
      <ul data-testid="print-money">
        {economicsCrops(economics).map((c) => {
          const price = r.prices[c] ?? { value: Number(cropFigures(economics, c).price.value), edited: false };
          return (
            <li key={c}>
              <CropName crop={c} />: <b>{formatNumber(price.value, lang)} €/t</b>
              {changed(price.edited)}
            </li>
          );
        })}
        {economics.support.map((item) => {
          const s = r.support.find((x) => x.id === item.id);
          if (!s) return null;
          return (
            <li key={item.id}>
              {item.name[lang]} ({t(`level.${item.level}`)}): <b>{s.on ? t("print.on") : t("print.off")}</b>
              {s.on ? `, ${formatNumber(s.amount, lang)} €/ha` : ""}
              {changed(s.edited)}. <span className="text-ink-soft">{item.condition[lang]}</span>
            </li>
          );
        })}
        {state.extras.map((extra, i) => (
          <li key={`x${i}`} data-testid="print-extra">
            {extra.name} ({t("print.extra")}): <b>{formatNumber(extra.amount, lang)} €/ha</b>. <PaidIn crops={extra.crops} />.
          </li>
        ))}
      </ul>
      <p className="mt-1">{t("settings.adviser")}</p>
    </Block>
  );
}

export default function Print({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const to = useTo();
  const [state] = useAppState();
  const { ranked, removed, repeats } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    scenario: state.scenario,
    lastCrop: state.lastCrop,
  });
  const best = ranked[0];
  const link = shareLink("/options", state);

  const facts: Fact[] = [
    ...bundle.findings.map((f) => f.fact),
    ...ranked.flatMap((r) => Object.values(r.option.facts)),
  ];
  const sources = new Map<string, Fact["source"]>();
  // A figure the farmer changed came from no dataset: it is listed as the farmer's own.
  for (const f of facts) if (!f.edited) sources.set(f.source.dataset, f.source);
  const anyEdited = facts.some((f) => f.edited);
  if (!bundle.lastCrop.appDefault) sources.set(bundle.lastCrop.source.dataset, bundle.lastCrop.source);

  return (
    <div className="flex flex-col flex-1 bg-surface text-ink">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line print:hidden">
        <Link to={to("/adviser")} className="inline-flex items-center gap-1 min-h-11 font-bold">
          <BackIcon className="w-5 h-5" />
          {t("common.back")}
        </Link>
        <Button onClick={() => window.print()}>
          <PrintIcon className="w-5 h-5" />
          {t("print.button")}
        </Button>
      </div>

      <article className="px-4 py-3 text-small leading-snug print:px-0 print:py-0">
        <h1 className="text-head">{t("print.title", { field: bundle.field.name })}</h1>
        <p className="mt-1">
          {formatNumber(bundle.field.areaHa, lang)} ha · {t("app.name")}
        </p>
        <p className="mt-1">{t("print.intro")}</p>
        {bundle.field.basin ? <p className="mt-1 font-bold" data-testid="area-note">{t("basin.note")}</p> : null}

        <Block title={t("print.answers")}>
          <ul>
            <li>
              {t("q.lastCrop")}:{" "}
              <b data-testid="print-last-crop">
                {state.lastCrop === "other" ? state.lastCropName || t("q.otherPlain") : <CropName crop={state.lastCrop} />}
              </b>
            </li>
            <li>
              {t("q.limits")}: <b>{state.limits.length ? state.limits.map((l) => t(`limit.${l}`)).join(", ") : t("print.none")}</b>
            </li>
            <li>
              {t("q.priorities")}:{" "}
              <b>{state.priorities.length ? state.priorities.map((p) => t(`priority.${p}`)).join(", ") : t("print.none")}</b>
            </li>
            <li>
              {t("year.slider")}: <b>{t(`scenario.${state.scenario}`)}</b>
            </li>
          </ul>
        </Block>

        <Block title={t("print.findings")}>
          <ul>
            {bundle.findings.map((f) => (
              <li key={f.title} className="py-0.5">
                <b>{t(f.title)}</b>: <FactText fact={f.fact} /> · {f.fact.source.dataset} {f.fact.source.resolution}. {t(f.detail)}
              </li>
            ))}
          </ul>
        </Block>

        <Block title={t("print.options")}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-1 pr-2">{t("print.years")}</th>
                <th className="py-1 pr-2">{t("fact.income")}</th>
                <th className="py-1 pr-2">{t("fact.water")}</th>
                <th className="py-1 pr-2">{t("fact.nitrogen")}</th>
                <th className="py-1">{t("fact.risk")}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.option.id} className="align-top border-b border-line">
                  <td className="py-1 pr-2">
                    <b>
                      {r.rank}. <CropName crop={optionCrop(r.option)} />
                    </b>
                    {r.best ? ` · ${t("options.best")}` : ""}
                    {r.option.isCurrent ? ` · ${t("options.current")}` : ""}
                    <span className="flex gap-2 mt-0.5">
                      {r.option.sequence.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5">
                          <CropIcon crop={c} className="w-4 h-4" />
                          {r.option.firstHarvestYear + i}
                        </span>
                      ))}
                    </span>
                    {r.flags.length ? <span className="block font-bold">! {r.flags.map((f) => t(`limit.${f}`)).join(", ")}</span> : null}
                    {r.option.supportTag ? <span className="block">{t("options.supportLong")}</span> : null}
                  </td>
                  <td className="py-1 pr-2">
                    <FactText fact={r.option.facts.income} perYear />
                  </td>
                  <td className="py-1 pr-2">
                    <FactText fact={r.option.facts.water} />
                  </td>
                  <td className="py-1 pr-2">
                    <FactText fact={r.option.facts.nitrogen} />
                  </td>
                  <td className="py-1">
                    <FactText fact={r.option.facts.risk} /> · {t("confidence.label")}: {t(`confidence.${r.option.facts.income.confidence}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {removed.length ? (
            <p className="mt-1">
              {t("print.removed")}:{" "}
              {removed.map((r, i) => (
                <span key={r.option.id}>
                  {i > 0 ? "; " : ""}
                  <CropName crop={optionCrop(r.option)} /> ({r.by.map((l) => t(`limit.${l}`)).join(", ")})
                </span>
              ))}
            </p>
          ) : null}
          {repeats.length ? (
            <p className="mt-1" data-testid="print-left-out">
              {[...new Set(repeats.map((o) => o.sequence[0]))].map((crop) => (
                <span key={crop} className="block">
                  <Slotted text={t("options.repeat")} slots={{ crop: <CropName crop={crop} /> }} />
                </span>
              ))}
            </p>
          ) : null}
        </Block>

        {bundle.economics ? <MoneyUsed economics={bundle.economics} /> : null}

        {best ? (
          <Block
            title={
              <>
                {t("print.bestDetail")}: <CropName crop={optionCrop(best.option)} />
              </>
            }
          >
            <p>{t(best.option.why.suggested)}</p>
            <p className="mt-1 font-bold">{t("why.h.unknowns")}</p>
            <ul className="list-disc pl-5">
              {unknownsFor(best.option).map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
            <p className="mt-1 font-bold">{t("why.h.check")}</p>
            <ul className="list-disc pl-5">
              {best.option.why.checkLocally.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </Block>
        ) : null}

        <Block title={t("print.sources")}>
          <ul>
            {[...sources.values()].map((s) => (
              <li key={s.dataset}>
                {s.dataset} · {s.resolution}
                {s.url ? ` · ${s.url}` : ""}
              </li>
            ))}
            {anyEdited ? <li>{t("money.yoursLong")}</li> : null}
          </ul>
        </Block>

        <div className="mt-3">
          <PlaceholderNote facts={facts} />
        </div>
        <p className="mt-2">
          {t("print.link")}: <span className="font-mono break-all">{link}</span>
        </p>
      </article>
    </div>
  );
}
