import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import { planKey, readPlan, readPlans, writePlan } from "../state/plan";
import { decodeState } from "../state/url";

vi.mock("../components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => structuredClone(body) } as unknown as Response;
}

function stubBundleFetch(body: unknown = fixture) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith("data/genzano-demo.json")) return okJson(body);
      throw new Error(`unexpected fetch ${String(url)}`);
    }),
  );
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

/** The `m` parameter of the current link, decoded, or null. */
function linkMoney(): string | null {
  return new URLSearchParams(lastPath.split("?")[1] ?? "").get("m");
}

/** The `x` parameter of the current link (added payments), or null. */
function linkExtras(): string | null {
  return new URLSearchParams(lastPath.split("?")[1] ?? "").get("x");
}

const THREE = `x=${encodeURIComponent("A~10~|B~20~durum|C~30~faba")}`;

function row(id: string): HTMLElement {
  return screen.getAllByTestId("option-row").find((r) => r.getAttribute("data-option-id") === id)!;
}

/** The income figure on an option row: the first big number in its top line. */
function incomeOf(id: string): string {
  const label = within(row(id))
    .getAllByLabelText(/^Yearly income/)
    .map((el) => el.getAttribute("aria-label") ?? "")[0];
  return label.replace(/^Yearly income \(gross margin\): /, "").split(" ")[0];
}

/** The Why page's "Over three harvests" fold: the income figure and the money table behind it. */
function whyNumbers(): HTMLElement {
  return screen.getByTestId("money-working").closest("section")!;
}

/** The per-year total in the Why page's money table (the best option's income, now that it has no row). */
function perYearOnWhy(): string {
  const cell = within(screen.getByTestId("money-working")).getByText("Per year").closest("tr")!.lastElementChild!;
  return cell.textContent ?? "";
}

const SETTINGS = "/settings?f=genzano-demo&p=income,water";

const PRICES = /^Crop prices/;
const COSTS = /^Crop costs/;
const SUPPORT = /^Support payments/;
const OWN = /^Your own payments/;
const SECTIONS = [PRICES, COSTS, SUPPORT, OWN];

/** Opens a fold-out section of Settings (once it has loaded), unless it is open already. */
async function openSection(name: RegExp): Promise<HTMLElement> {
  const button = await screen.findByRole("button", { name });
  if (button.getAttribute("aria-expanded") !== "true") fireEvent.click(button);
  return button;
}

/** The summary line in a section's header. */
function summaryOf(name: RegExp): string {
  return within(screen.getByRole("button", { name })).getByTestId("section-summary").textContent ?? "";
}

