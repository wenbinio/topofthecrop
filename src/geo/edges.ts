// Finds a field's outline in a small aerial photo, from one point inside it. Pure: no DOM, no map.
//
// Fields on cereal land are patches of one colour (straw, tilled brown, green) with stripes from machinery,
// set apart by darker hedges, roads and gullies. So: blur away the stripes, grow a region of colour close to
// the colour under the seed, take the loosest tolerance that still looks like one field, clean it, trace it.

/** An RGBA image, row-major, as from `getImageData`. */
export type Pixels = { width: number; height: number; data: Uint8ClampedArray };

/** Colour distances (RGB, 0 to 441) tried from strict to loose. */
export const TOLERANCES = [12, 16, 20, 25, 31, 38, 46];
/** A region that grows by more than this from one tolerance to the next has not settled. */
const SETTLED_GROWTH = 1.35;
/** A region that grows by more than this in one step has spilled into a neighbouring field. */
const LEAK_GROWTH = 1.6;
/** Bridges between fields narrower than about twice this many pixels are cut. */
const BRIDGE = 2;
/** Dents in the outline up to about twice this many pixels wide (a dark patch at the field edge) are smoothed over. */
const NOTCH = 1;
/** Box blur radius in pixels, enough to smooth tramlines and stripes. */
const BLUR = 2;
/** Radius of the window whose mean colour is the seed colour. */
const SEED_WINDOW = 2;
/** A field is not tiny: at least this share of the image. */
export const MIN_SHARE = 0.005;
/** A field is not the whole view: at most this share of the image. */
export const MAX_SHARE = 0.5;
/** At most this share of the field's outline may run along the image border. */
export const MAX_BORDER_SHARE = 0.25;

/**
 * The outline of the patch of similar colour around `seed` (pixel x, y), as pixel centres in order
 * around the patch, or null when no clear field is found there. Never throws.
 */
export function detectField(pixels: Pixels, seed: [number, number]): [number, number][] | null {
  try {
    return detect(pixels, seed);
  } catch {
    return null;
  }
}

function detect({ width: w, height: h, data }: Pixels, seed: [number, number]): [number, number][] | null {
  if (!(w >= 8 && h >= 8) || data.length < w * h * 4) return null;
  const sx = Math.floor(seed[0]);
  const sy = Math.floor(seed[1]);
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx < 0 || sy < 0 || sx >= w || sy >= h) return null;

  const rgb = boxBlur(data, w, h, BLUR);
  const seedColour = windowMean(rgb, w, h, sx, sy, SEED_WINDOW);
  const distance = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const dr = rgb[i * 3] - seedColour[0];
    const dg = rgb[i * 3 + 1] - seedColour[1];
    const db = rgb[i * 3 + 2] - seedColour[2];
    distance[i] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // Grow the region at each tolerance and keep the ones that look like a field.
  const seedIndex = sx + sy * w;
  const candidates: { region: Uint8Array; area: number }[] = [];
  for (const tolerance of TOLERANCES) {
    const grown = flood(w, h, seedIndex, (i) => distance[i] < tolerance);
    // Neighbouring fields of the same colour join through gaps in a hedge. Shrinking the region and
    // growing it back cuts those thin bridges; if the seed itself is shaved off, leave the region as it is.
    const opened = keepPiece(morph(grown, w, h, BRIDGE, false), w, h, seedIndex);
    // If shrinking removes the seed, the region there is only a thin streak (one stripe of the field), not a field yet.
    if (!opened) continue;
    const region = and(morph(opened, w, h, BRIDGE, true), grown);
    const verdict = judge(region, w, h);
    // The region only grows with the tolerance, so once it is too big it stays too big.
    if (verdict === "tooBig") break;
    if (verdict === "ok") candidates.push({ region, area: count(region) });
  }
  if (candidates.length === 0) return null;

  // Photos of one field vary a little in colour, so the region grows as the tolerance loosens, settles once
  // it covers the field, and jumps when it spills into a neighbour. Take the last settled step before a jump.
  // With no settled step at all, take the step just before the biggest jump.
  let pick = -1;
  let biggestJump = 0;
  let beforeBiggestJump = candidates.length - 1;
  for (let i = 1; i < candidates.length; i++) {
    const growth = candidates[i].area / candidates[i - 1].area;
    if (growth > biggestJump) {
      biggestJump = growth;
      beforeBiggestJump = i - 1;
    }
    if (growth <= SETTLED_GROWTH) pick = i;
    else if (pick >= 0 && growth > LEAK_GROWTH) break;
  }
  if (pick < 0) pick = biggestJump > LEAK_GROWTH ? beforeBiggestJump : candidates.length - 1;
  const best = candidates[pick].region;

  const cleaned = keepPiece(fillHoles(close(best, w, h, NOTCH), w, h), w, h, seedIndex);
  if (!cleaned) return null;
  const outline = trace(cleaned, w, h);
  return outline.length >= 3 ? outline : null;
}

function count(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return n;
}

function and(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] && b[i] ? 1 : 0;
  return out;
}

