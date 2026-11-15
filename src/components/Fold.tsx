// A row that opens on a tap, so a screen can show one answer first and keep the rest one tap away.
// The panel grows and shrinks smoothly (a CSS grid row from 0fr to 1fr, in index.css) and, while closed, is
// inert: out of the tab order and unread by screen readers, though still in the page.
// Written with AI assistance (Claude, Anthropic).
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronIcon } from "./Icons";

/** How long the panel takes to open, in ms: the same as --tc-med in index.css. */
const FOLD_MS = 240;

export function Fold({
  title,
  summary,
  icon,
  defaultOpen = false,
  testId,
  openSignal = 0,
  children,
}: {
  /** Each time this number goes up, the row opens and scrolls into view (a button elsewhere asking for it). */
  openSignal?: number;
  title: ReactNode;
  /** A few words on the right of the title that say what is inside, shown open or closed. */
  summary?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const self = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openSignal) return;
    setOpen(true);
    self.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [openSignal]);
  // Once fully open, the panel stops clipping, so a source bubble on its last row can hang below it.
  const [settled, setSettled] = useState(defaultOpen);
  const headId = useId();
  const panelId = useId();
  useEffect(() => {
    if (!open) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), FOLD_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <section ref={self} className="border-b border-line bg-surface" data-testid={testId} data-open={open}>
      <h2>
        <button
          type="button"
          id={headId}
          aria-expanded={open}
          aria-controls={panelId}
          data-testid="fold-toggle"
          onClick={() => setOpen((o) => !o)}
          className="tc-tap w-full flex items-center gap-3 px-4 py-2 text-left"
        >
          {icon}
          <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-bold text-body">{title}</span>
            {summary ? <span className="text-small font-bold text-ink-soft">{summary}</span> : null}
          </span>
          <ChevronIcon className={`tc-turn w-5 h-5 flex-none text-ink-soft ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={headId} className="tc-fold" data-open={open} data-settled={settled} inert={!open}>
        <div className="tc-fold-inner">{children}</div>
      </div>
    </section>
  );
}
