// Step 6, "Check and share". It used to assume the farmer has an adviser to hand the result to; many small farms
// do not. So it now says what the farmer can check alone for the best-fit rotation, who else can look at it, and
// only then offers the ways to pass it on. The route stays /adviser so links already shared keep working.
// Written with AI assistance (Claude, Anthropic).
import { useState } from "react";
import type { FieldBundle } from "../data/types";
import { useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { shareLink, useAppState, useTo } from "../state/useAppState";
import { ChatIcon, LinkIcon, PrintIcon } from "../components/Icons";
import { Button, Headline, LinkButton, SectionTitle } from "../components/ui";
import { WHO } from "./check-share";
import { CropSequence, OptionName } from "../components/Crops";
import { CreditsLink } from "../components/DataCredits";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export default function Adviser({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const to = useTo();
  const [state] = useAppState();
  const [copied, setCopied] = useState(false);
  const link = shareLink("/options", state);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${t("adviser.share")} ${link}`)}`;
  const best = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    lastCrop: state.lastCrop,
    intercrops: state.intercrops,
  }).ranked[0];

  return (
    <div className="flex flex-col flex-1 phone-land:w-full phone-land:max-w-[44rem] phone-land:mx-auto">
      <Headline sub={t("adviser.lead")}>{t("adviser.title")}</Headline>
      {best ? (
        <div className="mx-4 mb-2 p-3 flex items-center justify-between gap-3 bg-surface border border-line rounded-box" data-testid="share-plan-summary" data-option-id={best.option.id}>
          <OptionName option={best.option} className="text-big font-bold" />
          <CropSequence option={best.option} />
        </div>
      ) : null}

      <section data-testid="who-can-check">
        <SectionTitle>{t("adviser.who")}</SectionTitle>
        <ul className="px-4 flex flex-col gap-1 text-body">
          {WHO.map((who) => (
            <li key={who} data-testid="who">
              <b>{t(`adviser.who.${who}`)}</b>
              <span className="text-ink-soft">: {t(`adviser.who.${who}.for`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <SectionTitle>{t("adviser.shareHead")}</SectionTitle>
      <div className="px-4 pb-4 flex flex-col gap-3" data-testid="share">
        <LinkButton to={to("/print")} className="justify-start">
          <PrintIcon className="w-6 h-6" />
          {t("adviser.print")}
        </LinkButton>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="tc-tap inline-flex items-center gap-2 px-5 rounded-box font-bold text-body bg-surface text-ink border-2 border-line-strong">
          <ChatIcon className="w-6 h-6" />
          {t("adviser.whatsapp")}
        </a>
        <Button
          look="secondary"
          className="justify-start"
          onClick={() => {
            void copyText(link).then(setCopied);
          }}
        >
          <LinkIcon className="w-6 h-6" />
          {copied ? t("adviser.copied") : t("adviser.copy")}
        </Button>
      </div>
      <CreditsLink />
    </div>
  );
}
