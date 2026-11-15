// A tiny "?" beside a choice that says what it means: on hover or keyboard focus with a mouse, and on a tap on a
// phone (which has no hover). The tip sits under the "?" and closes on a second tap, a tap elsewhere or Escape.
// Written with AI assistance (Claude, Anthropic).
import { useEffect, useId, useRef, useState } from "react";

export function HelpTip({ label, text, testId }: { label: string; text: string; testId?: string }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={box} className="group relative flex-none inline-flex">
      {/* The hit area is a full 44 px; the mark itself is small, like a footnote. */}
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={tipId}
        data-testid={testId}
        onClick={() => setOpen((o) => !o)}
        className="w-11 h-11 flex items-start justify-center pt-1.5 text-ink-soft"
      >
        <span aria-hidden="true" className="w-5 h-5 rounded-full border border-current text-small font-bold leading-[1.1rem] text-center">
          ?
        </span>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`tc-pop tc-pop-end absolute right-0 top-9 z-30 w-64 p-2 rounded-box bg-surface border border-line-strong shadow-[var(--tc-shadow-float)] text-body font-normal text-ink ${
          open ? "block" : "hidden [@media(hover:hover)]:group-hover:block [@media(hover:hover)]:group-focus-within:block"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
