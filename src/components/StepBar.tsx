import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { useBundle } from "./BundleProvider";

/** Which of the six steps a route belongs to. */
export function stepOf(pathname: string): number {
  if (pathname.startsWith("/questions")) return 2;
  if (pathname.startsWith("/options")) return 3;
  if (pathname.startsWith("/why")) return 4;
  if (pathname.startsWith("/year")) return 5;
  if (pathname.startsWith("/adviser")) return 6;
  return 1;
}

export function StepBar({ pathname }: { pathname: string }) {
  const t = useT();
  const to = useTo();
  const [state] = useAppState();
  const bundle = useBundle();
  const current = stepOf(pathname);

  let whyPath = "/options";
  if (bundle.status === "ready") {
    const { ranked } = rankOptions({
      options: bundle.bundle.options,
      limits: state.limits,
      priorities: state.priorities,
      scenario: state.scenario,
      lastCrop: state.lastCrop,
    });
    if (ranked[0]) whyPath = `/why/${ranked[0].option.id}`;
  }
  const paths = ["/", "/questions", "/options", whyPath, "/year", "/adviser"];

  return (
    <nav aria-label={t("step.label", { n: current })} className="flex items-stretch gap-1 px-2 py-1 bg-surface border-b border-line print:hidden">
      {paths.map((path, i) => {
        const n = i + 1;
        const isCurrent = n === current;
        const reachable = n < current;
        const mark = (
          <>
            <span
              className={`flex-none w-7 h-7 rounded-full flex items-center justify-center text-small font-bold border-2 ${
                isCurrent
                  ? "bg-primary text-on-primary border-primary"
                  : reachable
                    ? "bg-surface text-ink border-line-strong"
                    : "bg-surface text-ink-soft border-line"
              }`}
            >
              {n}
            </span>
            {isCurrent ? <span className="font-bold text-body whitespace-nowrap">{t(`step.${n}`)}</span> : null}
          </>
        );
        const cls = `min-h-11 flex items-center gap-1.5 ${isCurrent ? "flex-auto px-1" : "flex-none px-1.5"}`;
        if (reachable) {
          return (
            <Link key={n} to={to(path)} className={cls} aria-label={`${n}. ${t(`step.${n}`)}`}>
              {mark}
            </Link>
          );
        }
        return (
          <span key={n} className={cls} aria-current={isCurrent ? "step" : undefined} aria-label={isCurrent ? undefined : `${n}. ${t(`step.${n}`)}`}>
            {mark}
          </span>
        );
      })}
    </nav>
  );
}
