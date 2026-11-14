// Turns the team's data/field.json (made by the notebooks in ColabNotebooks/, see DATA_SOURCES.md) into the parts of the
// app's bundle that describe the field itself: its outline, what the satellites see, and its year.
// Nothing here is made up. Each figure is read from field.json; where a rule is applied (which months count
// as bare, when a risk icon shows) the rule is written out below so the team can correct it.
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("../data/field.json", import.meta.url), "utf8"));
const S = data.meta.sources;

const km = (m) => (m >= 1000 ? `about ${Math.round(m / 1000)} km` : `${m} m`);
export const sources = {
  modis: { dataset: "NASA MODIS (MOD13Q1)", resolution: "250 m", url: "https://doi.org/10.5067/MODIS/MOD13Q1.061" },
  era5: { dataset: "ERA5-Land (NASA POWER check)", resolution: km(S.era5_land.res_m), url: "https://doi.org/10.24381/cds.e2161bac" },
  rain: { dataset: "CHIRPS + NASA GPM + ERA5-Land", resolution: "6 to 11 km", url: "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07" },
  cmip6: { dataset: "NASA NEX-GDDP-CMIP6", resolution: km(S.nex_gddp_cmip6.res_m), url: "https://doi.org/10.1038/s41597-022-01393-4" },
  cropmap: { dataset: "EU crop map 2022 (JRC)", resolution: km(S.eucropmap.res_m), url: "https://doi.org/10.1038/s41597-024-03884-y" },
  water: { dataset: "FAO-56 crop water need from ERA5-Land", resolution: km(S.era5_land.res_m), url: "https://www.fao.org/3/x0490e/x0490e00.htm" },
  soil: { dataset: "SoilGrids 2.0 (ISRIC)", resolution: km(S.soilgrids.res_m), url: "https://doi.org/10.5194/soil-7-217-2021" },
};

// [low, typical, high] in field.json is the 10th percentile, the median and the 90th percentile.
const real = (triple, unit, scale, src, confidence, label, asOf) => ({
  value: triple[1], unit, range: [triple[0], triple[2]], scale, source: src, confidence, label, asOf, placeholder: false,
});
const one = (value, unit, range, scale, src, confidence, label, asOf) => ({
  value, unit, ...(range ? { range } : {}), scale, source: src, confidence, label, asOf, placeholder: false,
});

const baseline = data.greenness.baseline; // "2001-2020"
const g = data.greenness, w = data.weather, f = data.future, wt = data.water;

// --- the field -------------------------------------------------------------------------------
const field = {
  id: "genzano-demo",
  name: "Genzano di Lucania",
  areaHa: data.field.area_ha,
  // The team's own outline of the trial field of Denora et al. (2025), drawn by hand on satellite imagery.
  outline: data.field.outline,
};
const lastCrop = { crop: "durum", source: sources.cropmap }; // EU crop map 2022: 95% of the field is durum

// --- what the satellites see -----------------------------------------------------------------
// MODIS greenness is 250 m, about the size of this 6.5 ha field, so it is badged "your field" and its
// resolution is shown beside it. Weather and rain come from grids of 6 km or more: "your area".
const findings = [
  {
    title: "finding.bare.title", detail: "finding.bare.detail",
    fact: real(g.typical.bare_months, "months", "field", sources.modis, "fair", "finding.bare.fact", baseline),
    // Bare soil after harvest looks like decline to a satellite; expectedBare says it is not.
    signals: { greenness: "falling", temperature: "rising", waterUse: "falling" },
    weatherDriven: false,
    expectedBare: true,
    addressedBy: ["vetch-oat-durum-durum", "faba-durum-faba"],
  },
  {
    title: "finding.heat.title", detail: "finding.heat.detail",
    fact: real(w.typical.hot_days_flower, "days", "area", sources.era5, "fair", "finding.heat.fact", baseline),
    signals: { greenness: "normal", temperature: "rising", waterUse: "falling" },
    weatherDriven: true,
    addressedBy: ["chickpea-durum-durum", "vetch-oat-durum-durum"],
  },
  {
    title: "finding.dry.title", detail: "finding.dry.detail",
    fact: real(w.typical.rain_autumn, "mm", "area", sources.rain, "fair", "finding.dry.fact", baseline),
    signals: { greenness: "normal", temperature: "normal", waterUse: "falling" },
    weatherDriven: true,
    addressedBy: ["chickpea-durum-durum", "faba-durum-faba"],
  },
];

