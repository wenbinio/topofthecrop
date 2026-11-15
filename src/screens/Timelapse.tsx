// "Your field from space": the farmer's own field, one clear Sentinel-2 picture a month for the last three years,
// fetched live (src/timelapse/frames.ts), with the field's outline and each picture's date and time. Not linked from
// the steps yet: reached at #/timelapse with the field's link while the team tries it.
// Written with AI assistance (Claude, Anthropic).
import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldBundle } from "../data/types";
import { BackButton, BottomBar, Headline } from "../components/ui";
import { useLang, useT } from "../i18n";
import { useTo } from "../state/useAppState";
import type { Frame, TileWindow } from "../timelapse/frames";
import { blockTiles, creditYears, fetchScenes, frameLabel, monthlyFrames, tileUrl, tileWindow } from "../timelapse/frames";

const STEP_MS = 450;

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; frames: Frame[] };

export default function Timelapse({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const to = useTo();
  const win = useMemo(() => tileWindow(bundle.field.outline), [bundle.field.outline]);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setLoad({ status: "loading" });
    fetchScenes(win.centre).then(
      (scenes) => live && setLoad({ status: "ready", frames: monthlyFrames(scenes) }),
      () => live && setLoad({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, [win, attempt]);

  return (
    <div className="flex flex-col flex-1" data-testid="timelapse">
      <Headline sub={t("timelapse.sub")}>{t("timelapse.title")}</Headline>
      <div className="px-4 pb-4">
        {load.status === "loading" ? (
          <p className="text-body text-ink-soft" role="status">
            {t("timelapse.loading")}
          </p>
        ) : load.status === "error" ? (
          <p className="text-body" data-testid="timelapse-error">
            {t("timelapse.error")}{" "}
            <button type="button" className="font-bold underline underline-offset-2" onClick={() => setAttempt((n) => n + 1)}>
              {t("season.retry")}
            </button>
          </p>
        ) : load.frames.length === 0 ? (
          <p className="text-body" data-testid="timelapse-none">
            {t("timelapse.none")}
          </p>
        ) : (
          <Player frames={load.frames} win={win} />
        )}
      </div>
      <BottomBar>
        <BackButton to={to("/year")} />
      </BottomBar>
    </div>
  );
}

function Player({ frames, win }: { frames: Frame[]; win: TileWindow }) {
  const t = useT();
  const lang = useLang();
  const tiles = useMemo(() => blockTiles(win), [win]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  // A frame is ready once each of its tiles has loaded or failed; playback only moves onto ready frames.
  const settled = useRef<Set<string>>(new Set());
  const [ready, setReady] = useState<boolean[]>(() => frames.map(() => false));
  const settle = (frame: number, tile: number) => {
    const key = `${frame}:${tile}`;
    if (settled.current.has(key)) return;
    settled.current.add(key);
    if (tiles.every((_, i) => settled.current.has(`${frame}:${i}`))) {
      setReady((was) => was.map((r, i) => (i === frame ? true : r)));
    }
  };

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % frames.length;
        return ready[next] ? next : i;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [playing, frames.length, ready]);

  const loaded = ready.filter(Boolean).length;
  const points = win.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <>
      <div className="relative w-full max-w-[30rem] mx-auto aspect-square overflow-hidden bg-ink" data-testid="timelapse-picture">
        {frames.map((frame, f) => (
          <div
            key={frame.id}
            className="absolute inset-0 grid grid-cols-2"
            style={{ visibility: f === index ? "visible" : "hidden" }}
            aria-hidden={f !== index}
          >
            {tiles.map(([x, y], i) => (
              <Tile key={`${x}-${y}`} item={frame.id} z={win.z} x={x} y={y} onSettled={() => settle(f, i)} />
            ))}
          </div>
        ))}
        <svg viewBox={`0 0 ${win.size} ${win.size}`} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <polygon points={points} fill="none" stroke="#ffd400" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </svg>
        <p className="absolute top-0 inset-x-0 px-3 py-2 bg-black/60 text-white font-bold text-body" data-testid="frame-date" aria-live="off">
          {frameLabel(frames[index].datetime, lang)}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="tc-tap min-h-11 px-4 border-2 border-ink rounded-sm font-bold"
          aria-pressed={playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? t("timelapse.pause") : t("timelapse.play")}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          aria-label={t("timelapse.scrub")}
          className="flex-1 min-h-11"
          onChange={(event) => {
            setPlaying(false);
            setIndex(Number(event.target.value));
          }}
        />
      </div>
      <p className="mt-1 text-small text-ink-soft" data-testid="timelapse-progress">
        {t("timelapse.outline")} · {t("timelapse.pictures", { n: loaded, total: frames.length })}
      </p>
      <p className="mt-2 text-small text-ink-soft" data-testid="timelapse-credit">
        {t("timelapse.credit", { years: creditYears(frames) })}
      </p>
    </>
  );
}

/** One map tile: JPEG first, PNG if the JPEG fails; it reports once when it has loaded or failed for good. */
function Tile({ item, z, x, y, onSettled }: { item: string; z: number; x: number; y: number; onSettled: () => void }) {
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  return (
    <img
      src={tileUrl(item, z, x, y, format)}
      alt=""
      draggable={false}
      className="block w-full h-full object-cover"
      onLoad={onSettled}
      onError={() => (format === "jpg" ? setFormat("png") : onSettled())}
    />
  );
}
