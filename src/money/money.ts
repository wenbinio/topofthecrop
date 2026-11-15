// The sums behind the income figure: crop sales minus direct costs plus public support,
// using the bundle's figures unless the farmer changed them in Settings.
import type { Confidence, CropEconomics, CropId, Economics, ExtraSupport, Fact, FieldBundle, Money, Option, SupportItem } from "../data/types";
import { CROPS, SCENARIOS, sequencesOf } from "../data/types";

/** Bounds for anything the farmer types, so a slip of the finger cannot produce nonsense. */
export const MONEY_LIMITS = { price: [0, 5000], costs: [0, 5000], yield: [0, 20], lift: [0, 100], support: [0, 2000] } as const;

type Figure = { value: number; default: number; edited: boolean };

/** The figures in force: the bundle's, with the farmer's changes applied. */
export type ResolvedMoney = {
  prices: Partial<Record<CropId, { value: number; default: number; edited: boolean }>>; // €/t, for the crops in `economics.crops`
  costs: Partial<Record<CropId, { value: number; default: number; edited: boolean }>>; // €/ha, direct costs, same crops
  yields: Partial<Record<CropId, Figure>>; // t/ha in a usual year, same crops
  /** Percent more durum grain after the crop: [first harvest after, second in a row], for crops the bundle has figures for. */
  lifts: Partial<Record<CropId, Figure[]>>;
  support: { id: string; on: boolean; amount: number; defaultOn: boolean; defaultAmount: number; edited: boolean }[]; // €/ha
  edited: boolean; // true if anything differs from the bundle
};

/**
 * One year of one rotation on one hectare. For a strip intercrop (two crops side by side, half the field each)
 * every amount is the average of the two halves, and `beside` names the second crop.
 */
export type YearMoney = {
  crop: CropId;
  beside?: CropId;
  sales: number; // yield × price, with `lift` already counted
  /** Percent more grain because of the crop grown before (0 for none), and that crop. Only durum gets one. */
  lift: number;
  after?: CropId;
  costs: number;
  support: { id: string; amount: number }[]; // the payments that apply this year and are switched on
  margin: number; // sales − costs + support
};

export type OptionMoney = {
  years: [YearMoney, YearMoney, YearMoney];
  perYear: number; // mean margin over the three years, rounded to a whole euro
};

/** The crops the bundle has figures for, in CROPS order. */
export function economicsCrops(economics: Economics): CropId[] {
  return CROPS.filter(crop => economics.crops[crop] !== undefined);
}

/** One crop's figures. The validator makes sure every crop an option grows has them. */
export function cropFigures(economics: Economics, crop: CropId): CropEconomics {
  const figures = economics.crops[crop];
  if (!figures) throw new Error(`economics: no figures for ${crop}`);
  return figures;
}

/** A crop's price in force (the farmer's, or the bundle's). */
function priceOf(resolved: ResolvedMoney, economics: Economics, crop: CropId): { value: number; default: number; edited: boolean } {
  const fallback = Number(cropFigures(economics, crop).price.value);
  return resolved.prices[crop] ?? { value: fallback, default: fallback, edited: false };
}

/** A crop's direct costs in force (the farmer's, or the bundle's). */
function costsOf(resolved: ResolvedMoney, economics: Economics, crop: CropId): { value: number; default: number; edited: boolean } {
  const fallback = Number(cropFigures(economics, crop).costs.value);
  return resolved.costs[crop] ?? { value: fallback, default: fallback, edited: false };
}

/**
 * The yield lift for harvest `index` of a rotation: durum gives more grain after some crops (`durumAfter` in
 * the bundle). The harvest straight after takes the first figure; a second durum in a row takes the second.
 * Nothing is counted for what grew before the rotation starts.
 */
export function yieldLift(sequence: CropId[], index: number, economics: Economics, money: Money = {}):
  { percent: number; after: CropId; which: 0 | 1; edited: boolean; fact: Fact } | null {
  if (sequence[index] !== "durum" || index === 0) return null;
  const pick = (after: CropId, which: 0 | 1) => {
    const fact = economics.crops[after]?.durumAfter?.[which];
    if (!fact) return null;
    const override = money[`l${which + 1}.${after}`];
    const percent = within(override, MONEY_LIMITS.lift) ? override : Number(fact.value);
    return { percent, after, which, edited: percent !== Number(fact.value), fact };
  };
  const before = sequence[index - 1];
  const first = pick(before, 0);
  if (first) return first;
  return index >= 2 && before === "durum" ? pick(sequence[index - 2], 1) : null;
}

