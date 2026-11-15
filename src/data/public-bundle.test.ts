/// <reference types="node" />
// The one test that reads the real data file. Every other test uses the frozen copy in
// src/test-fixtures, so replacing the data never breaks a test that is about something else.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import shipped from "../../public/data/genzano-demo.json";
import { incomeConfidence, optionMoney, withMoney } from "../money/money";
import type { Fact } from "./types";
import { CLIMATE_SCENARIOS, CROPS } from "./types";
import { OPTION_COUNT, validateBundle } from "./validate";

it("the data file the app ships passes the contract check", () => {
  expect(() => validateBundle(structuredClone(shipped))).not.toThrow();
});

it("ships the nine rotations over the nine crops, one of them current", () => {
  const bundle = validateBundle(structuredClone(shipped));
  expect(bundle.options.length).toBeGreaterThanOrEqual(OPTION_COUNT[0]);
  expect(bundle.options.length).toBeLessThanOrEqual(OPTION_COUNT[1]);
  expect(bundle.options.map((o) => o.id)).toEqual([
    "chickpea-durum-durum", "faba-durum-faba", "vetch-oat-durum-durum", "durum-durum-durum", "lentil-durum-durum",
    "pea-durum-durum", "barley-durum-durum", "rapeseed-durum-durum", "coriander-durum-durum",
  ]);
  expect(bundle.options.filter((o) => o.isCurrent).map((o) => o.id)).toEqual(["durum-durum-durum"]);
  expect(Object.keys(bundle.economics!.crops).sort()).toEqual([...CROPS].sort());
});

it("each option's income in the shipped file is what its own prices, costs and support add up to", () => {
  const bundle = validateBundle(structuredClone(shipped));
  if (!bundle.economics) return;
  for (const option of bundle.options) {
    expect(option.facts.income.value, option.id).toBe(optionMoney(option, bundle.economics, {}).perYear);
    expect(option.facts.income.confidence, option.id).toBe(incomeConfidence(option, bundle.economics, {}));
  }
  // With nothing changed by the farmer, the screens must see the file's own figures.
  expect(withMoney(bundle, {}).options.map((o) => o.facts.income.value)).toEqual(bundle.options.map((o) => o.facts.income.value));
});

