// Finding a cadastral parcel by its sheet and parcel numbers.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParcelIndex } from "./parcels";
import { findParcel, resetParcels, sheetFiles, tidyNumber } from "./parcels";

const index: ParcelIndex = {
  commune: { code: "D971", name: "Genzano di Lucania" },
  credit: "Parcels © Agenzia delle Entrate, CC BY 4.0",
  fetched: "2026-11-15",
  parcels: 4,
  sheets: {
    "005600": { sheet: "56", parcels: 2 },
    "0056A0": { sheet: "56A", parcels: 1 },
    "000700": { sheet: "7", parcels: 1 },
  },
};
const square = (x: number): [number, number][] => [[x, 40.8], [x + 0.002, 40.8], [x + 0.002, 40.802], [x, 40.802]];
const files: Record<string, unknown> = {
  "index.json": index,
  "005600.json": { "159": square(16.09), "21": square(16.1) },
  "0056A0.json": { "300": square(16.11) },
  "000700.json": { "0012": square(16.12) },
};

let asked: string[] = [];
beforeEach(() => {
  asked = [];
  resetParcels();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) => {
      const name = String(url).split("/").pop() ?? "";
      asked.push(name);
      // Only Genzano's files exist.
      if (!String(url).includes("parcels/D971/") || !(name in files)) {
        return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => structuredClone(files[name]) } as unknown as Response;
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("tidyNumber", () => {
  it("drops spaces and leading zeros and upper-cases letters", () => {
    expect(tidyNumber(" 056 ")).toBe("56");
    expect(tidyNumber("56a")).toBe("56A");
    expect(tidyNumber("0")).toBe("0");
    expect(tidyNumber("   ")).toBe("");
  });
});

describe("sheetFiles", () => {
  it("a plain number means the sheet and its annexes", () => {
    expect(sheetFiles(index, "56")).toEqual(["005600", "0056A0"]);
    expect(sheetFiles(index, "056")).toEqual(["005600", "0056A0"]);
  });
  it("a number with a letter means that annex only", () => {
    expect(sheetFiles(index, "56a")).toEqual(["0056A0"]);
  });
  it("an unknown or empty sheet means nothing", () => {
    expect(sheetFiles(index, "999")).toEqual([]);
    expect(sheetFiles(index, "")).toEqual([]);
    // 5 is not sheet 56
    expect(sheetFiles(index, "5")).toEqual([]);
  });
});

describe("findParcel", () => {
  it("finds a parcel on its sheet", async () => {
    const answer = await findParcel("D971", "56", "159");
    expect(answer).toEqual({ found: true, ring: square(16.09) });
  });
  it("looks on the sheet's annexes too", async () => {
    const answer = await findParcel("D971", "56", "300");
    expect(answer).toEqual({ found: true, ring: square(16.11) });
  });
  it("ignores leading zeros on either side", async () => {
    expect(await findParcel("D971", "007", "12")).toEqual({ found: true, ring: square(16.12) });
  });
  it("says when the sheet does not exist, without fetching a sheet file", async () => {
    expect(await findParcel("D971", "999", "1")).toEqual({ found: false, sheet: false });
    expect(asked).toEqual(["index.json"]);
  });
  it("says when the sheet exists but the parcel does not", async () => {
    expect(await findParcel("D971", "7", "999")).toEqual({ found: false, sheet: true });
  });
  it("fetches the list of sheets once", async () => {
    await findParcel("D971", "56", "159");
    await findParcel("D971", "56", "21");
    expect(asked.filter((n) => n === "index.json")).toHaveLength(1);
  });
  it("rejects when the files cannot be fetched, and asks again next time", async () => {
    await expect(findParcel("X000", "1", "1")).rejects.toThrow();
    await expect(findParcel("X000", "1", "1")).rejects.toThrow();
    expect(asked.filter((n) => n === "index.json")).toHaveLength(2);
  });
});
