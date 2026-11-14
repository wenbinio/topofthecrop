import { expect, it } from 'vitest';
import fixture from '../test-fixtures/money-bundle.json';
import { DEFAULT_STATE } from '../data/types';
import type { AppState, LngLat } from '../data/types';
import { decodeState, encodeState } from './url';

it('omits defaults and restores an empty query', () => {
  expect(encodeState(DEFAULT_STATE)).toBe('');
  expect(decodeState('')).toEqual(DEFAULT_STATE);
});
it('round-trips the full demo state, canonicalizing limits only', () => {
  const state: AppState = { ...DEFAULT_STATE, fieldId: fixture.field.id, limits: ['no-buyer', 'no-irrigation'],
    priorities: ['soil', 'income'], scenario: 'drier', view: 'simple', lang: 'it', lastCrop: 'chickpea' };
  expect(decodeState(encodeState(state))).toEqual({ ...state, limits: ['no-irrigation', 'no-buyer'] });
});
it('round-trips a four-point drawn field and accepts a leading question mark', () => {
  const state: AppState = { ...DEFAULT_STATE, outline: fixture.field.outline.coordinates[0].slice(0, -1) as LngLat[] };
  const encoded = encodeState(state);
  expect(new URLSearchParams(encoded).get('o')).toBe(state.outline?.map(point => point.map(n => n.toFixed(5)).join(',')).join(';'));
  expect(decodeState(`?${encoded}`)).toEqual(state);
});
it('drops unknown values and keeps the first two distinct valid priorities', () => {
  expect(decodeState('p=money,income,income,soil,water&s=wet&v=fancy&g=fr&c=maize&l=x&o=abc&f=other'))
    .toEqual({ ...DEFAULT_STATE, priorities: ['income', 'soil'] });
});
it('rejects two-point outlines', () => expect(decodeState('o=1,2;3,4').outline).toBeNull());
it('cuts outlines to twelve points and rounds to five decimals', () => {
  const outline = Array.from({ length: 20 }, (_, i) => `${i + 0.1234567},${i + 0.7654321}`).join(';');
  const result = decodeState(`o=${outline}`).outline;
  expect(result).toHaveLength(12);
  expect(result?.[0]).toEqual([0.12346, 0.76543]);
});
it('tolerates malformed percent escapes', () => expect(() => decodeState('%E0%A4%A')).not.toThrow());
it('round-trips money with sorted keys and omits empty money', () => {
  const state: AppState = { ...DEFAULT_STATE, money: { 'p.durum': 350, 'on.eco-rotation': 0 } };
  const encoded = encodeState(state);
  expect(new URLSearchParams(encoded).get('m')).toBe('on.eco-rotation:0;p.durum:350');
  expect(decodeState(encoded)).toEqual(state);
  expect(new URLSearchParams(encodeState(DEFAULT_STATE)).has('m')).toBe(false);
});
it('rejects malformed money values and keys', () => {
  expect(decodeState('m=p.durum:abc;on.x:2;p.durum:9999;s.ok:12').money).toEqual({ 's.ok': 12 });
  expect(decodeState(`m=p.durum:-1;p.faba:NaN;s.x:Infinity;p.:2;p.UPPER:3;x.foo:1;p.${'a'.repeat(33)}:1;p.empty:;p.space: ;p.extra:1:2;on.good:0;s.good:5000`).money)
    .toEqual({ 'on.good': 0, 's.good': 5000 });
});
it('keeps at most forty valid money pairs', () => {
  const pairs = Array.from({ length: 45 }, (_, i) => `s.item-${i}:${i}`);
  const money = decodeState(`m=invalid;${pairs.join(';')}`).money;
  expect(Object.keys(money)).toHaveLength(40);
  expect(money['s.item-39']).toBe(39);
  expect(money).not.toHaveProperty('s.item-40');
});
it('drops invalid positions, deduplicates limits, and gives the demo id precedence', () => {
  expect(decodeState('o=181,0;0,91;NaN,1;,;1,2;3,4').outline).toBeNull();
  expect(decodeState('o=181,0;1,2;3,4;5,6').outline).toEqual([[1, 2], [3, 4], [5, 6]]);
  expect(decodeState('l=broomrape,no-buyer,broomrape').limits).toEqual(['no-buyer', 'broomrape']);
  expect(decodeState('f=genzano-demo&o=1,2;3,4;5,6').outline).toBeNull();
});
it('round-trips added payments, names with separators and accents included', () => {
  const state: AppState = { ...DEFAULT_STATE, fieldId: fixture.field.id, extras: [
    { name: 'Regional aid', amount: 50, crops: [] },
    { name: 'Aiuto ~ a|b & più', amount: 90.5, crops: ['chickpea', 'faba'] },
  ] };
  const encoded = encodeState(state);
  expect(decodeState(encoded)).toEqual(state);
  expect(decodeState(`?${encoded}`).extras).toEqual(state.extras);
  expect(new URLSearchParams(encodeState(DEFAULT_STATE)).has('x')).toBe(false);
});
it('keeps at most three added payments', () => {
  const x = ['a~1~', 'b~2~', 'c~3~durum', 'd~4~'].join('|');
  expect(decodeState(`x=${encodeURIComponent(x)}`).extras.map(extra => extra.name)).toEqual(['a', 'b', 'c']);
});
it('drops added payments with a bad name, amount or crop list', () => {
  const items = ['~5~', '%20%20~5~', `${'n'.repeat(31)}~5~`, 'neg~-1~', 'big~2001~', 'word~abc~', 'none~~',
    'maize~5~maize,rice', 'ok~2000~faba,maize,chickpea,faba', `${'k'.repeat(30)}~0~`, ' pad ~7~'];
  expect(decodeState(`x=${encodeURIComponent(items.join('|'))}`).extras).toEqual([
    { name: 'ok', amount: 2000, crops: ['chickpea', 'faba'] },
    { name: 'k'.repeat(30), amount: 0, crops: [] },
    { name: 'pad', amount: 7, crops: [] },
  ]);
  expect(decodeState('x=a~1|b~2~~|%E0%A4%A~3~').extras).toEqual([]);
});
it('tolerates a malformed added-payment escape', () => {
  expect(() => decodeState('x=%E0%A4%A')).not.toThrow();
  expect(decodeState('x=%E0%A4%A').extras).toEqual([]);
});
