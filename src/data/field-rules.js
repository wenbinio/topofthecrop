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
    // The rest are used by `fieldData` below.
    dailyRain: { dataset: "CHIRPS + ERA5-Land (daily rain)", resolution: "6 to 11 km", url: "https://doi.org/10.1038/sdata.2015.66" },
    smap: { dataset: "NASA SMAP L4 soil moisture", resolution: km(S.smap.res_m), url: "https://doi.org/10.5067/T5RUATAQREF8" },
    modisEt: { dataset: "NASA MODIS (MOD16A2GF)", resolution: km(S.modis_et.res_m), url: "https://doi.org/10.5067/MODIS/MOD16A2GF.061" },
    et0: { dataset: "FAO-56 reference evapotranspiration from ERA5-Land", resolution: km(S.era5_land.res_m), url: "https://www.fao.org/3/x0490e/x0490e00.htm" },
    soilWater: { dataset: "SoilGrids 2.0 water retention (ISRIC)", resolution: km(S.soilgrids_water.res_m), url: "https://doi.org/10.1016/j.iswcr.2022.08.001" },
    nasadem: { dataset: "NASA NASADEM", resolution: km(S.nasadem.res_m), url: "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001" },
    // Typed in by hand from the trial paper (Denora et al. 2025), and labelled so in data/field.json.
    station: { dataset: "Trial weather station (Denora et al. 2025)", resolution: "at the field", url: "https://doi.org/10.1016/j.ijagro.2025.100045" },
    trial: { dataset: "Trial soil analysis (Denora et al. 2025)", resolution: "at the field", url: "https://doi.org/10.1016/j.ijagro.2025.100045" },
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

// --- the rest of the data team's figures, for the evidence screens (bundle.fieldData) ---------

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const roundTo = (n, digits) => { const k = 10 ** digits; return Math.round(n * k) / k; };
/** [low, typical, high] rounded to `digits`, or null unless all three are numbers (null in the data = no data). */
function tripleOf(t, digits) {
  return Array.isArray(t) && t.length === 3 && t.every(isNum) ? t.map((n) => roundTo(n, digits)) : null;
}

/**
 * What each figure in `fieldData` is: its unit, its dataset (a key of makeSources), its decimals, its confidence
 * ("fair" unless given), and whether it describes the field itself (`own`: greenness at 250 m, soil, slope and
 * height, badged "your field" on the demo field) or the area around it (weather, soil water, water use and the
 * future, from grids of 500 m to 28 km: always "your area"). Each label is the dictionary key `data.<key>`.
 * Unit "dayOfSeason" is a day number counted from 1 September.
 */
