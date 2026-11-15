import type { LastCrop, Limit, Option, Priority, Scenario } from "../data/types";
import { LEGUMES, LIMITS, PRIORITIES, sequencesOf } from "../data/types";

export type RankInput = {
  options: Option[];
  limits: Limit[];
  priorities: Priority[]; // the farmer's order, most important first; zero to four
  scenario: Scenario;
  /** The crop just harvested. A legume grown twice running builds up disease, so an option starting with it is left out. */
  lastCrop?: LastCrop;
  /** Rank strip intercrops with the rest. Without it they are set aside in `intercrops`, for the farmer to ask for. */
  intercrops?: boolean;
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
  /** Strip intercrops set aside because the farmer has not asked to see them. Empty once they have. */
  intercrops: Option[];
};

/**
 * How much each place in the farmer's order counts: the first priority four times as much as the fourth.
 * These weights are our own judgement (docs/scoring.md, "Ranking"). A priority the farmer leaves out counts
 * for nothing and only breaks ties.
 */
export const RANK_WEIGHTS: readonly number[] = [4, 3, 2, 1];

/**
 * README "How options are ranked", stages 3 to 5: leave out a legume just grown, filter by limits, then order by priorities.
 * The score never leaves this module.
 */
export function rankOptions(input: RankInput): RankResult {
  const { options, limits, priorities, scenario, lastCrop } = input;
  const repeatCrop = LEGUMES.find(crop => crop === lastCrop);
  const ordered = priorities.slice(0, RANK_WEIGHTS.length);
  const others = ordered.length ? PRIORITIES.filter(priority => !ordered.includes(priority)) : [];
  const mean = (option: Option, keys: readonly Priority[]) => keys.length
    ? keys.reduce((sum, key) => sum + option.scores[scenario][key], 0) / keys.length : 0;
  const total = ordered.reduce((sum, _, place) => sum + RANK_WEIGHTS[place], 0);
  // No order given: the four count equally. Otherwise a weighted average by place.
  const score = (option: Option) => ordered.length
    ? ordered.reduce((sum, key, place) => sum + RANK_WEIGHTS[place] * option.scores[scenario][key], 0) / total
    : mean(option, PRIORITIES);
  const removed: RankResult['removed'] = [];
  const repeats: Option[] = [];
  const waiting: Option[] = [];
  const candidates: { option: Option; index: number; flags: Limit[]; score: number; tie: number }[] = [];
  options.forEach((option, index) => {
    if (option.strips && !input.intercrops) { waiting.push(option); return; }
    // A strip intercrop starts with two crops; if either is the legume just grown, half the field would repeat it.
    if (repeatCrop && !option.isCurrent && sequencesOf(option).some(sequence => sequence[0] === repeatCrop)) { repeats.push(option); return; }
    const by = LIMITS.filter(limit => limits.includes(limit) && option.removedBy.includes(limit));
    if (by.length && !option.isCurrent) { removed.push({ option, by }); return; }
    const flags = LIMITS.filter(limit => limits.includes(limit) &&
      (option.flaggedBy.includes(limit) || (option.isCurrent && by.includes(limit))));
    candidates.push({ option, index, flags, score: score(option), tie: mean(option, others) });
  });
  candidates.sort((a, b) => b.score - a.score || b.tie - a.tie || a.index - b.index);
  return { ranked: candidates.map(({ option, flags }, index) => ({ option, flags, rank: index + 1, best: index === 0 })), removed, repeats, intercrops: waiting };
}
