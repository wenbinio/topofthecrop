// This farming season so far, from NASA POWER's daily rain: how much has fallen since 1 September, how that
// compares with the same weeks in earlier years, and when it last rained properly. It answers the autumn question
// "has the rain come yet?" with live NASA data. Written with AI assistance (Claude, Anthropic).
import type { Fact, LngLat } from "../data/types";
import { POWER_TIMEOUT_MS } from "./weather";

/** Thresholds are our own judgement, for the team to correct; they are also written in docs/scoring.md. */
export const SEASON_RULES = {
  /** The farming year starts on 1 September. */
  start: { month: 9, day: 1 },
  /** Earlier seasons the same weeks are compared with. */
  pastYears: 10,
  /** A day's rain that counts as "proper rain" for sowing. */
  goodRainMm: 5,
  /** Below this share of the usual rain the season is called drier; above the other, wetter. */
  drierBelow: 0.75,
  wetterAbove: 1.25,
  /** An earlier season needs this share of its days to be counted. */
  minPresent: 0.9,
  /** With fewer earlier seasons than this, no comparison is made. */
  minPast: 3,
} as const;

export type Standing = "drier" | "usual" | "wetter";

export type SeasonWeather = {
  /** First and last day counted, as YYYY-MM-DD. `to` is the latest day NASA POWER has, usually 2 to 4 days ago. */
  from: string;
  to: string;
  /** Rain from `from` to `to` this season. */
  rain: Fact;
  /**
   * The middle value over the earlier seasons for the same days. Its range is the 10th to 90th percentile, as in
   * the data team's files, so one freak season does not stretch it (NASA POWER gives 592 mm for autumn 2025 at
   * the demo field, five times the usual).
   */
  usual: Fact;
  standing: Standing;
  /** The latest day with `goodRainMm` or more, or null if none yet this season. */
  lastGoodRain: { date: string; daysAgo: number; mm: number } | null;
};

const DAY = 86400000;
const key = (time: number) => new Date(time).toISOString().slice(0, 10).replaceAll("-", "");
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const SOURCE = { dataset: "NASA POWER", resolution: "about 50 km", url: "https://power.larc.nasa.gov/" };

/** 1 September of the farming year `today` falls in, as a UTC time. */
export function seasonStart(today: Date): number {
  const { month, day } = SEASON_RULES.start;
  const year = today.getUTCFullYear();
  const thisYear = Date.UTC(year, month - 1, day);
  return today.getTime() >= thisYear ? thisYear : Date.UTC(year - 1, month - 1, day);
}

/**
 * Calls NASA POWER (daily, point, community AG) for PRECTOTCORR, from 1 September `pastYears` seasons ago to
 * today. Coordinates are rounded to two decimals. Rejects if the call fails or takes longer than POWER_TIMEOUT_MS.
 */
export async function fetchSeasonRain(centre: LngLat, today: Date = new Date(), fetchImpl: typeof fetch = fetch): Promise<Record<string, number>> {
  const first = new Date(seasonStart(today));
  first.setUTCFullYear(first.getUTCFullYear() - SEASON_RULES.pastYears);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POWER_TIMEOUT_MS);
  const url =
    "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG" +
    `&longitude=${centre[0].toFixed(2)}&latitude=${centre[1].toFixed(2)}` +
    `&start=${key(first.getTime())}&end=${key(today.getTime())}&format=JSON`;
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`season: request failed (${response.status})`);
    const json = (await response.json()) as { properties?: { parameter?: { PRECTOTCORR?: unknown } } };
    const series = json?.properties?.parameter?.PRECTOTCORR;
    if (!series || typeof series !== "object" || Array.isArray(series)) throw new Error("season: invalid response");
    return series as Record<string, number>;
  } finally {
    clearTimeout(timer);
  }
}

const has = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value !== -999;

/** Pure counting: turns the daily rain into this season's facts. Throws when this season has no data yet. */
export function summariseSeason(rain: Record<string, number>, today: Date = new Date()): SeasonWeather {
  const start = seasonStart(today);
  // The latest day NASA has: POWER marks days it has not filled in yet with -999.
  let end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  while (end >= start && !has(rain[key(end)])) end -= DAY;
  if (end < start) throw new Error("season: no data yet this season");
  const days = Math.round((end - start) / DAY) + 1;

  let total = 0;
  let lastGoodRain: SeasonWeather["lastGoodRain"] = null;
  for (let time = start; time <= end; time += DAY) {
    const value = rain[key(time)];
    if (!has(value)) continue;
    total += value;
    if (value >= SEASON_RULES.goodRainMm) {
      lastGoodRain = { date: iso(time), daysAgo: Math.round((end - time) / DAY), mm: Math.round(value) };
    }
  }

  // The same number of days from 1 September in each earlier season.
  const past: number[] = [];
  for (let back = 1; back <= SEASON_RULES.pastYears; back++) {
    const first = new Date(start);
    first.setUTCFullYear(first.getUTCFullYear() - back);
    let sum = 0, present = 0;
    for (let i = 0; i < days; i++) {
      const value = rain[key(first.getTime() + i * DAY)];
      if (!has(value)) continue;
      present++;
      sum += value;
    }
    if (present / days >= SEASON_RULES.minPresent) past.push(sum);
  }
  if (past.length < SEASON_RULES.minPast) throw new Error("season: not enough earlier seasons");
  const sorted = [...past].sort((a, b) => a - b);
  /** The value a share `q` of the way through the sorted seasons, between neighbours where it falls between two. */
  const at = (q: number) => {
    const pos = q * (sorted.length - 1);
    const low = Math.floor(pos);
    return sorted[low] + (pos - low) * (sorted[Math.min(low + 1, sorted.length - 1)] - sorted[low]);
  };
  const mid = at(0.5);
  const share = mid > 0 ? total / mid : 1;
  const standing: Standing = share < SEASON_RULES.drierBelow ? "drier" : share > SEASON_RULES.wetterAbove ? "wetter" : "usual";

  const fact = (value: number, label: string, range?: [number, number]): Fact => ({
    value: Math.round(value),
    ...(range ? { range: [Math.round(range[0]), Math.round(range[1])] as [number, number] } : {}),
    unit: "mm",
    label,
    scale: "area",
    confidence: "fair",
    placeholder: false,
    asOf: iso(end),
    source: SOURCE,
  });
  return {
    from: iso(start),
    to: iso(end),
    rain: fact(total, "season.rain"),
    usual: fact(mid, "season.usualByNow", [at(0.1), at(0.9)]),
    standing,
    lastGoodRain,
  };
}