beforeEach(() => {
  stubBundleFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Settings", () => {
  it("(a) lists four price inputs and every support item with its condition", async () => {
    renderAt(SETTINGS);
    await openSection(PRICES);
    await openSection(SUPPORT);
    for (const crop of ["Durum", "Chickpea", "Faba bean", "Vetch-oat"]) {
      expect(await screen.findByRole("textbox", { name: `${crop} price` })).toBeInTheDocument();
    }
    const items = screen.getAllByTestId("support-item");
    expect(items).toHaveLength(fixture.economics.support.length);
    for (const item of fixture.economics.support) {
      const el = items.find((i) => i.getAttribute("data-support-id") === item.id)!;
      expect(el).toHaveTextContent(item.name.en);
      expect(el).toHaveTextContent(item.condition.en);
      expect(within(el).getByRole("checkbox", { name: item.name.en })).toBeChecked();
    }
    expect(screen.getByTestId("adviser-line")).toHaveTextContent("cannot tell if you qualify");
    expect(screen.getByTestId("placeholder-note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset figures" })).toBeDisabled();
  });

  it("each support row has its own Source button that links to that payment's page", async () => {
    const body = structuredClone(fixture);
    body.economics.support.forEach((item, i) => {
      item.amount.source.url = `https://example.org/support/${i}`;
    });
    stubBundleFetch(body);
    renderAt(SETTINGS);
    await openSection(SUPPORT);
    const items = await screen.findAllByTestId("support-item");
    expect(items).toHaveLength(body.economics.support.length);
    for (const item of body.economics.support) {
      const el = items.find((i) => i.getAttribute("data-support-id") === item.id)!;
      const button = within(el).getByTestId("source-button");
      fireEvent.pointerDown(button);
      fireEvent.click(button);
      const bubble = within(el).getByTestId("source-bubble");
      const link = within(bubble).getByRole("link");
      expect(link).toHaveAttribute("href", item.amount.source.url);
      expect(link).toHaveAttribute("target", "_blank");
    }
    // opening one row's bubble closes the previous one (tap outside)
    expect(screen.getAllByTestId("source-bubble")).toHaveLength(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("source-bubble")).toBeNull();
  });

  it("(b) a durum price of 400 goes into the link, and Options shows 835 marked Yours", async () => {
    renderAt(SETTINGS);
    await openSection(PRICES);
    const durum = await screen.findByRole("textbox", { name: "Durum price" });
    act(() => {
      fireEvent.change(durum, { target: { value: "400" } });
    });
    await waitFor(() => expect(linkMoney()).toContain("p.durum:400"));
    expect(screen.getByText("Start 320")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
    expect(linkMoney()).toContain("p.durum:400");
    await screen.findAllByTestId("option-row");
    expect(incomeOf("durum-durum-durum")).toBe("835");
    expect(within(row("durum-durum-durum")).getByTestId("tag-yours")).toBeInTheDocument();
  });

  it("(c) switching off the rotation eco-scheme takes chickpea from 753 to 643", async () => {
    // Chickpea is the advice, so its income is on its Why page rather than in a row.
    renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    await screen.findByTestId("money-working");
    expect(perYearOnWhy()).toBe("753");
    expect(within(whyNumbers()).queryByTestId("tag-yours")).toBeNull();

    fireEvent.click(screen.getByTestId("money-change"));
    await openSection(SUPPORT);
    const eco = await screen.findByRole("checkbox", { name: "Eco-scheme: rotation with legumes or forage" });
    act(() => {
      fireEvent.click(eco);
    });
    await waitFor(() => expect(linkMoney()).toContain("on.eco-rotation:0"));
    expect(screen.getByRole("textbox", { name: "Eco-scheme: rotation with legumes or forage: amount" })).toBeDisabled();

    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath.startsWith("/why/chickpea-durum-durum?")).toBe(true));
    await screen.findByTestId("money-working");
    expect(perYearOnWhy()).toBe("643");
    expect(within(whyNumbers()).getAllByTestId("tag-yours").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("tab-advice"));
    await screen.findAllByTestId("option-row");
    expect(screen.getByTestId("recommendation")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    expect(incomeOf("durum-durum-durum")).toBe("595");
    expect(within(row("durum-durum-durum")).queryByTestId("tag-yours")).toBeNull();
  });

  it("(d) clearing or mistyping an input shows the error and leaves the link alone", async () => {
    renderAt(SETTINGS);
    await openSection(PRICES);
    const durum = await screen.findByRole("textbox", { name: "Durum price" });
    const before = lastPath;
    act(() => {
      fireEvent.change(durum, { target: { value: "" } });
    });
    expect(screen.getByTestId("money-error")).toHaveTextContent("Enter a number");
    expect(durum).toHaveAttribute("aria-invalid", "true");
    act(() => {
      fireEvent.change(durum, { target: { value: "4o0" } });
    });
    expect(screen.getByTestId("money-error")).toHaveTextContent("Enter a number");
    act(() => {
      fireEvent.change(durum, { target: { value: "99999" } });
    });
    expect(screen.getByTestId("money-error")).toHaveTextContent("0 to 5,000");
    expect(lastPath).toBe(before);
    expect(linkMoney()).toBeNull();
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("(e) Reset empties m from the link and is disabled afterwards", async () => {
    renderAt(`${SETTINGS}&m=on.eco-rotation:0;p.durum:350`);
    const reset = await screen.findByRole("button", { name: "Reset figures" });
    expect(reset).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Durum price" })).toHaveValue("350");
    act(() => {
      fireEvent.click(reset);
    });
    await waitFor(() => expect(linkMoney()).toBeNull());
    expect(screen.getByRole("button", { name: "Reset figures" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Durum price" })).toHaveValue("320");
    expect(screen.getByRole("checkbox", { name: "Eco-scheme: rotation with legumes or forage" })).toBeChecked();
  });

  it("(f) with no field chosen says so and shows no inputs", async () => {
    renderAt("/settings");
    expect(await screen.findByTestId("settings-no-field")).toHaveTextContent("Pick a field first.");
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("(g) a bundle without economics: Options as before, Settings has nothing to edit", async () => {
    const bare = structuredClone(fixture) as Record<string, unknown>;
    delete bare.economics;
    stubBundleFetch(bare);
    const { unmount } = renderAt("/options?f=genzano-demo&p=income,water");
    const rows = await screen.findAllByTestId("option-row");
    expect(rows).toHaveLength(3);
    expect(screen.getByTestId("recommendation")).toHaveAttribute("data-option-id", "chickpea-durum-durum");
    for (const option of fixture.options.filter((o) => o.id !== "chickpea-durum-durum")) {
      expect(incomeOf(option.id)).toBe(String(option.facts.income.value));
    }
    expect(screen.queryAllByTestId("tag-yours")).toHaveLength(0);
    unmount();

    // The advice's Why page has its income figure but no money table to work it out.
    const why = renderAt("/why/chickpea-durum-durum?f=genzano-demo&p=income,water");
    await screen.findByTestId("why-years");
    expect(screen.queryByTestId("money-working")).toBeNull();
    why.unmount();

    renderAt(SETTINGS);
    expect(await screen.findByTestId("settings-nothing")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("(h) the gear is in the More menu on every route and keeps the query string", async () => {
    const routes = [
      "/?g=it",
      "/questions?f=genzano-demo&g=it",
      "/options?f=genzano-demo&p=income,water&g=it",
      "/why/chickpea-durum-durum?f=genzano-demo&p=income,water&g=it",
      "/year?f=genzano-demo&p=income,water&g=it",
      "/adviser?f=genzano-demo&p=income,water&g=it",
      "/print?f=genzano-demo&p=income,water&g=it",
      "/settings?f=genzano-demo&g=it",
    ];
    for (const route of routes) {
      const { unmount } = renderAt(route);
      fireEvent.click(await screen.findByTestId("more"));
      const gear = within(screen.getByTestId("more-menu")).getByRole("link", { name: "Prezzi e aiuti" });
      expect(gear).toHaveAttribute("data-testid", "gear");
      const href = gear.getAttribute("href") ?? "";
      expect(href.startsWith("/settings?"), route).toBe(true);
      expect(href, route).toContain("g=it");
      if (route.includes("f=genzano-demo")) expect(href, route).toContain("f=genzano-demo");
      unmount();
    }
  });

  it("Back returns to the screen the farmer came from, with the new figures", async () => {
    renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
    expect(await screen.findByTestId("money-working")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("money-change"));
    await openSection(PRICES);
    const durum = await screen.findByRole("textbox", { name: "Durum price" });
    act(() => {
      fireEvent.change(durum, { target: { value: "400" } });
    });
    await waitFor(() => expect(linkMoney()).toContain("p.durum:400"));
    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath.startsWith("/why/faba-durum-faba?")).toBe(true));
    expect(linkMoney()).toContain("p.durum:400");
    expect(await screen.findByTestId("money-working")).toBeInTheDocument();
    expect(screen.getAllByTestId("tag-yours").length).toBeGreaterThan(0);
  });

  describe("Save changes", () => {
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
    const kept = (query: string) => ({ query, key: query, bestId: "chickpea-durum-durum", stamp: "s1", savedAt: "2026-11-01", field: "Genzano di Lucania", done: ["check.seed"] });

    async function setDurumPriceAndSave() {
      await openSection(PRICES);
      const durum = await screen.findByRole("textbox", { name: "Durum price" });
      act(() => {
        fireEvent.change(durum, { target: { value: "400" } });
      });
      await waitFor(() => expect(linkMoney()).toContain("p.durum:400"));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    }

    it("returns to the screen the farmer came from, with the new figures", async () => {
      vi.stubGlobal("localStorage", memoryStorage());
      renderAt("/why/faba-durum-faba?f=genzano-demo&p=income,water");
      expect(await screen.findByTestId("money-working")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("money-change"));
      await setDurumPriceAndSave();
      await waitFor(() => expect(lastPath.startsWith("/why/faba-durum-faba?")).toBe(true));
      expect(linkMoney()).toContain("p.durum:400");
      expect(screen.getAllByTestId("tag-yours").length).toBeGreaterThan(0);
      // Nothing was kept on this phone before, so nothing is kept now: the plan starts on "Your field today".
      expect(readPlan()).toBeNull();
    });

    it("puts the new figures in the plan kept on this phone, and keeps its best fit, date and ticks", async () => {
      vi.stubGlobal("localStorage", memoryStorage());
      const before = kept(planKey(decodeState("f=genzano-demo&p=income,water")));
      writePlan(before);
      renderAt(SETTINGS);
      await setDurumPriceAndSave();
      await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
      const plan = readPlan()!;
      expect(new URLSearchParams(plan.query).get("m")).toContain("p.durum:400");
      expect(plan.key).not.toBe(before.key);
      expect(plan).toMatchObject({ bestId: before.bestId, stamp: "s1", savedAt: "2026-11-01", done: ["check.seed"] });
      // One entry in the list of past plans, not the old figures beside the new.
      expect(readPlans().map((p) => p.key)).toEqual([plan.key]);
    });

    it("leaves a plan kept for other answers alone", async () => {
      vi.stubGlobal("localStorage", memoryStorage());
      const other = kept(planKey(decodeState("f=genzano-demo&p=soil,water")));
      writePlan(other);
      renderAt(SETTINGS);
      await setDurumPriceAndSave();
      await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
      expect(readPlan()).toMatchObject({ query: other.query, key: other.key });
    });

    it("is not offered when no field is chosen", async () => {
      renderAt("/settings");
      expect(await screen.findByTestId("settings-no-field")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    });
  });

  it("Print lists the prices and support used, marking the changed ones", async () => {
    renderAt("/print?f=genzano-demo&p=income,water&m=on.eco-rotation:0");
    const block = await screen.findByTestId("print-money");
    expect(block).toHaveTextContent("Durum: 320 €/t");
    expect(block).toHaveTextContent("Eco-scheme: rotation with legumes or forage (EU): off · farmer-edited");
    expect(block).toHaveTextContent("Basic income support (EU): on, 160 €/ha");
  });

  describe("fold-out sections", () => {
    it("all start closed, with their rows out of reach, and open and close on a tap", async () => {
      renderAt(SETTINGS);
      await screen.findByRole("button", { name: PRICES });
      for (const name of SECTIONS) {
        const button = screen.getByRole("button", { name });
        expect(button).toHaveAttribute("aria-expanded", "false");
        const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
        expect(panel).not.toBeNull();
        expect(panel).not.toBeVisible();
      }
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.queryByRole("button", { name: "Add a payment" })).toBeNull();
      // Outside the sections, always there.
      expect(screen.getByRole("button", { name: "Reset figures" })).toBeDisabled();
      expect(screen.getByTestId("adviser-line")).toBeInTheDocument();
      expect(screen.getByTestId("voice-privacy")).toBeInTheDocument();

      const prices = await openSection(PRICES);
      expect(prices).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("textbox", { name: "Durum price" })).toBeVisible();
      await openSection(COSTS);
      expect(screen.getByRole("textbox", { name: "Durum costs" })).toBeVisible();
      expect(screen.getByRole("textbox", { name: "Durum price" })).toBeVisible();
      fireEvent.click(prices);
      expect(prices).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("textbox", { name: "Durum price" })).toBeNull();
    });

    it("summaries say how many crops, payments on and payments added", async () => {
      renderAt(SETTINGS);
      await screen.findByRole("button", { name: PRICES });
      expect(summaryOf(PRICES)).toBe("4 crops");
      expect(summaryOf(COSTS)).toBe("4 crops");
      expect(summaryOf(SUPPORT)).toBe("4 on");
      expect(summaryOf(OWN)).toBe("None");
    });

    it("a section with a changed figure starts open and counts the change", async () => {
      renderAt(`${SETTINGS}&m=c.durum:700;on.eco-rotation:0&x=${encodeURIComponent("A~10~|B~20~durum")}`);
      await screen.findByRole("button", { name: PRICES });
      expect(screen.getByRole("button", { name: PRICES })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByRole("button", { name: COSTS })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: SUPPORT })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: OWN })).toHaveAttribute("aria-expanded", "true");
      expect(summaryOf(PRICES)).toBe("4 crops");
      expect(summaryOf(COSTS)).toBe("4 crops · 1 changed");
      expect(summaryOf(SUPPORT)).toBe("3 on · 1 changed");
      expect(summaryOf(OWN)).toBe("2 added");
      expect(screen.getByRole("textbox", { name: "Durum costs" })).toHaveValue("700");
    });

    it("the summaries are in Italian too", async () => {
      renderAt(`${SETTINGS}&g=it&m=p.durum:350`);
      const prices = await screen.findByRole("button", { name: /^Prezzi/ });
      expect(prices).toHaveAttribute("aria-expanded", "true");
      expect(within(prices).getByTestId("section-summary")).toHaveTextContent("4 colture · 1 cambiato");
    });
  });

  describe("crop costs", () => {
    it("editing a cost writes c.<crop> into the link and shows Yours and the starting figure", async () => {
      renderAt(SETTINGS);
      await openSection(COSTS);
      expect(screen.getByTestId("costs-means")).toHaveTextContent("seed, fertiliser");
      const durum = screen.getByRole("textbox", { name: "Durum costs" });
      expect(durum).toHaveValue("620");
      const row = screen.getAllByTestId("cost-row").find((r) => r.getAttribute("data-crop") === "durum")!;
      expect(within(row).queryByTestId("tag-yours")).toBeNull();
      act(() => {
        fireEvent.change(durum, { target: { value: "700" } });
      });
      await waitFor(() => expect(linkMoney()).toContain("c.durum:700"));
      expect(within(row).getByTestId("tag-yours")).toBeInTheDocument();
      expect(row).toHaveTextContent("Start 620");
      expect(summaryOf(COSTS)).toBe("4 crops · 1 changed");
      expect(screen.getByRole("button", { name: "Reset figures" })).toBeEnabled();
    });

    it("an out-of-range cost shows the error and is not stored", async () => {
      renderAt(SETTINGS);
      await openSection(COSTS);
      const durum = screen.getByRole("textbox", { name: "Durum costs" });
      act(() => {
        fireEvent.change(durum, { target: { value: "6000" } });
      });
      expect(screen.getByTestId("money-error")).toHaveTextContent("0 to 5,000");
      expect(durum).toHaveAttribute("aria-invalid", "true");
      expect(linkMoney()).toBeNull();
    });

    it("Reset clears a changed cost", async () => {
      renderAt(`${SETTINGS}&m=c.durum:700`);
      const reset = await screen.findByRole("button", { name: "Reset figures" });
      expect(reset).toBeEnabled();
      act(() => {
        fireEvent.click(reset);
      });
      await waitFor(() => expect(linkMoney()).toBeNull());
      expect(screen.getByRole("textbox", { name: "Durum costs" })).toHaveValue("620");
      expect(screen.getByRole("button", { name: "Reset figures" })).toBeDisabled();
      expect(summaryOf(COSTS)).toBe("4 crops");
    });

    it("the printout lists a changed cost, and only the changed ones", async () => {
      renderAt("/print?f=genzano-demo&p=income,water&m=c.durum:700");
      const block = await screen.findByTestId("print-money");
      const costs = within(block).getAllByTestId("print-cost");
      expect(costs).toHaveLength(1);
      expect(costs[0]).toHaveTextContent("Durum, costs: 700 €/ha · farmer-edited");
    });
  });

  describe("added payments", () => {
    it("adding New legume aid of 90 for chickpea goes into the link and raises chickpea by 30, marked Yours", async () => {
      renderAt(SETTINGS);
      await openSection(OWN);
      fireEvent.click(await screen.findByRole("button", { name: "Add a payment" }));
      const form = screen.getByTestId("extra-form");
      const add = within(form).getByRole("button", { name: "Add" });
      act(() => {
        fireEvent.change(within(form).getByRole("textbox", { name: "Payment name" }), { target: { value: "New legume aid" } });
        fireEvent.change(within(form).getByRole("textbox", { name: "Amount" }), { target: { value: "90" } });
      });
      expect(within(form).getByRole("button", { name: "Every year" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(within(form).getByRole("button", { name: "Chickpea" }));
      expect(within(form).getByRole("button", { name: "Every year" })).toHaveAttribute("aria-pressed", "false");
      expect(within(form).getByRole("button", { name: "Chickpea" })).toHaveAttribute("aria-pressed", "true");
      act(() => {
        fireEvent.click(add);
      });
      await waitFor(() => expect(linkExtras()).toBe(`${encodeURIComponent("New legume aid")}~90~chickpea`));
      const item = screen.getByTestId("extra-item");
      expect(item).toHaveTextContent("New legume aid");
      expect(item).toHaveTextContent("Paid in Chickpea years");
      expect(within(item).getByTestId("tag-yours")).toBeInTheDocument();
      expect(within(item).getByRole("textbox", { name: "New legume aid: amount" })).toHaveValue("90");
      expect(screen.queryByTestId("extra-form")).toBeNull();
      expect(screen.getByRole("button", { name: "Reset figures" })).toBeEnabled();
      expect(screen.getByTestId("adviser-line")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("link", { name: "Back" }));
      await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
      await screen.findAllByTestId("option-row");
      expect(incomeOf("durum-durum-durum")).toBe("595");
      expect(within(row("durum-durum-durum")).queryByTestId("tag-yours")).toBeNull();
      // Chickpea, the advice, shows its new income on its Why page.
      fireEvent.click(screen.getByTestId("branch-why"));
      await screen.findByTestId("money-working");
      expect(perYearOnWhy()).toBe("783");
      expect(within(whyNumbers()).getAllByTestId("tag-yours").length).toBeGreaterThan(0);
    });

    it("unchosen crops fall back to Every year, and an empty name keeps Add disabled", async () => {
      renderAt(SETTINGS);
      await openSection(OWN);
      fireEvent.click(await screen.findByRole("button", { name: "Add a payment" }));
      const form = screen.getByTestId("extra-form");
      const add = within(form).getByRole("button", { name: "Add" });
      const name = within(form).getByRole("textbox", { name: "Payment name" });
      expect(name).toHaveAttribute("maxLength", "30");
      act(() => {
        fireEvent.change(within(form).getByRole("textbox", { name: "Amount" }), { target: { value: "90" } });
      });
      expect(add).toBeDisabled();
      act(() => {
        fireEvent.change(name, { target: { value: "   " } });
      });
      expect(add).toBeDisabled();
      act(() => {
        fireEvent.change(within(form).getByRole("textbox", { name: "Amount" }), { target: { value: "2001" } });
        fireEvent.change(name, { target: { value: "Aid" } });
      });
      expect(within(form).getByTestId("money-error")).toHaveTextContent("0 to 2,000");
      expect(add).toBeDisabled();
      act(() => {
        fireEvent.change(within(form).getByRole("textbox", { name: "Amount" }), { target: { value: "15" } });
      });
      expect(add).toBeEnabled();
      fireEvent.click(within(form).getByRole("button", { name: "Durum" }));
      fireEvent.click(within(form).getByRole("button", { name: "Durum" }));
      expect(within(form).getByRole("button", { name: "Every year" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByTestId("extra-form")).toBeNull();
      expect(linkExtras()).toBeNull();
    });

    it("Remove takes an added payment out of the link", async () => {
      renderAt(`${SETTINGS}&x=${encodeURIComponent("New legume aid~90~chickpea")}`);
      const remove = await screen.findByRole("button", { name: "Remove New legume aid" });
      act(() => {
        fireEvent.click(remove);
      });
      await waitFor(() => expect(linkExtras()).toBeNull());
      expect(screen.queryByTestId("extra-item")).toBeNull();
    });

    it("Add a payment is disabled after three, and Reset clears them", async () => {
      renderAt(`${SETTINGS}&${THREE}`);
      expect(await screen.findAllByTestId("extra-item")).toHaveLength(3);
      expect(screen.getByRole("button", { name: "Add a payment" })).toBeDisabled();
      expect(screen.getByTestId("extra-max")).toHaveTextContent("You can add up to 3 payments.");
      const reset = screen.getByRole("button", { name: "Reset figures" });
      expect(reset).toBeEnabled();
      act(() => {
        fireEvent.click(reset);
      });
      await waitFor(() => expect(linkExtras()).toBeNull());
      expect(screen.queryAllByTestId("extra-item")).toHaveLength(0);
      expect(screen.getByRole("button", { name: "Add a payment" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Reset figures" })).toBeDisabled();
    });

    it("Why counts an added payment in each year's support, and Print lists it as the farmer's own", async () => {
      const x = `x=${encodeURIComponent("New legume aid~90~chickpea")}`;
      const { unmount } = renderAt(`/why/chickpea-durum-durum?f=genzano-demo&p=income,water&${x}`);
      const working = await screen.findByTestId("money-working");
      const cells = within(working).getAllByRole("row")[1].querySelectorAll("td");
      // basic income 160 + coupled legumes 60 + eco-scheme 110 + the added 90
      expect(cells[3]).toHaveTextContent("420");
      unmount();

      renderAt(`/print?f=genzano-demo&p=income,water&${x}`);
      const block = await screen.findByTestId("print-money");
      expect(block).toHaveTextContent("New legume aid (farmer-added): 90 €/ha. Paid in Chickpea years.");
    });
  });
});
