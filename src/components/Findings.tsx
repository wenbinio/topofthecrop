import type { Finding, View } from "../data/types";
import { useT } from "../i18n";
import { FactButton } from "./FactParts";
import { FindingIcon } from "./Icons";

/** "What we see on your field": three findings, each an icon, a short title and its number. */
export function Findings({ findings, view }: { findings: Finding[]; view: View }) {
  const t = useT();
  if (view === "simple") {
    return (
      <ul className="bg-surface border-y border-line" data-testid="findings">
        {findings.map((f) => (
          <li key={f.title} className="flex items-center gap-3 px-4 py-2 border-b border-line last:border-b-0">
            <FindingIcon titleKey={f.title} className="w-8 h-8 flex-none" />
            <span className="flex-1 font-bold text-big">{t(f.title)}</span>
            <FactButton fact={f.fact} label={t(f.fact.label ?? f.title)} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-3 bg-surface border-y border-line" data-testid="findings">
      {findings.map((f) => (
        <li key={f.title} className="px-2.5 py-2 border-l border-line first:border-l-0 min-w-0">
          <FindingIcon titleKey={f.title} className="w-5 h-5" />
          <span className="block font-bold text-small leading-tight mt-1">{t(f.title)}</span>
          <FactButton fact={f.fact} label={t(f.fact.label ?? f.title)} />
        </li>
      ))}
    </ul>
  );
}
