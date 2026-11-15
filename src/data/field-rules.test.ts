// The rules behind the Why screen's signals and the slider's rain (src/data/field-rules.js), on made-up series.
// Written with AI assistance (Claude, Anthropic).
import { describe, expect, it } from "vitest";
import { makeSources, measuredSignals, rainStops, seasonSignal, SIGNAL_RULES } from "./field-rules.js";
import type { FieldData } from "./types";

const YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i); // seasons 2001-2026
/** 20 normal seasons spread evenly from 10 to 29, then six recent ones. */
const series = (recent: (number | null)[]) => [...Array.from({ length: 20 }, (_, i) => 10 + i), ...recent];

describe("seasonSignal: the last five seasons against 2001-2020", () => {
  it("uses the normal seasons' 25th and 75th percentiles (14.75 and 24.25 here)", () => {
    expect(SIGNAL_RULES).toMatchObject({ recent: 5, normal: [2001, 2020], low: 0.25, high: 0.75 });
    expect(seasonSignal(YEARS, series([99, 14, 14, 14, 10, 30]))).toBe("falling"); // median of the last five: 14
    expect(seasonSignal(YEARS, series([0, 25, 25, 25, 30, 10]))).toBe("rising"); // 25
    expect(seasonSignal(YEARS, series([0, 15, 20, 24, 18, 22]))).toBe("normal"); // 20
  });

  it("only the five most recent seasons count", () => {
    // With all six seasons since 2021 the median would be 56.5 (rising); the last five give 14 (falling).
    expect(seasonSignal(YEARS, series([99, 99, 99, 14, 14, 14]))).toBe("falling");
  });

  it("a season with no value is skipped, never taken as 0", () => {
    // Read as 0, the three missing seasons would make the median 0 (falling); skipped, it is 20 (normal).
    expect(seasonSignal(YEARS, series([20, 20, 20, null, null, null]))).toBe("normal");
  });

  it("says no-data with too few normal or recent seasons, or a list that does not line up", () => {
    const sparse = [...Array(10).fill(null), ...Array.from({ length: 10 }, (_, i) => 10 + i), 1, 1, 1, 1, 1, 1];
    expect(seasonSignal(YEARS, sparse)).toBe("no-data"); // only 10 normal seasons
    expect(seasonSignal(YEARS, series([null, null, null, null, 5, 5]))).toBe("no-data"); // 2 recent seasons
    expect(seasonSignal(YEARS, series([1, 1, 1]))).toBe("no-data"); // 23 values for 26 seasons
    expect(seasonSignal(YEARS, null)).toBe("no-data");
  });
});

describe("measuredSignals reads the bundle's own season series", () => {
  const source = { dataset: "x", resolution: "1 km", url: "" };
  const s = (values: (number | null)[]) => ({ values, scale: "area" as const, source, confidence: "fair" as const, label: "data.x", placeholder: false });
  it("greenness from peak greenness, temperature from hot days, water use from MODIS water use", () => {
    const seasons: FieldData["seasons"] = {
      years: YEARS,
      series: { peakGreenness: s(series([0, 1, 1, 1, 1, 1])), hotDays: s(series([0, 50, 50, 50, 50, 50])) },
    };
    expect(measuredSignals(seasons)).toEqual({ greenness: "falling", temperature: "rising", waterUse: "no-data" });
    expect(measuredSignals(undefined)).toEqual({ greenness: "no-data", temperature: "no-data", waterUse: "no-data" });
  });
});

describe("rainStops: Oct-May rain at each slider stop", () => {
  const S = Object.fromEntries(["era5_land", "nex_gddp_cmip6", "eucropmap", "soilgrids", "smap", "modis_et", "soilgrids_water", "nasadem"]
    .map((k) => [k, { res_m: 1000 }]));
  const stops = rainStops({
    rain: [418, 542, 631], driest: 390, projected245: [477, 520, 558], change585: [-16, -6, 6],
    scale: "area", sources: makeSources(S), baseline: "2001-2020", future: "2041-2060",
  });
  it("normal is the typical season, drier the 1-in-10 dry season, much drier the driest; by 2050 with the high path's change", () => {
    expect([stops.normal.now.value, stops.normal.now.range, stops.normal.by2050.value]).toEqual([542, [418, 631], 520]);
    expect([stops.drier.now.value, stops.drier.by2050.value, stops.drier.by2050.range]).toEqual([418, 393, [351, 443]]);
    expect([stops["much-drier"].now.value, stops["much-drier"].by2050.value, stops["much-drier"].by2050.range]).toEqual([390, 367, [328, 413]]);
    expect(stops["much-drier"].now.asOf).toBe("2001-2026");
    for (const stop of Object.values(stops)) {
      expect(stop.now.source.dataset).toBe("CHIRPS + NASA GPM + ERA5-Land");
      expect(stop.by2050.source.dataset).toBe("NASA NEX-GDDP-CMIP6");
      expect(stop.by2050.confidence).toBe("low");
    }
  });
});
