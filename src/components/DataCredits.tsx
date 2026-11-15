// "Data and credits": the credit lines the data's licences ask for (Copernicus, ISRIC, the JRC, the EEA, HydroSHEDS,
// MET Norway), the NASA datasets behind the figures, and how AI was used. They have a page of their own
// (src/screens/Credits.tsx), linked from the end of "Check and share", and they close the printout.
// DATA_SOURCES.md holds every licence and citation.
// Written with AI assistance (Claude, Anthropic).
import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { useTo } from "../state/useAppState";
import { ChevronIcon } from "./Icons";

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
  "credits.timelapse",
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

/** One line at the end of the last step, opening the credits page. */
export function CreditsLink() {
  const t = useT();
  const to = useTo();
  return (
    <p className="px-4 pb-4">
      <Link to={to("/credits")} data-testid="credits-link" className="inline-flex items-center gap-1 min-h-11 font-bold text-body underline underline-offset-4">
        {t("credits.title")}
        <ChevronIcon className="w-4 h-4" />
      </Link>
    </p>
  );
}
