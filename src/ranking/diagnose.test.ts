import { expect, it } from 'vitest';
import fixture from '../test-fixtures/money-bundle.json';
import type { Finding, Signals } from '../data/types';
import { buildPath, diagnose } from './diagnose';
import type { Diagnosis } from './diagnose';

const rows: [Signals, Diagnosis['key'], Diagnosis['confidence']][] = [
  [{ greenness: 'falling', temperature: 'rising', waterUse: 'falling' }, 'water-heat-stress', 'good'],
  [{ greenness: 'falling', temperature: 'rising', waterUse: 'normal' }, 'decline-with-heat', 'fair'],
  [{ greenness: 'falling', temperature: 'normal', waterUse: 'falling' }, 'less-canopy-less-water', 'fair'],
  [{ greenness: 'falling', temperature: 'normal', waterUse: 'normal' }, 'unexplained-canopy-loss', 'low'],
  [{ greenness: 'normal', temperature: 'rising', waterUse: 'falling' }, 'early-water-stress', 'fair'],
  [{ greenness: 'normal', temperature: 'rising', waterUse: 'normal' }, 'warm-healthy', 'low'],
  [{ greenness: 'normal', temperature: 'normal', waterUse: 'falling' }, 'one-weak-signal', 'low'],
  [{ greenness: 'normal', temperature: 'normal', waterUse: 'normal' }, 'no-decline', 'good'],
];
it.each(rows)('diagnoses %j as %s with %s confidence', (signals, key, confidence) => {
  expect(diagnose(signals)).toEqual({ key, confidence });
});
it('treats rising greenness as normal', () => {
  expect(diagnose({ greenness: 'rising', temperature: 'normal', waterUse: 'normal' })).toEqual({ key: 'no-decline', confidence: 'good' });
});
it.each(['greenness', 'temperature', 'waterUse'] as const)('handles missing %s', signal => {
  expect(diagnose({ ...rows[0][0], [signal]: 'no-data' })).toEqual({ key: 'not-enough-data', confidence: 'low' });
});
it('builds the first finding path in signal, limit and chosen priority order', () => {
  expect(buildPath({ ...fixture.findings[0], expectedBare: false } as Finding, ['no-buyer', 'no-irrigation'], ['soil', 'income'])).toEqual([
    'path.signal.greenness.falling', 'path.signal.temperature.rising', 'path.signal.waterUse.falling',
    'diagnosis.water-heat-stress', 'path.limit.no-irrigation', 'path.limit.no-buyer', 'path.priority.soil', 'path.priority.income',
  ]);
});
it('does not call bare soil after harvest a declining crop', () => {
  // The fixture's first finding is the bare months after harvest: decline-like signals, flagged as expected.
  expect((fixture.findings[0] as Finding).expectedBare).toBe(true);
  expect(buildPath(fixture.findings[0] as Finding, ['no-buyer'], ['soil'])).toEqual([
    'path.expectedBare', 'path.limit.no-buyer', 'path.priority.soil',
  ]);
});
it('builds the third finding path with weather and no priorities', () => {
  expect(buildPath(fixture.findings[2] as Finding, [], [])).toEqual([
    'path.signal.waterUse.falling', 'diagnosis.one-weak-signal', 'path.weatherDriven', 'path.priority.none',
  ]);
});
it('uses allNormal when no direction counts', () => {
  expect(buildPath({ ...fixture.findings[0], expectedBare: false, signals: rows[7][0] } as Finding, [], [])).toEqual([
    'path.signal.allNormal', 'diagnosis.no-decline', 'path.priority.none',
  ]);
});
