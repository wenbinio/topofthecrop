// Field timelapse: one clear Sentinel-2 picture a month of the farmer's own field, fetched live from Microsoft's
// Planetary Computer: its STAC API finds the scenes, its data API draws map tiles of them. No account or key is
// needed. The rules here are pure; the screen is src/screens/Timelapse.tsx. docs/scoring.md, "Field timelapse",
// states the choices in plain words. Written with AI assistance (Claude, Anthropic).
import type { Polygon } from "geojson";
import type { Lang } from "../data/types";

export const PC_STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
export const PC_DATA = "https://planetarycomputer.microsoft.com/api/data/v1";
export const PC_TILES = `${PC_DATA}/item/tiles/WebMercatorQuad`;
export const TIMELAPSE_TIMEOUT_MS = 8000;

/** Our judgement (docs/scoring.md, "Field timelapse"). */
export const TIMELAPSE_RULES = {
  /** Pictures from 1 January this many years back. */
  years: 3,
  /** A scene with more cloud than this, in %, over its whole 100 km tile, is not used. */
  maxCloud: 25,
  /** Zoom levels tried, closest first: the closest at which the field and its margin fit in one tile's width. */
  maxZoom: 18,
  minZoom: 12,
  /** Margin around the field, as a share of its longer side, on each side of the picture. */
  margin: 0.08,
  /** Pictures tried for each month, least cloudy first, until one is clear at the field. */
  perMonth: 3,
};

/**
 * Sentinel-2 scene classes (SCL) that count as a clear view of the ground: dark features, vegetation, bare soil,
 * water, unclassified, snow. No data (0), defective (1), cloud shadow (3), cloud (8, 9) and cirrus (10) do not.
 */
export const CLEAR_SCL = new Set([2, 4, 5, 6, 7, 11]);

const TILE = 256;

export type Scene = { id: string; datetime: string; cloud: number };
export type Frame = Scene & { month: string };

const offMiddle = (iso: string) => Math.abs(Number(iso.slice(8, 10)) - 15);
const better = (a: Scene, b: Scene) => a.cloud - b.cloud || offMiddle(a.datetime) - offMiddle(b.datetime);

/**
 * Each month's scenes, least cloudy first, then nearest the middle of the month; months in date order. A Sentinel-2
 * pass over Basilicata is mid-morning, so the month in UTC is the local month.
 */
export function monthCandidates(scenes: Scene[], perMonth = TIMELAPSE_RULES.perMonth): { month: string; scenes: Scene[] }[] {
  const byMonth = new Map<string, Scene[]>();
  for (const scene of scenes) {
    const month = scene.datetime.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), scene]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, list]) => ({ month, scenes: [...list].sort(better).slice(0, perMonth) }));
}

/** One frame a month, before any check at the field: each month's first candidate. */
export function monthlyFrames(scenes: Scene[]): Frame[] {
  return monthCandidates(scenes, 1).map(({ month, scenes: [scene] }) => ({ ...scene, month }));
}

/** The first number anywhere in the data API's answer to a point query, whatever its shape. */
function firstNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const n = firstNumber(item);
      if (n !== null) return n;
    }
  }
  return null;
}

/** The data API's point query: the scene class at one place. */
export function sclUrl(item: string, [lon, lat]: [number, number]): string {
  const query = new URLSearchParams({ collection: "sentinel-2-l2a", item, assets: "SCL" });
  return `${PC_DATA}/item/point/${lon.toFixed(5)},${lat.toFixed(5)}?${query}`;
}

/** Whether the scene sees the ground at the field's middle: true, false, or null when the check could not be made. */
export async function clearAtField(item: string, centre: [number, number], fetchImpl: typeof fetch = fetch): Promise<boolean | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMELAPSE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(sclUrl(item, centre), { signal: abort.signal });
    if (!response.ok) return null;
    const scl = firstNumber(((await response.json()) as { values?: unknown }).values);
    return scl === null ? null : CLEAR_SCL.has(scl);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One frame a month: the first candidate that is clear at the field. A month with no clear candidate is left out.
 * If the check cannot be made at all (the service refuses it), every month keeps its least cloudy scene, as before.
 */
export async function chooseFrames(scenes: Scene[], centre: [number, number], fetchImpl: typeof fetch = fetch): Promise<Frame[]> {
  let checking = true;
  const pick = async ({ month, scenes: list }: { month: string; scenes: Scene[] }): Promise<Frame | null> => {
    for (const scene of list) {
      if (!checking) return { ...scene, month };
      const clear = await clearAtField(scene.id, centre, fetchImpl);
      if (clear === null) {
        checking = false;
        return { ...scene, month };
      }
      if (clear) return { ...scene, month };
    }
    return null;
  };
  const months = monthCandidates(scenes);
  const chosen: (Frame | null)[] = new Array(months.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < months.length) {
      const i = next++;
      chosen[i] = await pick(months[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, months.length) }, worker));
  return chosen.filter((frame): frame is Frame => frame !== null);
}

const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * TILE * 2 ** z;
const latToY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

export type TileWindow = {
  z: number;
  /** The top-left tile, and how many tiles across and down (one or two each). */
  tx: number;
  ty: number;
  cols: number;
  rows: number;
  /** The square shown, in pixels from the top-left tile's corner: the field and its margin. */
  region: { x: number; y: number; size: number };
  /** The field's outline, in the same pixels. */
  points: [number, number][];
  /** Middle of the field, [lon, lat]: the point the scenes must cover. */
  centre: [number, number];
};

