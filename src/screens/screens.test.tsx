import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import App, { AppRoutes } from "../App";
import { WHO, ownChecks } from "./check-share";
import type { FieldBundle } from "../data/types";
import { blockTiles, tileWindow } from "../timelapse/frames";

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

describe("what each slider stop means", () => {
  it("a line under the slider says what the stop is, and changes with it", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("scenario-def")).toHaveTextContent("A usual season (2001–2020).");
    act(() => {
      fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    });
    await waitFor(() => expect(screen.getByTestId("scenario-def")).toHaveTextContent("As dry and as hot as 1 season in 10."));
    // The frozen fixture has no rain per stop, so no rain line shows.
    expect(screen.queryByTestId("rain-stop")).toBeNull();
  });

  it("with rain per stop in the bundle, it shows the stop's Oct-May rain now and by 2050", async () => {
    const withRain = structuredClone(fixture);
    const fact = (value: number) => ({
      value, unit: "mm", scale: "area", confidence: "fair", placeholder: false,
      source: { dataset: "CHIRPS + NASA GPM + ERA5-Land", resolution: "6 to 11 km", url: "" },
    });
    Object.assign(withRain.year, {
      rainSeason: {
        normal: { now: fact(542), by2050: fact(520) },
        drier: { now: fact(418), by2050: fact(393) },
        "much-drier": { now: fact(390), by2050: fact(367) },
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withRain)));
    renderAt("/year?f=genzano-demo&p=income,water&s=much-drier");
    const line = await screen.findByTestId("rain-stop");
    expect(screen.getByTestId("scenario-def")).toHaveTextContent("The driest and the hottest seasons since 2001.");
    expect(line).toHaveTextContent("390");
    expect(line).toHaveTextContent("367");
  });
});

