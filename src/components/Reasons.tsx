import type { Option, Priority } from "../data/types";
import { PRIORITIES } from "../data/types";
import { useLang, useT } from "../i18n";
import type { Reason } from "../ranking/reasons";
import { formatNumber, ScaleBadge } from "./FactParts";
import { BareSoilIcon, CheckIcon, DropIcon, EuroIcon, SheafIcon } from "./Icons";
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

/** Choosing a third priority lets go of the one chosen first; tapping a chosen one releases it. */
export function togglePriority(chosen: Priority[], p: Priority): Priority[] {
  if (chosen.includes(p)) return chosen.filter((x) => x !== p);
  if (chosen.length < 2) return [...chosen, p];
  return [...chosen.slice(1), p];
}

/** The four priorities as toggle chips. Chosen chips are filled and carry a tick. */
export function PriorityChips({ chosen, onChange }: { chosen: Priority[]; onChange: (next: Priority[]) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t("options.priorities")} className="flex flex-wrap gap-2" data-testid="priority-chips">
      {PRIORITIES.map((p) => {
        const on = chosen.includes(p);
        const Icon = PRIORITY_ICON[p];
        return (
          <button
            key={p}
            type="button"
            role="checkbox"
            aria-checked={on}
            title={t(priorityLine(p))}
            onClick={() => onChange(togglePriority(chosen, p))}
            className={`tc-tap inline-flex items-center gap-1.5 px-3 rounded-box border-2 font-bold text-body ${
              on ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"
            }`}
          >
            {on ? <CheckIcon className="w-5 h-5 flex-none" /> : <Icon className="w-5 h-5 flex-none" />}
            {t(`priority.${p}`)}
          </button>
        );
      })}
    </div>
  );
}