/**
 * The square around the field and its margin, at the closest zoom where that square is at most one tile wide, so
 * it never needs more than 2 × 2 tiles. The screen stretches the square to fill the picture.
 */
export function tileWindow(outline: Polygon): TileWindow {
  const ring = outline.coordinates[0];
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const square = (z: number) => Math.max(lonToX(e, z) - lonToX(w, z), latToY(s, z) - latToY(n, z)) * (1 + 2 * TIMELAPSE_RULES.margin);
  let z = TIMELAPSE_RULES.maxZoom;
  while (z > TIMELAPSE_RULES.minZoom && square(z) > TILE) z--;
  const size = Math.max(square(z), 1);
  const cx = (lonToX(w, z) + lonToX(e, z)) / 2;
  const cy = (latToY(n, z) + latToY(s, z)) / 2;
  const [left, top] = [cx - size / 2, cy - size / 2];
  const tx = Math.floor(left / TILE);
  const ty = Math.floor(top / TILE);
  return {
    z,
    tx,
    ty,
    cols: Math.floor((left + size - 1e-9) / TILE) - tx + 1,
    rows: Math.floor((top + size - 1e-9) / TILE) - ty + 1,
    region: { x: left - tx * TILE, y: top - ty * TILE, size },
    points: ring.map(([lon, lat]) => [lonToX(lon, z) - tx * TILE, latToY(lat, z) - ty * TILE] as [number, number]),
    centre: [(w + e) / 2, (s + n) / 2],
  };
}

/** The tiles of a frame, row by row: [x, y]. */
export function blockTiles(win: TileWindow): [number, number][] {
  const out: [number, number][] = [];
  for (let row = 0; row < win.rows; row++) for (let col = 0; col < win.cols; col++) out.push([win.tx + col, win.ty + row]);
  return out;
}

/** A true-colour map tile of one scene. JPEG first, being smaller; the screen falls back to PNG. */
export function tileUrl(item: string, z: number, x: number, y: number, format: "jpg" | "png"): string {
  const query = new URLSearchParams({
    collection: "sentinel-2-l2a",
    item,
    assets: "visual",
    asset_bidx: "visual|1,2,3",
    nodata: "0",
    format,
    resampling: "bilinear",
  });
  return `${PC_TILES}/${z}/${x}/${y}@1x?${query}`;
}

/** The scenes whose footprint covers the field's middle, from 1 January `years` back until today. */
export function searchBody(centre: [number, number], today: Date, withFields: boolean): Record<string, unknown> {
  const from = `${today.getUTCFullYear() - TIMELAPSE_RULES.years}-01-01T00:00:00Z`;
  return {
    collections: ["sentinel-2-l2a"],
    intersects: { type: "Point", coordinates: centre },
    datetime: `${from}/${today.toISOString()}`,
    query: { "eo:cloud_cover": { lt: TIMELAPSE_RULES.maxCloud } },
    limit: 500,
    ...(withFields
      ? { fields: { include: ["id", "properties.datetime", "properties.eo:cloud_cover"], exclude: ["assets", "links", "geometry", "bbox"] } }
      : {}),
  };
}

type StacPage = {
  features?: { id?: unknown; properties?: Record<string, unknown> }[];
  links?: { rel?: string; href?: string; method?: string; body?: Record<string, unknown> }[];
};

function scenesOf(page: StacPage): Scene[] {
  return (page.features ?? []).flatMap((f) => {
    const datetime = f.properties?.datetime;
    const cloud = f.properties?.["eo:cloud_cover"];
    return typeof f.id === "string" && typeof datetime === "string" && typeof cloud === "number" ? [{ id: f.id, datetime, cloud }] : [];
  });
}

/**
 * Every usable scene over the field. Asks for only the fields it needs and, if the service refuses that, asks again
 * for whole items. Follows up to three "next" pages. Gives up after 8 seconds.
 */
export async function fetchScenes(centre: [number, number], today = new Date(), fetchImpl: typeof fetch = fetch): Promise<Scene[]> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMELAPSE_TIMEOUT_MS);
  const post = (href: string, body: unknown) =>
    fetchImpl(href, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: abort.signal });
  try {
    let response = await post(PC_STAC_SEARCH, searchBody(centre, today, true));
    if (response.status === 400 || response.status === 422) response = await post(PC_STAC_SEARCH, searchBody(centre, today, false));
    if (!response.ok) throw new Error(`STAC search: HTTP ${response.status}`);
    let page = (await response.json()) as StacPage;
    const scenes = scenesOf(page);
    for (let more = 0; more < 3; more++) {
      const next = page.links?.find((link) => link.rel === "next" && link.href);
      if (!next?.href) break;
      const reply =
        next.method === "POST"
          ? await post(next.href, next.body ?? {})
          : await fetchImpl(next.href, { signal: abort.signal });
      if (!reply.ok) break;
      page = (await reply.json()) as StacPage;
      scenes.push(...scenesOf(page));
    }
    return scenes;
  } finally {
    clearTimeout(timer);
  }
}

/** "15 Jun 2024 · 11:52", in Italian time. */
export function frameLabel(iso: string, lang: Lang): string {
  const locale = lang === "it" ? "it-IT" : "en-GB";
  const when = new Date(iso);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" }).format(when);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(when);
  return `${date} · ${time}`;
}

/** The years the frames span, for the Copernicus notice: "2023–2026", or one year. */
export function creditYears(frames: Frame[]): string {
  if (!frames.length) return "";
  const first = frames[0].datetime.slice(0, 4);
  const last = frames[frames.length - 1].datetime.slice(0, 4);
  return first === last ? first : `${first}–${last}`;
}
