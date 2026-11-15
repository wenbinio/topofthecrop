// Writes public/data/genzano-demo.json, the one file the app reads.
// Real: the field, what the satellites see, its year and the evidence (from field.json via real-field.mjs),
//       the researched support (docs/support-and-prices.md) and every crop's yield, price, direct costs,
//       nitrogen left, water need, machinery, buyer and broomrape status (docs/crops-research.md, "In the app").
// Derived here, by the rules written beside them: each rotation's facts, limits and priority scores.
// Still our judgement, so still marked placeholder: each rotation's risk.
// Run: node scripts/make-placeholder-bundle.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { realField } from "./real-field.mjs";

const fact = (value, unit, range, scale, source, confidence, label, extra = {}) => ({
  value, ...(unit ? { unit } : {}), ...(range ? { range } : {}), scale, source, confidence, label, placeholder: true, ...extra,
});

const researched = (value, unit, range, source, confidence, asOf, placeholder = false) =>
  fact(value, unit, range, 'area', source, confidence, undefined, { asOf, placeholder });

const money = {
  foggia: { dataset: 'National durum price list and Foggia exchange', resolution: 'regional market', url: 'https://www.fg.camcom.it/' },
  hay: { dataset: 'Hay quotes from northern exchanges (no southern quote found)', resolution: 'other regions', url: 'https://www.bo.camcom.gov.it/' },
  agea: { dataset: 'AGEA payment circulars, CAP 2023-2027', resolution: 'national', url: 'https://www.agea.gov.it/' },
  masaf: { dataset: 'MASAF decrees and AGEA instructions', resolution: 'national', url: 'https://www.masaf.gov.it/' },
  csr: { dataset: 'CSR Basilicata 2023-2027', resolution: 'regional', url: 'https://basilicatacsr.it/' },
  research: { dataset: 'Crop research, Nov 2026', resolution: 'southern Italy', url: '' },
  lago: { dataset: 'Lago-Olveira et al. 2023, wheat after chickpea, Puglia', resolution: 'one study', url: 'https://www.sciencedirect.com/science/article/pii/S0048969723037476' },
  garofalo: { dataset: 'Garofalo et al. 2009, wheat after faba bean, Foggia (53-year simulation)', resolution: 'one study', url: 'https://publish.csiro.au/cp/cp08208' },
};

// YIELD LIFT: how much more grain durum gives after a legume, in percent, for the first durum harvest after it
// and (where the study gives one) a second durum in a row. Taken from the team's research compilation, which
// cites these papers; we have not opened the papers ourselves, so confidence is low. The chickpea study worked
// with wheat at 5 t/ha, well above this area's 3 t/ha, so the percentage may not carry over. No figure was found
// for lentil, pea or vetch, so they get none: that is a gap in the evidence, not a finding that they give nothing.
const DURUM_AFTER = {
  chickpea: { percents: [16, 10], source: money.lago },
  faba: { percents: [12], source: money.garofalo },
};
const durumAfter = (crop) => DURUM_AFTER[crop]?.percents.map((percent) =>
  researched(percent, '%', undefined, DURUM_AFTER[crop].source, 'low', '2026-11'));
/** The same rule as yieldLift in src/money/money.ts. */
const liftAt = (sequence, i) => {
  if (sequence[i] !== 'durum' || i === 0) return 0;
  const first = DURUM_AFTER[sequence[i - 1]]?.percents[0];
  if (first !== undefined) return first;
  if (i >= 2 && sequence[i - 1] === 'durum') return DURUM_AFTER[sequence[i - 2]]?.percents[1] ?? 0;
  return 0;
};

