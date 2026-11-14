import type { FieldBundle, Finding, View } from "../data/types";
import { useT } from "../i18n";
import { FactButton } from "./FactParts";
import { FindingIcon } from "./Icons";
import { HOT_DAY_LABELS, HotDaysTerm } from "./Term";

/** "What we see on your field": three findings, each an icon, a short title and its number. */
export function Findings({
  findings,
  view,
  flowerHigh,
}: {
  findings: Finding[];
  view: View;
  flowerHigh?: FieldBundle["year"]["flowerHigh"];
}) {
  const t = useT();
  // The hot-days finding's title says what counts as a hot day, on hover and on tap.
  const title = (f: Finding) =>
    HOT_DAY_LABELS.includes(f.title) ? <HotDaysTerm high={flowerHigh}>{t(f.title)}</HotDaysTerm> : t(f.title);
  if (view === "simple") {
    return (
      <ul className="bg-surface border-y border-line" data-testid="findings">
        {findings.map((f) => (
          <li key={f.title} className="flex items-center gap-3 px-4 py-2 border-b border-line last:border-b-0">
            <FindingIcon titleKey={f.title} className="w-8 h-8 flex-none" />
            <span className="flex-1 font-bold text-big">{title(f)}</span>
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
          <span className="block font-bold text-small leading-tight mt-1">{title(f)}</span>
          <FactButton fact={f.fact} label={t(f.fact.label ?? f.title)} />
        </li>
      ))}
    </ul>
  );
}
