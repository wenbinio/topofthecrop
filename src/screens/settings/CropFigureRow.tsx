// One crop's editable figure on Settings, with "Yours" and the starting figure once the farmer changed it.
// Written with AI assistance (Claude, Anthropic).
import type { CropId } from "../../data/types";
import { useLang, useT } from "../../i18n";
import { YoursTag, formatNumber } from "../../components/FactParts";
import { CropName } from "../../components/Crops";
import { MoneyInput } from "./MoneyInput";
import type { Limits } from "./MoneyInput";

export type CropFigure = { value: number; default: number; edited: boolean };

/**
 * One crop's editable figure (a price, its costs, its yield, or the extra durum after it), with "Yours" and the
 * starting figure once changed. `sub` is a second line under the crop's name.
 */
export function CropFigureRow({
  crop,
  sub,
  figure,
  limits,
  label,
  testId,
  onCommit,
}: {
  crop: CropId;
  sub?: string;
  figure: CropFigure;
  limits: Limits;
  label: string;
  testId: string;
  onCommit: (value: number) => void;
}) {
  const t = useT();
  const lang = useLang();
  return (
    <li className="flex items-start gap-3 px-4 py-2 border-b border-line" data-testid={testId} data-crop={crop}>
      <span className="flex-1 min-w-0 flex flex-col pt-2.5">
        <CropName crop={crop} iconClassName="w-7 h-7" className="font-bold text-big" wrap />
        {sub ? <span className="text-small font-bold text-ink-soft">{sub}</span> : null}
        {figure.edited ? (
          <span className="flex flex-wrap items-center gap-2 mt-0.5 text-small text-ink-soft">
            <YoursTag />
            {t("settings.start", { n: formatNumber(figure.default, lang) })}
          </span>
        ) : null}
      </span>
      <MoneyInput value={figure.value} limits={limits} label={label} onCommit={onCommit} />
    </li>
  );
}
