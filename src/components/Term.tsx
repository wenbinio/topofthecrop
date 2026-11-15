import { useState } from "react";
import type { ReactNode } from "react";
import type { Confidence, Cover, Fact, Priority } from "../data/types";
import { PRIORITIES } from "../data/types";
import { useLang, useT } from "../i18n";
import type { Translate } from "../i18n";
import { CropName, useCropWords } from "./Crops";
import { ScaleBadge, formatNumber } from "./FactParts";

/** Terms that open a one-line explanation. Each has `term.<id>.word` and `term.<id>`. */
export const TERMS = ["ndvi", "et", "gm", "confidence"] as const;
export type TermId = (typeof TERMS)[number];

/** The look of the short line a term opens. */
const NOTE_CLASS = "tc-reveal block my-1 px-2 py-1 bg-sunk text-small text-ink font-normal normal-case tracking-normal rounded-sm";

/** Dotted-underlined words that open one short line under them on tap; `title` shows the same line on hover. */
export function TermButton({
  note,
  title,
  tall = false,
  children,
}: {
  note: ReactNode;
  title?: string;
  tall?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span>
      <button
        type="button"
        aria-expanded={open}
        title={title}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`underline decoration-dotted decoration-2 underline-offset-4 font-bold text-left ${tall ? "min-h-11" : ""}`}
      >
        {children}
      </button>
      {open ? (
        <span role="note" className={NOTE_CLASS}>
          {note}
        </span>
      ) : null}
    </span>
  );
}

export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const t = useT();
  return (
    <TermButton note={t(`term.${id}`)} title={t(`term.${id}`)}>
      {children ?? t(`term.${id}.word`)}
    </TermButton>
  );
}

/** Confidence in the income figure: bars and "Income figure: fair"; tap or hover says what it means. */
export function IncomeConfidence({ confidence }: { confidence: Confidence }) {
  const t = useT();
  const lang = useLang();
  const bars = confidence === "good" ? 3 : confidence === "fair" ? 2 : 1;
  return (
    <span className="text-small font-bold text-ink-soft" data-testid="income-confidence" data-confidence={confidence}>
      <TermButton note={t("term.confidence")} title={t("term.confidence")} tall>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="inline-flex items-end gap-px h-3">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`w-1 rounded-sm ${n <= bars ? "bg-ink-soft" : "bg-line"}`} style={{ height: `${n * 33}%` }} />
            ))}
          </span>
          {t("confidence.income", { level: t(`confidence.${confidence}`).toLocaleLowerCase(lang) })}
        </span>
      </TermButton>
    </span>
  );
}

/** The dictionary key of the line saying what choosing a priority means. */
export function priorityLine(p: Priority): string {
  return `priority.${p}.def`;
}

/**
 * A heading with a small "?" beside it (44 px target) that opens one line per priority under the heading.
 * The same lines show on hover over the "?", and each priority's own button carries its line as `title`.
 */
export function PriorityHelp({ children }: { children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const lines = PRIORITIES.map((p) => `${t(`priority.${p}`)}: ${t(priorityLine(p))}`);
  return (
    <div>
      <div className="flex items-center gap-1">
        {children}
        <button
          type="button"
          aria-expanded={open}
          aria-label={t("priority.help")}
          title={lines.join("\n")}
          data-testid="priority-help"
          onClick={() => setOpen((o) => !o)}
          className="tc-tap min-w-11 inline-flex items-center justify-center font-bold text-body normal-case tracking-normal"
        >
          <span aria-hidden="true" className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-line-strong">
            ?
          </span>
        </button>
      </div>
      {open ? (
        <ul role="note" className={`${NOTE_CLASS} flex flex-col gap-0.5`} data-testid="priority-lines">
          {PRIORITIES.map((p) => (
            <li key={p}>
              <b>{t(`priority.${p}`)}</b>: {t(priorityLine(p))}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Legend items that each explain themselves: hover shows the line as `title`; a tap opens it under the legend
 * (tap again to close, another item to switch).
 */
export function LegendExplain({
  items,
  testId,
}: {
  items: { id: string; mark: ReactNode; label: string; line: string }[];
  testId?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = items.find((item) => item.id === open);
  return (
    <div data-testid={testId}>
      <ul className="flex flex-wrap gap-x-3 text-small font-bold">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-expanded={open === item.id}
              title={item.line}
              onClick={() => setOpen((now) => (now === item.id ? null : item.id))}
              className="min-h-11 inline-flex items-center gap-1.5 underline decoration-dotted decoration-2 underline-offset-4"
            >
              {item.mark}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      {shown ? (
        <span role="note" className={NOTE_CLASS} data-testid="legend-line">
          {shown.line}
        </span>
      ) : null}
    </div>
  );
}

/** What green, patchy or bare means, and where it comes from. */
export function coverLine(t: Translate, cover: Cover): string {
  return `${t(`cover.${cover}.def`)} ${t("cover.source")}`;
}

/** Labels of the facts that count hot days at flowering; each opens what counts as a hot day. */
export const HOT_DAY_LABELS: readonly string[] = [
  "finding.heat.title",
  "finding.heat.fact",
  "evidence.hotDays",
  "weather.hotDays",
];

/**
 * "Hot days at flowering", tappable: a hot day is 30 °C or more, 15 April to 15 June, and, when the bundle
 * carries it, the usual daytime high in those weeks now and by 2050.
 */
export function HotDaysTerm({
  high,
  tall = true,
  children,
}: {
  high?: { now: Fact; by2050: Fact };
  tall?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  const lines = [t("heat.def")];
  if (high && typeof high.now.value === "number" && typeof high.by2050.value === "number") {
    lines.push(t("heat.high", { now: formatNumber(high.now.value, lang), by2050: formatNumber(high.by2050.value, lang) }));
  }
  const note = lines.join(" ");
  return (
    <TermButton
      title={note}
      tall={tall}
      note={
        <span data-testid="hot-def">
          {note}
          {high ? (
            <>
              {" "}
              <ScaleBadge scale={high.now.scale} iconOnly />
            </>
          ) : null}
        </span>
      }
    >
      {children}
    </TermButton>
  );
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Plain text in which any known term becomes a tappable Term, and any crop name gets its icon. */
export function RichText({ text }: { text: string }) {
  const t = useT();
  const words = TERMS.map((id) => ({ id, word: t(`term.${id}.word`) }));
  const crops = useCropWords();
  const all = [...words.map((w) => w.word), ...crops.map((c) => c.word)].sort((a, b) => b.length - a.length);
  // Only whole words count: "pea" is not found inside "chickpea" or "peak".
  const pattern = new RegExp(`(?<![\\p{L}-])(${all.map(escape).join("|")})(?![\\p{L}-])`, "iu");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part ? <span key={i}>{part}</span> : null;
        const lower = part.toLowerCase();
        const term = words.find((w) => w.word.toLowerCase() === lower);
        if (term) {
          return (
            <Term key={i} id={term.id}>
              {part}
            </Term>
          );
        }
        const crop = crops.find((c) => c.word.toLowerCase() === lower);
        return crop ? <CropName key={i} crop={crop.crop} text={part} /> : <span key={i}>{part}</span>;
      })}
    </>
  );
}
