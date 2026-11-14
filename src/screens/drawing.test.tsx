// Drawing a field in step 1: tap corners, pull dots, trace, undo.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import type { MapProps } from "../components/Map";
import type { LngLat } from "../data/types";
import { centroid } from "../geo/geometry";

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
    expect(hint()).toBe("Tap each corner");
    expect(button("Undo")).toBeDisabled();
    expect(button("Done")).toBeDisabled();
    expect(map.editable).toBe(true);
    expect(map.drawing).toBe(false); // the map still pans and zooms while tapping corners
  });

  it("each tap adds a corner, and three corners make a field with its size", async () => {
    await startDrawing();
    await onMap(() => map.onTap(A));
    expect(hint()).toBe("Keep tapping");
    await onMap(() => map.onTap(B));
    expect(button("Done")).toBeDisabled();
    await onMap(() => map.onTap(C));
    expect(map.drawnOutline).toEqual([A, B, C]);
    expect(hint()).toMatch(/^[\d.]+ ha · drag dot to adjust$/);
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
    expect(hint()).toBe("Trace your field");
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
    expect(screen.getByRole("alert")).toHaveTextContent("Too small. Retry.");
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
    expect(screen.getByRole("alert")).toHaveTextContent("Max 12 corners.");
  });

  it("coming back to step 1 with a drawn field opens it ready to adjust", async () => {
    open("/?o=16.60000,40.66000;16.60400,40.66000;16.60400,40.66200;16.60000,40.66200");
    expect(await screen.findByTestId("draw-sheet")).toBeInTheDocument();
    expect(map.drawnOutline).toEqual([A, B, C, D]);
    expect(map.editable).toBe(true);
    expect(button("Done")).toBeEnabled();
  });

  it("Find edges on a shape seeks from its centre, replaces the shape, and Undo brings the old one back", async () => {
    await startDrawing();
    for (const p of [A, B, C, D]) await onMap(() => map.onTap(p));
    fireEvent.click(button("Find edges"));
    expect(map.edgeRequest!.at[0]).toBeCloseTo(16.602, 6);
    expect(map.edgeRequest!.at[1]).toBeCloseTo(40.661, 6);
    expect(hint()).toBe("Finding field…");
    const found: LngLat[] = [A, [16.605, 40.66], [16.605, 40.6625], D];
    await onMap(() => map.onEdges(found));
    expect(map.drawnOutline).toEqual(found);
    fireEvent.click(button("Undo"));
    expect(map.drawnOutline).toEqual([A, B, C, D]);
  });

  it("Find edges that finds nothing keeps the shape and says so", async () => {
    await startDrawing();
    for (const p of [A, B, C]) await onMap(() => map.onTap(p));
    fireEvent.click(button("Find edges"));
    await onMap(() => map.onEdges(null));
    expect(map.drawnOutline).toEqual([A, B, C]);
    expect(screen.getByRole("alert")).toHaveTextContent("No edges found. Tap corners.");
  });

  it("with no shape yet, Find edges makes the next tap a point inside the field, not a corner", async () => {
    await startDrawing();
    expect(map.edgeRequest).toBeNull();
    fireEvent.click(button("Find edges"));
    expect(hint()).toBe("Tap inside field");
    await onMap(() => map.onTap(C));
    expect(map.drawnOutline).toEqual([]);
    expect(map.edgeRequest!.at).toEqual(C);
    await onMap(() => map.onEdges([A, B, C, D]));
    expect(map.drawnOutline).toEqual([A, B, C, D]);
    expect(button("Done")).toBeEnabled();
    // The next tap is a corner again.
    await onMap(() => map.onTap([16.601, 40.663]));
    expect(map.drawnOutline).toHaveLength(5);
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

describe("finding a field from a tap", () => {
  /** Opens step 1 and waits for the demo field's outline to be on the map. */
  async function openWithDemo() {
    open();
    await waitFor(() => expect(map.fieldOutline).not.toBeNull());
  }

  it("a tap outside the demo field looks for the edges there, and a found field opens ready to adjust", async () => {
    await openWithDemo();
    await onMap(() => map.onTap(A));
    expect(map.edgeRequest?.at).toEqual(A);
    expect(screen.getByTestId("finding")).toHaveTextContent("Finding field…");
    await onMap(() => map.onEdges([A, B, C, D]));
    expect(screen.getByTestId("draw-sheet")).toBeInTheDocument();
    expect(map.drawnOutline).toEqual([A, B, C, D]);
    expect(map.editable).toBe(true);
    expect(hint()).toMatch(/^[\d.]+ ha · drag dot to adjust$/);
    expect(button("Done")).toBeEnabled();
    // Undo clears it, leaving corners to tap.
    fireEvent.click(button("Undo"));
    expect(map.drawnOutline).toEqual([]);
    expect(hint()).toBe("Tap each corner");
  });

  it("when no edges are found, drawing opens empty with a note", async () => {
    await openWithDemo();
    await onMap(() => map.onTap(A));
    await onMap(() => map.onEdges(null));
    expect(map.drawnOutline).toEqual([]);
    expect(hint()).toBe("Tap each corner");
    expect(screen.getByRole("alert")).toHaveTextContent("No edges found. Tap corners.");
    expect(button("Done")).toBeDisabled();
  });

  it("a tap inside the demo outline still offers the demo field", async () => {
    await openWithDemo();
    await onMap(() => map.onTap(centroid(map.fieldOutline!)));
    expect(button("Yes")).toBeInTheDocument();
    expect(map.edgeRequest).toBeNull();
  });

  it("an answer that comes after Cancel is ignored", async () => {
    await openWithDemo();
    await onMap(() => map.onTap(A));
    fireEvent.click(button("Cancel"));
    await onMap(() => map.onEdges([A, B, C, D]));
    expect(screen.queryByTestId("draw-sheet")).toBeNull();
    expect(map.drawnOutline).toBeNull();
  });
});
