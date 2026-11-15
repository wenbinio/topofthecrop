// "Data and credits" on a page of its own: the credit lines the data licences ask for and the AI note, moved off
// the steps so they stay short. Reached from Check and share; the printout carries the same lines.
// Written with AI assistance (Claude, Anthropic).
import { CreditLines } from "../components/DataCredits";
import { BackButton, BottomBar, Headline } from "../components/ui";
import { useT } from "../i18n";
import { useTo } from "../state/useAppState";

export const CREDITS_PATH = "/credits";

export default function Credits() {
  const t = useT();
  const to = useTo();
  return (
    <div className="flex flex-col flex-1" data-testid="credits-page">
      <Headline>{t("credits.title")}</Headline>
      <div className="px-4 pb-4 text-body text-ink-soft">
        <CreditLines />
      </div>
      <BottomBar>
        <BackButton to={to("/adviser")} />
      </BottomBar>
    </div>
  );
}
