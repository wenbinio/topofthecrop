// More crops and options, the last crop, the explanations on tap, crop icons beside crop names, income confidence.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import shipped from "../../public/data/genzano-demo.json";
import { AppRoutes } from "../App";

vi.mock("../components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => structuredClone(body) } as unknown as Response;
}

function serve(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => okJson(body)));
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

const param = (name: string) => new URLSearchParams(lastPath.split("?")[1] ?? "").get(name);
const rowIds = () => screen.getAllByTestId("option-row").map((r) => r.getAttribute("data-option-id"));

/** The crop an icon component stands for, from the element that wraps icon and name. */
function cropIconsIn(el: HTMLElement): string[] {
  return within(el)
    .queryAllByTestId("crop-icon")
    .map((icon) => icon.parentElement?.getAttribute("data-crop") ?? "");
}

/** The strip maps for the plan itself: not the one in the "where would an intercrop go" fold. */
const planStripMaps = () => screen.queryAllByTestId("strip-map").filter((el) => !el.closest("[data-testid=fold-intercrop]"));

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

beforeEach(() => serve(fixture));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("more options", () => {
  it("shows the next four after the advice, then a row that opens and closes the rest", async () => {
    serve(shipped);
    renderAt("/options?f=genzano-demo&p=income,soil");
    // Nine options: the best is the advice above, so the list holds the other eight, four at first.
    expect(await screen.findAllByTestId("option-row")).toHaveLength(4);
    expect(within(screen.getByTestId("fold-options")).getByTestId("fold-toggle")).toHaveTextContent("Other choices (8)");
    const bestId = screen.getByTestId("recommendation").getAttribute("data-option-id");
    const more = screen.getByTestId("more-options");
    expect(more).toHaveTextContent("More options (4)");
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    expect(screen.getAllByTestId("option-row")).toHaveLength(8);
    expect(rowIds()).not.toContain(bestId);
    expect(screen.getByTestId("more-options")).toHaveTextContent("Fewer options");
    fireEvent.click(screen.getByTestId("more-options"));
    expect(screen.getAllByTestId("option-row")).toHaveLength(4);
  });

  it("has no such row with four options", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    expect(screen.queryByTestId("more-options")).toBeNull();
  });

  it("the headline and ruled-out line still use the full ranking", async () => {
    serve(shipped);
    renderAt("/options?f=genzano-demo&p=forage,water&l=cereal-machinery");
    await screen.findAllByTestId("option-row");
    expect(screen.getByTestId("ruled-out")).toHaveTextContent("1 ruled out: Cereal machinery only");
    fireEvent.click(screen.getByTestId("more-options"));
    // Nine options, one ruled out, one the advice: seven others.
    expect(rowIds()).toHaveLength(7);
    expect(rowIds()).not.toContain("vetch-oat-durum-durum");
    expect(screen.getByTestId("recommendation")).not.toHaveAttribute("data-option-id", "vetch-oat-durum-durum");
    expect(within(screen.getByTestId("fold-options")).getByTestId("fold-toggle")).toHaveTextContent("Other choices (7)");
  });
});

