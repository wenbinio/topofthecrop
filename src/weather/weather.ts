import type { AreaWeather, DailyWeather, LngLat } from "../data/types";
import type { Fact } from "../data/types";

export const POWER_FIRST_YEAR = 2001;
export const POWER_LAST_YEAR = 2025;
export const POWER_TIMEOUT_MS = 8000;

/** Thresholds are placeholders for the team to correct; they are also written in docs/scoring.md. */
export const WEATHER_RULES = {
  hotDayAboveC: 30,
  flowering: { from: "0415", to: "0531" }, // MMDD, inclusive
  autumn: { from: "0901", to: "1130" },
  frostBelowC: 0,
  lateFrost: { from: "0301", to: "0430" },
  recentYears: 10, // the value shown is the mean of the last ten years
} as const;

/**
 * Calls NASA POWER (daily, point, community AG) for T2M_MAX, T2M_MIN and PRECTOTCORR,
 * POWER_FIRST_YEAR to POWER_LAST_YEAR. Coordinates are rounded to two decimals.
 * Rejects if the call fails, is not OK, or takes longer than POWER_TIMEOUT_MS.
 */
export async function fetchPower(centre: LngLat, fetchImpl: typeof fetch = fetch): Promise<DailyWeather> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('weather: request timed out'));
      controller.abort();
    }, POWER_TIMEOUT_MS);
  });
  const url = 'https://power.larc.nasa.gov/api/temporal/daily/point' +
    '?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG' +
    `&longitude=${centre[0].toFixed(2)}&latitude=${centre[1].toFixed(2)}` +
    `&start=${POWER_FIRST_YEAR}0101&end=${POWER_LAST_YEAR}1231&format=JSON`;
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`weather: request failed (${response.status})`);
      const json: unknown = await response.json();
      const parameter = record(record(record(json).properties).parameter);
      return { tmax: dailySeries(parameter.T2M_MAX), tmin: dailySeries(parameter.T2M_MIN), rain: dailySeries(parameter.PRECTOTCORR) };
    })()]);
  } finally {
    clearTimeout(timer);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('weather: invalid response');
  return value as Record<string, unknown>;
}

function dailySeries(value: unknown): Record<string, number> {
  const series = record(value);
  if (!Object.entries(series).every(([key, value]) => /^\d{8}$/.test(key) && typeof value === 'number' && Number.isFinite(value))) {
    throw new Error('weather: invalid daily series');
  }
  return series as Record<string, number>;
}

/** Pure counting: turns daily series into the three "your area" facts. */
export function summarise(daily: DailyWeather): AreaWeather {
  return {
    years: [POWER_FIRST_YEAR, POWER_LAST_YEAR],
    hotDaysAtFlowering: measure(daily.tmax, WEATHER_RULES.flowering, value => Number(value > WEATHER_RULES.hotDayAboveC), 'days', 'weather.hotDays'),
    autumnRain: measure(daily.rain, WEATHER_RULES.autumn, value => value, 'mm', 'weather.autumnRain'),
    lateFrostDays: measure(daily.tmin, WEATHER_RULES.lateFrost, value => Number(value < WEATHER_RULES.frostBelowC), 'days', 'weather.lateFrost'),
  };
}

function measure(series: Record<string, number>, window: { from: string; to: string },
  contribution: (value: number) => number, unit: string, label: string): Fact {
  const totals: number[] = [];
  for (let year = POWER_FIRST_YEAR; year <= POWER_LAST_YEAR; year++) {
    const start = Date.UTC(year, Number(window.from.slice(0, 2)) - 1, Number(window.from.slice(2)));
    const end = Date.UTC(year, Number(window.to.slice(0, 2)) - 1, Number(window.to.slice(2)));
    let present = 0, days = 0, total = 0;
    for (let time = start; time <= end; time += 86400000) {
      days++;
      const key = new Date(time).toISOString().slice(0, 10).replaceAll('-', '');
      const value = series[key];
      if (!Number.isFinite(value) || value === -999) continue;
      present++;
      total += contribution(value);
    }
    if (present / days >= 0.9) totals.push(total);
  }
  if (totals.length < 3) throw new Error('weather: not enough data');
  const recent = totals.slice(-WEATHER_RULES.recentYears);
  const mean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  // Rain sums carry float noise from daily values; days are already whole numbers.
  const tidy = (value: number) => unit === 'mm' ? Math.round(value) : Math.round(value * 10) / 10;
  return {
    value: tidy(mean),
    range: [tidy(Math.min(...recent)), tidy(Math.max(...recent))], unit, label,
    scale: 'area', confidence: 'fair', placeholder: false, asOf: String(POWER_LAST_YEAR),
    source: { dataset: 'NASA POWER', resolution: 'about 50 km', url: 'https://power.larc.nasa.gov/' },
  };
}
