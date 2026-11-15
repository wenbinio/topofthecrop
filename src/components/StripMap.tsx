// How an intercrop sits on the farmer's own field: the outline, cut into strips (or two halves) along its longest side,
// so the tractor works up and down the strips. Each crop has its colour and botanical plate; next year they swap.
// The split follows the field's shape only. Splitting by soil would need a soil map finer than the field, and the
// one the app has gives one value for the whole field (see the note under the map).
// Written with AI assistance (Claude, Anthropic).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CropId, FieldBundle, Option } from "../data/types";
import { soilSummary } from "../data/soil";
import { useLang, useT } from "../i18n";
import { formatNumber } from "./FactParts";
import { CropPlate } from "./CropPlate";
import { stripPair } from "./Crops";
import { agreement, fetchFieldZones, metresPerPixel, splitByVigour } from "../satellite/zones";
import { blockTiles, fetchScenes, tileUrl, tileWindow } from "../timelapse/frames";
import type { Scene } from "../timelapse/frames";
import type { FieldZones } from "../satellite/zones";

type Pt = [number, number];

/** Strip colours: what each crop looks like from above in spring, told apart by lightness as well as hue. */
const FILL: Record<CropId, string> = {
  durum: "#d7b45c",
  barley: "#e2c47a",
  "vetch-oat": "#a7b46a",
  chickpea: "#7f9a4c",
  faba: "#4f6f36",
  lentil: "#93a85c",
  pea: "#6c8a42",
  rapeseed: "#e9d03a",
  coriander: "#b9c48a",
};

/** The width of one strip, in metres: a common sprayer boom, so each strip is one pass. */
export const STRIP_METRES = 24;

/** Lon/lat to local metres, y down (SVG), around the ring's first point. */
function toMetres(ring: Pt[]): Pt[] {
  const [lon0, lat0] = ring[0];
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111_320;
  const ky = 110_540;
  return ring.map(([lon, lat]) => [(lon - lon0) * kx, -(lat - lat0) * ky]);
}

