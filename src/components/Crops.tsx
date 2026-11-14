import type { CropId, Option } from "../data/types";
import { useT } from "../i18n";
import { CropIcon } from "./Icons";

/** Three crop icons with the harvest year under each. */
export function CropSequence({ option, size = "md" }: { option: Option; size?: "md" | "lg" }) {
  const t = useT();
  const icon = size === "lg" ? "w-9 h-9" : "w-[1.375rem] h-[1.375rem]";
  return (
    <ol className="flex gap-1.5" aria-label={option.sequence.map((c) => t(`crop.${c}`)).join(", ")}>
      {option.sequence.map((crop, i) => (
        <li key={i} className="flex flex-col items-center w-10">
          <CropIcon crop={crop} className={icon} title={t(`crop.${crop}`)} />
          <span className="text-small font-bold text-ink-soft">{option.firstHarvestYear + i}</span>
        </li>
      ))}
    </ol>
  );
}

/** The name an option is known by: its break crop, or durum for the current rotation. */
export function optionCrop(option: Option): CropId {
  return option.sequence.find((c) => c !== "durum") ?? "durum";
}
