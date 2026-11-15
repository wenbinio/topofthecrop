// A fold-out section of Settings. Whether it is open is component state, not part of the link.
// Written with AI assistance (Claude, Anthropic).
import { useId } from "react";
import type { ReactNode } from "react";
import { ChevronIcon } from "../../components/Icons";

export type SectionId = "prices" | "costs" | "yields" | "lift" | "support" | "own";

/**
 * A fold-out part of Settings: a header button with the section's name, a one-line summary and a chevron.
 * A closed section's rows are `hidden`, so they are out of the tab order and the accessibility tree.
 */
export function Section({
  id,
  title,
  unit,
  summary,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  unit?: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const headId = useId();
  const panelId = useId();
  return (
    <section className="border-b border-line" data-testid={`section-${id}`}>
      <h2>
        <button
          type="button"
          id={headId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          data-testid="section-toggle"
          className="tc-tap min-h-11 w-full flex items-center gap-3 px-4 py-2 text-left phone-land:py-1"
        >
          <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-bold text-big">
              {title}
              {unit ? <span className="font-normal text-body text-ink-soft"> {unit}</span> : null}
            </span>
            <span className="text-small font-bold text-ink-soft" data-testid="section-summary">
              {summary}
            </span>
          </span>
          <ChevronIcon className={`w-6 h-6 flex-none tc-turn ${open ? "rotate-90" : ""}`} />
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={headId} hidden={!open} className="pb-2 tc-reveal">
        {children}
      </div>
    </section>
  );
}
