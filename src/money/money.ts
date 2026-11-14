// The sums behind the income figure: crop sales minus direct costs plus public support,
// using the bundle's figures unless the farmer changed them in Settings.
import type { CropId, Economics, Fact, FieldBundle, Money, Option, SupportItem } from "../data/types";
import { CROPS, SCENARIOS } from "../data/types";

/** Bounds for anything the farmer types, so a slip of the finger cannot produce nonsense. */
export const MONEY_LIMITS = { price: [0, 5000], support: [0, 2000] } as const;

/** The figures in force: the bundle's, with the farmer's changes applied. */
export type ResolvedMoney = {
  prices: Record<CropId, { value: number; default: number; edited: boolean }>; // €/t
  support: { id: string; on: boolean; amount: number; defaultOn: boolean; defaultAmount: number; edited: boolean }[]; // €/ha
  edited: boolean; // true if anything differs from the bundle
};

/** One year of one rotation on one hectare. */
export type YearMoney = {
  crop: CropId;
  sales: number; // yield × price
  costs: number;
  support: { id: string; amount: number }[]; // the payments that apply this year and are switched on
  margin: number; // sales − costs + support
};

export type OptionMoney = {
  years: [YearMoney, YearMoney, YearMoney];
  perYear: number; // mean margin over the three years, rounded to a whole euro
};

/** Applies `money` to the bundle's economics. Unknown keys and out-of-range numbers are ignored. */
export function resolveMoney(economics: Economics, money: Money): ResolvedMoney {
  const prices = Object.fromEntries(CROPS.map(crop => {
    const fallback = Number(economics.crops[crop].price.value);
    const override = money[`p.${crop}`];
    const value = within(override, MONEY_LIMITS.price) ? override : fallback;
    return [crop, { value, default: fallback, edited: value !== fallback }];
  })) as ResolvedMoney['prices'];
  const support = economics.support.map(item => {
    const defaultAmount = Number(item.amount.value);
    const override = money[`s.${item.id}`];
    const amount = within(override, MONEY_LIMITS.support) ? override : defaultAmount;
    const toggle = money[`on.${item.id}`];
    const on = toggle === 1 ? true : toggle === 0 ? false : item.defaultOn;
    return { id: item.id, on, amount, defaultOn: item.defaultOn, defaultAmount,
      edited: amount !== defaultAmount || on !== item.defaultOn };
  });
  return { prices, support, edited: CROPS.some(crop => prices[crop].edited) || support.some(item => item.edited) };
}

function within(value: number, bounds: readonly [number, number]): boolean {
  return Number.isFinite(value) && value >= bounds[0] && value <= bounds[1];
}

function applies(item: SupportItem, option: Option, crop: CropId): boolean {
  return (!item.options.length || item.options.includes(option.id)) && (!item.crops.length || item.crops.includes(crop));
}

/** A support item applies to a year of an option when its `options` and `crops` lists both allow it (an empty list allows all). */
export function optionMoney(option: Option, economics: Economics, money: Money): OptionMoney {
  const resolved = resolveMoney(economics, money);
  const years = option.sequence.map(crop => {
    const sales = Number(economics.crops[crop].yield.value) * resolved.prices[crop].value;
    const costs = Number(economics.crops[crop].costs.value);
    const support = resolved.support.filter((item, i) => item.on && applies(economics.support[i], option, crop))
      .map(item => ({ id: item.id, amount: item.amount }));
    return { crop, sales, costs, support, margin: sales - costs + support.reduce((sum, item) => sum + item.amount, 0) };
  }) as OptionMoney['years'];
  return { years, perYear: Math.round(years.reduce((sum, year) => sum + year.margin, 0) / years.length) };
}

/** The income fact to show for an option: €/ha per year from `optionMoney`. */
export function incomeFact(option: Option, economics: Economics, money: Money): Fact {
  const resolved = resolveMoney(economics, money);
  const edited = option.sequence.some(crop => resolved.prices[crop].edited || resolved.support.some((item, i) =>
    item.edited && (item.on || item.defaultOn) && applies(economics.support[i], option, crop)));
  const result: Fact = { ...option.facts.income, value: optionMoney(option, economics, money).perYear,
    unit: '€/ha', scale: 'area', label: 'fact.income' };
  delete result.edited;
  if (edited) {
    result.edited = true;
    delete result.range;
    result.source = { dataset: 'Your own figures', resolution: 'this farm', url: '' };
    result.confidence = 'fair';
    result.placeholder = option.sequence.some(crop => economics.crops[crop].yield.placeholder || economics.crops[crop].costs.placeholder);
  }
  return result;
}

/**
 * The bundle as the screens should see it: each option's `facts.income` replaced by `incomeFact`,
 * and its income scores scaled by how far the farmer's figures moved its income.
 * Returns the same bundle untouched when it has no `economics`.
 */
export function withMoney(bundle: FieldBundle, money: Money): FieldBundle {
  const economics = bundle.economics;
  if (!economics) return bundle;
  return { ...bundle, options: bundle.options.map(option => {
    const income = incomeFact(option, economics, money);
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
  const crop = CROPS.find(crop => key === `p.${crop}`);
  if (crop) {
    if (!within(value, MONEY_LIMITS.price)) return result;
    fallback = Number(economics.crops[crop].price.value);
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
