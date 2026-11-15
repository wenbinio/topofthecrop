// Step 1: finding a field by its cadastral sheet and parcel numbers.
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import type { MapProps } from "../components/Map";
import { resetParcels } from "../data/parcels";
import { MAX_CORNERS } from "../geo/edit";

let map: MapProps;
vi.mock("../components/Map", () => ({
  default: (props: MapProps) => {
    map = props;
    return <div data-testid="map" />;
  },
}));

// A parcel with more corners than a link can hold: a 20-sided shape about 300 m across.
const round: [number, number][] = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * 2 * Math.PI;
  return [16.09 + 0.002 * Math.cos(a), 40.82 + 0.0015 * Math.sin(a)];
});
const files: Record<string, unknown> = {
  "index.json": {
    commune: { code: "D971", name: "Genzano di Lucania" },
    credit: "Parcels © Agenzia delle Entrate, CC BY 4.0",
    fetched: "2026-11-15",
    parcels: 1,
    sheets: { "005600": { sheet: "56", parcels: 1 } },
  },
  "005600.json": { "159": round },
};
let parcelsDown = false;

beforeEach(() => {
  parcelsDown = false;
  resetParcels();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.endsWith("data/genzano-demo.json")) {
        return { ok: true, status: 200, json: async () => structuredClone(fixture) } as unknown as Response;
      }
      const name = href.split("/").pop() ?? "";
      if (href.includes("parcels/D971/") && !parcelsDown && name in files) {
        return { ok: true, status: 200, json: async () => structuredClone(files[name]) } as unknown as Response;
      }
      throw new Error("no network in this test");
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function openForm() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Parcel number" }));
  return screen.getByTestId("parcel-form");
}

function type(sheet: string, parcel: string) {
  fireEvent.change(screen.getByLabelText("Sheet (foglio)"), { target: { value: sheet } });
  fireEvent.change(screen.getByLabelText("Parcel (particella)"), { target: { value: parcel } });
}

describe("finding a field by parcel number", () => {
  it("names the commune and waits for both numbers", async () => {
    const form = await openForm();
    expect(form.textContent).toContain("Commune: Genzano di Lucania");
    expect(form.textContent).toContain("Parcels © Agenzia delle Entrate, CC BY 4.0");
    const find = screen.getByRole("button", { name: "Find parcel" });
    expect(find).toBeDisabled();
    type("56", "");
    expect(find).toBeDisabled();
    type("56", "159");
    expect(find).toBeEnabled();
  });

  it("turns a found parcel into a shape to adjust, with no more corners than a link can hold", async () => {
    await openForm();
    type("56", "159");
    fireEvent.click(screen.getByRole("button", { name: "Find parcel" }));
    expect((await screen.findByTestId("draw-hint")).textContent).toMatch(/ha · drag dot to adjust$/);
    expect(map.drawnOutline!.length).toBeGreaterThanOrEqual(3);
    expect(map.drawnOutline!.length).toBeLessThanOrEqual(MAX_CORNERS);
    expect(map.editable).toBe(true);
    // The map moves to the parcel.
    expect(map.target!.centre[0]).toBeCloseTo(16.09, 2);
    expect(map.target!.centre[1]).toBeCloseTo(40.82, 2);
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });

  it("says so when the sheet is not in this commune", async () => {
    await openForm();
    type("999", "1");
    fireEvent.click(screen.getByRole("button", { name: "Find parcel" }));
    expect((await screen.findByTestId("parcel-note")).textContent).toBe("No such sheet here.");
  });

  it("says so when the parcel is not on that sheet, and clears the message on typing", async () => {
    await openForm();
    type("56", "7");
    fireEvent.click(screen.getByRole("button", { name: "Find parcel" }));
    expect((await screen.findByTestId("parcel-note")).textContent).toBe("No such parcel on that sheet.");
    type("56", "15");
    expect(screen.queryByTestId("parcel-note")).toBeNull();
  });

  it("says so when the parcel files cannot be loaded", async () => {
    parcelsDown = true;
    await openForm();
    type("56", "159");
    fireEvent.click(screen.getByRole("button", { name: "Find parcel" }));
    expect((await screen.findByTestId("parcel-note")).textContent).toBe("Parcels not loading. Try again.");
  });

  it("Cancel goes back to the map hint", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("parcel-form")).toBeNull();
    expect(screen.getByRole("button", { name: "Draw your field" })).toBeInTheDocument();
  });
});