describe("the demo field's other figures (bundle.fieldData) are data/field.json's own", () => {
  const bundle = validateBundle(structuredClone(shipped));
  const data = bundle.fieldData!;
  // The data file as the notebooks wrote it, read untyped.
  const source: any = JSON.parse(readFileSync(join(process.cwd(), "data", "field.json"), "utf8"));
  const triple = (f: Fact | undefined) => (f ? [f.range![0], f.value, f.range![1]] : f);

  it("today's figures are the typical value with its 10th to 90th percentile range", () => {
    const g = source.greenness.typical, w = source.weather.typical, wt = source.water.typical;
    const pairs: [Fact | undefined, number[]][] = [
      [data.greenness.greenUp, g.greenup_day], [data.greenness.peak, g.peak_day], [data.greenness.dryOff, g.dryoff_day],
      [data.greenness.seasonLength, g.season_days], [data.greenness.peakGreenness, g.peak],
      [data.weather.rainOnset, w.rain_onset_day], [data.weather.drySpellSpring, w.dry_spell_spring],
      [data.weather.frostWinter, w.frost_days_winter], [data.weather.frostLate, w.late_frost_days],
      [data.weather.rainSpring, w.rain_spring], [data.weather.rainYear, w.rain_year],
      [data.water.soilWaterSowing, wt.sm_sowing], [data.water.soilWaterSpring, wt.sm_spring],
      [data.water.cropWaterUse, wt.water_use_modis], [data.water.referenceEt, wt.et0_season],
    ];
    for (const [fact, expected] of pairs) expect(triple(fact), fact?.label).toEqual(expected);
    expect(data.water.soilWaterSpring!.asOf).toBe("2016-2025"); // SMAP starts in spring 2015
    expect(data.water.cropWaterUse!.asOf).toBe("2001-2020");
  });

  it("soil, slope and height are field.json's values for the field", () => {
    const soil = source.soil.values;
    expect([data.soil.sand?.value, data.soil.silt?.value, data.soil.organicCarbon?.value, data.soil.ph?.value, data.soil.nitrogen?.value,
      data.soil.cec?.value, data.soil.waterHolding?.value, data.soil.bulkDensity?.value, data.soil.stones?.value])
      .toEqual([soil.sand, soil.silt, soil.soc, soil.phh2o, soil.nitrogen, soil.cec, soil.awc, soil.bdod, soil.cfvo]);
    expect(data.soil.ph!.range).toEqual(source.soil.range_90pc.phh2o);
    expect(data.land.slope!.value).toBe(source.field.slope_deg);
    expect(data.land.height!.value).toBe(source.field.elev_m);
  });

  it("by 2050 holds field.json's projections under both scenarios", () => {
    const keys = { hotDays: "hot", flowerHigh: "tmaxfl", frostWinter: "frost", frostLate: "late", rainSeason: "rainse", rainAutumn: "rainau" } as const;
    for (const scenario of CLIMATE_SCENARIOS) {
      for (const [ours, theirs] of Object.entries(keys)) {
        const fact = data.by2050[scenario][ours as keyof typeof keys];
        expect(triple(fact), `${scenario} ${ours}`).toEqual(source.future.projected[scenario][theirs]);
        expect(fact!.confidence).toBe("low");
        expect(fact!.asOf).toBe("2041-2060");
      }
    }
  });

  it("each season lines up with field.json, and a season with no data stays null, never 0", () => {
    const years = source.weather.seasons.map((r: { season: number }) => r.season);
    expect(data.seasons.years).toEqual(years);
    const column = (rows: Record<string, number | null>[], key: string) =>
      years.map((y: number) => rows.find((r) => r.season === y)?.[key] ?? null);
    const series = data.seasons.series;
    expect(series.rainSeason!.values).toEqual(column(source.weather.seasons, "rain_season"));
    expect(series.hotDays!.values).toEqual(column(source.weather.seasons, "hot_days_flower"));
    expect(series.peakGreenness!.values).toEqual(column(source.greenness.seasons, "peak"));
    expect(series.peakVsNearby!.values).toEqual(column(source.greenness.seasons, "peak_vs_nearby_z"));
    expect(series.cropWaterUse!.values).toEqual(column(source.water.seasons, "water_use_modis"));
    const smap = series.soilWaterSpring!.values;
    expect(smap.slice(0, years.indexOf(2016))).toEqual(Array(years.indexOf(2016)).fill(null));
    expect(smap.slice(years.indexOf(2016)).every((v) => typeof v === "number" && v > 0)).toBe(true);
  });

  it("2024, the drought, sits below normal on rain, soil water, greenness and water use", () => {
    const at = (key: "rainSeason" | "soilWaterSpring" | "peakGreenness" | "cropWaterUse") =>
      data.seasons.series[key]!.values[data.seasons.years.indexOf(2024)]!;
    expect(at("rainSeason")).toBeLessThan(source.weather.typical.rain_season[1]);
    expect(at("soilWaterSpring")).toBeLessThan(Number(data.water.soilWaterSpring!.value));
    expect(at("peakGreenness")).toBeLessThan(Number(data.greenness.peakGreenness!.value));
    expect(at("cropWaterUse")).toBeLessThan(Number(data.water.cropWaterUse!.value));
  });

  it("carries the check against the trial's station and the soil the trial measured, from the paper", () => {
    const check = source.weather.ground_check;
    expect(data.groundCheck!.rain.map((r) => [r.season, r.station.value, r.satellites.value]))
      .toEqual(check.rain.map((r: { season: string; station_mm: number; satellites_mm: number }) => [r.season, r.station_mm, r.satellites_mm]));
    expect(data.groundCheck!.temperature.map((r) => [r.station.value, r.era5Land.value]))
      .toEqual(check.temperature.map((r: { station_c: number; era5_land_c: number }) => [r.station_c, r.era5_land_c]));
    expect(data.groundCheck!.rain.map((r) => r.window)).toEqual(["oct-may", "nov-jun", "sowing-harvest", "oct-may", "nov-jun", "sowing-harvest"]);
    expect(Object.fromEntries(Object.entries(data.trialSoil!).map(([k, f]) => [k, f.value]))).toEqual({ ph: 8.2, nitrogen: 0.9, cec: 21.3 });
  });

  it("badges the field's own figures (greenness, soil, slope) 'your field' and the rest 'your area'", () => {
    const own = [...Object.values(data.greenness), ...Object.values(data.soil), ...Object.values(data.land)];
    const area = [...Object.values(data.weather), ...Object.values(data.water), ...CLIMATE_SCENARIOS.flatMap((s) => Object.values(data.by2050[s]))];
    expect(own.length).toBe(16);
    expect(area.length).toBe(22);
    for (const fact of own) expect(fact.scale, fact.label).toBe("field");
    for (const fact of area) expect(fact.scale, fact.label).toBe("area");
    for (const fact of [...own, ...area]) expect(fact.placeholder).toBe(false);
  });
});