/** A crop's usual yield in force (the farmer's, or the bundle's). */
function yieldOf(resolved: ResolvedMoney, economics: Economics, crop: CropId): Figure {
  const fallback = Number(cropFigures(economics, crop).yield.value);
  return resolved.yields[crop] ?? { value: fallback, default: fallback, edited: false };
}

/** Applies `money` to the bundle's economics. Unknown keys and out-of-range numbers are ignored. */
export function resolveMoney(economics: Economics, money: Money): ResolvedMoney {
  const crops = economicsCrops(economics);
  const prices = Object.fromEntries(crops.map(crop => {
    const fallback = Number(cropFigures(economics, crop).price.value);
    const override = money[`p.${crop}`];
    const value = within(override, MONEY_LIMITS.price) ? override : fallback;
    return [crop, { value, default: fallback, edited: value !== fallback }];
  })) as ResolvedMoney['prices'];
  const costs = Object.fromEntries(crops.map(crop => {
    const fallback = Number(cropFigures(economics, crop).costs.value);
    const override = money[`c.${crop}`];
    const value = within(override, MONEY_LIMITS.costs) ? override : fallback;
    return [crop, { value, default: fallback, edited: value !== fallback }];
  })) as ResolvedMoney['costs'];
  const yields = Object.fromEntries(crops.map(crop => {
    const fallback = Number(cropFigures(economics, crop).yield.value);
    const override = money[`y.${crop}`];
    const value = within(override, MONEY_LIMITS.yield) ? override : fallback;
    return [crop, { value, default: fallback, edited: value !== fallback }];
  })) as ResolvedMoney['yields'];
  const lifts = Object.fromEntries(crops.filter(crop => cropFigures(economics, crop).durumAfter?.length).map(crop => [crop,
    cropFigures(economics, crop).durumAfter!.map((fact, which) => {
      const fallback = Number(fact.value);
      const override = money[`l${which + 1}.${crop}`];
      const value = within(override, MONEY_LIMITS.lift) ? override : fallback;
      return { value, default: fallback, edited: value !== fallback };
    })])) as ResolvedMoney['lifts'];
  const support = economics.support.map(item => {
    const defaultAmount = Number(item.amount.value);
    const override = money[`s.${item.id}`];
    const amount = within(override, MONEY_LIMITS.support) ? override : defaultAmount;
    const toggle = money[`on.${item.id}`];
    const on = toggle === 1 ? true : toggle === 0 ? false : item.defaultOn;
    return { id: item.id, on, amount, defaultOn: item.defaultOn, defaultAmount,
      edited: amount !== defaultAmount || on !== item.defaultOn };
  });
  return { prices, costs, yields, lifts, support,
    edited: crops.some(crop => prices[crop]?.edited || costs[crop]?.edited || yields[crop]?.edited || lifts[crop]?.some(l => l.edited))
      || support.some(item => item.edited) };
}

function within(value: number, bounds: readonly [number, number]): boolean {
  return Number.isFinite(value) && value >= bounds[0] && value <= bounds[1];
}

function applies(item: SupportItem, option: Option, crop: CropId): boolean {
  return (!item.options.length || item.options.includes(option.id)) && (!item.crops.length || item.crops.includes(crop));
}

/** A payment the farmer added applies to every option, in the years whose crop it lists (or every year when it lists none). */
function extraApplies(extra: ExtraSupport, crop: CropId): boolean {
  return !extra.crops.length || extra.crops.includes(crop);
}

/**
 * A support item applies to a year of an option when its `options` and `crops` lists both allow it (an empty list allows all).
 * Payments the farmer added (`extras`) are always on and are listed after the bundle's, as `x0`, `x1`, ….
 */
