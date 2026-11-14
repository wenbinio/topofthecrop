// The rules that turn the team's data into the field parts of a bundle: findings, the year strip's cover and
// risk icons, the slider's hot-day stops and the usual high at flowering. One copy, used by both
// scripts/real-field.mjs (the demo field, from data/field.json) and src/data/fieldFromBasin.ts (a drawn field,
// from the 1 km squares), so the two cannot drift. Plain JavaScript so Node runs it without a build step;
// types are in field-rules.d.ts. Written with AI assistance (Claude, Anthropic).

/** Data calendars run January to December; the app's strip starts in October. */
export const OCT_FIRST = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];

const km = (m) => (m >= 1000 ? `about ${Math.round(m / 1000)} km` : `${m} m`);

/** The datasets behind the field facts, named as the demo names them. `S` is a data file's `meta.sources`. */
export function makeSources(S) {
  return {
    modis: { dataset: "NASA MODIS (MOD13Q1)", resolution: "250 m", url: "https://doi.org/10.5067/MODIS/MOD13Q1.061" },
    era5: { dataset: "ERA5-Land (NASA POWER check)", resolution: km(S.era5_land.res_m), url: "https://doi.org/10.24381/cds.e2161bac" },
    rain: { dataset: "CHIRPS + NASA GPM + ERA5-Land", resolution: "6 to 11 km", url: "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07" },
    cmip6: { dataset: "NASA NEX-GDDP-CMIP6", resolution: km(S.nex_gddp_cmip6.res_m), url: "https://doi.org/10.1038/s41597-022-01393-4" },
    cropmap: { dataset: "EU crop map 2022 (JRC)", resolution: km(S.eucropmap.res_m), url: "https://doi.org/10.1038/s41597-024-03884-y" },
    water: { dataset: "FAO-56 crop water need from ERA5-Land", resolution: km(S.era5_land.res_m), url: "https://www.fao.org/3/x0490e/x0490e00.htm" },
    soil: { dataset: "SoilGrids 2.0 (ISRIC)", resolution: km(S.soilgrids.res_m), url: "https://doi.org/10.5194/soil-7-217-2021" },
  };
}

// [low, typical, high] is the 10th percentile, the median and the 90th percentile.
export const real = (triple, unit, scale, src, confidence, label, asOf) => ({
  value: triple[1], unit, range: [triple[0], triple[2]], scale, source: src, confidence, label, asOf, placeholder: false,
});
export const one = (value, unit, range, scale, src, confidence, label, asOf) => ({
  value, unit, ...(range ? { range } : {}), scale, source: src, confidence, label, asOf, placeholder: false,
});

/** The three findings, without their figure. `addressedBy` lists the options that respond to each. */
export const FINDINGS = {
  bare: {
    title: "finding.bare.title", detail: "finding.bare.detail", factLabel: "finding.bare.fact",
    // Bare soil after harvest looks like decline to a satellite; expectedBare says it is not.
    signals: { greenness: "falling", temperature: "rising", waterUse: "falling" },
    weatherDriven: false,
    expectedBare: true,
    addressedBy: ["vetch-oat-durum-durum", "faba-durum-faba"],
  },
  heat: {
    title: "finding.heat.title", detail: "finding.heat.detail", factLabel: "finding.heat.fact",
    signals: { greenness: "normal", temperature: "rising", waterUse: "falling" },
    weatherDriven: true,
    addressedBy: ["chickpea-durum-durum", "vetch-oat-durum-durum"],
  },
  dry: {
    title: "finding.dry.title", detail: "finding.dry.detail", factLabel: "finding.dry.fact",
    signals: { greenness: "normal", temperature: "normal", waterUse: "falling" },
    weatherDriven: true,
    addressedBy: ["chickpea-durum-durum", "faba-durum-faba"],
  },
};

/** A finding with its figure. `detail` replaces the dictionary key of the detail line when given. */
export function finding(kind, fact, detail) {
  const k = FINDINGS[kind];
  return {
    title: k.title, detail: detail ?? k.detail, fact, signals: { ...k.signals }, weatherDriven: k.weatherDriven,
    ...(k.expectedBare ? { expectedBare: true } : {}), addressedBy: [...k.addressedBy],
  };
}

