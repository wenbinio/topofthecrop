// The site's host hands out a data file from its cache for up to ten minutes after a new version is published,
// while the app's code is new at once. New code could then read old data. So every data file is asked for with a
// stamp of the data it was built with (set in vite.config.ts): when the data changes the address changes, and the
// cache cannot answer with the old file. Unchanged data keeps its address, so phones keep their saved copy.
// Written with AI assistance (Claude, Anthropic).

/** A short fingerprint of every data file shipped with this build; "" while developing and in tests. */
export const DATA_STAMP: string = __DATA_STAMP__;

/** `url` with the stamp added as `?v=`; unchanged when there is no stamp. */
export function stamped(url: string, stamp: string = DATA_STAMP): string {
  if (!stamp) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${stamp}`;
}
