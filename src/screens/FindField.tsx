import { useEffect, useMemo, useRef, useState } from "react";
import type { LngLat } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { MAX_CORNERS, TRACE_CORNERS, round5 } from "../geo/edit";
import { areaHa, centroid, isUsableRing, pointInRing, simplifyRing } from "../geo/geometry";
import { useLang, useT } from "../i18n";
import { useAppState, useGo } from "../state/useAppState";
import { useDemoBundle } from "../components/BundleProvider";
import { loadBasinOutline } from "../data/basin";
import type { FeatureCollection } from "geojson";
import { formatNumber } from "../components/FactParts";
import { openRing } from "../components/FieldShape";
import { FieldScaleIcon, LocateIcon, PencilIcon, SearchIcon, WarnIcon } from "../components/Icons";
import Map from "../components/Map";
import type { EdgeRequest, MapTarget } from "../components/Map";
import { Button } from "../components/ui";

/** Where the map opens before the bundle arrives: the Genzano demo field. */
const DEMO_CENTRE: LngLat = [16.0928, 40.8234];
const OPEN_ZOOM = 15.5;

type Mode =
  | { k: "idle" }
  | { k: "demo" }
  /** Looking for the field's edges in the photo around a tap, before drawing. */
  | { k: "finding" }
  /**
   * Drawing the field: tap corners, pull dots, trace with one finger, or let the app find the edges.
   * `past` holds earlier shapes for Undo. `seeking`: the next tap is a point inside the field, not a corner.
   * `finding`: waiting for the edges found in the photo. `note` is a one-line message after something did not work.
   */
  | {
      k: "drawing";
      ring: LngLat[];
      past: LngLat[][];
      tracing: boolean;
      seeking: boolean;
      finding: boolean;
      note: Note;
    };
type Note = "tooSmall" | "max" | "noEdges" | null;

const startDrawing = (ring: LngLat[] = [], past: LngLat[][] = [], note: Note = null): Mode => ({
  k: "drawing",
  ring,
  past,
  tracing: false,
  seeking: false,
  finding: false,
  note,
});

const NOTE_KEY = { max: "find.maxCorners", tooSmall: "find.tooSmall", noEdges: "find.noEdges" } as const;

type Place = { name: string; detail: string; at: LngLat };