/**
 * Twelve months, October first: cover from typical greenness, risk icons from the weather.
 * Inputs are January-December lists of [low, typical, high]. Without greenness (`ndviMonth` null) cover is "none".
 */
export function yearMonths({ ndviMonth, thresholds, rainMonth, frostMonth, hot30Month }) {
  const typical = (triple) => triple[1];
  return OCT_FIRST.map((m) => {
    const ndvi = ndviMonth ? typical(ndviMonth[m]) : null;
    const cover = ndvi == null ? "none" : ndvi >= thresholds.green ? "green" : ndvi < thresholds.bare ? "bare" : "part";
    const risks = [];
    // Dry: in one year in ten an autumn sowing month gets under 30 mm.
    if ((m === 9 || m === 10) && rainMonth[m][0] < 30) risks.push("dry");
    // Frost: a typical year has 2 or more frost nights after stem growth starts (March, April),
    // or 8 or more in a winter month.
    if ((m === 2 || m === 3) ? typical(frostMonth[m]) >= 2 : typical(frostMonth[m]) >= 8) risks.push("frost");
    // Heat: a typical year has at least one day of 30 °C or more while the crop flowers and fills (April to June).
    if (m >= 3 && m <= 5 && typical(hot30Month[m]) >= 1) risks.push("heat");
    // Heavy rain on open soil: in one year in ten an autumn month (September to November) gets 100 mm or more
    // while the soil is not yet covered. Unknown cover ("none") shows no such icon.
    if (cover !== "green" && cover !== "none" && rainMonth[m][2] >= 100 && m >= 8 && m <= 10) risks.push("rain");
    return { cover, risks };
  });
}

/** In a hotter, drier year heat reaches back into April and autumn sowing months turn dry more often. */
export function risksByScenario(months) {
  const withRisk = (list, monthIndexes, risk) => list.map((risks, i) =>
    monthIndexes.includes(OCT_FIRST[i]) && !risks.includes(risk) ? [...risks, risk] : risks);
  const baseRisks = months.map((m) => m.risks);
  const drierRisks = withRisk(withRisk(baseRisks, [9, 10], "dry"), [3, 4, 5], "heat");
  return { drier: drierRisks, "much-drier": withRisk(drierRisks, [8, 11], "dry") };
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * The slider's three stops, in hot days at flowering (15 April to 15 June, 30 °C or more):
 *   normal      a typical year now; by 2050 on the middle emissions path (SSP2-4.5), median of 29 models
 *   drier       a one-in-ten hot year now; by 2050 that year plus the high-emissions (SSP5-8.5) median change
 *   much-drier  the hottest of the last 26 seasons; by 2050 that season plus the same high-emissions change
 * `hot` today's [low, typical, high]; `hottest` the most in any season; `projected245` today + SSP2-4.5 change;
 * `change585` the SSP5-8.5 change.
 */
export function hotDayStops({ hot, hottest, projected245, change585, scale, sources, baseline, future }) {
  return {
    normal: {
      now: real(hot, "days", scale, sources.era5, "fair", "year.hotNow", baseline),
      by2050: real(projected245, "days", scale, sources.cmip6, "low", "year.hot2050", future),
    },
    drier: {
      now: one(hot[2], "days", undefined, scale, sources.era5, "fair", "year.hotNow", baseline),
      by2050: one(round1(hot[2] + change585[1]), "days", [round1(hot[2] + change585[0]), round1(hot[2] + change585[2])],
        scale, sources.cmip6, "low", "year.hot2050", future),
    },
    "much-drier": {
      now: one(hottest, "days", undefined, scale, sources.era5, "fair", "year.hotNow", "2001-2026"),
      by2050: one(round1(hottest + change585[1]), "days", [round1(hottest + change585[0]), round1(hottest + change585[2])],
        scale, sources.cmip6, "low", "year.hot2050", future),
    },
  };
}

/**
 * The usual daytime high from 15 April to 15 June, shown beside what counts as a hot day (30 °C or more).
 * now: ERA5-Land 2001-2020; by 2050: NEX-GDDP-CMIP6 on the middle emissions path (SSP2-4.5), 2041-2060.
 */
export function flowerHigh({ now, by2050, scale, sources, baseline, future }) {
  return {
    now: real(now, "°C", scale, sources.era5, "fair", undefined, baseline),
    by2050: real(by2050, "°C", scale, sources.cmip6, "low", undefined, future),
  };
}
