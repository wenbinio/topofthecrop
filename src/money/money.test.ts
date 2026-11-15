import { describe, expect, it } from 'vitest';
import fixture from '../test-fixtures/money-bundle.json';
import type { Economics, FieldBundle, Money, Option } from '../data/types';
import { CROPS, DEFAULT_STATE, SCENARIOS } from '../data/types';
import { validateBundle } from '../data/validate';
import { rankOptions } from '../ranking/rank';
import { incomeConfidence, incomeFact, optionMoney, resolveMoney, setMoney, weakLinks, withMoney } from './money';

const bundle = validateBundle(fixture);
const economics = bundle.economics!;
const option = (id: string): Option => bundle.options.find(item => item.id === id)!;
const durum = option('durum-durum-durum');
const chickpea = option('chickpea-durum-durum');

it('calculates default annual incomes and applicable support', () => {
  expect(['durum-durum-durum', 'chickpea-durum-durum', 'faba-durum-faba', 'vetch-oat-durum-durum']
    .map(id => optionMoney(option(id), economics, {}).perYear)).toEqual([595, 753, 652, 653]);
  const first = optionMoney(chickpea, economics, {}).years[0];
  expect(first.sales).toBe(1040);
  expect(first.costs).toBe(520);
  expect(first.support.map(item => item.id)).toEqual(['basic-income', 'coupled-legumes', 'eco-rotation']);
  for (const year of optionMoney(durum, economics, {}).years) {
    expect(year.support.map(item => item.id)).not.toContain('eco-rotation');
  }
});

it('preserves the entire fixture and its income metadata at defaults', () => {
  const result = withMoney(bundle, {});
  expect(result).toEqual(bundle);
  result.options.forEach((item, i) => {
    expect(item.facts.income.value).toBe(bundle.options[i].facts.income.value);
    expect(item.facts.income).not.toHaveProperty('edited');
  });
});

it('uses the farmer price and labels the resulting income honestly', () => {
  const money = { 'p.durum': 400 };
  expect(optionMoney(durum, economics, money).perYear).toBe(835);
  expect(optionMoney(chickpea, economics, money).perYear).toBe(913);
  const fact = incomeFact(durum, economics, money);
  expect(fact).toMatchObject({ value: 835, unit: '€/ha', scale: 'area', label: 'fact.income',
    // The typed price counts as fair, but the fixture's yields and costs are low, and the weakest decides.
    edited: true, confidence: 'low', placeholder: true,
    source: { dataset: 'Your own figures', resolution: 'this farm', url: '' } });
  expect(fact).not.toHaveProperty('range');
});

it('switches off rotation support only for options that use it', () => {
  const money = { 'on.eco-rotation': 0 };
  expect(optionMoney(chickpea, economics, money).perYear).toBe(643);
  expect(optionMoney(chickpea, economics, {}).perYear - optionMoney(chickpea, economics, money).perYear).toBe(110);
  expect(incomeFact(chickpea, economics, money).edited).toBe(true);
  expect(optionMoney(durum, economics, money).perYear).toBe(595);
  expect(incomeFact(durum, economics, money)).not.toHaveProperty('edited');
});

it('keeps negative margins when prices are zero and every payment is off', () => {
  const money: Money = Object.fromEntries([
    ...CROPS.map(crop => [`p.${crop}`, 0]),
    ...economics.support.map(item => [`on.${item.id}`, 0]),
  ]);
  for (const item of bundle.options) {
    const result = optionMoney(item, economics, money);
    expect(result.perYear).toBeLessThan(0);
    expect(result.perYear).toBe(Math.round(-result.years.reduce((sum, year) => sum + year.costs, 0) / 3));
    result.years.forEach(year => expect(year).toMatchObject({ sales: 0, support: [], margin: -year.costs }));
  }
});

it('scales only income scores in every scenario without mutating the fixture', () => {
  const before = structuredClone(bundle);
  const result = withMoney(bundle, { 'p.durum': 400 });
  const changed = result.options.find(item => item.id === durum.id)!;
  expect(changed.scores.normal.income).toBeCloseTo(Math.min(1, 0.55 * 835 / 595));
  for (const scenario of SCENARIOS) {
    expect(changed.scores[scenario]).toEqual({ ...durum.scores[scenario],
      income: Math.min(1, durum.scores[scenario].income * (835 / 595)) });
  }
  expect(bundle).toEqual(before);
});

it('bounds the income ratio at two and scores between zero and one', () => {
  const high = withMoney(bundle, { 'p.durum': 5000 });
  const changed = high.options.find(item => item.id === durum.id)!;
  expect(changed.scores.normal.income).toBe(1);
  expect(changed.scores.drier.income).toBe(0.8);
  const low = withMoney(bundle, { 'p.durum': 0, 'on.basic-income': 0, 'on.coupled-durum': 0 });
  expect(low.options.find(item => item.id === durum.id)!.scores.normal.income).toBe(0);
});

it.each([0, -1])('leaves scores alone when default income is %s', income => {
  const copy = structuredClone(bundle);
  copy.economics!.support = [];
  copy.economics!.crops.durum!.costs.value = 960 - income;
  expect(withMoney(copy, { 'p.durum': 400 }).options.find(item => item.id === durum.id)!.scores).toEqual(durum.scores);
});

