// The printout's season-by-season graphs. Written with AI assistance (Claude, Anthropic).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Series } from "../data/types";
import { seasonRuns, TrendChart } from "./TrendChart";

const years = Array.from({ length: 26 }, (_, i) => 2001 + i);
const series = (values: (number | null)[]): Series =>
  ({ values, unit: "mm", scale: "area", confidence: "fair", placeholder: false, label: "data.x",
     source: { dataset: "CHIRPS + NASA GPM + ERA5-Land", resolution: "6 to 11 km", url: "" } }) as Series;

describe("TrendChart", () => {
  it("draws a line through the seasons, broken where one has no data, with the usual band and the last five in dark ink", () => {
    const values = years.map((y) => (y === 2005 ? null : y <= 2020 ? 500 + (y % 7) * 10 : 420));
    const { container } = render(<TrendChart title="Oct–May rain" years={years} series={series(values)} digits={0} />);
    expect(screen.getAllByTestId("trend-line")).toHaveLength(2); // 2001–2004 and 2006–2026: never joined across 2005
    expect(container.querySelectorAll("[data-season]")).toHaveLength(25); // 2005 has no data: nothing, never a zero
    expect(container.querySelector('[data-season="2005"]')).toBeNull();
    expect(screen.getAllByTestId("trend-recent")).toHaveLength(1); // 2022–2026 in dark ink
    expect(screen.getByTestId("trend-band")).toBeInTheDocument();
    expect(screen.getByTestId("trend-now")).toBeInTheDocument();
    expect(screen.getByText("420")).toBeInTheDocument(); // the last five seasons' middle, written beside its line
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/^Oct–May rain, each season from 2001 to 2026\. The middle half of 2001–2020 runs from \d+ to \d+; the last five seasons' middle is 420\.$/);
    expect(screen.getByText("CHIRPS + NASA GPM + ERA5-Land")).toBeInTheDocument();
  });

  it("draws the line without a band when there are too few seasons to compare, and nothing for one season", () => {
    const short = [2024, 2025, 2026];
    const { container, unmount } = render(<TrendChart title="Rain" years={short} series={series([400, 500, 600])} digits={0} />);
    expect(screen.getAllByTestId("trend-line")).toHaveLength(1);
    expect(container.querySelectorAll("[data-season]")).toHaveLength(3);
    expect(screen.queryByTestId("trend-band")).toBeNull();
    expect(screen.queryAllByTestId("trend-recent")).toHaveLength(0);
    unmount();
    const one = render(<TrendChart title="Rain" years={short} series={series([400, null, null])} digits={0} />);
    expect(one.container.querySelector("figure")).toBeNull();
  });

  it("shows a season standing alone between gaps as a dot", () => {
    render(<TrendChart title="Rain" years={[2022, 2023, 2024, 2025, 2026]} series={series([400, null, 500, null, 600])} digits={0} />);
    expect(screen.queryAllByTestId("trend-line")).toHaveLength(0);
    expect(screen.getAllByTestId("trend-lone")).toHaveLength(3);
  });

  it("splits seasons into runs at each gap", () => {
    expect(seasonRuns([1, 2, 3, 4, 5], [1, null, 3, 4, null])).toEqual([[{ year: 1, v: 1 }], [{ year: 3, v: 3 }, { year: 4, v: 4 }]]);
    expect(seasonRuns([1, 2], [null, null])).toEqual([]);
  });
});
