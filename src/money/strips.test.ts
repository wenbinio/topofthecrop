// Strip intercrops: two crops side by side, half the field each, swapped every year. Every figure is the plain
// average of the two sequences, so nothing new is assumed.
import { describe, expect, it } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import type { CropId, Option } from "../data/types";
import { sequencesOf } from "../data/types";
import { validateBundle } from "../data/validate";
import { rankOptions } from "../ranking/rank";
import { decodeState, encodeState } from "../state/url";
import { incomeConfidence, incomeFact, optionMoney, withMoney } from "./money";

const bundle = validateBundle(structuredClone(fixture));
const economics = bundle.economics!;
const base = bundle.options.find((item) => item.id === "chickpea-durum-durum")!;
const made = (id: string, sequence: [CropId, CropId, CropId], strips?: [CropId, CropId, CropId]): Option => ({
  ...structuredClone(base), id, sequence, ...(strips ? { strips } : {}),
});
/** The two halves of the field as rotations of their own, and the two together as strips. */
const legumeFirst = made("half-a", ["chickpea", "durum", "chickpea"]);
const durumFirst = made("half-b", ["durum", "chickpea", "durum"]);
const strips = made("strips-chickpea-durum", ["chickpea", "durum", "chickpea"], ["durum", "chickpea", "durum"]);

describe("the money of a strip intercrop", () => {
  it("is the average of its two halves, year by year", () => {
    const a = optionMoney(legumeFirst, economics, {}).years;
    const b = optionMoney(durumFirst, economics, {}).years;
    const both = optionMoney(strips, economics, {});
    both.years.forEach((year, i) => {
      expect(year.sales).toBeCloseTo((a[i].sales + b[i].sales) / 2, 6);
      expect(year.costs).toBeCloseTo((a[i].costs + b[i].costs) / 2, 6);
      expect(year.margin).toBeCloseTo((a[i].margin + b[i].margin) / 2, 6);
    });
    expect(both.perYear).toBe(Math.round([...a, ...b].reduce((sum, year) => sum + year.margin, 0) / 6));
  });

  it("names both crops of each year", () => {
    const years = optionMoney(strips, economics, {}).years;
    expect(years.map((y) => [y.crop, y.beside])).toEqual([["chickpea", "durum"], ["durum", "chickpea"], ["chickpea", "durum"]]);
    expect(optionMoney(legumeFirst, economics, {}).years[0].beside).toBeUndefined();
  });

  it("counts a payment only one crop gets for half the field", () => {
    const amount = (id: string) => Number(economics.support.find((item) => item.id === id)!.amount.value);
    for (const year of optionMoney(strips, economics, {}).years) {
      const got = (id: string) => year.support.find((item) => item.id === id)?.amount;
      expect(got("coupled-durum")).toBeCloseTo(amount("coupled-durum") / 2, 6);
      expect(got("coupled-legumes")).toBeCloseTo(amount("coupled-legumes") / 2, 6);
      // A payment made on every hectare whatever grows there is counted in full.
      expect(got("basic-income")).toBeCloseTo(amount("basic-income"), 6);
    }
  });

  it("follows the farmer's own figures for either crop", () => {
    const usual = optionMoney(strips, economics, {}).perYear;
    // 100 €/ha less cost on durum: durum is half the field every year.
    const durumCosts = Number(economics.crops.durum!.costs.value);
    expect(optionMoney(strips, economics, { "c.durum": durumCosts - 100 }).perYear).toBe(usual + 50);
    expect(incomeFact(strips, economics, { "c.durum": durumCosts - 100 }).edited).toBe(true);
    expect(incomeFact(strips, economics, { "c.faba": 1 }).edited).toBeUndefined();
  });

  it("is as sure as the weakest figure of either crop", () => {
    expect(incomeConfidence(strips, economics, {})).toBe(incomeConfidence(legumeFirst, economics, {}));
    expect(sequencesOf(strips)).toHaveLength(2);
    expect(sequencesOf(legumeFirst)).toHaveLength(1);
  });

  it("keeps its income when nothing is changed, and moves its income score when something is", () => {
    const withStrips = { ...bundle, options: [...bundle.options, { ...strips, facts: { ...strips.facts, income: incomeFact(strips, economics, {}) } }] };
    const same = withMoney(withStrips, {}).options.at(-1)!;
    expect(same.facts.income.value).toBe(optionMoney(strips, economics, {}).perYear);
    const dearer = withMoney(withStrips, { "p.chickpea": Number(economics.crops.chickpea!.price.value) * 1.5 }).options.at(-1)!;
    expect(dearer.scores.normal.income).toBeGreaterThan(same.scores.normal.income);
  });
});

