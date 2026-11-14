// fieldshift-data.js: loads the Field Shift data files and reads the values for a 1 km square or a drawn field outline.
// Written with AI assistance (Claude, Anthropic) for the Field Shift team, NASA Space Apps 2026. Tested against the data of 14 Nov 2026.
//
// Needs turf.js 7. With npm (Vite, React):  npm install @turf/turf
// In a plain HTML page, put this before your module scripts:
//   <script type="importmap">{"imports": {"@turf/turf": "https://esm.sh/@turf/turf@7"}}</script>
import { intersect, area, bbox, featureCollection, booleanPointInPolygon, point } from "@turf/turf";

const FILES = ["index.json", "grid.geojson", "area.geojson", "field.json", "cells_greenness.json",
               "cells_weather.json", "cells_water.json", "cells_future.json", "cells_soil.json"];

// Loads every data file at once. base is relative to the page ("data/"), so it also works under GitHub Pages' /repo-name/.
export async function loadData(base = "data/", getJson = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
})) {
  const docs = await Promise.all(FILES.map((name) => getJson(base + name)));
  const d = Object.fromEntries(FILES.map((name, i) => [name.replace(/\.(geo)?json$/, ""), docs[i]]));
  d.farmSquares = d.grid.features.filter((f) => f.properties.farm);      // only these have values in the cells_ files
  d.squareBox = new Map(d.farmSquares.map((f) => [f.id, bbox(f)]));
  d.seasons = d.cells_weather.meta.seasons;                              // [2001, ..., 2026], named by harvest year
  return d;
}

// Everything for one square. A part is null where the square has no data (show "no data", never 0).
export function squareValues(d, id) {
  const wKey = d.cells_weather.cells[id];
  const water = d.cells_water.cells[id];
  const fKey = d.cells_future.cells[id];
  return {
    greenness: d.cells_greenness.cells[id] ?? null,                       // missing for 5 farmland squares
    weather: wKey !== undefined ? d.cells_weather.records[wKey] : null,
    water: water ? { ...d.cells_water.records[water.rec], aet_season: water.aet_season, aet_by_season: water.aet_by_season } : null,
    futureChange: fKey !== undefined ? d.cells_future.records[fKey] : null, // changes by 2041-2060, not values: see projected()
    soil: d.cells_soil.cells[id] ?? null,
  };
}

// The farmland square at a point (a tap on the map, or "use my location"); null if it isn't farmland in the basin.
export function squareAt(d, lon, lat) {
  const pt = point([lon, lat]);
  for (const sq of d.farmSquares) {
    const [w, s, e, n] = d.squareBox.get(sq.id);
    if (lon < w || lon > e || lat < s || lat > n) continue;
    if (booleanPointInPolygon(pt, sq)) return sq.id;
  }
  return null;
}

// The farmland squares a drawn outline (GeoJSON Polygon, or a Feature holding one, in lon/lat) overlaps, with the overlap in m².
export function squaresUnder(d, outline) {
  const poly = outline.type === "Feature" ? outline : { type: "Feature", properties: {}, geometry: outline };
  const [w, s, e, n] = bbox(poly);
  const hits = [];
  for (const sq of d.farmSquares) {
    const [sw, ss, se, sn] = d.squareBox.get(sq.id);
    if (se < w || sw > e || sn < s || ss > n) continue;                  // quick test before the exact overlap
    const part = intersect(featureCollection([poly, sq]));
    if (part) hits.push({ id: sq.id, m2: area(part) });
  }
  const total = area(poly);
  return { hits, fieldM2: total, farmlandShare: total ? hits.reduce((a, h) => a + h.m2, 0) / total : 0 };
}

// Weighted average of nested values (numbers, [low, typical, high], monthly lists, by-season lists); nulls are skipped.
function blend(parts) {
  const present = parts.filter(([v]) => v !== null && v !== undefined);
  if (!present.length) return null;
  const first = present[0][0];
  if (typeof first === "number") {
    const nums = present.filter(([v]) => typeof v === "number");
    const weight = nums.reduce((a, [, w]) => a + w, 0);
    return weight ? nums.reduce((a, [v, w]) => a + v * w, 0) / weight : null;
  }
  if (Array.isArray(first)) return first.map((_, i) => blend(present.map(([v, w]) => [Array.isArray(v) ? v[i] : null, w])));
  if (typeof first === "object") return Object.fromEntries(Object.keys(first).map((k) => [k, blend(present.map(([v, w]) => [v[k], w]))]));
  return first;
}

// Values for a farmer's outline: the squares it overlaps, weighted by overlap area. Label them "for the 1 km area around your field".
// Returns null when the outline covers no farmland square (outside the Bradano basin, or no rain-fed arable land).
export function outlineValues(d, outline) {
  const { hits, fieldM2, farmlandShare } = squaresUnder(d, outline);
  if (!hits.length) return null;
  const per = hits.map((h) => [squareValues(d, h.id), h.m2]);
  const out = { squares: hits, fieldHa: fieldM2 / 1e4, farmlandShare };
  for (const part of ["greenness", "weather", "water", "futureChange", "soil"]) out[part] = blend(per.map(([v, w]) => [v[part], w]));
  return out;
}

// Future keys and the weather keys they change.
export const FUTURE_KEYS = { hot: "hot_days_flower", tmaxfl: "tmax_flower", frost: "frost_days_winter",
                             late: "late_frost_days", rainse: "rain_season", rainau: "rain_autumn" };

// Values by 2041-2060, the same way notebook 05 works them out: today's typical value plus each model's change.
// Rain changes are percentages; day counts can't go below 0. Each result is [low, typical, high] across the 29 models.
export function projected(values, scenario = "ssp245") {
  const out = {};
  for (const [fk, wk] of Object.entries(FUTURE_KEYS)) {
    const now = values.weather?.[wk]?.[1];
    const change = values.futureChange?.[scenario]?.[fk];
    if (now == null || !change || change[1] == null) { out[wk] = null; continue; }
    out[wk] = change.map((c) => (fk.startsWith("rain") ? now * (1 + c / 100) : fk === "tmaxfl" ? now + c : Math.max(0, now + c)));
  }
  return out;
}

// Day numbers count from 1 September of the season's first year (1 September = day 0). Without a season, a non-leap year is used.
export function dayToDate(day, season = 2022) {
  if (day == null) return null;
  return new Date(Date.UTC(season - 1, 8, 1) + Math.round(day) * 86400000);
}

// Monthly lists run January-December; this reorders them September-August for the farming-year strip.
export const FARM_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
export function farmingYear(monthly) {
  return monthly ? [...monthly.slice(8), ...monthly.slice(0, 8)] : null;
}

// "In X of the last N seasons": counts the seasons in a *_by_season list that pass a test, skipping seasons with no data.
export function howOften(bySeason, test) {
  const known = (bySeason || []).filter((v) => v != null);
  return { count: known.filter(test).length, of: known.length };
}

// The datasets behind a value, for the evidence screen. Weather indicators don't carry a source key, so they're mapped here.
const WEATHER_SOURCES = { rain: ["chirps", "imerg", "era5_land"], rain_onset_day: ["chirps", "era5_land"] };
export function sourcesFor(d, file, key) {
  const meta = d[file].meta;
  let ids = String(meta.indicators?.[key]?.source || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length && file === "cells_weather") ids = WEATHER_SOURCES[key] || (key.startsWith("rain") ? WEATHER_SOURCES.rain : ["era5_land"]);
  return ids.map((id) => ({ id, ...meta.sources[id] })).filter((s) => s.name);
}
