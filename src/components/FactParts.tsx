import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Confidence, Fact, Lang, Scale } from "../data/types";
import { hasKey, useLang, useT } from "../i18n";
import { sourceText } from "../i18n/sources";
import type { Translate } from "../i18n";
import { AreaScaleIcon, FieldScaleIcon } from "./Icons";

const LEVELS = ["low", "medium", "high"] as const;

export function isLevel(value: unknown): value is (typeof LEVELS)[number] {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function formatNumber(n: number, lang: Lang): string {
  return n.toLocaleString(lang === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 1 });
}

export function valueText(fact: Fact, t: Translate, lang: Lang): string {
  if (typeof fact.value === "number") return formatNumber(fact.value, lang);
  if (isLevel(fact.value)) return t(`level.${fact.value}`);
  return t(fact.value);
}

export function unitText(unit: string | undefined, t: Translate): string {
  if (!unit) return "";
  return hasKey(`unit.${unit}`) ? t(`unit.${unit}`) : unit;
}

export function rangeText(fact: Fact, lang: Lang): string | null {
  if (!fact.range) return null;
  return `${formatNumber(fact.range[0], lang)}–${formatNumber(fact.range[1], lang)}`;
}

/** "your field" or "your area": every number carries one. */
export function ScaleBadge({ scale, long = false, iconOnly = false }: { scale: Scale; long?: boolean; iconOnly?: boolean }) {
  const t = useT();
  const Icon = scale === "field" ? FieldScaleIcon : AreaScaleIcon;
  const word = t(long ? `scale.${scale}Long` : `scale.${scale}`);
  return (
    <span className="inline-flex items-center gap-1 text-small font-bold text-ink-soft whitespace-nowrap" title={iconOnly ? word : undefined}>
      <Icon className="w-[1em] h-[1em] flex-none" />
      {iconOnly ? <span className="sr-only">{word}</span> : word}
    </span>
  );
}

/** Marks a figure the farmer changed in Settings. It takes the place of the dataset label. */
export function YoursTag() {
  const t = useT();
  return (
    <span data-testid="tag-yours" className="inline-flex items-center px-1.5 border-2 border-line-strong text-small font-bold rounded-sm whitespace-nowrap">
      {t("money.yours")}
    </span>
  );
}

/** Dataset and resolution, e.g. "LANDSAT / HLS · 30 m". Hidden in Simple view until tapped. A figure the farmer changed shows "Yours" instead. */
export function DatasetLabel({ fact, always = false }: { fact: Fact; always?: boolean }) {
  const lang = useLang();
  if (fact.edited) return <YoursTag />;
  return (
    <span
      className={`${always ? "" : "tc-dataset "}font-mono text-small uppercase tracking-wide text-ink-soft`}
    >
      {sourceText(fact.source.dataset, lang)} · {sourceText(fact.source.resolution, lang)}
    </span>
  );
}

export function ConfidenceWord({ confidence }: { confidence: Confidence }) {
  const t = useT();
  const bars = confidence === "good" ? 3 : confidence === "fair" ? 2 : 1;
  return (
    <span
      className="inline-flex items-center gap-1 text-small font-bold text-ink-soft"
      title={t("confidence.label")}
    >
      <span aria-hidden="true" className="inline-flex items-end gap-px h-3">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`w-1 rounded-sm ${n <= bars ? "bg-ink-soft" : "bg-line"}`}
            style={{ height: `${n * 33}%` }}
          />
        ))}
      </span>
      <span className="sr-only">{t("confidence.label")}: </span>
      {t(`confidence.${confidence}`)}
    </span>
  );
}

/** Three bars for a low/medium/high value, with the word for screen readers and the tap detail. */
export function LevelMeter({ level, label }: { level: string; label: string }) {
  const t = useT();
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-end gap-0.5 h-4" role="img" aria-label={`${label}: ${t(`level.${level}`)}`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`w-1.5 rounded-sm border border-ink ${n <= filled ? "bg-ink" : "bg-surface"}`}
          style={{ height: `${n * 33}%` }}
        />
      ))}
    </span>
  );
}

