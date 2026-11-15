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
      {/* "Next" on Questions: builds the plan's link from this screen's own copy of the link. */}
      <button type="button" onClick={() => navigate({ pathname: "/options", search: location.search })}>
        next
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
  it("going back from Settings keeps the new figures, and every further Back keeps them too", () => {
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
    const [path2, query2] = (screen.getByTestId("where").textContent ?? "").split("?");
    expect(path2).toBe("/questions");
    expect(figures(query2).get("m")).toBe("p.durum~400");
    // Next from the questions builds the plan from that copy: the new price is still there.
    fireEvent.click(screen.getByText("next"));
    const [path3, query3] = (screen.getByTestId("where").textContent ?? "").split("?");
    expect(path3).toBe("/options");
    expect(figures(query3).get("m")).toBe("p.durum~400");
  });

  it("leaves a Back to another field alone", () => {
    render(
      <MemoryRouter initialEntries={["/questions?f=other-field", "/options?f=genzano-demo&m=p.durum~400"]} initialIndex={1}>
        <KeepFiguresOnBack />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where").textContent).toBe("/questions?f=other-field");
  });

  it("leaves a Back alone when the figures already match", () => {
    render(
      <MemoryRouter initialEntries={["/questions?f=genzano-demo&m=p.durum~400", "/options?f=genzano-demo&m=p.durum~400"]} initialIndex={1}>
        <KeepFiguresOnBack />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where").textContent).toBe("/questions?f=genzano-demo&m=p.durum~400");
  });
});
