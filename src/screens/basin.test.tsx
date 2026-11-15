/// <reference types="node" />
// A drawn field: inside the basin's farmland the full steps, built from the real 1 km files in data/;
// outside it, live weather.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import type { MapProps } from "../components/Map";
import type { LngLat } from "../data/types";
import { BUNDLE_TIMEOUT_MS } from "../data/validate";
import { getJson, resetBasin } from "../data/basin";

let map: MapProps;
vi.mock("../components/Map", () => ({
  default: (props: MapProps) => {
    map = props;
    return <div data-testid="map" />;
  },
}));

const DATA = join(process.cwd(), "data");
const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

/** Serves the demo fixture and the basin files from disk; `basin: false` makes the basin files fail. */
function stubFetch({ basin = true } = {}) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    const u = String(url);
    if (u.endsWith("data/genzano-demo.json")) return okJson(structuredClone(fixture));
    const file = /data\/basin\/([\w.-]+)$/.exec(u)?.[1];
    if (file) {
      if (!basin) return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
      return okJson(JSON.parse(readFileSync(join(DATA, file), "utf8")));
    }
    throw new Error(`no network in this test: ${u}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

let lastPath = "";
function LocationSpy() {
  const location = useLocation();
  lastPath = location.pathname + location.search;
  return null;
}
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
      <LocationSpy />
    </MemoryRouter>,
  );
}

const ring = (points: LngLat[]) => points.map((p) => p.map((n) => n.toFixed(5)).join(",")).join(";");
// Around the demo field's centre: one farmland square, all farmland.
const NEAR_DEMO: LngLat[] = [[16.0923, 40.8229], [16.0933, 40.8229], [16.0933, 40.8238], [16.0923, 40.8238]];
// Near Matera: about a fifth of the outline is not farmland.
const MATERA: LngLat[] = [[16.6, 40.66], [16.604, 40.66], [16.604, 40.662], [16.6, 40.662]];
// Rome: far outside the basin.
const ROME: LngLat[] = [[12.496, 41.902], [12.5, 41.902], [12.5, 41.904], [12.496, 41.904]];

beforeEach(() => {
  resetBasin();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("a drawn field", () => {
  it("does not download the basin data for the demo field", async () => {
    const fetchMock = stubFetch();
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes("cells_"))).toBe(false);
    expect(screen.queryByTestId("area-note")).toBeNull();
  });

  it("inside the basin, Done leads to Questions and on to Options with a headline and the 1 km line, and Why to the findings", async () => {
    stubFetch();
    renderAt("/");
    fireEvent.click(await screen.findByRole("button", { name: "Draw your field" }));
    for (const p of NEAR_DEMO) await act(async () => map.onTap(p));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(lastPath.startsWith("/questions?")).toBe(true));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Income" }, { timeout: 10000 }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Water" }));
    // Three questions, one at a time: Next walks through them, then on to Options.
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent(/^Plant .+ next$|Keep durum/);
    expect(screen.getByTestId("area-note")).toHaveTextContent("For the 1 km area around your field");
    expect(screen.queryByTestId("farmland-note")).toBeNull();
    // What we see sits on the plan screen, folded.
    const seen = await screen.findByTestId("fold-seen");
    expect(within(seen).getAllByRole("listitem", { hidden: true })).toHaveLength(3);
    // Change my answers, then the step bar's Field step goes back to Find field, keeping the outline.
    fireEvent.click(await screen.findByTestId("change-answers"));
    fireEvent.click(await screen.findByRole("link", { name: "1. Field" }));
    await waitFor(() => expect(lastPath.startsWith("/?")).toBe(true));
    expect(lastPath).toContain("o=");
  }, 20000);

  it("outside the basin, Done goes on to live weather", async () => {
    stubFetch();
    renderAt("/");
    fireEvent.click(await screen.findByRole("button", { name: "Draw your field" }));
    for (const p of ROME) await act(async () => map.onTap(p));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(lastPath.startsWith("/area?")).toBe(true), { timeout: 10000 });
    expect(await screen.findByTestId("weather-error")).toBeInTheDocument();
  }, 20000);

  it("a shared link with o= rebuilds the same field: Options, Why and Year all work, Back too", async () => {
    stubFetch();
    const o = `o=${ring(MATERA)}&p=income,water`;
    const first = renderAt(`/options?${o}`);
    const headline = (await screen.findByTestId("rec-headline", {}, { timeout: 10000 })).textContent;
    const others = screen.getByTestId("option-list").textContent;
    expect(screen.getByTestId("farmland-note")).toHaveTextContent("Part of this outline isn't farmland.");
    first.unmount();
    // A fresh load of the same link.
    resetBasin();
    renderAt(`/options?${o}&g=it`);
    expect(await screen.findByTestId("area-note", {}, { timeout: 10000 })).toHaveTextContent("Per la zona di 1 km intorno al tuo campo");
    cleanup();
    renderAt(`/options?${o}`);
    expect((await screen.findByTestId("rec-headline", {}, { timeout: 10000 })).textContent).toBe(headline);
    expect(screen.getByTestId("option-list").textContent).toBe(others);
    cleanup();

    renderAt(`/year?${o}`);
    expect(await screen.findByTestId("hot-normal", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByTestId("area-note")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("year-back"));
    await waitFor(() => expect(lastPath.startsWith("/why/")).toBe(true));
    expect(lastPath).toContain("o=");
    cleanup();

    renderAt(`/options?${o}`);
    const findings = await screen.findByTestId("fold-seen", {}, { timeout: 10000 });
    expect(within(findings).getAllByRole("listitem", { hidden: true }).length).toBeGreaterThan(0);
    cleanup();

    renderAt(`/why/chickpea-durum-durum?${o}`);
    await screen.findByTestId("why-years", {}, { timeout: 10000 });
    const unknowns = screen.getByRole("heading", { name: "What we don't know" });
    const list = unknowns.parentElement!;
    expect(list).toHaveTextContent("estimates for a 1 km area");
    expect(list).toHaveTextContent("hot days are likely undercounted");
    expect(list).toHaveTextContent("check them with a soil test");
  }, 30000);

  it("a shared link outside the basin opens live weather", async () => {
    stubFetch();
    renderAt(`/options?o=${ring(ROME)}`);
    await waitFor(() => expect(lastPath.startsWith("/area?")).toBe(true), { timeout: 10000 });
  }, 20000);

  it("when the basin data fails to load, says so and Retry tries again", async () => {
    stubFetch({ basin: false });
    renderAt(`/options?o=${ring(NEAR_DEMO)}&p=income,water`);
    expect(await screen.findByText("Could not load the area data.", {}, { timeout: 10000 })).toBeInTheDocument();
    stubFetch();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading area data…");
    expect(await screen.findByTestId("area-note", {}, { timeout: 10000 })).toBeInTheDocument();
  }, 20000);

  it("the demo field's Why also lists the temperature and soil caveats, but not the 1 km one", async () => {
    stubFetch();
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const list = (await screen.findByRole("heading", { name: "What we don't know" })).parentElement!;
    expect(list).toHaveTextContent("hot days are likely undercounted");
    expect(list).toHaveTextContent("check them with a soil test");
    expect(list).not.toHaveTextContent("estimates for a 1 km area");
  });

  it("Find field draws the basin outline on the map", async () => {
    stubFetch();
    renderAt("/");
    await waitFor(() => expect(map.basinOutline?.type).toBe("FeatureCollection"));
    expect(screen.getByText("Full advice is for fields in the Bradano valley, inside the white line.")).toBeInTheDocument();
  });
});

describe("basin file loader", () => {
  it("gives up on a stalled file so the screen can offer a retry", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }));
    const outcome = expect(getJson("data/basin/grid.geojson")).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(BUNDLE_TIMEOUT_MS);
    await outcome;
  });
});
