// The parts of a field that are stronger or weaker, from three things seen from space, so an intercrop can put each
// crop where it suits:
//   greenness (NDVI, Sentinel-2, 10 m) in past springs: where the crop grew better;
//   moisture (NDMI, Sentinel-2 near and short-wave infrared, 20 m) in the same springs: where the crop held more water;
//   high and low ground (Copernicus DEM GLO-30, 30 m): hollows collect water, rises drain and dry first.
// Each spring picture is measured against its own field middle (the median), so a wet year and a dry year count the
// same; what is left is the pattern that comes back year after year. The three are put on one scale (how many
// standard deviations from the field's average) and averaged. Where they agree, the split is firmer.
// Data: Copernicus Sentinel-2 L2A and Copernicus DEM through Microsoft Planetary Computer (as the timelapse).
// Written with AI assistance (Claude, Anthropic).
import type { Polygon } from "geojson";
import { PC_STAC_SEARCH, PC_TILES, blockTiles, fetchScenes, tileWindow } from "../timelapse/frames";
import type { Scene, TileWindow } from "../timelapse/frames";

export const ZONE_RULES = {
  /** March to May: durum and the legumes are green and growing, before the crops dry off. */
  months: [3, 4, 5],
  maxCloud: 10,
  /** At most this many pictures, at most one per spring. */
  scenes: 4,
  /** Cell size in metres: Sentinel-2's own pixel. */
  cellMetres: 10,
  /** The tiles are rescaled from these ranges to 0–255. */
  ndviRange: [-0.2, 1] as const,
  ndmiRange: [-0.5, 0.7] as const,
  /** Elevation: a coarse first look over this range, then this many metres either side of the field's middle. */
  demCoarse: [0, 3000] as const,
  demHalfSpan: 40,
};

/** The clearest spring picture of each of the last few years, newest first. */
export function springScenes(scenes: Scene[]): Scene[] {
  const byYear = new Map<string, Scene>();
  for (const s of scenes) {
    const month = Number(s.datetime.slice(5, 7));
    if (!ZONE_RULES.months.includes(month) || s.cloud >= ZONE_RULES.maxCloud) continue;
    const year = s.datetime.slice(0, 4);
    const kept = byYear.get(year);
    if (!kept || s.cloud < kept.cloud) byYear.set(year, s);
  }
  return [...byYear.values()].sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, ZONE_RULES.scenes);
}

function s2Url(item: string, expression: string, range: readonly [number, number], z: number, x: number, y: number): string {
  const query = new URLSearchParams({
    collection: "sentinel-2-l2a",
    item,
    expression,
    asset_as_band: "true",
    rescale: range.join(","),
    format: "png",
    resampling: "nearest",
    nodata: "0",
  });
  return `${PC_TILES}/${z}/${x}/${y}@1x?${query}`;
}

/** One greenness (NDVI) tile, one grey value per pixel. */
export function ndviTileUrl(item: string, z: number, x: number, y: number): string {
  return s2Url(item, "(B08-B04)/(B08+B04)", ZONE_RULES.ndviRange, z, x, y);
}

/** One moisture (NDMI) tile: near infrared against short-wave infrared, which water in leaves absorbs. */
export function ndmiTileUrl(item: string, z: number, x: number, y: number): string {
  return s2Url(item, "(B08-B11)/(B08+B11)", ZONE_RULES.ndmiRange, z, x, y);
}

/** One elevation tile, rescaled from `range` metres. */
export function demTileUrl(item: string, range: readonly [number, number], z: number, x: number, y: number): string {
  const query = new URLSearchParams({ collection: "cop-dem-glo-30", item, assets: "data", rescale: range.join(","), format: "png", resampling: "bilinear" });
  return `${PC_TILES}/${z}/${x}/${y}@1x?${query}`;
}

type Pt = [number, number];

export function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Metres per tile pixel at this zoom and latitude. */
export function metresPerPixel(z: number, lat: number): number {
  return (156_543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

const keyOf = (cx: number, cy: number) => `${cx},${cy}`;

/**
 * Per 10 m cell, the mean of one measure over the pictures: each picture's cell mean minus that picture's field
 * median (so only the pattern within the field is left). `range` turns a grey value back into the measure.
 */
export function signalByCell(win: TileWindow, pictures: Uint8ClampedArray[], width: number, lat: number, range: readonly [number, number]): Map<string, number> {
  const size = ZONE_RULES.cellMetres / metresPerPixel(win.z, lat);
  const [lo, hi] = range;
  const sums = new Map<string, number[]>();
  pictures.forEach((grey, p) => {
    const acc = new Map<string, [number, number]>();
    const height = grey.length / width;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const v = grey[py * width + px];
        if (!v || !inside([px + 0.5, py + 0.5], win.points)) continue;
        const k = keyOf(Math.floor(px / size), Math.floor(py / size));
        const a = acc.get(k) ?? [0, 0];
        a[0] += lo + (v / 255) * (hi - lo);
        a[1] += 1;
        acc.set(k, a);
      }
    }
    const means = [...acc.entries()].map(([k, [s, n]]) => [k, s / n] as const);
    const sorted = means.map(([, m]) => m).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    for (const [k, m] of means) {
      const list = sums.get(k) ?? Array<number>(pictures.length).fill(Number.NaN);
      list[p] = m - median;
      sums.set(k, list);
    }
  });
  const out = new Map<string, number>();
  for (const [k, list] of sums) {
    const ok = list.filter((v) => !Number.isNaN(v));
    if (ok.length) out.set(k, ok.reduce((a, b) => a + b, 0) / ok.length);
  }
  return out;
}

