// The next three harvests as three cards: each crop's plate, its name and the harvest year, the first one marked, as in
// the storyboard. A strip intercrop's year shows both crops side by side. Written with AI assistance (Claude, Anthropic).
import type { CropId, Option } from "../data/types";
import { useT } from "../i18n";
import { CropPlate } from "./CropPlate";

export function HarvestCards({ option }: { option: Option }) {
  const t = useT();
  const beside = option.strips;
  const names = (crop: CropId, i: number) =>
    beside && beside[i] !== crop ? `${t(`crop.${crop}`)} + ${t(`crop.${beside[i]}`)}` : t(`crop.${crop}`);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label={option.sequence.map(names).join(", ")} data-testid="harvest-cards">
      {option.sequence.map((crop, i) => {
        const pair = beside && beside[i] !== crop ? beside[i] : null;
        return (
          <li
            key={i}
            data-testid="harvest-card"
            data-crop={crop}
            className={`flex flex-col items-center gap-1 px-1 pt-2 pb-2 rounded-box bg-surface text-center ${i === 0 ? "border-2 border-line-strong" : "border border-line"}`}
          >
            {pair ? (
              <span className="flex items-center" data-testid="strip-year">
                <CropPlate crop={crop} className="w-10 h-14" title={t(`crop.${crop}`)} />
                <CropPlate crop={pair} className="w-10 h-14" title={t(`crop.${pair}`)} />
              </span>
            ) : (
              <CropPlate crop={crop} className="w-14 h-14" />
            )}
            <span className="text-body font-bold leading-tight">{names(crop, i)}</span>
            <span className="text-small text-ink-soft">
              {i === 0 ? t("options.harvestYear", { year: option.firstHarvestYear }) : option.firstHarvestYear + i}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
