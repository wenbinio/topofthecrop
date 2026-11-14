// Writes public/data/genzano-demo.json with made-up placeholder figures.
// The data phase replaces this file with real numbers in the same shape (see src/data/types.ts).
// Run: node scripts/make-placeholder-bundle.mjs
import { mkdirSync, writeFileSync } from "node:fs";

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

const economicFact = (value, unit, source = src.trials) =>
  fact(value, unit, undefined, 'area', source, 'low', undefined, { asOf: '2026-10' });
const supportSource = { dataset: 'Italian CAP Strategic Plan 2023–2027 (to be confirmed)', resolution: 'national', url: '' };

// PLACEHOLDER SUPPORT: the research track replaces this array with confirmed policy figures.
const support = [
  {
    id: 'basic-income', level: 'eu', defaultOn: true,
    name: { en: 'Basic income support', it: 'Sostegno di base al reddito' },
    condition: { en: 'Paid on eligible hectares with entitlements.', it: 'Pagato sugli ettari ammissibili con titoli.' },
    amount: economicFact(160, '€/ha', supportSource), crops: [], options: [],
  },
  {
    id: 'coupled-durum', level: 'italy', defaultOn: true,
    name: { en: 'Coupled support for durum wheat', it: 'Sostegno accoppiato grano duro' },
    condition: { en: 'Durum wheat in central and southern Italy, certified seed.', it: 'Grano duro nel Centro-Sud, seme certificato.' },
    amount: economicFact(95, '€/ha', supportSource), crops: ['durum'], options: [],
  },
  {
    id: 'coupled-legumes', level: 'italy', defaultOn: true,
    name: { en: 'Coupled support for grain legumes', it: 'Sostegno accoppiato leguminose da granella' },
    condition: { en: 'Grain legumes harvested as dry grain.', it: 'Leguminose raccolte a granella secca.' },
    amount: economicFact(60, '€/ha', supportSource), crops: ['chickpea', 'faba'], options: [],
  },
  {
    id: 'eco-rotation', level: 'eu', defaultOn: true,
    name: { en: 'Eco-scheme: rotation with legumes or forage', it: 'Eco-schema: avvicendamento con leguminose o foraggere' },
    condition: { en: 'Needs a legume or forage in the rotation; limits on chemicals in that year.',
      it: "Serve una leguminosa o foraggera in rotazione; limiti ai prodotti chimici in quell'anno." },
    amount: economicFact(110, '€/ha', supportSource), crops: [],
    options: ['chickpea-durum-durum', 'faba-durum-faba', 'vetch-oat-durum-durum'],
  },
];

const cropEconomics = (yieldPerHa, price, costs) => ({
  yield: economicFact(yieldPerHa, 't/ha'), price: economicFact(price, '€/t'), costs: economicFact(costs, '€/ha'),
});
const economics = {
  crops: {
    durum: cropEconomics(3.0, 320, 620),
    chickpea: cropEconomics(1.6, 650, 520),
    faba: cropEconomics(2.2, 330, 430),
    'vetch-oat': cropEconomics(5.5, 120, 380),
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
      evidence: [
        fact(4, "months", [3, 5], "field", src.landsat, "fair", "evidence.bareMonths"),
        fact(9, "days", [4, 15], "area", src.power, "fair", "evidence.hotDays"),
      ],
      benefits: [
        fact(nitrogen, "kg N/ha", [Math.max(0, nitrogen - 20), nitrogen + 20], "area", src.trials, "low", "benefit.nitrogen"),
        fact(income, "€/ha", incomeRange, "area", src.trials, "low", "benefit.income", { asOf: "2026-10" }),
      ],
      unknowns: ["unknown.prices", "unknown.soilDepth", "unknown.fieldHistory"],
      checkLocally: isCurrent ? ["check.adviser"] : ["check.buyer", "check.seed", "check.adviser"],
    },
  };
};

const bundle = {
  economics,
  field: {
    id: "genzano-demo",
    name: "Genzano di Lucania",
    areaHa: 6,
    // Placeholder outline east of the town; the data phase replaces it with the real field.
    outline: {
      type: "Polygon",
      coordinates: [[[16.06, 40.862], [16.0637, 40.8624], [16.0634, 40.8642], [16.0598, 40.8637], [16.06, 40.862]]],
    },
  },
  lastCrop: { crop: "durum", source: src.cropmap },
  findings: [
    {
      title: "finding.bare.title", detail: "finding.bare.detail",
      fact: fact(4, "months", [3, 5], "field", src.landsat, "fair", "finding.bare.fact"),
      // Bare soil after harvest looks like decline to a satellite; expectedBare says it is not.
      signals: { greenness: "falling", temperature: "rising", waterUse: "falling" },
      weatherDriven: false,
      expectedBare: true,
      addressedBy: ["vetch-oat-durum-durum", "faba-durum-faba"],
    },
    {
      title: "finding.heat.title", detail: "finding.heat.detail",
      fact: fact(9, "days", [4, 15], "area", src.power, "fair", "finding.heat.fact"),
      signals: { greenness: "normal", temperature: "rising", waterUse: "falling" },
      weatherDriven: true,
      addressedBy: ["chickpea-durum-durum", "vetch-oat-durum-durum"],
    },
    {
      title: "finding.dry.title", detail: "finding.dry.detail",
      fact: fact(-18, "%", [-30, -5], "area", src.gpm, "fair", "finding.dry.fact"),
      signals: { greenness: "normal", temperature: "normal", waterUse: "falling" },
      weatherDriven: true,
      addressedBy: ["chickpea-durum-durum", "faba-durum-faba"],
    },
  ],
  year: {
    // October first
    months: [
      { cover: "bare", risks: ["dry"] }, { cover: "part", risks: ["rain"] }, { cover: "part", risks: [] },
      { cover: "green", risks: ["frost"] }, { cover: "green", risks: [] }, { cover: "green", risks: ["frost"] },
      { cover: "green", risks: [] }, { cover: "green", risks: ["heat"] }, { cover: "part", risks: ["heat"] },
      { cover: "bare", risks: [] }, { cover: "bare", risks: [] }, { cover: "bare", risks: ["rain"] },
    ],
    // Risk icons for the slider's other two stops (the first stop uses `months`). October first.
    risksByScenario: {
      drier: [["dry"], ["dry"], [], ["frost"], [], [], [], ["heat"], ["heat"], [], [], ["rain"]],
      "much-drier": [["dry"], ["dry"], ["dry"], [], [], [], ["heat"], ["heat"], ["heat"], [], [], ["rain"]],
    },
    hotDays: {
      normal: { now: fact(9, "days", [4, 15], "area", src.power, "fair", "year.hotNow"), by2050: fact(17, "days", [11, 24], "area", src.cmip6, "low", "year.hot2050") },
      drier: { now: fact(12, "days", [6, 19], "area", src.power, "fair", "year.hotNow"), by2050: fact(21, "days", [14, 29], "area", src.cmip6, "low", "year.hot2050") },
      "much-drier": { now: fact(16, "days", [9, 24], "area", src.power, "fair", "year.hotNow"), by2050: fact(27, "days", [18, 36], "area", src.cmip6, "low", "year.hot2050") },
    },
  },
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
