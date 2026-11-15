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
      "Plant chickpea next. About 158 euro per hectare a year more than durum on durum. Needs little water. A suggestion: check it locally first.",
    );
    expect(screenSummary("/options", bundle, state("it"))).toBe(
      "Semina cece dopo. Circa più 158 euro per ettaro all'anno sul ringrano. Vuole poca acqua. Un consiglio: prima verifica sul posto.",
    );
  });

  it("Options with soil first speaks the nitrogen in words", () => {
    expect(screenSummary("/options", bundle, state("en", ["soil", "income"]))).toBe(
      "Plant faba bean next. About 60 kilos of nitrogen per hectare for next crop. About 57 euro per hectare a year more than durum on durum. A suggestion: check it locally first.",
    );
    expect(screenSummary("/options", bundle, state("it", ["soil", "income"]))).toBe(
      "Semina favino dopo. Circa 60 chili di azoto per ettaro alla coltura dopo. Circa più 57 euro per ettaro all'anno sul ringrano. Un consiglio: prima verifica sul posto.",
    );
  });

  it("Why: the option, its reasons and what to check locally", () => {
    expect(screenSummary("/why/chickpea-durum-durum", bundle, state("en"))).toBe(
      "Chickpea. About 158 euro per hectare a year more than durum on durum. Needs little water. Check locally: Any local pulse or forage buyer. Where to buy seed; best valley variety. Go over the plan with someone who knows your land.",
    );
    expect(screenSummary("/why/chickpea-durum-durum", bundle, state("it"))).toBe(
      "Cece. Circa più 158 euro per ettaro all'anno sul ringrano. Vuole poca acqua. Verifica sul posto: Acquirente vicino per legumi o foraggio. Dove comprare seme; varietà per la valle. Rivedi il piano con chi conosce la tua terra.",
    );
    expect(screenSummary("/why/nothing", bundle, state("en"))).toBe("Option not in your list.");
  });

  it("Year: hot days now and by 2050 at the chosen stop, and the best fit", () => {
    expect(screenSummary("/year", bundle, state("en"))).toBe("Hot flowering days, normal: 9 days now, 17 days by 2050. Best fit then: Chickpea.");
    expect(screenSummary("/year", bundle, state("it"))).toBe("Caldo in fioritura, normale: 9 giorni oggi, 17 giorni al 2050. Più adatta allora: Cece.");
    expect(screenSummary("/year", bundle, state("en", ["income", "water"], { scenario: "much-drier" }))).toMatch(
      /^Hot flowering days, much drier: 16 days now, 27 days by 2050\./,
    );
  });

  it("Questions: what is chosen and what is still to pick", () => {
    expect(screenSummary("/questions", bundle, state("en", []))).toBe("Last crop: Durum. Tap what matters most first: Income, Water, Soil and nitrogen, Forage.");
    expect(screenSummary("/questions", bundle, state("it", ["water"]))).toBe(
      "Ultima coltura: Grano duro. Le tue priorità: 1 Acqua. Tocca prima ciò che conta di più: Reddito, Suolo e azoto, Foraggio.",
    );
    expect(screenSummary("/questions", bundle, state("en"))).toBe("Last crop: Durum. Your priorities: 1 Income, 2 Water.");
  });

  it("Check and share: what to check alone for the best fit, then who can look at it", () => {
    expect(screenSummary("/adviser", bundle, state("en"))).toBe(
      "Check before you sow. Check yourself: Any local pulse or forage buyer. Where to buy seed; best valley variety. " +
        "No adviser? Ask one of these: Cooperative or seed dealer; CAA office, where you file your payment claim; " +
        "Your region's farm advisory service; A neighbour who grows it; An agronomist, if you have one.",
    );
    expect(screenSummary("/adviser", bundle, state("it"))).toContain("Non hai un tecnico? Chiedi a uno di questi: Cooperativa o rivenditore di sementi; Il tuo CAA");
  });

  it("elsewhere, the screen's heading", () => {
    expect(screenSummary("/", null, state("it"))).toBe("Tocca il campo.");
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
