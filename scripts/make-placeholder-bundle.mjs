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
    name: { en: 'Basic income support', it: "Sostegno base al reddito" },
    condition: { en: "It depends on your entitlements and varies by farm. Enter your figure.",
      it: "Dipende dai tuoi titoli e cambia da un'azienda all'altra. Metti la tua cifra." },
    amount: researched(170, '€/ha', [140, 250], money.agea, 'low', '2025'), crops: [], options: [],
  },
  {
    id: 'redistributive', level: 'eu', defaultOn: true,
    name: { en: 'Redistributive payment', it: 'Sostegno ridistributivo' },
    condition: { en: "Paid on the first 14 ha, for farms up to 50 ha.", it: "Vale sui primi 14 ha, solo per le aziende fino a 50 ha." },
    amount: researched(90, '€/ha', [80, 90], money.agea, 'good', '2025'), crops: [], options: [],
  },
  {
    id: 'coupled-durum', level: 'italy', defaultOn: true,
    name: { en: "Coupled durum support", it: "Accoppiato per il grano duro" },
    condition: { en: "For durum in Centre-South Italy, grown to full ripeness with certified seed.",
      it: "È per il grano duro del Centro-Sud, portato a maturazione piena con seme certificato." },
    amount: researched(103, '€/ha', [84, 103], money.agea, 'good', '2025'), crops: ['durum'], options: [],
  },
  {
    id: 'coupled-legumes', level: 'italy', defaultOn: true,
    name: { en: "Coupled grain legumes", it: "Accoppiato leguminose da granella" },
    condition: { en: "Paid on chickpea, faba bean, lentil or pea grown to full ripeness.", it: "Lo prendi su cece, favino, lenticchia o pisello portati fino a maturazione piena." },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'good', '2025'), crops: ['chickpea', 'faba', 'lentil', 'pea'], options: [],
  },
  {
    id: 'coupled-oilseeds', level: 'italy', defaultOn: true,
    name: { en: "Coupled oilseeds", it: "Accoppiato per le oleaginose" },
    condition: { en: "Applies to oilseed crops, using the 2023 payment rate.", it: "Va alle colture oleaginose; l'importo è quello del 2023." },
    amount: researched(98, '€/ha', [80, 98], money.agea, 'fair', '2023'), crops: ['rapeseed'], options: [],
  },
  {
    id: 'eco-rotation', level: 'eu', defaultOn: true,
    name: { en: "Eco-scheme 4: legume rotation", it: "Eco-schema 4: rotazione con leguminosa" },
    condition: { en: "Pays about 60 €/ha in the years that qualify (about 2 out of 3). You cannot use herbicides or pesticides on the legume, and you have to work the residues into the soil.",
      it: "Dà circa 60 €/ha negli anni validi, circa 2 su 3. Non puoi usare diserbi o fitofarmaci sulla leguminosa, e devi interrare i residui." },
    amount: researched(40, '€/ha', [37, 72], money.agea, 'low', '2025'), crops: [],
    options: ['chickpea-durum-durum', 'faba-durum-faba', 'lentil-durum-durum', 'pea-durum-durum'],
  },
  {
    id: 'eco-rotation-forage', level: 'eu', defaultOn: false,
    name: { en: "Eco-scheme 4: vetch-oat year", it: "Eco-schema 4: anno di veccia-avena" },
    condition: { en: "Sources disagree on whether vetch-oat before durum counts. Ask your adviser.",
      it: "Le fonti non concordano sul fatto che la veccia-avena prima del grano duro valga. Chiedi al tecnico." },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [], options: ['vetch-oat-durum-durum'],
  },
  {
    id: 'eco-rotation-renewal', level: 'eu', defaultOn: false,
    name: { en: "Eco-scheme 4: renewal crop", it: "Eco-schema 4: coltura da rinnovo" },
    condition: { en: "You get this only if rapeseed or coriander count as renewal crops. Ask your CAA office.",
      it: "Lo prendi solo se colza o coriandolo valgono come colture da rinnovo. Chiedi al tuo CAA." },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [],
    options: ['rapeseed-durum-durum', 'coriander-durum-durum'],
  },
  {
    // Two researchers (Gemini Hydrogen, working from search excerpts of the decree and AGEA's instructions, not the
    // documents themselves) both found that strips can keep this payment if each strip is declared as its own
    // parcel. Nobody on the team has checked, so it is off until the farmer's CAA office says yes.
    id: 'eco-rotation-strips', level: 'eu', defaultOn: false,
    name: { en: "Eco-scheme 4: strips", it: "Eco-schema 4: a strisce" },
    condition: { en: "Applies only if each strip is declared as its own parcel and no herbicide or pesticide touches the legume strip. Ask your CAA office.",
      it: "Vale solo se dichiari ogni striscia come appezzamento a sé e nessun diserbo o fitofarmaco tocca la striscia di leguminosa. Chiedi al tuo CAA." },
    amount: researched(40, '€/ha', [0, 72], money.agea, 'low', '2025'), crops: [],
    options: ['strips-chickpea-durum', 'strips-faba-durum'],
  },
  {
    id: 'coupled-forage-legume', level: 'italy', defaultOn: false,
    name: { en: "Coupled legume forage", it: "Accoppiato erbaio di leguminose" },
    condition: { en: "Paid only if vetch makes up most of the mix and stays until flowering starts.",
      it: "Prendi l'aiuto solo se nell'erbaio prevale la veccia e resta in campo fino all'inizio della fioritura." },
    amount: researched(44, '€/ha', [29, 44], money.agea, 'fair', '2025'), crops: ['vetch-oat'], options: [],
  },
  {
    id: 'durum-fund', level: 'italy', defaultOn: false,
    name: { en: 'Durum wheat fund', it: 'Fondo grano duro' },
    condition: { en: "Needs a supply contract of at least 3 years and certified seed. Covers up to 50 ha, and the payout is cut if too many apply.",
      it: "Serve un contratto di filiera di almeno 3 anni e seme certificato. Copre fino a 50 ha; se arrivano troppe domande, l'importo viene tagliato." },
    amount: researched(100, '€/ha', [0, 200], money.masaf, 'fair', '2026'), crops: ['durum'], options: [],
  },
  {
    id: 'legume-fund', level: 'italy', defaultOn: false,
    name: { en: "Legume sovereignty fund", it: "Fondo sovranità per le leguminose" },
    condition: { en: "Needs a 3-year supply contract and pays on the legume hectares above the 3-year average. Caps at 250 €/ha, and is cut if too many apply.",
      it: "Ci vuole un contratto di filiera di 3 anni, e paga gli ettari a leguminose sopra la media dei 3 anni. Al massimo dà 250 €/ha; se ci sono troppe domande, viene tagliato." },
    amount: researched(200, '€/ha', [0, 250], money.masaf, 'low', '2026'), crops: ['chickpea', 'faba'], options: [],
  },
  {
    id: 'no-till', level: 'basilicata', defaultOn: false,
    name: { en: 'No-till sowing (SRA03)', it: 'Semina su sodo (SRA03)' },
    condition: { en: "Requires 5 years of no-till sowing across all crops. The 2026 call is closed.",
      it: "Ti impegni per 5 anni a seminare su sodo su tutte le colture. Il bando 2026 è chiuso." },
    amount: researched(300, '€/ha', [300, 300], money.csr, 'fair', '2026'), crops: [], options: [],
  },
  {
    id: 'integrated', level: 'basilicata', defaultOn: false,
    name: { en: 'Integrated production (SRA01)', it: 'Produzione integrata (SRA01)' },
    condition: { en: "Requires 5 years following the regional integrated production rules. You cannot combine it with organic on the same field.",
      it: "Devi seguire per 5 anni le regole regionali della produzione integrata. Non puoi prenderlo insieme al biologico sullo stesso campo." },
    amount: researched(171, '€/ha', [114, 171], money.csr, 'fair', '2026'), crops: [], options: [],
  },
  {
    id: 'organic', level: 'basilicata', defaultOn: false,
    name: { en: "Organic (SRA29)", it: "Biologico (SRA29)" },
    condition: { en: "Requires 5 years of certified organic farming. Sources disagree on the arable rate, and the last call closed in May 2025.",
      it: "Serve il biologico certificato per 5 anni. Le fonti non concordano sul premio per i seminativi, e l'ultimo bando ha chiuso a maggio 2025." },
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

// STRIP INTERCROPS: `strips` is a second sequence grown beside the first, each on half the field in strips wide
// enough for the drill and the combine, swapped every year (so each strip is durum after a legume, or the legume).
// Each strip is an ordinary sole crop, so nothing new is assumed: every figure below is the plain average of the
// two sequences, and no gain or loss from growing them side by side is counted. This is the app's stand-in for
// intercropping until a true mixture has figures of its own (docs/crops-research.md, "Intercropping").
const THIRST = { low: 0, medium: 1, high: 2 };
const option = (id, sequence, checkLocally, strips) => {
  const isCurrent = id === CURRENT_ID;
  const grown = strips ? [sequence, strips] : [sequence];
  const firsts = grown.map((seq) => CROP_TABLE[seq[0]]);
  const first = firsts[0];
  const allCrops = grown.flat();
  const hasHay = allCrops.some((crop) => CROP_TABLE[crop].machinery === 'hay');

  // Income: the mean over the three years of yield (with any lift after a legume) × price − direct costs
  // + default-on support, the sum the app does.
  // Its range is a poor year to a good year: every crop at the low (high) end of its yield, at the usual price
  // and costs. Stacking the worst price and cost on top gave a range too wide to mean anything.
  const yearMoney = (seq, crop, end, i) => {
    const row = CROP_TABLE[crop];
    const at = (triple, high) => (end === 'mid' ? triple[0] : high ? triple[2] : triple[1]);
    const high = end === 'high';
    return at(row.y, high) * (1 + liftAt(seq, i) / 100) * row.p[0] - row.c[0] +
      paymentsFor(id, crop).reduce((sum, item) => sum + item.amount.value, 0);
  };
  // The mean over the three years, and for strips over the two halves of the field.
  const perYear = (end) => mean(grown.map((seq) => mean(seq.map((crop, i) => yearMoney(seq, crop, end, i)))));
  const income = Math.round(perYear('mid'));
  const incomeRange = ['low', 'high'].map((end) => Math.round(perYear(end) / 10) * 10);
  // Its confidence: the weakest of the price, yield and cost facts of its crops and of the default-on support it gets.
  // The app works this out again (src/money/money.ts) so it follows the farmer's own figures.
  const incomeConfidence = weakest([
    ...allCrops.flatMap((crop) => ['yield', 'price', 'costs'].map((key) => economics.crops[crop][key].confidence)),
    // The lift after a legume counts too where it is used (as incomeConfidence in src/money/money.ts does).
    ...grown.flatMap((seq) => seq.flatMap((crop, i) => (liftAt(seq, i) ? ['low'] : []))),
    // Payments made on every rotation alike are left out: they cannot change which option is better.
    ...allCrops.flatMap((crop) => paymentsFor(id, crop).filter((item) => item.crops.length > 0 || item.options.length > 0)
      .map((item) => item.amount.confidence)),
  ]);

  // Nitrogen: what the first crop leaves for the next (0 for cereals, rapeseed, coriander and the current rotation).
  // For strips: per hectare of the whole field, so the average of the two first crops (durum leaves none).
  const stripN = strips && firsts.some((crop) => crop.n) ? [0, 1, 2].map((k) => Math.round(mean(firsts.map((crop) => crop.n?.[k] ?? 0)))) : null;
  const n = isCurrent ? null : strips ? stripN : first.n ? first.n : null;
  // Water: the first crop's water need; for strips, the thirstier of the two first crops.
  const water = firsts.reduce((a, b) => (THIRST[b.water] > THIRST[a.water] ? b : a)).water;
  // Risk (our judgement, so it stays a placeholder): high for the current rotation; medium when a first crop
  // is a broomrape host ("yes") or sold on contract only; else low.
  const risk = isCurrent ? 'high' : firsts.some((crop) => crop.broomrape === 'yes' || crop.buyer === 'contract') ? 'medium' : 'low';

  // Limits. Flags: cereal-machinery for lentil (low cut) and rapeseed (side knives), where a special header is
  // advised; no-buyer when the first crop's buyer is limited or contract only; broomrape when it is a host (yes or
  // partly). Removal: cereal-machinery for a hay crop (vetch-oat needs a mower, rake and baler).
  // The current rotation has none.
  const flaggedBy = [];
  const removedBy = [];
  if (!isCurrent) {
    if (firsts.some((crop) => crop.machinery === 'low-cut' || crop.machinery === 'side-knives')) flaggedBy.push('cereal-machinery');
    if (firsts.some((crop) => crop.buyer === 'limited' || crop.buyer === 'contract')) flaggedBy.push('no-buyer');
    if (firsts.some((crop) => crop.broomrape === 'yes' || crop.broomrape === 'partly')) flaggedBy.push('broomrape');
    if (hasHay) removedBy.push('cereal-machinery');
  }

  // Scores, 0 to 1, per slider stop:
  //   income  income / 1000 × a dry-year factor: the mean over the three crops of
  //           low water 0.95 / 0.85, medium 0.85 / 0.65, high 0.7 / 0.45 (drier / much drier); 1 in a normal year.
  //   water   the mean over the three crops of low 0.9, medium 0.55, high 0.2; the same at every stop.
  //   soil    0.2 + (nitrogen left, summed over the three crops) / 75, plus 0.1 if any crop is not durum; at most 0.95.
  //   forage  0.95 with a hay crop, 0.3 with faba or pea, else 0.05.
  //   For strips each of these is taken over both halves of the field: the means over all six crop-years, and
  //   the nitrogen summed per half and then averaged.
  const needs = allCrops.map((crop) => CROP_TABLE[crop].water);
  const nitrogenSum = mean(grown.map((seq) => seq.reduce((sum, crop) => sum + (CROP_TABLE[crop].n?.[0] ?? 0), 0)));
  const soil = Math.min(0.95, 0.2 + nitrogenSum / 75 + (allCrops.some((crop) => crop !== 'durum') ? 0.1 : 0));
  const forage = hasHay ? 0.95 : allCrops.some((crop) => crop === 'faba' || crop === 'pea') ? 0.3 : 0.05;
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
  const supportTag = !isCurrent && allCrops.some((crop) => paymentsFor(id, crop).some((item) =>
    item.id !== 'basic-income' && item.id !== 'redistributive' && !currentGets.has(item.id)));

  const research = (value, unit, range, confidence, label, placeholder = false) =>
    fact(value, unit, range, 'area', money.research, confidence, label, { asOf: '2026-11', placeholder });
  const incomeFact = (label) => research(income, '€/ha', incomeRange, incomeConfidence, label);
  const firstConfidence = weakest(firsts.map((crop) => crop.confidence));
  const nitrogenFact = (label) => research(n ? n[0] : 0, 'kg N/ha', n ? [n[1], n[2]] : undefined, isCurrent ? 'fair' : firstConfidence, label);

  return {
    id, isCurrent, sequence, ...(strips ? { strips } : {}), firstHarvestYear: 2027,
    facts: {
      income: incomeFact('fact.income'),
      water: research(water, undefined, undefined, firstConfidence, 'fact.water'),
      nitrogen: nitrogenFact('fact.nitrogen'),
      risk: research(risk, undefined, undefined, 'low', 'fact.risk', true),
    },
    scores, removedBy, flaggedBy, supportTag,
    why: {
      suggested: `why.${id}.suggested`,
      evidence: realField.evidence,
      benefits: [nitrogenFact('benefit.nitrogen'), incomeFact('benefit.income')],
      unknowns: [...(strips ? ['unknown.stripsGain', 'unknown.stripsRare'] : []), 'unknown.prices', 'unknown.soilDepth', 'unknown.fieldHistory'],
      checkLocally: checkLocally ?? (isCurrent ? ['check.rotationRule', 'check.adviser']
        : strips ? ['check.stripWidth', 'check.stripClaim', 'check.stripSpray', 'check.stripReturn', 'check.buyer', 'check.seed', 'check.adviser']
        : ['check.buyer', 'check.seed', 'check.adviser']),
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
    // Strip intercrops: half the field in each crop every year, the strips swapped the next year.
    option('strips-chickpea-durum', ['chickpea', 'durum', 'chickpea'], undefined, ['durum', 'chickpea', 'durum']),
    option('strips-faba-durum', ['faba', 'durum', 'faba'], undefined, ['durum', 'faba', 'durum']),
  ],
  // The rest of the team's figures for the field, for the evidence screens (also from field.json).
  fieldData: realField.fieldData,
};

mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/genzano-demo.json", JSON.stringify(bundle, null, 2) + "\n");
console.log("wrote public/data/genzano-demo.json");
