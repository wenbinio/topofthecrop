// Drawing a field in step 1: tap corners, pull dots, trace, undo.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import type { MapProps } from "../components/Map";
import type { LngLat } from "../data/types";

// A field-sized square near Matera, corner by corner, and a fifth point outside it.
const A: LngLat = [16.6, 40.66];
const B: LngLat = [16.604, 40.66];
const C: LngLat = [16.604, 40.662];
const D: LngLat = [16.6, 40.662];

let map: MapProps;
vi.mock("../components/Map", () => ({
  default: (props: MapProps) => {
    map = props;
    return <div data-testid="map" />;
  },
}));

let lastPath = "";
function LocationSpy() {
  const location = useLocation();
  lastPath = location.pathname + location.search;
  return null;
}

function open(entry = "/") {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
      <LocationSpy />
    </MemoryRouter>,
  );
}

/** Calls one of the Map's callbacks, as a touch on the real map would. */
function onMap(action: () => void) {
  return act(async () => action());
}

const hint = () => screen.getByTestId("draw-hint").textContent;
const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith("data/genzano-demo.json")) {
        return { ok: true, status: 200, json: async () => structuredClone(fixture) } as unknown as Response;
      }
      throw new Error("no network in this test");
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function startDrawing() {
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Draw your field" }));
}

describe("drawing a field", () => {
  it("starts by asking for corners, with nothing to undo or finish yet", async () => {
    await startDrawing();
    expect(hint()).toBe("Tap each corner of your field");
    expect(button("Undo")).toBeDisabled();
    expect(button("Done")).toBeDisabled();
    expect(map.editable).toBe(true);
    expect(map.drawing).toBe(false); // the map still pans and zooms while tapping corners
  });

  it("each tap adds a corner, and three corners make a field with its size", async () => {
    await startDrawing();
    await onMap(() => map.onTap(A));
    expect(hint()).toBe("Keep tapping the corners");
    await onMap(() => map.onTap(B));
    expect(button("Done")).toBeDisabled();
    await onMap(() => map.onTap(C));
    expect(map.drawnOutline).toEqual([A, B, C]);
    expect(hint()).toMatch(/^[\d.]+ ha · pull a dot to adjust$/);
    expect(button("Done")).toBeEnabled();
  });

  it("Done carries the drawn shape to the weather screen", async () => {
    await startDrawing();
    for (const p of [A, B, C, D]) await onMap(() => map.onTap(p));
    fireEvent.click(button("Done"));
    expect(lastPath.startsWith("/area?")).toBe(true);
    expect(decodeURIComponent(lastPath)).toContain("o=16.60000,40.66000;16.60400,40.66000;16.60400,40.66200;16.60000,40.66200");
  });

  it("pulling a dot reshapes the field, and Undo puts it back", async () => {
    await startDrawing();
    for (const p of [A, B, C]) await onMap(() => map.onTap(p));
    const pulled: LngLat[] = [A, [16.606, 40.659], C];
    await onMap(() => map.onEditRing(pulled));
    expect(map.drawnOutline).toEqual(pulled);
    fireEvent.click(button("Undo"));
    expect(map.drawnOutline).toEqual([A, B, C]);
    fireEvent.click(button("Undo"));
    expect(map.drawnOutline).toEqual([A, B]);
    expect(button("Done")).toBeDisabled();
  });

  it("Trace freezes the map for one stroke, then leaves a shape with dots to pull", async () => {
    await startDrawing();
    fireEvent.click(button("Trace"));
    expect(map.drawing).toBe(true);
    expect(hint()).toBe("Trace around your field");
    // A rough loop of 60 points around the square.
    const loop: LngLat[] = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * 2 * Math.PI;
      return [16.602 + 0.002 * Math.cos(a), 40.661 + 0.001 * Math.sin(a)];
    });
    await onMap(() => map.onTrace(loop));
    expect(map.drawing).toBe(false);
    expect(map.drawnOutline!.length).toBeGreaterThanOrEqual(3);
    expect(map.drawnOutline!.length).toBeLessThanOrEqual(8);
    expect(button("Done")).toBeEnabled();
  });

  it("a scribble too small to be a field keeps the earlier shape and says so", async () => {
    await startDrawing();
    for (const p of [A, B, C]) await onMap(() => map.onTap(p));
    fireEvent.click(button("Trace"));
    await onMap(() => map.onTrace([A, [16.60001, 40.66001], [16.60002, 40.66]]));
    expect(screen.getByRole("alert")).toHaveTextContent("Too small. Try again.");
    expect(map.drawnOutline).toEqual([A, B, C]);
  });

  it("stops at twelve corners", async () => {
    await startDrawing();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI;
      await onMap(() => map.onTap([16.602 + 0.002 * Math.cos(a), 40.661 + 0.001 * Math.sin(a)]));
    }
    expect(map.drawnOutline).toHaveLength(12);
    await onMap(() => map.onTap(A));
    expect(map.drawnOutline).toHaveLength(12);
    expect(screen.getByRole("alert")).toHaveTextContent("12 corners is the most.");
  });

  it("coming back to step 1 with a drawn field opens it ready to adjust", async () => {
    open("/?o=16.60000,40.66000;16.60400,40.66000;16.60400,40.66200;16.60000,40.66200");
    expect(await screen.findByTestId("draw-sheet")).toBeInTheDocument();
    expect(map.drawnOutline).toEqual([A, B, C, D]);
    expect(map.editable).toBe(true);
    expect(button("Done")).toBeEnabled();
  });

  it("Cancel leaves drawing and removes the dots", async () => {
    await startDrawing();
    await onMap(() => map.onTap(A));
    fireEvent.click(button("Cancel"));
    expect(screen.queryByTestId("draw-sheet")).toBeNull();
    expect(map.editable).toBe(false);
    expect(map.drawnOutline).toBeNull();
  });
});
