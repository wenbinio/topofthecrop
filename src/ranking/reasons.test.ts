import { describe, expect, it } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import type { FieldBundle, Option } from "../data/types";
import { reasonsFor } from "./reasons";

const options = (fixture as unknown as FieldBundle).options;
const byId = (id: string): Option => options.find((o) => o.id === id)!;
const current = options.find((o) => o.isCurrent)!;
const chickpea = byId("chickpea-durum-durum");
const vetch = byId("vetch-oat-durum-durum");
const durum = byId("durum-durum-durum");

describe("reasonsFor", () => {
  it("chickpea for soil then income: nitrogen, then the gain over the current rotation", () => {
    const diff = Math.round((chickpea.facts.income.value as number) - (current.facts.income.value as number));
    expect(diff).toBeGreaterThanOrEqual(20);
    expect(reasonsFor(chickpea, current, ["soil", "income"])).toEqual([
      { priority: "soil", key: "reason.soil.nitrogen", vars: { n: 40 } },
      { priority: "income", key: "reason.income.more", vars: { diff } },
    ]);
  });

  it("the current rotation states its own income", () => {
    expect(reasonsFor(current, current, ["income"])).toEqual([
      { priority: "income", key: "reason.income.current", vars: { income: current.facts.income.value } },
    ]);
  });

  it("forage: yes with vetch-oat, no with durum", () => {
    expect(reasonsFor(vetch, current, ["forage"]).map((r) => r.key)).toEqual(["reason.forage.yes"]);
    expect(reasonsFor(durum, current, ["forage"]).map((r) => r.key)).toEqual(["reason.forage.no"]);
  });

  it("durum after durum adds no nitrogen", () => {
    expect(reasonsFor(durum, current, ["soil"]).map((r) => r.key)).toEqual(["reason.soil.none"]);
  });

  it("no priorities gives soil then income", () => {
    expect(reasonsFor(chickpea, current, []).map((r) => r.priority)).toEqual(["soil", "income"]);
  });

  it("follows the order chosen", () => {
    expect(reasonsFor(chickpea, current, ["water", "forage"]).map((r) => r.key)).toEqual(["reason.water.low", "reason.forage.no"]);
    expect(reasonsFor(chickpea, current, ["income", "soil"]).map((r) => r.priority)).toEqual(["income", "soil"]);
  });

  it("income is less, the same, or plain without a current rotation", () => {
    const poorer: Option = { ...chickpea, facts: { ...chickpea.facts, income: { ...chickpea.facts.income, value: 500 } } };
    const level: Option = { ...chickpea, facts: { ...chickpea.facts, income: { ...chickpea.facts.income, value: 605 } } };
    const base = current.facts.income.value as number;
    expect(reasonsFor(poorer, current, ["income"])[0]).toEqual({ priority: "income", key: "reason.income.less", vars: { diff: base - 500 } });
    expect(reasonsFor(level, current, ["income"])[0].key).toBe("reason.income.same");
    expect(reasonsFor(chickpea, undefined, ["income"])[0]).toEqual({ priority: "income", key: "reason.income.plain", vars: { income: 753 } });
  });
});
