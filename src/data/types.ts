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

export type Scenario = "normal" | "drier" | "much-drier"; // the three kinds of year shown on Field year: usual, dry (1 in 10), driest since 2001
export type Priority = "income" | "water" | "soil" | "forage";
export type Limit = "no-irrigation" | "cereal-machinery" | "no-buyer" | "broomrape";
export type Signal = "rising" | "falling" | "normal" | "no-data";
/** "none": no greenness data (a drawn field over squares without usable MODIS pixels). Never in a shipped bundle. */
export type Cover = "green" | "part" | "bare" | "none";
export type Risk = "dry" | "frost" | "heat" | "rain";

/** Crop ids. Display names come from the dictionary key `crop.<id>`. */
export type CropId = "durum" | "chickpea" | "faba" | "vetch-oat" | "lentil" | "pea" | "barley" | "rapeseed" | "coriander";

export const SCENARIOS: readonly Scenario[] = ["normal", "drier", "much-drier"];
export const PRIORITIES: readonly Priority[] = ["income", "water", "soil", "forage"];
export const LIMITS: readonly Limit[] = ["no-irrigation", "cereal-machinery", "no-buyer", "broomrape"];
export const CROPS: readonly CropId[] = ["durum", "chickpea", "faba", "vetch-oat", "lentil", "pea", "barley", "rapeseed", "coriander"];
/** Legumes: grown twice running they build up disease, so an option that starts with the last crop is left out. */
export const LEGUMES: readonly CropId[] = ["chickpea", "faba", "lentil", "pea", "vetch-oat"];
/** The farmer's answer to "Last crop": a crop id, or "other" with its name typed in `lastCropName`. */
export type LastCrop = CropId | "other";
/** Longest typed name for an "other" last crop, in characters, after trimming. */
export const LAST_CROP_NAME_MAX = 30;

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
  /**
   * Strip intercropping: a second sequence grown beside the first. Each takes half the field, in strips wide enough
   * for the drill and the combine, and the two swap places every year. Each strip is an ordinary sole crop, so every
   * figure of the option is the average of the two sequences; no gain from growing them side by side is counted.
   * A year in which both sequences have the same crop is an ordinary year with one crop on the whole field, so a
   * rotation can intercrop in some years and not in others.
   */
  strips?: [CropId, CropId, CropId];
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

/** The sequences an option grows: one, or two side by side when it is a strip intercrop. */
export function sequencesOf(option: Pick<Option, "sequence" | "strips">): CropId[][] {
  return option.strips ? [option.sequence, option.strips] : [option.sequence];
}

export type FieldBundle = {
  field: {
    id: string;
    name: string;
    areaHa: number;
    outline: Polygon;
    /** Only on a drawn field's bundle, built in the app from the basin's 1 km squares (src/data/fieldFromBasin.ts). */
    basin?: { farmlandShare: number; squares: number };
  };
  /**
   * What the crop map says was grown last. `appDefault`: no data says so (a drawn field whose squares are under
   * half durum on the crop map); `crop` is then the app's default and `source` is not shown.
   */
  lastCrop: { crop: CropId; source: Source; appDefault?: boolean };
  findings: Finding[]; // exactly three in a shipped bundle; a drawn field leaves out any without data
  year: {
    months: Month[]; // exactly twelve, October first
    /** Risk icons per month for a slider stop, twelve lists, October first. A missing stop uses `months`. */
    risksByScenario?: Partial<Record<Scenario, Risk[][]>>;
    hotDays: Record<Scenario, { now: Fact; by2050: Fact }>;
    /** The usual daytime high (°C) from 15 April to 15 June, now and by 2050. Shown beside what counts as a hot day. */
    flowerHigh?: { now: Fact; by2050: Fact };
    /**
     * Oct-May rain (mm) at each slider stop, now and by 2050, built like `hotDays` (src/data/field-rules.js `rainStops`):
     * normal a typical season, drier a 1-in-10 dry season, much-drier the driest season since 2001.
     */
    rainSeason?: Record<Scenario, { now: Fact; by2050: Fact }>;
  };
  options: Option[]; // 3 to 12, exactly one with isCurrent
  economics?: Economics; // prices, yields, costs and support behind the income figures
  /** The rest of the data team's figures for this field, for the evidence screens. The soil group is shown on Options ("Your soil"); most of the rest is not shown yet. */
  fieldData?: FieldData;
};

/** Keys of each group in `FieldData`. A key is left out where the data has no value (null), never set to 0. */
export const FIELD_DATA_KEYS = {
  greenness: ["greenUp", "peak", "dryOff", "seasonLength", "peakGreenness"],
  weather: ["rainOnset", "drySpellSpring", "frostWinter", "frostLate", "rainSpring", "rainYear"],
  water: ["soilWaterSowing", "soilWaterSpring", "cropWaterUse", "referenceEt"],
  soil: ["sand", "silt", "organicCarbon", "ph", "nitrogen", "cec", "waterHolding", "bulkDensity", "stones"],
  land: ["slope", "height"],
  by2050: ["hotDays", "flowerHigh", "frostWinter", "frostLate", "rainSeason", "rainAutumn"],
  series: [
    "peakGreenness", "dryOff", "peakVsNearby", "hotDays", "rainSeason", "rainAutumn",
    "soilWaterSowing", "soilWaterSpring", "cropWaterUse", "durumNeed",
  ],
  trialSoil: ["ph", "nitrogen", "cec"],
} as const;
export type FieldDataKey<G extends keyof typeof FIELD_DATA_KEYS> = (typeof FIELD_DATA_KEYS)[G][number];

