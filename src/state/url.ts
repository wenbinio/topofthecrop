import type { AppState } from "../data/types";

/**
 * AppState to a query string (no leading "?"). Defaults are left out, so a fresh state encodes to "".
 * Parameter names: f field id, o outline, c last crop, l limits, p priorities, s scenario, v view, g language.
 */
export function encodeState(_state: AppState): string {
  throw new Error("not implemented");
}

/**
 * A query string (with or without "?") to AppState. Never throws: anything missing,
 * unknown or malformed falls back to DEFAULT_STATE for that field.
 */
export function decodeState(_query: string): AppState {
  throw new Error("not implemented");
}
