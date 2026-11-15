// A bundle for a field the farmer drew, built in the browser from the basin's 1 km squares (data/cells_*.json)
// with the same rules as the demo field (src/data/field-rules.js, shared with scripts/real-field.mjs).
// Every figure is for the 1 km area around the field: scale "area", never "field". A part with no data
// (null in the data) is left out, never turned into 0. Crop figures (options, economics) are regional and are
// copied from the demo bundle; only each option's evidence becomes the drawn field's.
// Written with AI assistance (Claude, Anthropic).
import type { Polygon } from "geojson";
import type { Fact, FieldBundle, Finding } from "./types";
import { DRAWN_FIELD_ID } from "./types";
import { AREA_UNKNOWN } from "./caveats";
import { fieldData, finding, flowerHigh, hotDayStops, makeSources, measuredSignals, rainStops, real, risksByScenario, yearMonths } from "./field-rules.js";
import type { Triple } from "./field-rules.js";
import { projected } from "./fieldshift-data.js";
import type { BasinData, OutlineValues, SquareProps, Triple as MaybeTriple } from "./fieldshift-data.js";

/** The crop map's durum share at or above which the last crop is taken to be durum. */
export const DURUM_SHARE = 0.5;

const BASELINE = "2001-2020";
const SMAP_BASELINE = "2016-2025"; // SMAP starts in spring 2015
const FUTURE = "2041-2060";

