import type { AppState, CropId, ExtraSupport, LastCrop, Money } from "../data/types";
import type { LngLat } from "../data/types";
import { CROPS, DEFAULT_STATE, DEMO_FIELD_ID, EXTRA_LIMITS, LAST_CROP_NAME_MAX, LIMITS, MAX_EXTRAS, PRIORITIES, SCENARIOS } from "../data/types";

/**
 * AppState to a query string (no leading "?"). Defaults are left out, so a fresh state encodes to "".
 * Parameter names: f field id, o outline, c last crop (a crop id or "other"), cn its typed name (only with c=other), l limits, p priorities, s scenario, v view, g language, m money,
 * x added payments (`name~amount~crop,crop` joined by `|`, the name percent-encoded).
 */
export function encodeState(state: AppState): string {
  const params = new URLSearchParams();
  if (state.fieldId === DEMO_FIELD_ID) params.set('f', state.fieldId);
  else if (state.outline) {
    const outline = parseOutline(state.outline.map(point => point.join(',')).join(';'));
    if (outline) params.set('o', outline.map(point => point.map(n => n.toFixed(5)).join(',')).join(';'));
  }
  if (state.lastCrop !== DEFAULT_STATE.lastCrop) params.set('c', state.lastCrop);
  const name = lastCropName(state.lastCrop, state.lastCropName);
  if (name) params.set('cn', name);
  if (state.limits.length) params.set('l', state.limits.join(','));
  if (state.priorities.length) params.set('p', state.priorities.join(','));
  if (state.scenario !== DEFAULT_STATE.scenario) params.set('s', state.scenario);
  if (state.view !== DEFAULT_STATE.view) params.set('v', state.view);
  if (state.lang !== DEFAULT_STATE.lang) params.set('g', state.lang);
  const money = Object.keys(state.money).sort().map(key => `${key}:${state.money[key]}`).join(';');
  if (money) params.set('m', money);
  const extras = state.extras.slice(0, MAX_EXTRAS).map(extra =>
    `${encodeName(extra.name)}~${extra.amount}~${extra.crops.join(',')}`).join('|');
  if (extras) params.set('x', extras);
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
  const c = params.get('c');
  const lastCrop: LastCrop = c === 'other' ? 'other' : CROPS.find(crop => crop === c) ?? DEFAULT_STATE.lastCrop;
  return {
    fieldId,
    outline: fieldId ? null : parseOutline(params.get('o') ?? ''),
    lastCrop,
    lastCropName: lastCropName(lastCrop, params.get('cn') ?? ''),
    limits: LIMITS.filter(limit => limits.includes(limit)),
    priorities: [...new Set(priorities)].filter((priority): priority is AppState['priorities'][number] =>
      PRIORITIES.some(known => known === priority)).slice(0, 2),
    scenario: SCENARIOS.find(scenario => scenario === params.get('s')) ?? DEFAULT_STATE.scenario,
    view: params.get('v') === 'simple' ? 'simple' : DEFAULT_STATE.view,
    lang: params.get('g') === 'it' ? 'it' : DEFAULT_STATE.lang,
    money: parseMoney(params.get('m') ?? ''),
    extras: parseExtras(params.get('x') ?? ''),
  };
}

/** The typed name of an "other" last crop: trimmed, at most LAST_CROP_NAME_MAX characters; "" for any other last crop. */
export function lastCropName(lastCrop: LastCrop, name: string): string {
  return lastCrop === 'other' ? name.trim().slice(0, LAST_CROP_NAME_MAX).trim() : '';
}

/** encodeURIComponent leaves `~` alone, and `~` separates the parts of an item. */
function encodeName(name: string): string {
  return encodeURIComponent(name).replace(/~/g, '%7E');
}

function parseExtras(value: string): ExtraSupport[] {
  const extras: ExtraSupport[] = [];
  if (!value) return extras;
  for (const item of value.split('|')) {
    const parts = item.split('~');
    if (parts.length !== 3) continue;
    let name: string;
    try {
      name = decodeURIComponent(parts[0]).trim();
    } catch {
      continue;
    }
    if (name.length < 1 || name.length > EXTRA_LIMITS.name) continue;
    if (!parts[1].trim()) continue;
    const amount = Number(parts[1]);
    if (!Number.isFinite(amount) || amount < EXTRA_LIMITS.amount[0] || amount > EXTRA_LIMITS.amount[1]) continue;
    const listed = parts[2] ? parts[2].split(',') : [];
    const crops: CropId[] = CROPS.filter(crop => listed.includes(crop));
    // A list of only unknown crops would otherwise widen the payment to every year.
    if (listed.length && !crops.length) continue;
    extras.push({ name, amount, crops });
    if (extras.length === MAX_EXTRAS) break;
  }
  return extras;
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
