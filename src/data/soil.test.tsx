// "Your soil": naming the ground from the soil figures the bundle carries. Written with AI assistance (Claude, Anthropic).
import { readFileSync } from "node:fs";
import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { SoilCard } from "../components/SoilCard";
import { LangContext } from "../i18n";
import { WEIGHT_OF, phBand, soilSummary, textureClass } from "./soil";
import { decodeState, encodeState } from "../state/url";
import { validateBundle } from "./validate";

/** The soil card and the map read the plan from the link, so they render inside a router. */
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });

const demo = validateBundle(JSON.parse(readFileSync("public/data/genzano-demo.json", "utf8")));

describe("the USDA texture triangle", () => {
  it.each([
    [90, 5, 5, "sand"],
    [85, 10, 5, "loamy-sand"],
    [70, 15, 15, "sandy-loam"],
    [40, 40, 20, "loam"],
    [20, 65, 15, "silt-loam"],
    [5, 88, 7, "silt"],
    [60, 10, 30, "sandy-clay-loam"],
    [22, 40, 38, "clay-loam"],
    [10, 60, 30, "silty-clay-loam"],
    [50, 10, 40, "sandy-clay"],
    [5, 50, 45, "silty-clay"],
    [20, 20, 60, "clay"],
  ] as const)("%i%% sand, %i%% silt, %i%% clay is %s", (sand, silt, clay, texture) => {
    expect(textureClass(sand, silt, clay)).toBe(texture);
  });

  it("every class is heavy, medium or light", () => {
    expect(WEIGHT_OF["clay-loam"]).toBe("heavy");
    expect(WEIGHT_OF.loam).toBe("medium");
    expect(WEIGHT_OF["sandy-loam"]).toBe("light");
    expect(new Set(Object.values(WEIGHT_OF))).toEqual(new Set(["heavy", "medium", "light"]));
  });
});

describe("pH bands", () => {
  it("under 6.5 is acid, over 7.3 alkaline, between them neutral", () => {
    expect([5.8, 6.5, 7.3, 7.4, 8.2].map(phBand)).toEqual(["acid", "neutral", "neutral", "alkaline", "alkaline"]);
  });
});

