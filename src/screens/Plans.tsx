// "My plans": every plan the farmer kept, newest first, kept only on this phone (src/state/plan.ts). Each one reopens
// as it was left, or can be removed. Written with AI assistance (Claude, Anthropic).
import { useState } from "react";
import { Link } from "react-router-dom";
import type { FieldBundle } from "../data/types";
import { useLang, useT } from "../i18n";
import { planKey, readPlans, removePlanRecord } from "../state/plan";
import type { PlanRecord } from "../state/plan";
import { useAppState } from "../state/useAppState";
import { CropPlate } from "../components/CropPlate";
import { CropSequence, OptionName } from "../components/Crops";
import { Headline } from "../components/ui";

/** "15 Nov 2026" in the farmer's language. */
function dayText(day: string, lang: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
}

export default function Plans({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const lang = useLang();
  const [state] = useAppState();
  const [plans, setPlans] = useState<PlanRecord[]>(() => readPlans());
  const current = planKey(state);

  return (
    <div className="flex flex-col flex-1">
      <Headline sub={t("plans.lead")}>{t("plans.title")}</Headline>
      {plans.length === 0 ? (
        <p className="mx-4 p-4 rounded-box bg-surface border border-line text-body" data-testid="plans-empty">
          {t("plans.empty")}
        </p>
      ) : (
        <ul className="px-4 pb-4 flex flex-col gap-3" data-testid="plans-list">
          {plans.map((plan) => {
            const option = bundle.options.find((o) => o.id === plan.bestId);
            return (
              <li key={plan.key} className="p-3 bg-surface border border-line rounded-box flex flex-col gap-2" data-testid="plan-record" data-option-id={plan.bestId ?? ""}>
                <div className="flex items-center gap-3">
                  {option ? <CropPlate crop={option.isCurrent ? "durum" : option.sequence[0]} className="w-14 h-14" /> : null}
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-bold text-ink-soft">
                      {t("plans.saved", { date: dayText(plan.savedAt, lang) })} · {plan.field}
                    </p>
                    <p className="text-big font-bold">{option ? <OptionName option={option} /> : t("common.noData")}</p>
                    {plan.key === current ? (
                      <p className="text-small font-bold text-primary" data-testid="plan-current">
                        {t("plans.current")}
                      </p>
                    ) : null}
                  </div>
                </div>
                {option ? <CropSequence option={option} /> : null}
                <div className="flex items-center gap-2">
                  <Link
                    to={{ pathname: "/options", search: `?${plan.query}` }}
                    data-testid="plan-open"
                    className="tc-tap flex-1 min-h-11 inline-flex items-center justify-center rounded-box bg-primary text-on-primary font-bold text-body"
                  >
                    {t("plans.open")}
                  </Link>
                  <button
                    type="button"
                    data-testid="plan-remove"
                    onClick={() => {
                      removePlanRecord(plan.key);
                      setPlans(readPlans());
                    }}
                    className="tc-tap min-h-11 px-4 rounded-box border-2 border-line-strong font-bold text-body"
                  >
                    {t("plans.remove")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
