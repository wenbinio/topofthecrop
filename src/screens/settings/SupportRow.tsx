// One support payment on Settings: its on/off checkbox, its name and condition, and its amount box (`children`).
// Written with AI assistance (Claude, Anthropic).
import { useId } from "react";
import type { ReactNode } from "react";
import type { Fact } from "../../data/types";
import { useT } from "../../i18n";
import { SourceButton, YoursTag } from "../../components/FactParts";

export function SupportRow({
  id,
  name,
  condition,
  level,
  fact,
  edited,
  on,
  onToggle,
  children,
}: {
  id: string;
  name: string;
  condition: string;
  level: string;
  /** The payment's amount, whose own source the Source button opens. */
  fact: Fact;
  edited: boolean;
  on: boolean;
  onToggle: (on: boolean) => void;
  children: ReactNode;
}) {
  const t = useT();
  const condId = useId();
  return (
    <li className="px-4 py-2 border-b border-line" data-testid="support-item" data-support-id={id}>
      <div className="flex items-start gap-3">
        <label className="flex-1 min-w-0 min-h-11 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => onToggle(e.target.checked)}
            aria-describedby={condId}
            className="w-7 h-7 mt-2.5 flex-none accent-primary cursor-pointer"
          />
          <span className={`pt-2.5 font-bold text-body ${on ? "" : "text-ink-soft"}`}>{name}</span>
        </label>
        {children}
      </div>
      <p id={condId} className="mt-1 text-small text-ink-soft">
        {condition}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 min-h-11 text-small font-bold">
        <span className="px-1.5 border border-line-strong rounded-sm">{level}</span>
        {on ? null : <span className="text-ink-soft">{t("settings.off")}</span>}
        {edited ? <YoursTag /> : null}
        <SourceButton fact={fact} />
      </p>
    </li>
  );
}