describe("the demo field's signals and slider stops come from its own data", () => {
  const bundle = validateBundle(structuredClone(shipped));
  // The data file as the notebooks wrote it, read untyped.
  const source: any = JSON.parse(readFileSync(join(process.cwd(), "data", "field.json"), "utf8"));
  /** Linear-interpolation percentile, worked out here independently of src/data/field-rules.js. */
  const pct = (list: number[], q: number) => {
    const v = [...list].sort((a, b) => a - b), pos = q * (v.length - 1), lo = Math.floor(pos);
    return v[lo] + (pos - lo) * (v[Math.min(lo + 1, v.length - 1)] - v[lo]);
  };
  /** The last five seasons' median against the 2001-2020 seasons' 25th and 75th percentiles. */
  const signal = (rows: { season: number }[], key: string) => {
    const value = (r: { season: number }) => (r as Record<string, unknown>)[key] as number | null;
    const normal = rows.filter((r) => r.season <= 2020 && value(r) !== null).map(value) as number[];
    const recent = (rows.filter((r) => r.season > 2020 && value(r) !== null).map(value) as number[]).slice(-5);
    const now = pct(recent, 0.5);
    return now < pct(normal, 0.25) ? "falling" : now > pct(normal, 0.75) ? "rising" : "normal";
  };

  it("every finding carries the signals worked out from field.json's seasons", () => {
    const expected = {
      greenness: signal(source.greenness.seasons, "peak"),
      temperature: signal(source.weather.seasons, "hot_days_flower"),
      waterUse: signal(source.water.seasons, "water_use_modis"),
    };
    expect(expected).toEqual({ greenness: "falling", temperature: "rising", waterUse: "normal" }); // data of 14 November 2026
    for (const finding of bundle.findings) expect(finding.signals, finding.title).toEqual(expected);
  });

  it("the slider's rain: typical, 1-in-10 dry and the driest season since 2001, each by 2050 too", () => {
    const rain = bundle.year.rainSeason!;
    const seasons = source.weather.seasons.map((r: { rain_season: number }) => r.rain_season).filter(Number.isFinite);
    expect(rain.normal.now.value).toBe(source.weather.typical.rain_season[1]);
    expect(rain.normal.by2050.value).toBe(source.future.projected.ssp245.rainse[1]);
    expect(rain.drier.now.value).toBe(source.weather.typical.rain_season[0]);
    expect(rain["much-drier"].now.value).toBe(Math.min(...seasons));
    const change = source.future.change.ssp585.rainse[1];
    expect(rain.drier.by2050.value).toBe(Math.round(source.weather.typical.rain_season[0] * (1 + change / 100)));
    expect(rain["much-drier"].by2050.value).toBe(Math.round(Math.min(...seasons) * (1 + change / 100)));
    // The hot days at the same stops: 1-in-10 hot and the hottest season, so each stop is drier and hotter.
    expect(bundle.year.hotDays.drier.now.value).toBe(source.weather.typical.hot_days_flower[2]);
  });
});
