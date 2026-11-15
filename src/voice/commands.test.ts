import { describe, expect, it } from "vitest";
import type { CropId, Lang } from "../data/types";
import { CROPS } from "../data/types";
import { en } from "../i18n/en";
import { it as itDict } from "../i18n/it";
import type { VoiceCommand } from "./commands";
import { normalise, parseCommand } from "./commands";

const ctx = { route: "/questions", crops: CROPS };
const parse = (text: string, lang: Lang, crops: readonly CropId[] = CROPS) => parseCommand(text, lang, { ...ctx, crops });

const on = (priority: string): VoiceCommand => ({ kind: "priority", priority, on: true }) as VoiceCommand;
const off = (priority: string): VoiceCommand => ({ kind: "priority", priority, on: false }) as VoiceCommand;
const limit = (l: string, isOn = true): VoiceCommand => ({ kind: "limit", limit: l, on: isOn }) as VoiceCommand;
const crop = (c: CropId): VoiceCommand => ({ kind: "lastCrop", crop: c });
const go = (step: string): VoiceCommand => ({ kind: "go", step }) as VoiceCommand;
const NEXT: VoiceCommand = { kind: "next" };
const BACK: VoiceCommand = { kind: "back" };
const READ: VoiceCommand = { kind: "read" };
const STOP: VoiceCommand = { kind: "stop" };

const CASES: [Lang, string, VoiceCommand[]][] = [
  // English
  ["en", "Next", [NEXT]],
  ["en", "it was left fallow", [{ kind: "lastCrop", crop: "none" }]],
  ["it", "era a maggese", [{ kind: "lastCrop", crop: "none" }]],
  ["en", "go back", [BACK]],
  ["en", "Income and water, next.", [on("income"), on("water"), NEXT]],
  ["en", "income and water next", [on("income"), on("water"), NEXT]],
  ["en", "Remove water", [off("water")]],
  ["en", "water off, forage on", [off("water"), on("forage")]],
  ["en", "soil and nitrogen", [on("soil")]],
  ["en", "the hay please", [on("forage")]],
  ["en", "No irrigation", [limit("no-irrigation")]],
  ["en", "I can't irrigate", [limit("no-irrigation")]],
  ["en", "remove irrigation", [limit("no-irrigation", false)]],
  ["en", "cereal machinery only", [limit("cereal-machinery")]],
  ["en", "there's no buyer nearby", [limit("no-buyer")]],
  ["en", "Broomrape!", [limit("broomrape")]],
  ["en", "last crop was chickpeas", [crop("chickpea")]],
  ["en", "chick peas", [crop("chickpea")]],
  ["en", "durum wheat", [crop("durum")]],
  ["en", "faba beans", [crop("faba")]],
  // Nothing sets the kind of year any more: Field year shows all three.
  ["en", "much drier", []],
  ["en", "simple view", [{ kind: "view", view: "simple" }]],
  ["en", "standard view", [{ kind: "view", view: "standard" }]],
  ["en", "Italian", [{ kind: "lang", lang: "it" }]],
  ["en", "What should I plant?", [READ]],
  ["en", "read it out", [READ]],
  ["en", "stop", [STOP]],
  ["en", "go to options", [go("options")]],
  ["en", "show the field year", [go("year")]],
  ["en", "the adviser", [go("adviser")]],
  ["en", "check and share", [go("adviser")]],
  ["en", "settings", [go("settings")]],
  ["en", "print", [go("print")]],
  ["en", "field", [go("field")]],
  ["en", "why", [go("why")]],
  ["en", "pea", [crop("pea")]],
  // Italian, as a southern farmer would say it
  ["it", "avanti", [NEXT]],
  ["it", "torna indietro", [BACK]],
  ["it", "Reddito e acqua, avanti", [on("income"), on("water"), NEXT]],
  ["it", "togli acqua", [off("water")]],
  ["it", "togli l'acqua e il reddito", [off("water"), off("income")]],
  ["it", "togli acqua, metti foraggio", [off("water"), on("forage")]],
  ["it", "niente foraggio, guadagno", [off("forage"), on("income")]],
  ["it", "il guadagno", [on("income")]],
  ["it", "il terreno e l'azoto", [on("soil"), on("soil")]],
  ["it", "fieno", [on("forage")]],
  ["it", "niente irrigazione", [limit("no-irrigation")]],
  ["it", "non irrigo", [limit("no-irrigation")]],
  ["it", "Togli irrigazione", [limit("no-irrigation", false)]],
  ["it", "solo macchine per cereali", [limit("cereal-machinery")]],
  ["it", "nessuno compra", [limit("no-buyer")]],
  ["it", "l'orobanche", [limit("broomrape")]],
  ["it", "gran duro", [crop("durum")]],
  ["it", "Grano duro", [crop("durum")]],
  ["it", "cieci", [crop("chickpea")]],
  ["it", "l'anno scorso i ceci", [crop("chickpea")]],
  ["it", "favino", [crop("faba")]],
  ["it", "veccia e avena", [crop("vetch-oat")]],
  ["it", "lenticchie", [crop("lentil")]],
  ["it", "piselli", [crop("pea")]],
  ["it", "orzo", [crop("barley")]],
  ["it", "colza", [crop("rapeseed")]],
  ["it", "coriandolo", [crop("coriander")]],
  // "annata" still opens Field year, where all three kinds of year are shown.
  ["it", "un'annata molto più secca", [{ kind: "go", step: "year" }]],
  ["it", "vista semplice", [{ kind: "view", view: "simple" }]],
  ["it", "English", [{ kind: "lang", lang: "en" }]],
  ["it", "in italiano", [{ kind: "lang", lang: "it" }]],
  ["it", "cosa devo seminare?", [READ]],
  ["it", "leggi", [READ]],
  ["it", "basta", [STOP]],
  ["it", "perché?", [go("why")]],
  ["it", "le scelte", [go("options")]],
  ["it", "annata", [go("year")]],
  ["it", "il tecnico", [go("adviser")]],
  ["it", "condividi", [go("adviser")]],
  ["it", "impostazioni", [go("settings")]],
  ["it", "stampa", [go("print")]],
  ["it", "campo", [go("field")]],
  ["it", "domande", [go("questions")]],
];