// --- crops: docs/crops-research.md, "In the app" ----------------------------------------------
// [value, low, high] for yield t/ha, price €/t, direct costs €/ha and nitrogen left kg N/ha (null: none left).
// water: low | medium | high. machinery: "yes" | "low-cut" | "side-knives" | "hay" (mower, rake, baler).
// buyer: "yes" | "limited" | "contract" (contract only). broomrape host: "yes" | "partly" | "no".
const CROP_TABLE = {
  durum:       { y: [3.0, 2.0, 4.0], p: [290, 255, 337],  c: [685, 600, 900], n: null,         water: 'medium', machinery: 'yes',         buyer: 'yes',      broomrape: 'no',     confidence: 'fair' },
  chickpea:    { y: [1.4, 0.8, 2.2], p: [700, 500, 950],  c: [540, 480, 750], n: [20, 15, 40], water: 'low',    machinery: 'yes',         buyer: 'limited',  broomrape: 'partly', confidence: 'low' },
  faba:        { y: [2.0, 1.2, 3.0], p: [255, 240, 275],  c: [500, 450, 650], n: [35, 30, 60], water: 'medium', machinery: 'yes',         buyer: 'yes',      broomrape: 'yes',    confidence: 'low' },
  'vetch-oat': { y: [4.5, 2.5, 7.0], p: [120, 80, 150],   c: [485, 350, 600], n: [20, 10, 40], water: 'low',    machinery: 'hay',         buyer: 'limited',  broomrape: 'partly', confidence: 'low' },
  lentil:      { y: [1.0, 0.5, 1.8], p: [780, 700, 1000], c: [510, 450, 700], n: [20, 15, 35], water: 'low',    machinery: 'low-cut',     buyer: 'yes',      broomrape: 'yes',    confidence: 'low' },
  pea:         { y: [2.2, 1.0, 3.0], p: [270, 240, 300],  c: [545, 450, 650], n: [25, 20, 40], water: 'medium', machinery: 'yes',         buyer: 'limited',  broomrape: 'yes',    confidence: 'low' },
  barley:      { y: [3.0, 2.0, 4.0], p: [190, 170, 200],  c: [585, 520, 800], n: null,         water: 'low',    machinery: 'yes',         buyer: 'yes',      broomrape: 'no',     confidence: 'low' },
  rapeseed:    { y: [2.0, 1.0, 3.0], p: [500, 400, 565],  c: [590, 500, 750], n: null,         water: 'medium', machinery: 'side-knives', buyer: 'contract', broomrape: 'no',     confidence: 'low' },
  coriander:   { y: [1.3, 0.6, 2.0], p: [575, 450, 800],  c: [460, 400, 650], n: null,         water: 'low',    machinery: 'yes',         buyer: 'contract', broomrape: 'partly', confidence: 'low' },
};
// The four crops the app had before keep the price sources researched for them (docs/support-and-prices.md).
const PRICE_SOURCE = { durum: money.foggia, chickpea: money.foggia, faba: money.foggia, 'vetch-oat': money.hay };

