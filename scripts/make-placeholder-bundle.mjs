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

// Yields and costs are still made-up placeholders. Prices and support come from the research in
// docs/support-and-prices.md (November 2026) and are marked by how well two independent researchers agreed.
const economicFact = (value, unit, source = src.trials) =>
  fact(value, unit, undefined, 'area', source, 'low', undefined, { asOf: '2026-10' });
const researched = (value, unit, range, source, confidence, asOf, placeholder = false) =>
  fact(value, unit, range, 'area', source, confidence, undefined, { asOf, placeholder });

const money = {
  foggia: { dataset: 'Foggia commodity exchange and national durum price list (CUN)', resolution: 'regional market', url: 'https://www.fg.camcom.it/' },
  hay: { dataset: 'Hay quotes from northern exchanges (no southern quote found)', resolution: 'other regions', url: 'https://www.bo.camcom.gov.it/' },
  agea: { dataset: 'AGEA payment circulars, CAP 2023-2027', resolution: 'national', url: 'https://www.agea.gov.it/' },
  masaf: { dataset: 'MASAF decrees and AGEA instructions', resolution: 'national', url: 'https://www.masaf.gov.it/' },
  csr: { dataset: 'CSR Basilicata 2023-2027', resolution: 'regional', url: 'https://basilicatacsr.it/' },
};

