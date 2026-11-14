import type { Limit, Option, Priority, Scenario } from "../data/types";

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
export function rankOptions(_input: RankInput): RankResult {
  throw new Error("not implemented");
}
