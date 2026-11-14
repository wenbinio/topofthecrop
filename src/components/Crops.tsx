import { Fragment } from "react";
import type { ReactNode } from "react";
import type { CropId, Option } from "../data/types";
import { CROPS } from "../data/types";
import { useLang, useT } from "../i18n";
import { CropIcon } from "./Icons";

/**
 * A crop's name with its icon right before it. Use this wherever a crop is named, never a bare `t("crop.x")`.
 * The icon is hidden from screen readers, so the name is read once.
 */
export function CropName({
  crop,
  lower = false,
  text,
  iconClassName = "w-[1.25em] h-[1.25em]",
  className = "",
  wrap = false,
}: {
  crop: CropId;
  lower?: boolean; // inside a sentence: "Plant chickpea next"
  text?: string; // the name as already written in a sentence, to keep its casing
  iconClassName?: string;
  className?: string;
  wrap?: boolean; // let a long name wrap (buttons, narrow table cells); otherwise icon and name stay on one line
}) {
  const t = useT();
  const lang = useLang();
  const name = text ?? (lower ? t(`crop.${crop}`).toLocaleLowerCase(lang) : t(`crop.${crop}`));
  return (
    <span className={`${wrap ? "" : "whitespace-nowrap "}${className}`} data-crop={crop}>
      <CropIcon crop={crop} data-testid="crop-icon" className={`inline-block align-[-0.25em] mr-1 flex-none ${iconClassName}`} />
      {name}
    </span>
  );
}

/**
 * A translated sentence with `{name}` placeholders filled by elements, so a crop's icon can sit inside the sentence:
 * `<Slotted text={t("options.plant")} slots={{ crop: <CropName crop="faba" lower /> }} />`.
 */
export function Slotted({ text, slots }: { text: string; slots: Record<string, ReactNode> }) {
  const names = Object.keys(slots);
  if (!names.length) return <>{text}</>;
  const pattern = new RegExp(`\\{(${names.join("|")})\\}`);
  const parts = text.split(pattern);
  // split with one capture group alternates text, slot name, text, …
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <Fragment key={i}>{slots[part]}</Fragment> : part ? <Fragment key={i}>{part}</Fragment> : null))}
    </>
  );
}

/** Crop names in the current language, longest first, for finding them in running text. */
export function useCropWords(): { crop: CropId; word: string }[] {
  const t = useT();
  return CROPS.map((crop) => ({ crop, word: t(`crop.${crop}`) })).sort((a, b) => b.word.length - a.word.length);
}

/** "Paid in chickpea and faba bean years", with each crop's icon. */
export function PaidIn({ crops }: { crops: CropId[] }) {
  const t = useT();
  const lang = useLang();
  if (!crops.length) return <>{t("settings.paidEvery")}</>;
  const parts = new Intl.ListFormat(lang, { type: "conjunction" }).formatToParts(crops.map((crop) => t(`crop.${crop}`)));
  let next = 0;
  const list = parts.map((part, i) =>
    part.type === "element" ? <CropName key={i} crop={crops[next++]} text={part.value} /> : <Fragment key={i}>{part.value}</Fragment>,
  );
  return <Slotted text={t("settings.paidCrops")} slots={{ crops: <>{list}</> }} />;
}

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
