import { describe, expect, it } from "vitest";
import { detectField } from "./edges";
import type { Pixels } from "./edges";

type RGB = [number, number, number];
const W = 220;
const H = 160;
const STRAW: RGB = [205, 180, 120];
const BROWN: RGB = [120, 90, 60];
const HEDGE: RGB = [45, 60, 35];

/** A small deterministic random source, so the noise is the same every run. */
function random(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Builds an image: `colour(x, y)` gives each pixel; light noise is added everywhere. */
function image(colour: (x: number, y: number) => RGB, noise = 8, w = W, h = H): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  const rnd = random();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = colour(x, y);
      const n = (rnd() - 0.5) * 2 * noise;
      const o = (y * w + x) * 4;
      data[o] = r + n;
      data[o + 1] = g + n;
      data[o + 2] = b + n;
      data[o + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

/** Tramlines: alternating lighter and darker stripes two pixels wide. */
const striped = (c: RGB, x: number): RGB => {
  const s = Math.floor(x / 2) % 2 === 0 ? 14 : -14;
  return [c[0] + s, c[1] + s, c[2] + s];
};

const inRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1;

function bbox(points: [number, number][]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function polygonArea(points: [number, number][]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[(i + 1) % points.length];
    sum += x * ny - nx * y;
  }
  return Math.abs(sum) / 2;
}

describe("detectField", () => {
  it("finds a striped, noisy rectangle on a different background", () => {
    const img = image((x, y) => (inRect(x, y, 50, 40, 150, 110) ? striped(STRAW, x) : BROWN));
    const outline = detectField(img, [100, 75]);
    expect(outline).not.toBeNull();
    const b = bbox(outline!);
    // Pixel centres of the rectangle run from 50.5 to 149.5 and 40.5 to 109.5.
    expect(Math.abs(b.x0 - 50.5)).toBeLessThanOrEqual(2);
    expect(Math.abs(b.x1 - 149.5)).toBeLessThanOrEqual(2);
    expect(Math.abs(b.y0 - 40.5)).toBeLessThanOrEqual(2);
    expect(Math.abs(b.y1 - 109.5)).toBeLessThanOrEqual(2);
  });

  it("traces an L-shaped field as an L", () => {
    // 120 x 100 with the top-right 60 x 50 cut away: 12000 - 3000 = 9000 px.
    const inL = (x: number, y: number) => inRect(x, y, 40, 30, 160, 130) && !inRect(x, y, 100, 30, 160, 80);
    const img = image((x, y) => (inL(x, y) ? striped(STRAW, y) : BROWN));
    const outline = detectField(img, [60, 110]);
    expect(outline).not.toBeNull();
    expect(Math.abs(polygonArea(outline!) - 9000) / 9000).toBeLessThan(0.1);
  });

  it("returns null on a uniform image with no boundary", () => {
    expect(detectField(image(() => STRAW), [110, 80])).toBeNull();
  });

  it("still finds a field touching one edge slightly, but not one filling most of the view", () => {
    // Touches the left edge along 30 px of an outline of about 2 x (100 + 30) = 260 px.
    const touching = image((x, y) => (inRect(x, y, 0, 60, 100, 90) || inRect(x, y, 20, 40, 120, 120) ? striped(STRAW, x) : BROWN));
    expect(detectField(touching, [70, 80])).not.toBeNull();
    const filling = image((x, y) => (inRect(x, y, 10, 10, 210, 150) ? striped(STRAW, x) : BROWN));
    expect(detectField(filling, [110, 80])).toBeNull();
  });

  it("does not merge two same-coloured fields split by a 3 px dark line", () => {
    const img = image((x, y) => {
      if (!inRect(x, y, 30, 30, 190, 130)) return BROWN;
      if (x >= 109 && x < 112) return HEDGE;
      return striped(STRAW, x);
    });
    const outline = detectField(img, [70, 80]);
    expect(outline).not.toBeNull();
    const b = bbox(outline!);
    expect(b.x1).toBeLessThan(112);
    expect(Math.abs(b.x0 - 30.5)).toBeLessThanOrEqual(2);
  });

  it("returns null for a tiny speck", () => {
    const img = image((x, y) => (inRect(x, y, 100, 70, 106, 76) ? STRAW : BROWN));
    expect(detectField(img, [103, 73])).toBeNull();
  });

  it("never throws for a seed outside the image", () => {
    const img = image((x, y) => (inRect(x, y, 50, 40, 150, 110) ? STRAW : BROWN));
    for (const seed of [[-1, 10], [W, 10], [10, H], [Number.NaN, 5], [Infinity, 2]] as [number, number][]) {
      expect(detectField(img, seed)).toBeNull();
    }
    expect(detectField({ width: 0, height: 0, data: new Uint8ClampedArray(0) }, [0, 0])).toBeNull();
  });
});
