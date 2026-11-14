import type { Limit } from "../data/types";
import { LIMITS } from "../data/types";

/** The limits with one switched on or off, kept in LIMITS order (as the link stores them). */
export function setLimit(limits: Limit[], limit: Limit, on: boolean): Limit[] {
  const next = on ? [...limits, limit] : limits.filter((l) => l !== limit);
  return LIMITS.filter((l) => next.includes(l));
}

/** Tapping a limit: on if it was off, off if it was on. */
export function toggleLimit(limits: Limit[], limit: Limit): Limit[] {
  return setLimit(limits, limit, !limits.includes(limit));
}
