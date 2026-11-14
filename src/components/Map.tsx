// All MapLibre code lives here, behind a small props interface, so tests can vi.mock this file.
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibre, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
// MapLibre 6 ships its worker as a separate module. Let Vite bundle it and hand us the URL,
// otherwise the worker cannot be found once the library itself has been bundled.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LngLat } from "../data/types";
import { MAX_CORNERS, insertAt, midpoints, moveAt, round5 } from "../geo/edit";

setWorkerUrl(workerUrl);

export type MapTarget ={ centre: LngLat; zoom: number; key: number };

export type MapProps = {
  centre: LngLat;
  zoom: number;
  /** The known field outline (the demo field), open ring. */
  fieldOutline: LngLat[] | null;
  /** The farmer's own shape, open ring. One or two points show as dots and a line until there are three. */
  drawnOutline: LngLat[] | null;
  /** While true each corner of the drawn shape has a dot to pull, and each side a smaller dot that makes a new corner. */
  editable: boolean;
  /** While true the map does not pan or zoom and one finger stroke is recorded as a trace. */
  drawing: boolean;
  /** Fly here when `key` changes (search result, my location). */
  target: MapTarget | null;
  /** A tap on the map itself, never on a dot. */
  onTap: (point: LngLat) => void;
  /** Called when a dot has been pulled: the whole new ring. */
  onEditRing: (ring: LngLat[]) => void;
  /** Called on release with the raw trace, in [lon, lat]. */
  onTrace: (points: LngLat[]) => void;
};

export const BASEMAP_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
/** Beyond this level the tile server returns a "no data yet" picture, so never ask for more. */
const BASEMAP_MAX_TILE_ZOOM = 19;
const BASEMAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

function polygonData(ring: LngLat[] | null) {
  if (!ring || ring.length < 2) return { type: "FeatureCollection" as const, features: [] };
  // Two corners so far: show the side between them.
  if (ring.length === 2) {
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: ring } }],
    };
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Polygon" as const, coordinates: [[...ring, ring[0]]] },
      },
    ],
  };
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

type SettableSource = { setData: (data: unknown) => void };

/** A dot to pull. The element is a 44 px touch target; the visible dot is drawn by CSS (.tc-handle in index.css). */
function handleElement(kind: "corner" | "side"): HTMLDivElement {
  const el = document.createElement("div");
  el.className = kind === "corner" ? "tc-handle" : "tc-handle tc-handle-side";
  el.dataset.testid = kind === "corner" ? "corner-handle" : "side-handle";
  return el;
}

