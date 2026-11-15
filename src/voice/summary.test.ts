import { describe, expect, it } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import type { AppState, FieldBundle, Lang, Priority } from "../data/types";
import { DEFAULT_STATE, DEMO_FIELD_ID } from "../data/types";
import { withMoney } from "../money/money";
import { screenSummary, spoken } from "./summary";

// As the screens see it: the bundle with the (default) prices applied.
const bundle = withMoney(fixture as unknown as FieldBundle, {}, []);
const state = (lang: Lang, priorities: Priority[] = ["income", "water"], extra: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  fieldId: DEMO_FIELD_ID,
  lang,
  priorities,
  ...extra,
});

describe("screenSummary", () => {
  it("Options: headline, reasons, adviser line", () => {
    expect(screenSummary("/options", bundle, state("en"))).toBe(
      "Plant chickpea next. About 158 euro per hectare a year more than durum on durum. Needs little water. This is a suggestion: check locally first.",
    );
    expect(screenSummary("/options", bundle, state("it"))).toBe(
      "Semina cece la prossima annata. Circa più 158 euro per ettaro all'anno rispetto al ringrano. Vuole poca acqua. È solo un consiglio: prima verifica sul posto.",
    );
  });

  it("Options with soil first speaks the nitrogen in words", () => {
    expect(screenSummary("/options", bundle, state("en", ["soil", "income"]))).toBe(
      "Plant faba bean next. About 60 kilos of nitrogen per hectare for the next crop. About 57 euro per hectare a year more than durum on durum. This is a suggestion: check locally first.",
    );
    expect(screenSummary("/options", bundle, state("it", ["soil", "income"]))).toBe(
      "Semina favino la prossima annata. Lascia circa 60 chili di azoto per ettaro alla coltura successiva. Circa più 57 euro per ettaro all'anno rispetto al ringrano. È solo un consiglio: prima verifica sul posto.",
    );
  });

  it("Why: the option and its reasons (the checks are read on the field's page)", () => {
    expect(screenSummary("/why/chickpea-durum-durum", bundle, state("en"))).toBe(
      "Chickpea. About 158 euro per hectare a year more than durum on durum. Needs little water.",
    );
    expect(screenSummary("/why/chickpea-durum-durum", bundle, state("it"))).toBe(
      "Cece. Circa più 158 euro per ettaro all'anno rispetto al ringrano. Vuole poca acqua.",
    );
    expect(screenSummary("/why/nothing", bundle, state("en"))).toBe("That option is not in your list.");
  });

  it("Year: a usual, a dry and the driest year, each with its hot days now and by 2050 and its best fit", () => {
    expect(screenSummary("/year", bundle, state("en"))).toBe(
      "Usual year. Hot flowering days: 9 days now, 17 days by 2050. Best fit that year: Chickpea. " +
        "Dry year. Hot flowering days: 12 days now, 21 days by 2050. Best fit that year: Chickpea. " +
        "Driest year. Hot flowering days: 16 days now, 27 days by 2050. Best fit that year: Vetch-oat.",
    );
    expect(screenSummary("/year", bundle, state("it"))).toMatch(
      /^Annata normale\. Caldo in fioritura: 9 giorni oggi, 17 giorni al 2050\. Più adatta quell'anno: Cece\. Annata secca\. .* L'annata più secca\. Caldo in fioritura: 16 giorni oggi, 27 giorni al 2050\./,
    );
  });

  it("Questions: what is chosen and what is still to pick", () => {
    expect(screenSummary("/questions", bundle, state("en", []))).toBe("Last crop: Durum. Tap what matters most first: Income, Water, Soil and nitrogen, Forage.");
    expect(screenSummary("/questions", bundle, state("it", ["water"]))).toBe(
      "Ultima coltura: Grano duro. Le tue priorità: 1 Acqua. Tocca prima quello che conta di più: Reddito, Suolo e azoto, Foraggio.",
    );
    expect(screenSummary("/questions", bundle, state("en"))).toBe("Last crop: Durum. Your priorities: 1 Income, 2 Water.");
  });

  it("Share your plan: its lead, then who can look at it", () => {
    expect(screenSummary("/adviser", bundle, state("en"))).toBe(
      "Share your plan. Show it to someone who knows your land before you sow. " +
        "No adviser? Ask one of these: Cooperative or seed dealer; CAA office, where you file your payment claim; " +
        "Your region's farm advisory service; A neighbour who grows it; An agronomist, if you have one.",
    );
    expect(screenSummary("/adviser", bundle, state("it"))).toContain("Se non hai un tecnico, chiedi a uno di questi: Cooperativa o rivenditore di sementi; Il tuo CAA");
  });

  it("elsewhere, the screen's heading", () => {
    expect(screenSummary("/", null, state("it"))).toBe("Tocca il tuo campo.");
    expect(screenSummary("/settings", null, state("en"))).toBe("Prices and support.");
  });
});

describe("spoken", () => {
  it("writes units and signs out", () => {
    expect(spoken("About 20 €/ha/yr", "en")).toBe("About 20 euro per hectare a year");
    expect(spoken("Circa -96 €/ha/anno", "it")).toBe("Circa meno 96 euro per ettaro all'anno");
    expect(spoken("30 °C, 4–15 days", "en")).toBe("30 degrees, 4 to 15 days");
    expect(spoken("40 kg N/ha", "it")).toBe("40 chili di azoto per ettaro");
  });
});
