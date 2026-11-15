import { Fragment } from "react";
import type { ReactNode } from "react";
import type { CropId, Option } from "../data/types";
import { CROPS } from "../data/types";
import { useLang, useT } from "../i18n";
import { CropIcon } from "./Icons";
import { CropPlate } from "./CropPlate";

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

/**
 * Three crop icons with the harvest year under each. A strip intercrop shows both of a year's crops, side by side
 * as they stand in the field.
 */
export function CropSequence({ option, size = "md" }: { option: Option; size?: "md" | "lg" }) {
  const t = useT();
  const beside = option.strips;
  const icon = size === "lg" ? "w-16 h-16" : "w-11 h-11";
  const half = size === "lg" ? "w-11 h-11" : "w-8 h-8";
  const names = (crop: CropId, i: number) => (beside && beside[i] !== crop ? `${t(`crop.${crop}`)} + ${t(`crop.${beside[i]}`)}` : t(`crop.${crop}`));
  return (
    <ol className="flex gap-1.5" aria-label={option.sequence.map(names).join(", ")}>
      {option.sequence.map((crop, i) => (
        <li key={i} className={`flex flex-col items-center ${beside ? (size === "lg" ? "w-[5.75rem]" : "w-[4.25rem]") : size === "lg" ? "w-16" : "w-11"}`}>
          {beside && beside[i] !== crop ? (
            <span className="flex items-center gap-0.5" data-testid="strip-year">
              <CropPlate crop={crop} className={half} title={t(`crop.${crop}`)} />
              <CropPlate crop={beside[i]} className={half} title={t(`crop.${beside[i]}`)} />
            </span>
          ) : (
            <CropPlate crop={crop} className={icon} big={size === "lg"} title={t(`crop.${crop}`)} />
          )}
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

/**
 * The two crops of a strip intercrop, as sown in its first intercropped year (the first sequence's crop first);
 * null for an ordinary rotation.
 */
export function stripPair(option: Option): [CropId, CropId] | null {
  const beside = option.strips;
  if (!beside) return null;
  const year = option.sequence.findIndex((crop, i) => crop !== beside[i]);
  return year < 0 ? null : [option.sequence[year], beside[year]];
}

/** The two crops to sow in strips for the very next harvest; null when that year is one crop on the whole field. */
export function stripsNext(option: Option): [CropId, CropId] | null {
  return option.strips && option.strips[0] !== option.sequence[0] ? [option.sequence[0], option.strips[0]] : null;
}

/** An option's name in plain words, for labels and read-aloud: its break crop, or "Chickpea and durum in strips". */
export function optionWords(option: Option, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const pair = stripPair(option);
  return pair ? t("option.strips", { a: t(`crop.${pair[0]}`), b: t(`crop.${pair[1]}`).toLowerCase() }) : t(`crop.${optionCrop(option)}`);
}

/** An option's name with its crop icons: the break crop, or both crops of a strip intercrop. Use it wherever a rotation is named. */
export function OptionName({ option, className = "" }: { option: Option; className?: string }) {
  const t = useT();
  const pair = stripPair(option);
  if (!pair) return <CropName crop={optionCrop(option)} className={className} />;
  return (
    <span className={className} data-testid="strips-name">
      <Slotted text={t("option.strips")} slots={{ a: <CropName crop={pair[0]} />, b: <CropName crop={pair[1]} lower /> }} />
    </span>
  );
}
