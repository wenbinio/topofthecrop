import { afterEach, expect, it, vi } from 'vitest';
import fixture from '../test-fixtures/money-bundle.json';
import type { FieldBundle } from './types';
import { loadBundle, validateBundle } from './validate';

afterEach(() => vi.unstubAllGlobals());
it('returns the valid fixture unchanged', () => expect(validateBundle(fixture)).toBe(fixture));
it('accepts a bundle without economics', () => {
  const bundle = validateBundle(structuredClone(fixture));
  delete bundle.economics;
  expect(validateBundle(bundle)).toBe(bundle);
});

const flowerHigh = (now: unknown, by2050: unknown) => {
  const fact = (value: unknown) => ({ value, unit: '°C', range: [21, 25], scale: 'area', confidence: 'fair', placeholder: false,
    source: { dataset: 'ERA5-Land', resolution: 'about 11 km', url: '' } });
  return { now: fact(now), by2050: fact(by2050) };
};
it('accepts a bundle with and without year.flowerHigh', () => {
  expect('flowerHigh' in fixture.year).toBe(false);
  const bundle = structuredClone(fixture) as unknown as FieldBundle;
  Object.assign(bundle.year, { flowerHigh: flowerHigh(22.9, 24.5) });
  expect(validateBundle(bundle)).toBe(bundle);
});
it.each([
  ['not an object', 'hot'],
  ['missing by2050', { now: flowerHigh(22.9, 24.5).now }],
  ['a string temperature', flowerHigh('22.9', 24.5)],
  ['a fact without a source', (() => { const h = flowerHigh(22.9, 24.5); Reflect.deleteProperty(h.by2050, 'source'); return h; })()],
])('rejects year.flowerHigh that is %s', (_name, value) => {
  const bundle = structuredClone(fixture);
  Object.assign(bundle.year, { flowerHigh: value });
  expect(() => validateBundle(bundle)).toThrow(/^bundle: year\.flowerHigh/);
});

const economicsMutations:[string, (bundle: FieldBundle) => void][] = [
  ['missing crop', b => { Reflect.deleteProperty(b.economics!.crops, 'faba'); }],
  ['unknown option', b => { b.economics!.support[0].options = ['unknown']; }],
  ['duplicate support id', b => { b.economics!.support[1].id = b.economics!.support[0].id; }],
  ['string yield', b => { b.economics!.crops.durum!.yield.value = 'three'; }],
  ['string price', b => { b.economics!.crops.durum!.price.value = '320'; }],
  ['nonfinite costs', b => { b.economics!.crops.durum!.costs.value = NaN; }],
  ['string amount', b => { b.economics!.support[0].amount.value = '160'; }],
  ['missing source', b => { Reflect.deleteProperty(b.economics!.support[0].amount, 'source'); }],
  ['missing translation', b => { Reflect.deleteProperty(b.economics!.support[0].name, 'it'); }],
  ['missing condition', b => { Reflect.deleteProperty(b.economics!.support[0].condition, 'en'); }],
  ['invalid level', b => { Object.assign(b.economics!.support[0], { level: 'local' }); }],
  ['unknown crop', b => { Object.assign(b.economics!.support[0], { crops: ['maize'] }); }],
  ['nonboolean default', b => { Object.assign(b.economics!.support[0], { defaultOn: 1 }); }],
  ['nonarray support', b => { Object.assign(b.economics!, { support: {} }); }],
  ['nonstring id', b => { Object.assign(b.economics!.support[0], { id: 5 }); }],
];
it.each(economicsMutations)('rejects economics with %s', (_name, mutate) => {
  const bundle = validateBundle(structuredClone(fixture));
  mutate(bundle);
  expect(() => validateBundle(bundle)).toThrow(/^bundle:.*economics/);
});

const mutations: [string, (bundle: typeof fixture) => void][] = [
  ['findings', b => { b.findings.pop(); }],
  ['options', b => { b.options.pop(); }],
  ['isCurrent', b => { b.options[0].isCurrent = true; }],
  ['sequence', b => { b.options[0].sequence[0] = 'maize'; }],
  ['months', b => { b.year.months.pop(); }],
  ['scores', b => { b.options[0].scores.normal.income = 1.2; }],
  ['source', b => { Reflect.deleteProperty(b.findings[0].fact, 'source'); }],
  ['removedBy', b => { b.options[0].removedBy = ['no-tractor']; }],
];
it.each(mutations)('rejects malformed %s with a descriptive bundle error', (word, mutate) => {
  const bundle = structuredClone(fixture);
  mutate(bundle);
  expect(() => validateBundle(bundle)).toThrow(new RegExp(`^bundle:.*${word}`));
});
it('rejects null', () => expect(() => validateBundle(null)).toThrow(/^bundle:/));
it('loads the fixture from the data URL', async () => {
  const fake = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
  vi.stubGlobal('fetch', fake);
  expect(await loadBundle('genzano-demo')).toBe(fixture);
  expect(fake.mock.calls[0][0]).toMatch(/data\/genzano-demo\.json$/);
});
it('rejects a 404', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  await expect(loadBundle('genzano-demo')).rejects.toThrow();
});
it('rejects an HTML body', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => JSON.parse('<html>') }));
  await expect(loadBundle('genzano-demo')).rejects.toThrow();
});

const withOptions = (count: number) => {
  const bundle = structuredClone(fixture);
  const spare = bundle.options.find(o => !o.isCurrent)!;
  while (bundle.options.length < count) bundle.options.push({ ...structuredClone(spare), id: `extra-${bundle.options.length}` });
  bundle.options.splice(count);
  if (!bundle.options.some(o => o.isCurrent)) bundle.options[0].isCurrent = true;
  return bundle;
};
it.each([3, 4, 9, 12])('accepts a bundle with %i options', count => {
  const bundle = withOptions(count);
  expect(validateBundle(bundle)).toBe(bundle);
});
it.each([2, 13])('rejects a bundle with %i options', count => {
  expect(() => validateBundle(withOptions(count))).toThrow(/^bundle: options$/);
});
it('rejects economics that lacks a crop an option grows', () => {
  const bundle = structuredClone(fixture);
  bundle.options[0].sequence[0] = 'lentil';
  expect(() => validateBundle(bundle)).toThrow(/^bundle: economics\.crops\.lentil is used by an option but missing/);
});
it('accepts economics without a crop no option grows', () => {
  const bundle = structuredClone(fixture);
  const faba = bundle.options.find(o => o.id === 'faba-durum-faba')!;
  faba.sequence = ['chickpea', 'durum', 'chickpea'];
  Reflect.deleteProperty(bundle.economics.crops, 'faba');
  expect(validateBundle(bundle)).toBe(bundle);
});
it('rejects an unknown crop in economics', () => {
  const bundle = structuredClone(fixture) as unknown as FieldBundle;
  Object.assign(bundle.economics!.crops, { maize: bundle.economics!.crops.durum });
  expect(() => validateBundle(bundle)).toThrow(/^bundle: economics\.crops\.maize/);
});
