// The farmer's own yields and their own figure for more durum after a legume: every number behind the income
// can be changed, to try next year's prices or a poorer harvest.
import { describe, expect, it } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import type { Economics, Fact, Option } from "../data/types";
import { validateBundle } from "../data/validate";
import { decodeState, encodeState } from "../state/url";
import { MONEY_LIMITS, incomeConfidence, incomeFact, optionMoney, resolveMoney, setMoney, yieldLift } from "./money";

const bundle = validateBundle(structuredClone(fixture));
const plain = bundle.economics!;
const lift = (value: number): Fact => ({
  value,
  unit: "%",
  scale: "area",
  confidence: "low",
  placeholder: false,
  source: { dataset: "a study", resolution: "one study", url: "" },
});
const economics: Economics = {
  ...plain,
  crops: {
    ...plain.crops,
    chickpea: { ...plain.crops.chickpea!, durumAfter: [lift(16), lift(10)] },
    faba: { ...plain.crops.faba!, durumAfter: [lift(12)] },
  },
};
const option = (id: string): Option => bundle.options.find((item) => item.id === id)!;
const durum = option("durum-durum-durum");
const chickpea = option("chickpea-durum-durum");

describe("the farmer's own yields", () => {
  it("replace the bundle's in every harvest of that crop", () => {
    // Durum: 3 t/ha at 320 €/t in the fixture. At 2 t/ha each durum harvest sells 320 less.
    const poor = optionMoney(durum, economics, { "y.durum": 2 });
    expect(poor.years.map((y) => y.sales)).toEqual([640, 640, 640]);
    expect(poor.perYear).toBe(595 - 320);
  });

  it("work together with the lift after a legume and the farmer's own price", () => {
    const y = optionMoney(chickpea, economics, { "y.durum": 2.5, "p.durum": 300 }).years[1];
    expect(y.sales).toBeCloseTo(2.5 * 1.16 * 300, 6);
  });

  it("are reported as edited and kept within limits", () => {
    const r = resolveMoney(economics, { "y.chickpea": 1.2 });
    expect(r.yields.chickpea).toEqual({ value: 1.2, default: 1.6, edited: true });
    expect(r.yields.durum).toEqual({ value: 3, default: 3, edited: false });
    expect(r.edited).toBe(true);
    expect(resolveMoney(economics, { "y.durum": MONEY_LIMITS.yield[1] + 1 }).yields.durum!.value).toBe(3);
    expect(setMoney(economics, {}, "y.durum", 50)).toEqual({});
    expect(setMoney(economics, {}, "y.durum", 2.4)).toEqual({ "y.durum": 2.4 });
    expect(setMoney(economics, { "y.durum": 2.4 }, "y.durum", 3)).toEqual({});
  });

  it("mark the income as the farmer's own, and count as fair", () => {
    expect(incomeFact(durum, economics, { "y.durum": 2 }).edited).toBe(true);
    expect(incomeFact(durum, economics, { "y.chickpea": 1 }).edited).toBeUndefined();
    // With yield, price and cost all typed for durum, nothing low is left in durum on durum.
    expect(incomeConfidence(durum, economics, { "y.durum": 2.8, "p.durum": 300, "c.durum": 600, "s.coupled-durum": 90 })).toBe("fair");
  });
});

describe("the farmer's own figure for more durum after a legume", () => {
  it("replaces the study's, harvest by harvest", () => {
    expect(resolveMoney(economics, {}).lifts.chickpea).toEqual([
      { value: 16, default: 16, edited: false },
      { value: 10, default: 10, edited: false },
    ]);
    const mine = { "l1.chickpea": 5, "l2.chickpea": 0 };
    expect(resolveMoney(economics, mine).lifts.chickpea!.map((l) => l.value)).toEqual([5, 0]);
    const years = optionMoney(chickpea, economics, mine).years;
    expect(years[1].lift).toBe(5);
    expect(years[1].sales).toBeCloseTo(960 * 1.05, 6);
    expect(years[2].lift).toBe(0);
    expect(years[2].sales).toBe(960);
    expect(yieldLift(chickpea.sequence, 1, economics, mine)).toMatchObject({ percent: 5, which: 0, edited: true });
    expect(yieldLift(chickpea.sequence, 1, economics)).toMatchObject({ percent: 16, which: 0, edited: false });
  });

  it("exists only for crops the bundle has a figure for", () => {
    expect(resolveMoney(economics, {}).lifts.durum).toBeUndefined();
    expect(resolveMoney(plain, {}).lifts).toEqual({});
    // Faba has one figure, so there is no second to set.
    expect(setMoney(economics, {}, "l2.faba", 5)).toEqual({});
    expect(setMoney(economics, {}, "l1.faba", 5)).toEqual({ "l1.faba": 5 });
    expect(setMoney(economics, {}, "l1.durum", 5)).toEqual({});
    expect(setMoney(economics, {}, "l1.chickpea", 101)).toEqual({});
    expect(setMoney(economics, { "l1.chickpea": 5 }, "l1.chickpea", 16)).toEqual({});
  });

  it("marks the income as the farmer's own only for rotations it touches", () => {
    expect(incomeFact(chickpea, economics, { "l1.chickpea": 5 }).edited).toBe(true);
    expect(incomeFact(durum, economics, { "l1.chickpea": 5 }).edited).toBeUndefined();
  });
});

describe("the link", () => {
  it("carries yields and lifts with prices, costs and support", () => {
    const money = { "y.durum": 2.5, "l1.chickpea": 5, "l2.chickpea": 0, "c.durum": 520, "p.durum": 300, "on.eco-rotation": 0 };
    expect(decodeState(encodeState({ ...decodeState(""), money })).money).toEqual(money);
  });

  it("holds every figure a farmer could change at once", () => {
    const money: Record<string, number> = {};
    for (const crop of ["durum", "chickpea", "faba", "vetch-oat", "lentil", "pea", "barley", "rapeseed", "coriander"]) {
      money[`p.${crop}`] = 100;
      money[`c.${crop}`] = 100;
      money[`y.${crop}`] = 1;
    }
    for (let i = 0; i < 12; i++) {
      money[`s.item-${i}`] = 10;
      money[`on.item-${i}`] = 1;
    }
    expect(Object.keys(decodeState(encodeState({ ...decodeState(""), money })).money)).toHaveLength(Object.keys(money).length);
  });
});