/** Separable box blur of the RGB channels, clamped at the edges. Returns 3 floats per pixel. */
function boxBlur(data: Uint8ClampedArray, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h * 3);
  const out = new Float32Array(w * h * 3);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0, b = 0, c = 0;
      for (let k = -r; k <= r; k++) {
        const j = (y * w + Math.min(w - 1, Math.max(0, x + k))) * 4;
        a += data[j]; b += data[j + 1]; c += data[j + 2];
      }
      const o = (y * w + x) * 3;
      tmp[o] = a / n; tmp[o + 1] = b / n; tmp[o + 2] = c / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0, b = 0, c = 0;
      for (let k = -r; k <= r; k++) {
        const j = (Math.min(h - 1, Math.max(0, y + k)) * w + x) * 3;
        a += tmp[j]; b += tmp[j + 1]; c += tmp[j + 2];
      }
      const o = (y * w + x) * 3;
      out[o] = a / n; out[o + 1] = b / n; out[o + 2] = c / n;
    }
  }
  return out;
}

function windowMean(rgb: Float32Array, w: number, h: number, cx: number, cy: number, r: number): [number, number, number] {
  let a = 0, b = 0, c = 0, n = 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
      const o = (y * w + x) * 3;
      a += rgb[o]; b += rgb[o + 1]; c += rgb[o + 2]; n++;
    }
  }
  return [a / n, b / n, c / n];
}

/** 4-neighbour flood fill from `start` over pixels where `take` holds. */
function flood(w: number, h: number, start: number, take: (i: number) => boolean): Uint8Array {
  const mask = new Uint8Array(w * h);
  if (!take(start)) return mask;
  const stack = [start];
  mask[start] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const j of next) {
      if (j >= 0 && !mask[j] && take(j)) {
        mask[j] = 1;
        stack.push(j);
      }
    }
  }
  return mask;
}

/** Whether a region is a plausible field: not tiny, not most of the view, not running along the border. */
function judge(mask: Uint8Array, w: number, h: number): "ok" | "tiny" | "tooBig" {
  let count = 0, edge = 0, onBorder = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      count++;
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (border) onBorder++;
      if (border || !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w]) edge++;
    }
  }
  const share = count / (w * h);
  if (share > MAX_SHARE) return "tooBig";
  if (edge > 0 && onBorder / edge > MAX_BORDER_SHARE) return "tooBig";
  if (share < MIN_SHARE) return "tiny";
  return "ok";
}

/** Morphological closing (dilate then erode) with a square of radius `r`, to close small gaps. */
function close(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return morph(morph(mask, w, h, r, true), w, h, r, false);
}

function morph(mask: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -r; dy <= r && v === (dilate ? 0 : 1); dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy;
          // Outside the image counts as background for dilation and as field for erosion, so edges do not shrink.
          const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? (dilate ? 0 : 1) : mask[yy * w + xx];
          if (dilate && m) { v = 1; break; }
          if (!dilate && !m) { v = 0; break; }
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** Fills every background patch that does not reach the image border. */
function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const seedAt = (i: number) => {
    if (!mask[i] && !outside[i]) { outside[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < w; x++) { seedAt(x); seedAt((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seedAt(y * w); seedAt(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) seedAt(i - 1);
    if (x < w - 1) seedAt(i + 1);
    if (y > 0) seedAt(i - w);
    if (y < h - 1) seedAt(i + w);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/** Only the 4-connected piece holding `start`, or null if `start` is not in the mask. */
function keepPiece(mask: Uint8Array, w: number, h: number, start: number): Uint8Array | null {
  if (!mask[start]) return null;
  return flood(w, h, start, (i) => mask[i] === 1);
}

// Neighbour offsets clockwise on screen (y grows downwards), starting west.
const DX = [-1, -1, 0, 1, 1, 1, 0, -1];
const DY = [0, -1, -1, -1, 0, 1, 1, 1];

/** Moore neighbour tracing of the outer boundary of a single piece. Returns pixel centres in order. */
function trace(mask: Uint8Array, w: number, h: number): [number, number][] {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  let start = -1;
  for (let i = 0; i < w * h && start < 0; i++) if (mask[i]) start = i;
  if (start < 0) return [];
  const s: [number, number] = [start % w, Math.floor(start / w)];

  // From pixel c with backtrack b (an outside neighbour), the next boundary pixel and its backtrack.
  const step = (c: [number, number], b: [number, number]): [[number, number], [number, number]] | null => {
    let d = 0;
    for (let k = 0; k < 8; k++) if (c[0] + DX[k] === b[0] && c[1] + DY[k] === b[1]) d = k;
    let prev = b;
    for (let k = 1; k <= 8; k++) {
      const dir = (d + k) % 8;
      const n: [number, number] = [c[0] + DX[dir], c[1] + DY[dir]];
      if (inside(n[0], n[1])) return [n, prev];
      prev = n;
    }
    return null;
  };

  const first = step(s, [s[0] - 1, s[1]]);
  if (!first) return [[s[0] + 0.5, s[1] + 0.5]];
  const p1 = first[0];
  const out: [number, number][] = [[s[0] + 0.5, s[1] + 0.5]];
  let [c, b] = first;
  for (let guard = 0; guard < 4 * w * h; guard++) {
    if (c[0] === s[0] && c[1] === s[1]) {
      const next = step(c, b);
      if (!next || (next[0][0] === p1[0] && next[0][1] === p1[1])) break;
    }
    out.push([c[0] + 0.5, c[1] + 0.5]);
    const next = step(c, b);
    if (!next) break;
    [c, b] = next;
  }
  return out;
}
