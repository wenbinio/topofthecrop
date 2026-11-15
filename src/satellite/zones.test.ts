import { describe, expect, it } from "vitest";
import type { Scene, TileWindow } from "../timelapse/frames";
import { agreement, cellsFrom, combine, inside, metresPerPixel, ndviTileUrl, springScenes, splitByVigour, ZONE_RULES } from "./zones";

const scene = (datetime: string, cloud: number, id = datetime): Scene => ({ id, datetime, cloud });

describe("spring pictures", () => {
  it("keeps the clearest March–May picture of each year, newest first, at most four", () => {
    const picked = springScenes([
      scene("2025-04-10T10:00:00Z", 5, "a"),
      scene("2025-04-20T10:00:00Z", 2, "b"),
      scene("2025-07-01T10:00:00Z", 0, "summer"),
      scene("2024-03-15T10:00:00Z", 9, "c"),
      scene("2024-05-02T10:00:00Z", 12, "cloudy"),
      scene("2023-05-30T10:00:00Z", 1, "d"),
      scene("2022-04-01T10:00:00Z", 1, "e"),
      scene("2021-04-01T10:00:00Z", 1, "f"),
    ]);
    expect(picked.map((s) => s.id)).toEqual(["b", "c", "d", "e"]);
    expect(picked).toHaveLength(ZONE_RULES.scenes);
  });

  it("asks the tile service for NDVI, not true colour", () => {
    const url = ndviTileUrl("S2X", 17, 1, 2);
    expect(url).toContain("/17/1/2@1x?");
    expect(decodeURIComponent(url)).toContain("expression=(B08-B04)/(B08+B04)");
    expect(url).toContain("format=png");
  });
});

describe("cells and zones", () => {
  // A 60 × 60 px square field in a 64 px block at zoom 17 near Genzano (about 0.9 m a pixel, so 10 m ≈ 11 px).
  const win: TileWindow = {
    z: 17,
    tx: 0,
    ty: 0,
    cols: 1,
    rows: 1,
    region: { x: 0, y: 0, size: 64 },
    points: [
      [2, 2],
      [62, 2],
      [62, 62],
      [2, 62],
    ],
    centre: [16.09, 40.82],
  };
  const width = 64;
  /** Left half greener or weaker than the right, by grey value. */
  const picture = (left: number, right: number) => {
    const grey = new Uint8ClampedArray(width * width);
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) grey[y * width + x] = x < 32 ? left : right;
    return grey;
  };

  it("measures pixels in 10 m cells", () => {
    expect(metresPerPixel(17, 40.82)).toBeGreaterThan(0.85);
    expect(metresPerPixel(17, 40.82)).toBeLessThan(0.95);
    const cells = cellsFrom(win, [picture(120, 120)], width, 40.82);
    expect(cells.length).toBeGreaterThanOrEqual(25);
    expect(cells.length).toBeLessThanOrEqual(49);
    for (const c of cells) expect(Math.abs(c.vigour)).toBeLessThan(1e-9);
  });

  it("finds the side that is weaker in every spring, whatever each year's overall greenness", () => {
    // A wet spring (everything greener) and a dry one (everything paler): the left stays weaker in both.
    const cells = cellsFrom(win, [picture(150, 190), picture(60, 90)], width, 40.82);
    const sides = splitByVigour(cells);
    const left = cells.map((c, i) => [c, sides[i]] as const).filter(([c]) => c.x + c.size / 2 < 20);
    const right = cells.map((c, i) => [c, sides[i]] as const).filter(([c]) => c.x + c.size / 2 > 44);
    expect(left.length).toBeGreaterThan(0);
    expect(left.every(([, s]) => s === "weak")).toBe(true);
    expect(right.every(([, s]) => s === "strong")).toBe(true);
    // Half the cells each way: equal cells, so equal area.
    expect(sides.filter((s) => s === "weak").length).toBe(Math.floor(cells.length / 2));
  });

  it("leaves out pixels with no data and pixels outside the outline", () => {
    const grey = picture(0, 150);
    const cells = cellsFrom(win, [grey], width, 40.82);
    expect(cells.every((c) => c.x >= 22)).toBe(true);
    expect(inside([1, 1], win.points)).toBe(false);
    expect(inside([30, 30], win.points)).toBe(true);
  });
});

describe("three signals", () => {
  const win: TileWindow = {
    z: 17, tx: 0, ty: 0, cols: 1, rows: 1, region: { x: 0, y: 0, size: 64 },
    points: [[0, 0], [64, 0], [64, 64], [0, 64]], centre: [16.09, 40.82],
  };
  const keys = ["0,0", "1,0", "2,0", "3,0"];
  const map = (vals: number[]) => new Map(keys.map((k, i) => [k, vals[i]]));

  it("counts low ground as the moister side, and high ground as the drier", () => {
    const cells = combine(win, { ground: map([-3, -1, 1, 3]) }, 40.82);
    const byX = [...cells].sort((a, b) => a.x - b.x);
    expect(byX[0].parts.ground).toBeGreaterThan(0);
    expect(byX[3].parts.ground).toBeLessThan(0);
  });

  it("averages the signals it has, and says where they all agree with the split", () => {
    // Greenness and moisture agree; the ground disagrees on the last two cells.
    const cells = combine(win, { green: map([-2, -1, 1, 2]), moisture: map([-2, -1, 1, 2]), ground: map([1, 1, 1, -1]) }, 40.82);
    const sides = splitByVigour(cells);
    expect(cells.every((c) => Object.keys(c.parts).length === 3)).toBe(true);
    const share = agreement(cells, sides);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
    const same = combine(win, { green: map([-2, -1, 1, 2]), moisture: map([-2, -1, 1, 2]) }, 40.82);
    expect(agreement(same, splitByVigour(same))).toBe(1);
  });
});