describe("last crop", () => {
  it("offers every crop in the bundle and Other", async () => {
    serve(shipped);
    renderAt("/questions?f=genzano-demo");
    const group = await screen.findByTestId("last-crop");
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(radios.at(-1)).toHaveTextContent("Other…");
    expect(within(group).getByRole("radio", { name: "Coriander" })).toBeInTheDocument();
    // The last-crop question shows each crop's botanical plate above its name.
    expect(within(group).getAllByTestId("crop-plate").map((p) => p.getAttribute("data-crop"))).toHaveLength(9);
  });

  it("Other opens a name box; the name goes into the link and onto the printout", async () => {
    renderAt("/questions?f=genzano-demo&p=income,soil");
    fireEvent.click(await screen.findByRole("radio", { name: "Other…" }));
    await waitFor(() => expect(param("c")).toBe("other"));
    const box = screen.getByRole("textbox", { name: "Crop name" });
    expect(box).toHaveAttribute("maxLength", "30");
    act(() => {
      fireEvent.change(box, { target: { value: "White lupin " } });
    });
    await waitFor(() => expect(param("cn")).toBe("White lupin"));
    const link = lastPath.split("?")[1];
    cleanup();
    renderAt(`/print?${link}`);
    expect(await screen.findByTestId("print-last-crop")).toHaveTextContent("White lupin");
  });

  it("choosing a crop again drops the typed name from the link", async () => {
    renderAt("/questions?f=genzano-demo&c=other&cn=Sulla");
    expect(await screen.findByRole("textbox", { name: "Crop name" })).toHaveValue("Sulla");
    fireEvent.click(screen.getByRole("radio", { name: "Faba bean" }));
    await waitFor(() => expect(param("c")).toBe("faba"));
    expect(param("cn")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Crop name" })).toBeNull();
  });

  it("a legume just grown is left out of Options, with one line saying why", async () => {
    renderAt("/options?f=genzano-demo&p=income,water&c=chickpea");
    await screen.findAllByTestId("option-row");
    expect(rowIds()).not.toContain("chickpea-durum-durum");
    const line = screen.getByTestId("left-out");
    expect(line).toHaveTextContent("Chickpea was left out: you just grew it");
    expect(cropIconsIn(line)).toEqual(["chickpea"]);
    expect(screen.getByTestId("recommendation")).not.toHaveAttribute("data-option-id", "chickpea-durum-durum");
  });
});

describe("explanations", () => {
  it("the ? beside the priorities on Questions opens one line per priority", async () => {
    // With the priorities in order, Questions opens on the priorities question.
    renderAt("/questions?f=genzano-demo&p=income,water");
    const help = await screen.findByRole("button", { name: "What the priorities mean" });
    expect(help).toHaveAttribute("title", expect.stringContaining("hay cut"));
    expect(screen.queryByTestId("priority-lines")).toBeNull();
    fireEvent.click(help);
    const lines = within(screen.getByTestId("priority-lines")).getAllByRole("listitem");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toHaveTextContent("Earns more per hectare a year");
    expect(lines[1]).toHaveTextContent("holds up in a dry year");
    expect(lines[2]).toHaveTextContent("Leaves nitrogen for the next crop");
    expect(lines[3]).toHaveTextContent("hay cut");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("title", expect.stringContaining("hay cut"));
  });

  it("the ? on Questions opens the same four lines", async () => {
    renderAt("/questions?f=genzano-demo&g=it");
    fireEvent.click(await screen.findByRole("button", { name: "Cosa vogliono dire le priorità" }));
    expect(within(screen.getByTestId("priority-lines")).getAllByRole("listitem")).toHaveLength(4);
  });

  it("the year legend explains green, patchy and bare, and each risk icon", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    const covers = await screen.findByTestId("cover-legend");
    const green = within(covers).getByRole("button", { name: "Green" });
    expect(green).toHaveAttribute("title", expect.stringContaining("0.5"));
    fireEvent.click(green);
    expect(within(covers).getByTestId("legend-line")).toHaveTextContent("The crop covers the ground (greenness 0.5 or more). NASA MODIS satellite, typical year 2001–2020.");
    fireEvent.click(within(covers).getByRole("button", { name: "Bare" }));
    expect(within(covers).getByTestId("legend-line")).toHaveTextContent("under 0.3");
    fireEvent.click(within(covers).getByRole("button", { name: "Bare" }));
    expect(within(covers).queryByTestId("legend-line")).toBeNull();
    const risks = screen.getByTestId("risk-legend");
    const first = within(risks).getAllByRole("button")[0];
    fireEvent.click(first);
    expect(within(risks).getByTestId("legend-line").textContent).not.toBe("");
  });
});

