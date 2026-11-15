// How an intercrop sits on the field: the split into strips or halves, and the map that draws it.
// Written with AI assistance (Claude, Anthropic).
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import shipped from "../../public/data/genzano-demo.json";
import type { FieldBundle, Option } from "../data/types";
import { STRIP_METRES, StripMap, layoutPieces, moistFirst, pairFit } from "./StripMap";

type Pt = [number, number];

afterEach(cleanup);

/** Shoelace area of a polygon in metres. */
function area(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

// A rectangle near the demo field: 0.004° of longitude (about 337 m) by 0.001° of latitude (about 111 m).
const LON0 = 16.09;
const LAT0 = 40.82;
const DLON = 0.004;
const DLAT = 0.001;
const RECT: Pt[] = [
  [LON0, LAT0],
  [LON0 + DLON, LAT0],
  [LON0 + DLON, LAT0 + DLAT],
  [LON0, LAT0 + DLAT],
];
const LONG_M = DLON * Math.cos((LAT0 * Math.PI) / 180) * 111_320;
const WIDE_M = DLAT * 110_540;
const FIELD_M2 = LONG_M * WIDE_M;

const within1pc = (value: number, target: number) => expect(Math.abs(value - target) / target).toBeLessThan(0.01);

describe("layoutPieces", () => {
  it("is 24 m a strip, one sprayer pass", () => {
    expect(STRIP_METRES).toBe(24);
  });

  it("halves: two pieces of equal area, one for each crop", () => {
    const pieces = layoutPieces(RECT, "halves");
    expect(pieces.map((p) => p.crop)).toEqual([0, 1]);
    const [a, b] = pieces.map((p) => area(p.poly));
    within1pc(a, b);
    within1pc(a + b, FIELD_M2);
  });

  it("strips: alternating crops along the longest side, covering the whole field", () => {
    const pieces = layoutPieces(RECT, "strips");
    // The strips run along the long side, so their number is the short side over the strip width.
    expect(pieces.length).toBe(Math.ceil(WIDE_M / STRIP_METRES));
    pieces.forEach((piece, i) => expect(piece.crop).toBe(i % 2));
    within1pc(pieces.reduce((sum, p) => sum + area(p.poly), 0), FIELD_M2);
    // Every strip but the last is a full strip wide: its area is the long side times 24 m.
    for (const piece of pieces.slice(0, -1)) within1pc(area(piece.poly), LONG_M * STRIP_METRES);
  });

  it("gives the same split for a closed ring (first point repeated) as for an open one", () => {
    const closed = [...RECT, RECT[0]];
    expect(layoutPieces(closed, "strips")).toHaveLength(layoutPieces(RECT, "strips").length);
    within1pc(layoutPieces(closed, "halves").reduce((sum, p) => sum + area(p.poly), 0), FIELD_M2);
  });

  it("splits a field turned on its side the same way", () => {
    // The same rectangle, long side running north-south.
    const tall: Pt[] = [
      [LON0, LAT0],
      [LON0 + DLAT, LAT0],
      [LON0 + DLAT, LAT0 + DLON],
      [LON0, LAT0 + DLON],
    ];
    const across = DLAT * Math.cos((LAT0 * Math.PI) / 180) * 111_320;
    expect(layoutPieces(tall, "strips").length).toBe(Math.ceil(across / STRIP_METRES));
  });
});

describe("StripMap", () => {
  const option = shipped.options.find((o) => o.id === "strips-chickpea-durum") as unknown as Option;

  const legend = () => screen.getAllByTestId("strip-legend").map((li) => li.getAttribute("data-crop"));

  it("draws the strips with a legend for both crops, and swapping the year swaps them", () => {
    render(<StripMap option={option} bundle={shipped as unknown as FieldBundle} />);
    const map = screen.getByTestId("strip-map");
    expect(map).toHaveAttribute("data-layout", "strips");
    expect(map).toHaveAttribute("data-year", "0");
    expect(legend()).toEqual(["chickpea", "durum"]);
    expect(screen.getAllByTestId("strip-legend")[0]).toHaveTextContent("Chickpea");
    expect(screen.getAllByTestId("strip-legend")[1]).toHaveTextContent("Durum");
    expect(within(map).getByRole("img")).toHaveAccessibleName("Your field split between Chickpea and Durum");

    const years = within(map).getByRole("radiogroup", { name: "Harvest year" });
    const [first, second] = within(years).getAllByRole("radio");
    expect(first).toHaveTextContent(String(option.firstHarvestYear));
    expect(first).toHaveAttribute("aria-checked", "true");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-checked", "true");
    expect(map).toHaveAttribute("data-year", "1");
    expect(legend()).toEqual(["durum", "chickpea"]);
    fireEvent.click(first);
    expect(legend()).toEqual(["chickpea", "durum"]);
  });

  it("Two halves cuts the field once", () => {
    render(<StripMap option={option} bundle={shipped as unknown as FieldBundle} />);
    const map = screen.getByTestId("strip-map");
    const strips = map.querySelectorAll("svg polygon").length;
    fireEvent.click(screen.getByTestId("layout-halves"));
    expect(map).toHaveAttribute("data-layout", "halves");
    expect(screen.getByTestId("layout-halves")).toHaveAttribute("aria-checked", "true");
    // Two halves plus the outline drawn over them.
    expect(map.querySelectorAll("svg polygon")).toHaveLength(3);
    expect(strips).toBeGreaterThan(3);
    expect(legend()).toEqual(["chickpea", "durum"]);
  });

  it("draws nothing for a rotation that is not an intercrop", () => {
    const plain = shipped.options.find((o) => o.id === "chickpea-durum-durum") as unknown as Option;
    const { container } = render(<StripMap option={plain} bundle={shipped as unknown as FieldBundle} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("where each crop goes, and why this pair", () => {
  it("puts chickpea on the drier side and durum on the moister; faba bean takes the moister side", () => {
    expect(moistFirst(["chickpea", "durum"])).toEqual(["chickpea", "durum"]);
    expect(moistFirst(["durum", "chickpea"])).toEqual(["chickpea", "durum"]);
    expect(moistFirst(["faba", "durum"])).toEqual(["durum", "faba"]);
  });

  it("explains the pair from the field's own heat and rain", () => {
    const lines = pairFit(shipped as unknown as FieldBundle, ["chickpea", "durum"]);
    const keys = lines.map((l) => l.key);
    expect(keys).toContain("strips.fit.heat.chickpea");
    expect(keys.some((k) => k.startsWith("strips.fit.rain."))).toBe(true);
    const heat = lines.find((l) => l.key === "strips.fit.heat.chickpea")!;
    expect(typeof heat.vars.n).toBe("number");
    expect(typeof heat.vars.dry).toBe("number");
  });
});
