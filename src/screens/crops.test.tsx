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

beforeEach(() => serve(fixture));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("more options", () => {
  it("shows the best four, then a row that opens and closes the rest", async () => {
    serve(shipped);
    renderAt("/options?f=genzano-demo&p=income,soil");
    expect(await screen.findAllByTestId("option-row")).toHaveLength(4);
    const more = screen.getByTestId("more-options");
    expect(more).toHaveTextContent("More options (5)");
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    expect(screen.getAllByTestId("option-row")).toHaveLength(9);
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
    expect(rowIds()).toHaveLength(8);
    expect(rowIds()).not.toContain("vetch-oat-durum-durum");
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
    expect(cropIconsIn(group)).toHaveLength(9);
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
    expect(line).toHaveTextContent("Chickpea left out: just grown");
    expect(cropIconsIn(line)).toEqual(["chickpea"]);
    expect(screen.getByTestId("recommendation")).not.toHaveAttribute("data-option-id", "chickpea-durum-durum");
  });
});

describe("explanations", () => {
  it("the ? beside Your priorities opens one line per priority", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    const help = await screen.findByRole("button", { name: "What priorities mean" });
    expect(help).toHaveAttribute("title", expect.stringContaining("hay cut"));
    expect(screen.queryByTestId("priority-lines")).toBeNull();
    fireEvent.click(help);
    const lines = within(screen.getByTestId("priority-lines")).getAllByRole("listitem");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toHaveTextContent("Earns more per ha a year");
    expect(lines[1]).toHaveTextContent("holds up in dry year");
    expect(lines[2]).toHaveTextContent("Leaves nitrogen for next crop");
    expect(lines[3]).toHaveTextContent("hay cut");
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("title", expect.stringContaining("hay cut"));
  });

  it("the ? on Questions opens the same four lines", async () => {
    renderAt("/questions?f=genzano-demo&g=it");
    fireEvent.click(await screen.findByRole("button", { name: "Cosa vogliono dire" }));
    expect(within(screen.getByTestId("priority-lines")).getAllByRole("listitem")).toHaveLength(4);
  });

  it("the year legend explains green, patchy and bare, and each risk icon", async () => {
    renderAt("/year?f=genzano-demo&p=income,water");
    const covers = await screen.findByTestId("cover-legend");
    const green = within(covers).getByRole("button", { name: "Green" });
    expect(green).toHaveAttribute("title", expect.stringContaining("0.5"));
    fireEvent.click(green);
    expect(within(covers).getByTestId("legend-line")).toHaveTextContent("Crop covers ground (greenness 0.5+). NASA MODIS, typical year 2001–2020.");
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
    expect(cropIconsIn(await screen.findByTestId("year-best"))).toEqual(["chickpea"]);
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

describe("income confidence", () => {
  it("each row labels its confidence as the income figure's, explained on tap", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    const marks = screen.getAllByTestId("income-confidence");
    expect(marks).toHaveLength(4);
    expect(marks[0]).toHaveTextContent("Income figure: low");
    const button = within(marks[0]).getByRole("button");
    expect(button).toHaveAttribute("title", expect.stringContaining("weakest figure"));
    fireEvent.click(button);
    expect(within(marks[0]).getByRole("note")).toHaveTextContent("weakest figure behind the income");
  });

  it("with every figure behind the income good, the row says good", async () => {
    const good = structuredClone(fixture);
    for (const figures of Object.values(good.economics.crops)) {
      for (const fact of [figures.yield, figures.price, figures.costs]) fact.confidence = "good";
    }
    for (const item of good.economics.support) item.amount.confidence = "good";
    serve(good);
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    for (const mark of screen.getAllByTestId("income-confidence")) {
      expect(mark).toHaveAttribute("data-confidence", "good");
      expect(mark).toHaveTextContent("Income figure: good");
    }
  });
});
