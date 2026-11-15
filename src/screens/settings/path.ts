// Where the Settings screen lives and how a link into it says where the farmer came from. Kept apart from the
// screen itself, so the top bar, voice and other screens can link to Settings without loading it.
// Written with AI assistance (Claude, Anthropic).

export const SETTINGS_PATH = "/settings";

/** Router state given to every link into Settings, so its Back link knows where the farmer was. */
export type SettingsFrom = { from?: string };

/** The router `state` for a link into Settings from `pathname` (kept when already there). */
export function settingsFrom(pathname: string, current: unknown): SettingsFrom {
  if (pathname === SETTINGS_PATH) return { from: (current as SettingsFrom | null)?.from };
  return { from: pathname };
}
