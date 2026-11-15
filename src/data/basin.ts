// The basin's 1 km data (data/*.json and *.geojson, served at data/basin/ by the plugin in vite.config.ts).
// About 4.6 MB, so it loads only once a drawn field needs it, and stays in memory for the session.
// The code that reads it (turf.js) is split off too: the demo field never downloads either.
import type { FeatureCollection, Polygon } from "geojson";
import type { FieldBundle, LngLat } from "./types";
import type { BasinData, OutlineValues } from "./fieldshift-data.js";
import { stamped } from "./fresh";
import { BUNDLE_TIMEOUT_MS } from "./validate";

export const BASIN_PATH = "data/basin/";

/**
 * Fetches one of the site's own JSON files, giving up after BUNDLE_TIMEOUT_MS as loadBundle does, so the screen can
 * offer a retry. The address carries the data's fingerprint (fresh.ts), so a newly published app never reads old data.
 */
export async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUNDLE_TIMEOUT_MS);
  try {
    const response = await fetch(stamped(url), { signal: controller.signal });
    if (!response.ok) throw new Error(`basin: ${url} (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export type Basin = {
  data: BasinData;
  /** The outline's values and its bundle; null outside the basin's farmland (or without the weather to build one). */
  build: (ring: LngLat[], demo: FieldBundle, name: string) => { values: OutlineValues; bundle: FieldBundle } | null;
};

let cache: Promise<Basin> | null = null;

/** Loads the basin once per session. A failure is not cached, so Retry asks again. */
export function loadBasin(): Promise<Basin> {
  cache ??= (async (): Promise<Basin> => {
    const [helper, builder] = await Promise.all([import("./fieldshift-data.js"), import("./fieldFromBasin")]);
    const data = await helper.loadData(`${import.meta.env.BASE_URL}${BASIN_PATH}`, getJson);
    const memo = new Map<string, OutlineValues | null>();
    return {
      data,
      build(ring, demo, name) {
        const key = ring.map((p) => p.join(",")).join(";");
        const outline: Polygon = builder.ringPolygon(ring);
        if (!memo.has(key)) memo.set(key, helper.outlineValues(data, outline));
        const values = memo.get(key) ?? null;
        if (!values) return null;
        const bundle = builder.fieldFromBasin(data, values, demo, outline, name);
        return bundle ? { values, bundle } : null;
      },
    };
  })().catch((error: unknown) => {
    cache = null;
    throw error;
  });
  return cache;
}

let outlineCache: Promise<FeatureCollection> | null = null;

/** The basin's outline alone (10 kB), for the map on Find field. */
export function loadBasinOutline(): Promise<FeatureCollection> {
  outlineCache ??= (getJson(`${import.meta.env.BASE_URL}${BASIN_PATH}area.geojson`) as Promise<FeatureCollection>).catch(
    (error: unknown) => {
      outlineCache = null;
      throw error;
    },
  );
  return outlineCache;
}

/** For tests: forget what was loaded. */
export function resetBasin(): void {
  cache = null;
  outlineCache = null;
}
