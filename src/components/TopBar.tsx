import type { Lang, View } from "../data/types";
import { useT } from "../i18n";
import { useAppState } from "../state/useAppState";
import { BigTextIcon, TilesIcon } from "./Icons";

export function TopBar() {
  const [state, setState] = useAppState();
  const t = useT();
  const views: { id: View; Icon: typeof TilesIcon }[] = [
    { id: "standard", Icon: TilesIcon },
    { id: "simple", Icon: BigTextIcon },
  ];
  const langs: Lang[] = ["en", "it"];
  return (
    <header className="flex items-center justify-between gap-2 px-3 bg-surface border-b border-line print:hidden">
      <span className="font-display font-bold text-big whitespace-nowrap truncate">{t("app.name")}</span>
      <div className="flex items-center gap-2 flex-none">
        <div role="radiogroup" aria-label={t("view.label")} className="flex border-2 border-line-strong rounded-box overflow-hidden">
          {views.map(({ id, Icon }) => {
            const on = state.view === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                title={t(`view.${id}`)}
                onClick={() => setState({ view: id })}
                className={`w-11 h-11 flex items-center justify-center ${on ? "bg-line-strong text-surface" : "bg-surface text-ink"}`}
              >
                <Icon className="w-5 h-5" />
                <span className="sr-only">{t(`view.${id}`)}</span>
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label={t("lang.label")} className="flex">
          {langs.map((lang) => {
            const on = state.lang === lang;
            return (
              <button
                key={lang}
                type="button"
                role="radio"
                aria-checked={on}
                lang={lang}
                onClick={() => setState({ lang })}
                className={`w-10 h-11 font-bold text-body uppercase ${on ? "text-ink underline decoration-2 underline-offset-4" : "text-ink-soft"}`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
