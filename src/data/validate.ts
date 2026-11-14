import type { FieldBundle } from "./types";
import { CROPS, LIMITS, PRIORITIES, SCENARIOS } from "./types";

function check(condition: unknown, path: string): asserts condition {
  if (!condition) throw new Error(`bundle: ${path}`);
}
function object(value: unknown, path: string): Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), path);
  return value as Record<string, unknown>;
}
function array(value: unknown, path: string, count?: number): unknown[] {
  check(Array.isArray(value), path);
  check(count === undefined || value.length === count, path);
  return value;
}
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
  });
  const year = object(bundle.year, 'year');
  array(year.months, 'year.months', 12).forEach((value, i) => {
    const path = `year.months[${i}]`, month = object(value, path);
    known(month.cover, ['green', 'part', 'bare'], `${path}.cover`);
    strings(month.risks, `${path}.risks`, ['dry', 'frost', 'heat', 'rain']);
  });
  const hotDays = object(year.hotDays, 'year.hotDays');
  for (const scenario of SCENARIOS) {
    const path = `year.hotDays.${scenario}`, weather = object(hotDays[scenario], path);
    fact(weather.now, `${path}.now`); fact(weather.by2050, `${path}.by2050`);
  }
  const ids = new Set<string>();
  let currentCount = 0;
  array(bundle.options, 'options', 4).forEach((value, i) => {
    const path = `options[${i}]`, option = object(value, path);
    string(option.id, `${path}.id`);
    check(!ids.has(option.id as string), `${path}.id must be unique`); ids.add(option.id as string);
    boolean(option.isCurrent, `${path}.isCurrent`);
    if (option.isCurrent) currentCount++;
    array(option.sequence, `${path}.sequence`, 3).forEach(crop => known(crop, CROPS, `${path}.sequence`));
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
  return json as FieldBundle;
}

/**
 * Fetches `${import.meta.env.BASE_URL}data/<fieldId>.json` and validates it.
 * Rejects with an Error if the file is missing, is not JSON, or fails validation.
 */
export async function loadBundle(fieldId: string): Promise<FieldBundle> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${encodeURIComponent(fieldId)}.json`);
  if (!response.ok) throw new Error(`bundle: request failed (${response.status})`);
  return validateBundle(await response.json());
}
