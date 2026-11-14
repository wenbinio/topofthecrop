// Writes public/data/genzano-demo.json, the one file the app reads.
// Real: the field, what the satellites see, its year and the evidence (from field.json via real-field.mjs),
//       and the researched prices and support (docs/support-and-prices.md).
// Still made up: yields, costs, and each rotation's water, nitrogen, risk and priority scores.
// Run: node scripts/make-placeholder-bundle.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { realField } from "./real-field.mjs";

const src = {
  landsat: { dataset: "Landsat / HLS", resolution: "30 m", url: "https://www.earthdata.nasa.gov/data/projects/hls" },
  ecostress: { dataset: "ECOSTRESS", resolution: "70 m", url: "https://ecostress.jpl.nasa.gov/" },
  power: { dataset: "NASA POWER", resolution: "about 50 km", url: "https://power.larc.nasa.gov/" },
  gpm: { dataset: "GPM IMERG", resolution: "about 10 km", url: "https://gpm.nasa.gov/data/imerg" },
  cmip6: { dataset: "NEX-GDDP-CMIP6", resolution: "about 25 km", url: "https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6" },
  cropmap: { dataset: "EU Crop Map (JRC)", resolution: "10 m", url: "https://joint-research-centre.ec.europa.eu/" },
  trials: { dataset: "Agronomy trials and regional prices (to be chosen)", resolution: "regional", url: "" },
};

const fact = (value, unit, range, scale, source, confidence, label, extra = {}) => ({
  value, ...(unit ? { unit } : {}), ...(range ? { range } : {}), scale, source, confidence, label, placeholder: true, ...extra,
});

// Yields and costs are still made-up placeholders. Prices and support come from the research in
// docs/support-and-prices.md (November 2026) and are marked by how well two independent researchers agreed.
const economicFact = (value, unit, source = src.trials) =>
  fact(value, unit, undefined, 'area', source, 'low', undefined, { asOf: '2026-10' });
const researched = (value, unit, range, source, confidence, asOf, placeholder = false) =>
  fact(value, unit, range, 'area', source, confidence, undefined, { asOf, placeholder });

const money = {
  foggia: { dataset: 'National durum price list and Foggia exchange', resolution: 'regional market', url: 'https://www.fg.camcom.it/' },
  hay: { dataset: 'Hay quotes from northern exchanges (no southern quote found)', resolution: 'other regions', url: 'https://www.bo.camcom.gov.it/' },
  agea: { dataset: 'AGEA payment circulars, CAP 2023-2027', resolution: 'national', url: 'https://www.agea.gov.it/' },
  masaf: { dataset: 'MASAF decrees and AGEA instructions', resolution: 'national', url: 'https://www.masaf.gov.it/' },
  csr: { dataset: 'CSR Basilicata 2023-2027', resolution: 'regional', url: 'https://basilicatacsr.it/' },
};

