import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AppState } from "../data/types";
import { decodeState, encodeState } from "./url";

function toSearch(state: AppState): string {
  const query = encodeState(state);
  return query ? `?${query}` : "";
}

/**
 * The app state lives in the query string of the hash route.
 * The setter replaces the current history entry, keeping the route.
 */
export function useAppState(): [AppState, (patch: Partial<AppState>) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMemo(() => decodeState(location.search), [location.search]);
  const update = useCallback(
    (patch: Partial<AppState>) => {
      navigate({ pathname: location.pathname, search: toSearch({ ...state, ...patch }) }, { replace: true });
    },
    [navigate, location.pathname, state],
  );
  return [state, update];
}

/** Go to another route, carrying the state (and an optional patch to it) in the query string. */
export function useGo(): (pathname: string, patch?: Partial<AppState>) => void {
  const location = useLocation();
  const navigate = useNavigate();
  return useCallback(
    (pathname: string, patch?: Partial<AppState>) => {
      const state = decodeState(location.search);
      navigate({ pathname, search: toSearch({ ...state, ...patch }) });
    },
    [navigate, location.search],
  );
}

/** A link target for `<Link to>` that keeps the current state. */
export function useTo(): (pathname: string) => { pathname: string; search: string } {
  const location = useLocation();
  return useCallback(
    (pathname: string) => ({ pathname, search: toSearch(decodeState(location.search)) }),
    [location.search],
  );
}

/** Absolute share link to a route with this state, for WhatsApp and the printout. */
export function shareLink(pathname: string, state: AppState): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${pathname}${toSearch(state)}`;
}
