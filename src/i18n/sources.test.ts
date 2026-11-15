// Written with AI assistance (Claude, Anthropic).
import { describe, expect, it } from "vitest";
import { sourceText } from "./sources";

describe("sourceText", () => {
  it("leaves English labels as they are", () => {
    expect(sourceText("about 11 km", "en")).toBe("about 11 km");
    expect(sourceText("Our own rule, no source yet", "en")).toBe("Our own rule, no source yet");
  });

  it("gives Italian for a listed label", () => {
    expect(sourceText("Our own rule, no source yet", "it")).toBe("Regola nostra, ancora senza fonte");
    expect(sourceText("ERA5-Land (NASA POWER check)", "it")).toBe("ERA5-Land (controllo con NASA POWER)");
    expect(sourceText("this rotation", "it")).toBe("questa rotazione");
  });

  it("turns distances into Italian", () => {
    expect(sourceText("about 50 km", "it")).toBe("circa 50 km");
    expect(sourceText("6 to 11 km", "it")).toBe("da 6 a 11 km");
    expect(sourceText("500 m, 1 km mean", "it")).toBe("500 m, media su 1 km");
  });

  it("shows a name it does not know as written", () => {
    expect(sourceText("NASA POWER", "it")).toBe("NASA POWER");
    expect(sourceText("30 m", "it")).toBe("30 m");
    expect(sourceText("", "it")).toBe("");
  });
});
