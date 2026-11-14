import type { Confidence, Finding, Limit, Priority, Signals } from "../data/types";
import { LIMITS } from "../data/types";

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
export function diagnose(signals: Signals): Diagnosis {
  if (Object.values(signals).includes('no-data')) return { key: 'not-enough-data', confidence: 'low' };
  const rows: Diagnosis[] = [
    { key: 'no-decline', confidence: 'good' },
    { key: 'one-weak-signal', confidence: 'low' },
    { key: 'warm-healthy', confidence: 'low' },
    { key: 'early-water-stress', confidence: 'fair' },
    { key: 'unexplained-canopy-loss', confidence: 'low' },
    { key: 'less-canopy-less-water', confidence: 'fair' },
    { key: 'decline-with-heat', confidence: 'fair' },
    { key: 'water-heat-stress', confidence: 'good' },
  ];
  return rows[Number(signals.greenness === 'falling') * 4 + Number(signals.temperature === 'rising') * 2 + Number(signals.waterUse === 'falling')];
}

/**
 * The route that led to the options, as plain steps for the "Why?" screen:
 * signals, then diagnosis, then each chosen limit, then the chosen priorities.
 */
export function buildPath(finding: Finding, limits: Limit[], priorities: Priority[]): string[] {
  const path: string[] = [];
  if (finding.signals.greenness === 'falling') path.push('path.signal.greenness.falling');
  if (finding.signals.temperature === 'rising') path.push('path.signal.temperature.rising');
  if (finding.signals.waterUse === 'falling') path.push('path.signal.waterUse.falling');
  if (!path.length) path.push('path.signal.allNormal');
  path.push(`diagnosis.${diagnose(finding.signals).key}`);
  if (finding.weatherDriven) path.push('path.weatherDriven');
  for (const limit of LIMITS) if (limits.includes(limit)) path.push(`path.limit.${limit}`);
  path.push(...(priorities.length ? priorities.map(priority => `path.priority.${priority}`) : ['path.priority.none']));
  return path;
}
