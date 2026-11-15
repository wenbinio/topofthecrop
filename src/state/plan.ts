// The farmer's plan, kept on this phone so the app has something to say when they come back: which rotation
// was the best fit, on which data, which checks they have ticked. Nothing here leaves the phone. The app has no
// server, so it cannot alert a closed phone: the comparison runs when the farmer opens "Your field today".
import type { AppState } from "../data/types";
import { DEFAULT_STATE } from "../data/types";
import { decodeState, encodeState } from "./url";

export type SavedPlan = {
  /** The link's query, to reopen the plan as the farmer left it (language and view included). */
  query: string;
  /** The same without language and view: two plans are the same plan when this matches. */
  key: string;
  /** The best-fit rotation when the plan was saved or last acknowledged; null when nothing ranked. */
  bestId: string | null;
  /** The fingerprint of the app's data then (src/data/fresh.ts); "" in development. */
  stamp: string;
  /** YYYY-MM-DD, when the plan was saved or last acknowledged. */
  savedAt: string;
  /** The field's name, for the welcome-back card. */
  field: string;
  /** The checks the farmer has ticked, by dictionary key. */
  done: string[];
};

export const PLAN_STORAGE_KEY = "topofthecrop.plan.v1";

/** What identifies a plan: the field and the answers, not the language or the text size. */
export function planKey(state: AppState): string {
  return encodeState({ ...state, lang: DEFAULT_STATE.lang, view: DEFAULT_STATE.view });
}

const isText = (value: unknown): value is string => typeof value === "string";

/** The saved plan, or null when there is none, storage is blocked, or what is there is not a plan. */
export function readPlan(): SavedPlan | null {
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as Partial<SavedPlan> | null;
    if (!plan || !isText(plan.query) || !isText(plan.key) || !isText(plan.stamp) || !isText(plan.field)) return null;
    if (!isText(plan.savedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(plan.savedAt)) return null;
    if (plan.bestId !== null && !isText(plan.bestId)) return null;
    const done = Array.isArray(plan.done) ? plan.done.filter(isText).slice(0, 40) : [];
    return { query: plan.query, key: plan.key, bestId: plan.bestId, stamp: plan.stamp, savedAt: plan.savedAt, field: plan.field, done };
  } catch {
    return null;
  }
}

/** Keeps the plan on this phone. Quietly does nothing where storage is blocked (private windows). */
export function writePlan(plan: SavedPlan): boolean {
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
    // Every plan kept also goes into the farmer's list of past plans.
    recordPlan({ query: plan.query, key: plan.key, bestId: plan.bestId, field: plan.field, savedAt: plan.savedAt });
    return true;
  } catch {
    return false;
  }
}

/**
 * "Save changes" on Settings: carries the farmer's prices, costs and payments into the plan kept on this phone,
 * so "Your field today" and "My plans" reopen with them. Only when the kept plan is this same field and these same
 * answers; the best fit, the data fingerprint and the date stay as they were, because figures do not change the
 * ranking. True when a kept plan was updated.
 */
export function keepFigures(state: AppState): boolean {
  const saved = readPlan();
  if (!saved) return false;
  const answers = (s: AppState) => planKey({ ...s, money: {}, extras: [] });
  if (answers(decodeState(saved.query)) !== answers(state)) return false;
  const key = planKey(state);
  // The list of past plans holds one entry per plan: drop the one with the old figures.
  if (key !== saved.key) removePlanRecord(saved.key);
  return writePlan({ ...saved, query: encodeState(state), key });
}

export function forgetPlan(): void {
  try {
    window.localStorage.removeItem(PLAN_STORAGE_KEY);
  } catch {
    /* nothing to forget */
  }
}

/**
 * What to tell a farmer who opens "Your field today":
 * - "first": nothing was kept for this plan (a first visit, or they changed the field or their answers);
 * - "same": same data, same best fit;
 * - "data": the app's data has changed since, and the best fit is the same;
 * - "advice": the best fit is no longer the one they left with. With unchanged answers only new data (or a new
 *   rule in the app) can do that.
 */
export type PlanChange = "first" | "same" | "data" | "advice";

export function planChange(saved: SavedPlan | null, now: { key: string; bestId: string | null; stamp: string }): PlanChange {
  if (!saved || saved.key !== now.key) return "first";
  if (saved.bestId !== now.bestId) return "advice";
  return saved.stamp !== now.stamp ? "data" : "same";
}

/** YYYY-MM-DD in the phone's own time zone. */
export function dayStamp(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/** Where this calendar month sits in the bundle's twelve months, which start in October. */
export function monthIndex(date: Date): number {
  return (date.getMonth() + 3) % 12;
}

/** One kept plan in the farmer's list of past plans ("My plans"). */
export type PlanRecord = { query: string; key: string; bestId: string | null; field: string; savedAt: string };

export const PLANS_STORAGE_KEY = "topofthecrop.plans.v1";
/** How many past plans are kept; the oldest go first. */
export const PLANS_KEPT = 20;

/** The kept plans, newest first; empty when there are none or storage is blocked. */
export function readPlans(): PlanRecord[] {
  try {
    const raw = window.localStorage.getItem(PLANS_STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (p): p is PlanRecord =>
        !!p && isText(p.query) && isText(p.key) && isText(p.field) && isText(p.savedAt) && /^\d{4}-\d{2}-\d{2}$/.test(p.savedAt) && (p.bestId === null || isText(p.bestId)),
    );
  } catch {
    return [];
  }
}

function writePlans(list: PlanRecord[]): void {
  try {
    window.localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(list.slice(0, PLANS_KEPT)));
  } catch {
    /* storage blocked: the list simply stays empty */
  }
}

/** Adds a plan to the list, or moves it to the top with its new date and best fit when the same answers were kept before. */
export function recordPlan(plan: PlanRecord): void {
  writePlans([plan, ...readPlans().filter((p) => p.key !== plan.key)]);
}

export function removePlanRecord(key: string): void {
  writePlans(readPlans().filter((p) => p.key !== key));
}
