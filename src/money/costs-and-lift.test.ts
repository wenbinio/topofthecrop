// The farmer's own costs, and the extra durum grain after a legume.
import { describe, expect, it } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import type { Economics, Fact, Option } from "../data/types";
import { validateBundle } from "../data/validate";
import { decodeState, encodeState } from "../state/url";
import { MONEY_LIMITS, incomeConfidence, incomeFact, optionMoney, resolveMoney, setMoney, yieldLift } from "./money";

const bundle = validateBundle(structuredClone(fixture));
const economics = bundle.economics!;
const option = (id: string): Option => bundle.options.find((item) => item.id === id)!;
const durum = option("durum-durum-durum");
const chickpea = option("chickpea-durum-durum");
const faba = option("faba-durum-faba");

describe("the farmer's own costs", () => {
  it("replace the bundle's in the sum, for every harvest of that crop", () => {
    // Durum costs 620 in the fixture; at 520 each of three durum harvests gains 100.
    expect(optionMoney(durum, economics, {}).perYear).toBe(595);
    const mine = optionMoney(durum, economics, { "c.durum": 520 });
    expect(mine.years.map((y) => y.costs)).toEqual([520, 520, 520]);
    expect(mine.perYear).toBe(695);
    // Two of chickpea-durum-durum's three harvests are durum.
    expect(optionMoney(chickpea, economics, { "c.durum": 520 }).perYear).toBe(753 + 67);
  });

  it("are reported as edited, with the bundle's figure kept beside them", () => {
    const r = resolveMoney(economics, { "c.chickpea": 400 });
    expect(r.costs.chickpea).toEqual({ value: 400, default: 520, edited: true });
    expect(r.costs.durum).toEqual({ value: 620, default: 620, edited: false });
    expect(r.edited).toBe(true);
    expect(resolveMoney(economics, {}).edited).toBe(false);
  });

  it("ignore a figure outside the limits", () => {
    expect(resolveMoney(economics, { "c.durum": MONEY_LIMITS.costs[1] + 1 }).costs.durum!.value).toBe(620);
    expect(resolveMoney(economics, { "c.durum": -5 }).costs.durum!.value).toBe(620);
    expect(setMoney(economics, {}, "c.durum", 99999)).toEqual({});
  });

  it("are stored only when they differ from the bundle's", () => {
    expect(setMoney(economics, {}, "c.durum", 500)).toEqual({ "c.durum": 500 });
    expect(setMoney(economics, { "c.durum": 500 }, "c.durum", 620)).toEqual({});
    expect(setMoney(economics, {}, "c.sunflower", 500)).toEqual({});
  });

  it("mark the income as the farmer's own and count as fair, not low", () => {
    const fact = incomeFact(durum, economics, { "c.durum": 520 });
    expect(fact.edited).toBe(true);
    expect(fact.source.dataset).toBe("Your own figures");
    // A rotation that does not grow the crop is untouched.
    expect(incomeFact(durum, economics, { "c.chickpea": 400 }).edited).toBeUndefined();
    // Every figure in the fixture is low; typing both the price and the cost of durum does not lift the yield's.
    expect(incomeConfidence(durum, economics, { "c.durum": 520, "p.durum": 300 })).toBe("low");
  });

  it("travel in the link", () => {
    const state = { ...decodeState(""), money: { "c.durum": 520, "p.durum": 300 } };
    expect(decodeState(encodeState(state)).money).toEqual({ "c.durum": 520, "p.durum": 300 });
  });
});

describe("more durum after a legume", () => {
  const lift = (value: number): Fact => ({
    value,
    unit: "%",
    scale: "area",
    confidence: "low",
    placeholder: false,
    source: { dataset: "a study", resolution: "one study", url: "" },
  });
  // Chickpea: 16% for the next durum, 10% for a second durum in a row. Faba: 12% for the next only.
  const lifted: Economics = {
    ...economics,
    crops: {
      ...economics.crops,
      chickpea: { ...economics.crops.chickpea!, durumAfter: [lift(16), lift(10)] },
      faba: { ...economics.crops.faba!, durumAfter: [lift(12)] },
    },
  };

  it("gives the first durum the first figure and a second durum in a row the second", () => {
    expect(yieldLift(chickpea.sequence, 0, lifted)).toBeNull();
    expect(yieldLift(chickpea.sequence, 1, lifted)).toMatchObject({ percent: 16, after: "chickpea" });
    expect(yieldLift(chickpea.sequence, 2, lifted)).toMatchObject({ percent: 10, after: "chickpea" });
  });

  it("gives nothing where the bundle has no figure, or to a crop that is not durum", () => {
    expect(yieldLift(durum.sequence, 1, lifted)).toBeNull();
    // faba → durum → faba: the durum gets 12%; the faba after it gets nothing.
    expect(yieldLift(faba.sequence, 1, lifted)).toMatchObject({ percent: 12, after: "faba" });
    expect(yieldLift(faba.sequence, 2, lifted)).toBeNull();
    // Faba has no second figure, so a second durum after faba would get nothing.
    expect(yieldLift(["faba", "durum", "durum"], 2, lifted)).toBeNull();
    // Nothing is counted for what grew before the rotation starts.
    expect(yieldLift(durum.sequence, 0, lifted)).toBeNull();
    // Without any figures in the bundle, nothing changes.
    expect(yieldLift(chickpea.sequence, 1, economics)).toBeNull();
  });

  it("raises that harvest's sales, and so the rotation's income", () => {
    const plain = optionMoney(chickpea, economics, {});
    const more = optionMoney(chickpea, lifted, {});
    // Durum sells for 3 t × 320 = 960 in the fixture.
    expect(plain.years.map((y) => y.sales)).toEqual([1040, 960, 960]);
    expect(more.years[1]).toMatchObject({ lift: 16, after: "chickpea" });
    expect(more.years[1].sales).toBeCloseTo(960 * 1.16, 6);
    expect(more.years[2].sales).toBeCloseTo(960 * 1.1, 6);
    expect(more.years[0].lift).toBe(0);
    // 153.6 and 96 more over the three harvests, on top of the unrounded total.
    const sum = (o: Option) => optionMoney(o, economics, {}).years.reduce((s, y) => s + y.margin, 0);
    expect(more.perYear).toBe(Math.round((sum(chickpea) + 960 * 0.16 + 960 * 0.1) / 3));
    expect(more.perYear).toBe(837);
    // Durum on durum gets none.
    expect(optionMoney(durum, lifted, {}).perYear).toBe(595);
    expect(optionMoney(faba, lifted, {}).perYear).toBe(Math.round((sum(faba) + 960 * 0.12) / 3));
  });

  it("works on the farmer's own price", () => {
    const more = optionMoney(chickpea, lifted, { "p.durum": 300 });
    expect(more.years[1].sales).toBeCloseTo(3 * 1.16 * 300, 6);
  });

  it("is accepted by the validator, which refuses a list that is empty or too long", () => {
    const withLift = structuredClone(fixture) as unknown as { economics: Economics };
    withLift.economics.crops.chickpea!.durumAfter = [lift(16), lift(10)];
    expect(() => validateBundle(withLift)).not.toThrow();
    withLift.economics.crops.chickpea!.durumAfter = [];
    expect(() => validateBundle(withLift)).toThrow(/durumAfter/);
    withLift.economics.crops.chickpea!.durumAfter = [lift(1), lift(2), lift(3)];
    expect(() => validateBundle(withLift)).toThrow(/durumAfter/);
  });
});
