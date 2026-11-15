// Written with AI assistance (Claude, Anthropic).
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { KeepFiguresOnBack } from "./KeepFiguresOnBack";
import { carryFigures } from "../screens/settings/path";

const figures = (query: string | null) => new URLSearchParams(query ?? "");

function Where() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <p data-testid="where">{location.pathname + location.search}</p>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
    </>
  );
}

describe("carryFigures", () => {
  it("carries the figures changed in Settings to the screen before it", () => {
    const out = carryFigures("?f=genzano-demo&m=p.durum~400&x=a", "?f=genzano-demo&p=income,water");
    expect(figures(out).get("m")).toBe("p.durum~400");
    expect(figures(out).get("x")).toBe("a");
    expect(figures(out).get("p")).toBe("income,water");
  });

  it("drops figures that were reset in Settings", () => {
    expect(figures(carryFigures("?f=genzano-demo", "?f=genzano-demo&m=p.durum~400")).get("m")).toBeNull();
  });

  it("returns null when nothing changed", () => {
    expect(carryFigures("?f=genzano-demo&m=p.durum~400", "?f=genzano-demo&m=p.durum~400")).toBeNull();
  });
});

describe("KeepFiguresOnBack", () => {
  it("going back from Settings keeps the new figures, and a further Back moves on", () => {
    render(
      <MemoryRouter
        initialEntries={["/questions?f=genzano-demo", "/options?f=genzano-demo", "/settings?f=genzano-demo&m=p.durum~400"]}
        initialIndex={2}
      >
        <KeepFiguresOnBack />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("back"));
    const [path, query] = (screen.getByTestId("where").textContent ?? "").split("?");
    expect(path).toBe("/options");
    expect(figures(query).get("m")).toBe("p.durum~400");
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where").textContent).toBe("/questions?f=genzano-demo");
  });

  it("leaves other Back steps alone", () => {
    render(
      <MemoryRouter initialEntries={["/questions?f=genzano-demo", "/options?f=genzano-demo&m=p.durum~400"]} initialIndex={1}>
        <KeepFiguresOnBack />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where").textContent).toBe("/questions?f=genzano-demo");
  });
});
