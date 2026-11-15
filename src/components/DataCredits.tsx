// "Data and credits": the credit lines the data's licences ask for (Copernicus, ISRIC, the JRC, the EEA, HydroSHEDS,
// MET Norway), the NASA datasets behind the figures, and how AI was used. Shown folded at the end of "Check and
// share" and in full on the printout. DATA_SOURCES.md holds every licence and citation.
// Written with AI assistance (Claude, Anthropic).
import { useT } from "../i18n";

/** One line each, in this order. The Copernicus line keeps the wording its licence asks for. */
export const CREDIT_KEYS = [
  "credits.nasa",
  "credits.copernicus",
  "credits.chirps",
  "credits.fao",
  "credits.soil",
  "credits.crops",
  "credits.land",
  "credits.basin",
  "credits.forecast",
  "credits.trial",
] as const;

export const SOURCES_URL = "https://github.com/wenbinio/topofthecrop/blob/main/DATA_SOURCES.md";

/** The credit lines, the AI note and where to read the rest. */
export function CreditLines() {
  const t = useT();
  return (
    <>
      <ul className="flex flex-col gap-1" data-testid="credit-lines">
        {CREDIT_KEYS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <p className="mt-2" data-testid="ai-note">
        {t("credits.ai")}
      </p>
      <p className="mt-1">
        <a href={SOURCES_URL} target="_blank" rel="noreferrer" className="underline break-all">
          {t("credits.all")}
        </a>
      </p>
    </>
  );
}

/** Folded at first, so it costs one line at the end of the last step. */
export function DataCredits() {
  const t = useT();
  return (
    <details className="px-4 pb-4 text-small text-ink-soft" data-testid="data-credits">
      <summary className="tc-tap py-2 font-bold text-body text-ink cursor-pointer">{t("credits.title")}</summary>
      <CreditLines />
    </details>
  );
}
