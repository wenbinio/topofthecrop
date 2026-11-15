// Step 6, "Check and share". It used to assume the farmer has an adviser to hand the result to; many small farms
// do not. So it now says what the farmer can check alone for the best-fit rotation, who else can look at it, and
// only then offers the ways to pass it on. The route stays /adviser so links already shared keep working.
// Written with AI assistance (Claude, Anthropic).
import { useState } from "react";
import type { FieldBundle } from "../data/types";
import { useT } from "../i18n";
import { rankOptions } from "../ranking/rank";
import { shareLink, useAppState, useTo } from "../state/useAppState";
import { CropName, CropSequence, optionCrop } from "../components/Crops";
import { ChatIcon, LinkIcon, PrintIcon } from "../components/Icons";
import { BackButton, BottomBar, Button, Headline, LinkButton, SectionTitle } from "../components/ui";
import { WHO, ownChecks } from "./check-share";

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
    scenario: state.scenario,
    lastCrop: state.lastCrop,
  }).ranked[0];
  const checks = best ? ownChecks(best.option.why.checkLocally) : [];

  return (
    <div className="flex flex-col flex-1 phone-land:w-full phone-land:max-w-[44rem] phone-land:mx-auto">
      <Headline>{t("adviser.title")}</Headline>

      {best && checks.length ? (
        <section data-testid="own-checks" data-option-id={best.option.id}>
          <SectionTitle>{t("adviser.self")}</SectionTitle>
          <div className="px-4">
            <div className="flex items-center justify-between gap-3">
              <CropName crop={optionCrop(best.option)} className="text-big font-bold" />
              <CropSequence option={best.option} />
            </div>
            <ul className="list-disc pl-5 pt-1 text-body">
              {checks.map((key) => (
                <li key={key} data-testid="own-check" className="py-0.5">
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </section>
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
        <p className="text-small text-ink-soft break-all font-mono">{link}</p>
      </div>
      <BottomBar>
        <BackButton to={to("/year")} />
      </BottomBar>
    </div>
  );
}
