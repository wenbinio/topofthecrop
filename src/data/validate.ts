import type { FieldBundle } from "./types";
import { CHECK_WINDOWS, CLIMATE_SCENARIOS, CROPS, FIELD_DATA_KEYS, LIMITS, PRIORITIES, SCENARIOS } from "./types";

function check(condition: unknown, path: string): asserts condition {
  if (!condition) throw new Error(`bundle: ${path}`);
}
function object(value: unknown, path: string): Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), path);
  return value as Record<string, unknown>;
}
function array(value: unknown, path: string, count?: number | [number, number]): unknown[] {
  check(Array.isArray(value), path);
  if (Array.isArray(count)) check(value.length >= count[0] && value.length <= count[1], path);
  else check(count === undefined || value.length === count, path);
  return value;
}

/** How many options a bundle may hold, the current rotation included. */
export const OPTION_COUNT: [number, number] = [3, 12];
function string(value: unknown, path: string): void { check(typeof value === 'string', path); }
function boolean(value: unknown, path: string): void { check(typeof value === 'boolean', path); }
function number(value: unknown, path: string): asserts value is number {
  check(typeof value === 'number' && Number.isFinite(value), path);
}
function known(value: unknown, values: readonly string[], path: string): void {
  check(typeof value === 'string' && values.includes(value), path);
}
function strings(value: unknown, path: string, allowed?: readonly string[]): void {
  array(value, path).forEach(item => allowed ? known(item, allowed, path) : string(item, path));
}
function source(value: unknown, path: string): void {
  const record = object(value, path);
  for (const key of ['dataset', 'resolution', 'url']) string(record[key], `${path}.${key}`);
}
function fact(value: unknown, path: string): void {
  const record = object(value, path);
  if (typeof record.value !== 'string') number(record.value, `${path}.value`);
  known(record.scale, ['field', 'area'], `${path}.scale`);
  source(record.source, `${path}.source`);
  known(record.confidence, ['good', 'fair', 'low'], `${path}.confidence`);
  boolean(record.placeholder, `${path}.placeholder`);
  if (record.range !== undefined) array(record.range, `${path}.range`, 2).forEach(n => number(n, `${path}.range`));
  for (const key of ['unit', 'asOf', 'label']) if (record[key] !== undefined) string(record[key], `${path}.${key}`);
}

/** A group of numeric facts named by `keys`. A key not in `keys` fails; a missing one is fine (no data). */
function factGroup(value: unknown, path: string, keys: readonly string[]): void {
  const group = object(value, path);
  for (const [key, item] of Object.entries(group)) {
    known(key, keys, `${path}.${key}`);
    fact(item, `${path}.${key}`);
    number(object(item, `${path}.${key}`).value, `${path}.${key}.value`);
  }
}

/** `bundle.fieldData`: the rest of the data team's figures (src/data/field-rules.js `fieldData`). */
function checkFieldData(value: unknown): void {
  const data = object(value, 'fieldData');
  for (const group of ['greenness', 'weather', 'water', 'soil', 'land'] as const) {
    factGroup(data[group], `fieldData.${group}`, FIELD_DATA_KEYS[group]);
  }
  const by2050 = object(data.by2050, 'fieldData.by2050');
  for (const scenario of CLIMATE_SCENARIOS) factGroup(by2050[scenario], `fieldData.by2050.${scenario}`, FIELD_DATA_KEYS.by2050);
  const seasons = object(data.seasons, 'fieldData.seasons');
  const years = array(seasons.years, 'fieldData.seasons.years');
  years.forEach(year => { number(year, 'fieldData.seasons.years'); check(Number.isInteger(year), 'fieldData.seasons.years'); });
  for (const [key, item] of Object.entries(object(seasons.series, 'fieldData.seasons.series'))) {
    const path = `fieldData.seasons.series.${key}`, series = object(item, path);
    known(key, FIELD_DATA_KEYS.series, path);
    // One value per season, null where there is none: never a missing season, never a bare 0 for no data.
    array(series.values, `${path}.values`, years.length).forEach(v => { if (v !== null) number(v, `${path}.values`); });
    known(series.scale, ['field', 'area'], `${path}.scale`);
    source(series.source, `${path}.source`);
    known(series.confidence, ['good', 'fair', 'low'], `${path}.confidence`);
    boolean(series.placeholder, `${path}.placeholder`);
    string(series.label, `${path}.label`);
    if (series.unit !== undefined) string(series.unit, `${path}.unit`);
  }
  if (data.groundCheck !== undefined) {
    const groundCheck = object(data.groundCheck, 'fieldData.groundCheck');
    for (const [kind, ours] of [['rain', 'satellites'], ['temperature', 'era5Land']] as const) {
      array(groundCheck[kind], `fieldData.groundCheck.${kind}`).forEach((value, i) => {
        const path = `fieldData.groundCheck.${kind}[${i}]`, row = object(value, path);
        string(row.season, `${path}.season`);
        known(row.window, CHECK_WINDOWS, `${path}.window`);
        for (const key of ['station', ours]) {
          fact(row[key], `${path}.${key}`);
          number(object(row[key], `${path}.${key}`).value, `${path}.${key}.value`);
        }
      });
    }
  }
  if (data.trialSoil !== undefined) factGroup(data.trialSoil, 'fieldData.trialSoil', FIELD_DATA_KEYS.trialSoil);
}

