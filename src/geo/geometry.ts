import type { LngLat } from "../data/types";

/** Area of an open ring in hectares, on a sphere. Order of points does not matter. */
export function areaHa(_ring: LngLat[]): number {
  throw new Error("not implemented");
}

/** Mean of the ring's points. Good enough for a field-sized shape. */
export function centroid(_ring: LngLat[]): LngLat {
  throw new Error("not implemented");
}

/** True if the point is inside the ring (ray casting). */
export function pointInRing(_point: LngLat, _ring: LngLat[]): boolean {
  throw new Error("not implemented");
}

/**
 * Reduces a finger-drawn trace to an open ring of at most `maxPoints` points,
 * each rounded to 5 decimals, keeping the overall shape (Douglas-Peucker with a growing tolerance).
 */
export function simplifyRing(_points: LngLat[], _maxPoints = 12): LngLat[] {
  throw new Error("not implemented");
}

/** A drawn ring is usable when it has at least 3 points and covers at least 0.1 ha. */
export function isUsableRing(_ring: LngLat[]): boolean {
  throw new Error("not implemented");
}
