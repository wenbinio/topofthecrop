// The town search on step 1: the Photon lookup (`usePlaceSearch`), the box floating on the map and its results list.
// The typed text and whether the list is open stay with the screen, so they survive the box hiding while a finger traces.
// Written with AI assistance (Claude, Anthropic).
import { useEffect, useState } from "react";
import type { LngLat } from "../../data/types";
import { useT } from "../../i18n";
import { SearchIcon } from "../../components/Icons";

export type Place = { name: string; detail: string; at: LngLat };

export function usePlaceSearch(query: string) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [failed, setFailed] = useState(false);
  /** The query the current `places` answer, so Enter never flies to results for older text. */
  const [answered, setAnswered] = useState("");
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setPlaces(null);
      setFailed(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then((json: { features?: { geometry?: { coordinates?: number[] }; properties?: Record<string, string> }[] }) => {
          const list: Place[] = (json.features ?? [])
            .filter((f) => Array.isArray(f.geometry?.coordinates))
            .map((f) => {
              const p = f.properties ?? {};
              const c = f.geometry!.coordinates!;
              return {
                name: p.name ?? "",
                detail: [p.city, p.state, p.country].filter((x) => x && x !== p.name).join(", "),
                at: [c[0], c[1]] as LngLat,
              };
            });
          setPlaces(list);
          setAnswered(q);
          setFailed(false);
        })
        .catch((e: unknown) => {
          if ((e as { name?: string }).name === "AbortError") return;
          setPlaces(null);
          setFailed(true);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);
  return { places, failed, fresh: answered === query.trim() };
}

/** The search box. Enter flies to the first result, but only once the results answer the text in the box. */
export function TownSearchBox({
  query,
  onQuery,
  firstPlace,
  onPick,
}: {
  query: string;
  onQuery: (query: string) => void;
  firstPlace: Place | null;
  onPick: (place: Place) => void;
}) {
  const t = useT();
  return (
    <form
      role="search"
      className="flex items-center gap-2 px-3 h-12 bg-surface rounded-box shadow-float"
      onSubmit={(e) => {
        e.preventDefault();
        if (firstPlace) onPick(firstPlace);
      }}
    >
      <SearchIcon className="w-5 h-5 flex-none text-ink-soft" />
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={t("find.search")}
        aria-label={t("find.search")}
        className="flex-1 min-w-0 h-full bg-transparent outline-none text-body font-bold placeholder:text-ink-soft"
      />
    </form>
  );
}

/** The results under the box: the places found, "nothing found", or that the search failed. */
export function TownResults({
  places,
  failed,
  onPick,
}: {
  places: Place[] | null;
  failed: boolean;
  onPick: (place: Place) => void;
}) {
  const t = useT();
  return (
    <ul className="bg-surface rounded-box shadow-float overflow-hidden phone-land:max-h-48 phone-land:overflow-y-auto">
      {failed ? <li className="px-3 py-3 text-body">{t("find.searchError")}</li> : null}
      {places && places.length === 0 ? <li className="px-3 py-3 text-body">{t("find.searchNone")}</li> : null}
      {places?.map((p, i) => (
        <li key={i} className="border-t border-line first:border-t-0">
          <button type="button" className="w-full min-h-12 px-3 py-2 text-left" onClick={() => onPick(p)}>
            <span className="block font-bold text-body">{p.name}</span>
            {p.detail ? <span className="block text-small text-ink-soft">{p.detail}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