/**
 * Checks a parsed JSON value against the data contract and returns it typed.
 * Throws `Error("bundle: <what is wrong>")` on the first problem found.
 */
export function validateBundle(json: unknown): FieldBundle {
  const bundle = object(json, 'bundle');
  const field = object(bundle.field, 'field');
  string(field.id, 'field.id'); string(field.name, 'field.name');
  number(field.areaHa, 'field.areaHa'); check(field.areaHa > 0, 'field.areaHa');
  const outline = object(field.outline, 'field.outline');
  check(outline.type === 'Polygon', 'field.outline.type');
  const rings = array(outline.coordinates, 'field.outline.coordinates');
  check(rings.length > 0, 'field.outline.coordinates');
  rings.forEach(value => {
    const ring = array(value, 'field.outline.ring');
    check(ring.length >= 4, 'field.outline.ring');
    ring.forEach(value => {
      const position = array(value, 'field.outline.position');
      check(position.length >= 2, 'field.outline.position');
      position.forEach(n => number(n, 'field.outline.position'));
    });
  });
  const lastCrop = object(bundle.lastCrop, 'lastCrop');
  known(lastCrop.crop, CROPS, 'lastCrop.crop'); source(lastCrop.source, 'lastCrop.source');
  array(bundle.findings, 'findings', 3).forEach((value, i) => {
    const path = `findings[${i}]`, finding = object(value, path);
    string(finding.title, `${path}.title`); string(finding.detail, `${path}.detail`);
    fact(finding.fact, `${path}.fact`);
    const signals = object(finding.signals, `${path}.signals`);
    for (const key of ['greenness', 'temperature', 'waterUse']) {
      known(signals[key], ['rising', 'falling', 'normal', 'no-data'], `${path}.signals.${key}`);
    }
    boolean(finding.weatherDriven, `${path}.weatherDriven`); strings(finding.addressedBy, `${path}.addressedBy`);
    if (finding.expectedBare !== undefined) boolean(finding.expectedBare, `${path}.expectedBare`);
  });
  const year = object(bundle.year, 'year');
  array(year.months, 'year.months', 12).forEach((value, i) => {
    const path = `year.months[${i}]`, month = object(value, path);
    known(month.cover, ['green', 'part', 'bare'], `${path}.cover`);
    strings(month.risks, `${path}.risks`, ['dry', 'frost', 'heat', 'rain']);
  });
  if (year.risksByScenario !== undefined) {
    const byScenario = object(year.risksByScenario, 'year.risksByScenario');
    for (const scenario of SCENARIOS) {
      if (byScenario[scenario] === undefined) continue;
      array(byScenario[scenario], `year.risksByScenario.${scenario}`, 12)
        .forEach(risks => strings(risks, `year.risksByScenario.${scenario}`, ['dry', 'frost', 'heat', 'rain']));
    }
  }
  const hotDays = object(year.hotDays, 'year.hotDays');
  for (const scenario of SCENARIOS) {
    const path = `year.hotDays.${scenario}`, weather = object(hotDays[scenario], path);
    fact(weather.now, `${path}.now`); fact(weather.by2050, `${path}.by2050`);
  }
  if (year.flowerHigh !== undefined) {
    const high = object(year.flowerHigh, 'year.flowerHigh');
    for (const key of ['now', 'by2050']) {
      fact(high[key], `year.flowerHigh.${key}`);
      number(object(high[key], `year.flowerHigh.${key}`).value, `year.flowerHigh.${key}.value`);
    }
  }
  const ids = new Set<string>();
  let currentCount = 0;
  const usedCrops = new Set<string>();
  array(bundle.options, 'options', OPTION_COUNT).forEach((value, i) => {
    const path = `options[${i}]`, option = object(value, path);
    string(option.id, `${path}.id`);
    check(!ids.has(option.id as string), `${path}.id must be unique`); ids.add(option.id as string);
    boolean(option.isCurrent, `${path}.isCurrent`);
    if (option.isCurrent) currentCount++;
    array(option.sequence, `${path}.sequence`, 3).forEach(crop => {
      known(crop, CROPS, `${path}.sequence`);
      usedCrops.add(crop as string);
    });
    number(option.firstHarvestYear, `${path}.firstHarvestYear`);
    check(Number.isInteger(option.firstHarvestYear), `${path}.firstHarvestYear`);
    const facts = object(option.facts, `${path}.facts`);
    for (const key of ['income', 'water', 'nitrogen', 'risk']) fact(facts[key], `${path}.facts.${key}`);
    const scores = object(option.scores, `${path}.scores`);
    for (const scenario of SCENARIOS) {
      const row = object(scores[scenario], `${path}.scores.${scenario}`);
      for (const priority of PRIORITIES) {
        const score = row[priority];
        number(score, `${path}.scores.${scenario}.${priority}`);
        check(score >= 0 && score <= 1, `${path}.scores.${scenario}.${priority}`);
      }
    }
    strings(option.removedBy, `${path}.removedBy`, LIMITS); strings(option.flaggedBy, `${path}.flaggedBy`, LIMITS);
    boolean(option.supportTag, `${path}.supportTag`);
    const why = object(option.why, `${path}.why`);
    string(why.suggested, `${path}.why.suggested`);
    for (const key of ['evidence', 'benefits']) array(why[key], `${path}.why.${key}`).forEach(value => fact(value, `${path}.why.${key}`));
    strings(why.unknowns, `${path}.why.unknowns`); strings(why.checkLocally, `${path}.why.checkLocally`);
  });
  check(currentCount === 1, 'options.isCurrent must identify exactly one option');
  if (bundle.fieldData !== undefined) checkFieldData(bundle.fieldData);
  if (bundle.economics !== undefined) {
    const economics = object(bundle.economics, 'economics');
    const crops = object(economics.crops, 'economics.crops');
    // Every crop an option grows needs its figures; crops no option grows may be left out.
    for (const crop of Object.keys(crops)) known(crop, CROPS, `economics.crops.${crop}`);
    for (const crop of usedCrops) check(crops[crop] !== undefined, `economics.crops.${crop} is used by an option but missing`);
    for (const crop of Object.keys(crops)) {
      const path = `economics.crops.${crop}`, record = object(crops[crop], path);
      for (const key of ['yield', 'price', 'costs']) {
        fact(record[key], `${path}.${key}`);
        number(object(record[key], `${path}.${key}`).value, `${path}.${key}.value`);
      }
      if (record.durumAfter !== undefined) {
        const lifts = array(record.durumAfter, `${path}.durumAfter`);
        check(lifts.length >= 1 && lifts.length <= 2, `${path}.durumAfter must hold one or two facts`);
        lifts.forEach((lift, i) => {
          fact(lift, `${path}.durumAfter[${i}]`);
          number(object(lift, `${path}.durumAfter[${i}]`).value, `${path}.durumAfter[${i}].value`);
        });
      }
    }
    const supportIds = new Set<string>();
    array(economics.support, 'economics.support').forEach((value, i) => {
      const path = `economics.support[${i}]`, item = object(value, path);
      string(item.id, `${path}.id`);
      check(!supportIds.has(item.id as string), `${path}.id must be unique`);
      supportIds.add(item.id as string);
      for (const key of ['name', 'condition']) {
        const text = object(item[key], `${path}.${key}`);
        for (const lang of ['en', 'it']) string(text[lang], `${path}.${key}.${lang}`);
      }
      known(item.level, ['eu', 'italy', 'basilicata'], `${path}.level`);
      fact(item.amount, `${path}.amount`);
      number(object(item.amount, `${path}.amount`).value, `${path}.amount.value`);
      strings(item.crops, `${path}.crops`, CROPS);
      strings(item.options, `${path}.options`, [...ids]);
      boolean(item.defaultOn, `${path}.defaultOn`);
    });
  }
  return json as FieldBundle;
}

/**
 * Fetches `${import.meta.env.BASE_URL}data/<fieldId>.json` and validates it.
 * Rejects with an Error if the file is missing, is not JSON, or fails validation.
 */
export async function loadBundle(fieldId: string): Promise<FieldBundle> {
  // On a stalled rural signal a fetch can hang for minutes; give up so the screen can offer a retry.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUNDLE_TIMEOUT_MS);
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${encodeURIComponent(fieldId)}.json`, { signal: controller.signal });
    if (!response.ok) throw new Error(`bundle: request failed (${response.status})`);
    return validateBundle(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

export const BUNDLE_TIMEOUT_MS = 8000;
