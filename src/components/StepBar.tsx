import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { useTo } from "../state/useAppState";

/** The setup is three steps: find the field, answer three questions, get the plan. Everything after lives in the tabs. */
export const STEPS = 3;

/** Which of the three setup steps a route belongs to. */
export function stepOf(pathname: string): number {
  if (pathname.startsWith("/questions")) return 2;
  if (pathname === "/" || pathname.startsWith("/area")) return 1;
  return 3;
}

export function StepBar({ pathname }: { pathname: string }) {
  const t = useT();
  const to = useTo();
  const current = stepOf(pathname);
  const paths = ["/", "/questions", "/options"];

  return (
    <nav aria-label={t("step.label", { n: current })} data-testid="step-bar"
      // Under the name and switches, full width; held sideways, between them in the same row (see TopBar).
      className="basis-full min-w-0 flex items-stretch gap-1 px-2 py-1 bg-surface border-t border-line print:hidden phone-land:basis-auto phone-land:flex-1 phone-land:min-w-0 phone-land:order-2 phone-land:px-0 phone-land:py-0 phone-land:border-t-0 phone-land:overflow-x-auto">
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
            {/* On a narrow phone only the current step keeps its name; the others show their number. */}
            <span className={`text-body truncate ${isCurrent ? "font-bold" : "text-ink-soft hidden min-[440px]:inline"}`}>{t(`step.${n}`)}</span>
          </>
        );
        const cls = `min-h-11 min-w-0 flex items-center gap-1.5 px-1 ${isCurrent ? "flex-auto" : "flex-none min-[440px]:flex-1"}`;
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