describe("crop icons beside crop names", () => {
  it("in the headline, the option rows, the Year best fit and Settings", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income");
    const headline = await screen.findByTestId("rec-headline");
    expect(headline).toHaveTextContent("Plant faba bean next");
    expect(cropIconsIn(headline)).toEqual(["faba"]);
    const row = screen.getAllByTestId("option-row").find((r) => r.getAttribute("data-option-id") === "chickpea-durum-durum")!;
    expect(cropIconsIn(row)).toEqual(["chickpea"]);
    cleanup();

    renderAt("/year?f=genzano-demo&p=income,water");
    expect(cropIconsIn(await screen.findByTestId("year-best-normal"))).toEqual(["chickpea"]);
    cleanup();

    renderAt("/settings?f=genzano-demo&p=income,water");
    const rows = await screen.findAllByTestId("price-row");
    for (const r of rows) expect(cropIconsIn(r)).toEqual([r.getAttribute("data-crop")]);
    fireEvent.click(screen.getByRole("button", { name: /^Your own payments/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add a payment" }));
    const toggle = within(screen.getByTestId("extra-form")).getByRole("button", { name: "Faba bean" });
    expect(cropIconsIn(toggle)).toEqual(["faba"]);
  });

  it("the icon is hidden from screen readers so the name is read once", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income");
    const headline = await screen.findByTestId("rec-headline");
    const icon = within(headline).getByTestId("crop-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon.querySelector("title")).toBeNull();
  });
});

/** The fixture with every figure behind the income good, except faba bean's own when `fabaLow`. */
function allGood(fabaLow: boolean) {
  const good = structuredClone(fixture);
  for (const [crop, figures] of Object.entries(good.economics.crops)) {
    const level = fabaLow && crop === "faba" ? "low" : "good";
    for (const fact of [figures.yield, figures.price, figures.costs]) fact.confidence = level;
  }
  for (const item of good.economics.support) item.amount.confidence = "good";
  return good;
}

describe("income confidence", () => {
  it("when the other choices are all as sure, one line says so and the rows do not repeat it", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    expect(screen.getByTestId("others-sure")).toHaveTextContent("How sure we are about income: low, for all of these.");
    expect(screen.queryAllByTestId("income-confidence")).toHaveLength(0);
    expect(screen.getByTestId("how-sure")).toHaveAttribute("data-confidence", "low");
    expect(screen.getByTestId("how-sure")).toHaveTextContent("How sure we are: low.");
  });

  it("when they differ, each row labels its confidence as the income figure's, explained on tap", async () => {
    serve(allGood(true));
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    expect(screen.queryByTestId("others-sure")).toBeNull();
    expect(screen.getAllByTestId("income-confidence")).toHaveLength(3);
    const row = (id: string) => screen.getAllByTestId("option-row").find((r) => r.getAttribute("data-option-id") === id)!;
    const mark = within(row("faba-durum-faba")).getByTestId("income-confidence");
    expect(mark).toHaveTextContent("Confidence in income: low");
    expect(within(row("durum-durum-durum")).getByTestId("income-confidence")).toHaveTextContent("Confidence in income: good");
    const button = within(mark).getByRole("button");
    expect(button).toHaveAttribute("title", expect.stringContaining("weakest figure"));
    fireEvent.click(button);
    expect(within(mark).getByRole("note")).toHaveTextContent("weakest figure behind the income");
  });

  it("with every figure behind the income good, the plan and the other choices say good", async () => {
    serve(allGood(false));
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    expect(screen.getByTestId("how-sure")).toHaveAttribute("data-confidence", "good");
    expect(screen.getByTestId("how-sure")).toHaveTextContent("How sure we are: good.");
    expect(screen.getByTestId("others-sure")).toHaveTextContent("How sure we are about income: good, for all of these.");
  });
});

describe("strip intercrops", () => {
  it("stay out of the list until asked for, then rank with the rest and can be the advice", async () => {
    serve(shipped);
    renderAt("/options?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("rec-headline")).toHaveTextContent("Plant chickpea next");
    const toggle = screen.getByTestId("intercrops-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveTextContent("Intercropping");
    expect(toggle).toHaveTextContent("Counted as if each were grown alone");
    fireEvent.click(screen.getByTestId("more-options"));
    expect(rowIds().filter((id) => id?.startsWith("strips-"))).toEqual([]);

    expect(planStripMaps()).toHaveLength(0);

    fireEvent.click(toggle);
    await waitFor(() => expect(param("i")).toBe("1"));
    expect(screen.getByTestId("intercrops-toggle")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("intercrops-toggle")).toHaveTextContent("Intercropping");
    // The chickpea strips are now the advice, drawn on the field, so only the faba bean strips are other choices.
    expect(screen.getByTestId("recommendation")).toHaveAttribute("data-option-id", "strips-chickpea-durum");
    expect(screen.getByTestId("rec-headline")).toHaveTextContent("Sow chickpea and durum in strips next");
    expect(planStripMaps()).toHaveLength(1);
    expect(rowIds().filter((id) => id?.startsWith("strips-"))).toEqual(["strips-faba-durum"]);
    const row = screen.getAllByTestId("option-row").find((r) => r.getAttribute("data-option-id") === "strips-faba-durum")!;
    expect(within(row).getByTestId("strips-name")).toHaveTextContent("Faba bean and durum in strips");
    expect(within(row).getAllByTestId("strip-year")).toHaveLength(3);

    fireEvent.click(screen.getByTestId("intercrops-toggle"));
    await waitFor(() => expect(param("i")).toBeNull());
    expect(screen.getByTestId("rec-headline")).toHaveTextContent("Plant chickpea next");
  });

  it("the Why screen shows both crops each year and says how the figures were made", async () => {
    serve(shipped);
    renderAt("/why/strips-chickpea-durum?f=genzano-demo&p=income,water&i=1");
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Chickpea and durum in strips");
    expect(screen.getAllByTestId("money-beside")).toHaveLength(3);
    expect(screen.getByTestId("money-strips")).toHaveTextContent("each amount is the average of the two");
    expect(screen.getByTestId("money-strips")).toHaveTextContent("No gain or loss from growing them side by side is counted");
    expect(screen.getByText("Any gain or loss from growing the two crops side by side is not counted")).toBeInTheDocument();
    expect(screen.getByTestId("strip-map")).toBeInTheDocument();
  });

  it("the strips' own checks are on the field's to-do list", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    serve(shipped);
    renderAt("/today?f=genzano-demo&p=income,water&i=1");
    const todo = await screen.findByTestId("today-todo");
    expect(within(todo).getByText("Which strip width suits your drill and the combine header?")).toBeInTheDocument();
  });

  it("is left out after the same legume, with the line saying why", async () => {
    serve(shipped);
    renderAt("/options?f=genzano-demo&p=income,water&i=1&c=chickpea");
    await screen.findByTestId("rec-headline");
    fireEvent.click(screen.getByTestId("more-options"));
    expect(rowIds()).not.toContain("strips-chickpea-durum");
    expect(rowIds()).toContain("strips-faba-durum");
    expect(screen.getByTestId("left-out")).toHaveTextContent("Chickpea was left out: you just grew it");
  });
});
