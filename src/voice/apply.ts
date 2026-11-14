// What a list of voice commands does to the app state and route. Pure, so the voice and the taps share one rule set.
import type { AppState, FieldBundle } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { togglePriority } from "../components/Reasons";
import { rankOptions } from "../ranking/rank";
import { SETTINGS_PATH } from "../screens/Settings";
import { setLimit } from "../state/toggles";
import type { Step, VoiceCommand } from "./commands";

/** One thing done, said back to the farmer in the feedback line. `key` is a dictionary key. */
export type Done =
  | { kind: "on" | "off"; key: string }
  | { kind: "crop"; crop: string }
  | { kind: "say"; key: string };

export type Applied = {
  patch: Partial<AppState>;
  /** The route to go to, or null to stay. */
  to: string | null;
  read: boolean;
  stop: boolean;
  done: Done[];
};

/** The best-fit option's Why page, as the step bar links it; the options list without a bundle. */
export function whyPath(state: AppState, bundle: FieldBundle | null, route: string): string {
  if (route.startsWith("/why/")) return route;
  if (!bundle) return "/options";
  const { ranked } = rankOptions({
    options: bundle.options,
    limits: state.limits,
    priorities: state.priorities,
    scenario: state.scenario,
    lastCrop: state.lastCrop,
  });
  return ranked[0] ? `/why/${ranked[0].option.id}` : "/options";
}

const STEP_KEY: Record<Step, string> = {
  field: "step.1",
  questions: "step.2",
  options: "step.3",
  why: "step.4",
  year: "step.5",
  adviser: "step.6",
  settings: "settings.title",
  print: "print.button",
};

/** The dictionary key naming the screen at `route`, for the feedback line. */
export function routeKey(route: string): string {
  if (route === "/") return "step.1";
  if (route.startsWith("/questions")) return "step.2";
  if (route.startsWith("/options")) return "step.3";
  if (route.startsWith("/why")) return "step.4";
  if (route.startsWith("/year")) return "step.5";
  if (route.startsWith("/adviser")) return "step.6";
  if (route.startsWith("/print")) return "print.button";
  if (route === SETTINGS_PATH) return "settings.title";
  return "step.1";
}

/** Where the screen's own Next button goes; null where there is none. Questions needs two priorities, as its button does. */
function nextOf(route: string, state: AppState): string | { blocked: string } | null {
  if (route === "/") return state.fieldId === DEMO_FIELD_ID ? "/questions" : { blocked: "settings.noField" };
  if (route.startsWith("/questions")) return state.priorities.length >= 2 ? "/options" : { blocked: "voice.pick2" };
  if (route.startsWith("/options") || route.startsWith("/why")) return "/year";
  if (route.startsWith("/year")) return "/adviser";
  return null;
}

/** Where the screen's own Back button goes. */
function backOf(route: string, state: AppState): string | null {
  if (route.startsWith("/questions") || route.startsWith("/area")) return "/";
  if (route.startsWith("/options")) return "/questions";
  if (route.startsWith("/why") || route.startsWith("/year")) return "/options";
  if (route.startsWith("/adviser")) return "/year";
  if (route.startsWith("/print")) return "/adviser";
  if (route === SETTINGS_PATH) return state.fieldId === DEMO_FIELD_ID ? "/options" : state.outline ? "/area" : "/";
  return null;
}

/**
 * Folds the commands, in order, into one state patch and at most one route (the last one asked for).
 * Priorities follow the chips' rule (a third lets go of the first); limits keep the list order the Questions screen keeps.
 */
export function applyCommands(state: AppState, commands: VoiceCommand[], route: string, bundle: FieldBundle | null): Applied {
  let next: AppState = { ...state };
  const patch: Partial<AppState> = {};
  const set = <K extends keyof AppState>(key: K, value: AppState[K]) => {
    next = { ...next, [key]: value };
    patch[key] = value;
  };
  let to: string | null = null;
  let read = false;
  let stop = false;
  const done: Done[] = [];
  const here = () => to ?? route;

  for (const cmd of commands) {
    switch (cmd.kind) {
      case "priority": {
        const has = next.priorities.includes(cmd.priority);
        if (has !== cmd.on) set("priorities", togglePriority(next.priorities, cmd.priority));
        done.push({ kind: cmd.on ? "on" : "off", key: `priority.${cmd.priority}` });
        break;
      }
      case "limit":
        set("limits", setLimit(next.limits, cmd.limit, cmd.on));
        done.push({ kind: cmd.on ? "on" : "off", key: `limit.${cmd.limit}` });
        break;
      case "lastCrop":
        set("lastCrop", cmd.crop);
        set("lastCropName", "");
        done.push({ kind: "crop", crop: cmd.crop });
        break;
      case "scenario":
        set("scenario", cmd.scenario);
        done.push({ kind: "say", key: `scenario.${cmd.scenario}` });
        break;
      case "view":
        set("view", cmd.view);
        done.push({ kind: "say", key: `view.${cmd.view}` });
        break;
      case "lang":
        set("lang", cmd.lang);
        done.push({ kind: "say", key: `voice.lang.${cmd.lang}` });
        break;
      case "read":
        read = true;
        stop = false;
        break;
      case "stop":
        stop = true;
        read = false;
        done.push({ kind: "say", key: "voice.stopped" });
        break;
      case "next":
      case "back": {
        const target = cmd.kind === "next" ? nextOf(here(), next) : backOf(here(), next);
        if (typeof target === "string") {
          to = target;
          done.push({ kind: "say", key: routeKey(target) });
        } else if (target) done.push({ kind: "say", key: target.blocked });
        break;
      }
      case "go": {
        to = cmd.step === "field" ? "/" : cmd.step === "why" ? whyPath(next, bundle, here()) : cmd.step === "settings" ? SETTINGS_PATH : `/${cmd.step}`;
        done.push({ kind: "say", key: STEP_KEY[cmd.step] });
        break;
      }
    }
  }
  if (to === route) to = null;
  return { patch, to, read, stop, done };
}

/** "Income, Water on, Options": toggles said in a row share one "on" or "off". `t` translates, `crop` names a crop. */
export function describeDone(done: Done[], t: (key: string, vars?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  for (let i = 0; i < done.length; i++) {
    const d = done[i];
    if (d.kind === "on" || d.kind === "off") {
      const names = [t(d.key)];
      while (i + 1 < done.length && done[i + 1].kind === d.kind) names.push(t((done[++i] as { key: string }).key));
      parts.push(t(d.kind === "on" ? "voice.on" : "voice.off", { what: names.join(", ") }));
    } else if (d.kind === "crop") parts.push(`${t("q.lastCrop")}: ${t(`crop.${d.crop}`)}`);
    else parts.push(t(d.key));
  }
  return parts.join(", ");
}
