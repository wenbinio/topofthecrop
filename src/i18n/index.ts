import { createContext, useCallback, useContext } from "react";
import type { Lang } from "../data/types";
import { en } from "./en";
import type { Dict } from "./en";
import { it } from "./it";

export type { DictKey, Dict } from "./en";

export const dictionaries: Record<Lang, Dict> = { en, it };

export const LangContext = createContext<Lang>("en");

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function hasKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(en, key);
}

/** Looks a key up; returns the key itself when it is missing. `{name}` is replaced from `vars`. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[lang] as Record<string, string>;
  let text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): Translate {
  const lang = useLang();
  return useCallback<Translate>((key, vars) => translate(lang, key, vars), [lang]);
}
