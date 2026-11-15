// This season's rain so far, counted from NASA POWER's daily series.
import { describe, expect, it, vi } from "vitest";
import { SEASON_RULES, fetchSeasonRain, seasonStart, summariseSeason } from "./season";

const DAY = 86400000;
const key = (time: number) => new Date(time).toISOString().slice(0, 10).replaceAll("-", "");

/** A daily series: `perDay(year, dayIndex)` mm for every day from 1 September of each listed year to `lastDay`. */
function series(years: number[], days: number, perDay: (year: number, i: number) => number) {
  const out: Record<string, number> = {};
  for (const year of years) {
    const start = Date.UTC(year, 8, 1);
    for (let i = 0; i < days; i++) out[key(start + i * DAY)] = perDay(year, i);
  }
  return out;
}

const TODAY = new Date(Date.UTC(2026, 10, 15)); // 15 November 2026
const PAST = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

describe("seasonStart", () => {
  it("is 1 September of this year from September on", () => {
    expect(new Date(seasonStart(TODAY)).toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(new Date(seasonStart(new Date(Date.UTC(2026, 8, 1)))).toISOString().slice(0, 10)).toBe("2026-09-01");
  });
  it("is 1 September of last year before September", () => {
    expect(new Date(seasonStart(new Date(Date.UTC(2027, 2, 10)))).toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(new Date(seasonStart(new Date(Date.UTC(2026, 7, 31)))).toISOString().slice(0, 10)).toBe("2025-09-01");
  });
});

describe("summariseSeason", () => {
  it("stops at the latest day NASA has filled in, and compares the same days in earlier seasons", () => {
    // 76 days from 1 Sep to 15 Nov; the last three are not filled in yet.
    const rain = series([...PAST, 2026], 76, (year) => (year === 2026 ? 2 : 1));
    for (const d of ["20261113", "20261114", "20261115"]) rain[d] = -999;
    const s = summariseSeason(rain, TODAY);
    expect(s.from).toBe("2026-09-01");
    expect(s.to).toBe("2026-11-12");
    // 73 days at 2 mm this season, against 73 days at 1 mm in each earlier one.
    expect(s.rain.value).toBe(146);
    expect(s.usual.value).toBe(73);
    expect(s.usual.range).toEqual([73, 73]);
    expect(s.standing).toBe("wetter");
    expect(s.rain.source.dataset).toBe("NASA POWER");
    expect(s.rain.scale).toBe("area");
    expect(s.rain.asOf).toBe("2026-11-12");
    expect(s.rain.placeholder).toBe(false);
  });

  it("uses the middle earlier season as usual, with the 10th to 90th percentile as the range", () => {
    // Earlier seasons total 10, 20, ... 100 mm over 10 days; this one 55.
    const rain = series([...PAST, 2026], 10, (year, i) => (i === 0 ? (year === 2026 ? 55 : (year - 2015) * 10) : 0));
    const s = summariseSeason(rain, new Date(Date.UTC(2026, 8, 10)));
    expect(s.usual.value).toBe(55);
    expect(s.usual.range).toEqual([19, 91]);
    expect(s.standing).toBe("usual");
  });

  it("calls the season drier below three quarters of the usual rain", () => {
    const rain = series([...PAST, 2026], 30, (year) => (year === 2026 ? 0.7 : 1));
    expect(summariseSeason(rain, new Date(Date.UTC(2026, 8, 30))).standing).toBe("drier");
    expect(SEASON_RULES.drierBelow).toBe(0.75);
  });

  it("finds the latest day with 5 mm or more", () => {
    const rain = series([...PAST, 2026], 30, () => 1);
    rain["20260905"] = 12.4;
    rain["20260920"] = 5;
    rain["20260925"] = 4.9;
    const s = summariseSeason(rain, new Date(Date.UTC(2026, 8, 30)));
    expect(s.lastGoodRain).toEqual({ date: "2026-09-20", daysAgo: 10, mm: 5 });
  });

  it("says there has been no proper rain when no day reaches 5 mm", () => {
    const rain = series([...PAST, 2026], 30, () => 1);
    expect(summariseSeason(rain, new Date(Date.UTC(2026, 8, 30))).lastGoodRain).toBeNull();
  });

  it("leaves out an earlier season with too many missing days", () => {
    const rain = series([...PAST, 2026], 30, () => 1);
    for (let i = 0; i < 10; i++) rain[key(Date.UTC(2020, 8, 1) + i * DAY)] = -999;
    // Nine seasons of 30 mm remain; the gappy one would have dragged the lowest down to 20.
    expect(summariseSeason(rain, new Date(Date.UTC(2026, 8, 30))).usual.range).toEqual([30, 30]);
  });

  it("refuses when this season has no day of data yet", () => {
    const rain = series(PAST, 30, () => 1);
    expect(() => summariseSeason(rain, new Date(Date.UTC(2026, 8, 2)))).toThrow("no data yet");
  });

  it("refuses when fewer than three earlier seasons can be counted", () => {
    const rain = series([2024, 2025, 2026], 30, () => 1);
    expect(() => summariseSeason(rain, new Date(Date.UTC(2026, 8, 30)))).toThrow("not enough");
  });
});

describe("fetchSeasonRain", () => {
  it("asks NASA POWER for rain from ten Septembers ago to today, at two decimals", async () => {
    const fetchImpl = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({ properties: { parameter: { PRECTOTCORR: { "20260901": 1 } } } }) }));
    const rain = await fetchSeasonRain([16.09284, 40.82341], TODAY, fetchImpl as unknown as typeof fetch);
    expect(rain).toEqual({ "20260901": 1 });
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain("power.larc.nasa.gov");
    expect(url).toContain("parameters=PRECTOTCORR");
    expect(url).toContain("longitude=16.09&latitude=40.82");
    expect(url).toContain("start=20160901&end=20261115");
  });

  it("rejects a failed call and a malformed answer", async () => {
    const failed = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await expect(fetchSeasonRain([16, 40], TODAY, failed as unknown as typeof fetch)).rejects.toThrow("request failed");
    const odd = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ properties: {} }) }));
    await expect(fetchSeasonRain([16, 40], TODAY, odd as unknown as typeof fetch)).rejects.toThrow("invalid response");
  });
});
