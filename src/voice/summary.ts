// What "read aloud" says on each screen: built from what the screen shows, through the dictionaries. Pure.
import type { AppState, FieldBundle, Lang, Option } from "../data/types";
import { PRIORITIES } from "../data/types";
import { MIN_RANKED } from "../components/Reasons";
import { translate } from "../i18n";
import { formatNumber, unitText, valueText } from "../components/FactParts";
import { optionWords } from "../components/Crops";
import { rankOptions } from "../ranking/rank";
import type { Reason } from "../ranking/reasons";
import { reasonsFor } from "../ranking/reasons";
import { WHO, ownChecks } from "../screens/check-share";
import { SETTINGS_PATH } from "../screens/settings/path";

/** Unit marks and signs written out, so the phone says "euro per hectare a year" rather than reading symbols. */
export function spoken(text: string, lang: Lang): string {
  const t = (key: string) => translate(lang, key);
  return text
    .replace(/€\/ha\/(yr|anno)/g, t("say.eurHaYear"))
    .replace(/€\/ha/g, t("say.eurHa"))
    .replace(/kg N\/ha/g, t("say.kgNHa"))
    .replace(/\s?°C/g, ` ${t("say.degrees")}`)
    .replace(/(^|\s)\+(?=\d)/g, `$1${t("say.plus")} `)
    .replace(/(^|\s)[-−](?=\d)/g, `$1${t("say.minus")} `)
    .replace(/(\d)\s?[–-]\s?(\d)/g, `$1 ${t("say.to")} $2`);
}

function sentence(text: string): string {
  const s = text.trim();
  return /[.!?:]$/.test(s) ? s : `${s}.`;
}

function reasonText(reason: Reason, lang: Lang): string {
  const vars = Object.fromEntries(
    Object.entries(reason.vars).map(([k, v]) => [k, typeof v === "number" ? formatNumber(v, lang) : v]),
  );
  return translate(lang, reason.key, vars);
}

function cropWord(crop: string, lang: Lang, lower = false): string {
  const name = translate(lang, `crop.${crop}`);
  return lower ? name.toLocaleLowerCase(lang) : name;
}

function ranking(bundle: FieldBundle, state: AppState) {
  return rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    scenario: state.scenario,
    lastCrop: state.lastCrop,
    intercrops: state.intercrops,
  });
}

function reasonsLines(option: Option, bundle: FieldBundle, state: AppState): string[] {
  const current = bundle.options.find((o) => o.isCurrent);
  return reasonsFor(option, current, state.priorities).map((r) => sentence(reasonText(r, state.lang)));
}

/** Options: the recommendation headline, its reasons and the adviser line. */
export function optionsSummary(bundle: FieldBundle, state: AppState): string {
  const lang = state.lang;
  const best = ranking(bundle, state).ranked[0];
  if (!best) return sentence(translate(lang, "step.3"));
  const option = best.option;
  const headline = option.isCurrent
    ? translate(lang, "options.stay", { crop: cropWord("durum", lang, true) })
    : option.strips && option.strips[0] !== option.sequence[0]
      ? translate(lang, "options.plantStrips", { a: cropWord(option.sequence[0], lang, true), b: cropWord(option.strips[0], lang, true) })
      : translate(lang, "options.plant", { crop: cropWord(option.sequence[0], lang, true) });
  return [sentence(headline), ...reasonsLines(option, bundle, state), sentence(translate(lang, "options.adviser"))].join(" ");
}

