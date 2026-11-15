import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";

// jsdom does not lay out, so these only check that the phone-landscape classes (index.css) are in place.
vi.mock("../components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(fixture) }) as unknown as Response),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("held sideways", () => {
  it("the shell drops the portrait cap and keeps clear of the notch", () => {
    renderAt("/");
    const shell = screen.getByTestId("shell");
    expect(shell).toHaveClass("max-w-[30rem]", "phone-land:max-w-none");
    expect(shell).toHaveClass("phone-land:pl-[env(safe-area-inset-left)]", "phone-land:pr-[env(safe-area-inset-right)]");
  });

  it("puts the steps in the top bar's row", () => {
    renderAt("/");
    const bar = screen.getByTestId("top-bar");
    const steps = screen.getByTestId("step-bar");
    expect(bar).toContainElement(steps);
    expect(bar).toHaveClass("phone-land:flex-nowrap");
    expect(steps).toHaveClass("basis-full", "phone-land:flex-1", "phone-land:order-2");
  });

  it("on Find field, the map goes left and the sheet becomes a panel on the right", () => {
    renderAt("/");
    expect(screen.getByTestId("find-field")).toHaveClass("phone-land:flex", "phone-land:flex-row");
    const area = screen.getByTestId("map-area");
    expect(area).toHaveClass("phone-land:flex-1");
    expect(area).toContainElement(screen.getByTestId("map"));
    // The search box sits on the map, not in the panel.
    expect(area).toContainElement(screen.getByRole("search"));
    const sheet = screen.getByTestId("find-sheet");
    expect(sheet).toHaveClass("phone-land:w-[20rem]", "phone-land:overflow-y-auto");
    expect(area).not.toContainElement(sheet);
  });

  it("/questions is one column: one question at a time", async () => {
    renderAt("/questions?f=genzano-demo&p=income,water");
    const cols = await screen.findByTestId("two-cols");
    expect(cols).not.toHaveClass("phone-land:grid");
    expect(cols.children).toHaveLength(3);
  });

  it.each(["/options", "/year"])("%s uses two columns", async (path) => {
    renderAt(`${path}?f=genzano-demo&p=income,water`);
    const cols = await screen.findByTestId("two-cols");
    expect(cols).toHaveClass("phone-land:grid", "phone-land:grid-cols-2");
    expect(cols.children).toHaveLength(2);
  });
});
