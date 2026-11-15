import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import App, { AppRoutes } from "../App";
import { WHO, ownChecks } from "./check-share";

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
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Semina cece dopo");
    expect(document.documentElement.dataset.view).toBe("simple");
    expect(document.documentElement.lang).toBe("it");
  });

  it("with soil and income says what to plant next and shows the nitrogen it leaves", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income");
    // In the fixture faba (soil 0.9, income 0.7) edges chickpea (0.75, 0.8) for these two priorities.
    const rec = await screen.findByTestId("recommendation");
    expect(rec).toHaveAttribute("data-option-id", "faba-durum-faba");
    expect(screen.getByTestId("rec-headline")).toHaveTextContent("Plant faba bean next");
    const reasons = within(screen.getByTestId("rec-reasons")).getAllByTestId("reason");
    expect(reasons.map((r) => r.getAttribute("data-priority"))).toEqual(["soil", "income"]);
    expect(reasons[0]).toHaveTextContent("60 kg N/ha");
    expect(screen.getByTestId("tag-best").closest("[data-testid=option-row]")).toHaveAttribute("data-option-id", "faba-durum-faba");
  });

  it("the chips show each priority's place, and a third joins the end of the order", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income");
    await screen.findByTestId("recommendation");
    expect(screen.getByRole("checkbox", { name: "Soil and nitrogen" })).toHaveAttribute("data-rank", "1");
    expect(screen.getByRole("checkbox", { name: "Income" })).toHaveAttribute("data-rank", "2");
    expect(screen.getByRole("checkbox", { name: "Forage" })).not.toHaveAttribute("data-rank");
    fireEvent.click(screen.getByRole("checkbox", { name: "Forage" }));
    await waitFor(() => expect(lastPath).toContain("p=soil%2Cincome%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "3");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveTextContent("3");
    expect(screen.getByTestId("rec-headline")).toHaveTextContent("Plant faba bean next");
    const three = within(screen.getByTestId("rec-reasons")).getAllByTestId("reason");
    expect(three.map((r) => r.getAttribute("data-priority"))).toEqual(["soil", "income", "forage"]);
  });

  it("tapping a chip in the order takes it out, the rest move up, and the options re-rank at once", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income,forage");
    await screen.findByTestId("recommendation");
    fireEvent.click(screen.getByRole("checkbox", { name: "Soil and nitrogen" }));
    await waitFor(() => expect(lastPath).toContain("p=income%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Soil and nitrogen" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox", { name: "Income" })).toHaveAttribute("data-rank", "1");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "2");
    expect(screen.getByTestId("rec-headline")).toHaveTextContent("Plant vetch-oat next");
    expect(screen.getByTestId("tag-best").closest("[data-testid=option-row]")).toHaveAttribute("data-option-id", "vetch-oat-durum-durum");
    const reasons = within(screen.getByTestId("rec-reasons")).getAllByTestId("reason");
    expect(reasons.map((r) => r.getAttribute("data-priority"))).toEqual(["income", "forage"]);
  });

  it("releasing both chips drops p from the link and still shows a headline", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income");
    await screen.findByTestId("recommendation");
    fireEvent.click(screen.getByRole("checkbox", { name: "Soil and nitrogen" }));
    await waitFor(() => expect(lastPath).toContain("p=income"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Income" }));
    await waitFor(() => expect(lastPath).not.toContain("p="));
    expect(screen.getByTestId("rec-headline").textContent).toMatch(/^Plant .+ next$/);
    expect(within(screen.getByTestId("rec-reasons")).getAllByTestId("reason")).toHaveLength(2);
  });

  it("when the limits leave only the current rotation, staying with durum fits best", async () => {
    const only = structuredClone(fixture);
    for (const o of only.options) if (!o.isCurrent) o.removedBy = ["no-irrigation"];
    vi.stubGlobal("fetch", vi.fn(async () => okJson(only)));
    renderAt("/options?f=genzano-demo&p=soil,income&l=no-irrigation");
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Keep durum: it fits best");
    expect(screen.getAllByTestId("option-row")).toHaveLength(1);
    expect(screen.getByTestId("rec-reasons")).toHaveTextContent("No nitrogen added");
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
    expect(await screen.findByTestId("weather-error")).toHaveTextContent("Weather history unavailable.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    const demo = screen.getByRole("button", { name: "Demo field" });
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

describe("what counts as a hot day", () => {
  it("tapping the Year headline opens the 30 °C definition, also given on hover", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    const head = await screen.findByRole("button", { name: "Hot flowering days" });
    expect(head).toHaveAttribute("title", expect.stringContaining("30 °C"));
    expect(screen.queryByTestId("hot-def")).toBeNull();
    fireEvent.click(head);
    const line = screen.getByTestId("hot-def");
    expect(line).toHaveTextContent("30 °C or more between 15 April and 15 June");
    // The frozen fixture has no flowerHigh, so only the definition shows.
    expect(line).not.toHaveTextContent("Usual high");
  });

  it("with flowerHigh in the bundle the line also gives the usual high now and by 2050", async () => {
    const withHigh = structuredClone(fixture);
    const fact = (value: number, range: [number, number]) => ({
      value, unit: "°C", range, scale: "area", confidence: "fair", placeholder: false,
      source: { dataset: "ERA5-Land", resolution: "about 11 km", url: "" },
    });
    Object.assign(withHigh.year, { flowerHigh: { now: fact(22.9, [21.2, 24.5]), by2050: fact(24.5, [23.7, 25.3]) } });
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withHigh)));
    renderAt("/year?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByRole("button", { name: "Hot flowering days" }));
    const line = screen.getByTestId("hot-def");
    expect(line).toHaveTextContent("30 °C");
    expect(line).toHaveTextContent("22.9 °C now, 24.5 °C by 2050");
  });

  it("the Hot flowering finding on Options opens the same line", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByRole("button", { name: "Hot flowering" }));
    expect(screen.getByTestId("hot-def")).toHaveTextContent("30 °C or more");
  });
});

describe("Check and share (step 6)", () => {
  it("lists what to check alone for the best fit, without the line that only says to ask someone", async () => {
    renderAt("/adviser?f=genzano-demo&p=income,water");
    const own = await screen.findByTestId("own-checks");
    expect(own).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    const items = within(own).getAllByTestId("own-check").map((li) => li.textContent);
    expect(items).toEqual(["Any local pulse or forage buyer?", "Where to buy seed; best valley variety"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Check before you sow");
  });

  it("names who can look at the plan for a farmer with no adviser, easiest to reach first", async () => {
    renderAt("/adviser?f=genzano-demo&p=income,water");
    const who = within(await screen.findByTestId("who-can-check")).getAllByTestId("who");
    expect(who).toHaveLength(5);
    expect(who[0]).toHaveTextContent("Cooperative or seed dealer: seed, varieties, buyers");
    expect(who[1]).toHaveTextContent("CAA office");
    expect(who[4]).toHaveTextContent("An agronomist, if you have one");
    expect(screen.getByRole("heading", { name: "No adviser? Ask one of these" })).toBeInTheDocument();
  });

  it("still offers the printout, WhatsApp and the link", async () => {
    renderAt("/adviser?f=genzano-demo&p=income,water");
    const share = await screen.findByTestId("share");
    expect(within(share).getByRole("link", { name: "Print page" })).toBeInTheDocument();
    expect(within(share).getByRole("link", { name: "WhatsApp" }).getAttribute("href")).toContain("https://wa.me/?text=");
    expect(within(share).getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("a check that only says to ask someone is not something to check alone", () => {
    expect(ownChecks(["check.buyer", "check.adviser"])).toEqual(["check.buyer"]);
    expect(ownChecks(["check.adviser"])).toEqual([]);
    expect(WHO).toEqual(["dealer", "caa", "service", "neighbour", "agronomist"]);
  });

  it("the Year screen's button now says Check and share", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByRole("link", { name: "Check and share" })).toBeInTheDocument();
  });
});

describe("Back buttons", () => {
  const steps: [string, string][] = [
    ["/questions?f=genzano-demo&p=income,water", "/"],
    ["/options?f=genzano-demo&p=income,water", "/questions"],
    ["/year?f=genzano-demo&p=income,water", "/options"],
    ["/adviser?f=genzano-demo&p=income,water", "/year"],
  ];
  it.each(steps)("%s goes back to %s keeping the query string", async (entry, target) => {
    renderAt(entry);
    fireEvent.click(await screen.findByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath.startsWith(`${target}?`)).toBe(true));
    expect(lastPath).toContain("f=genzano-demo");
    expect(lastPath).toContain("p=income%2Cwater");
  });

  it("live weather goes back to Find field keeping the drawn outline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    renderAt("/area?o=16.1,40.9;16.11,40.9;16.11,40.91;16.1,40.91&g=it");
    fireEvent.click(await screen.findByRole("link", { name: "Indietro" }));
    await waitFor(() => expect(lastPath.startsWith("/?")).toBe(true));
    expect(lastPath).toContain("o=");
    expect(lastPath).toContain("g=it");
  });

  it("Find field, the first step, has none", async () => {
    renderAt("/?f=genzano-demo");
    await screen.findByTestId("map");
    expect(screen.queryByRole("link", { name: "Back" })).toBeNull();
  });
});

describe("Questions", () => {
  it("priorities are tapped in order, each showing its place, and Next needs two", async () => {
    renderAt("/questions?f=genzano-demo");
    const next = await screen.findByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    expect(screen.getByTestId("rank-hint")).toHaveTextContent("Pick at least 2");
    fireEvent.click(screen.getByRole("checkbox", { name: "Income" }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Income" })).toHaveAttribute("data-rank", "1"));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Soil and nitrogen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
    expect(screen.getByRole("checkbox", { name: "Soil and nitrogen" })).toHaveTextContent("2");
    expect(screen.getByRole("checkbox", { name: "Water" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
    expect(lastPath).toContain("p=income%2Csoil");
  });

  it("all four can be ranked, and taking one out moves the later ones up", async () => {
    renderAt("/questions?f=genzano-demo&p=income,soil");
    await screen.findByRole("button", { name: "Next" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Water" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Forage" }));
    await waitFor(() => expect(lastPath).toContain("p=income%2Csoil%2Cwater%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "4");
    fireEvent.click(screen.getByRole("checkbox", { name: "Income" }));
    await waitFor(() => expect(lastPath).toContain("p=soil%2Cwater%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Income" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox", { name: "Soil and nitrogen" })).toHaveAttribute("data-rank", "1");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "3");
  });
});

describe("Why", () => {
  it("shows the five headings in order and the path", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const headings = await screen.findAllByRole("heading", { level: 2 });
    const names = headings.map((h) => h.textContent);
    const five = ["Why suggested", "Evidence", "Benefits", "Not known", "Check locally"];
    expect(names.filter((n) => five.includes(n ?? ""))).toEqual(five);
    expect(within(screen.getByTestId("why-path")).getAllByRole("listitem").length).toBeGreaterThan(2);
  });

  it("lists the plain reasons before the path", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=soil,income");
    const reasons = await screen.findByTestId("why-reasons");
    const items = within(reasons).getAllByTestId("reason");
    expect(items.map((r) => r.getAttribute("data-priority"))).toEqual(["soil", "income"]);
    expect(items[0]).toHaveTextContent("40 kg N/ha");
    expect(items[1]).toHaveTextContent("more than durum on durum");
    expect(reasons.compareDocumentPosition(screen.getByTestId("why-path")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("a term opens its one-line explanation", async () => {
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    const term = (await screen.findAllByRole("button", { name: "NDVI" }))[0];
    fireEvent.click(term);
    expect(screen.getByRole("note")).toHaveTextContent("field greenness");
  });
});

describe("bundle failure", () => {
  it("says so and offers a retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as unknown as Response));
    renderAt("/options?f=genzano-demo&p=income,water");
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Field data not loaded.");
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
