// Voice in the app: the microphone in the top bar, "read aloud", and the one-line answer under the bar.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AppState, Lang } from "../data/types";
import { CROPS } from "../data/types";
import { useT } from "../i18n";
import { economicsCrops } from "../money/money";
import { SETTINGS_PATH, settingsFrom } from "../screens/Settings";
import { encodeState } from "../state/url";
import { useAppState } from "../state/useAppState";
import { useBundle } from "../components/BundleProvider";
import { MicIcon, MicLiveIcon, SpeakerIcon, StopIcon } from "../components/Icons";
import type { Done } from "./apply";
import { applyCommands, describeDone } from "./apply";
import { parseCommand } from "./commands";
import { screenSummary } from "./summary";
import type { ListenError } from "./useSpeech";
import { useRecognition, useSpeechEnv, useSynthesis } from "./useSpeech";

/** How long the answer line stays, in ms. */
export const LINE_MS = 6000;

type Line =
  | { kind: "listening" }
  | { kind: "heard"; heard: string; done: Done[] }
  | { kind: "missed"; heard: string }
  | { kind: "error"; error: ListenError };

type Voice = {
  canListen: boolean;
  canSpeak: boolean;
  listening: boolean;
  speaking: boolean;
  line: Line | null;
  toggleListen: () => void;
  readScreen: () => void;
  stopSpeaking: () => void;
};

const VoiceContext = createContext<Voice | null>(null);

export function useVoice(): Voice | null {
  return useContext(VoiceContext);
}

