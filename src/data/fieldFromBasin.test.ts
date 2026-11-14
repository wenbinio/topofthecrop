/// <reference types="node" />
// @vitest-environment node
// Builds drawn-field bundles from the real basin files in data/ (read from disk), with Edison's helper.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import shipped from "../../public/data/genzano-demo.json";
import type { FieldBundle, LngLat } from "./types";
import { DRAWN_FIELD_ID } from "./types";
import { AREA_UNKNOWN } from "./caveats";
import { fieldFromBasin, ringPolygon } from "./fieldFromBasin";
import { loadData, outlineValues, squareAt } from "./fieldshift-data.js";
import type { BasinData } from "./fieldshift-data.js";
import { validateBundle } from "./validate";

const DATA = join(process.cwd(), "data") + "/";
const demo = validateBundle(structuredClone(shipped)) as FieldBundle;
let d: BasinData;

beforeAll(async () => {
  d = await loadData("", async (name: string) => JSON.parse(readFileSync(DATA + name, "utf8")));
});

/** A small box (about 85 × 110 m) around a point: well inside one 1 km square unless the point is on an edge. */
function box([lon, lat]: LngLat, half = 0.0005): LngLat[] {
  return [[lon - half, lat - half], [lon + half, lat - half], [lon + half, lat + half], [lon - half, lat + half]];
}

function build(ring: LngLat[]) {
  const outline = ringPolygon(ring);
  const values = outlineValues(d, outline);
  return { values, bundle: values ? fieldFromBasin(d, values, demo, outline, "Your field") : null };
}

const value = (bundle: FieldBundle, label: string) => bundle.findings.find((f) => f.fact.label === label)?.fact.value;

describe("a drawn field in the basin", () => {
  const CENTRE: LngLat = [16.092837, 40.823353]; // the demo field's centre

  it("the square under the demo field gives figures of the same order as the demo bundle", () => {
    const id = squareAt(d, ...CENTRE);
    expect(id).not.toBeNull();
    const { values, bundle } = build(box(CENTRE));
    expect(values!.squares.map((s) => s.id)).toContain(id);
    expect(bundle).not.toBeNull();
    const b = bundle!;
    const bare = Number(value(b, "finding.bare.fact"));
    const hot = Number(value(b, "finding.heat.fact"));
    const autumn = Number(value(b, "finding.dry.fact"));
    console.log(`demo square ${id}: bare ${bare} months (demo ${value(demo, "finding.bare.fact")}), hot ${hot} days (demo ${value(demo, "finding.heat.fact")}), Oct-Nov rain ${autumn} mm (demo ${value(demo, "finding.dry.fact")}), hottest ${b.year.hotDays["much-drier"].now.value}, 2050 ${b.year.hotDays.normal.by2050.value}`);
    // The 1 km square holds more than the field (edges, tracks, other crops), so it may be bare longer;
    // it stays inside the demo field's own year-to-year range (1 to 6 months).
    const demoBare = demo.findings[0].fact;
    expect(bare).toBeGreaterThanOrEqual(demoBare.range![0]);
    expect(bare).toBeLessThanOrEqual(demoBare.range![1]);
    expect(Math.abs(hot - Number(value(demo, "finding.heat.fact")))).toBeLessThanOrEqual(3);
    expect(autumn / Number(value(demo, "finding.dry.fact"))).toBeGreaterThan(0.7);
    expect(autumn / Number(value(demo, "finding.dry.fact"))).toBeLessThan(1.4);
    // The hottest-season stop: the most hot days in any season under the outline.
    const bySeason = values!.weather!.hot_days_flower_by_season.filter((n): n is number => n !== null);
    expect(b.year.hotDays["much-drier"].now.value).toBeCloseTo(Math.max(...bySeason), 1);
  });

  it("every figure is for the area, real, fair or low, with a range and a source", () => {
    const b = build(box(CENTRE)).bundle!;
    expect(b.field).toMatchObject({ id: DRAWN_FIELD_ID, name: "Your field" });
    expect(b.field.areaHa).toBeGreaterThan(0.5);
    expect(b.field.basin!.farmlandShare).toBeGreaterThan(0.9);
    const facts = [
      ...b.findings.map((f) => f.fact),
      ...b.options[0].why.evidence,
      ...Object.values(b.year.hotDays).flatMap((s) => [s.now, s.by2050]),
      b.year.flowerHigh!.now, b.year.flowerHigh!.by2050,
    ];
    for (const fact of facts) {
      expect(fact.scale).toBe("area");
      expect(fact.placeholder).toBe(false);
      expect(["fair", "low"]).toContain(fact.confidence);
      expect(fact.source.dataset).toBeTruthy();
      expect(Number.isFinite(fact.value)).toBe(true);
    }
    expect(b.findings.map((f) => f.fact)).toHaveLength(3);
    for (const f of b.findings) expect(f.fact.range).toHaveLength(2);
    expect(b.year.months).toHaveLength(12);
    expect(b.year.months.every((m) => m.cover !== "none")).toBe(true);
    expect(b.options.map((o) => o.id)).toEqual(demo.options.map((o) => o.id));
    expect(b.options.every((o) => o.why.unknowns.includes(AREA_UNKNOWN))).toBe(true);
    expect(b.options[0].facts).toEqual(demo.options[0].facts);
    expect(b.economics).toEqual(demo.economics);
    // The demo field's squares are mostly durum on the 2022 crop map.
    expect(b.lastCrop).toMatchObject({ crop: "durum", source: { dataset: "EU crop map 2022 (JRC)" } });
    expect(b.lastCrop.appDefault).toBeUndefined();
  });

  it("a square without greenness leaves out that finding and that evidence, never shows 0, and marks the strip no data", () => {
    // One of the five farmland squares with no usable MODIS pixels (HANDOVER section 7, item 11).
    const id = "1kmE4812N1981";
    expect(d.cells_greenness.cells[id]).toBeUndefined();
    const square = d.farmSquares.find((f) => f.id === id)!;
    const { values, bundle } = build(box([square.properties.lon, square.properties.lat]));
    expect(values!.greenness).toBeNull();
    const b = bundle!;
    expect(b.findings.map((f) => f.title)).toEqual(["finding.heat.title", "finding.dry.title"]);
    expect(b.options[0].why.evidence.map((f) => f.label)).not.toContain("evidence.bareMonths");
    expect(b.year.months.every((m) => m.cover === "none")).toBe(true);
    expect(b.year.months.some((m) => m.risks.includes("rain"))).toBe(false);
  });

  it("an outline outside the basin's farmland gives null", () => {
    expect(build(box([12.4964, 41.9028])).values).toBeNull(); // Rome
  });
});
