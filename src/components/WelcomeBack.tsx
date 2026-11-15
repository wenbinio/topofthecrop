// On the first screen, for a farmer who has been here before: a way straight back to their field's day.
// Shown only when a plan is kept on this phone (src/state/plan.ts).
import { useState } from "react";
import { useT } from "../i18n";
import { forgetPlan, readPlan } from "../state/plan";
import { LinkButton } from "./ui";

export function WelcomeBack() {
  const t = useT();
  const [plan, setPlan] = useState(() => readPlan());
  if (!plan) return null;
  return (
    <div data-testid="welcome-back" className="px-4 py-3 bg-surface border-b border-line flex flex-col gap-2 print:hidden">
      <p className="text-body font-bold">{t("home.back.title", { field: plan.field })}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <LinkButton to={{ pathname: "/today", search: plan.query ? `?${plan.query}` : "" }}>{t("today.open")}</LinkButton>
        <button
          type="button"
          data-testid="welcome-new"
          className="min-h-11 text-body font-bold underline underline-offset-2"
          onClick={() => {
            forgetPlan();
            setPlan(null);
          }}
        >
          {t("home.back.new")}
        </button>
      </div>
    </div>
  );
}
