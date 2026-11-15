// Field timelapse: one clear Sentinel-2 picture a month of the farmer's own field, fetched live from Microsoft's
// Planetary Computer: its STAC API finds the scenes, its data API draws map tiles of them. No account or key is
// needed. The rules here are pure; the screen is src/screens/Timelapse.tsx. docs/scoring.md, "Field timelapse",
// states the choices in plain words. Written with AI assistance (Claude, Anthropic).
import type { Polygon } from "geojson";
import type { Lang } from "../data/types";

export const PC_STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
export const PC_TILES = "https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad";
export const TIMELAPSE_TIMEOUT_MS = 8000;

/** Our judgement (docs/scoring.md, "Field timelapse"). */
export const TIMELAPSE_RULES = {
  /** Pictures from 1 January this many years back. */
  years: 3,
  /** A scene with more cloud than this, in %, over its whole 100 km tile, is not used. */
  maxCloud: 25,
  /** Zoom levels tried, closest first; the closest at which the field fits is used. */
  maxZoom: 16,
  minZoom: 12,
  /** The field may span at most this share of the picture's width and height. */
  fieldShare: 0.5,
};

const TILE = 256;
/** The picture is a 2 × 2 block of map tiles, 512 px a side. */
const BLOCK = 2;

export type Scene = { id: string; datetime: string; cloud: number };
export type Frame = Scene & { month: string };

/**
 * One frame a month: the scene with the least cloud, then the one nearest the middle of the month. A Sentinel-2
 * pass over Basilicata is mid-morning, so the month in UTC is the local month.
 */
export function monthlyFrames(scenes: Scene[]): Frame[] {
  const best = new Map<string, Frame>();
  const offMiddle = (iso: string) => Math.abs(Number(iso.slice(8, 10)) - 15);
  for (const scene of scenes) {
    const month = scene.datetime.slice(0, 7);
    const held = best.get(month);
    if (!held || scene.cloud < held.cloud || (scene.cloud === held.cloud && offMiddle(scene.datetime) < offMiddle(held.datetime))) {
      best.set(month, { ...scene, month });
    }
  }
  return [...best.values()].sort((a, b) => a.datetime.localeCompare(b.datetime));
}

const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * TILE * 2 ** z;
const latToY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

export type TileWindow = {
  z: number;
  /** The top-left tile of the 2 × 2 block. */
  tx: number;
  ty: number;
  /** Width and height of the picture in tile pixels. */
  size: number;
  /** The field's outline in the picture's pixels. */
  points: [number, number][];
  /** Middle of the field, [lon, lat]: the point the scenes must cover. */
  centre: [number, number];
};

/** The closest zoom at which the field fits, and the 2 × 2 block of tiles around it. */
export function tileWindow(outline: Polygon): TileWindow {
  const ring = outline.coordinates[0];
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const fits = (z: number) =>
    Math.max(lonToX(e, z) - lonToX(w, z), latToY(s, z) - latToY(n, z)) <= TIMELAPSE_RULES.fieldShare * BLOCK * TILE;
  let z = TIMELAPSE_RULES.maxZoom;
  while (z > TIMELAPSE_RULES.minZoom && !fits(z)) z--;
  const cx = (lonToX(w, z) + lonToX(e, z)) / 2;
  const cy = (latToY(n, z) + latToY(s, z)) / 2;
  // The block whose middle lies nearest the field's middle: the field is never more than a quarter off-centre.
  const tx = Math.round(cx / TILE) - 1;
  const ty = Math.round(cy / TILE) - 1;
  return {
    z,
    tx,
    ty,
    size: BLOCK * TILE,
    points: ring.map(([lon, lat]) => [lonToX(lon, z) - tx * TILE, latToY(lat, z) - ty * TILE] as [number, number]),
    centre: [(w + e) / 2, (s + n) / 2],
  };
}

/** The four tiles of a frame, row by row: [x, y]. */
export function blockTiles(win: TileWindow): [number, number][] {
  const out: [number, number][] = [];
  for (let row = 0; row < BLOCK; row++) for (let col = 0; col < BLOCK; col++) out.push([win.tx + col, win.ty + row]);
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
