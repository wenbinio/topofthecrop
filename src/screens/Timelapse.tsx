// "Your field from space": the farmer's own field, one clear Sentinel-2 picture a month for the last three years,
// fetched live (src/timelapse/frames.ts), cropped to the field and its margin, with the outline and each picture's
// date and time. A picture cloudy at the field is skipped before it is shown. Linked from the Year screen.
// Written with AI assistance (Claude, Anthropic).
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FieldBundle } from "../data/types";
import { BackButton, BottomBar, Headline } from "../components/ui";
import { useLang, useT } from "../i18n";
import { useTo } from "../state/useAppState";
import type { Frame, TileWindow } from "../timelapse/frames";
import { blockTiles, chooseFrames, creditYears, fetchScenes, frameLabel, tileUrl, tileWindow } from "../timelapse/frames";

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
    fetchScenes(win.centre)
      .then((scenes) => chooseFrames(scenes, win.centre))
      .then(
        (frames) => live && setLoad({ status: "ready", frames }),
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
  // Each tile reports once: loaded or failed for good. A frame is ready when all its tiles have reported, and
  // failed when any tile failed: playback moves only onto ready frames and skips failed ones.
  const outcome = useRef<Map<string, boolean>>(new Map());
  const [ready, setReady] = useState<boolean[]>(() => frames.map(() => false));
  const [failed, setFailed] = useState<boolean[]>(() => frames.map(() => false));
  const settle = (frame: number, tile: number, ok: boolean) => {
    const key = `${frame}:${tile}`;
    if (outcome.current.has(key)) return;
    outcome.current.set(key, ok);
    if (!ok) setFailed((was) => was.map((f, i) => (i === frame ? true : f)));
    if (tiles.every((_, i) => outcome.current.has(`${frame}:${i}`))) setReady((was) => was.map((r, i) => (i === frame ? true : r)));
  };
  const usable = frames.map((_, i) => i).filter((i) => !failed[i]);
  const shown = failed[index] ? (usable.find((i) => i > index) ?? usable[0] ?? index) : index;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        for (let step = 1; step <= frames.length; step++) {
          const next = (i + step) % frames.length;
          if (failed[next]) continue;
          return ready[next] ? next : i;
        }
        return i;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [playing, frames.length, ready, failed]);

  const loaded = ready.filter((r, i) => r && !failed[i]).length;
  const { region } = win;
  const pct = (px: number) => `${(px / region.size) * 100}%`;
  const points = win.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <>
      <div
        className="relative w-full max-w-[30rem] mx-auto aspect-square overflow-hidden"
        style={{ background: "#1d2a24" }}
        data-testid="timelapse-picture"
      >
        {frames.map((frame, f) => (
          <div key={frame.id} className="absolute inset-0" style={{ visibility: f === shown ? "visible" : "hidden" }} aria-hidden={f !== shown}>
            {tiles.map(([x, y], i) => (
              <Tile
                key={`${x}-${y}`}
                item={frame.id}
                z={win.z}
                x={x}
                y={y}
                style={{
                  left: pct((x - win.tx) * 256 - region.x),
                  top: pct((y - win.ty) * 256 - region.y),
                  width: pct(256),
                  height: pct(256),
                }}
                onSettled={(ok) => settle(f, i, ok)}
              />
            ))}
          </div>
        ))}
        <svg
          viewBox={`${region.x} ${region.y} ${region.size} ${region.size}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <polygon points={points} fill="none" stroke="#ffd400" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </svg>
        <p
          className="absolute top-0 inset-x-0 px-3 py-2 font-bold text-body"
          style={{ background: "rgba(0, 0, 0, 0.6)", color: "#ffffff" }}
          data-testid="frame-date"
          aria-live="off"
        >
          {frameLabel(frames[shown].datetime, lang)}
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
          max={Math.max(usable.length - 1, 0)}
          value={Math.max(usable.indexOf(shown), 0)}
          aria-label={t("timelapse.scrub")}
          className="flex-1 min-h-11"
          onChange={(event) => {
            setPlaying(false);
            setIndex(usable[Number(event.target.value)] ?? 0);
          }}
        />
      </div>
      <p className="mt-1 text-small text-ink-soft" data-testid="timelapse-progress">
        {t("timelapse.outline")} · {t("timelapse.pictures", { n: loaded, total: usable.length })}
      </p>
      <p className="mt-2 text-small text-ink-soft" data-testid="timelapse-credit">
        {t("timelapse.credit", { years: creditYears(frames) })}
      </p>
    </>
  );
}

/** One map tile, placed in the picture: JPEG first, PNG if the JPEG fails; it reports once, loaded or failed. */
function Tile({
  item, z, x, y, style, onSettled,
}: { item: string; z: number; x: number; y: number; style: CSSProperties; onSettled: (ok: boolean) => void }) {
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  return (
    <img
      src={tileUrl(item, z, x, y, format)}
      alt=""
      draggable={false}
      className="absolute block max-w-none"
      style={style}
      onLoad={() => onSettled(true)}
      onError={() => (format === "jpg" ? setFormat("png") : onSettled(false))}
    />
  );
}
