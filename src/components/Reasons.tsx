import type { Option, Priority } from "../data/types";
import { PRIORITIES } from "../data/types";
import { useLang, useT } from "../i18n";
import type { Reason } from "../ranking/reasons";
import { formatNumber, ScaleBadge } from "./FactParts";
import { BareSoilIcon, DropIcon, EuroIcon, SheafIcon } from "./Icons";
import { RichText, priorityLine } from "./Term";

export const PRIORITY_ICON: Record<Priority, typeof DropIcon> = {
  income: EuroIcon,
  water: DropIcon,
  soil: BareSoilIcon,
  forage: SheafIcon,
};

/** The fact a reason's number comes from, so the number can carry its scale mark. */
function reasonScale(reason: Reason, option: Option) {
  if (reason.key === "reason.income.same" || reason.key === "reason.soil.none") return null;
  if (reason.priority === "income") return option.facts.income.scale;
  if (reason.priority === "soil") return option.facts.nitrogen.scale;
  return null;
}

/** One short line per reason, each led by its priority's icon. */
export function ReasonList({ reasons, option, testId }: { reasons: Reason[]; option: Option; testId?: string }) {
  const t = useT();
  const lang = useLang();
  return (
    <ul className="flex flex-col gap-1" data-testid={testId}>
      {reasons.map((reason) => {
        const Icon = PRIORITY_ICON[reason.priority];
        const vars = Object.fromEntries(
          Object.entries(reason.vars).map(([k, v]) => [k, typeof v === "number" ? formatNumber(v, lang) : v]),
        );
        const scale = reasonScale(reason, option);
        return (
          <li key={reason.priority} data-testid="reason" data-priority={reason.priority} className="flex items-start gap-2 text-body">
            <Icon className="w-5 h-5 flex-none mt-0.5" title={t(`priority.${reason.priority}`)} />
            <span>
              <RichText text={t(reason.key, vars)} />
              {scale ? (
                <>
                  {" "}
                  <ScaleBadge scale={scale} iconOnly />
                </>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** How many priorities the farmer must put in order before the app moves on. */
export const MIN_RANKED = 2;

/** Tapping a priority adds it at the end of the order; tapping one already in the order takes it out and the later ones move up. */
export function togglePriority(chosen: Priority[], p: Priority): Priority[] {
  return chosen.includes(p) ? chosen.filter((x) => x !== p) : [...chosen, p];
}

/** The place of a priority in the farmer's order, as a number in a ring. */
export function RankMark({ place, className = "" }: { place: number; className?: string }) {
  return (
    <span
      data-testid="rank-mark"
      className={`inline-flex flex-none items-center justify-center w-6 h-6 rounded-full border-2 border-current font-mono text-small leading-none ${className}`}
    >
      {place}
    </span>
  );
}

/** The four priorities as chips. Tapped in order of importance; a chip in the order is filled and carries its place. */
export function PriorityChips({ chosen, onChange }: { chosen: Priority[]; onChange: (next: Priority[]) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t("options.priorities")} className="flex flex-wrap gap-2" data-testid="priority-chips">
      {PRIORITIES.map((p) => {
        const place = chosen.indexOf(p) + 1;
        const on = place > 0;
        const Icon = PRIORITY_ICON[p];
        return (
          <button
            key={p}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-label={t(`priority.${p}`)}
            data-rank={on ? place : undefined}
            title={t(priorityLine(p))}
            onClick={() => onChange(togglePriority(chosen, p))}
            className={`tc-tap inline-flex items-center gap-1.5 px-3 rounded-box border-2 font-bold text-body ${
              on ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"
            }`}
          >
            {on ? <RankMark place={place} /> : <Icon className="w-5 h-5 flex-none" />}
            {t(`priority.${p}`)}
          </button>
        );
      })}
    </div>
  );
}
