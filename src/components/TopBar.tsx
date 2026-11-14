import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Lang, View } from "../data/types";
import { useT } from "../i18n";
import { SETTINGS_PATH, settingsFrom } from "../screens/Settings";
import { useAppState, useTo } from "../state/useAppState";
import { MicButton, VoiceLine, useVoice } from "../voice/Voice";
import { BigTextIcon, GearIcon, TilesIcon } from "./Icons";

/** The way into prices and support, from every screen. */
function GearLink() {
  const t = useT();
  const to = useTo();
  const location = useLocation();
  const here = location.pathname === SETTINGS_PATH;
  return (
    <Link
      to={to(SETTINGS_PATH)}
      state={settingsFrom(location.pathname, location.state)}
      replace={here}
      aria-current={here ? "page" : undefined}
      title={t("settings.title")}
      data-testid="gear"
      className={`w-11 h-11 flex-none flex items-center justify-center rounded-box border-2 border-line-strong ${
        here ? "bg-line-strong text-surface" : "bg-surface text-ink"
      }`}
    >
      <GearIcon className="w-6 h-6" />
      <span className="sr-only">{t("settings.title")}</span>
    </Link>
  );
}

/**
 * The app name and switches, with the step bar (`steps`) under them. Held sideways the phone is short,
 * so everything goes into one row: name, steps, then the switches; the name gives way below 48 rem.
 */
export function TopBar({ steps = null }: { steps?: ReactNode }) {
  const [state, setState] = useAppState();
  const t = useT();
  const views: { id: View; Icon: typeof TilesIcon }[] = [
    { id: "standard", Icon: TilesIcon },
    { id: "simple", Icon: BigTextIcon },
  ];
  const langs: Lang[] = ["en", "it"];
  // The microphone takes the room the name had: upright under 28 rem (448 px) the name is left to screen readers.
  const mic = useVoice()?.canListen ?? false;
  return (
    <header
      data-testid="top-bar"
      className="relative flex flex-wrap items-center justify-between gap-x-2 bg-surface border-b border-line print:hidden phone-land:flex-nowrap phone-land:gap-x-3 phone-land:px-3 phone-land:py-1"
    >
      {/* At 360 px the name wraps onto two lines rather than squeezing the switches; with the microphone it gives way. */}
      <span
        data-testid="app-name"
        className={`min-w-0 pl-3 py-1 font-display font-bold text-big leading-tight phone-land:pl-0 phone-land:py-0 phone-land:text-body phone-land:max-[48rem]:hidden ${
          mic ? "max-[28rem]:sr-only" : ""
        }`}
      >
        {t("app.name")}
      </span>
      <div className="flex items-center gap-2 flex-none pr-3 phone-land:pr-0 phone-land:order-3">
        <MicButton />
        <GearLink />
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
      {steps}
      <VoiceLine />
    </header>
  );
}