describe("the demo field's soil", () => {
  const soil = soilSummary(demo)!;

  it("is heavy ground, a clay loam, and alkaline", () => {
    expect(soil.texture).toBe("clay-loam");
    expect(soil.weight).toBe("heavy");
    expect(soil.band).toBe("alkaline");
    expect(soil.ph?.value).toBe(7.7);
    expect(soil.measuredPh?.value).toBe(8.2);
  });

  it("lists clay, sand and silt first, then every other soil figure once", () => {
    expect(soil.figures.slice(0, 3).map((fact) => fact.label)).toEqual(["evidence.clay", "data.sand", "data.silt"]);
    const labels = soil.figures.map((fact) => fact.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toContain("data.ph");
    expect(labels).toContain("data.waterHolding");
  });

  it("is not named at all when the bundle has no soil figures", () => {
    expect(soilSummary(validateBundle(structuredClone(fixture)))).toBeNull();
    const noSilt = structuredClone(demo);
    delete noSilt.fieldData!.soil.silt;
    expect(soilSummary(noSilt)).toBeNull();
  });

  it("without a clay figure, clay is what sand and silt leave", () => {
    const noClay = structuredClone(demo);
    for (const option of noClay.options) option.why.evidence = option.why.evidence.filter((fact) => fact.label !== "evidence.clay");
    const summary = soilSummary(noClay)!;
    expect(summary.texture).toBe("clay-loam");
    expect(summary.figures[0].label).toBe("data.sand");
  });
});

describe("the soil card", () => {
  it("names the ground in a farmer's word first, says it is an estimate and that the ranking does not use it", () => {
    render(<SoilCard bundle={demo} view="standard" />);
    expect(screen.getByTestId("soil-kind")).toHaveTextContent("Heavy ground (clay loam)");
    expect(screen.getByTestId("soil-ph")).toHaveTextContent("Alkaline soil · pH 7.7 · measured in the trial here: 8.2");
    expect(screen.getByTestId("soil-honest")).toHaveTextContent("it is an estimate and not a soil test");
    expect(screen.getByTestId("soil-honest")).toHaveTextContent("does not take your soil into account yet");
    expect(screen.queryByTestId("soil-list")).toBeNull();
  });

  it("opens the figures on a tap, each with its range and a source", () => {
    render(<SoilCard bundle={demo} view="standard" />);
    fireEvent.click(screen.getByTestId("soil-figures"));
    const list = screen.getByTestId("soil-list");
    expect(list).toHaveTextContent("Topsoil clay");
    expect(list).toHaveTextContent("37 %");
    expect(list).toHaveTextContent("(5.6–76.4)");
    expect(list.querySelectorAll('[data-testid="source-button"]').length).toBe(soilSummary(demo)!.figures.length + 1);
    expect(screen.getByTestId("soil-measured")).toHaveTextContent("8.2");
    expect(screen.getByTestId("soil-figures")).toHaveTextContent("Hide the figures");
  });

  it("speaks Italian, and shows nothing for a bundle with no soil figures", () => {
    const { unmount } = render(
      <LangContext.Provider value="it">
        <SoilCard bundle={demo} view="simple" />
      </LangContext.Provider>,
    );
    expect(screen.getByTestId("soil-kind")).toHaveTextContent("Terra forte (franco-argilloso)");
    expect(screen.getByTestId("soil-ph")).toHaveTextContent("Terreno alcalino · pH 7,7 · misurato qui nella prova: 8,2");
    unmount();
    const { container } = render(<SoilCard bundle={validateBundle(structuredClone(fixture))} view="standard" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("the farmer's own soil", () => {
  it("replaces the soil map's ground and pH, says so, and keeps the map's answer for comparison", () => {
    const own = soilSummary(demo, { weight: "light", ph: 6.2 })!;
    expect(own.weight).toBe("light");
    expect(own.mapWeight).toBe("heavy");
    expect(own.own).toEqual({ weight: true, ph: true });
    expect(own.band).toBe("acid");
    // Choosing what the map already says is not a correction.
    expect(soilSummary(demo, { weight: "heavy", ph: null })!.own.weight).toBe(false);
  });

  it("goes in the link and comes back out of it", () => {
    const state = decodeState("f=genzano-demo&sw=light&sph=6.2");
    expect(state.soilWeight).toBe("light");
    expect(state.soilPh).toBe(6.2);
    expect(encodeState(state)).toContain("sw=light");
    expect(encodeState(state)).toContain("sph=6.2");
    expect(decodeState("sw=rocky&sph=14").soilWeight).toBeNull();
    expect(decodeState("sw=rocky&sph=14").soilPh).toBeNull();
  });

  it("the card shows the farmer's soil, marked as theirs, and Change lets them pick another or go back to the map", () => {
    rtlRender(<SoilCard bundle={demo} view="standard" />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={["/options?f=genzano-demo&sw=light&sph=6.2"]}>{children}</MemoryRouter>,
    });
    expect(screen.getByTestId("soil-kind")).toHaveTextContent("Light ground");
    expect(screen.getByTestId("soil-kind")).toHaveTextContent("Yours");
    expect(screen.getByTestId("soil-ph")).toHaveTextContent("6.2");
    expect(screen.getByTestId("soil-honest")).toHaveTextContent("heavy ground");
    fireEvent.click(screen.getByTestId("soil-edit"));
    expect(screen.getByTestId("soil-pick-light")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("soil-reset"));
    expect(screen.getByTestId("soil-kind")).toHaveTextContent("Heavy ground");
    expect(screen.getByTestId("soil-kind")).not.toHaveTextContent("Yours");
  });
});
