// The line naming NASA POWER rain months left out as impossible. Written with AI assistance (Claude, Anthropic).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LangContext } from "../i18n";
import { LeftOutNote, monthList } from "./LeftOutNote";

describe("LeftOutNote", () => {
  it("names each month left out, in the farmer's language", () => {
    expect(monthList(["202510"], "en")).toBe("October 2025");
    expect(monthList(["202510", "202602", "202603"], "en")).toBe("October 2025, February 2026 and March 2026");
    expect(monthList(["202510"], "it")).toBe("ottobre 2025");
  });

  it("says the rain was not counted and why", () => {
    render(<LeftOutNote months={["202510"]} />);
    expect(screen.getByTestId("rain-left-out").textContent).toBe(
      "Not counted: NASA POWER rain for October 2025, over three times other rain records at the demo field.",
    );
  });

  it("shows nothing when no month was left out", () => {
    render(
      <LangContext.Provider value="it">
        <LeftOutNote months={[]} />
        <LeftOutNote months={undefined} />
      </LangContext.Provider>,
    );
    expect(screen.queryByTestId("rain-left-out")).toBeNull();
  });
});
