// Where the Settings screen lives and how a link into it says where the farmer came from. Kept apart from the
// screen itself, so the top bar, voice and other screens can link to Settings without loading it.
// Written with AI assistance (Claude, Anthropic).

export const SETTINGS_PATH = "/settings";

/** Router state given to every link into Settings, so its Back link knows where the farmer was. */
export type SettingsFrom = { from?: string };

/** The router `state` for a link into Settings from `pathname` (kept when already there). */
/** The link keys that hold the farmer's own figures: `m` (prices, costs, yields, the yield lift, payments) and `x` (payments they added). */
const FIGURE_KEYS = ["m", "x"] as const;

/**
 * The query `to` with the figures of `from` (a Settings link) carried over, or null when they already match. Used when
 * the farmer goes back from Settings to the screen before it (`KeepFiguresOnBack`). A figure reset in Settings is
 * dropped from `to` as well.
 */
export function carryFigures(from: string, to: string): string | null {
  const source = new URLSearchParams(from);
  const target = new URLSearchParams(to);
  let changed = false;
  for (const key of FIGURE_KEYS) {
    const value = source.get(key);
    if (value === target.get(key)) continue;
    if (value === null) target.delete(key);
    else target.set(key, value);
    changed = true;
  }
  if (!changed) return null;
  const query = target.toString();
  return query ? `?${query}` : "";
}

export function settingsFrom(pathname: string, current: unknown): SettingsFrom {
  if (pathname === SETTINGS_PATH) return { from: (current as SettingsFrom | null)?.from };
  return { from: pathname };
}