/**
 * Open-or-closed state for a source bubble. It closes on a tap anywhere outside `ref` or on Escape, so a farmer never
 * has to find a close button.
 */
export function useBubble() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/** The bubble: field or area in words, then range, dataset and resolution (linked) and date, then confidence. */
export function SourcePanel({ fact, id, align = "start" }: { fact: Fact; id: string; align?: "start" | "end" }) {
  return (
    <span
      id={id}
      role="note"
      data-testid="source-bubble"
      className={`tc-pop ${align === "end" ? "tc-pop-end right-0" : "left-0"} absolute z-30 top-full mt-1 w-64 max-w-[80vw] p-2.5 flex flex-col gap-1 bg-surface text-ink border-2 border-line-strong rounded-sm shadow-lg text-small text-left font-normal normal-case tracking-normal whitespace-normal`}
    >
      <ScaleBadge scale={fact.scale} long />
      <span>
        <FactDetail fact={fact} />
      </span>
      <ConfidenceWord confidence={fact.confidence} />
    </span>
  );
}

/** "Source", beside a figure: opens the bubble. */
export function SourceButton({ fact, align = "start" }: { fact: Fact; align?: "start" | "end" }) {
  const t = useT();
  const { open, setOpen, ref } = useBubble();
  const id = useId();
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        data-testid="source-button"
        className="py-2 -my-2 text-small font-bold text-ink-soft underline underline-offset-2"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {t("common.source")}
      </button>
      {open ? <SourcePanel fact={fact} id={id} align={align} /> : null}
    </span>
  );
}

/** One fact, tappable: the value and whether it is the field or the area; a tap opens its source bubble. */
export function FactButton({ fact, label, big = false, suffix, align = "start" }: { fact: Fact; label: string; big?: boolean; suffix?: string; align?: "start" | "end" }) {
  const t = useT();
  const lang = useLang();
  const { open, setOpen, ref } = useBubble();
  const id = useId();
  const unit = unitText(fact.unit, t);
  return (
    <span ref={ref} className="relative inline-flex flex-col items-start min-w-0">
      <button
        type="button"
        className="text-left min-h-11 flex flex-col justify-center"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label}: ${valueText(fact, t, lang)} ${unit}${suffix ?? ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`font-bold leading-none ${big ? "text-hero" : "text-big"}`}>
          {valueText(fact, t, lang)}
          {unit || suffix ? (
            <span className={`font-bold ${big ? "text-big" : "text-small"}`}>
              {" "}
              {unit}
              {suffix}
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 mt-1">
          <ScaleBadge scale={fact.scale} />
          {fact.edited ? <YoursTag /> : null}
        </span>
      </button>
      {open ? <SourcePanel fact={fact} id={id} align={align} /> : null}
    </span>
  );
}

/** Range, dataset and resolution, date. */
export function FactDetail({ fact }: { fact: Fact }) {
  const t = useT();
  const lang = useLang();
  const range = rangeText(fact, lang);
  const parts: ReactNode[] = [];
  if (range) parts.push(`${t("common.range")} ${range}`);
  parts.push(
    fact.edited ? (
      t("money.yoursLong")
    ) : fact.source.url ? (
      <a key="src" href={fact.source.url} target="_blank" rel="noreferrer" className="underline">
        {sourceText(fact.source.dataset, lang)} · {sourceText(fact.source.resolution, lang)}
      </a>
    ) : (
      `${sourceText(fact.source.dataset, lang)} · ${sourceText(fact.source.resolution, lang)}`
    ),
  );
  if (fact.asOf) parts.push(t("common.asOf", { date: fact.asOf }));
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 ? " · " : ""}
          {p}
        </span>
      ))}
    </>
  );
}

export function anyPlaceholder(facts: Fact[]): boolean {
  return facts.some((f) => f.placeholder);
}

export function PlaceholderNote({ facts }: { facts: Fact[] }) {
  const t = useT();
  if (!anyPlaceholder(facts)) return null;
  return (
    <p className="text-small font-bold text-warn flex items-center gap-1" data-testid="placeholder-note">
      <span aria-hidden="true">*</span>
      {t("common.placeholder")}
    </p>
  );
}
