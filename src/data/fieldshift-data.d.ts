// Types for Edison's fieldshift-data.js (kept as delivered). Only what the app reads is typed closely.
import type { Feature, FeatureCollection, Polygon } from "geojson";

/** [low, typical, high]; any of them null where there is no data. */
export type Triple = [number | null, number | null, number | null];

export type Greenness = {
  ndvi_month: Triple[];
  bare_months: Triple;
  peak_ndvi: Triple;
  peak_day: Triple;
  greenup_day: Triple;
  dryoff_day: Triple;
  season_days: Triple;
  [key: string]: unknown;
};
export type Weather = {
  rain_month: Triple[];
  tmax_month: Triple[];
  tmin_month: Triple[];
  hot30_month: Triple[];
  frost_month: Triple[];
  rain_autumn: Triple;
  rain_season: Triple;
  hot_days_flower: Triple;
  tmax_flower: Triple;
  frost_days_winter: Triple;
  late_frost_days: Triple;
  hot_days_flower_by_season: (number | null)[];
  [key: string]: unknown;
};
export type Water = { durum_need: Triple; et0_season: Triple; aet_season: Triple; [key: string]: unknown };
export type FutureChange = Record<"ssp245" | "ssp585", Record<"hot" | "tmaxfl" | "frost" | "late" | "rainse" | "rainau", Triple>>;
export type Soil = Record<"clay" | "sand" | "silt" | "soc" | "phh2o" | "bdod" | "cfvo" | "nitrogen" | "cec" | "awc", Triple>;

export type SquareValues = {
  greenness: Greenness | null;
  weather: Weather | null;
  water: Water | null;
  futureChange: FutureChange | null;
  soil: Soil | null;
};

export type OutlineValues = SquareValues & {
  squares: { id: string; m2: number }[];
  fieldHa: number;
  farmlandShare: number;
};

export type SquareProps = { lon: number; lat: number; durum22: number; durum18: number; farm: boolean; [key: string]: unknown };
export type SourceMeta = { name: string; res_m: number; licence?: string; cite?: string; ee_id?: string };
type CellsFile = { meta: { sources: Record<string, SourceMeta>; indicators?: Record<string, unknown>; [key: string]: unknown }; cells: Record<string, unknown>; records?: Record<string, unknown> };

export type BasinData = {
  index: unknown;
  grid: FeatureCollection<Polygon, SquareProps>;
  area: FeatureCollection;
  field: { meta: { sources: Record<string, SourceMeta> }; [key: string]: unknown };
  cells_greenness: CellsFile & { meta: { thresholds: { green: number; bare: number } } };
  cells_weather: CellsFile & { meta: { seasons: number[] } };
  cells_water: CellsFile;
  cells_future: CellsFile;
  cells_soil: CellsFile;
  farmSquares: Feature<Polygon, SquareProps>[];
  squareBox: Map<string, [number, number, number, number]>;
  seasons: number[];
};

export function loadData(base?: string, getJson?: (url: string) => Promise<unknown>): Promise<BasinData>;
export function squareValues(d: BasinData, id: string): SquareValues;
export function squareAt(d: BasinData, lon: number, lat: number): string | null;
export function squaresUnder(d: BasinData, outline: Polygon | Feature<Polygon>): { hits: { id: string; m2: number }[]; fieldM2: number; farmlandShare: number };
export function outlineValues(d: BasinData, outline: Polygon | Feature<Polygon>): OutlineValues | null;
export const FUTURE_KEYS: Record<string, string>;
export function projected(values: Pick<SquareValues, "weather" | "futureChange">, scenario?: "ssp245" | "ssp585"): Record<
  "hot_days_flower" | "tmax_flower" | "frost_days_winter" | "late_frost_days" | "rain_season" | "rain_autumn",
  [number, number, number] | null
>;
export function dayToDate(day: number | null, season?: number): Date | null;
export const FARM_MONTHS: string[];
export function farmingYear<T>(monthly: T[] | null): T[] | null;
export function howOften<T>(bySeason: (T | null)[] | null, test: (v: T) => boolean): { count: number; of: number };
export function sourcesFor(d: BasinData, file: string, key: string): (SourceMeta & { id: string })[];