export function optionMoney(option: Option, economics: Economics, money: Money, extras: ExtraSupport[] = []): OptionMoney {
  const resolved = resolveMoney(economics, money);
  const grown = sequencesOf(option).map(sequence => sequence.map((crop, index): YearMoney => {
    const lifted = yieldLift(sequence, index, economics, money);
    const lift = lifted ? lifted.percent : 0;
    const sales = yieldOf(resolved, economics, crop).value * (1 + lift / 100) * priceOf(resolved, economics, crop).value;
    const costs = costsOf(resolved, economics, crop).value;
    const support = resolved.support.filter((item, i) => item.on && applies(economics.support[i], option, crop))
      .map(item => ({ id: item.id, amount: item.amount }));
    extras.forEach((extra, i) => {
      if (extraApplies(extra, crop)) support.push({ id: `x${i}`, amount: extra.amount });
    });
    return { crop, sales, lift, ...(lifted ? { after: lifted.after } : {}), costs, support,
      margin: sales - costs + support.reduce((sum, item) => sum + item.amount, 0) };
  }));
  const years = grown[0].map((year, index) => (grown.length === 1 ? year : sideBySide(grown.map(strip => strip[index])))) as OptionMoney['years'];
  return { years, perYear: Math.round(years.reduce((sum, year) => sum + year.margin, 0) / years.length) };
}

/**
 * One year of a strip intercrop from the year of each strip: every strip is an equal share of the field, so sales,
 * costs and each payment are averaged. A payment only one strip gets (coupled durum support) counts for its share.
 * The lift is the one the durum strip has after its legume; it is already inside that strip's sales.
 */
function sideBySide(strips: YearMoney[]): YearMoney {
  const share = 1 / strips.length;
  const mean = (pick: (year: YearMoney) => number) => strips.reduce((sum, year) => sum + pick(year), 0) * share;
  const support = new Map<string, number>();
  for (const year of strips) for (const item of year.support) support.set(item.id, (support.get(item.id) ?? 0) + item.amount * share);
  const lifted = strips.find(year => year.lift > 0);
  return {
    // The same crop on both halves is one crop on the whole field that year: nothing stands beside it.
    crop: strips[0].crop, ...(strips[1].crop !== strips[0].crop ? { beside: strips[1].crop } : {}),
    sales: mean(year => year.sales), lift: lifted?.lift ?? 0,
    ...(lifted?.after ? { after: lifted.after } : {}), costs: mean(year => year.costs),
    support: [...support].map(([id, amount]) => ({ id, amount })), margin: mean(year => year.margin),
  };
}

const CONFIDENCE_RANK: Record<Confidence, number> = { good: 3, fair: 2, low: 1 };

/** The weakest of a list of confidences (`good` > `fair` > `low`); `good` for an empty list. */
export function weakestConfidence(list: Confidence[]): Confidence {
  return list.reduce<Confidence>((a, b) => (CONFIDENCE_RANK[b] < CONFIDENCE_RANK[a] ? b : a), "good");
}

/**
 * How sure the income figure is: the weakest confidence among the yield, price and cost facts of the option's
 * three crops and the amount facts of the support that applies and is switched on (leaving out payments made
 * on every rotation alike, which cannot change the comparison). A figure the farmer typed
 * (a price, a cost, a yield, a yield lift, a support amount, an added payment) counts as `fair`.
 * A yield lift from the bundle counts with its own confidence.
 */
export function incomeConfidence(option: Option, economics: Economics, money: Money, extras: ExtraSupport[] = []): Confidence {
  const resolved = resolveMoney(economics, money);
  const list: Confidence[] = [];
  sequencesOf(option).forEach(sequence => sequence.forEach((crop, index) => {
    const figures = cropFigures(economics, crop);
    list.push(yieldOf(resolved, economics, crop).edited ? "fair" : figures.yield.confidence,
      costsOf(resolved, economics, crop).edited ? "fair" : figures.costs.confidence,
      priceOf(resolved, economics, crop).edited ? "fair" : figures.price.confidence);
    const lifted = yieldLift(sequence, index, economics, money);
    if (lifted) list.push(lifted.edited ? "fair" : lifted.fact.confidence);
    resolved.support.forEach((item, i) => {
      const spec = economics.support[i];
      if (!item.on || !applies(spec, option, crop)) return;
      // A payment made on every rotation in every year (basic income support) adds the same to all of them,
      // so however unsure its amount is, it does not make one option's figure less sure than another's.
      if (spec.crops.length === 0 && spec.options.length === 0) return;
      list.push(item.amount !== item.defaultAmount ? "fair" : economics.support[i].amount.confidence);
    });
    // Likewise an added payment for every year is the same for every rotation; one for chosen crops is not.
    if (extras.some(extra => extra.crops.length > 0 && extraApplies(extra, crop))) list.push("fair");
  }));
  return weakestConfidence(list);
}

