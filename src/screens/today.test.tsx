// "Your field today": the page a farmer comes back to, and the plan kept on the phone behind it.
// Written with AI assistance (Claude, Anthropic).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import type { SavedPlan } from "../state/plan";
import { PLAN_STORAGE_KEY, dayStamp, monthIndex, planChange, planKey, readPlan, writePlan } from "../state/plan";
import { decodeState } from "../state/url";

vi.mock("../components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

const QUERY = "f=genzano-demo&p=income%2Cwater";
const KEY = planKey(decodeState(QUERY));
const CHICKPEA = "chickpea-durum-durum";
const saved = (over: Partial<SavedPlan> = {}): SavedPlan => ({
  query: QUERY, key: KEY, bestId: CHICKPEA, stamp: "", savedAt: "2026-11-01", field: fixture.field.name, done: [], ...over,
});

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

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes("data/genzano-demo.json")) return { ok: true, status: 200, json: async () => structuredClone(fixture) } as unknown as Response;
    throw new Error(`unexpected fetch ${String(url)}`);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the plan kept on the phone", () => {
  it("is the same plan whatever the language or the text size, and another plan when an answer changes", () => {
    expect(planKey(decodeState(`${QUERY}&g=it&v=simple`))).toBe(KEY);
    expect(planKey(decodeState("f=genzano-demo&p=water%2Cincome"))).not.toBe(KEY);
  });

  it("tells a first visit from no change, new data, and new advice", () => {
    const now = { key: KEY, bestId: CHICKPEA, stamp: "" };
    expect(planChange(null, now)).toBe("first");
    expect(planChange(saved({ key: "something else" }), now)).toBe("first");
    expect(planChange(saved(), now)).toBe("same");
    expect(planChange(saved({ stamp: "0123456789" }), now)).toBe("data");
    expect(planChange(saved({ bestId: "vetch-oat-durum-durum", stamp: "0123456789" }), now)).toBe("advice");
  });

  it("reads back only what is a plan", () => {
    expect(readPlan()).toBeNull();
    window.localStorage.setItem(PLAN_STORAGE_KEY, "not json");
    expect(readPlan()).toBeNull();
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ query: QUERY }));
    expect(readPlan()).toBeNull();
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ ...saved(), savedAt: "yesterday" }));
    expect(readPlan()).toBeNull();
    writePlan(saved({ done: ["check.buyer"] }));
    expect(readPlan()).toEqual(saved({ done: ["check.buyer"] }));
  });

  it("counts the months from October, as the bundle does", () => {
    expect(monthIndex(new Date(2026, 9, 5))).toBe(0);
    expect(monthIndex(new Date(2026, 10, 15))).toBe(1);
    expect(monthIndex(new Date(2027, 8, 30))).toBe(11);
    expect(dayStamp(new Date(2026, 10, 5))).toBe("2026-11-05");
  });
});

