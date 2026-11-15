// The drawing sheet on step 1: what to do next, a note after something did not work, and the four buttons
// (Find edges, Trace, Undo, Done). The shape itself is drawn on the map. Written with AI assistance (Claude, Anthropic).
import { areaHa, isUsableRing } from "../../geo/geometry";
import { useLang, useT } from "../../i18n";
import { formatNumber } from "../../components/FactParts";
import { FieldScaleIcon, PencilIcon } from "../../components/Icons";
import { Button } from "../../components/ui";
import { NOTE_KEY } from "./mode";
import type { DrawingMode } from "./mode";

export function DrawSheet({
  mode,
  onFindEdges,
  onTrace,
  onUndo,
  onDone,
  onCancel,
}: {
  mode: DrawingMode;
  onFindEdges: () => void;
  onTrace: () => void;
  onUndo: () => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const drawnOk = isUsableRing(mode.ring);
  return (
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
        <button type="button" className="flex-none min-h-11 px-2 underline font-bold text-body" onClick={onCancel}>
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
        <Button look="secondary" className="px-2" aria-pressed={mode.seeking} disabled={mode.finding} onClick={onFindEdges}>
          <FieldScaleIcon className="w-5 h-5" />
          {t("find.findEdges")}
        </Button>
        <Button look="secondary" className="px-2" aria-pressed={mode.tracing} disabled={mode.finding} onClick={onTrace}>
          <PencilIcon className="w-5 h-5" />
          {t("find.trace")}
        </Button>
        <Button look="secondary" className="px-2" disabled={mode.past.length === 0 || mode.finding} onClick={onUndo}>
          {t("find.undo")}
        </Button>
        <Button className="px-2" disabled={!drawnOk || mode.finding} onClick={onDone}>
          {t("find.done")}
        </Button>
      </div>
    </div>
  );
}
