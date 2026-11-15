// The next days at the field, from MET Norway's open forecast (Locationforecast 2.0, "complete").
// Licence: CC BY 4.0 and NLOD 2.0; credit "Data from MET Norway". Its terms allow calls straight from a web page,
// which identifies itself by its address. MET Norway logs the caller's IP address and the coordinates asked for,
// so coordinates are rounded to two decimals (about 1 km). NASA has no forecast service a web page can call.
// Written with AI assistance (Claude, Anthropic).
import type { Fact, LngLat } from "../data/types";

/** Thresholds are our own judgement, for the team to correct; they are also written in docs/scoring.md. */
export const FORECAST_RULES = {
  /** Today (what is left of it) and the six days after. */
  days: 7,
  /** A forecast low at or below this is flagged as possible frost: the model gives air at 2 m, and ground is colder. */
  frostAtOrBelowC: 1,
  /** Under this total the block says "little or no rain". */
  noRainBelowMm: 1,
  timeoutMs: 8000,
} as const;

export type ForecastDay = { date: string; rainMm: number; minC: number; maxC: number };

export type Forecast = {
  /** When MET Norway last updated the forecast, as an ISO time. */
  updated: string;
  /** One entry per local day, today first. Fewer than `days` only if the forecast is shorter. */
  days: ForecastDay[];
  rain: Fact;
  /** The day with the most rain, or null when the total is under `noRainBelowMm`. */
  wettest: ForecastDay | null;
  /** The coldest forecast low, and the day it falls on. */
  coldest: { fact: Fact; date: string };
  frost: boolean;
};

const SOURCE = { dataset: "MET Norway forecast", resolution: "weather model", url: "https://api.met.no/" };
const SIX_HOURS = 6 * 3600000;
const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day a moment falls on where the phone is, as YYYY-MM-DD. */
export function localDay(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The public forecast page for the same place, for the full picture or the Yr app. */
export function fullForecastUrl(centre: LngLat): string {
  // Yr is MET Norway's own public site. It has no Italian pages; English is its international version.
  return `https://www.yr.no/en/forecast/daily-table/${centre[1].toFixed(3)},${centre[0].toFixed(3)}`;
}

/** Calls MET Norway for the point's forecast. Rejects if the call fails or takes longer than `timeoutMs`. */
export async function fetchForecast(centre: LngLat, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORECAST_RULES.timeoutMs);
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${centre[1].toFixed(2)}&lon=${centre[0].toFixed(2)}`;
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`forecast: request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

type Block = { time: number; rain: number; min: number; max: number };

/** The forecast's six-hour blocks that do not overlap, from now on. Early on it has one starting every hour. */
function blocks(json: unknown, now: number): { updated: string; list: Block[] } {
  const props = (json as { properties?: { meta?: { updated_at?: unknown }; timeseries?: unknown } })?.properties;
  const series = props?.timeseries;
  if (!Array.isArray(series)) throw new Error("forecast: invalid response");
  const list: Block[] = [];
  let free = -Infinity;
  for (const entry of series as { time?: unknown; data?: { next_6_hours?: { details?: Record<string, unknown> } } }[]) {
    const time = typeof entry?.time === "string" ? Date.parse(entry.time) : NaN;
    const d = entry?.data?.next_6_hours?.details;
    if (!Number.isFinite(time) || !d) continue;
    // A block that has already ended tells nothing about what is coming.
    if (time + SIX_HOURS <= now || time < free) continue;
    const rain = d.precipitation_amount, min = d.air_temperature_min, max = d.air_temperature_max;
    if (typeof rain !== "number" || typeof min !== "number" || typeof max !== "number") continue;
    list.push({ time, rain, min, max });
    free = time + SIX_HOURS;
  }
  if (!list.length) throw new Error("forecast: no usable forecast");
  return { updated: typeof props?.meta?.updated_at === "string" ? props.meta.updated_at : new Date(now).toISOString(), list };
}

/** Pure counting: turns MET Norway's answer into the days shown. `dayOf` says which calendar day a moment is. */
export function summariseForecast(json: unknown, now: Date = new Date(), dayOf: (time: number) => string = localDay): Forecast {
  const { updated, list } = blocks(json, now.getTime());
  const byDay = new Map<string, ForecastDay>();
  for (const b of list) {
    const date = dayOf(b.time);
    const day = byDay.get(date);
    if (!day) {
      if (byDay.size >= FORECAST_RULES.days) break;
      byDay.set(date, { date, rainMm: b.rain, minC: b.min, maxC: b.max });
    } else {
      day.rainMm += b.rain;
      day.minC = Math.min(day.minC, b.min);
      day.maxC = Math.max(day.maxC, b.max);
    }
  }
  const days = [...byDay.values()].map((d) => ({ ...d, rainMm: Math.round(d.rainMm * 10) / 10, minC: Math.round(d.minC), maxC: Math.round(d.maxC) }));
  const total = days.reduce((sum, d) => sum + d.rainMm, 0);
  const coldest = days.reduce((a, b) => (b.minC < a.minC ? b : a));
  const wettest = total < FORECAST_RULES.noRainBelowMm ? null : days.reduce((a, b) => (b.rainMm > a.rainMm ? b : a));
  const fact = (value: number, unit: string, label: string): Fact => ({
    value,
    unit,
    label,
    scale: "area",
    // A week-ahead forecast is a best guess, most of all for rain.
    confidence: "low",
    placeholder: false,
    asOf: updated.slice(0, 10),
    source: SOURCE,
  });
  return {
    updated,
    days,
    rain: fact(Math.round(total), "mm", "forecast.rain"),
    wettest,
    coldest: { fact: fact(coldest.minC, "°C", "forecast.coldest"), date: coldest.date },
    frost: coldest.minC <= FORECAST_RULES.frostAtOrBelowC,
  };
}
