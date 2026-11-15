// The "This season so far" block: live rain from NASA POWER, or one quiet line when NASA does not answer.
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LangContext } from "../i18n";
import { SeasonNow, shortDate } from "./SeasonNow";

const DAY = 86400000;
const key = (time: number) => new Date(time).toISOString().slice(0, 10).replaceAll("-", "");

/** Rain for the last eleven seasons up to today: 1 mm a day before, 2 mm a day this season, 9 mm five days ago. */
function answer() {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startYear = today >= Date.UTC(now.getUTCFullYear(), 8, 1) ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const days = Math.round((today - Date.UTC(startYear, 8, 1)) / DAY) + 1;
  const rain: Record<string, number> = {};
  for (let back = 0; back <= 10; back++) {
    const start = Date.UTC(startYear - back, 8, 1);
    for (let i = 0; i < days; i++) rain[key(start + i * DAY)] = back === 0 ? 2 : 1;
  }
  // NASA has not filled in the last two days.
  rain[key(today)] = -999;
  rain[key(today - DAY)] = -999;
  return { rain, days: days - 2, last: today - 2 * DAY };
}

afterEach(() => vi.unstubAllGlobals());

describe("SeasonNow", () => {
  it("shows the rain so far, the usual amount, the verdict and the source", async () => {
    const { rain, days } = answer();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ properties: { parameter: { PRECTOTCORR: rain } } }) })));
    render(<SeasonNow centre={[16.0928, 40.8234]} />);
    expect((await screen.findByTestId("season-rain")).textContent).toBe(`${(days * 2).toLocaleString("en-GB")} mm`);
    expect(screen.getByTestId("season-usual").textContent).toContain(`Usual by now: ${days.toLocaleString("en-GB")} mm`);
    expect(screen.getByTestId("season-standing").textContent).toBe("Wetter than usual");
    expect(screen.getByTestId("season-last").textContent).toContain("none yet this season");
    expect(screen.getByTestId("season-now").textContent).toContain("NASA POWER");
  });

  it("says so, and offers to try again, when NASA does not answer", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SeasonNow centre={[16.0928, 40.8234]} />);
    expect((await screen.findByTestId("season-error")).textContent).toContain("This season's rain data is not available.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByTestId("season-error");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("writes dates in the farmer's language", () => {
    expect(shortDate("2026-11-12", "en")).toBe("12 Nov");
    expect(shortDate("2026-11-12", "it")).toMatch(/^12 nov/);
    render(
      <LangContext.Provider value="it">
        <span>{shortDate("2026-09-01", "it")}</span>
      </LangContext.Provider>,
    );
    expect(screen.getByText(/^1 set/)).toBeInTheDocument();
  });
});
