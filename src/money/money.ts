// The sums behind the income figure: crop sales minus direct costs plus public support,
// using the bundle's figures unless the farmer changed them in Settings.
import type { CropId, Economics, Fact, FieldBundle, Money, Option } from "../data/types";

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
export function resolveMoney(_economics: Economics, _money: Money): ResolvedMoney {
  throw new Error("not implemented");
}

/** A support item applies to a year of an option when its `options` and `crops` lists both allow it (an empty list allows all). */
export function optionMoney(_option: Option, _economics: Economics, _money: Money): OptionMoney {
  throw new Error("not implemented");
}

/** The income fact to show for an option: €/ha per year from `optionMoney`. */
export function incomeFact(_option: Option, _economics: Economics, _money: Money): Fact {
  throw new Error("not implemented");
}

/**
 * The bundle as the screens should see it: each option's `facts.income` replaced by `incomeFact`,
 * and its income scores scaled by how far the farmer's figures moved its income.
 * Returns the same bundle untouched when it has no `economics`.
 */
export function withMoney(_bundle: FieldBundle, _money: Money): FieldBundle {
  throw new Error("not implemented");
}

/** `money` with one key set, or removed when the value equals the bundle's default. */
export function setMoney(_economics: Economics, _money: Money, _key: string, _value: number): Money {
  throw new Error("not implemented");
}
