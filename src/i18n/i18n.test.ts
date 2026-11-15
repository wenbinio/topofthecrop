import { describe, expect, it as test } from "vitest";
import fixture from "../../public/data/genzano-demo.json";
import { en } from "./en";
import { it } from "./it";
import { translate } from "./index";

describe("dictionaries", () => {
  test("Italian has every English key, no extra key and no empty string", () => {
    expect(Object.keys(it).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(it)) expect(value.trim(), key).not.toBe("");
    for (const [key, value] of Object.entries(en)) expect(value.trim(), key).not.toBe("");
  });

  test("every dictionary key in the placeholder bundle exists in English", () => {
    const keys = new Set<string>();
    JSON.stringify(fixture, (_k, v: unknown) => {
      if (typeof v === "string" && /^(finding|why|evidence|benefit|unknown|check|fact|year|weather|level|crop|data)\.[\w.-]+$/.test(v)) {
        keys.add(v);
      }
      return v;
    });
    expect(keys.size).toBeGreaterThan(20);
    for (const key of keys) expect(Object.prototype.hasOwnProperty.call(en, key), key).toBe(true);
  });

  test("a missing key comes back as itself; variables are filled in", () => {
    expect(translate("en", "no.such.key")).toBe("no.such.key");
    expect(translate("it", "find.about", { n: 6 })).toBe("circa 6 ha");
  });
});
