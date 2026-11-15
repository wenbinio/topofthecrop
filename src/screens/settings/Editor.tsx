// The body of Settings for a field with money figures: the fold-out sections (prices, costs, yields, the extra
// durum after a legume, support payments, the farmer's own payments), Reset and the adviser line.
// Every change goes straight into the link. Written with AI assistance (Claude, Anthropic).
import { useState } from "react";
import type { CropId, Economics, ExtraSupport, Fact } from "../../data/types";
import { useLang, useT } from "../../i18n";
import { MONEY_LIMITS, cropFigures, economicsCrops, resolveMoney, setMoney } from "../../money/money";
import { useAppState } from "../../state/useAppState";
import { DatasetLabel, PlaceholderNote, ScaleBadge } from "../../components/FactParts";
import { Button } from "../../components/ui";
import { CropFigureRow } from "./CropFigureRow";
import type { CropFigure } from "./CropFigureRow";
import { Extras } from "./Extras";
import { MoneyInput } from "./MoneyInput";
import { Section } from "./Section";
import type { SectionId } from "./Section";
import { SupportRow } from "./SupportRow";

/** Where a section's default figures come from: the scale and the dataset, as on every other figure. */
function FactLine({ fact }: { fact: Fact | undefined }) {
  if (!fact) return null;
  return (
    <p className="px-4 pt-2 pb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <ScaleBadge scale={fact.scale} />
      <DatasetLabel fact={fact} />
    </p>
  );
}

