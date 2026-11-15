// The Settings screen: the farmer's own figures behind the income. The parts live in ./settings/;
// the route and links into it use ./settings/path. Written with AI assistance (Claude, Anthropic).
import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { FieldBundle } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { useT } from "../i18n";
import { useAppState } from "../state/useAppState";
import { BundleGate } from "../components/BundleProvider";
import { BackIcon } from "../components/Icons";
import { SectionTitle } from "../components/ui";
import { Editor } from "./settings/Editor";
import type { SettingsFrom } from "./settings/path";

function Body({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  if (!bundle.economics) {
    return (
      <p className="px-4 py-4 text-big" data-testid="settings-nothing">
        {t("settings.nothing")}
      </p>
    );
  }
  return <Editor economics={bundle.economics} />;
}

/**
 * Prices, costs and support: the farmer's own figures behind the income, in fold-out sections.
 * Every change applies at once.
 */
export default function Settings() {
  const t = useT();
  const [state] = useAppState();
  const location = useLocation();
  // Read once: every change to the figures replaces the link, and that drops the router state.
  const [from] = useState(() => (location.state as SettingsFrom | null)?.from);

  // Back to where the farmer came from, carrying the figures just changed (browser back would
  // return to the old link without them). With no record of that, the obvious screen.
  // A drawn field inside the basin uses the demo's regional prices; outside it there are none to edit.
  const fallback = state.fieldId === DEMO_FIELD_ID || state.outline ? "/options" : "/";
  const nothing = (
    <p className="px-4 py-4 text-big" data-testid="settings-nothing">
      {t("settings.nothing")}
    </p>
  );

  let body: ReactNode;
  if (state.fieldId === DEMO_FIELD_ID || state.outline) body = <BundleGate outside={nothing}>{(b) => <Body bundle={b} />}</BundleGate>;
  else
    body = (
      <p className="px-4 py-4 text-big" data-testid="settings-no-field">
        {t("settings.noField")}
      </p>
    );

  return (
    <div className="flex flex-col flex-1 pb-6 phone-land:w-full phone-land:max-w-[44rem] phone-land:mx-auto">
      <Link
        to={{ pathname: from ?? fallback, search: location.search }}
        replace
        className="self-start inline-flex items-center gap-1 min-h-11 px-3 font-bold text-body"
      >
        <BackIcon className="w-5 h-5" />
        {t("common.back")}
      </Link>
      <h1 className="px-4 pb-1 text-head">{t("settings.title")}</h1>
      {body}
      <section data-testid="voice-privacy">
        <SectionTitle>{t("voice.privacy.title")}</SectionTitle>
        <p className="px-4 text-small text-ink-soft">{t("voice.privacy.phone")}</p>
        <p className="px-4 pt-1 text-small text-ink-soft">{t("voice.privacy.app")}</p>
      </section>
    </div>
  );
}