describe("Your field today", () => {
  it("on a first visit keeps the plan on the phone and says so", async () => {
    renderAt(`/today?${QUERY}`);
    const message = await screen.findByTestId("plan-change");
    expect(message).toHaveAttribute("data-change", "first");
    expect(message).toHaveTextContent("This plan is now kept on this phone.");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your field today");
    await waitFor(() => expect(readPlan()).toMatchObject({ key: KEY, bestId: CHICKPEA, field: fixture.field.name, savedAt: dayStamp(new Date()) }));
    expect(screen.getByTestId("today-phone")).toHaveTextContent("The app cannot alert you while it is closed");
    // Outside the six steps, like Settings.
    expect(screen.queryByTestId("step-bar")).toBeNull();
  });

  it("lists what to do before sowing as ticks that are remembered", async () => {
    renderAt(`/today?${QUERY}`);
    const todo = await screen.findByTestId("today-todo");
    const boxes = within(todo).getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(screen.getByTestId("todo-count")).toHaveTextContent("0 of 2 done");
    fireEvent.click(within(todo).getByLabelText("Is there a local buyer for pulses or forage?"));
    expect(screen.getByTestId("todo-count")).toHaveTextContent("1 of 2 done");
    expect(readPlan()?.done).toEqual(["check.buyer"]);
    cleanup();
    renderAt(`/today?${QUERY}`);
    expect(await screen.findByLabelText("Is there a local buyer for pulses or forage?")).toBeChecked();
  });

  it("says what is usual on the field this month", async () => {
    renderAt(`/today?${QUERY}`);
    const section = await screen.findByTestId("today-month");
    const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date());
    expect(within(section).getByRole("heading")).toHaveTextContent(`What to watch in ${month}, in a usual year`);
    const usual = fixture.year.months[monthIndex(new Date())];
    expect(within(section).queryAllByTestId("today-risk")).toHaveLength(usual.risks.length);
  });

  it("when nothing has changed since the last visit, says so with the date", async () => {
    writePlan(saved({ done: ["check.seed"] }));
    renderAt(`/today?${QUERY}`);
    const message = await screen.findByTestId("plan-change");
    expect(message).toHaveAttribute("data-change", "same");
    expect(message).toHaveAttribute("role", "status");
    expect(message).toHaveTextContent("Nothing has changed since 1 Nov. Chickpea is still the best fit.");
    expect(screen.queryByTestId("plan-seen")).toBeNull();
    expect(screen.getByTestId("todo-count")).toHaveTextContent("1 of 2 done");
  });

  it("when the data was updated but the advice holds, says so until the farmer has seen it", async () => {
    writePlan(saved({ stamp: "0123456789" }));
    renderAt(`/today?${QUERY}`);
    const message = await screen.findByTestId("plan-change");
    expect(message).toHaveAttribute("data-change", "data");
    expect(message).toHaveTextContent("The data has been updated since 1 Nov. Chickpea is still the best fit.");
    // Not yet acknowledged: what is kept still describes the visit before.
    expect(readPlan()).toMatchObject({ stamp: "0123456789", savedAt: "2026-11-01" });
    fireEvent.click(screen.getByTestId("plan-seen"));
    expect(screen.getByTestId("plan-change")).toHaveAttribute("data-change", "same");
    expect(readPlan()).toMatchObject({ stamp: "", savedAt: dayStamp(new Date()) });
  });

  it("when the best fit is no longer the one the farmer left with, warns, names both and links to why", async () => {
    writePlan(saved({ bestId: "vetch-oat-durum-durum", stamp: "0123456789" }));
    renderAt(`/today?${QUERY}`);
    const message = await screen.findByTestId("plan-change");
    expect(message).toHaveAttribute("data-change", "advice");
    expect(message).toHaveAttribute("role", "alert");
    expect(message).toHaveTextContent("New data has changed the advice since 1 Nov. The best fit is now Chickpea.");
    expect(screen.getByTestId("plan-was")).toHaveTextContent("Before, it was Vetch-oat.");
    expect(within(message).getByRole("link", { name: "See why" })).toHaveAttribute("href", expect.stringContaining(`/why/${CHICKPEA}?`));
    expect(readPlan()?.bestId).toBe("vetch-oat-durum-durum");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(readPlan()).toMatchObject({ bestId: CHICKPEA, savedAt: dayStamp(new Date()) });
    expect(screen.queryByTestId("plan-was")).toBeNull();
  });

  it("a changed answer is the farmer's own change, not new data: it starts a new plan", async () => {
    writePlan(saved());
    renderAt("/today?f=genzano-demo&p=soil%2Cincome");
    expect(await screen.findByTestId("plan-change")).toHaveAttribute("data-change", "first");
  });

  it("forgets the plan when asked, and speaks Italian", async () => {
    renderAt(`/today?${QUERY}&g=it`);
    expect(await screen.findByTestId("plan-change")).toHaveTextContent("Ora questo piano è salvato su questo telefono.");
    await waitFor(() => expect(readPlan()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Cancella questo piano" }));
    expect(readPlan()).toBeNull();
    expect(screen.queryByTestId("plan-forget")).toBeNull();
  });
});

describe("coming back", () => {
  it("the last step leads to the field's day", async () => {
    renderAt(`/adviser?${QUERY}`);
    const link = await screen.findByRole("link", { name: "My field today" });
    expect(link).toHaveAttribute("href", expect.stringContaining("/today?f=genzano-demo"));
  });

  it("the first screen offers the way back when a plan is kept, and can start afresh", async () => {
    writePlan(saved());
    renderAt("/");
    const card = await screen.findByTestId("welcome-back");
    expect(card).toHaveTextContent(`Welcome back: your plan for ${fixture.field.name} is kept on this phone`);
    expect(within(card).getByRole("link", { name: "My field today" })).toHaveAttribute("href", `/today?${QUERY}`);
    fireEvent.click(within(card).getByRole("button", { name: "Pick another field" }));
    expect(screen.queryByTestId("welcome-back")).toBeNull();
    expect(readPlan()).toBeNull();
  });

  it("with no plan kept, the first screen shows no card", async () => {
    renderAt("/");
    await screen.findByTestId("find-field");
    expect(screen.queryByTestId("welcome-back")).toBeNull();
  });
});
