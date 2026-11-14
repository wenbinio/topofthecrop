import { afterEach, expect, it, vi } from 'vitest';
import type { DailyWeather } from '../data/types';
import { fetchPower, summarise } from './weather';

function series(first = 2001): DailyWeather {
  const daily: DailyWeather = { tmax: {}, tmin: {}, rain: {} };
  for (let time = Date.UTC(first, 0, 1); time < Date.UTC(2026, 0, 1); time += 86400000) {
    const key = new Date(time).toISOString().slice(0, 10).replaceAll('-', '');
    daily.tmax[key] = 20; daily.tmin[key] = 5; daily.rain[key] = 1;
  }
  return daily;
}
afterEach(() => vi.useRealTimers());
it('counts the baseline and supplies the required fact metadata', () => {
  const result = summarise(series());
  expect(result.years).toEqual([2001, 2025]);
  expect(result.hotDaysAtFlowering).toMatchObject({ value: 0, range: [0, 0], unit: 'days', label: 'weather.hotDays' });
  expect(result.lateFrostDays).toMatchObject({ value: 0, range: [0, 0], unit: 'days', label: 'weather.lateFrost' });
  expect(result.autumnRain).toMatchObject({ value: 91, range: [91, 91], unit: 'mm', label: 'weather.autumnRain' });
  for (const fact of [result.hotDaysAtFlowering, result.autumnRain, result.lateFrostDays]) {
    expect(fact).toMatchObject({ scale: 'area', confidence: 'fair', placeholder: false, asOf: '2025',
      source: { dataset: 'NASA POWER', resolution: 'about 50 km', url: 'https://power.larc.nasa.gov/' } });
  }
});
it('counts 30 C or more from 15 April to 15 June inclusive, not the days either side', () => {
  const daily = series();
  // Counted: both endpoints (15 April, 15 June) and a day of exactly 30 C. Not counted: 14 April, 16 June, 29.9 C.
  Object.assign(daily.tmax, { '20250415': 31, '20250615': 31, '20250501': 30, '20250414': 35, '20250616': 35, '20250502': 29.9 });
  expect(summarise(daily).hotDaysAtFlowering).toMatchObject({ value: 0.3, range: [0, 3] });
});
it('counts a hot day on 15 June and not one on 16 June', () => {
  const june15 = series(); june15.tmax['20250615'] = 30;
  expect(summarise(june15).hotDaysAtFlowering.value).toBe(0.1);
  const june16 = series(); june16.tmax['20250616'] = 30;
  expect(summarise(june16).hotDaysAtFlowering.value).toBe(0);
});
it('includes frost endpoints and excludes leap day, May and exactly zero', () => {
  const daily = series();
  Object.assign(daily.tmin, { '20240301': -1, '20240430': -1, '20240229': -1, '20240501': -1, '20240401': 0 });
  expect(summarise(daily).lateFrostDays).toMatchObject({ value: 0.2, range: [0, 2] });
});
it('skips an entirely missing 2025 and uses 2015 through 2024', () => {
  const daily = series();
  for (const values of Object.values(daily)) for (const key of Object.keys(values)) {
    if (key.startsWith('2025')) values[key] = -999;
  }
  // Distinguish 2015 from earlier years and from a ten-year window ending in 2025.
  daily.tmax['20150415'] = 31; daily.tmin['20150301'] = -1; daily.rain['20150901'] = 11;
  daily.tmax['20140415'] = 31; daily.tmax['20140416'] = 31;
  const result = summarise(daily);
  expect(result.hotDaysAtFlowering).toMatchObject({ value: 0.1, range: [0, 1] });
  expect(result.lateFrostDays).toMatchObject({ value: 0.1, range: [0, 1] });
  expect(result.autumnRain).toMatchObject({ value: 92, range: [91, 101] });
});
it('requires at least three usable years for every measure', () => {
  expect(() => summarise(series(2024))).toThrow('weather: not enough data');
});
it('applies 90% completeness independently to each calendar window', () => {
  const daily = series();
  // The flowering window is 62 days: 56 present (6 missing) still counts, 55 present does not.
  for (let day = 15; day <= 20; day++) delete daily.tmax[`202504${day}`];
  daily.tmax['20250531'] = 31;
  expect(summarise(daily).hotDaysAtFlowering.value).toBe(0.1);
  daily.tmax['20250421'] = -999;
  expect(summarise(daily).hotDaysAtFlowering.value).toBe(0);
  for (const key of Object.keys(daily.rain)) if (key < '20240101') delete daily.rain[key];
  expect(() => summarise(daily)).toThrow('weather: not enough data');
});
it('requests the exact NASA URL with rounded coordinates, signal and mapped series', async () => {
  const daily = series();
  const fake = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => ({ properties: { parameter: {
    T2M_MAX: daily.tmax, T2M_MIN: daily.tmin, PRECTOTCORR: daily.rain,
  } } }) } as Response);
  expect(await fetchPower([16.0637, 40.8624], fake)).toEqual(daily);
  expect(fake).toHaveBeenCalledWith('https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&longitude=16.06&latitude=40.86&start=20010101&end=20251231&format=JSON', { signal: expect.any(AbortSignal) });
});
it('rejects status 500', async () => {
  const fake = vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 500 } as Response);
  await expect(fetchPower([16, 41], fake)).rejects.toThrow();
});
it('rejects a malformed response', async () => {
  const fake = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  await expect(fetchPower([16, 41], fake)).rejects.toThrow();
});
it('aborts and rejects at 8000 ms', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | null | undefined;
  const fake = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
    signal = init?.signal;
    signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const rejected = expect(fetchPower([16, 41], fake)).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(7999);
  expect(signal?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await rejected;
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
