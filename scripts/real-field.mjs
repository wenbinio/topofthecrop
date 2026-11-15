// Turns the team's data/field.json (made by the notebooks in ColabNotebooks/, see DATA_SOURCES.md) into the parts of the
// app's bundle that describe the field itself: its outline, what the satellites see, and its year.
// Nothing here is made up. Each figure is read from field.json; the rules applied (which months count
// as bare, when a risk icon shows, the slider's stops) live in src/data/field-rules.js, shared with the app,
// which applies the same rules to a field the farmer draws (src/data/fieldFromBasin.ts).
import { readFileSync } from "node:fs";
import {
  FINDINGS, fieldData as makeFieldData, finding, flowerHigh as makeFlowerHigh, groundCheckFrom, hotDayStops, makeSources,
  measuredSignals, moreEvidence, one, rainStops, real, risksByScenario as makeRisks, trialSoilFrom, yearMonths,
} from "../src/data/field-rules.js";

const data = JSON.parse(readFileSync(new URL("../data/field.json", import.meta.url), "utf8"));

export const sources = makeSources(data.meta.sources);

const baseline = data.greenness.baseline; // "2001-2020"
const g = data.greenness, w = data.weather, f = data.future, wt = data.water;
const future = f.periods.future; // "2041-2060"

// --- the field -------------------------------------------------------------------------------
const field = {
  id: "genzano-demo",
  name: "Genzano di Lucania",
  areaHa: data.field.area_ha,
  // The team's own outline of the trial field of Denora et al. (2025), drawn by hand on satellite imagery.
  outline: data.field.outline,
};
const lastCrop = { crop: "durum", source: sources.cropmap }; // EU crop map 2022: 95% of the field is durum

// --- the rest of the field's figures, for the evidence screens (bundle.fieldData) -------------
// Keyed as FIELD_DATA_RULES in src/data/field-rules.js, which holds each figure's unit, dataset and scale.
const years = w.seasons.map((s) => s.season); // 2001 ... 2026, named by harvest year
const bySeason = (rows, key) => years.map((year) => {
  const v = rows.find((r) => r.season === year)?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
});
const future2050 = (p) => ({
  hotDays: p.hot, flowerHigh: p.tmaxfl, frostWinter: p.frost, frostLate: p.late, rainSeason: p.rainse, rainAutumn: p.rainau,
});
const soilValue = (key) => ({ value: data.soil.values[key], range: data.soil.range_90pc[key] });

const fieldData = makeFieldData({
  own: "field", sources, baseline, smapBaseline: "2016-2025", future,
  today: {
    greenness: {
      greenUp: g.typical.greenup_day, peak: g.typical.peak_day, dryOff: g.typical.dryoff_day,
      seasonLength: g.typical.season_days, peakGreenness: g.typical.peak,
    },
    weather: {
      rainOnset: w.typical.rain_onset_day, drySpellSpring: w.typical.dry_spell_spring, frostWinter: w.typical.frost_days_winter,
      frostLate: w.typical.late_frost_days, rainSpring: w.typical.rain_spring, rainYear: w.typical.rain_year,
    },
    water: {
      soilWaterSowing: wt.typical.sm_sowing, soilWaterSpring: wt.typical.sm_spring,
      cropWaterUse: wt.typical.water_use_modis, referenceEt: wt.typical.et0_season,
    },
  },
  soil: {
    sand: soilValue("sand"), silt: soilValue("silt"), organicCarbon: soilValue("soc"), ph: soilValue("phh2o"),
    nitrogen: soilValue("nitrogen"), cec: soilValue("cec"), waterHolding: soilValue("awc"),
    bulkDensity: soilValue("bdod"), stones: soilValue("cfvo"),
  },
  land: { slope: data.field.slope_deg, height: data.field.elev_m }, // NASADEM over the field's own outline
  by2050: { ssp245: future2050(f.projected.ssp245), ssp585: future2050(f.projected.ssp585) },
  seasons: {
    years,
    series: {
      peakGreenness: bySeason(g.seasons, "peak"), dryOff: bySeason(g.seasons, "dryoff_day"),
      peakVsNearby: bySeason(g.seasons, "peak_vs_nearby_z"),
      hotDays: bySeason(w.seasons, "hot_days_flower"), rainSeason: bySeason(w.seasons, "rain_season"),
      rainAutumn: bySeason(w.seasons, "rain_autumn"),
      soilWaterSowing: bySeason(wt.seasons, "sm_sowing"), soilWaterSpring: bySeason(wt.seasons, "sm_spring"),
      cropWaterUse: bySeason(wt.seasons, "water_use_modis"), durumNeed: bySeason(wt.seasons, "durum_need"),
    },
  },
  groundCheck: groundCheckFrom(w.ground_check, sources),
  trialSoil: trialSoilFrom(data.soil.trial_reported, sources),
});