function usePlaceSearch(query: string) {
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

export default function FindField() {
  const t = useT();
  const lang = useLang();
  const go = useGo();
  const [state] = useAppState();
  const bundle = useDemoBundle();
  // The basin outline (10 kB): where full results exist. Without it the map simply shows no line.
  const [basinOutline, setBasinOutline] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    let live = true;
    loadBasinOutline().then(
      (fc) => live && setBasinOutline(fc),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  const [mode, setMode] = useState<Mode>(() =>
    // Coming back with a drawn field: open it ready to adjust.
    state.outline && isUsableRing(state.outline)
      ? startDrawing(state.outline)
      : state.fieldId === DEMO_FIELD_ID
        ? { k: "demo" }
        : { k: "idle" },
  );
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { places, failed, fresh } = usePlaceSearch(query);
  const [target, setTarget] = useState<MapTarget | null>(null);
  const [locError, setLocError] = useState(false);
  const targetKey = useRef(0);
  const [edgeRequest, setEdgeRequest] = useState<EdgeRequest | null>(null);
  const edgeKey = useRef(0);

  const demoRing = useMemo(
    () => (bundle.status === "ready" ? openRing(bundle.bundle.field.outline.coordinates) : null),
    [bundle],
  );
  // Coming back to step 1 with a field drawn elsewhere, open the map on that field, not on the demo.
  const centre = useMemo(
    () => (state.outline && isUsableRing(state.outline) ? centroid(state.outline) : demoRing ? centroid(demoRing) : DEMO_CENTRE),
    [demoRing, state.outline],
  );

  function flyTo(at: LngLat, zoom: number) {
    targetKey.current += 1;
    setTarget({ centre: at, zoom, key: targetKey.current });
  }

  /** Replace the shape being drawn, remembering the one before it for Undo. */
  function reshape(ring: LngLat[]) {
    setMode((m) =>
      m.k === "drawing" ? { ...m, ring, past: [...m.past, m.ring], tracing: false, seeking: false, note: null } : m,
    );
  }

  /** Ask the map to find the field's edges in the photo around `at`; the answer comes to `onEdges`. */
  function requestEdges(at: LngLat) {
    edgeKey.current += 1;
    setEdgeRequest({ at, key: edgeKey.current });
  }

  function onEdges(ring: LngLat[] | null) {
    setEdgeRequest(null);
    setMode((m) => {
      // Found from a tap before drawing: Undo clears it, leaving an empty shape to tap corners on.
      if (m.k === "finding") return ring ? startDrawing(ring, [[]]) : startDrawing([], [], "noEdges");
      if (m.k === "drawing" && m.finding) {
        return ring
          ? { ...m, ring, past: [...m.past, m.ring], finding: false, note: null }
          : { ...m, finding: false, note: "noEdges" };
      }
      // Cancelled meanwhile.
      return m;
    });
  }

  function onTap(point: LngLat) {
    if (mode.k === "finding") return;
    if (mode.k === "drawing") {
      if (mode.tracing || mode.finding) return;
      if (mode.seeking) {
        setMode({ ...mode, seeking: false, finding: true, note: null });
        requestEdges(point);
        return;
      }
      // Each tap on the map is the next corner of the field.
      if (mode.ring.length >= MAX_CORNERS) setMode({ ...mode, note: "max" });
      else reshape([...mode.ring, round5(point)]);
      return;
    }
    if (demoRing && pointInRing(point, demoRing)) setMode({ k: "demo" });
    else {
      setMode({ k: "finding" });
      requestEdges(point);
    }
  }

  /** "Find edges": re-fit the shape on screen from its centre, or with no shape yet, wait for a tap inside the field. */
  function findEdges() {
    if (mode.k !== "drawing") return;
    if (isUsableRing(mode.ring)) {
      setMode({ ...mode, tracing: false, seeking: false, finding: true, note: null });
      requestEdges(centroid(mode.ring));
    } else setMode({ ...mode, tracing: false, seeking: !mode.seeking, note: null });
  }

  function cancel() {
    setEdgeRequest(null);
    setMode({ k: "idle" });
  }

  function onTrace(points: LngLat[]) {
    const ring = simplifyRing(points, TRACE_CORNERS);
    if (isUsableRing(ring)) reshape(ring);
    else setMode((m) => (m.k === "drawing" ? { ...m, tracing: false, note: "tooSmall" } : m));
  }

  function undo() {
    setMode((m) =>
      m.k === "drawing" && m.past.length > 0
        ? { ...m, ring: m.past[m.past.length - 1], past: m.past.slice(0, -1), tracing: false, seeking: false, note: null }
        : m,
    );
  }

  function locate() {
    setLocError(false);
    if (!("geolocation" in navigator)) {
      setLocError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo([pos.coords.longitude, pos.coords.latitude], 16),
      () => setLocError(true),
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function chooseDemo() {
    go("/questions", {
      fieldId: DEMO_FIELD_ID,
      outline: null,
      // Pre-fill the last crop from the crop map on first choosing the field; keep the farmer's own answer after that.
      lastCrop: state.fieldId !== DEMO_FIELD_ID && bundle.status === "ready" ? bundle.bundle.lastCrop.crop : state.lastCrop,
    });
  }

  const drawing = mode.k === "drawing";
  const tracing = mode.k === "drawing" && mode.tracing;
  const drawn = mode.k === "drawing" ? mode.ring : null;
  const drawnOk = drawn !== null && isUsableRing(drawn);

  return (
    // Upright, the sheet sits over the bottom of the map. Held sideways (phone-land), the map takes the left
    // and the sheet becomes a panel on the right, so the search box and buttons on the map stay clear of it.
    <div
      data-testid="find-field"
      className="relative flex-1 min-h-[28rem] overflow-hidden bg-line-strong phone-land:min-h-0 phone-land:flex phone-land:flex-row"
    >
      <div data-testid="map-area" className="absolute inset-0 phone-land:relative phone-land:inset-auto phone-land:flex-1 phone-land:min-w-0">
        <Map
          centre={centre}
          zoom={OPEN_ZOOM}
          // While the farmer draws their own field the demo outline is out of the way, so only one shape shows.
          fieldOutline={drawing ? null : demoRing}
          basinOutline={basinOutline}
          drawnOutline={drawn}
          editable={drawing}
          drawing={tracing}
          target={target}
          edgeRequest={edgeRequest}
          onEdges={onEdges}
          onTap={onTap}
          onEditRing={reshape}
          onTrace={onTrace}
        />

        {/* search and location, floating on the map; out of the way only while a finger is tracing */}
        {tracing ? null : (
          <div className="absolute left-3 right-3 top-3 z-20 flex flex-col gap-2">
            <form
              role="search"
              className="flex items-center gap-2 px-3 h-12 bg-surface rounded-box shadow-float"
              onSubmit={(e) => {
                e.preventDefault();
                if (fresh && places?.[0]) {
                  flyTo(places[0].at, 14);
                  setSearchOpen(false);
                }
              }}
            >
              <SearchIcon className="w-5 h-5 flex-none text-ink-soft" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder={t("find.search")}
                aria-label={t("find.search")}
                className="flex-1 min-w-0 h-full bg-transparent outline-none text-body font-bold placeholder:text-ink-soft"
              />
            </form>
            {searchOpen && (places || failed) ? (
              <ul className="bg-surface rounded-box shadow-float overflow-hidden phone-land:max-h-48 phone-land:overflow-y-auto">
                {failed ? <li className="px-3 py-3 text-body">{t("find.searchError")}</li> : null}
                {places && places.length === 0 ? <li className="px-3 py-3 text-body">{t("find.searchNone")}</li> : null}
                {places?.map((p, i) => (
                  <li key={i} className="border-t border-line first:border-t-0">
                    <button
                      type="button"
                      className="w-full min-h-12 px-3 py-2 text-left"
                      onClick={() => {
                        flyTo(p.at, 14);
                        setSearchOpen(false);
                      }}
                    >
                      <span className="block font-bold text-body">{p.name}</span>
                      {p.detail ? <span className="block text-small text-ink-soft">{p.detail}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <span className="px-2 py-1 bg-map-chip text-on-map-chip text-small font-bold rounded-sm">{t("find.basemap")}</span>
              <button
                type="button"
                onClick={locate}
                className="flex-none inline-flex items-center gap-1.5 h-11 px-3 bg-surface rounded-box shadow-float font-bold text-body"
              >
                <LocateIcon className="w-5 h-5" />
                {t("find.locate")}
              </button>
            </div>
            {locError ? (
              <p role="alert" className="self-end px-2 py-1 bg-map-chip text-on-map-chip text-small font-bold rounded-sm">
                {t("find.locateError")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* bottom sheet; held sideways, a panel on the right that scrolls if it must */}
      <section
        aria-live="polite"
        data-testid="find-sheet"
        className="absolute left-0 right-0 bottom-0 z-20 bg-surface rounded-t-sheet shadow-sheet px-4 pt-4 pb-5 phone-land:relative phone-land:inset-auto phone-land:flex-none phone-land:w-[20rem] phone-land:overflow-y-auto phone-land:rounded-none phone-land:shadow-none phone-land:border-l phone-land:border-line phone-land:pt-3 phone-land:pb-3"
      >
        {bundle.status === "error" ? (
          <p role="alert" className="mb-3 flex items-center gap-2 text-body">
            <WarnIcon className="w-5 h-5 text-warn" />
            {t("load.error")}
            <button type="button" className="underline font-bold min-h-11" onClick={bundle.retry}>
              {t("common.retry")}
            </button>
          </p>
        ) : null}

        {/* The demo sheet needs the bundle; until it arrives (or if it failed) keep the hint and the draw button. */}
        {mode.k === "idle" || (mode.k === "demo" && bundle.status !== "ready") ? (
          <div className="flex items-center justify-between gap-3 phone-land:flex-col phone-land:items-stretch">
            <div>
              <p className="font-bold text-big">{t("find.hint")}</p>
              <p className="text-small font-bold text-ink-soft">{t("find.basinHint")}</p>
            </div>
            <Button look="secondary" onClick={() => setMode(startDrawing())}>
              <PencilIcon className="w-5 h-5" />
              {t("find.draw")}
            </Button>
          </div>
        ) : null}

        {mode.k === "demo" && bundle.status === "ready" ? (
          <div>
            <p className="text-head">{bundle.bundle.field.name}</p>
            <p className="text-body text-ink-soft font-bold">
              {t("find.about", { n: formatNumber(Math.round(bundle.bundle.field.areaHa), lang) })} · {t("find.isThis")}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button onClick={chooseDemo}>{t("find.yes")}</Button>
              <Button look="secondary" onClick={() => setMode(startDrawing())}>
                {t("find.no")}
              </Button>
            </div>
          </div>
        ) : null}

        {mode.k === "finding" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-big" data-testid="finding">
              {t("find.finding")}
            </p>
            <button type="button" className="flex-none min-h-11 px-2 underline font-bold text-body" onClick={cancel}>
              {t("find.cancel")}
            </button>
          </div>
        ) : null}

        {mode.k === "drawing" ? (
          <div data-testid="draw-sheet">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-big" data-testid="draw-hint">
                {mode.finding
                  ? t("find.finding")
                  : mode.seeking
                    ? t("find.tapInside")
                    : mode.tracing
                      ? t("find.drawHelp")
                      : mode.ring.length === 0
                        ? t("find.tapCorners")
                        : mode.ring.length < 3
                          ? t("find.keepTapping")
                          : drawnOk
                            ? t("find.pull", { n: formatNumber(Math.round(areaHa(mode.ring) * 10) / 10, lang) })
                            : t("find.tooSmallPull")}
              </p>
              <button type="button" className="flex-none min-h-11 px-2 underline font-bold text-body" onClick={cancel}>
                {t("find.cancel")}
              </button>
            </div>
            {mode.note ? (
              <p role="alert" className="mt-1 font-bold text-body text-warn">
                {t(NOTE_KEY[mode.note])}
              </p>
            ) : null}
            {/* Two rows of two, so each label fits at 360 px wide. */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                look="secondary"
                className="px-2"
                aria-pressed={mode.seeking}
                disabled={mode.finding}
                onClick={findEdges}
              >
                <FieldScaleIcon className="w-5 h-5" />
                {t("find.findEdges")}
              </Button>
              <Button
                look="secondary"
                className="px-2"
                aria-pressed={mode.tracing}
                disabled={mode.finding}
                onClick={() => setMode({ ...mode, tracing: !mode.tracing, seeking: false, note: null })}
              >
                <PencilIcon className="w-5 h-5" />
                {t("find.trace")}
              </Button>
              <Button look="secondary" className="px-2" disabled={mode.past.length === 0 || mode.finding} onClick={undo}>
                {t("find.undo")}
              </Button>
              <Button
                className="px-2"
                disabled={!drawnOk || mode.finding}
                // Inside the basin's farmland the full steps follow; outside, the bundle gate sends it on to live weather.
                onClick={() => go("/questions", { fieldId: null, outline: mode.ring })}
              >
                {t("find.done")}
              </Button>
            </div>
          </div>
        ) : null}

      </section>
    </div>
  );
}