export default function Map({ centre, zoom, fieldOutline, drawnOutline, editable, drawing, target, onTap, onEditRing, onTrace }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [loaded, setLoaded] = useState(false);
  const drawingRef = useRef(drawing);
  const onTapRef = useRef(onTap);
  const onTraceRef = useRef(onTrace);
  const onEditRingRef = useRef(onEditRing);
  const initial = useRef({ centre, zoom });
  const [trace, setTrace] = useState<[number, number][]>([]);
  const tracing = useRef(false);
  const traceRef = useRef<[number, number][]>([]);

  useEffect(() => {
    drawingRef.current = drawing;
    onTapRef.current = onTap;
    onTraceRef.current = onTrace;
    onEditRingRef.current = onEditRing;
  });

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const field = cssVar("--tc-map-field");
    const drawn = cssVar("--tc-map-drawn");
    const map = new MapLibre({
      container: containerRef.current,
      center: initial.current.centre,
      zoom: initial.current.zoom,
      // The photos hold real detail to tile level 19 (checked over Genzano); past that the map enlarges them,
      // which still helps a thumb place a corner exactly.
      maxZoom: 21,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      style: {
        version: 8,
        sources: {
          // On a sharp phone screen, treating each 256 px photo tile as 128 px makes the map load the next
          // level of detail, so the picture is crisp instead of stretched over twice as many pixels.
          aerial: {
            type: "raster",
            tiles: [BASEMAP_TILES],
            tileSize: window.devicePixelRatio > 1 ? 128 : 256,
            maxzoom: BASEMAP_MAX_TILE_ZOOM,
            attribution: BASEMAP_ATTRIBUTION,
          },
          field: { type: "geojson", data: polygonData(null) },
          drawn: { type: "geojson", data: polygonData(null) },
        },
        layers: [
          { id: "aerial", type: "raster", source: "aerial" },
          { id: "field-fill", type: "fill", source: "field", paint: { "fill-color": field, "fill-opacity": 0.12 } },
          { id: "field-line", type: "line", source: "field", paint: { "line-color": field, "line-width": 3 } },
          { id: "drawn-fill", type: "fill", source: "drawn", paint: { "fill-color": drawn, "fill-opacity": 0.18 } },
          { id: "drawn-line", type: "line", source: "drawn", paint: { "line-color": drawn, "line-width": 3, "line-dasharray": [2, 1] } },
        ],
      },
    });
    map.touchZoomRotate.disableRotation();
    // Plus and minus buttons, for anyone who does not pinch. Sized and placed by .maplibregl-ctrl-group in index.css.
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setLoaded(true));
    map.on("click", (e) => {
      // A tap on a dot is not a tap on the map.
      const hit = e.originalEvent.target;
      if (hit instanceof Element && hit.closest(".tc-handle")) return;
      if (!drawingRef.current) onTapRef.current([e.lngLat.lng, e.lngLat.lat]);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource("field") as SettableSource | undefined;
    if (loaded && source) source.setData(polygonData(fieldOutline));
  }, [loaded, fieldOutline]);

  useEffect(() => {
    const source = mapRef.current?.getSource("drawn") as SettableSource | undefined;
    if (loaded && source) source.setData(polygonData(drawnOutline));
  }, [loaded, drawnOutline]);

  // The dots: one on each corner to move it, one on each side to pull out a new corner.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !editable || drawing || !drawnOutline || drawnOutline.length === 0) return;
    const ring = drawnOutline;
    const source = map.getSource("drawn") as SettableSource | undefined;
    const markers: Marker[] = [];
    const sideEls: HTMLElement[] = [];
    const place = (kind: "corner" | "side", at: LngLat, ringWith: (p: LngLat) => LngLat[]) => {
      const el = handleElement(kind);
      if (kind === "side") sideEls.push(el);
      const marker = new Marker({ element: el, draggable: true }).setLngLat(at).addTo(map);
      const here = (): LngLat => {
        const ll = marker.getLngLat();
        return [ll.lng, ll.lat];
      };
      // The other side dots would sit in the wrong place while the shape changes; they come back on release.
      marker.on("dragstart", () => {
        for (const s of sideEls) if (s !== el) s.style.display = "none";
      });
      marker.on("drag", () => source?.setData(polygonData(ringWith(here()))));
      // Deferred, because the new ring replaces these markers and MapLibre is still finishing this event.
      marker.on("dragend", () => {
        const next = ringWith(round5(here()));
        setTimeout(() => onEditRingRef.current(next), 0);
      });
      markers.push(marker);
    };
    ring.forEach((p, i) => place("corner", p, (at) => moveAt(ring, i, at)));
    if (ring.length >= 3 && ring.length < MAX_CORNERS) {
      midpoints(ring).forEach((p, i) => place("side", p, (at) => insertAt(ring, i + 1, at)));
    }
    return () => markers.forEach((m) => m.remove());
  }, [loaded, editable, drawing, drawnOutline]);

  useEffect(() => {
    if (target && mapRef.current) mapRef.current.flyTo({ center: target.centre, zoom: target.zoom });
  }, [target]);

  // Draw mode: freeze the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handlers = [map.dragPan, map.scrollZoom, map.boxZoom, map.doubleClickZoom, map.touchZoomRotate, map.keyboard];
    for (const h of handlers) {
      if (drawing) h.disable();
      else h.enable();
    }
    if (!drawing) map.touchZoomRotate.disableRotation();
    if (containerRef.current) containerRef.current.style.touchAction = drawing ? "none" : "";
    if (!drawing) {
      traceRef.current = [];
      setTrace([]);
    }
  }, [drawing]);

  function localPoint(e: ReactPointerEvent<HTMLDivElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    tracing.current = true;
    traceRef.current = [localPoint(e)];
    setTrace(traceRef.current);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!tracing.current) return;
    const p = localPoint(e);
    const prev = traceRef.current;
    const last = prev[prev.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return;
    traceRef.current = [...prev, p];
    setTrace(traceRef.current);
  }

  function onPointerUp() {
    if (!tracing.current) return;
    tracing.current = false;
    const map = mapRef.current;
    if (!map) return;
    const points: LngLat[] = traceRef.current.map(([x, y]) => {
      const ll = map.unproject([x, y]);
      return [ll.lng, ll.lat];
    });
    onTraceRef.current(points);
  }

  return (
    <div className="absolute inset-0">
      {/* Inline, because maplibre-gl.css sets .maplibregl-map to position: relative and would collapse the map to 0 px tall. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} data-testid="map" />
      {drawing ? (
        <div
          className="absolute inset-0 z-10"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg className="w-full h-full" aria-hidden="true">
            {trace.length > 1 ? (
              <polyline
                points={trace.map((p) => p.join(",")).join(" ")}
                fill="none"
                style={{ stroke: "var(--tc-map-drawn)" }}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
        </div>
      ) : null}
    </div>
  );
}