// --- what the satellites see -----------------------------------------------------------------
// MODIS greenness is 250 m, about the size of this 6.5 ha field, so it is badged "your field" and its
// resolution is shown beside it. Weather and rain come from grids of 6 km or more: "your area".
// The signals behind the diagnosis on the Why screen: the last five seasons against 2001-2020, from the season series.
const signals = measuredSignals(fieldData.seasons);
const findings = [
  finding("bare", real(g.typical.bare_months, "months", "field", sources.modis, "fair", FINDINGS.bare.factLabel, baseline), signals),
  finding("heat", real(w.typical.hot_days_flower, "days", "area", sources.era5, "fair", FINDINGS.heat.factLabel, baseline), signals),
  finding("dry", real(w.typical.rain_autumn, "mm", "area", sources.rain, "fair", FINDINGS.dry.factLabel, baseline), signals),
];

// --- the field's year ------------------------------------------------------------------------
const months = yearMonths({
  ndviMonth: g.calendar.month_ndvi,
  thresholds: g.thresholds,
  rainMonth: w.calendar.rain_month,
  frostMonth: w.calendar.frost_month,
  hot30Month: w.calendar.hot30_month,
});

const hotDays = hotDayStops({
  hot: w.typical.hot_days_flower,
  hottest: Math.max(...w.seasons.map((s) => s.hot_days_flower).filter(Number.isFinite)),
  projected245: f.projected.ssp245.hot,
  change585: f.change.ssp585.hot,
  scale: "area", sources, baseline, future,
});

const flowerHigh = makeFlowerHigh({ now: f.now.tmaxfl, by2050: f.projected.ssp245.tmaxfl, scale: "area", sources, baseline, future });

// Oct-May rain at each slider stop, the same way as the hot days: typical, 1-in-10 dry, the driest season since 2001.
const rainSeason = rainStops({
  rain: w.typical.rain_season,
  driest: Math.min(...w.seasons.map((s) => s.rain_season).filter(Number.isFinite)),
  projected245: f.projected.ssp245.rainse,
  change585: f.change.ssp585.rainse,
  scale: "area", sources, baseline, future,
});

const risksByScenario = makeRisks(months);

// --- evidence shown under "Why?" for every option ---------------------------------------------
const evidence = [
  real(g.typical.bare_months, "months", "field", sources.modis, "fair", "evidence.bareMonths", baseline),
  real(w.typical.hot_days_flower, "days", "area", sources.era5, "fair", "evidence.hotDays", baseline),
  real(w.typical.rain_season, "mm", "area", sources.rain, "fair", "evidence.rainSeason", baseline),
  real(wt.typical.durum_need, "mm", "area", sources.water, "fair", "evidence.durumNeed", baseline),
  one(data.soil.values.clay, "%", data.soil.range_90pc.clay, "field", sources.soil, "fair", "evidence.clay", "SoilGrids 2.0"),
  ...moreEvidence(fieldData), // NASA SMAP soil water in spring, NASA MODIS crop water use
];

export const realField = { field, lastCrop, findings, year: { months, risksByScenario, hotDays, flowerHigh, rainSeason }, evidence, fieldData };
