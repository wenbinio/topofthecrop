// Once the farmer has a plan, the app is three places, not a row of steps: their field this month, the plan, and why.
// The tab bar sits at the bottom, in reach of a thumb. Written with AI assistance (Claude, Anthropic).
import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { useAppState, useTo } from "../state/useAppState";
import { useBundle } from "./BundleProvider";

/** Routes that belong to the plan, where the tab bar shows instead of the setup steps. */
export function isPlanRoute(pathname: string): boolean {
  return ["/options", "/why", "/year", "/adviser", "/today", "/timelapse"].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Which tab a plan route sits under: the weather detail belongs to Why, sharing to the plan, the timelapse to the field. */
export function tabOf(pathname: string): "field" | "plan" | "why" {
  if (pathname.startsWith("/today") || pathname.startsWith("/timelapse")) return "field";
  if (pathname.startsWith("/why") || pathname.startsWith("/year")) return "why";
  return "plan";
}

function FieldTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7l8-3 8 3v10l-8 3-8-3z" />
      <path d="M4 7l8 3 8-3M12 10v10" />
    </svg>
  );
}
function PlanTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}
function WhyTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.1" />
    </svg>
  );
}

export function TabBar({ pathname }: { pathname: string }) {
  const t = useT();
  const to = useTo();
  const [state] = useAppState();
  const bundle = useBundle();
  const here = tabOf(pathname);

  let whyPath = "/options";
  if (bundle.status === "ready") {
    const { ranked } = rankOptions({
      options: bundle.bundle.options,
      limits: state.limits,
      priorities: state.priorities,
      lastCrop: state.lastCrop,
      intercrops: state.intercrops,
    });
    if (ranked[0]) whyPath = `/why/${ranked[0].option.id}`;
  }
  const tabs = [
    { id: "field", path: "/today", Icon: FieldTabIcon },
    { id: "plan", path: "/options", Icon: PlanTabIcon },
    { id: "why", path: whyPath, Icon: WhyTabIcon },
  ] as const;

  return (
    <nav
      aria-label={t("tab.label")}
      data-testid="tab-bar"
      className="grid grid-cols-3 bg-surface border-t border-line print:hidden pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map(({ id, path, Icon }) => {
        const on = id === here;
        return (
          <Link
            key={id}
            to={to(path)}
            data-testid={`tab-${id}`}
            aria-current={on ? "page" : undefined}
            className={`tc-tap min-h-14 flex flex-col items-center justify-center gap-0.5 text-small font-bold ${on ? "text-primary" : "text-ink-soft"}`}
          >
            <Icon />
            {t(`tab.${id}`)}
          </Link>
        );
      })}
    </nav>
  );
}
