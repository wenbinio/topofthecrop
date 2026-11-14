import { useState } from "react";
import type { ReactNode } from "react";
import { useT } from "../i18n";

/** Terms that open a one-line explanation. Each has `term.<id>.word` and `term.<id>`. */
export const TERMS = ["ndvi", "et", "gm", "confidence"] as const;
export type TermId = (typeof TERMS)[number];

export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <span>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="underline decoration-dotted decoration-2 underline-offset-4 font-bold"
      >
        {children ?? t(`term.${id}.word`)}
      </button>
      {open ? (
        <span role="note" className="block my-1 px-2 py-1 bg-sunk text-small text-ink rounded-sm">
          {t(`term.${id}`)}
        </span>
      ) : null}
    </span>
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
