import type { LastCrop, Limit, Option, Priority, Scenario } from "../data/types";
import { LEGUMES, LIMITS, PRIORITIES } from "../data/types";

export type RankInput = {
  options: Option[];
  limits: Limit[];
  priorities: Priority[]; // zero to two
  scenario: Scenario;
  /** The crop just harvested. A legume grown twice running builds up disease, so an option starting with it is left out. */
  lastCrop?: LastCrop;
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
  /** Options left out because their first crop is the legume just grown. Never the current rotation. */
  repeats: Option[];
};

/**
 * README "How options are ranked", stages 3 to 5: leave out a legume just grown, filter by limits, then order by priorities.
 * The score never leaves this module.
 */
export function rankOptions(input: RankInput): RankResult {
  const { options, limits, priorities, scenario, lastCrop } = input;
  const repeatCrop = LEGUMES.find(crop => crop === lastCrop);
  const selected = priorities.length ? priorities : PRIORITIES;
  const others = PRIORITIES.filter(priority => !selected.includes(priority));
  const mean = (option: Option, keys: readonly Priority[]) => keys.length
    ? keys.reduce((sum, key) => sum + option.scores[scenario][key], 0) / keys.length : 0;
  const removed: RankResult['removed'] = [];
  const repeats: Option[] = [];
  const candidates: { option: Option; index: number; flags: Limit[]; score: number; tie: number }[] = [];
  options.forEach((option, index) => {
    if (repeatCrop && !option.isCurrent && option.sequence[0] === repeatCrop) { repeats.push(option); return; }
    const by = LIMITS.filter(limit => limits.includes(limit) && option.removedBy.includes(limit));
    if (by.length && !option.isCurrent) { removed.push({ option, by }); return; }
    const flags = LIMITS.filter(limit => limits.includes(limit) &&
      (option.flaggedBy.includes(limit) || (option.isCurrent && by.includes(limit))));
    candidates.push({ option, index, flags, score: mean(option, selected), tie: mean(option, others) });
  });
  candidates.sort((a, b) => b.score - a.score || b.tie - a.tie || a.index - b.index);
  return { ranked: candidates.map(({ option, flags }, index) => ({ option, flags, rank: index + 1, best: index === 0 })), removed, repeats };
}
