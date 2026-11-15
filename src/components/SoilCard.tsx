import { useState } from "react";
import type { FieldBundle, View } from "../data/types";
import { soilSummary } from "../data/soil";
import { useLang, useT } from "../i18n";
import { ScaleBadge, SourceButton, formatNumber, rangeText, unitText, valueText } from "./FactParts";
import { BareSoilIcon, ChevronIcon } from "./Icons";
import { SectionTitle } from "./ui";

/**
 * "Your soil": what kind of ground the soil map says the field has, in a farmer's word first and the technical
 * class second, so nobody has to look it up. It says plainly that it is an estimate and that the ranking does
 * not use it. Hidden when the bundle has no soil figures.
 */
export function SoilCard({ bundle, view, bare = false }: { bundle: FieldBundle; view: View; bare?: boolean }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const soil = soilSummary(bundle);
  if (!soil) return null;
  const simple = view === "simple";
  return (
    <section data-testid="soil-card" data-texture={soil.texture}>
      {bare ? null : (
        <SectionTitle>
          <span className="flex items-center justify-between">
            {t("soil.title")}
            <ScaleBadge scale={soil.scale} />
          </span>
        </SectionTitle>
      )}
      <div className={`px-4 pb-3 bg-surface ${bare ? "" : "border-y border-line"}`}>
        <div className="flex items-start gap-2 pt-3">
          <BareSoilIcon className="w-6 h-6 flex-none mt-0.5" />
          <div className="min-w-0">
            <p className="text-big font-bold" data-testid="soil-kind">
              {t(`soil.weight.${soil.weight}`)} <span className="text-body font-normal text-ink-soft">({t(`soil.texture.${soil.texture}`)})</span>
            </p>
            <p className="text-body">{t(`soil.weight.${soil.weight}.means`)}</p>
          </div>
        </div>
        {soil.band && soil.ph ? (
          <div className="mt-2 pl-8" data-testid="soil-ph">
            <p className="text-body">
              <span className="font-bold">{t(`soil.ph.${soil.band}`)}</span> · pH {valueText(soil.ph, t, lang)}
              {soil.measuredPh ? ` · ${t("soil.measured")} ${valueText(soil.measuredPh, t, lang)}` : ""}
            </p>
            {simple ? null : <p className="text-body">{t(`soil.ph.${soil.band}.means`)}</p>}
          </div>
        ) : null}
        <p className="mt-2 pl-8 text-small text-ink-soft" data-testid="soil-honest">
          {t("soil.estimate")} {t("soil.notRanked")}
        </p>
        <button
          type="button"
          aria-expanded={open}
          data-testid="soil-figures"
          onClick={() => setOpen((o) => !o)}
          className="tc-tap mt-1 ml-8 flex items-center gap-2 font-bold text-body text-left"
        >
          {open ? t("soil.fewer") : t("soil.figures")}
          <ChevronIcon className={`tc-turn w-5 h-5 flex-none text-ink-soft ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
        {open ? (
          <ul className="tc-reveal pl-8" data-testid="soil-list">
            {soil.figures.map((fact) => {
              const range = rangeText(fact, lang);
              return (
                <li key={fact.label ?? fact.source.dataset} className="flex items-baseline justify-between gap-3 py-1.5 border-t border-line">
                  <span className="text-body min-w-0">{t(fact.label ?? "")}</span>
                  <span className="flex-none text-right">
                    <span className="font-bold">
                      {valueText(fact, t, lang)} {unitText(fact.unit, t)}
                    </span>
                    {range ? <span className="text-small text-ink-soft"> ({range})</span> : null} <SourceButton fact={fact} align="end" />
                  </span>
                </li>
              );
            })}
            {soil.measuredPh ? (
              <li className="flex items-baseline justify-between gap-3 py-1.5 border-t border-line" data-testid="soil-measured">
                <span className="text-body min-w-0">
                  {t(soil.measuredPh.label ?? "data.ph")}, {t("soil.measured").replace(/:$/, "")}
                </span>
                <span className="flex-none text-right">
                  <span className="font-bold">{formatNumber(Number(soil.measuredPh.value), lang)}</span> <SourceButton fact={soil.measuredPh} align="end" />
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