describe("Data and credits", () => {
  it("Check and share ends with one link to the credits page: the Copernicus notice, NASA's datasets and the AI note", async () => {
    renderAt("/adviser?f=genzano-demo&p=income,water");
    const link = await screen.findByTestId("credits-link");
    expect(link).toHaveTextContent("Data and credits");
    expect(screen.queryByTestId("credit-lines")).toBeNull();
    fireEvent.click(link);
    const page = await screen.findByTestId("credits-page");
    expect(page).toHaveTextContent("Contains modified Copernicus Climate Change Service information 2026 (ERA5-Land).");
    expect(page).toHaveTextContent("SMAP soil water");
    expect(within(page).getByTestId("ai-note")).toHaveTextContent("The app's code and the data notebooks were written with AI tools, mainly Claude (Anthropic)");
    expect(within(page).getByRole("link", { name: /DATA_SOURCES\.md/ })).toHaveAttribute("href", expect.stringContaining("DATA_SOURCES.md"));
  });

  it("the printout carries the same credits", async () => {
    renderAt("/print?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("credit-lines")).toHaveTextContent("ISRIC");
    expect(screen.getByTestId("ai-note")).toBeInTheDocument();
  });
});

describe("Field timelapse (Your field from space)", () => {
  const stac = (features: object[]) => ({ type: "FeatureCollection", features, links: [] });
  const scene = (id: string, datetime: string, cloud: number) => ({ id, properties: { datetime, "eo:cloud_cover": cloud } });
  /** The STAC search, the ground check at the field (clear unless the scene's id says cloudy), and the bundle. */
  function serve(search: () => Response | Promise<Response>) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/stac/")) return search();
      if (u.includes("/item/point/")) return okJson({ values: [u.includes("cloudy") ? 9 : 5] });
      return okJson(fixture);
    }));
  }

  it("plays one clear picture a month of the farmer's field, with its date, the outline and the Copernicus notice", async () => {
    // June's least cloudy scene is cloudy over the field, so June shows its next scene.
    serve(() => okJson(stac([
      scene("S2A_cloudy", "2024-06-15T09:52:00Z", 0.5), scene("S2A_1", "2024-06-15T09:52:00Z", 1), scene("S2B_2", "2024-07-10T09:52:00Z", 4),
    ])));
    renderAt("/timelapse?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("frame-date")).toHaveTextContent("15 Jun 2024 · 11:52");
    const picture = screen.getByTestId("timelapse-picture");
    const perFrame = blockTiles(tileWindow((fixture as unknown as FieldBundle).field.outline)).length;
    expect(picture.querySelectorAll("img")).toHaveLength(2 * perFrame); // two frames
    expect(picture.querySelector("img")!.getAttribute("src")).toContain("item=S2A_1");
    expect(picture.innerHTML).not.toContain("S2A_cloudy");
    expect(picture.querySelector("polygon")).not.toBeNull();
    expect(screen.getByTestId("timelapse-credit")).toHaveTextContent("Contains modified Copernicus Sentinel data 2024.");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: "Picture" }), { target: { value: "1" } });
    expect(screen.getByTestId("frame-date")).toHaveTextContent("10 Jul 2024");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("opens from the Year screen", async () => {
    serve(() => okJson(stac([scene("S2A_1", "2024-06-15T09:52:00Z", 1)])));
    renderAt("/year?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("timelapse-link"));
    expect(await screen.findByTestId("frame-date")).toHaveTextContent("15 Jun 2024");
  });

  it("says so when no clear picture is found, and offers a retry when the service fails", async () => {
    serve(() => okJson(stac([])));
    renderAt("/timelapse?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("timelapse-none")).toBeInTheDocument();
    cleanup();
    serve(() => new Response("down", { status: 503 }));
    renderAt("/timelapse?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("timelapse-error")).toHaveTextContent("Try again");
  });
});

describe("Why: the reasons first, sources one tap away", () => {
  it("opens with why it is suggested, before the numbers, and shows no dataset until a Source is tapped", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const reasons = await screen.findByRole("heading", { name: "Why suggested" });
    const numbers = screen.getByRole("heading", { name: "Over three harvests" });
    expect(reasons.compareDocumentPosition(numbers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const evidence = screen.getByRole("heading", { name: "Evidence" }).closest("section")!;
    // The fixture's hot days come from NASA POWER: hidden until the first Source is tapped.
    expect(within(evidence).queryByText(/NASA POWER/)).toBeNull();
    fireEvent.click(within(evidence).getAllByRole("button", { name: "Source" })[0]);
    expect(within(evidence).getByTestId("source-bubble")).toHaveTextContent("NASA POWER");
  });
});

describe("Why: the finding's figure is listed once", () => {
  it("the evidence list leaves out the repeat of the finding's own figure, and keeps the rest", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const evidence = (await screen.findByRole("heading", { name: "Evidence" })).closest("section")!;
    // chickpea answers the hot-flowering finding: its hot days used to appear twice in a row
    expect(within(evidence).getAllByText("Hot flowering days")).toHaveLength(1);
    expect(within(evidence).getByText("Bare months after harvest")).toBeInTheDocument();
  });
});

describe("2024 and 2026 against a usual season (Year)", () => {
  const source = { dataset: "NASA SMAP L4 soil moisture", resolution: "9 km", url: "" };
  const fact = (value: number, unit: string, range: [number, number], asOf: string) =>
    ({ value, unit, range, asOf, scale: "area", confidence: "fair", placeholder: false, label: "data.x", source });
  const series = (values: (number | null)[], unit: string) =>
    ({ values, unit, scale: "area", confidence: "fair", placeholder: false, label: "data.x", source });
  /** The fixture with field data for seasons 2023-2026: a dry 2024, a wet 2026, no SMAP figure for 2026. */
  function withSeasons(peakVsNearby?: (number | null)[]) {
    const b = structuredClone(fixture) as Record<string, any>;
    b.year.rainSeason = Object.fromEntries(["normal", "drier", "much-drier"].map((k) =>
      [k, { now: fact(542, "mm", [418, 631], "2001-2020"), by2050: fact(520, "mm", [477, 558], "2041-2060") }]));
    b.fieldData = {
      greenness: { peakGreenness: fact(0.71, "NDVI", [0.59, 0.76], "2001-2020") },
      weather: {}, soil: {}, land: {},
      water: { soilWaterSpring: fact(30.1, "%", [27.4, 32], "2016-2025"), cropWaterUse: fact(319, "mm", [277, 346], "2001-2020") },
      by2050: { ssp245: {}, ssp585: {} },
      seasons: {
        years: [2023, 2024, 2025, 2026],
        series: {
          rainSeason: series([656, 413, 468, 651], "mm"),
          soilWaterSpring: series([31.2, 27.3, 30.1, null], "%"),
          peakGreenness: series([0.68, 0.6, 0.75, 0.72], "NDVI"),
          cropWaterUse: series([360, 258, 322, 326], "mm"),
          ...(peakVsNearby ? { peakVsNearby: series(peakVsNearby, "z") } : {}),
        },
      },
    };
    return b;
  }

  it("shows each season's figure, an arrow only outside the usual range, and no data where there is none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withSeasons())));
    renderAt("/year?f=genzano-demo&p=income,water");
    const card = await screen.findByTestId("season-compare");
    expect(within(card).getByRole("columnheader", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByTestId("compare-years.rain-2024")).toHaveTextContent("413 mm ↓");
    expect(screen.getByTestId("compare-years.rain-2026")).toHaveTextContent("651 mm ↑");
    expect(screen.getByTestId("compare-years.green-2024")).toHaveTextContent(/^0\.60$/); // inside 0.59-0.76: no arrow
    expect(screen.getByTestId("compare-years.water-2024")).toHaveTextContent("258 mm ↓");
    expect(screen.queryByTestId("compare-years.soil-2026")).toBeNull();
    expect(within(card).getByText("no data")).toBeInTheDocument();
    expect(card).toHaveTextContent("2016–2025"); // SMAP's usual period, beside its usual figure
    expect(screen.getByTestId("rain-2026-note")).toHaveTextContent("NASA GPM data stop in September 2025");
    expect(screen.queryByTestId("stress-line")).toBeNull();
  });

  it("names the seasons much less green than nearby fields, ending in check locally", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withSeasons([-1.69, -0.65, -0.74, 0.06]))));
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("stress-line")).toHaveTextContent("Much less green than nearby fields in 2023: check locally");
  });

  it("without field data there is no card", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    await screen.findByTestId("scenario-def");
    expect(screen.queryByTestId("season-compare")).toBeNull();
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
