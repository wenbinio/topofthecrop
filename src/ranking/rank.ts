import type { Limit, Option, Priority, Scenario } from "../data/types";
import { LIMITS, PRIORITIES } from "../data/types";

export type RankInput = {
  options: Option[];
  limits: Limit[];
  priorities: Priority[]; // zero to two
  scenario: Scenario;
};

export type RankedOption = {
  option: Option;
  rank: number; // 1 is first
  best: boolean; // true for rank 1 only
  flags: Limit[]; // chosen limits that add a warning to this option
};

export type RankResult = {
  ranked: RankedOption[];
  removed: { option: Option; by: Limit[] }[];
};

/**
 * README "How options are ranked", stages 3 to 5: filter by limits, then order by priorities.
 * The score never leaves this module.
 */
export function rankOptions(input: RankInput): RankResult {
  const { options, limits, priorities, scenario } = input;
  const selected = priorities.length ? priorities : PRIORITIES;
  const others = PRIORITIES.filter(priority => !selected.includes(priority));
  const mean = (option: Option, keys: readonly Priority[]) => keys.length
    ? keys.reduce((sum, key) => sum + option.scores[scenario][key], 0) / keys.length : 0;
  const removed: RankResult['removed'] = [];
  const candidates: { option: Option; index: number; flags: Limit[]; score: number; tie: number }[] = [];
  options.forEach((option, index) => {
    const by = LIMITS.filter(limit => limits.includes(limit) && option.removedBy.includes(limit));
    if (by.length && !option.isCurrent) { removed.push({ option, by }); return; }
    const flags = LIMITS.filter(limit => limits.includes(limit) &&
      (option.flaggedBy.includes(limit) || (option.isCurrent && by.includes(limit))));
    candidates.push({ option, index, flags, score: mean(option, selected), tie: mean(option, others) });
  });
  candidates.sort((a, b) => b.score - a.score || b.tie - a.tie || a.index - b.index);
  return { ranked: candidates.map(({ option, flags }, index) => ({ option, flags, rank: index + 1, best: index === 0 })), removed };
}
