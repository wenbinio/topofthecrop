// The field timelapse's rules: one frame a month, the tile block around the field, and the scene search.
// Written with AI assistance (Claude, Anthropic).
import type { Polygon } from "geojson";
import { describe, expect, it, vi } from "vitest";
import {
  PC_STAC_SEARCH, TIMELAPSE_RULES, blockTiles, creditYears, fetchScenes, frameLabel, monthlyFrames, searchBody, tileUrl, tileWindow,
} from "./frames";

// The demo field's outline (data/field.json).
const demo: Polygon = {
  type: "Polygon",
  coordinates: [[[16.09393, 40.82501], [16.09426, 40.824], [16.09388, 40.824], [16.09416, 40.82134], [16.09079, 40.82322],
    [16.09141, 40.82429], [16.09235, 40.82417], [16.09251, 40.82472], [16.09253, 40.82471], [16.09393, 40.82501]]],
};

describe("monthlyFrames", () => {
  it("keeps the least cloudy scene of each month, then the one nearest mid-month, in date order", () => {
    const frames = monthlyFrames([
      { id: "c", datetime: "2024-07-02T09:50:21Z", cloud: 1 },
      { id: "a", datetime: "2024-06-28T09:50:21Z", cloud: 3 },
      { id: "b", datetime: "2024-06-08T09:50:21Z", cloud: 0.5 },
      { id: "d", datetime: "2024-07-17T09:50:21Z", cloud: 1 },
    ]);
    expect(frames.map((f) => [f.month, f.id])).toEqual([["2024-06", "b"], ["2024-07", "d"]]);
  });
});

describe("tileWindow", () => {
  it("zooms in as far as the field fits in half the picture, and puts its outline inside the picture", () => {
    const win = tileWindow(demo);
    expect(win.z).toBe(TIMELAPSE_RULES.maxZoom);
    expect(win.size).toBe(512);
    for (const [x, y] of win.points) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(512);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(512);
    }
    expect(blockTiles(win)).toEqual([[win.tx, win.ty], [win.tx + 1, win.ty], [win.tx, win.ty + 1], [win.tx + 1, win.ty + 1]]);
    expect(win.centre[0]).toBeCloseTo(16.0925, 3);
    expect(win.centre[1]).toBeCloseTo(40.8232, 3);
  });

  it("zooms out for a big field", () => {
    const big: Polygon = { type: "Polygon", coordinates: [[[16.0, 40.8], [16.03, 40.8], [16.03, 40.82], [16.0, 40.82], [16.0, 40.8]]] };
    expect(tileWindow(big).z).toBeLessThan(TIMELAPSE_RULES.maxZoom);
  });
});

describe("tileUrl and labels", () => {
  it("asks the data API for the scene's true-colour tile", () => {
    const url = new URL(tileUrl("S2B_MSIL2A_X", 16, 35693, 24640, "jpg"));
    expect(url.pathname).toBe("/api/data/v1/item/tiles/WebMercatorQuad/16/35693/24640@1x");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      collection: "sentinel-2-l2a", item: "S2B_MSIL2A_X", assets: "visual", asset_bidx: "visual|1,2,3", format: "jpg",
    });
  });

  it("dates each frame in Italian time, and spans the years for the Copernicus notice", () => {
    expect(frameLabel("2024-06-15T09:52:00Z", "en")).toBe("15 Jun 2024 · 11:52");
    expect(creditYears(monthlyFrames([
      { id: "a", datetime: "2023-01-10T09:50:00Z", cloud: 1 },
      { id: "b", datetime: "2026-10-10T09:50:00Z", cloud: 1 },
    ]))).toBe("2023–2026");
  });
});

describe("fetchScenes", () => {
  const page = (features: object[], links: object[] = []) =>
    new Response(JSON.stringify({ type: "FeatureCollection", features, links }), { status: 200 });
  const feature = (id: string, datetime: string, cloud: number) => ({ id, properties: { datetime, "eo:cloud_cover": cloud } });

  it("searches around the field's middle from 1 January three years back, and follows the next page", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(page([feature("a", "2024-06-08T09:50:21Z", 1)], [{ rel: "next", href: PC_STAC_SEARCH, method: "POST", body: { token: "next:x" } }]))
      .mockResolvedValueOnce(page([feature("b", "2024-07-08T09:50:21Z", 2), { id: "broken", properties: {} }]));
    const scenes = await fetchScenes([16.09, 40.82], new Date("2026-11-15T12:00:00Z"), fetchImpl as unknown as typeof fetch);
    expect(scenes.map((s) => s.id)).toEqual(["a", "b"]);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ collections: ["sentinel-2-l2a"], intersects: { type: "Point", coordinates: [16.09, 40.82] } });
    expect(body.datetime.startsWith("2023-01-01T00:00:00Z/2026-11-15")).toBe(true);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ token: "next:x" });
  });

  it("asks again for whole items if the service refuses the fields it was asked for", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("bad", { status: 400 }))
      .mockResolvedValueOnce(page([feature("a", "2024-06-08T09:50:21Z", 1)]));
    await fetchScenes([16, 40], new Date("2026-11-15T12:00:00Z"), fetchImpl as unknown as typeof fetch);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).fields).toBeDefined();
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).fields).toBeUndefined();
  });

  it("fails when the search fails, so the screen can offer a retry", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("down", { status: 503 }));
    await expect(fetchScenes([16, 40], new Date(), fetchImpl as unknown as typeof fetch)).rejects.toThrow("503");
  });

  it("leaves out scenes cloudier than the rule in the search itself", () => {
    expect(searchBody([16, 40], new Date("2026-11-15T00:00:00Z"), true)).toMatchObject({
      query: { "eo:cloud_cover": { lt: TIMELAPSE_RULES.maxCloud } },
    });
  });
});