it('keeps the ranking for soil and water when the durum price changes', () => {
  const order = (options: Option[]) => rankOptions({ options, limits: [], priorities: ['soil', 'water'], scenario: 'normal' })
    .ranked.map(item => item.option.id);
  expect(order(withMoney(bundle, { 'p.durum': 1000 }).options)).toEqual(order(bundle.options));
});

it('ignores unknown, invalid and nonfinite overrides', () => {
  const defaults = resolveMoney(economics, {});
  expect(defaults.edited).toBe(false);
  expect(Object.values(defaults.prices).every(price => !price.edited)).toBe(true);
  expect(defaults.support.every(item => !item.edited)).toBe(true);
  expect(resolveMoney(economics, { 'p.maize': 9, 'p.durum': -5, 's.basic-income': 99999,
    'on.eco-rotation': 7, x: 1 })).toEqual(defaults);
  expect(resolveMoney(economics, { 'p.durum': NaN, 'p.faba': Infinity, 's.basic-income': -Infinity })).toEqual(defaults);
  expect(resolveMoney(economics, { 'p.durum': 320, 's.basic-income': 160, 'on.eco-rotation': 1 })).toEqual(defaults);
});

it('resolves changed support amounts and applies their crop restrictions', () => {
  const money = { 's.coupled-legumes': 100 };
  expect(resolveMoney(economics, money).support.find(item => item.id === 'coupled-legumes'))
    .toMatchObject({ amount: 100, defaultAmount: 60, on: true, defaultOn: true, edited: true });
  expect(resolveMoney(economics, money).edited).toBe(true);
  expect(optionMoney(chickpea, economics, money).perYear).toBe(767);
  expect(incomeFact(durum, economics, money)).toEqual(durum.facts.income);
});

it('only keeps the edited placeholder flag for yields or costs used by the option', () => {
  const copy: Economics = structuredClone(economics);
  copy.crops.durum!.yield.placeholder = false;
  copy.crops.durum!.costs.placeholder = false;
  expect(incomeFact(durum, copy, { 'p.durum': 400 }).placeholder).toBe(false);
  copy.crops.durum!.costs.placeholder = true;
  expect(incomeFact(durum, copy, { 'p.durum': 400 }).placeholder).toBe(true);
  expect(incomeFact(durum, economics, { 'p.chickpea': 700 })).toEqual(durum.facts.income);
});

it('does not mark income edited for an amount whose payment remains off', () => {
  const copy = structuredClone(economics);
  copy.support.find(item => item.id === 'basic-income')!.defaultOn = false;
  expect(incomeFact(durum, copy, { 's.basic-income': 200 })).not.toHaveProperty('edited');
  expect(incomeFact(durum, copy, { 'on.basic-income': 1 }).edited).toBe(true);
});

it('returns the same bundle when economics is absent', () => {
  const copy = structuredClone(bundle);
  delete copy.economics;
  expect(withMoney(copy, { 'p.durum': 400 })).toBe(copy);
});

it('sets and removes price overrides without mutating the input', () => {
  const money = { 's.basic-income': 200 };
  const changed = setMoney(economics, money, 'p.durum', 350);
  expect(changed).toEqual({ ...money, 'p.durum': 350 });
  expect(changed).not.toBe(money);
  expect(money).toEqual({ 's.basic-income': 200 });
  expect(setMoney(economics, changed, 'p.durum', 320)).toEqual(money);
  for (const value of [-1, NaN, Infinity, 5001]) {
    expect(setMoney(economics, changed, 'p.durum', value)).toEqual(changed);
  }
});

it('sets support amounts and switches, removes defaults and ignores unknown keys', () => {
  expect(setMoney(economics, {}, 's.basic-income', 2000)).toEqual({ 's.basic-income': 2000 });
  expect(setMoney(economics, {}, 'p.durum', 5000)).toEqual({ 'p.durum': 5000 });
  expect(setMoney(economics, { 's.basic-income': 200 }, 's.basic-income', 160)).toEqual({});
  expect(setMoney(economics, {}, 'on.eco-rotation', 0)).toEqual({ 'on.eco-rotation': 0 });
  expect(setMoney(economics, { 'on.eco-rotation': 0 }, 'on.eco-rotation', 1)).toEqual({});
  for (const [key, value] of Object.entries({ 's.basic-income': 2001, 'on.eco-rotation': 2, 'p.maize': 9, 's.unknown': 2, x: 1 })) {
    expect(setMoney(economics, {}, key, value)).toEqual({});
  }
});

it('adds an every-year payment of 50 to every option', () => {
  const extras = [{ name: 'Regional aid', amount: 50, crops: [] }];
  for (const item of bundle.options) {
    const result = optionMoney(item, economics, {}, extras);
    expect(result.perYear).toBe(optionMoney(item, economics, {}).perYear + 50);
    result.years.forEach(year => expect(year.support.at(-1)).toEqual({ id: 'x0', amount: 50 }));
    expect(incomeFact(item, economics, {}, extras).edited).toBe(true);
  }
});

