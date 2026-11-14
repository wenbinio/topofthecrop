import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const resize = vi.fn();
const handler = () => ({ enable: vi.fn(), disable: vi.fn(), disableRotation: vi.fn() });

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));
vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({ default: "" }));
vi.mock("maplibre-gl", () => {
  class FakeMap {
    dragPan = handler();
    scrollZoom = handler();
    boxZoom = handler();
    doubleClickZoom = handler();
    touchZoomRotate = handler();
    keyboard = handler();
    resize = resize;
    addControl() {}
    on() {}
    remove() {}
    flyTo() {}
    getSource() {
      return undefined;
    }
  }
  return { Map: FakeMap, Marker: class {}, NavigationControl: class {}, setWorkerUrl: () => {} };
});

import Map from "./Map";

type Observed = { cb: ResizeObserverCallback; el: Element | null; disconnected: boolean };
const observers: Observed[] = [];

class FakeResizeObserver {
  rec: Observed;
  constructor(cb: ResizeObserverCallback) {
    this.rec = { cb, el: null, disconnected: false };
    observers.push(this.rec);
  }
  observe(el: Element) {
    this.rec.el = el;
  }
  unobserve() {}
  disconnect() {
    this.rec.disconnected = true;
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  observers.length = 0;
  resize.mockClear();
});

const noop = () => {};

describe("Map", () => {
  it("resizes the map when its container changes size, as when the phone is turned", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { getByTestId, unmount } = render(
      <Map
        centre={[16, 40]}
        zoom={15}
        fieldOutline={null}
        drawnOutline={null}
        editable={false}
        drawing={false}
        target={null}
        edgeRequest={null}
        onEdges={noop}
        onTap={noop}
        onEditRing={noop}
        onTrace={noop}
      />,
    );
    const watcher = observers.find((o) => o.el === getByTestId("map"));
    expect(watcher).toBeDefined();
    resize.mockClear();
    watcher!.cb([], {} as ResizeObserver);
    expect(resize).toHaveBeenCalledTimes(1);
    unmount();
    expect(watcher!.disconnected).toBe(true);
  });
});
