// Types for field-rules.js (shared with scripts/real-field.mjs, so it stays plain JavaScript).
import type { Fact, Finding, Month, Risk, Scale, Scenario, Source } from "./types";

/** [low, typical, high] */
export type Triple = [number, number, number];

export const OCT_FIRST: number[];

export type FieldSources = Record<"modis" | "era5" | "rain" | "cmip6" | "cropmap" | "water" | "soil", Source>;
export function makeSources(S: Record<string, { res_m: number }>): FieldSources;

export function real(triple: Triple, unit: string, scale: Scale, src: Source, confidence: Fact["confidence"], label?: string, asOf?: string): Fact;
export function one(value: number, unit: string, range: [number, number] | undefined, scale: Scale, src: Source, confidence: Fact["confidence"], label?: string, asOf?: string): Fact;

export type FindingKind = "bare" | "heat" | "dry";
export const FINDINGS: Record<FindingKind, Omit<Finding, "fact"> & { factLabel: string }>;
export function finding(kind: FindingKind, fact: Fact, detail?: string): Finding;

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