function area(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Keep the part of a polygon where `side(p) <= 0` (one half-plane), Sutherland-Hodgman. */
function clip(poly: Pt[], side: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if (sa * sb < 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** The direction of the field's longest side, in radians: the way the strips run. */
function longestSide(poly: Pt[]): number {
  let best = 0;
  let angle = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d > best) {
      best = d;
      angle = Math.atan2(y2 - y1, x2 - x1);
    }
  }
  return angle;
}

export type Layout = "strips" | "halves" | "space";

/**
 * Who takes the moister, stronger side in "From space". Faba bean needs the most water and copes with wet ground,
 * so it goes there; otherwise the cereal does, and the legume or forage starts on the drier side (chickpea in
 * particular dislikes wet feet and copes with drought).
 */
const WANTS_MOIST: CropId[] = ["faba", "durum", "barley"];
export function moistFirst(pair: [CropId, CropId]): [CropId, CropId] {
  const rank = (c: CropId) => (c === "faba" ? 0 : WANTS_MOIST.includes(c) ? 1 : 2);
  // Returned as [drier side, moister side].
  return rank(pair[0]) <= rank(pair[1]) ? [pair[1], pair[0]] : pair;
}

/** Why this pair suits this field, from its own figures: soil, heat at flowering, rain. Keys and values for the lines. */
export function pairFit(bundle: FieldBundle, pair: [CropId, CropId]): { key: string; vars: Record<string, string | number> }[] {
  const legume = pair.find((c) => c !== "durum" && c !== "barley") ?? pair[0];
  const kind = legume === "chickpea" ? "chickpea" : legume === "faba" ? "faba" : "other";
  const lines: { key: string; vars: Record<string, string | number> }[] = [];
  const soil = soilSummary(bundle);
  if (soil) lines.push({ key: `strips.fit.soil.${soil.weight}.${kind}`, vars: { crop: legume } });
  const hot = bundle.year.hotDays.normal.now.value;
  const hotDry = bundle.year.hotDays.drier.now.value;
  if (typeof hot === "number" && typeof hotDry === "number") lines.push({ key: `strips.fit.heat.${kind}`, vars: { n: hot, dry: hotDry, crop: legume } });
  const rain = bundle.year.rainSeason?.normal.now.value;
  const rainDry = bundle.year.rainSeason?.drier.now.value;
  if (typeof rain === "number" && typeof rainDry === "number") lines.push({ key: `strips.fit.rain.${kind}`, vars: { mm: rain, dry: rainDry, crop: legume } });
  return lines;
}

/**
 * The pieces of the field for a layout: polygons in metres, each with which crop (0 or 1) grows there this year.
 * Strips: bands STRIP_METRES wide across the longest side, alternating. Halves: one cut along the longest side, at the
 * line that leaves equal areas either side.
 */
export function layoutPieces(ringLonLat: Pt[], layout: Layout): { poly: Pt[]; crop: 0 | 1 }[] {
  return piecesIn(toMetres(ringLonLat), layout, STRIP_METRES);
}

/** The same split for any flat outline, with the strip width in the outline's own units (metres, or tile pixels). */
export function piecesIn(outline: Pt[], layout: Layout, strip: number): { poly: Pt[]; crop: 0 | 1 }[] {
  // A closed ring repeats its first point; the cut works on the open one.
  const last = outline[outline.length - 1];
  const poly = outline.length > 3 && last[0] === outline[0][0] && last[1] === outline[0][1] ? outline.slice(0, -1) : outline;
  const a = longestSide(poly);
  const [c, s] = [Math.cos(a), Math.sin(a)];
  // v: the distance across the strips (perpendicular to the longest side).
  const across = (p: Pt) => -p[0] * s + p[1] * c;
  const vs = poly.map(across);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const band = (from: number, to: number) => clip(clip(poly, (p) => from - across(p)), (p) => across(p) - to);
  if (layout === "halves") {
    const total = area(poly);
    let [l, h] = [lo, hi];
    for (let i = 0; i < 40; i++) {
      const mid = (l + h) / 2;
      if (area(band(lo, mid)) < total / 2) l = mid;
      else h = mid;
    }
    const cut = (l + h) / 2;
    return [
      { poly: band(lo, cut), crop: 0 },
      { poly: band(cut, hi), crop: 1 },
    ];
  }
  const pieces: { poly: Pt[]; crop: 0 | 1 }[] = [];
  let k = 0;
  for (let v = lo; v < hi; v += strip, k++) {
    const piece = band(v, Math.min(v + strip, hi));
    if (piece.length >= 3) pieces.push({ poly: piece, crop: (k % 2) as 0 | 1 });
  }
  return pieces;
}

/** The newest picture with almost no cloud, for the backdrop. */
export function backdropScene(scenes: Scene[]): Scene | null {
  const clear = scenes.filter((s) => s.cloud < 5).sort((a, b) => b.datetime.localeCompare(a.datetime));
  return clear[0] ?? null;
}

export function StripMap({ option, bundle }: { option: Option; bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const outline = bundle.field.outline;
  const clipId = useId();
  // Every layout is drawn in the satellite tiles' own frame, so it can sit over the picture of the field.
  const win = useMemo(() => tileWindow(outline), [outline]);
  const box = useRef<HTMLElement>(null);
  const [backdrop, setBackdrop] = useState<{ scene: Scene; format: "jpg" | "png" } | null>(null);
  // The picture loads once the card is on screen (never while it sits in a closed fold).
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let gone = false;
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      fetchScenes(win.centre)
        .then((scenes) => {
          const scene = backdropScene(scenes);
          if (!gone && scene) setBackdrop({ scene, format: "jpg" });
        })
        .catch(() => undefined);
    });
    seen.observe(el);
    return () => {
      gone = true;
      seen.disconnect();
    };
  }, [win]);
  const [layout, setLayout] = useState<Layout>("strips");
  const [year, setYear] = useState<0 | 1>(0);
  // From space: fetched only when the farmer asks, since it downloads a few satellite pictures.
  const [zones, setZones] = useState<{ status: "idle" | "loading" | "failed" } | { status: "ready"; data: FieldZones }>({ status: "idle" });
  const ring = (outline.coordinates[0] ?? []).map((p) => [p[0], p[1]] as Pt);
  const pair = stripPair(option);
  if (!pair || ring.length < 3) return null;
  // In "From space" the cereal starts on the greener ground and the other crop on the weaker; other layouts keep
  // the option's own order.
  const ordered: [CropId, CropId] = layout === "space" ? moistFirst(pair) : pair;
  const crops: [CropId, CropId] = year === 0 ? ordered : [ordered[1], ordered[0]];
  const pieces = layout === "space" ? [] : piecesIn(win.points, layout, STRIP_METRES / metresPerPixel(win.z, win.centre[1]));
  const pick = (id: Layout) => {
    setLayout(id);
    if (id === "space" && zones.status !== "ready" && zones.status !== "loading") {
      setZones({ status: "loading" });
      fetchFieldZones(outline)
        .then((data) => setZones(data ? { status: "ready", data } : { status: "failed" }))
        .catch(() => setZones({ status: "failed" }));
    }
  };
  const space = layout === "space" && zones.status === "ready" ? zones.data : null;
  const sides = space ? splitByVigour(space.cells) : [];
  const agree = space ? Math.round(agreement(space.cells, sides) * 100) : 0;
  const fit = pairFit(bundle, pair);
  const pts = (poly: Pt[]) => poly.map((p) => p.join(",")).join(" ");
  // See-through over the picture, so the field shows under the colours; nearly solid when there is no picture.
  const alpha = backdrop ? 0.45 : 0.9;
  const seg = "flex-1 min-h-11 px-2 font-bold text-small";

  return (
    <section ref={box} className="mx-4 mt-4 p-3 bg-surface border border-line rounded-box" data-testid="strip-map" data-layout={layout} data-year={year}>
      <h2 className="text-big">{t("strips.head")}</h2>
      <p className="mt-1 text-body text-ink-soft">
        {layout === "space"
          ? space
            ? t("strips.leadSpace", { n: space.dates.length, years: [...new Set(space.dates.map((d) => d.slice(0, 4)))].sort().join(", ") })
            : zones.status === "failed"
              ? t("strips.spaceFailed")
              : t("strips.spaceLoading")
          : t(layout === "strips" ? "strips.leadStrips" : "strips.leadHalves", { m: STRIP_METRES })}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <div role="radiogroup" aria-label={t("strips.layout")} className="flex border-2 border-line-strong rounded-box overflow-hidden">
          {(["space", "strips", "halves"] as const).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={layout === id} data-testid={`layout-${id}`} onClick={() => pick(id)} className={`${seg} ${layout === id ? "bg-primary text-on-primary" : "bg-surface text-ink"}`}>
              {t(`strips.${id}`)}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t("strips.year")} className="flex border-2 border-line-strong rounded-box overflow-hidden">
          {([0, 1] as const).map((y) => (
            <button key={y} type="button" role="radio" aria-checked={year === y} onClick={() => setYear(y)} className={`${seg} ${year === y ? "bg-primary text-on-primary" : "bg-surface text-ink"}`}>
              {option.firstHarvestYear + y}
            </button>
          ))}
        </div>
      </div>
      {layout === "space" && !space ? (
        <p className="mt-3 h-32 flex items-center justify-center rounded-box bg-sunk text-body text-ink-soft" role="status">
          {zones.status === "failed" ? t("strips.spaceFailedShort") : t("strips.spaceLoading")}
        </p>
      ) : (
        <svg
          viewBox={[win.region.x, win.region.y, win.region.size, win.region.size].join(" ")}
          className="mt-3 w-full max-h-72 rounded-box bg-sunk"
          role="img"
          data-testid={space ? "space-map" : "layout-map"}
          data-backdrop={backdrop ? backdrop.scene.id : undefined}
          aria-label={t("strips.mapLabel", { a: t(`crop.${crops[0]}`), b: t(`crop.${crops[1]}`) })}
        >
          <defs>
            <clipPath id={clipId}>
              <polygon points={pts(win.points)} />
            </clipPath>
          </defs>
          {backdrop
            ? blockTiles(win).map(([x, y]) => (
                <image
                  key={`${x}-${y}`}
                  href={tileUrl(backdrop.scene.id, win.z, x, y, backdrop.format)}
                  x={(x - win.tx) * 256}
                  y={(y - win.ty) * 256}
                  width={256}
                  height={256}
                  preserveAspectRatio="none"
                  onError={() => setBackdrop((b) => (b && b.format === "jpg" ? { ...b, format: "png" } : null))}
                />
              ))
            : null}
          <g clipPath={`url(#${clipId})`} opacity={alpha}>
            {space
              ? space.cells.map((c, i) => (
                  <rect key={i} x={c.x} y={c.y} width={c.size + 0.4} height={c.size + 0.4} fill={FILL[sides[i] === "weak" ? crops[0] : crops[1]]} />
                ))
              : pieces.map((piece, i) => <polygon key={i} points={pts(piece.poly)} fill={FILL[crops[piece.crop]]} stroke="#fffcf6" strokeWidth={0.6} />)}
          </g>
          <polygon points={pts(win.points)} fill="none" stroke="#fffcf6" strokeWidth={3} strokeLinejoin="round" />
          <polygon points={pts(win.points)} fill="none" stroke="#1f3a2b" strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      )}
      {backdrop ? (
        <p className="mt-1 text-small text-ink-soft" data-testid="backdrop-credit">
          {backdrop.scene.datetime.slice(0, 10)} · {t("timelapse.credit", { years: backdrop.scene.datetime.slice(0, 4) })}
        </p>
      ) : null}
      <ul className="mt-2 flex flex-col gap-1">
        {crops.map((crop, i) => (
          <li key={crop} className="flex items-center gap-2 text-body" data-testid="strip-legend" data-crop={crop}>
            <span aria-hidden="true" className="w-5 h-5 flex-none rounded-sm border border-line-strong" style={{ background: FILL[crop] }} />
            <CropPlate crop={crop} className="w-9 h-9" />
            <span>
              <b>{t(`crop.${crop}`)}</b> · {layout === "space" ? t(i === 0 ? "strips.drier" : "strips.moister") : t(i === 0 ? "strips.half" : "strips.otherHalf")}
            </span>
          </li>
        ))}
      </ul>
      {space ? (
        <p className="mt-2 text-body" data-testid="space-signals" data-agree={agree}>
          {t("strips.signals", {
            list: space.signals.map((n) => t(`strips.sig.${n}`, { n: space.dates.length })).join(", "),
            pct: agree,
          })}
        </p>
      ) : null}
      {fit.length ? (
        <div className="mt-3" data-testid="pair-fit">
          <h3 className="text-body">{t("strips.fitHead", { a: t(`crop.${pair[0]}`), b: t(`crop.${pair[1]}`).toLocaleLowerCase(lang) })}</h3>
          <ul className="mt-1 list-disc pl-5 text-body flex flex-col gap-1">
            {fit.map(({ key, vars }) => (
              <li key={key}>
                {t(key, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, k === "crop" ? t(`crop.${v}`) : typeof v === "number" ? formatNumber(v, lang) : v])))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-2 text-small text-ink-soft" data-testid="strip-note">
        {t(layout === "space" ? "strips.spaceNote" : "strips.note")}
      </p>
    </section>
  );
}
