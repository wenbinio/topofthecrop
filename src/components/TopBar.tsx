import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Lang } from "../data/types";
import { useT } from "../i18n";
import { SETTINGS_PATH, settingsFrom } from "../screens/settings/path";
import { useAppState, useTo } from "../state/useAppState";
import { MicButton, VoiceLine, useVoice } from "../voice/Voice";
import { BackIcon, BigTextIcon, GearIcon } from "./Icons";

/** The app's mark: a wheat ear in a field parcel, drawn in the theme's colour. */
function Mark() {
  return (
    <svg viewBox="0 0 34 34" className="w-8 h-8 flex-none text-primary" aria-hidden="true">
      <rect x="2" y="2" width="30" height="30" rx="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M17 27V9" stroke="currentColor" strokeWidth="2.2" />
      <path d="M17 13l-5-3.5v4.5l5 3.5zm0 0l5-3.5v4.5l-5 3.5zm0 5l-5-3.5v4.5l5 3.5zm0 0l5-3.5v4.5l-5 3.5z" fill="currentColor" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

/**
 * What used to sit as a row of icons on every screen (voice, prices, view) now waits behind one "More" button,
 * so each screen starts with its own content. The language stays outside: it is the one switch everyone needs.
 */
function MoreMenu() {
  const t = useT();
  const to = useTo();
  const location = useLocation();
  const [state, setState] = useAppState();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const here = location.pathname === SETTINGS_PATH;

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  // A new screen closes the menu.
  useEffect(() => setOpen(false), [location.pathname]);

  const big = state.view === "simple";
  const canListen = useVoice()?.canListen ?? false;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="more-menu"
        data-testid="more"
        onClick={() => setOpen((o) => !o)}
        className="tc-tap w-11 h-11 flex items-center justify-center rounded-full text-ink"
      >
        <MoreIcon />
        <span className="sr-only">{t("menu.open")}</span>
      </button>
      <div
        id="more-menu"
        hidden={!open}
        data-testid="more-menu"
        className="tc-pop tc-pop-end absolute right-0 top-full mt-1 z-40 w-64 p-2 bg-surface border border-line rounded-box shadow-[var(--tc-shadow-float)] flex flex-col gap-1"
      >
        {canListen ? (
          <div className="flex items-center gap-2 px-2 min-h-11">
            <MicButton />
            <span className="text-body font-bold">{t("voice.mic")}</span>
          </div>
        ) : null}
        <Link
          to={to(SETTINGS_PATH)}
          state={settingsFrom(location.pathname, location.state)}
          replace={here}
          aria-current={here ? "page" : undefined}
          data-testid="gear"
          className="tc-tap flex items-center gap-3 px-2 min-h-11 rounded-box font-bold text-body"
        >
          <GearIcon className="w-6 h-6 flex-none" />
          {t("settings.title")}
        </Link>
        <button
          type="button"
          role="switch"
          aria-checked={big}
          data-testid="big-text"
          onClick={() => setState({ view: big ? "standard" : "simple" })}
          className="tc-tap flex items-center gap-3 px-2 min-h-11 rounded-box font-bold text-body text-left"
        >
          <BigTextIcon className="w-6 h-6 flex-none" />
          <span className="flex-1">{t("menu.bigText")}</span>
          <span aria-hidden="true" className={`tc-knob flex-none w-11 h-6 rounded-full border-2 border-line-strong flex items-center px-0.5 ${big ? "bg-primary" : "bg-surface"}`}>
            <span className={`tc-knob w-4 h-4 rounded-full ${big ? "bg-surface translate-x-5" : "bg-line-strong translate-x-0"}`} />
          </span>
        </button>
        <Link to={to("/credits")} className="tc-tap flex items-center px-2 min-h-11 rounded-box text-body underline underline-offset-4">
          {t("credits.title")}
        </Link>
      </div>
    </div>
  );
}

/** Where Back goes when there is no earlier screen in this visit (a shared link opened straight on a screen). */
export function parentOf(pathname: string): string {
  if (pathname.startsWith("/questions") || pathname.startsWith("/area")) return "/";
  if (pathname.startsWith("/why")) return "/options";
  if (pathname.startsWith("/year")) return "/options";
  if (pathname.startsWith("/timelapse")) return "/today";
  if (pathname.startsWith("/print")) return "/adviser";
  if (pathname === "/") return "/";
  return "/options";
}

/** A back arrow on every screen but the first: the previous screen of this visit, or the screen above this one. */
function BackArrow() {
  const t = useT();
  const to = useTo();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(to(parentOf(pathname)));
  };
  return (
    <button
      type="button"
      onClick={back}
      data-testid="top-back"
      className="tc-tap w-11 h-11 flex-none flex items-center justify-center rounded-full text-ink"
    >
      <BackIcon className="w-6 h-6" />
      <span className="sr-only">{t("common.backTop")}</span>
    </button>
  );
}

/**
 * The app's name, the language and a "More" menu, with the setup steps (`steps`) under them while the farmer is
 * still setting up. Held sideways the phone is short, so everything goes into one row.
 */
export function TopBar({ steps = null }: { steps?: ReactNode }) {
  const [state, setState] = useAppState();
  const t = useT();
  const langs: Lang[] = ["it", "en"];
  return (
    <header
      data-testid="top-bar"
      className="relative flex flex-wrap items-center justify-between gap-x-2 bg-surface border-b border-line print:hidden phone-land:flex-nowrap phone-land:gap-x-3 phone-land:px-3 phone-land:py-1"
    >
      {/* One row on a phone: the name shortens with "…" before the language and menu ever wrap. */}
      <span data-testid="app-name" className="flex-1 min-w-0 pl-1 py-1 flex items-center gap-1.5 phone-land:flex-none phone-land:pl-0 phone-land:py-0">
        <BackArrow />
        <span className="max-[380px]:hidden flex-none">
          <Mark />
        </span>
        <span className="min-w-0 font-display font-semibold text-big leading-tight truncate">{t("app.name")}</span>
      </span>
      <div className="flex items-center gap-1 flex-none pr-2 phone-land:pr-0 phone-land:order-3">
        <div role="radiogroup" aria-label={t("lang.label")} className="flex border-2 border-line-strong rounded-full overflow-hidden">
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
                className={`min-w-11 h-9 px-2 font-bold text-small uppercase ${on ? "bg-primary text-on-primary" : "bg-surface text-primary"}`}
              >
                {lang}
              </button>
            );
          })}
        </div>
        <MoreMenu />
      </div>
      {steps}
      <VoiceLine />
    </header>
  );
}
