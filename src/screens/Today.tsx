// "Your field today": the page a farmer comes back to. It says whether anything has changed since the last
// visit (above all, whether new data has changed the advice), what to do before sowing, what to watch this
// month, and the live rain and forecast. The plan is kept on the phone (src/state/plan.ts); nothing is sent.
// The app cannot alert a closed phone, and says so. Written with AI assistance (Claude, Anthropic).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { FieldBundle } from "../data/types";
import { DATA_STAMP } from "../data/fresh";
import { useLang, useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { encodeState } from "../state/url";
import type { PlanChange, SavedPlan } from "../state/plan";
import { dayStamp, forgetPlan, monthIndex, planChange, planKey, readPlan, writePlan } from "../state/plan";
import { useAppState, useTo } from "../state/useAppState";
import { CropSequence, OptionName, Slotted } from "../components/Crops";
import { openRing } from "../components/FieldShape";
import { ForecastNext } from "../components/ForecastNext";
import { CheckIcon, ChevronIcon, RiskIcon, WarnIcon } from "../components/Icons";
import { SeasonNow, shortDate } from "../components/SeasonNow";
import { COVER_CLASS } from "../components/YearStrip";
import { Button, Headline, SectionTitle } from "../components/ui";
import { centroid } from "../geo/geometry";
import { ownChecks } from "./check-share";

export default function Today({ bundle, now = new Date(), stamp = DATA_STAMP }: { bundle: FieldBundle; now?: Date; stamp?: string }) {
  const t = useT();
  const lang = useLang();
  const to = useTo();
  const [state] = useAppState();
  const best = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    lastCrop: state.lastCrop,
    intercrops: state.intercrops,
  }).ranked[0];
  const bestId = best?.option.id ?? null;
  const key = planKey(state);
  const query = encodeState(state);

  // What was kept when the page opened decides the message; it stays on screen until the farmer acknowledges it.
  const [opened] = useState<SavedPlan | null>(() => readPlan());
  const mine = opened && opened.key === key ? opened : null;
  const [change, setChange] = useState<PlanChange>(() => planChange(opened, { key, bestId, stamp }));
  const [done, setDone] = useState<string[]>(() => mine?.done ?? []);
  const [forgotten, setForgotten] = useState(false);
  const today = dayStamp(now);
  // The date and the advice the message compares with: kept as they were until acknowledged.
  const since = mine?.savedAt ?? today;
  const was = change === "advice" && mine?.bestId ? bundle.options.find((option) => option.id === mine.bestId) : undefined;

  const keep = (ticks: string[], acknowledged: boolean) => {
    if (forgotten) return;
    const unseen = mine && !acknowledged && (change === "data" || change === "advice");
    // Until the farmer has seen a change, what is kept still describes the visit before it.
    writePlan({
      query, key, field: bundle.field.name, done: ticks,
      bestId: unseen ? mine.bestId : bestId, stamp: unseen ? mine.stamp : stamp, savedAt: unseen ? mine.savedAt : today,
    });
  };
  // A first visit, or nothing new: keep the plan (and the language and view of this visit) at once.
  useEffect(() => {
    keep(done, false);
    // Only when the page opens or the farmer's answers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const checks = best ? ownChecks(best.option.why.checkLocally) : [];
  const ticked = checks.filter((check) => done.includes(check));
  const toggle = (check: string) => {
    const next = done.includes(check) ? done.filter((item) => item !== check) : [...done, check];
    setDone(next);
    keep(next, false);
  };

  const month = bundle.year.months[monthIndex(now)];
  const monthName = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", { month: "long" }).format(now);
  const centre = centroid(openRing(bundle.field.outline.coordinates));
  const message = change === "first" ? "today.kept" : change === "same" ? "today.same" : change === "data" ? "today.data" : "today.advice";

  return (
    <div className="flex flex-col flex-1 phone-land:w-full phone-land:max-w-[44rem] phone-land:mx-auto">
      <Headline sub={`${bundle.field.name} · ${shortDate(today, lang)}`}>{t("today.title")}</Headline>

      <div
        data-testid="plan-change"
        data-change={change}
        role={change === "advice" ? "alert" : "status"}
        className={`mx-4 p-3 bg-surface border-l-4 ${change === "advice" ? "border-warn" : "border-best"}`}
      >
        <p className="flex items-start gap-2 text-body font-bold">
          {change === "advice" ? <WarnIcon className="w-6 h-6 flex-none text-warn" /> : <CheckIcon className="w-6 h-6 flex-none" />}
          <span>
            {best ? (
              <Slotted text={t(message, { date: shortDate(since, lang) })} slots={{ option: <OptionName option={best.option} /> }} />
            ) : (
              t("today.kept")
            )}
          </span>
        </p>
        {was ? (
          <p className="mt-1 pl-8 text-body" data-testid="plan-was">
            <Slotted text={t("today.was")} slots={{ option: <OptionName option={was} /> }} />
          </p>
        ) : null}
        {best ? (
          <div className="mt-2 pl-8 flex items-center justify-between gap-3">
            <CropSequence option={best.option} />
            {change === "advice" ? (
              <Link to={to(`/why/${best.option.id}`)} className="font-bold underline underline-offset-2 min-h-11 inline-flex items-center">
                {t("today.seeWhy")}
              </Link>
            ) : null}
          </div>
        ) : null}
        {change === "data" || change === "advice" ? (
          <Button
            look="secondary"
            className="mt-2 ml-8"
            data-testid="plan-seen"
            onClick={() => {
              keep(done, true);
              setChange("same");
            }}
          >
            {t("today.gotIt")}
          </Button>
        ) : null}
      </div>

      {checks.length ? (
        <section data-testid="today-todo">
          <SectionTitle>
            <span className="flex items-center justify-between">
              {t("today.todo")}
              <span className="normal-case tracking-normal" data-testid="todo-count">
                {t("today.done", { n: ticked.length, total: checks.length })}
              </span>
            </span>
          </SectionTitle>
          <ul className="px-4 flex flex-col">
            {checks.map((check) => (
              <li key={check} className="border-t border-line">
                <label className="tc-tap flex items-center gap-3 py-2 text-body">
                  <input
                    type="checkbox"
                    className="w-6 h-6 flex-none accent-[var(--color-primary)]"
                    checked={done.includes(check)}
                    onChange={() => toggle(check)}
                  />
                  <span className={done.includes(check) ? "text-ink-soft line-through" : ""}>{t(check)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section data-testid="today-month">
        <SectionTitle>{t("today.month", { month: monthName })}</SectionTitle>
        <ul className="px-4 flex flex-col gap-2 text-body">
          <li className="flex items-start gap-3">
            <span className={`inline-block w-6 h-6 flex-none border border-line-strong ${COVER_CLASS[month.cover]}`} aria-hidden="true" />
            <span>
              <b>{t(`cover.${month.cover}`)}.</b> {t(`cover.${month.cover}.def`)}
            </span>
          </li>
          {month.risks.map((risk) => (
            <li key={risk} className="flex items-start gap-3" data-testid="today-risk">
              <RiskIcon risk={risk} className="w-6 h-6 flex-none" />
              <span>
                <b>{t(`risk.${risk}`)}.</b> {t(`risk.${risk}.def`)}
              </span>
            </li>
          ))}
          {month.risks.length ? null : <li className="text-ink-soft">{t("today.noRisk")}</li>}
        </ul>
      </section>

      <p className="px-4 pt-4 text-small text-ink-soft">{t("today.live")}</p>
      <SeasonNow centre={centre} />
      <ForecastNext centre={centre} />
      {/* The farmer's own field from space, one clear picture a month (src/screens/Timelapse.tsx). */}
      <Link
        to={to("/timelapse")}
        data-testid="timelapse-link"
        className="mx-4 mt-3 inline-flex items-center gap-1 min-h-11 font-bold text-body underline underline-offset-4"
      >
        {t("timelapse.title")}
        <ChevronIcon className="w-4 h-4" />
      </Link>
      <Link
        to={to("/year")}
        data-testid="today-year-link"
        className="mx-4 inline-flex items-center gap-1 min-h-11 font-bold text-body underline underline-offset-4"
      >
        {t("today.weather")}
        <ChevronIcon className="w-4 h-4" />
      </Link>

      <div className="px-4 py-4 flex flex-col items-start gap-2">
        <p className="text-small text-ink-soft" data-testid="today-phone">
          {t("today.phone")}
        </p>
        {forgotten ? null : (
          <button
            type="button"
            data-testid="plan-forget"
            className="min-h-11 text-body font-bold underline underline-offset-2"
            onClick={() => {
              forgetPlan();
              setForgotten(true);
            }}
          >
            {t("today.forget")}
          </button>
        )}
      </div>
    </div>
  );
}
