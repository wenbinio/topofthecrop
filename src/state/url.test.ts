import { expect, it } from 'vitest';
import fixture from '../../public/data/genzano-demo.json';
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
it('drops invalid positions, deduplicates limits, and gives the demo id precedence', () => {
  expect(decodeState('o=181,0;0,91;NaN,1;,;1,2;3,4').outline).toBeNull();
  expect(decodeState('o=181,0;1,2;3,4;5,6').outline).toEqual([[1, 2], [3, 4], [5, 6]]);
  expect(decodeState('l=broomrape,no-buyer,broomrape').limits).toEqual(['no-buyer', 'broomrape']);
  expect(decodeState('f=genzano-demo&o=1,2;3,4;5,6').outline).toBeNull();
});
