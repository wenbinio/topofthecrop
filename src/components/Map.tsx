// The map as screens use it. The map library (MapLibre) is about two thirds of the app's code, and only step 1
// shows a map, so the real component (MapView.tsx) is fetched the first time one is drawn. A link opened straight
// on the options, the year or the printout never downloads it. Written with AI assistance (Claude, Anthropic).
import { Suspense, lazy } from "react";
import type { MapProps } from "./MapView";

export type { EdgeRequest, MapProps, MapTarget } from "./MapView";

const MapView = lazy(() => import("./MapView"));

export default function Map(props: MapProps) {
  return (
    // While the map's code arrives: the same dark ground the map itself starts with, so nothing jumps.
    <Suspense fallback={<div data-testid="map-loading" aria-hidden="true" style={{ position: "absolute", inset: 0 }} className="bg-line-strong" />}>
      <MapView {...props} />
    </Suspense>
  );
}
