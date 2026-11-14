// The one test that reads the real data file. Every other test uses the frozen copy in
// src/test-fixtures, so replacing the data never breaks a test that is about something else.
import { expect, it } from "vitest";
import shipped from "../../public/data/genzano-demo.json";
import { incomeConfidence, optionMoney, withMoney } from "../money/money";
import { CROPS } from "./types";
import { OPTION_COUNT, validateBundle } from "./validate";

it("the data file the app ships passes the contract check", () => {
  expect(() => validateBundle(structuredClone(shipped))).not.toThrow();
});

it("ships the nine rotations over the nine crops, one of them current", () => {
  const bundle = validateBundle(structuredClone(shipped));
  expect(bundle.options.length).toBeGreaterThanOrEqual(OPTION_COUNT[0]);
  expect(bundle.options.length).toBeLessThanOrEqual(OPTION_COUNT[1]);
  expect(bundle.options.map((o) => o.id)).toEqual([
    "chickpea-durum-durum", "faba-durum-faba", "vetch-oat-durum-durum", "durum-durum-durum", "lentil-durum-durum",
    "pea-durum-durum", "barley-durum-durum", "rapeseed-durum-durum", "coriander-durum-durum",
  ]);
  expect(bundle.options.filter((o) => o.isCurrent).map((o) => o.id)).toEqual(["durum-durum-durum"]);
  expect(Object.keys(bundle.economics!.crops).sort()).toEqual([...CROPS].sort());
});

it("each option's income in the shipped file is what its own prices, costs and support add up to", () => {
  const bundle = validateBundle(structuredClone(shipped));
  if (!bundle.economics) return;
  for (const option of bundle.options) {
    expect(option.facts.income.value, option.id).toBe(optionMoney(option, bundle.economics, {}).perYear);
    expect(option.facts.income.confidence, option.id).toBe(incomeConfidence(option, bundle.economics, {}));
  }
  // With nothing changed by the farmer, the screens must see the file's own figures.
  expect(withMoney(bundle, {}).options.map((o) => o.facts.income.value)).toEqual(bundle.options.map((o) => o.facts.income.value));
});