it('pays a chickpea-only payment in chickpea years only', () => {
  const extras = [{ name: 'New legume aid', amount: 90, crops: ['chickpea' as const] }];
  expect(optionMoney(chickpea, economics, {}, extras).perYear).toBe(753 + 30);
  expect(optionMoney(chickpea, economics, {}, extras).years.map(year => year.support.some(item => item.id === 'x0')))
    .toEqual([true, false, false]);
  expect(optionMoney(durum, economics, {}, extras).perYear).toBe(595);
  expect(incomeFact(durum, economics, {}, extras)).not.toHaveProperty('edited');
  const priced = withMoney(bundle, {}, extras);
  expect(priced.options.find(item => item.id === chickpea.id)!.facts.income).toMatchObject({ value: 783, edited: true });
  expect(priced.options.find(item => item.id === durum.id)!.facts.income).toEqual(durum.facts.income);
});

it('changes nothing with no added payments', () => {
  expect(withMoney(bundle, {}, [])).toEqual(withMoney(bundle, {}));
  expect(withMoney(bundle, {}, [])).toEqual(bundle);
});

/** A copy of the fixture in which every price, yield, cost and support amount is marked good. */
function allGood(): Economics {
  const copy = structuredClone(economics);
  for (const figures of Object.values(copy.crops)) {
    for (const key of ['yield', 'price', 'costs'] as const) figures![key].confidence = 'good';
  }
  for (const item of copy.support) item.amount.confidence = 'good';
  return copy;
}

it('income confidence is the weakest of the figures it is built from', () => {
  expect(incomeConfidence(chickpea, economics, {})).toBe('low');
  const good = allGood();
  expect(incomeConfidence(chickpea, good, {})).toBe('good');
  expect(incomeFact(durum, good, {}).confidence).toBe('good');
  // One weak cost in chickpea years weakens chickpea, not durum on durum.
  good.crops.chickpea!.costs.confidence = 'low';
  expect(incomeConfidence(chickpea, good, {})).toBe('low');
  expect(incomeConfidence(durum, good, {})).toBe('good');
});

it('only support that applies and is switched on counts towards confidence', () => {
  const good = allGood();
  good.support.find(item => item.id === 'eco-rotation')!.amount.confidence = 'low';
  expect(incomeConfidence(chickpea, good, {})).toBe('low');
  expect(incomeConfidence(durum, good, {})).toBe('good');
  expect(incomeConfidence(chickpea, good, { 'on.eco-rotation': 0 })).toBe('good');
});

it('a figure the farmer typed counts as fair', () => {
  const good = allGood();
  expect(incomeConfidence(durum, good, { 'p.durum': 400 })).toBe('fair');
  expect(incomeFact(durum, good, { 'p.durum': 400 })).toMatchObject({ confidence: 'fair', edited: true });
  expect(incomeConfidence(durum, good, { 's.coupled-durum': 120 })).toBe('fair');
  expect(incomeConfidence(durum, good, {}, [{ name: 'Aid', amount: 10, crops: ['durum'] }])).toBe('fair');
  // Payments made on every rotation alike cannot change the comparison, so they do not count, typed or not.
  expect(incomeConfidence(durum, good, { 's.basic-income': 200 })).toBe('good');
  expect(incomeConfidence(durum, good, {}, [{ name: 'Aid', amount: 10, crops: [] }])).toBe('good');
  // A payment for chickpea years only leaves durum on durum as it was.
  expect(incomeConfidence(durum, good, {}, [{ name: 'Aid', amount: 10, crops: ['chickpea'] }])).toBe('good');
  // A typed price on a low figure lifts nothing: the weakest still decides.
  good.support.find(item => item.id === 'basic-income')!.amount.confidence = 'low';
  expect(incomeConfidence(durum, good, {})).toBe('good');
  good.support.find(item => item.id === 'coupled-durum')!.amount.confidence = 'low';
  expect(incomeConfidence(durum, good, {})).toBe('low');
  expect(incomeConfidence(durum, good, { 's.coupled-durum': 120 })).toBe('fair');
});

describe("weakLinks", () => {
  it("names the unsure figures behind chickpea then durum, crediting the extra durum to chickpea", async () => {
    const shipped = (await import("../../public/data/genzano-demo.json")).default as unknown as FieldBundle;
    const option = shipped.options.find((o) => o.id === "chickpea-durum-durum")!;
    const weak = weakLinks(option, shipped.economics!, DEFAULT_STATE.money);
    expect(weak).toContainEqual({ crop: "chickpea", kind: "yield" });
    expect(weak).toContainEqual({ crop: "chickpea", kind: "lift" });
    // Checked figures are not named: chickpea's price (southern exchange lists) and every durum figure.
    expect(weak).not.toContainEqual({ crop: "chickpea", kind: "price" });
    expect(weak.some((w) => w.crop === "durum")).toBe(false);
    const durum = shipped.options.find((o) => o.id === "durum-durum-durum")!;
    expect(weakLinks(durum, shipped.economics!, DEFAULT_STATE.money)).toEqual([]);
  });
});