function search(state: AppState): string {
  const q = encodeState(state);
  return q ? `?${q}` : "";
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const env = useSpeechEnv();
  const rec = useRecognition(env);
  const synth = useSynthesis(env);
  const [state, setState] = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const bundleState = useBundle();
  const bundle = bundleState.status === "ready" ? bundleState.bundle : null;
  const [line, setLine] = useState<Line | null>(null);

  // The latest of everything, for the recognition callbacks that arrive later.
  const latest = useRef({ state, setState, location, navigate, bundle });
  useLayoutEffect(() => {
    latest.current = { state, setState, location, navigate, bundle };
  });

  // A spoken summary waiting for the route change it belongs to.
  const pending = useRef<{ text: string; lang: Lang } | null>(null);
  const { cancel, speak } = synth;
  useEffect(() => {
    cancel();
    const waiting = pending.current;
    pending.current = null;
    if (waiting) speak(waiting.text, waiting.lang);
  }, [location.pathname, cancel, speak]);

  // The answer line goes after a few seconds; "listening" stays until the phone stops listening.
  useEffect(() => {
    if (!line || line.kind === "listening") return;
    const id = setTimeout(() => setLine(null), LINE_MS);
    return () => clearTimeout(id);
  }, [line]);
  useEffect(() => {
    if (!rec.listening) setLine((l) => (l?.kind === "listening" ? null : l));
  }, [rec.listening]);

  const heard = useCallback(
    (alternatives: string[]) => {
      const { state, setState, location, navigate, bundle } = latest.current;
      const route = location.pathname;
      const crops = bundle?.economics ? economicsCrops(bundle.economics) : CROPS;
      let said = alternatives[0] ?? "";
      let commands = parseCommand(said, state.lang, { route, crops });
      for (const alt of alternatives.slice(1)) {
        if (commands.length) break;
        const found = parseCommand(alt, state.lang, { route, crops });
        if (found.length) {
          commands = found;
          said = alt;
        }
      }
      if (!commands.length) {
        setLine({ kind: "missed", heard: said });
        return;
      }
      const result = applyCommands(state, commands, route, bundle);
      const nextState: AppState = { ...state, ...result.patch };
      if (result.stop) cancel();
      if (result.to) {
        navigate(
          { pathname: result.to, search: search(nextState) },
          result.to === SETTINGS_PATH ? { state: settingsFrom(route, location.state) } : undefined,
        );
      } else if (Object.keys(result.patch).length) setState(result.patch);
      const done = [...result.done];
      if (result.read) {
        const text = screenSummary(result.to ?? route, bundle, nextState);
        if (result.to) pending.current = { text, lang: nextState.lang };
        else speak(text, nextState.lang);
        done.push({ kind: "say", key: "voice.reading" });
      }
      setLine({ kind: "heard", heard: said, done });
    },
    [cancel, speak],
  );

  const toggleListen = useCallback(() => {
    if (rec.listening) {
      rec.stop();
      return;
    }
    // The phone must not hear itself.
    cancel();
    setLine({ kind: "listening" });
    rec.listen(latest.current.state.lang, heard, (error) => setLine({ kind: "error", error }));
  }, [rec, cancel, heard]);

  const readScreen = useCallback(() => {
    const { state, location, bundle } = latest.current;
    speak(screenSummary(location.pathname, bundle, state), state.lang);
  }, [speak]);

  const value: Voice = {
    canListen: rec.supported,
    canSpeak: synth.supported,
    listening: rec.listening,
    speaking: synth.speaking,
    line,
    toggleListen,
    readScreen,
    stopSpeaking: cancel,
  };
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

/** The microphone: tap, say one phrase. Not shown where the browser cannot listen. */
export function MicButton() {
  const voice = useVoice();
  const t = useT();
  if (!voice?.canListen) return null;
  const on = voice.listening;
  return (
    <button
      type="button"
      data-testid="mic"
      aria-pressed={on}
      title={t(on ? "voice.stopListening" : "voice.mic")}
      onClick={voice.toggleListen}
      className={`w-11 h-11 flex-none flex items-center justify-center rounded-box border-2 border-line-strong ${
        on ? "bg-line-strong text-surface" : "bg-surface text-ink"
      }`}
    >
      {on ? <MicLiveIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
      <span className="sr-only">{t("voice.mic")}</span>
    </button>
  );
}

/** "Read aloud" for this screen; tap again to stop. Not shown where the browser cannot speak. */
export function ReadButton() {
  const voice = useVoice();
  const t = useT();
  if (!voice?.canSpeak) return null;
  const on = voice.speaking;
  return (
    <button
      type="button"
      data-testid="read-aloud"
      aria-pressed={on}
      title={t(on ? "voice.stopReading" : "voice.read")}
      onClick={on ? voice.stopSpeaking : voice.readScreen}
      className={`w-11 h-11 flex-none flex items-center justify-center rounded-box border-2 border-line-strong ${
        on ? "bg-line-strong text-surface" : "bg-surface text-ink"
      }`}
    >
      {on ? <StopIcon className="w-5 h-5" /> : <SpeakerIcon className="w-6 h-6" />}
      <span className="sr-only">{t(on ? "voice.stopReading" : "voice.read")}</span>
    </button>
  );
}

function tryKey(route: string): string {
  if (route === "/") return "voice.try.field";
  for (const step of ["questions", "options", "why", "year", "adviser"]) if (route.startsWith(`/${step}`)) return `voice.try.${step}`;
  if (route === SETTINGS_PATH) return "voice.try.settings";
  return "voice.try.other";
}

/** The one line under the top bar: listening, what was heard and done, or what went wrong. */
export function VoiceLine() {
  const voice = useVoice();
  const t = useT();
  const { pathname } = useLocation();
  if (!voice || (!voice.canListen && !voice.canSpeak)) return null;
  const line = voice.line;
  let text = "";
  if (line?.kind === "listening") text = t("voice.listening");
  else if (line?.kind === "heard") text = t("voice.heard", { heard: line.heard, done: describeDone(line.done, t) });
  else if (line?.kind === "missed") text = `${line.heard ? `${t("voice.quote", { heard: line.heard })} ` : ""}${t("voice.missed")} ${t(tryKey(pathname))}`;
  else if (line?.kind === "error") text = t(`voice.err.${line.error}`);
  return (
    <p
      role="status"
      data-testid="voice-line"
      className={
        text
          ? "absolute inset-x-0 top-full z-20 px-4 py-2 bg-surface border-b-2 border-line-strong shadow-float font-bold text-body print:hidden"
          : "sr-only"
      }
    >
      {text}
    </p>
  );
}