export const FIELD_DATA_RULES = {
  greenness: {
    greenUp: { unit: "dayOfSeason", src: "modis", digits: 0, own: true },
    peak: { unit: "dayOfSeason", src: "modis", digits: 0, own: true },
    dryOff: { unit: "dayOfSeason", src: "modis", digits: 0, own: true },
    seasonLength: { unit: "days", src: "modis", digits: 0, own: true },
    peakGreenness: { unit: "NDVI", src: "modis", digits: 2, own: true },
  },
  weather: {
    rainOnset: { unit: "dayOfSeason", src: "dailyRain", digits: 0 },
    drySpellSpring: { unit: "days", src: "dailyRain", digits: 0 },
    frostWinter: { unit: "nights", src: "era5", digits: 0 },
    frostLate: { unit: "nights", src: "era5", digits: 0 },
    rainSpring: { unit: "mm", src: "rain", digits: 0 },
    rainYear: { unit: "mm", src: "rain", digits: 0 },
  },
  water: {
    soilWaterSowing: { unit: "%", src: "smap", digits: 1, smap: true },
    soilWaterSpring: { unit: "%", src: "smap", digits: 1, smap: true },
    cropWaterUse: { unit: "mm", src: "modisEt", digits: 0 },
    referenceEt: { unit: "mm", src: "et0", digits: 0 },
  },
  soil: {
    sand: { unit: "%", src: "soil", digits: 0, own: true },
    silt: { unit: "%", src: "soil", digits: 0, own: true },
    organicCarbon: { unit: "g/kg", src: "soil", digits: 1, own: true },
    ph: { src: "soil", digits: 1, own: true },
    nitrogen: { unit: "g/kg", src: "soil", digits: 2, own: true },
    cec: { unit: "cmol(c)/kg", src: "soil", digits: 0, own: true },
    waterHolding: { unit: "mm", src: "soilWater", digits: 0, own: true },
    bulkDensity: { unit: "g/cm³", src: "soil", digits: 2, own: true },
    stones: { unit: "%", src: "soil", digits: 0, own: true },
  },
  land: {
    slope: { unit: "°", src: "nasadem", digits: 1, own: true, confidence: "good" },
    height: { unit: "m", src: "nasadem", digits: 0, own: true, confidence: "good" },
  },
  // NEX-GDDP-CMIP6, 2041-2060: confidence "low", as for the hot days by 2050 on the Year screen.
  by2050: {
    hotDays: { unit: "days", digits: 1 },
    flowerHigh: { unit: "°C", digits: 1 },
    frostWinter: { unit: "nights", digits: 1 },
    frostLate: { unit: "nights", digits: 1 },
    rainSeason: { unit: "mm", digits: 0 },
    rainAutumn: { unit: "mm", digits: 0 },
  },
  series: {
    peakGreenness: { unit: "NDVI", src: "modis", digits: 2, own: true },
    dryOff: { unit: "dayOfSeason", src: "modis", digits: 0, own: true },
    // The demo field's peak greenness minus nearby rain-fed fields', against its own usual gap (a z-score).
    peakVsNearby: { unit: "z", src: "modis", digits: 2, own: true },
    hotDays: { unit: "days", src: "era5", digits: 1 },
    rainSeason: { unit: "mm", src: "rain", digits: 0 },
    rainAutumn: { unit: "mm", src: "rain", digits: 0 },
    soilWaterSowing: { unit: "%", src: "smap", digits: 1 },
    soilWaterSpring: { unit: "%", src: "smap", digits: 1 },
    cropWaterUse: { unit: "mm", src: "modisEt", digits: 0 },
    durumNeed: { unit: "mm", src: "water", digits: 0 },
  },
};

/**
 * The rest of a field's figures, beyond the findings and the year strip. Both builders pass the same shape, keyed
 * as FIELD_DATA_RULES is, so the demo field and a drawn field are turned into facts by one set of rules.
 *   own           scale of the field's own figures: "field" on the demo field, "area" on a drawn field
 *   today         { greenness, weather, water }: [low, typical, high] per key
 *   soil          { key: { value, range? } }; land { slope, height }: single numbers
 *   by2050        { ssp245, ssp585 }: [low, typical, high] per key, today's value plus each model's change
 *   seasons       { years, series }: one value per season, null where there is none
 *   groundCheck, trialSoil   demo field only, already facts (groundCheckFrom, trialSoilFrom)
 * Anything missing or null is left out, never turned into 0.
 */
export function fieldData({ own, sources, baseline, smapBaseline, future, today, soil, land, by2050, seasons, groundCheck, trialSoil }) {
  const R = FIELD_DATA_RULES;
  const scaleOf = (rule) => (rule.own ? own : "area");
  const group = (rules, values, asOfFor) => {
    const out = {};
    for (const [key, rule] of Object.entries(rules)) {
      const t = tripleOf(values?.[key], rule.digits);
      if (t) out[key] = real(t, rule.unit, scaleOf(rule), sources[rule.src], rule.confidence ?? "fair", `data.${key}`, asOfFor(rule));
    }
    return out;
  };

  const soilFacts = {};
  for (const [key, rule] of Object.entries(R.soil)) {
    const s = soil?.[key];
    if (!s || !isNum(s.value)) continue;
    const range = Array.isArray(s.range) && s.range.length === 2 && s.range.every(isNum) ? s.range.map((n) => roundTo(n, rule.digits)) : undefined;
    soilFacts[key] = one(roundTo(s.value, rule.digits), rule.unit, range, scaleOf(rule), sources[rule.src], "fair", `data.${key}`, "SoilGrids 2.0");
  }

  const landFacts = {};
  for (const [key, rule] of Object.entries(R.land)) {
    const v = land?.[key];
    if (isNum(v)) landFacts[key] = one(roundTo(v, rule.digits), rule.unit, undefined, scaleOf(rule), sources[rule.src], rule.confidence, `data.${key}`);
  }

  const later = {};
  for (const scenario of ["ssp245", "ssp585"]) {
    later[scenario] = {};
    for (const [key, rule] of Object.entries(R.by2050)) {
      const t = tripleOf(by2050?.[scenario]?.[key], rule.digits);
      if (t) later[scenario][key] = real(t, rule.unit, "area", sources.cmip6, "low", `data.${key}`, future);
    }
  }

  const years = Array.isArray(seasons?.years) ? [...seasons.years] : [];
  const series = {};
  for (const [key, rule] of Object.entries(R.series)) {
    const list = seasons?.series?.[key];
    if (!Array.isArray(list) || list.length !== years.length) continue;
    const values = list.map((v) => (isNum(v) ? roundTo(v, rule.digits) : null));
    if (!values.some((v) => v !== null)) continue;
    series[key] = { values, unit: rule.unit, scale: scaleOf(rule), source: sources[rule.src], confidence: "fair", label: `data.${key}`, placeholder: false };
  }

  return {
    greenness: group(R.greenness, today?.greenness, () => baseline),
    weather: group(R.weather, today?.weather, () => baseline),
    water: group(R.water, today?.water, (rule) => (rule.smap ? smapBaseline : baseline)),
    soil: soilFacts,
    land: landFacts,
    by2050: later,
    seasons: { years, series },
    ...(groundCheck ? { groundCheck } : {}),
    ...(trialSoil && Object.keys(trialSoil).length ? { trialSoil } : {}),
  };
}

