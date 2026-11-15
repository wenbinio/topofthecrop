import type { Option } from "./types";

/** Added to every option's "Not known" list for a drawn field: its values are 1 km estimates. */
export const AREA_UNKNOWN = "unknown.area1km";

/** Under this share of farmland in a drawn outline, the Options screen says part of it is not farmland. */
export const FARMLAND_NOTE_BELOW = 0.8;

/**
 * Caveats from the data handover (docs/scoring.md, "Data caveats") that change how a farmer reads the numbers,
 * shown under "Not known" for every field: ERA5-Land runs cool (hot days undercounted), soil is a prediction.
 * A drawn field's options also carry AREA_UNKNOWN (src/data/fieldFromBasin.ts).
 */
export const DATA_CAVEATS = ["unknown.coolTemps", "unknown.soilTest"] as const;

/** An option's "Not known" list with the data caveats added once. */
export function unknownsFor(option: Option): string[] {
  return [...new Set([...option.why.unknowns, ...DATA_CAVEATS])];
}
