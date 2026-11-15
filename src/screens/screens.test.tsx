import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

/** A plain in-memory store: the test runner's own localStorage is not a full one. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() { return items.size; },
    clear: () => items.clear(),
    getItem: (key: string) => items.get(key) ?? null,
    key: (index: number) => [...items.keys()][index] ?? null,
    removeItem: (key: string) => void items.delete(key),
    setItem: (key: string, value: string) => void items.set(key, String(value)),
  };
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
  it("gives chickpea as the advice, and lists the other three with one current tag on durum", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const rows = await screen.findAllByTestId("option-row");
    expect(screen.getByTestId("recommendation")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    // The answer is not repeated in the list of other choices.
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute("data-option-id"))).not.toContain("chickpea-durum-durum");
    expect(screen.queryAllByTestId("tag-best")).toHaveLength(0);
    const current = screen.getAllByTestId("tag-current");
    expect(current).toHaveLength(1);
    expect(current[0].closest("[data-testid=option-row]")).toHaveAttribute("data-option-id", "durum-durum-durum");
    expect(screen.queryByTestId("ruled-out")).toBeNull();
    expect(screen.getByTestId("placeholder-note")).toBeInTheDocument();
  });

  it("names the field and its area above the advice", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const line = await screen.findByTestId("field-line");
    expect(line).toHaveTextContent(fixture.field.name);
    expect(line).toHaveTextContent("ha");
    expect(line.compareDocumentPosition(screen.getByTestId("recommendation")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("recommendation")).toHaveTextContent("Our advice");
    // The three harvests: chickpea, then durum twice.
    expect(within(screen.getByTestId("rec-harvests")).getByRole("list")).toHaveAccessibleName("Chickpea, Durum, Durum");
  });

  it("with cereal machinery only lists two others and says one was ruled out", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&l=cereal-machinery");
    const rows = await screen.findAllByTestId("option-row");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.getAttribute("data-option-id"))).not.toContain("chickpea-durum-durum");
    expect(screen.getByTestId("recommendation")).not.toHaveAttribute("data-option-id", "chickpea-durum-durum");
    expect(screen.getByTestId("ruled-out")).toHaveTextContent("1 ruled out: Cereal machinery only");
  });

  it("shows a warning per flag, on the advice as on the other rows", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&l=no-buyer,broomrape");
    const rows = await screen.findAllByTestId("option-row");
    // Chickpea, the advice, carries both warnings beside its harvests.
    expect(screen.getByTestId("recommendation")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    expect(within(screen.getByTestId("rec-flags")).getAllByTestId("flag")).toHaveLength(2);
    const faba = rows.find((r) => r.getAttribute("data-option-id") === "faba-durum-faba")!;
    expect(within(faba).getAllByTestId("flag")).toHaveLength(2);
    const durum = rows.find((r) => r.getAttribute("data-option-id") === "durum-durum-durum")!;
    expect(within(durum).queryAllByTestId("flag")).toHaveLength(0);
  });

  it("shows Italian text in the Simple view", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&v=simple&g=it");
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Semina cece la prossima annata");
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
    expect(screen.getAllByTestId("option-row").map((r) => r.getAttribute("data-option-id"))).not.toContain("faba-durum-faba");
  });

  it("the chips on Questions show each priority's place, a third joins the end, and the plan follows", async () => {
    renderAt("/questions?f=genzano-demo&p=soil,income");
    expect(await screen.findByTestId("question-step")).toHaveTextContent("Question 3 of 3");
    expect(screen.getByRole("checkbox", { name: "Soil and nitrogen" })).toHaveAttribute("data-rank", "1");
    expect(screen.getByRole("checkbox", { name: "Income" })).toHaveAttribute("data-rank", "2");
    expect(screen.getByRole("checkbox", { name: "Forage" })).not.toHaveAttribute("data-rank");
    fireEvent.click(screen.getByRole("checkbox", { name: "Forage" }));
    await waitFor(() => expect(lastPath).toContain("p=soil%2Cincome%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "3");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveTextContent("3");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Plant faba bean next");
    const three = within(screen.getByTestId("rec-reasons")).getAllByTestId("reason");
    expect(three.map((r) => r.getAttribute("data-priority"))).toEqual(["soil", "income", "forage"]);
  });

  it("taking a chip out on Questions moves the rest up, and the plan re-ranks", async () => {
    renderAt("/questions?f=genzano-demo&p=soil,income,forage");
    await screen.findByTestId("question-step");
    fireEvent.click(screen.getByRole("checkbox", { name: "Soil and nitrogen" }));
    await waitFor(() => expect(lastPath).toContain("p=income%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Soil and nitrogen" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox", { name: "Income" })).toHaveAttribute("data-rank", "1");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Plant vetch-oat next");
    expect(screen.getByTestId("recommendation")).toHaveAttribute("data-option-id", "vetch-oat-durum-durum");
    const reasons = within(screen.getByTestId("rec-reasons")).getAllByTestId("reason");
    expect(reasons.map((r) => r.getAttribute("data-priority"))).toEqual(["income", "forage"]);
  });

  it("a link without priorities still shows a headline with two reasons", async () => {
    renderAt("/options?f=genzano-demo");
    expect((await screen.findByTestId("rec-headline")).textContent).toMatch(/^Plant .+ next$/);
    expect(within(screen.getByTestId("rec-reasons")).getAllByTestId("reason")).toHaveLength(2);
  });

  it("when the limits leave only the current rotation, staying with durum fits best", async () => {
    const only = structuredClone(fixture);
    for (const o of only.options) if (!o.isCurrent) o.removedBy = ["no-irrigation"];
    vi.stubGlobal("fetch", vi.fn(async () => okJson(only)));
    renderAt("/options?f=genzano-demo&p=soil,income&l=no-irrigation");
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Keep durum: it fits best");
    expect(screen.queryAllByTestId("option-row")).toHaveLength(0);
    expect(within(screen.getByTestId("fold-options")).getByTestId("fold-toggle")).toHaveTextContent("Other choices (0)");
    expect(screen.getByTestId("rec-reasons")).toHaveTextContent("Leaves no nitrogen");
  });

  it("says how sure the advice is, in one line beside it", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const sure = await screen.findByTestId("how-sure");
    expect(sure).toHaveAttribute("data-confidence", "low");
    expect(sure).toHaveTextContent("How sure we are: low.");
    expect(sure).toHaveTextContent("Talk it over with an adviser before you sow.");
    // It names what is unsure rather than a general warning.
    expect(screen.getByTestId("how-sure-weak")).toHaveTextContent(/^Not yet checked against a local source: .+\. Talk it over/);
  });
});

describe("the plan's buttons", () => {
  it("keep the plan, ask why, share it or change the answers, each keeping the query string", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const actions = await screen.findByTestId("plan-actions");
    const href = (id: string) => within(actions).getByTestId(id).getAttribute("href");
    expect(within(actions).getByTestId("keep-plan")).toHaveTextContent("Keep this plan");
    expect(href("keep-plan")).toBe("/today?f=genzano-demo&p=income%2Cwater");
    expect(within(actions).getByTestId("branch-why")).toHaveTextContent("Why this plan?");
    expect(href("branch-why")).toBe("/why/chickpea-durum-durum?f=genzano-demo&p=income%2Cwater");
    expect(within(actions).getByTestId("share-plan")).toHaveTextContent("Share it");
    expect(href("share-plan")).toBe("/adviser?f=genzano-demo&p=income%2Cwater");
    expect(within(actions).getByTestId("change-answers")).toHaveTextContent("Change my answers");
    expect(href("change-answers")).toBe("/questions?f=genzano-demo&p=income%2Cwater");
  });

  it("Change my answers opens Questions on the priorities, and Keep this plan the field's day", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    renderAt("/options?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("change-answers"));
    expect(await screen.findByTestId("question-step")).toHaveTextContent("Question 3 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(await screen.findByTestId("keep-plan"));
    expect(await screen.findByTestId("plan-change")).toBeInTheDocument();
    expect(lastPath).toBe("/today?f=genzano-demo&p=income%2Cwater");
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
    expect(await screen.findAllByTestId("option-row")).toHaveLength(3);
    expect(screen.getByTestId("recommendation")).toBeInTheDocument();
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
    expect(await screen.findByTestId("weather-error")).toHaveTextContent("Past weather is not available.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    const demo = screen.getByRole("button", { name: "Demo field" });
    fireEvent.click(demo);
    await waitFor(() => expect(lastPath.startsWith("/questions?")).toBe(true));
    expect(lastPath).toContain("f=genzano-demo");
  });
});

describe("Year", () => {
  it("shows a usual, a dry and the driest year at once, each with its best fit, and no slider to choose with", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("year-best-normal")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    expect(screen.getByTestId("year-best-much-drier")).toHaveAttribute("data-option-id", "vetch-oat-durum-durum");
    expect(screen.getByTestId("year-best-drier")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
    // The best fit differs between the kinds of year here, so no line claims it holds in all three.
    expect(screen.queryByTestId("year-holds")).toBeNull();
    expect(Array.from(screen.getByTestId("year-kinds").children).map((card) => card.getAttribute("data-testid"))).toEqual([
      "year-normal", "year-drier", "year-much-drier",
    ]);
  });

  it("says so in one line when the same rotation fits best in all three", async () => {
    // A bundle in which a dry year changes no score: the usual year's best fit holds in all three.
    const steady = structuredClone(fixture);
    for (const option of steady.options) Object.assign(option.scores, { drier: option.scores.normal, "much-drier": option.scores.normal });
    vi.stubGlobal("fetch", vi.fn(async () => okJson(steady)));
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("year-holds")).toHaveTextContent("Chickpea fits best in all three.");
    expect(screen.getByTestId("year-best-much-drier")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
  });

  it("an old link's slider stop changes nothing: the usual year is still ranked for a usual year", async () => {
    renderAt("/year?f=genzano-demo&p=income,water&s=much-drier");
    expect(await screen.findByTestId("year-best-normal")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    fireEvent.click(screen.getByTestId("year-back"));
    await waitFor(() => expect(lastPath.startsWith("/why/chickpea-durum-durum?")).toBe(true));
    expect(lastPath).not.toContain("s=");
  });
});

describe("the printout lists the three kinds of year", () => {
  it("each with its hot days now and by 2050 and its best fit", async () => {
    renderAt("/print?f=genzano-demo&p=income,water");
    const rows = within(await screen.findByTestId("print-years")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Usual year");
    expect(rows[0]).toHaveTextContent("Chickpea");
    expect(rows[2]).toHaveTextContent("Driest year");
    expect(rows[2]).toHaveTextContent("16");
    expect(rows[2]).toHaveTextContent("27");
    expect(rows[2]).toHaveTextContent("Vetch-oat");
  });
});

describe("what each kind of year means", () => {
  it("a line under each name says what it is, and each has its own hot days", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("def-normal")).toHaveTextContent("A usual season (2001–2020).");
    expect(screen.getByTestId("def-drier")).toHaveTextContent("As dry and hot as 1 season in 10.");
    expect(screen.getByTestId("def-much-drier")).toHaveTextContent("The driest and hottest seasons since 2001.");
    expect(screen.getByTestId("year-normal")).toHaveTextContent("Usual year");
    expect(screen.getByTestId("hot-normal")).toHaveTextContent("9");
    expect(screen.getByTestId("hot-normal")).toHaveTextContent("17");
    expect(screen.getByTestId("hot-much-drier")).toHaveTextContent("16");
    expect(screen.getByTestId("hot-much-drier")).toHaveTextContent("27");
    // The frozen fixture has no rain per kind of year, so no rain line shows.
    expect(screen.queryByTestId("rain-normal")).toBeNull();
  });

  it("with rain in the bundle, each kind of year shows its Oct-May rain now and by 2050", async () => {
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
    renderAt("/year?f=genzano-demo&p=income,water");
    const line = await screen.findByTestId("rain-much-drier");
    expect(line).toHaveTextContent("390");
    expect(line).toHaveTextContent("367");
    expect(screen.getByTestId("rain-normal")).toHaveTextContent("542");
    expect(screen.getByTestId("rain-drier")).toHaveTextContent("393");
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

  it("opens from Your field today, and its Back goes there again", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    serve(() => okJson(stac([scene("S2A_1", "2024-06-15T09:52:00Z", 1)])));
    renderAt("/today?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("timelapse-link"));
    expect(await screen.findByTestId("frame-date")).toHaveTextContent("15 Jun 2024");
    expect(screen.getByTestId("tab-field")).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath).toBe("/today?f=genzano-demo&p=income%2Cwater"));
  });

  it("is no longer linked from the Year screen", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    await screen.findByTestId("year-kinds");
    expect(screen.queryByTestId("timelapse-link")).toBeNull();
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
    const reasons = await screen.findByRole("heading", { name: "Why this option" });
    const numbers = screen.getByRole("heading", { name: "Over three harvests" });
    expect(reasons.compareDocumentPosition(numbers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const evidence = screen.getByRole("heading", { name: "What the data shows" }).closest("section")!;
    // The fixture's hot days come from NASA POWER: hidden until the first Source is tapped.
    expect(within(evidence).queryByText(/NASA POWER/)).toBeNull();
    fireEvent.click(within(evidence).getAllByRole("button", { name: "Source" })[0]);
    expect(within(evidence).getByTestId("source-bubble")).toHaveTextContent("NASA POWER");
  });
});

describe("Why: the finding's figure is listed once", () => {
  it("the evidence list leaves out the repeat of the finding's own figure, and keeps the rest", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const evidence = (await screen.findByRole("heading", { name: "What the data shows" })).closest("section")!;
    // chickpea answers the hot-flowering finding: its hot days used to appear twice in a row
    expect(within(evidence).getAllByText("Hot flowering days")).toHaveLength(1);
    expect(within(evidence).getByText("Bare months after harvest")).toBeInTheDocument();
  });
});

describe("2024 and 2026 compared with a usual season (Year)", () => {
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
    expect(screen.getByTestId("rain-2026-note")).toHaveTextContent("NASA GPM data ended in September 2025");
    expect(screen.queryByTestId("stress-line")).toBeNull();
  });

  it("names the seasons much less green than nearby fields, ending in check locally", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withSeasons([-1.69, -0.65, -0.74, 0.06]))));
    renderAt("/year?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("stress-line")).toHaveTextContent("Much less green than nearby fields in 2023. Check locally");
  });

  it("the printout ends with the season-by-season graphs, before the credits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withSeasons())));
    renderAt("/print?f=genzano-demo&p=income,water");
    const trends = await screen.findByTestId("print-trends");
    // greenness, water used and rain: this test data has no hot-days series, so that graph is left out
    expect(within(trends).getAllByTestId("trend-chart")).toHaveLength(3);
    expect(screen.getByText("How the seasons went")).toBeInTheDocument();
    const credits = screen.getByTestId("credit-lines");
    expect(trends.compareDocumentPosition(credits) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the printout draws the data team's pictures from the field's own data, before the season graphs", async () => {
    const b = withSeasons();
    b.fieldData.by2050 = {
      ssp245: { hotDays: fact(5.4, "days", [4.2, 6.9], "2041-2060") },
      ssp585: { hotDays: fact(6, "days", [4.8, 9.7], "2041-2060") },
    };
    const rain = (season: string, window: string, station: number, satellites: number) =>
      ({ season, window, station: fact(station, "mm", [station, station], season), satellites: fact(satellites, "mm", [satellites, satellites], season) });
    const temperature = (season: string, station: number, era5Land: number) =>
      ({ season, window: "sowing-harvest", station: fact(station, "°C", [station, station], season), era5Land: fact(era5Land, "°C", [era5Land, era5Land], season) });
    b.fieldData.groundCheck = {
      rain: [rain("2022-23", "oct-may", 673.6, 656), rain("2022-23", "sowing-harvest", 673.6, 498), rain("2023-24", "sowing-harvest", 314.6, 308)],
      temperature: [temperature("2022-23", 13.58, 12.4), temperature("2023-24", 15.47, 13)],
    };
    vi.stubGlobal("fetch", vi.fn(async () => okJson(b)));
    renderAt("/print?f=genzano-demo&p=income,water");
    const explain = await screen.findByTestId("print-explain");
    expect(within(explain).getAllByTestId("explain-season")).toHaveLength(4);
    expect(within(explain).getByText("no data")).toBeInTheDocument(); // spring soil water has no 2026 figure: never a zero bar
    const heat = within(explain).getByTestId("explain-heat");
    expect(heat.querySelectorAll('[data-range="1"]')).toHaveLength(2); // how far the climate models disagree, on both 2041-2060 bars
    expect(heat.parentElement).toHaveTextContent("ERA5-Land read 1.2–2.5 °C cooler than the trial's own weather station");
    const check = within(explain).getByTestId("explain-check");
    expect(check.querySelectorAll("[data-bar]")).toHaveLength(4); // two seasons, sowing to harvest only
    expect(explain.compareDocumentPosition(screen.getByTestId("print-trends")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the printout leaves out a picture whose figures are missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(withSeasons())));
    renderAt("/print?f=genzano-demo&p=income,water");
    const explain = await screen.findByTestId("print-explain");
    expect(within(explain).getAllByTestId("explain-season")).toHaveLength(4);
    expect(screen.queryByTestId("explain-heat")).toBeNull(); // no 2041-2060 hot days in this data
    expect(screen.queryByTestId("explain-check")).toBeNull(); // the rain check is for the demo field's station only
  });

  it("without field data there is no card", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    await screen.findByTestId("def-normal");
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
    expect(line).toHaveTextContent("22.9 °C now, and 24.5 °C by 2050");
  });

  it("the Hot flowering finding under What we see on the plan opens the same line", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const seen = await screen.findByTestId("fold-seen");
    fireEvent.click(within(seen).getByTestId("fold-toggle"));
    fireEvent.click(within(seen).getByRole("button", { name: "Hot flowering" }));
    expect(within(seen).getByTestId("hot-def")).toHaveTextContent("30 °C or more");
  });
});

describe("Share your plan", () => {
  it("shows the plan to share, with no list of checks: those are on the field's to-do list", async () => {
    renderAt("/adviser?f=genzano-demo&p=income,water");
    const summary = await screen.findByTestId("share-plan-summary");
    expect(summary).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    expect(summary).toHaveTextContent("Chickpea");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Share your plan");
    expect(screen.getByText("Show it to someone who knows your land before you sow.")).toBeInTheDocument();
    expect(screen.queryByTestId("own-checks")).toBeNull();
    // The link itself is not printed under the buttons.
    expect(screen.queryByText(/https?:\/\//)).toBeNull();
  });

  it("names who can look at the plan for a farmer with no adviser, easiest to reach first", async () => {
    renderAt("/adviser?f=genzano-demo&p=income,water");
    const who = within(await screen.findByTestId("who-can-check")).getAllByTestId("who");
    expect(who).toHaveLength(5);
    expect(who[0]).toHaveTextContent("Cooperative or seed dealer: seed, varieties, buyers");
    expect(who[1]).toHaveTextContent("CAA office");
    expect(who[4]).toHaveTextContent("An agronomist, if you have one");
    expect(screen.getByRole("heading", { name: "No adviser? Ask one of these" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-advice")).toHaveAttribute("aria-current", "page");
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
});

describe("Back buttons", () => {
  it("Questions goes back to Find field keeping the query string", async () => {
    renderAt("/questions?f=genzano-demo&p=income,water");
    // Questions opens on its last question when the priorities are already in order: Back first steps through them.
    fireEvent.click(await screen.findByTestId("question-back"));
    fireEvent.click(screen.getByTestId("question-back"));
    fireEvent.click(await screen.findByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath.startsWith("/?")).toBe(true));
    expect(lastPath).toContain("f=genzano-demo");
    expect(lastPath).toContain("p=income%2Cwater");
  });

  it.each(["/options", "/why/chickpea-durum-durum", "/year", "/adviser", "/today"])("%s has no bottom bar: the tab bar takes its place", async (route) => {
    vi.stubGlobal("localStorage", memoryStorage());
    renderAt(`${route}?f=genzano-demo&p=income,water`);
    expect(await screen.findByTestId("tab-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("bottom-bar")).toBeNull();
  });

  it("Why goes back to the plan keeping the query string", async () => {
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByRole("link", { name: "Back to the plan" }));
    await waitFor(() => expect(lastPath).toBe("/options?f=genzano-demo&p=income%2Cwater"));
  });

  it("Year goes back to the best fit's Why keeping the query string", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    const back = await screen.findByTestId("year-back");
    expect(back).toHaveTextContent("Back to why");
    fireEvent.click(back);
    await waitFor(() => expect(lastPath).toBe("/why/chickpea-durum-durum?f=genzano-demo&p=income%2Cwater"));
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

describe("Options as a decision tree", () => {
  it("shows the one advice and the priorities, then rows to open: nothing else is in reach until asked for", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Plant chickpea next");
    expect(within(screen.getByTestId("plan-actions")).getByTestId("branch-why")).toHaveAttribute("href", expect.stringContaining("/why/chickpea-durum-durum?"));
    const fold = screen.getByTestId("fold-options");
    expect(fold).toHaveAttribute("data-open", "false");
    expect(within(fold).getByTestId("fold-toggle")).toHaveAttribute("aria-expanded", "false");
    expect(within(fold).getByRole("region", { hidden: true })).toHaveAttribute("inert");
    expect(within(fold).getByTestId("fold-toggle")).toHaveTextContent("Other choices (3)");
    // The ruled-out line, the left-out lines and intercropping wait inside the same fold.
    expect(within(fold).getByTestId("option-list")).toBeInTheDocument();
    // The priorities are a line beside "Change my answers"; what we see is a row of its own; the money lives on Why.
    expect(screen.getByTestId("priority-summary")).toHaveTextContent("Your priorities: 1 Income, 2 Water");
    expect(screen.getByTestId("fold-seen")).toHaveAttribute("data-open", "false");
    for (const id of ["fold-priorities", "money-row"]) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.queryByText("Tap to look closer")).toBeNull();
  });

  it("keeps the ruled-out and left-out lines inside the other choices, and intercropping in its own single row", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&l=cereal-machinery&c=faba");
    const fold = await screen.findByTestId("fold-options");
    expect(within(fold).getByTestId("ruled-out")).toBeInTheDocument();
    expect(within(fold).getByTestId("left-out")).toHaveTextContent("Faba bean was left out: you just grew it");
    // Intercropping is one row: the switch and the map together, never also inside the other choices.
    expect(within(fold).queryByTestId("intercrops-toggle")).toBeNull();
    expect(screen.queryByText("Another way to farm")).toBeNull();
  });

  it("a row opens on a tap and closes on the next", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const fold = await screen.findByTestId("fold-options");
    const toggle = within(fold).getByTestId("fold-toggle");
    fireEvent.click(toggle);
    expect(fold).toHaveAttribute("data-open", "true");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(fold).getByRole("region")).not.toHaveAttribute("inert");
    expect(within(fold).getAllByTestId("option-row").length).toBeGreaterThan(0);
    fireEvent.click(toggle);
    expect(fold).toHaveAttribute("data-open", "false");
  });

  it("Why keeps the reasons open and folds the rest", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    expect(await screen.findByRole("heading", { name: "Why this option" })).toBeInTheDocument();
    const toggles = screen.getAllByTestId("fold-toggle");
    expect(toggles.map((toggle) => toggle.textContent)).toEqual(["Over three harvests", "What the data shows", "What we don't know"]);
    for (const toggle of toggles) expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Questions", () => {
  it("asks one question at a time: last crop, then limits, then priorities", async () => {
    renderAt("/questions?f=genzano-demo");
    expect(await screen.findByTestId("question-step")).toHaveTextContent("Question 1 of 3");
    expect(screen.getByTestId("question-1")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("question-2")).toHaveAttribute("inert");
    expect(screen.getByTestId("question-3")).toHaveClass("hidden");
    // The first two questions never hold the farmer back.
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("question-step")).toHaveTextContent("Question 2 of 3");
    expect(screen.getByTestId("question-2")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("question-1")).toHaveAttribute("inert");
    fireEvent.click(screen.getByTestId("question-back"));
    expect(screen.getByTestId("question-step")).toHaveTextContent("Question 1 of 3");
    expect(lastPath.startsWith("/questions")).toBe(true);
  });

  it("asks each question in the farmer's words, with where the satellite's guess comes from under the first", async () => {
    renderAt("/questions?f=genzano-demo");
    const h1 = () => screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent);
    expect(await screen.findByRole("heading", { level: 1, name: "What did you harvest here last year?" })).toBeInTheDocument();
    expect(screen.getByTestId("last-crop-hint")).toHaveTextContent(
      "From space it looked like durum, so we ticked it (EU Crop Map (JRC)). Change it if we got it wrong.",
    );
    // The chosen crop stays light, so its painting is easy to see.
    const durum = within(screen.getByTestId("last-crop")).getByRole("radio", { name: "Durum" });
    expect(durum).toHaveAttribute("aria-checked", "true");
    expect(durum).not.toHaveClass("bg-primary");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(h1()).toContain("Does any of this apply to your farm?");
    expect(screen.getByText("Tap all that do, or none.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(h1()).toContain("What matters most to you?");
  });

  it("a farmer coming back with the priorities in order lands on the last question", async () => {
    renderAt("/questions?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("question-step")).toHaveTextContent("Question 3 of 3");
    expect(screen.getByTestId("question-3")).not.toHaveAttribute("inert");
  });

  it("priorities are tapped in order, each showing its place, and Next needs two", async () => {
    renderAt("/questions?f=genzano-demo");
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const next = screen.getByRole("button", { name: "Next" });
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
  it("shows its headings in order, what the data found, and no benefits or local checks", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const headings = await screen.findAllByRole("heading", { level: 2 });
    const names = headings.map((h) => h.textContent);
    expect(names).toEqual(["Why this option", "If the year turns dry", "Over three harvests", "What the data shows", "What we don't know"]);
    // What the satellite and weather data found, without the farmer's own priorities read back as findings.
    const found = screen.getByTestId("why-path");
    expect(within(found).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(found).not.toHaveTextContent(/Picked/);
    expect(screen.queryByText("Benefits")).toBeNull();
    expect(screen.queryByText("Check locally")).toBeNull();
  });

  it("lists the plain reasons before the dry-year card", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=soil,income");
    const reasons = await screen.findByTestId("why-reasons");
    const items = within(reasons).getAllByTestId("reason");
    expect(items.map((r) => r.getAttribute("data-priority"))).toEqual(["soil", "income"]);
    expect(items[0]).toHaveTextContent("40 kg N/ha");
    expect(items[1]).toHaveTextContent("more than durum on durum");
    expect(reasons.compareDocumentPosition(screen.getByTestId("why-years")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says which rotation fits a usual, a dry and the driest year, and links to the weather", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    const card = await screen.findByTestId("why-years");
    expect(within(card).getByRole("heading")).toHaveTextContent("If the year turns dry");
    expect(screen.getByTestId("why-year-normal")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    expect(screen.getByTestId("why-year-drier")).toBeInTheDocument();
    expect(screen.getByTestId("why-year-much-drier")).toHaveAttribute("data-option-id", "vetch-oat-durum-durum");
    // The best fit differs between the kinds of year here.
    expect(screen.queryByTestId("why-years-holds")).toBeNull();
    const link = screen.getByTestId("why-year-link");
    expect(link).toHaveAttribute("href", "/year?f=genzano-demo&p=income%2Cwater");
    fireEvent.click(link);
    expect(await screen.findByTestId("year-kinds")).toBeInTheDocument();
    expect(screen.getByTestId("tab-advice")).toHaveAttribute("aria-current", "page");
  });

  it("says so in one line when the same rotation fits best in all three", async () => {
    const steady = structuredClone(fixture);
    for (const option of steady.options) Object.assign(option.scores, { drier: option.scores.normal, "much-drier": option.scores.normal });
    vi.stubGlobal("fetch", vi.fn(async () => okJson(steady)));
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("why-years-holds")).toHaveTextContent("Chickpea fits best in all three.");
    expect(screen.getByTestId("why-year-much-drier")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
  });

  it("keeps What we see folded on the plan, with the findings inside", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const seen = await screen.findByTestId("fold-seen");
    expect(seen).toHaveAttribute("data-open", "false");
    expect(within(seen).getByTestId("fold-toggle")).toHaveTextContent("What we see");
    // The frozen fixture has no soil data, so there is no soil fold.
    expect(screen.queryByTestId("fold-soil")).toBeNull();
  });

  it("a term opens its one-line explanation", async () => {
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    const numbers = (await screen.findByRole("heading", { name: "Over three harvests" })).closest("section")!;
    fireEvent.click(within(numbers).getByTestId("fold-toggle"));
    fireEvent.click(within(numbers).getAllByRole("button", { name: "gross margin" })[0]);
    expect(within(numbers).getByRole("note")).toHaveTextContent("Crop sales minus direct costs");
  });
});

describe("the tab bar", () => {
  it.each([
    ["/options", "tab-advice"],
    ["/why/faba-durum-faba", "tab-advice"],
    ["/year", "tab-advice"],
    ["/adviser", "tab-advice"],
    ["/today", "tab-field"],
    ["/plans", "tab-plans"],
  ])("on %s marks %s as the current tab, and only that one", async (route, current) => {
    vi.stubGlobal("localStorage", memoryStorage());
    renderAt(`${route}?f=genzano-demo&p=income,water`);
    const bar = await screen.findByTestId("tab-bar");
    for (const id of ["tab-field", "tab-advice", "tab-plans"]) {
      if (id === current) expect(within(bar).getByTestId(id)).toHaveAttribute("aria-current", "page");
      else expect(within(bar).getByTestId(id)).not.toHaveAttribute("aria-current");
    }
  });

  it("links My field, Advice and My plans keeping the query string", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income&g=it");
    const bar = await screen.findByTestId("tab-bar");
    expect(within(bar).getByTestId("tab-field")).toHaveAttribute("href", "/today?f=genzano-demo&p=soil%2Cincome&g=it");
    expect(within(bar).getByTestId("tab-advice")).toHaveAttribute("href", "/options?f=genzano-demo&p=soil%2Cincome&g=it");
    expect(within(bar).getByTestId("tab-plans")).toHaveAttribute("href", "/plans?f=genzano-demo&p=soil%2Cincome&g=it");
  });

  it("names its tabs", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const bar = await screen.findByTestId("tab-bar");
    expect(bar).toHaveAccessibleName("Main");
    expect(within(bar).getByTestId("tab-field")).toHaveTextContent("My field");
    expect(within(bar).getByTestId("tab-advice")).toHaveTextContent("Advice");
    expect(within(bar).getByTestId("tab-plans")).toHaveTextContent("My plans");
  });

  it("is not there while setting up, nor on the printout", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("question-step");
    expect(screen.queryByTestId("tab-bar")).toBeNull();
    cleanup();
    renderAt("/print?f=genzano-demo&p=income,water");
    await screen.findByTestId("print-years");
    expect(screen.queryByTestId("tab-bar")).toBeNull();
  });
});

describe("the step bar", () => {
  it("shows three steps while setting up, and none once there is a plan", async () => {
    renderAt("/questions?f=genzano-demo");
    const bar = await screen.findByTestId("step-bar");
    expect(bar).toHaveAccessibleName("Step 2 of 3");
    expect(bar).toHaveTextContent("Field");
    expect(bar).toHaveTextContent("Questions");
    expect(bar).toHaveTextContent("Your plan");
    cleanup();
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findByTestId("recommendation");
    expect(screen.queryByTestId("step-bar")).toBeNull();
  });
});

describe("the More menu", () => {
  it("is closed until opened, and closes again", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const more = await screen.findByTestId("more");
    const menu = screen.getByTestId("more-menu");
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(menu).not.toBeVisible();
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(menu).toBeVisible();
    expect(within(menu).getByRole("link", { name: "Data and credits" })).toBeInTheDocument();
    fireEvent.click(more);
    expect(menu).not.toBeVisible();
  });

  it("holds the Prices and support link, keeping the query string", async () => {
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("more"));
    const gear = within(screen.getByTestId("more-menu")).getByTestId("gear");
    expect(gear).toHaveTextContent("Prices and support");
    expect(gear).toHaveAttribute("href", "/settings?f=genzano-demo&p=income%2Cwater");
  });

  it("Bigger text switches the view on the page and in the link", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("more"));
    const big = screen.getByRole("switch", { name: "Bigger text" });
    expect(big).toHaveAttribute("data-testid", "big-text");
    expect(big).toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.dataset.view).toBe("standard");
    fireEvent.click(big);
    await waitFor(() => expect(document.documentElement.dataset.view).toBe("simple"));
    expect(screen.getByTestId("big-text")).toHaveAttribute("aria-checked", "true");
    expect(lastPath).toContain("v=simple");
    fireEvent.click(screen.getByTestId("big-text"));
    await waitFor(() => expect(document.documentElement.dataset.view).toBe("standard"));
  });

  it("closes on a new screen", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("more"));
    expect(screen.getByTestId("more")).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByTestId("tab-plans"));
    await screen.findByTestId("plans-empty");
    expect(screen.getByTestId("more")).toHaveAttribute("aria-expanded", "false");
  });

  it("the app name is always shown beside the language and the menu", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const bar = await screen.findByTestId("top-bar");
    expect(within(bar).getByTestId("app-name")).toBeVisible();
    expect(within(bar).getByRole("radiogroup")).toBeInTheDocument();
    expect(within(bar).getByTestId("more")).toBeInTheDocument();
  });
});

describe("bundle failure", () => {
  it("says so and offers a retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as unknown as Response));
    renderAt("/options?f=genzano-demo&p=income,water");
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the field data.");
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

describe("help on the limits, and the back arrow", () => {
  it("each limit has a small ? that says what it means and what it does", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("question-1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const help = screen.getByTestId("limit-help-cereal-machinery");
    expect(help).toHaveAccessibleName('What "Cereal machinery only" means');
    expect(help).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(help);
    expect(help).toHaveAttribute("aria-expanded", "true");
    const tip = document.getElementById(help.getAttribute("aria-describedby")!)!;
    expect(tip).toHaveTextContent("mower, rake and baler");
    for (const id of ["no-irrigation", "no-buyer", "broomrape"]) expect(screen.getByTestId(`limit-help-${id}`)).toBeInTheDocument();
  });

  it("the back arrow shows on every screen but the map, and goes up a level on a link opened straight on a screen", async () => {
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    fireEvent.click(await screen.findByTestId("top-back"));
    await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
    expect(lastPath).toContain("p=income");
    cleanup();
    renderAt("/?f=genzano-demo");
    await screen.findByTestId("top-bar");
    expect(screen.queryByTestId("top-back")).toBeNull();
  });

  it("My field links to the usual, dry and driest years", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    renderAt("/today?f=genzano-demo&p=income,water");
    const link = await screen.findByTestId("today-year-link");
    expect(link).toHaveTextContent("Usual, dry and driest years");
    expect(link).toHaveAttribute("href", expect.stringContaining("/year?"));
  });
});