/** Why: the option, its reasons and what to check locally. */
export function whySummary(bundle: FieldBundle, state: AppState, optionId: string): string {
  const lang = state.lang;
  const option = bundle.options.find((o) => o.id === optionId);
  if (!option) return sentence(translate(lang, "why.notFound"));
  const checks = option.why.checkLocally.map((k) => sentence(translate(lang, k).replace(/\?$/, "")));
  return [
    sentence(optionWords(option, (key, vars) => translate(lang, key, vars))),
    ...reasonsLines(option, bundle, state),
    checks.length ? `${translate(lang, "why.h.check")}: ${checks.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Year: hot flowering days now and by 2050 at the chosen stop, and the best fit then. */
export function yearSummary(bundle: FieldBundle, state: AppState): string {
  const lang = state.lang;
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const hot = bundle.year.hotDays[state.scenario];
  const days = (f: typeof hot.now) => `${valueText(f, t, lang)} ${unitText(f.unit, t)}`.trim();
  const best = ranking(bundle, state).ranked[0];
  const lines = [
    sentence(`${t("year.hotHead")}, ${t(`scenario.${state.scenario}`).toLocaleLowerCase(lang)}: ${days(hot.now)} ${t("year.now")}, ${days(hot.by2050)} ${t("year.by2050")}`),
  ];
  if (best) lines.push(sentence(`${t("year.best")}: ${optionWords(best.option, (key, vars) => translate(lang, key, vars))}`));
  return lines.join(" ");
}

/** Questions: the last crop, the priorities chosen, and what is still to pick. */
export function questionsSummary(state: AppState): string {
  const lang = state.lang;
  const t = (key: string) => translate(lang, key);
  const last =
    state.lastCrop === "other" ? state.lastCropName || t("q.otherPlain") : cropWord(state.lastCrop, lang);
  const lines = [sentence(`${t("q.lastCrop")}: ${last}`)];
  if (state.priorities.length) {
    lines.push(sentence(`${t("options.priorities")}: ${state.priorities.map((p, i) => `${i + 1} ${t(`priority.${p}`)}`).join(", ")}`));
  }
  if (state.priorities.length < MIN_RANKED) {
    const left = PRIORITIES.filter((p) => !state.priorities.includes(p)).map((p) => t(`priority.${p}`));
    lines.push(sentence(`${t("q.priorities")}: ${left.join(", ")}`));
  }
  return lines.join(" ");
}

/** Check and share: what to check alone for the best fit, then who else can look at it. */
export function checkSummary(bundle: FieldBundle, state: AppState): string {
  const lang = state.lang;
  const t = (key: string) => translate(lang, key);
  const best = ranking(bundle, state).ranked[0];
  const checks = best ? ownChecks(best.option.why.checkLocally).map((k) => sentence(t(k).replace(/\?$/, ""))) : [];
  return [
    sentence(t("adviser.title")),
    checks.length ? `${t("adviser.self")}: ${checks.join(" ")}` : "",
    sentence(`${t("adviser.who")}: ${WHO.map((who) => t(`adviser.who.${who}`)).join("; ")}`),
  ]
    .filter(Boolean)
    .join(" ");
}

const HEADINGS: [test: (route: string) => boolean, key: string][] = [
  [(r) => r === "/", "find.hint"],
  [(r) => r.startsWith("/area"), "area.title"],
  [(r) => r.startsWith("/adviser"), "adviser.title"],
  [(r) => r.startsWith("/print"), "print.button"],
  [(r) => r === SETTINGS_PATH, "settings.title"],
];

/** The words "read aloud" speaks on the screen at `route`, with units written out. */
export function screenSummary(route: string, bundle: FieldBundle | null, state: AppState): string {
  const lang = state.lang;
  let text: string;
  if (bundle && route.startsWith("/options")) text = optionsSummary(bundle, state);
  else if (bundle && route.startsWith("/why/")) text = whySummary(bundle, state, decodeURIComponent(route.slice(5)));
  else if (bundle && route.startsWith("/year")) text = yearSummary(bundle, state);
  else if (bundle && route.startsWith("/adviser")) text = checkSummary(bundle, state);
  else if (route.startsWith("/questions")) text = questionsSummary(state);
  else text = sentence(translate(lang, HEADINGS.find(([test]) => test(route))?.[1] ?? "app.name"));
  return spoken(text, lang);
}