/** Each value as standard deviations from the mean of all; all 0 when they do not vary. */
function standardise(m: Map<string, number>): Map<string, number> {
  const v = [...m.values()];
  const mean = v.reduce((a, b) => a + b, 0) / (v.length || 1);
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length || 1));
  return new Map([...m.entries()].map(([k, x]) => [k, sd > 1e-9 ? (x - mean) / sd : 0]));
}

/** Eased with its four neighbours (the cell itself counting twice), so single noisy pixels do not make islands. */
function smooth(m: Map<string, number>): Map<string, number> {
  return new Map(
    [...m.entries()].map(([k, v]) => {
      const [cx, cy] = k.split(",").map(Number);
      let s = v * 2;
      let n = 2;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const w = m.get(keyOf(cx + dx, cy + dy));
        if (w !== undefined) {
          s += w;
          n += 1;
        }
      }
      return [k, s / n];
    }),
  );
}

export type SignalName = "green" | "moisture" | "ground";

/** A 10 m square of the field, in the tile block's pixels. */
export type Cell = {
  x: number;
  y: number;
  size: number;
  /** The combined score: + is the stronger, moister side; − the weaker, drier side. (Kept as `vigour` for the split.) */
  vigour: number;
  /** Each signal's own score, + meaning stronger or moister (for ground: lower, where water gathers). */
  parts: Partial<Record<SignalName, number>>;
};

/**
 * The cells from one or more signals. Greenness and moisture count + where higher; ground counts + where lower.
 * Each is standardised, the available ones averaged, then eased with the neighbours.
 */
export function combine(win: TileWindow, signals: Partial<Record<SignalName, Map<string, number>>>, lat: number): Cell[] {
  const size = ZONE_RULES.cellMetres / metresPerPixel(win.z, lat);
  const z: Partial<Record<SignalName, Map<string, number>>> = {};
  for (const name of ["green", "moisture", "ground"] as const) {
    const m = signals[name];
    if (!m || !m.size) continue;
    const s = standardise(m);
    z[name] = name === "ground" ? new Map([...s.entries()].map(([k, v]) => [k, -v])) : s;
  }
  const names = Object.keys(z) as SignalName[];
  const keys = new Set(z.green ? z.green.keys() : names.length ? z[names[0]]!.keys() : []);
  const score = new Map<string, number>();
  for (const k of keys) {
    const vals = names.map((n) => z[n]!.get(k)).filter((v): v is number => v !== undefined);
    if (vals.length) score.set(k, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const eased = smooth(score);
  return [...eased.entries()].map(([k, v]) => {
    const [cx, cy] = k.split(",").map(Number);
    const parts: Partial<Record<SignalName, number>> = {};
    for (const n of names) {
      const p = z[n]!.get(k);
      if (p !== undefined) parts[n] = p;
    }
    return { x: cx * size, y: cy * size, size, vigour: v, parts };
  });
}

/** Greenness alone (the first version, kept for its tests): cells and their eased greenness. */
export function cellsFrom(win: TileWindow, pictures: Uint8ClampedArray[], width: number, lat: number): Cell[] {
  const size = ZONE_RULES.cellMetres / metresPerPixel(win.z, lat);
  const eased = smooth(signalByCell(win, pictures, width, lat, ZONE_RULES.ndviRange));
  return [...eased.entries()].map(([k, v]) => {
    const [cx, cy] = k.split(",").map(Number);
    return { x: cx * size, y: cy * size, size, vigour: v, parts: { green: v } };
  });
}

/** Which cells take which crop: the weaker half of the field (by count of equal cells, so by area) is "weak". */
export function splitByVigour(cells: Cell[]): ("weak" | "strong")[] {
  const order = cells.map((c, i) => [c.vigour, i] as const).sort((a, b) => a[0] - b[0]);
  const out: ("weak" | "strong")[] = Array(cells.length).fill("strong");
  order.slice(0, Math.floor(cells.length / 2)).forEach(([, i]) => (out[i] = "weak"));
  return out;
}

/** The share of the field (0–1) where every signal points the same way as the split. */
export function agreement(cells: Cell[], sides: ("weak" | "strong")[]): number {
  if (!cells.length) return 0;
  let agree = 0;
  cells.forEach((c, i) => {
    const want = sides[i] === "strong" ? 1 : -1;
    const parts = Object.values(c.parts);
    if (parts.length && parts.every((p) => Math.sign(p) === want || Math.abs(p) < 0.1)) agree += 1;
  });
  return agree / cells.length;
}

export type FieldZones = { win: TileWindow; cells: Cell[]; dates: string[]; signals: SignalName[] };

async function block(win: TileWindow, url: (x: number, y: number) => string, fetchImpl: typeof fetch): Promise<Uint8ClampedArray | null> {
  const width = win.cols * 256;
  const height = win.rows * 256;
  const canvas = new OffscreenCanvas(width, height);
  const g = canvas.getContext("2d");
  if (!g) return null;
  const ok = await Promise.all(
    blockTiles(win).map(async ([x, y]) => {
      const reply = await fetchImpl(url(x, y));
      if (!reply.ok) return false;
      g.drawImage(await createImageBitmap(await reply.blob()), (x - win.tx) * 256, (y - win.ty) * 256);
      return true;
    }),
  );
  if (!ok.every(Boolean)) return null;
  const rgba = g.getImageData(0, 0, width, height).data;
  const grey = new Uint8ClampedArray(width * height);
  for (let i = 0; i < grey.length; i++) grey[i] = rgba[i * 4 + 3] ? rgba[i * 4] : 0;
  return grey;
}

/** The Copernicus 30 m elevation item over the field's middle. */
async function demItem(centre: [number, number], fetchImpl: typeof fetch): Promise<string | null> {
  const reply = await fetchImpl(PC_STAC_SEARCH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collections: ["cop-dem-glo-30"], intersects: { type: "Point", coordinates: centre }, limit: 1 }),
  });
  if (!reply.ok) return null;
  const page = (await reply.json()) as { features?: { id?: unknown }[] };
  const id = page.features?.[0]?.id;
  return typeof id === "string" ? id : null;
}