/** The income fact to show for an option: €/ha per year from `optionMoney`, its confidence from `incomeConfidence`. */
export function incomeFact(option: Option, economics: Economics, money: Money, extras: ExtraSupport[] = []): Fact {
  const resolved = resolveMoney(economics, money);
  const edited = sequencesOf(option).some(sequence => sequence.some((crop, index) => priceOf(resolved, economics, crop).edited || costsOf(resolved, economics, crop).edited
    || yieldOf(resolved, economics, crop).edited || yieldLift(sequence, index, economics, money)?.edited === true
    || resolved.support.some((item, i) =>
    item.edited && (item.on || item.defaultOn) && applies(economics.support[i], option, crop))
    || extras.some(extra => extra.amount !== 0 && extraApplies(extra, crop))));
  const result: Fact = { ...option.facts.income, value: optionMoney(option, economics, money, extras).perYear,
    unit: '€/ha', scale: 'area', label: 'fact.income', confidence: incomeConfidence(option, economics, money, extras) };
  delete result.edited;
  if (edited) {
    result.edited = true;
    delete result.range;
    result.source = { dataset: 'Your own figures', resolution: 'this farm', url: '' };
    result.placeholder = sequencesOf(option).flat().some(crop => cropFigures(economics, crop).yield.placeholder || cropFigures(economics, crop).costs.placeholder);
  }
  return result;
}

/**
 * The bundle as the screens should see it: each option's `facts.income` replaced by `incomeFact`,
 * and its income scores scaled by how far the farmer's figures (and added payments) moved its income.
 * Returns the same bundle untouched when it has no `economics`.
 */
export function withMoney(bundle: FieldBundle, money: Money, extras: ExtraSupport[] = []): FieldBundle {
  const economics = bundle.economics;
  if (!economics) return bundle;
  return { ...bundle, options: bundle.options.map(option => {
    const income = incomeFact(option, economics, money, extras);
    const baseline = optionMoney(option, economics, {}).perYear;
    const ratio = baseline > 0 ? Math.max(0, Math.min(2, Number(income.value) / baseline)) : 1;
    const scores = { ...option.scores };
    for (const scenario of SCENARIOS) {
      scores[scenario] = { ...option.scores[scenario],
        income: baseline > 0 ? Math.max(0, Math.min(1, option.scores[scenario].income * ratio)) : option.scores[scenario].income };
    }
    return { ...option, facts: { ...option.facts, income }, scores };
  }) };
}

/** `money` with one key set, or removed when the value equals the bundle's default. */
export function setMoney(economics: Economics, money: Money, key: string, value: number): Money {
  const result = { ...money };
  let fallback: number;
  const crop = economicsCrops(economics).find(crop => key === `p.${crop}`);
  const costCrop = economicsCrops(economics).find(crop => key === `c.${crop}`);
  const yieldCrop = economicsCrops(economics).find(crop => key === `y.${crop}`);
  const lift = /^l([12])\.(.+)$/.exec(key);
  const liftFact = lift ? economics.crops[lift[2] as CropId]?.durumAfter?.[Number(lift[1]) - 1] : undefined;
  if (crop) {
    if (!within(value, MONEY_LIMITS.price)) return result;
    fallback = Number(cropFigures(economics, crop).price.value);
  } else if (costCrop) {
    if (!within(value, MONEY_LIMITS.costs)) return result;
    fallback = Number(cropFigures(economics, costCrop).costs.value);
  } else if (yieldCrop) {
    if (!within(value, MONEY_LIMITS.yield)) return result;
    fallback = Number(cropFigures(economics, yieldCrop).yield.value);
  } else if (liftFact) {
    if (!within(value, MONEY_LIMITS.lift)) return result;
    fallback = Number(liftFact.value);
  } else {
    const item = economics.support.find(item => key === `s.${item.id}` || key === `on.${item.id}`);
    if (!item) return result;
    if (key.startsWith('on.')) {
      if (value !== 0 && value !== 1) return result;
      fallback = item.defaultOn ? 1 : 0;
    } else {
      if (!within(value, MONEY_LIMITS.support)) return result;
      fallback = Number(item.amount.value);
    }
  }
  if (value === fallback) delete result[key];
  else result[key] = value;
  return result;
}
