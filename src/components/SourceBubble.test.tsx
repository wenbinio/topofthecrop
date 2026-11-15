// The source bubble: a figure's dataset, date and confidence open on a tap and close on a tap anywhere else.
// Written with AI assistance (Claude, Anthropic).
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Fact } from "../data/types";
import { FactButton, SourceButton } from "./FactParts";

const fact: Fact = {
  value: 4, unit: "days", range: [0, 8], scale: "area", confidence: "fair", placeholder: false, asOf: "2001-2020",
  label: "evidence.hotDays", source: { dataset: "ERA5-Land", resolution: "about 11 km", url: "https://example.org/era5" },
};

describe("FactButton", () => {
  it("shows the figure and field-or-area, and keeps the dataset for the bubble", () => {
    render(<FactButton fact={fact} label="Hot days" />);
    expect(screen.getByRole("button", { name: /Hot days: 4/ })).toHaveTextContent("Area");
    expect(screen.queryByText(/ERA5-Land/)).toBeNull();
  });

  it("opens the bubble on a tap, and closes it on a tap outside or on Escape", () => {
    render(
      <div>
        <FactButton fact={fact} label="Hot days" />
        <p>elsewhere</p>
      </div>,
    );
    const button = screen.getByRole("button", { name: /Hot days: 4/ });
    fireEvent.click(button);
    const bubble = screen.getByTestId("source-bubble");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(bubble).toHaveTextContent("ERA5-Land · about 11 km");
    expect(bubble).toHaveTextContent("range 0–8");
    expect(bubble).toHaveTextContent("as of 2001-2020");
    expect(bubble).toHaveTextContent("Fair");
    expect(screen.getByRole("link", { name: "ERA5-Land · about 11 km" })).toHaveAttribute("href", "https://example.org/era5");
    // A tap inside the bubble (on its link, say) leaves it open.
    fireEvent.pointerDown(bubble);
    expect(screen.getByTestId("source-bubble")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("elsewhere"));
    expect(screen.queryByTestId("source-bubble")).toBeNull();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("source-bubble")).toBeNull();
  });
});

describe("SourceButton", () => {
  it("opens and closes the same bubble from a small Source button", () => {
    render(<SourceButton fact={fact} />);
    fireEvent.click(screen.getByRole("button", { name: "Source" }));
    expect(screen.getByTestId("source-bubble")).toHaveTextContent("ERA5-Land");
    fireEvent.click(screen.getByRole("button", { name: "Source" }));
    expect(screen.queryByTestId("source-bubble")).toBeNull();
  });
});
