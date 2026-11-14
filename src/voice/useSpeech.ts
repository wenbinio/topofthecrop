// The phone browser's own speech recognition and speech synthesis, feature-detected. No hosted model, no key, no server.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "../data/types";

/** The parts of the Web Speech API the app uses, typed loosely: the standard type is missing from most DOM libs. */
export type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
export type RecognitionCtor = new () => RecognitionLike;
export type UtteranceLike = { text: string; lang: string; voice?: unknown; onend: (() => void) | null; onerror: (() => void) | null };
export type UtteranceCtor = new (text: string) => UtteranceLike;
export type SynthLike = {
  speak(utterance: UtteranceLike): void;
  cancel(): void;
  getVoices?(): { lang: string }[];
};

export type SpeechEnv = { Recognition: RecognitionCtor | null; synth: SynthLike | null; Utterance: UtteranceCtor | null };

/** What this browser offers. Firefox on Android has synthesis but no recognition. */
export function detectSpeech(w: unknown = typeof window === "undefined" ? undefined : window): SpeechEnv {
  const win = (w ?? {}) as Record<string, unknown>;
  const Recognition = (win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null) as RecognitionCtor | null;
  const synth = (win.speechSynthesis ?? null) as SynthLike | null;
  const Utterance = (win.SpeechSynthesisUtterance ?? null) as UtteranceCtor | null;
  return { Recognition: typeof Recognition === "function" ? Recognition : null, synth: synth && Utterance ? synth : null, Utterance: synth ? Utterance : null };
}

/** Tests (or a future setting) can hand in their own speech; otherwise the window's is used. */
export const SpeechEnvContext = createContext<SpeechEnv | null>(null);

export function useSpeechEnv(): SpeechEnv {
  const given = useContext(SpeechEnvContext);
  return useMemo(() => given ?? detectSpeech(), [given]);
}

export function speechLang(lang: Lang): string {
  return lang === "it" ? "it-IT" : "en-GB";
}

/** One short line per failure, by dictionary key. */
export type ListenError = "not-allowed" | "no-speech" | "network" | "aborted" | "other";

export function listenError(code: string): ListenError {
  if (code === "not-allowed" || code === "service-not-allowed") return "not-allowed";
  if (code === "no-speech" || code === "network" || code === "aborted") return code;
  return "other";
}

/** Push-to-talk: one tap, one phrase. Android ignores `continuous`, so it is never relied on. */
export function useRecognition(env: SpeechEnv) {
  const [listening, setListening] = useState(false);
  const current = useRef<RecognitionLike | null>(null);

  // A second tap ends the phrase and keeps what was heard so far; abort() would throw it away.
  const stop = useCallback(() => {
    current.current?.stop();
  }, []);

  const listen = useCallback(
    (lang: Lang, onHeard: (alternatives: string[]) => void, onError: (error: ListenError) => void) => {
      if (!env.Recognition) return;
      current.current?.abort();
      const rec = new env.Recognition();
      rec.lang = speechLang(lang);
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.onresult = (event) => {
        const first = event.results[0];
        const alternatives: string[] = [];
        if (first) for (let i = 0; i < first.length; i++) if (first[i]?.transcript) alternatives.push(first[i].transcript);
        onHeard(alternatives);
      };
      rec.onerror = (event) => onError(listenError(event.error));
      rec.onend = () => {
        if (current.current === rec) current.current = null;
        setListening(false);
      };
      current.current = rec;
      setListening(true);
      try {
        rec.start();
      } catch {
        current.current = null;
        setListening(false);
        onError("other");
      }
    },
    [env],
  );

  useEffect(() => () => current.current?.abort(), []);

  return { supported: env.Recognition !== null, listening, listen, stop };
}

/** Speaks one text at a time: anything still being said is cancelled first. */
export function useSynthesis(env: SpeechEnv) {
  const [speaking, setSpeaking] = useState(false);
  const current = useRef<UtteranceLike | null>(null);

  const cancel = useCallback(() => {
    current.current = null;
    env.synth?.cancel();
    setSpeaking(false);
  }, [env]);

  const speak = useCallback(
    (text: string, lang: Lang) => {
      const { synth, Utterance } = env;
      if (!synth || !Utterance || !text) return;
      synth.cancel();
      const u = new Utterance(text);
      u.lang = speechLang(lang);
      // Pick a voice for the language when the phone lists one; otherwise the phone chooses from `lang`.
      const voices = synth.getVoices?.() ?? [];
      const tag = (v: { lang: string }) => v.lang.replace("_", "-").toLowerCase();
      const voice = voices.find((v) => tag(v) === u.lang.toLowerCase()) ?? voices.find((v) => tag(v).startsWith(lang));
      if (voice) u.voice = voice;
      // A cancelled utterance may still report its end after the next one has started.
      const done = () => {
        if (current.current === u) {
          current.current = null;
          setSpeaking(false);
        }
      };
      u.onend = done;
      u.onerror = done;
      current.current = u;
      setSpeaking(true);
      synth.speak(u);
    },
    [env],
  );

  useEffect(() => () => env.synth?.cancel(), [env]);

  return { supported: env.synth !== null, speaking, speak, cancel };
}