/** A [low, typical, high] with all three numbers, or null. Averaging can leave nulls where squares have no data. */
function full(t: MaybeTriple | null | undefined, digits = 1): Triple | null {
  if (!Array.isArray(t) || t.length !== 3 || !t.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const k = 10 ** digits;
  return (t as number[]).map((n) => Math.round(n * k) / k) as Triple;
}
function months(list: MaybeTriple[] | null | undefined): Triple[] | null {
  if (!Array.isArray(list) || list.length !== 12) return null;
  const out = list.map((t) => full(t, 2));
  return out.every((t) => t !== null) ? (out as Triple[]) : null;
}

/** A grid property of the squares under the outline, weighted by overlap like the values; null if none has it. */
export function squareMean(d: BasinData, values: OutlineValues, key: keyof SquareProps): number | null {
  const props = new Map(d.farmSquares.map((f) => [String(f.id), f.properties]));
  let sum = 0, weight = 0;
  for (const { id, m2 } of values.squares) {
    const v = props.get(id)?.[key];
    if (typeof v === "number" && Number.isFinite(v)) { sum += v * m2; weight += m2; }
  }
  return weight ? sum / weight : null;
}

/** The outline's crop-map durum share (2022), weighted by overlap like the values. */
export function durumShare(d: BasinData, values: OutlineValues): number {
  return squareMean(d, values, "durum22") ?? 0;
}

/** A [low, typical, high] as the middle value and its 10th to 90th percentile range, for `fieldData`'s soil. */
const spread = (t: MaybeTriple | null | undefined) => (t ? { value: t[1], range: [t[0], t[2]] } : null);

/** The rest of the drawn field's figures (bundle.fieldData), by the rules the demo field uses. All scale "area". */
function drawnFieldData(d: BasinData, values: OutlineValues, sources: ReturnType<typeof makeSources>) {
  const g = values.greenness, w = values.weather, water = values.water, soil = values.soil;
  const later = (scenario: "ssp245" | "ssp585") => {
    const p = projected(values, scenario);
    return {
      hotDays: p.hot_days_flower, flowerHigh: p.tmax_flower, frostWinter: p.frost_days_winter,
      frostLate: p.late_frost_days, rainSeason: p.rain_season, rainAutumn: p.rain_autumn,
    };
  };
  return fieldData({
    own: "area",
    // MODIS water use (500 m) and NASADEM (30 m) are averaged over each 1 km square, like MODIS greenness.
    sources: {
      ...sources,
      modisEt: { ...sources.modisEt, resolution: `${sources.modisEt.resolution}, 1 km mean` },
      nasadem: { ...sources.nasadem, resolution: `${sources.nasadem.resolution}, 1 km mean` },
    },
    baseline: BASELINE, smapBaseline: SMAP_BASELINE, future: FUTURE,
    today: {
      greenness: {
        greenUp: g?.greenup_day, peak: g?.peak_day, dryOff: g?.dryoff_day,
        seasonLength: g?.season_days, peakGreenness: g?.peak_ndvi,
      },
      weather: {
        rainOnset: w?.rain_onset_day, drySpellSpring: w?.dry_spell_spring, frostWinter: w?.frost_days_winter,
        frostLate: w?.late_frost_days, rainSpring: w?.rain_spring, rainYear: w?.rain_year,
      },
      water: {
        soilWaterSowing: water?.sm_sowing, soilWaterSpring: water?.sm_spring,
        cropWaterUse: water?.aet_season, referenceEt: water?.et0_season,
      },
    },
    soil: {
      sand: spread(soil?.sand), silt: spread(soil?.silt), organicCarbon: spread(soil?.soc), ph: spread(soil?.phh2o),
      nitrogen: spread(soil?.nitrogen), cec: spread(soil?.cec), waterHolding: spread(soil?.awc),
      bulkDensity: spread(soil?.bdod), stones: spread(soil?.cfvo),
    },
    land: { slope: squareMean(d, values, "slope_deg"), height: squareMean(d, values, "elev_m") },
    by2050: { ssp245: later("ssp245"), ssp585: later("ssp585") },
    seasons: {
      years: d.cells_weather.meta.seasons,
      series: {
        peakGreenness: g?.peak_by_season, dryOff: g?.dryoff_by_season,
        hotDays: w?.hot_days_flower_by_season, rainSeason: w?.rain_season_by_season, rainAutumn: w?.rain_autumn_by_season,
        soilWaterSowing: water?.sm_sowing_by_season, soilWaterSpring: water?.sm_spring_by_season,
        cropWaterUse: water?.aet_by_season, durumNeed: water?.durum_need_by_season,
      },
    },
  });
}

/**
 * The bundle for a drawn outline, or null when the squares lack the weather or the climate change it needs
 * (the year strip and the slider cannot be built without them; the app then shows live weather instead).
 */
export function fieldFromBasin(
  d: BasinData,
  values: OutlineValues,
  demo: FieldBundle,
  outline: Polygon,
  name: string,
): FieldBundle | null {
  const w = values.weather;
  const change = values.futureChange;
  if (!w || !change) return null;
  const rainMonth = months(w.rain_month), frostMonth = months(w.frost_month), hot30Month = months(w.hot30_month);
  const hot = full(w.hot_days_flower);
  const later = projected(values, "ssp245");
  const hot245 = full(later.hot_days_flower);
  const change585 = full(change.ssp585?.hot);
  const tmax = full(w.tmax_flower);
  const tmax245 = full(later.tmax_flower);
  if (!rainMonth || !frostMonth || !hot30Month || !hot || !hot245 || !change585 || !tmax || !tmax245) return null;

  const base = makeSources(d.field.meta.sources);
  // MODIS pixels are 250 m, but here they are averaged over each 1 km square.
  const sources = { ...base, modis: { ...base.modis, resolution: "250 m, 1 km mean" } };
  const g = values.greenness;
  const bare = full(g?.bare_months);
  const autumn = full(w.rain_autumn, 0);
  const season = full(w.rain_season, 0);
  const need = full(values.water?.durum_need, 0);
  const clay = full(values.soil?.clay, 0);

  // The rest of the figures, and from their season series the signals behind the diagnosis on the Why screen.
  const extra = drawnFieldData(d, values, sources);
  const signals = measuredSignals(extra.seasons);

  const findings: Finding[] = [];
  if (bare) findings.push(finding("bare", real(bare, "months", "area", sources.modis, "fair", "finding.bare.fact", BASELINE), signals, "finding.bare.detailArea"));
  findings.push(finding("heat", real(hot, "days", "area", sources.era5, "fair", "finding.heat.fact", BASELINE), signals, "finding.heat.detailArea"));
  if (autumn) findings.push(finding("dry", real(autumn, "mm", "area", sources.rain, "fair", "finding.dry.fact", BASELINE), signals, "finding.dry.detailArea"));

  const evidence: Fact[] = [];
  if (bare) evidence.push(real(bare, "months", "area", sources.modis, "fair", "evidence.bareMonths", BASELINE));
  evidence.push(real(hot, "days", "area", sources.era5, "fair", "evidence.hotDays", BASELINE));
  if (season) evidence.push(real(season, "mm", "area", sources.rain, "fair", "evidence.rainSeason", BASELINE));
  if (need) evidence.push(real(need, "mm", "area", sources.water, "fair", "evidence.durumNeed", BASELINE));
  if (clay) evidence.push(real(clay, "%", "area", sources.soil, "fair", "evidence.clay", "SoilGrids 2.0"));

  const yearList = yearMonths({
    ndviMonth: months(g?.ndvi_month),
    thresholds: d.cells_greenness.meta.thresholds,
    rainMonth, frostMonth, hot30Month,
  });
  const known = (list: (number | null)[] | undefined) => (list ?? []).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const bySeason = known(w.hot_days_flower_by_season);
  // The hottest season: the most hot days in any of the 26 seasons (averaged over the squares under the outline).
  const hottest = bySeason.length ? Math.round(Math.max(...bySeason) * 10) / 10 : hot[2];
  // Oct-May rain at each slider stop: typical, 1-in-10 dry (the 10th percentile), the driest season since 2001.
  const rainBySeason = known(w.rain_season_by_season);
  const rain245 = full(later.rain_season, 0), rainChange585 = full(change.ssp585?.rainse);
  const rainSeason = season && rain245 && rainChange585
    ? rainStops({
        rain: season, driest: rainBySeason.length ? Math.min(...rainBySeason) : season[0], projected245: rain245,
        change585: rainChange585, scale: "area", sources, baseline: BASELINE, future: FUTURE,
      })
    : undefined;

  return {
    field: {
      id: DRAWN_FIELD_ID,
      name,
      areaHa: Math.round(values.fieldHa * 10) / 10,
      outline,
      basin: { farmlandShare: values.farmlandShare, squares: values.squares.length },
    },
    lastCrop: durumShare(d, values) >= DURUM_SHARE
      ? { crop: "durum", source: sources.cropmap }
      : // Under half durum: the crop map does not say; keep the app's default (DEFAULT_STATE.lastCrop) and show no source.
        { crop: "durum", source: sources.cropmap, appDefault: true },
    findings,
    year: {
      months: yearList,
      risksByScenario: risksByScenario(yearList),
      hotDays: hotDayStops({ hot, hottest, projected245: hot245, change585, scale: "area", sources, baseline: BASELINE, future: FUTURE }),
      flowerHigh: flowerHigh({ now: tmax, by2050: tmax245, scale: "area", sources, baseline: BASELINE, future: FUTURE }),
      ...(rainSeason ? { rainSeason } : {}),
    },
    options: demo.options.map((option) => ({
      ...option,
      why: {
        ...option.why,
        evidence,
        unknowns: option.why.unknowns.includes(AREA_UNKNOWN) ? option.why.unknowns : [...option.why.unknowns, AREA_UNKNOWN],
      },
    })),
    ...(demo.economics ? { economics: demo.economics } : {}),
    fieldData: extra,
  };
}

/** A drawn open ring as a closed GeoJSON polygon. */
export function ringPolygon(ring: [number, number][]): Polygon {
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
}