/** The climate model scenarios: the middle emissions path (SSP2-4.5) and the high one (SSP5-8.5). */
export const CLIMATE_SCENARIOS = ["ssp245", "ssp585"] as const;
export type ClimateScenario = (typeof CLIMATE_SCENARIOS)[number];

/** The months a ground-check total covers. The trial paper does not say which, so the data shows three. */
export const CHECK_WINDOWS = ["oct-may", "nov-jun", "sowing-harvest"] as const;
export type CheckWindow = (typeof CHECK_WINDOWS)[number];

/**
 * One value per season, lined up with `FieldData["seasons"].years` (a season is named by its harvest year:
 * 2024 runs from September 2023 to August 2024). null: no data that season. Carries the same source,
 * scale and confidence as a Fact, so no bare number reaches a screen.
 */
export type Series = {
  values: (number | null)[];
  unit?: string;
  scale: Scale;
  source: Source;
  confidence: Confidence;
  label: string; // dictionary key
  placeholder: boolean;
};

/**
 * The data team's figures beyond the findings and the year strip (src/data/field-rules.js `fieldData`).
 * Day numbers (unit "dayOfSeason") count from 1 September. Ranges are the 10th to 90th percentile over
 * 2001-2020 (SMAP soil water: 2016-2025; by 2050: across the 29 climate models; soil: within the 1 km area,
 * or SoilGrids' own prediction range on the demo field).
 */
export type FieldData = {
  greenness: Partial<Record<FieldDataKey<"greenness">, Fact>>;
  weather: Partial<Record<FieldDataKey<"weather">, Fact>>;
  water: Partial<Record<FieldDataKey<"water">, Fact>>;
  soil: Partial<Record<FieldDataKey<"soil">, Fact>>;
  land: Partial<Record<FieldDataKey<"land">, Fact>>;
  /** Values by 2041-2060: today's typical value plus each climate model's change. */
  by2050: Record<ClimateScenario, Partial<Record<FieldDataKey<"by2050">, Fact>>>;
  seasons: { years: number[]; series: Partial<Record<FieldDataKey<"series">, Series>> };
  /** Demo field only: satellite rain and ERA5-Land temperature against the trial's own weather station. */
  groundCheck?: {
    rain: { season: string; window: CheckWindow; station: Fact; satellites: Fact }[];
    temperature: { season: string; window: CheckWindow; station: Fact; era5Land: Fact }[];
  };
  /** Demo field only: the soil the trial measured (Denora et al. 2025), beside SoilGrids' prediction. */
  trialSoil?: Partial<Record<FieldDataKey<"trialSoil">, Fact>>;
};

/** Live weather for a field that has no bundle. All three facts are scale "area". */
export type AreaWeather = {
  years: [number, number]; // [2001, 2025]
  hotDaysAtFlowering: Fact;
  autumnRain: Fact;
  lateFrostDays: Fact;
  /** NASA POWER rain months left out of the counts as impossible (POWER_BAD_RAIN_MONTHS in src/weather/weather.ts), YYYYMM. */
  rainLeftOut?: string[];
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
/** The id of a bundle built in the app for a field the farmer drew. */
export const DRAWN_FIELD_ID = "drawn";

/** Everything the shared link carries. */
export type AppState = {
  fieldId: string | null; // DEMO_FIELD_ID, or null when the farmer drew a field
  outline: LngLat[] | null; // drawn field: open ring, at most 12 points, 5 decimals
  lastCrop: LastCrop;
  lastCropName: string; // the typed name when lastCrop is "other", trimmed, at most LAST_CROP_NAME_MAX; otherwise ""
  limits: Limit[];
  priorities: Priority[]; // zero to four, most important first
  /**
   * Whether strip intercrops are ranked with the other rotations. Off until the farmer asks on the Options screen:
   * they are a stand-in nobody here has tried, so they must not become the first advice unasked.
   */
  intercrops: boolean;
  view: View;
  lang: Lang;
  money: Money; // the farmer's own prices and support, where they differ from the bundle's
  extras: ExtraSupport[]; // payments the farmer added that the bundle does not know, at most MAX_EXTRAS
  /** The farmer's own soil, where they corrected the soil map: their kind of ground, and a pH from a soil test. */
  soilWeight: "heavy" | "medium" | "light" | null;
  soilPh: number | null;
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
  /**
   * How much more grain durum gives after this crop, in percent: the first entry for the durum harvest straight
   * after it, the second (if any) for a second durum harvest in a row. Left out for crops with no sourced figure.
   */
  durumAfter?: Fact[];
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

/**
 * Everything behind the income figure. Optional: without it the app shows each option's `facts.income` as given.
 * `crops` covers every crop any option grows; it need not hold all of CROPS.
 */
export type Economics = {
  crops: Partial<Record<CropId, CropEconomics>>;
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
  lastCropName: "",
  limits: [],
  priorities: [],
  intercrops: false,
  view: "standard",
  lang: "en",
  money: {},
  extras: [],
  soilWeight: null,
  soilPh: null,
};
