import { useEffect, useMemo, useRef, useState } from "react";
import type { LngLat } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { areaHa, centroid, isUsableRing, pointInRing, simplifyRing } from "../geo/geometry";
import { useLang, useT } from "../i18n";
import { useAppState, useGo } from "../state/useAppState";
import { useBundle } from "../components/BundleProvider";
import { formatNumber } from "../components/FactParts";
import { openRing } from "../components/FieldShape";
import { LocateIcon, PencilIcon, SearchIcon, WarnIcon } from "../components/Icons";
import Map from "../components/Map";
import type { MapTarget } from "../components/Map";
import { Button } from "../components/ui";

/** Where the map opens before the bundle arrives: the Genzano demo field. */
const DEMO_CENTRE: LngLat = [16.0617, 40.8631];
const OPEN_ZOOM = 15;

type Mode =
  | { k: "idle" }
  | { k: "demo" }
  | { k: "offer" }
  | { k: "drawing"; tooSmall: boolean }
  | { k: "confirm"; ring: LngLat[] };

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
  const bundle = useBundle();
  const [mode, setMode] = useState<Mode>(() =>
    state.outline && isUsableRing(state.outline)
      ? { k: "confirm", ring: state.outline }
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

  function onTap(point: LngLat) {
    if (mode.k === "drawing") return;
    if (demoRing && pointInRing(point, demoRing)) setMode({ k: "demo" });
    else setMode({ k: "offer" });
  }

  function onTrace(points: LngLat[]) {
    const ring = simplifyRing(points);
    if (!isUsableRing(ring)) setMode({ k: "drawing", tooSmall: true });
    else setMode({ k: "confirm", ring });
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
      lastCrop: bundle.status === "ready" ? bundle.bundle.lastCrop.crop : state.lastCrop,
    });
  }

  const drawing = mode.k === "drawing";
  const drawn = mode.k === "confirm" ? mode.ring : null;

  return (
    <div className="relative flex-1 min-h-[28rem] overflow-hidden bg-line-strong">
      <Map
        centre={centre}
        zoom={OPEN_ZOOM}
        fieldOutline={demoRing}
        drawnOutline={drawn}
        drawing={drawing}
        target={target}
        onTap={onTap}
        onTrace={onTrace}
      />

      {/* search and location, floating on the map */}
      {drawing ? null : (
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
            <ul className="bg-surface rounded-box shadow-float overflow-hidden">
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

      {/* bottom sheet */}
      <section
        aria-live="polite"
        className="absolute left-0 right-0 bottom-0 z-20 bg-surface rounded-t-sheet shadow-sheet px-4 pt-4 pb-5"
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
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-big">{t("find.hint")}</p>
            <Button look="secondary" onClick={() => setMode({ k: "drawing", tooSmall: false })}>
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
              <Button look="secondary" onClick={() => setMode({ k: "drawing", tooSmall: false })}>
                {t("find.no")}
              </Button>
            </div>
          </div>
        ) : null}

        {mode.k === "offer" ? (
          <div>
            <p className="font-bold text-big">{t("find.unknown")}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button onClick={() => setMode({ k: "drawing", tooSmall: false })}>
                <PencilIcon className="w-5 h-5" />
                {t("find.draw")}
              </Button>
              <Button look="secondary" onClick={() => setMode({ k: "idle" })}>
                {t("find.cancel")}
              </Button>
            </div>
          </div>
        ) : null}

        {mode.k === "drawing" ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-big flex items-center gap-2">
                <PencilIcon className="w-5 h-5" />
                {t("find.drawHelp")}
              </p>
              {mode.tooSmall ? (
                <p role="alert" className="mt-1 font-bold text-body text-warn">
                  {t("find.tooSmall")}
                </p>
              ) : null}
            </div>
            <Button look="secondary" onClick={() => setMode({ k: "idle" })}>
              {t("find.cancel")}
            </Button>
          </div>
        ) : null}

        {mode.k === "confirm" ? (
          <div>
            <p className="text-head">
              {formatNumber(Math.round(areaHa(mode.ring) * 10) / 10, lang)} ha
            </p>
            <p className="text-body text-ink-soft font-bold">{t("find.shapeOk")}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button onClick={() => go("/area", { fieldId: null, outline: mode.ring })}>{t("find.yesShape")}</Button>
              <Button look="secondary" onClick={() => setMode({ k: "drawing", tooSmall: false })}>
                {t("find.redraw")}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