// SUPPORT: switched on by default only where the payment needs no extra commitment or contract.
const support = [
  {
    id: 'basic-income', level: 'eu', defaultOn: true,
    name: { en: 'Basic income support', it: 'Sostegno di base al reddito' },
    condition: { en: 'Paid on your own payment entitlements, so it differs for every farm. Put in your own figure.',
      it: 'Pagato sui tuoi titoli, quindi cambia da azienda ad azienda. Metti il tuo valore.' },
    amount: researched(170, '€/ha', [140, 250], money.agea, 'low', '2025'), crops: [], options: [],
  },
  {
    id: 'redistributive', level: 'eu', defaultOn: true,
    name: { en: 'Redistributive payment', it: 'Sostegno ridistributivo' },
    condition: { en: 'First 14 hectares of farms up to 50 hectares.', it: 'Primi 14 ettari delle aziende fino a 50 ettari.' },
    amount: researched(90, '€/ha', [80, 90], money.agea, 'good', '2025'), crops: [], options: [],
  },
  {
    id: 'coupled-durum', level: 'italy', defaultOn: true,
    name: { en: 'Coupled support for durum wheat', it: 'Sostegno accoppiato grano duro' },
    condition: { en: 'Durum in central and southern Italy, grown to full ripeness, with certified seed.',
      it: 'Grano duro nel Centro-Sud, portato a maturazione, con seme certificato.' },
    amount: researched(103, '€/ha', [84, 103], money.agea, 'good', '2025'), crops: ['durum'], options: [],
  },
  {
    id: 'coupled-legumes', level: 'italy', defaultOn: true,
    name: { en: 'Coupled support for grain legumes', it: 'Sostegno accoppiato leguminose da granella' },
    condition: { en: 'Chickpea or faba bean grown to full seed ripeness.', it: 'Cece o favino portati a maturazione piena del seme.' },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'good', '2025'), crops: ['chickpea', 'faba'], options: [],
  },
  {
    id: 'eco-rotation', level: 'eu', defaultOn: true,
    name: { en: 'Eco-scheme 4: rotation with a legume', it: 'Eco-schema 4: avvicendamento con leguminosa' },
    condition: { en: 'About 60 €/ha in the years that count, roughly two in three. No herbicides or pesticides on the legume; residues worked in.',
      it: 'Circa 60 €/ha negli anni che contano, più o meno due su tre. Niente diserbanti o fitofarmaci sulla leguminosa; residui interrati.' },
    amount: researched(40, '€/ha', [37, 72], money.agea, 'low', '2025'), crops: [],
    options: ['chickpea-durum-durum', 'faba-durum-faba'],
  },
  {
    id: 'eco-rotation-forage', level: 'eu', defaultOn: false,
    name: { en: 'Eco-scheme 4 with a vetch-oat year', it: 'Eco-schema 4 con un anno di veccia-avena' },
    condition: { en: 'Our sources disagree on whether one year of vetch-oat followed by durum counts. Ask your adviser.',
      it: 'Le nostre fonti non concordano: un anno di veccia-avena seguito da grano duro potrebbe non valere. Chiedi al tecnico.' },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [], options: ['vetch-oat-durum-durum'],
  },
  {
    id: 'coupled-forage-legume', level: 'italy', defaultOn: false,
    name: { en: 'Coupled support for a legume forage mix', it: 'Sostegno accoppiato erbaio di leguminose' },
    condition: { en: 'Only if vetch is the main plant in the mix and it stays until flowering starts.',
      it: 'Solo se la veccia prevale nel miscuglio e resta in campo fino a inizio fioritura.' },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'fair', '2025'), crops: ['vetch-oat'], options: [],
  },
  {
    id: 'durum-fund', level: 'italy', defaultOn: false,
    name: { en: 'Durum wheat fund', it: 'Fondo grano duro' },
    condition: { en: 'Needs a supply-chain contract of at least three years and certified seed. Up to 50 hectares; cut if too many apply.',
      it: 'Serve un contratto di filiera almeno triennale e seme certificato. Fino a 50 ettari; ridotto se le domande sono troppe.' },
    amount: researched(100, '€/ha', [0, 200], money.masaf, 'fair', '2026'), crops: ['durum'], options: [],
  },
  {
    id: 'legume-fund', level: 'italy', defaultOn: false,
    name: { en: 'Food-sovereignty fund for legumes', it: 'Fondo sovranità alimentare per le leguminose' },
    condition: { en: 'Needs a three-year supply-chain contract, and pays only on legume area above your three-year average. Up to 250 €/ha; cut if too many apply.',
      it: 'Serve un contratto di filiera triennale e paga solo la superficie a leguminose in più rispetto alla tua media di tre anni. Fino a 250 €/ha; ridotto se le domande sono troppe.' },
    amount: researched(200, '€/ha', [0, 250], money.masaf, 'low', '2026'), crops: ['chickpea', 'faba'], options: [],
  },
  {
    id: 'no-till', level: 'basilicata', defaultOn: false,
    name: { en: 'No-till sowing (SRA03)', it: 'Semina su sodo (SRA03)' },
    condition: { en: 'Five-year commitment to no-till on every crop. The 2026 call is closed.',
      it: 'Impegno di cinque anni alla semina su sodo su tutte le colture. Il bando 2026 è chiuso.' },
    amount: researched(300, '€/ha', [300, 300], money.csr, 'fair', '2026'), crops: [], options: [],
  },
  {
    id: 'integrated', level: 'basilicata', defaultOn: false,
    name: { en: 'Integrated production (SRA01)', it: 'Produzione integrata (SRA01)' },
    condition: { en: 'Five-year commitment to the regional integrated-production rules. Not together with organic on the same field.',
      it: 'Impegno di cinque anni ai disciplinari regionali di produzione integrata. Non insieme al biologico sullo stesso campo.' },
    amount: researched(171, '€/ha', [114, 171], money.csr, 'fair', '2026'), crops: [], options: [],
  },
  {
    id: 'organic', level: 'basilicata', defaultOn: false,
    name: { en: 'Organic farming (SRA29)', it: 'Agricoltura biologica (SRA29)' },
    condition: { en: 'Five years certified organic. Our sources disagree on the rate for arable land; the last call closed in May 2025.',
      it: 'Cinque anni di biologico certificato. Le nostre fonti non concordano sul premio per i seminativi; ultimo bando chiuso a maggio 2025.' },
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
      evidence: [
        fact(4, "months", [3, 5], "field", src.landsat, "fair", "evidence.bareMonths"),
        fact(9, "days", [4, 15], "area", src.power, "fair", "evidence.hotDays"),
      ],
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
  field: {
    id: "genzano-demo",
    name: "Genzano di Lucania",
    areaHa: 3.1,
    // Traced by eye from the aerial photo: a field east of the town, between a road, a hedge and a gully.
    // It is a real field shape but not one the team chose; replace it when the demo field is decided.
    outline: {
      type: "Polygon",
      coordinates: [[[16.05917, 40.86615], [16.06024, 40.86651], [16.0611, 40.86646], [16.06153, 40.8661], [16.0617, 40.86545],
        [16.06209, 40.8648], [16.06196, 40.86399], [16.05917, 40.86615]]],
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
