// Small pure helpers for editing a drawn field by its corners.
import type { LngLat } from "../data/types";

/** The shared link carries at most this many corners. */
export const MAX_CORNERS = 12;

/** A finger trace is reduced to this many corners, so the dots stay few and easy to pull. */
export const TRACE_CORNERS = 8;

/** Five decimals is about one metre, and is what the shared link stores. */
export function round5(point: LngLat): LngLat {
  return [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))];
}

/** A copy of the ring with corner `index` moved to `point`. */
export function moveAt(ring: LngLat[], index: number, point: LngLat): LngLat[] {
  return ring.map((p, i) => (i === index ? point : p));
}

/** A copy of the ring with `point` inserted so it becomes corner `index`. */
export function insertAt(ring: LngLat[], index: number, point: LngLat): LngLat[] {
  return [...ring.slice(0, index), point, ...ring.slice(index)];
}

/** The middle of each side, in order: entry i lies between corner i and corner i + 1 (wrapping round). */
export function midpoints(ring: LngLat[]): LngLat[] {
  return ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  });
}
