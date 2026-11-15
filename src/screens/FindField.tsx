// Step 1: find your field. This file holds the screen's state and wires the parts in ./find-field/ (the town search,
// the parcel-number form, the drawing sheet and the mode type). Written with AI assistance (Claude, Anthropic).
import { useEffect, useMemo, useRef, useState } from "react";
import type { LngLat } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { MAX_CORNERS, TRACE_CORNERS, round5 } from "../geo/edit";
import { centroid, isUsableRing, pointInRing, simplifyRing } from "../geo/geometry";
import { useLang, useT } from "../i18n";
import { useAppState, useGo } from "../state/useAppState";
import { useDemoBundle } from "../components/BundleProvider";
import { loadBasinOutline } from "../data/basin";
import { PARCEL_COMMUNES, findParcel } from "../data/parcels";
import type { FeatureCollection } from "geojson";
import { formatNumber } from "../components/FactParts";
import { openRing } from "../components/FieldShape";
import { FieldScaleIcon, LocateIcon, PencilIcon, WarnIcon } from "../components/Icons";
import Map from "../components/Map";
import type { EdgeRequest, MapTarget } from "../components/Map";
import { Button } from "../components/ui";
import { DrawSheet } from "./find-field/DrawSheet";
import { startDrawing, startParcel } from "./find-field/mode";
import type { Mode } from "./find-field/mode";
import { ParcelForm } from "./find-field/ParcelForm";
import { TownResults, TownSearchBox, usePlaceSearch } from "./find-field/TownSearch";
import type { Place } from "./find-field/TownSearch";

/** Where the map opens before the bundle arrives: the Genzano demo field. */
const DEMO_CENTRE: LngLat = [16.0928, 40.8234];
const OPEN_ZOOM = 15.5;
/** Close enough to see the whole parcel on the aerial photo. */
const PARCEL_ZOOM = 16;

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

  function pickPlace(place: Place) {
    flyTo(place.at, 14);
    setSearchOpen(false);
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
    if (mode.k === "finding" || mode.k === "parcel") return;
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

  function toggleTrace() {
    if (mode.k !== "drawing") return;
    setMode({ ...mode, tracing: !mode.tracing, seeking: false, note: null });
  }

  function cancel() {
    setEdgeRequest(null);
    setMode({ k: "idle" });
  }

  /** Look the typed parcel up; found, it becomes the shape to adjust, cut down to the corners a link can hold. */
  function searchParcel() {
    if (mode.k !== "parcel" || mode.state === "searching") return;
    const { sheet, parcel } = mode;
    if (!sheet.trim() || !parcel.trim()) return;
    setMode({ ...mode, state: "searching" });
    const still = (m: Mode) => m.k === "parcel" && m.sheet === sheet && m.parcel === parcel && m.state === "searching";
    findParcel(PARCEL_COMMUNES[0].code, sheet, parcel).then(
      (answer) => {
        if (answer.found) {
          const ring = simplifyRing(answer.ring, MAX_CORNERS);
          setMode((m) => (still(m) ? startDrawing(ring, [[]]) : m));
          flyTo(centroid(ring), PARCEL_ZOOM);
        } else setMode((m) => (still(m) ? { ...m, state: answer.sheet ? "noParcel" : "noSheet" } : m));
      },
      () => setMode((m) => (still(m) ? { ...m, state: "failed" } : m)),
    );
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
            <TownSearchBox
              query={query}
              onQuery={(next) => {
                setQuery(next);
                setSearchOpen(true);
              }}
              firstPlace={fresh && places?.[0] ? places[0] : null}
              onPick={pickPlace}
            />
            {searchOpen && (places || failed) ? <TownResults places={places} failed={failed} onPick={pickPlace} /> : null}
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
          <div>
            <p className="font-bold text-big">{t("find.hint")}</p>
            <p className="text-small font-bold text-ink-soft">{t("find.basinHint")}</p>
            <div className="grid grid-cols-2 gap-2 mt-3 phone-land:grid-cols-1">
              <Button look="secondary" className="px-2" onClick={() => setMode(startDrawing())}>
                <PencilIcon className="w-5 h-5" />
                {t("find.draw")}
              </Button>
              <Button look="secondary" className="px-2" onClick={() => setMode(startParcel())}>
                <FieldScaleIcon className="w-5 h-5" />
                {t("parcel.open")}
              </Button>
            </div>
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
            <button type="button" className="mt-1 min-h-11 underline font-bold text-body" onClick={() => setMode(startParcel())}>
              {t("parcel.open")}
            </button>
          </div>
        ) : null}

        {mode.k === "parcel" ? <ParcelForm mode={mode} onChange={setMode} onSearch={searchParcel} onCancel={cancel} /> : null}

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
          <DrawSheet
            mode={mode}
            onFindEdges={findEdges}
            onTrace={toggleTrace}
            onUndo={undo}
            // Inside the basin's farmland the full steps follow; outside, the bundle gate sends it on to live weather.
            onDone={() => go("/questions", { fieldId: null, outline: mode.ring })}
            onCancel={cancel}
          />
        ) : null}
      </section>
    </div>
  );
}
