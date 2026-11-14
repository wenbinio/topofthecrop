import { useState } from "react";
import { useT } from "../i18n";
import { shareLink, useAppState, useTo } from "../state/useAppState";
import { ChatIcon, LinkIcon, PrintIcon } from "../components/Icons";
import { BackButton, BottomBar, Button, Headline, LinkButton } from "../components/ui";

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

export default function Adviser() {
  const t = useT();
  const to = useTo();
  const [state] = useAppState();
  const [copied, setCopied] = useState(false);
  const link = shareLink("/options", state);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${t("adviser.share")} ${link}`)}`;

  return (
    <div className="flex flex-col flex-1">
      <Headline>{t("adviser.title")}</Headline>
      <div className="px-4 py-2 flex flex-col gap-3">
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
