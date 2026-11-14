import type { LngLat } from "../data/types";

/** Area of an open ring in hectares, on a sphere. Order of points does not matter. */
export function areaHa(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  const radians = Math.PI / 180;
  // Subtract a reference latitude to avoid cancellation for small fields.
  const reference = Math.sin(ring[0][1] * radians);
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    const [nextLon, nextLat] = ring[(i + 1) % ring.length];
    const delta = ((nextLon - lon + 540) % 360 - 180) * radians;
    sum += delta * (Math.sin(lat * radians) + Math.sin(nextLat * radians) - 2 * reference);
  }
  return Math.abs(sum) * 6371008.8 ** 2 / 2 / 10000;
}

/** Mean of the ring's points. Good enough for a field-sized shape. */
export function centroid(ring: LngLat[]): LngLat {
  if (!ring.length) return [0, 0];
  return [ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
    ring.reduce((sum, point) => sum + point[1], 0) / ring.length];
}

/** True if the point is inside the ring (ray casting). */
export function pointInRing(point: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [previousX, previousY] = ring[j];
    if ((y > point[1]) !== (previousY > point[1]) &&
      point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}

/**
 * Reduces a finger-drawn trace to an open ring of at most `maxPoints` points,
 * each rounded to 5 decimals, keeping the overall shape (Douglas-Peucker with a growing tolerance).
 */
export function simplifyRing(points: LngLat[], maxPoints = 12): LngLat[] {
  const ring = points.map(([lon, lat]): LngLat => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]);
  if (ring.length > 2 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1]) ring.pop();
  const cap = Number.isFinite(maxPoints) ? Math.max(3, Math.floor(maxPoints)) : 12;
  if (ring.length <= cap) return ring;
  const latitudeScale = Math.cos(centroid(ring)[1] * Math.PI / 180);
  const metric = ring.map(([lon, lat]): LngLat => [lon * latitudeScale, lat]);
  // Split the closed trace at a far point; simplify both arcs with the same tolerance.
  let split = 1;
  for (let i = 2; i < ring.length; i++) {
    if (distanceSquared(metric[i], metric[0], metric[0]) > distanceSquared(metric[split], metric[0], metric[0])) split = i;
  }
  const indices = Array.from({ length: ring.length }, (_, i) => i);
  const simplify = (tolerance: number) => [
    ...simplifyArc(indices.slice(0, split + 1), metric, tolerance).slice(0, -1),
    ...simplifyArc([...indices.slice(split), 0], metric, tolerance).slice(0, -1),
  ];
  let low = 0;
  let high = Math.sqrt(distanceSquared(metric[split], metric[0], metric[0]));
  let result = simplify(high);
  for (let i = 0; i < 50; i++) {
    const tolerance = (low + high) / 2;
    const candidate = simplify(tolerance);
    if (candidate.length > cap) low = tolerance;
    else { high = tolerance; result = candidate; }
  }
  return result.map(i => ring[i]);
}

function distanceSquared(point: LngLat, start: LngLat, end: LngLat): number {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  const fraction = length === 0 ? 0 : Math.max(0, Math.min(1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length));
  return (point[0] - start[0] - fraction * dx) ** 2 + (point[1] - start[1] - fraction * dy) ** 2;
}

function simplifyArc(indices: number[], points: LngLat[], tolerance: number): number[] {
  const keep = new Set([0, indices.length - 1]);
  const stack = [[0, indices.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let farthest = -1, maximum = tolerance ** 2;
    for (let i = start + 1; i < end; i++) {
      const distance = distanceSquared(points[indices[i]], points[indices[start]], points[indices[end]]);
      if (distance > maximum) { maximum = distance; farthest = i; }
    }
    if (farthest >= 0) { keep.add(farthest); stack.push([start, farthest], [farthest, end]); }
  }
  return [...keep].sort((a, b) => a - b).map(i => indices[i]);
}

/** A drawn ring is usable when it has at least 3 points and covers at least 0.1 ha. */
export function isUsableRing(ring: LngLat[]): boolean {
  return ring.length >= 3 && ring.every(([lon, lat]) =>
    Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90) && areaHa(ring) >= 0.1;
}
