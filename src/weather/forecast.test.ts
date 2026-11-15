// The next days, counted from MET Norway's forecast.
import { describe, expect, it, vi } from "vitest";
import { FORECAST_RULES, fetchForecast, fullForecastUrl, summariseForecast } from "./forecast";

const HOUR = 3600000;
const NOW = new Date(Date.UTC(2026, 10, 15, 6)); // 15 November 2026, 06:00 UTC
const utcDay = (time: number) => new Date(time).toISOString().slice(0, 10);

type Six = { rain: number; min: number; max: number };
/** An answer shaped like MET Norway's: an entry every `step` hours, each with a six-hour outlook. */
function answer(hours: number, step: number, six: (hoursFromNow: number) => Six | null) {
  const timeseries = [];
  for (let h = 0; h < hours; h += step) {
    const s = six(h);
    timeseries.push({
      time: new Date(NOW.getTime() + h * HOUR).toISOString(),
      data: s ? { next_6_hours: { details: { precipitation_amount: s.rain, air_temperature_min: s.min, air_temperature_max: s.max } } } : {},
    });
  }
  return { properties: { meta: { updated_at: "2026-11-15T05:19:59Z" }, timeseries } };
}

describe("summariseForecast", () => {
  it("adds up six-hour blocks that do not overlap, even where the forecast has one every hour", () => {
    // Hourly entries, each saying 6 mm in its next six hours: non-overlapping blocks give 4 a day, not 24.
    const f = summariseForecast(answer(42, 1, () => ({ rain: 6, min: 8, max: 15 })), NOW, utcDay);
    expect(f.days.map((d) => d.date)).toEqual(["2026-11-15", "2026-11-16"]);
    // Today from 06:00: blocks at 06, 12, 18. Tomorrow: 00, 06, 12, 18.
    expect(f.days.map((d) => d.rainMm)).toEqual([18, 24]);
    expect(f.rain.value).toBe(42);
  });

  it("shows seven days at most, today first", () => {
    const f = summariseForecast(answer(10 * 24, 6, () => ({ rain: 1, min: 5, max: 12 })), NOW, utcDay);
    expect(f.days).toHaveLength(FORECAST_RULES.days);
    expect(f.days[0].date).toBe("2026-11-15");
    expect(f.days.at(-1)!.date).toBe("2026-11-21");
    // Today has three blocks left, the six full days four each.
    expect(f.rain.value).toBe(27);
  });

  it("names the wettest day and the coldest night", () => {
    const f = summariseForecast(
      answer(4 * 24, 6, (h) => ({ rain: h === 30 ? 14.4 : 0.2, min: h === 66 ? -1.4 : 6, max: 14 })),
      NOW,
      utcDay,
    );
    expect(f.wettest).toMatchObject({ date: "2026-11-16", rainMm: 15 });
    expect(f.coldest.date).toBe("2026-11-18");
    expect(f.coldest.fact.value).toBe(-1);
    expect(f.frost).toBe(true);
  });

  it("says little or no rain under 1 mm in all, and no frost above 1 °C", () => {
    const f = summariseForecast(answer(3 * 24, 6, () => ({ rain: 0, min: 2, max: 14 })), NOW, utcDay);
    expect(f.wettest).toBeNull();
    expect(f.rain.value).toBe(0);
    expect(f.frost).toBe(false);
  });

  it("flags frost at 1 °C or below", () => {
    expect(summariseForecast(answer(24, 6, () => ({ rain: 0, min: 1, max: 9 })), NOW, utcDay).frost).toBe(true);
  });

  it("ignores blocks that have already ended and entries without a six-hour outlook", () => {
    const json = answer(48, 6, (h) => (h === 12 ? null : { rain: 2, min: 5, max: 10 }));
    // An old entry from yesterday must not count.
    json.properties.timeseries.unshift({
      time: new Date(NOW.getTime() - 12 * HOUR).toISOString(),
      data: { next_6_hours: { details: { precipitation_amount: 99, air_temperature_min: -20, air_temperature_max: 0 } } },
    });
    const f = summariseForecast(json, NOW, utcDay);
    // Today: blocks at 06 and 18 (the 12:00 entry has no outlook).
    expect(f.days[0].rainMm).toBe(4);
    expect(f.coldest.fact.value).toBe(5);
  });

  it("carries the source, the update time and a low confidence", () => {
    const f = summariseForecast(answer(24, 6, () => ({ rain: 1, min: 5, max: 10 })), NOW, utcDay);
    expect(f.updated).toBe("2026-11-15T05:19:59Z");
    expect(f.rain.source.dataset).toBe("MET Norway forecast");
    expect(f.rain.confidence).toBe("low");
    expect(f.rain.scale).toBe("area");
    expect(f.rain.placeholder).toBe(false);
  });

  it("refuses an answer with nothing usable", () => {
    expect(() => summariseForecast({ properties: {} }, NOW, utcDay)).toThrow("invalid response");
    expect(() => summariseForecast(answer(24, 6, () => null), NOW, utcDay)).toThrow("no usable forecast");
  });
});

describe("fetchForecast", () => {
  it("asks MET Norway for the point at two decimals", async () => {
    const fetchImpl = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({ properties: { timeseries: [] } }) }));
    await fetchForecast([16.09284, 40.82341], fetchImpl as unknown as typeof fetch);
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=40.82&lon=16.09");
  });
  it("rejects a failed call", async () => {
    const failed = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    await expect(fetchForecast([16, 40], failed as unknown as typeof fetch)).rejects.toThrow("request failed (403)");
  });
});

describe("fullForecastUrl", () => {
  it("links to the public forecast page for the same place", () => {
    expect(fullForecastUrl([16.0928, 40.8234])).toBe("https://www.yr.no/en/forecast/daily-table/40.823,16.093");
  });
});
