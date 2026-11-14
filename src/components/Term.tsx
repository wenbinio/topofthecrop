import { useState } from "react";
import type { ReactNode } from "react";
import type { Fact } from "../data/types";
import { useLang, useT } from "../i18n";
import { ScaleBadge, formatNumber } from "./FactParts";

/** Terms that open a one-line explanation. Each has `term.<id>.word` and `term.<id>`. */
export const TERMS = ["ndvi", "et", "gm", "confidence"] as const;
export type TermId = (typeof TERMS)[number];

/** Dotted-underlined words that open one short line under them on tap; `title` shows the same line on hover. */
function TermButton({ note, title, tall = false, children }: { note: ReactNode; title?: string; tall?: boolean; children: ReactNode }) {
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
        <span role="note" className="block my-1 px-2 py-1 bg-sunk text-small text-ink font-normal normal-case tracking-normal rounded-sm">
          {note}
        </span>
      ) : null}
    </span>
  );
}

export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const t = useT();
  return <TermButton note={t(`term.${id}`)}>{children ?? t(`term.${id}.word`)}</TermButton>;
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

/** Plain text in which any known term becomes a tappable Term. */
export function RichText({ text }: { text: string }) {
  const t = useT();
  const words = TERMS.map((id) => ({ id, word: t(`term.${id}.word`) }));
  const pattern = new RegExp(`(${words.map((w) => escape(w.word)).join("|")})`, "i");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => {
        const hit = words.find((w) => w.word.toLowerCase() === part.toLowerCase());
        return hit ? (
          <Term key={i} id={hit.id}>
            {part}
          </Term>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
