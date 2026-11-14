// All MapLibre code lives here, behind a small props interface, so tests can vi.mock this file.
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibre } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LngLat } from "../data/types";

export type MapTarget = { centre: LngLat; zoom: number; key: number };

export type MapProps = {
  centre: LngLat;
  zoom: number;
  /** The known field outline (the demo field), open ring. */
  fieldOutline: LngLat[] | null;
  /** The farmer's drawn outline, open ring. */
  drawnOutline: LngLat[] | null;
  /** While true the map does not pan or zoom and a finger trace is recorded. */
  drawing: boolean;
  /** Fly here when `key` changes (search result, my location). */
  target: MapTarget | null;
  onTap: (point: LngLat) => void;
  /** Called on release with the raw trace, in [lon, lat]. */
  onTrace: (points: LngLat[]) => void;
};

export const BASEMAP_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const BASEMAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

function polygonData(ring: LngLat[] | null) {
  if (!ring || ring.length < 3) return { type: "FeatureCollection" as const, features: [] };
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

export default function Map({ centre, zoom, fieldOutline, drawnOutline, drawing, target, onTap, onTrace }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [loaded, setLoaded] = useState(false);
  const drawingRef = useRef(drawing);
  const onTapRef = useRef(onTap);
  const onTraceRef = useRef(onTrace);
  const initial = useRef({ centre, zoom });
  const [trace, setTrace] = useState<[number, number][]>([]);
  const tracing = useRef(false);
  const traceRef = useRef<[number, number][]>([]);

  useEffect(() => {
    drawingRef.current = drawing;
    onTapRef.current = onTap;
    onTraceRef.current = onTrace;
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
      maxZoom: 18.5,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      style: {
        version: 8,
        sources: {
          aerial: { type: "raster", tiles: [BASEMAP_TILES], tileSize: 256, maxzoom: 19, attribution: BASEMAP_ATTRIBUTION },
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
    map.on("load", () => setLoaded(true));
    map.on("click", (e) => {
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
      <div ref={containerRef} className="absolute inset-0" data-testid="map" />
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
