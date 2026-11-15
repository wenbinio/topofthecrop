import { useId, useState } from "react";
import { useAppState } from "../state/useAppState";
import { validPh } from "../state/url";
import type { FieldBundle, View } from "../data/types";
import { soilSummary } from "../data/soil";
import { useLang, useT } from "../i18n";
import { ScaleBadge, SourceButton, YoursTag, formatNumber, rangeText, unitText, valueText } from "./FactParts";
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
  const [state, setState] = useAppState();
  const [editing, setEditing] = useState(false);
  const [phText, setPhText] = useState(state.soilPh !== null ? String(state.soilPh) : "");
  const phId = useId();
  const soil = soilSummary(bundle, { weight: state.soilWeight, ph: state.soilPh });
  if (!soil) return null;
  const mine = soil.own.weight || soil.own.ph;
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
              {t(`soil.weight.${soil.weight}`)}{" "}
              {soil.own.weight ? <YoursTag /> : <span className="text-body font-normal text-ink-soft">({t(`soil.texture.${soil.texture}`)})</span>}
            </p>
            <p className="text-body">{t(`soil.weight.${soil.weight}.means`)}</p>
          </div>
        </div>
        {soil.band && (soil.ph || soil.own.ph) ? (
          <div className="mt-2 pl-8" data-testid="soil-ph">
            <p className="text-body">
              <span className="font-bold">{t(`soil.ph.${soil.band}`)}</span>
              {soil.own.ph && soil.ownPh !== undefined ? (
                <>
                  {" "}· {t("soil.phYours", { ph: formatNumber(soil.ownPh, lang) })} <YoursTag />
                </>
              ) : soil.ph ? (
                <>
                  {" "}· pH {valueText(soil.ph, t, lang)}
                  {soil.measuredPh ? ` · ${t("soil.measured")} ${valueText(soil.measuredPh, t, lang)}` : ""}
                </>
              ) : null}
            </p>
            {simple ? null : <p className="text-body">{t(`soil.ph.${soil.band}.means`)}</p>}
          </div>
        ) : null}
        <p className="mt-2 pl-8 text-small text-ink-soft" data-testid="soil-honest">
          {soil.own.weight ? t("soil.yours", { map: t(`soil.weight.${soil.mapWeight}`).toLocaleLowerCase(lang) }) : t("soil.estimate")} {t("soil.notRanked")}
        </p>
        {/* The farmer knows their ground better than a map: they can say so, and undo it. */}
        {editing ? (
          <div className="mt-2 ml-8 p-3 rounded-box bg-sunk flex flex-col gap-2" data-testid="soil-editor">
            <p className="font-bold text-body">{t("soil.editHead")}</p>
            <div role="radiogroup" aria-label={t("soil.editHead")} className="grid grid-cols-3 gap-2">
              {(["heavy", "medium", "light"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={soil.weight === w}
                  data-testid={`soil-pick-${w}`}
                  onClick={() => setState({ soilWeight: w === soil.mapWeight ? null : w })}
                  className={`tc-tap min-h-11 px-1 rounded-box border-2 font-bold text-small ${soil.weight === w ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"}`}
                >
                  {t(`soil.weight.${w}`)}
                </button>
              ))}
            </div>
            <label htmlFor={phId} className="text-body">
              {t("soil.phLabel")}
            </label>
            <input
              id={phId}
              type="number"
              inputMode="decimal"
              step="0.1"
              min={3}
              max={10}
              value={phText}
              data-testid="soil-ph-input"
              onChange={(e) => {
                setPhText(e.target.value);
                const ph = Number(e.target.value.replace(",", "."));
                setState({ soilPh: e.target.value.trim() !== "" && validPh(ph) ? Math.round(ph * 10) / 10 : null });
              }}
              className="tc-tap w-28 px-3 rounded-box border-2 border-line-strong bg-surface text-big"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" data-testid="soil-done" onClick={() => setEditing(false)} className="tc-tap min-h-11 px-4 rounded-box bg-primary text-on-primary font-bold text-body">
                {t("soil.done")}
              </button>
              {mine ? (
                <button
                  type="button"
                  data-testid="soil-reset"
                  onClick={() => {
                    setPhText("");
                    setState({ soilWeight: null, soilPh: null });
                  }}
                  className="min-h-11 underline underline-offset-4 text-body"
                >
                  {t("soil.reset")}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button type="button" data-testid="soil-edit" onClick={() => setEditing(true)} className="tc-tap mt-1 ml-8 min-h-11 font-bold text-body underline underline-offset-4">
            {t("soil.edit")}
          </button>
        )}
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