describe("strip intercrops in the ranking", () => {
  const options = [...bundle.options, strips];
  const input = { options, limits: [], priorities: ["income" as const, "water" as const], scenario: "normal" as const };

  it("are set aside until the farmer asks to see them", () => {
    const quiet = rankOptions(input);
    expect(quiet.ranked.map((row) => row.option.id)).not.toContain(strips.id);
    expect(quiet.intercrops.map((option) => option.id)).toEqual([strips.id]);
    const asked = rankOptions({ ...input, intercrops: true });
    expect(asked.ranked.map((row) => row.option.id)).toContain(strips.id);
    expect(asked.intercrops).toEqual([]);
    expect(asked.ranked).toHaveLength(quiet.ranked.length + 1);
  });

  it("are left out when either strip would repeat the legume just grown", () => {
    const result = rankOptions({ ...input, intercrops: true, lastCrop: "chickpea" });
    expect(result.repeats.map((option) => option.id)).toContain(strips.id);
    expect(rankOptions({ ...input, intercrops: true, lastCrop: "durum" }).repeats).toEqual([]);
  });
});

describe("the bundle and the link", () => {
  it("a strip sequence must be three known crops", () => {
    const ok = structuredClone(fixture) as { options: Record<string, unknown>[] };
    ok.options[0].strips = ["durum", "chickpea", "durum"];
    expect(() => validateBundle(ok)).not.toThrow();
    const short = structuredClone(ok);
    short.options[0].strips = ["durum", "chickpea"];
    expect(() => validateBundle(short)).toThrow();
    const unknown = structuredClone(ok);
    unknown.options[0].strips = ["durum", "maize", "durum"];
    expect(() => validateBundle(unknown)).toThrow();
  });

  it("the link remembers that strip intercrops are shown", () => {
    const state = { ...decodeState(""), intercrops: true };
    expect(decodeState("").intercrops).toBe(false);
    expect(new URLSearchParams(encodeState(state)).get("i")).toBe("1");
    expect(decodeState(encodeState(state)).intercrops).toBe(true);
    expect(decodeState("i=yes").intercrops).toBe(false);
  });
});

describe("intercropping in some years only", () => {
  // Strips in years 1 and 3, durum alone on the whole field in year 2.
  const some = made("strips-some-years", ["chickpea", "durum", "durum"], ["durum", "durum", "chickpea"]);

  it("a year with the same crop on both halves is an ordinary year", () => {
    const years = optionMoney(some, economics, {}).years;
    expect(years.map((y) => [y.crop, y.beside])).toEqual([["chickpea", "durum"], ["durum", undefined], ["durum", "chickpea"]]);
    // Year 2 is durum everywhere: full coupled durum support, and its costs are durum's own.
    const coupled = Number(economics.support.find((item) => item.id === "coupled-durum")!.amount.value);
    expect(years[1].support.find((item) => item.id === "coupled-durum")?.amount).toBeCloseTo(coupled, 6);
    expect(years[1].costs).toBeCloseTo(Number(economics.crops.durum!.costs.value), 6);
  });

  it("is still the average of its two halves", () => {
    const a = optionMoney(made("a", ["chickpea", "durum", "durum"]), economics, {}).years;
    const b = optionMoney(made("b", ["durum", "durum", "chickpea"]), economics, {}).years;
    optionMoney(some, economics, {}).years.forEach((year, i) => expect(year.margin).toBeCloseTo((a[i].margin + b[i].margin) / 2, 6));
  });
});