// SUPPORT: switched on by default only where the payment needs no extra commitment or contract.
const support = [
  {
    id: 'basic-income', level: 'eu', defaultOn: true,
    name: { en: 'Basic income support', it: "Sostegno base reddito" },
    condition: { en: "Based on your entitlements; varies by farm. Enter your figure.",
      it: "Sui tuoi titoli; varia per azienda. Metti tua cifra." },
    amount: researched(170, '€/ha', [140, 250], money.agea, 'low', '2025'), crops: [], options: [],
  },
  {
    id: 'redistributive', level: 'eu', defaultOn: true,
    name: { en: 'Redistributive payment', it: 'Sostegno ridistributivo' },
    condition: { en: "First 14 ha, farms up to 50 ha.", it: "Primi 14 ha, aziende fino a 50 ha." },
    amount: researched(90, '€/ha', [80, 90], money.agea, 'good', '2025'), crops: [], options: [],
  },
  {
    id: 'coupled-durum', level: 'italy', defaultOn: true,
    name: { en: "Coupled durum support", it: "Accoppiato grano duro" },
    condition: { en: "Centre-South durum, grown to full ripeness, certified seed.",
      it: "Grano duro Centro-Sud a maturazione, seme certificato." },
    amount: researched(103, '€/ha', [84, 103], money.agea, 'good', '2025'), crops: ['durum'], options: [],
  },
  {
    id: 'coupled-legumes', level: 'italy', defaultOn: true,
    name: { en: "Coupled grain legumes", it: "Accoppiato leguminose granella" },
    condition: { en: "Chickpea or faba bean to full seed ripeness.", it: "Cece o favino a maturazione piena." },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'good', '2025'), crops: ['chickpea', 'faba'], options: [],
  },
  {
    id: 'eco-rotation', level: 'eu', defaultOn: true,
    name: { en: "Eco-scheme 4: legume rotation", it: "Eco-schema 4: rotazione leguminosa" },
    condition: { en: "About 60 €/ha in eligible years (about 2 of 3). No legume herbicides or pesticides; residues worked in.",
      it: "Circa 60 €/ha anni validi (circa 2 su 3). No diserbi o fitofarmaci su legume; residui interrati." },
    amount: researched(40, '€/ha', [37, 72], money.agea, 'low', '2025'), crops: [],
    options: ['chickpea-durum-durum', 'faba-durum-faba'],
  },
  {
    id: 'eco-rotation-forage', level: 'eu', defaultOn: false,
    name: { en: "Eco-scheme 4: vetch-oat year", it: "Eco-schema 4: anno veccia-avena" },
    condition: { en: "Sources disagree if vetch-oat before durum counts. Ask your adviser.",
      it: "Fonti discordi se veccia-avena prima del grano duro valga. Chiedi al tecnico." },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [], options: ['vetch-oat-durum-durum'],
  },
  {
    id: 'coupled-forage-legume', level: 'italy', defaultOn: false,
    name: { en: "Coupled legume forage", it: "Accoppiato erbaio leguminose" },
    condition: { en: "Only if vetch dominates mix and stays until flowering starts.",
      it: "Solo se prevale veccia fino a inizio fioritura." },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'fair', '2025'), crops: ['vetch-oat'], options: [],
  },
  {
    id: 'durum-fund', level: 'italy', defaultOn: false,
    name: { en: 'Durum wheat fund', it: 'Fondo grano duro' },
    condition: { en: "3+ yr supply contract, certified seed. Max 50 ha; cut if too many apply.",
      it: "Contratto filiera almeno 3 anni, seme certificato. Max 50 ha; taglio se troppe domande." },
    amount: researched(100, '€/ha', [0, 200], money.masaf, 'fair', '2026'), crops: ['durum'], options: [],
  },
  {
    id: 'legume-fund', level: 'italy', defaultOn: false,
    name: { en: "Legume sovereignty fund", it: "Fondo sovranità leguminose" },
    condition: { en: "3-yr supply contract; pays legume ha above 3-yr average. Max 250 €/ha; cut if too many apply.",
      it: "Contratto filiera 3 anni; paga ha legumi sopra media 3 anni. Max 250 €/ha; taglio se troppe domande." },
    amount: researched(200, '€/ha', [0, 250], money.masaf, 'low', '2026'), crops: ['chickpea', 'faba'], options: [],
  },
  {
    id: 'no-till', level: 'basilicata', defaultOn: false,
    name: { en: 'No-till sowing (SRA03)', it: 'Semina su sodo (SRA03)' },
    condition: { en: "5-year no-till on all crops. 2026 call closed.",
      it: "Impegno 5 anni su sodo, tutte le colture. Bando 2026 chiuso." },
    amount: researched(300, '€/ha', [300, 300], money.csr, 'fair', '2026'), crops: [], options: [],
  },
  {
    id: 'integrated', level: 'basilicata', defaultOn: false,
    name: { en: 'Integrated production (SRA01)', it: 'Produzione integrata (SRA01)' },
    condition: { en: "5-year regional integrated rules. Not with organic on same field.",
      it: "Impegno 5 anni regole integrate regionali. No col biologico sullo stesso campo." },
    amount: researched(171, '€/ha', [114, 171], money.csr, 'fair', '2026'), crops: [], options: [],
  },
  {
    id: 'organic', level: 'basilicata', defaultOn: false,
    name: { en: "Organic (SRA29)", it: "Biologico (SRA29)" },
    condition: { en: "5 years certified organic. Sources disagree on arable rate; last call closed May 2025.",
      it: "5 anni biologico certificato. Fonti discordi sul premio seminativi; ultimo bando chiuso maggio 2025." },
    amount: researched(258, '€/ha', [163, 362], money.csr, 'low', '2025'), crops: [], options: [],
  },
];

const cropEconomics = (yieldPerHa, price, costs) => ({ yield: economicFact(yieldPerHa, 't/ha'), price, costs: economicFact(costs, '€/ha') });
const economics = {
  crops: {
    durum: cropEconomics(3.0, researched(290, '€/t', [265, 337], money.foggia, 'fair', '2026-11'), 620),
    chickpea: cropEconomics(1.6, researched(690, '€/t', [500, 950], money.foggia, 'fair', '2026-11'), 520),
    faba: cropEconomics(2.2, researched(255, '€/t', [248, 295], money.foggia, 'fair', '2026-11'), 430),
    // No hay quote exists for the South, so this one stays a placeholder.
    'vetch-oat': cropEconomics(5.5, researched(140, '€/t', [100, 210], money.hay, 'low', '2026', true), 380),
  },
  support,
};

