import type { Option, Priority } from "../data/types";
import { sequencesOf } from "../data/types";

export type Reason = { priority: Priority; key: string; vars: Record<string, string | number> };

const NEAR_INCOME = 20; // €/ha a year; closer than this counts as "about the same"
const SOME_NITROGEN = 10; // kg N/ha; less than this counts as none

function num(value: number | string): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function incomeReason(option: Option, current: Option | undefined): Reason {
  const income = num(option.facts.income.value);
  const base = current ? num(current.facts.income.value) : null;
  const shown = income === null ? 0 : Math.round(income);
  if (option.isCurrent || (current && current.id === option.id)) {
    return { priority: "income", key: "reason.income.current", vars: { income: shown } };
  }
  if (!current || income === null || base === null) {
    return { priority: "income", key: "reason.income.plain", vars: { income: shown } };
  }
  const diff = Math.round(income - base);
  if (diff >= NEAR_INCOME) return { priority: "income", key: "reason.income.more", vars: { diff } };
  if (diff <= -NEAR_INCOME) return { priority: "income", key: "reason.income.less", vars: { diff: -diff } };
  return { priority: "income", key: "reason.income.same", vars: {} };
}

function soilReason(option: Option): Reason {
  const n = num(option.facts.nitrogen.value);
  if (n !== null && n >= SOME_NITROGEN) return { priority: "soil", key: "reason.soil.nitrogen", vars: { n: Math.round(n) } };
  return { priority: "soil", key: "reason.soil.none", vars: {} };
}

function waterReason(option: Option): Reason {
  const level = option.facts.water.value;
  const key = level === "low" || level === "high" ? level : "medium";
  return { priority: "water", key: `reason.water.${key}`, vars: {} };
}

function forageReason(option: Option): Reason {
  const yes = sequencesOf(option).flat().includes("vetch-oat");
  return { priority: "forage", key: yes ? "reason.forage.yes" : "reason.forage.no", vars: {} };
}

/** One short reason per chosen priority, in the order chosen, for why this rotation suits (or does not suit) it. */
export function reasonsFor(option: Option, current: Option | undefined, priorities: Priority[]): Reason[] {
  const chosen: Priority[] = priorities.length ? priorities : ["soil", "income"];
  return chosen.map((priority) => {
    switch (priority) {
      case "income":
        return incomeReason(option, current);
      case "soil":
        return soilReason(option);
      case "water":
        return waterReason(option);
      case "forage":
        return forageReason(option);
    }
  });
}