export function Editor({ economics }: { economics: Economics }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useAppState();
  const resolved = resolveMoney(economics, state.money);
  const crops = economicsCrops(economics);
  const commit = (key: string, value: number) => setState({ money: setMoney(economics, state.money, key, value) });
  const extras = state.extras;
  const setExtra = (index: number, extra: ExtraSupport | null) =>
    setState({ extras: extra ? extras.map((e, i) => (i === index ? extra : e)) : extras.filter((_, i) => i !== index) });

  const figure = (key: "price" | "costs" | "yield", crop: CropId): CropFigure => {
    const fallback = Number(cropFigures(economics, crop)[key].value);
    const r = (key === "price" ? resolved.prices : key === "costs" ? resolved.costs : resolved.yields)[crop];
    return r ?? { value: fallback, default: fallback, edited: false };
  };
  // More durum after a legume: one row per figure the bundle has (first harvest after, second in a row).
  const liftRows = crops.flatMap((crop) => (resolved.lifts[crop] ?? []).map((f, which) => ({ crop, which, figure: f })));
  const yieldsChanged = crops.filter((c) => figure("yield", c).edited).length;
  const liftsChanged = liftRows.filter((row) => row.figure.edited).length;
  const pricesChanged = crops.filter((c) => figure("price", c).edited).length;
  const costsChanged = crops.filter((c) => figure("costs", c).edited).length;
  const supportChanged = resolved.support.filter((s) => s.edited).length;
  const supportOn = economics.support.filter((item) => resolved.support.find((s) => s.id === item.id)?.on ?? item.defaultOn).length;

  // A section holding the farmer's own figures starts open, so they see them without hunting; the rest start closed.
  const [open, setOpen] = useState<Record<SectionId, boolean>>(() => ({
    prices: pricesChanged > 0,
    costs: costsChanged > 0,
    yields: yieldsChanged > 0,
    lift: liftsChanged > 0,
    support: supportChanged > 0,
    own: extras.length > 0,
  }));
  const toggle = (id: SectionId) => setOpen((now) => ({ ...now, [id]: !now[id] }));

  const count = (n: number, one: string, many: string) => (n === 1 ? t(one) : t(many, { n }));
  const withChanged = (text: string, changed: number) =>
    changed ? `${text} · ${count(changed, "settings.sumChangedOne", "settings.sumChanged")}` : text;
  const cropCount = count(crops.length, "settings.sumCropsOne", "settings.sumCrops");

  const first = crops.length ? cropFigures(economics, crops[0]) : undefined;
  const shownDefaults: Fact[] = [
    ...crops.flatMap((c) => {
      const figures = cropFigures(economics, c);
      return [figures.price, figures.yield, figures.costs];
    }),
    ...economics.support.map((s) => s.amount),
  ];

  return (
    <>
      <div className="mt-2 border-t border-line">
        <Section
          id="prices"
          title={t("settings.prices")}
          unit="€/t"
          summary={withChanged(cropCount, pricesChanged)}
          open={open.prices}
          onToggle={() => toggle("prices")}
        >
          <FactLine fact={first?.price} />
          <ul className="border-t border-line bg-surface" data-testid="price-list">
            {crops.map((crop) => (
              <CropFigureRow
                key={crop}
                crop={crop}
                figure={figure("price", crop)}
                limits={MONEY_LIMITS.price}
                label={t("settings.priceOf", { crop: t(`crop.${crop}`) })}
                testId="price-row"
                onCommit={(v) => commit(`p.${crop}`, v)}
              />
            ))}
          </ul>
        </Section>

        <Section
          id="costs"
          title={t("settings.costs")}
          unit="€/ha"
          summary={withChanged(cropCount, costsChanged)}
          open={open.costs}
          onToggle={() => toggle("costs")}
        >
          <p className="px-4 pt-2 text-body" data-testid="costs-means">
            <span className="font-bold">{t("money.costs")}:</span> {t("money.costsMeans")}
          </p>
          <FactLine fact={first?.costs} />
          <ul className="border-t border-line bg-surface" data-testid="cost-list">
            {crops.map((crop) => (
              <CropFigureRow
                key={crop}
                crop={crop}
                figure={figure("costs", crop)}
                limits={MONEY_LIMITS.costs}
                label={t("settings.costOf", { crop: t(`crop.${crop}`) })}
                testId="cost-row"
                onCommit={(v) => commit(`c.${crop}`, v)}
              />
            ))}
          </ul>
        </Section>

        <Section
          id="yields"
          title={t("settings.yields")}
          unit="t/ha"
          summary={withChanged(cropCount, yieldsChanged)}
          open={open.yields}
          onToggle={() => toggle("yields")}
        >
          <p className="px-4 pt-2 text-body" data-testid="yields-means">
            {t("settings.yieldsMeans")}
          </p>
          <FactLine fact={first?.yield} />
          <ul className="border-t border-line bg-surface" data-testid="yield-list">
            {crops.map((crop) => (
              <CropFigureRow
                key={crop}
                crop={crop}
                figure={figure("yield", crop)}
                limits={MONEY_LIMITS.yield}
                label={t("settings.yieldOf", { crop: t(`crop.${crop}`) })}
                testId="yield-row"
                onCommit={(v) => commit(`y.${crop}`, v)}
              />
            ))}
          </ul>
        </Section>

        {liftRows.length ? (
          <Section
            id="lift"
            title={t("settings.lift")}
            unit="%"
            summary={withChanged(count(liftRows.length, "settings.sumFiguresOne", "settings.sumFigures"), liftsChanged)}
            open={open.lift}
            onToggle={() => toggle("lift")}
          >
            <p className="px-4 pt-2 text-body" data-testid="lift-means">
              {t("settings.liftMeans")}
            </p>
            <ul className="mt-2 border-t border-line bg-surface" data-testid="lift-list">
              {liftRows.map((row) => {
                const which = t(row.which === 0 ? "settings.liftFirst" : "settings.liftSecond");
                return (
                  <CropFigureRow
                    key={`${row.crop}.${row.which}`}
                    crop={row.crop}
                    sub={which}
                    figure={row.figure}
                    limits={MONEY_LIMITS.lift}
                    label={t("settings.liftOf", { crop: t(`crop.${row.crop}`), which })}
                    testId="lift-row"
                    onCommit={(v) => commit(`l${row.which + 1}.${row.crop}`, v)}
                  />
                );
              })}
            </ul>
          </Section>
        ) : null}

        <Section
          id="support"
          title={t("settings.secSupport")}
          unit="€/ha"
          summary={withChanged(count(supportOn, "settings.sumOnOne", "settings.sumOn"), supportChanged)}
          open={open.support}
          onToggle={() => toggle("support")}
        >
          <FactLine fact={economics.support[0]?.amount} />
          <ul className="border-t border-line bg-surface" data-testid="support-list">
            {economics.support.map((item) => {
              const r = resolved.support.find((s) => s.id === item.id);
              const on = r ? r.on : item.defaultOn;
              const amount = r ? r.amount : (item.amount.value as number);
              const name = item.name[lang];
              return (
                <SupportRow key={item.id} id={item.id} name={name} condition={item.condition[lang]} level={t(`level.${item.level}`)} edited={r?.edited ?? false}
                  on={on}
                  onToggle={(next) => commit(`on.${item.id}`, next ? 1 : 0)}
                >
                  <MoneyInput
                    value={amount}
                    limits={MONEY_LIMITS.support}
                    label={t("settings.amountOf", { name })}
                    disabled={!on}
                    onCommit={(v) => commit(`s.${item.id}`, v)}
                  />
                </SupportRow>
              );
            })}
          </ul>
        </Section>

        <Section
          id="own"
          title={t("settings.secOwn")}
          unit="€/ha"
          summary={extras.length ? count(extras.length, "settings.sumAddedOne", "settings.sumAdded") : t("settings.sumNone")}
          open={open.own}
          onToggle={() => toggle("own")}
        >
          <Extras crops={crops} extras={extras} onChange={setExtra} onAdd={(extra) => setState({ extras: [...extras, extra] })} />
        </Section>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3 items-stretch">
        <Button
          look="secondary"
          disabled={!resolved.edited && !extras.length}
          onClick={() => setState({ money: {}, extras: [] })}
        >
          {t("settings.reset")}
        </Button>
        <p className="text-body font-bold" data-testid="adviser-line">
          {t("settings.adviser")}
        </p>
        <PlaceholderNote facts={shownDefaults} />
      </div>
    </>
  );
}
