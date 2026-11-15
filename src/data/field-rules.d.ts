// Types for field-rules.js (shared with scripts/real-field.mjs, so it stays plain JavaScript).
import type { ClimateScenario, Fact, FieldData, FieldDataKey, Finding, Month, Risk, Scale, Scenario, Signal, Signals, Source } from "./types";

/** [low, typical, high] */
export type Triple = [number, number, number];

export const OCT_FIRST: number[];

export type FieldSources = Record<
  | "modis" | "era5" | "rain" | "cmip6" | "cropmap" | "water" | "soil"
  | "dailyRain" | "smap" | "modisEt" | "et0" | "soilWater" | "nasadem" | "station" | "trial",
  Source
>;
export function makeSources(S: Record<string, { res_m: number }>): FieldSources;

export function real(triple: Triple, unit: string, scale: Scale, src: Source, confidence: Fact["confidence"], label?: string, asOf?: string): Fact;
export function one(value: number, unit: string, range: [number, number] | undefined, scale: Scale, src: Source, confidence: Fact["confidence"], label?: string, asOf?: string): Fact;

export type FindingKind = "bare" | "heat" | "dry";
export const FINDINGS: Record<FindingKind, Omit<Finding, "fact" | "signals"> & { factLabel: string }>;
export function finding(kind: FindingKind, fact: Fact, signals: Signals, detail?: string): Finding;

export function yearMonths(input: {
  ndviMonth: Triple[] | null;
  thresholds: { green: number; bare: number };
  rainMonth: Triple[];
  frostMonth: Triple[];
  hot30Month: Triple[];
}): Month[];

export function risksByScenario(months: Month[]): Partial<Record<Scenario, Risk[][]>>;

export function hotDayStops(input: {
  hot: Triple;
  hottest: number;
  projected245: Triple;
  change585: Triple;
  scale: Scale;
  sources: FieldSources;
  baseline: string;
  future: string;
}): Record<Scenario, { now: Fact; by2050: Fact }>;

export function flowerHigh(input: {
  now: Triple;
  by2050: Triple;
  scale: Scale;
  sources: FieldSources;
  baseline: string;
  future: string;
}): { now: Fact; by2050: Fact };

/** A [low, typical, high] or a by-season list as it comes from the data: any value may be null (no data). */
type Maybe = readonly (number | null)[] | null | undefined;

export type FieldDataRule = { unit?: string; src?: keyof FieldSources; digits: number; own?: boolean; confidence?: Fact["confidence"]; smap?: boolean };
export const FIELD_DATA_RULES: {
  [G in "greenness" | "weather" | "water" | "soil" | "land" | "by2050" | "series"]: Record<FieldDataKey<G>, FieldDataRule>;
};

export function fieldData(input: {
  own: Scale;
  sources: FieldSources;
  baseline: string;
  smapBaseline: string;
  future: string;
  today: {
    greenness: Partial<Record<FieldDataKey<"greenness">, Maybe>>;
    weather: Partial<Record<FieldDataKey<"weather">, Maybe>>;
    water: Partial<Record<FieldDataKey<"water">, Maybe>>;
  };
  soil: Partial<Record<FieldDataKey<"soil">, { value: number | null | undefined; range?: Maybe } | null | undefined>>;
  land: Partial<Record<FieldDataKey<"land">, number | null | undefined>>;
  by2050: Record<ClimateScenario, Partial<Record<FieldDataKey<"by2050">, Maybe>>>;
  seasons: { years: readonly number[]; series: Partial<Record<FieldDataKey<"series">, Maybe>> };
  groundCheck?: FieldData["groundCheck"];
  trialSoil?: FieldData["trialSoil"];
}): FieldData;

export function groundCheckFrom(raw: unknown, sources: FieldSources): FieldData["groundCheck"];
export function trialSoilFrom(text: unknown, sources: FieldSources): NonNullable<FieldData["trialSoil"]>;

export const SIGNAL_RULES: { recent: number; normal: [number, number]; minNormal: number; minRecent: number; low: number; high: number };
export function seasonSignal(years: readonly number[], values: readonly (number | null)[] | null | undefined): Signal;
export function measuredSignals(seasons: FieldData["seasons"] | undefined): Signals;

export function rainStops(input: {
  rain: Triple;
  driest: number;
  projected245: Triple;
  change585: Triple;
  scale: Scale;
  sources: FieldSources;
  baseline: string;
  future: string;
}): Record<Scenario, { now: Fact; by2050: Fact }>;
