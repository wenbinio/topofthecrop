// The printout's season-by-season graphs. Written with AI assistance (Claude, Anthropic).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Series } from "../data/types";
import { TrendChart } from "./TrendChart";

const years = Array.from({ length: 26 }, (_, i) => 2001 + i);
const series = (values: (number | null)[]): Series =>
  ({ values, unit: "mm", scale: "area", confidence: "fair", placeholder: false, label: "data.x",
     source: { dataset: "CHIRPS + NASA GPM + ERA5-Land", resolution: "6 to 11 km", url: "" } }) as Series;

describe("TrendChart", () => {
  it("draws a dot per season with data, the usual band, and the last five seasons in dark ink", () => {
    const values = years.map((y) => (y === 2005 ? null : y <= 2020 ? 500 + (y % 7) * 10 : 420));
    const { container } = render(<TrendChart title="Oct–May rain" years={years} series={series(values)} digits={0} />);
    expect(container.querySelectorAll("circle")).toHaveLength(25); // 2005 has no data: no dot, never a zero
    expect(container.querySelectorAll('circle[data-recent="1"]')).toHaveLength(5);
    expect(screen.getByTestId("trend-band")).toBeInTheDocument();
    expect(screen.getByTestId("trend-now")).toBeInTheDocument();
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/^Oct–May rain, each season from 2001 to 2026\. The middle half of 2001–2020 runs from \d+ to \d+; the last five seasons' middle is 420\.$/);
    expect(screen.getByText("CHIRPS + NASA GPM + ERA5-Land")).toBeInTheDocument();
  });

  it("draws the dots without a band when there are too few seasons to compare, and nothing for one season", () => {
    const short = [2024, 2025, 2026];
    const { container, unmount } = render(<TrendChart title="Rain" years={short} series={series([400, 500, 600])} digits={0} />);
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(screen.queryByTestId("trend-band")).toBeNull();
    unmount();
    const one = render(<TrendChart title="Rain" years={short} series={series([400, null, null])} digits={0} />);
    expect(one.container.querySelector("figure")).toBeNull();
  });
});
