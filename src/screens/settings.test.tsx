import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";

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
    .getAllByLabelText(/^Income per year/)
    .map((el) => el.getAttribute("aria-label") ?? "")[0];
  return label.replace(/^Income per year \(gross margin\): /, "").split(" ")[0];
}

const SETTINGS = "/settings?f=genzano-demo&p=income,water";

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
    expect(screen.getByTestId("adviser-line")).toHaveTextContent("cannot tell whether you qualify");
    expect(screen.getByTestId("placeholder-note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset to the starting figures" })).toBeDisabled();
  });

  it("(b) a durum price of 400 goes into the link, and Options shows 835 marked Yours", async () => {
    renderAt(SETTINGS);
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
    expect(within(screen.getByTestId("money-row")).getByTestId("tag-yours")).toBeInTheDocument();
  });

  it("(c) switching off the rotation eco-scheme takes chickpea from 753 to 643", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findAllByTestId("option-row");
    expect(incomeOf("chickpea-durum-durum")).toBe("753");
    expect(within(screen.getByTestId("money-row")).queryByTestId("tag-yours")).toBeNull();

    fireEvent.click(screen.getByTestId("money-row"));
    const eco = await screen.findByRole("checkbox", { name: "Eco-scheme: rotation with legumes or forage" });
    act(() => {
      fireEvent.click(eco);
    });
    await waitFor(() => expect(linkMoney()).toContain("on.eco-rotation:0"));
    expect(screen.getByRole("textbox", { name: "Eco-scheme: rotation with legumes or forage: amount" })).toBeDisabled();

    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
    await screen.findAllByTestId("option-row");
    expect(incomeOf("chickpea-durum-durum")).toBe("643");
    expect(incomeOf("durum-durum-durum")).toBe("595");
    expect(within(row("durum-durum-durum")).queryByTestId("tag-yours")).toBeNull();
  });

  it("(d) clearing or mistyping an input shows the error and leaves the link alone", async () => {
    renderAt(SETTINGS);
    const durum = await screen.findByRole("textbox", { name: "Durum price" });
    const before = lastPath;
    act(() => {
      fireEvent.change(durum, { target: { value: "" } });
    });
    expect(screen.getByTestId("money-error")).toHaveTextContent("Type a number");
    expect(durum).toHaveAttribute("aria-invalid", "true");
    act(() => {
      fireEvent.change(durum, { target: { value: "4o0" } });
    });
    expect(screen.getByTestId("money-error")).toHaveTextContent("Type a number");
    act(() => {
      fireEvent.change(durum, { target: { value: "99999" } });
    });
    expect(screen.getByTestId("money-error")).toHaveTextContent("From 0 to 5,000");
    expect(lastPath).toBe(before);
    expect(linkMoney()).toBeNull();
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("(e) Reset empties m from the link and is disabled afterwards", async () => {
    renderAt(`${SETTINGS}&m=on.eco-rotation:0;p.durum:350`);
    const reset = await screen.findByRole("button", { name: "Reset to the starting figures" });
    expect(reset).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Durum price" })).toHaveValue("350");
    act(() => {
      fireEvent.click(reset);
    });
    await waitFor(() => expect(linkMoney()).toBeNull());
    expect(screen.getByRole("button", { name: "Reset to the starting figures" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Durum price" })).toHaveValue("320");
    expect(screen.getByRole("checkbox", { name: "Eco-scheme: rotation with legumes or forage" })).toBeChecked();
  });

  it("(f) with no field chosen says so and shows no inputs", async () => {
    renderAt("/settings");
    expect(await screen.findByTestId("settings-no-field")).toHaveTextContent("Choose your field first.");
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("(g) a bundle without economics: Options as before, Settings has nothing to edit", async () => {
    const bare = structuredClone(fixture) as Record<string, unknown>;
    delete bare.economics;
    stubBundleFetch(bare);
    const { unmount } = renderAt("/options?f=genzano-demo&p=income,water");
    const rows = await screen.findAllByTestId("option-row");
    expect(rows).toHaveLength(4);
    for (const option of fixture.options) expect(incomeOf(option.id)).toBe(String(option.facts.income.value));
    expect(screen.queryByTestId("money-row")).toBeNull();
    expect(screen.queryAllByTestId("tag-yours")).toHaveLength(0);
    unmount();

    renderAt(SETTINGS);
    expect(await screen.findByTestId("settings-nothing")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("(h) the gear is on every route and keeps the query string", async () => {
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
      const gear = await screen.findByRole("link", { name: "Prezzi e sostegni" });
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

  it("Print lists the prices and support used, marking the changed ones", async () => {
    renderAt("/print?f=genzano-demo&p=income,water&m=on.eco-rotation:0");
    const block = await screen.findByTestId("print-money");
    expect(block).toHaveTextContent("Durum: 320 €/t");
    expect(block).toHaveTextContent("Eco-scheme: rotation with legumes or forage (EU): off · changed by the farmer");
    expect(block).toHaveTextContent("Basic income support (EU): on, 160 €/ha");
  });

  describe("added payments", () => {
    it("adding New legume aid of 90 for chickpea goes into the link and raises chickpea by 30, marked Yours", async () => {
      renderAt(SETTINGS);
      fireEvent.click(await screen.findByRole("button", { name: "Add a payment" }));
      const form = screen.getByTestId("extra-form");
      const add = within(form).getByRole("button", { name: "Add" });
      act(() => {
        fireEvent.change(within(form).getByRole("textbox", { name: "Name of the payment" }), { target: { value: "New legume aid" } });
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
      expect(item).toHaveTextContent("Paid in the years of: Chickpea");
      expect(within(item).getByTestId("tag-yours")).toBeInTheDocument();
      expect(within(item).getByRole("textbox", { name: "New legume aid: amount" })).toHaveValue("90");
      expect(screen.queryByTestId("extra-form")).toBeNull();
      expect(screen.getByRole("button", { name: "Reset to the starting figures" })).toBeEnabled();
      expect(screen.getByTestId("adviser-line")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("link", { name: "Back" }));
      await waitFor(() => expect(lastPath.startsWith("/options?")).toBe(true));
      await screen.findAllByTestId("option-row");
      expect(incomeOf("chickpea-durum-durum")).toBe("783");
      expect(within(row("chickpea-durum-durum")).getByTestId("tag-yours")).toBeInTheDocument();
      expect(incomeOf("durum-durum-durum")).toBe("595");
      expect(within(row("durum-durum-durum")).queryByTestId("tag-yours")).toBeNull();
    });

    it("unchosen crops fall back to Every year, and an empty name keeps Add disabled", async () => {
      renderAt(SETTINGS);
      fireEvent.click(await screen.findByRole("button", { name: "Add a payment" }));
      const form = screen.getByTestId("extra-form");
      const add = within(form).getByRole("button", { name: "Add" });
      const name = within(form).getByRole("textbox", { name: "Name of the payment" });
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
      expect(within(form).getByTestId("money-error")).toHaveTextContent("From 0 to 2,000");
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
      expect(screen.getByTestId("extra-max")).toHaveTextContent("Three added payments is the most.");
      const reset = screen.getByRole("button", { name: "Reset to the starting figures" });
      expect(reset).toBeEnabled();
      act(() => {
        fireEvent.click(reset);
      });
      await waitFor(() => expect(linkExtras()).toBeNull());
      expect(screen.queryAllByTestId("extra-item")).toHaveLength(0);
      expect(screen.getByRole("button", { name: "Add a payment" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Reset to the starting figures" })).toBeDisabled();
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
      expect(block).toHaveTextContent("New legume aid (added by the farmer): 90 €/ha. Paid in the years of: Chickpea.");
    });
  });
});
