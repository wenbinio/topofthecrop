import { expect, it } from 'vitest';
import fixture from '../test-fixtures/money-bundle.json';
import type { Option } from '../data/types';
import type { RankInput } from './rank';
import { rankOptions } from './rank';

const options = fixture.options as Option[];
const chickpea = 'chickpea-durum-durum';
const forage = 'vetch-oat-durum-durum';
const faba = 'faba-durum-faba';
const durum = 'durum-durum-durum';
const input: RankInput = { options, priorities: ['income', 'water'], limits: [], scenario: 'normal' };
const ids = (result: ReturnType<typeof rankOptions>) => result.ranked.map(row => row.option.id);

it('ranks income and water and marks only first as best without mutation', () => {
  const before = structuredClone(input);
  const result = rankOptions(input);
  expect(ids(result)).toEqual([chickpea, forage, faba, durum]);
  expect(result.ranked.map(row => row.best)).toEqual([true, false, false, false]);
  expect(result.removed).toEqual([]);
  expect(input).toEqual(before);
});
it('puts forage then chickpea first in much-drier weather', () => {
  expect(ids(rankOptions({ ...input, scenario: 'much-drier' })).slice(0, 2)).toEqual([forage, chickpea]);
});
it('puts faba then chickpea first for income and soil', () => {
  expect(ids(rankOptions({ ...input, priorities: ['income', 'soil'] })).slice(0, 2)).toEqual([faba, chickpea]);
});
it('averages all priorities when none are selected', () => {
  expect(ids(rankOptions({ ...input, priorities: [] }))).toEqual([forage, faba, chickpea, durum]);
});
it('removes chickpea for cereal machinery and renumbers the survivors', () => {
  const result = rankOptions({ ...input, limits: ['cereal-machinery'] });
  expect(result.removed).toEqual([{ option: options[0], by: ['cereal-machinery'] }]);
  expect(result.ranked.map(row => row.rank)).toEqual([1, 2, 3]);
});
it('orders flags by LIMITS without removing flagged options', () => {
  const result = rankOptions({ ...input, limits: ['broomrape', 'no-buyer'] });
  expect(result.removed).toEqual([]);
  expect(result.ranked.find(row => row.option.id === chickpea)?.flags).toEqual(['no-buyer', 'broomrape']);
  expect(result.ranked.find(row => row.option.id === durum)?.flags).toEqual([]);
});
it('turns a removal into a flag for the current option', () => {
  const current: Option = { ...options[3], removedBy: ['no-irrigation'] };
  expect(rankOptions({ ...input, options: [current], limits: ['no-irrigation'] })).toEqual({
    ranked: [{ option: current, rank: 1, best: true, flags: ['no-irrigation'] }], removed: [], repeats: [],
  });
});
it('retains the current rotation when all alternatives are removed', () => {
  const constrained: Option[] = options.map(option => ({ ...option, removedBy: ['no-irrigation'] }));
  const result = rankOptions({ ...input, options: constrained, limits: ['no-irrigation'] });
  expect(ids(result)).toEqual([durum]);
  expect(result.ranked[0].rank).toBe(1);
  expect(result.removed).toHaveLength(3);
});
it('breaks ties on other priorities and preserves input order on complete ties', () => {
  const lower = structuredClone(options[0]);
  const higher = structuredClone(options[0]);
  lower.id = 'lower'; higher.id = 'higher';
  lower.scores.normal = { income: 0.5, water: 0.5, soil: 0.1, forage: 0.1 };
  higher.scores.normal = { income: 0.5, water: 0.5, soil: 0.9, forage: 0.9 };
  expect(ids(rankOptions({ ...input, options: [lower, higher] }))).toEqual(['higher', 'lower']);
  higher.scores.normal = { ...lower.scores.normal };
  expect(ids(rankOptions({ ...input, options: [lower, higher] }))).toEqual(['lower', 'higher']);
  expect(ids(rankOptions({ ...input, options: [higher, lower] }))).toEqual(['higher', 'lower']);
});

it('leaves out an option whose first crop is the legume just grown', () => {
  const result = rankOptions({ ...input, lastCrop: 'chickpea' });
  expect(ids(result)).toEqual([forage, faba, durum]);
  expect(result.repeats.map(option => option.id)).toEqual([chickpea]);
  expect(result.ranked[0]).toMatchObject({ rank: 1, best: true });
});
it('leaves nothing out after a cereal or a crop typed by the farmer', () => {
  for (const lastCrop of ['durum', 'barley', 'rapeseed', 'other'] as const) {
    const result = rankOptions({ ...input, lastCrop });
    expect(result.repeats).toEqual([]);
    expect(result.ranked).toHaveLength(4);
  }
  expect(rankOptions(input).repeats).toEqual([]);
});
it('never leaves out the current rotation', () => {
  const current: Option = { ...options[3], sequence: ['faba', 'durum', 'durum'] };
  const result = rankOptions({ ...input, options: [options[1], current], lastCrop: 'faba' });
  expect(result.repeats.map(option => option.id)).toEqual([faba]);
  expect(ids(result)).toEqual([durum]);
});
