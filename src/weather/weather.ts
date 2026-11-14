import type { AreaWeather, DailyWeather, LngLat } from "../data/types";

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
export async function fetchPower(_centre: LngLat, _fetchImpl: typeof fetch = fetch): Promise<DailyWeather> {
  throw new Error("not implemented");
}

/** Pure counting: turns daily series into the three "your area" facts. */
export function summarise(_daily: DailyWeather): AreaWeather {
  throw new Error("not implemented");
}
