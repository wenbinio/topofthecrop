// Downloads one commune's cadastral parcels and writes them as small static files the app can read.
// Written with AI assistance (Claude, Anthropic).
//
// Source: Agenzia delle Entrate, "Cartografia catastale" WFS (INSPIRE Cadastral Parcels). Licence: CC BY 4.0,
// stated in the service's own capabilities document. The service refuses calls from a web page (no CORS header)
// and answers only for areas about 1.5 km across, so this script walks the commune in small squares, ahead of time.
//
// Run:  node scripts/fetch-parcels.mjs D971 "Genzano di Lucania" 15.93 40.74 16.22 40.93
//       (commune code, name, then west south east north of a box that holds the whole commune)
// Output: public/parcels/<code>/index.json and one <sheet>.json per cadastral sheet.
import { mkdirSync, writeFileSync } from "node:fs";

const [code, name, ...box] = process.argv.slice(2);
const [west, south, east, north] = box.map(Number);
if (!code || !name || box.length !== 4 || box.some((n) => !Number.isFinite(Number(n)))) {
  console.error('usage: node scripts/fetch-parcels.mjs <code> "<name>" <west> <south> <east> <north>');
  process.exit(1);
}

const WFS = "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php";
const STEP = 0.014;      // degrees per square: about 1.5 km north-south, 1.2 km east-west. Larger boxes return nothing.
const COUNT = 5000;      // far above what one square holds; a full page would mean parcels were cut off
const PARALLEL = 3;      // be gentle with a public service
const TRIES = 4;

const round5 = (n) => Math.round(n * 1e5) / 1e5;

/** Twice the signed area of a ring of [lon, lat]: only used to pick a parcel's biggest piece. */
function area2(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum);
}

/** The parcels in one answer: reference, label, commune and the outer ring of the biggest piece. */
export function parseParcels(xml) {
  const out = [];
  for (const block of xml.match(/<CP:CadastralParcel[\s\S]*?<\/CP:CadastralParcel>/g) ?? []) {
    const ref = /<CP:NATIONALCADASTRALREFERENCE>([^<]+)/.exec(block)?.[1];
    const label = /<CP:LABEL>([^<]*)/.exec(block)?.[1]?.trim();
    const unit = /<CP:ADMINISTRATIVEUNIT>([^<]+)/.exec(block)?.[1];
    let best = null;
    for (const m of block.matchAll(/<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/g)) {
      const nums = m[1].trim().split(/\s+/).map(Number);
      const ring = [];
      // The service gives latitude first.
      for (let i = 0; i + 1 < nums.length; i += 2) ring.push([round5(nums[i + 1]), round5(nums[i])]);
      // Drop the closing point and any repeats that rounding made.
      const open = ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1]);
      if (open.length > 1 && open[0][0] === open.at(-1)[0] && open[0][1] === open.at(-1)[1]) open.pop();
      if (open.length >= 3 && (!best || area2(open) > area2(best))) best = open;
    }
    if (ref && label && unit && best) out.push({ ref, label, unit, ring: best });
  }
  return out;
}

async function square(w, s) {
  const corners = [s, w, s + STEP, w + STEP];
  // The service rejects some boxes as "Richiesta non valida" depending on how the numbers are written
  // (40.89000,16.14600,... failed where 40.89,16.146,... worked), so each try writes them another way.
  const spellings = [
    (n) => n.toFixed(5),
    (n) => String(Number(n.toFixed(5))),
    (n) => (n + 0.00001).toFixed(6),
    (n) => String(Number((n - 0.00001).toFixed(4))),
  ];
  let bbox = "";
  for (let attempt = 1; ; attempt++) {
    bbox = corners.map(spellings[(attempt - 1) % spellings.length]).join(",");
    const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=CP:CadastralParcel&count=${COUNT}&bbox=${bbox},urn:ogc:def:crs:EPSG::6706`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (xml.includes("ServiceException")) throw new Error("service exception");
      const returned = Number(/numberReturned="(\d+)"/.exec(xml)?.[1] ?? NaN);
      if (!Number.isFinite(returned)) throw new Error("no feature count in the answer");
      if (returned >= COUNT) throw new Error("a full page: make STEP smaller");
      return parseParcels(xml);
    } catch (error) {
      if (attempt >= TRIES) throw new Error(`square ${bbox}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

const squares = [];
for (let s = south; s < north; s += STEP) for (let w = west; w < east; w += STEP) squares.push([w, s]);
console.log(`${squares.length} squares to ask for`);

const parcels = new Map();
let done = 0;
async function worker() {
  for (;;) {
    const next = squares.pop();
    if (!next) return;
    for (const p of await square(...next)) if (p.unit === code) parcels.set(p.ref, p);
    if (++done % 25 === 0) console.log(`${done} squares done, ${parcels.size} parcels of ${code} so far`);
  }
}
await Promise.all(Array.from({ length: PARALLEL }, worker));

// A reference reads <commune>_<sheet 4 digits><annex><development>.<parcel>, e.g. D971_005600.159.
const sheets = new Map();
for (const p of parcels.values()) {
  const key = /_([0-9A-Z]{6})\./.exec(p.ref)?.[1];
  if (!key) continue;
  if (!sheets.has(key)) sheets.set(key, {});
  sheets.get(key)[p.label] = p.ring;
}

const dir = `public/parcels/${code}`;
mkdirSync(dir, { recursive: true });
const index = {
  commune: { code, name },
  source: "Agenzia delle Entrate, Cartografia catastale (INSPIRE Cadastral Parcels WFS)",
  licence: "CC BY 4.0",
  credit: "Parcels © Agenzia delle Entrate, CC BY 4.0",
  fetched: new Date().toISOString().slice(0, 10),
  parcels: 0,
  sheets: {},
};
let bytes = 0;
for (const [key, byLabel] of [...sheets].sort(([a], [b]) => a.localeCompare(b))) {
  const text = JSON.stringify(byLabel);
  writeFileSync(`${dir}/${key}.json`, text);
  bytes += text.length;
  const count = Object.keys(byLabel).length;
  index.parcels += count;
  // sheet number as a farmer writes it: 56, or 56A when the sheet has an annex
  const annex = key[4] === "0" ? "" : key[4];
  index.sheets[key] = { sheet: `${Number(key.slice(0, 4))}${annex}`, parcels: count };
}
writeFileSync(`${dir}/index.json`, JSON.stringify(index, null, 2) + "\n");
console.log(`done: ${index.parcels} parcels on ${sheets.size} sheets, ${(bytes / 1e6).toFixed(1)} MB in ${dir}`);
