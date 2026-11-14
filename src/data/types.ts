// The data contract. The README section "The data contract" is the source of truth;
// fields may be added here but not renamed.
import type { Polygon } from "geojson";

export type Confidence = "good" | "fair" | "low";
export type Scale = "field" | "area";
export type Level = "low" | "medium" | "high";

export type Source = { dataset: string; resolution: string; url: string };

export type Fact = {
  /** A number, or a Level id ("low" | "medium" | "high") shown through the dictionary. */
  value: number | string;
  unit?: string; // "€/ha", "kg N/ha", "days", "mm"
  range?: [number, number];
  scale: Scale;
  source: Source;
  confidence: Confidence;
  asOf?: string; // date of the prices or data, where it matters ("2026-10")
  label?: string; // dictionary key naming what the number is, for lists of facts
  edited?: boolean; // true when the farmer's own figures in Settings changed this number
  placeholder: boolean; // true until real data replaces it
};

export type Scenario = "normal" | "drier" | "much-drier"; // the three slider stops
export type Priority = "income" | "water" | "soil" | "forage";
export type Limit = "no-irrigation" | "cereal-machinery" | "no-buyer" | "broomrape";
export type Signal = "rising" | "falling" | "normal" | "no-data";
export type Cover = "green" | "part" | "bare";
export type Risk = "dry" | "frost" | "heat" | "rain";

/** Crop ids. Display names come from the dictionary key `crop.<id>`. */
export type CropId = "durum" | "chickpea" | "faba" | "vetch-oat";

export const SCENARIOS: readonly Scenario[] = ["normal", "drier", "much-drier"];
export const PRIORITIES: readonly Priority[] = ["income", "water", "soil", "forage"];
export const LIMITS: readonly Limit[] = ["no-irrigation", "cereal-machinery", "no-buyer", "broomrape"];
export const CROPS: readonly CropId[] = ["durum", "chickpea", "faba", "vetch-oat"];

export type Signals = { greenness: Signal; temperature: Signal; waterUse: Signal };

export type Finding = {
  title: string; // dictionary key
  detail: string; // dictionary key
  fact: Fact;
  signals: Signals;
  weatherDriven: boolean;
  /** True when the field is bare on purpose (after harvest). The signals then look like decline but are not. */
  expectedBare?: boolean;
  addressedBy: string[]; // ids of the options that respond to this finding
};

export type Month = { cover: Cover; risks: Risk[] };

export type Option = {
  id: string; // "chickpea-durum-durum"
  isCurrent: boolean;
  sequence: [CropId, CropId, CropId]; // the next three harvests, in order
  firstHarvestYear: number; // 2027 for the demo field
  /** Each fact covers the whole sequence; income is the average gross margin per year. */
  facts: { income: Fact; water: Fact; nitrogen: Fact; risk: Fact };
  scores: Record<Scenario, Record<Priority, number>>; // 0 to 1
  removedBy: Limit[]; // limits that take this option out
  flaggedBy: Limit[]; // limits that keep it but add a warning
  supportTag: boolean;
  why: {
    suggested: string; // dictionary key
    evidence: Fact[];
    benefits: Fact[];
    unknowns: string[]; // dictionary keys
    checkLocally: string[]; // dictionary keys
  };
};

export type FieldBundle = {
  field: { id: string; name: string; areaHa: number; outline: Polygon };
  lastCrop: { crop: CropId; source: Source };
  findings: Finding[]; // exactly three
  year: {
    months: Month[]; // exactly twelve, October first
    /** Risk icons per month for a slider stop, twelve lists, October first. A missing stop uses `months`. */
    risksByScenario?: Partial<Record<Scenario, Risk[][]>>;
    hotDays: Record<Scenario, { now: Fact; by2050: Fact }>;
  };
  options: Option[]; // exactly four, exactly one with isCurrent
  economics?: Economics; // prices, yields, costs and support behind the income figures
};

/** Live weather for a field that has no bundle. All three facts are scale "area". */
export type AreaWeather = {
  years: [number, number]; // [2001, 2025]
  hotDaysAtFlowering: Fact;
  autumnRain: Fact;
  lateFrostDays: Fact;
};

/** Daily series keyed "YYYYMMDD", as NASA POWER returns them. -999 means missing. */
export type DailyWeather = {
  tmax: Record<string, number>; // °C
  tmin: Record<string, number>; // °C
  rain: Record<string, number>; // mm/day
};

/** [longitude, latitude] */
export type LngLat = [number, number];

export type View = "standard" | "simple";
export type Lang = "en" | "it";

export const DEMO_FIELD_ID = "genzano-demo";

/** Everything the shared link carries. */
export type AppState = {
  fieldId: string | null; // DEMO_FIELD_ID, or null when the farmer drew a field
  outline: LngLat[] | null; // drawn field: open ring, at most 12 points, 5 decimals
  lastCrop: CropId;
  limits: Limit[];
  priorities: Priority[]; // zero to two, in the order chosen
  scenario: Scenario;
  view: View;
  lang: Lang;
  money: Money; // the farmer's own prices and support, where they differ from the bundle's
  extras: ExtraSupport[]; // payments the farmer added that the bundle does not know, at most MAX_EXTRAS
};

/** A payment the farmer added in Settings. Always on; paid in the years the field grows one of `crops` (empty: every year). */
export type ExtraSupport = { name: string; amount: number; crops: CropId[] };

/** The most added payments the link carries. */
export const MAX_EXTRAS = 3;

/** Bounds for an added payment: its name (trimmed) in characters, its amount in €/ha. */
export const EXTRA_LIMITS = { name: 30, amount: [0, 2000] } as const;

/** Text written by the data team, in both languages (support names and conditions come from policy documents). */
export type LocalText = { en: string; it: string };

/** What one crop earns and costs on one hectare in one year. */
export type CropEconomics = {
  yield: Fact; // t/ha
  price: Fact; // €/t
  costs: Fact; // €/ha, direct costs: seed, fertiliser, fuel, contractors
};

/** One public payment the farmer may receive. */
export type SupportItem = {
  id: string; // short kebab-case, "coupled-durum"
  name: LocalText;
  condition: LocalText; // one sentence: who qualifies
  level: "eu" | "italy" | "basilicata";
  amount: Fact; // €/ha, paid for each hectare-year it applies to
  crops: CropId[]; // paid in the years the field grows one of these; empty means every year
  options: string[]; // only for these rotations (option ids); empty means any rotation
  defaultOn: boolean; // switched on until the farmer says otherwise
};

/** Everything behind the income figure. Optional: without it the app shows each option's `facts.income` as given. */
export type Economics = {
  crops: Record<CropId, CropEconomics>;
  support: SupportItem[];
};

/**
 * The farmer's own figures, by key, only where they differ from the bundle:
 * `p.<crop>` price in €/t, `s.<support id>` amount in €/ha, `on.<support id>` 1 or 0.
 */
export type Money = Record<string, number>;

export const DEFAULT_STATE: AppState = {
  fieldId: null,
  outline: null,
  lastCrop: "durum",
  limits: [],
  priorities: [],
  scenario: "normal",
  view: "standard",
  lang: "en",
  money: {},
  extras: [],
};
