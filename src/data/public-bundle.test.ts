// The one test that reads the real data file. Every other test uses the frozen copy in
// src/test-fixtures, so replacing the data never breaks a test that is about something else.
import { expect, it } from "vitest";
import shipped from "../../public/data/genzano-demo.json";
import { optionMoney, withMoney } from "../money/money";
import { validateBundle } from "./validate";

it("the data file the app ships passes the contract check", () => {
  expect(() => validateBundle(structuredClone(shipped))).not.toThrow();
});

it("each option's income in the shipped file is what its own prices, costs and support add up to", () => {
  const bundle = validateBundle(structuredClone(shipped));
  if (!bundle.economics) return;
  for (const option of bundle.options) {
    expect(option.facts.income.value, option.id).toBe(optionMoney(option, bundle.economics, {}).perYear);
  }
  // With nothing changed by the farmer, the screens must see the file's own figures.
  expect(withMoney(bundle, {}).options.map((o) => o.facts.income.value)).toEqual(bundle.options.map((o) => o.facts.income.value));
});