// --- the field's year ------------------------------------------------------------------------
// field.json calendars run January to December; the app's strip starts in October.
const OCT_FIRST = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const typical = (triple) => triple[1];
const months = OCT_FIRST.map((m) => {
  const ndvi = typical(g.calendar.month_ndvi[m]);
  const cover = ndvi >= g.thresholds.green ? "green" : ndvi < g.thresholds.bare ? "bare" : "part";
  const risks = [];
  // Dry: in one year in ten an autumn sowing month gets under 30 mm.
  if ((m === 9 || m === 10) && w.calendar.rain_month[m][0] < 30) risks.push("dry");
  // Frost: a typical year has 2 or more frost nights after stem growth starts (March, April),
  // or 8 or more in a winter month.
  if ((m === 2 || m === 3) ? typical(w.calendar.frost_month[m]) >= 2 : typical(w.calendar.frost_month[m]) >= 8) risks.push("frost");
  // Heat: a typical year has at least one day of 30 °C or more while the crop flowers and fills (April to June).
  if (m >= 3 && m <= 5 && typical(w.calendar.hot30_month[m]) >= 1) risks.push("heat");
  // Heavy rain on open soil: in one year in ten an autumn month (September to November) gets 100 mm or more
  // while the soil is not yet covered.
  if (cover !== "green" && w.calendar.rain_month[m][2] >= 100 && m >= 8 && m <= 10) risks.push("rain");
  return { cover, risks };
});

// The slider's three stops, in hot days at flowering (15 April to 15 June, 30 °C or more):
//   normal      a typical year now; by 2050 on the middle emissions path (SSP2-4.5), median of 29 models
//   drier       a one-in-ten hot year now; by 2050 that year plus the high-emissions (SSP5-8.5) median change
//   much-drier  the hottest of the last 26 seasons; by 2050 that season plus the same high-emissions change
const hot = w.typical.hot_days_flower;
const hottest = Math.max(...w.seasons.map((s) => s.hot_days_flower).filter(Number.isFinite));
const round1 = (n) => Math.round(n * 10) / 10;
const future = f.periods.future; // "2041-2060"
const hotDays = {
  normal: {
    now: real(hot, "days", "area", sources.era5, "fair", "year.hotNow", baseline),
    by2050: real(f.projected.ssp245.hot, "days", "area", sources.cmip6, "low", "year.hot2050", future),
  },
  drier: {
    now: one(hot[2], "days", undefined, "area", sources.era5, "fair", "year.hotNow", baseline),
    by2050: one(round1(hot[2] + f.change.ssp585.hot[1]), "days", [round1(hot[2] + f.change.ssp585.hot[0]), round1(hot[2] + f.change.ssp585.hot[2])],
      "area", sources.cmip6, "low", "year.hot2050", future),
  },
  "much-drier": {
    now: one(hottest, "days", undefined, "area", sources.era5, "fair", "year.hotNow", "2001-2026"),
    by2050: one(round1(hottest + f.change.ssp585.hot[1]), "days", [round1(hottest + f.change.ssp585.hot[0]), round1(hottest + f.change.ssp585.hot[2])],
      "area", sources.cmip6, "low", "year.hot2050", future),
  },
};

// The usual daytime high from 15 April to 15 June, shown beside what counts as a hot day (30 °C or more).
// now: ERA5-Land 2001-2020; by 2050: NEX-GDDP-CMIP6 on the middle emissions path (SSP2-4.5), 2041-2060.
const flowerHigh = {
  now: real(f.now.tmaxfl, "°C", "area", sources.era5, "fair", undefined, baseline),
  by2050: real(f.projected.ssp245.tmaxfl, "°C", "area", sources.cmip6, "low", undefined, future),
};

// In a hotter, drier year heat reaches back into April and autumn sowing months turn dry more often.
const withRisk = (list, monthIndexes, risk) => list.map((risks, i) =>
  monthIndexes.includes(OCT_FIRST[i]) && !risks.includes(risk) ? [...risks, risk] : risks);
const baseRisks = months.map((m) => m.risks);
const drierRisks = withRisk(withRisk(baseRisks, [9, 10], "dry"), [3, 4, 5], "heat");
const risksByScenario = { drier: drierRisks, "much-drier": withRisk(drierRisks, [8, 11], "dry") };

// --- evidence shown under "Why?" for every option ---------------------------------------------
const evidence = [
  real(g.typical.bare_months, "months", "field", sources.modis, "fair", "evidence.bareMonths", baseline),
  real(w.typical.hot_days_flower, "days", "area", sources.era5, "fair", "evidence.hotDays", baseline),
  real(w.typical.rain_season, "mm", "area", sources.rain, "fair", "evidence.rainSeason", baseline),
  real(wt.typical.durum_need, "mm", "area", sources.water, "fair", "evidence.durumNeed", baseline),
  one(data.soil.values.clay, "%", data.soil.range_90pc.clay, "field", sources.soil, "fair", "evidence.clay", "SoilGrids 2.0"),
];

export const realField = { field, lastCrop, findings, year: { months, risksByScenario, hotDays, flowerHigh }, evidence };
