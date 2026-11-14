import type { LngLat } from "../data/types";

/** A small drawing of a field outline, scaled to fit, north up. */
export function FieldShape({ ring, className = "w-12 h-12" }: { ring: LngLat[]; className?: string }) {
  if (ring.length < 3) return null;
  const lat0 = (ring.reduce((s, p) => s + p[1], 0) / ring.length) * (Math.PI / 180);
  const pts = ring.map(([lon, lat]) => [lon * Math.cos(lat0), -lat]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const d = pts.map(([x, y]) => `${(((x - minX) / span) * 40 + 4).toFixed(2)},${(((y - minY) / span) * 40 + 4).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="0" y="0" width="48" height="48" className="fill-sunk" />
      <polygon points={d} className="fill-cover-green stroke-line-strong" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/** The open ring of a GeoJSON polygon (closing point dropped). */
export function openRing(coordinates: number[][][]): LngLat[] {
  const ring = (coordinates[0] ?? []).map((p) => [p[0], p[1]] as LngLat);
  if (ring.length > 1) {
    const a = ring[0];
    const b = ring[ring.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) ring.pop();
  }
  return ring;
}
