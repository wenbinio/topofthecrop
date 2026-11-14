import type { Confidence, Finding, Limit, Priority, Signals } from "../data/types";

/** One row of the README signal-agreement table. `key` is a dictionary key suffix. */
export type Diagnosis = {
  key:
    | "water-heat-stress"
    | "decline-with-heat"
    | "less-canopy-less-water"
    | "unexplained-canopy-loss"
    | "early-water-stress"
    | "warm-healthy"
    | "one-weak-signal"
    | "no-decline"
    | "not-enough-data";
  confidence: Confidence;
};

/** README "How options are ranked", stage 1: the decision tree over the three signals. */
export function diagnose(_signals: Signals): Diagnosis {
  throw new Error("not implemented");
}

/**
 * The route that led to the options, as plain steps for the "Why?" screen:
 * signals, then diagnosis, then each chosen limit, then the chosen priorities.
 */
export function buildPath(_finding: Finding, _limits: Limit[], _priorities: Priority[]): string[] {
  throw new Error("not implemented");
}
