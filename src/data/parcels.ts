// Cadastral parcels, so a farmer can find a field by the sheet and parcel numbers in their farm file.
// The outlines are downloaded ahead of time by scripts/fetch-parcels.mjs (the cadastre's own service refuses calls
// from a web page) and shipped as small files in public/parcels/<commune code>/: index.json, and one file per sheet.
// Source: Agenzia delle Entrate, Cartografia catastale. CC BY 4.0. A parcel is a property unit, not always a field.
// Written with AI assistance (Claude, Anthropic).
import type { LngLat } from "./types";
import { getJson } from "./basin";

/** The communes whose parcels ship with the app. */
export const PARCEL_COMMUNES = [{ code: "D971", name: "Genzano di Lucania" }] as const;
export const PARCEL_CREDIT = "Parcels © Agenzia delle Entrate, CC BY 4.0";

export type ParcelIndex = {
  commune: { code: string; name: string };
  credit: string;
  fetched: string;
  parcels: number;
  /** File name (without .json) → the sheet number as a farmer writes it, e.g. "56" or "56A". */
  sheets: Record<string, { sheet: string; parcels: number }>;
};

/** One sheet's file: parcel label → its outline as an open ring of [lon, lat]. */
type SheetFile = Record<string, LngLat[]>;

const base = (code: string) => `${import.meta.env.BASE_URL}parcels/${code}/`;

/** "056", " 56 " and "56" are the same number; letters are kept, upper-cased ("56a" → "56A"). */
export function tidyNumber(typed: string): string {
  const s = typed.trim().toUpperCase().replace(/\s+/g, "");
  return s.replace(/^0+(?=.)/, "");
}

/**
 * The sheet files a typed sheet number can mean. "56" matches sheet 56 and any annex of it (56A, 56B);
 * "56A" matches only that annex.
 */
export function sheetFiles(index: ParcelIndex, typed: string): string[] {
  const want = tidyNumber(typed);
  if (!want) return [];
  const plain = /^\d+$/.test(want);
  return Object.entries(index.sheets)
    .filter(([, s]) => s.sheet === want || (plain && s.sheet.replace(/[A-Z]+$/, "") === want))
    .map(([file]) => file)
    .sort();
}

const indexes = new Map<string, Promise<ParcelIndex>>();

/** A commune's list of sheets, fetched once. A failure is not kept, so trying again asks again. */
export function loadParcelIndex(code: string): Promise<ParcelIndex> {
  let found = indexes.get(code);
  if (!found) {
    found = (getJson(`${base(code)}index.json`) as Promise<ParcelIndex>).catch((error: unknown) => {
      indexes.delete(code);
      throw error;
    });
    indexes.set(code, found);
  }
  return found;
}

export type ParcelAnswer =
  | { found: true; ring: LngLat[] }
  /** `sheet` false: no such sheet in this commune; true: the sheet exists but has no such parcel. */
  | { found: false; sheet: boolean };

/** Looks a parcel up by commune, sheet and parcel number. Rejects only when a file cannot be fetched. */
export async function findParcel(code: string, sheet: string, parcel: string): Promise<ParcelAnswer> {
  const index = await loadParcelIndex(code);
  const files = sheetFiles(index, sheet);
  const want = tidyNumber(parcel);
  if (!files.length || !want) return { found: false, sheet: files.length > 0 };
  for (const file of files) {
    const parcels = (await getJson(`${base(code)}${file}.json`)) as SheetFile;
    for (const [label, ring] of Object.entries(parcels)) {
      if (tidyNumber(label) === want && Array.isArray(ring) && ring.length >= 3) return { found: true, ring };
    }
  }
  return { found: false, sheet: true };
}

/** For tests: forget what was fetched. */
export function resetParcels(): void {
  indexes.clear();
}
