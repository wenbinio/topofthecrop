import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson } from "./basin";
import { DATA_STAMP, stamped } from "./fresh";

afterEach(() => vi.unstubAllGlobals());

describe("stamped", () => {
  it("adds the data's fingerprint, so changed data has a new address", () => {
    expect(stamped("data/genzano-demo.json", "ab12cd34")).toBe("data/genzano-demo.json?v=ab12cd34");
    expect(stamped("./parcels/D971/index.json", "ab12cd34")).toBe("./parcels/D971/index.json?v=ab12cd34");
  });

  it("joins with & when the address already has a query", () => {
    expect(stamped("data/x.json?a=1", "ab12cd34")).toBe("data/x.json?a=1&v=ab12cd34");
  });

  it("leaves the address alone when there is no fingerprint, as while developing and in tests", () => {
    expect(stamped("data/genzano-demo.json", "")).toBe("data/genzano-demo.json");
    expect(DATA_STAMP).toBe("");
    expect(stamped("data/genzano-demo.json")).toBe("data/genzano-demo.json");
  });
});

describe("the loaders", () => {
  it("getJson asks for the stamped address", async () => {
    const asked: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
      asked.push(String(url));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    await getJson("data/basin/cells_weather.json");
    // No fingerprint in tests, so the address is unchanged; with one it would end "?v=<fingerprint>".
    expect(asked).toEqual([stamped("data/basin/cells_weather.json")]);
  });
});
