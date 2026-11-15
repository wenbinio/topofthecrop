// The printout's bar charts. Written with AI assistance (Claude, Anthropic).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart, niceStep } from "./BarChart";

describe("BarChart", () => {
  it("numbers the axis in round steps", () => {
    expect(niceStep(9.7)).toBe(2.5); // the hot-days chart: 0, 2.5, 5 … 12.5
    expect(niceStep(677)).toBe(200);
    expect(niceStep(0.75)).toBeCloseTo(0.2);
  });

  it("names a bar with no data instead of drawing it as zero, and draws nothing when every bar is empty", () => {
    const { container, unmount } = render(
      <BarChart title="Soil water in spring" unit="%" digits={1} bars={[
        { key: "usual", label: "Usual", value: 30.1, color: "#7d8682" },
        { key: "2026", label: "2026", value: null, color: "#2470b5" },
      ]} />,
    );
    expect(container.querySelector('[data-bar="2026"][data-nodata="1"]')).not.toBeNull();
    expect(screen.getByText("no data")).toBeInTheDocument();
    expect(screen.getByText("30.1")).toBeInTheDocument();
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Soil water in spring: Usual 30.1; 2026 no data");
    unmount();
    const empty = render(<BarChart title="x" digits={0} bars={[{ key: "a", label: "a", value: null, color: "#7d8682" }]} />);
    expect(empty.container.querySelector("figure")).toBeNull();
  });
});
