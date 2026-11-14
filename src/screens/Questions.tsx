import type { ReactNode } from "react";
import type { FieldBundle, Limit, Priority } from "../data/types";
import { CROPS, LIMITS, PRIORITIES } from "../data/types";
import { useT } from "../i18n";
import { useAppState, useGo } from "../state/useAppState";
import { CheckIcon, CropIcon, DropIcon, EuroIcon, BareSoilIcon, SheafIcon } from "../components/Icons";
import { Button, BottomBar, SectionTitle } from "../components/ui";

const PRIORITY_ICON: Record<Priority, typeof DropIcon> = {
  income: EuroIcon,
  water: DropIcon,
  soil: BareSoilIcon,
  forage: SheafIcon,
};

function Choice({
  on,
  disabled = false,
  onClick,
  children,
  role = "checkbox",
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: "checkbox" | "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`tc-tap w-full flex items-center gap-2 px-3 py-2 rounded-box border-2 text-left font-bold text-body ${
        on ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
      {on ? <CheckIcon className="w-5 h-5 ml-auto flex-none" /> : null}
    </button>
  );
}

export default function Questions({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const go = useGo();
  const [state, setState] = useAppState();

  function toggleLimit(limit: Limit) {
    const has = state.limits.includes(limit);
    const next = has ? state.limits.filter((l) => l !== limit) : [...state.limits, limit];
    setState({ limits: LIMITS.filter((l) => next.includes(l)) });
  }

  function togglePriority(p: Priority) {
    const has = state.priorities.includes(p);
    if (has) setState({ priorities: state.priorities.filter((x) => x !== p) });
    else if (state.priorities.length < 2) setState({ priorities: [...state.priorities, p] });
  }

  const full = state.priorities.length >= 2;

  return (
    <div className="flex flex-col flex-1">
      <SectionTitle>
        <span className="flex flex-wrap items-baseline gap-x-2">
          {t("q.lastCrop")}
          <span className="tc-dataset font-mono normal-case tracking-normal">
            {bundle.lastCrop.source.dataset} · {bundle.lastCrop.source.resolution}
          </span>
        </span>
      </SectionTitle>
      <div role="radiogroup" aria-label={t("q.lastCrop")} className="grid grid-cols-2 gap-2 px-4">
        {CROPS.map((crop) => (
          <Choice key={crop} role="radio" on={state.lastCrop === crop} onClick={() => setState({ lastCrop: crop })}>
            <CropIcon crop={crop} className="w-6 h-6 flex-none" />
            {t(`crop.${crop}`)}
          </Choice>
        ))}
      </div>

      <SectionTitle>{t("q.limits")}</SectionTitle>
      <div className="grid grid-cols-1 gap-2 px-4">
        {LIMITS.map((limit) => (
          <Choice key={limit} on={state.limits.includes(limit)} onClick={() => toggleLimit(limit)}>
            {t(`limit.${limit}`)}
          </Choice>
        ))}
      </div>

      <SectionTitle>
        {t("q.priorities")} · {state.priorities.length}/2
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {PRIORITIES.map((p) => {
          const on = state.priorities.includes(p);
          const Icon = PRIORITY_ICON[p];
          return (
            <Choice key={p} on={on} disabled={!on && full} onClick={() => togglePriority(p)}>
              <Icon className="w-6 h-6 flex-none" />
              {t(`priority.${p}`)}
            </Choice>
          );
        })}
      </div>

      <BottomBar>
        <Button className="flex-1" disabled={!full} onClick={() => go("/options")}>
          {t("common.next")}
        </Button>
      </BottomBar>
    </div>
  );
}