/** The data's window names for the ground check, as the app's ids. A row with another window is left out. */
const CHECK_WINDOW_IDS = { "Oct-May": "oct-may", "Nov-Jun": "nov-jun", "sowing to harvest": "sowing-harvest" };

/**
 * The demo field's ground check (field.json `weather.ground_check`): each season's rain from the satellites
 * (median of CHIRPS, IMERG and ERA5-Land) and ERA5-Land's mean temperature, beside the trial's own station.
 * The station figures were typed in from the paper; they are shown only beside ours, never used to change them.
 */
export function groundCheckFrom(raw, sources) {
  if (!raw) return undefined;
  const rows = (list, make) =>
    (Array.isArray(list) ? list : []).flatMap((r) => {
      const window = CHECK_WINDOW_IDS[r?.window];
      return window && typeof r.season === "string" ? make(r, window) : [];
    });
  const rain = rows(raw.rain, (r, window) => (isNum(r.station_mm) && isNum(r.satellites_mm) ? [{
    season: r.season, window,
    station: one(r.station_mm, "mm", undefined, "field", sources.station, "fair", "data.station", r.season),
    satellites: one(r.satellites_mm, "mm", undefined, "area", sources.rain, "fair", "data.satellites", r.season),
  }] : []));
  const temperature = rows(raw.temperature, (r, window) => (isNum(r.station_c) && isNum(r.era5_land_c) ? [{
    season: r.season, window,
    station: one(r.station_c, "°C", undefined, "field", sources.station, "fair", "data.station", r.season),
    era5Land: one(r.era5_land_c, "°C", undefined, "area", sources.era5, "fair", "data.era5Land", r.season),
  }] : []));
  return rain.length || temperature.length ? { rain, temperature } : undefined;
}

/** How each trial soil figure is written in field.json `soil.trial_reported`, and its unit. */
const TRIAL_SOIL = {
  ph: [/pH about ([\d.]+)/, undefined],
  nitrogen: [/nitrogen about ([\d.]+) g\/kg/, "g/kg"],
  cec: [/CEC about ([\d.]+) cmol\(c\)\/kg/, "cmol(c)/kg"],
};

/**
 * The soil the trial measured at the demo field (Denora et al. 2025), read from the sentence the data team typed
 * in from the paper. A figure the sentence no longer holds is left out (src/data/public-bundle.test.ts checks all three).
 */
export function trialSoilFrom(text, sources) {
  const out = {};
  if (typeof text !== "string") return out;
  for (const [key, [pattern, unit]] of Object.entries(TRIAL_SOIL)) {
    const match = pattern.exec(text);
    if (match && isNum(Number(match[1]))) out[key] = one(Number(match[1]), unit, undefined, "field", sources.trial, "good", `data.${key}`, "2022-24");
  }
  return out;
}