const cropFact = (crop, [value, low, high], unit, source = money.research) =>
  researched(value, unit, [low, high], source, CROP_TABLE[crop].confidence, '2026-11');

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
    condition: { en: "Chickpea, faba bean, lentil or pea grown to full ripeness.", it: "Cece, favino, lenticchia o pisello coltivati fino a maturazione piena." },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'good', '2025'), crops: ['chickpea', 'faba', 'lentil', 'pea'], options: [],
  },
  {
    id: 'coupled-oilseeds', level: 'italy', defaultOn: true,
    name: { en: "Coupled oilseeds", it: "Accoppiato oleaginose" },
    condition: { en: "For oilseed crops. Uses the 2023 payment rate.", it: "Per colture oleaginose. Importo del 2023." },
    amount: researched(98, '€/ha', [80, 98], money.agea, 'fair', '2023'), crops: ['rapeseed'], options: [],
  },
  {
    id: 'eco-rotation', level: 'eu', defaultOn: true,
    name: { en: "Eco-scheme 4: legume rotation", it: "Eco-schema 4: rotazione leguminosa" },
    condition: { en: "About 60 €/ha in eligible years (about 2 of 3). No legume herbicides or pesticides; residues worked in.",
      it: "Circa 60 €/ha anni validi (circa 2 su 3). No diserbi o fitofarmaci su legume; residui interrati." },
    amount: researched(40, '€/ha', [37, 72], money.agea, 'low', '2025'), crops: [],
    options: ['chickpea-durum-durum', 'faba-durum-faba', 'lentil-durum-durum', 'pea-durum-durum'],
  },
  {
    id: 'eco-rotation-forage', level: 'eu', defaultOn: false,
    name: { en: "Eco-scheme 4: vetch-oat year", it: "Eco-schema 4: anno veccia-avena" },
    condition: { en: "Sources disagree if vetch-oat before durum counts. Ask your adviser.",
      it: "Fonti discordi se veccia-avena prima del grano duro valga. Chiedi al tecnico." },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [], options: ['vetch-oat-durum-durum'],
  },
  {
    id: 'eco-rotation-renewal', level: 'eu', defaultOn: false,
    name: { en: "Eco-scheme 4: renewal crop", it: "Eco-schema 4: coltura da rinnovo" },
    condition: { en: "Only if rapeseed or coriander count as renewal crops. Ask your CAA office.",
      it: "Solo se colza o coriandolo valgono come colture da rinnovo. Chiedi al tuo CAA." },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [],
    options: ['rapeseed-durum-durum', 'coriander-durum-durum'],
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

const economics = {
  crops: Object.fromEntries(Object.entries(CROP_TABLE).map(([crop, row]) => [crop, {
    yield: cropFact(crop, row.y, 't/ha'),
    price: cropFact(crop, row.p, '€/t', PRICE_SOURCE[crop]),
    costs: cropFact(crop, row.c, '€/ha'),
    ...(DURUM_AFTER[crop] ? { durumAfter: durumAfter(crop) } : {}),
  }])),
  support,
};

// --- rotations --------------------------------------------------------------------------------
const CURRENT_ID = 'durum-durum-durum';
const RANK = { good: 3, fair: 2, low: 1 };
const weakest = (list) => list.reduce((a, b) => (RANK[b] < RANK[a] ? b : a), 'good');
const mean = (list) => list.reduce((sum, n) => sum + n, 0) / list.length;
const round3 = (n) => Math.round(n * 1000) / 1000;
const clamp01 = (n) => Math.max(0, Math.min(1, n));

// The same rule as src/money/money.ts: both lists must allow the year (an empty list allows all).
const appliesTo = (item, id, crop) => (!item.options.length || item.options.includes(id)) && (!item.crops.length || item.crops.includes(crop));
const paymentsFor = (id, crop) => support.filter((item) => item.defaultOn && appliesTo(item, id, crop));

const DRY = { drier: { low: 0.95, medium: 0.85, high: 0.7 }, 'much-drier': { low: 0.85, medium: 0.65, high: 0.45 } };
const WATER = { low: 0.9, medium: 0.55, high: 0.2 };

const option = (id, sequence, checkLocally) => {
  const isCurrent = id === CURRENT_ID;
  const first = CROP_TABLE[sequence[0]];
  const hasHay = sequence.some((crop) => CROP_TABLE[crop].machinery === 'hay');

  // Income: the mean over the three years of yield (with any lift after a legume) × price − direct costs
  // + default-on support, the sum the app does.
  // Its range is a poor year to a good year: every crop at the low (high) end of its yield, at the usual price
  // and costs. Stacking the worst price and cost on top gave a range too wide to mean anything.
  const yearMoney = (crop, end, i) => {
    const row = CROP_TABLE[crop];
    const at = (triple, high) => (end === 'mid' ? triple[0] : high ? triple[2] : triple[1]);
    const high = end === 'high';
    return at(row.y, high) * (1 + liftAt(sequence, i) / 100) * row.p[0] - row.c[0] +
      paymentsFor(id, crop).reduce((sum, item) => sum + item.amount.value, 0);
  };
  const income = Math.round(mean(sequence.map((crop, i) => yearMoney(crop, 'mid', i))));
  const incomeRange = ['low', 'high'].map((end) => Math.round(mean(sequence.map((crop, i) => yearMoney(crop, end, i))) / 10) * 10);
  // Its confidence: the weakest of the price, yield and cost facts of its crops and of the default-on support it gets.
  // The app works this out again (src/money/money.ts) so it follows the farmer's own figures.
  const incomeConfidence = weakest([
    ...sequence.flatMap((crop) => ['yield', 'price', 'costs'].map((key) => economics.crops[crop][key].confidence)),
    // Payments made on every rotation alike are left out: they cannot change which option is better.
    ...sequence.flatMap((crop) => paymentsFor(id, crop).filter((item) => item.crops.length > 0 || item.options.length > 0)
      .map((item) => item.amount.confidence)),
  ]);

  // Nitrogen: what the first crop leaves for the next (0 for cereals, rapeseed, coriander and the current rotation).
  const n = !isCurrent && first.n ? first.n : null;
  // Water: the first crop's water need.
  // Risk (our judgement, so it stays a placeholder): high for the current rotation; medium when the first crop
  // is a broomrape host ("yes") or sold on contract only; else low.
  const risk = isCurrent ? 'high' : first.broomrape === 'yes' || first.buyer === 'contract' ? 'medium' : 'low';

  // Limits. Flags: cereal-machinery for lentil (low cut) and rapeseed (side knives), where a special header is
  // advised; no-buyer when the first crop's buyer is limited or contract only; broomrape when it is a host (yes or
  // partly). Removal: cereal-machinery for a hay crop (vetch-oat needs a mower, rake and baler).
  // The current rotation has none.
  const flaggedBy = [];
  const removedBy = [];
  if (!isCurrent) {
    if (first.machinery === 'low-cut' || first.machinery === 'side-knives') flaggedBy.push('cereal-machinery');
    if (first.buyer === 'limited' || first.buyer === 'contract') flaggedBy.push('no-buyer');
    if (first.broomrape === 'yes' || first.broomrape === 'partly') flaggedBy.push('broomrape');
    if (hasHay) removedBy.push('cereal-machinery');
  }

  // Scores, 0 to 1, per slider stop:
  //   income  income / 1000 × a dry-year factor: the mean over the three crops of
  //           low water 0.95 / 0.85, medium 0.85 / 0.65, high 0.7 / 0.45 (drier / much drier); 1 in a normal year.
  //   water   the mean over the three crops of low 0.9, medium 0.55, high 0.2; the same at every stop.
  //   soil    0.2 + (nitrogen left, summed over the three crops) / 75, plus 0.1 if any crop is not durum; at most 0.95.
  //   forage  0.95 with a hay crop, 0.3 with faba or pea, else 0.05.
  const needs = sequence.map((crop) => CROP_TABLE[crop].water);
  const nitrogenSum = sequence.reduce((sum, crop) => sum + (CROP_TABLE[crop].n?.[0] ?? 0), 0);
  const soil = Math.min(0.95, 0.2 + nitrogenSum / 75 + (sequence.some((crop) => crop !== 'durum') ? 0.1 : 0));
  const forage = hasHay ? 0.95 : sequence.some((crop) => crop === 'faba' || crop === 'pea') ? 0.3 : 0.05;
  const row = (factor) => ({
    income: round3(clamp01((income / 1000) * factor)),
    water: round3(mean(needs.map((need) => WATER[need]))),
    soil: round3(soil),
    forage,
  });
  const scores = {
    normal: row(1),
    drier: row(mean(needs.map((need) => DRY.drier[need]))),
    'much-drier': row(mean(needs.map((need) => DRY['much-drier'][need]))),
  };

  // Support tag: a default-on payment, other than basic income and the redistributive payment, that this
  // option gets and durum on durum does not. (Coupled durum support comes with every rotation here, so counting
  // it would tag them all, the current one included.)
  const currentGets = new Set(paymentsFor(CURRENT_ID, 'durum').map((item) => item.id));
  const supportTag = !isCurrent && sequence.some((crop) => paymentsFor(id, crop).some((item) =>
    item.id !== 'basic-income' && item.id !== 'redistributive' && !currentGets.has(item.id)));

  const research = (value, unit, range, confidence, label, placeholder = false) =>
    fact(value, unit, range, 'area', money.research, confidence, label, { asOf: '2026-11', placeholder });
  const incomeFact = (label) => research(income, '€/ha', incomeRange, incomeConfidence, label);
  const nitrogenFact = (label) => research(n ? n[0] : 0, 'kg N/ha', n ? [n[1], n[2]] : undefined, isCurrent ? 'fair' : first.confidence, label);

  return {
    id, isCurrent, sequence, firstHarvestYear: 2027,
    facts: {
      income: incomeFact('fact.income'),
      water: research(first.water, undefined, undefined, first.confidence, 'fact.water'),
      nitrogen: nitrogenFact('fact.nitrogen'),
      risk: research(risk, undefined, undefined, 'low', 'fact.risk', true),
    },
    scores, removedBy, flaggedBy, supportTag,
    why: {
      suggested: `why.${id}.suggested`,
      evidence: realField.evidence,
      benefits: [nitrogenFact('benefit.nitrogen'), incomeFact('benefit.income')],
      unknowns: ['unknown.prices', 'unknown.soilDepth', 'unknown.fieldHistory'],
      checkLocally: checkLocally ?? (isCurrent ? ['check.rotationRule', 'check.adviser'] : ['check.buyer', 'check.seed', 'check.adviser']),
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
    option('chickpea-durum-durum', ['chickpea', 'durum', 'durum']),
    option('faba-durum-faba', ['faba', 'durum', 'faba']),
    option('vetch-oat-durum-durum', ['vetch-oat', 'durum', 'durum']),
    option('durum-durum-durum', ['durum', 'durum', 'durum']),
    option('lentil-durum-durum', ['lentil', 'durum', 'durum'], ['check.seed', 'check.adviser']),
    option('pea-durum-durum', ['pea', 'durum', 'durum']),
    option('barley-durum-durum', ['barley', 'durum', 'durum'], ['check.seed', 'check.adviser']),
    option('rapeseed-durum-durum', ['rapeseed', 'durum', 'durum'], ['check.contract', 'check.seed', 'check.adviser']),
    option('coriander-durum-durum', ['coriander', 'durum', 'durum'], ['check.contract', 'check.seed', 'check.adviser']),
  ],
  // The rest of the team's figures for the field, for the evidence screens (also from field.json).
  fieldData: realField.fieldData,
};

mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/genzano-demo.json", JSON.stringify(bundle, null, 2) + "\n");
console.log("wrote public/data/genzano-demo.json");
