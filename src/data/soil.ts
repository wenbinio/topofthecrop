// What kind of ground a field has, in a farmer's words, from the soil figures the bundle already carries.
// Nothing here changes the ranking: it only names the soil. The groups and bands are our own judgement
// (docs/scoring.md, "Your soil").
import type { Fact, FieldBundle } from "./types";

/** The twelve USDA texture classes. */
export type Texture =
  | "sand" | "loamy-sand" | "sandy-loam" | "loam" | "silt-loam" | "silt"
  | "sandy-clay-loam" | "clay-loam" | "silty-clay-loam" | "sandy-clay" | "silty-clay" | "clay";
/** How a farmer would call it: heavy (clay-rich), medium (loams) or light (sandy). */
export type Weight = "heavy" | "medium" | "light";
export type PhBand = "acid" | "neutral" | "alkaline";

/**
 * The USDA texture class for a topsoil of this much sand, silt and clay (percent, adding to about 100):
 * the standard triangle as the USDA Natural Resources Conservation Service writes it out.
 */
export function textureClass(sand: number, silt: number, clay: number): Texture {
  if (silt + 1.5 * clay < 15) return "sand";
  if (silt + 2 * clay < 30) return "loamy-sand";
  if ((clay >= 7 && clay < 20 && sand > 52) || (clay < 7 && silt < 50)) return "sandy-loam";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "loam";
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return "silt-loam";
  if (silt >= 80 && clay < 12) return "silt";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "sandy-clay-loam";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "clay-loam";
  if (clay >= 27 && clay < 40 && sand <= 20) return "silty-clay-loam";
  if (clay >= 35 && sand > 45) return "sandy-clay";
  if (clay >= 40 && silt >= 40) return "silty-clay";
  if (clay >= 40) return "clay";
  return "loam";
}

/** Our grouping of the twelve classes into the three a farmer names. */
export const WEIGHT_OF: Record<Texture, Weight> = {
  sand: "light", "loamy-sand": "light", "sandy-loam": "light",
  loam: "medium", "silt-loam": "medium", silt: "medium",
  "sandy-clay-loam": "heavy", "clay-loam": "heavy", "silty-clay-loam": "heavy",
  "sandy-clay": "heavy", "silty-clay": "heavy", clay: "heavy",
};

/** Under 6.5 is acid, over 7.3 alkaline, between them neutral (the USDA's neutral band is 6.6 to 7.3). */
export const PH_BANDS = { acidBelow: 6.5, alkalineAbove: 7.3 };
export function phBand(ph: number): PhBand {
  return ph < PH_BANDS.acidBelow ? "acid" : ph > PH_BANDS.alkalineAbove ? "alkaline" : "neutral";
}

export type SoilSummary = {
  texture: Texture;
  weight: Weight;
  /** The soil map's pH, and the band it falls in. The band follows the measured pH where the field has one. */
  ph?: Fact;
  band?: PhBand;
  /** Demo field only: the pH a trial measured in the ground. */
  measuredPh?: Fact;
  /** Every soil figure, for the list: clay, sand and silt first. */
  figures: Fact[];
  /** One of the figures, for the "field or area" badge on the card. */
  scale: Fact["scale"];
};

const num = (fact: Fact | undefined): number | null => (fact && typeof fact.value === "number" ? fact.value : null);

/** The field's soil, or null when the bundle has no sand and silt figures to name it from. */
export function soilSummary(bundle: FieldBundle): SoilSummary | null {
  const soil = bundle.fieldData?.soil;
  if (!soil) return null;
  const sand = num(soil.sand), silt = num(soil.silt);
  if (sand === null || silt === null) return null;
  // Clay is listed with the evidence, not with the other soil figures; without it, it is what sand and silt leave.
  const clayFact = bundle.options.flatMap((option) => option.why.evidence).find((fact) => fact.label === "evidence.clay");
  const clay = num(clayFact) ?? Math.max(0, 100 - sand - silt);
  const texture = textureClass(sand, silt, clay);
  const measuredPh = bundle.fieldData?.trialSoil?.ph;
  const ph = soil.ph;
  const phValue = num(measuredPh) ?? num(ph);
  const rest = Object.entries(soil).filter(([key]) => key !== "sand" && key !== "silt").map(([, fact]) => fact);
  const figures = [clayFact, soil.sand, soil.silt, ...rest].filter((fact): fact is Fact => Boolean(fact));
  return {
    texture, weight: WEIGHT_OF[texture],
    ...(ph ? { ph } : {}), ...(phValue !== null ? { band: phBand(phValue) } : {}), ...(measuredPh ? { measuredPh } : {}),
    figures, scale: soil.sand!.scale,
  };
}