// scores[scenario][priority], 0 to 1
const scores = (normal, drier, much) => {
  const row = ([income, water, soil, forage]) => ({ income, water, soil, forage });
  return { normal: row(normal), drier: row(drier), "much-drier": row(much) };
};

const option = (id, sequence, isCurrent, water, nitrogen, risk, sc, removedBy, flaggedBy, supportTag) => {
  const income = Math.round(sequence.reduce((sum, crop) => {
    const figures = economics.crops[crop];
    const payments = economics.support.filter(item => item.defaultOn &&
      (!item.options.length || item.options.includes(id)) && (!item.crops.length || item.crops.includes(crop)));
    return sum + figures.yield.value * figures.price.value - figures.costs.value +
      payments.reduce((total, item) => total + item.amount.value, 0);
  }, 0) / sequence.length);
  const incomeRange = [0.75, 1.25].map(factor => Math.round(income * factor / 10) * 10);
  // The income score follows the worked-out income (1000 €/ha scores 1), keeping this option's drier-year pattern.
  const base = sc.normal.income;
  for (const scenario of Object.keys(sc)) {
    sc[scenario].income = Math.round(Math.max(0, Math.min(1, income / 1000 * sc[scenario].income / base)) * 1000) / 1000;
  }
  return {
    id, isCurrent, sequence, firstHarvestYear: 2027,
    facts: {
      income: fact(income, "€/ha", incomeRange, "area", src.trials, "low", "fact.income", { asOf: "2026-10" }),
      water: fact(water, undefined, undefined, "area", src.trials, "low", "fact.water"),
      nitrogen: fact(nitrogen, "kg N/ha", [Math.max(0, nitrogen - 20), nitrogen + 20], "area", src.trials, "low", "fact.nitrogen"),
      risk: fact(risk, undefined, undefined, "area", src.trials, "low", "fact.risk"),
    },
    scores: sc, removedBy, flaggedBy, supportTag,
    why: {
      suggested: `why.${id}.suggested`,
      evidence: realField.evidence,
      benefits: [
        fact(nitrogen, "kg N/ha", [Math.max(0, nitrogen - 20), nitrogen + 20], "area", src.trials, "low", "benefit.nitrogen"),
        fact(income, "€/ha", incomeRange, "area", src.trials, "low", "benefit.income", { asOf: "2026-10" }),
      ],
      unknowns: ["unknown.prices", "unknown.soilDepth", "unknown.fieldHistory"],
      checkLocally: isCurrent ? ["check.rotationRule", "check.adviser"] : ["check.buyer", "check.seed", "check.adviser"],
    },
  };
};

const bundle = {
  economics,
  // The field, what the satellites see and its year come from the team's field.json (scripts/real-field.mjs).
  field: realField.field,
  lastCrop: realField.lastCrop,
  findings: realField.findings,
  year: realField.year,
  options: [
    option("chickpea-durum-durum", ["chickpea", "durum", "durum"], false, "low", 40, "medium",
      scores([0.8, 0.7, 0.75, 0.1], [0.75, 0.75, 0.75, 0.1], [0.6, 0.8, 0.75, 0.1]), ["cereal-machinery"], ["no-buyer", "broomrape"], true),
    option("faba-durum-faba", ["faba", "durum", "faba"], false, "medium", 60, "medium",
      scores([0.7, 0.5, 0.9, 0.3], [0.6, 0.45, 0.9, 0.3], [0.45, 0.4, 0.9, 0.3]), [], ["no-buyer", "broomrape"], true),
    option("vetch-oat-durum-durum", ["vetch-oat", "durum", "durum"], false, "low", 30, "low",
      scores([0.45, 0.8, 0.7, 0.95], [0.5, 0.85, 0.7, 0.95], [0.55, 0.9, 0.7, 0.9]), [], ["no-buyer"], true),
    option("durum-durum-durum", ["durum", "durum", "durum"], true, "medium", 0, "high",
      scores([0.55, 0.4, 0.2, 0.05], [0.4, 0.35, 0.2, 0.05], [0.25, 0.3, 0.2, 0.05]), [], [], false),
  ],
};

mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/genzano-demo.json", JSON.stringify(bundle, null, 2) + "\n");
console.log("wrote public/data/genzano-demo.json");