describe("parseCommand", () => {
  it.each(CASES)("%s: %s", (lang, text, expected) => {
    expect(parse(text, lang)).toEqual(expected);
  });

  it("has at least 40 phrases in each language", () => {
    expect(CASES.filter(([l]) => l === "en").length).toBeGreaterThanOrEqual(30);
    expect(CASES.filter(([l]) => l === "it").length).toBeGreaterThanOrEqual(40);
  });

  it("does not match what it does not know", () => {
    for (const [lang, text] of [
      ["en", ""],
      ["en", "   "],
      ["en", "waterproof boots"],
      ["en", "a watermelon"],
      ["en", "hello there"],
      ["en", "peanut butter"],
      ["en", "irrigation"], // on its own it could mean either
      ["it", "acquazzone"],
      ["it", "buongiorno"],
      ["it", "irrigazione"],
      ["it", "il mio campo è grande"],
      ["it", "campanile"],
    ] as [Lang, string][]) {
      expect(parse(text, lang), text).toEqual([]);
    }
  });

  it("mentioning the field in passing does not jump to the map", () => {
    expect(parse("no irrigation on my field", "en")).toEqual([limit("no-irrigation")]);
    expect(parse("nel mio campo non irrigo", "it")).toEqual([limit("no-irrigation")]);
  });

  it("only knows the crops the bundle offers", () => {
    expect(parse("barley", "en", ["durum", "chickpea"])).toEqual([]);
    expect(parse("barley, next", "en", ["durum"])).toEqual([NEXT]);
  });

  it("uses the app's language, plus the language names and stop", () => {
    expect(parse("reddito", "en")).toEqual([]);
    expect(parse("income", "it")).toEqual([]);
    expect(parse("italiano", "en")).toEqual([{ kind: "lang", lang: "it" }]);
    expect(parse("stop", "it")).toEqual([STOP]);
  });

  it("normalises accents, case and punctuation", () => {
    expect(normalise("  Perché? L'ACQUA, più-secco!  ")).toBe("perche l acqua piu secco");
  });

  it("the example phrases each screen offers are understood", () => {
    for (const [lang, dict] of [
      ["en", en],
      ["it", itDict],
    ] as [Lang, Record<string, string>][]) {
      for (const [key, text] of Object.entries(dict)) {
        if (!key.startsWith("voice.try.")) continue;
        const phrases = [...text.matchAll(/[“«]([^”»]+)[”»]/g)].map((m) => m[1]);
        expect(phrases, key).toHaveLength(2);
        for (const phrase of phrases) expect(parse(phrase, lang), `${key}: ${phrase}`).not.toEqual([]);
      }
    }
  });
});
