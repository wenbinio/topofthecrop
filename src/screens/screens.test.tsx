import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../public/data/genzano-demo.json";
import App, { AppRoutes } from "../App";

vi.mock("../components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => structuredClone(body) } as unknown as Response;
}

function stubBundleFetch() {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).endsWith("data/genzano-demo.json")) return okJson(fixture);
    throw new Error(`unexpected fetch ${String(url)}`);
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

beforeEach(() => {
  stubBundleFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

describe("Options", () => {
  it("shows four rows, one best fit on chickpea and one current tag on durum", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const rows = await screen.findAllByTestId("option-row");
    expect(rows).toHaveLength(4);
    const best = screen.getAllByTestId("tag-best");
    expect(best).toHaveLength(1);
    expect(best[0].closest("[data-testid=option-row]")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    const current = screen.getAllByTestId("tag-current");
    expect(current).toHaveLength(1);
    expect(current[0].closest("[data-testid=option-row]")).toHaveAttribute("data-option-id", "durum-durum-durum");
    expect(screen.queryByTestId("ruled-out")).toBeNull();
    expect(screen.getByTestId("placeholder-note")).toBeInTheDocument();
  });

  it("with cereal machinery only shows three rows and says one was ruled out", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&l=cereal-machinery");
    const rows = await screen.findAllByTestId("option-row");
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute("data-option-id"))).not.toContain("chickpea-durum-durum");
    expect(screen.getByTestId("ruled-out")).toHaveTextContent("1 ruled out: Cereal machinery only");
  });

  it("shows a warning per flag", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&l=no-buyer,broomrape");
    const rows = await screen.findAllByTestId("option-row");
    const chickpea = rows.find((r) => r.getAttribute("data-option-id") === "chickpea-durum-durum")!;
    expect(within(chickpea).getAllByTestId("flag")).toHaveLength(2);
    const durum = rows.find((r) => r.getAttribute("data-option-id") === "durum-durum-durum")!;
    expect(within(durum).queryAllByTestId("flag")).toHaveLength(0);
  });

  it("shows Italian text in the Simple view", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&v=simple&g=it");
    expect(await screen.findByText("Più adatta: Cece")).toBeInTheDocument();
    expect(document.documentElement.dataset.view).toBe("simple");
    expect(document.documentElement.lang).toBe("it");
  });
});

describe("route guard", () => {
  it("opening #/options with no field goes to step 1", async () => {
    window.location.hash = "#/options";
    render(<App />);
    expect(await screen.findByTestId("map")).toBeInTheDocument();
    expect(window.location.hash.startsWith("#/options")).toBe(false);
  });

  it("opening a link with junk parameters renders without throwing", async () => {
    window.location.hash = "#/options?f=genzano-demo&p=zzz&s=wet";
    render(<App />);
    expect(await screen.findAllByTestId("option-row")).toHaveLength(4);
  });

  it("an unknown route goes to step 1 and keeps the state", async () => {
    renderAt("/nowhere?g=it");
    expect(await screen.findByTestId("map")).toBeInTheDocument();
    expect(lastPath).toBe("/?g=it");
  });

  it("/area without an outline goes to step 1", async () => {
    renderAt("/area?f=genzano-demo");
    expect(await screen.findByTestId("map")).toBeInTheDocument();
  });
});

describe("AreaWeather", () => {
  it("shows the error line and both buttons when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    renderAt("/area?o=16.1,40.9;16.11,40.9;16.11,40.91;16.1,40.91");
    expect(await screen.findByTestId("weather-error")).toHaveTextContent("Weather history is not available right now.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    const demo = screen.getByRole("button", { name: "See the demo field" });
    fireEvent.click(demo);
    await waitFor(() => expect(lastPath.startsWith("/questions?")).toBe(true));
    expect(lastPath).toContain("f=genzano-demo");
  });
});

describe("Year", () => {
  it("moving the slider to the last stop makes vetch-oat the best fit", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    const best = await screen.findByTestId("year-best");
    expect(best).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    const slider = screen.getByRole("slider");
    act(() => {
      fireEvent.change(slider, { target: { value: "2" } });
    });
    await waitFor(() => expect(screen.getByTestId("year-best")).toHaveAttribute("data-option-id", "vetch-oat-durum-durum"));
    expect(lastPath).toContain("s=much-drier");
  });
});

describe("Questions", () => {
  it("Next needs two priorities, and a third is blocked until one is released", async () => {
    renderAt("/questions?f=genzano-demo");
    const next = await screen.findByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Income" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Soil" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
    expect(screen.getByRole("checkbox", { name: "Water" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
    expect(lastPath).toContain("p=income%2Csoil");
  });
});

describe("Why", () => {
  it("shows the five headings in order and the path", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const headings = await screen.findAllByRole("heading", { level: 2 });
    const names = headings.map((h) => h.textContent);
    const five = ["Why suggested", "Evidence", "Benefits", "What we don't know", "Check locally"];
    expect(names.filter((n) => five.includes(n ?? ""))).toEqual(five);
    expect(within(screen.getByTestId("why-path")).getAllByRole("listitem").length).toBeGreaterThan(2);
  });

  it("a term opens its one-line explanation", async () => {
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    const term = (await screen.findAllByRole("button", { name: "NDVI" }))[0];
    fireEvent.click(term);
    expect(screen.getByRole("note")).toHaveTextContent("how green");
  });
});

describe("bundle failure", () => {
  it("says so and offers a retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as unknown as Response));
    renderAt("/options?f=genzano-demo&p=income,water");
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Field data did not load.");
  });
});

// Not a pass/fail rule: prints visible word counts per screen so they can be checked against ~40.
describe("word counts", () => {
  const screens = [
    "/",
    "/questions?f=genzano-demo",
    "/options?f=genzano-demo&p=income,water",
    "/year?f=genzano-demo&p=income,water",
    "/adviser?f=genzano-demo&p=income,water",
  ];
  const DUMP = false;
  const seen: string[] = [];
  function visibleWords(root: HTMLElement, view: string): number {
    const hidden = view === "simple" ? ".sr-only, title, .tc-dataset" : ".sr-only, title";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let count = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || el.closest(hidden)) continue;
      const words = (node.textContent ?? "").split(/\s+/).filter((w) => /\p{L}/u.test(w) && !/^(\p{L}|ha|€|€\/ha|€\/ha\/yr|€\/ha\/anno|kg|mm|days|giorni|months|mesi|en|it)$/u.test(w));
      if (DUMP) seen.push(...words);
      count += words.length;
    }
    return count;
  }
  for (const lang of ["en", "it"]) {
    for (const view of ["standard", "simple"]) {
      it(`${lang} ${view}`, async () => {
        const rows: string[] = [];
        for (const path of screens) {
          const sep = path.includes("?") ? "&" : "?";
          const { container, unmount } = renderAt(`${path}${sep}g=${lang}&v=${view}`);
          await screen.findAllByRole("banner");
          if (path !== "/") await waitFor(() => expect(screen.queryByText(/Loading|Carico/)).toBeNull());
          rows.push(`${path.split("?")[0]} ${visibleWords(container, view)}`);
          unmount();
        }
        console.log(`words ${lang} ${view}: ${rows.join(" | ")}`);
      });
    }
  }
});