/** The field's elevation, relative to its middle, per cell; null if the elevation tiles are not available. */
async function groundByCell(win: TileWindow, width: number, fetchImpl: typeof fetch): Promise<Map<string, number> | null> {
  const item = await demItem(win.centre, fetchImpl);
  if (!item) return null;
  const coarse = await block(win, (x, y) => demTileUrl(item, ZONE_RULES.demCoarse, win.z, x, y), fetchImpl);
  if (!coarse) return null;
  const rough = signalByCell(win, [coarse], width, win.centre[1], ZONE_RULES.demCoarse);
  if (!rough.size) return null;
  // signalByCell gives values around the field's median; find the median itself from the coarse grey values.
  const inField: number[] = [];
  for (let py = 0; py < coarse.length / width; py++)
    for (let px = 0; px < width; px++) if (coarse[py * width + px] && inside([px + 0.5, py + 0.5], win.points)) inField.push(coarse[py * width + px]);
  inField.sort((a, b) => a - b);
  const [lo, hi] = ZONE_RULES.demCoarse;
  const middle = lo + (inField[Math.floor(inField.length / 2)] / 255) * (hi - lo);
  const fine: [number, number] = [middle - ZONE_RULES.demHalfSpan, middle + ZONE_RULES.demHalfSpan];
  const picture = await block(win, (x, y) => demTileUrl(item, fine, win.z, x, y), fetchImpl);
  return picture ? signalByCell(win, [picture], width, win.centre[1], fine) : null;
}

/**
 * Fetch the field's spring pictures (greenness and moisture) and its elevation, and work out its cells.
 * Greenness is needed; moisture and elevation join when they load. Null when there is no usable greenness.
 */
export async function fetchFieldZones(outline: Polygon, fetchImpl: typeof fetch = fetch): Promise<FieldZones | null> {
  const win = tileWindow(outline);
  const width = win.cols * 256;
  const lat = win.centre[1];
  const scenes = springScenes(await fetchScenes(win.centre, new Date(), fetchImpl));
  if (!scenes.length) return null;
  const ground = groundByCell(win, width, fetchImpl).catch(() => null);
  const green: Uint8ClampedArray[] = [];
  const moist: Uint8ClampedArray[] = [];
  const dates: string[] = [];
  await Promise.all(
    scenes.map(async (scene) => {
      const [g, m] = await Promise.all([
        block(win, (x, y) => ndviTileUrl(scene.id, win.z, x, y), fetchImpl),
        block(win, (x, y) => ndmiTileUrl(scene.id, win.z, x, y), fetchImpl).catch(() => null),
      ]);
      if (!g) return;
      green.push(g);
      if (m) moist.push(m);
      dates.push(scene.datetime.slice(0, 10));
    }),
  );
  if (!green.length) return null;
  const signals: Partial<Record<SignalName, Map<string, number>>> = {
    green: signalByCell(win, green, width, lat, ZONE_RULES.ndviRange),
  };
  if (moist.length) signals.moisture = signalByCell(win, moist, width, lat, ZONE_RULES.ndmiRange);
  const g = await ground;
  if (g?.size) signals.ground = g;
  const cells = combine(win, signals, lat);
  return cells.length ? { win, cells, dates: dates.sort(), signals: Object.keys(signals) as SignalName[] } : null;
}
