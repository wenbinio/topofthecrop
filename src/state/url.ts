import type { AppState, Money } from "../data/types";
import type { LngLat } from "../data/types";
import { CROPS, DEFAULT_STATE, DEMO_FIELD_ID, LIMITS, PRIORITIES, SCENARIOS } from "../data/types";

/**
 * AppState to a query string (no leading "?"). Defaults are left out, so a fresh state encodes to "".
 * Parameter names: f field id, o outline, c last crop, l limits, p priorities, s scenario, v view, g language, m money.
 */
export function encodeState(state: AppState): string {
  const params = new URLSearchParams();
  if (state.fieldId === DEMO_FIELD_ID) params.set('f', state.fieldId);
  else if (state.outline) {
    const outline = parseOutline(state.outline.map(point => point.join(',')).join(';'));
    if (outline) params.set('o', outline.map(point => point.map(n => n.toFixed(5)).join(',')).join(';'));
  }
  if (state.lastCrop !== DEFAULT_STATE.lastCrop) params.set('c', state.lastCrop);
  if (state.limits.length) params.set('l', state.limits.join(','));
  if (state.priorities.length) params.set('p', state.priorities.join(','));
  if (state.scenario !== DEFAULT_STATE.scenario) params.set('s', state.scenario);
  if (state.view !== DEFAULT_STATE.view) params.set('v', state.view);
  if (state.lang !== DEFAULT_STATE.lang) params.set('g', state.lang);
  const money = Object.keys(state.money).sort().map(key => `${key}:${state.money[key]}`).join(';');
  if (money) params.set('m', money);
  return params.toString();
}

/**
 * A query string (with or without "?") to AppState. Never throws: anything missing,
 * unknown or malformed falls back to DEFAULT_STATE for that field.
 */
export function decodeState(query: string): AppState {
  const params = new URLSearchParams(query);
  const limits = (params.get('l') ?? '').split(',');
  const priorities = (params.get('p') ?? '').split(',');
  const fieldId = params.get('f') === DEMO_FIELD_ID ? DEMO_FIELD_ID : null;
  return {
    fieldId,
    outline: fieldId ? null : parseOutline(params.get('o') ?? ''),
    lastCrop: CROPS.find(crop => crop === params.get('c')) ?? DEFAULT_STATE.lastCrop,
    limits: LIMITS.filter(limit => limits.includes(limit)),
    priorities: [...new Set(priorities)].filter((priority): priority is AppState['priorities'][number] =>
      PRIORITIES.some(known => known === priority)).slice(0, 2),
    scenario: SCENARIOS.find(scenario => scenario === params.get('s')) ?? DEFAULT_STATE.scenario,
    view: params.get('v') === 'simple' ? 'simple' : DEFAULT_STATE.view,
    lang: params.get('g') === 'it' ? 'it' : DEFAULT_STATE.lang,
    money: parseMoney(params.get('m') ?? ''),
  };
}

function parseMoney(value: string): Money {
  const money: Money = {};
  let count = 0;
  for (const pair of value.split(';')) {
    const parts = pair.split(':');
    if (parts.length !== 2) continue;
    const [key, raw] = parts;
    if (!/^(p|s|on)\.[a-z0-9-]{1,32}$/.test(key) || !raw.trim()) continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0 || amount > 5000) continue;
    if (key.startsWith('on.') && amount !== 0 && amount !== 1) continue;
    money[key] = amount;
    if (++count === 40) break;
  }
  return money;
}

function parseOutline(value: string): LngLat[] | null {
  const points: LngLat[] = [];
  for (const position of value.split(';')) {
    const parts = position.split(',');
    if (parts.length !== 2 || parts.some(part => !part.trim())) continue;
    const [lon, lat] = parts.map(Number);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) continue;
    points.push([Number(lon.toFixed(5)), Number(lat.toFixed(5))]);
    if (points.length === 12) break;
  }
  return points.length >= 3 ? points : null;
}
